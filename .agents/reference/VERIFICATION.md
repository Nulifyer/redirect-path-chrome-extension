# Verification

## User-controlled incognito access

The user's instruction supersedes the earlier incognito restriction. Standard spanning mode now leaves access under the browser's native Allow in incognito setting, without an extension-specific gate. The existing session-memory capture store remains keyed by tab. Worker hydration includes every accessible live tab, including private tabs when permission is enabled.

On 2026-11-03, all eight dedicated incognito browser checks passed against the packaged extension: native default-off permission, enabling access through the real extension manager API, HTTP/JavaScript/meta/HTTP Refresh capture, regular/private capture separation, the actual private-window toolbar popup reading its active tab, private capture restoration after worker suspension, deletion of all private captures on window close, and the native opt-out toggle. Permission changes reload the extension worker, so the test observes its replacement. The native private-window popup is inspected through its CDP target because Playwright does not expose it as a Page.

Type checking, 29 unit tests, 14 updater tests, 36 existing redirect browser check groups and seven popup UI scenarios also passed. Both hosted workflows now run the incognito suite. The user guides explain native controls and memory-only per-tab lifetime. All browser tests use disposable profiles; the user's Brave controls remain untouched.

The v0.1.5 [source checks](https://github.com/Nulifyer/redirect-path-chrome-extension/actions/runs/41697324934) passed, but its [tagged-release build](https://github.com/Nulifyer/redirect-path-chrome-extension/actions/runs/41697324904) exposed a test race: network completion preceded navigation commit, so the later unchanged regular capture included document IDs absent from the early baseline. The comparison now waits for both completion and commit. The failed tag remains unchanged; no v0.1.5 release was published. The v0.1.6 [source checks](https://github.com/Nulifyer/redirect-path-chrome-extension/actions/runs/41698058816) and [tagged-release workflow](https://github.com/Nulifyer/redirect-path-chrome-extension/actions/runs/41698045376) passed, including the full browser and incognito suites. The tagged workflow checked out `v0.1.6`, source commit `9c5e33e39a37c8fd1bfd4e557ea5e869356000ab`.

[v0.1.6](https://github.com/Nulifyer/redirect-path-chrome-extension/releases/tag/v0.1.6) was published after its downloaded checksum, metadata, all 15 ZIP entries and helper matched the clean local tagged build. ZIP SHA-256: `f478a79b2dfcde0d9d66414fb750d17402c5373f4f8bc25f3b15f7b50161cda8`.

The actual installed end-user helper updated the permanent directory to v0.1.6. All 15 installed files and the helper match the hosted assets. The installed manifest uses spanning incognito, and the helper reports Latest 0.1.6 / Installed 0.1.6. Browser reload and native permission changes remain the user's step. No user browser profile was changed.

Ignored evidence: test-results/incognito.json, extension.json, ui.json, hosted-release-v0.1.6/verification.json and installed-release-v0.1.6.json.

## Redirect scenario expansion and Maps

Live v0.1.3 traces reproduced lost Maps redirects: Chrome emitted net::ERR_ABORTED retries and direct redirect handoffs under new request IDs, while the old capture reset to the final 200 response. The normalized-event regression covers both paths, fresh same-URL visits, delayed navigation-start delivery, and terminal failures.

The fixed packaged extension captured 302 → 302 → 200 for both https://maps.google.com/ and http://maps.google.com/ in an isolated Chromium profile on 2026-11-03. The final network response was https://www.google.com/maps. Public observations are not used as CI fixtures.

Type checking, 29 unit tests, all 36 real-browser check groups, and seven popup scenarios at 640px and 360px passed. The [scenario contract](REDIRECT-SCENARIOS.md) maps the coverage. New cases include mixed script/meta/server chains, immediate location.replace and location.assign, quoted/base-relative/delayed/dynamic meta refresh, an invalid meta before a valid one, meta and HTTP same-URL refreshes, HTTP Refresh headers, relative Location with fragments, 302 without Location, origin/protocol changes, POST 303/307/308 methods without form bodies, cached 301, iframe/fetch exclusion, and history push/replace preservation.

HTTP Refresh now has a REF badge and declared delay. A real popup download verified that its header target query values are redacted; unit checks cover malformed declarations and explicit full export. Early document metadata survives commit ordering. JavaScript attribution remains inferred, and this matrix does not prove every public site or Chromium derivative.

The [source checks](https://github.com/Nulifyer/redirect-path-chrome-extension/actions/runs/41694753975) and [tagged-release workflow](https://github.com/Nulifyer/redirect-path-chrome-extension/actions/runs/41694753178) passed for `bab959662b59db0a514fd40e06758c91b7aa565b`, including all 14 updater tests. [v0.1.4](https://github.com/Nulifyer/redirect-path-chrome-extension/releases/tag/v0.1.4) was published after its downloaded checksum, metadata, all 15 ZIP entries, and helper matched the local tagged build. ZIP SHA-256: `eb820330a706f7096fd0d2b85ea79b9d380eb742598136a6a9197608c0825072`.

The actual public end-user helper was downloaded to ~/.local/bin/redirect-inspector-update. It first installed v0.1.3 and then updated the same permanent folder, ~/.local/share/chrome-extensions/nulifyer-redirect-inspector, to published v0.1.4. All 15 installed files match the public ZIP byte for byte; the installed helper matches the public release helper. Its check-only lookup reports Latest 0.1.4 / Installed 0.1.4. The user clarified that Brave's load/reload controls are theirs to handle; browser UI automation stopped. Installation on disk is verified; browser activation remains the user's step.

Ignored evidence: test-results/extension.json, ui.json, maps-observation.json, maps-latest.json, maps-fixed.log, hosted-release-v0.1.4/verification.json, and installed-release-v0.1.4.json. No signed link tokens or personal browser screenshots were retained in tracked files.

## Icon artwork

The original SVG master uses rounded route geometry and a starting dot on a blue tile. librsvg generated antialiased 16, 32, 48, and 128 pixel RGBA exports. All four dimensions, PNG format, and byte-for-byte copying into the extension build were verified. The artwork was inspected at native toolbar sizes on light and dark surfaces and at 128 pixels. The inline preview had no console messages.

Type checking and the build passed. All runtime JavaScript, HTML, and CSS remain byte-identical to the published v0.1.2 ZIP. The obsolete procedural raster generator was removed after the build switched to committed PNG assets; there are no surviving imports. No new build dependency or extension permission was added.

[Source checks](https://github.com/Nulifyer/redirect-path-chrome-extension/actions/runs/41690362932) and the [tagged release workflow](https://github.com/Nulifyer/redirect-path-chrome-extension/actions/runs/41690362845) passed, including unit, updater, UI, and real extension browser suites. Source commit: `b5e9be8585821ed33f33eb0cdd8dec9f772a4288`.

[v0.1.3](https://github.com/Nulifyer/redirect-path-chrome-extension/releases/tag/v0.1.3) was published after its downloaded draft checksum, metadata, all 15 ZIP files, and helper matched the local tagged build. ZIP SHA-256: `f4fd7bcc7655a284c58cc755e39154a09846703a2755adfdf515641d1cef40e9`. The actual helper's public lookup reports latest version 0.1.3 without creating an installation.
Ignored exact evidence is in `test-results/hosted-release-v0.1.3/verification.json`. No user browser profile was modified.

## Redirect mechanism badges

On 2026-11-03, chain badges were changed to JS, META, HSTS, or the HTTP response code. Redundant per-row descriptions moved to the selected response heading; that heading and badge tooltips retain the HTTP status, meta delay, and JavaScript inference distinction.

Type checking and 19 unit tests passed. Seven-scenario UI checks passed at 640px and 360px, including mechanism badges, preserved final HTTP status, accessible JavaScript inference, and selected meta delay. Dark/light/narrow and client-badge screenshots were inspected. The default three-step sample still fits one screen.
The real-extension browser suite passed its controlled HTTP, JavaScript, meta, HSTS, error, lifecycle, popup, copy/export, and privacy checks.

The public URLs requested by the user were opened in the shared preview browser. Google reached www.google.com. The exact supplied YouTube link returned a 200 confirmation page with a Go To Site action and no meta refresh. Following that action reached go.lowlevel.tv/wizcode and then www.wiz.io/demo. This public-site observation verifies the destinations and confirmation behavior; redirect classification is covered by the isolated extension fixtures, not by this shared-browser observation. No signed link tokens were added to source or docs.

All 14 updater tests passed, and the final installation package passed the real-extension browser suite. The [source checks](https://github.com/Nulifyer/redirect-path-chrome-extension/actions/runs/41688531293) and [tagged release workflow](https://github.com/Nulifyer/redirect-path-chrome-extension/actions/runs/41688530670) passed for source commit `61e3b121e4626259df7dc9b366ada2b1c7a89b5f`.

[v0.1.2](https://github.com/Nulifyer/redirect-path-chrome-extension/releases/tag/v0.1.2) was published after the downloaded draft's checksum, provenance, all 15 ZIP files, and helper matched the local tagged build. ZIP SHA-256: `da0306df847cd628a6ff835575bdb458caac2d8fc1897c9883da62132198a96d`.
The actual helper's public check-only lookup reports latest version 0.1.2 without creating an installation.

Ignored evidence includes test-results/client-badges.png, ui.json, extension.json, and hosted-release-v0.1.2/verification.json. The user's browser profile was not modified.

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
