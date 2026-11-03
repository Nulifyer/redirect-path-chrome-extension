import { expect, test } from 'bun:test';
import { record, safeHeaders, type TabState, type CaptureEvent } from '../src/capture';
import { exportCapture, copySummary, redactUrl, type Capture } from '../src/model';

function events(values: CaptureEvent[]) { let state: TabState | undefined; for (const e of values) state = record(state, e); return state!; }
const start = (requestId = 'a', url = 'https://example.com/a', time = 1): CaptureEvent => ({ type: 'start', requestId, url, time, method: 'GET' });
const response = (type: 'redirect' | 'complete' | 'headers', requestId = 'a', url = 'https://example.com/a', status = 200, time = 10): CaptureEvent => ({ type, requestId, url, status, time });
const commit = (url = 'https://example.com/a', qualifiers: string[] = [], transition = 'link', documentId = 'd'): CaptureEvent => ({ type: 'commit', url, qualifiers, transition, documentId, time: 12 });

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
test('header and step limits do not corrupt the final active response index', () => {
  let state:TabState|undefined;
  for(let i=0;i<60;i++) {state=record(state,start('a',`https://example.com/${i}`,i*10));state=record(state,response('redirect','a',`https://example.com/${i}`,302,i*10+2));}
  state=record(state,{type:'error',requestId:'a',url:'https://example.com/59',time:700,error:'net::ERR_TOO_MANY_REDIRECTS'});
  expect(state!.capture.hops).toHaveLength(50);
  expect(state!.capture.truncated).toBe(true);
  expect(state!.capture.hops.at(-1)?.kind).toBe('error');
});
