#!/usr/bin/env bash
set -euo pipefail

profile_name="pumbum-dev"
profile_root="/home/vira-admin/.hermes/profiles/${profile_name}"
source_root="${1:-/opt/pumbum-hermes-dev/vira}"
runtime_env="${profile_root}/.env"
hermes_bin="/home/vira-admin/.local/bin/hermes"

if [[ "$(id -un)" != "vira-admin" ]]; then
  echo "Run as vira-admin" >&2
  exit 1
fi

if [[ ! -f "${runtime_env}" ]]; then
  echo "Create ${runtime_env} with TELEGRAM_BOT_TOKEN, TELEGRAM_ALLOWED_USERS and PUMBUM_DEV_MCP_TOKEN" >&2
  exit 1
fi

if [[ "$(stat -c '%a' "${runtime_env}")" != "600" ]]; then
  echo "${runtime_env} must have mode 600" >&2
  exit 1
fi

for key in TELEGRAM_BOT_TOKEN TELEGRAM_ALLOWED_USERS TELEGRAM_ALLOWED_CHATS PUMBUM_DEV_MCP_TOKEN; do
  if ! grep -Eq "^${key}=.+$" "${runtime_env}"; then
    echo "Missing ${key}" >&2
    exit 1
  fi
done

allowed_users="$(sed -n 's/^TELEGRAM_ALLOWED_USERS=//p' "${runtime_env}")"
allowed_chats="$(sed -n 's/^TELEGRAM_ALLOWED_CHATS=//p' "${runtime_env}")"
if [[ "${allowed_users}" != "${allowed_chats}" ]]; then
  echo "TELEGRAM_ALLOWED_CHATS must exactly match TELEGRAM_ALLOWED_USERS to keep groups blocked" >&2
  exit 1
fi

install -d -m 700 "${profile_root}"
install -m 600 "${source_root}/config.yaml.template" "${profile_root}/config.yaml"
install -m 600 "${source_root}/SOUL.md" "${profile_root}/SOUL.md"

"${hermes_bin}" -p "${profile_name}" gateway install
"${hermes_bin}" -p "${profile_name}" gateway start
"${hermes_bin}" -p "${profile_name}" gateway status
