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

## Canonical domain

Production canonical domain: `https://477477.ru`.

Staging must not be indexed unless explicitly approved. Use `NEXT_PUBLIC_SITE_ENV=production` only for production indexing.

## Current V2 catalog scope

- Buyer-facing categories: 6 purpose categories, using the legacy `/catalog` bucket assignment (`Отопление и котельная`, `Насосы и водоснабжение`, `Канализация и водоотведение`, `Трубы и фитинги`, `Арматура и комплектующие`, `Прочее оборудование`).
- Raw generated legacy source categories: 11.
- Raw generated legacy products: 5700.
- Runtime product routes: 5700 generated legacy rows; manual pilot cards are not appended to production runtime.
- Runtime `/catalog` category counts match live Legacy purpose navigation: 3132 / 479 / 311 / 1082 / 509 / 187.
- Sitemap loc count after purpose categories, manufacturer index and product routes: 5714. Cart route is intentionally not included in sitemap.
- Build output after cart API/page and legacy image path import: 5722 generated/static/dynamic routes.
- Heavy categories render only the first 240 visible SKU cards on category page; all publishable products remain available through product URLs and sitemap.
- Search is server-rendered and reads the full normalized catalog without shipping the 22 MB generated catalog to the browser as a client bundle.
