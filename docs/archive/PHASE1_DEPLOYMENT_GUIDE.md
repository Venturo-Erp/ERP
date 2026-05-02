# Phase 1 部署指南 - Local 報價接收與決策

## ✅ 已完成的代碼

### 1. 資料庫 Migration

**檔案**: `supabase/migrations/20260318_extend_tour_requests_for_local_quotes.sql`

**內容**:

- 擴充 `tour_requests` 表（新增欄位：`supplier_response`, `request_scope`, `accepted_at`, `rejected_at`, `selected_tier`, `line_group_id`, `package_status` 等）
- 建立 `tour_request_items` 表（協作確認單）
- 建立 RLS 策略

### 2. 前端組件

- ✅ `src/features/tours/hooks/useTourRequests.ts` - 查詢報價的 hooks
- ✅ `src/features/tours/components/tour-tracking/QuoteCard.tsx` - 報價卡片
- ✅ `src/features/tours/components/tour-tracking/AcceptQuoteDialog.tsx` - 成交確認
- ✅ `src/features/tours/components/tour-tracking/RejectQuoteDialog.tsx` - 拒絕報價
- ✅ `src/features/tours/components/tour-tracking/TourTrackingPanel.tsx` - 追蹤頁面（已整合報價區塊）
- ✅ `src/components/ui/radio-group.tsx` - RadioGroup 組件

### 3. 後端 API

- ✅ `src/app/api/tours/[tourId]/requests/[requestId]/accept/route.ts` - 成交 API
- ✅ `src/app/api/tours/[tourId]/requests/[requestId]/reject/route.ts` - 拒絕 API
- ✅ `src/app/api/public/submit-quote/route.ts` - 供應商提交報價（已修改）
- ✅ `src/app/api/line/send-local-quote/route.ts` - 發送 LINE 報價（已修改，加上建立 tour_requests 記錄）

---

## 🚀 部署步驟

### Step 1: 執行資料庫 Migration

前往 Supabase Dashboard → SQL Editor：

1. 開啟 `supabase/migrations/20260318_extend_tour_requests_for_local_quotes.sql`
2. 複製全部內容
3. 貼到 Supabase SQL Editor
4. 點「Run」執行

**驗證**：執行以下 SQL 確認欄位存在

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'tour_requests'
  AND column_name IN ('supplier_response', 'request_scope', 'accepted_at', 'rejected_at', 'selected_tier');
```

應該看到 5 個欄位。

---

### Step 2: 提交代碼到 Git

```bash
cd ~/Projects/venturo-erp

# 查看所有變更
git status

# 新增所有檔案
git add .

# 提交
git commit -m "feat: Phase 1 - Local 報價接收與決策功能

- 擴充 tour_requests 表支援整包報價
- 建立 tour_request_items 表（協作確認單）
- 追蹤頁籤加上待處理報價、已成交、未成交區塊
- 成交/拒絕 API + 自動產生協作確認單
- 修改 send-local-quote 建立 tour_requests 記錄
- 修改 submit-quote 儲存報價資訊"

# 推送
git push
```

---

### Step 3: Vercel 自動部署

Vercel 會自動偵測到 push 並開始部署。

等待約 2-3 分鐘後，前往：

```
https://app.cornertravel.com.tw
```

---

## 🧪 測試流程

### 1. 發送報價請求

1. 登入 ERP：http://100.89.92.46:3000
2. 進入團詳情頁（例如 TW260321A）
3. 點「需求」分頁 → 「給 Local 報價」
4. 設定梯次（20/30/40）、填寫備註
5. 選「Line」→ 選「泰國角落」群組
6. 發送

### 2. 供應商填寫報價

1. 泰國 Local 在 LINE 群組收到訊息
2. 點「📄 查看需求內容」
3. 看到行程表 + 填寫報價表單
4. 填寫聯絡人、電話、各梯次報價、單人房差、小費說明
5. 提交報價

### 3. 我們收到報價

1. 回到 ERP → 團詳情 → 「追蹤」分頁
2. 應該看到「📬 待處理報價 (1 筆)」
3. 看到報價卡片：
   - 供應商名稱
   - 發送/回覆時間
   - 報價摘要（20 人 5000/人、30 人 4500/人...）
   - 聯絡資訊

### 4. 成交

1. 點「✅ 確認成交」
2. 選擇人數梯次（例如 20 人團）
3. 點「確認成交」
4. 報價卡片應該移到「✅ 已成交 (1 筆)」區塊
5. 顯示成交時間和選定梯次

### 5. 驗證協作確認單

```sql
-- 查詢是否產生協作確認單
SELECT * FROM tour_request_items
WHERE request_id = '(剛成交的 request_id)';
```

應該看到從行程表複製的所有項目。

---

## ❌ 可能的錯誤

### 1. Migration 執行失敗

**錯誤**: `column "supplier_response" already exists`

**解決**: 欄位已存在，跳過該欄位的 `ADD COLUMN` 語句（Migration 已用 `IF NOT EXISTS`，應該不會出錯）

### 2. 追蹤頁籤看不到報價

**檢查**:

```sql
SELECT * FROM tour_requests
WHERE tour_id = '(你的 tour_id)'
  AND supplier_response IS NOT NULL;
```

如果沒有資料 → 供應商還沒提交報價

### 3. 成交後沒有產生協作確認單

**檢查**:

```sql
SELECT * FROM tour_request_items
WHERE request_id = '(request_id)';
```

如果沒有資料 → 檢查後端 log（Vercel Functions Logs）

---

## 📊 資料流總覽

```
1. ERP 發送報價
   ↓
   API: /api/line/send-local-quote
   → 建立 tour_requests (status='已發送')
   → 發送 LINE Flex Message

2. Local 提交報價
   ↓
   Public 頁面: /public/itinerary/[tourId]
   → API: /api/public/submit-quote
   → 更新 tour_requests.supplier_response
   → 設定 package_status='quoted'

3. 追蹤頁籤查詢
   ↓
   usePendingQuotes hook
   → 查詢 supplier_response != null 且 accepted_at = null

4. 成交
   ↓
   API: /api/tours/[tourId]/requests/[requestId]/accept
   → 更新 tour_requests (accepted_at, selected_tier, package_status='accepted')
   → 從 tour_itinerary_items 複製項目
   → 建立 tour_request_items（協作確認單）

5. 拒絕
   ↓
   API: /api/tours/[tourId]/requests/[requestId]/reject
   → 更新 tour_requests (rejected_at, rejection_reason, package_status='rejected')
```

---

## 🎯 下一步（Phase 2）

Phase 2 將實作：

- 協作確認單頁面（雙方可編輯）
- [+ 新增項目] 功能
- 進度追蹤（6/8 已確認）
- Public 頁面給 Local 看協作確認單

---

**建立時間**: 2026-03-18 19:20  
**建立者**: Matthew 🔧
