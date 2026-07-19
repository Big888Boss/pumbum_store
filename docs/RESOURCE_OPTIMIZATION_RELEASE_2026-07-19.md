# Production resource optimization release 2026-07-19

Scope: the current `9276`-product storefront on the existing `1 vCPU / 1 GiB RAM` production host. Builds and comparison tests ran only on `administrator@100.95.56.90`. Product data, image assets, public routes, pricing, SEO output, Metrika and the VPN side route were preserved.

## Confirmed cause

- Four resident Next.js releases consumed about `1.0 GiB` of swap and left roughly `194 MiB` available memory.
- Each storefront process retains roughly `300 MiB` of catalog, image-manifest and search data when fully warm; Docker resident-memory output alone hides the swapped part.
- The previous Node-based Docker healthcheck started a transient Node process every 30 seconds in each release.
- Monitoring fetched four public URLs every 15 seconds, including the `1.8 MiB` sitemap. That was about `23,000` requests and up to `10 GiB` of sitemap transfer per day.
- A cold storefront start under the production `0.75 CPU / 384 MiB` limits can take about one minute before the first catalog-backed response. Warm page responses are fast.

## Applied changes

- Removed unused runtime releases on ports `3017` and `3018` and the already stopped `3015` container. Images, compose files, backups and product assets were not deleted.
- Recreated active `3019` and rollback `3016` with an Alpine `wget` healthcheck. Active checks every 60 seconds; stopped rollback is configured for 120 seconds. Both passed with `9276` products, zero restarts and no OOM.
- Stopped the verified rollback container after the blue-green window. Its image, compose file and stopped container remain available on `3016`.
- Changed catalog warmup from every minute to every five minutes.
- Nginx now reuses upstream connections and serves `/images/products/**` directly from the read-only production asset tree. A representative image retained the exact SHA-256 `0489f2a92c2675ae5a237503f86713589402257f3d50c69fd9f168ee23444327`.
- Disabled the stale `plumbing-store.service`; its working directory no longer existed. The unit file was retained.
- Split monitoring into health (30 seconds), buyer pages (2 minutes) and sitemap (30 minutes). Availability alerts require a sustained health failure; slow alerts evaluate only successful buyer-page probes. Telegram text is concise and in Russian.

## Verification

- Active image: `plumbing_store_v2-v2:filters-price-20260717-v1`, localhost port `3019`.
- `/api/health`: `9276` products, `9276` published products, `6` categories.
- Sitemap: `9289` URLs.
- Public smoke: `/`, `/about`, `/delivery`, `/contacts`, `/catalog`, manufacturer index, heavy category, representative ESPA product, search, robots, sitemap and health returned expected success responses with a browser user agent.
- Nginx configuration passed `nginx -t`; graceful reload completed; no application ByteString/OOM/fatal errors or Nginx 5xx were found in the verification window.
- Blackbox state after the change: health, home and catalog successful; active Grafana alerts: none.
- After stopping the rollback release, swap dropped by roughly `300 MiB` and available memory increased to roughly `280 MiB` in the immediate check.

## Rejected runtime experiment

A separate factory-only image reused imported product objects instead of retaining normalized copies. Six representative search result sets were identical, but memory improved by only about `5 MiB` before search and not after warmup. The change was rejected and was not deployed. A deeper catalog-format rewrite is not justified without a generated-artifact equivalence test because it would risk product fields for limited capacity gain.

## Rollback

1. Start the retained rollback service:

   `cd /opt/plumbing_store_v2/deploy && docker compose -f docker-compose.bluegreen-brand-seo-20260716.yml up -d v2-brand-seo`

2. Wait for `http://127.0.0.1:3016/api/health` to report `9276` products and for Docker health to become healthy.
3. If the active release is bad, restore `/etc/nginx/backups/plumbing_store.conf.pre-direct-images-20260719T0152Z`, run `nginx -t`, reload Nginx and verify public health before stopping `3019`.

## Deferred maintenance

- Do not run `apt upgrade`, Docker upgrades or a reboot in this optimization window. The host has many pending package updates, but those require a separate maintenance window with the rollback service pre-started and post-reboot listener/firewall checks.
- A larger VPS remains the only durable way to remove swap pressure and add concurrency. The current release optimizes the existing fixed resources without reducing catalog or image quality.
