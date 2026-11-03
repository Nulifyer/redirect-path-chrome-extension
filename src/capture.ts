import { header, type Capture, type Header, type Hop } from './model';

type DocumentEvidence = { id?: string; url?: string; meta?: { url: string; delay: number }; gestureAt?: number };
type Request = { id: string; url: string; startedAt: number; index: number; method: string; urls: string[]; committed?: boolean };
export type TabState = {
  capture: Capture;
  request?: Request;
  document: DocumentEvidence;
  previous?: { capture: Capture; document: DocumentEvidence };
  updatedAt: number;
};
type Response = { requestId: string; url: string; time: number; status?: number; headers?: Header[]; ip?: string; fromCache?: boolean; redirectUrl?: string; error?: string };
export type CaptureEvent =
  | { type: 'start'; requestId: string; url: string; time: number; method: string }
  | ({ type: 'headers' | 'redirect' | 'complete' | 'error' } & Response)
  | { type: 'navigation-error'; url: string; time: number; error: string }
  | { type: 'commit'; url: string; time: number; documentId: string; transition: string; qualifiers: string[] }
  | { type: 'document'; url: string; time: number; documentId: string; meta?: { url: string; delay: number }; userGesture?: boolean };

const sameUrl = (a: string, b: string) => a.split('#')[0] === b.split('#')[0];
const sensitive = /^(set-cookie|set-cookie2|authorization|proxy-authorization|authentication-info|proxy-authentication-info)$/i;
export function safeHeaders(values: Header[] = []): Header[] {
  let budget = 16_384;
  const result: Header[] = [];
  for (const h of values.slice(0,100)) {
    if (budget <= 0) break;
    const name = h.name.slice(0, 256);
    const value = sensitive.test(name) ? '[not retained]' : h.value.slice(0, Math.max(0, Math.min(8192, budget)));
    budget -= name.length + value.length;
    result.push({ name, value });
  }
  return result;
}

function bounded(state: TabState): TabState {
  for (const capture of [state.previous?.capture, state.capture]) {
    if (capture && capture.hops.length > 50) {
      const removed = capture.hops.length - 50;
      capture.hops.splice(0, removed); capture.truncated = true;
      if (capture === state.capture && state.request) state.request.index = Math.max(0, state.request.index - removed);
    }
  }
  // Bound retained headers per tab, including the candidate previous document.
  if (JSON.stringify(state).length > 131_072) {
    for (const capture of [state.previous?.capture, state.capture]) {
      for (const hop of capture?.hops ?? []) {
        hop.headers = [];
        hop.headersTruncated = true;
        if (JSON.stringify(state).length <= 131_072) return state;
      }
    }
  }
  return state;
}

/** Apply one normalized top-frame browser event. Old request/document events are ignored. */
export function record(input: TabState | undefined, event: CaptureEvent): TabState | undefined {
  if (!/^https?:\/\//.test(event.url)) return input;
  if (event.type === 'navigation-error') {
    if (!input?.request || event.time < input.request.startedAt || !sameUrl(input.request.url, event.url)) return input;
    return record(input, { ...event, type: 'error', requestId: input.request.id });
  }
  let state = input;
  if (event.type === 'start') {
    if (state?.request?.id === event.requestId) {
      state.request.url = event.url;
      state.request.startedAt = event.time;
      state.request.method = event.method;
      state.request.index = state.capture.hops.length;
      state.request.urls.push(event.url);
      state.request.urls = state.request.urls.slice(-50);
    } else {
      state = {
        capture: { id: event.requestId, label: event.url, hops: [], complete: false, startedAt: event.time },
        request: { id: event.requestId, url: event.url, startedAt: event.time, index: 0, method: event.method, urls: [event.url] },
        previous: input?.document.id && input.capture.hops.length ? { capture: input.capture, document: input.document } : undefined,
        document: {}, updatedAt: event.time,
      };
    }
  } else if (event.type === 'document') {
    if (!state) return input;
    const document = [state.document,state.previous?.document].find(d=>d?.id===event.documentId&&sameUrl(d.url??'',event.url));
    if (!document) return input;
    if (event.meta) document.meta = event.meta;
    if (event.userGesture) document.gestureAt = event.time;
  } else if (event.type === 'commit') {
    const isRequest = state?.request && state.request.urls.some(url => sameUrl(url, event.url)) && !state.request.committed;
    if (!state || !isRequest) {
      // BFCache/history or a document observed before the extension was installed.
      state = { capture: { id: `document-${event.documentId}`, label: event.url, complete: true, hops: [{ url: event.url, status: null, kind: 'final', durationMs: null, ip: null, headers: [], documentId: event.documentId, note: 'No network response observed' }] }, document: {}, updatedAt: event.time };
    } else {
      const previous = state.previous;
      const recentGesture = previous?.document.gestureAt !== undefined && state.request!.startedAt-previous.document.gestureAt >= -100 && state.request!.startedAt-previous.document.gestureAt < 1500;
      const userNavigation = ['typed', 'auto_bookmark', 'reload', 'generated', 'keyword', 'keyword_generated'].includes(event.transition) || event.qualifiers.includes('forward_back') || event.qualifiers.includes('from_address_bar') || recentGesture;
      // Chrome can omit client_redirect when a scripted navigation then redirects over HTTP.
      // A link transition without a trusted page gesture is only an inference, never script attribution.
      const clientRedirect = previous && !userNavigation && (event.qualifiers.includes('client_redirect') || event.transition === 'link');
      if (clientRedirect) {
        const prior = previous.capture;
        const last = prior.hops.at(-1);
        if (last && last.kind === 'final' && last.status !== null) {
          const meta = previous.document.meta;
          const metaMatch = meta && state.request!.urls.some(url => sameUrl(url, meta.url));
          last.kind = metaMatch ? 'meta' : 'javascript';
          if (metaMatch) last.metaDelaySeconds = meta.delay;
          last.redirectUrl = state.request!.urls[0];
          const offset = prior.hops.length;
          state.capture = { ...state.capture, id: prior.id, label: prior.label, startedAt: prior.startedAt, hops: [...prior.hops, ...state.capture.hops], truncated: prior.truncated };
          state.request!.index += offset;
        }
      }
      state.request!.committed = true;
      for (const hop of state.capture.hops) if (hop.requestId === state.request!.id) hop.documentId = event.documentId;
    }
    state.document = { id: event.documentId, url: event.url };
    delete state.previous;
  } else {
    if (!state?.request || state.request.id !== event.requestId || !sameUrl(state.request.url, event.url)) return input;
    const request = state.request;
    const existing = state.capture.hops[request.index];
    const headers = event.headers ? safeHeaders(event.headers) : existing?.headers ?? [];
    const isUpgrade = event.type === 'redirect' && headers.some(h => h.name.toLowerCase() === 'non-authoritative-reason' && h.value.toLowerCase() === 'hsts');
    const hop: Hop = {
      ...existing, url: event.url, status: event.status ?? existing?.status ?? null,
      kind: event.type === 'error' ? 'error' : event.type === 'redirect' ? isUpgrade ? 'hsts' : 'http' : existing?.kind ?? 'final',
      durationMs: isUpgrade ? 0 : event.type === 'headers' ? existing?.durationMs ?? null : Math.max(0, Math.round(event.time - request.startedAt)),
      ip: event.ip ?? existing?.ip ?? null, headers, fromCache: event.fromCache ?? existing?.fromCache ?? false,
      requestId: request.id, method: request.method, startedAt: request.startedAt,
      documentId: state.document.id, redirectUrl: event.redirectUrl ?? existing?.redirectUrl,
      error: event.error,
      headersTruncated: existing?.headersTruncated || (event.headers ? headers.length < event.headers.length || headers.some((h,i)=>h.name!==event.headers![i].name || (!sensitive.test(h.name)&&h.value!==event.headers![i].value)) : false),
    };
    if (isUpgrade) hop.ip = null;
    if (event.type === 'error') { hop.status = null; hop.note = undefined; }
    state.capture.hops[request.index] = hop;
    if (event.type === 'complete' || event.type === 'error') state.capture.complete = true;
  }
  if (!state) return input;
  state.updatedAt = event.time;
  return bounded(state);
}
