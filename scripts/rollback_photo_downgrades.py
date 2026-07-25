#!/usr/bin/env python3
"""Rollback geometry-mismatch photo downgrades (owner decision 2026-07-07).

Restores family photos hidden on 2026-07-06/07, KEEPING:
- enriched names and split groups,
- the 19 own photos attached from supplier xlsx extractions.

Sources of truth for restoration:
- manifest entries: any entry whose notes mention "geometry-mismatch" gets
  status "family-image" back (image paths were never removed);
- catalog product.image: restored from the pre-change backup
  (legacy-catalog.2026-07-07.json) and, for the 2026-07-06 wave, from the
  audit log's "was" values.
"""
import json
import shutil
from datetime import datetime

ROOT = "/opt/plumbing_store_v2/new-store-v2/content/generated"
CATALOG = f"{ROOT}/legacy-catalog.json"
MANIFEST = f"{ROOT}/product-image-manifest.json"
BK7_CAT = "/home/dev477477/deploy-backup-20260707-photos/legacy-catalog.2026-07-07.json"
AUDIT6 = "/home/dev477477/catalog-normalize-audit-20260706.json"
PLACEHOLDER_MARK = "/images/generated-placeholders/"
STAMP = datetime.now().strftime("%Y%m%d-%H%M")

catalog = json.load(open(CATALOG))
manifest = json.load(open(MANIFEST))
bk7 = json.load(open(BK7_CAT))
audit6 = json.load(open(AUDIT6))

# карта восстановления product.image
was6 = {r["sku"]: r["was"] for r in audit6.get("photos_downgraded", []) if r.get("was")}
bk7_img = {p.get("sku"): p.get("image") for p in bk7["products"]}

restored_img = 0
for p in catalog["products"]:
    img = p.get("image") or ""
    if PLACEHOLDER_MARK not in img:
        continue
    sku = p.get("sku")
    candidate = bk7_img.get(sku)
    if candidate and PLACEHOLDER_MARK in candidate:
        candidate = was6.get(sku)
    if candidate and PLACEHOLDER_MARK not in candidate:
        p["image"] = candidate
        restored_img += 1

restored_man = 0
kept_attached = 0
for key, entry in (manifest.get("products") or {}).items():
    notes = " ".join(entry.get("notes") or [])
    if "attached from supplier xlsx" in notes:
        kept_attached += 1
        continue
    if entry.get("status") == "missing" and "geometry-mismatch" in notes:
        entry["status"] = "family-image"
        entry.setdefault("notes", []).append("restored by owner decision 2026-07-07 (option B)")
        restored_man += 1

print(f"восстановлено product.image: {restored_img}")
print(f"восстановлено манифест-записей: {restored_man}")
print(f"сохранено привязанных xlsx-фото: {kept_attached}")

shutil.copy2(CATALOG, f"/home/dev477477/deploy-backup-20260707-photos/legacy-catalog.pre-rollback-{STAMP}.json")
shutil.copy2(MANIFEST, f"/home/dev477477/deploy-backup-20260707-photos/product-image-manifest.pre-rollback-{STAMP}.json")
json.dump(catalog, open(CATALOG, "w"), ensure_ascii=False)
json.dump(manifest, open(MANIFEST, "w"), ensure_ascii=False)
print("записано")
