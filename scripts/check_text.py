#!/usr/bin/env python3
"""Small deterministic quality gate for category expert copy."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATEGORY_DIR = ROOT / "content" / "categories"
PURPOSE_FILE = ROOT / "src" / "lib" / "catalog" / "purpose.ts"
FIELDS = ("seoText", "buyingGuide")
BANNED = (
    "в современном мире",
    "является неотъемлемой частью",
    "индивидуальный подход",
    "широкий спектр",
    "высокое качество по доступной цене",
    "идеальное решение для каждого",
)


def normalized_words(value: str) -> list[str]:
    return re.findall(r"[а-яёa-z0-9]+", value.lower())


def main() -> int:
    errors: list[str] = []
    seen: dict[str, str] = {}
    files = sorted(CATEGORY_DIR.glob("*.json"))
    records: list[tuple[str, dict[str, str]]] = []

    if len(files) != 6:
        errors.append(f"expected 6 category files, found {len(files)}")

    for path in files:
        data = json.loads(path.read_text(encoding="utf-8"))
        slug = str(data.get("slug") or path.stem)
        records.append((f"pilot:{slug}", data))

    purpose_source = PURPOSE_FILE.read_text(encoding="utf-8")
    purpose_matches = re.findall(
        r"slug:\s*'([^']+)'[\s\S]*?seoText:\s*'([^']+)'[\s\S]*?buyingGuide:\s*'([^']+)'",
        purpose_source,
    )
    if len(purpose_matches) != 6:
        errors.append(f"expected 6 public purpose categories, found {len(purpose_matches)}")
    records.extend(
        (f"public:{slug}", {"seoText": seo_text, "buyingGuide": buying_guide})
        for slug, seo_text, buying_guide in purpose_matches
    )

    for slug, data in records:
        combined: list[str] = []

        for field in FIELDS:
            value = str(data.get(field) or "").strip()
            words = normalized_words(value)
            if len(words) < 8:
                errors.append(f"{slug}.{field}: too short ({len(words)} words)")
            lowered = value.lower()
            for phrase in BANNED:
                if phrase in lowered:
                    errors.append(f"{slug}.{field}: banned generic phrase: {phrase}")
            combined.append(value)

        fingerprint = " ".join(normalized_words(" ".join(combined)))
        if fingerprint in seen:
            errors.append(f"{slug}: duplicates copy from {seen[fingerprint]}")
        seen[fingerprint] = slug

    if errors:
        print("CATEGORY TEXT CHECK: FAILED")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"CATEGORY TEXT CHECK: CLEAN ({len(records)} category records, including 6 public sections)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
