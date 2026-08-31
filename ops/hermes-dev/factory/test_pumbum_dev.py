from __future__ import annotations

import subprocess
import tempfile
import unittest
import json
from pathlib import Path
from unittest import mock

import pumbum_dev_common as common
import pumbum_dev_preview_activate as preview_activate
import pumbum_dev_worker as worker


class CommonTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        root = Path(self.tempdir.name)
        workspace = root / "workspace"
        state = root / "state"
        workspace.mkdir()
        subprocess.run(["git", "init", "-b", common.EXPECTED_BRANCH], cwd=workspace, check=True, capture_output=True)
        subprocess.run(["git", "config", "user.email", "test@example.invalid"], cwd=workspace, check=True)
        subprocess.run(["git", "config", "user.name", "Test"], cwd=workspace, check=True)
        (workspace / "README.md").write_text("test\n", encoding="utf-8")
        subprocess.run(["git", "add", "README.md"], cwd=workspace, check=True)
        subprocess.run(["git", "commit", "-m", "initial"], cwd=workspace, check=True, capture_output=True)
        common.WORKSPACE = workspace
        common.STATE_DIR = state
        common.DB_PATH = state / "state.sqlite"
        common.LOG_DIR = state / "logs"

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def test_workspace_snapshot_reports_expected_branch_and_clean_tree(self) -> None:
        snapshot = common.workspace_snapshot()
        self.assertEqual(common.EXPECTED_BRANCH, snapshot["branch"])
        self.assertTrue(snapshot["clean"])
        self.assertEqual(40, len(snapshot["commit"]))

    def test_queue_requires_successful_parent(self) -> None:
        development = common.enqueue("development", "Добавить полезную страницу", "telegram:1")
        self.assertEqual("telegram:1", development["actor"])
        self.assertEqual("Добавить полезную страницу", development["request"])
        with self.assertRaisesRegex(ValueError, "ещё не завершена"):
            common.enqueue("preview", "Собрать preview", "telegram:1", parent_id=development["id"])
        common.update_task(development["id"], "succeeded", commit_after="a" * 40)
        preview = common.enqueue("preview", "Собрать preview", "telegram:1", parent_id=development["id"])
        self.assertEqual("queued", preview["status"])

    def test_claim_is_atomic_and_redacts_log_path(self) -> None:
        task = common.enqueue("development", "Исправить метаданные", "telegram:1")
        claimed = common.claim_next_task()
        self.assertIsNotNone(claimed)
        self.assertEqual(task["id"], claimed["id"])
        self.assertEqual("running", claimed["status"])
        self.assertIsNone(common.claim_next_task())
        log_path = common.write_log(task["id"], "secret operational log")
        common.update_task(task["id"], "failed", log_path=str(log_path), error="failure")
        visible = common.get_task(task["id"])
        self.assertEqual(log_path.name, visible["log_path"])

    def test_request_limits(self) -> None:
        with self.assertRaisesRegex(ValueError, "пустым"):
            common.enqueue("development", "   ", "telegram:1")
        with self.assertRaisesRegex(ValueError, "превышает"):
            common.enqueue("development", "x" * (common.MAX_REQUEST_CHARS + 1), "telegram:1")


class WorkerTests(unittest.TestCase):
    def test_preview_installs_development_toolchain_in_production_env(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            state_dir = Path(temporary)
            task = {"id": "preview-1", "parent_id": "development-1"}
            parent = {"commit_after": "a" * 40}
            checked_calls: list[tuple[str, list[str]]] = []

            def record_check(
                _task_id: str,
                label: str,
                args: list[str],
                _timeout: int,
                _log_parts: list[str],
                _env: dict[str, str] | None = None,
            ) -> None:
                checked_calls.append((label, args))

            def acknowledge_preview(_seconds: float) -> None:
                (state_dir / "preview-health.json").write_text(
                    json.dumps(
                        {
                            "commit": parent["commit_after"],
                            "health": {
                                "status": "ok",
                                "runtime": {"siteEnv": "staging"},
                            },
                        }
                    ),
                    encoding="utf-8",
                )

            with (
                mock.patch.object(worker, "STATE_DIR", state_dir),
                mock.patch.object(worker, "get_task", return_value=parent),
                mock.patch.object(
                    worker,
                    "ensure_workspace_ready",
                    return_value={"commit": parent["commit_after"]},
                ),
                mock.patch.object(worker, "run_checked", side_effect=record_check),
                mock.patch.object(worker.time, "sleep", side_effect=acknowledge_preview),
                mock.patch.object(worker, "write_log", return_value=state_dir / "preview.log"),
                mock.patch.object(worker, "update_task") as update_task,
            ):
                worker.run_preview(task)

            self.assertEqual(
                ("npm ci", [worker.NPM_BIN, "ci", "--include=dev"]),
                checked_calls[0],
            )
            self.assertEqual(
                ["npm ci", "lint", "isolation", "analytics", "build"],
                [label for label, _args in checked_calls],
            )
            update_task.assert_called_once()

    def test_host_preview_health_requires_staging(self) -> None:
        self.assertTrue(
            preview_activate.health_is_ready(
                {"status": "ok", "runtime": {"siteEnv": "staging"}}
            )
        )
        self.assertFalse(
            preview_activate.health_is_ready(
                {"status": "ok", "runtime": {"siteEnv": "production"}}
            )
        )


if __name__ == "__main__":
    unittest.main()
