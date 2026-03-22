#!/bin/bash
# 批量修改所有硬編碼的公司名稱

set -e  # 遇到錯誤立即停止

echo "🔧 開始批量修復..."
echo ""

# 記錄已修改的檔案
FIXED_COUNT=0
SKIPPED_COUNT=0

# 修改函數
fix_file() {
  local file="$1"
  local desc="$2"
  
  echo "📝 修改: $file"
  echo "   說明: $desc"
  
  # 檢查檔案是否已經 import COMPANY_NAME
  if grep -q "import.*COMPANY_NAME.*from.*@/lib/tenant" "$file" 2>/dev/null; then
    echo "   ✅ 已有 import，跳過"
    ((SKIPPED_COUNT++))
    return
  fi
  
  # 1. 在檔案開頭加入 import（找到第一個 import 後插入）
  if grep -q "^import" "$file"; then
    # 找到第一個 import 的行號
    FIRST_IMPORT=$(grep -n "^import" "$file" | head -1 | cut -d: -f1)
    # 在該行之後插入
    sed -i "" "${FIRST_IMPORT}a\\
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'
" "$file"
  fi
  
  # 2. 替換硬編碼的文字
  sed -i "" "s/角落旅行社備註/{COMPANY_NAME}備註/g" "$file"
  sed -i "" "s/本報價單由角落旅行社提供/本報價單由{COMPANY_NAME}提供/g" "$file"
  sed -i "" "s/本行程表由角落旅行社提供/本行程表由{COMPANY_NAME}提供/g" "$file"
  sed -i "" "s/本行程表由 角落旅行社 提供/本行程表由 {COMPANY_NAME} 提供/g" "$file"
  
  # 檢查是否真的有修改
  if git diff --quiet "$file" 2>/dev/null; then
    echo "   ⚠️  沒有實際修改"
  else
    echo "   ✅ 完成"
    ((FIXED_COUNT++))
  fi
  
  echo ""
}

# 修改 public 頁面
cd ~/Projects/venturo-erp

fix_file "src/app/public/accommodation-quote/[tourId]/[requestId]/page.tsx" "住宿報價頁面"
fix_file "src/app/public/activity-quote/[tourId]/[requestId]/page.tsx" "活動報價頁面"  
fix_file "src/app/public/itinerary/[tourId]/page.tsx" "行程表頁面"
fix_file "src/app/public/request/[token]/page.tsx" "需求單頁面"

echo "========================================"
echo "✅ 批量修復完成！"
echo ""
echo "📊 統計："
echo "   已修改：$FIXED_COUNT 個檔案"
echo "   已跳過：$SKIPPED_COUNT 個檔案"
echo ""
echo "⚠️  剩餘需要手動處理的檔案："
echo "   - features/* (功能模組)"
echo "   - designer/* (設計模板)"  
echo "   - api/* (API routes - 可能只是註解)"
echo "   - labels.ts (placeholder 文字)"
echo ""
echo "請執行 git diff 檢查修改內容"
