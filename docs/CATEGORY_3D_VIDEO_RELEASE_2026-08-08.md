# Category 3D video release — 2026-08-08

## Scope

This staging-only release places one supplied 3D product video in each of the
ten catalog categories. The video follows the `Товары раздела` heading at
phone, tablet and desktop widths without changing products, prices, filters,
sorting, pagination, taxonomy or routes. Production `477477.ru` is outside
this release.

## Category mapping

| Category | Video subject |
| --- | --- |
| `vodosnabzhenie` | Water storage tank |
| `kanalizaciya` | Local wastewater treatment system |
| `filtraciya` | Filter with pressure gauge |
| `nasosy` | Pump equipment |
| `smesiteli-i-sifony` | Bath drain-overflow |
| `otoplenie-i-kotelnaya` | Boiler cutaway |
| `krepezh-dlya-montazha` | Pipe clamp |
| `truby-i-fitingi` | Stainless-steel pipes |
| `armatura-i-komplektuyuschie` | Ball valve |
| `prochee-oborudovanie` | Manual pressure-test pump |

## Runtime contract

- MP4 assets preserve the supplied `1280x720` H.264 video stream byte-for-byte,
  remove unused audio, and use fast-start metadata in an MP4 container.
- Versioned `hq-v2` asset URLs prevent the 30-day preview cache from serving the
  earlier `960x540` derivatives after activation.
- A small JPEG poster renders before any video bytes are requested.
- The source attaches only when the media approaches the viewport.
- Playback starts only while at least 42% of the frame is visible and pauses
  when the frame leaves view or the document becomes hidden.
- Browser controls and picture-in-picture are unavailable; the frame is a
  passive product presentation rather than a media player.
- `prefers-reduced-motion` keeps the poster static and never attaches the video
  source.
- The visual frame reuses the existing surface, border, radius, typography and
  color tokens; no new global visual language or layout dependency was added.
- Media geometry is intentionally unchanged: the frame stays within the phone
  and tablet content gutters and remains capped at `860px` on desktop.

## Verification

The active staging build is `lS3jNHYnNcDbUzn_QdkMC`, served by
`pumbum-redesign-preview-category-video-hq-20260808.service` on loopback port
`3025`. Tailnet and public read-only gates remain on `3027` and `3028`.

- Static contract: 10 mappings, 10 MP4 assets and 10 posters.
- Browser video QA: 10 categories across `390x844`, `820x1180` and
  `1280x847` (30 combinations); autoplay-in-view, pause-out-of-view,
  decoded `1280x720` resolution, bounded phone/tablet/desktop width,
  poster-only reduced motion, no controls, no horizontal overflow and no
  runtime errors all passed on the isolated candidate and again after
  activation.
- Direct reference/candidate visual comparison passed using the supplied mobile
  screenshot and the candidate at the same `390x844` viewport.
- Full storefront browser regression: themes, menu, catalog, search, product
  CTA, filters, sorting, pagination, carousels and the previously accepted
  mascot layouts passed without console, page or same-origin request errors.
- Data invariants: 9,276 products, 10 categories, 9 manufacturers, 9,354
  sitemap URLs and all 3,379 products across the 141-page largest category.
- Security: enforced nonce CSP with rotating nonce, `media-src 'self'`, CSP
  report endpoint `204`, public write request `405`, `noindex` preview headers
  and zero production dependency vulnerabilities.
- Bounded candidate load: health `100/100` responses with p95 `159ms`; category
  page `40/40` responses with p95 `967ms`, versus `1031ms` on the prior active
  build under the same immediate test.
- Runtime: zero restarts, below 495 MiB peak app memory, 12 GiB available host
  memory and zero memory PSI during final checks.

The exact previous build `VrSm6Yp1QPN1nYTJVNRbY` is retained at
`/home/administrator/backups/pumbum-redesign/category-video-hq-20260808/.next-VrSm6Yp1QPN1nYTJVNRbY`
for rollback. Production `477477.ru` was not changed.

Final result: passed.
