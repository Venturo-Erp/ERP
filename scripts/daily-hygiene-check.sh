#!/usr/bin/env bash
# Venturo 每日衛生檢查機器人
#
# 每天早上跑、出一份「今日污染狀況」報告
# 不擅自處置、只回報、由 William 決定動哪裡
#
# 用法：
#   ./scripts/daily-hygiene-check.sh
#   ./scripts/daily-hygiene-check.sh > /tmp/hygiene-$(date +%Y%m%d).log
#
# 排程（macOS launchd）：見 scripts/daily-hygiene.plist 範本

set -uo pipefail
cd "$(dirname "$0")/.."

DATE=$(date +%Y-%m-%d)
TIME=$(date +%H:%M)

echo "═══════════════════════════════════════════════════════"
echo "🧼 Venturo 衛生報告  ${DATE} ${TIME}"
echo "═══════════════════════════════════════════════════════"

# 計分用
HIGH=0
MID=0
LOW=0

red()    { printf "\033[31m%s\033[0m" "$1"; }
yellow() { printf "\033[33m%s\033[0m" "$1"; }
green()  { printf "\033[32m%s\033[0m" "$1"; }

#───────────────────────────────────────────────
# 1. 程式層
#───────────────────────────────────────────────
echo ""
echo "▍ 1. 程式層"
echo ""

# 1a SSOT 雙存讀取
SSOT_COUNT=$(node scripts/check-ssot-duplicates.mjs 2>/dev/null | grep -E "總出現處：" | awk -F'：' '{print $2}')
SSOT_COUNT=${SSOT_COUNT:-0}
if [ "$SSOT_COUNT" -gt 0 ]; then
  echo "  $(yellow '🟡') SSOT 雙存讀取：${SSOT_COUNT} 處"
  ((MID++))
else
  echo "  $(green '🟢') SSOT 雙存讀取：0 處"
fi

# 1b Phantom features
PHANTOM_COUNT=$(node scripts/check-phantom-features.mjs 2>/dev/null | grep -E "候選 state 總數：" | awk -F'：' '{print $2}')
PHANTOM_COUNT=${PHANTOM_COUNT:-0}
if [ "$PHANTOM_COUNT" -gt 0 ]; then
  echo "  $(yellow '🟡') Phantom UI 候選：${PHANTOM_COUNT} 個（多數是誤判、人工確認）"
else
  echo "  $(green '🟢') Phantom UI：0"
fi

# 1c 散兵 className（金色立體按鈕 / 手刻 status）
GOLD_BTN=$(grep -rln "from-morandi-gold/40 to-morandi-container/60" src --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
if [ "$GOLD_BTN" -gt 2 ]; then  # 2 個 widget icon 是 false positive
  echo "  $(red '🔴') 金色立體按鈕散兵：${GOLD_BTN} 處（用 Button variant=\"soft-gold\"）"
  ((HIGH++))
else
  echo "  $(green '🟢') 金色立體按鈕散兵：0（${GOLD_BTN} 處 widget icon 例外）"
fi

# 1d type-check（完整跑、慢、可關掉）
if [ "${SKIP_TYPE_CHECK:-0}" != "1" ]; then
  if npm run type-check >/dev/null 2>&1; then
    echo "  $(green '🟢') TypeScript type-check：通過"
  else
    echo "  $(red '🔴') TypeScript type-check：失敗"
    ((HIGH++))
  fi
else
  echo "  $(yellow '⏭') TypeScript type-check：跳過（SKIP_TYPE_CHECK=1）"
fi

#───────────────────────────────────────────────
# 2. Git 層
#───────────────────────────────────────────────
echo ""
echo "▍ 2. Git 層"
echo ""

# 2a 過期 stash
STASH_COUNT=$(git stash list 2>/dev/null | wc -l | tr -d ' ')
if [ "$STASH_COUNT" -gt 0 ]; then
  echo "  $(yellow '🟡') git stash：${STASH_COUNT} 個"
  echo "       規範：應改用 wip/<日期>-<名字> branch（gwip alias）"
else
  echo "  $(green '🟢') git stash：0（符合規範）"
fi

# 2b 過期 wip/* branch（>14 天沒動）
STALE_WIP=$(git for-each-ref --format='%(committerdate:unix) %(refname:short)' refs/heads/wip/ 2>/dev/null | \
  awk -v cutoff=$(date -v-14d +%s 2>/dev/null || date -d '14 days ago' +%s) '$1 < cutoff {print $2}' | wc -l | tr -d ' ')
if [ "$STALE_WIP" -gt 0 ]; then
  echo "  $(yellow '🟡') 過期 wip/ branch（>14 天）：${STALE_WIP} 個"
  ((MID++))
else
  echo "  $(green '🟢') 過期 wip/ branch：0"
fi

# 2c 已 merge 沒砍的 branch
MERGED=$(git branch --merged main 2>/dev/null | grep -v "^\*\|main$\|wip/\|claude/" | wc -l | tr -d ' ')
if [ "$MERGED" -gt 0 ]; then
  echo "  $(yellow '🟡') 已 merge 未砍 branch：${MERGED} 個"
  ((MID++))
else
  echo "  $(green '🟢') 已 merge 未砍 branch：0"
fi

# 2d 失聯 worktree
WORKTREE_ORPHAN=$(git worktree list 2>/dev/null | awk '{print $1}' | while read p; do [ -d "$p" ] || echo "$p"; done | wc -l | tr -d ' ')
if [ "$WORKTREE_ORPHAN" -gt 0 ]; then
  echo "  $(yellow '🟡') 失聯 worktree：${WORKTREE_ORPHAN}（建議跑 git worktree prune）"
else
  echo "  $(green '🟢') 失聯 worktree：0"
fi

#───────────────────────────────────────────────
# 3. 跨機器 drift
#───────────────────────────────────────────────
echo ""
echo "▍ 3. 跨機器同步"
echo ""

# 3a claude-brain last sync
BRAIN_DIR="$HOME/.claude-sync"
if [ -d "$BRAIN_DIR/.git" ]; then
  LAST_SYNC=$(cd "$BRAIN_DIR" && git log -1 --format=%ar 2>/dev/null)
  echo "  ℹ  claude-brain 上次同步：${LAST_SYNC}"
  echo "       手動觸發：在 Claude Code 打 /同步"
else
  echo "  $(yellow '⚠') claude-brain 目錄不存在（${BRAIN_DIR}）"
fi

# 3b dotfiles uncommitted
if [ -d "$HOME/dotfiles/.git" ]; then
  DOTFILES_DIRTY=$(cd "$HOME/dotfiles" && git status --short 2>/dev/null | wc -l | tr -d ' ')
  if [ "$DOTFILES_DIRTY" -gt 0 ]; then
    echo "  $(yellow '🟡') dotfiles 未 commit：${DOTFILES_DIRTY} 個檔（cd ~/dotfiles && git diff）"
    ((MID++))
  else
    echo "  $(green '🟢') dotfiles：clean"
  fi
fi

#───────────────────────────────────────────────
# 4. 文件層
#───────────────────────────────────────────────
echo ""
echo "▍ 4. 文件層"
echo ""

# 4a Sitemap 覆蓋率
PAGES=$(find src/app -type f -name "page.tsx" 2>/dev/null | grep -v "_archive\|/api/" | wc -l | tr -d ' ')
SITEMAPS=$(ls docs/SITEMAP/*.md 2>/dev/null | grep -v "^docs/SITEMAP/_" | wc -l | tr -d ' ')
PCT=$((SITEMAPS * 100 / PAGES))
if [ "$PCT" -lt 30 ]; then
  echo "  $(yellow '🟡') Sitemap 覆蓋率：${SITEMAPS}/${PAGES} 頁（${PCT}%）"
  echo "       見 docs/SITE_AUDIT_2026-04-26.md 待補清單"
else
  echo "  $(green '🟢') Sitemap 覆蓋率：${PCT}%"
fi

#───────────────────────────────────────────────
# 結尾
#───────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════"
TOTAL_ISSUES=$((HIGH + MID))
if [ "$HIGH" -gt 0 ]; then
  echo "$(red '🔴 急')  ${HIGH} 件、$(yellow '🟡 待處理') ${MID} 件"
elif [ "$MID" -gt 0 ]; then
  echo "$(yellow '🟡 待處理') ${MID} 件、$(green '其他乾淨')"
else
  echo "$(green '🟢 全綠')"
fi
echo "═══════════════════════════════════════════════════════"
exit 0
