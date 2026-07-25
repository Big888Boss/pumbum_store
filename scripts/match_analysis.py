#!/usr/bin/env python3
"""Read-only: try to match unmapped xlsx images to products by strong article norm.
Classifies unmapped images into: article-matches-a-product (missed by normalization),
vs hash/descriptive (needs visual)."""
import json, os, re
from collections import defaultdict

ROOT = "/opt/plumbing_store_v2/new-store-v2/content/generated"
catalog = json.load(open(f"{ROOT}/legacy-catalog.json"))
tgt = json.load(open("/home/dev477477/photo-targets-20260707.json"))
products = catalog["products"]
target_skus = {t["sku"] for t in tgt["targets"]}


def strong(s):
    # uppercase, cyrillic->latin lookalikes, drop separators
    s = str(s).upper()
    for a, b in [("К", "K"), ("Р", "R"), ("С", "C"), ("В", "B"), ("Т", "T"),
                 ("Н", "H"), ("Е", "E"), ("О", "O"), ("А", "A"), ("М", "M")]:
        s = s.replace(a, b)
    return re.sub(r"[^0-9A-Z]", "", s)


prod_by_strong = defaultdict(list)
for p in products:
    if p.get("sku"):
        prod_by_strong[strong(p["sku"])].append(p)

article_match = []   # unmapped image whose name strong-matches a product
hashy = []           # long numeric / random -> visual
descriptive = []     # word-named -> visual
for rel in tgt["unmapped"]:
    stem = re.sub(r"\.(png|jpe?g|webp)$", "", rel.rsplit("/", 1)[-1], flags=re.I)
    st = strong(stem)
    hit = prod_by_strong.get(st)
    if hit:
        skus = [p.get("sku") for p in hit]
        article_match.append({"img": rel, "skus": skus,
                              "is_target": any(s in target_skus for s in skus)})
    elif re.fullmatch(r"[A-Z]?[0-9]{9,}", st) or re.fullmatch(r"[0-9]{9,}", st):
        hashy.append(rel)
    elif re.search(r"[A-Za-zА-Яа-я]{4,}", stem):
        descriptive.append(rel)
    else:
        hashy.append(rel)

print(f"=== article-match (имя файла = существующий артикул, промах нормализации): {len(article_match)} ===")
for a in article_match:
    star = " <-- ЦЕЛЬ" if a["is_target"] else ""
    print(f"  {a['img']:40s} -> {a['skus']}{star}")
print(f"\n=== hash-именованные (нужен визуальный разбор): {len(hashy)} ===")
for h in hashy: print("  ", h)
print(f"\n=== описательные имена (визуальный разбор): {len(descriptive)} ===")
for d in descriptive: print("  ", d)
