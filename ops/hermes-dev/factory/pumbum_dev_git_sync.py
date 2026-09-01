from __future__ import annotations

import argparse
import fcntl
import json
import os
import sqlite3
import stat
import subprocess
import tempfile
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


EXPECTED_BRANCH = "codex/hermes-seo-geo"
EXPECTED_REMOTE_URL = "git@github.com:Big888Boss/pumbum_store.git"
GIT_BIN = "/usr/bin/git"
GIT_SAFE_OPTIONS = (
    "-c",
    "core.hooksPath=/dev/null",
    "-c",
    "core.fsmonitor=false",
)


class GitSyncError(RuntimeError):
    pass


@dataclass(frozen=True)
class SyncConfig:
    workspace: Path
    state_dir: Path
    database: Path
    remote_name: str
    remote_url: str
    branch: str
    key_path: Path
    known_hosts_path: Path

    @classmethod
    def from_environment(cls) -> "SyncConfig":
        state_dir = Path(
            os.environ.get(
                "PUMBUM_GIT_SYNC_STATE_DIR",
                "/home/administrator/.local/state/pumbum-hermes-dev",
            )
        ).resolve()
        return cls(
            workspace=Path(
                os.environ.get(
                    "PUMBUM_GIT_SYNC_WORKSPACE",
                    "/home/administrator/agent-projects/pumbum-hermes-dev",
                )
            ).resolve(),
            state_dir=state_dir,
            database=Path(
                os.environ.get("PUMBUM_GIT_SYNC_DATABASE", str(state_dir / "state.sqlite"))
            ).resolve(),
            remote_name=os.environ.get("PUMBUM_GIT_SYNC_REMOTE", "github"),
            remote_url=os.environ.get(
                "PUMBUM_GIT_SYNC_REMOTE_URL", EXPECTED_REMOTE_URL
            ),
            branch=os.environ.get("PUMBUM_GIT_SYNC_BRANCH", EXPECTED_BRANCH),
            key_path=Path(
                os.environ.get(
                    "PUMBUM_GIT_SYNC_KEY",
                    "/home/administrator/.ssh/pumbum-hermes-github",
                )
            ).resolve(),
            known_hosts_path=Path(
                os.environ.get(
                    "PUMBUM_GIT_SYNC_KNOWN_HOSTS",
                    "/home/administrator/.ssh/known_hosts",
                )
            ).resolve(),
        )


def utc_now() -> str:
    return datetime.now(UTC).isoformat(timespec="seconds")


def run_command(
    args: list[str],
    *,
    cwd: Path,
    env: dict[str, str] | None = None,
    timeout: int = 120,
) -> str:
    result = subprocess.run(
        args,
        cwd=cwd,
        env=env or sanitized_environment(),
        text=True,
        capture_output=True,
        check=False,
        timeout=timeout,
    )
    if result.returncode != 0:
        message = (result.stderr or result.stdout or "command failed").strip()
        raise GitSyncError(message[:2000])
    return result.stdout.strip()


def git(
    config: SyncConfig,
    *args: str,
    env: dict[str, str] | None = None,
    timeout: int = 120,
) -> str:
    return run_command(
        [GIT_BIN, *GIT_SAFE_OPTIONS, *args],
        cwd=config.workspace,
        env=env,
        timeout=timeout,
    )


def sanitized_environment() -> dict[str, str]:
    environment = {
        key: value
        for key, value in os.environ.items()
        if key
        in {"HOME", "LANG", "LC_ALL", "PATH", "SSL_CERT_FILE", "SSL_CERT_DIR"}
    }
    environment.update(
        {
            "GIT_CONFIG_GLOBAL": "/dev/null",
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_TERMINAL_PROMPT": "0",
        }
    )
    return environment


def validate_config(config: SyncConfig) -> None:
    if config.branch != EXPECTED_BRANCH:
        raise GitSyncError(f"Refusing unexpected branch: {config.branch}")
    if config.remote_name != "github":
        raise GitSyncError(f"Refusing unexpected remote name: {config.remote_name}")
    if config.remote_url != EXPECTED_REMOTE_URL:
        raise GitSyncError(f"Refusing unexpected remote URL: {config.remote_url}")
    if not config.workspace.is_dir():
        raise GitSyncError(f"Workspace is missing: {config.workspace}")


def validate_credential(path: Path, *, private: bool) -> None:
    try:
        metadata = path.stat()
    except FileNotFoundError as exc:
        raise GitSyncError(f"Required SSH file is missing: {path.name}") from exc
    if not stat.S_ISREG(metadata.st_mode):
        raise GitSyncError(f"Required SSH path is not a regular file: {path.name}")
    if metadata.st_uid != os.getuid():
        raise GitSyncError(f"Required SSH file has the wrong owner: {path.name}")
    if private and stat.S_IMODE(metadata.st_mode) & 0o077:
        raise GitSyncError(f"Deploy key permissions are too broad: {path.name}")


def ssh_environment(config: SyncConfig) -> dict[str, str]:
    validate_credential(config.key_path, private=True)
    validate_credential(config.known_hosts_path, private=False)
    environment = sanitized_environment()
    environment.update(
        {
            "GIT_SSH_COMMAND": (
                "/usr/bin/ssh -o BatchMode=yes -o IdentitiesOnly=yes "
                "-o PasswordAuthentication=no -o StrictHostKeyChecking=yes "
                f"-o UserKnownHostsFile={config.known_hosts_path} -i {config.key_path}"
            ),
        }
    )
    return environment


def successful_development_task(config: SyncConfig, commit: str) -> str | None:
    if not config.database.is_file():
        return None
    connection = sqlite3.connect(
        f"file:{config.database}?mode=ro", uri=True, timeout=10
    )
    try:
        row = connection.execute(
            """
            SELECT id
            FROM tasks
            WHERE kind = 'development'
              AND status = 'succeeded'
              AND commit_after = ?
            ORDER BY updated_at DESC
            LIMIT 1
            """,
            (commit,),
        ).fetchone()
    finally:
        connection.close()
    return str(row[0]) if row else None


def remote_commit(config: SyncConfig, environment: dict[str, str]) -> str | None:
    output = git(
        config,
        "ls-remote",
        "--heads",
        config.remote_url,
        f"refs/heads/{config.branch}",
        env=environment,
    )
    if not output:
        return None
    lines = [line.split() for line in output.splitlines() if line.strip()]
    if len(lines) != 1 or len(lines[0]) != 2:
        raise GitSyncError("GitHub returned an unexpected branch listing")
    commit, refname = lines[0]
    if refname != f"refs/heads/{config.branch}":
        raise GitSyncError(f"GitHub returned an unexpected ref: {refname}")
    return commit


def write_status(config: SyncConfig, payload: dict[str, Any]) -> dict[str, Any]:
    config.state_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    status = {
        "updated_at": utc_now(),
        "remote_repository": "Big888Boss/pumbum_store",
        "remote_branch": config.branch,
        **payload,
    }
    descriptor, temporary_name = tempfile.mkstemp(
        prefix="git-sync-status.", dir=config.state_dir
    )
    try:
        os.fchmod(descriptor, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump(status, handle, ensure_ascii=False, sort_keys=True)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_name, config.state_dir / "git-sync-status.json")
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)
    return status


def synchronize(config: SyncConfig, *, allow_baseline: bool = False) -> dict[str, Any]:
    validate_config(config)
    config.state_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    lock_path = config.state_dir / "git-sync.lock"
    with lock_path.open("a+", encoding="utf-8") as lock:
        os.chmod(lock_path, 0o600)
        try:
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return write_status(config, {"status": "skipped", "reason": "sync_busy"})

        branch = git(config, "branch", "--show-current")
        commit = git(config, "rev-parse", "HEAD")
        clean = not bool(git(config, "status", "--porcelain", "--untracked-files=all"))
        common = {"branch": branch, "commit": commit, "clean": clean}
        if branch != config.branch:
            return write_status(
                config,
                {**common, "status": "skipped", "reason": "unexpected_branch"},
            )
        if not clean:
            return write_status(
                config,
                {**common, "status": "skipped", "reason": "dirty_workspace"},
            )

        configured_url = git(config, "remote", "get-url", config.remote_name)
        if configured_url != config.remote_url:
            raise GitSyncError(
                f"Remote {config.remote_name} must be exactly {config.remote_url}"
            )
        configured_push_url = git(
            config, "remote", "get-url", "--push", config.remote_name
        )
        if configured_push_url != config.remote_url:
            raise GitSyncError(
                f"Push URL for {config.remote_name} must be exactly {config.remote_url}"
            )

        environment = ssh_environment(config)
        before = remote_commit(config, environment)
        if before == commit:
            return write_status(
                config,
                {
                    **common,
                    "status": "up_to_date",
                    "remote_commit": before,
                },
            )

        task_id = successful_development_task(config, commit)
        if task_id is None and not allow_baseline:
            return write_status(
                config,
                {
                    **common,
                    "status": "skipped",
                    "reason": "commit_not_from_successful_development_task",
                    "remote_commit": before,
                },
            )

        git(
            config,
            "push",
            "--porcelain",
            config.remote_url,
            f"HEAD:refs/heads/{config.branch}",
            env=environment,
            timeout=300,
        )
        after = remote_commit(config, environment)
        if after != commit:
            raise GitSyncError(
                f"GitHub acknowledgement {after or 'missing'} does not match {commit}"
            )
        return write_status(
            config,
            {
                **common,
                "status": "pushed",
                "remote_commit": after,
                "task_id": task_id,
                "baseline_authorized": task_id is None and allow_baseline,
            },
        )


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Push one verified Pumbum development branch to GitHub."
    )
    parser.add_argument(
        "--allow-baseline",
        action="store_true",
        help="Allow one operator-authorized clean baseline push without a task row.",
    )
    args = parser.parse_args()
    config = SyncConfig.from_environment()
    try:
        status = synchronize(config, allow_baseline=args.allow_baseline)
    except Exception as exc:
        status = write_status(
            config,
            {"status": "failed", "error": f"{type(exc).__name__}: {exc}"[:2000]},
        )
        print(json.dumps(status, ensure_ascii=False, sort_keys=True))
        return 1
    print(json.dumps(status, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
