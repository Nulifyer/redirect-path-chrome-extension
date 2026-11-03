# Repository agent instructions

## Product rules

- Read `.agents/README.md` and current project records before substantial work.
- Redirect Inspector is the user's own redirect debugging and auditing tool. Develop its code, interface, and documentation around its own goals.
- Capture automatically on page load, as confirmed by the user on 2026-11-03.
- Keep captured navigation evidence local and session-only. No AI endpoint, telemetry, promotional links, remote assets, or unsolicited tabs.
- Use Base UI controls and the T3 Code / Material 3 direction recorded in `.agents/reference/DESIGN.md`.
- The live extension must use actual captured navigation evidence. Keep the offline sample preview clearly identified.
- Keep the stable manifest public key and same-directory update behavior. Distribute installable GitHub ZIPs with the project's manual Linux update helper. Web Store automation is deferred.
- Exclude `research/artifacts/` and downloaded reference source from Git and release packages.

## Project continuity

For substantial work, read `.agents/README.md` and only the relevant task records. Use `project-continuity` to preserve user intent, verified progress, and coordination across sessions or independent tasks. Project status owns coordination priorities; each independent task owns its next action and acceptance evidence. Do not create ledgers for routine one-off work or every worker. Deliver verified logical batches regardless of commit permission. Stage and commit only inspected batch changes when authorized; otherwise preserve verified uncommitted work and continue within existing authority.

## Documentation audiences

- The root README is the product introduction. Explain benefits, real capabilities, and how to get started.
- `docs/` is for end users: installation, updates, walkthroughs, examples, troubleshooting, and privacy.
- Keep build commands, architecture, design rationale, release engineering, audit methods, test results, and project history under `.agents/`.
- Do not add implementation details or internal project records to the README or user guides.

## Product identity

- Present Redirect Inspector as the user's own tool. Do not frame it as a fork, replacement, or derivative of another extension.
- Keep comparisons and unrelated extension investigations out of tracked project documentation and active work records.
