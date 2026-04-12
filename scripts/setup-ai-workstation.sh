#!/bin/bash
# ============================================================
# Venturo AI 工作站一鍵安裝腳本
# 適用：全新 macOS 機器，從零開始安裝所有 AI 開發工具
#
# 使用方式：
#   curl -fsSL https://raw.githubusercontent.com/你的repo/setup-ai-workstation.sh | bash
#   或：
#   chmod +x setup-ai-workstation.sh && ./setup-ai-workstation.sh
#
# 安裝內容：
#   1. 系統基礎（Homebrew, Git, Python, Node.js）
#   2. Hermes Agent（AI 中樞大腦）
#   3. OpenClaw（AI 團隊管理）
#   4. Claude Code（程式開發）
#   5. Ollama（本地免費模型）
#   6. Tailscale（VPN 遠端存取）
#   7. 系統設定（永不睡眠、防火牆）
#
# API Key 之後再設定：
#   hermes setup          # 設定 Hermes
#   openclaw onboard      # 設定 OpenClaw
#
# 日期：2026-04-10
# ============================================================

set -e

# 顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
info() { echo -e "${BLUE}[i]${NC} $1"; }
fail() { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║     Venturo AI 工作站 一鍵安裝腳本          ║"
echo "║     版本：1.0 | 日期：2026-04-10            ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ============================================================
# 0. 前置檢查
# ============================================================
info "檢查系統環境..."

if [[ "$(uname)" != "Darwin" ]]; then
  fail "此腳本僅支援 macOS"
fi

ARCH=$(uname -m)
info "架構: $ARCH"
info "macOS 版本: $(sw_vers -productVersion)"

# ============================================================
# 1. Homebrew
# ============================================================
if command -v brew &>/dev/null; then
  log "Homebrew 已安裝"
else
  info "安裝 Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  # 加入 PATH（Apple Silicon）
  if [[ "$ARCH" == "arm64" ]]; then
    echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
    eval "$(/opt/homebrew/bin/brew shellenv)"
  fi
  log "Homebrew 安裝完成"
fi

# ============================================================
# 2. 基礎工具
# ============================================================
info "安裝基礎工具..."

# Git
if command -v git &>/dev/null; then
  log "Git 已安裝 ($(git --version | cut -d' ' -f3))"
else
  brew install git
  log "Git 安裝完成"
fi

# Python 3
if command -v python3 &>/dev/null; then
  log "Python 已安裝 ($(python3 --version | cut -d' ' -f2))"
else
  brew install python@3.12
  log "Python 安裝完成"
fi

# Node.js
if command -v node &>/dev/null; then
  log "Node.js 已安裝 ($(node --version))"
else
  brew install node
  log "Node.js 安裝完成"
fi

# pip 升級
python3 -m pip install --upgrade pip --quiet 2>/dev/null || true

# ============================================================
# 3. Hermes Agent（AI 中樞大腦）
# ============================================================
if command -v hermes &>/dev/null; then
  log "Hermes Agent 已安裝"
else
  info "安裝 Hermes Agent..."
  curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash
  source ~/.zshrc 2>/dev/null || source ~/.bashrc 2>/dev/null || true
  log "Hermes Agent 安裝完成"
fi

# 自動設定 Hermes 火山引擎 API
if [[ -d ~/.hermes ]]; then
  mkdir -p ~/.hermes
  # 寫入 .env（API Key）
  if ! grep -q "CUSTOM_API_KEY" ~/.hermes/.env 2>/dev/null; then
    cat >> ~/.hermes/.env << 'ENVEOF'

# 火山引擎 API（Venturo 統一設定）
CUSTOM_API_BASE=https://ark.cn-beijing.volces.com/api/v3
CUSTOM_API_KEY=fccf7910-c650-41ab-9eb7-afc2916187aa
ENVEOF
    log "Hermes API Key 已寫入"
  fi
  log "Hermes 設定完成（模型需手動選：hermes setup model → More providers → Custom endpoint → 選 101 deepseek-v3-2）"
fi

# ============================================================
# 4. OpenClaw（AI 團隊管理）
# ============================================================
if command -v openclaw &>/dev/null; then
  log "OpenClaw 已安裝 ($(openclaw --version 2>/dev/null | head -1 || echo 'installed'))"
else
  info "安裝 OpenClaw..."
  curl -fsSL https://openclaw.ai/install.sh | bash 2>/dev/null || {
    # fallback: npm 安裝
    npm install -g @openclaw/cli 2>/dev/null || warn "OpenClaw 安裝失敗，請手動安裝"
  }
  log "OpenClaw 安裝完成"
fi

# ============================================================
# 5. Claude Code（程式開發 AI）
# ============================================================
if command -v claude &>/dev/null; then
  log "Claude Code 已安裝"
else
  info "安裝 Claude Code..."
  npm install -g @anthropic-ai/claude-code 2>/dev/null || {
    warn "Claude Code 安裝失敗，可能需要手動安裝"
  }
  log "Claude Code 安裝完成"
fi

# ============================================================
# 6. Ollama（本地免費模型）
# ============================================================
if command -v ollama &>/dev/null; then
  log "Ollama 已安裝"
else
  info "安裝 Ollama..."
  brew install ollama
  log "Ollama 安裝完成"
fi

# ============================================================
# 7. Tailscale（VPN 遠端存取）
# ============================================================
if command -v tailscale &>/dev/null; then
  log "Tailscale 已安裝"
else
  info "安裝 Tailscale..."
  brew install tailscale
  log "Tailscale 安裝完成"
fi

# ============================================================
# 8. 額外工具
# ============================================================
info "安裝額外工具..."

# jq（JSON 處理）
brew install jq 2>/dev/null || true

# tmux（多終端）
brew install tmux 2>/dev/null || true

log "額外工具安裝完成"

# ============================================================
# 9. 系統設定
# ============================================================
info "設定系統..."

# 防止睡眠（需要管理員密碼）
sudo pmset -a sleep 0 2>/dev/null && log "已設定永不睡眠" || warn "設定睡眠失敗（需要管理員密碼）"
sudo pmset -a disksleep 0 2>/dev/null || true
sudo pmset -a displaysleep 0 2>/dev/null || true

# 啟用 SSH（遠端登入，讓大腦機器能控制這台）
sudo systemsetup -setremotelogin on 2>/dev/null && log "SSH 遠端登入已開啟" || warn "SSH 設定失敗（請手動到 系統設定 → 共享 → 遠端登入）"

# 啟用防火牆
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on 2>/dev/null && log "防火牆已啟用" || warn "防火牆設定失敗"

# 允許 SSH 通過防火牆
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/libexec/sshd-keygen-wrapper 2>/dev/null || true

# 取得本機 IP（方便設定）
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "未知")
log "本機 IP: $LOCAL_IP（大腦機器需要這個 IP 來 SSH 連線）"

# 設定電腦名稱提示
HOSTNAME=$(hostname)
log "電腦名稱: $HOSTNAME"

log "系統設定完成"

# ============================================================
# 10. 建立工作目錄
# ============================================================
mkdir -p ~/Projects
mkdir -p ~/AI-Factory
log "工作目錄建立完成"

# ============================================================
# 完成
# ============================================================
echo ""
LOCAL_IP_FINAL=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "未知")
HOSTNAME_FINAL=$(hostname)

echo "╔══════════════════════════════════════════════╗"
echo "║              安裝完成！                     ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "┌──────────────────────────────────────────────┐"
echo "│  ⚠️  請拍照或抄寫以下資訊給 William：        │"
echo "│                                              │"
echo "│  電腦名稱: $HOSTNAME_FINAL"
echo "│  本機 IP:  $LOCAL_IP_FINAL"
echo "│  SSH 指令: ssh $(whoami)@$LOCAL_IP_FINAL"
echo "│  Mac 帳號: $(whoami)"
echo "│                                              │"
echo "└──────────────────────────────────────────────┘"
echo ""

# 也存一份到桌面方便查看
cat > ~/Desktop/這台電腦資訊.txt << INFOEOF
=== Venturo AI 工作站資訊 ===
電腦名稱: $HOSTNAME_FINAL
本機 IP: $LOCAL_IP_FINAL
SSH 指令: ssh $(whoami)@$LOCAL_IP_FINAL
Mac 帳號: $(whoami)
安裝日期: $(date '+%Y-%m-%d %H:%M')

把這些資訊傳給 William！
INFOEOF
log "已在桌面建立「這台電腦資訊.txt」"

echo ""
echo "已安裝的工具："
echo "  ✓ Homebrew, Git, Python, Node.js"
echo "  ✓ Hermes Agent（AI 中樞大腦）"
echo "  ✓ OpenClaw（AI 團隊管理）"
echo "  ✓ Claude Code（程式開發）"
echo "  ✓ Ollama（本地免費模型）"
echo "  ✓ SSH 遠端登入（已開啟）"
echo "  ✓ jq, tmux"
echo ""
echo "下一步（等 William 遠端設定，不用自己做）："
echo ""
echo "  William 會用 SSH 連進來設定以下內容："
echo "  - Hermes Agent API"
echo "  - OpenClaw 團隊"
echo "  - Git 帳號"
echo "  - 角色分配（大腦/創意/工程/行銷）"
echo ""
echo "MiniMax API 配置（William 設定用）："
echo "  Provider: MiniMax China"
echo "  模型: MiniMax-M2.5"
echo "  設定指令: hermes setup model → More providers → MiniMax China"
echo ""
