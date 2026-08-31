from __future__ import annotations

import json
import os
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


WORKSPACE = Path(
    os.environ.get(
        "PUMBUM_DEV_WORKSPACE",
        "/home/administrator/agent-projects/pumbum-hermes-dev",
    )
).resolve()
STATE_DIR = Path(
    os.environ.get(
        "PUMBUM_DEV_STATE_DIR",
        "/home/administrator/.local/state/pumbum-hermes-dev",
    )
).resolve()
PREVIEW_URL = os.environ.get(
    "PUMBUM_DEV_PREVIEW_URL", "http://100.95.56.90:3032"
).rstrip("/")
MARKER_PATH = STATE_DIR / "preview-ready.json"
ACK_PATH = STATE_DIR / "preview-health.json"


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path.name} must contain a JSON object")
    return value


def run(*args: str) -> str:
    result = subprocess.run(
        list(args),
        cwd=WORKSPACE,
        text=True,
        capture_output=True,
        check=False,
        timeout=60,
    )
    if result.returncode != 0:
        message = (result.stderr or result.stdout or "command failed").strip()
        raise RuntimeError(message[:1000])
    return result.stdout.strip()


def health_is_ready(payload: dict[str, Any]) -> bool:
    runtime = payload.get("runtime")
    return (
        payload.get("status") == "ok"
        and isinstance(runtime, dict)
        and runtime.get("siteEnv") == "staging"
    )


def read_health() -> dict[str, Any] | None:
    try:
        with urllib.request.urlopen(f"{PREVIEW_URL}/api/health", timeout=5) as response:
            if response.status != 200:
                return None
            payload = json.loads(response.read().decode("utf-8"))
    except (OSError, TimeoutError, ValueError, urllib.error.URLError):
        return None
    return payload if isinstance(payload, dict) else None


def main() -> None:
    marker = load_json(MARKER_PATH)
    expected_commit = str(marker.get("commit") or "")
    if len(expected_commit) != 40 or any(
        character not in "0123456789abcdef" for character in expected_commit
    ):
        raise RuntimeError("preview marker contains an invalid commit")
    actual_commit = run("git", "rev-parse", "HEAD")
    if actual_commit != expected_commit:
        raise RuntimeError(
            f"workspace commit {actual_commit} differs from preview marker {expected_commit}"
        )

    run("systemctl", "--user", "enable", "pumbum-hermes-preview.service")
    run("systemctl", "--user", "restart", "pumbum-hermes-preview.service")

    health = None
    for _attempt in range(120):
        health = read_health()
        if health is not None and health_is_ready(health):
            break
        time.sleep(1)
    if health is None or not health_is_ready(health):
        raise RuntimeError("preview did not become healthy within 120 seconds")

    acknowledgement = {
        "commit": expected_commit,
        "checked_at": time.time(),
        "health": health,
    }
    temporary = ACK_PATH.with_suffix(".json.tmp")
    temporary.write_text(
        json.dumps(acknowledgement, ensure_ascii=False, sort_keys=True),
        encoding="utf-8",
    )
    temporary.replace(ACK_PATH)


if __name__ == "__main__":
    main()
