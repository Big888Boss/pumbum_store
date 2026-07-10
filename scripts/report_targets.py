#!/usr/bin/env python3
"""Read-only: list photo targets (wrong-geometry + placeholder) and unmapped xlsx images."""
import json, os, re
from collections import defaultdict

ROOT = "/opt/plumbing_store_v2/new-store-v2/content/generated"
CATALOG = f"{ROOT}/legacy-catalog.json"
MANIFEST = f"{ROOT}/product-image-manifest.json"
XLSX_BASE = "/opt/plumbing_store_v2/public/images/products/sinikon/xlsx"
PLACEHOLDER = "/images/generated-placeholders/"
APPEARANCE = {"diameters_mm", "angle_deg"}
DIST = ["diameters_mm", "angle_deg", "length_mm", "size"]

catalog = json.load(open(CATALOG))
manifest = json.load(open(MANIFEST))
mp = manifest.get("products") or {}
products = catalog["products"]


def sig(specs):
    return {k: str(specs[k]).strip() for k in DIST if specs.get(k) not in (None, "", [])}


def sku_base(t):
    m = re.match(r"^([A-Za-zА-Яа-я0-9.\-]+?)(?:\.[A-Za-zУу]+)?$", str(t).strip())
    return (m.group(1) if m else str(t)).strip().lower()


def img_raw(path):
    n = str(path).rsplit("/", 1)[-1]
    n = re.sub(r"\.(webp|png|jpe?g|svg)$", "", n, flags=re.I)
    n = re.sub(r"-[0-9a-f]{8,}.*$", "", n)
    n = re.sub(r"-(card|detail)$", "", n)
    return n.strip().lower()


by_exact = defaultdict(list)
by_base = defaultdict(list)
for p in products:
    if p.get("sku"):
        by_exact[str(p["sku"]).strip().lower()].append(p)
        by_base[sku_base(p["sku"])].append(p)


def rep(path):
    r = img_raw(path)
    e = by_exact.get(r) or []
    if len(e) == 1:
        return e[0]
    b = by_base.get(sku_base(r)) or []
    return b[0] if len(b) == 1 else None


def eff(p):
    e = mp.get(f"{p.get('categorySlug')}/{p.get('slug')}")
    if e and e.get("status") in ("ready", "family-image"):
        i = (e.get("image") or {}).get("card") or (e.get("image") or {}).get("detail")
        if i:
            return i
    return p.get("image") or ""


targets = []
for p in products:
    img = eff(p)
    if not img or PLACEHOLDER in img:
        targets.append({"sku": p.get("sku"), "name": p.get("name", "")[:60],
                        "type": (p.get("specs") or {}).get("type", ""),
                        "geo": sig(p.get("specs") or {}), "why": "placeholder"})
        continue
    r = rep(img)
    if r is None or r is p or r.get("sku") == p.get("sku"):
        continue
    rs, os_ = sig(r.get("specs") or {}), sig(p.get("specs") or {})
    common = (set(rs) & set(os_)) & APPEARANCE
    if common and any(rs[k] != os_[k] for k in common):
        targets.append({"sku": p.get("sku"), "name": p.get("name", "")[:60],
                        "type": (p.get("specs") or {}).get("type", ""),
                        "geo": os_, "why": f"wrong-photo(shows {r.get('sku')})",
                        "line": (p.get("specs") or {}).get("Подраздел", "")})

# непривязанные xlsx-фото
all_sku_norm = {re.sub(r'[^0-9a-zкk]', '', (p.get('sku') or '').lower().replace('к', 'k')) for p in products}
unmapped = []
for d in os.listdir(XLSX_BASE):
    dp = os.path.join(XLSX_BASE, d)
    if not os.path.isdir(dp):
        continue
    for f in sorted(os.listdir(dp)):
        stem = re.sub(r"\.(png|jpe?g|webp)$", "", f, flags=re.I)
        norm = re.sub(r'[^0-9a-zкk]', '', stem.lower().replace('к', 'k'))
        if norm not in all_sku_norm:
            unmapped.append(f"{d}/{f}")

print(f"ЦЕЛЕЙ (нужно правильное фото): {len(targets)}")
byline = defaultdict(int)
for t in targets:
    byline[t.get("line", "placeholder")] += 1
for k, v in sorted(byline.items(), key=lambda x: -x[1]):
    print(f"  {v:3d} | {k[:55]}")
print(f"\nНЕПРИВЯЗАННЫХ xlsx-фото: {len(unmapped)}")
for u in unmapped:
    print("  ", u)
json.dump({"targets": targets, "unmapped": unmapped},
          open("/home/dev477477/photo-targets-20260707.json", "w"), ensure_ascii=False, indent=1)
