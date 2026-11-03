# Audit examples

The URLs and chains below illustrate what to look for. They are examples, not live test results.

## Check a moved page

Suppose `/old-guide` should now lead to `/guides/getting-started`.

1. Enter the old URL in your browser and let the page load.
2. Open Redirect Inspector.
3. Check that the final destination is the intended new page.
4. Select the old URL's response and inspect its status and **Location** value.

A simple move might look like this:

```text
301  https://example.com/old-guide
200  https://example.com/guides/getting-started
```

Check the redirect type against your intended behavior. A temporary redirect deserves investigation if the move should be permanent.
The final page should also return the response you expect, rather than merely displaying a page that looks correct.

## Find an unnecessary detour

A working destination can still require several redirects:

```text
301  http://example.com/old-guide
302  https://example.com/old-guide
301  https://www.example.com/old-guide
200  https://www.example.com/guides/getting-started
```

Read each destination in order and identify which steps belong in your intended route.
Copy the chain into an issue so the person changing the redirects can see the sequence.
After the change, enter the original URL again and compare the new capture with the saved one.

## Investigate a redirect loop

Open the problematic URL and let the browser finish or show its error page.
In Redirect Inspector, look for URLs that appear repeatedly and inspect their destination headers.

For example, `/sign-in` might send the browser to `/account`, which sends it back to `/sign-in`.
Export the capture to attach the repeated sequence and final error to a bug report.

Redirect Inspector shows the observed route. It does not establish whether the cause is a login rule, a server setting, or another condition.

## Explain an HTTP-to-HTTPS upgrade

Enter the HTTP version of a URL and inspect its first step.

If the badge says **HSTS**, the browser performed that step locally. Select it to see **Browser HTTPS upgrade** in the response details.
Do not treat it as evidence that the server returned the same redirect.
Inspect the following HTTPS response to see what the server returned.

## Share a login-redirect problem

1. Reproduce the problem in the affected tab.
2. Open the extension and check the route to the final login or error page.
3. Leave **Include full values in copy and export** unchecked.
4. Choose **Copy chain** or export the JSON capture.
5. Review URLs and headers before adding the capture to your report.

Default redaction hides query values, but private information may remain in hostnames, paths, and other response details.
