#!/usr/bin/env python3
"""Normalize presentation of generated catalog (v2, 477477.ru).

Fixes three data-presentation defects without merging or deleting records:
1. Fallback names "<Группа> <артикул>" get distinguishing attributes
   (diameters, angle, length, size) taken strictly from existing specs.
2. Groups mixing different geometries are split by renaming the Группа
   label per geometry signature (no URL/slug changes).
3. A shared photo is kept only when the product's geometry signature
   matches the photo's representative product; otherwise the image is
   downgraded to the generated placeholder (type icon renders instead of
   a wrong photo). Ambiguous cases are flagged, not touched.

Run:  python3 normalize_catalog_presentation.py [--dry-run]
"""
import json
import re
import shutil
import sys
from collections import Counter, defaultdict
from datetime import date

ROOT = "/opt/plumbing_store_v2/new-store-v2/content/generated"
CATALOG = f"{ROOT}/legacy-catalog.json"
MANIFEST = f"{ROOT}/product-image-manifest.json"
BACKUP_DIR = "/home/dev477477/deploy-backup-20260706-catalog"
AUDIT_OUT = "/home/dev477477/catalog-normalize-audit-20260706.json"
PLACEHOLDER = "/images/generated-placeholders/catalog-product.svg"

DIST_KEYS = ["diameters_mm", "angle_deg", "length_mm", "size", "width_mm",
             "height_mm", "volume_l", "power_kw"]

# Только эти атрибуты меняют внешний вид изделия: несовпадение по ним делает
# чужое фото обманом. Длина/объём/мощность форму на фото не меняют —
# семейное фото остаётся допустимым.
APPEARANCE_KEYS = {"diameters_mm", "angle_deg"}

DRY = "--dry-run" in sys.argv


def signature(specs):
    return {k: str(specs[k]).strip() for k in DIST_KEYS if specs.get(k) not in (None, "", [])}


def sig_key(specs):
    return json.dumps(signature(specs), sort_keys=True, ensure_ascii=False)


def fmt_attr(key, value):
    if key == "diameters_mm":
        return f"Ø{value}"
    if key == "angle_deg":
        return f"{value}°"
    if key == "length_mm":
        return f"L={value} мм"
    if key == "width_mm":
        return f"B={value} мм"
    if key == "height_mm":
        return f"H={value} мм"
    if key == "volume_l":
        return f"{value} л"
    if key == "power_kw":
        return f"{value} кВт"
    return str(value)


def geo_parts(specs, keys):
    parts = []
    for k in DIST_KEYS:
        if k in keys and specs.get(k):
            parts.append(fmt_attr(k, str(specs[k]).strip()))
    return parts


def sku_base(text):
    m = re.match(r"^([A-Za-zА-Яа-я0-9.\-]+?)(?:\.[A-Za-zУу]+)?$", str(text).strip())
    base = (m.group(1) if m else str(text)).strip()
    return base.lower()


def image_sku_raw(path):
    name = str(path).rsplit("/", 1)[-1]
    name = re.sub(r"\.(webp|png|jpe?g|svg)$", "", name, flags=re.I)
    name = re.sub(r"-[0-9a-f]{8,}.*$", "", name)  # hash suffixes in _normalized-v2
    name = re.sub(r"-(card|detail)$", "", name)
    return name.strip().lower()


def image_sku_base(path):
    return sku_base(image_sku_raw(path))


catalog = json.load(open(CATALOG))
manifest = json.load(open(MANIFEST))
products = catalog["products"]

audit = {"date": str(date.today()), "renamed": [], "groups_split": [],
         "photos_downgraded": [], "manifest_downgraded": [], "ambiguous": []}

# --- индексы ---
by_sku_base = defaultdict(list)
by_sku_exact = defaultdict(list)
for p in products:
    if p.get("sku"):
        by_sku_base[sku_base(p["sku"])].append(p)
        by_sku_exact[str(p["sku"]).strip().lower()].append(p)


def resolve_rep(image_path):
    """Найти продукта-представителя фото: сперва точный артикул, затем база."""
    raw = image_sku_raw(image_path)
    exact = by_sku_exact.get(raw) or []
    if len(exact) == 1:
        return exact[0], raw
    base = sku_base(raw)
    based = by_sku_base.get(base) or []
    if len(based) == 1:
        return based[0], base
    return None, raw if exact else base

groups = defaultdict(list)
for p in products:
    specs = p.get("specs") or {}
    g = specs.get("Группа") or ""
    if g:
        groups[(p.get("categorySlug"), g)].append(p)

# --- 2) разбиение смешанных групп (переименование Группа) ---
group_rename = {}  # (cat, old, sigkey) -> new group name
for (cat, gname), members in groups.items():
    sigs = {sig_key(m.get("specs") or {}) for m in members}
    if len(sigs) < 2:
        continue
    varying = set()
    values = defaultdict(set)
    for m in members:
        s = signature(m.get("specs") or {})
        for k in DIST_KEYS:
            values[k].add(s.get(k))
    for k, vals in values.items():
        if len({v for v in vals}) > 1:
            varying.add(k)
    if not varying:
        continue
    for m in members:
        specs = m.get("specs") or {}
        parts = geo_parts(specs, varying)
        if not parts:
            continue
        new_name = f"{gname} — {', '.join(parts)}"
        group_rename[(cat, gname, sig_key(specs))] = new_name
    audit["groups_split"].append({"category": cat, "group": gname,
                                  "members": len(members),
                                  "variants": len(sigs),
                                  "varying": sorted(varying)})

# --- применяем правки по каждому продукту ---
renamed = 0
group_renamed = 0
photo_down = 0
for p in products:
    specs = p.get("specs") or {}
    old_group = specs.get("Группа") or ""
    sku = p.get("sku") or ""
    old_name = p.get("name") or ""

    # 1) имя-фолбэк -> обогащённое имя
    if old_group and sku and old_name.strip() == f"{old_group} {sku}".strip():
        sig = signature(specs)
        if sig:
            ptype = str(specs.get("type") or "").strip()
            parts = geo_parts(specs, set(sig.keys()))
            series = ""
            for token in ("Универсал", "Стандарт", "Комфорт", "КОМФОРТ ПЛЮС", "ПЛЮС"):
                if token.lower() in old_group.lower():
                    series = token
                    break
            if ptype:
                head = " ".join(x for x in [ptype, " ".join(parts), series] if x)
            else:
                head = " ".join(x for x in [old_group, " ".join(parts)] if x)
            new_name = f"{head} — {sku}"
            if new_name != old_name:
                p["name"] = new_name
                renamed += 1
                if len(audit["renamed"]) < 200:
                    audit["renamed"].append({"sku": sku, "old": old_name, "new": new_name})

    # 2) переименование группы по сигнатуре
    key = (p.get("categorySlug"), old_group, sig_key(specs))
    if key in group_rename:
        new_group = group_rename[key]
        specs["Группа"] = new_group
        for field in ("highlights", "crossSell"):
            vals = p.get(field)
            if isinstance(vals, list):
                p[field] = [new_group if v == old_group else v for v in vals]
        group_renamed += 1

    # 3) фото: представитель по имени файла vs собственная сигнатура
    img = p.get("image") or ""
    if img and "/images/products/" in img:
        rep, ref = resolve_rep(img)
        if rep is None:
            if by_sku_exact.get(ref) or by_sku_base.get(ref):
                audit["ambiguous"].append({"sku": sku, "image": img, "reason": "several representatives"})
        elif rep is not p and rep.get("sku") != sku:
            rep_sig = signature(rep.get("specs") or {})
            own_sig = signature(specs)
            common = (set(rep_sig) & set(own_sig)) & APPEARANCE_KEYS
            if common and any(rep_sig[k] != own_sig[k] for k in common):
                p["image"] = PLACEHOLDER
                photo_down += 1
                if len(audit["photos_downgraded"]) < 300:
                    audit["photos_downgraded"].append(
                        {"sku": sku, "was": img, "rep": rep.get("sku"),
                         "diff": {k: [own_sig[k], rep_sig[k]] for k in common if own_sig[k] != rep_sig[k]}})

# --- манифест: family-image с несовпадающей геометрией -> missing ---
# ключи манифеста бывают трёх видов: <categorySlug>/<slug>, <legacyCat>/<slug>,
# <supplier>/<slug> — матчим по slug-части, она уникальна в рамках продукта
prod_by_slug = defaultdict(list)
for p in products:
    prod_by_slug[p.get("slug")].append(p)
man_down = 0
for key, entry in (manifest.get("products") or {}).items():
    if entry.get("status") != "family-image":
        continue
    slug_part = key.split("/", 1)[-1]
    candidates = prod_by_slug.get(slug_part) or []
    if len(candidates) != 1:
        if candidates:
            audit["ambiguous"].append({"key": key, "reason": "slug collision"})
        continue
    p = candidates[0]
    img = (entry.get("image") or {}).get("card") or (entry.get("image") or {}).get("detail") or ""
    rep, ref = resolve_rep(img)
    if rep is None:
        if by_sku_exact.get(ref) or by_sku_base.get(ref):
            audit["ambiguous"].append({"key": key, "image": img, "reason": "several representatives"})
        continue
    if rep is p or rep.get("sku") == p.get("sku"):
        continue
    rep_sig = signature(rep.get("specs") or {})
    own_sig = signature(p.get("specs") or {})
    common = (set(rep_sig) & set(own_sig)) & APPEARANCE_KEYS
    if common and any(rep_sig[k] != own_sig[k] for k in common):
        entry["status"] = "missing"
        entry.setdefault("notes", []).append("geometry-mismatch-with-family-representative (normalize 2026-07-06)")
        man_down += 1
        if len(audit["manifest_downgraded"]) < 300:
            audit["manifest_downgraded"].append({"key": key, "rep": rep.get("sku")})

print(f"переименовано товаров: {renamed}")
print(f"позиции с новым именем группы: {group_renamed} (групп разбито: {len(audit['groups_split'])})")
print(f"фото заменено на честный плейсхолдер (image): {photo_down}")
print(f"манифест: family-image -> missing: {man_down}")
print(f"неоднозначных (не тронуто, во flag-лист): {len(audit['ambiguous'])}")

if DRY:
    print("DRY RUN — файлы не изменены")
    sys.exit(0)

import os
os.makedirs(BACKUP_DIR, exist_ok=True)
shutil.copy2(CATALOG, f"{BACKUP_DIR}/legacy-catalog.json")
shutil.copy2(MANIFEST, f"{BACKUP_DIR}/product-image-manifest.json")
json.dump(catalog, open(CATALOG, "w"), ensure_ascii=False)
json.dump(manifest, open(MANIFEST, "w"), ensure_ascii=False)
json.dump(audit, open(AUDIT_OUT, "w"), ensure_ascii=False, indent=1)
print(f"записано; бэкапы в {BACKUP_DIR}, аудит в {AUDIT_OUT}")
