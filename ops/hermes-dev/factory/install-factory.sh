#!/usr/bin/env bash
set -euo pipefail

workspace="/home/administrator/agent-projects/pumbum-hermes-dev"
runtime_env="/home/administrator/.config/pumbum-hermes-dev/runtime.env"
runtime_root="/home/administrator/.local/share/pumbum-hermes-dev"
state_root="/home/administrator/.local/state/pumbum-hermes-dev"
unit_root="/home/administrator/.config/systemd/user"

if [[ "$(id -un)" != "administrator" ]]; then
  echo "Run as administrator" >&2
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

if [[ "$(git -C "${workspace}" branch --show-current)" != "codex/hermes-seo-geo" ]]; then
  echo "Wrong workspace branch" >&2
  exit 1
fi

if [[ -n "$(git -C "${workspace}" status --porcelain)" ]]; then
  echo "Workspace must be clean" >&2
  exit 1
fi

install -d -m 700 "$(dirname "${runtime_env}")" "${runtime_root}" "${state_root}" "${unit_root}"
python3 -m venv "${runtime_root}/venv"
"${runtime_root}/venv/bin/pip" install --disable-pip-version-check --requirement "${workspace}/ops/hermes-dev/requirements.txt"

install -m 644 "${workspace}/ops/hermes-dev/factory/pumbum-hermes-mcp.service" "${unit_root}/pumbum-hermes-mcp.service"
install -m 644 "${workspace}/ops/hermes-dev/factory/pumbum-hermes-preview.service" "${unit_root}/pumbum-hermes-preview.service"
install -m 644 "${workspace}/ops/hermes-dev/factory/pumbum-hermes-preview-reload.service" "${unit_root}/pumbum-hermes-preview-reload.service"
install -m 644 "${workspace}/ops/hermes-dev/factory/pumbum-hermes-preview-reload.path" "${unit_root}/pumbum-hermes-preview-reload.path"

systemctl --user daemon-reload
systemctl --user disable --now pumbum-hermes-worker.service >/dev/null 2>&1 || true
systemctl --user enable --now pumbum-hermes-mcp.service pumbum-hermes-preview-reload.path
docker compose --file "${workspace}/ops/hermes-dev/factory/compose.worker.yaml" up --detach --build worker

echo "Factory contour installed. Preview remains stopped until a verified build is ready."
