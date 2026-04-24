#!/bin/bash
# db-apply-pending.sh — 執行 supabase/migrations/_pending_review/ 裡某個 migration
#
# 用法:
#   ./scripts/db-apply-pending.sh <migration_filename>
#
# 範例:
#   ./scripts/db-apply-pending.sh 20260424070000_unify_receipts_status_encoding
#
# 流程:
#   1. 找 supabase/migrations/_pending_review/<filename>.sql
#   2. 顯示 SQL + confirm
#   3. 透過 Supabase Management API 執行
#   4. 成功後移到 supabase/migrations/ 主目錄

set -e

MIGRATION_FILE="$1"
if [[ -z "$MIGRATION_FILE" ]]; then
  echo "Usage: $0 <migration_filename>"
  echo ""
  echo "待執行的 migration:"
  ls -1 supabase/migrations/_pending_review/*.sql 2>/dev/null | sed 's|.*/||;s|\.sql$||'
  exit 1
fi

PENDING_FILE="supabase/migrations/_pending_review/${MIGRATION_FILE}.sql"
if [[ ! -f "$PENDING_FILE" ]]; then
  echo "❌ Pending migration 不存在: $PENDING_FILE"
  exit 1
fi

if [[ -z "$SUPABASE_ACCESS_TOKEN" ]]; then
  echo "❌ SUPABASE_ACCESS_TOKEN 未設定"
  exit 1
fi

PROJECT_REF="${PROJECT_REF:-wzvwmawpkapcmkfmkvav}"

echo "========================================"
echo "⚙️  準備 apply pending migration"
echo "Migration: $MIGRATION_FILE"
echo "SQL 檔案:  $PENDING_FILE"
echo "Project:   $PROJECT_REF"
echo "========================================"
echo ""
echo "── SQL 內容 ──"
cat "$PENDING_FILE"
echo ""
echo "──────────────"
echo ""
read -p "確認執行? (輸入 yes 繼續): " confirm
if [[ "$confirm" != "yes" ]]; then
  echo "❌ 取消"
  exit 1
fi

SQL=$(cat "$PENDING_FILE")
JSON_PAYLOAD=$(python3 -c "import json,sys; print(json.dumps({'query': sys.stdin.read()}))" <<< "$SQL")

echo "執行中..."
RESULT=$(curl -s -w "\n%{http_code}" -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD")

HTTP_CODE=$(echo "$RESULT" | tail -n1)
BODY=$(echo "$RESULT" | sed '$d')

if [[ "$HTTP_CODE" != "201" && "$HTTP_CODE" != "200" ]] || echo "$BODY" | grep -q '"error"'; then
  echo "❌ Apply 失敗"
  echo "HTTP: $HTTP_CODE"
  echo "$BODY"
  exit 1
fi

echo "✅ Apply 成功"
echo "$BODY"

# 移到主目錄、表示已 apply
mv "$PENDING_FILE" "supabase/migrations/"
echo ""
echo "📁 檔案已移到 supabase/migrations/${MIGRATION_FILE}.sql"
echo "   記得 git add + commit"
