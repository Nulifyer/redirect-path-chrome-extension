# Project decisions

## Binding decisions

| ID | Decision | Reason | Evidence |
| --- | --- | --- | --- |
| D1 | Work under `~/Projects/redirect-path-chrome-extension` | User-specified project location | User request, 2026-11-03 |
| D2 | Automatically record page-load redirects | Tool must retain the actual chain for debugging and auditing | User clarification, 2026-11-03 |
| D3 | Focus the interface on auditing results | User wants important facts on one screen | User request, 2026-11-03 |
| D4 | Use established UI references | User explicitly requested T3 Code and Material You | User request and `.agents/reference/DESIGN.md` |
| D5 | Distribute through GitHub ZIPs and a manual Linux helper | Provide installation and update options owned by this project | User request and verified project releases |
| D6 | Defer Web Store release automation | User wants a later workflow discussion | User request, 2026-11-03 |
| D7 | Run the end-user installation/update script; leave Brave controls to the user | User explicitly asked to handle browser reload personally | User clarification, 2026-11-03 |
| D8 | Verify a broad redirect scenario matrix | Maps exposed a request-lifecycle gap; the user requires different mechanisms and navigation boundaries to work correctly | User request, 2026-11-03 |
| D9 | Keep incognito access and other standard extension controls under the user's control | The user rejected unrequested restrictions on normal browser features | User clarification, 2026-11-03 |

## Working implementation choices

These are concrete proposals, not additional user-confirmed requirements.

- Use React, TypeScript, Base UI, and bundled Lucide icons for the prototype.
- Maintain the project's own product source and assets.
- Keep real capture local and session-only, with explicit deletion and no external service calls.
- Proceed with live implementation after the user's "go make this" instruction.
- Default copy/export redacts query values, credentials, fragments, and sensitive header names. Full export requires an explicit checkbox each popup session.
- Publish original source under MIT, using the display name Redirect Inspector.

## Product identity

Redirect Inspector is the user's own tool. Its purpose, requirements, and documentation describe its own capabilities.
Do not frame the project through comparisons with another extension or retain unrelated extension investigations in tracked project records.

## Documentation audience

The user requires a product-focused README and end-user examples/how-to guides in `docs/`.
Implementation, research, and verification records belong under `.agents/`.

## Open decisions

None.

## Superseded decisions

None.
