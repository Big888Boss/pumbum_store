# Data Quality

## Product sitemap gate

Товар можно публиковать в sitemap, если:

- `dataQuality.score >= 75`;
- есть `sourceRefs`;
- есть проверенные характеристики;
- есть реальное изображение или честная placeholder policy;
- карточка не содержит выдуманных цены, наличия, совместимости или документов.

## Offer schema gate

`Offer` можно публиковать только если:

- есть числовая цена;
- указана валюта `RUB`;
- наличие подтверждено;
- цена и наличие видимы пользователю или корректно объяснены на странице.

Если цена неизвестна, используется сценарий заявки: "Запросить актуальную цену". Если цена показана без подтвержденного наличия, JSON-LD `Offer` не публикуется.

## Runtime price policy

- V2 показывает цену товара, если есть подтвержденный supplier override или числовая Legacy-цена из исходного импорта.
- Supplier override имеет приоритет над Legacy-ценой.
- Текущий подтвержденный override: VALTEC official price list `2026-06-26`, 2309 runtime-позиций из `content/generated/supplier-price-overrides.json`.
- AQUARIO проверен по текущим product pages: расхождений с Legacy-ценами не найдено.
- VIVALDO оставлен по Legacy-ценам по бизнес-подтверждению, что цены не менялись.
- SINIKON, Гидроконтракт и прочие поставщики без актуального источника остаются по Legacy-ценам.
- ZOTA и АКВАТЕК не обновляются автоматически, пока карточки Legacy/V2 не будут связаны с конкретными supplier SKU: текущие Legacy-группы дают несколько разных цен на сайте поставщика.
- Цены вида "по запросу", "по договору", `0` и пустые значения не переносятся в `price`.

## Legacy import rules

- Legacy JSON является source material, не runtime dependency V2.
- Runtime V2 читает нормализованный generated artifact: `content/generated/legacy-catalog.json`.
- Generated artifact пересобирается командой `LEGACY_CATALOG_SOURCE=<path> LEGACY_CATALOG_GENERATED_AT=<iso> npm run catalog:import-legacy`.
- После импорта запускать `npm run catalog:normalize-suppliers`, чтобы у каждой runtime-позиции были `supplier`, `supplierName` и `specs["Поставщик"]`.
- Базовый raw import: 11 legacy-разделов и 5700 product rows.
- Runtime-каталог для покупателя нормализует raw import в 6 разделов по назначению через legacy `/catalog` bucket assignment и отдельный route производителей `/catalog/proizvoditeli`.
- Текущий runtime после импорта TIM и ESPA: 9276 product rows и 9276 уникальных product routes; 9276 product URLs проходят sitemap gate.
- Состав runtime: 5700 базовых legacy-позиций, 3508 TIM и 68 ESPA.
- ESPA: 32 позиции `in_stock`, 36 позиций `preorder`; у всех 68 позиций цена отсутствует намеренно, а статус поставки подтвержден и видим пользователю.
- Текущий ESPA image import: 68/68 позиций имеют локальное официальное WebP-изображение; product paths находятся в `/images/products/espa/**`.
- Legacy-local `/images/products/**` assets are runtime/static assets and must be mounted or synchronized on the server; do not commit the 1.1 GB legacy image directory into git.
- VALTEC-ветка импортируется по live Legacy mapper: section -> group -> model -> items, с legacy fallback для уникального артикула; текущий VALTEC import: 4410 rows.
- `server_data/admin/users.json` не читать и не коммитить.
- Supplier files переносить через нормализатор и report.
- Большой `public/images` не коммитить целиком без asset strategy.
- Для каждого импортированного товара фиксировать source type, source URL и gaps.
- Legacy-цены хранятся в quality notes и переносятся в runtime `price` только по текущей бизнес-задаче на перенос Legacy-наполнения. `Offer` не включать без подтвержденного наличия.
- Если у товара нет проверенного изображения, использовать честный placeholder `/images/generated-placeholders/catalog-product.svg`; current generated runtime should stay at 0 placeholder refs unless the source data really lacks an image.
- Если несколько SKU используют одно семейное фото, карточка и список каталога должны показывать отличающие характеристики: артикул, диаметр, угол, резьбу, размер, мощность, объем, материал или другой проверенный source spec. Одинаковое фото допустимо только когда текст ясно объясняет разницу между артикулами.
- Внутренние `Product.id` должны быть уникальны. ESPA importer нормализует найденные дубликаты старого каталога, не изменяя `categorySlug/slug` и публичные URL.

## Lead data rules

- Заявки валидируются через `src/entities/lead/model.ts`.
- Runtime storage по умолчанию: `.data/leads.jsonl`; путь можно заменить через `LEADS_STORAGE_PATH`.
- Для CRM/внешней обработки использовать `LEADS_WEBHOOK_URL` и, если нужно, `LEADS_WEBHOOK_TOKEN` в server env.
- `.data/**`, реальные `.env`, webhook tokens и файлы заявок не коммитить.
- В формах не обещать цену/наличие до подтверждения менеджером.
