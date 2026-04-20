#!/bin/bash
# ============================================================================
# Venturo Cleanup Phase A · Tier 1 — 刪除整資料夾的死檔案
# Generated: 2026-04-18
# Source: VENTURO_CLEANUP_DEAD_FILES_BY_FOLDER.md 的 Tier 1（A1-A4）
# Impact: 42 個 dead files、types.ts 會少 ~1000 行
# Risk: 低（都已用 knip + GitNexus 確認 0 upstream callers）
# Rollback: git checkout 或跑 cleanup-phase-a-rollback.sh
# ============================================================================

set -e
cd "$(dirname "$0")/../.."  # 回到 venturo-erp 根目錄
pwd

echo ""
echo "=== Phase A Tier 1: 42 個整資料夾刪除 ==="
echo ""

echo "⚠️ 請確認：工作區乾淨（無未 commit 的 WIP）"
git status --short | head -5
echo ""
read -p "確認工作區乾淨、開始刪？(yes/no) " ans
[ "$ans" != "yes" ] && { echo "取消"; exit 1; }

echo ""
echo "--- A1: react-datasheet-wrapper (9 檔) ---"
git rm -f src/components/shared/react-datasheet-wrapper.tsx || true
git rm -rf src/components/shared/react-datasheet-wrapper || true

echo ""
echo "--- A2: block-editor (19 檔) ---"
git rm -rf src/components/editor/block-editor || true

echo ""
echo "--- A3: quotes/components/printable (8 檔、重構殘骸) ---"
echo "⚠️ 注意：這個刪除前請最後確認你實際用的 PrintableQuickQuote 是 src/features/quotes/components/PrintableQuickQuote.tsx（沒有 printable/ 前綴）"
read -p "確認無誤？(yes/no) " ans
[ "$ans" != "yes" ] && { echo "取消 A3"; exit 1; }
git rm -rf src/features/quotes/components/printable || true

echo ""
echo "--- A4: hotel-selector (6 檔) ---"
git rm -rf src/components/editor/hotel-selector || true

echo ""
echo "=== 刪除完成 ==="
echo ""
echo "git diff --stat:"
git diff --cached --stat | tail -5

echo ""
echo "=== 下一步 (請手動跑) ==="
echo "1. npm run type-check    # 必須綠燈"
echo "2. npm run dev           # 手動點報價、行程、請款收款 3 核心頁"
echo "3. 沒壞：git commit -m 'cleanup(phase-a-tier1): 刪 42 個死檔（react-datasheet/block-editor/printable/hotel-selector）'"
echo "4. 有壞：git reset --hard HEAD  # 整批還原"
