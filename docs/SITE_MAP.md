# Site Map

## Public routes

| Route | Purpose | Indexing |
|---|---|---|
| `/` | Главная V2 | production only |
| `/catalog` | Вход в каталог | production only |
| `/catalog/proizvoditeli` | Каталог по производителям | production only |
| `/search` | Серверный поиск по SKU/бренду/характеристикам | production only |
| `/cart` | Временно перенаправляет на `/contacts`; корзина отключена до отдельного решения | noindex |
| `/catalog/:category` | Страница категории | gated by category/product quality |
| `/catalog/:category/:sku` | Карточка товара | gated by product data quality |
| `/delivery` | Доставка и самовывоз | production only |
| `/about` | О компании | production only |
| `/contacts` | Телефон, email, адрес, режим работы и карта проезда | production only |
| `/privacy` | Политика обработки данных | production only |
| `/robots.txt` | Robots policy by environment | always |
| `/sitemap.xml` | Sitemap from route map | production URLs only |
| `/product/:article` | Permanent redirect from the old article URL to the current product or closest current category | redirect only |
| `/catalog/:brand/:subcategory/:group` | Permanent redirect from the old brand-first catalog URL | redirect only |

## Canonical domain

Production canonical domain: `https://477477.ru`.

Staging must not be indexed unless explicitly approved. Use `NEXT_PUBLIC_SITE_ENV=production` only for production indexing.

## Current V2 catalog scope

- Buyer-facing categories: 6 purpose categories, using the legacy `/catalog` bucket assignment (`Отопление и котельная`, `Насосы и водоснабжение`, `Канализация и водоотведение`, `Трубы и фитинги`, `Арматура и комплектующие`, `Прочее оборудование`).
- Raw generated legacy source categories: 11.
- Base legacy products: `5700`.
- Runtime product routes: `9276` generated rows: `5700` base legacy, `3508` TIM and `68` ESPA.
- Sitemap loc count: `9289`; cart and search routes are intentionally excluded.
- Current nonce-CSP build renders HTML routes dynamically while keeping robots and sitemap static.
- Category pages render `60` products at a time with server-side pagination. Every matching product is reachable through the page controls; page 2 and later are `noindex,follow` to avoid duplicate category indexing while preserving product discovery.
- Search is server-rendered and reads the full normalized catalog without shipping the generated catalog to the browser as a client bundle.
