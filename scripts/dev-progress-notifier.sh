#!/bin/bash
# 開發進度自動通知

TOKEN="7946863178:AAFmvY3qyv8TdW0WHwPBqGvR9l8kvB7Ykaw"
CHAT_ID="8559214126"
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
