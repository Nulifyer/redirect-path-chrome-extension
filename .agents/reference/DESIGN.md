# Interface design

## Reference basis

The design uses [Base UI](https://base-ui.com/react/overview/quick-start) for buttons and accessible tabs.
T3 Code's inspected [web package](https://github.com/pingdotgg/t3code/blob/cefb544af3c98224874419198c0359b652ca3c94/apps/web/package.json)
also uses Base UI, React, and Lucide.
Its [button implementation](https://github.com/pingdotgg/t3code/blob/cefb544af3c98224874419198c0359b652ca3c94/apps/web/src/components/ui/button.tsx)
and [style tokens](https://github.com/pingdotgg/t3code/blob/cefb544af3c98224874419198c0359b652ca3c94/apps/web/src/index.css)
provide concrete references for compact controls, consistent insets, small radii, and restrained borders.
Reference commit: `cefb544af3c98224874419198c0359b652ca3c94`.

[Material 3 color roles](https://m3.material.io/styles/color/roles)
inform tonal surfaces, status colors, and rounded segmented controls.
This is an adaptation for a dense debugging tool, not a claim of Material certification.
Google's [Material Web](https://github.com/material-components/material-web) was considered.
Its README says the project is in maintenance mode, so it was not selected as the implementation dependency.

No T3 Code component source was copied. Lucide provides bundled icons through its package.
No fonts, icons, or component code load from a CDN.

## Hierarchy and geometry

Target popup width is 640 CSS pixels, within Chrome's popup limits.
The live inspector is 600 pixels high. The offline sample preview is 580 pixels high. Its sample selector is absent from the extension.

1. Small toolbar identifies the task and contains theme, export, and copy actions.
2. Final hostname and path identify the inspected destination. A status badge shows the final outcome.
3. A compact summary shows redirect count and measured request time.
4. The complete chain shows a redirect mechanism badge (`JS`, `META`, `HSTS`) or HTTP status, full URL, and per-request time. The badge replaces the repeated subtitle beneath each URL.
5. Selecting a step updates the response overview directly below the chain.
6. The Headers tab shows all headers for that response, with an inline filter.

Ordinary captures fit on one screen without expansion.
The chain and details share an internal scroll region for long content.
URL values wrap in chain rows. The destination subtitle truncates but retains the full value in its title.
Unknown timing and IP values stay explicitly unavailable.
The selected step's heading retains its HTTP status and full description, including an observed meta-refresh delay or JavaScript inference. Badge tooltips and accessible step names retain the same distinctions.

## Tokens and type

The extension icon uses a rounded blue tile, a mint starting dot, and a white curved route arrow. Its rounded strokes follow the Lucide icon style used in the popup. The original SVG master is `assets/icon.svg`; antialiased transparent PNG exports at 16, 32, 48, and 128 pixels are committed under `extension/` and copied into builds. No image renderer or remote asset is needed at build time.

| Role | Dark prototype value |
| --- | --- |
| Main surface | `#191c22` |
| Raised surface | `#22262e` |
| Main text | `#e3e5eb` |
| Secondary text | `#a3aab8` |
| Selection and control accent | `#b3c7ff` |
| Accent container | `#293751` |

System sans-serif avoids remote font requests and keeps the popup consistent with desktop controls.
The domain uses 21px text. Controls and URLs use 11–13px.
Status codes use tabular numbers and semantic color plus visible text.
Surface corners use 12px, rows and icon controls use 8px, and segmented controls use a pill shape.
There are no gradients, hero graphics, logo banners, or promotional sections.

## Interaction and states

- Real Base UI tabs provide focus and arrow-key behavior.
- Every icon action has an accessible name.
- Copy reports success or clipboard failure.
- Live JSON export marks actual captured evidence `sample: false`. The offline preview uses `sample: true`.
- Seven scenarios exercise HTTP chains, direct cached responses, HSTS and client redirects, HTTP error, network error, long content, and empty capture.
- Light and dark modes share semantic tokens.
- Narrow widths reflow without horizontal overflow. The production target remains desktop Chromium.
- Reduced motion is respected. There are no automatic animations.

## Live controls

The user requested implementation after reviewing the proposal.
The live toolbar includes working pause/resume and Clear controls.
Default exports redact query values and sensitive headers. A per-popup checkbox explicitly enables full values.
Theme preferences persist locally. The selected response updates in place as recording progresses.
