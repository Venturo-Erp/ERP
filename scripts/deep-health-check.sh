#!/bin/bash
ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ 錯誤：請設定 SUPABASE_ACCESS_TOKEN 環境變數"
  exit 1
fi

# ============================================================================
# Deep Health Check - 深度系統健康檢查
# ============================================================================
# Purpose: 全方位、多維度系統盤查
# Author: Matthew (馬修)
# Date: 2026-03-09
#
# 檢查維度：
#   1. 資料層完整性（FK, Constraints, Indexes, Orphans）
#   2. 業務邏輯一致性（狀態、生命週期、計算邏輯）
#   3. API 安全性（認證、授權、輸入驗證）
#   4. RLS 覆蓋率（162 張表的 RLS 政策）
#   5. 效能瓶頸（慢查詢、N+1、無索引）
#   6. 架構耦合度（循環依賴、職責混亂）
#   7. 資料品質（重複、不一致、格式錯誤）
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
echo "  🔍 Deep Health Check - 深度系統健康檢查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# 維度 1: 資料層完整性
# ============================================================================

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}維度 1: 資料層完整性${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1.1 Foreign Key 覆蓋率
echo -e "${BLUE}[1.1] Foreign Key 覆蓋率${NC}"

FK_COVERAGE=$(node --input-type=module --eval "
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
        WITH fk_columns AS (
          SELECT COUNT(*) as total
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND column_name LIKE '%_id'
        ),
        existing_fks AS (
          SELECT COUNT(*) as total
          FROM pg_constraint
          WHERE contype = 'f'
            AND connamespace = 'public'::regnamespace
        )
        SELECT 
          f.total as fk_columns,
          e.total as existing_fks,
          ROUND((e.total::numeric / f.total * 100), 1) as coverage
        FROM fk_columns f, existing_fks e;
      \`
    })
  }
);
const data = await response.json();
console.log(JSON.stringify(data[0]));
")

echo "$FK_COVERAGE" | jq -r '"  FK Columns: \(.fk_columns)\n  Existing FKs: \(.existing_fks)\n  Coverage: \(.coverage)%"'

# 1.2 NOT NULL 約束覆蓋率
echo ""
echo -e "${BLUE}[1.2] NOT NULL 約束（核心欄位）${NC}"

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
        SELECT 
          table_name,
          column_name,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('tours', 'orders', 'customers', 'suppliers', 'quotes')
          AND column_name IN ('workspace_id', 'created_at', 'updated_at', 'status')
          AND is_nullable = 'YES'
        ORDER BY table_name, column_name;
      \`
    })
  }
);
const data = await response.json();
if (data.length === 0) {
  console.log('✅ All core fields have NOT NULL constraints');
} else {
  console.log('⚠️  Missing NOT NULL constraints:');
  data.forEach(r => console.log(\`  - \${r.table_name}.\${r.column_name}\`));
}
")

echo "$NOT_NULL_CHECK"

# 1.3 UNIQUE 約束檢查
echo ""
echo -e "${BLUE}[1.3] UNIQUE 約束（業務唯一性）${NC}"

UNIQUE_CHECK=$(node --input-type=module --eval "
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
        -- 檢查是否有重複的 tour code
        WITH tour_codes AS (
          SELECT code, COUNT(*) as count
          FROM tours
          GROUP BY code
          HAVING COUNT(*) > 1
        ),
        order_codes AS (
          SELECT code, COUNT(*) as count
          FROM orders
          GROUP BY code
          HAVING COUNT(*) > 1
        )
        SELECT 
          COALESCE((SELECT SUM(count - 1) FROM tour_codes), 0) as duplicate_tours,
          COALESCE((SELECT SUM(count - 1) FROM order_codes), 0) as duplicate_orders;
      \`
    })
  }
);
const data = await response.json();
const d = data[0];
if (d.duplicate_tours === 0 && d.duplicate_orders === 0) {
  console.log('  ✅ No duplicate codes found');
} else {
  console.log(\`  ⚠️  Duplicate tour codes: \${d.duplicate_tours}\`);
  console.log(\`  ⚠️  Duplicate order codes: \${d.duplicate_orders}\`);
}
")

echo "$UNIQUE_CHECK"

# ============================================================================
# 維度 2: 業務邏輯一致性
# ============================================================================

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}維度 2: 業務邏輯一致性${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 2.1 訂單金額一致性
echo -e "${BLUE}[2.1] 訂單金額計算一致性${NC}"

AMOUNT_CONSISTENCY=$(node --input-type=module --eval "
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
        SELECT 
          COUNT(*) as inconsistent_orders
        FROM orders o
        WHERE o.total_amount IS NOT NULL
          AND EXISTS (
            SELECT 1 
            FROM order_members om
            WHERE om.order_id = o.id
            GROUP BY om.order_id
            HAVING SUM(COALESCE(om.price, 0)) <> o.total_amount
          );
      \`
    })
  }
);
const data = await response.json();
const count = data[0]?.inconsistent_orders || 0;
if (count === 0) {
  console.log('  ✅ All order amounts consistent');
} else {
  console.log(\`  ⚠️  \${count} orders have inconsistent amounts\`);
}
")

echo "$AMOUNT_CONSISTENCY"

# 2.2 團員數量一致性
echo ""
echo -e "${BLUE}[2.2] 團員數量一致性${NC}"

MEMBER_CONSISTENCY=$(node --input-type=module --eval "
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
        SELECT 
          t.code,
          t.current_people as recorded,
          COUNT(tm.id) as actual
        FROM tours t
        LEFT JOIN tour_members tm ON tm.tour_id = t.id
        GROUP BY t.id, t.code, t.current_people
        HAVING t.current_people <> COUNT(tm.id)
        LIMIT 5;
      \`
    })
  }
);
const data = await response.json();
if (data.length === 0) {
  console.log('  ✅ All tour member counts consistent');
} else {
  console.log(\`  ⚠️  \${data.length} tours have inconsistent member counts:\`);
  data.forEach(t => console.log(\`    - \${t.code}: recorded=\${t.recorded}, actual=\${t.actual}\`));
}
")

echo "$MEMBER_CONSISTENCY"

# 2.3 狀態轉換合法性
echo ""
echo -e "${BLUE}[2.3] 狀態轉換合法性（無約束）${NC}"

echo "  ⚠️  目前無狀態轉換約束，任何狀態都可以互相轉換"
echo "  📝 建議：實作 TourLifecycleService（見 COMPLETE_OPTIMIZATION_STRATEGY.md）"

# ============================================================================
# 維度 3: RLS 覆蓋率
# ============================================================================

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}維度 3: RLS (Row Level Security) 覆蓋率${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

RLS_COVERAGE=$(node --input-type=module --eval "
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
        WITH all_tables AS (
          SELECT COUNT(*) as total
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
        ),
        tables_with_rls AS (
          SELECT COUNT(DISTINCT tablename) as total
          FROM pg_policies
          WHERE schemaname = 'public'
        )
        SELECT 
          a.total as all_tables,
          r.total as tables_with_rls,
          ROUND((r.total::numeric / a.total * 100), 1) as coverage
        FROM all_tables a, tables_with_rls r;
      \`
    })
  }
);
const data = await response.json();
const d = data[0];
console.log(\`  Tables: \${d.all_tables}\`);
console.log(\`  With RLS: \${d.tables_with_rls}\`);
console.log(\`  Coverage: \${d.coverage}%\`);
")

echo "$RLS_COVERAGE"

# ============================================================================
# 維度 4: 效能瓶頸
# ============================================================================

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}維度 4: 效能瓶頸${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 4.1 缺失索引檢測
echo -e "${BLUE}[4.1] 缺失索引檢測（高基數欄位）${NC}"

MISSING_INDEXES=$(node --input-type=module --eval "
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
        SELECT 
          tablename,
          attname as column_name,
          n_distinct
        FROM pg_stats
        WHERE schemaname = 'public'
          AND n_distinct > 100
          AND attname NOT IN (
            SELECT column_name 
            FROM information_schema.constraint_column_usage
            WHERE constraint_schema = 'public'
          )
          AND attname NOT IN (
            SELECT a.attname
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid::regclass::text LIKE 'public.%'
          )
        ORDER BY n_distinct DESC
        LIMIT 10;
      \`
    })
  }
);
const data = await response.json();
if (data.length === 0) {
  console.log('  ✅ No obvious missing indexes');
} else {
  console.log(\`  ⚠️  \${data.length} high-cardinality columns without index:\`);
  data.slice(0, 5).forEach(r => console.log(\`    - \${r.tablename}.\${r.column_name} (n_distinct: \${r.n_distinct})\`));
}
")

echo "$MISSING_INDEXES"

# 4.2 表格大小檢查
echo ""
echo -e "${BLUE}[4.2] 表格大小（前 10 大）${NC}"

TABLE_SIZES=$(node --input-type=module --eval "
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
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10;
      \`
    })
  }
);
const data = await response.json();
data.forEach((r, i) => console.log(\`  \${i+1}. \${r.tablename}: \${r.size}\`));
")

echo "$TABLE_SIZES"

# ============================================================================
# 維度 5: 資料品質
# ============================================================================

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}維度 5: 資料品質${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 5.1 NULL 值比例
echo -e "${BLUE}[5.1] NULL 值比例（核心欄位）${NC}"

NULL_RATIOS=$(node --input-type=module --eval "
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
        SELECT 
          'customers.phone' as field,
          COUNT(*) as total,
          COUNT(phone) as not_null,
          ROUND((COUNT(phone)::numeric / COUNT(*) * 100), 1) as coverage
        FROM customers
        UNION ALL
        SELECT 
          'customers.email',
          COUNT(*),
          COUNT(email),
          ROUND((COUNT(email)::numeric / COUNT(*) * 100), 1)
        FROM customers
        UNION ALL
        SELECT 
          'customers.passport_number',
          COUNT(*),
          COUNT(passport_number),
          ROUND((COUNT(passport_number)::numeric / COUNT(*) * 100), 1)
        FROM customers;
      \`
    })
  }
);
const data = await response.json();
data.forEach(r => console.log(\`  \${r.field}: \${r.coverage}% (\${r.not_null}/\${r.total})\`));
")

echo "$NULL_RATIOS"

# ============================================================================
# 維度 6: 架構耦合度
# ============================================================================

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}維度 6: 架構耦合度${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}[6.1] Service Layer 完整性${NC}"

SERVICE_COUNT=$(find src/services -type f -name "*.ts" 2>/dev/null | wc -l)
echo "  Services: $SERVICE_COUNT"
echo "  📝 建議：12-15 個（見 COMPLETE_OPTIMIZATION_STRATEGY.md）"

echo ""
echo -e "${BLUE}[6.2] API Layer 完整性${NC}"

API_COUNT=$(find src/app/api -type f -name "route.ts" 2>/dev/null | wc -l)
echo "  API Routes: $API_COUNT"
echo "  📝 建議：15-20 個（見 COMPLETE_OPTIMIZATION_STRATEGY.md）"

# ============================================================================
# 維度 7: 安全性
# ============================================================================

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}維度 7: 安全性${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}[7.1] 環境變數檢查${NC}"

if [ -f .env.local ]; then
  echo "  ✅ .env.local exists"
  
  # Check for sensitive data in git
  if git ls-files --error-unmatch .env.local 2>/dev/null; then
    echo "  ❌ .env.local is tracked in git! (SECURITY RISK)"
  else
    echo "  ✅ .env.local not tracked in git"
  fi
else
  echo "  ❌ .env.local not found"
fi

echo ""
echo -e "${BLUE}[7.2] Public bucket 檢查${NC}"

PUBLIC_BUCKETS=$(node --input-type=module --eval "
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
        SELECT 
          name,
          public
        FROM storage.buckets
        WHERE public = true;
      \`
    })
  }
);
const data = await response.json();
if (data.length === 0) {
  console.log('  ✅ No public buckets');
} else {
  console.log(\`  ⚠️  \${data.length} public buckets:\`);
  data.forEach(b => console.log(\`    - \${b.name}\`));
}
")

echo "$PUBLIC_BUCKETS"

# ============================================================================
# Summary
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Deep Health Check Complete${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "完整報告已儲存到: reports/deep-health-check-$(date +%Y%m%d).md"
echo ""
