# Presentation mascot design QA — 2026-07-31

## Source

- Colleague markup: `/Users/zilbertov/Downloads/Presentation.pdf`
- Rendered source pages: `tmp/pdfs/presentation-review/page-04.png` through
  `page-12.png`
- Target: isolated high-end staging redesign only
- Production `477477.ru`: outside the change

## Required composition

- Every category uses one semantic mascot in three repeated placements:
  peeking from the hero carousel edge, standing below the pre-purchase card,
  and appearing at the related-category heading/card seam.
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

- `work/mascot-presentation/comparisons/category-hero.png`
- `work/mascot-presentation/comparisons/category-advice.png`
- `work/mascot-presentation/comparisons/category-related.png`
- `work/mascot-presentation/comparisons/manufacturers.png`
- `work/mascot-presentation/comparisons/about.png`

Each file places the marked presentation source on the left and the candidate
implementation on the right.

## Iteration history

1. The first candidate put the desktop hero figure too low and kept the
   pre-purchase figure inside the card.
2. The second candidate moved the hero figure behind the carousel edge,
   positioned the pre-purchase figure in the intended whitespace below the
   card, enlarged the related/manufacturer figures and reserved a non-overlap
   zone for the mobile call button.
3. The final pass added context screenshots and verified the full composition,
   rather than judging clipped element-only screenshots.

## Final result

Passed.

- All ten category-to-mascot mappings render exactly three figures.
- The figures follow the marked content seams without shifting product,
  manufacturer or category cards.
- Desktop and mobile have no horizontal overflow.
- The call button remains clickable and unobstructed.
- Existing accepted hero/footer mascots remain; rejected companion/runner
  layers are absent.
- Browser console, page and same-origin request error collections are empty.
