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
4. Hermes запускает приватный preview и отдаёт ссылку, commit и проверки.
5. Команда подготовки релиза формирует карточку релиза. Production-деплоя в MCP API нет.

## Сервисы Fanding

- `pumbum-hermes-mcp.service` — MCP API на Tailscale-адресе, Bearer-аутентификация;
- `pumbum-hermes-worker.service` — единственный исполнитель очереди;
- `pumbum-hermes-preview.service` — staging/noindex preview последнего проверенного commit.

Секреты хранятся только на сервере в `~/.config/pumbum-hermes-dev/runtime.env` с режимом `0600`.

## Установка

`factory/install-factory.sh` запускается из чистой рабочей копии на Fanding. До запуска должен существовать runtime env с `PUMBUM_DEV_MCP_TOKEN`.

Профиль Vira устанавливается `vira/install-profile.sh` после заполнения серверного файла окружения. Нужны новый BotFather-токен, числовые Telegram ID разрешённых пользователей и тот же MCP bearer token. `TELEGRAM_ALLOWED_CHATS` должен дословно совпадать с `TELEGRAM_ALLOWED_USERS`: личный chat ID равен user ID, а отрицательные ID групп не пройдут этот gate.

## Граница релиза

Фразы согласования описаны в `vira/SOUL.md`, но безопасность не зависит от prompt: API намеренно не содержит инструмента production-деплоя, а worker не получает SSH-ключи production.
