import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const executablePath = process.env.CHROME_BIN;
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
await mkdir('test-results', { recursive: true });
const context = await browser.newContext({ viewport: { width: 640, height: 720 }, acceptDownloads: true });
const page = await context.newPage();
const externalRequests: string[] = [];
const errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
await context.route(/^https?:/, route => { externalRequests.push(route.request().url()); return route.abort(); });
await context.addInitScript(() => {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (value: string) => { (window as any).__copied = value; } } });
});

try {
  await page.goto(pathToFileURL(resolve('dist/design-preview.html')).href);
  await page.getByRole('heading', { name: 'example.com', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: /^Step / }).count(), 3);
  assert.equal(await page.locator('.inspector').evaluate(el => Math.round(el.getBoundingClientRect().height)), 580);
  assert(await page.locator('.evidence').evaluate(el => el.scrollHeight <= el.clientHeight), 'Default capture should fit one desktop popup screen');
  await page.screenshot({ path: 'test-results/default-dark.png', fullPage: true });

  await page.getByRole('button', { name: /^Step 1:/ }).click();
  await page.getByText('https://example.com/docs', { exact: true }).last().waitFor();
  await page.getByRole('tab', { name: /^Headers/ }).click();
  await page.getByRole('textbox', { name: 'Filter response headers' }).fill('location');
  assert.equal(await page.locator('.headers-list > div').count(), 1);
  assert.equal(await page.locator('.headers-list dt').textContent(), 'location');
  await page.getByRole('tab', { name: 'Overview', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  assert.equal(await page.getByRole('tab', { name: /^Headers/ }).getAttribute('aria-selected'), 'true');

  await page.getByRole('button', { name: 'Copy chain', exact: true }).click();
  assert((await page.evaluate(() => (window as any).__copied)).includes('301 http://example.com/docs'));
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  const exported = JSON.parse(await readFile(downloadPath!, 'utf8'));
  assert.equal(exported.sample, true);
  assert.equal(exported.hops.length, 3);

  await page.getByRole('button', { name: 'Use light theme', exact: true }).click();
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  await page.screenshot({ path: 'test-results/default-light.png', fullPage: true });
  await page.getByRole('button', { name: 'Use dark theme', exact: true }).click();

  for (const scenario of ['client', 'error', 'network', 'long', 'empty', 'direct', 'redirects']) {
    await page.selectOption('#sample', scenario);
    assert(await page.locator('body').evaluate(el => el.scrollWidth <= window.innerWidth), `${scenario}: no desktop horizontal overflow`);
  }
  await page.selectOption('#sample', 'empty');
  await page.getByRole('heading', { name: 'No capture yet' }).waitFor();
  assert(await page.getByRole('button', { name: 'Copy chain', exact: true }).isDisabled());

  await page.setViewportSize({ width: 360, height: 760 });
  for (const scenario of ['redirects', 'client', 'error', 'network', 'long', 'empty']) {
    await page.selectOption('#sample', scenario);
    assert(await page.locator('body').evaluate(el => el.scrollWidth <= window.innerWidth), `${scenario}: no narrow horizontal overflow`);
  }
  await page.selectOption('#sample', 'long');
  await page.getByRole('tab', { name: /^Headers/ }).click();
  await page.getByRole('textbox', { name: 'Filter response headers' }).fill('not-a-real-header');
  await page.getByText('No matching headers.', { exact: true }).waitFor();
  await page.selectOption('#sample', 'redirects');
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  await page.screenshot({ path: 'test-results/narrow-dark.png', fullPage: true });
  assert.deepEqual(externalRequests, [], 'Prototype must make no external requests');
  assert.deepEqual(errors, [], 'Prototype must have no uncaught browser errors');
  const result = { passed: true, viewports: [640, 360], scenarios: 7, checks: ['desktop default fits one screen', 'step selection', 'header filtering', 'keyboard tabs', 'copy', 'JSON download', 'themes', 'empty and error states', 'long content', 'no horizontal overflow', 'no external network', 'no page errors'] };
  await writeFile('test-results/ui.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} finally {
  await context.close();
  await browser.close();
}
