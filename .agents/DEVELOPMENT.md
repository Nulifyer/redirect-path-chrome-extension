# Development

## Local setup

Requires Bun, Python 3.9+, and OpenSSL for browser fixtures.

```sh
bun install --frozen-lockfile
bun run typecheck
bun test
bun run test:updater
bun run build
```

Load `dist/extension` for development.
`dist/design-preview.html` is an offline interactive sample built from the same popup source.

## Icon artwork

Edit `assets/icon.svg`, then regenerate its committed PNG exports with librsvg:

```sh
for size in 16 32 48 128; do
  rsvg-convert --width "$size" --height "$size" assets/icon.svg --output "extension/icon-$size.png"
done
```

Inspect all four sizes on light and dark backgrounds. Ordinary builds copy the PNG files directly and do not require librsvg.

## Browser checks

```sh
bunx playwright install chromium
bun run test:ui
bun run test:browser
bun run test:incognito
```

Set `CHROME_BIN=/path/to/chromium` to use an existing compatible browser.
Tests use disposable profiles and local HTTP/TLS fixtures.
See [testing](TESTING.md) for coverage, environment requirements, and evidence limits.

## Packages

```sh
bun run package
```

The output under `dist/release/` includes a ZIP, checksum, source metadata, instructions, and the update helper.
Uncommitted builds have `dirty: true` and are previews.
See [release engineering](reference/DISTRIBUTION.md) for tagged builds and the GitHub workflow.

## Documentation

The root README introduces the product. `docs/` contains user-facing instructions and examples.
Engineering references, design rationale, audit methods, and verification evidence belong under `.agents/`.
The package builder includes `docs/INSTALL.md` and `docs/PRIVACY.md` in installation ZIPs.
Keep their links usable when those files are read outside the repository.
