# Behavior and implementation map

## Product requirements

The user described the tool as a debugging and auditing extension.
Loading a page must start recording automatically. Opening the popup must show the resulting redirect chain.
Capture must span intermediate HTTP redirects and relevant client navigations.
The interface focuses on audit results and omits promotions and unrelated actions.
It must expose the important facts in one popup screen for ordinary chains.
Long chains and large header sets may scroll inside the popup.

The project lives at `~/Projects/redirect-path-chrome-extension`.
Distribute installation-ready GitHub ZIPs with the project's manual Linux update helper.
Web Store release automation is explicitly deferred.

## Implemented browser behavior

The live MV3 extension implements the following behavior. The offline design preview still uses synthetic samples.

| Event or condition | Behavior |
| --- | --- |
| New main-frame request | Create or advance the active tab's capture without refetching the page |
| Server redirect | Append the response and Location target, preserving explicit target handoffs and abort retries across request IDs within the same top-frame navigation |
| Response headers | Preserve available names and values, including duplicate fields |
| Completion or error | Finalize status or network error without inventing missing values |
| Browser navigation commit | Correlate document ID, URL, and transition qualifiers with captured requests |
| Meta refresh | Use observed target and delay as classification evidence |
| HTTP Refresh header | Match its resolved target to the next navigation and show REF with the declared delay |
| Automatic form submission | Preserve the preceding chain through GET/POST handoffs, with a FORM badge and no retained form body |
| Client navigation without meta evidence | Label JavaScript classification as inferred when that is all the evidence supports |
| Typed URL, clicked link, reload, back/forward | Start a new capture, while retaining the correct in-flight HTTP hops |
| HSTS upgrade | Label it as a browser upgrade, separate from a network response |
| Cached response | Indicate browser cache and absent server IP when applicable |
| Worker suspension | Restore only still-valid session records before processing queued events |
| Tab closed or Clear capture | Delete the matching session key explicitly |
| Browser restart | Start without prior-session browsing captures |
| Incognito | User-controlled through the browser's normal toggle; spanning worker with distinct per-tab captures and the same session lifetime |
| Internal browser page | Explain that capture is unavailable |

[Chrome does not define ordering](https://developer.chrome.com/docs/extensions/reference/api/webNavigation#relation_to_webrequest_events)
between webRequest and webNavigation events.
Listeners must register synchronously at worker startup, with initialization buffering behind them.
Do not correlate requests solely by URL, because repeat visits and redirect loops reuse URLs.
Client redirects can cross request IDs. Preserve evidence about their relationship and classification confidence.
Use top-frame navigation-start timestamps to keep retries distinct from new visits. An aborted attempt can be replaced only by a same-URL retry in the same uncommitted navigation; a new request ID can also follow an explicitly observed redirect target. Preserve early document metadata when navigation and request callbacks arrive in different orders.
Do not claim script attribution from browser transition qualifiers alone.

## Modules and test seams

1. `capture` owns the event reducer and capture lifecycle. Its interface accepts normalized browser events and returns updated captures and effects.
2. `browser` translates Chrome events and applies effects, such as session-key writes, removals, and badge changes.
3. `popup` consumes snapshots through an extension message adapter. The prototype fixture adapter supplies the same view model.
4. `export` formats evidence for clipboard and JSON. It must make full versus redacted exports explicit before real capture ships.
5. `release` builds a reproducible unpacked package, ZIP, checksums, provenance, and standalone download helper.

The reducer should handle races and event identity behind a small interface.
Tests cross that interface with recorded event sequences.
Browser integration tests establish that the Chrome adapter emits those events correctly.

## Manifest scope

- Manifest V3 with a service worker and popup.
- `webRequest`, `webNavigation`, and `storage`.
- HTTP and HTTPS host access for automatic capture.
- A minimal top-frame content script for meta-refresh and user-navigation signals.
- Clipboard writes only on a user action. Add a clipboard permission only if target-browser tests show it is necessary.
- No debugger, cookies, history, broad request-body access, blocking requests, or external API host.
- No extension-origin external connections. Bundle all fonts, icons, scripts, and styles.

Broad host access is necessary for the confirmed automatic-capture mode.
It must be explained in the privacy policy and install documentation.
Capture only main-frame documents. Do not retain subresource requests or form contents.
Set session storage to trusted extension contexts and exclude sensitive response header values before persistence where they add no diagnostic value.
Keep response data session-only. Store presentation preferences separately.

## Acceptance evidence for live capture

- Browser fixture server exercises a direct response and 301/302/303/307/308 chains.
- Distinct 404, 500, DNS failure, and redirect-loop results stay distinguishable.
- Meta refresh, script navigation, actual user link clicks, back/forward, and reload have tested chain boundaries.
- The [redirect scenario contract](REDIRECT-SCENARIOS.md) covers mixed mechanisms, HTTP Refresh, same-URL refreshes, cross-origin/protocol chains, POST method changes, cached redirects, relative targets, and frame/history exclusions.
- Repeated URLs, overlapping tab navigations, worker suspension, cached results, and tab close do not corrupt or leak captures.
- HSTS behavior is established in a controlled browser fixture, rather than assumed from status 307 alone.
- Browser tests prove closed-tab session keys disappear and do not return after worker restart.
- Default ordinary chains fit within the popup. Long URLs and duplicate headers remain readable and export correctly.
- No external requests occur from extension pages or the worker. Existing page loads remain unaffected.
- Clipboard and downloaded JSON match the selected capture, with export privacy behavior defined and tested.

## Current source map

| File | Current ownership |
| --- | --- |
| `src/capture.ts` | Normalized-event reducer, request/document identity, navigation boundaries, classification and bounds |
| `src/background.ts` | Chrome event adapter, ordered initialization, session persistence, trusted popup commands and badges |
| `src/content.ts` | Meta-refresh and trusted-gesture navigation hints |
| `src/model.ts` | Capture model, status labels, summary, redaction, copy and JSON formatting |
| `src/fixtures.ts` | Seven synthetic capture scenarios, using documentation domains and IP addresses |
| `src/preview.tsx` | Base UI controls and interactive popup composition |
| `src/styles.css` | Theme tokens, compact layout, narrow-screen behavior |
| `scripts/build.ts` | Loadable MV3 extension and single-file offline preview builds |
| `scripts/package.ts` | Deterministic ZIP, provenance, notices, checksum and helper assets |
| `scripts/update-redirect-inspector.py` | Locked and validated stable-directory installation/update |
| `scripts/check-extension.ts` | Local HTTP/TLS browser fixtures and live extension checks |
| `scripts/check-ui.ts` | Render, interaction, export, layout, and network checks |
| `tests/model.test.ts` | Summary and classification presentation checks |

The capture model retains request IDs, document IDs, methods, start times, redirect targets, and browser-observed metadata.
The fixture timings are invented sample measurements. Live timings come from webRequest timestamps.
The UI labels their sum as request time, not full page-load time.

## Classification and observation limits

Chrome can omit its client_redirect qualifier when a scripted navigation then receives an HTTP redirect.
The reducer therefore also considers a link transition without a recent trusted page gesture as an inferred JavaScript redirect.
Trusted gestures within 1.5 seconds of request start, address-bar navigation, reload, and back/forward prevent that inference.
Browser-reported form_submit transitions without recent input continue the chain as FORM. A submit event alone is not user-input evidence: requestSubmit() can dispatch a trusted submit event without interaction. Pointer, key and click signals still identify user-initiated navigation.
There is no elapsed-time cutoff on a delayed client handoff. A matching observed meta-refresh target takes precedence over JavaScript inference.
Delayed user-triggered scripts and automatic navigation shortly after unrelated interaction can remain ambiguous.
The popup labels JavaScript redirects as inferred rather than claiming script-source attribution.

Navigation errors can report a generic webRequest abort before a more specific webNavigation error.
The reducer updates the same active response with the specific error when URL and time still match.

A history restore without an observed network request receives no invented HTTP status or timing.
Host access restrictions and protected browser pages can also make network metadata unavailable.
The extension observes main-frame document redirects, not SPA pushState routes, iframes, or subresource redirects.
