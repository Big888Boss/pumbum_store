#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${PUMBUM_BASE_URL:-https://477477.ru}"
OUTPUT_DIR="${PUMBUM_AUDIT_OUTPUT_DIR:-artifacts/monthly-audit/$(date -u +%Y-%m-%dT%H-%M-%SZ)}"
mkdir -p "$OUTPUT_DIR"

paths=(
  /
  /catalog
  /catalog/proizvoditeli
  /catalog/pumps
  /catalog/otoplenie-i-kotelnaya
  /about
  /contacts
  /delivery
  /privacy
  /robots.txt
  /sitemap.xml
  /api/health
)

for path in "${paths[@]}"; do
  curl --fail --silent --show-error --location --max-time 30 \
    --user-agent "Mozilla/5.0 pumbum-monthly-audit/1.0" \
    --header "Accept-Language: ru-RU,ru;q=0.9" \
    --output /dev/null \
    --write-out "%{http_code} %{time_total} ${path}\n" \
    "${BASE_URL}${path}"
done | tee "$OUTPUT_DIR/routes.txt"

python3 scripts/pagespeed.py \
  --output-dir "$OUTPUT_DIR/pagespeed" \
  "$BASE_URL/" \
  "$BASE_URL/catalog/otoplenie-i-kotelnaya"

printf 'Audit completed: %s\n' "$OUTPUT_DIR"
