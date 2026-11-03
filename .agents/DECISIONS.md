# Project decisions

## Binding decisions

| ID | Decision | Reason | Evidence |
| --- | --- | --- | --- |
| D1 | Work under `~/Projects/redirect-path-chrome-extension` | User-specified project location | User request, 2026-11-03 |
| D2 | Automatically record page-load redirects | Tool must retain the actual chain for debugging and auditing | User clarification, 2026-11-03 |
| D3 | Remove vendor branding and unrelated content | User wants important facts on one screen | User request, 2026-11-03 |
| D4 | Use established UI references | User explicitly requested T3 Code and Material You | User request and `.agents/reference/DESIGN.md` |
| D5 | Follow Dark Reader's GitHub delivery pattern | Existing personal extension has installable ZIPs and a manual helper | User request and inspected local DarkReaders docs |
| D6 | Defer Web Store release automation | User wants a later workflow discussion | User request, 2026-11-03 |

## Working implementation choices

These are concrete proposals, not additional user-confirmed requirements.

- Use React, TypeScript, Base UI, and bundled Lucide icons for the prototype.
- Build independent original product source and exclude vendor audit artifacts from publication.
- Keep real capture local and session-only, with explicit deletion and no external service calls.
- Proceed with live implementation after the user's "go make this" instruction.
- Default copy/export redacts query values, credentials, fragments, and sensitive header names. Full export requires an explicit checkbox each popup session.
- Publish original source under MIT, using the display name Redirect Inspector.

## Documentation audience

The user requires a product-focused README and end-user examples/how-to guides in `docs/`.
Implementation, research, and verification records belong under `.agents/`.

## Open decisions

- Optional incognito support after the first desktop release.

## Superseded decisions

None.
