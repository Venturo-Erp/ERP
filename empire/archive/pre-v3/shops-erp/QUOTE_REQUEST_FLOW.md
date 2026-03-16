# 報價單與需求單完整流程

**日期**：2026-03-14  
**版本**：v1.0  
**維護者**：馬修（Matthew）

---

## 🎯 核心原則

### **報價單 = 個人分攤金額**
- 所有價格都是「一個人要付多少錢」
- 不是「實際要訂幾桌/幾間房」

### **需求單 = 實際訂位**
- 從訂單總人數推算
- 助理根據客戶需求安排

### **核心表是唯一真相來源**
- tour_itinerary_items 儲存所有資料
- 報價單、需求單都從核心表讀取

---

## 🔄 完整生命週期

```
1. 行程表（業務規劃）
   ├─ 選餐廳/飯店/景點
   └─ 不填價格
   
2. 報價單（業務填價格）
   ├─ 餐廳：填一個人的價格
   ├─ 活動：填一個人的價格
   ├─ 住宿：填房間價格 + 幾人房
   └─ Local：階梯報價
   
3. 需求單（助理產生）
   ├─ 總人數：從訂單讀取
   ├─ 桌數：助理手動安排
   └─ 房間數：助理手動安排
   
4. 供應商回覆
   └─ 確認價格填回核心表
   
5. 確認單/結帳單
   └─ 從核心表讀取
```

---

## 📊 報價單邏輯詳解

### **1️⃣ 餐廳（meals）**

```typescript
報價單顯示：
  - 項目名稱：一蘭拉麵
  - 單價：1000（一個人）
  - 數量：（隱藏，固定 = 1）
  - 小計：1000

核心表儲存：
  category: 'meals'
  sub_category: 'lunch'
  title: '一蘭拉麵'
  unit_price: 1000
  quantity: 1（固定）
  total_cost: 1000
```

---

### **2️⃣ 活動（activities）**

```typescript
報價單顯示：
  - 項目名稱：太魯閣國家公園
  - 單價：500（一個人）
  - 數量：（隱藏，固定 = 1）
  - 小計：500

核心表儲存：
  category: 'activities'
  title: '太魯閣國家公園'
  unit_price: 500
  quantity: 1（固定）
  total_cost: 500
```

---

### **3️⃣ 住宿（accommodation）**

```typescript
報價單顯示：
  - 項目名稱：君悅飯店
  - 單價：3500（房間價格）
  - 數量：2（幾人房）
  - 小計：3500（房間總價）
  - 個人分攤：3500 ÷ 2 = 1750/人

計算邏輯：
  quantity: 1 → 一人房 → unit_price ÷ 1
  quantity: 2 → 兩人房 → unit_price ÷ 2
  quantity: 3 → 三人房 → unit_price ÷ 3

核心表儲存：
  category: 'accommodation'
  title: '君悅飯店'
  unit_price: 3500
  quantity: 2（幾人房）
  total_cost: 3500
  
個人分攤計算（系統自動）：
  成人成本 += 3500 ÷ 2 = 1750
```

---

### **4️⃣ Local 報價（特殊邏輯）**

```typescript
輸入方式：
  1. 點擊「Local 報價」按鈕
  2. 彈出視窗
  3. 輸入階梯報價：
     - 10人：$50,000 → $5,000/人
     - 20人：$80,000 → $4,000/人
     - 30人：$100,000 → $3,333/人

報價單顯示：
  - 項目名稱：Local 報價
  - 單價：5,000（目前人數適用）
  - 備註：10人=$5,000 / 20人=$4,000 / 30人=$3,333
  - 禁止直接修改（只能透過視窗編輯）

核心表儲存：
  category: 'group-transport'
  title: 'Local 報價'
  unit_price: 5000（目前適用價格）
  note: '10人=$5,000 / 20人=$4,000 / 30人=$3,333'
  
階梯表儲存（tierPricings）：
  [
    { participants: 10, unitPrice: 5000 },
    { participants: 20, unitPrice: 4000 },
    { participants: 30, unitPrice: 3333 }
  ]
```

**Local 報價修改規則**：
- ✅ 只能透過「Local 報價」視窗修改
- ❌ 禁止直接在表格編輯單價
- ✅ 人數變動時自動切換適用階梯
- ✅ 備註顯示完整階梯資訊

---

## 📋 需求單邏輯詳解

### **從核心表讀取資料**

```typescript
需求單 = JOIN(tour_itinerary_items, restaurants/hotels)

範例：餐廳需求單
  日期：Day 1 午餐（從 day_number + sub_category 推算）
  餐廳：一蘭拉麵（從 title 或 JOIN restaurants）
  地址：福岡市博多區...（從 restaurants 表）
  電話：092-123-4567（從 restaurants 表）
  預算：NT$ 1,000/人（從 unit_price）
  總人數：30人（從訂單資料）
  桌數：______（助理手動填寫）
  特殊需求：司機餐（從 special_requirements）
```

---

### **需求單數量邏輯（不自動計算）**

```typescript
餐廳需求單：
  ✅ 帶入：總人數 30人
  ❌ 不計算：桌數（助理手動填）
  
  理由：
  - 桌數由助理根據餐廳狀況安排
  - 可能 10人一桌 → 3桌
  - 可能 8人一桌 → 4桌
  - 由助理決定

住宿需求單：
  ✅ 帶入：總人數 30人
  ❌ 不計算：房間數（助理手動填）
  
  理由：
  - 房間數由客戶需求決定
  - 可能全部雙人房 → 15間
  - 可能混搭（雙人房 + 三人房）
  - 由助理安排

活動需求單：
  ✅ 帶入：總人數 30人
  ❌ 不計算：其他（助理手動填）
```

---

## 🗄️ 核心表欄位說明

```sql
tour_itinerary_items {
  -- 基本資訊
  day_number INT,              -- 第幾天
  category TEXT,               -- meals/accommodation/activities
  sub_category TEXT,           -- breakfast/lunch/dinner (餐食)
  title TEXT,                  -- 項目名稱
  
  -- 報價資訊（報價單填寫）
  unit_price DECIMAL,          -- 單價
  quantity INT,                -- 數量（餐廳=1, 住宿=幾人房）
  total_cost DECIMAL,          -- 小計（unit_price × quantity 或其他邏輯）
  
  -- 需求單資訊（助理填寫）
  special_requirements TEXT,   -- 特殊需求（司機餐、素食等）
  
  -- 供應商回覆（需求單回來後填）
  quoted_cost DECIMAL,         -- 供應商報價
  confirmed_cost DECIMAL,      -- 確認價格
  
  -- 關聯
  resource_type TEXT,          -- restaurant/hotel/attraction
  resource_id UUID,            -- 關聯資料庫 ID
  
  -- 狀態
  request_status TEXT,         -- none/sent/replied
  quote_status TEXT,           -- drafted/quoted/confirmed
  confirmation_status TEXT     -- none/confirmed
}
```

---

## 🔄 資料流程圖

```
行程表（業務）
  └─ 選餐廳：一蘭拉麵
  └─ 核心表：title='一蘭拉麵', unit_price=null
  
報價單（業務）
  └─ 填價格：$1000/人
  └─ 核心表：unit_price=1000, quantity=1
  
需求單（助理）
  └─ 從核心表讀取：
      - 餐廳名稱：一蘭拉麵
      - 預算：$1000/人
      - 總人數：30人（從訂單）
  └─ 助理填寫：
      - 桌數：3桌
      - 特殊需求：司機餐
  └─ 產生 PDF 發送
  
供應商回覆
  └─ 確認價格：$1,100/人
  └─ 核心表：quoted_cost=1100
  
確認單/結帳單
  └─ 從核心表讀取最新資料
```

---

## 📐 計算公式

### **個人成本計算**

```typescript
成人成本 = 
  Σ(餐廳 unit_price) +
  Σ(活動 unit_price) +
  Σ(住宿 unit_price ÷ quantity) +
  Local_unit_price（適用階梯）

兒童成本 = 
  Σ(餐廳 child_price || unit_price) +
  Σ(活動 child_price || unit_price) +
  Σ(住宿 child_price ÷ quantity) +
  Local_unit_price（適用階梯）

嬰兒成本 = 
  Σ(餐廳 infant_price || 0) +
  Σ(活動 infant_price || 0) +
  Σ(住宿 infant_price || 0) +
  0（嬰兒不計 Local）
```

---

### **住宿個人分攤範例**

```typescript
範例 1：雙人房
  unit_price: 3500
  quantity: 2
  個人分攤: 3500 ÷ 2 = 1750

範例 2：三人房
  unit_price: 4500
  quantity: 3
  個人分攤: 4500 ÷ 3 = 1500

範例 3：單人房
  unit_price: 2500
  quantity: 1
  個人分攤: 2500 ÷ 1 = 2500
```

---

## ✅ UI 行為規範

### **報價單 UI**

```
餐廳/活動：
  ✅ 顯示：項目名稱、單價
  ❌ 隱藏：數量欄位（固定 = 1）
  
住宿：
  ✅ 顯示：項目名稱、單價、數量（幾人房）
  ✅ 可編輯：所有欄位
  
Local 報價：
  ✅ 顯示：項目名稱、單價、備註（階梯資訊）
  ❌ 禁止：直接編輯單價
  ✅ 可編輯：只能透過「Local 報價」視窗
```

---

### **需求單 UI**

```
餐廳需求單：
  自動帶入：
    - 餐廳名稱（從核心表）
    - 預算（unit_price）
    - 總人數（從訂單）
  
  助理填寫：
    - 桌數
    - 特殊需求
    - 用餐時間

住宿需求單：
  自動帶入：
    - 飯店名稱（從核心表）
    - 預算（unit_price）
    - 總人數（從訂單）
  
  助理填寫：
    - 房間數
    - 房型需求
    - 入住時間
```

---

## 🎯 實作檢查清單

```
□ 報價單
  □ 餐廳/活動數量欄位已隱藏 ✅
  □ 住宿數量欄位正常顯示 ✅
  □ Local 報價禁止直接編輯 ⏳
  □ Local 備註顯示階梯資訊 ⏳
  
□ 需求單
  □ 自動帶入總人數 ⏳
  □ 桌數/房間數手動填寫 ⏳
  □ 從核心表 JOIN 讀取資料 ⏳
  
□ 核心表
  □ 欄位結構正確 ✅
  □ 報價單寫回核心表 ✅
  □ 需求單讀取核心表 ⏳
```

---

## 📝 待辦事項

### **P1：Local 報價 UI 改進**
- [ ] 禁止直接編輯單價欄位
- [ ] 修改只能透過視窗
- [ ] 備註顯示完整階梯
- [ ] 人數變動自動切換階梯

### **P2：需求單自動產生**
- [ ] 從核心表讀取資料
- [ ] 帶入訂單總人數
- [ ] 助理手動填寫桌數/房間數
- [ ] 產生 PDF

### **P3：供應商回覆流程**
- [ ] 回填確認價格
- [ ] 更新核心表
- [ ] 同步到報價單

---

**最後更新**：2026-03-14  
**維護者**：馬修（Matthew）
