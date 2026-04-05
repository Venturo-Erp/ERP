#!/bin/bash
# 使用 Supabase CLI 檢查 RLS policies

set -e

TABLES=(
  "workspace_job_roles"
  "employees"
  "role_tab_permissions"
  "workspace_tasks"
)

echo "# RLS Policies 檢查"
echo ""
echo "檢測時間：$(date '+%Y-%m-%d %H:%M:%S')"
echo ""

for table in "${TABLES[@]}"; do
  echo "## $table"
  echo ""
  
  # 檢查表結構
  echo "### Schema"
  echo '```sql'
  psql "$DATABASE_URL" -c "\d $table" 2>/dev/null || echo "（無法查詢 schema）"
  echo '```'
  echo ""
  
  # 檢查 RLS 狀態
  echo "### RLS Status"
  echo '```sql'
  psql "$DATABASE_URL" -c "SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = '$table';" 2>/dev/null || echo "（無法查詢）"
  echo '```'
  echo ""
  
  # 檢查 policies
  echo "### Policies"
  echo '```sql'
  psql "$DATABASE_URL" -c "SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = '$table';" 2>/dev/null || echo "（無法查詢）"
  echo '```'
  echo ""
  echo "---"
  echo ""
done
