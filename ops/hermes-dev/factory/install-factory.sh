#!/usr/bin/env bash
set -euo pipefail

workspace="${HOME}/agent-projects/pumbum-hermes-dev"
runtime_env="${HOME}/.config/pumbum-hermes-dev/runtime.env"
runtime_root="${HOME}/.local/share/pumbum-hermes-dev"
state_root="${HOME}/.local/state/pumbum-hermes-dev"
unit_root="${HOME}/.config/systemd/user"
github_remote="git@github.com:Big888Boss/pumbum_store.git"
github_key="${HOME}/.ssh/pumbum-hermes-github"

if [[ "$(id -u)" == "0" ]]; then
  echo "Run as an unprivileged deployment user" >&2
  exit 1
fi

if [[ ! -f "${runtime_env}" ]]; then
  echo "Missing ${runtime_env}" >&2
  exit 1
fi

if [[ "$(stat -c '%a' "${runtime_env}")" != "600" ]]; then
  echo "${runtime_env} must have mode 600" >&2
  exit 1
fi

if ! grep -Eq '^PUMBUM_DEV_MCP_TOKEN=.{32,}$' "${runtime_env}"; then
  echo "PUMBUM_DEV_MCP_TOKEN is missing or too short" >&2
  exit 1
fi

for key in PUMBUM_DEV_TAILNET_HOST PUMBUM_DEV_PREVIEW_URL NEXT_PUBLIC_SITE_URL; do
  if ! grep -Eq "^${key}=.+$" "${runtime_env}"; then
    echo "${key} is missing from ${runtime_env}" >&2
    exit 1
  fi
done

set -a
# shellcheck disable=SC1090
source "${runtime_env}"
set +a
export PUMBUM_DEV_WORKSPACE="${workspace}"
export PUMBUM_DEV_STATE_DIR="${state_root}"
: "${PUMBUM_DEV_CODEX_HOME:?Set PUMBUM_DEV_CODEX_HOME in runtime.env}"

if [[ "$(git -C "${workspace}" branch --show-current)" != "codex/hermes-seo-geo" ]]; then
  echo "Wrong workspace branch" >&2
  exit 1
fi

if [[ -n "$(git -C "${workspace}" status --porcelain)" ]]; then
  echo "Workspace must be clean" >&2
  exit 1
fi

if [[ ! -f "${github_key}" || "$(stat -c '%a' "${github_key}")" != "600" ]]; then
  echo "${github_key} must exist with mode 600" >&2
  exit 1
fi

if git -C "${workspace}" remote get-url github >/dev/null 2>&1; then
  if [[ "$(git -C "${workspace}" remote get-url github)" != "${github_remote}" ]]; then
    echo "Existing github remote points to an unexpected repository" >&2
    exit 1
  fi
else
  git -C "${workspace}" remote add github "${github_remote}"
fi

install -d -m 700 "$(dirname "${runtime_env}")" "${runtime_root}" "${state_root}" "${unit_root}"
python3 -m venv "${runtime_root}/venv"
"${runtime_root}/venv/bin/pip" install --disable-pip-version-check --requirement "${workspace}/ops/hermes-dev/requirements.txt"

install -m 644 "${workspace}/ops/hermes-dev/factory/pumbum-hermes-mcp.service" "${unit_root}/pumbum-hermes-mcp.service"
install -m 644 "${workspace}/ops/hermes-dev/factory/pumbum-hermes-preview.service" "${unit_root}/pumbum-hermes-preview.service"
install -m 644 "${workspace}/ops/hermes-dev/factory/pumbum-hermes-preview-reload.service" "${unit_root}/pumbum-hermes-preview-reload.service"
install -m 644 "${workspace}/ops/hermes-dev/factory/pumbum-hermes-preview-reload.path" "${unit_root}/pumbum-hermes-preview-reload.path"
install -m 755 "${workspace}/ops/hermes-dev/factory/pumbum_dev_git_sync.py" "${runtime_root}/pumbum_dev_git_sync.py"
install -m 644 "${workspace}/ops/hermes-dev/factory/pumbum-hermes-git-sync.service" "${unit_root}/pumbum-hermes-git-sync.service"
install -m 644 "${workspace}/ops/hermes-dev/factory/pumbum-hermes-git-sync.timer" "${unit_root}/pumbum-hermes-git-sync.timer"

systemctl --user daemon-reload
systemctl --user disable --now pumbum-hermes-worker.service >/dev/null 2>&1 || true
systemctl --user enable --now pumbum-hermes-mcp.service pumbum-hermes-preview-reload.path pumbum-hermes-git-sync.timer
systemctl --user restart pumbum-hermes-mcp.service
docker compose --file "${workspace}/ops/hermes-dev/factory/compose.worker.yaml" up --detach --build worker

echo "Factory contour installed. Preview remains stopped until a verified build is ready."
