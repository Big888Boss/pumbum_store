from __future__ import annotations

import hmac
import json
import os
from typing import Any

from mcp.server.fastmcp import FastMCP
from starlette.responses import JSONResponse, PlainTextResponse

from pumbum_dev_common import (
    EXPECTED_BRANCH,
    PREVIEW_URL,
    enqueue,
    git_sync_snapshot,
    get_task,
    initialize_database,
    normalize_text,
    recent_tasks as load_recent_tasks,
    update_task,
    workspace_snapshot,
)


TOKEN = os.environ.get("PUMBUM_DEV_MCP_TOKEN", "")
if len(TOKEN) < 32:
    raise RuntimeError("PUMBUM_DEV_MCP_TOKEN must contain at least 32 characters")

mcp = FastMCP(
    "pumbum-hermes-dev",
    instructions=(
        "Изолированная разработка нового сайта Pumbum. Инструментов production-деплоя, "
        "старого сайта, MyShop и 1С здесь нет."
    ),
    host=os.environ.get("PUMBUM_DEV_MCP_HOST", "100.95.56.90"),
    port=int(os.environ.get("PUMBUM_DEV_MCP_PORT", "8798")),
    streamable_http_path="/mcp",
    stateless_http=True,
    json_response=True,
)


def public_task(task: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in task.items() if key != "log_path"}


@mcp.tool()
def workspace_status() -> dict[str, Any]:
    """Показать ветку, commit, чистоту рабочей копии и адрес preview."""
    snapshot = workspace_snapshot()
    snapshot["expected_branch"] = EXPECTED_BRANCH
    snapshot["github_sync"] = git_sync_snapshot()
    snapshot["production_deploy_available"] = False
    return snapshot


@mcp.tool()
def start_development_task(request: str, actor: str) -> dict[str, Any]:
    """Поставить в очередь одну задачу разработки нового сайта Pumbum."""
    snapshot = workspace_snapshot()
    if snapshot["branch"] != EXPECTED_BRANCH:
        raise ValueError(f"Неверная рабочая ветка: {snapshot['branch']}")
    if not snapshot["clean"]:
        raise ValueError("В рабочей копии есть незавершённые изменения; требуется разбор владельца")
    return public_task(enqueue("development", request, actor))


@mcp.tool()
def task_status(task_id: str) -> dict[str, Any]:
    """Получить текущий статус и результат задачи."""
    return public_task(get_task(normalize_text(task_id, field="task_id", maximum=80)))


@mcp.tool()
def recent_tasks(limit: int = 10) -> list[dict[str, Any]]:
    """Показать последние задачи без секретных журналов."""
    return [public_task(task) for task in load_recent_tasks(limit)]


@mcp.tool()
def start_preview(task_id: str, actor: str) -> dict[str, Any]:
    """Собрать и опубликовать приватный staging/noindex preview успешной задачи."""
    parent = get_task(normalize_text(task_id, field="task_id", maximum=80))
    if parent["kind"] != "development" or parent["status"] != "succeeded":
        raise ValueError("Preview можно запускать только для успешно завершённой задачи разработки")
    request = f"Собрать приватный preview commit {parent['commit_after']}"
    return public_task(enqueue("preview", request, actor, parent_id=parent["id"]))


@mcp.tool()
def prepare_release(task_id: str, actor: str) -> dict[str, Any]:
    """Подготовить карточку релиза; production-деплой не выполняется."""
    parent = get_task(normalize_text(task_id, field="task_id", maximum=80))
    if parent["kind"] != "preview" or parent["status"] != "succeeded":
        raise ValueError("Релиз-карту можно готовить только после успешного preview")
    request = f"Подготовить релиз-карту для preview commit {parent['commit_after']}"
    return public_task(enqueue("release", request, actor, parent_id=parent["id"]))


@mcp.tool()
def cancel_queued_task(task_id: str, actor: str) -> dict[str, Any]:
    """Отменить ещё не начатую задачу."""
    task = get_task(normalize_text(task_id, field="task_id", maximum=80))
    normalize_text(actor, field="actor", maximum=200)
    if task["status"] != "queued":
        raise ValueError("Можно отменить только задачу в очереди")
    update_task(task["id"], "cancelled", summary="Отменено пользователем до запуска")
    return public_task(get_task(task["id"]))


initialize_database()
inner_app = mcp.streamable_http_app()


async def app(scope: dict[str, Any], receive: Any, send: Any) -> None:
    if scope["type"] == "http" and scope.get("path") == "/health":
        response = JSONResponse(
            {
                "status": "ok",
                "service": "pumbum-hermes-dev",
                "preview_url": PREVIEW_URL,
                "production_deploy_available": False,
            }
        )
        await response(scope, receive, send)
        return
    if scope["type"] == "http":
        headers = {key.lower(): value for key, value in scope.get("headers", [])}
        supplied = headers.get(b"authorization", b"").decode("utf-8", errors="ignore")
        expected = f"Bearer {TOKEN}"
        if not hmac.compare_digest(supplied, expected):
            response = PlainTextResponse("unauthorized", status_code=401)
            await response(scope, receive, send)
            return
    await inner_app(scope, receive, send)
