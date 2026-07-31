# Presentation mascot design QA — 2026-07-31

## Source

- Colleague markup: `/Users/zilbertov/Downloads/Presentation.pdf`
- Rendered source pages: `tmp/pdfs/presentation-review/page-04.png` through
  `page-12.png`
- Target: isolated high-end staging redesign only
- Production `477477.ru`: outside the change

## Required composition

- Every category uses one semantic mascot in three independently generated
  placements: peeking with a hand on the hero carousel edge, standing
  thoughtfully below the pre-purchase card, and sitting on the
  related-category explanatory line/card seam.
- Manufacturers use three different figures between the first manufacturer
  cards.
- About uses one figure in the marked lower-right area of the main content
  card.
- Previously rejected global companion and runner layers remain absent.

## Viewports and states

- Desktop: `1280 × 847`, dark theme
- Mobile: `390 × 844`, dark theme
- Additional retained checks: desktop/mobile light theme, menu, scroll reveal,
  filters, sorting, pagination, carousel autoplay and route navigation

## Comparison inputs

- `work/pumbum-mascot-qa-20260731/comparisons/hero-comparison.jpg`
- `work/pumbum-mascot-qa-20260731/comparisons/advice-comparison.jpg`
- `work/pumbum-mascot-qa-20260731/comparisons/related-comparison.jpg`
- `work/pumbum-mascot-qa-20260731/comparisons/manufacturers-comparison.jpg`
- `work/pumbum-mascot-qa-20260731/comparisons/about-comparison.jpg`

Each file places the marked presentation source on the left and the candidate
implementation on the right.

## Iteration history

1. The rejected source pass reused generic full-body images and changed layout
   spacing. It was not activated.
2. Thirty slot-specific assets were generated: ten category owners multiplied
   by peek, thoughtful and seated poses. Alpha edges were cleaned and WebP
   runtime derivatives were kept below 120 KiB each.
3. The corrective CSS uses absolute overlays only. It does not add margins,
   padding, minimum heights or grid changes to product, category,
   manufacturer or About content.
4. Reference and implementation screenshots were combined for each marked
   composition before the activation decision.
5. The owner follow-up moved the hero crop inward, lowered the seated figure
   onto the card seam and moved it to the left edge of the third card. The
   pre-purchase card was rebalanced without changing either surrounding grid
   or card dimensions. New reference/implementation comparisons are stored in
   `work/pumbum-mascot-tuning-qa-20260731-v2/comparisons/`.

## Final result

Passed.

- All ten category-to-mascot mappings render exactly three figures.
- The figures follow the marked content seams without shifting product,
  manufacturer or category cards.
- Supplier/product content and all text remain above or outside decorative
  overlays; no mascot covers a CTA or product title.
- Desktop and mobile have no horizontal overflow.
- The call button remains clickable and unobstructed.
- Existing accepted hero/footer mascots remain; rejected companion/runner
  layers are absent.
- Browser console, page and same-origin request error collections are empty in
  both the isolated candidate and the post-activation run.
- The follow-up browser check also asserts placement geometry numerically:
  the hero figure overlaps the carousel by `40px`, the seated figure's anchor
  stays on the left seam of the third card and the phone action uses the
  intended lower inset.
