# Redirect Path privacy audit

Inspected on 2026-11-03. The findings apply to the downloaded version, not every past or future release.

## Verdict

I found no background analytics, keylogging, password-field reads, or automatic upload of browsing chains in the inspected scripts.
This is a static code finding, not proof that every runtime interaction is private.

There are three concrete concerns:

1. The optional AI button sends unredacted navigation evidence to an external service.
2. Updating the extension can open the vendor website without a user click.
3. Closing a tab does not explicitly delete its saved session-storage entry.

For ordinary local inspection, the code is substantially more restrained than a browsing-history collection extension.
Avoid the AI button on private, authenticated, internal, or token-bearing URLs.
The replacement should omit the AI endpoint and unsolicited update tabs, and implement explicit tab-data deletion.

## Exact artifact and method

| Field | Evidence |
| --- | --- |
| Store ID | `aomidfkchockcldhbkggjokdkkebmdll` |
| Manifest version | 3 |
| Product version | 4.0.0 |
| Download | Google's public extension update service, using the store ID |
| CRX bytes | 50,333 |
| CRX SHA-256 | `b2492abf8d0edefb96b582668caf8444d6a101d73f29f5160be402be77455160` |
| Container | CRX3 header followed by a ZIP |
| Original artifact | `research/artifacts/redirect-path.crx`, ignored by Git |
| Extracted evidence | `research/artifacts/published/`, ignored by Git |

The artifact was downloaded over HTTPS, hashed, and unpacked for inspection.
The CRX signature was not independently verified. No original-extension installation or live traffic capture was performed.
The source is readable JavaScript. The container probe did not support CRX, so Python inspected the CRX header and ZIP directory.
Shape then mapped JavaScript declarations before targeted reads.

All three executable scripts, the manifest, popup markup, and stylesheet were inspected.
The inspection covered external requests, links, remote assets, browser events, storage, content access, clipboard behavior, and the AI payload.
The session-deletion finding was also reproduced in a VM with mocked Chrome APIs. No original code contacted the network during that reproduction.

## Permissions and access

| Permission or match | Observed use | Privacy implication |
| --- | --- | --- |
| `webRequest` | Reads redirect and completion events for main-frame requests | Can see visited document URLs and available response metadata |
| `webNavigation` | Correlates committed navigations and redirect qualifiers | Can associate navigation events with tabs |
| HTTP and HTTPS host permissions | Works across websites | Includes private sites and intranets when browser site access allows them |
| `https://ayima.ai/*` | AI upload endpoint, also covered by the HTTPS wildcard | External destination for user-triggered uploads |
| Content script on `<all_urls>` | Reads meta refresh, sends a boolean after page clicks | Runs on allowed pages, without a per-capture click |
| `storage` | Session chains and a local version marker | Navigation metadata remains accessible to extension contexts |
| `clipboardWrite` | Copies capture summaries | No clipboard reads found |

The manifest does not request cookies, history, debugger, or clipboard-read permissions.
The webRequest filter is for document navigation, not image, script, XHR, or other subresource logging.
Broad permissions alone do not establish exfiltration.

## F1. AI uploads complete captured evidence

Observed in `popup.js:304-365`, particularly payload construction at 328-338.

A click on the AI button obtains the current tab's path and POSTs JSON to
`https://ayima.ai/api/redirect-analysis`.
The payload includes the first URL, browser user agent, timestamp, and the complete stored path array.
Path objects include visited URLs, redirect targets, status codes, available response headers, and server IPs.
There is no redaction, field allowlist, or upload preview in this path.

URLs and response headers can contain identifiers, private hostnames, signed links, or authentication-related values.
The ordinary headers panel suppresses exactly named `Set-Cookie`, but the upload sends the stored path directly.
That display suppression is not upload redaction. This does not establish that Chrome supplies Set-Cookie in this configuration.
The extension does not request `extraHeaders`. Chrome documents that Set-Cookie is unavailable without that option.
See the [webRequest header restrictions](https://developer.chrome.com/docs/extensions/reference/api/webRequest).

The source connects this action to a button click. I found no timer or navigation listener invoking the upload.
The upload response opens an analysis page on Ayima AI.
Server-side handling, retention, AI providers, and downstream processing were not inspected.

Ayima's current [extension EULA](https://www.ayima.com/browser-extensions-eula/) describes optional AI transmission and possible third-party AI processing.
The store's broad no-collection wording therefore needs that qualification.

## F2. Updates open the vendor website

Observed in `background.js:487-511`.
On an extension update, a version marker controls opening
`https://www.ayima.com/chrome/redirect-path-4/` in a new tab.
The code then stores the opened version to avoid repeating it for that version.

The opened URL does not contain the inspected site's URL or captured chain.
Nevertheless, visiting the vendor website exposes normal request metadata, including a network IP address, to that site.
Cookies or website analytics depend on the resulting website and browser settings, which were not tested.
This is an automatic external connection separate from Chrome's extension update traffic.

Ayima describes this behavior in its [version 4 release notes](https://www.ayima.com/chrome/redirect-path-4/).

## F3. Closed-tab session entries can remain

Observed in `background.js:7-9`, `411-418`, `422-454`, and `473-477`.

The worker loads tab records from `chrome.storage.session` at initialization.
`setTab` writes records under top-level tab-ID keys.
Tab removal and garbage collection delete entries from the in-memory object only.
No `storage.session.remove` or `clear` call appears in the background script.
Writing the remaining keys with `set` does not remove omitted keys.

Derived consequence: a closed tab's URL and response metadata can remain in session storage and be reloaded after worker suspension.
The reproduction confirms this code path under mocked storage merge semantics, not a live browser installation.
This is local retention, not observed remote transmission or disk-based browsing history.
Chrome documents session storage as memory-backed and cleared on browser restart or extension disable, reload, or update.
See [Chrome storage documentation](https://developer.chrome.com/docs/extensions/reference/api/storage).

Reproduce with the locally downloaded artifact present:

```sh
bun scripts/check-audit-retention.ts
```

The script verifies the CRX hash before executing the extracted background script with mocked APIs.

## Other observed behavior

- The content script sends meta-refresh target/delay data and a boolean indicating a click. It does not send clicked text or coordinates.
- The popup has vendor links with UTM attribution parameters. These open only on click in the inspected code.
- Assets are packaged locally. No remote fonts, tracking pixels, analytics SDK, or additional fetch endpoint was found.
- The popup HTML contains a commented ad-container fragment. It does not load an advertising script.
- Capture data goes to session storage, not sync storage. A persistent local key records the release-notes version.
- The chain list is capped at 20 entries. Other per-tab metadata is not given the same explicit cap.

## Claims versus evidence

The [store listing](https://chromewebstore.google.com/detail/redirect-path/aomidfkchockcldhbkggjokdkkebmdll)
declares no data collection and local operation.
The inspected code supports local ordinary capture, with the AI and update-tab exceptions above.
This audit does not establish malicious intent or a legal privacy violation.
It identifies behavior that can conflict with a preference for no external transmission and prompt removal of closed-tab data.

## Publication boundary

Ayima's published terms reserve its code and assets and restrict modified redistribution.
This repository will publish original implementation code and factual findings.
The downloaded extension, its images, and extracted source are ignored local evidence, not project dependencies.
