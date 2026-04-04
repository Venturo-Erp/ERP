#!/bin/bash
# 批次修復 Cron API 身份驗證

set -e

CRON_ROUTES=(
  "src/app/api/cron/auto-insurance/route.ts"
  "src/app/api/cron/process-tasks/route.ts"
  "src/app/api/cron/ticket-status/route.ts"
)

for route in "${CRON_ROUTES[@]}"; do
  if [ -f "$route" ]; then
    echo "✅ 修復: $route"
    
    # 如果還沒有 import cron-auth，加上
    if ! grep -q "validateCronAuth" "$route"; then
      # 在 import 區域加上
      sed -i '' "1a\\
import { validateCronAuth, unauthorizedResponse } from '@/lib/auth/cron-auth'\\
" "$route"
      
      echo "  → 已加上 import"
    fi
    
    # 如果有舊的驗證邏輯，替換掉
    if grep -q "CRON_SECRET" "$route"; then
      echo "  → 偵測到舊的驗證邏輯，需要手動檢查"
    fi
  else
    echo "❌ 檔案不存在: $route"
  fi
done

echo ""
echo "=========================================="
echo "⚠️  請手動檢查以下檔案並加上："
echo ""
echo "  const authResult = validateCronAuth(request)"
echo "  if (!authResult.success) {"
echo "    return unauthorizedResponse(authResult.error)"
echo "  }"
echo ""
echo "=========================================="
