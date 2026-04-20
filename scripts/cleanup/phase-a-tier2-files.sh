#!/bin/bash
# ============================================================================
# Venturo Cleanup Phase A · Tier 2 — GitNexus 驗證過的整資料夾刪除
# Generated: 2026-04-18 凌晨
# Source: VENTURO_CLEANUP_DEAD_FILES_BY_FOLDER.md Tier 2 · GitNexus 驗證
# Impact: 34 個 dead files
# Risk: 中（GitNexus impact=0 驗證過、但涉及 feature 層）
# Prerequisite: 建議先跑完 tier1-files.sh 並 commit，確認系統穩定後再跑這個
# ============================================================================

set -e
cd "$(dirname "$0")/../.."
pwd

echo ""
echo "=== Phase A Tier 2: 34 個整資料夾刪除 ==="
echo ""
echo "⚠️ 前提：Tier 1 已跑完 + commit + 驗證 UI 沒壞"
read -p "前提滿足？(yes/no) " ans
[ "$ans" != "yes" ] && { echo "取消"; exit 1; }

echo ""
echo "--- B2: features/tour-confirmation (25 檔) ---"
echo "GitNexus 驗證：25 檔、0 route 掛進來、impact=0"
read -p "確認刪？(yes/no) " ans
if [ "$ans" = "yes" ]; then
  git rm -rf src/features/tour-confirmation || true
fi

echo ""
echo "--- B3: lib/logan/providers (5 檔、重構殘骸) ---"
echo "活的在 lib/logan/ 根目錄，這個 providers/ 是舊版"
read -p "確認刪？(yes/no) " ans
if [ "$ans" = "yes" ]; then
  git rm -rf src/lib/logan/providers || true
fi

echo ""
echo "--- B4: lib/analytics (4 檔、孤島 code) ---"
read -p "確認刪？(yes/no) " ans
if [ "$ans" = "yes" ]; then
  git rm -rf src/lib/analytics || true
fi

echo ""
echo "--- B5: UnifiedImageEditor 單檔 (GitNexus impact=0) ---"
echo "注意：designer 其他 image editor 檔案暫緩、等逐檔驗證"
read -p "確認刪 UnifiedImageEditor？(yes/no) " ans
if [ "$ans" = "yes" ]; then
  git rm -f src/components/designer/UnifiedImageEditor.tsx || true
fi

echo ""
echo "=== 刪除完成 ==="
git diff --cached --stat | tail -5

echo ""
echo "=== 必做下一步 ==="
echo "1. npm run type-check"
echo "2. 手動點核心 3 頁（報價 / 行程 / 請款收款）"
echo "3. 沒壞：git commit -m 'cleanup(phase-a-tier2): 移除 tour-confirmation/logan-providers/analytics/UnifiedImageEditor'"
echo "4. 有壞：git reset --hard HEAD"
echo ""
echo "⚠️ 注意：若 tour-confirmation 刪除後有 type error，代表 features/confirmations 可能有 import 舊的—先修 import 再驗證"

echo ""
echo "=== 🛑 Tier 2 警告：B1 PNR 整套未處理 ==="
echo "PNR 系統比較複雜（部分活部分死），未放入本腳本"
echo "建議待 Tier 1 + Tier 2 本次完成穩定後，再單獨處理"
