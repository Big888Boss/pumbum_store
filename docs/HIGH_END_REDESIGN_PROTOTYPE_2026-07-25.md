# High-end redesign prototype — 2026-07-25

## Status and boundary

- Prototype source is prepared and passes a production `next build`.
- The owner approved a temporary preview. It runs only on build-host loopback
  `127.0.0.1:3025` with `MemoryHigh=1.5G`, `MemoryMax=2G` and `CPUQuota=150%`.
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
- Kept the category carousel at five-second autoplay with product preloading, dot navigation, reduced-motion, focus/visibility pause and an accessible pause/play control. Removed the three large text controls.
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
  - `src/components/layout/ThemeToggle.tsx`.
- Main presentation changes:
  - `src/app/globals.css`;
  - `src/app/layout.tsx`;
  - `src/components/layout/SiteHeader.tsx`;
  - `src/app/page.tsx`;
  - about, delivery and contacts pages;
  - `src/components/catalog/CategoryProductCarousel.tsx`.
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
- Build output remained compact: shared first-load JavaScript `102 kB`; homepage `109 kB`; category `110 kB`; product page `109 kB`.
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

## Resource evidence

The build ran while the SalesGame E2E stack stayed online.

- Root disk: `68%` during and after the build; about `75 GiB` remained free.
- Minimum observed available RAM: about `7.7 GiB`.
- Maximum observed memory PSI: `some avg10=0.24`, `full avg10=0.06`; both returned to zero.
- No kernel OOM event was found.
- All five SalesGame E2E containers remained running with `restarts=0` and `OOMKilled=false`.
- The prototype directory including copied dependencies and build output is about `1.7 GiB`.

## Remaining release blockers

- Browser rendering, primary interactions, catalog taxonomy, pagination,
  legacy redirects, CSP and carousel runtime checks pass. `design-qa.md` says
  `final result: passed`.
- The package-manager install step reported an aggregate `11 high severity` advisories for the current lock graph. Detailed advisory payload was not sent to an external audit service and no dependency upgrades were applied in this design-only task. This must be triaged before a production release.
- Production deployment, image build, public routing and nginx work require a separate explicit approval.
