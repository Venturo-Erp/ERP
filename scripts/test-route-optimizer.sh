#!/bin/bash
# 清邁景點路線優化系統 - 快速測試腳本

set -e

echo "🧪 清邁景點路線優化系統 - 快速測試"
echo "============================================================"

# ============================================
# 1. 檢查環境變數
# ============================================
echo ""
echo "🔍 檢查環境變數..."

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "❌ 請先設定環境變數："
    echo "   export NEXT_PUBLIC_SUPABASE_URL=your_url"
    echo "   export SUPABASE_SERVICE_ROLE_KEY=your_key"
    exit 1
fi

echo "✅ Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"

# ============================================
# 2. 測試資料庫連線
# ============================================
echo ""
echo "🗄️  測試資料庫連線..."

DEST_COUNT=$(psql "$NEXT_PUBLIC_SUPABASE_URL" -t -c "SELECT COUNT(*) FROM destinations WHERE city = '清邁';" | xargs)

if [ "$DEST_COUNT" -gt 0 ]; then
    echo "✅ 找到 $DEST_COUNT 個清邁景點"
else
    echo "⚠️  清邁景點資料為空，請先新增景點資料"
    exit 1
fi

# ============================================
# 3. 測試距離矩陣計算（Dry Run）
# ============================================
echo ""
echo "🧮 測試距離矩陣計算（Dry Run）..."

python3 scripts/calculate-distance-matrix.py --city 清邁 --dry-run

# ============================================
# 4. 檢查現有距離資料
# ============================================
echo ""
echo "📊 檢查現有距離資料..."

DISTANCE_COUNT=$(psql "$NEXT_PUBLIC_SUPABASE_URL" -t -c "SELECT COUNT(*) FROM distance_matrix WHERE city = '清邁';" | xargs)

if [ "$DISTANCE_COUNT" -gt 0 ]; then
    echo "✅ 已有 $DISTANCE_COUNT 筆距離資料"
else
    echo "⚠️  距離矩陣為空，需要先執行："
    echo "   python scripts/calculate-distance-matrix.py --city 清邁"
fi

# ============================================
# 5. 測試路線優化（使用前 5 個景點）
# ============================================
echo ""
echo "🚗 測試路線優化（使用前 5 個景點）..."

# 取得前 5 個景點的 ID
DEST_IDS=$(psql "$NEXT_PUBLIC_SUPABASE_URL" -t -c "SELECT string_agg(id::text, ',') FROM (SELECT id FROM destinations WHERE city = '清邁' LIMIT 5) sub;" | xargs)

if [ -n "$DEST_IDS" ]; then
    echo "景點 IDs: $DEST_IDS"
    
    # 只有在距離資料存在時才執行優化
    if [ "$DISTANCE_COUNT" -gt 0 ]; then
        python3 scripts/optimize-route.py --destination-ids "$DEST_IDS"
    else
        echo "⏭️  跳過路線優化（需要先計算距離矩陣）"
    fi
else
    echo "❌ 無法取得景點 IDs"
    exit 1
fi

# ============================================
# 6. 完成
# ============================================
echo ""
echo "============================================================"
echo "✅ 測試完成！"
echo ""

if [ "$DISTANCE_COUNT" -eq 0 ]; then
    echo "⚠️  下一步：計算距離矩陣"
    echo "   python scripts/calculate-distance-matrix.py --city 清邁"
    echo ""
    echo "⚠️  注意：這會呼叫 Google Maps API（約 $12.5 成本）"
else
    echo "✅ 系統已就緒，可以開始使用！"
fi

echo ""
