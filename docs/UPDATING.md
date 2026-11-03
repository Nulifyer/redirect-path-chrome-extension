# Update Redirect Inspector

Keep the same installation folder and browser extension entry when updating. Your theme and recording preference should remain available.

## Update manually

1. Download the extension ZIP from [the latest release](https://github.com/Nulifyer/redirect-path-chrome-extension/releases/latest).
2. Extract it into a temporary folder.
3. Remove the old files inside your installed extension folder, then copy in the new files. Keep the installed folder itself.
4. Open `chrome://extensions` or `brave://extensions`.
5. Click **Reload** on Redirect Inspector's card.
6. Refresh the webpage you want to inspect.

Avoid uninstalling the existing browser entry or loading another folder as a separate installation.
Reloading clears previous captures, so save anything you need before updating.

## Use the Linux helper

Download [`update-redirect-inspector.py`](https://github.com/Nulifyer/redirect-path-chrome-extension/releases/latest/download/update-redirect-inspector.py) from the latest release.
You need Python 3.9 or newer.

From the folder containing the downloaded helper, check for an update:

```sh
python3 update-redirect-inspector.py --check
```

Install or update the helper's default installation:

```sh
python3 update-redirect-inspector.py
```

The helper prints the installation folder. For a first installation, select that folder with **Load unpacked**.
After an update, click **Reload** on the existing extension card.

If you installed the extension in another folder, specify that folder every time:

```sh
python3 update-redirect-inspector.py --directory /path/to/your/extension
```

Replace `/path/to/your/extension` with the actual folder containing `manifest.json`.
The helper checks the download before replacing files. If it reports a validation failure, your existing installation is left in place.

Updates run only when you invoke the helper. It does not enable Developer mode or reload the browser extension for you.

## Verify a downloaded ZIP

Download `SHA256SUMS` from the same release as your ZIP. Place both files together, then run:

```sh
sha256sum --check SHA256SUMS
```

The ZIP should report `OK`. If it does not, download it again before installing.

For problems loading the updated extension, see [troubleshooting](TROUBLESHOOTING.md).
