#!/bin/bash

fix() {
  local file="$1"
  echo "修改: $file"
  
  # 確保有 import（檢查是否已存在）
  if ! grep -q "import.*COMPANY_NAME" "$file"; then
    # 在第一行 import 後加入
    if grep -q "^import" "$file"; then
      awk '/^import/ && !done { print; print "import { COMPANY_NAME, COMPANY_NAME_EN } from '\''@/lib/tenant'\''"; done=1; next } 1' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
    fi
  fi
  
  # 使用 perl 替換（更可靠）
  perl -pi -e "s/['\"](角落旅行社)['\"]/{\1}/g" "$file"
  perl -pi -e 's/>(角落旅行社)</>{\1}</g' "$file"
  perl -pi -e "s/'Venturo Travel'/{COMPANY_NAME}/g" "$file"
  perl -pi -e 's/"Venturo Travel"/{COMPANY_NAME}/g' "$file"
  perl -pi -e "s/`Venturo Travel/`{COMPANY_NAME}/g" "$file"
  perl -pi -e "s/'Corner Travel'/{COMPANY_NAME_EN}/g" "$file"
  perl -pi -e 's/"Corner Travel"/{COMPANY_NAME_EN}/g' "$file"
}

# 取得所有還有問題的檔案
for file in $(find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "['\">\`]角落旅行社\|Venturo Travel\|Corner Travel" 2>/dev/null | grep -v tenant.ts); do
  fix "$file"
done

echo "✅ 完成"
