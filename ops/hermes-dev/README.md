# Hermes-контур разработки Pumbum

Изолированный контур позволяет разработчику ставить задачи новому сайту Pumbum через отдельного Telegram-бота Hermes.

## Архитектура

- **Vira**: отдельный профиль Hermes `pumbum-dev`, отдельный Telegram-токен и deny-by-default allowlist.
- **Fanding**: чистая Git-копия `pumbum-hermes-dev`, MCP API, последовательный worker и приватный preview.
- **Новый сайт**: production не подключён к боту. Релиз готовится как commit + доказательства + план отката.
- **Старый сайт, MyShop и 1С**: отсутствуют в инструментах и правах бота.

## Пользовательский сценарий

1. Разработчик обычным сообщением описывает задачу.
2. Hermes создаёт задачу и возвращает её ID.
3. Worker меняет код в `codex/hermes-seo-geo`, проверяет и коммитит его.
4. Отдельный host-сервис проверяет успешный статус задачи и автоматически отправляет commit только в одноимённую GitHub-ветку без force-push.
5. Hermes запускает приватный preview и отдаёт ссылку, commit и проверки.
6. Команда подготовки релиза формирует карточку релиза. Production-деплоя в MCP API нет.

## Сервисы Fanding

- `pumbum-hermes-mcp.service` — MCP API на Tailscale-адресе, Bearer-аутентификация;
- контейнер `pumbum-hermes-worker` — единственный исполнитель очереди, без Docker socket и SSH-клиента;
- `pumbum-hermes-preview.service` — staging/noindex preview последнего проверенного commit.
- `pumbum-hermes-git-sync.timer` — host-side синхронизация успешных commit в `Big888Boss/pumbum_store:codex/hermes-seo-geo`.

Секреты хранятся только на сервере в `~/.config/pumbum-hermes-dev/runtime.env` с режимом `0600`.

Code worker запускает Codex без вложенного `bubblewrap`, потому что на Ubuntu 24.04 пользовательские namespace ограничены AppArmor. Граница не снимается: worker целиком помещён в отдельный Docker-контейнер с read-only rootfs. В контейнер смонтированы только рабочая копия, очередь и выделенный Codex auth pool; Docker socket, SSH-клиент, SSH-ключи и соседние проекты отсутствуют.

GitHub deploy key остаётся на host и передаётся только одноразовому systemd-сервису через credentials directory. Сервис исполняет установленную копию sync-скрипта вне изменяемой worker рабочей директории, принимает только чистый `codex/hermes-seo-geo` HEAD с успешной development-задачей и использует обычный non-force push. `main`, merge, tags и production в его интерфейсе отсутствуют.

## Установка

`factory/install-factory.sh` запускается из чистой рабочей копии на Fanding. До запуска должны существовать runtime env с `PUMBUM_DEV_MCP_TOKEN` и mode-0600 deploy key `/home/administrator/.ssh/pumbum-hermes-github`. Установщик проверяет или добавляет точный remote `github`, устанавливает доверенную копию sync-скрипта, собирает pinned worker image и запускает MCP API, worker, preview-reload path unit и Git sync timer.

Профиль Vira сначала безопасно готовится без запуска: `vira/install-profile.sh --prepare-only`. Команда создаёт изолированный профиль, устанавливает совместимый с Vira Hermes `0.18.0` config/SOUL и hardened unit `vira-pumbum-hermes.service`, но не включает его. Для запуска создаётся mode-0600 файл `/home/vira-admin/.config/pumbum-hermes-dev/runtime.env` по `vira/runtime.env.example`, затем выполняется обычный `vira/install-profile.sh`.

Нужны новый BotFather-токен, числовые Telegram ID разрешённых пользователей и тот же MCP bearer token. `TELEGRAM_ALLOWED_CHATS` должен дословно совпадать с `TELEGRAM_ALLOWED_USERS`: личный chat ID равен user ID, а отрицательные ID групп не пройдут этот gate. Сервис использует immutable Hermes release Vira и управляемое общее Codex OAuth-хранилище; отдельные OAuth-копии в профиль не создаются.

## Граница релиза

Фразы согласования описаны в `vira/SOUL.md`, но безопасность не зависит от prompt: API намеренно не содержит инструмента production-деплоя, а worker не получает SSH-ключи production.

## Read-only acceptance

- `curl --fail --silent http://100.95.56.90:8798/health` проверяет MCP API без раскрытия токена.
- Авторизованный `tools/list` должен вернуть ровно семь инструментов из `factory/pumbum_dev_mcp.py`; инструмента production-деплоя среди них нет.
