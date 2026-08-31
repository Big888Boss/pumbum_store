# Hermes factory repair acceptance canary — 2026-08-31

Повторный canary подтверждает локальные исправления factory на исходном commit
`506425f020225d3bc022928ab18db8c5bf585e01`. Приватный preview в рамках этой
проверки не запускался, поэтому его успешность не подтверждается.

## Проверяемые факты

- `actor` и `request` больше не перепутаны: `enqueue()` записывает
  нормализованный `actor` в колонку `actor`, а нормализованный `request` — в
  колонку `request`. Регрессионный тест проверяет значения `telegram:1` и
  `Добавить полезную страницу` после чтения созданной задачи.
- Preview gate формирует production build environment с
  `NODE_ENV=production`, но устанавливает также development toolchain командой
  `npm ci --include=dev` до запуска `lint`, `check:isolation`,
  `analytics:check` и `build`. Unit-тест фиксирует этот порядок и аргумент
  `--include=dev`.
- Production-деплой отсутствует: MCP surface содержит только семь локальных
  инструментов состояния, очереди, preview и подготовки релиз-карты. Команда
  `prepare_release` лишь создаёт релиз-карту и не выполняет deploy.
- Production-деплой, публикация, push и запуск долгоживущего сервера в рамках
  canary не выполнялись. Приложение сайта и секреты не изменялись.

## Финальный canary протокола marker/ack

- После успешных preview gate-проверок container worker удаляет прежний
  `preview-health.json` и атомарно записывает `preview-ready.json` с ожидаемым
  commit.
- Получив marker, host обязан сверить указанный commit с текущим commit рабочей
  копии и только при точном совпадении перезапустить host preview.
- Host обязан записать `preview-health.json` только после успешного health-check
  перезапущенного preview со `status=ok` и `runtime.siteEnv=staging`.
  Acknowledgement должен относиться к тому же commit; health для production или
  другого окружения не является допустимым подтверждением.
- Container worker принимает acknowledgement только при совпадении commit и
  подтверждённом staging health. До получения такого ack preview gate не может
  считаться успешным.

Этот документационный canary не запускал host-активатор и не получил финальный
health acknowledgement. Поэтому успешность финального preview не подтверждена;
приложение сайта и секреты в рамках этой проверки не изменялись.

## Выполненные проверки

- `python3 -m unittest discover -s ops/hermes-dev/factory -p 'test_*.py'` —
  успешно, 5 тестов.
- Статическая проверка MCP tool surface — успешно: найдены ровно семь
  ожидаемых инструментов, ни один из них не является production-deploy.
- `npm run check:isolation` — успешно.
- `npm run analytics:check` — успешно.
- `npm run lint` — запущена, но не завершена: локальная команда `eslint`
  отсутствует.
- `npm run build` — запущена, catalog health сформирован без tracked-изменений,
  затем Next.js build не завершился: webpack не смог разрешить импорты
  `StaticImage`, `InfoTabs`, `MascotFigure`, `PageMascot` и
  `@/lib/seo/metadata`. Эти пути присутствуют в исходном commit; причина ошибки
  в рамках документационного canary не исправлялась.

Результаты локальных обязательных проверок не заменяют отдельный preview gate:
он должен самостоятельно установить dev dependencies, выполнить проверки и
только после этого сигнализировать готовность preview.
