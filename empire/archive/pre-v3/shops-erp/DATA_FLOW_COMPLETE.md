# 🌊 資料流向完整地圖

**用途**：看懂每一筆資料怎麼流動

---

## 🎯 核心表資料流（唯一真相來源）

```
tour_itinerary_items（核心表）
         ↑
         │ 寫入點（唯一）
         │
    行程表編輯器
         │
    ┌────┴────┬────────┬────────┬────────┐
    ↓         ↓        ↓        ↓        ↓
  報價單   需求單   確認單   結帳單   其他功能
   │         │        │        │        │
   └─────────┴────────┴────────┴────────┘
              ↓
         讀取 + 更新狀態
```

**鐵律**：
- 只有行程表編輯器可以新增項目
- 其他功能只能讀取 + 更新狀態
- 絕對不重複儲存資料

---

## 📊 完整生命週期資料流

### Stage 1：行程規劃

```
業務操作：
  /tours/[id] → 行程表 Tab
  選餐廳：一蘭拉麵
  選飯店：君悅飯店
  選景點：清水寺

↓ 寫入核心表

tour_itinerary_items
  INSERT {
    tour_id: 'xxx',
    day_number: 1,
    category: 'meals',
    sub_category: 'lunch',
    title: '一蘭拉麵',
    resource_type: 'restaurant',
    resource_id: 'restaurant-uuid',
    quote_status: 'none',
    request_status: 'none',
    confirmation_status: 'none',
    leader_status: 'none'
  }
```

---

### Stage 2：填寫報價

```
業務操作：
  /tours/[id] → 報價單 Tab
  
讀取核心表：
  coreItemsToCostCategories()
    → SELECT * FROM tour_itinerary_items
    → WHERE tour_id = ?
    → 轉換成報價單格式

填寫價格：
  一蘭拉麵：$1,000/人
  君悅飯店：$3,500/2人房

↓ 寫回核心表

tour_itinerary_items
  UPDATE {
    unit_price: 1000,
    quantity: 1,
    quote_status: 'quoted'
  }
  WHERE id = '一蘭拉麵-uuid'
  
  UPDATE {
    unit_price: 3500,
    quantity: 2,
    quote_status: 'quoted'
  }
  WHERE id = '君悅飯店-uuid'
```

---

### Stage 3：產生需求單

```
助理操作：
  /tours/[id] → 需求單 Tab
  選擇供應商：一蘭拉麵餐廳
  點擊「列印需求單」

讀取資料（JOIN）：
  useCoreRequestItems()
    → SELECT 
        t.*,
        r.address, r.phone, r.fax
      FROM tour_itinerary_items t
      LEFT JOIN restaurants r 
        ON t.resource_id = r.id
      WHERE t.tour_id = ?
        AND t.supplier_id = ?

讀取總人數：
  useTotalPax()
    → SELECT SUM(adult + child + infant)
      FROM orders
      WHERE tour_id = ?
        AND status IN ('confirmed', 'paid')
    → 結果：30人

產生 PDF：
  - 供應商：一蘭拉麵餐廳（地址、電話、傳真）
  - 團體：福岡團，30人
  - 項目：Day 1 午餐，預算 $1,000/人
  - 桌數：___（空白，助理手填）

↓ 更新核心表狀態

tour_itinerary_items
  UPDATE {
    request_status: 'sent',
    request_sent_at: NOW()
  }
  WHERE id = '一蘭拉麵-uuid'
```

---

### Stage 4：供應商回覆

```
供應商操作：
  /supplier/requests
  填寫確認價格：$1,100（實際報價）

↓ 更新核心表

tour_itinerary_items
  UPDATE {
    quoted_cost: 1100,
    request_status: 'replied',
    request_reply_at: NOW()
  }
  WHERE id = '一蘭拉麵-uuid'
```

---

### Stage 5：確認訂單

```
業務操作：
  /tours/[id] → 確認單 Tab
  確認價格：$1,100

↓ 同步核心表

tour_itinerary_items
  UPDATE {
    confirmed_cost: 1100,
    confirmation_status: 'confirmed',
    confirmation_date: NOW()
  }
  WHERE id = '一蘭拉麵-uuid'
```

---

### Stage 6：領隊回填

```
領隊操作：
  /tours/[id] → 結帳單 Tab
  實際費用：$1,150（現場可能加點）
  上傳收據

↓ 更新核心表

tour_itinerary_items
  UPDATE {
    actual_expense: 1150,
    leader_status: 'filled',
    expense_at: NOW(),
    receipt_images: ['url1', 'url2']
  }
  WHERE id = '一蘭拉麵-uuid'
```

---

## 💰 財務資料流

### 收款流程

```
客戶
  ↓ 付款
orders.total_amount
  ↓ 建立收款記錄
payments
  ↓ 記錄交易
payment_transactions
  ↓ 更新狀態
orders.status = 'paid'
```

### 請款流程

```
tour_itinerary_items.confirmed_cost
  ↓ 彙整請款項目
payment_requests
  ↓ 產生請款單
payment_request_items
  ↓ 供應商
suppliers
  ↓ 付款記錄
disbursement
```

### 毛利計算

```
收入：
  orders.total_amount（客戶付款）

支出：
  tour_itinerary_items.confirmed_cost（供應商確認價）

毛利：
  收入 - 支出

毛利率：
  (收入 - 支出) ÷ 收入 × 100%
```

---

## 👥 訂單資料流

### 訂單建立

```
Tour Created
  ↓ 事件觸發（未來）
orders
  INSERT {
    tour_id,
    status: 'draft',
    total_amount: 0
  }
```

### 團員加入

```
業務操作：
  /orders/[id] → 團員 Tab
  新增團員

↓ 建立團員

tour_members
  INSERT {
    order_id,
    name,
    passport_number,
    member_type: 'adult'
  }

↓ 更新訂單人數

orders
  UPDATE {
    adult: adult + 1
  }
  WHERE id = ?
```

---

## 🏨 資源資料流（Restaurants/Hotels）

### 資源建立

```
管理員操作：
  /admin/restaurants
  新增餐廳

↓ 建立資源

restaurants
  INSERT {
    name: '一蘭拉麵',
    address: '...',
    phone: '...'
  }
```

### 資源使用

```
行程表選擇：
  選擇「一蘭拉麵」

↓ 寫入核心表

tour_itinerary_items
  INSERT {
    resource_type: 'restaurant',
    resource_id: 'restaurant-uuid',
    title: '一蘭拉麵'  // 快照
  }
```

### 需求單讀取

```
需求單產生時：
  SELECT 
    t.*,
    r.address, r.phone, r.fax
  FROM tour_itinerary_items t
  LEFT JOIN restaurants r
    ON t.resource_id = r.id

結果：
  - 核心表資料（報價、數量）
  - 餐廳完整資訊（地址、電話）
```

---

## 🔄 狀態流轉圖

### quote_status

```
none（初始）
  ↓ 報價單填寫
drafted（草稿）
  ↓ 儲存
quoted（已報價）
  ↓ 確認
confirmed（已確認）
```

### request_status

```
none（初始）
  ↓ 列印需求單
sent（已發送）
  ↓ 供應商回覆
replied（已回覆）
  ↓ 確認
confirmed（已確認）
  ↓ 變更行程
cancelled（已取消，需重發）
```

### confirmation_status

```
none（初始）
  ↓ 產生確認單
pending（待確認）
  ↓ 供應商確認
confirmed（已確認）
```

### leader_status

```
none（初始）
  ↓ 領隊填寫
filled（已填寫）
  ↓ 財務審核
reviewed（已審核）
```

---

## 🎯 關鍵整合點資料流

### 核心表 ←→ Tours

```
tours
  ↓ 建立
tour_itinerary_items
  INSERT with tour_id

tours.status 變更
  ↓ 影響
tour_itinerary_items 的顯示/編輯權限
```

### 核心表 ←→ Orders

```
orders.total_pax
  ↓ 讀取
需求單自動帶入總人數

tour_itinerary_items.total_cost
  ↓ 彙總
orders.estimated_cost
```

### 核心表 ←→ Quotes

```
tour_itinerary_items
  ↓ coreItemsToCostCategories()
quotes.categories[]

quotes.categories[] 修改
  ↓ writePricingToCore()
tour_itinerary_items.unit_price 更新
```

---

## 📋 資料一致性規則

### 規則 1：單向依賴

```
✅ 正確：
  核心表 → 其他表（JOIN 讀取）

❌ 錯誤：
  其他表 → 核心表（反向依賴）
```

### 規則 2：狀態不衝突

```
檢查：
  quote_status = 'confirmed'
  request_status = 'none'
  
問題：
  報價已確認，但還沒發需求單
  
解決：
  顯示提示「可以產生需求單了」
```

### 規則 3：資料不重複

```
✅ 正確：
  tour_itinerary_items.title = '一蘭拉麵'
  restaurants.name = '一蘭拉麵餐廳'（可能不同）
  
  需求單顯示：
    JOIN 取得 restaurants.name（最新資料）

❌ 錯誤：
  tour_requests.restaurant_name = '...'（重複儲存）
```

---

## 🚨 常見資料流問題

### 問題 1：核心表資料不同步

```
症狀：
  報價單看到的價格 ≠ 確認單看到的價格

診斷：
  1. 檢查是否直接改了 quotes 表（錯誤）
  2. 檢查核心表的 unit_price
  3. 檢查 coreItemsToCostCategories() 是否正確執行

解決：
  所有修改都要透過核心表
```

### 問題 2：需求單人數錯誤

```
症狀：
  需求單顯示 0 人

診斷：
  SELECT * FROM orders 
  WHERE tour_id = ? 
    AND status IN ('confirmed', 'paid')
  
  → 可能沒有 confirmed 訂單

解決：
  確認訂單狀態，至少要有 1 個 confirmed
```

### 問題 3：毛利率不對

```
症狀：
  毛利率顯示負數

診斷：
  1. 檢查 orders.total_amount（收入）
  2. 檢查 SUM(tour_itinerary_items.confirmed_cost)（支出）
  3. 檢查是否有漏項

解決：
  確保所有成本項目都有 confirmed_cost
```

---

## 🎓 資料流理解檢查清單

理解資料流前：
```
□ 知道核心表是什麼
□ 知道為什麼要核心表
□ 知道資料只寫入一次
```

理解資料流後：
```
□ 能畫出完整生命週期圖
□ 能說出每個階段的資料變化
□ 能診斷資料不一致問題
□ 能解釋為什麼這樣設計
```

---

**看懂這個，就看懂整個 Venturo ERP 的資料流。** 🌊

**Token 消耗**：~1,500 tokens（vs 散落各處 ~8,000+ tokens）

**節省**：81% 🎯
