# Privacy

Redirect Inspector observes main-frame document navigations on HTTP and HTTPS pages to show redirects and response metadata.
It needs access across websites so capture can begin when a page loads, before you open its popup.

It records visited URLs, redirect targets, status codes, available response headers, server IP addresses, cache indicators, and request timings.
A content script reports meta-refresh targets and a boolean indicating a trusted user gesture.
It does not collect page text, form values, typed keys, click text, request bodies, or subresource requests.
Some sensitive response headers, including Set-Cookie and authentication headers, are replaced before storage.
Chrome also restricts which headers are available.

Captures stay in `chrome.storage.session`, which is backed by memory and not browser sync.
Tab closure and Clear delete the relevant session key. Browser restart, extension reload, and extension update clear session storage.
The latest capture replaces the previous navigation. A temporary previous-document candidate helps classify client redirects.
There is a 50-step chain limit, header-size limits, and global storage eviction of older tab captures.
The interface identifies truncated captures. An evicted capture must be recorded again by reloading its page.

Theme and pause preferences are stored locally. They do not contain captured URLs or headers.
Incognito use is disabled in this version.

The extension sends no diagnostic data to external services and includes no analytics, AI upload, promotional links, or remote assets.
Its extension-page content security policy prohibits network connections.
It does not open websites after installation or updates.

Clipboard and JSON exports occur only after your action.
Default exports redact URL query values, credentials, fragments, and sensitive header values.
You can choose full export values in the popup. Hostnames, paths, and ordinary header values may still be sensitive.
Default redaction is not a guarantee that an export contains no private information.

The optional standalone update helper contacts GitHub only when you run it.
Those requests contain release lookup and download information, not captured browsing data.
Chrome or another browser may independently contact its own services to manage extensions.
