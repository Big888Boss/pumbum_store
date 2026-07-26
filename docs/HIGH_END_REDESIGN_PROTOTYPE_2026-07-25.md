# High-end redesign prototype — 2026-07-25

## Status and boundary

- Prototype source is prepared and passes a production `next build`.
- The owner approved a temporary preview. The Next.js process runs only on
  build-host loopback `127.0.0.1:3025` with `MemoryHigh=1.5G`,
  `MemoryMax=2G` and `CPUQuota=150%`.
- Production `477477.ru`, nginx, containers, catalog data, product images and services were not changed.
- Source baseline: clean production commit `a6bc64e4105a7de96a2b3f9fc29c9d1ba56c1981`.
- Isolated build-host path: `/home/administrator/agent-projects/pumbum-store-redesign-20260725`.
- Visual source: `https://high-end-plumbing-landing-page.vercel.app/`.
- Current staging presentation build: `b7f370647b8307da8d7fd6fddb0fa37c16bb7316`.
  The previous `.next` is retained at
  `/home/administrator/backups/pumbum-redesign/.next-949bfb8-pre-b7f3706-20260726`.

## Implemented

- Replaced the storefront presentation layer with the visual language from the selected mock:
  - slate-950/graphite background;
  - translucent glass panels and thin light borders;
  - blue-grey ambient lighting;
  - Oswald display typography and Inter body typography;
  - compact uppercase navigation, display headings and technical UI rhythm;
  - source-style technical hero panel and subtle motion.
- Self-hosted the exact Cyrillic and Latin Oswald/Inter WOFF2 subsets used by the reference. Runtime does not request fonts from Google or Vercel.
- Added a persistent dark/light theme toggle. Dark remains the default design; light uses the same typography, spacing, glass treatment and glow hierarchy.
- Reworked the global header, footer, homepage hero, KPI strip, cards, catalog controls, product cards, product detail, manufacturers, delivery, about, contacts and supporting pages through the shared design system.
- Added working information tabs between `/about`, `/delivery` and `/contacts`.
- Kept the category carousel at 2.4-second autoplay with next-slide preloading,
  page-visibility pause, dot navigation and explicit previous/next controls.
  Reduced-motion disables transitions, but does not leave the carousel frozen.
- Added a quality gate for carousel imagery. Each category uses strong products
  from distinct buyer groups; the mounting category intentionally shows two
  verified products instead of admitting a mismatched third source image.
- Added three transparent TIM product cutouts for the mixers and siphons
  carousel and placed carousel products directly on the technical grid surface.
- Rebuilt the supplied store logo as transparent light/dark variants. The light
  theme keeps the original blue/black palette; the dark theme uses white type
  with brighter blue accents. The complete logo rectangle is one home link and
  has no white backing card.
- Replaced the homepage status ornament with a welcoming Teplovik mascot, added
  Bak Hlopotun to the catalog hero, and placed alcohol-free Krestovich artwork
  in the about hero and on the footer boundary. Mascot motion is limited to
  lightweight CSS transforms and is disabled by reduced-motion preferences.
- Recut the CIMM `CM.AFESB.050` carousel tank as an alpha WebP. The test asset
  has no white matte/halo on the dark technical grid; only this reported item
  is overridden, so a larger cleanup can be reviewed separately.
- Added lightweight intersection-based scroll reveals and a reduced-motion-safe
  back-to-top control on long pages.
- Added collection search, manufacturer/group/price filters, priority/price
  sorting, grid/list view and pagination to manufacturer, task and buyer-group
  pages. Manufacturer group tags now deep-link to the filtered collection.
- Rebalanced the product-detail hero: the image, category, article and pickup
  metadata fill the visual column to the same height as the purchase column.
  The redundant `Фото товара` explanation panel was removed.
- Kept real catalog product images and manufacturer assets instead of mock placeholders.

## Preserved without data/backend rewrites

- 9,276 product records and all current prices/statuses from the production source snapshot;
- 10 buyer categories;
- search by article, brand, category and characteristics;
- category filters, sorting, grid/list views and pagination;
- buyer subcategories, task pages and manufacturer pages;
- canonical metadata, JSON-LD, sitemap/robots, legacy redirects and noindex behavior;
- contact-first conversion boundary;
- disabled `/api/cart` and `/api/leads`;
- CSP nonce model, anti-bot middleware and Yandex Metrika contract.

## Changed files and dependencies

- New layout components:
  - `src/components/layout/EngineeringVisual.tsx`;
  - `src/components/layout/InfoTabs.tsx`;
  - `src/components/layout/ThemeToggle.tsx`;
  - `src/components/layout/StoreLogo.tsx`;
  - `src/components/layout/ScrollEnhancements.tsx`.
- Main presentation changes:
  - `src/app/globals.css`;
  - `src/app/layout.tsx`;
  - `src/components/layout/SiteHeader.tsx`;
  - `src/app/page.tsx`;
  - about, delivery and contacts pages;
  - `src/components/catalog/CategoryProductCarousel.tsx`;
  - `src/components/catalog/CatalogCollectionGrid.tsx`;
  - category, buyer-group, task and manufacturer page loaders.
- Brand and carousel assets:
  - `public/brand/store-logo-current.jpg`;
  - `public/brand/store-logo-light.webp`;
  - `public/brand/store-logo-dark.webp`;
  - `public/images/carousel-products/CM.AFESB.050_0-clean.webp`;
  - `public/images/carousel-products/tim-bas0802s.png`;
  - `public/images/carousel-products/tim-bas0260ba.png`;
  - `public/images/carousel-products/tim-cl5002bk.png`.
- Mascot assets:
  - `public/images/mascots/teplovik-welcome.webp`;
  - `public/images/mascots/bak-hlopotun-present.webp`;
  - `public/images/mascots/krestovich-sitting.webp`.
- Font assets:
  - `public/fonts/oswald-cyrillic.woff2`;
  - `public/fonts/oswald-latin.woff2`;
  - `public/fonts/inter-cyrillic.woff2`;
  - `public/fonts/inter-latin.woff2`.
- Added `lucide-react@1.25.0`, the icon family used by the visual reference. It adds no transitive package dependencies and supports the existing React 18 range.

## Verification completed

- `npm run lint`: passed.
- `tsc --noEmit`: passed.
- `npm run check:isolation`: passed.
- `npm run analytics:check`: passed; all five existing goals remain and raw search queries are not sent.
- `npm run build`: passed under `taskset -c 0,1`, `nice`, `ionice` and a 4 GiB Node heap cap.
- Build output remained compact: shared first-load JavaScript `102 kB`;
  homepage `109 kB`; category `109 kB`; product page `109 kB`.
- Self-hosted fonts are valid WOFF2 files.
- `font-src 'self'` already permits the new fonts. The theme bootstrap uses the existing per-request CSP nonce and does not create inline style attributes.
- Browser/design QA passed at `1280 x 720` and `390 x 844` in dark/light and
  primary interaction states; see `design-qa.md`.
- A reproducible `npm run redesign:check-browser` gate covers theme
  persistence, mobile navigation, search, product images, tabs, carousel
  autoplay, overflow, console errors and same-origin request failures.
- The preview uses read-only runtime symlinks to combine the existing main,
  ESPA, TIM and normalized Aquatec/Sinikon image stores. The catalog image audit
  reports `8,410` local references and `localMissing=0`.
- The current runtime gates pass with `9,276` products, `10` categories,
  `9,354` sitemap URLs and `60` collection navigation routes checked.
- Pagination covers all `3,379` products in the largest category without
  duplicates. Legacy redirect coverage reports `missing=0` and `ambiguous=0`.
- CSP remains enforced with rotating nonces, no unsafe inline/eval directives
  and no inline style attributes. A 30-request constrained health load check
  returned `30/30` HTTP 200 responses.

## Colleague mobile feedback pass

The staging-only follow-up addresses the review screenshots without changing
the production storefront:

- light-theme selection now survives navigation without a hydration mismatch;
- category and collection pages render 24 products per page instead of 60,
  while pagination still exposes the complete catalog;
- scroll-reveal observers are limited to section containers rather than every
  product card;
- category carousel autoplay is 3.2 seconds and only the next image is
  preloaded after the active slide changes;
- `/catalog/po-zadache` includes a catalog search field;
- footer phone, email and address are explicit actions; email also has a copy
  button, and the store wording explicitly says “электронная почта”.

Local mobile browser verification at `390 x 844` passed for theme persistence,
category content, search submission, carousel timing, footer actions and copy
feedback. The comparison evidence is recorded in `design-qa.md` and
the local QA evidence directory listed there; reviewer screenshots are not
tracked in the repository.

The same flow was then rechecked through the protected Cloudflare staging
route. Category and task pages rendered in 990 ms and 594 ms respectively,
the light theme persisted, 24 product cards were present, the carousel advanced
after 3.2 seconds, and the footer exposed working phone, email, copy-email and
map actions without Cloudflare email-rewrite injection.

## Mascot and carousel follow-up

- Browser QA at `1440 x 1000` and `390 x 844` confirms that the home, catalog
  and about mascots fit their assigned surfaces without covering navigation or
  actions. Krestovich contains no bottle, glass or alcohol branding.
- The regenerated CIMM tank is served from the local optimized WebP override
  and displays cleanly on the dark grid without an outer white fringe.
- Autoplay was observed changing slide 2 to slide 3 after 2.4 seconds; the
  previous/next buttons and all three direct-selection dots update the same
  state. Browser console and warning logs remained empty.
- Header hit testing at the left edge, center and right edge of the visible logo
  resolves to the `/` link, including the lettering rather than only a frame.
- The same checks passed through the invitation-gated Cloudflare route after
  the reversible staging switch: dark/light desktop, mobile home and category,
  autoplay, manual carousel controls, all mascot placements, footer boundary
  placement and browser logs. The anonymous route still returns HTTP 401 with
  noindex/noarchive, no-store/no-transform, CSP and frame-deny headers.

## Resource evidence

The build ran while the SalesGame E2E stack stayed online.

- Root disk: `68%` during and after the build; about `75 GiB` remained free.
- Minimum observed available RAM: about `7.7 GiB`.
- Maximum observed memory PSI: `some avg10=0.24`, `full avg10=0.06`; both returned to zero.
- No kernel OOM event was found.
- All five SalesGame E2E containers remained running with `restarts=0` and `OOMKilled=false`.
- The prototype directory including copied dependencies and build output is about `1.7 GiB`.
- The colleague-feedback candidate build used a separate worktree and a 4 GiB
  memory limit. It peaked at 3.0 GiB with zero unit swap, while host available
  RAM stayed at or above about 7.8 GiB. All five SalesGame E2E containers
  remained running with `restarts=0` and `OOMKilled=false`.
- The mascot/carousel candidate build also used a separate worktree with
  `MemoryMax=4G` and `CPUQuota=160%`. It completed in 3m02s, peaked at 3.0 GiB
  plus 288.5 MiB unit swap, and left at least about 7.5 GiB host RAM available.
  Peak observed memory PSI was below 0.5 and returned to zero. All five
  SalesGame E2E containers again remained at `restarts=0`, `OOMKilled=false`.
- The candidate returned HTTP 200 for health, home, catalog, water supply,
  about, contacts, search, the reported CIMM product, sitemap and every new
  WebP. Taxonomy validation found 9,276 products, 10 categories, 9,354 sitemap
  URLs and 60 working navigation routes. Pagination exposed all 3,379 products
  in the largest category as 141 pages of 24 without duplicates; CSP nonce,
  inline-style and report-endpoint checks passed.

## Temporary protected sharing

The owner approved temporary external access for one reviewer who is not in
the tailnet. Production routing remains unchanged.

- Tailnet reviewers use `http://100.95.56.90:3027/`.
- External traffic enters through a Cloudflare Quick Tunnel and reaches only
  the loopback token gate on `127.0.0.1:3026`.
- The invitation credential is carried in the URL fragment, which is not sent
  in the HTTP request, then exchanged for a 24-hour `Secure`, `HttpOnly`,
  `SameSite=Lax` cookie. The credential is stored only in the mode-0600 runtime
  file `/home/administrator/.config/pumbum-redesign-preview/share.env`; it is
  intentionally absent from Git and this documentation.
- Anonymous requests receive only the closed-preview page. Shared responses
  include `X-Robots-Tag: noindex, nofollow, noarchive`, `Cache-Control:
  no-store, no-transform` and a no-referrer policy. `no-transform` also keeps
  Cloudflare from rewriting the clickable store email into a decoder script
  that the storefront CSP intentionally blocks.
- No new listener was opened on `0.0.0.0` or `[::]`. The tunnel is
  outbound-only; its metrics listener is loopback-only on `127.0.0.1:49327`.
- User services:
  - `pumbum-redesign-share-gate.service`;
  - `pumbum-redesign-cloudflared.service` (preferred Quick Tunnel transport);
  - transient `pumbum-redesign-localhost-run.service` (temporary fallback only
    while Cloudflare returns Quick Tunnel allocation `1015/429`).
- The official user-scoped `cloudflared` `2026.7.2` binary is installed at
  `/home/administrator/.local/bin/cloudflared`. Verified SHA-256:
  `ec905ea7b7e327ff8abdde8cb64697a2152de74dbcdbf6aec9db8364eb3886cd`.
- Quick Tunnels are for temporary preview/testing, have no SLA and issue a new
  random hostname after the tunnel service restarts. Capture the current
  hostname from `journalctl --user -u pumbum-redesign-cloudflared.service`
  instead of treating a recorded hostname as durable.
- The localhost.run fallback is also outbound-only, terminates public TLS and
  forwards exclusively to `127.0.0.1:3026`. It is limited to 96 MiB memory,
  20% CPU and inherits the same invitation cookie, noindex, no-store, CSP and
  frame-deny gate. Its random hostname is likewise not durable and must not be
  recorded with the invitation fragment. Stop it when Cloudflare is healthy.

Stop temporary sharing without stopping the loopback preview:

```bash
systemctl --user disable --now pumbum-redesign-cloudflared.service
systemctl --user disable --now pumbum-redesign-share-gate.service
```

After review, remove the two service units, the gate script, the runtime secret
file and the user-scoped `cloudflared` binary only with separate owner
approval.

## Remaining release blockers

- Browser rendering, primary interactions, catalog taxonomy, pagination,
  legacy redirects, CSP and carousel runtime checks pass. `design-qa.md` says
  `final result: passed`.
- The package-manager install step reported an aggregate `11 high severity` advisories for the current lock graph. Detailed advisory payload was not sent to an external audit service and no dependency upgrades were applied in this design-only task. This must be triaged before a production release.
- Production deployment, image build, public routing and nginx work require a separate explicit approval.

## Page mascot rollout — staging commit `2a42d76`

The requested two-character composition is complete on every main top-level
page: one context-specific hero character plus the shared footer Krestovich.
The existing home Teplovik and catalog Bak Hlopotun remain; the added scenes are:

- manufacturers — Teplovik presenting manufacturer catalogues;
- search — Bak Hlopotun using a magnifying glass;
- delivery — Teplovik carrying a parcel;
- about — alcohol-free Krestovich in a new presenter pose;
- contacts — Bak Hlopotun with a blue telephone;
- task selection — alcohol-free Krestovich holding a technical plan;
- privacy — Teplovik with a protective shield.

The footer uses `krestovich-footer-seated.webp`, generated as a true seated pose
and positioned so the seat touches the boundary while the legs hang into the
footer. All new assets are transparent WebP files under
`public/images/mascots/`; the visible alpha edges were inspected on the dark
surface and showed no white or green matte.

The isolated build ran under `MemoryMax=4G` and `CPUQuota=160%`. It succeeded
with about `3.0 GiB` peak unit memory and zero unit swap. After activation the
host had about `11 GiB` available RAM and memory PSI returned to zero. All five
SalesGame E2E containers remained running with `restarts=0` and
`OOMKilled=false`. The preview, share gate and tunnel metrics remain bound to
`127.0.0.1`; only the tailnet proxy listens on `100.95.56.90:3027`.

Acceptance evidence: health reports 9,276 products and 10 categories;
isolation, analytics, taxonomy, complete 3,379-product pagination and enforced
CSP checks pass; desktop and `390 x 844` mobile checks show no horizontal
overflow and all hero/footer mascot images have non-zero natural dimensions.
Anonymous public preview access still returns HTTP 401 with no-store, noindex,
nonce CSP and frame denial. Contacts remain actionable through `tel:` and
`mailto:` links; the external Yandex map may delay the browser `load` event but
the document reaches `complete` and the application remains interactive.

Pre-switch rollback build:
`/home/administrator/backups/pumbum-redesign/.next-c660077-pre-2a42d76-20260726`.
Production was not modified.

## Scroll reveal and transparent catalog pass — 2026-07-26

This pass remains isolated to the USA staging host. Production was not read,
rebuilt, restarted or deployed.

### Runtime changes

- `ScrollEnhancements` now registers cards added after Next.js client
  navigation and reveals category, product, manufacturer and information cards
  with a short opacity/translate/scale transition. The observer is disabled for
  `prefers-reduced-motion` and does not run a per-frame scroll handler.
- Every catalog pagination URL ends in `#catalog-products`; the section has a
  sticky-header-aware `scroll-margin-top`, so page 2 opens at the product grid
  rather than at the page hero.
- Cached mascot and product images use their real `complete` state as well as
  `load`, preventing late or permanently invisible images after client-side
  navigation. The first six list images are eager/high-priority; remaining
  images keep lazy loading and a lightweight skeleton/fade-in state.
- Water-supply recommendations use three distinct, quality-gated groups. All
  ten category carousels expose two or three usable items; mounting fasteners
  intentionally expose two because no third image passed the quality gate.

### Reversible transparent-image pipeline

- `scripts/process-product-transparency.mjs` uses the already-installed Sharp
  dependency and bounded sequential processing. It does not call a remote
  image service or overwrite a source file.
- 1,836 unique current display sources were inspected. Results: 1,451 accepted
  transparent derivatives, 226 already-transparent originals, 158 rejected
  unsafe conversions and one placeholder/manual-background case.
- 184 images were automatically flagged as low-resolution/problematic. The
  manual-review CSV contains 159 retained sources. Unsafe subject loss and
  edge coverage are rejected instead of being published.
- Versioned derivatives are stored at
  `/home/administrator/agent-projects/pumbum-store-redesign-assets/catalog-alpha-v1`
  (about 81 MiB). The application path
  `public/images/products/_transparent-v1` is a symlink to that store.
- Runtime selection is controlled only by
  `content/generated/product-transparent-image-overrides.json`. Originals under
  `public/images/products` remain untouched.

Rollback the transparent presentation without deleting any derivative:

```bash
git revert <scroll-alpha-commit>
npm run build
```

The prior source tree remains at
`/home/administrator/agent-projects/pumbum-store-redesign-20260725`. A staging
runtime rollback is therefore also possible by stopping the scroll-alpha unit
and starting that tree again on loopback port 3025. Do not remove the asset
store until the owner separately approves cleanup.

### Acceptance evidence

- Next build ID: `A03IuqrFdvVb_Mw2BDEdQ`; build succeeded in 2.9 GiB peak unit
  memory with zero unit swap.
- Browser QA passed at 1280 x 720 and 390 x 844: dark/light persistence, mobile
  menu, no horizontal overflow, search, product detail, information tabs,
  scroll reveal completion, cached mascot loading, pagination anchor, carousel
  autoplay and zero console/page/same-origin request errors.
- All ten category carousels passed distinct-group, 32 px mobile control,
  8 px marker and five-second autoplay checks. Nine expose three items; mounting
  fasteners expose two quality-gated items.
- Taxonomy validation: 9,276 products, 10 categories, 9 manufacturers, 9,354
  sitemap URLs and 60 navigation routes. Legacy redirect coverage: 7,546 moved
  product paths covered, zero missing and zero ambiguous.
- Complete water-supply pagination exposes all 436 products as 19 pages of 24
  without duplicates; page 2 lands at the product grid.
- After the build the host had about 10 GiB available RAM and memory PSI was
  zero. All five SalesGame E2E containers remained running with `restarts=0`
  and `OOMKilled=false`.
- The activated staging runtime is
  `pumbum-redesign-preview-scroll-alpha.service` on `127.0.0.1:3025`; the
  invitation gate remains on `127.0.0.1:3026` and tailnet proxy on
  `100.95.56.90:3027`. The temporary external fallback passed anonymous 401,
  invitation exchange 204, authenticated health 200 and category 200 checks.

Reports are retained in the operator workspace rather than the public site:

- `product-image-quality-problems.csv`;
- `product-image-transparency-review.csv`;
- `product-image-transparency-report.json`.

## Source recovery and clean-alpha pass — 2026-07-26

This pass remains isolated from production. It processed the union of the 184
low-resolution/problem flags and 159 transparency-review flags: 343 unique
display sources in total.

- Exact-article recovery found source candidates for 342 rows. Supplier and
  article evidence is retained in
  `/home/administrator/agent-projects/pumbum-store-redesign-assets/reports-image-recovery-v2/source-recovery-manifest.json`.
- Apple Vision generated local foreground masks without sending catalog images
  to an external image API. Sharp then removed the white matte, trimmed the
  subject, and emitted transparent `1100 x 825` detail plus `480 x 360` card
  WebP files.
- 312 sources passed automatic geometry checks plus a visual dark-background
  edge review and are active through
  `content/generated/product-transparent-image-overrides.json`.
- 31 sources retain the previous runtime image: three visible mask/rectangle
  failures were explicitly rejected, while 28 had no safe foreground, an
  unsafe subject ratio, an unsupported placeholder, or no trustworthy improved
  source. A rejected conversion never replaces the current image.
- Original files were not overwritten. Versioned derivatives live in
  `/home/administrator/agent-projects/pumbum-store-redesign-assets/catalog-alpha-v2`;
  source downloads, Vision output, reports and timestamped override backups are
  retained beside that store.
- Five cross-supplier samples were copied to
  `/Users/zilbertov/Downloads/Pumbum-product-image-recovery-2026-07-26`.

The supplier badge fix uses `isolation:isolate` on the media frame, `z-index:5`
on the badge and responsive image padding for frames that have a badge. This
keeps the badge above the product while reserving enough canvas for the subject
on desktop, compact carousel cards and mobile.

Adding `_transparent-v2` to the existing carousel-quality rule initially made
more products eligible. The curated first products and the intentional
two-product mounting-fastener carousel were therefore preserved explicitly;
image improvements do not change category priority or navigation behavior.

Validation after the final build:

- Next.js production build, TypeScript and ESLint: passed;
- taxonomy/navigation: 9,276 products, 10 categories, 9 manufacturers, 9,354
  sitemap URLs and 60 buyer/navigation routes: passed;
- complete 141-page `truby-i-fitingi` pagination: 3,379 unique products, no
  duplicates, p50 159 ms and maximum 291 ms on the local candidate: passed;
- analytics contract and query redaction: passed;
- host resources after processing: about 10 GiB available RAM, memory PSI zero;
  SalesGame E2E containers remained up without restarts.

Staging runtime:

- app: `pumbum-redesign-preview-image-recovery.service` on `127.0.0.1:3025`;
- invitation gate: `pumbum-redesign-share-gate-image-recovery.service` on
  `127.0.0.1:3026` and Tailnet `100.95.56.90:3027`;
- anonymous external request returns `401`; Tailnet health returns `200`;
- the earlier scroll-alpha worktree and generated override backups remain the
  rollback path. Production was not changed.
