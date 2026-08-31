from __future__ import annotations

import os
import signal
import subprocess
import time
from pathlib import Path
from typing import Any

from pumbum_dev_common import (
    EXPECTED_BRANCH,
    PREVIEW_URL,
    STATE_DIR,
    WORKSPACE,
    claim_next_task,
    get_task,
    json_dump,
    run_git,
    update_task,
    workspace_snapshot,
    write_log,
)


CODEX_BIN = os.environ.get(
    "PUMBUM_DEV_CODEX_BIN", "/home/administrator/.local/bin/codex"
)
CODEX_HOME = os.environ.get(
    "PUMBUM_DEV_CODEX_HOME", "/home/administrator/ai-gateway/tmp/codex_pools/codex4/.codex"
)
MODEL = os.environ.get("PUMBUM_DEV_CODEX_MODEL", "gpt-5.6-sol")
TASK_TIMEOUT_SECONDS = int(os.environ.get("PUMBUM_DEV_TASK_TIMEOUT_SECONDS", "5400"))
POLL_SECONDS = int(os.environ.get("PUMBUM_DEV_POLL_SECONDS", "3"))
NPM_BIN = os.environ.get("PUMBUM_DEV_NPM_BIN", "/home/administrator/.nvm/versions/node/v22.22.2/bin/npm")
STOP = False


def stop_handler(_signum: int, _frame: Any) -> None:
    global STOP
    STOP = True


def sanitized_environment() -> dict[str, str]:
    allowed = {
        "HOME",
        "LANG",
        "LC_ALL",
        "PATH",
        "SSL_CERT_FILE",
        "SSL_CERT_DIR",
        "HTTP_PROXY",
        "HTTPS_PROXY",
        "NO_PROXY",
        "GIT_AUTHOR_NAME",
        "GIT_AUTHOR_EMAIL",
        "GIT_COMMITTER_NAME",
        "GIT_COMMITTER_EMAIL",
    }
    env = {key: value for key, value in os.environ.items() if key in allowed}
    env.update(
        {
            "HOME": os.environ.get("PUMBUM_DEV_AGENT_HOME", "/home/administrator"),
            "CODEX_HOME": CODEX_HOME,
            "PATH": f"{Path(CODEX_BIN).parent}:{Path(NPM_BIN).parent}:/usr/local/bin:/usr/bin:/bin",
        }
    )
    return env


def command(args: list[str], *, timeout: int, env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=WORKSPACE,
        text=True,
        capture_output=True,
        check=False,
        timeout=timeout,
        env=env or sanitized_environment(),
    )


def ensure_workspace_ready() -> dict[str, Any]:
    snapshot = workspace_snapshot()
    if snapshot["branch"] != EXPECTED_BRANCH:
        raise RuntimeError(f"Expected branch {EXPECTED_BRANCH}, got {snapshot['branch']}")
    if not snapshot["clean"]:
        raise RuntimeError("Workspace is not clean before task start")
    return snapshot


def development_prompt(request: str, commit_before: str) -> str:
    return f"""Ты работаешь только над новым сайтом Pumbum в изолированной ветке.

Обязательно полностью прочитай AGENTS.md и выполни его. Исходный commit: {commit_before}.

Задача пользователя:
{request}

Сделай задачу полностью: исследуй локальный код, внеси минимально достаточные изменения, выполни релевантные тесты и обязательные проверки из AGENTS.md, проверь diff и создай один Git-коммит.

Запрещено: SSH/SCP/rsync, доступ к другим серверам и репозиториям, production-деплой, push, изменение DNS/nginx, чтение .env/ключей/токенов, MyShop, 1С, Windows и старый публичный сайт. Не запускай долгоживущий сервер. Если нужны неподтверждённые бизнес-факты, не выдумывай их: остановись с точным запросом данных.

В финале кратко укажи commit, изменённые файлы, проверки и известные ограничения. Не утверждай, что изменение опубликовано.
"""


def run_development(task: dict[str, Any]) -> None:
    snapshot = ensure_workspace_ready()
    before = snapshot["commit"]
    output_path = STATE_DIR / f"{task['id']}-last-message.txt"
    args = [
        CODEX_BIN,
        "exec",
        "-C",
        str(WORKSPACE),
        "-m",
        MODEL,
        # The worker runs inside a locked-down container that exposes only this
        # workspace, its state directory and the dedicated auth pool. Ubuntu's
        # AppArmor policy blocks nested bubblewrap on the host.
        "--dangerously-bypass-approvals-and-sandbox",
        "--ephemeral",
        "-c",
        'model_reasoning_effort="high"',
        "-o",
        str(output_path),
        "-",
    ]
    result = subprocess.run(
        args,
        cwd=WORKSPACE,
        input=development_prompt(task["request"], before),
        text=True,
        capture_output=True,
        check=False,
        timeout=TASK_TIMEOUT_SECONDS,
        env=sanitized_environment(),
    )
    combined = f"STDOUT\n{result.stdout}\n\nSTDERR\n{result.stderr}"
    log_path = write_log(task["id"], combined)
    after_snapshot = workspace_snapshot()
    summary = output_path.read_text(encoding="utf-8", errors="replace").strip() if output_path.exists() else ""
    fields = {
        "commit_before": before,
        "commit_after": after_snapshot["commit"],
        "summary": summary[:12_000],
        "log_path": str(log_path),
    }
    if result.returncode != 0:
        update_task(task["id"], "failed", error=f"Codex exited with {result.returncode}", **fields)
        return
    if after_snapshot["branch"] != EXPECTED_BRANCH:
        update_task(task["id"], "needs_attention", error="Agent changed the protected branch", **fields)
        return
    if not after_snapshot["clean"]:
        update_task(task["id"], "needs_attention", error="Agent left uncommitted changes", **fields)
        return
    if after_snapshot["commit"] == before:
        update_task(task["id"], "needs_attention", error="Agent completed without a new commit", **fields)
        return
    update_task(task["id"], "succeeded", **fields)


def run_checked(task_id: str, label: str, args: list[str], timeout: int, log_parts: list[str], env: dict[str, str] | None = None) -> None:
    result = command(args, timeout=timeout, env=env)
    log_parts.append(f"## {label}\n$ {' '.join(args)}\n{result.stdout}\n{result.stderr}")
    if result.returncode != 0:
        raise RuntimeError(f"{label} failed with exit code {result.returncode}")


def run_preview(task: dict[str, Any]) -> None:
    parent = get_task(task["parent_id"])
    snapshot = ensure_workspace_ready()
    expected_commit = parent["commit_after"]
    if snapshot["commit"] != expected_commit:
        raise RuntimeError(f"Workspace commit {snapshot['commit']} differs from task commit {expected_commit}")
    log_parts: list[str] = []
    env = sanitized_environment()
    env.update(
        {
            "NEXT_PUBLIC_SITE_ENV": "staging",
            "NEXT_PUBLIC_SITE_URL": PREVIEW_URL,
            "NEXT_PUBLIC_YANDEX_METRIKA_ID": "",
            "NODE_ENV": "production",
        }
    )
    try:
        # NODE_ENV=production is required for the resulting Next.js build, but
        # npm would otherwise omit eslint and the other development toolchain.
        run_checked(
            task["id"],
            "npm ci",
            [NPM_BIN, "ci", "--include=dev"],
            1800,
            log_parts,
            env,
        )
        for label, args, timeout in (
            ("lint", [NPM_BIN, "run", "lint"], 1200),
            ("isolation", [NPM_BIN, "run", "check:isolation"], 600),
            ("analytics", [NPM_BIN, "run", "analytics:check"], 600),
            ("build", [NPM_BIN, "run", "build"], 2400),
        ):
            run_checked(task["id"], label, args, timeout, log_parts, env)
    except Exception:
        if log_parts:
            write_log(task["id"], "\n\n".join(log_parts))
        raise
    marker = STATE_DIR / "preview-ready.json"
    marker_tmp = STATE_DIR / "preview-ready.json.tmp"
    marker_tmp.write_text(
        json_dump({"commit": expected_commit, "ready_at": time.time()}),
        encoding="utf-8",
    )
    marker_tmp.replace(marker)
    log_parts.append(f"## preview signal\n{marker.name} written for {expected_commit}")
    health = None
    for _attempt in range(60):
        health = command(
            ["/usr/bin/curl", "--fail", "--silent", "--show-error", f"{PREVIEW_URL}/api/health"],
            timeout=10,
            env=env,
        )
        if health.returncode == 0:
            break
        time.sleep(1)
    assert health is not None
    log_parts.append(f"## health\n{health.stdout}\n{health.stderr}")
    if health.returncode != 0:
        raise RuntimeError("Preview health check failed")
    log_path = write_log(task["id"], "\n\n".join(log_parts))
    summary = (
        f"Приватный staging/noindex preview готов: {PREVIEW_URL}. "
        f"Commit: {expected_commit}. Проверки: lint, isolation, analytics, build, health — успешно."
    )
    update_task(
        task["id"],
        "succeeded",
        commit_before=expected_commit,
        commit_after=expected_commit,
        preview_url=PREVIEW_URL,
        summary=summary,
        log_path=str(log_path),
    )


def run_release(task: dict[str, Any]) -> None:
    parent = get_task(task["parent_id"])
    snapshot = ensure_workspace_ready()
    expected_commit = parent["commit_after"]
    if snapshot["commit"] != expected_commit:
        raise RuntimeError("Рабочая копия уже перешла на другой commit; нужен новый preview")
    summary = (
        f"РЕЛИЗ НЕ ВЫПОЛНЕН. Готова карточка нового сайта Pumbum.\n"
        f"Commit: {expected_commit}\nPreview: {parent['preview_url']}\n"
        f"Проверки: lint, isolation, analytics, build, health — успешно.\n"
        f"Точное согласование владельца: «Одобряю релиз {expected_commit} в production нового сайта Pumbum».\n"
        f"После согласования отдельный оператор обязан повторно проверить commit, production target и план отката."
    )
    log_path = write_log(task["id"], summary)
    update_task(
        task["id"],
        "succeeded",
        commit_before=expected_commit,
        commit_after=expected_commit,
        preview_url=parent["preview_url"],
        summary=summary,
        log_path=str(log_path),
    )


def process(task: dict[str, Any]) -> None:
    try:
        if task["kind"] == "development":
            run_development(task)
        elif task["kind"] == "preview":
            run_preview(task)
        elif task["kind"] == "release":
            run_release(task)
        else:
            raise RuntimeError(f"Unknown task kind: {task['kind']}")
    except subprocess.TimeoutExpired as exc:
        log_path = write_log(task["id"], f"Timeout: {exc}")
        update_task(task["id"], "failed", error="Task timed out", log_path=str(log_path))
    except Exception as exc:
        log_path = write_log(task["id"], f"{type(exc).__name__}: {exc}")
        update_task(task["id"], "failed", error=str(exc)[:2000], log_path=str(log_path))


def main() -> None:
    signal.signal(signal.SIGTERM, stop_handler)
    signal.signal(signal.SIGINT, stop_handler)
    while not STOP:
        task = claim_next_task()
        if task is None:
            time.sleep(POLL_SECONDS)
            continue
        process(task)


if __name__ == "__main__":
    main()
