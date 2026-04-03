#!/bin/bash
# 清邁景點路線優化系統 - 安裝腳本

set -e

echo "🚀 清邁景點路線優化系統 - 安裝腳本"
echo "============================================================"

# ============================================
# 1. 檢查 Python 環境
# ============================================
echo ""
echo "📦 檢查 Python 環境..."

if ! command -v python3 &> /dev/null; then
    echo "❌ 找不到 Python 3，請先安裝：brew install python3"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo "✅ Python 版本：$PYTHON_VERSION"

# ============================================
# 2. 建立 Python 虛擬環境（可選）
# ============================================
echo ""
echo "🌐 建立 Python 虛擬環境..."

if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ 虛擬環境已建立"
else
    echo "⏭️  虛擬環境已存在"
fi

# 啟用虛擬環境
source venv/bin/activate

# ============================================
# 3. 安裝 Python 依賴
# ============================================
echo ""
echo "📦 安裝 Python 依賴..."

pip install --upgrade pip
pip install supabase requests ortools

echo "✅ Python 依賴安裝完成"

# ============================================
# 4. 執行 Supabase Migration
# ============================================
echo ""
echo "🗄️  執行 Supabase Migration..."

if [ -f "supabase/migrations/20260403174000_create_distance_matrix.sql" ]; then
    echo "✅ Migration 檔案存在"
    
    # 檢查是否有 supabase CLI
    if command -v supabase &> /dev/null; then
        echo "執行 migration..."
        supabase db push
        echo "✅ Migration 已套用"
    else
        echo "⚠️  找不到 supabase CLI，請手動執行 migration："
        echo "   supabase db push"
        echo "   或直接在 Supabase Dashboard 執行 SQL 檔案"
    fi
else
    echo "❌ 找不到 migration 檔案"
    exit 1
fi

# ============================================
# 5. 測試連線
# ============================================
echo ""
echo "🔌 測試 Supabase 連線..."

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "⚠️  環境變數 NEXT_PUBLIC_SUPABASE_URL 未設定"
    echo "   請在 .env.local 設定 Supabase URL"
else
    echo "✅ Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
fi

# ============================================
# 6. 完成
# ============================================
echo ""
echo "============================================================"
echo "✅ 安裝完成！"
echo ""
echo "接下來的步驟："
echo "  1. 確認 .env.local 已設定 GOOGLE_MAPS_API_KEY"
echo "  2. 執行距離矩陣計算："
echo "     python scripts/calculate-distance-matrix.py --city 清邁 --dry-run"
echo "  3. 測試路線優化："
echo "     python scripts/optimize-route.py --destination-ids uuid1,uuid2"
echo ""
echo "文件："
echo "  - docs/ROUTE_OPTIMIZER.md"
echo "  - supabase/migrations/20260403174000_create_distance_matrix.sql"
echo ""
