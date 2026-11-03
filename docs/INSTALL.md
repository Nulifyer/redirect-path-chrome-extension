# Install Redirect Inspector

Redirect Inspector records the current tab's page redirects automatically.
Captures stay in browser session memory. Closing a tab deletes its capture.
There are no external analysis services, telemetry, or automatic update connections.

## First installation

1. Download `redirect-inspector-VERSION-chromium.zip` from the project's GitHub release.
2. Extract it into a permanent directory. The directory must contain `manifest.json`.
3. Open `chrome://extensions` or `brave://extensions` and enable Developer mode.
4. Choose Load unpacked and select the extracted directory.
5. Pin the extension, then load or reload the webpage you want to inspect.

Click the extension icon to see the recorded chain. Select a step for its response details.
Use Headers to inspect or filter the available response headers.
Pause stops recording across tabs. Resume applies to new navigations.
Clear deletes the current tab's capture.

Copy and export redact URL query values, credentials, fragments, and sensitive header names by default.
The checkbox for full values disables export redaction for that popup session.
Hostnames, paths, and ordinary header values can still contain private information. Review exports before sharing.
Some authentication and cookie response headers are never retained, even in a full export.

## Manual updates

Replace the installed directory's files with the next release, using the same path.
Remove the old files first so deleted files do not remain. Do not uninstall the browser entry.
Click Reload on the extension's browser card, then refresh the webpage.
Keeping the same directory and manifest key preserves the extension identity and preferences.

## Linux update helper

The standalone helper requires Python 3.9 or newer. It runs only when you invoke it.

```sh
python3 update-redirect-inspector.py --check
python3 update-redirect-inspector.py
```

It checks GitHub Releases, verifies the ZIP checksum and release metadata, and atomically replaces the installation.
Validation failure leaves installed files intact. Replacement failure restores the prior installation.
The default directory is `${XDG_DATA_HOME:-$HOME/.local/share}/chrome-extensions/nulifyer-redirect-inspector`.
Use `--directory /path/to/extension` to select an existing packaged installation.
The helper prints the folder for Load unpacked or Reload. It does not edit the browser profile or reload Chrome.

Each release includes `SHA256SUMS`. With the ZIP in the same directory, verify it with:

```sh
sha256sum --check SHA256SUMS
```

The checksum detects corruption. It is not an independent publisher signature.
GitHub ZIP installations do not update silently. Web Store distribution is separate future work.
