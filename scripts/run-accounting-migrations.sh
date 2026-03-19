#!/bin/bash

# 執行會計模組 Migrations
# 使用 Supabase Database API

set -e  # 遇到錯誤立即停止

# 載入環境變數
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ 缺少 SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

PROJECT_REF="pfqvdacxowpgfamuvnsn"
API_URL="https://api.supabase.com/v1/projects/$PROJECT_REF/database/query"

echo "🚀 開始執行會計模組 Migrations..."
echo

# Migration 檔案列表
migrations=(
  "supabase/migrations/20251216130000_create_accounting_module.sql"
  "supabase/migrations/20260111000011_create_accounting_period_closings.sql"
  "supabase/migrations/20260319000000_create_checks_management.sql"
  "supabase/migrations/20260319100000_add_accounting_voucher_links.sql"
  "supabase/migrations/20260319120000_add_equity_account_type.sql"
)

success=0
fail=0

for migration in "${migrations[@]}"; do
  filename=$(basename "$migration")
  echo "📄 執行: $filename"
  
  if [ ! -f "$migration" ]; then
    echo "❌ 檔案不存在: $migration"
    ((fail++))
    continue
  fi
  
  # 讀取 SQL 檔案
  sql=$(cat "$migration")
  
  # 呼叫 Supabase API
  response=$(curl -s -X POST "$API_URL" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(echo "$sql" | jq -Rs .)}")
  
  # 檢查回應
  if echo "$response" | jq -e '.error' > /dev/null 2>&1; then
    error_msg=$(echo "$response" | jq -r '.error.message')
    echo "❌ $filename 執行失敗: $error_msg"
    ((fail++))
  else
    echo "✅ $filename 執行成功"
    ((success++))
  fi
  
  echo
done

echo "📊 執行完成: $success 成功, $fail 失敗"

if [ $fail -gt 0 ]; then
  echo
  echo "⚠️  有些 migration 執行失敗。"
  echo "建議：請到 Supabase Dashboard 檢查錯誤訊息。"
  echo "URL: https://supabase.com/dashboard/project/$PROJECT_REF/logs"
  exit 1
fi
