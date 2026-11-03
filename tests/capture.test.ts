import { expect, test } from 'bun:test';
import { record, safeHeaders, type TabState, type CaptureEvent } from '../src/capture';
import { exportCapture, copySummary, redactUrl, type Capture } from '../src/model';

function events(values: CaptureEvent[]) { let state: TabState | undefined; for (const e of values) state = record(state, e); return state!; }
const start = (requestId = 'a', url = 'https://example.com/a', time = 1): Extract<CaptureEvent,{type:'start'}> => ({ type: 'start', requestId, url, time, method: 'GET' });
type ResponseEvent = Extract<CaptureEvent, { type: 'headers' | 'redirect' | 'complete' | 'error' }>;
const response = (type: 'redirect' | 'complete' | 'headers', requestId = 'a', url = 'https://example.com/a', status = 200, time = 10): ResponseEvent => ({ type, requestId, url, status, time });
const commit = (url = 'https://example.com/a', qualifiers: string[] = [], transition = 'link', documentId = 'd'): CaptureEvent => ({ type: 'commit', url, qualifiers, transition, documentId, time: 12 });
const navigate = (url = 'https://example.com/a', time = 0): CaptureEvent => ({ type: 'navigation-start', url, time });
const abort = (requestId = 'a', url = 'https://example.com/a', time = 10): ResponseEvent => ({ type: 'error', requestId, url, time, error: 'net::ERR_ABORTED' });

test('request restarts within one navigation retain the observed server redirects', () => {
  const a = 'https://example.com/a', b = 'https://example.com/b', c = 'https://other.example.com/c';
  const s = events([navigate(), start(), abort(), start('retry',a,11),
    { ...response('redirect','retry',a,302,20), redirectUrl:b }, start('retry',b,21), abort('retry',b,22),
    start('next',b,23), { ...response('redirect','next',b,302,30), redirectUrl:c }, start('next',c,31), abort('next',c,32),
    start('final',c,33), response('complete','final',c,200,40), commit(c,['server_redirect'],'typed')]);
  expect(s.capture.hops.map(h=>[h.url,h.status,h.kind])).toEqual([[a,302,'http'],[b,302,'http'],[c,200,'final']]);
  expect(s.capture.label).toBe(a);
  expect(s.capture.complete).toBe(true);
  expect(s.request?.id).toBe('final');
});
test('a fresh navigation to the same aborted URL starts a new capture', () => {
  const a='https://example.com/a', b='https://example.com/b';
  const s=events([navigate(),start(),response('redirect','a',a,302),start('a',b,11),abort('a',b,12),
    navigate(b,20),start('new',b,21),response('complete','new',b,200,30),commit(b,[],'typed')]);
  expect(s.capture.hops.map(h=>h.status)).toEqual([200]);
  expect(s.capture.label).toBe(b);
});
test('a server redirect can hand off directly to a new request ID', () => {
  const a='https://example.com/a', b='https://other.example.com/b';
  const s=events([navigate(),start(),{...response('redirect','a',a,302),redirectUrl:b},
    start('handoff',b,11),abort('handoff',b,12),start('retry',b,13),response('complete','retry',b,200,20),commit(b,['server_redirect'],'typed')]);
  expect(s.capture.hops.map(h=>[h.url,h.status])).toEqual([[a,302],[b,200]]);
  const newVisit=events([navigate(),start(),{...response('redirect','a',a,302),redirectUrl:b},navigate(b,11),start('new',b,12),response('complete','new',b,200,20),commit(b,[],'typed')]);
  expect(newVisit.capture.hops.map(h=>h.status)).toEqual([200]);
});
test('a delayed before-navigate callback still identifies the pending request', () => {
  const s=events([start('a',undefined,2),navigate(undefined,1),abort(),start('retry',undefined,11),response('complete','retry'),commit()]);
  expect(s.capture.id).toBe('a');
  expect(s.capture.hops.map(h=>h.status)).toEqual([200]);
});
test('a terminal network failure remains visible and is not merged with a retry', () => {
  const s=events([navigate(),start(),response('redirect','a',undefined,302),start('a','https://example.com/b',11),
    {...abort('a','https://example.com/b',12),error:'net::ERR_NAME_NOT_RESOLVED'},start('retry','https://example.com/b',13)]);
  expect(s.capture.hops).toHaveLength(0);
  const terminal=events([navigate(),start(),abort()]);
  expect(terminal.capture.hops[0].error).toBe('net::ERR_ABORTED');
});

test('one request ID retains all HTTP hops, repeated URLs, status and timing', () => {
  const s = events([start(), response('redirect', 'a', undefined, 302), start('a', 'https://example.com/b', 11), response('redirect', 'a', 'https://example.com/b', 307, 20), start('a', 'https://example.com/a', 21), response('complete', 'a', undefined, 200, 30), commit()]);
  expect(s.capture.hops.map(h => h.status)).toEqual([302, 307, 200]);
  expect(s.capture.hops.map(h => h.durationMs)).toEqual([9, 9, 9]);
});
test('normal user navigation resets a chain, late old requests cannot overwrite it', () => {
  let s = events([start(), response('complete'), commit(), start('b', 'https://example.com/b', 20), response('complete', 'b', 'https://example.com/b'), commit('https://example.com/b', [], 'typed')]);
  s = record(s, response('complete'))!;
  expect(s.capture.hops.map(h => h.url)).toEqual(['https://example.com/b']);
});
test('client redirect joins documents even when commit precedes completion and Chrome omits the qualifier', () => {
  const s = events([start(), response('complete'), commit(), start('b', 'https://example.com/b'), commit('https://example.com/b', ['server_redirect'], 'link', 'd2'), response('complete', 'b', 'https://example.com/b')]);
  expect(s.capture.hops.map(h => h.kind)).toEqual(['javascript', 'final']);
  expect(s.capture.hops[0].redirectUrl).toBe('https://example.com/b');
});
test('observed meta target takes precedence over JavaScript inference', () => {
  const s = events([start(), response('complete'), commit(), { type: 'document', documentId: 'd', url: 'https://example.com/a', meta: { url: 'https://example.com/b', delay: 0 }, time: 14 }, start('b', 'https://example.com/b'), response('complete', 'b', 'https://example.com/b'), commit('https://example.com/b', ['client_redirect'], 'link', 'd2')]);
  expect(s.capture.hops.map(h => h.kind)).toEqual(['meta', 'final']);
  expect(s.capture.hops[0].metaDelaySeconds).toBe(0);
});
test('early document hints survive commit and classify the following meta refresh', () => {
  const a='https://example.com/a',b='https://example.com/b';
  const s=events([start(),response('headers'),{type:'document',documentId:'d',url:a,time:11,meta:{url:b,delay:0}},commit(),
    response('complete'),start('b',b,15),response('complete','b',b,200,20),commit(b,['client_redirect'],'link','d2')]);
  expect(s.capture.hops.map(h=>h.kind)).toEqual(['meta','final']);
});
test('HTTP Refresh uses its response header and retains its declared delay', () => {
  const a='https://example.com/a',b='https://example.com/b';
  const s=events([start(),{...response('complete'),headers:[{name:'Refresh',value:'1; URL=/b'}]},commit(),
    start('b',b,20),response('complete','b',b,200,30),commit(b,['client_redirect'],'link','d2')]);
  expect(s.capture.hops[0]).toMatchObject({url:a,kind:'refresh',refreshDelaySeconds:1,status:200});
});
test('automatic form POST preserves the auth chain after a long idle period', () => {
  const app='https://app.example/start',provider='https://idp.example/environment',assertion='https://login.example/assertion',callback='https://app.example/callback';
  const s=events([start('app',app),{...response('redirect','app',app,302),redirectUrl:provider},start('app',provider,11),response('complete','app',provider,200,20),commit(provider,[], 'typed','idp'),
    navigate(assertion,180_000),{...start('post',assertion,180_001),method:'POST'},
    {...response('redirect','post',assertion,303,180_010),redirectUrl:callback},start('post',callback,180_011),response('complete','post',callback,200,180_020),
    {...commit(callback,['server_redirect'],'form_submit','callback'),time:180_021}]);
  expect(s.capture.label).toBe(app);
  expect(s.capture.hops.map(h=>[h.status,h.kind])).toEqual([[302,'http'],[200,'form'],[303,'http'],[200,'final']]);
  expect(s.capture.hops.map(h=>h.method)).toEqual(['GET','GET','POST','GET']);
});
test('delayed script redirects have no elapsed-time cutoff', () => {
  const a='https://example.com/a',b='https://example.com/b';
  const s=events([start(),response('complete'),commit(),navigate(b,600_000),start('b',b,600_001),response('complete','b',b,200,600_010),
    {...commit(b,[],'link','d2'),time:600_011}]);
  expect(s.capture.hops.map(h=>h.kind)).toEqual(['javascript','final']);
  expect(s.capture.label).toBe(a);
});
test('a user-submitted form still starts a fresh capture', () => {
  const a='https://example.com/a',b='https://example.com/b';
  const s=events([start(),response('complete'),commit(),{type:'document',documentId:'d',url:a,userGesture:true,time:14},
    {...start('b',b,15),method:'POST'},response('complete','b',b,200,20),commit(b,[],'form_submit','d2')]);
  expect(s.capture.label).toBe(b);
  expect(s.capture.hops.map(h=>h.kind)).toEqual(['final']);
});
test('trusted user gesture and back/forward prevent a client classification', () => {
  const before = [start(), response('complete'), commit(), { type: 'document', documentId: 'd', url: 'https://example.com/a', userGesture: true, time: 14 } as CaptureEvent];
  const s = events([...before, start('b', 'https://example.com/b'), response('complete', 'b', 'https://example.com/b'), commit('https://example.com/b', ['client_redirect'])]);
  expect(s.capture.hops).toHaveLength(1);
  const back = events([start(), response('complete'), commit(), start('b', 'https://example.com/b'), response('complete', 'b', 'https://example.com/b'), commit('https://example.com/b', ['forward_back', 'client_redirect'])]);
  expect(back.capture.hops).toHaveLength(1);
});
test('history restore without a request has no fabricated HTTP status', () => {
  const s = events([commit()]);
  expect(s.capture.hops[0].status).toBeNull();
  expect(s.capture.hops[0].note).toBe('No network response observed');
});
test('307 is HSTS only with browser evidence', () => {
  const s = events([start(), { ...response('redirect', 'a', undefined, 307), headers: [{ name: 'Non-Authoritative-Reason', value: 'HSTS' }] } as CaptureEvent]);
  expect(s.capture.hops[0]).toMatchObject({ kind: 'hsts', ip: null, durationMs: 0 });
});
test('sensitive response values are not retained and duplicate headers are preserved', () => {
  expect(safeHeaders([{name:'SET-cookie', value:'secret'}, {name:'x-test',value:'one'}, {name:'x-test',value:'two'}])).toEqual([{name:'SET-cookie',value:'[not retained]'},{name:'x-test',value:'one'},{name:'x-test',value:'two'}]);
  expect(safeHeaders([{name:'x-empty',value:''}])).toEqual([{name:'x-empty',value:''}]);
});
test('errors complete a capture without invented HTTP status', () => {
  const s = events([start(), { type: 'error', requestId: 'a', url: 'https://example.com/a', time: 20, error: 'net::ERR_NAME_NOT_RESOLVED' }]);
  expect(s.capture.complete).toBe(true);
  expect(s.capture.hops[0]).toMatchObject({ status: null, kind: 'error', error: 'net::ERR_NAME_NOT_RESOLVED' });
});
test('redacted and full exports preserve distinct evidence', () => {
  const c: Capture = {id:'r',label:'https://user:pass@example.com/?token=secret#private',complete:true,hops:[{url:'https://example.com/?token=secret',status:200,kind:'final',ip:null,durationMs:1,headers:[{name:'x-auth-token',value:'private-token'}]}]};
  const redacted = exportCapture(c);
  expect(redacted).not.toContain('secret'); expect(redacted).not.toContain('private-token'); expect(redacted).not.toContain('user:pass');
  expect(copySummary(c)).not.toContain('secret');
  expect(exportCapture(c,true)).toContain('private-token');
  expect(JSON.parse(exportCapture(c)).sample).toBe(false);
  expect(c.hops[0].headers[0].value).toBe('private-token');
});
test('redaction preserves duplicate query keys and malformed Location cannot break export', () => {
  expect(new URL(redactUrl('https://example.com/?a=one&a=two')).searchParams.getAll('a')).toEqual(['REDACTED','REDACTED']);
  const c:Capture={id:'r',label:'https://example.com/',complete:true,hops:[{url:'https://example.com/',status:302,kind:'http',durationMs:1,ip:null,headers:[{name:'Location',value:'http://['}]}]};
  expect(JSON.parse(exportCapture(c)).hops[0].headers[0].value).toBe('[invalid location]');
});
test('Refresh header targets follow export redaction, including malformed declarations', () => {
  const c:Capture={id:'r',label:'https://example.com/',complete:true,hops:[{url:'https://example.com/',status:200,kind:'refresh',durationMs:1,ip:null,headers:[
    {name:'Refresh',value:'0;url=/next?token=refresh-secret#private'},
    {name:'refresh',value:'invalid;url=/next?token=refresh-secret'},
  ]}]};
  expect(exportCapture(c)).not.toContain('refresh-secret');
  expect(exportCapture(c)).not.toContain('#private');
  expect(exportCapture(c,true)).toContain('refresh-secret');
});
test('header and step limits do not corrupt the final active response index', () => {
  let state:TabState|undefined;
  for(let i=0;i<60;i++) {state=record(state,start('a',`https://example.com/${i}`,i*10));state=record(state,response('redirect','a',`https://example.com/${i}`,302,i*10+2));}
  state=record(state,{type:'error',requestId:'a',url:'https://example.com/59',time:700,error:'net::ERR_TOO_MANY_REDIRECTS'});
  expect(state!.capture.hops).toHaveLength(50);
  expect(state!.capture.truncated).toBe(true);
  expect(state!.capture.hops.at(-1)?.kind).toBe('error');
});
