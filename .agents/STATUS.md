# Project status

Updated: 2026-11-03
Owner: primary agent
State: delayed automatic auth handoffs fixed and verified locally; release preparation

## Project state

The live MV3 extension, compact popup, GitHub workflows, package builder, Linux updater, privacy policy, and user guides are complete.
Source is published at https://github.com/Nulifyer/redirect-path-chrome-extension.
The latest public release is v0.1.6, built from source commit `9c5e33e39a37c8fd1bfd4e557ea5e869356000ab`.
The exact installable package remains at `dist/release/extension`, with the ZIP and updater alongside it.
The published installer has installed v0.1.6 at `~/.local/share/chrome-extensions/nulifyer-redirect-inspector`, with `redirect-inspector-update` in `~/.local/bin`. All 15 installed files match the public ZIP. The user will manage Brave's Load unpacked and Reload controls; do not automate the browser UI.
Redirect Inspector is framed as the user's own auditing tool.
The README now introduces the product; `docs/` contains end-user guides and examples. Engineering references are under `.agents/reference/`, with build instructions in `.agents/DEVELOPMENT.md`.

## Current batch

The user reports a lost delayed third-party auth chain: page → Microsoft → Okta → Microsoft → callback → app. Preserve earlier observed responses through delayed client navigation, form POST handoffs and worker suspension. Capture automatically, without retaining form bodies. Keep ordinary navigation boundaries honest and browser controls under the user's control.

## In progress

Reproduced automatic POST chain loss against v0.1.6 and fixed the form-submit boundary. Scripted requestSubmit events no longer count as user input. FORM distinguishes the handoff. Local type checking, 32 unit tests, 14 updater tests, 42 browser groups and seven popup scenarios pass. All eight incognito checks, including automatic form handoff, pass. No delegated tasks.

## Next action

Commit/tag v0.1.7, run hosted checks, verify downloaded release assets, publish and run the end-user updater. The exact private organization flow has not been exercised. Leave Brave controls to the user.

## Blockers

None for GitHub installation. Web Store publication is intentionally deferred.

## Verification

Local checks, hosted source checks, and the hosted tagged-release workflow passed.
The public ZIP checksum, all 15 package files, release metadata, and helper matched the local tagged source build.
The updater's public check-only lookup reports latest and installed version 0.1.6.
The actual public helper passed first install and same-directory replacement. A real Chromium extension Reload preserved identity and preferences and cleared session capture data.
README/user-guide links, standalone packaged-guide links, documentation audiences, whitespace, and project-record structure were checked after the documentation reorganization.
See `.agents/reference/VERIFICATION.md` for exact URLs, methods, results, and limits.
