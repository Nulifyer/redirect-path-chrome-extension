# Project status

Updated: 2026-11-03
Owner: primary agent
State: redirect scenario matrix verified locally; release preparation in progress

## Project state

The live MV3 extension, compact popup, GitHub workflows, package builder, Linux updater, privacy policy, and user guides are complete.
Source is published at https://github.com/Nulifyer/redirect-path-chrome-extension.
The latest public release is v0.1.3, built from source commit `b5e9be8585821ed33f33eb0cdd8dec9f772a4288`.
The exact installable package remains at `dist/release/extension`, with the ZIP and updater alongside it.
The published installer has installed v0.1.3 at `~/.local/share/chrome-extensions/nulifyer-redirect-inspector`, with `redirect-inspector-update` in `~/.local/bin`. The user will manage Brave's Load unpacked and Reload controls; do not automate the browser UI.
Redirect Inspector is framed as the user's own auditing tool.
The README now introduces the product; `docs/` contains end-user guides and examples. Engineering references are under `.agents/reference/`, with build instructions in `.agents/DEVELOPMENT.md`.

## Current batch

Fix request-ID handoffs/retries that dropped Maps redirects, then expand deterministic browser coverage across redirect mechanisms and navigation boundaries. Publish the verified update and run the installed release updater. Preserve the user's instruction to handle Brave controls personally.

## In progress

The Maps fix retains observed 302/302/200 chains for live HTTP and HTTPS inputs. Type checking, 29 unit tests, seven-scenario UI checks, and 36 packaged-browser check groups pass. HTTP Refresh headers have a REF badge and redacted export targets; invalid earlier meta tags no longer hide a valid refresh. No delegated tasks.

## Next action

Commit the inspected v0.1.4 update, tag it, run the hosted release workflow, verify downloaded assets, publish, then run redirect-inspector-update for the user's permanent installation. Leave Brave controls to the user.

## Blockers

None for GitHub installation. Web Store publication is intentionally deferred.

## Verification

Local checks, hosted source checks, and the hosted tagged-release workflow passed.
The public ZIP checksum, all 15 package files, release metadata, and helper matched the local tagged source build.
The updater's public check-only lookup reports latest version 0.1.3.
The actual public helper passed first install and same-directory replacement. A real Chromium extension Reload preserved identity and preferences and cleared session capture data.
README/user-guide links, standalone packaged-guide links, documentation audiences, whitespace, and project-record structure were checked after the documentation reorganization.
See `.agents/reference/VERIFICATION.md` for exact URLs, methods, results, and limits.
