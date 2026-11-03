# Your privacy

Redirect Inspector keeps captures in your browser. It does not upload them to an analysis service or collect usage analytics.

## What a capture contains

A capture can include visited URLs, redirect destinations, status codes, available response headers, server IPs, cache information, and request times.
These details can include private website addresses or identifiers supplied by the website.

The extension does not collect page text, form contents, typed keys, or clipboard contents.
Some authentication and cookie header values are excluded from captures.

## Why website access is needed

The extension needs permission to observe the sites you visit so it can record redirects when a page loads.
Opening the popup after the page loads should show the route you already took.
Restricting site access can leave a capture incomplete or unavailable.

## How long captures stay

Captures are temporary. A new navigation replaces the tab's previous capture, and closing a tab deletes its capture.
Restarting the browser, reloading the extension, or updating it also clears captures.
Older captures may be cleared when space is needed.

Use **Clear capture** to delete the current tab's capture, or **Pause recording** to stop recording new visits.
Your theme and pause preference are remembered separately. Captures are not synced to other browsers.
Incognito is unavailable in this version.

## What copy and export include

Copying or exporting happens only when you choose it.
By default, URL query values, credentials, fragments, and sensitive header values are redacted.
Checking **Include full values in copy and export** includes the retained values for that popup session.

Hostnames, paths, and ordinary header values can still contain private information, even in a redacted export.
Review captures before sharing them. Keep full-value exports private unless you have checked their contents.

## Updates

The extension does not check for updates or open promotional websites.
The optional Linux helper contacts GitHub only when you run it, to check for and download releases. It does not send captured browsing data.

See [installation and updates](https://github.com/Nulifyer/redirect-path-chrome-extension/blob/main/docs/UPDATING.md) for instructions.
