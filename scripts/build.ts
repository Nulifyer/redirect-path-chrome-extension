import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { icon } from './icons';
const result = await Bun.build({ entrypoints: ['src/preview.tsx'], target: 'browser', minify: true, define: { 'process.env.NODE_ENV': '"production"' } });
if (!result.success) throw new AggregateError(result.logs, 'Preview build failed');
const js = await result.outputs[0].text();
const css = await readFile('src/styles.css', 'utf8');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="dark light"><title>Redirect inspector design prototype</title><style>${css}</style></head><body><div id="root"></div><script>${js.replaceAll('</script', '<\\/script')}</script></body></html>`;
await mkdir('dist', { recursive: true });
await writeFile('dist/design-preview.html', html);
console.log(`Built dist/design-preview.html (${Math.round(Buffer.byteLength(html) / 1024)} KiB, self-contained, sample data only)`);
await mkdir('dist/extension', { recursive: true });
for (const [entry, name] of [['src/preview.tsx', 'popup.js'], ['src/background.ts', 'background.js'], ['src/content.ts', 'content.js']]) {
  const bundle = await Bun.build({ entrypoints: [entry!], target: 'browser', minify: true, define: { 'process.env.NODE_ENV': '"production"' } });
  if (!bundle.success) throw new AggregateError(bundle.logs, `Build failed for ${entry}`);
  await writeFile(`dist/extension/${name}`, await bundle.outputs[0].text());
}
await copyFile('extension/manifest.json', 'dist/extension/manifest.json');
for (const size of [16,32,48,128]) await writeFile(`dist/extension/icon-${size}.png`,icon(size));
await writeFile('dist/extension/popup.css', css);
await writeFile('dist/extension/popup.html', '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Redirect Inspector</title><link rel="stylesheet" href="popup.css"></head><body class="extension"><div id="root"></div><script src="popup.js"></script></body></html>');
console.log('Built loadable MV3 extension in dist/extension');
