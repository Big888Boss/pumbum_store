#!/usr/bin/env python3
"""Apply real sinikon.ru type photos to target products (manifest -> ready).
Only touches the 84 targets that had a wrong-geometry/placeholder photo."""
import json, shutil, os
from datetime import date

ROOT = "/opt/plumbing_store_v2/new-store-v2/content/generated"
MANIFEST = f"{ROOT}/product-image-manifest.json"
URL_BASE = "/images/products/sinikon/catalog"
PATCH = "/tmp/sin-patch.json"
BK = "/home/dev477477/deploy-backup-20260707-photos"

manifest = json.load(open(MANIFEST))
mp = manifest.setdefault("products", {})
patch = json.load(open(PATCH))["patch"]

applied = 0
for row in patch:
    key = row["key"]
    url = f"{URL_BASE}/{row['file']}"
    entry = mp.get(key, {})
    entry["status"] = "ready"
    entry["image"] = {"card": url, "detail": url}
    entry.setdefault("notes", []).append(
        f"real sinikon.ru type photo attached 2026-07-07 (sku {row['sku']})")
    mp[key] = entry
    applied += 1

shutil.copy2(MANIFEST, f"{BK}/product-image-manifest.pre-sinikon.json")
json.dump(manifest, open(MANIFEST, "w"), ensure_ascii=False)
print(f"применено фото Синикона к целям: {applied}")
