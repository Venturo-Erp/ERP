#!/bin/bash
# ============================================================================
# Venturo Cleanup Phase A · Rollback（後悔藥）
# Generated: 2026-04-18
# Usage: 如果 tier1-files.sh 或 deps.sh 跑完後發現問題，跑這個還原
# ============================================================================

set -e
cd "$(dirname "$0")/../.."
pwd

echo ""
echo "=== Phase A Rollback ==="
echo ""
echo "⚠️ 這會還原 Phase A 所有改動到上一個 commit。"
echo "   如果你在 Phase A 之後還有別的改動，那些會一起被還原！"
echo ""
read -p "確定要 rollback？(yes/no) " ans
[ "$ans" != "yes" ] && { echo "取消"; exit 1; }

echo ""
echo "=== git status（還原前）==="
git status --short | head -20
echo ""

echo "=== 還原 ==="
git reset --hard HEAD
echo ""

echo "=== 還原 package.json 的 deps（如 Phase A deps 有跑）==="
read -p "要不要 npm install 重建 node_modules？(yes/no) " reinstall
if [ "$reinstall" = "yes" ]; then
  npm install
fi

echo ""
echo "✅ Rollback 完成"
echo ""
git log --oneline -5
