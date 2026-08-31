from __future__ import annotations

import subprocess
import tempfile
import unittest
from pathlib import Path

import pumbum_dev_common as common


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


if __name__ == "__main__":
    unittest.main()
