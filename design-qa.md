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
  - colleague-feedback mobile captures:
    - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/work/pumbum-redesign-a6bc64e/docs/design-qa-assets/category-mobile-light.png`;
    - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/work/pumbum-redesign-a6bc64e/docs/design-qa-assets/task-search-mobile-light.png`;
    - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/work/pumbum-redesign-a6bc64e/docs/design-qa-assets/footer-mobile-light.png`.
  - final protected-staging captures:
    - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/work/pumbum-redesign-a6bc64e/docs/design-qa-assets/public-home-desktop-dark.png`;
    - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/work/pumbum-redesign-a6bc64e/docs/design-qa-assets/public-category-mobile-light.png`;
    - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/work/pumbum-redesign-a6bc64e/docs/design-qa-assets/public-task-search-mobile-light.png`;
    - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/work/pumbum-redesign-a6bc64e/docs/design-qa-assets/public-footer-mobile-light.png`.
- Comparison pairs:
  - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/comparison-home-desktop.png`
  - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/comparison-catalog-desktop.png`
  - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/comparison-contacts-desktop.png`
  - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/outputs/design-audit-477477/comparison-home-mobile.png`
  - colleague-feedback combined inputs:
    - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/work/pumbum-redesign-a6bc64e/docs/design-qa-assets/comparison-task.png`;
    - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/work/pumbum-redesign-a6bc64e/docs/design-qa-assets/comparison-footer.png`.
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
- all ten category carousels, three distinct products, `34px` dot targets,
  `40px` previous/next controls and 2.4-second autoplay;
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
- Pass 4 — colleague mobile feedback, passed on protected staging:
  - removed the light-theme hydration race that could restore the dark DOM and make product media appear missing after navigation;
  - reduced the initial collection page from 60 to 24 products and limited scroll reveal to section-level containers, avoiding dozens of hidden card observers on mobile;
  - reduced carousel autoplay from five seconds to 3.2 seconds and changed eager preloading of every slide into delayed preloading of only the next slide;
  - added catalog search to `/catalog/po-zadache` and verified the `насос` submission reaches `/search?q=насос`;
  - made footer phone, email and address explicit actions, added email copy feedback, and clarified that “написать” means electronic mail;
  - verified locally at `390 x 844`: category loaded in 361 ms and task page in 74 ms;
  - verified again through the protected Cloudflare staging route at `390 x 844`: category loaded in 990 ms, task page in 594 ms, light theme persisted across navigation, the carousel advanced from slide 1 to 2 in 3.4 seconds, the footer exposed `tel:`, `mailto:` and the exact Yandex Maps organization URL, and the visible email was not rewritten by Cloudflare;
  - inspected both colleague screenshot/render pairs in the same combined images; the requested search and contact affordances are visible and no new P0/P1/P2 finding remains.
- Pass 5 — mascot, logo and product-cutout follow-up, passed on protected staging:
  - compared the generated Teplovik, Bak Hlopotun and Krestovich placements to
    the supplied character sheets on desktop and mobile; poses read clearly,
    remain subordinate to the buyer actions, and Krestovich has no alcohol;
  - inspected the regenerated CIMM tank on the dark technical grid; the outer
    alpha edge is clean and the former white matte is absent;
  - verified autoplay changes the recommendation state after 2.4 seconds and
    that direct dots plus the unique previous/next buttons select slides;
  - verified three hit-test points across the mobile header logo all resolve to
    `/`, and browser console/warning logs are empty.
  - verified the limited server candidate with 9,276 products, 9,354 sitemap
    URLs, 60 navigation routes, all 3,379 paginated products and enforced CSP.
  - repeated desktop dark/light, mobile home/category, carousel, catalog/about
    mascots, footer boundary, complete logo hitbox and console checks through
    the invitation-gated Cloudflare route after staging activation.
- Pass 6 — two-mascot coverage and footer seating, passed on protected staging:
  - added distinct hero scenes to manufacturers, search, delivery, about,
    contacts, task selection and privacy while keeping the accepted home and
    catalog scenes;
  - replaced the footer pose with a true seated alcohol-free Krestovich and
    aligned the seat to the section boundary on desktop and mobile;
  - verified every main page at desktop and `390 x 844`: hero assets loaded,
    lazy footer assets loaded after scrolling, and no horizontal overflow;
  - verified manufacturer mobile heading fit, contact `tel:`/`mailto:` actions,
    clean dark-background alpha edges and absence of alcohol props;
  - repeated isolation, analytics, taxonomy, full pagination, CSP, health,
    server-resource and SalesGame restart/OOM checks after staging activation.

## Findings

No actionable P0, P1 or P2 design findings remain.

## Follow-up polish

- P3: the desktop implementation headline wraps to four lines while the reference uses three. This is accepted because the production message includes the full “высшего класса” phrase and the real search/KPI content shares the first viewport.
- P3: the reference catalog is an illustrative four-card mock, while the implementation exposes the real ten-category buyer architecture above the category grid. This is an intentional functional adaptation.

final result: passed

## Pass 9 — large card-integrated mascots

- Source truth:
  - `/var/folders/dp/hhvd9lhd7f7bjlflll7zfwvh0000gn/T/codex-clipboard-a69ed2a7-f27a-4860-8ac2-67f19fd4b464.jpg` — Bak Hlopotun identity sheet;
  - `/var/folders/dp/hhvd9lhd7f7bjlflll7zfwvh0000gn/T/codex-clipboard-5c58cec3-1d65-4705-9044-6bb18543e4c6.jpg` — Kaplya identity sheet.
- Implementation evidence:
  - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/work/card-mascots-browser-qa-final7-20260730/category-desktop-dark.png`;
  - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/work/card-mascots-browser-qa-final7-20260730/category-mobile-products-dark.png`;
  - `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/work/card-mascots-browser-qa-final7-20260730/product-desktop-dark.png`.
- Combined source/implementation comparison:
  `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/work/design-qa-card-mascots-comparison-20260730.png`.
- Viewports: desktop `1280 x 847`, mobile `390 x 844`, device scale factor 1.
- The original page-edge companions were a P1 composition failure: they were
  too small to read as branded characters and appeared detached from the
  catalog. They were replaced by large figures attached to real category,
  manufacturer, task, product and information cards.
- Desktop generic companions render at 226–310 px; product/detail companions
  at 224–286 px. Mobile companions remain 168–214 px instead of collapsing
  into edge badges. The category mascot uses its own 222–286 px desktop and
  176–212 px mobile range.
- Characters now stand on card ledges, peek from the card surface or point at
  the adjacent product/content. Product media and the mascot share one composed
  scene while the supplier badge remains in the protected top layer.
- A P0 mobile regression was caught during QA: a very tall catalog container
  could never reach the old IntersectionObserver ratio and remained transparent.
  Tall containers are now revealed immediately and the fallback observer uses a
  0.01 threshold. The final mobile product grid and mascots are fully visible.
- Final browser QA covered desktop/mobile, dark/light, home, catalog,
  manufacturers, search, delivery, about, contacts, tasks, category, product,
  filters, sorting, pagination, carousel, phone actions, overflow and runtime
  errors. `runtimeErrors` is empty.

No actionable P0, P1 or P2 visual finding remains.

final result: passed

## Pass 10 — owner-directed rollback of the two latest mascot layers

- The owner rejected both the page-edge companion trail from Pass 8 and the
  card-integrated/category-runner presentation from Pass 9.
- Removed only those two layers and their dedicated twelve WebP assets.
- Retained the earlier accepted hero/page characters and seated footer
  Krestovich from Passes 5 and 6.
- Restored category, manufacturer, task and product cards to their composition
  before the two rejected layers; no mascot now shifts, overlaps or reserves
  space inside those cards.
- Preserved catalog anchors, direct phone CTAs, manufacturer-group caching and
  the mobile tall-container reveal fix.
- Verified the candidate and activated staging build at desktop `1280 x 847`
  and mobile `390 x 844`: rejected selectors are absent, retained page scenes
  load, there is no horizontal overflow, and `runtimeErrors` is empty.
- Repeated taxonomy, full pagination, CSP, dependency and bounded load checks.

No actionable P0, P1 or P2 visual finding remains after the requested rollback.

final result: passed

## Pass 7 — source recovery, alpha-edge review and supplier safe zone

- Audited all 343 unique rows from the quality and transparency review sets.
- Recovered 342 source candidates and generated transparent card/detail pairs
  locally. Published 312 only after geometry checks and visual inspection on
  the actual dark card background.
- Rejected three visible mask/rectangle failures and retained 28 additional
  unsafe/unresolved originals. No questionable derivative is active.
- Inspected two contact sheets covering all 51 white-edge threshold candidates;
  48 had clean subject edges and three were rejected.
- Supplier badges now have their own stacking context and a desktop/compact/
  mobile safe zone. Product media cannot paint above the badge.
- Revalidated curated carousel order after `_transparent-v2` became eligible;
  ZOTA Zuma remains the heating lead and mounting fasteners remains a deliberate
  two-item carousel.
- Server-side acceptance passed: build/lint/types, 9,276-product taxonomy,
  9,354 sitemap URLs, 60 navigation routes, all 3,379 products over 141 pages,
  and the analytics contract.
- Safari loaded the replacement Cloudflare route as the real storefront with
  the correct header, hero, Teplovik, category links and footer actions; the
  missing-tunnel page did not appear. The public reviewer route is read-only
  (`GET`/`HEAD`), noindex and no-store; attempted `POST /api/leads` returns
  `405`.

## Pass 8 — catalog interaction, full mascot set and slow-page release

- Reviewed the supplied category feedback screenshot and the candidate at the
  same `1280 x 847` content viewport in one combined comparison input:
  `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/work/design-qa-comparison-20260730.png`.
- The comparison used the same water-supply catalog state with the filter drawer
  open. Header, typography, palette, product controls and card grid retain the
  accepted visual language. The new 104 px mascot track is an intentional
  addition requested by the owner and does not overlap controls or products.
- Filters, sorting and pagination were verified in a real browser to preserve
  their query state and align `#catalog-products` below the sticky header.
- Verified ten stable category-to-mascot assignments, the category runner, two
  additional companions on every general page, three companions on product
  detail, and the existing seated footer character. Decorative art is
  pointer-transparent and absent from the accessibility tree.
- Generated a new pointing Kaplya pose from the supplied identity reference,
  removed its uniform source matte, and inspected the transparent WebP on a
  dark background. No checkerboard, rectangular matte or detached mask remains.
- Manufacturer and about hero assets were explicitly awaited and captured;
  they appear through the intended load-in transition rather than as broken or
  missing images.
- Repeated browser QA at desktop `1280 x 847` and mobile `390 x 844`: no
  horizontal overflow, broken visible image, console error, page error or
  same-origin request failure remained.

No actionable P0, P1 or P2 visual finding remains.

final result: passed
