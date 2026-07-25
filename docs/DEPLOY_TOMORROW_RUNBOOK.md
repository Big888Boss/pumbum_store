# V2 production cutover runbook

Historical runbook from the initial legacy-to-V2 cutover. It is not valid for the current `9276`-product deployment. Use `AUDIT_2026-07-10.md` and `AUDIT_CSP_2026-07-11.md` for current runtime and rollback paths.

Date prepared: 2026-07-04

Scope: switch public `https://477477.ru` from legacy storefront to V2. Do not run this without explicit approval.

## Current facts

- Production server: `dev477477@100.66.106.32`.
- Read-only refresh on 2026-07-05 06:12 Saratov time: host `vm2602164819`, about `961 MiB` RAM, `20G` disk with `6.5G` free.
- Current public app: legacy container behind nginx, `127.0.0.1:3000`.
- Current production Metrika counter: `109783471`.
- Current monitoring on production: node exporter `100.66.106.32:9100`, nginx exporter `100.66.106.32:9113`, promtail pushing nginx logs to Loki on the private tailnet.
- Production server is small: about 1 GB RAM and 20 GB disk. Do not install Grafana and Prometheus on this host unless there is no other option.
- V2 staging server: `administrator@100.95.56.90`, live preview `http://100.95.56.90:3020`.
- Product images are not in the Docker build context. They live in `/home/administrator/agent-projects/pumbum-store/public/images/products` and are about 1.2 GB.
- Public production endpoints checked on 2026-07-05: `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/ai.txt` all return `200`.
- Current production nginx still includes storefront `477477.ru -> 127.0.0.1:3000`, a VLESS location under the same server block, and separate `:8443` OpenWebUI proxy. Keep V2 storefront cutover isolated from those unrelated contours.

## Files prepared in this repo

- `deploy/docker-compose.prod.yml` - production compose template for V2.
- `deploy/nginx/477477-v2.conf` - nginx cutover template for `477477.ru`.
- `deploy/monitoring/prometheus-scrape.yml` - scrape blocks for private Prometheus.
- `.env.example` - documents the production Metrika counter.
- `docs/PRODUCTION_DEPLOYMENT_PLAN.md` - full deployment/security plan.
- `docs/MONITORING_AND_ANTIBOT.md` - anti-bot and monitoring notes.

## Required environment for production

Create `/opt/plumbing_store_v2/.env` on production:

```bash
NEXT_PUBLIC_SITE_URL=https://477477.ru
NEXT_PUBLIC_SITE_ENV=production
NEXT_PUBLIC_YANDEX_METRIKA_ID=109783471
V2_HTTP_PORT=3010
V2_CPUS=0.75
V2_MEMORY_LIMIT=512m
```

Do not commit `.env`.

## Pre-stage without switching traffic

1. Create production folder:

```bash
sudo mkdir -p /opt/plumbing_store_v2/new-store-v2
sudo mkdir -p /opt/plumbing_store_v2/public/images
sudo chown -R "$USER":"$USER" /opt/plumbing_store_v2
```

2. Copy V2 source from the operator machine:

```bash
rsync -az --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .asset-store \
  --exclude .env \
  --exclude public/images/products \
  work/pumbum-store-v2-src/ \
  dev477477@100.66.106.32:/opt/plumbing_store_v2/new-store-v2/
```

3. Copy product images from staging to production. This is the heavy step, about 1.2 GB:

```bash
ssh administrator@100.95.56.90 \
  'tar -C /home/administrator/agent-projects/pumbum-store/public/images -cf - products' \
| ssh dev477477@100.66.106.32 \
  'tar -C /opt/plumbing_store_v2/public/images -xf -'
```

4. Copy production compose:

```bash
scp work/pumbum-store-v2-src/deploy/docker-compose.prod.yml \
  dev477477@100.66.106.32:/opt/plumbing_store_v2/docker-compose.yml
```

5. Build and start V2 on localhost only:

```bash
cd /opt/plumbing_store_v2
docker compose --env-file .env up -d --build
curl -sS http://127.0.0.1:3010/api/health
```

Expected: `status=ok`, `products=5700`, `siteEnv=production`.

## Nginx preflight

1. Backup current nginx config:

```bash
sudo cp /etc/nginx/sites-enabled/plumbing_store.conf \
  /etc/nginx/sites-enabled/plumbing_store.conf.backup.$(date +%Y%m%d%H%M%S)
```

2. Copy prepared V2 nginx config:

```bash
sudo cp /opt/plumbing_store_v2/new-store-v2/deploy/nginx/477477-v2.conf \
  /etc/nginx/sites-available/plumbing_store_v2.conf
sudo ln -sf /etc/nginx/sites-available/plumbing_store_v2.conf \
  /etc/nginx/sites-enabled/plumbing_store.conf
sudo nginx -t
```

Do not reload nginx until the V2 localhost checks pass.

## Cutover

```bash
sudo systemctl reload nginx
```

Immediately check:

```bash
curl -sSI https://477477.ru/ | sed -n '1,30p'
curl -sS https://477477.ru/api/health
curl -sS https://477477.ru/robots.txt
curl -sS https://477477.ru/sitemap.xml | head
curl -sS https://477477.ru/llms.txt | head
curl -sS https://477477.ru/ai.txt | head
```

Browser checks:

- `/`
- `/catalog`
- `/catalog/proizvoditeli`
- `/search?q=Valtec`
- one VALTEC product
- one SINIKON product
- `/contacts`
- `/about`
- mobile width

## Rollback

Rollback must be known before cutover.

```bash
sudo ln -sf /etc/nginx/sites-available/plumbing_store.conf.backup.YYYYMMDDHHMMSS \
  /etc/nginx/sites-enabled/plumbing_store.conf
sudo nginx -t
sudo systemctl reload nginx
```

If nginx backup was made as a plain file under `sites-enabled`, copy it back to a normal path first instead of symlinking a wrong target.

## Legacy production archive

2026-07-07 status after V2 production update:

- The pre-V2 production project archive was copied to the factory/US server:
  `/home/administrator/agent-projects/pumbum-store/legacy-production-backups/pre-v2-20260705-0858/plumbing_store.project.tgz`.
- Verified SHA-256: `e2f73fd469d39e677b8ac66278d86984d6a0eb4fb76b317da07328e77ec4a858`.
- The same large tar was removed from `/opt/plumbing_store_backups/pre-v2-20260705-0858/` on production after checksum verification.
- Small production rollback metadata/config files remain under `/opt/plumbing_store_backups/`.

## Monitoring

Use the existing production exporters instead of adding heavy services to the 1 GB host:

- node exporter: `100.66.106.32:9100`;
- nginx exporter: `100.66.106.32:9113`;
- promtail: `/var/log/nginx/*.log` to private Loki.

Add `deploy/monitoring/prometheus-scrape.yml` to the private Prometheus host.

Grafana panels to create:

- HTTP availability: `probe_success` for `/`, `/api/health`, `/catalog`, `/search?q=Valtec`, `/sitemap.xml`;
- HTTP latency: `probe_duration_seconds`;
- nginx active connections: `nginx_connections_active`;
- nginx request rate: `rate(nginx_http_requests_total[5m])`;
- CPU: `100 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100`;
- memory available percent: `node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100`;
- disk free percent: `node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} * 100`;
- Loki 5xx: `{job="nginx_access", host="ru-vps"} |~ " 5[0-9][0-9] "`;
- Loki 429: `{job="nginx_access", host="ru-vps"} |~ " 429 "`;
- Loki bot pressure: `{job="nginx_access", host="ru-vps"} |~ "(python-requests|curl|wget|scrapy|Go-http-client|bot)"`.

Alerts:

- health probe down for 2 minutes;
- 5xx rate above baseline;
- disk free below 15%;
- memory available below 10%;
- high 429 burst;
- sitemap or robots not returning 200.

## Yandex Metrika and geography

The code already renders Metrika when `NEXT_PUBLIC_YANDEX_METRIKA_ID` is set. For production use counter `109783471`.

Required goals in Metrika:

- phone click: `tel:+78452477477`;
- email click: `mailto:Virado@bk.ru`;
- contacts page view: `/contacts`;
- map/route click from contacts page;
- search page view: `/search`;
- zero-result search if a custom event is added later.

For region analysis use Metrika reports by geography. Do not request browser geolocation just for analytics.

## SEO / Yandex checklist

- `NEXT_PUBLIC_SITE_ENV=production`, otherwise robots will block indexing.
- `NEXT_PUBLIC_SITE_URL=https://477477.ru`.
- `https://www.477477.ru` redirects to `https://477477.ru`.
- `robots.txt` allows public pages and references `https://477477.ru/sitemap.xml`.
- `sitemap.xml` contains final production URLs only.
- Search/filter pages stay `noindex`.
- Product pages have server-rendered HTML, Product JSON-LD and canonical URLs.
- Global metadata includes Saratov geo tags and Store/LocalBusiness JSON-LD.
- In Yandex Webmaster, verify site region is Saratov/Saratov oblast and submit sitemap after cutover.

## Do not carry over blindly

The current production nginx also contains a VLESS location on `477477.ru` and a separate `:8443` OpenWebUI proxy. They are not part of the storefront cutover. Keep the storefront config separate and verify that unrelated routes do not break or leak into the store surface.
