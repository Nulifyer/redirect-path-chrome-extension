# Testing and evidence

## Evidence standard

Type checks verify TypeScript consistency. Unit tests cover normalized capture events, navigation identity, classification, bounds, redaction, and presentation.
The browser check loads the built extension in an isolated Chromium profile and exercises real local HTTP/TLS navigations.
The UI check opens the offline sample file for layout, keyboard, theme, and sample-state checks.
The [redirect scenario contract](reference/REDIRECT-SCENARIOS.md) defines mechanism and navigation coverage. Browser fixtures verify actual Chrome behavior; recorded-event tests cover Maps-style request-ID handoffs/retries and callback ordering. Public Maps observations are additional evidence and do not run in CI.
Updater tests verify installation, archive validation, checksum failures, rollback, locking constraints, check-only behavior, and downgrade rejection.
Exact completed checks and limitations belong in `.agents/reference/VERIFICATION.md`.

## Fast checks

```sh
bun run typecheck
bun test
bun run test:updater
bun run build
```

## Full checks

```sh
bun run package
bunx playwright install chromium
bun run test:ui
EXTENSION_DIR=dist/release/extension bun run test:browser
EXTENSION_DIR=dist/release/extension bun run test:incognito
```

Set `CHROME_BIN` to an existing compatible full Chromium executable if needed.
The extension test uses Playwright's Chromium channel, not the extension-free headless shell.
Hosted extension checks explicitly clear CHROME_BIN to avoid an inherited runner browser override.
It requires Python 3.9+ and OpenSSL. Temporary profiles and fixture certificates are removed after the run.
No user browser profile is used. The HSTS fixture maps a preloaded .dev hostname to 127.0.0.1 and trusts only that fixture certificate's SPKI.
Browser screenshots and structured evidence go under ignored `test-results/`.

Project records can be checked with the local project-continuity skill validator.

## Environment

Bun 1.4.3, TypeScript 5.9.3, Playwright 1.64.1, and Chrome for Testing 156.0.8078.4 were used for local evidence.
GitHub workflows install the locked Playwright Chromium build and system dependencies on Ubuntu.
The package builder generates a deterministic ZIP through Python and includes bundled dependency license notices.

## Known gaps

JavaScript redirects remain inferred from navigation signals and recent trusted gestures. This does not identify script source.
History restores, protected browser pages, or restricted site access can lack network metadata.
This is not a full accessibility audit, an exhaustive public-site compatibility audit, or verification of every Chromium derivative.
Web Store packaging/submission is not covered. Incognito checks use a disposable Chromium profile and the standard browser permission toggle; they do not change the user's browser settings.
