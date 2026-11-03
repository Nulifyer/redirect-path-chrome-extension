// Runs the downloaded background script only in a VM with mocked browser APIs.
// No browser profile, DOM, network APIs, extension installation, or remote service is used.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = 'research/artifacts';
const crx = await readFile(`${root}/redirect-path.crx`);
const sha256 = createHash('sha256').update(crx).digest('hex');
assert.equal(sha256, 'b2492abf8d0edefb96b582668caf8444d6a101d73f29f5160be402be77455160');
const source = await readFile(`${root}/published/background.js`, 'utf8');
const sourceSha256 = createHash('sha256').update(source).digest('hex');
assert.equal(sourceSha256, '45fe85821046fc9186cf6b87e195892c7ccf85aab3fdc4e9111d35eafb765eed');
const stored: Record<string, unknown> = {};
const event = () => ({ addListener() {} });
const context = vm.createContext({ console, chrome: {
  storage: { session: { get: async () => structuredClone(stored), set: (data: object) => Object.assign(stored, structuredClone(data)) } },
  webRequest: { onBeforeRedirect: event(), onCompleted: event() },
  webNavigation: { onCommitted: event() },
  runtime: { onMessage: event(), onInstalled: event() },
  tabs: { onRemoved: event() },
  windows: { getAll: (_options: unknown, callback: (windows: unknown[]) => void) => callback([]) },
} });
vm.runInContext(source, context, { timeout: 1000 });
await new Promise(resolve => setTimeout(resolve, 0));
vm.runInContext(`RedirectPath.setTab(123, {path: [{url: 'https://example.invalid/private?token=sample'}], lastactive: 0}); RedirectPath.tabRemoved(123); RedirectPath.setTab(456, {path: [], lastactive: Date.now()});`, context, { timeout: 1000 });
const memoryHasClosedTab = vm.runInContext('Object.hasOwn(RedirectPath.tabs, "123")', context);
assert.equal(memoryHasClosedTab, false);
assert.equal(Object.hasOwn(stored, '123'), true);
const result = { artifactSha256: sha256, sourceSha256, method: 'Downloaded background.js in a VM with Chrome storage.set merge semantics', memoryHasClosedTab, sessionStorageHasClosedTab: Object.hasOwn(stored, '123'), limit: 'Mocked API reproduction, not a live original-extension browser test' };
await mkdir('test-results', { recursive: true });
await writeFile('test-results/audit-retention.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
