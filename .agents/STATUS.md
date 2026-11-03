# Project status

Updated: 2026-11-03
Owner: primary agent
State: implemented, verified, and published

## Project state

The live MV3 extension, compact popup, GitHub workflows, package builder, Linux updater, privacy policy, and investigation docs are complete.
Source is published at https://github.com/Nulifyer/redirect-path-chrome-extension.
The first public release is v0.1.1, built from source commit `5f0732c52b32866a0b0331829b25ed781ffe9391`.
The exact installable package remains at `dist/release/extension`, with the ZIP and updater alongside it.
The user's browser profile was not modified.

## Current batch

No active implementation batch. Delivery evidence is recorded in `docs/VERIFICATION.md`.

## In progress

No running implementation or delegated task.

## Next action

Respond to the user's installation or feature feedback. Discuss Chrome Web Store publication and release automation only when requested.
For another release, increase both version owners, commit, tag, and dispatch the documented draft-release workflow.

## Blockers

None for GitHub installation. Web Store publication is intentionally deferred.

## Verification

Local checks, hosted source checks, and the hosted tagged-release workflow passed.
The public ZIP checksum, all 15 package files, release metadata, and helper matched the local tagged source build.
The actual public helper passed first install and same-directory replacement. A real Chromium extension Reload preserved identity and preferences and cleared session capture data.
See `docs/VERIFICATION.md` for exact URLs, methods, results, and limits.
