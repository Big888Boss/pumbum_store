# SEO Rules

## Technical baseline

- Каждая индексируемая страница должна иметь `title`, `description`, H1 и canonical.
- `robots.txt` и `sitemap.xml` генерируются из `src/lib/seo/*`.
- Sitemap включает только production URLs и только страницы, прошедшие data-quality gate.
- Unknown routes возвращают 404.
- Filter/search URLs не индексируются без отдельного whitelist.
- Покупательские подразделы индексируются только как curated routes
  `/catalog/{category}/podrazdel/{subcategory}` с непустой выдачей, H1,
  metadata и canonical.
- Страницы `по задаче` должны описывать реальную инженерную задачу и вести к
  существующим группам каталога. Нельзя называть такую подборку совместимым
  комплектом без проверки конкретных артикулов.
- Страницы производителей индексируются только для производителей, у которых
  есть реальные товары в generated catalog.

## Schema.org

- Использовать JSON-LD.
- Глобально: `Organization`, `Store`, `WebSite`.
- Категории: `CollectionPage` + `BreadcrumbList`.
- Товары: `Product` + `BreadcrumbList`.
- `Offer` разрешен только если есть подтвержденная числовая цена.
- Если наличие не подтверждено (`unknown` / `on_request`), не публиковать `availability` в `Offer`; нельзя подставлять fake `InStock`.
- Нельзя публиковать fake `price: 0` или `InStock` без источника.
- Schema должна совпадать с видимым контентом.

## AI-search / AEO / GEO

- AI-search readiness начинается с обычной индексации.
- Нужны полезные самодостаточные блоки: назначение, как выбрать, ограничения, совместимость.
- Не делать doorway GEO pages.
- Не считать `llms.txt` заменой sitemap, canonical и контента.

## Saratov/Yandex geo checklist

- Production URL must be the canonical bare domain: `https://477477.ru`.
- `www.477477.ru` and direct IP traffic must redirect to the canonical domain.
- Global metadata must keep Saratov geo tags: `geo.region=RU-SAR`, `geo.placename=Саратов`, `geo.position=51.54513;46.020494`.
- Global Store/LocalBusiness JSON-LD must include the visible Saratov address, phone, opening hours and coordinates.
- `/contacts` must show the same address, phone, email, working hours and map as the production business profile.
- In Yandex Webmaster after cutover: verify region as Saratov/Saratov oblast, submit `https://477477.ru/sitemap.xml`, inspect a few important product URLs.
- Do not index search/filter URLs; use sitemap/category/product pages for discoverability.

## Product GEO and legacy URL rules

- Product metadata and visible lead text may include the natural Saratov purchase intent, but must not repeat city keywords or invent local stock.
- Ordinary products use a neutral price/shipping confirmation note. Only products with explicit `preorder` data show `Под заказ`.
- Legacy brand, subcategory, group and article URLs must resolve through `content/generated/legacy-route-redirects.json`; do not replace exact matches with a generic search redirect.
- Validate the redirect artifact with `npm run seo:check-legacy-redirects` before deployment.

## Text quality

- Тексты должны проходить fact-check по sourceRefs.
- Generic AI phrasing не мержить без редакторской правки.
- `seo-audit-writer` и Humanizer/Avoid AI Writing использовать как чеклист, не как финальный источник истины.
