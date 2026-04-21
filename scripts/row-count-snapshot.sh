#!/bin/bash
# Row count snapshot using jq for proper JSON escaping
set -u
TOKEN=$(awk -F'`' '/^Token: `sbp_/{print $2; exit}' ~/.claude/projects/-Users-williamchien-Projects/memory/reference_supabase_api.md)
[[ -z "$TOKEN" ]] && { echo "ERROR: Supabase token not found in memory" >&2; exit 1; }
REF="wzvwmawpkapcmkfmkvav"
API="https://api.supabase.com/v1/projects/$REF/database/query"
PHASE="${1:-before}"
WAVE="${2:-unknown}"
TS=$(date +%Y%m%d-%H%M%S)
OUT_DIR="/Users/williamchien/Projects/venturo-erp/docs/PRE_LAUNCH_CLEANUP/snapshots"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/${WAVE}_${PHASE}_${TS}.json"

TABLES="employees tours orders order_members customers itineraries tour_itinerary_items quotes payment_requests payment_request_items receipts travel_invoices confirmations files folders visas esims suppliers"

echo "{" > "$OUT"
FIRST=1
for T in $TABLES; do
  Q="SELECT w.code, count(x.id)::text AS cnt FROM workspaces w LEFT JOIN public.\"$T\" x ON x.workspace_id = w.id WHERE w.code IN ('CORNER','JINGYAO','YUFEN','TESTUX') GROUP BY w.code ORDER BY w.code;"
  BODY=$(jq -n --arg q "$Q" '{query: $q}')
  sleep 0.3
  RESP=$(curl -sS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$BODY" "$API")
  [[ $FIRST -eq 0 ]] && echo "," >> "$OUT"
  printf '  "%s": %s' "$T" "$RESP" >> "$OUT"
  FIRST=0
done
echo "" >> "$OUT"
echo "}" >> "$OUT"

echo "Snapshot: $OUT"
python3 -c "
import json
d = json.load(open('$OUT'))
print(f'{\"Table\":<28} {\"CORNER\":>8} {\"JINGYAO\":>8} {\"YUFEN\":>8} {\"TESTUX\":>8}')
for t, rows in d.items():
    if isinstance(rows, dict) and 'message' in rows:
        print(f'{t:<28} [err]')
        continue
    counts = {r['code']: r['cnt'] for r in rows}
    print(f'{t:<28} {counts.get(\"CORNER\",\"-\"):>8} {counts.get(\"JINGYAO\",\"-\"):>8} {counts.get(\"YUFEN\",\"-\"):>8} {counts.get(\"TESTUX\",\"-\"):>8}')
"
