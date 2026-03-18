#!/bin/bash
# 開發進度自動通知

TOKEN="${TELEGRAM_BOT_TOKEN:-}"
CHAT_ID="${TELEGRAM_CHAT_ID:-8559214126}"

if [ -z "$TOKEN" ]; then
  echo "❌ 錯誤：請設定 TELEGRAM_BOT_TOKEN 環境變數"
  echo "   在 .env.local 設定或執行："
  echo "   export TELEGRAM_BOT_TOKEN='your-token-here'"
  exit 1
fi
TASK_NAME="$1"
STATUS="$2"
DETAIL="$3"

send_notification() {
  local message="$1"
  curl -s -X POST "https://api.telegram.com/bot$TOKEN/sendMessage" \
    -d "chat_id=$CHAT_ID" \
    -d "text=$message" \
    -d "parse_mode=Markdown" > /dev/null
}

# 格式化訊息
if [ "$STATUS" = "start" ]; then
  MSG="🚀 **開始開發**

任務：$TASK_NAME
時間：$(date '+%H:%M')
預計：$DETAIL"

elif [ "$STATUS" = "progress" ]; then
  MSG="⏳ **開發進度**

任務：$TASK_NAME
進度：$DETAIL
時間：$(date '+%H:%M')"

elif [ "$STATUS" = "complete" ]; then
  MSG="✅ **開發完成**

任務：$TASK_NAME
完成時間：$(date '+%H:%M')
$DETAIL"

elif [ "$STATUS" = "error" ]; then
  MSG="❌ **開發遇到問題**

任務：$TASK_NAME
問題：$DETAIL
時間：$(date '+%H:%M')"

elif [ "$STATUS" = "blocked" ]; then
  MSG="🔴 **開發卡住**

任務：$TASK_NAME
原因：$DETAIL
時間：$(date '+%H:%M')

需要你的決定！"
fi

send_notification "$MSG"
