#!/bin/bash
# ============================================================
# ERP 自動優化 audit loop（autoresearch 模式 ERP 變體）
# ============================================================
#
# 用法：
#   ./scripts/audit-loop.sh           # 互動模式、列現況 + 可做的 task
#   ./scripts/audit-loop.sh --json    # JSON 輸出（給 CI / 自動化用）
#
# 流程：
#   1. 跑守門 check-standards.sh
#   2. 看 backlog 找 ready-to-go 的 task（風險低、無前置）
#   3. 顯示「下一步可做什麼」
#
# 不會自動修任何東西（修是另一個 agent 的工作）
# ============================================================

set -u

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

MODE="${1:-interactive}"

# 顏色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ "$MODE" = "--json" ]; then
  exec > /tmp/audit-loop-output.log 2>&1
fi

echo "============================================"
echo "ERP 自動優化 audit loop"
echo "============================================"
echo "時間：$(date)"
echo

# ============================================================
# Step 1: 守門狀態
# ============================================================
echo -e "${BLUE}▶ Step 1: 守門檢查${NC}"
echo
GUARD_OUT=$(./scripts/check-standards.sh 2>&1)
GUARD_PASS=$(echo "$GUARD_OUT" | grep -c "PASS")
GUARD_FAIL=$(echo "$GUARD_OUT" | grep -c "FAIL")
echo "$GUARD_OUT" | grep -E "PASS|FAIL"
echo
if [ "$GUARD_FAIL" -gt 0 ]; then
  echo -e "${RED}❌ 守門有 $GUARD_FAIL 條違反、必須先修${NC}"
else
  echo -e "${GREEN}✅ 守門 $GUARD_PASS/$((GUARD_PASS + GUARD_FAIL)) 全綠${NC}"
fi

# ============================================================
# Step 2: backlog ready-to-go
# ============================================================
echo
echo -e "${BLUE}▶ Step 2: Backlog ready-to-go tasks${NC}"
echo

if [ ! -f docs/_followup_backlog.md ]; then
  echo -e "${RED}❌ 找不到 docs/_followup_backlog.md${NC}"
  exit 1
fi

# 抓 LOW 風險 section 內的 pending tasks
LOW_RISK_PENDING=$(awk '
  /^## 🟢 LOW 風險/ { in_low=1; next }
  /^## 🟡 MEDIUM/ { in_low=0 }
  /^## 🔴 HIGH/ { in_low=0 }
  in_low && /^### B-/ {
    title=$0
    sub(/^### /, "", title)
    getline
    while ($0 !~ /^### / && $0 !~ /^## /) {
      if ($0 ~ /^\*\*狀態\*\*：pending/) {
        print title
        break
      }
      if (!getline) break
    }
  }
' docs/_followup_backlog.md)

if [ -z "$LOW_RISK_PENDING" ]; then
  echo -e "${GREEN}✅ LOW 風險 backlog 已清空${NC}"
  echo "可考慮：(a) 處理 MEDIUM 風險 task (b) 寫新 backlog (c) 收工"
else
  echo "可立即派 agent 做的 LOW 風險 task："
  echo
  echo "$LOW_RISK_PENDING" | while IFS= read -r line; do
    echo -e "  ${GREEN}•${NC} $line"
  done
fi

# ============================================================
# Step 3: 過去 loop run 記錄
# ============================================================
echo
echo -e "${BLUE}▶ Step 3: 最近 5 次 loop run${NC}"
echo
LATEST_RUNS=$(ls -t docs/_session/_loop_run_*.md 2>/dev/null | head -5)
if [ -z "$LATEST_RUNS" ]; then
  echo "  尚無 loop run 紀錄"
else
  echo "$LATEST_RUNS" | while IFS= read -r f; do
    basename "$f"
  done
fi

# ============================================================
# Step 4: 建議下一步
# ============================================================
echo
echo -e "${BLUE}▶ Step 4: 建議下一步${NC}"
echo

if [ "$GUARD_FAIL" -gt 0 ]; then
  echo "1. 守門有違反、先修：./scripts/check-standards.sh 看哪條 fail"
elif [ -n "$LOW_RISK_PENDING" ]; then
  FIRST_TASK=$(echo "$LOW_RISK_PENDING" | head -1 | awk -F: '{print $1}')
  echo "1. 派 agent 做 ${FIRST_TASK}（按 _agent_entry.md 流程）"
  echo "2. agent 完成後讀 docs/_session/_loop_run_*.md 報告"
  echo "3. 人類 review + commit"
else
  echo "1. 跑 smoke test（docs/_session/_smoke_test_guide.md）"
  echo "2. commit + 上線"
  echo "3. 之後新加違規 / 優化 → 加進 backlog 再跑這個 loop"
fi

echo
echo "============================================"
echo "audit loop 完成"
echo "============================================"

if [ "$MODE" = "--json" ]; then
  # JSON 輸出
  cat > /tmp/audit-loop-result.json <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "guard_pass": $GUARD_PASS,
  "guard_fail": $GUARD_FAIL,
  "low_risk_pending_count": $(echo "$LOW_RISK_PENDING" | grep -c "^B-"),
  "ready_for_smoke_test": $([ "$GUARD_FAIL" = "0" ] && [ -z "$LOW_RISK_PENDING" ] && echo "true" || echo "false")
}
EOF
  cat /tmp/audit-loop-result.json
fi
