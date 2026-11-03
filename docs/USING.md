# Use Redirect Inspector

## Follow a redirect chain

Load the URL you want to audit, then click the extension in your browser toolbar.
The top of the popup shows the final destination, its response status, and the number of redirects.

Read the chain from top to bottom. Each row shows a URL, a badge identifying its redirect type or response status, and request time when available.
Select a row to inspect that response. The overview below the chain updates in place.
Scroll inside the popup when a chain or its details need more room.

## Find a response header

1. Select the step you want to inspect.
2. Choose **Headers**.
3. Type part of a header name or value into **Filter headers**.

For example, search for `location` to find a redirect's destination header, or `cache-control` to inspect caching instructions.
Clear the filter to see the available headers again.
Choose **Overview** to return to the response summary.

## Read the badges

| Badge | What it tells you |
| --- | --- |
| `301`, `308` | The server indicates that the URL has moved permanently. |
| `302`, `303`, `307` | The server sends this visit to another URL without marking the move permanent. |
| `HSTS` | The browser switches to HTTPS before contacting the server for that step. |
| `META` | The page directs the browser to another URL using a meta refresh. Select the step to see its delay. |
| `REF` | An HTTP Refresh header directs the browser to another URL. Select the step to see its delay. |
| `FORM` | A page automatically submits a form to continue the route. Form contents are not captured. |
| `JS` | The navigation appears to be a JavaScript redirect. This is inferred and does not identify the script. |
| `200` | A successful final response. Other final HTTP status codes appear as received. |
| `ERR` | The request failed without an HTTP response. Select the step for the error. |
| `N/A` | No response status was available, such as a history restore. |

Select a step to see its HTTP status and response details. For example, a `META` step can have an HTTP `200` response.
Hover over a badge for its description.

Request time is time spent on the recorded requests. It is not the full time needed to display the page.

## Copy or save a capture

Choose **Copy chain** for a readable summary, or the download button for a JSON file.

By default, exports hide URL query values, URL credentials, fragments, and sensitive header values.
Leave **Include full values in copy and export** unchecked when you do not need those values.
If a private audit requires exact values, check it before copying or exporting. The choice resets when you reopen the popup.

Hostnames, URL paths, and ordinary header values can still contain private information. Review a capture before sharing it.

## Pause or clear recording

Use **Pause recording** to stop new recording across tabs. Existing captures remain available.
Choose **Resume recording**, then reload the page to start a new audit.

Use **Clear capture** to delete the current tab's capture. Reload the page when you want to record it again.

## Change the theme

Use the sun or moon button to switch between light and dark themes. Your choice is remembered.

Continue with [audit examples](EXAMPLES.md) or [troubleshooting](TROUBLESHOOTING.md).
