# Responsive mascot design QA — 2026-08-01

## Scope

- Target: isolated staging redesign only.
- Production `477477.ru`: not connected to or modified.
- Source issue: the side-peek category pose occupies the mobile product image,
  mobile/tablet manufacturer and About content mascots are hidden, and the
  native mobile menu remains open after the user leaves it.

## Required composition

- Desktop above `1120px` retains the accepted side-peek category pose.
- At `1120px` and below each of the ten category owners uses an independently
  generated transparent top-peek pose: face above the technical-grid product
  card, both hands gripping its upper border, product and supplier badge clear.
- The three manufacturer mascots remain attached to SINIKON,
  Гидроконтракт and ZOTA and are visible between cards on narrow layouts.
- The About content mascot is visible below the copy card without covering
  text.
- Mobile menu closes on Escape, outside pointer input and route navigation.

## Viewports and states

- Desktop: `1280 × 847`, dark and light.
- Phone: `390 × 844`, dark and light.
- Tablet: `820 × 1180`, dark.
- Runtime checks also cover scroll reveal, category pagination, carousel
  autoplay, supplier badge layering, navigation and horizontal overflow.

## Assets and edge QA

- Ten source-specific images were generated from the accepted category
  identities and converted from a flat magenta key to transparent WebP.
- Files: `public/images/mascots/pose-v3/*-top-peek-v3.webp`.
- Contact sheet: `work/top-peek-contact-sheet.png`.
- Runtime files are `55–126 KiB`; all have transparent corners and a contracted,
  feathered matte with spill cleanup. No white halo is visible on the dark QA
  background.

## Comparison and implementation captures

- Source/candidate phone comparison:
  `work/mobile-category-before-after.png` (source left, candidate right).
- Candidate phone:
  `work/qa-candidate/category-mobile-dark.png`,
  `work/qa-candidate/manufacturers-grid-mobile-dark.png`,
  `work/qa-candidate/about-layout-mobile-dark.png`.
- Candidate tablet:
  `work/qa-candidate/category-tablet-dark.png`,
  `work/qa-candidate/manufacturers-tablet-dark.png`,
  `work/qa-candidate/about-tablet-dark.png`.
- Full automated evidence on the factory:
  `/home/administrator/qa/pumbum-mobile-responsive-candidate-20260801-rerun`.

## Findings

- Top-peek hands intersect only the carousel border band; the face does not
  overlap the product or top-right supplier safe zone.
- Manufacturer and About figures are visible on phone/tablet and occupy
  reserved inter-card seams rather than text areas.
- Typography, product content, pricing, catalog order, links and desktop
  composition are unchanged.
- No horizontal overflow, broken visible images, console errors, page errors
  or failed same-origin requests were detected.
- Menu close behavior passes all three interaction paths.

## Final result

final result: passed

- Candidate browser run exited `0` across all three viewports.
- Catalog invariants remain `9276` products, ten categories, nine
  manufacturers and `9354` sitemap URLs.
- CSP remains enforced with rotating nonce and no unsafe inline/eval policy.

## Mobile category geometry corrective pass — 2026-08-01

### Source visual truth

- User captures: the five mobile category screenshots supplied with the
  correction request.
- Defects: top-peek figures floated above the technical-grid product frame;
  thoughtful figures overlapped the call CTA; the following blank seam was
  larger than needed.

### Implementation and comparison evidence

- The top-peek figure is now rendered inside `CategoryProductCarousel`, so its
  geometry is relative to the actual product frame rather than the outer hero.
- Ten pose-v4 assets remove only transparent bottom padding from the accepted
  poses; character pixels and identities are unchanged.
- Phone guidance cards use a `90px` reserved seam. The figure begins `10px`
  below the card, after the CTA, and the resulting card-to-products gap is
  approximately `142px` after fonts settle.
- Candidate captures:
  `/home/administrator/qa/pumbum-mobile-geometry-candidate-20260801c-rerun`.
- Active captures:
  `/home/administrator/qa/pumbum-mobile-geometry-active-final-20260801`.
- Direct visual comparison was performed in one review input using the source
  phone captures and the final phone top-peek/advice captures.

### Automated geometry gates

- All ten categories at `390x844`: three semantic mascots retained, top figure
  overlaps the real product-frame border by only `2–8px`, CTA clearance is at
  least `8px`, and the thoughtful figure does not enter the products heading.
- Tablet `820x1180`: responsive pose and the same collision gates pass.
- Desktop `1280x847`: accepted side-peek composition remains unchanged.
- Fonts are awaited before measurements to prevent layout-race false passes.
- Typography, copy, products, prices, supplier safe zone, sorting, filters,
  pagination and routes are unchanged.

### Final active staging release

- Implementation commit: `05d1c50`
- Build ID: `XMTbntr5PKZm4v3TAQ9X6`
- Unit: `pumbum-redesign-preview-mobile-geometry-final-20260801.service`
- Listener: `127.0.0.1:3025`
- Exact rollback builds:
  - `/home/administrator/backups/pumbum-redesign/mobile-geometry-20260801/.next-6wdXbM7NuzXGJKCS6BOyj`;
  - `/home/administrator/backups/pumbum-redesign/mobile-geometry-20260801/.next-E4IO4uqeibUwYb9MjOG6P`.

Final result: passed. Candidate and post-activation browser runs completed
without runtime errors or horizontal overflow. Production `477477.ru` was not
connected to, restarted or modified.
