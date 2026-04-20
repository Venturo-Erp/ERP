#!/bin/bash
# ============================================================================
# Venturo Cleanup Phase A · 刪除 19 個未用 npm deps
# Generated: 2026-04-18
# Source: VENTURO_CLEANUP_REPORT_PHASE_A.md + 交叉驗證結果
# Prerequisite: 必須先跑完 cleanup-phase-a-tier1-files.sh（因為 7 個 deps 依賴那些 dead files 被刪）
# Impact: package.json 瘦身、node_modules 瘦身（可省幾百 MB）
# Risk: 低（都已用 knip + grep 確認）
# Rollback: git checkout package.json package-lock.json && npm install
# ============================================================================

set -e
cd "$(dirname "$0")/../.."
pwd

echo ""
echo "=== Phase A: 移除 19 個未用 npm deps ==="
echo ""

echo "⚠️ 前提：已跑完 cleanup-phase-a-tier1-files.sh、或確認 form-utils/radio-group/UnifiedImageEditor/useDataTable 等 dead files 已刪"
read -p "前提滿足？(yes/no) " ans
[ "$ans" != "yes" ] && { echo "取消"; exit 1; }

echo ""
echo "--- Tier 1: 12 個確定可刪（0 import）---"
npm uninstall \
  @anthropic-ai/sdk \
  @google/generative-ai \
  @swc/helpers \
  @tavily/core \
  @tiptap/extension-bubble-menu \
  @univerjs/docs \
  @univerjs/docs-ui \
  @univerjs/preset-docs-core \
  @univerjs/preset-sheets-core \
  @univerjs/sheets-ui \
  @xdadda/mini-gl \
  dotenv \
  phaser \
  react-leaflet

echo ""
echo "--- Tier 2: 7 個連帶可刪（dead file 被刪後這些 dep 也就沒人用了）---"
npm uninstall \
  @hookform/resolvers \
  react-hook-form \
  @radix-ui/react-radio-group \
  react-easy-crop \
  @tanstack/react-table \
  react-datasheet

echo ""
echo "=== 移除完成 ==="
echo ""
npm run type-check 2>&1 | tail -10

echo ""
echo "=== 下一步 ==="
echo "1. type-check 必須綠（上方輸出）"
echo "2. npm run dev 實測核心 3 頁"
echo "3. git diff package.json 確認只移除預期項目"
echo "4. OK 就 commit: git add package.json package-lock.json && git commit -m 'cleanup(phase-a-deps): 移除 19 個未用 npm 依賴'"
