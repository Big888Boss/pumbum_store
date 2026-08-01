# Manufacturer responsive mascot release — 2026-08-01

## Scope

This staging-only correction aligns the three manufacturer mascots at phone,
tablet and intermediate widths with the already accepted desktop composition.
No manufacturer content, products, prices, links, routes or card order changed.
Production `477477.ru` was not modified.

## Geometry contract

- Manufacturer-card vertical gaps are `16px` at desktop, tablet and phone.
- Стыкович is attached to the upper-left SINIKON corner and hangs into the
  white card surface without covering the logo or copy.
- Фильтрыч sits on the lower-right Гидроконтракт seam and hangs toward AQUARIO
  without covering tags or the manufacturer link.
- Тепловик sits on the lower-right ZOTA seam and hangs toward TIM without
  covering copy or the manufacturer link.
- No extra flow-space is reserved for mascot hosts and no horizontal overflow
  is introduced.
- Desktop geometry is unchanged; responsive overrides apply at `900px` and
  `640px`.

## Release

- Implementation commit: `074a2f9`
- Build ID: `QZnoOkwbi7rClrMSQP2nG`
- Active unit:
  `pumbum-redesign-preview-manufacturer-responsive-20260801.service`
- App listener: `127.0.0.1:3025`
- Tailnet gate: `100.95.56.90:3027`
- Public read-only gate: `127.0.0.1:3028` through the existing outbound-only
  Cloudflare transport
- Exact previous build:
  `/home/administrator/backups/pumbum-redesign/manufacturer-responsive-20260801/.next-6ifPip-yNQOrJD9gbAXST`

## Verification

- Focused manufacturer geometry: passed at `1280x847`, `820x1180` and
  `390x844`; reference gap `16px` at every viewport.
- Full storefront browser regression: passed at the same three viewports;
  runtime errors `[]`.
- Catalog invariants: `9276` products, ten categories, nine manufacturers and
  `9354` sitemap URLs.
- Full pagination: `3379` products across `141` pages with no duplicates.
- Ten category carousels, sorting/filter anchors, search, product CTA, mobile
  menu, dark/light themes, CSP nonce rotation and responsive overflow gates
  passed.
- Bounded load check: `100/100` successful responses, `117.33 req/s`, p95
  `66ms`.
- Runtime dependency audit: zero production vulnerabilities.
- Active unit has `NRestarts=0`; app and candidate listeners were loopback-only.
- The temporary candidate unit on `3031` was stopped after activation QA.

## Rollback

Stop the active unit, restore the exact retained `.next` directory above into
the source tree, and restart the prior unit only after checking that port
`3025` is free. Re-run `/api/health`, focused manufacturer geometry and the
full browser suite after rollback.

Final result: passed.
