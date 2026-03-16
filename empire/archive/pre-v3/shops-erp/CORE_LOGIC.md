# 🧠 核心邏輯總覽

**更新時間**：2026-03-14  
**目的**：整理 Venturo ERP 的核心運作邏輯

---

## 📖 這份文檔的用途

**給開發者看的核心邏輯手冊。**

不是索引、不是清單、不是地圖。  
這是「**為什麼這樣運作**」的完整說明。

---

## 🎯 核心概念（必須理解）

### 概念 1：單一真相來源（Single Source of Truth）

```
傳統做法（錯誤）：
  行程表有一份資料
  報價單有一份資料
  需求單有一份資料
  確認單有一份資料
  結帳單有一份資料
  
  問題：5 份資料要同步，容易不一致

Venturo 做法（正確）：
  tour_itinerary_items = 唯一一份資料
  
  行程表：寫入核心表
  報價單：讀取 + 更新核心表
  需求單：JOIN 讀取核心表
  確認單：更新核心表狀態
  結帳單：更新核心表費用
  
  好處：只有一份資料，永遠同步
```

---

### 概念 2：狀態機（State Machine）

每個行程項目有 4 個獨立的狀態：

```typescript
quote_status: 
  none → drafted → quoted → confirmed
  
request_status:
  none → sent → replied → confirmed → cancelled
  
confirmation_status:
  none → pending → confirmed
  
leader_status:
  none → filled → reviewed
```

**為什麼要分開？**
- 報價可能完成，需求單還沒發
- 需求單可能發了，確認單還沒做
- 確認單可能做了，領隊還沒回填

**各自獨立，互不干擾。**

---

### 概念 3：雙模式設計（Dual Mode）

```typescript
// 模式 1：資料庫參照（推薦）
resource_type: 'restaurant'
resource_id: 'uuid-123'
title: '一蘭拉麵'  // 快照

// 模式 2：純文字輸入（備用）
resource_type: null
resource_id: null
title: '待定餐廳'
description: '預計日式料理'
```

**為什麼需要兩種模式？**
- 已知餐廳：用資料庫參照（可以 JOIN 取地址電話）
- 未知餐廳：用文字輸入（之後再補）

**漸進式升級：**
```
文字 → 選擇餐廳 → 自動轉換成資料庫參照
```

---

### 概念 4：個人分攤計算

```
報價單不是「總價」，是「每個人要付多少」。

餐廳範例：
  一蘭拉麵 $1,000/人
  30 人
  → 總共 $30,000
  
  unit_price = 1000
  quantity = 1  // 固定
  
住宿範例：
  君悅飯店 $3,500/2人房
  30 人 = 15 間房
  → 總共 $52,500
  
  unit_price = 3500
  quantity = 2  // 幾人房
  
  個人分攤 = 3500 ÷ 2 = $1,750/人
  
Local 報價範例：
  10人 $5,000/人
  20人 $4,000/人
  30人 $3,333/人
  
  自動判斷適用階梯
  30人 → 適用 $3,333/人
```

**為什麼這樣設計？**
- 業務要算「每個人付多少」
- 直接填個人分攤，不用再算一次
- 報價單看起來更清楚

---

## 🔄 資料流向（完整生命週期）

### 階段 1：行程規劃

```
位置：/tours/[id] → 行程表 Tab
操作：選餐廳、選飯店、選景點

寫入核心表：
  INSERT INTO tour_itinerary_items (
    tour_id,
    day_number,
    category,
    sub_category,
    title,
    resource_type,
    resource_id
  )
  
狀態：
  quote_status = 'none'
  request_status = 'none'
```

---

### 階段 2：填寫報價

```
位置：/tours/[id] → 報價單 Tab
操作：填寫每個項目的價格

讀取核心表：
  coreItemsToCostCategories()
  → 從核心表讀取
  → 轉換成報價單格式
  → 顯示在 UI

填寫價格：
  餐廳：unit_price = 1000, quantity = 1
  住宿：unit_price = 3500, quantity = 2
  
寫回核心表：
  writePricingToCore()
  → UPDATE tour_itinerary_items
  SET unit_price = ?, quantity = ?
  WHERE id = ?
  
狀態更新：
  quote_status = 'drafted' → 'quoted'
```

---

### 階段 3：產生需求單

```
位置：/tours/[id] → 需求單 Tab
操作：選擇供應商 → 點擊「列印需求單」

讀取資料：
  useCoreRequestItems()
  → SELECT tour_itinerary_items.*,
           restaurants.address, restaurants.phone,
           hotels.address, hotels.phone
      FROM tour_itinerary_items
      LEFT JOIN restaurants ON ...
      LEFT JOIN hotels ON ...
      WHERE tour_id = ? AND supplier_id = ?
  
  useTotalPax()
  → SELECT SUM(adult + child + infant)
      FROM orders
      WHERE tour_id = ? AND status IN ('confirmed', 'paid')

產生 PDF：
  - 供應商資訊（從 JOIN 取得）
  - 團體資訊（總人數自動帶入）
  - 需求項目（預算/人、桌數空白）
  
更新狀態：
  UPDATE tour_itinerary_items
  SET request_status = 'sent',
      request_sent_at = now()
  WHERE id IN (...)
```

**為什麼桌數空白？**
- 助理要根據餐廳狀況決定
- 可能 10人一桌、8人一桌、包廂
- 不能自動計算

---

### 階段 4：供應商回覆

```
位置：/supplier/requests
操作：供應商填寫確認價格

更新核心表：
  UPDATE tour_itinerary_items
  SET quoted_cost = ?,
      request_status = 'replied',
      request_reply_at = now(),
      reply_content = ?
  WHERE id = ?
  
狀態更新：
  request_status = 'replied'
```

---

### 階段 5：確認訂單

```
位置：/tours/[id] → 確認單 Tab
操作：業務確認最終價格

同步核心表：
  syncConfirmationCreateToCore()
  → UPDATE tour_itinerary_items
  SET confirmed_cost = quoted_cost,
      confirmation_status = 'confirmed',
      booking_reference = ?,
      confirmation_date = ?
  WHERE id = ?
  
狀態更新：
  confirmation_status = 'confirmed'
```

---

### 階段 6：領隊回填

```
位置：/tours/[id] → 結帳單 Tab
操作：領隊填寫實際費用、上傳收據

同步核心表：
  syncLeaderExpenseToCore()
  → UPDATE tour_itinerary_items
  SET actual_expense = ?,
      expense_note = ?,
      receipt_images = ?,
      leader_status = 'filled',
      expense_at = now()
  WHERE id = ?
  
狀態更新：
  leader_status = 'filled'
```

---

## 🎮 核心功能邏輯

### 功能 1：報價單計算

```typescript
// 個人成本計算
成人成本 = 
  Σ(交通 adult_price || unit_price) +
  Σ(住宿 unit_price ÷ quantity) +
  Σ(餐食 unit_price) +
  Σ(活動 unit_price) +
  Σ(團體分攤 total ÷ 總人數) +
  Σ(其他 unit_price) +
  Σ(領隊導遊 total ÷ 總人數)

// 為什麼住宿要 ÷ quantity？
// 因為 unit_price 是「房間價格」
// 要算「個人分攤」
// $3500/2人房 → $1750/人

// 為什麼團體分攤要 ÷ 總人數？
// 因為是「全團共同分擔」
// Local 車費、領隊導遊費
// 平均分攤到每個人
```

---

### 功能 2：Local 報價階梯

```typescript
// 輸入階梯
階梯 = [
  { pax: 10, price: 5000 },
  { pax: 20, price: 4000 },
  { pax: 30, price: 3333 }
]

// 自動判斷適用階梯
總人數 = 25人

適用階梯 = 階梯.filter(t => 總人數 >= t.pax)
              .sort((a, b) => b.pax - a.pax)[0]
              
→ 20人階梯 $4,000/人（最接近且不超過）

// 多列顯示
每個階梯一列：
  「Local 報價 10人 $5,000」
  「Local 報價 20人 $4,000」✓ 目前適用
  「Local 報價 30人 $3,333」
```

---

### 功能 3：需求單自動帶入

```typescript
// JOIN 讀取完整資料
useCoreRequestItems() {
  從核心表讀取項目
    ↓ LEFT JOIN
  restaurants (address, phone, fax)
    ↓ LEFT JOIN
  hotels (address, phone, fax)
    ↓ LEFT JOIN
  attractions (address, phone)
    ↓
  回傳完整資料
}

// 自動帶入總人數
useTotalPax() {
  從訂單讀取
    ↓ WHERE status IN ('confirmed', 'paid')
  SUM(adult + child + infant)
    ↓
  回傳總人數
}

// 產生 PDF
generatePrintHtml() {
  供應商資訊（從 JOIN 取得）
  團體資訊（總人數自動帶入）
  需求項目列表（預算/人、桌數空白）
}
```

---

## 🚨 常見誤解（避免錯誤）

### 誤解 1：需求單要儲存資料

```
❌ 錯誤：
  需求單產生時，存到 tour_requests 表
  包含：餐廳名稱、地址、電話、預算
  
✅ 正確：
  需求單從核心表 JOIN 讀取
  tour_requests 只存「狀態」
  資料永遠從核心表讀取
  
原因：
  核心表是唯一真相來源
  避免資料重複、不同步
```

---

### 誤解 2：報價單是「總價」

```
❌ 錯誤：
  一蘭拉麵 $30,000（30人總共）
  君悅飯店 $52,500（15間房總共）
  
✅ 正確：
  一蘭拉麵 $1,000/人
  君悅飯店 $3,500/2人房
  
原因：
  業務要算「每個人付多少」
  直接填個人分攤更清楚
```

---

### 誤解 3：桌數可以自動計算

```
❌ 錯誤：
  30人 ÷ 10人/桌 = 3桌（自動）
  
✅ 正確：
  桌數空白，助理手動填
  
原因：
  餐廳可能只有 8人桌
  餐廳可能有包廂
  可能要分男女桌
  助理最清楚狀況
```

---

### 誤解 4：住宿 quantity 是人數

```
❌ 錯誤：
  君悅飯店 quantity = 30（總人數）
  
✅ 正確：
  君悅飯店 quantity = 2（幾人房）
  
原因：
  報價單填的是「房間價格」
  quantity = 幾人房
  個人分攤 = 房間價格 ÷ 幾人房
```

---

## 🔐 資料完整性規則

### 規則 1：核心表唯一寫入點

```
✅ 允許寫入核心表：
  - 行程表編輯器（新增項目）
  - 報價單（更新價格）
  - 確認單（更新確認價格）
  - 結帳單（更新實際費用）

❌ 不允許寫入核心表：
  - 需求單（只讀取）
  - 其他任何地方（除非有明確理由）
```

---

### 規則 2：狀態更新必須原子性

```typescript
// ✅ 正確：一次更新所有相關欄位
UPDATE tour_itinerary_items
SET request_status = 'sent',
    request_sent_at = now(),
    supplier_id = ?
WHERE id IN (...)

// ❌ 錯誤：分開更新
UPDATE ... SET request_status = 'sent'
UPDATE ... SET request_sent_at = now()  // 可能失敗
```

---

### 規則 3：JOIN 讀取，不複製

```typescript
// ✅ 正確：透過 JOIN 讀取
SELECT t.*, r.address, r.phone
FROM tour_itinerary_items t
LEFT JOIN restaurants r ON t.resource_id = r.id

// ❌ 錯誤：複製到核心表
ALTER TABLE tour_itinerary_items
ADD COLUMN restaurant_address TEXT  // 不要這樣做
```

---

## 🎯 設計原則（指導開發）

### 原則 1：先讀文檔，再寫程式

```
收到任務
  ↓
1. 讀相關文檔（CORE_LOGIC.md）
2. 搜向量庫（確認沒有遺漏）
3. 理解邏輯（為什麼這樣設計）
4. 果斷執行（不猜測、不揣摩）
```

---

### 原則 2：核心表是唯一真相

```
需要新資料？
  ↓
問：這個資料會變動嗎？
  ↓
會 → 加到核心表（tour_itinerary_items）
不會 → 加到參照表（restaurants/hotels）
```

---

### 原則 3：簡單勝過複雜

```
需要新功能？
  ↓
問：能用現有欄位嗎？
  ↓
能 → 用現有欄位
不能 → 加新欄位

問：能用 1 個表嗎？
  ↓
能 → 用 1 個表
不能 → 用多個表但要有明確理由
```

---

### 原則 4：聰明自動化 + 防呆

```
編輯資料時
  ↓
靜默同步（不打擾）

有風險變動
  ↓
警告提示（防錯誤）

例子：
  報價編輯中 → 靜默（不提示）
  需求單已發 → 變動要警告（避免錯誤）
```

---

## 📝 開發檢查清單

### 新增功能前

- [ ] 讀相關文檔
- [ ] 搜向量庫
- [ ] 理解核心邏輯
- [ ] 確認不違反原則

### 修改資料結構前

- [ ] 確認是核心表還是參照表
- [ ] 確認不重複現有欄位
- [ ] 確認不違反單一真相來源

### 寫入核心表前

- [ ] 確認是允許的寫入點
- [ ] 確認狀態更新原子性
- [ ] 確認不影響其他功能

### 新增 JOIN 查詢前

- [ ] 確認不能用現有查詢
- [ ] 確認效能影響
- [ ] 確認索引是否需要

---

## 🎓 進階理解

### 為什麼不用 ORM？

```
現狀：直接用 Supabase Client
  ↓
優點：
  - 直接看到 SQL 邏輯
  - 效能可控
  - JOIN 查詢靈活
  
缺點：
  - 型別安全靠手動維護
  - 沒有自動 migration
  
結論：
  目前階段，直接用 SQL 更清楚
  未來可考慮 Prisma/Drizzle
```

---

### 為什麼分這麼多狀態？

```
如果只有一個 status：
  - 'draft'
  - 'quoted'
  - 'sent'
  - 'confirmed'
  - 'paid'
  
問題：
  報價完成，需求單還沒發 → 卡住
  需求單發了，確認單還沒做 → 卡住
  
解決：
  quote_status（報價流程）
  request_status（需求單流程）
  confirmation_status（確認流程）
  leader_status（結帳流程）
  
  各自獨立，互不干擾
```

---

### 為什麼不用 GraphQL？

```
現狀：REST API + RPC
  ↓
優點：
  - Supabase 原生支援
  - PostgREST 效能好
  - RLS 安全性高
  
缺點：
  - 複雜查詢要多次請求
  - Over-fetching
  
結論：
  目前階段，REST 夠用
  未來可考慮 GraphQL
```

---

## 🔮 未來可能的改進

- [ ] 引入 Prisma（型別安全）
- [ ] 引入 tRPC（端到端型別）
- [ ] 更完善的錯誤處理
- [ ] 更細緻的權限控制
- [ ] 審計日誌（audit log）
- [ ] 樂觀鎖定（optimistic locking）

---

**更新時間**：2026-03-14  
**創世神**：馬修（Matthew）  
**主神**：William

**理解核心邏輯，開發不再迷惘。** 🧠
