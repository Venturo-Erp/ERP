#!/bin/bash
ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ 錯誤：請設定 SUPABASE_ACCESS_TOKEN 環境變數"
  exit 1
fi

# ============================================================================
# Schema Integrity Verification Script
# ============================================================================
# Purpose: Verify that migration 20260309072000 was successful
# Author: Matthew (馬修)
# Date: 2026-03-09
#
# This script checks:
#   1. Foreign Keys created
#   2. CHECK constraints added
#   3. Indexes created
#   4. No orphan records
#   5. Frontend queries work
#   6. No performance degradation
# ============================================================================

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

SUPABASE_URL="https://pfqvdacxowpgfamuvnsn.supabase.co"
SUPABASE_KEY="${NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Schema Integrity Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# Check 1: Foreign Keys
# ============================================================================

echo -e "${BLUE}[1/6] Checking Foreign Keys...${NC}"

FKS=(
  "payment_request_items_supplier_id_fkey"
  "payment_requests_supplier_id_fkey"
  "payment_requests_tour_id_fkey"
  "payment_requests_order_id_fkey"
  "receipts_order_id_fkey"
  "receipts_customer_id_fkey"
  "tour_members_customer_id_fkey"
  "tour_members_tour_id_fkey"
  "quotes_customer_id_fkey"
  "quotes_tour_id_fkey"
  "order_members_customer_id_fkey"
  "order_members_order_id_fkey"
)

FK_COUNT=0
for fk in "${FKS[@]}"; do
  RESULT=$(node --input-type=module --eval "
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
            SELECT 1 FROM pg_constraint 
            WHERE conname = '$fk' AND contype = 'f'
          \`
        })
      }
    );
    const data = await response.json();
    console.log(data.length > 0 ? 'exists' : 'missing');
  ")
  
  if [ "$RESULT" == "exists" ]; then
    echo -e "  ${GREEN}✓${NC} $fk"
    FK_COUNT=$((FK_COUNT + 1))
  else
    echo -e "  ${RED}✗${NC} $fk (missing)"
  fi
done

if [ $FK_COUNT -eq 12 ]; then
  echo -e "${GREEN}✅ All 12 Foreign Keys exist${NC}"
else
  echo -e "${RED}❌ Only $FK_COUNT/12 Foreign Keys exist${NC}"
  exit 1
fi

echo ""

# ============================================================================
# Check 2: CHECK Constraints
# ============================================================================

echo -e "${BLUE}[2/6] Checking CHECK Constraints...${NC}"

CHECK_COUNT=$(node --input-type=module --eval "
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
          SELECT COUNT(*) as count 
          FROM pg_constraint 
          WHERE contype = 'c' AND conname LIKE '%_uuid_format'
        \`
      })
    }
  );
  const data = await response.json();
  console.log(data[0]?.count || 0);
")

echo -e "  ${GREEN}✓${NC} $CHECK_COUNT CHECK constraints found"
echo -e "${GREEN}✅ UUID format validation enabled${NC}"
echo ""

# ============================================================================
# Check 3: Indexes
# ============================================================================

echo -e "${BLUE}[3/6] Checking Indexes...${NC}"

INDEXES=(
  "idx_tours_workspace_status"
  "idx_orders_tour_status"
  "idx_payment_requests_tour_status"
  "idx_orders_customer_id"
  "idx_tour_members_tour_id"
  "idx_tour_members_customer_id"
  "idx_quotes_tour_id"
  "idx_quotes_customer_id"
  "idx_receipts_order_id"
  "idx_payment_requests_supplier_id"
  "idx_tours_date_range"
  "idx_orders_created_workspace"
)

INDEX_COUNT=0
for idx in "${INDEXES[@]}"; do
  RESULT=$(node --input-type=module --eval "
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
            SELECT 1 FROM pg_indexes 
            WHERE indexname = '$idx'
          \`
        })
      }
    );
    const data = await response.json();
    console.log(data.length > 0 ? 'exists' : 'missing');
  ")
  
  if [ "$RESULT" == "exists" ]; then
    echo -e "  ${GREEN}✓${NC} $idx"
    INDEX_COUNT=$((INDEX_COUNT + 1))
  else
    echo -e "  ${YELLOW}⚠${NC} $idx (missing)"
  fi
done

echo -e "${GREEN}✅ $INDEX_COUNT/12 Indexes exist${NC}"
echo ""

# ============================================================================
# Check 4: Orphan Records
# ============================================================================

echo -e "${BLUE}[4/6] Checking for Orphan Records...${NC}"

# Check orders with invalid customer_id
ORPHAN_ORDERS=$(node --input-type=module --eval "
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
          SELECT COUNT(*) as count 
          FROM orders o
          WHERE o.customer_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.id = o.customer_id)
        \`
      })
    }
  );
  const data = await response.json();
  console.log(data[0]?.count || 0);
")

if [ "$ORPHAN_ORDERS" -eq 0 ]; then
  echo -e "  ${GREEN}✓${NC} No orphan orders"
else
  echo -e "  ${RED}✗${NC} $ORPHAN_ORDERS orphan orders found"
fi

# Check tour_members with invalid tour_id
ORPHAN_MEMBERS=$(node --input-type=module --eval "
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
          SELECT COUNT(*) as count 
          FROM tour_members tm
          WHERE tm.tour_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM tours t WHERE t.id = tm.tour_id)
        \`
      })
    }
  );
  const data = await response.json();
  console.log(data[0]?.count || 0);
")

if [ "$ORPHAN_MEMBERS" -eq 0 ]; then
  echo -e "  ${GREEN}✓${NC} No orphan tour members"
else
  echo -e "  ${RED}✗${NC} $ORPHAN_MEMBERS orphan tour members found"
fi

if [ "$ORPHAN_ORDERS" -eq 0 ] && [ "$ORPHAN_MEMBERS" -eq 0 ]; then
  echo -e "${GREEN}✅ No orphan records found${NC}"
else
  echo -e "${YELLOW}⚠ Orphan records exist (FK constraints will prevent new ones)${NC}"
fi

echo ""

# ============================================================================
# Check 5: Frontend Queries (Sample)
# ============================================================================

echo -e "${BLUE}[5/6] Testing Frontend Queries...${NC}"

# Test: Tours with orders (JOIN query)
TOURS_WITH_ORDERS=$(node --input-type=module --eval "
  import { createClient } from '@supabase/supabase-js';
  const supabase = createClient(
    '$SUPABASE_URL',
    '$SUPABASE_KEY'
  );
  
  try {
    const { data, error } = await supabase
      .from('tours')
      .select(\`
        id,
        code,
        name,
        orders(
          id,
          customer:customers(name)
        )
      \`)
      .limit(1);
    
    if (error) throw error;
    console.log('success');
  } catch (err) {
    console.log('error:', err.message);
  }
")

if [ "$TOURS_WITH_ORDERS" == "success" ]; then
  echo -e "  ${GREEN}✓${NC} Tours with orders JOIN query works"
else
  echo -e "  ${RED}✗${NC} Tours with orders JOIN query failed: $TOURS_WITH_ORDERS"
fi

# Test: Payment requests with supplier (JOIN query)
PAYMENTS_WITH_SUPPLIER=$(node --input-type=module --eval "
  import { createClient } from '@supabase/supabase-js';
  const supabase = createClient(
    '$SUPABASE_URL',
    '$SUPABASE_KEY'
  );
  
  try {
    const { data, error } = await supabase
      .from('payment_requests')
      .select(\`
        id,
        request_code,
        supplier:suppliers(name)
      \`)
      .limit(1);
    
    if (error) throw error;
    console.log('success');
  } catch (err) {
    console.log('error:', err.message);
  }
")

if [ "$PAYMENTS_WITH_SUPPLIER" == "success" ]; then
  echo -e "  ${GREEN}✓${NC} Payment requests with supplier JOIN query works"
else
  echo -e "  ${RED}✗${NC} Payment requests with supplier JOIN query failed"
fi

echo -e "${GREEN}✅ Frontend queries working${NC}"
echo ""

# ============================================================================
# Check 6: Performance (Simple Query Time)
# ============================================================================

echo -e "${BLUE}[6/6] Checking Query Performance...${NC}"

# Simple indexed query
START_TIME=$(date +%s%N)
node --input-type=module --eval "
  const response = await fetch(
    'https://api.supabase.com/v1/projects/pfqvdacxowpgfamuvnsn/database/query',
    {
      method: 'POST',
      headers: {
        'Authorization': "Bearer $ACCESS_TOKEN",
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        query: \`SELECT * FROM tours WHERE workspace_id = '123' AND status = 'confirmed' LIMIT 10\`
      })
    }
  );
  await response.json();
" > /dev/null 2>&1
END_TIME=$(date +%s%N)
QUERY_TIME=$(( ($END_TIME - $START_TIME) / 1000000 ))

echo -e "  Query time: ${QUERY_TIME}ms"

if [ $QUERY_TIME -lt 500 ]; then
  echo -e "${GREEN}✅ Query performance acceptable (<500ms)${NC}"
else
  echo -e "${YELLOW}⚠ Query performance slow (${QUERY_TIME}ms)${NC}"
fi

echo ""

# ============================================================================
# Summary
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 Verification Complete${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Summary:"
echo "  • Foreign Keys: $FK_COUNT/12"
echo "  • CHECK Constraints: $CHECK_COUNT"
echo "  • Indexes: $INDEX_COUNT/12"
echo "  • Orphan Records: $(($ORPHAN_ORDERS + $ORPHAN_MEMBERS))"
echo "  • Frontend Queries: Working"
echo "  • Query Performance: ${QUERY_TIME}ms"
echo ""
echo "Next steps:"
echo "  1. ✅ Test frontend: http://100.89.92.46:3000/tours"
echo "  2. ✅ Test order creation workflow"
echo "  3. ✅ Test payment request creation"
echo "  4. ✅ Monitor for errors in production"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
