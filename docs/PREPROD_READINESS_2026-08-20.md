# Pre-production readiness — 2026-08-20

## Scope

This checkpoint prepares the current redesign for private acceptance on the new server. It does not change `477477.ru`, DNS, TLS, Yandex Metrika, Yandex Webmaster or the existing public production runtime.

Source branch: `codex/preprod-readiness-20260820`, based on `ded2e04`.

## Changes

- Updated the `nanoid` override from `3.3.17` to `3.3.18`, removing the confirmed high-severity production dependency advisory.
- Category collection pages now emit `noindex` for every non-empty query string, including list view, sort, filters, pagination and tracking parameters. Their canonical remains the clean category URL.
- The SEO crawler uses the documented browser-like monitoring headers so the storefront does not block its own release audit as a script client.
- Removed stale lead-storage variables from `.env.example`; cart and lead APIs remain intentionally disabled.

## Build and runtime contract

- Build only on `ai-factory`, never on the target host.
- Final public builds must receive `NEXT_PUBLIC_SITE_URL=https://477477.ru`, `NEXT_PUBLIC_SITE_ENV=production` and the approved Metrika counter at build time. Runtime variables alone are not sufficient for every statically generated route.
- The private candidate remains protected by nginx `X-Robots-Tag: noindex` until a separately approved public cutover.
- Use the Next standalone bundle (`server.js`, `.next/static`, approved `public` assets) instead of shipping source and the full development dependency tree.
- Product photos remain a separate read-only, checksummed mount.

## Confirmed checks

- Production build, ESLint and TypeScript passed with 9,276 published products.
- Production dependency audit: zero findings.
- Catalog, prices and image identity are unchanged from the transferred candidate.
- Existing private browser QA passed desktop, tablet and phone flows, all ten carousels and all ten category videos.
- Heavy-category bounded test returned 50/50 HTTP 200; synthetic LCP over the SSH audit tunnel was about 2.55–2.84 seconds with near-zero CLS. Public field p75 remains untested until the final HTTPS contour exists.

## Deferred public gates

- Public nginx/TLS and DNS activation.
- Final build with approved Metrika counter plus browser goal verification.
- Public HTTPS Lighthouse/Core Web Vitals and real-user p75 measurement.
- New-host monitoring/alerts and post-cutover crawl.
- Credential rotation and removal of temporary public key-only SSH after Tailscale control-map stability is accepted.
