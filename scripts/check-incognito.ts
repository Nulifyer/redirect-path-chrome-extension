import { chromium, type Worker } from 'playwright';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import assert from 'node:assert/strict';
import type { TabState } from '../src/capture';

const server = Bun.serve({ hostname:'127.0.0.1', port:0, fetch(request) {
  const path=new URL(request.url).pathname;
  const headers={'content-type':'text/html','cache-control':'no-store'};
  if(path==='/redirect') return new Response('',{status:302,headers:{...headers,location:'/final'}});
  if(path==='/script') return new Response('<script>setTimeout(()=>location.replace("/redirect"),100)</script>',{headers});
  if(path==='/meta') return new Response('<meta http-equiv="refresh" content="0; URL=/redirect">',{headers});
  if(path==='/refresh') return new Response('Refresh fixture',{headers:{...headers,refresh:'0; URL=/redirect'}});
  if(path==='/form') return new Response('<form method="post" action="/redirect"></form><script>setTimeout(()=>document.forms[0].requestSubmit(),100)</script>',{headers});
  return new Response('<h1>Incognito fixture</h1>',{headers});
} });
const base=`http://127.0.0.1:${server.port}`;
const profile=await mkdtemp(`${tmpdir()}/redirect-incognito-test-`);
const extension=resolve(process.env.EXTENSION_DIR??'dist/extension');
const executablePath=process.env.CHROME_BIN;
const context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,...(executablePath?{executablePath}:{}),args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
let worker:Worker;
const checks:string[]=[];
function mark(value:string){checks.push(value);console.log(`Passed: ${value}`);}
async function state(tabId:number):Promise<TabState|undefined>{return worker.evaluate(async id=>(await chrome.storage.session.get(`tab:${id}`))[`tab:${id}`] as TabState|undefined,tabId);}
async function waitState(tabId:number,predicate:(state:TabState|undefined)=>boolean){
  for(let i=0;i<100;i++){
    const value=await state(tabId);
    if(predicate(value)) return value;
    await new Promise(r=>setTimeout(r,50));
  }
  throw new Error(`Incognito state did not settle: ${JSON.stringify(await state(tabId))}`);
}
try {
  await mkdir('test-results',{recursive:true});
  worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');
  const extensionId=await worker.evaluate(()=>chrome.runtime.id);
  const popupUrl=`chrome-extension://${extensionId}/popup.html`;
  const manager=await context.newPage();
  await manager.goto('chrome://extensions');
  await manager.evaluate(()=>new Promise<void>((resolve,reject)=>(chrome as any).developerPrivate.updateProfileConfiguration({inDeveloperMode:true},()=>chrome.runtime.lastError?reject(new Error(chrome.runtime.lastError.message)):resolve())));
  assert.equal(await worker.evaluate(()=>chrome.extension.isAllowedIncognitoAccess()),false);
  mark('incognito access defaults to the browser user permission');
  const regular=await context.newPage();
  await regular.goto(base+'/redirect');
  const regularId=(await worker.evaluate(async url=>(await chrome.tabs.query({})).find(t=>t.url===url&&!t.incognito)?.id,regular.url()))!;
  await waitState(regularId,s=>s?.capture.complete===true&&s.capture.hops.length===2);
  const enabledWorker=context.waitForEvent('serviceworker',{predicate:w=>w.url().includes(extensionId)});
  await manager.evaluate(id=>new Promise<void>((resolve,reject)=>(chrome as any).developerPrivate.updateExtensionConfiguration({extensionId:id,incognitoAccess:true},()=>chrome.runtime.lastError?reject(new Error(chrome.runtime.lastError.message)):resolve())),extensionId);
  worker=await enabledWorker;
  assert.equal(await worker.evaluate(()=>chrome.extension.isAllowedIncognitoAccess()),true);
  mark('the standard browser Allow in incognito toggle enables access');
  await regular.reload();
  await regular.goto(base+'/redirect');
  // Network completion can precede the commit that supplies document IDs.
  const regularState=await waitState(regularId,s=>s?.capture.complete===true&&s.capture.hops.length===2&&s.request?.committed===true);
  const privateWindow=await worker.evaluate(url=>chrome.windows.create({incognito:true,url}),base+'/redirect');
  assert(privateWindow);
  const privateId=privateWindow.tabs?.[0]?.id;
  assert(privateId!==undefined);
  const privateIds=[privateId];
  let privateState=await waitState(privateId,s=>s?.capture.complete===true&&s.capture.hops.length===2);
  assert.deepEqual(privateState!.capture.hops.map(h=>h.status),[302,200]);
  assert.notEqual(privateId,regularId);
  for(const [path,kind] of [['/script','javascript'],['/meta','meta'],['/form','form'],['/refresh','refresh']] as const){
    const tab:chrome.tabs.Tab=await worker.evaluate(({windowId,url})=>chrome.tabs.create({windowId,url}),{windowId:privateWindow.id!,url:base+path});
    assert(tab.id!==undefined);
    privateIds.push(tab.id);
    privateState=await waitState(tab.id,s=>s?.capture.complete===true&&s.capture.hops[0]?.url===base+path&&s.capture.hops.length===3);
    assert.deepEqual(privateState!.capture.hops.map(h=>h.kind),[kind,'http','final']);
  }
  mark('incognito HTTP, JavaScript, meta, automatic form and HTTP Refresh chains are captured');
  assert.deepEqual((await state(regularId))?.capture,regularState!.capture);
  mark('private navigations do not overwrite the regular tab capture');
  await worker.evaluate(id=>chrome.windows.update(id,{focused:true}),privateWindow.id!);
  // Playwright does not expose this native private-window popup as a Page.
  const browserSession=await context.browser()!.newBrowserCDPSession();
  await worker.evaluate(id=>chrome.action.openPopup({windowId:id}),privateWindow.id!);
  const targets=await browserSession.send('Target.getTargets');
  const popupTarget=targets.targetInfos.find(t=>t.url===popupUrl);
  assert(popupTarget,`Toolbar popup target is available: ${JSON.stringify(targets.targetInfos.map(t=>({type:t.type,url:t.url})))}`);
  const {sessionId}=await browserSession.send('Target.attachToTarget',{targetId:popupTarget.targetId,flatten:false});
  let messageId=0;
  async function popupEvaluate(expression:string):Promise<any>{
    const id=++messageId;
    const result=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Popup evaluation timed out')),5000);
      const receive=(event:any)=>{
        if(event.sessionId!==sessionId) return;
        const message=JSON.parse(event.message);
        if(message.id!==id) return;
        clearTimeout(timer);browserSession.off('Target.receivedMessageFromTarget',receive);
        if(message.error) reject(new Error(message.error.message));
        else if(message.result?.exceptionDetails) reject(new Error(JSON.stringify(message.result.exceptionDetails)));
        else resolve(message.result?.result?.value);
      };
      browserSession.on('Target.receivedMessageFromTarget',receive);
    });
    await browserSession.send('Target.sendMessageToTarget',{sessionId,message:JSON.stringify({id,method:'Runtime.evaluate',params:{expression,returnByValue:true,awaitPromise:true}})});
    return result;
  }
  let popupState:any;
  for(let i=0;i<100;i++){
    popupState=await popupEvaluate('({text:document.body.innerText,badge:document.querySelector(".hop .status-badge")?.textContent,url:document.querySelector(".hop-url")?.textContent})');
    if(popupState.badge==='REF') break;
    await new Promise(r=>setTimeout(r,50));
  }
  assert.equal(popupState?.badge,'REF',JSON.stringify(popupState));
  assert.equal(popupState?.url,base+'/refresh');
  mark('the actual toolbar popup reads the active private tab');
  await browserSession.send('Target.closeTarget',{targetId:popupTarget.targetId});
  await browserSession.detach();

  const workerSession=await context.newCDPSession(regular);
  await worker.evaluate(()=>{(globalThis as any).__beforePrivateStop=true;});
  const versionPromise=new Promise<string>((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Worker version not observed')),5000);
    workerSession.on('ServiceWorker.workerVersionUpdated',event=>{
      const version=event.versions.find(v=>v.scriptURL===worker.url()&&v.runningStatus==='running');
      if(version){clearTimeout(timer);resolve(version.versionId);}
    });
  });
  await workerSession.send('ServiceWorker.enable');
  await workerSession.send('ServiceWorker.stopWorker',{versionId:await versionPromise});
  const bridge=await context.newPage();
  await bridge.goto(popupUrl);
  const restored=await bridge.evaluate(id=>chrome.runtime.sendMessage({type:'snapshot',tabId:id}),privateIds.at(-1)!);
  assert.equal(restored.capture.hops[0].kind,'refresh');
  assert.equal(await worker.evaluate(()=>(globalThis as any).__beforePrivateStop),undefined);
  assert.deepEqual((await state(regularId))?.capture,regularState!.capture);
  mark('worker suspension restores private and regular captures without mixing them');
  await bridge.close();await workerSession.detach();
  await worker.evaluate(id=>chrome.windows.remove(id),privateWindow.id!);
  for(const id of privateIds) await waitState(id,s=>s===undefined);
  mark('closing the private window deletes its capture');
  assert.deepEqual((await state(regularId))?.capture,regularState!.capture);
  const disabledWorker=context.waitForEvent('serviceworker',{predicate:w=>w.url().includes(extensionId)});
  await manager.evaluate(id=>new Promise<void>((resolve,reject)=>(chrome as any).developerPrivate.updateExtensionConfiguration({extensionId:id,incognitoAccess:false},()=>chrome.runtime.lastError?reject(new Error(chrome.runtime.lastError.message)):resolve())),extensionId);
  worker=await disabledWorker;
  assert.equal(await worker.evaluate(()=>chrome.extension.isAllowedIncognitoAccess()),false);
  mark('the user can turn incognito access off again');
  await writeFile('test-results/incognito.json',JSON.stringify({passed:true,checks},null,2)+'\n');
} finally {await context.close();server.stop(true);await rm(profile,{recursive:true,force:true});}
