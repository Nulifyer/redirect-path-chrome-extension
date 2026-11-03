# Verification

## Documentation audience update

The README introduces product benefits and getting started. All seven files in `docs/` are end-user guides or their index.
Engineering references moved to `.agents/reference/`; local build instructions moved to `.agents/DEVELOPMENT.md`.
Checked 25 local Markdown links, the standalone links in the packaged installation/privacy guides, documentation-audience boundaries, whitespace, and project-record structure.
No application source or release artifact changed, so application/browser tests were not repeated.

## Live extension milestone

Verified locally on 2026-11-03 with Bun 1.4.3, TypeScript 5.9.3, Playwright 1.64.1, and Chrome for Testing 156.0.8078.4 on Linux.

- Type checking passed.
- 18 capture/model tests passed, covering request identity, repeated URLs, event-order differences, navigation boundaries, meta delay, error state, limits, and export redaction.
- 14 updater tests passed, covering first install, replacement, check-only mode, checksum rejection, metadata rejection, path traversal, symlinks, rollback, downgrades, and unrelated-directory protection.
- Seven-scenario offline UI checks passed at 640px and 360px widths.
- The installation ZIP's entries matched its unpacked package byte for byte. Audit downloads and development files were absent.
- Project continuity records passed structural validation.

The real-browser suite loaded the packaged MV3 extension in a temporary browser profile and passed:

- A 301/302/303/307/308 chain, final 200 response, measured request times, and server IP.
- Reload, back navigation, ordinary link clicks, and user-triggered scripted button navigation.
- Automatic JavaScript and observed meta refresh followed by HTTP redirects.
- HTTP 404/500, DNS failure, and a redirect loop with repeated hops and the final browser error.
- Cached responses with a real browser cache indication.
- An actual HSTS upgrade for a preloaded .dev hostname mapped to a local TLS fixture.
- Concurrent tabs with separate captures and explicit closed-tab session-key deletion.
- Live popup response selection, header filtering, pause/resume, clear, redacted/full JSON downloads, and a real clipboard write.
- Worker stop and resume, proven by loss of a worker-global marker and successful runtime restoration of the stored capture.
- Browser restart clearing a session marker while preserving the saved local theme.
- No extension console errors and no external HTTP/HTTPS requests during the fixtures.

Playwright retained the same Worker object across a browser worker execution restart.
The restart check therefore uses the worker-global marker and a real popup runtime response, rather than object identity.
The TLS trust override is limited to the disposable fixture certificate's SPKI. No user browser certificate settings were changed.

The default three-step live capture fits a 640×600 popup without internal scrolling.
Long chains and headers scroll inside the evidence region.
The live dark popup and offline dark/light/narrow screenshots were inspected for clipping, spacing, and hierarchy.
This is not a full accessibility audit or an exhaustive compatibility audit of public sites and Chromium derivatives.

JavaScript classification remains an inference. Delayed user-triggered scripts and unrelated recent gestures can be ambiguous.
No Web Store submission or incognito behavior was tested.

Ignored exact local artifacts include `test-results/extension.json`, `ui.json`, `live-popup.png`, and the offline screenshots.
## Published release evidence

[Release v0.1.1](https://github.com/Nulifyer/redirect-path-chrome-extension/releases/tag/v0.1.1)
was built from source commit `5f0732c52b32866a0b0331829b25ed781ffe9391`.
The [hosted source checks](https://github.com/Nulifyer/redirect-path-chrome-extension/actions/runs/41685208513)
and [tagged release workflow](https://github.com/Nulifyer/redirect-path-chrome-extension/actions/runs/41685216895) both passed.
The first v0.1.0 workflow attempt did not produce a release. The v0.1.1 CI fix explicitly clears a runner browser override so extension checks use bundled Chromium.

The downloaded public ZIP checksum is
`ce1f16808b0649fb897a161ca8314f08f450856413a7c30f072f45cf4332ddc3`.
All 15 installation files matched the local tagged build, and the downloaded helper matched its committed source.
A repeated local tagged build produced the same checksum.

The actual public helper was run without GitHub authentication against the published assets in a disposable directory.
Its check-only mode created no installation. First install passed checksum and metadata validation.
A second update atomically replaced the same directory and removed a deliberately added stale file.
The public package was loaded in real Chromium with Developer mode enabled, matching the installation instructions.
Reload through Chrome's extension manager preserved ID `pgajamhminmmpoiigiijboahplbpebjc`, theme, and pause preferences.
The previous session marker disappeared after Reload.
No user browser profile or permanent installation was changed.

Ignored evidence is in `test-results/hosted-release/verification.json` and `test-results/published-release.json`.
The downloaded GitHub assets are retained under `test-results/hosted-release/` for inspection.
