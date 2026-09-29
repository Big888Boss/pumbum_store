from __future__ import annotations

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import pumbum_dev_common as common
import pumbum_dev_git_sync as git_sync
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
        common.GIT_SYNC_STATUS_PATH = state / "git-sync-status.json"

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

    def test_git_sync_snapshot_exposes_only_public_status_fields(self) -> None:
        common.STATE_DIR.mkdir(parents=True, exist_ok=True)
        common.GIT_SYNC_STATUS_PATH.write_text(
            json.dumps(
                {
                    "status": "pushed",
                    "remote_commit": "a" * 40,
                    "remote_repository": "Big888Boss/pumbum_store",
                    "secret": "must-not-leak",
                }
            ),
            encoding="utf-8",
        )
        snapshot = common.git_sync_snapshot()
        self.assertEqual("pushed", snapshot["status"])
        self.assertNotIn("secret", snapshot)


class GitSyncTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tempdir = tempfile.TemporaryDirectory()
        root = Path(self.tempdir.name)
        self.workspace = root / "workspace"
        self.state = root / "state"
        self.workspace.mkdir()
        self.state.mkdir()
        self.key = root / "key"
        self.known_hosts = root / "known_hosts"
        self.key.write_text("private", encoding="utf-8")
        self.known_hosts.write_text("github.com key", encoding="utf-8")
        self.key.chmod(0o600)
        self.known_hosts.chmod(0o600)
        self.config = git_sync.SyncConfig(
            workspace=self.workspace,
            state_dir=self.state,
            database=self.state / "state.sqlite",
            remote_name="github",
            remote_url=git_sync.EXPECTED_REMOTE_URL,
            branch=git_sync.EXPECTED_BRANCH,
            key_path=self.key,
            known_hosts_path=self.known_hosts,
        )

    def tearDown(self) -> None:
        self.tempdir.cleanup()

    def test_user_unit_avoids_unsupported_capability_directives(self) -> None:
        unit = Path(__file__).with_name("pumbum-hermes-git-sync.service").read_text(
            encoding="utf-8"
        )
        self.assertNotIn("PrivateDevices=true", unit)
        self.assertNotIn("ProtectKernelModules=true", unit)

    def test_git_sync_script_has_python_shebang(self) -> None:
        script = Path(__file__).with_name("pumbum_dev_git_sync.py").read_text(
            encoding="utf-8"
        )
        self.assertTrue(script.startswith("#!/usr/bin/python3\n"))

    def test_sanitized_environment_drops_service_credential_paths(self) -> None:
        with mock.patch.dict(
            os.environ,
            {
                "PUMBUM_GIT_SYNC_KEY": "/run/credentials/private-key",
                "UNRELATED_SECRET": "hidden",
            },
        ):
            environment = git_sync.sanitized_environment()
        self.assertNotIn("PUMBUM_GIT_SYNC_KEY", environment)
        self.assertNotIn("UNRELATED_SECRET", environment)
        self.assertEqual("/dev/null", environment["GIT_CONFIG_GLOBAL"])

    def test_git_disables_workspace_hooks_and_fsmonitor(self) -> None:
        with mock.patch.object(git_sync, "run_command", return_value="ok") as command:
            git_sync.git(self.config, "status", "--porcelain")
        args = command.call_args.args[0]
        self.assertIn("core.hooksPath=/dev/null", args)
        self.assertIn("core.fsmonitor=false", args)

    def git_side_effect(self, head: str, pushed: list[tuple[str, ...]]):
        def fake_git(
            _config: git_sync.SyncConfig,
            *args: str,
            env: dict[str, str] | None = None,
            timeout: int = 120,
        ) -> str:
            del env, timeout
            if args == ("branch", "--show-current"):
                return git_sync.EXPECTED_BRANCH
            if args == ("rev-parse", "HEAD"):
                return head
            if args == ("status", "--porcelain", "--untracked-files=all"):
                return ""
            if args == ("remote", "get-url", "github"):
                return git_sync.EXPECTED_REMOTE_URL
            if args == ("remote", "get-url", "--push", "github"):
                return git_sync.EXPECTED_REMOTE_URL
            if args and args[0] == "push":
                pushed.append(args)
                return "Done"
            raise AssertionError(f"Unexpected git call: {args}")

        return fake_git

    def test_sync_skips_unverified_commit(self) -> None:
        head = "a" * 40
        pushed: list[tuple[str, ...]] = []
        with (
            mock.patch.object(git_sync, "git", side_effect=self.git_side_effect(head, pushed)),
            mock.patch.object(git_sync, "ssh_environment", return_value={}),
            mock.patch.object(git_sync, "remote_commit", return_value=None),
            mock.patch.object(git_sync, "successful_development_task", return_value=None),
        ):
            result = git_sync.synchronize(self.config)
        self.assertEqual("skipped", result["status"])
        self.assertEqual("commit_not_from_successful_development_task", result["reason"])
        self.assertEqual([], pushed)

    def test_sync_pushes_exact_non_force_branch_for_successful_task(self) -> None:
        head = "b" * 40
        pushed: list[tuple[str, ...]] = []
        with (
            mock.patch.object(git_sync, "git", side_effect=self.git_side_effect(head, pushed)),
            mock.patch.object(git_sync, "ssh_environment", return_value={}),
            mock.patch.object(git_sync, "remote_commit", side_effect=[None, head]),
            mock.patch.object(
                git_sync,
                "successful_development_task",
                return_value="development-task",
            ),
        ):
            result = git_sync.synchronize(self.config)
        self.assertEqual("pushed", result["status"])
        self.assertEqual("development-task", result["task_id"])
        self.assertEqual(1, len(pushed))
        self.assertNotIn("--force", pushed[0])
        self.assertEqual(
            f"HEAD:refs/heads/{git_sync.EXPECTED_BRANCH}", pushed[0][-1]
        )

    def test_sync_accepts_up_to_date_baseline_without_task(self) -> None:
        head = "c" * 40
        pushed: list[tuple[str, ...]] = []
        with (
            mock.patch.object(git_sync, "git", side_effect=self.git_side_effect(head, pushed)),
            mock.patch.object(git_sync, "ssh_environment", return_value={}),
            mock.patch.object(git_sync, "remote_commit", return_value=head),
            mock.patch.object(git_sync, "successful_development_task") as task_lookup,
        ):
            result = git_sync.synchronize(self.config)
        self.assertEqual("up_to_date", result["status"])
        task_lookup.assert_not_called()
        self.assertEqual([], pushed)


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
