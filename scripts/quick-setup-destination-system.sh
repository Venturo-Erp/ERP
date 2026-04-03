#!/bin/bash
# 快速部署景點選擇系統

echo "🚀 快速部署景點選擇系統..."

# 1. 檢查環境
echo ""
echo "1️⃣  檢查環境..."
if [ ! -f ".env.local" ]; then
  echo "❌ .env.local 不存在"
  exit 1
fi
echo "✅ 環境檢查通過"

# 2. 提示手動執行 SQL
echo ""
echo "2️⃣  請手動執行 SQL（Supabase 限制）"
echo "👉 https://supabase.com/dashboard/project/pfqvdacxowpgfamuvnsn/sql/new"
echo ""
echo "複製以下檔案內容並執行："
echo "   supabase/migrations/20260403000000_create_destination_selection.sql"
echo ""
read -p "✅ SQL 已執行？按 Enter 繼續..."

# 3. 匯入景點資料
echo ""
echo "3️⃣  匯入 50 個景點..."
node scripts/import-chiangmai-destinations.mjs

# 4. 測試系統
echo ""
echo "4️⃣  測試系統..."
node scripts/test-destination-system.mjs

# 5. 完成
echo ""
echo "✅ 景點系統部署完成！"
echo ""
echo "📝 下一步："
echo "   1. LINE 測試：傳送「我想去清邁」"
echo "   2. Git 提交："
echo "      git add ."
echo "      git commit -m 'feat: 清邁景點選擇系統'"
echo "      git push"
