#!/usr/bin/env python3
"""Attach found supplier images + full-catalog photo correspondence audit.

Part A: for articles whose photo was downgraded to the placeholder but a
per-article image exists in public/images/products/sinikon/xlsx/**, set the
manifest entry to status=ready pointing at that file (provenance noted).

Part B: audit ALL products — classify how each card's effective image
relates to the product (own / family-ok / mismatch / placeholder / unknown).

Run: python3 photo_audit_and_fix.py [--dry-run]
"""
import json
import os
import re
import shutil
import sys
from collections import defaultdict, Counter
from datetime import date

ROOT = "/opt/plumbing_store_v2/new-store-v2/content/generated"
CATALOG = f"{ROOT}/legacy-catalog.json"
MANIFEST = f"{ROOT}/product-image-manifest.json"
XLSX_BASE = "/opt/plumbing_store_v2/public/images/products/sinikon/xlsx"
XLSX_URL = "/images/products/sinikon/xlsx"
BACKUP_DIR = "/home/dev477477/deploy-backup-20260707-photos"
REPORT_OUT = "/home/dev477477/photo-audit-20260707.json"
PLACEHOLDER_MARK = "/images/generated-placeholders/"

DRY = "--dry-run" in sys.argv
APPEARANCE_KEYS = {"diameters_mm", "angle_deg"}
DIST_KEYS = ["diameters_mm", "angle_deg", "length_mm", "size", "width_mm",
             "height_mm", "volume_l", "power_kw"]

catalog = json.load(open(CATALOG))
manifest = json.load(open(MANIFEST))
products = catalog["products"]
man_products = manifest.setdefault("products", {})


def signature(specs):
    return {k: str(specs[k]).strip() for k in DIST_KEYS if specs.get(k) not in (None, "", [])}


def norm_article(text):
    return re.sub(r"[^0-9A-ZКA-Z]", "", str(text).upper().replace("К", "K"))


def sku_base(text):
    m = re.match(r"^([A-Za-zА-Яа-я0-9.\-]+?)(?:\.[A-Za-zУу]+)?$", str(text).strip())
    return (m.group(1) if m else str(text)).strip().lower()


def image_sku_raw(path):
    name = str(path).rsplit("/", 1)[-1]
    name = re.sub(r"\.(webp|png|jpe?g|svg)$", "", name, flags=re.I)
    name = re.sub(r"-[0-9a-f]{8,}.*$", "", name)
    name = re.sub(r"-(card|detail)$", "", name)
    return name.strip().lower()


# индексы продуктов
by_sku_exact = defaultdict(list)
by_sku_base = defaultdict(list)
for p in products:
    if p.get("sku"):
        by_sku_exact[str(p["sku"]).strip().lower()].append(p)
        by_sku_base[sku_base(p["sku"])].append(p)


def resolve_rep(image_path):
    raw = image_sku_raw(image_path)
    exact = by_sku_exact.get(raw) or []
    if len(exact) == 1:
        return exact[0]
    based = by_sku_base.get(sku_base(raw)) or []
    if len(based) == 1:
        return based[0]
    return None


# --- Part A: привязка найденных xlsx-фото ---
xlsx_index = {}
for d in os.listdir(XLSX_BASE):
    dp = os.path.join(XLSX_BASE, d)
    if not os.path.isdir(dp):
        continue
    for f in os.listdir(dp):
        stem = re.sub(r"\.(png|jpe?g|webp)$", "", f, flags=re.I)
        key = norm_article(stem)
        if key and not key.isdigit() or (key.isdigit() and len(key) <= 8):
            xlsx_index.setdefault(key, f"{d}/{f}")

def effective_image(p):
    key = f"{p.get('categorySlug')}/{p.get('slug')}"
    entry = man_products.get(key)
    if entry and entry.get("status") in ("ready", "family-image"):
        img = (entry.get("image") or {}).get("card") or (entry.get("image") or {}).get("detail")
        if img:
            return img
    return p.get("image") or ""


def shows_own_photo(p):
    img = effective_image(p)
    if not img or PLACEHOLDER_MARK in img:
        return False
    rep = resolve_rep(img)
    return rep is p or (rep is not None and rep.get("sku") == p.get("sku"))


attached = []
for p in products:
    if shows_own_photo(p):
        continue
    art = norm_article(p.get("sku") or "")
    rel = xlsx_index.get(art)
    if not rel:
        continue
    key = f"{p.get('categorySlug')}/{p.get('slug')}"
    entry = man_products.get(key)
    url = f"{XLSX_URL}/{rel}"
    man_products[key] = {
        "status": "ready",
        "image": {"card": url, "detail": url},
        "notes": (entry.get("notes", []) if entry else []) + [
            f"attached from supplier xlsx extraction ({rel}) 2026-07-07"],
    }
    attached.append({"sku": p.get("sku"), "file": rel})

# --- Part A2: гашение оставшихся несоответствий независимо от статуса ---
downgraded = []
for p in products:
    img = effective_image(p)
    if not img or PLACEHOLDER_MARK in img:
        continue
    rep = resolve_rep(img)
    if rep is None or rep is p or rep.get("sku") == p.get("sku"):
        continue
    rep_sig = signature(rep.get("specs") or {})
    own_sig = signature(p.get("specs") or {})
    common = (set(rep_sig) & set(own_sig)) & APPEARANCE_KEYS
    if common and any(rep_sig[k] != own_sig[k] for k in common):
        key = f"{p.get('categorySlug')}/{p.get('slug')}"
        entry = man_products.get(key)
        if entry and entry.get("status") in ("ready", "family-image"):
            entry["status"] = "missing"
            entry.setdefault("notes", []).append(
                "geometry-mismatch-with-photo-representative (photo audit 2026-07-07)")
        if PLACEHOLDER_MARK not in (p.get("image") or ""):
            rep2 = resolve_rep(p.get("image") or "")
            if rep2 is not None and rep2 is not p and rep2.get("sku") != p.get("sku"):
                r2_sig = signature(rep2.get("specs") or {})
                c2 = (set(r2_sig) & set(own_sig)) & APPEARANCE_KEYS
                if c2 and any(r2_sig[k] != own_sig[k] for k in c2):
                    p["image"] = "/images/generated-placeholders/catalog-product.svg"
        downgraded.append({"sku": p.get("sku"), "rep": rep.get("sku")})

# --- Part B: полный аудит соответствия ---
classes = Counter()
mismatches = []
placeholders = []
unknown = []
for p in products:
    key = f"{p.get('categorySlug')}/{p.get('slug')}"
    entry = man_products.get(key)
    img = None
    if entry and entry.get("status") in ("ready", "family-image"):
        img = (entry.get("image") or {}).get("card") or (entry.get("image") or {}).get("detail")
    if not img:
        img = p.get("image") or ""
    if PLACEHOLDER_MARK in img or not img:
        classes["placeholder"] += 1
        placeholders.append(p.get("sku"))
        continue
    rep = resolve_rep(img)
    if rep is None:
        classes["rep-unknown"] += 1
        unknown.append({"sku": p.get("sku"), "image": img})
        continue
    if rep is p or rep.get("sku") == p.get("sku"):
        classes["own-photo"] += 1
        continue
    rep_sig = signature(rep.get("specs") or {})
    own_sig = signature(p.get("specs") or {})
    common = (set(rep_sig) & set(own_sig)) & APPEARANCE_KEYS
    if common and any(rep_sig[k] != own_sig[k] for k in common):
        classes["appearance-mismatch"] += 1
        mismatches.append({"sku": p.get("sku"), "rep": rep.get("sku"), "image": img,
                           "diff": {k: [own_sig.get(k), rep_sig.get(k)] for k in common
                                    if own_sig.get(k) != rep_sig.get(k)}})
    else:
        classes["family-ok"] += 1

print(f"привязано фото из xlsx: {len(attached)}")
for a in attached:
    print("  ", a["sku"], "->", a["file"])
print(f"погашено несоответствий (фото -> честная иконка): {len(downgraded)}")
print("\n=== аудит соответствия фото (все продукты) ===")
for k, v in classes.most_common():
    print(f"  {k}: {v}")
print(f"несоответствий по внешнему виду осталось: {len(mismatches)}")
for m in mismatches[:10]:
    print("  ", m["sku"], "показывает фото", m["rep"], m["diff"])

report = {"date": str(date.today()), "classes": dict(classes), "attached": attached,
          "mismatches": mismatches, "placeholders": placeholders,
          "rep_unknown_sample": unknown[:50], "rep_unknown_total": len(unknown)}

if DRY:
    print("DRY RUN — файлы не изменены")
    sys.exit(0)

os.makedirs(BACKUP_DIR, exist_ok=True)
stamp = date.today().isoformat()
shutil.copy2(MANIFEST, f"{BACKUP_DIR}/product-image-manifest.{stamp}.json")
shutil.copy2(CATALOG, f"{BACKUP_DIR}/legacy-catalog.{stamp}.json")
json.dump(manifest, open(MANIFEST, "w"), ensure_ascii=False)
json.dump(catalog, open(CATALOG, "w"), ensure_ascii=False)
json.dump(report, open(REPORT_OUT, "w"), ensure_ascii=False, indent=1)
print(f"манифест и каталог обновлены; бэкапы в {BACKUP_DIR}, отчёт в {REPORT_OUT}")
