#!/usr/bin/env python3
"""Run PageSpeed Insights v5 and save raw plus compact JSON reports.

The API key is optional for one-off runs. Set PAGESPEED_API_KEY for scheduled
or frequent checks so the key stays outside Git and command history.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


ENDPOINT = "https://pagespeedonline.googleapis.com/pagespeedonline/v5/runPagespeed"
AUDIT_KEYS = (
    "first-contentful-paint",
    "largest-contentful-paint",
    "cumulative-layout-shift",
    "total-blocking-time",
    "speed-index",
    "interactive",
)


def safe_slug(url: str) -> str:
    parsed = urllib.parse.urlparse(url)
    path = parsed.path.strip("/") or "home"
    return "-".join(part for part in path.split("/") if part)[:100] or "home"


def request_report(url: str, strategy: str, api_key: str | None) -> dict:
    query = [
        ("url", url),
        ("strategy", strategy),
        ("category", "performance"),
        ("locale", "ru"),
    ]
    if api_key:
        query.append(("key", api_key))
    request_url = f"{ENDPOINT}?{urllib.parse.urlencode(query)}"
    request = urllib.request.Request(request_url, headers={"User-Agent": "pumbum-pagespeed/1.0"})
    with urllib.request.urlopen(request, timeout=180) as response:
        return json.load(response)


def summarize(report: dict, url: str, strategy: str) -> dict:
    lighthouse = report.get("lighthouseResult", {})
    audits = lighthouse.get("audits", {})
    metrics = {
        key: {
            "score": audits.get(key, {}).get("score"),
            "numericValue": audits.get(key, {}).get("numericValue"),
            "displayValue": audits.get(key, {}).get("displayValue"),
        }
        for key in AUDIT_KEYS
    }
    field = report.get("loadingExperience", {})
    origin_field = report.get("originLoadingExperience", {})
    return {
        "url": url,
        "strategy": strategy,
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "lighthouseVersion": lighthouse.get("lighthouseVersion"),
        "performanceScore": lighthouse.get("categories", {}).get("performance", {}).get("score"),
        "metrics": metrics,
        "fieldOverallCategory": field.get("overall_category"),
        "fieldMetrics": field.get("metrics"),
        "originFieldOverallCategory": origin_field.get("overall_category"),
        "originFieldMetrics": origin_field.get("metrics"),
        "warnings": lighthouse.get("runWarnings", []),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("urls", nargs="+", help="Public URLs to test")
    parser.add_argument("--output-dir", default="artifacts/pagespeed")
    parser.add_argument("--strategy", action="append", choices=("mobile", "desktop"))
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    strategies = args.strategy or ["mobile", "desktop"]
    api_key = os.environ.get("PAGESPEED_API_KEY")
    summaries: list[dict] = []
    failures: list[str] = []

    for url in args.urls:
        for strategy in strategies:
            label = f"{safe_slug(url)}-{strategy}"
            try:
                report = request_report(url, strategy, api_key)
                (output_dir / f"{label}.json").write_text(
                    json.dumps(report, ensure_ascii=False, indent=2),
                    encoding="utf-8",
                )
                summary = summarize(report, url, strategy)
                summaries.append(summary)
                score = summary["performanceScore"]
                print(f"{strategy:7} {score!s:>5} {url}")
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
                failures.append(f"{strategy} {url}: {error}")
                print(f"FAILED {strategy} {url}: {error}", file=sys.stderr)
            time.sleep(1)

    (output_dir / "summary.json").write_text(
        json.dumps(summaries, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    if failures:
        (output_dir / "failures.json").write_text(
            json.dumps(failures, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
