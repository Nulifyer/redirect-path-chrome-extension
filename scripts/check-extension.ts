import { chromium, type BrowserContext, type Worker } from 'playwright';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import type { TabState } from '../src/capture';

const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch(request) {
  const u = new URL(request.url);
  const headers = { 'content-type': 'text/html', 'cache-control': 'no-store', 'x-audit': 'fixture' };
  if (u.pathname.startsWith('/redirect/')) {
    const codes = u.pathname.slice('/redirect/'.length).split(',').filter(Boolean).map(Number);
    return new Response('', { status: codes[0], headers: { ...headers, location: codes.length > 1 ? `/redirect/${codes.slice(1).join(',')}` : '/final?token=private' } });
  }
  if (u.pathname === '/loop') return new Response('', { status: 302, headers: { location: '/loop' } });
  if (u.pathname === '/script') return new Response('<script>setTimeout(()=>location.href="/redirect/302",120)</script>', {headers});
  if (u.pathname === '/meta') return new Response('<meta http-equiv="refresh" content="0; URL=/redirect/301">', {headers});
  if (u.pathname === '/click') return new Response('<a href="/final">Follow link</a><button onclick="location.href=\'/final\'">Navigate</button>', {headers});
  if (u.pathname.startsWith('/status/')) return new Response('HTTP error fixture', {status:Number(u.pathname.split('/').at(-1)),headers});
  if (u.pathname === '/cache') return new Response('Cache fixture', {headers:{...headers,'cache-control':'public, max-age=3600'}});
  if (u.pathname === '/slow') return new Promise<Response>(resolve => setTimeout(() => resolve(new Response('Slow fixture',{headers})),200));
  return new Response('<h1>Final response</h1>',{headers});
} });
const base = `http://127.0.0.1:${server.port}`;
const profile = await mkdtemp(`${tmpdir()}/redirect-inspector-test-`);
const certPath = resolve(profile,'fixture.crt');
const keyPath = resolve(profile,'fixture.key');
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',keyPath,'-out',certPath,'-days','1','-subj','/CN=redirect-inspector.test.dev','-addext','subjectAltName=DNS:redirect-inspector.test.dev'],{stdio:'ignore'});
const publicPem=execFileSync('openssl',['x509','-in',certPath,'-pubkey','-noout']);
const publicDer=execFileSync('openssl',['pkey','-pubin','-outform','DER'],{input:publicPem});
const spki=createHash('sha256').update(publicDer).digest('base64');
const tlsServer=Bun.serve({port:0,hostname:'127.0.0.1',tls:{key:Bun.file(keyPath),cert:Bun.file(certPath)},fetch:()=>new Response('Local HTTPS fixture',{headers:{'cache-control':'no-store'}})});
const secureBase=`https://redirect-inspector.test.dev:${tlsServer.port}`;
const extension = resolve(process.env.EXTENSION_DIR ?? 'dist/extension');
const executablePath = process.env.CHROME_BIN;
const launch = () => chromium.launchPersistentContext(profile, { channel:'chromium', headless: true, ...(executablePath ? {executablePath} : {}), args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--no-proxy-server', '--host-resolver-rules=MAP redirect-inspector.test.dev 127.0.0.1', `--ignore-certificate-errors-spki-list=${spki}`] });
let context: BrowserContext | undefined;
let worker!: Worker;
const checks: string[] = [];
function mark(value: string) { checks.push(value); console.log(`Passed: ${value}`); }
const workerErrors: string[] = [];
const external: string[] = [];

async function boot() {
  context = await launch();
  context.on('console', message => { if (message.type() === 'error' && message.location().url.startsWith('chrome-extension://')) workerErrors.push(message.text()); });
  context.on('request', request => {
    const url = request.url();
    if (/^https?:/.test(url) && !url.startsWith(base) && !url.includes(`redirect-inspector.test.dev:${tlsServer.port}`) && !url.startsWith('http://missing.invalid')) external.push(url);
  });
  worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  await worker.evaluate(() => chrome.runtime.id);
  await worker.evaluate(() => {
    (globalThis as any).__trace = [];
    chrome.webNavigation.onCommitted.addListener(d => { if (d.frameId === 0) (globalThis as any).__trace.push({type:'commit',...d}); });
    chrome.webRequest.onBeforeRequest.addListener(d => { (globalThis as any).__trace.push({type:'start',url:d.url,requestId:d.requestId}); return undefined; },{urls:['http://127.0.0.1/*'],types:['main_frame']});
  });
}
async function tabId(url: string) { return worker.evaluate(async value => (await chrome.tabs.query({})).find(tab => tab.url === value)?.id, url); }
async function snapshot(id: number): Promise<TabState | undefined> { return worker.evaluate(async value => (await chrome.storage.session.get(`tab:${value}`))[`tab:${value}`] as TabState | undefined, id); }
async function waitState(id: number, predicate: (s: TabState) => boolean) {
  for (let attempt=0; attempt<100; attempt++) {
    const state = await snapshot(id);
    if (state && predicate(state)) return state;
    await new Promise(r => setTimeout(r,50));
  }
  throw new Error(`Capture did not reach expected state: ${JSON.stringify(await snapshot(id))}\nTrace: ${JSON.stringify(await worker.evaluate(()=>(globalThis as any).__trace))}`);
}
try {
  await mkdir('test-results',{recursive:true});
  await boot();
  const page = await context!.newPage();
  await page.goto(`${base}/redirect/301,302,303,307,308`);
  const id = (await tabId(page.url()))!;
  let state = await waitState(id, s => s.capture.complete && s.capture.hops.length === 6);
  assert.deepEqual(state.capture.hops.map(h => h.status),[301,302,303,307,308,200]);
  assert(state.capture.hops.every(h => h.durationMs !== null));
  assert(state.capture.hops.at(-1)!.ip);
  mark('301/302/303/307/308 chain, final status, measured times and server IP');
  await page.reload();
  state = await waitState(id,s => s.capture.complete && s.capture.hops.length === 1);
  assert.equal(state.capture.hops[0].status,200);
  mark('reload starts a fresh capture');
  for (const [path, kind] of [['/script','javascript'],['/meta','meta']] as const) {
    await page.goto(base+path).catch(()=>{});
    state = await waitState(id,s=>s.capture.complete && s.capture.hops.some(h=>h.kind === kind) && s.capture.hops.at(-1)?.url.includes('/final') === true);
    assert.equal(state.capture.hops[0].kind,kind);
    assert.equal(state.capture.hops.length,3);
    mark(`${kind} followed by HTTP redirect`);
  }
  for (const selector of ['a','button']) {
    await page.goto(`${base}/click`);
    await page.locator(selector).click();
    await page.waitForURL(`${base}/final`);
    state = await waitState(id,s=>s.capture.complete && s.capture.hops.at(-1)?.url === `${base}/final`);
    assert.equal(state.capture.hops.length,1);
  }
  mark('trusted link and scripted button clicks start fresh chains');
  await page.goBack();
  state = await waitState(id,s=>s.capture.hops.at(-1)?.url === `${base}/click`);
  assert.equal(state.capture.hops.length,1);
  mark('back navigation does not become a client redirect');
  for (const code of [404,500]) {
    await page.goto(`${base}/status/${code}`);
    state = await waitState(id,s=>s.capture.complete && s.capture.hops.at(-1)?.status === code);
    mark(`HTTP ${code}`);
  }
  const loopLoaded = page.waitForEvent('load',{timeout:5000});
  await page.goto(`${base}/loop`).catch(()=>{});
  await loopLoaded;
  state = await waitState(id,s=>s.capture.complete && s.capture.hops.at(-1)?.error?.includes('REDIRECT') === true);
  assert(state.capture.hops.some(h=>h.status===302));
  assert.match(state.capture.hops.at(-1)!.error!,/REDIRECT/);
  mark('redirect loop retains repeated hops and final network error');
  const errorLoaded = page.waitForEvent('load',{timeout:5000});
  await page.goto('http://missing.invalid/').catch(()=>{});
  await errorLoaded;
  state = await waitState(id,s=>s.capture.hops.at(-1)?.error?.includes('NAME_NOT_RESOLVED') === true);
  assert.equal(state.capture.hops.at(-1)!.status,null);
  mark('DNS error has no fabricated status');
  await page.goto(`${base}/cache`);
  await page.goto(`${base}/final`);
  const beforeCache=await waitState(id,s=>s.capture.complete&&s.capture.hops.at(-1)?.url===`${base}/final`);
  await page.goto(`${base}/cache`);
  state = await waitState(id,s=>s.capture.id!==beforeCache.capture.id&&s.capture.complete && s.capture.hops.at(-1)?.url === `${base}/cache`);
  assert.equal(state.capture.hops[0].fromCache,true);
  mark(`cached response, browser fromCache=${state.capture.hops[0].fromCache}`);
  await page.goto(secureBase.replace('https:','http:')+'/final');
  state=await waitState(id,s=>s.capture.complete&&s.capture.hops.some(h=>h.kind==='hsts'));
  assert.equal(state.capture.hops[0].kind,'hsts');
  assert.equal(state.capture.hops[0].ip,null);
  assert.equal(state.capture.hops.at(-1)?.status,200);
  mark('real browser HSTS upgrade on a preloaded .dev domain mapped to a local TLS fixture');

  const second = await context!.newPage();
  await Promise.all([page.goto(`${base}/slow`),second.goto(`${base}/redirect/302`)]);
  const secondId = (await tabId(second.url()))!;
  await waitState(id,s=>s.capture.complete && s.capture.hops[0]?.url === `${base}/slow`);
  await waitState(secondId,s=>s.capture.complete && s.capture.hops.length===2);
  mark('concurrent tabs keep captures separate');
  await second.close();
  for(let i=0;i<100 && await snapshot(secondId);i++) await new Promise(r=>setTimeout(r,30));
  assert.equal(await snapshot(secondId),undefined);
  mark('closing a tab explicitly removes its session storage key');

  await page.goto(`${base}/redirect/301,302`);
  await waitState(id,s=>s.capture.complete && s.capture.hops.length===3);
  await page.bringToFront();
  const popupUrl = `chrome-extension://${worker.url().split('/')[2]}/popup.html`;
  const popupPromise = context!.waitForEvent('page');
  await worker.evaluate(url=>chrome.tabs.create({url,active:false}),popupUrl);
  const popup = await popupPromise;
  await popup.getByRole('button',{name:/^Step 3:/}).waitFor({timeout:5000}).catch(async()=>{throw new Error(`Popup state: ${await popup.locator('body').innerText()} Tabs: ${JSON.stringify(await worker.evaluate(()=>chrome.tabs.query({})))}`);});
  await popup.screenshot({path:'test-results/live-popup.png'});
  assert(await popup.locator('.evidence').evaluate(el=>el.scrollHeight<=el.clientHeight),`live default capture fits popup: ${JSON.stringify(await popup.locator('.evidence').evaluate(el=>({scroll:el.scrollHeight,client:el.clientHeight})))}`);
  await popup.getByRole('button',{name:'Pause recording',exact:true}).click();
  await popup.getByRole('button',{name:'Resume recording',exact:true}).waitFor();
  const pausedCapture = await snapshot(id);
  await page.goto(`${base}/status/500`);
  assert.deepEqual((await snapshot(id))?.capture,pausedCapture?.capture);
  await popup.getByRole('button',{name:'Resume recording',exact:true}).click();
  await popup.getByRole('button',{name:'Pause recording',exact:true}).waitFor();
  await page.goto(`${base}/final?token=private`);
  await waitState(id,s=>s.capture.complete && s.capture.hops.length===1);
  await popup.getByRole('tab',{name:/^Headers/}).click();
  await popup.getByRole('textbox',{name:'Filter response headers'}).fill('x-audit');
  await popup.getByText('fixture',{exact:true}).waitFor();
  const downloadPromise=popup.waitForEvent('download');
  await popup.getByRole('button',{name:'Export JSON',exact:true}).click();
  const download = await downloadPromise;
  const downloaded = JSON.parse(await Bun.file((await download.path())!).text());
  assert.equal(downloaded.sample,false);
  assert.equal(downloaded.redacted,true);
  assert(!JSON.stringify(downloaded).includes('private'));
  await popup.getByRole('checkbox',{name:/Include full values/}).check();
  const fullPromise=popup.waitForEvent('download');
  await popup.getByRole('button',{name:'Export JSON',exact:true}).click();
  const full = JSON.parse(await Bun.file((await (await fullPromise).path())!).text());
  assert(full.hops[0].url.includes('token=private'));
  await popup.getByRole('button',{name:'Copy chain',exact:true}).click();
  await popup.getByRole('status').filter({hasText:'Chain copied'}).waitFor();
  await popup.getByRole('button',{name:'Clear capture',exact:true}).click();
  await popup.getByRole('heading',{name:'No capture yet',exact:true}).waitFor();
  assert.equal(await snapshot(id),undefined);
  mark('live popup selection, filtering, pause/resume, full/redacted JSON, real clipboard write and clear');
  await popup.close();

  // Stop only the extension worker through CDP; its next event must hydrate session state.
  await page.goto(`${base}/redirect/301`);
  await waitState(id,s=>s.capture.complete&&s.capture.hops.length===2);
  const session = await context!.newCDPSession(page);
  await worker.evaluate(()=>{(globalThis as any).__beforeStop='old execution';});
  const versionPromise=new Promise<string>((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Worker version not observed')),5000);
    session.on('ServiceWorker.workerVersionUpdated',event=>{
      const found=event.versions.find(v=>v.scriptURL===worker.url()&&v.runningStatus==='running');
      if(found){clearTimeout(timer);resolve(found.versionId);}
    });
  });
  await session.send('ServiceWorker.enable');
  await session.send('ServiceWorker.stopWorker',{versionId:await versionPromise});
  const probe = await context!.newPage();
  await probe.goto(popupUrl);
  const restored=await probe.evaluate(tabId=>chrome.runtime.sendMessage({type:'snapshot',tabId}),id);
  assert.equal(restored.capture.hops.length,2);
  // Playwright retains the Worker object across this browser worker restart.
  assert.equal(await worker.evaluate(()=>(globalThis as any).__beforeStop),undefined);
  await worker.evaluate(()=>chrome.storage.session.get(null));
  assert.equal((await waitState(id,s=>s.capture.hops.length===2)).capture.hops.at(-1)?.status,200);
  assert.equal(await snapshot(secondId),undefined);
  mark('worker suspension restores live-tab capture without resurrecting a closed tab');
  await probe.close();
  await session.detach();
  await worker.evaluate(async()=>{await chrome.storage.local.set({theme:'light'});await chrome.storage.session.set({lifetimeMarker:'old browser'});});
  await context!.close();
  await boot();
  assert.equal(await worker.evaluate(async()=>(await chrome.storage.session.get('lifetimeMarker')).lifetimeMarker),undefined);
  assert.equal(await worker.evaluate(async()=>(await chrome.storage.local.get('theme')).theme),'light');
  mark('browser restart clears session data and preserves local preferences');
  assert.deepEqual(external,[]);
  assert.deepEqual(workerErrors,[]);
  mark('no extension console errors or external network requests');
  await writeFile('test-results/extension.json',JSON.stringify({passed:true,checks},null,2)+'\n');
  console.log(JSON.stringify({passed:true,checks},null,2));
} finally {
  await context?.close();
  server.stop(true);
  tlsServer.stop(true);
  await rm(profile,{recursive:true,force:true});
}
