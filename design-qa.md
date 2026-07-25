# Design QA

## Comparison target

- Source visual truth:
  - `https://high-end-plumbing-landing-page.vercel.app/`
  - captured desktop home: `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/01-reference-hero-desktop.png`
  - captured desktop catalog: `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/02-reference-catalog-desktop.png`
  - captured desktop delivery: `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/04-reference-delivery-tab-desktop.png`
  - captured desktop contacts: `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/05-reference-contacts-tab-desktop.png`
  - captured mobile states: `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/06-reference-hero-mobile.png` through `09-reference-delivery-content-mobile.png`
- Implementation screenshot path: unavailable; the prototype was not launched by owner instruction.
- Intended comparison viewports:
  - desktop `1280 x 720`, device scale factor `1`;
  - mobile `390 x 844`, device scale factor `1`.
- Source pixel dimensions:
  - desktop captures `1280 x 720`;
  - mobile captures `390 x 844`.
- Implementation pixel dimensions, CSS size and density normalization: unavailable until runtime capture is authorized.
- Intended states: homepage and catalog in dark mode; delivery and contacts tabs in dark mode; homepage/catalog in light mode; desktop and mobile.

## Full-view comparison evidence

The source captures were opened and inspected. A browser-rendered implementation artifact does not exist because no preview process or listener was started. Code review and a successful Next.js build are not valid substitutes for visual comparison.

## Focused region comparison evidence

Blocked. Header typography, hero proportions, card border/opacity, product-image treatment, theme toggle, catalog toolbar, carousel state, mobile menu and information tabs require implementation screenshots before focused comparison.

## Findings

- [P1] Rendered fidelity cannot be verified
  - Location: all redesigned routes.
  - Evidence: source captures are available, but there is no implementation screenshot at a matching viewport and state.
  - Impact: typography wrapping, spacing, color balance, image crop and responsive behavior cannot be accepted from source code alone.
  - Fix: start the isolated preview only after owner approval, capture matching desktop/mobile dark/light states, combine each source/implementation pair, then run the comparison loop.

- [P1] Runtime interactions remain visually untested
  - Location: theme toggle, mobile menu, information tabs, catalog filters/sort/view controls, carousel and product/contact links.
  - Evidence: lint, typecheck and build passed, but the browser was intentionally not opened.
  - Impact: a hydration, CSP, overflow, focus, transition or console regression could remain invisible.
  - Fix: test primary interactions and browser console under the same temporary preview used for visual QA.

## Required fidelity surfaces

- Fonts and typography: exact Oswald/Inter WOFF2 subsets and source-style weights/tokens are implemented; rendered optical weight, wrapping and fallback behavior remain unverified.
- Spacing and layout rhythm: desktop/mobile CSS breakpoints and source-style grids are implemented; rendered dimensions, overflow and vertical rhythm remain unverified.
- Colors and visual tokens: source slate palette, glass opacity, borders, ambient light and a matching light theme are implemented; screenshot sampling remains pending.
- Image quality and asset fidelity: real product/manufacturer images are preserved and Lucide supplies interface icons; rendered crop, sharpness and overlay treatment remain pending.
- Copy and content: production copy, current catalog totals, prices and route content are preserved in source; browser rendering remains pending.

## Comparison history

- Pass 0: source captures inspected; implementation capture blocked because starting the prototype was not authorized. No visual fix loop can begin until both artifacts exist.

## Implementation checklist

1. Obtain approval to start a temporary Tailscale-only preview.
2. Capture matching desktop/mobile, dark/light and key interaction states.
3. Compare combined source/implementation pairs.
4. Fix every P0/P1/P2 mismatch and repeat captures.
5. Run runtime catalog, CSP, analytics and route checks.

## Follow-up polish

Deferred until the first valid visual comparison.

final result: blocked
