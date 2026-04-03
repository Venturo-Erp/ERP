#!/bin/bash
# 測試 Messaging Webhook

set -e

# 顏色輸出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 測試 Messaging Webhook${NC}"
echo ""

# 1. 檢查環境變數
echo "📋 Step 1: 檢查環境變數"
if [ -z "$META_APP_SECRET" ]; then
  echo -e "${RED}❌ META_APP_SECRET 未設定${NC}"
  exit 1
fi

if [ -z "$META_VERIFY_TOKEN" ]; then
  echo -e "${RED}❌ META_VERIFY_TOKEN 未設定${NC}"
  exit 1
fi

if [ -z "$CLAUDE_API_KEY" ]; then
  echo -e "${RED}❌ CLAUDE_API_KEY 未設定${NC}"
  exit 1
fi

echo -e "${GREEN}✅ 環境變數檢查通過${NC}"
echo ""

# 2. 測試 Webhook 驗證（GET）
echo "📋 Step 2: 測試 Webhook 驗證"
BASE_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
VERIFY_URL="$BASE_URL/api/messaging/webhook?hub.mode=subscribe&hub.verify_token=$META_VERIFY_TOKEN&hub.challenge=test123"

RESPONSE=$(curl -s "$VERIFY_URL")
if [ "$RESPONSE" == "test123" ]; then
  echo -e "${GREEN}✅ Webhook 驗證成功${NC}"
else
  echo -e "${RED}❌ Webhook 驗證失敗：$RESPONSE${NC}"
  exit 1
fi
echo ""

# 3. 測試內部管理 API
echo "📋 Step 3: 測試內部管理 API"
if [ -z "$MESSAGING_ADMIN_API_KEY" ]; then
  echo -e "${YELLOW}⚠️  MESSAGING_ADMIN_API_KEY 未設定，跳過管理 API 測試${NC}"
else
  ADMIN_URL="$BASE_URL/api/messaging/admin/tenant"
  ADMIN_RESPONSE=$(curl -s -H "Authorization: Bearer $MESSAGING_ADMIN_API_KEY" "$ADMIN_URL")
  
  if echo "$ADMIN_RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✅ 管理 API 正常${NC}"
  else
    echo -e "${RED}❌ 管理 API 錯誤：$ADMIN_RESPONSE${NC}"
    exit 1
  fi
fi
echo ""

echo -e "${GREEN}🎉 所有測試通過！${NC}"
