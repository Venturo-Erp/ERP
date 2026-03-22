# 完整測試指南 - Local 報價系統

**日期**: 2026-03-18 19:30  
**版本**: Phase 1 + Phase 2 + Phase 3 完整版

---

## ✅ 已完成的功能

### Phase 1: 報價接收與決策

- ✅ 發送 Local 報價請求（LINE）
- ✅ 供應商填寫報價（公開頁面）
- ✅ 追蹤頁籤顯示待處理報價
- ✅ 成交/不成交決策
- ✅ 自動產生協作確認單

### Phase 2: 協作確認單

- ✅ 顯示所有項目（從行程表自動複製）
- ✅ 雙方可編輯（標記處理方：Local/我們/客人）
- ✅ 新增項目功能（手動追加）
- ✅ 進度追蹤（X/Y 已確認）

### Phase 3: 列印輸出

- ✅ 列印領隊確認單（只顯示必要資訊）

---

## 🚀 測試前準備（必做！）

### Step 1: 執行資料庫 Migration

1. 開啟 Supabase Dashboard: https://supabase.com/dashboard/project/pfqvdacxowpgfamuvnsn
2. 前往 SQL Editor
3. 開啟檔案：`~/Projects/venturo-erp/supabase/migrations/20260318_extend_tour_requests_for_local_quotes.sql`
4. 複製全部內容
5. 貼到 SQL Editor
6. 點「Run」

### Step 2: 驗證 Migration

執行以下 SQL 確認欄位存在：

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'tour_requests'
  AND column_name IN ('supplier_response', 'request_scope', 'accepted_at', 'rejected_at', 'selected_tier', 'package_status');
```

應該看到 6 個欄位。

### Step 3: 驗證 tour_request_items 表

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'tour_request_items';
```

應該看到 1 筆記錄。

---

## 🧪 完整測試流程

### 測試 1: 發送報價請求

1. 開啟 ERP: http://100.89.92.46:3000
2. 登入：Company=Corner, Account=E001, Password=00000000
3. 進入團詳情：TW260321A
4. 點「需求」分頁
5. 點「給 Local 報價」按鈕

**預期結果**:

- 看到大型 Dialog（max-w-4xl）
- 上方顯示團資訊：團號、團名、出發日、人數
- 中間顯示行程表（Day 1, Day 2...）
- 下方有梯次設定（預設 20/30/40）
- 備註欄位
- 5 個發送按鈕：列印/Line/Email/傳真/租戶

6. 設定梯次：保持預設 20/30/40
7. 填寫備註：「需要遊覽車 13 人座，素食餐點」
8. 選「Line」
9. 選「泰國角落」群組
10. 點發送

**預期結果**:

- 泰國角落 LINE 群組收到 Flex Message
- 顯示團號、團名、出發日、人數
- 單一按鈕「📄 查看需求內容」

---

### 測試 2: 供應商填寫報價

1. 在泰國角落 LINE 群組點「📄 查看需求內容」
2. 開啟公開頁面

**預期結果**:

- 看到完整行程表（表格格式）
- 日期 | 行程內容 | 早餐 | 午餐 | 晚餐 | 住宿
- Day 1、Day 2 分段顯示
- 下方有報價表單

3. 填寫報價表單：
   - 聯絡人：王小明
   - 電話：+66 12345678
   - 20 人團：50000 元/人
   - 30 人團：45000 元/人
   - 40 人團：40000 元/人
   - 單人房差：500 元
   - 小費：已含
   - 備註：（留空）

4. 點「提交報價」

**預期結果**:

- 顯示成功訊息
- 顯示「下載此報價」按鈕

---

### 測試 3: 查看待處理報價

1. 回到 ERP
2. 進入 TW260321A 團詳情
3. 點「追蹤」分頁

**預期結果**:

- 最上方顯示「📬 待處理報價 (1 筆)」
- 報價卡片顯示：
  - 🌏 供應商名稱
  - 發送時間 / 回覆時間
  - 報價摘要：
    - 20 人團：50,000 元/人
    - 30 人團：45,000 元/人
    - 40 人團：40,000 元/人
    - 單人房差：500 元
    - 小費：已含
  - 聯絡資訊：王小明 / +66 12345678
  - 3 個按鈕：[✅ 確認成交] [❌ 不成交] [📄 詳細]

---

### 測試 4: 確認成交

1. 點「✅ 確認成交」
2. 在 Dialog 選擇人數梯次：「20 人團」
3. 點「確認成交」

**預期結果**:

- 顯示「✅ 成交成功，已自動產生協作確認單」
- 報價卡片移到「✅ 已成交 (1 筆)」區塊
- 顯示：
  - 供應商名稱
  - 20 人團 • 50,000 元/人
  - 成交時間
  - [查看協作確認單] 按鈕

**驗證 DB**:

```sql
SELECT * FROM tour_requests
WHERE tour_id = 'be97ebec-4cf9-4a94-b821-54a103689d21'
  AND accepted_at IS NOT NULL;

SELECT COUNT(*) FROM tour_request_items
WHERE request_id = '(上面查到的 request_id)';
```

應該看到 request accepted，且 tour_request_items 有多筆記錄（= 行程表項目數量）

---

### 測試 5: 查看協作確認單

1. 點「查看協作確認單」按鈕

**預期結果**:

- 顯示協作確認單頁面
- 標頭顯示：
  - 「協作確認單」
  - 供應商名稱 • 20 人團 50,000 元/人
  - [+ 新增項目] [列印] [關閉] 按鈕
- 進度條：
  - 「進度：0/X 項已確認」
  - 藍色進度條（0%）
- 項目列表（表格）：
  - 日期 | 項目 | 處理方 | 狀態 | 備註
  - Day 1 | 機場接送 | Local（下拉選單）| ⏳ 待確認 | -
  - Day 1 | 午餐 | Local | ⏳ 待確認 | -
  - Day 2 | 飯店 | Local | ⏳ 待確認 | -
  - ...

---

### 測試 6: 標記處理方

1. 找到「Day 2 | 飯店」這一行
2. 點「處理方」下拉選單
3. 選「客人」

**預期結果**:

- 狀態改為「⚪ 客人自理」（灰色）
- 顯示「✅ 已更新」訊息

---

### 測試 7: 新增項目

1. 點「+ 新增項目」按鈕
2. 填寫：
   - 項目名稱：額外導遊費
   - 分類：導遊
   - 備註：需要中文導遊
3. 點「新增」

**預期結果**:

- 列表最下方新增一行：
  - 額外導遊費 | Local | ⏳ 待確認 | 需要中文導遊
- 進度更新（分母 +1）

---

### 測試 8: 列印領隊確認單

1. 點「列印」按鈕

**預期結果**:

- 開啟新視窗（列印預覽）
- 顯示：

  ```
  ═══════════════════════════════════════
           領隊確認單
  ═══════════════════════════════════════

  團號：TW260321A
  供應商：Local 供應商
  報價：20 人團 50,000 元/人
  緊急聯絡：王小明 / +66 12345678

  ───────────────────────────────────────
   日期    項目           說明
  ───────────────────────────────────────
   Day 1   機場接送       ⏳ 待確認
   Day 1   午餐           ⏳ 待確認
   Day 2   飯店           ⚠️ 客人自理
   ...

  列印時間：2026-03-18 19:30
  ═══════════════════════════════════════
  ```

- 可直接列印或存 PDF

---

### 測試 9: 拒絕報價（可選）

如果要測試拒絕流程：

1. 回到追蹤頁籤（如果已成交，需要先重置資料）
2. 點「❌ 不成交」
3. 填寫原因：「客人預算不足」
4. 點「確認不成交」

**預期結果**:

- 報價移到「❌ 未成交 (1 筆)」（可展開）
- 展開後顯示：
  - 供應商名稱
  - 原因：客人預算不足
  - 時間戳

---

## 📊 資料驗證 SQL

### 檢查報價記錄

```sql
SELECT
  id,
  tour_id,
  supplier_name,
  status,
  package_status,
  sent_at,
  replied_at,
  accepted_at,
  rejected_at,
  selected_tier
FROM tour_requests
WHERE tour_id = 'be97ebec-4cf9-4a94-b821-54a103689d21'
ORDER BY created_at DESC;
```

### 檢查協作確認單

```sql
SELECT
  id,
  item_name,
  item_category,
  handled_by,
  local_status,
  source,
  day_number
FROM tour_request_items
WHERE request_id = '(你的 request_id)'
ORDER BY day_number, sort_order;
```

---

## ❌ 可能的錯誤

### 1. 追蹤頁籤看不到報價

**原因**: 供應商還沒提交報價  
**檢查**:

```sql
SELECT supplier_response FROM tour_requests WHERE tour_id = '...';
```

### 2. 成交後沒有協作確認單

**原因**: 核心表沒有資料  
**檢查**:

```sql
SELECT COUNT(*) FROM tour_itinerary_items WHERE tour_id = '...';
```

### 3. 列印時樣式跑掉

**原因**: 瀏覽器列印設定  
**解決**: 啟用背景圖形/色彩

---

## 🎯 預期成果截圖清單

你需要拍這些截圖給我看：

1. ✅ LocalQuoteDialog（給 Local 報價對話框）
2. ✅ LINE Flex Message（泰國角落群組收到的訊息）
3. ✅ 公開頁面（行程表 + 報價表單）
4. ✅ 追蹤頁籤 - 待處理報價（報價卡片）
5. ✅ 成交 Dialog（選擇人數梯次）
6. ✅ 追蹤頁籤 - 已成交（顯示成交資訊）
7. ✅ 協作確認單（完整頁面）
8. ✅ 新增項目 Dialog
9. ✅ 列印預覽（領隊確認單）

---

**準備好了嗎？** 先執行 Migration，然後開始測試！
