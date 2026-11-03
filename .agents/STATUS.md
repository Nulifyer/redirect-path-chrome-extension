# Project status

Updated: 2026-11-03
Owner: primary agent
State: user-controlled incognito verified locally; release preparation in progress

## Project state

The live MV3 extension, compact popup, GitHub workflows, package builder, Linux updater, privacy policy, and user guides are complete.
Source is published at https://github.com/Nulifyer/redirect-path-chrome-extension.
The latest public release is v0.1.4, built from source commit `bab959662b59db0a514fd40e06758c91b7aa565b`.
The exact installable package remains at `dist/release/extension`, with the ZIP and updater alongside it.
The published installer has installed v0.1.4 at `~/.local/share/chrome-extensions/nulifyer-redirect-inspector`, with `redirect-inspector-update` in `~/.local/bin`. All 15 installed files match the public ZIP. The user will manage Brave's Load unpacked and Reload controls; do not automate the browser UI.
Redirect Inspector is framed as the user's own auditing tool.
The README now introduces the product; `docs/` contains end-user guides and examples. Engineering references are under `.agents/reference/`, with build instructions in `.agents/DEVELOPMENT.md`.

## Current batch

Remove the incognito restriction and preserve normal browser controls, per the user's explicit correction. Use standard spanning mode with per-tab session-memory capture. Add browser permission, capture, popup, lifetime and worker-restoration checks, then publish/install v0.1.5. Do not operate the user's Brave controls.

## In progress

Standard spanning mode and live-tab hydration support the browser's incognito permission. All eight incognito checks, 36 redirect check groups, 29 unit tests, 14 updater tests and the popup UI suite pass. No delegated tasks.

## Next action

Commit/tag v0.1.5, run hosted checks, verify downloaded release assets, publish, and run redirect-inspector-update. Keep the user's native incognito/site-access choices available; leave Brave controls to the user.

## Blockers

None for GitHub installation. Web Store publication is intentionally deferred.

## Verification

Local checks, hosted source checks, and the hosted tagged-release workflow passed.
The public ZIP checksum, all 15 package files, release metadata, and helper matched the local tagged source build.
The updater's public check-only lookup reports latest and installed version 0.1.4.
The actual public helper passed first install and same-directory replacement. A real Chromium extension Reload preserved identity and preferences and cleared session capture data.
README/user-guide links, standalone packaged-guide links, documentation audiences, whitespace, and project-record structure were checked after the documentation reorganization.
See `.agents/reference/VERIFICATION.md` for exact URLs, methods, results, and limits.
