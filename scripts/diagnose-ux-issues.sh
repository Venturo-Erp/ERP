#!/bin/bash
ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ 錯誤：請設定 SUPABASE_ACCESS_TOKEN 環境變數"
  exit 1
fi

# ============================================================================
# UX Issues Diagnosis - 使用者體驗問題診斷
# ============================================================================
# Purpose: 快速診斷「按鈕不見、無法存檔」等問題
# Usage: ./scripts/diagnose-ux-issues.sh
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SUPABASE_URL="https://pfqvdacxowpgfamuvnsn.supabase.co"
SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwODMyMCwiZXhwIjoyMDc0Njg0MzIwfQ.kbJbdYHtOWudBGzV3Jv5OWzWQQZT4aBFFgfUczaVdIE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔍 UX Issues Diagnosis - 使用者體驗問題診斷"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# 1. 檢查 RLS 政策是否正確
# ============================================================================

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}1. RLS 政策檢查${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

RLS_CHECK=$(node --input-type=module --eval "
const response = await fetch(
  'https://api.supabase.com/v1/projects/pfqvdacxowpgfamuvnsn/database/query',
  {
    method: 'POST',
    headers: {
      'Authorization': "Bearer $ACCESS_TOKEN",
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      query: \`
        -- 檢查核心表的 RLS 政策
        SELECT 
          tablename,
          COUNT(*) as policy_count,
          STRING_AGG(policyname, ', ') as policies
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('tours', 'orders', 'customers', 'suppliers', 'quotes', 'payment_requests', 'receipts')
        GROUP BY tablename
        ORDER BY tablename;
      \`
    })
  }
);

const data = await response.json();
console.log('核心表的 RLS 政策:');
console.log('');
data.forEach(row => {
  console.log(\`  \${row.tablename}:\`);
  console.log(\`    政策數: \${row.policy_count}\`);
  console.log(\`    政策名: \${row.policies}\`);
  console.log('');
});

// 檢查是否有表沒有 RLS
const tablesWithoutRLS = ['tours', 'orders', 'customers', 'suppliers', 'quotes', 'payment_requests', 'receipts']
  .filter(table => !data.some(row => row.tablename === table));

if (tablesWithoutRLS.length > 0) {
  console.log('⚠️  以下表沒有 RLS 政策:');
  tablesWithoutRLS.forEach(table => console.log(\`    - \${table}\`));
} else {
  console.log('✅ 所有核心表都有 RLS 政策');
}
")

echo "$RLS_CHECK"

# ============================================================================
# 2. 檢查 NOT NULL 約束
# ============================================================================

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}2. NOT NULL 約束檢查${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

NOT_NULL_CHECK=$(node --input-type=module --eval "
const response = await fetch(
  'https://api.supabase.com/v1/projects/pfqvdacxowpgfamuvnsn/database/query',
  {
    method: 'POST',
    headers: {
      'Authorization': "Bearer $ACCESS_TOKEN",
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      query: \`
        -- 檢查核心欄位是否有 NOT NULL
        SELECT 
          table_name,
          column_name,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('tours', 'orders', 'customers', 'suppliers', 'quotes')
          AND column_name IN ('workspace_id', 'created_at', 'updated_at', 'status')
        ORDER BY table_name, column_name;
      \`
    })
  }
);

const data = await response.json();
const nullableFields = data.filter(row => row.is_nullable === 'YES');

if (nullableFields.length > 0) {
  console.log('⚠️  以下核心欄位可以是 NULL（可能導致問題）:');
  console.log('');
  nullableFields.forEach(row => {
    console.log(\`  \${row.table_name}.\${row.column_name}\`);
  });
} else {
  console.log('✅ 所有核心欄位都有 NOT NULL 約束');
}
")

echo "$NOT_NULL_CHECK"

# ============================================================================
# 3. 檢查 FK 約束
# ============================================================================

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}3. Foreign Key 約束檢查${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

FK_CHECK=$(node --input-type=module --eval "
const response = await fetch(
  'https://api.supabase.com/v1/projects/pfqvdacxowpgfamuvnsn/database/query',
  {
    method: 'POST',
    headers: {
      'Authorization': "Bearer $ACCESS_TOKEN",
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      query: \`
        -- 檢查核心表的 FK
        SELECT 
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table,
          ccu.column_name AS foreign_column
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name IN ('tours', 'orders', 'payment_requests', 'receipts', 'tour_members', 'order_members')
        ORDER BY tc.table_name, kcu.column_name;
      \`
    })
  }
);

const data = await response.json();
console.log('核心表的 Foreign Keys:');
console.log('');

const byTable = data.reduce((acc, row) => {
  if (!acc[row.table_name]) acc[row.table_name] = [];
  acc[row.table_name].push(\`\${row.column_name} → \${row.foreign_table}.\${row.foreign_column}\`);
  return acc;
}, {});

Object.entries(byTable).forEach(([table, fks]) => {
  console.log(\`  \${table} (\${fks.length} FKs):\`);
  fks.forEach(fk => console.log(\`    - \${fk}\`));
  console.log('');
});

console.log(\`總計: \${data.length} 個 Foreign Keys\`);
")

echo "$FK_CHECK"

# ============================================================================
# 4. 檢查最近的錯誤（模擬）
# ============================================================================

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}4. 前端錯誤日誌（需要在瀏覽器執行）${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "  請在瀏覽器 Console 執行以下指令:"
echo ""
echo -e "${YELLOW}  errorTracker.generateReport()${NC}"
echo ""
echo "  這會顯示:"
echo "  - 總錯誤數"
echo "  - 按類型分類（按鈕問題、存檔失敗、RLS 錯誤）"
echo "  - 按頁面分類"
echo "  - 最近的錯誤"
echo ""

# ============================================================================
# 5. 生成診斷報告
# ============================================================================

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}5. 診斷總結${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "✅ 完成項目:"
echo "  - RLS 政策檢查"
echo "  - NOT NULL 約束檢查"
echo "  - Foreign Key 約束檢查"
echo ""
echo "⏳ 待執行項目:"
echo "  - 前端錯誤日誌檢查（需在瀏覽器執行）"
echo "  - 使用者回報問題追蹤"
echo ""
echo "📝 建議下一步:"
echo "  1. 在關鍵頁面加入 Error Tracker"
echo "  2. 使用 1-2 天收集錯誤日誌"
echo "  3. 分析日誌找出最常見問題"
echo "  4. 修復問題並驗證"
echo ""
echo "📖 詳細文檔:"
echo "  - docs/UX_HEALTH_CHECK.md"
echo "  - src/lib/monitoring/usage-examples.md"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 診斷完成！${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
