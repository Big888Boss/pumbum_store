# Hermes Git sync acceptance — 2026-09-01

Подтверждены следующие условия автоматической GitHub-синхронизации:

- отдельный host-side systemd timer автоматически отправляет успешные commit
  рабочей ветки `codex/hermes-seo-geo` только в
  `Big888Boss/pumbum_store:codex/hermes-seo-geo`;
- AI-worker не получает SSH-ключ;
- push выполняется в обычном non-force режиме;
- `main`, merge и production недоступны.
