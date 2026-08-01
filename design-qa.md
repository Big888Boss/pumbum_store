# Design QA — manufacturer mascot responsive seams

## Reference

- Source visual truth: the accepted desktop manufacturer composition from the active staging build before this change.
- Reference capture: `/tmp/pumbum-manufacturer-before-20260801/manufacturers-grid-desktop-dark.png`
- Reference viewport: `1280 x 847`, device scale factor `1`, dark theme.
- Scope: manufacturer cards only. Desktop placement, typography, content, routes, and card styling must remain unchanged.

## Implementation evidence

- Candidate: `http://127.0.0.1:3031/catalog/proizvoditeli`
- Desktop: `/tmp/pumbum-manufacturer-final-candidate-20260801/desktop-full.png`
- Tablet: `/tmp/pumbum-manufacturer-final-candidate-20260801/tablet-full.png`
- Phone: `/tmp/pumbum-manufacturer-final-candidate-20260801/mobile-full.png`
- Focused captures for `SINIKON`, `Гидроконтракт`, and `ZOTA` are in the same candidate evidence directory.
- Viewports: desktop `1280 x 847`, tablet `820 x 1180`, phone `390 x 844`; device scale factor `1`; dark theme.

## Verified geometry

- All manufacturer-card vertical gaps are `16px` at all three viewports.
- Стыкович is attached to the upper-left SINIKON corner; his legs overlap the card/logo surface without covering the SINIKON logo or copy.
- Фильтрыч is attached to the lower-right Гидроконтракт seam and hangs toward AQUARIO without covering the “Все товары производителя” link.
- Тепловик is attached to the lower-right ZOTA seam and hangs toward TIM without covering the “Все товары производителя” link.
- No horizontal overflow is introduced.
- The desktop composition matches the accepted source; only responsive rules at `900px` and `640px` were changed.

## Comparison history

1. Initial phone/tablet implementation reused one generic bottom offset and reserved `72px` after every mascot-host card. This detached Стыкович from SINIKON and created uneven empty rows.
2. Candidate removed flow-space reservation and restored per-mascot anchors. Tablet SINIKON was then lowered to align the seated feet with the white logo surface.
3. Final candidate passed focused geometry checks and the full redesign regression suite on desktop, tablet, and phone.

## QA result

final result: passed
