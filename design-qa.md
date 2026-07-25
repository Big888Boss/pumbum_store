# Design QA

## Comparison target

- Source visual truth:
  - `https://high-end-plumbing-landing-page.vercel.app/`
  - desktop home:
    `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/01-reference-hero-desktop.png`
  - desktop catalog:
    `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/02-reference-catalog-desktop.png`
  - desktop contacts:
    `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/05-reference-contacts-tab-desktop.png`
  - mobile home:
    `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/06-reference-hero-mobile.png`
- Browser-rendered implementation:
  - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/runtime/home-desktop-dark.png`
  - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/runtime/catalog-desktop-dark.png`
  - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/runtime/contacts-desktop-dark.png`
  - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/runtime/home-mobile-dark.png`
  - dark/light and interaction captures are in the same `runtime/` directory.
- Comparison pairs:
  - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/comparison-home-desktop.png`
  - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/comparison-catalog-desktop.png`
  - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/comparison-contacts-desktop.png`
  - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/comparison-home-mobile.png`
- Viewports and density:
  - desktop source and implementation: `1280 x 720`, device scale factor `1`;
  - mobile source and implementation: `390 x 844`, device scale factor `1`;
  - comparison pairs use equal-size halves and require no density normalization.
- States: homepage, catalog and contacts in dark mode; homepage in light mode; mobile menu open; mobile category/carousel; product page with a loaded local image.

## Full-view comparison evidence

The four source/implementation pairs were opened as combined images and reviewed at matching pixel dimensions.

- Homepage: the implementation preserves the source slate/navy palette, Oswald display typography, compact uppercase navigation, cold ambient glow, technical grid, thin glass borders and the engineering symbol. The production copy and extra search/KPI functionality produce intentional wrapping and density differences.
- Catalog: the source offers four illustrative groups; the implementation uses the same visual language around the real ten-category information architecture, search, task and manufacturer entry points. This is an intentional behavior-preserving adaptation rather than a missing section.
- Contacts: the implementation preserves the source hierarchy, glass contact card, tabs, typography and dark technical map treatment while retaining current production details.
- Mobile: the source capture clips a desktop-like layout horizontally. The implementation intentionally converts it to a fully responsive one-column flow, as required by the owner, while preserving the selected visual language.

## Focused region comparison evidence

- Header and hero: exact Oswald/Inter subsets render without fallback; logo, compact navigation, theme control, hero hierarchy and technical visual were inspected in dark and light states.
- Product image panel:
  `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/runtime/product-desktop-dark.png`
  shows a real `1167 x 600` ESPA product image after the runtime image union was corrected.
- Mobile menu:
  `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/runtime/home-mobile-menu-open.png`
  confirms readable controls over a strengthened glass background.
- Mobile category:
  `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/runtime/category-mobile-dark.png`
  confirms stable product media, readable typography, carousel markers and touch controls.
- Light theme:
  desktop and mobile captures confirm the same layout and effects with light tokens. Computed primary-button text is white on the dark brand gradient; secondary and header controls use dark text on translucent white surfaces.

## Required fidelity surfaces

- Fonts and typography: passed. Exact source Oswald and Inter WOFF2 subsets are self-hosted. Display weights, letter spacing, line heights and uppercase technical labels are consistent with the source. Production copy causes accepted line-wrap differences.
- Spacing and layout rhythm: passed. Desktop composition follows the source split hero and glass-card rhythm. Mobile collapses without horizontal overflow and retains usable spacing, touch targets and content order.
- Colors and visual tokens: passed. Slate/graphite surfaces, blue-grey ambient lighting, white borders, glass opacity and restrained glow match the source direction. The light theme preserves hierarchy and computed contrast.
- Image quality and asset fidelity: passed. Real product/manufacturer images and Lucide interface icons are used. All `8,410` local catalog image references exist in the preview runtime; visible images in tested flows have non-zero natural dimensions.
- Copy and content: passed. Production catalog totals, product names, prices/status language, phone, email, address and buyer journeys are retained. No mock product copy replaces source-backed content.

## Primary interactions tested

- dark/light theme switching and persistence after reload;
- desktop and mobile overflow;
- mobile menu open and catalog navigation;
- catalog search for `ESPA` and result rendering;
- product page, product image and contact CTA;
- information tabs and SPA navigation;
- all ten category carousels, three distinct products, `34px` touch controls and five-second autoplay;
- browser console, page errors and same-origin request failures.

No browser console errors, page errors or non-cancelled same-origin request failures remained.

## Comparison history

- Pass 0 — blocked:
  - implementation was not running by owner instruction, so screenshots and runtime interaction evidence were unavailable.
- Pass 1 — P1 product images:
  - ESPA and then TIM/Aquatec local images were missing from the isolated preview mapping even though catalog references were preserved;
  - fixed by combining the existing factory image stores as read-only runtime symlinks;
  - post-fix audit: `8,410` local references, `localMissing=0`;
  - post-fix product evidence shows non-zero natural dimensions and the real product photo.
- Pass 2 — P2 mobile menu density:
  - the open glass menu allowed too much hero text to show through;
  - fixed by increasing the menu background to a `96%` mix of `--bg-deep`;
  - post-fix mobile menu capture remains readable and visually consistent.
- Pass 3 — passed:
  - matching desktop/mobile captures were regenerated after the final build;
  - combined comparisons were inspected;
  - no actionable P0/P1/P2 findings remained.

## Findings

No actionable P0, P1 or P2 design findings remain.

## Follow-up polish

- P3: the desktop implementation headline wraps to four lines while the reference uses three. This is accepted because the production message includes the full “высшего класса” phrase and the real search/KPI content shares the first viewport.
- P3: the reference catalog is an illustrative four-card mock, while the implementation exposes the real ten-category buyer architecture above the category grid. This is an intentional functional adaptation.

final result: passed
