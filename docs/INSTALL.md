# Install Redirect Inspector

Install the extension in Chrome or Brave on your desktop. Keep the extracted folder in a permanent location.

## Download and install

1. Open [the latest release](https://github.com/Nulifyer/redirect-path-chrome-extension/releases/latest).
2. Download the file named `redirect-inspector-VERSION-chromium.zip`. Choose the extension ZIP rather than GitHub's source-code download.
3. Extract the ZIP into a folder you will keep, such as `Extensions/redirect-inspector`.
4. Open `chrome://extensions` in Chrome or `brave://extensions` in Brave.
5. Turn on **Developer mode**.
6. Choose **Load unpacked** and select the extracted folder containing `manifest.json`.
7. Pin Redirect Inspector using your browser's extensions menu.

Leave Developer mode enabled and keep the extracted folder in place.
If your browser is managed by an organization, its settings may prevent this installation method.

## Record your first page

1. Open or reload an HTTP or HTTPS webpage.
2. Wait for it to load, then click Redirect Inspector in the toolbar.
3. Read the final status and redirect count at the top.
4. Select a step to inspect that response's details.

Recording starts when a page loads. A page that was already open before installation needs a reload.
Browser settings pages cannot be captured. Incognito is unavailable in this version.

## Keep it updated

Follow [the update guide](https://github.com/Nulifyer/redirect-path-chrome-extension/blob/main/docs/UPDATING.md) when a new release is available.

For a walkthrough, see [using the popup](https://github.com/Nulifyer/redirect-path-chrome-extension/blob/main/docs/USING.md).
If no capture appears, see [troubleshooting](https://github.com/Nulifyer/redirect-path-chrome-extension/blob/main/docs/TROUBLESHOOTING.md).
