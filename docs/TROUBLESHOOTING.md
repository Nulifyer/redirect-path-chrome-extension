# Troubleshooting

## No capture appears

1. Check that Redirect Inspector is enabled on your browser's extensions page.
2. If recording is paused, choose **Resume recording**.
3. Reload the webpage, then open the popup again.

The extension cannot reconstruct a page load that happened before installation or while recording was paused.
Browser settings pages cannot be captured. Incognito is unavailable in this version.

If you restricted the extension's site access, allow it to run on the site you are auditing, then reload the page.

## A status, header, IP, or time is unavailable

Some pages appear without a new network response, especially when you return through browser history.
Reload the page to record a fresh visit.

A failed connection may never receive an HTTP status. Cached responses and browser HTTPS upgrades may have no server IP to show.
Some headers are unavailable or contain values the extension does not retain.
An unavailable value should not be read as a successful response or a zero-duration request.

## A JS badge looks unexpected

The `JS` badge marks an inferred JavaScript redirect. It does not identify the script that caused the navigation.
Delayed actions and other activity on the page can make the result ambiguous.

Reload the starting URL and reproduce the route again. Check the final URL and available response details alongside the badge.

## An on-page change does not appear in the chain

The extension records page navigations. A website can update its content or address without loading another page.
Those changes, embedded frames, and redirects for images or scripts are outside the page's recorded chain.

## The capture says a limit was reached

Long chains or large response details can exceed capture limits. The popup identifies when some steps or headers were omitted.
For an audit, try starting closer to the part of the route you need to inspect.

If a previously available capture is gone, reload that tab to record it again. Captures are temporary and older captures may be cleared.

## Copy is unavailable

Choose **Export JSON** to save the capture, then review it before sharing.
You can also reopen the popup and try **Copy chain** again.

## The extension stops loading after an update

Check that Developer mode is still enabled and the installed folder still exists.
Confirm that it contains `manifest.json`, then click **Reload** on the extension card.
Refresh the webpage after the extension loads.

If your browser is managed by an organization, its settings may prevent unpacked extensions.

## Report a problem

Open an [issue](https://github.com/Nulifyer/redirect-path-chrome-extension/issues) with your browser version, extension version, and steps to reproduce the problem.
Include a redacted capture when useful, and review it for private information before posting.
