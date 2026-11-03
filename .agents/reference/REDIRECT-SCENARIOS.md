# Redirect scenario contract

Owner: primary agent
Request: the user reported lost Maps redirects and delayed automatic third-party authentication chains, and requires broad scenario coverage.

Controlled browser fixtures are the repeatable acceptance check. Live Maps is an additional observation, not a CI dependency. A public site's future response is not fixed by these fixtures.

| Scenario | Expected evidence |
| --- | --- |
| 301, 302, 303, 307, 308 chain | Every response and final status, in order |
| Relative Location and fragment targets | Resolved HTTP chain retained; fragments do not corrupt request matching |
| Redirect without Location | Final HTTP response, no fabricated redirect |
| Redirect across origins and HTTP/HTTPS | One ordered chain, with actual request methods and statuses |
| Cached redirect | Original redirect status retained with browser cache evidence |
| POST with 303, 307, 308 | Actual GET/POST method at each step, without retaining the form body |
| Immediate/delayed location assign and replace | Inferred JavaScript badge; preceding HTTP/client steps retained |
| Immediate/delayed, quoted, relative, dynamic meta refresh | Meta badge with observed target and delay |
| HTTP Refresh header | Distinguished from JavaScript and DOM meta refresh |
| Delayed multi-provider authentication | App → provider → environment check → provider → callback → app remains one chain after a 35-second delay and forced worker suspension; automatic submit(), requestSubmit(), JS, meta and HTTP Refresh handoffs are distinguished; form bodies are absent and callback codes are redacted in exports |
| Mixed client/server mechanisms | Complete ordered chain across committed documents |
| Request ID changes and same-URL abort retries | Preserve earlier redirects within the same top-frame navigation |
| New visit to the same URL | New capture even if an earlier request was aborted |
| Trusted link or script button; reload; back/forward | Separate visits, without false JavaScript classification |
| Iframe/subresource redirects | Do not enter the top-frame capture |
| History API URL update | Do not invent HTTP redirects or erase existing network evidence |
| HSTS upgrade | Explicit browser upgrade, not a server connection |
| 404, 500, DNS failure, redirect loop | Honest failure evidence, including repeated redirect hops |
| Concurrent tabs, worker suspension, browser restart | Existing isolation and lifetime guarantees remain intact |
| Browser-controlled incognito access | Native permission can be enabled and disabled; the same redirect mechanisms work in private tabs |
| Private popup, worker suspension and window closure | Popup reads the private active tab; private captures survive worker suspension and disappear when their tabs close, without altering regular captures |

Each browser assertion is recorded in ignored `test-results/extension.json`. Normalized recorded-event regressions cover event order and request-ID changes that are not deterministic on a local fixture server. Public Maps evidence is kept under ignored `test-results/`.

All contract rows passed their relevant local checks on 2026-11-03: 42 redirect browser check groups, eight incognito browser check groups and 32 unit tests, plus the seven-scenario popup UI suite. Both pushState and replaceState were exercised without altering the network capture. The HTTP Refresh popup export was checked for query-value redaction. Exact release evidence belongs in VERIFICATION.md.
