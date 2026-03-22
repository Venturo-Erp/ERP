#!/bin/bash
# 批量修改所有硬編碼的公司名稱，改用 COMPANY_NAME 常數

echo "🔧 修復所有硬編碼的公司名稱..."

# public/accommodation-quote
echo "修改 accommodation-quote..."
sed -i '' '5a\
import { COMPANY_NAME } from '"'"'@/lib/tenant'"'"'
' src/app/public/accommodation-quote/[tourId]/[requestId]/page.tsx 2>/dev/null || true

sed -i '' 's/角落旅行社備註/{COMPANY_NAME}備註/g' src/app/public/accommodation-quote/[tourId]/[requestId]/page.tsx
sed -i '' 's/本報價單由角落旅行社提供/本報價單由{COMPANY_NAME}提供/g' src/app/public/accommodation-quote/[tourId]/[requestId]/page.tsx

# public/activity-quote  
echo "修改 activity-quote..."
sed -i '' '5a\
import { COMPANY_NAME } from '"'"'@/lib/tenant'"'"'
' src/app/public/activity-quote/[tourId]/[requestId]/page.tsx 2>/dev/null || true

sed -i '' 's/角落旅行社備註/{COMPANY_NAME}備註/g' src/app/public/activity-quote/[tourId]/[requestId]/page.tsx
sed -i '' 's/本報價單由角落旅行社提供/本報價單由{COMPANY_NAME}提供/g' src/app/public/activity-quote/[tourId]/[requestId]/page.tsx

# public/itinerary
echo "修改 itinerary..."
sed -i '' '5a\
import { COMPANY_NAME } from '"'"'@/lib/tenant'"'"'
' src/app/public/itinerary/[tourId]/page.tsx 2>/dev/null || true

sed -i '' 's/角落旅行社/{COMPANY_NAME}/g' src/app/public/itinerary/[tourId]/page.tsx

# public/request
echo "修改 request..."
sed -i '' '5a\
import { COMPANY_NAME } from '"'"'@/lib/tenant'"'"'
' src/app/public/request/[token]/page.tsx 2>/dev/null || true

sed -i '' 's/"角落旅行社"/{COMPANY_NAME}/g' src/app/public/request/[token]/page.tsx

echo "✅ 修改完成！"
echo "⚠️  請手動檢查以下檔案："
echo "   - API routes (LINE/AI) 中的註解文字"
echo "   - labels.ts 中的 placeholder"
echo "   - block-editor 中的範例"
