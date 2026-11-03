# Verification

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
No Web Store submission or incognito behavior was tested. The original Ayima extension was not installed in a live browser.

Ignored exact local artifacts include `test-results/extension.json`, `ui.json`, `live-popup.png`, and the offline screenshots.
Hosted checks and public asset verification are separate delivery evidence and must be reported only after they run.

## Historical privacy audit

The downloaded Redirect Path 4.0.0 CRX identity and source locators are in `PRIVACY-AUDIT.md`.
The retention reproduction checked both the CRX hash and extracted background-script hash before running the script with mocked browser APIs.
It found the closed tab absent from memory and still present in mocked session storage.
That reproduction supports the code finding under documented merge semantics. It does not establish full runtime parity.
