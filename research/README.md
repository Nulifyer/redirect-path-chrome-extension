# Local investigation evidence

`artifacts/` contains the downloaded Redirect Path 4.0.0 CRX, its ZIP payload, and extracted files.
These files are ignored by Git. They are evidence for the privacy audit, not code to reuse or redistribute.
The recorded SHA-256 and source locators are in `docs/PRIVACY-AUDIT.md`.

`t3-*` files contain locally downloaded T3 Code reference files and their commit identity.
They are also ignored. Durable design references link directly to the source commit in `docs/DESIGN.md`.

The source inspection identified one fetch endpoint and reviewed its call path.
No original-extension server endpoint was invoked.
The original background script was executed only in a VM with mocked browser APIs for the session-retention reproduction.
