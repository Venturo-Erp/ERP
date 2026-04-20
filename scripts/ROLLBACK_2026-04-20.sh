#!/bin/bash
# ================================================================
# 明天上線 Rollback 腳本
# ================================================================
# 用途：立鎧 deploy 後如果 production 爆、10 秒回到 4/19 狀態
# ================================================================

set -e

REPO_DIR="/Users/williamchien/Projects/venturo-erp"
SUPABASE_PROJECT="wzvwmawpkapcmkfmkvav"
SUPABASE_TOKEN="sbp_953b2a869c635989a2eef60aebf0dbe35b34d7aa"

echo "==========================================="
echo "🚨 Venturo Production Rollback"
echo "==========================================="
echo ""
echo "這會做 2 件事："
echo "  1. Git revert 最新 commit、觸發 Vercel 回滾"
echo "  2. （可選）rollback 3 個 P0 migration（預設不做、需手動確認）"
echo ""
read -p "確定繼續？ (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "取消"
  exit 0
fi

echo ""
echo "--- Step 1: Git revert ---"
cd "$REPO_DIR"
echo "目前 HEAD: $(git rev-parse --short HEAD)"
echo "上一版: $(git rev-parse --short HEAD~1)"
git revert HEAD --no-edit
git push origin main
echo "✅ Code rollback 完成、Vercel 3 分內會 deploy 上一版"

echo ""
echo "--- Step 2: DB rollback（預設不做）---"
read -p "也要 rollback DB 3 個 P0 migration？ (yes/no、強烈不建議): " db_confirm
if [ "$db_confirm" = "yes" ]; then
  echo "⚠️ 警告：rollback DB 會讓新租戶無法開團 / 無法確認收款"
  read -p "真的？ (YES 大寫)：" final_confirm
  if [ "$final_confirm" = "YES" ]; then
    # rollback 三個 migration 回到舊狀態
    curl -s "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT/database/query" \
      -H "Authorization: Bearer $SUPABASE_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"query": "ALTER TABLE folders DROP CONSTRAINT IF EXISTS folders_created_by_fkey; ALTER TABLE folders ADD CONSTRAINT folders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);"}'
    echo "⚠️ 已 rollback P0 #1（folders FK）。P0 #2/#3 trigger 不 rollback（修了 UUID 型別不會讓現有資料爆）"
  else
    echo "取消 DB rollback"
  fi
else
  echo "✅ 只 rollback code、DB 保持修復狀態（推薦）"
fi

echo ""
echo "==========================================="
echo "🏁 Rollback 完成"
echo "==========================================="
echo "檢查 production：打開 URL 登 Corner 看是否回到 4/19 早上狀態"
echo ""
