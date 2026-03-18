#!/bin/bash
# 魔法塔圖書館更新檢查
# 維護者：William AI 🔱
# 建立日期：2026-03-18

set -e

echo "🏰 魔法塔圖書館更新檢查"
echo "========================================"
echo ""

# 切換到專案目錄
cd ~/Projects/venturo-erp

# 1. 檢查 npm 套件
echo "📦 檢查 npm 套件更新..."
echo "----------------------------------------"

if command -v npm &> /dev/null; then
  npm outdated @hello-pangea/dnd framer-motion @supabase/supabase-js 2>/dev/null || echo "所有套件都是最新版本"
else
  echo "⚠️ npm 未安裝"
fi

echo ""

# 2. 檢查 Plane 更新
echo "🔍 檢查 Plane (makeplane/plane)..."
echo "----------------------------------------"

PLANE_VERSION=$(curl -s https://api.github.com/repos/makeplane/plane/releases/latest 2>/dev/null | jq -r '.tag_name // "無法取得"')
echo "最新版本: $PLANE_VERSION"
echo "我們使用: 2026-03-18 snapshot"
echo ""

# 3. 檢查 AutoGen 更新
echo "🔍 檢查 AutoGen (microsoft/autogen)..."
echo "----------------------------------------"

AUTOGEN_VERSION=$(curl -s https://api.github.com/repos/microsoft/autogen/releases/latest 2>/dev/null | jq -r '.tag_name // "無法取得"')
echo "最新版本: $AUTOGEN_VERSION"
echo "我們使用: 0.7.5"
echo ""

# 4. 檢查 OpenClaw
echo "🔍 檢查 OpenClaw..."
echo "----------------------------------------"

if command -v openclaw &> /dev/null; then
  OPENCLAW_VERSION=$(openclaw --version 2>&1 | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1 || echo "未知")
  echo "當前版本: $OPENCLAW_VERSION"
  
  # 檢查是否有更新（簡化版）
  echo "建議執行: openclaw update"
else
  echo "⚠️ OpenClaw 未安裝"
fi

echo ""

# 5. 檢查 agent-reach
echo "🔍 檢查 agent-reach..."
echo "----------------------------------------"

if [ -d ~/.openclaw/skills/agent-reach ]; then
  cd ~/.openclaw/skills/agent-reach
  if [ -d .git ]; then
    git fetch origin main --quiet 2>/dev/null || true
    LOCAL=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    REMOTE=$(git rev-parse origin/main 2>/dev/null || echo "unknown")
    
    if [ "$LOCAL" = "$REMOTE" ]; then
      echo "✅ agent-reach 是最新版本"
    else
      echo "⚠️ agent-reach 有更新可用"
      echo "執行: cd ~/.openclaw/skills/agent-reach && git pull"
    fi
  else
    echo "⚠️ agent-reach 不是 git repo"
  fi
else
  echo "⚠️ agent-reach 未安裝"
fi

cd ~/Projects/venturo-erp
echo ""

# 6. 總結
echo "========================================"
echo "✅ 檢查完成！"
echo ""
echo "💡 建議："
echo "1. 定期執行此腳本（每週日）"
echo "2. 有更新時評估是否升級"
echo "3. 更新後測試所有功能"
echo ""
echo "📝 更新 MAGIC_LIBRARY.md:"
echo "   ~/Projects/venturo-erp/MAGIC_LIBRARY.md"
echo ""
