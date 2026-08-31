#!/usr/bin/env bash
set -euo pipefail

profile_name="pumbum-dev"
profile_root="/home/vira-admin/.hermes/profiles/${profile_name}"
config_root="/home/vira-admin/.config/pumbum-hermes-dev"
unit_root="/home/vira-admin/.config/systemd/user"
service_name="vira-pumbum-hermes.service"
prepare_only=false
if [[ "${1:-}" == "--prepare-only" ]]; then
  prepare_only=true
  shift
fi
source_root="${1:-/home/vira-admin/pumbum-hermes-dev/vira}"
runtime_env="${config_root}/runtime.env"
hermes_bin="/home/vira-admin/.local/bin/hermes"

if [[ "$(id -un)" != "vira-admin" ]]; then
  echo "Run as vira-admin" >&2
  exit 1
fi

install -d -m 700 "${config_root}" "${unit_root}"
if [[ ! -f "${profile_root}/profile.yaml" ]]; then
  "${hermes_bin}" profile create "${profile_name}" --no-skills --no-alias \
    --description "Изолированный Telegram-агент разработки нового сайта Pumbum через Fanding MCP."
fi
install -d -m 700 "${profile_root}" "${profile_root}/workspace"
install -m 600 "${source_root}/config.yaml.template" "${profile_root}/config.yaml"
install -m 600 "${source_root}/SOUL.md" "${profile_root}/SOUL.md"
install -m 644 "${source_root}/vira-pumbum-hermes.service" "${unit_root}/${service_name}"
systemctl --user daemon-reload
systemd-analyze --user verify "${unit_root}/${service_name}"

if [[ "${prepare_only}" == true ]]; then
  echo "Pumbum Hermes profile and inactive service are prepared; runtime credentials are still required."
  exit 0
fi

if [[ ! -f "${runtime_env}" ]]; then
  echo "Create ${runtime_env} from runtime.env.example with the new bot token, exact user IDs and the Fanding MCP token" >&2
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

set -a
# shellcheck disable=SC1090
source "${runtime_env}"
set +a
"${hermes_bin}" -p "${profile_name}" mcp test pumbum_dev
systemctl --user enable --now "${service_name}"
systemctl --user is-active "${service_name}"
