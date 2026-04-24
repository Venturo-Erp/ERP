#!/bin/bash
# db-rollback.sh — 執行指定 migration 的 ROLLBACK SQL
#
# 用法:
#   ./scripts/db-rollback.sh <migration_filename>
#
# 範例:
#   ./scripts/db-rollback.sh 20260424070000_unify_receipts_status_encoding
#
# 需要 env:
#   SUPABASE_ACCESS_TOKEN  (從 reference_supabase_api.md 取得)
#   PROJECT_REF            (預設 wzvwmawpkapcmkfmkvav)
#
# 會做什麼:
#   1. 找對應 supabase/migrations/_archive/<filename>.ROLLBACK.sql
#   2. 顯示 SQL 內容、要求 confirm
#   3. 透過 Supabase Management API 執行
#
# 紅線: 這是 production DB、執行前務必確認 SQL 正確

set -e

MIGRATION_FILE="$1"
if [[ -z "$MIGRATION_FILE" ]]; then
  echo "Usage: $0 <migration_filename>"
  echo ""
  echo "可用的 rollback 檔案:"
  ls -1 supabase/migrations/_archive/*.ROLLBACK.sql 2>/dev/null | sed 's|.*/||;s|\.ROLLBACK\.sql$||' | head -20
  exit 1
fi

ROLLBACK_FILE="supabase/migrations/_archive/${MIGRATION_FILE}.ROLLBACK.sql"
if [[ ! -f "$ROLLBACK_FILE" ]]; then
  echo "❌ Rollback file not found: $ROLLBACK_FILE"
  exit 1
fi

if [[ -z "$SUPABASE_ACCESS_TOKEN" ]]; then
  echo "❌ SUPABASE_ACCESS_TOKEN 未設定"
  echo "   export SUPABASE_ACCESS_TOKEN=<token>"
  exit 1
fi

PROJECT_REF="${PROJECT_REF:-wzvwmawpkapcmkfmkvav}"

echo "========================================"
echo "🔄 準備 rollback"
echo "Migration: $MIGRATION_FILE"
echo "SQL 檔案:  $ROLLBACK_FILE"
echo "Project:   $PROJECT_REF"
echo "========================================"
echo ""
echo "── SQL 內容 ──"
cat "$ROLLBACK_FILE"
echo ""
echo "──────────────"
echo ""
read -p "確認執行? (輸入 yes 繼續): " confirm
if [[ "$confirm" != "yes" ]]; then
  echo "❌ 取消"
  exit 1
fi

SQL=$(cat "$ROLLBACK_FILE")
JSON_PAYLOAD=$(python3 -c "import json,sys; print(json.dumps({'query': sys.stdin.read()}))" <<< "$SQL")

echo "執行中..."
RESULT=$(curl -s -w "\n%{http_code}" -X POST \
  "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD")

HTTP_CODE=$(echo "$RESULT" | tail -n1)
BODY=$(echo "$RESULT" | sed '$d')

if [[ "$HTTP_CODE" != "201" && "$HTTP_CODE" != "200" ]]; then
  echo "❌ Rollback 失敗 (HTTP $HTTP_CODE)"
  echo "$BODY"
  exit 1
fi

if echo "$BODY" | grep -q '"error"'; then
  echo "❌ Rollback SQL 錯誤"
  echo "$BODY"
  exit 1
fi

echo "✅ Rollback 成功"
echo "$BODY"
