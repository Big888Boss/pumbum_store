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
- Kept the category carousel at five-second autoplay with product preloading,
  dot navigation, reduced-motion and automatic focus/visibility pause. Visible
  previous/pause/next controls are removed; accessible slide selection remains.
- Added a quality gate for carousel imagery. Each category uses strong products
  from distinct buyer groups; the mounting category intentionally shows two
  verified products instead of admitting a mismatched third source image.
- Added three transparent TIM product cutouts for the mixers and siphons
  carousel and placed carousel products directly on the technical grid surface.
- Added the current supplied store logo to the shared header and footer.
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
  - `public/images/carousel-products/tim-bas0802s.png`;
  - `public/images/carousel-products/tim-bas0260ba.png`;
  - `public/images/carousel-products/tim-cl5002bk.png`.
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

## Resource evidence

The build ran while the SalesGame E2E stack stayed online.

- Root disk: `68%` during and after the build; about `75 GiB` remained free.
- Minimum observed available RAM: about `7.7 GiB`.
- Maximum observed memory PSI: `some avg10=0.24`, `full avg10=0.06`; both returned to zero.
- No kernel OOM event was found.
- All five SalesGame E2E containers remained running with `restarts=0` and `OOMKilled=false`.
- The prototype directory including copied dependencies and build output is about `1.7 GiB`.

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
  no-store` and a no-referrer policy.
- No new listener was opened on `0.0.0.0` or `[::]`. The tunnel is
  outbound-only; its metrics listener is loopback-only on `127.0.0.1:49327`.
- User services:
  - `pumbum-redesign-share-gate.service`;
  - `pumbum-redesign-cloudflared.service`.
- The official user-scoped `cloudflared` `2026.7.2` binary is installed at
  `/home/administrator/.local/bin/cloudflared`. Verified SHA-256:
  `ec905ea7b7e327ff8abdde8cb64697a2152de74dbcdbf6aec9db8364eb3886cd`.
- Quick Tunnels are for temporary preview/testing, have no SLA and issue a new
  random hostname after the tunnel service restarts. Capture the current
  hostname from `journalctl --user -u pumbum-redesign-cloudflared.service`
  instead of treating a recorded hostname as durable.

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
