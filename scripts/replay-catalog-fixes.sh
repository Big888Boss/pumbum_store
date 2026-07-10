#!/bin/sh
# Переигрывает все контентные фиксы каталога после восстановления
# content/generated из старого бэкапа. Патчи фото Синикона должны лежать
# в /tmp/sin-patch.json (прогоняется отдельно для каждого патча).
# Порядок важен. После — пересборка образа (манифест запечён).
set -e
cd "$(dirname "$0")/.."
echo "1/4 нормализация имён/групп"
python3 scripts/normalize_catalog_presentation.py
echo "2/4 привязка xlsx-фото"
python3 scripts/photo_audit_and_fix.py
echo "3/4 возврат семейных фото (решение владельца, вариант B)"
python3 scripts/rollback_photo_downgrades.py
echo "4/4 фото Синикона (если /tmp/sin-patch.json существует)"
[ -f /tmp/sin-patch.json ] && python3 scripts/apply_sinikon_photos.py || echo "  патч не найден, пропущено"
echo "ГОТОВО. Дальше: docker compose build v2 && docker compose up -d"
