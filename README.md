# pumbum_store — витрина каталога сантехники (477477.ru)

Публичный сайт-каталог магазина сантехники в Энгельсе: категории по назначению,
карточки товаров с ценами из прайсов поставщиков, поиск, SEO (JSON-LD, sitemap,
legacy-редиректы), Яндекс.Метрика. Покупка онлайн отключена намеренно: корзина
и форма заявки возвращают `410`, контакт только по телефону (`/contacts`).

## Стек

- Next.js 15.5 (App Router, `output: standalone`), React 18, TypeScript `strict`.
- Данные — статические JSON в `content/` (`content/generated/legacy-catalog.json`
  и др.), импортируются в бандл на этапе сборки. Базы данных, auth, admin нет.
- Безопасность: `src/middleware.ts` (rate-limit / anti-bot в памяти процесса, CSP с
  nonce из `src/lib/security/csp.ts`), security-заголовки в `next.config.mjs`.
- Тесты: vitest (`src/**/__tests__`), CI — GitHub Actions (`.github/workflows/ci.yml`).
- Деплой: Docker multi-stage (`Dockerfile`, `node:22-alpine`, non-root, read-only
  rootfs) и blue-green compose-файлы в `deploy/`; nginx-конфиг вне репозитория.

## Локальный запуск

Требуется Node.js 22 (см. `Dockerfile` и CI) и npm.

```bash
npm ci
cp .env.example .env.local        # при необходимости, значения — плейсхолдеры
npm run dev                       # http://localhost:3010
```

Проверки перед коммитом:

```bash
npx tsc --noEmit
npm run lint
npm test                          # vitest run
npm run build                     # write-catalog-health + next build
npm audit --audit-level=high
```

Скрипты `scripts/check-*.mjs` и `npm run security:check-csp` — smoke-проверки
против запущенного сервера (`npm start`, порт 3010) и требуют Playwright.

## Данные каталога

Товары, цены и редиректы генерируются скриптами из `scripts/` в `content/generated/`
(см. `docs/PRODUCT_DATA_OPERATIONS.md`, `docs/DATA_QUALITY.md`,
`docs/IMAGE_ASSET_MANIFEST.md`). Файлы `legacy-catalog.json` (~38 МБ) и
`product-image-manifest.json` (~8 МБ) — генерируемые артефакты, не правятся руками.
Фотографии товаров (`public/images/products`, ~1.2 ГБ) в репозиторий не входят и
монтируются на сервере томом.

Команда `images:apply-sinikon-source` удалена: её целевого файла в репозитории
нет. Исторический `scripts/apply_sinikon_photos.py` требует отдельной проверки
путей перед запуском и не участвует в текущем импорте каталога.

## Документация

- `docs/AGENT_CONTEXT.md` — карта кода: что читать при изменении SEO, категорий, товаров.
- `docs/PRODUCTION_DEPLOYMENT_PLAN.md`, `docs/RELEASE_CHECKLIST.md` — план деплоя и чек-лист релиза.
- `docs/MONITORING_AND_ANTIBOT.md` — anti-bot, rate-limit, требования к nginx, мониторинг.
- `docs/SEO_RULES.md`, `docs/UX_SEO_STRATEGY.md`, `docs/SITE_MAP.md` — SEO и структура сайта.
- `docs/*_RELEASE_*.md`, `docs/AUDIT_*.md` — журнал релизов и аудитов.
- `.codex-wiki/README.md` — операционные заметки (порты, текущий релиз).
- `SAFETY.md` — исторический документ времён монорепо `new-store-v2/`.

Адреса хостов, SSH-логины и серверные пути в документации заменены на
плейсхолдеры (`<prod-host>`, `<staging-host>`, `<deploy-user>`, `<build-user>`,
`<deploy-root>`, `<build-workspace>`); реальные значения хранятся у владельца вне git.

## Деплой (кратко)

1. Образ собирается на билд-хосте, не на маленьком production-сервере:
   `docker compose -f deploy/docker-compose.prod.yml build` (build context — корень
   репозитория).
2. Образ переносится на production и запускается blue-green: новый контейнер на
   свободном порту, проверка `/api/health`, `/catalog`, `/sitemap.xml`, затем
   переключение nginx upstream и остановка старого контейнера.
3. Обязательные переменные: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_ENV`,
   `NEXT_PUBLIC_YANDEX_METRIKA_ID`, `CSP_MODE`, `TRUSTED_CLIENT_IP_HEADER`
   (см. `.env.example`). nginx должен сам выставлять `X-Real-IP` и не пропускать
   клиентские `CF-Connecting-IP` / `X-Forwarded-For`.

Подробности, откат и доказательства релизов — в `docs/`.
