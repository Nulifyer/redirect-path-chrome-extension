# Project plan

## Goal

Build an independent Chrome redirect debugging and auditing extension at `~/Projects/redirect-path-chrome-extension`.
The user's 2026-11-03 request begins with a privacy investigation and behavior map of Ayima Redirect Path, then a modern compact interface.
The user confirmed that every page load should start recording automatically.

## Success conditions

- The inspected store artifact and consequential privacy findings have reproducible evidence.
- The proposed interface shows final status, redirects, chain, and selected response details in one ordinary popup screen.
- Base UI, T3 Code, and Material 3 references guide the design.
- Live capture records real navigations automatically and passes the browser acceptance cases in `.agents/reference/IMPLEMENTATION-MAP.md`.
- Reviewed original source is published to GitHub with installable ZIPs and a manual update helper following Dark Reader.
- The user can install, update, reload, and audit the exact released package.

## Scope

### In

Privacy audit, behavior map, original interface prototype, automatic main-frame capture, local session data, response headers and IP, status badge, copy/export, GitHub source and release distribution.

### Out

AI analysis, telemetry, promotions, vendor branding, unsolicited release-note tabs, modifying page traffic, subresource collection, and remote fonts/assets.
Web Store release automation is deferred at the user's request.

## Product boundaries

Desktop Chromium first. Record automatically when pages load, within granted site access.
Use compact T3 Code layout conventions and Material 3 color/control roles.
Default ordinary chains fit one screen. Long evidence scrolls inside the popup.
Clearly distinguish sample data, observed evidence, inferred client redirects, and unavailable fields.

## Architecture boundaries

Independent implementation using documented Chrome APIs, not a repackaged Ayima extension.
Keep audit downloads out of Git and release packages.
Keep navigation evidence in session storage and delete closed-tab keys explicitly.
The browser adapter and capture reducer own navigation evidence. The popup consumes snapshots without refetching pages.

## Phases

1. Audit, map, and interactive design. Exit with an artifact-specific report, runnable prototype, visual inspection, interaction checks, and known limits.
2. Live capture. Exit with controlled browser fixtures covering server/client redirects, errors, tab lifetime, worker restart, and privacy behavior.
3. GitHub delivery. Exit with reviewed source, exact release ZIP validation, stable-folder install/update checks, and a draft-release workflow.
4. Discuss Web Store publication separately, including listing and release automation.

## Open planning questions

The user requested implementation with "go make this" after seeing the design.
Use default-redacted exports with explicit full-value export, and MIT licensing for original source.
Web Store publication remains a later discussion.
