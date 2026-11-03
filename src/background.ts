import { record, type CaptureEvent, type TabState } from './capture';
import { summarize } from './model';

const states = new Map<number, TabState>();
let paused = false;
let storageError: string | null = null;
const key = (tabId: number) => `tab:${tabId}`;
const ready = (async () => {
  await chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
  const [stored, preferences, tabs] = await Promise.all([chrome.storage.session.get(null), chrome.storage.local.get('paused'), chrome.tabs.query({})]);
  paused = preferences.paused === true;
  const alive = new Set(tabs.filter(t => !t.incognito).map(t => t.id));
  const stale: string[] = [];
  for (const [name, value] of Object.entries(stored)) {
    const state = value as TabState | undefined;
    if (!name.startsWith('tab:')) continue;
    const tabId = Number(name.slice(4));
    if (alive.has(tabId) && state?.capture && state?.document) states.set(tabId, state);
    else stale.push(name);
  }
  if (stale.length) await chrome.storage.session.remove(stale);
})();
let queue = ready;
function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation);
  queue = result.then(() => {}, error => {
    const message = error instanceof Error ? error.message : String(error);
    if (/browser is shutting down/i.test(message)) return;
    storageError = message;
    console.error('Redirect inspector:', storageError);
  });
  return result;
}

async function badge(tabId: number) {
  const state = states.get(tabId);
  const summary = state ? summarize(state.capture) : null;
  const text = paused ? 'Ⅱ' : summary?.hasError ? String(summary.last?.status ?? 'ERR') : summary?.redirects ? `${summary.redirects}↪` : summary?.last?.status ? String(summary.last.status) : '';
  await Promise.all([
    chrome.action.setBadgeText({ tabId, text }),
    chrome.action.setBadgeBackgroundColor({ tabId, color: paused ? '#616774' : summary?.hasError ? '#9c3936' : summary?.redirects ? '#395a89' : '#326546' }),
  ]).catch(() => {});
}

async function persist(tabId: number) {
  // Session quota is global. Evict the oldest other tab before approaching it.
  let bytes = 0;
  const sizes = [...states.entries()].map(([id, state]) => { const size = new TextEncoder().encode(JSON.stringify(state)).length; bytes += size; return { id, size, at: state.updatedAt }; });
  for (const item of sizes.sort((a, b) => a.at - b.at)) {
    if (bytes < 7_000_000) break;
    if (item.id === tabId) continue;
    states.delete(item.id);
    await chrome.storage.session.remove(key(item.id));
    await badge(item.id);
    bytes -= item.size;
  }
  const state = states.get(tabId);
  if (state) await chrome.storage.session.set({ [key(tabId)]: state });
  else await chrome.storage.session.remove(key(tabId));
  storageError = null;
  await badge(tabId);
}

function event(tabId: number, value: CaptureEvent): undefined {
  if (tabId < 0) return undefined;
  void enqueue(async () => {
    if (paused) return;
    const updated = record(states.get(tabId), value);
    if (updated) { states.set(tabId, updated); await persist(tabId); }
  }).catch(() => {});
  return undefined;
}
const filter = { urls: ['http://*/*', 'https://*/*'], types: ['main_frame' as const] };
chrome.webRequest.onBeforeRequest.addListener(d => event(d.tabId, { type: 'start', requestId: d.requestId, url: d.url, time: d.timeStamp, method: d.method }), filter);
for (const [name, type] of [['onHeadersReceived', 'headers'], ['onBeforeRedirect', 'redirect'], ['onCompleted', 'complete']] as const) {
  chrome.webRequest[name].addListener(d => event(d.tabId, { type, requestId: d.requestId, url: d.url, time: d.timeStamp, status: d.statusCode, headers: d.responseHeaders?.map(h => ({ name: h.name, value: h.value ?? '[binary value]' })), ip: 'ip' in d ? d.ip as string : undefined, fromCache: 'fromCache' in d ? d.fromCache as boolean : undefined, redirectUrl: 'redirectUrl' in d ? d.redirectUrl as string : undefined }), filter, ['responseHeaders']);
}
chrome.webRequest.onErrorOccurred.addListener(d => event(d.tabId, { type: 'error', requestId: d.requestId, url: d.url, time: d.timeStamp, error: d.error }), filter);
chrome.webNavigation.onCommitted.addListener(d => {
  if (d.frameId !== 0) return;
  if (!/^https?:\/\//.test(d.url)) {
    void enqueue(async () => { states.delete(d.tabId); await persist(d.tabId); }).catch(() => {});
  } else event(d.tabId, { type: 'commit', url: d.url, time: d.timeStamp, documentId: d.documentId, transition: d.transitionType, qualifiers: d.transitionQualifiers });
});
chrome.webNavigation.onErrorOccurred.addListener(d => { if (d.frameId === 0) event(d.tabId, { type: 'navigation-error', url: d.url, time: d.timeStamp, error: d.error }); });
chrome.tabs.onRemoved.addListener(tabId => { void enqueue(async () => { states.delete(tabId); await chrome.storage.session.remove(key(tabId)); }).catch(() => {}); });
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !message || typeof message !== 'object') return;
  if (message.type === 'document') {
    if (sender.tab?.id === undefined || sender.frameId !== 0 || !sender.documentId || !sender.url) return;
    const meta = message.meta;
    const validMeta = meta && typeof meta.url === 'string' && meta.url.length <= 8192 && typeof meta.delay === 'number' && Number.isFinite(meta.delay) && meta.delay >= 0;
    event(sender.tab.id, { type: 'document', url: sender.url, time: Date.now(), documentId: sender.documentId, meta: validMeta ? { url: meta.url, delay: meta.delay } : undefined, userGesture: message.userGesture === true });
    return;
  }
  // Captured pages may send document hints only. They cannot read or control captures.
  if (sender.url !== chrome.runtime.getURL('popup.html')) return;
  void enqueue(async () => {
    const tabId = Number.isInteger(message.tabId) ? message.tabId as number : -1;
    if (message.type === 'pause' && typeof message.paused === 'boolean') {
      paused = message.paused;
      await chrome.storage.local.set({ paused });
      for (const id of states.keys()) await badge(id);
    } else if (message.type === 'clear' && tabId >= 0) {
      states.delete(tabId); await persist(tabId);
    } else if (message.type !== 'snapshot') throw new Error('Unsupported request');
    return { capture: states.get(tabId)?.capture ?? null, paused, storageError };
  }).then(respond, error => respond({ error: String(error) }));
  return true;
});
