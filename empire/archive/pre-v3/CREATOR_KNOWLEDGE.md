# 創世神的完整知識體系

**創世神**：馬修（Matthew）  
**主神**：William  
**世界**：Venturo ERP  
**使命**：知道每一片樹葉的由來

---

## 📖 閱讀指南

這不是一般的技術文檔。

**這是創世神的筆記本**，記錄這個世界的每一個細節：
- 為什麼這個欄位存在？
- 為什麼這個按鈕在這裡？
- 為什麼資料這樣流動？
- 為什麼邏輯這樣設計？

**主神（William）知道遊戲規則。**  
**創世神（Matthew）知道為什麼有這些規則。**

---

## 🌳 第一片樹葉：核心表（tour_itinerary_items）

### **這片樹葉的由來**

**問題**：旅行社的資料到處都是。
- 行程表一份資料
- 報價單又一份資料
- 需求單又一份資料
- 確認單又一份資料
- 結帳單又一份資料

**結果**：資料不同步、重複輸入、容易出錯。

**解決**：**一個行程項目，一生只有一筆資料。**

從行程規劃到結帳，所有階段的資訊都記錄在同一個 row。

---

### **樹葉的結構（54 個欄位）**

#### **根部（基本資訊）**
```sql
id UUID                      -- 這片樹葉的身份證
tour_id UUID                 -- 屬於哪棵樹（哪個團）
itinerary_id UUID            -- 來自哪個行程表（可選）
workspace_id UUID            -- 在哪個森林（哪個公司）
```

#### **主幹（行程資訊）**
```sql
day_number INT               -- 第幾天（旅程的時間軸）
sort_order INT               -- 同一天的排序
category TEXT                -- 大分類（meals/accommodation/activities）
sub_category TEXT            -- 小分類（breakfast/lunch/dinner）
title TEXT                   -- 項目名稱（一蘭拉麵、君悅飯店）
description TEXT             -- 詳細說明
```

**為什麼有 category 和 sub_category？**
- category：方便分組顯示（報價單的 7 個分類）
- sub_category：更細緻的分類（早午晚餐、房型）

**為什麼有 day_number 和 sort_order？**
- day_number：按天分組
- sort_order：同一天內的順序（早餐 → 景點 → 午餐 → 景點 → 晚餐 → 飯店）

#### **枝葉（服務資訊）**
```sql
service_date DATE            -- 服務日期（開始）
service_date_end DATE        -- 服務日期（結束，住宿用）
resource_type TEXT           -- 資源類型（restaurant/hotel/attraction）
resource_id UUID             -- 資源 ID（關聯到 restaurants/hotels/attractions）
resource_name TEXT           -- 資源名稱快照
latitude DECIMAL             -- 緯度
longitude DECIMAL            -- 經度
google_maps_url TEXT         -- Google Maps 連結
```

**為什麼有 resource_type 和 resource_id？**
- 可以 JOIN 到 restaurants/hotels/attractions 表
- 取得地址、電話、傳真等完整資料
- 需求單產生時自動帶入

**為什麼有 resource_name 快照？**
- 避免供應商改名後，歷史資料看不到原本的名稱
- 快照當時的狀態

#### **第一次開花（報價階段）**
```sql
-- 報價欄位（業務在報價單填寫）
unit_price DECIMAL           -- 單價
quantity INT                 -- 數量（餐廳=1, 住宿=幾人房）
total_cost DECIMAL           -- 小計
currency TEXT                -- 幣別（預設 TWD）
pricing_type TEXT            -- 計價方式
adult_price DECIMAL          -- 成人價
child_price DECIMAL          -- 兒童價
infant_price DECIMAL         -- 嬰兒價
quote_note TEXT              -- 報價備註
quote_item_id UUID           -- 關聯到 quotes 表的項目（舊系統，逐步淘汰）
```

**為什麼 quantity 在餐廳是 1，在住宿是幾人房？**
- 餐廳：報價單是「個人分攤」，$1000/人，quantity 固定=1
- 住宿：報價單是「房間價格」，$3500/2人房，quantity=2
- 計算個人成本時：
  - 餐廳：直接用 unit_price（因為 quantity=1）
  - 住宿：unit_price ÷ quantity = 個人分攤

**為什麼有 adult_price, child_price, infant_price？**
- 有些項目（機票、門票）成人兒童嬰兒價格不同
- 餐廳通常只有 unit_price（全部一樣）
- 住宿可能有 child_price（兒童不佔床）

**quote_status 狀態機：**
```
none → drafted → quoted → confirmed
```

#### **第二次開花（需求單階段）**
```sql
-- 需求單欄位
supplier_id UUID             -- 供應商 ID
supplier_name TEXT           -- 供應商名稱快照
request_id UUID              -- 需求單 ID（可能不需要）
request_status TEXT          -- 需求單狀態
request_sent_at TIMESTAMP    -- 發送時間
request_reply_at TIMESTAMP   -- 回覆時間
reply_content JSONB          -- 回覆內容
reply_cost DECIMAL           -- 回覆價格
estimated_cost DECIMAL       -- 預估成本
quoted_cost DECIMAL          -- 供應商報價
```

**為什麼要記錄 supplier_id 和 supplier_name？**
- supplier_id：可以 JOIN 到 suppliers 表
- supplier_name：快照（避免供應商改名）

**request_status 狀態機：**
```
none → sent → replied → confirmed → cancelled
```

**為什麼有 estimated_cost 和 quoted_cost？**
- estimated_cost：業務預估（報價單填的）
- quoted_cost：供應商實際報價（可能不同）
- 如果不同，系統會提醒

#### **第三次開花（確認單階段）**
```sql
-- 確認單欄位
confirmation_item_id UUID    -- 確認單項目 ID
confirmed_cost DECIMAL       -- 確認價格（最終定案）
booking_reference TEXT       -- 訂位代碼
booking_status TEXT          -- 訂位狀態
confirmation_date DATE       -- 確認日期
confirmation_note TEXT       -- 確認備註
```

**confirmation_status 狀態機：**
```
none → pending → confirmed
```

#### **結果（結帳階段）**
```sql
-- 結帳欄位（領隊回填）
actual_expense DECIMAL       -- 實際費用
expense_note TEXT            -- 費用備註
expense_at TIMESTAMP         -- 費用發生時間
receipt_images TEXT[]        -- 收據圖片（陣列）
```

**leader_status 狀態機：**
```
none → filled → reviewed
```

**為什麼要 actual_expense？**
- 預算是預算，實際可能不同
- 領隊現場可能加點、升級房型
- 記錄實際費用才能算真實毛利

#### **顯示控制**
```sql
show_on_web BOOLEAN          -- 顯示在官網行程
show_on_brochure BOOLEAN     -- 顯示在 DM 文宣
```

**為什麼需要這兩個欄位？**
- 有些項目不想給客戶看（司機餐、領隊房）
- 有些項目只給內部用（成本項目）

#### **元資料**
```sql
created_at TIMESTAMP
updated_at TIMESTAMP
created_by UUID
updated_by UUID
```

---

### **樹葉的一生（狀態流轉）**

```
[誕生] 行程表建立
  ↓ 填寫基本資訊
  category, sub_category, title, day_number
  quote_status = 'none'
  request_status = 'none'
  
[成長] 報價單填價格
  ↓ 業務填寫
  unit_price, quantity, adult_price
  quote_status = 'drafted' → 'quoted'
  
[開花] 需求單發送
  ↓ 助理產生 PDF
  request_status = 'sent'
  request_sent_at = now()
  
[授粉] 供應商回覆
  ↓ 供應商填寫
  quoted_cost, reply_content
  request_status = 'replied'
  request_reply_at = now()
  
[結果] 確認定案
  ↓ 業務確認
  confirmed_cost = quoted_cost
  confirmation_status = 'confirmed'
  
[收成] 領隊回填
  ↓ 領隊現場填寫
  actual_expense, receipt_images
  leader_status = 'filled'
```

---

## 🌲 第二棵樹：報價單系統

### **這棵樹的由來**

**問題**：業務要算每個人要付多少錢。

**需求**：
- 看到所有成本項目
- 依分類分組（交通、住宿、餐食...）
- 填寫價格
- 自動計算個人成本
- 算出報價（成本 + 毛利）

**解決**：從核心表讀取 → 轉換成報價單格式 → 填寫價格 → 寫回核心表

---

### **樹的結構（組件樹）**

```
QuotesPage ([id]/page.tsx)
  ├─ QuoteHeader
  │   ├─ 團號、團名、人數
  │   ├─ 儲存按鈕
  │   └─ 產生報價單按鈕
  │
  ├─ CategorySection (7 個分類)
  │   ├─ transport（交通）
  │   ├─ group-transport（團體分攤）
  │   ├─ accommodation（住宿）
  │   ├─ meals（餐食）
  │   ├─ activities（活動）
  │   ├─ others（其他）
  │   └─ guide（領隊導遊）
  │
  │   每個 CategorySection：
  │     ├─ 分類標題
  │     ├─ 新增按鈕
  │     ├─ CostItemRow（項目列表）
  │     │   ├─ 項目名稱
  │     │   ├─ 數量（某些分類隱藏）
  │     │   ├─ 單價
  │     │   ├─ 小計（自動計算）
  │     │   ├─ 備註
  │     │   └─ 操作按鈕
  │     └─ 分類小計
  │
  └─ SellingPriceSection
      ├─ 人數設定
      ├─ 成本計算
      ├─ 報價設定
      └─ 毛利顯示
```

---

### **樹根（資料讀取）**

#### **coreItemsToCostCategories()**

**位置**：`src/features/quotes/utils/core-table-adapter.ts`

**職責**：把核心表的項目轉換成報價單格式

**流程**：
```typescript
1. 從核心表讀取：tour_itinerary_items
   ↓
2. 去重：deduplicateCoreItems()
   - 移除 syncItineraryToQuote 產生的重複項目
   ↓
3. 按 category 分組到 7 個分類
   ↓
4. 映射欄位：
   - title → name
   - unit_price → unit_price
   - quantity → quantity
   - total_cost → total
   - quote_note → note
   ↓
5. 特殊處理：
   - 住宿：sub_category → room_type
   - 住宿：自動標記續住（is_same_as_previous）
   - 團體分攤：is_group_cost = true
   ↓
6. 計算分類 total
   ↓
7. 回傳 7 個 CostCategory[]
```

**為什麼要去重？**
- syncItineraryToQuote 會把行程表項目寫入 quote.categories
- 之後 writePricingToCore 又把這些項目插入核心表
- 造成重複（格式化名稱 vs 原始名稱）
- 需要過濾掉格式化名稱的項目

---

### **樹幹（顯示邏輯）**

#### **CategorySection.tsx**

**為什麼有 7 個分類？**
```typescript
const CATEGORIES = [
  { id: 'transport', label: '交通' },
  { id: 'group-transport', label: '團體分攤' },
  { id: 'accommodation', label: '住宿' },
  { id: 'meals', label: '餐食' },
  { id: 'activities', label: '活動' },
  { id: 'others', label: '其他' },
  { id: 'guide', label: '領隊導遊' },
]
```

**為什麼要分這麼細？**
- 不同分類，計算邏輯不同
- 交通：可能有成人/兒童票價
- 團體分攤：Local 報價（階梯報價）
- 住宿：需要房型、續住
- 餐食：需要早午晚分類
- 活動：門票、體驗
- 領隊導遊：團體分攤成本

---

#### **CostItemRow.tsx**

**為什麼餐廳/活動隱藏數量欄位？**
```typescript
const hideQuantity = categoryId === 'meals' || categoryId === 'activities'
```

**原因**：
- 報價單是「個人分攤金額」
- 餐廳：$1000/人（quantity 固定=1，不需要顯示）
- 活動：$500/人（quantity 固定=1，不需要顯示）
- 住宿：$3500/2人房（quantity=2，需要顯示）

**為什麼 Local 報價禁止直接編輯？**
```typescript
const isLocalPricing = item.name?.includes('Local 報價')

<CalcInput
  disabled={isLocalPricing}
  title="請點擊「Local 報價」按鈕修改"
/>
```

**原因**：
- Local 報價是階梯報價
- 直接編輯會破壞階梯邏輯
- 必須透過 LocalPricingDialog 修改

---

### **枝葉（計算邏輯）**

#### **useQuoteCalculations.ts**

**個人成本計算：**
```typescript
成人成本 = 
  Σ(交通 adult_price || unit_price) +
  Σ(住宿 unit_price ÷ quantity) +
  Σ(餐食 unit_price) +  // quantity=1
  Σ(活動 unit_price) +  // quantity=1
  Σ(團體分攤 total ÷ 總人數) +
  Σ(其他 unit_price)
```

**為什麼住宿要 ÷ quantity？**
- 報價單填的是「房間價格」
- 要算「個人分攤」
- $3500/2人房 → $1750/人

**為什麼團體分攤要 ÷ 總人數？**
- 團體分攤是「全團共同分擔」
- Local 車費、領隊導遊費
- 平均分攤到每個人

---

### **果實（寫回核心表）**

#### **writePricingToCore()**

**位置**：`src/features/quotes/utils/core-table-adapter.ts`

**職責**：把報價單的修改寫回核心表

**流程**：
```typescript
1. 遍歷所有 categories
   ↓
2. 每個 item：
   - 有 itinerary_item_id？
     → UPDATE 核心表（更新報價欄位）
   - 沒有 itinerary_item_id？
     → INSERT 核心表（新增項目）
   ↓
3. 核心表有但報價單沒有？
   → 清除報價欄位（或 DELETE，取決於設計）
   ↓
4. 回傳結果
```

**為什麼要區分 UPDATE 和 INSERT？**
- 從行程表來的項目：有 itinerary_item_id → UPDATE
- 報價單新增的項目：沒有 itinerary_item_id → INSERT

---

## 🌿 第三棵樹：需求單系統

### **這棵樹的由來**

**問題**：要跟供應商訂位。

**需求**：
- 看到要訂什麼（餐廳、飯店、景點）
- 知道預算多少
- 知道總人數
- 產生 PDF 發給供應商

**解決**：從核心表 JOIN 讀取 → 產生 PDF → 更新狀態

---

### **樹的結構**

```
RequirementsList.tsx
  ├─ 需求總覽表格
  │   ├─ 日期
  │   ├─ 供應商
  │   ├─ 項目說明
  │   ├─ 報價
  │   ├─ 成本
  │   ├─ 狀態
  │   └─ 操作
  │       └─ 列印需求單按鈕
  │
  └─ CoreTableRequestDialog
      ├─ 供應商資訊
      ├─ 團體資訊
      ├─ 需求項目列表
      ├─ 提示
      └─ 列印按鈕
```

---

### **樹根（資料讀取）**

#### **useCoreRequestItems()**

**位置**：`src/features/tours/hooks/useCoreRequestItems.ts`

**職責**：從核心表讀取需求單資料

**SQL**：
```sql
SELECT 
  tour_itinerary_items.*,
  restaurants.id, restaurants.name, restaurants.address, 
    restaurants.phone, restaurants.fax,
  hotels.id, hotels.name, hotels.address,
    hotels.phone, hotels.fax,
  attractions.id, attractions.name, attractions.address,
    attractions.phone
FROM tour_itinerary_items
LEFT JOIN restaurants ON 
  resource_type = 'restaurant' AND resource_id = restaurants.id
LEFT JOIN hotels ON
  resource_type = 'hotel' AND resource_id = hotels.id
LEFT JOIN attractions ON
  resource_type = 'attraction' AND resource_id = attractions.id
WHERE tour_id = ? 
  AND supplier_id = ?
  AND quote_status = 'quoted'
ORDER BY day_number, sort_order
```

**為什麼要 JOIN 三個表？**
- 需求單需要顯示地址、電話
- 核心表只存 resource_id
- 透過 JOIN 取得完整資料

**為什麼只抓 quote_status = 'quoted'？**
- 只有已報價的項目才需要產生需求單
- 避免顯示還沒填價格的項目

---

#### **useTotalPax()**

**職責**：從訂單讀取總人數

**SQL**：
```sql
SELECT adult, child_with_bed, child_no_bed, infant
FROM orders
WHERE tour_id = ?
  AND status IN ('confirmed', 'paid')
```

**為什麼只抓 confirmed 和 paid？**
- 只計算已確認的訂單
- 避免草稿訂單影響總人數

**計算邏輯**：
```typescript
總人數 = Σ(adult + child_with_bed + child_no_bed + infant)
```

---

### **果實（PDF 產生）**

#### **generatePrintHtml()**

**位置**：`CoreTableRequestDialog.tsx`

**產生的 PDF 內容**：
```html
<h1>餐廳需求單</h1>

<div class="info-grid">
  <div>我方資訊</div>
  <div>供應商資訊（從 JOIN 取得）</div>
</div>

<div>團體資訊（總人數自動帶入）</div>

<table>
  <tr>
    <th>日期</th>
    <th>項目</th>
    <th>預算（/人）</th>
    <th>桌數</th>  <!-- 空白，助理填 -->
    <th>備註</th>
  </tr>
  <!-- 每個項目一列 -->
</table>
```

**為什麼桌數/房間數是空白？**
- 需求單只提供參考資料
- 實際桌數由助理根據餐廳狀況決定
- 可能 10人一桌，也可能 8人一桌

---

### **種子（狀態更新）**

**更新核心表**：
```typescript
await supabase
  .from('tour_itinerary_items')
  .update({
    request_status: 'sent',
    request_sent_at: new Date().toISOString(),
  })
  .in('id', coreItemIds)
```

**為什麼更新核心表，不存到 tour_requests？**
- 核心表是唯一真相來源
- 需求單狀態記錄在核心表
- tour_requests 可能用來存其他資訊（待確認）

---

## 🌍 森林（整個世界的資料流向）

```
[開始] 行程表
  ↓ 業務選餐廳/飯店/景點
  tour_itinerary_items.INSERT({
    title: '一蘭拉麵',
    category: 'meals',
    day_number: 1
  })
  
[第一階段] 報價單
  ↓ 從核心表讀取
  coreItemsToCostCategories()
  ↓ 業務填寫價格
  ↓ 寫回核心表
  tour_itinerary_items.UPDATE({
    unit_price: 1000,
    quantity: 1,
    quote_status: 'quoted'
  })
  
[第二階段] 需求單
  ↓ 從核心表 JOIN 讀取
  useCoreRequestItems()
  ↓ 產生 PDF
  ↓ 更新核心表狀態
  tour_itinerary_items.UPDATE({
    request_status: 'sent',
    request_sent_at: now()
  })
  
[第三階段] 供應商回覆
  ↓ 供應商填寫確認價格
  tour_itinerary_items.UPDATE({
    quoted_cost: 1100,
    request_status: 'replied',
    request_reply_at: now()
  })
  
[第四階段] 確認單
  ↓ 業務確認價格
  tour_itinerary_items.UPDATE({
    confirmed_cost: 1100,
    confirmation_status: 'confirmed'
  })
  
[第五階段] 領隊回填
  ↓ 領隊填寫實際費用
  tour_itinerary_items.UPDATE({
    actual_expense: 1150,
    leader_status: 'filled',
    expense_at: now()
  })
  
[結束] 結帳完成
```

---

## 🔮 創世神的洞察

### **為什麼要核心表？**

**如果沒有核心表會怎樣？**
```
行程表：
  - itinerary_items (title, description)

報價單：
  - quote_items (name, price, quantity)
  
需求單：
  - request_items (name, supplier, quantity)
  
確認單：
  - confirmation_items (name, confirmed_price)
  
結帳單：
  - expense_items (name, actual_cost)
```

**問題**：
- 5 個地方都要輸入「一蘭拉麵」
- 行程改了，報價單要手動改
- 報價改了，需求單要手動改
- 資料不同步、容易出錯

**核心表的智慧**：
```
tour_itinerary_items (唯一一筆)
  - 行程階段：title='一蘭拉麵'
  - 報價階段：unit_price=1000
  - 需求階段：request_status='sent'
  - 確認階段：confirmed_cost=1100
  - 結帳階段：actual_expense=1150
```

**好處**：
- 只輸入一次
- 改一個地方，全部同步
- 不會不一致
- 完整的歷史軌跡

---

### **為什麼報價單是個人分攤？**

**業務的需求**：算每個人要付多少錢

**如果報價單填「桌數」會怎樣？**
```
一蘭拉麵：
  - 3 桌
  - 每桌 $10,000
  - 總共 $30,000

問：每個人要付多少？
答：$30,000 ÷ 30人 = $1,000/人
```

**這樣就要多一步計算。**

**直接填個人分攤**：
```
一蘭拉麵：
  - $1,000/人
  - 30 人
  - 總共 $30,000
```

**更直接、更清楚。**

---

### **為什麼需求單的桌數不自動計算？**

**表面上看**：
```
30 人 ÷ 10 人/桌 = 3 桌（自動計算）
```

**實際狀況**：
- 餐廳可能只有 8 人桌 → 需要 4 桌
- 餐廳可能有包廂 → 需要特殊安排
- 可能要分男女桌
- 可能要分家庭桌

**助理最清楚狀況，讓助理決定。**

---

## 📚 待探索的樹葉

- [ ] 確認單系統的完整邏輯
- [ ] 結帳單系統的完整邏輯
- [ ] 訂單系統的完整邏輯
- [ ] 收款系統的完整邏輯
- [ ] 請款系統的完整邏輯
- [ ] 代收轉付的完整邏輯
- [ ] 供應商系統的完整邏輯
- [ ] 行程表編輯器的完整邏輯
- [ ] 每個按鈕的詳細行為
- [ ] 每個欄位的驗證規則
- [ ] 每個錯誤的處理機制
- [ ] 每個效能的優化技巧

---

**創世神的使命：知道每一片樹葉的由來。**  
**這只是開始。**

---

**最後更新**：2026-03-14  
**創世神**：馬修（Matthew）
