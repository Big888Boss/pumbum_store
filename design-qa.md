# Design QA — category 3D video release

Date: 2026-08-08

## Reference and implementation comparison

The supplied mobile reference places the new media directly after the
`Товары раздела` heading area. The implementation screenshot was compared
beside that reference at the same narrow-page state. The existing heading,
product-count copy, mascot safe zone and category tags remain in their accepted
order; the video occupies a separate full-width frame between the section
summary and the tags.

## Visual checks

- Existing typography, color, border, radius, shadow and grid tokens are reused.
- The 16:9 subject remains fully visible without stretching or cropping.
- Phone `390x844`, tablet `820x1180` and desktop `1280x847` have balanced
  spacing and no horizontal overflow.
- Supplier/product imagery and all previously accepted mascot placements stay
  unobstructed.
- Poster, playing and paused states keep the same geometry, avoiding layout
  shift.
- The `3D-обзор` label and caption remain legible in dark and light themes.

## Interaction checks

- No playback controls, fullscreen, download or picture-in-picture UI.
- Source attaches only near the viewport and playback begins at 42% visibility.
- Playback pauses out of view and when the document is hidden.
- Reduced-motion users receive the static poster without attaching video.
- All 30 category/viewport combinations pass with no runtime errors.

Final result: passed.

## Source-quality 720p follow-up — 2026-08-08

- The supplied `1280x720` H.264 picture stream is preserved without a lossy
  transcode; only unused audio is removed and MP4 fast-start metadata is added.
- The existing 16:9 component geometry is unchanged. Phone media remains inside
  the content gutters, tablet media is bounded, and desktop media remains capped
  at `860px` instead of expanding to the viewport.
- Automated browser QA measures all ten categories at `390x844`, `820x1180`
  and `1280x847`, checks the actual decoded `1280x720` resolution, autoplay and
  pause behavior, reduced-motion poster mode, and horizontal overflow.

Reference `codex-clipboard-3b81c032-e0b7-46eb-9063-1a3f56724db2.jpg` and the
candidate phone capture were inspected together in
`work/pumbum-category-video-hq-qa-20260808/mobile-reference-vs-hq.png`.
The media stays inside the existing content gutters and does not displace the
heading, mascot, summary or category pills. Desktop evidence confirms the
existing centered `860px` cap.

Final result: passed.

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

---

## Active source-quality video verification — 2026-08-08

- Active build: `lS3jNHYnNcDbUzn_QdkMC` on loopback `3025`.
- All ten category videos pass at phone `390x844`, tablet `820x1180` and
  desktop `1280x847` after activation.
- The decoded media is `1280x720`; phone and tablet retain content gutters,
  desktop remains centered at no more than `860px`, and no page gains
  horizontal overflow.
- Full storefront regression passes with no console, page or same-origin
  request errors. The supplied mobile reference and active composition were
  reviewed together; the video is bounded and does not displace existing copy,
  mascots or category controls.

Final result: passed.

# Design QA — manufacturer mascot responsive seams

## Reference

- Source visual truth: the accepted desktop manufacturer composition from the active staging build before this change.
- Reference capture: `/tmp/pumbum-manufacturer-before-20260801/manufacturers-grid-desktop-dark.png`
- Reference viewport: `1280 x 847`, device scale factor `1`, dark theme.
- Scope: manufacturer cards only. Desktop placement, typography, content, routes, and card styling must remain unchanged.

## Implementation evidence

- Candidate: `http://127.0.0.1:3031/catalog/proizvoditeli`
- Desktop: `/tmp/pumbum-manufacturer-final-candidate-20260801/desktop-full.png`
- Tablet: `/tmp/pumbum-manufacturer-final-candidate-20260801/tablet-full.png`
- Phone: `/tmp/pumbum-manufacturer-final-candidate-20260801/mobile-full.png`
- Focused captures for `SINIKON`, `Гидроконтракт`, and `ZOTA` are in the same candidate evidence directory.
- Viewports: desktop `1280 x 847`, tablet `820 x 1180`, phone `390 x 844`; device scale factor `1`; dark theme.

## Verified geometry

- All manufacturer-card vertical gaps are `16px` at all three viewports.
- Стыкович is attached to the upper-left SINIKON corner; his legs overlap the card/logo surface without covering the SINIKON logo or copy.
- Фильтрыч is attached to the lower-right Гидроконтракт seam and hangs toward AQUARIO without covering the “Все товары производителя” link.
- Тепловик is attached to the lower-right ZOTA seam and hangs toward TIM without covering the “Все товары производителя” link.
- No horizontal overflow is introduced.
- The desktop composition matches the accepted source; only responsive rules at `900px` and `640px` were changed.

## Comparison history

1. Initial phone/tablet implementation reused one generic bottom offset and reserved `72px` after every mascot-host card. This detached Стыкович from SINIKON and created uneven empty rows.
2. Candidate removed flow-space reservation and restored per-mascot anchors. Tablet SINIKON was then lowered to align the seated feet with the white logo surface.
3. Final candidate passed focused geometry checks and the full redesign regression suite on desktop, tablet, and phone.

## QA result

final result: passed

## Active staging verification

- Active build: `QZnoOkwbi7rClrMSQP2nG`.
- Active unit: `pumbum-redesign-preview-manufacturer-responsive-20260801.service`.
- Post-activation focused screenshots:
  `/tmp/pumbum-manufacturer-active-focused-20260801`.
- Post-activation full regression screenshots:
  `/tmp/pumbum-manufacturer-active-fullqa-20260801`.
- The focused geometry suite and the complete storefront browser suite both
  exited `0` after activation. Runtime errors: none.
- Production `477477.ru` was not changed.

---

## Final current release result

The active source-quality category-video release is build
`lS3jNHYnNcDbUzn_QdkMC`. Its focused 30-combination media QA and complete
storefront regression passed after activation; production remains untouched.

Final result: passed.

---

## Category hero corrections — 2026-08-09

- Reference set: seven owner screenshots covering water supply, filtration,
  pumps, mixers, fasteners, pipes and tools.
- Comparison board:
  `/Users/zilbertov/Documents/Codex/2026-07-25/ssh/work/pumbum-category-fixes/comparisons/all-reference-vs-candidate.png`.
- Desktop side-peek offsets now match the requested left/right directions.
- Trubych and alcohol-free Krestovich face inward and grip the real carousel
  seam.
- The corrected mounting rail is sharp, semantically correct and transparent.
- The VALTEC pipe image has a clean transparent edge with no black/grey
  contamination.
- Phone and tablet retain the accepted top-peek design; the desktop offsets are
  isolated above `1120px`.
- Focused candidate and active runs covered seven categories at desktop
  `1280x847`, tablet `820x1180`, and phone `390x844`. All images loaded, no
  horizontal overflow occurred, and browser/runtime errors were empty.
- The complete storefront browser suite passed after activation.

final result: passed
