# Redirect Inspector

A Chrome extension for debugging redirects and auditing HTTP responses.
It records the actual page navigation automatically and keeps captures in browser session memory.
The popup shows the final status, redirect count, chain, and the selected response's headers and server IP.

## Install

Download the installation ZIP from [GitHub Releases](https://github.com/Nulifyer/redirect-path-chrome-extension/releases).
Extract it into a permanent folder, open `chrome://extensions` or `brave://extensions`, enable Developer mode, and choose Load unpacked.
Select the folder containing `manifest.json`. Pin the extension and reload a webpage.

[Installation and updates](docs/INSTALL.md) includes the optional Linux update helper.
GitHub ZIP installations update when you run the helper and reload the extension. There are no silent update checks.
Web Store publication is deferred.

## Features

- Automatic main-frame capture of HTTP redirects, final responses, and network failures.
- Server redirects, browser HSTS upgrades, observed meta refresh, and inferred JavaScript redirects.
- Per-step status, URL, request timing, available response headers, server IP, and cache indication.
- One-screen overview for ordinary chains, with scrolling for long evidence.
- Header filtering, copy, JSON export, pause/resume, clear, and saved light/dark theme.
- Redacted exports by default, with explicit full-value export.
- Session-only captures, explicit tab-close deletion, no external analysis, telemetry, remote assets, or update tabs.

JavaScript classification is an inference from browser navigation and recent user-interaction signals.
The extension does not identify the responsible script. History restores can lack a network response.
Captures have documented size limits. Incognito is disabled in this version.
See [privacy](docs/PRIVACY.md) and the [implementation map](docs/IMPLEMENTATION-MAP.md).

## Build and check

Requires Bun, Python 3.9+, and OpenSSL for browser fixtures.

```sh
bun install --frozen-lockfile
bun run typecheck
bun test
bun run test:updater
bun run build
```

Load `dist/extension` for local development. For browser checks:

```sh
bunx playwright install chromium
bun run test:ui
bun run test:browser
```

Set `CHROME_BIN=/path/to/chromium` to use an existing compatible browser.
Tests use an isolated profile and local HTTP/TLS fixtures. They do not modify your browser profile.

```sh
bun run package
```

This builds `dist/release/redirect-inspector-VERSION-chromium.zip`, checksums, provenance, and the update helper.
Local uncommitted builds have `dirty: true` and are previews. Tagged releases require clean source.
[Release instructions](docs/DISTRIBUTION.md) describe the manually dispatched draft-release workflow.

`dist/design-preview.html` is an offline interactive design preview with synthetic captures, built from the same popup source.

## Project background

The [privacy investigation](docs/PRIVACY-AUDIT.md) covers Ayima Redirect Path 4.0.0.
This project is an independent implementation under the MIT license.
Ayima code, images, and branding are not included in source or release packages.
The UI uses Base UI and Lucide, with [T3 Code and Material 3 references](docs/DESIGN.md).
Third-party license notices accompany the release ZIP.
