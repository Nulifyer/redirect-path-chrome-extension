# Project status

Updated: 2026-11-03
Owner: primary agent
State: redirect matrix verified, v0.1.4 published and installed

## Project state

The live MV3 extension, compact popup, GitHub workflows, package builder, Linux updater, privacy policy, and user guides are complete.
Source is published at https://github.com/Nulifyer/redirect-path-chrome-extension.
The latest public release is v0.1.4, built from source commit `bab959662b59db0a514fd40e06758c91b7aa565b`.
The exact installable package remains at `dist/release/extension`, with the ZIP and updater alongside it.
The published installer has installed v0.1.4 at `~/.local/share/chrome-extensions/nulifyer-redirect-inspector`, with `redirect-inspector-update` in `~/.local/bin`. All 15 installed files match the public ZIP. The user will manage Brave's Load unpacked and Reload controls; do not automate the browser UI.
Redirect Inspector is framed as the user's own auditing tool.
The README now introduces the product; `docs/` contains end-user guides and examples. Engineering references are under `.agents/reference/`, with build instructions in `.agents/DEVELOPMENT.md`.

## Current batch

Completed: Maps retains 302/302/200 across request-ID changes; expanded tests cover mixed redirect mechanisms and navigation boundaries. HTTP Refresh has a REF badge and redacted header targets. v0.1.4 passed local/hosted checks, was published, and was installed through the actual end-user updater.

## In progress

No running implementation or delegated tasks.

## Next action

Respond to feedback on the installed release. Keep the scenario matrix as a regression gate. Leave Brave controls to the user and discuss Chrome Web Store publication only when requested.

## Blockers

None for GitHub installation. Web Store publication is intentionally deferred.

## Verification

Local checks, hosted source checks, and the hosted tagged-release workflow passed.
The public ZIP checksum, all 15 package files, release metadata, and helper matched the local tagged source build.
The updater's public check-only lookup reports latest and installed version 0.1.4.
The actual public helper passed first install and same-directory replacement. A real Chromium extension Reload preserved identity and preferences and cleared session capture data.
README/user-guide links, standalone packaged-guide links, documentation audiences, whitespace, and project-record structure were checked after the documentation reorganization.
See `.agents/reference/VERIFICATION.md` for exact URLs, methods, results, and limits.
