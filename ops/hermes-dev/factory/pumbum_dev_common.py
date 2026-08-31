from __future__ import annotations

import json
import os
import sqlite3
import subprocess
import uuid
from contextlib import closing
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


WORKSPACE = Path(os.environ.get("PUMBUM_DEV_WORKSPACE", "/home/administrator/agent-projects/pumbum-hermes-dev")).resolve()
STATE_DIR = Path(os.environ.get("PUMBUM_DEV_STATE_DIR", "/home/administrator/.local/state/pumbum-hermes-dev")).resolve()
DB_PATH = STATE_DIR / "state.sqlite"
LOG_DIR = STATE_DIR / "logs"
EXPECTED_BRANCH = "codex/hermes-seo-geo"
PREVIEW_URL = os.environ.get("PUMBUM_DEV_PREVIEW_URL", "http://100.95.56.90:3032").rstrip("/")
MAX_REQUEST_CHARS = 12_000


def utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


def run_git(*args: str, check: bool = True) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=WORKSPACE,
        check=False,
        text=True,
        capture_output=True,
        timeout=60,
    )
    if check and result.returncode != 0:
        message = (result.stderr or result.stdout or "git command failed").strip()
        raise RuntimeError(message[:1000])
    return result.stdout.strip()


def workspace_snapshot() -> dict[str, Any]:
    return {
        "branch": run_git("branch", "--show-current"),
        "commit": run_git("rev-parse", "HEAD"),
        "clean": not bool(run_git("status", "--porcelain")),
        "status": run_git("status", "--short", "--branch"),
        "preview_url": PREVIEW_URL,
    }


def connect() -> sqlite3.Connection:
    STATE_DIR.mkdir(parents=True, exist_ok=True, mode=0o700)
    LOG_DIR.mkdir(parents=True, exist_ok=True, mode=0o700)
    connection = sqlite3.connect(DB_PATH, timeout=30, isolation_level=None)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("PRAGMA foreign_keys=ON")
    return connection


def initialize_database() -> None:
    with closing(connect()) as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                kind TEXT NOT NULL CHECK(kind IN ('development', 'preview', 'release')),
                status TEXT NOT NULL CHECK(status IN ('queued', 'running', 'succeeded', 'failed', 'needs_attention', 'cancelled')),
                actor TEXT NOT NULL,
                request TEXT NOT NULL,
                parent_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                commit_before TEXT,
                commit_after TEXT,
                summary TEXT,
                error TEXT,
                log_path TEXT,
                preview_url TEXT,
                FOREIGN KEY(parent_id) REFERENCES tasks(id)
            );
            CREATE INDEX IF NOT EXISTS tasks_status_created_idx ON tasks(status, created_at);
            """
        )


def normalize_text(value: str, *, field: str, maximum: int = MAX_REQUEST_CHARS) -> str:
    text = " ".join(str(value or "").split()).strip()
    if not text:
        raise ValueError(f"{field} не может быть пустым")
    if len(text) > maximum:
        raise ValueError(f"{field} превышает лимит {maximum} символов")
    return text


def enqueue(kind: str, request: str, actor: str, parent_id: str | None = None) -> dict[str, Any]:
    initialize_database()
    task_id = str(uuid.uuid4())
    now = utc_now()
    with closing(connect()) as connection:
        if parent_id:
            parent = connection.execute("SELECT * FROM tasks WHERE id = ?", (parent_id,)).fetchone()
            if parent is None:
                raise ValueError("Исходная задача не найдена")
            if parent["status"] != "succeeded":
                raise ValueError("Исходная задача ещё не завершена успешно")
        connection.execute(
            """
            INSERT INTO tasks(id, kind, status, actor, request, parent_id, created_at, updated_at)
            VALUES (?, ?, 'queued', ?, ?, ?, ?, ?)
            """,
            (task_id, kind, normalize_text(request, field="request"), normalize_text(actor, field="actor", maximum=200), parent_id, now, now),
        )
    return get_task(task_id)


def serialize_row(row: sqlite3.Row) -> dict[str, Any]:
    result = dict(row)
    if result.get("log_path"):
        result["log_path"] = Path(result["log_path"]).name
    return result


def get_task(task_id: str) -> dict[str, Any]:
    initialize_database()
    with closing(connect()) as connection:
        row = connection.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if row is None:
        raise ValueError("Задача не найдена")
    return serialize_row(row)


def recent_tasks(limit: int = 10) -> list[dict[str, Any]]:
    safe_limit = max(1, min(int(limit), 30))
    initialize_database()
    with closing(connect()) as connection:
        rows = connection.execute(
            "SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?", (safe_limit,)
        ).fetchall()
    return [serialize_row(row) for row in rows]


def claim_next_task() -> dict[str, Any] | None:
    initialize_database()
    with closing(connect()) as connection:
        connection.execute("BEGIN IMMEDIATE")
        row = connection.execute(
            "SELECT * FROM tasks WHERE status = 'queued' ORDER BY created_at LIMIT 1"
        ).fetchone()
        if row is None:
            connection.execute("COMMIT")
            return None
        now = utc_now()
        updated = connection.execute(
            "UPDATE tasks SET status = 'running', updated_at = ? WHERE id = ? AND status = 'queued'",
            (now, row["id"]),
        )
        connection.execute("COMMIT")
        if updated.rowcount != 1:
            return None
    return get_task(row["id"])


def update_task(task_id: str, status: str, **fields: Any) -> None:
    allowed = {"commit_before", "commit_after", "summary", "error", "log_path", "preview_url"}
    unknown = set(fields) - allowed
    if unknown:
        raise ValueError(f"Unsupported task fields: {sorted(unknown)}")
    assignments = ["status = ?", "updated_at = ?"]
    values: list[Any] = [status, utc_now()]
    for key, value in fields.items():
        assignments.append(f"{key} = ?")
        values.append(value)
    values.append(task_id)
    with closing(connect()) as connection:
        connection.execute(f"UPDATE tasks SET {', '.join(assignments)} WHERE id = ?", values)


def write_log(task_id: str, content: str) -> Path:
    path = LOG_DIR / f"{task_id}.log"
    path.write_text(content, encoding="utf-8")
    path.chmod(0o600)
    return path


def json_dump(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True)
