#!/bin/bash
set -e

echo "🔧 修復所有剩餘的硬編碼..."

# 取得所有還有硬編碼的檔案
FILES=$(find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "角落旅行社\|Venturo Travel" 2>/dev/null | \
  grep -v "tenant.ts" | grep -v "COMPANY_NAME" | sort -u || true)

COUNT=0

for file in $FILES; do
  echo "📝 修改: $file"
  
  # 檢查檔案是否已有 import
  if ! grep -q "import.*COMPANY_NAME.*from.*@/lib/tenant" "$file" 2>/dev/null; then
    # 在第一個 import 後插入
    if grep -q "^import\|^'use client'" "$file"; then
      FIRST_IMPORT=$(grep -n "^import\|^'use client'" "$file" | head -1 | cut -d: -f1)
      sed -i "" "${FIRST_IMPORT}a\\
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'
" "$file"
    fi
  fi
  
  # 替換所有硬編碼
  sed -i "" "s/'角落旅行社'/{COMPANY_NAME}/g" "$file"
  sed -i "" "s/\"角落旅行社\"/{COMPANY_NAME}/g" "$file"
  sed -i "" "s/>角落旅行社</>角落旅行社</g" "$file"  # HTML
  sed -i "" "s/角落旅行社股份有限公司/{COMPANY_NAME}股份有限公司/g" "$file"
  sed -i "" "s/'Venturo Travel'/{COMPANY_NAME}/g" "$file"
  sed -i "" 's/"Venturo Travel"/{COMPANY_NAME}/g' "$file"
  sed -i "" "s/'Corner Travel'/{COMPANY_NAME_EN}/g" "$file"
  sed -i "" 's/"Corner Travel"/{COMPANY_NAME_EN}/g' "$file"
  
  ((COUNT++))
done

echo ""
echo "✅ 完成！修改了 $COUNT 個檔案"
echo ""
echo "請執行 git diff 檢查"
