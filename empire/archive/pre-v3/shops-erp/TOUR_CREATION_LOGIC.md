# 旅遊團建立邏輯完整說明

**日期**：2026-03-13  
**版本**：v2.0（移除 Proposals 系統後）

---

## 🎯 核心原則

**一個核心表，三種建立方式，多個讀取面向**

所有旅遊團資料都存入 **同一張表**（`tours`），但根據**不同狀態**代表不同用途。所有詳細資料（飯店/餐廳/行程）都記錄在 **核心表**（`tour_itinerary_items`），其他功能（報價/需求/確認/結帳）都是**讀取**核心表。

---

## 📋 三種建立方式

### **1️⃣ 開團（正式團）**

**特徵**：
- **狀態**：`confirmed` / `active`
- **有出發日期**：`departure_date` + `return_date`
- **天數計算**：自動算（`return_date - departure_date`）
- **用途**：正式確定的旅遊團，有客戶報名

**建立時必須記錄**：
```typescript
{
  code: "FUK260702A",           // 團號（機場代號+日期+流水號）
  airport_code: "FUK",          // 機場代號（福岡）
  country: "Japan",             // 國家
  departure_date: "2026-07-02", // 出發日
  return_date: "2026-07-07",    // 回程日
  // 天數會自動算：7 - 2 = 5 天
}
```

---

### **2️⃣ 提案（客戶詢價）**

**特徵**：
- **狀態**：`proposal` / `draft`
- **無出發日期**：客戶還沒決定何時出發
- **天數**：**手動輸入**（例如：5 天）
- **用途**：給客戶看的行程提案，還沒確定成團

**建立時必須記錄**：
```typescript
{
  code: "PROP-ABC123",          // 提案編號
  airport_code: "KIX",          // 機場代號（關西）
  country: "Japan",             // 國家
  departure_date: null,         // 無出發日
  return_date: null,            // 無回程日
  duration_days: 5,             // 手動輸入天數
}
```

---

### **3️⃣ 模板（標準行程）**

**特徵**：
- **狀態**：`template`
- **無出發日期**：範本，可重複使用
- **天數**：**手動輸入**（例如：關西 5 日遊）
- **用途**：標準行程範本，快速複製建立新團

**建立時必須記錄**：
```typescript
{
  code: "TPL-KANSAI-5D",        // 模板編號
  airport_code: "KIX",          // 機場代號（關西）
  country: "Japan",             // 國家
  departure_date: null,         // 無出發日
  return_date: null,            // 無回程日
  duration_days: 5,             // 手動輸入天數
}
```

---

## 🗂️ 核心表：tour_itinerary_items

**唯一真相來源（Single Source of Truth）**

所有旅遊團的詳細資料（飯店/餐廳/行程/交通）都記錄在這張表。

### **資料結構**

```typescript
{
  tour_id: "FUK260702A",        // 關聯的旅遊團
  day: 1,                       // 第幾天
  category: "accommodation",    // 類別：accommodation/meals/activity/transportation
  resource_type: "hotel",       // 資源類型：hotel/restaurant/attraction
  resource_id: "uuid-123",      // 資源 ID（指向 hotels/restaurants/attractions 表）
  title: "福岡天神日航飯店",     // 標題
  description: "市中心高級飯店", // 描述
  estimated_cost: 3500,         // 預估成本
  actual_cost: null,            // 實際成本（確認後填入）
}
```

### **支援的類別**

| category | 說明 | resource_type 範例 |
|----------|------|-------------------|
| `accommodation` | 住宿 | `hotel` |
| `meals` | 餐食 | `restaurant` |
| `activity` | 行程活動 | `attraction` / `activity` |
| `transportation` | 交通 | `bus` / `train` / `flight` |

---

## 📊 其他表格都是「讀取」核心表

**核心表是唯一寫入點，其他功能都是讀取**

```
tour_itinerary_items（核心表）
    ↓
    ├─ 報價單（quotes）
    │   └─ 讀取：所有飯店/餐廳/行程 → 計算成本 → 產生報價
    │
    ├─ 需求單（tour_requests）
    │   └─ 讀取：所有飯店/餐廳/行程 → 向供應商詢價
    │
    ├─ 確認單（tour_confirmation_sheets）
    │   └─ 讀取：所有飯店/餐廳/行程 → 確認訂單
    │
    └─ 結帳單（tour_expenses）
        └─ 讀取：所有飯店/餐廳/行程 → 結算實際成本
```

### **讀取範例（報價單）**

```typescript
// 從核心表讀取所有項目
const items = await supabase
  .from('tour_itinerary_items')
  .select('*')
  .eq('tour_id', 'FUK260702A')

// 計算總成本
const totalCost = items.reduce((sum, item) => {
  return sum + (item.estimated_cost || 0)
}, 0)

// 產生報價
const quote = {
  tour_id: 'FUK260702A',
  total_cost: totalCost,
  selling_price: totalCost * 1.15, // 加 15% 毛利
}
```

### **讀取範例（需求單）**

```typescript
// 從核心表讀取特定供應商的項目
const items = await supabase
  .from('tour_itinerary_items')
  .select('*')
  .eq('tour_id', 'FUK260702A')
  .eq('category', 'accommodation') // 只要飯店

// 產生需求單
const request = {
  tour_id: 'FUK260702A',
  supplier_id: 'hotel-supplier-123',
  items: items.map(item => ({
    resource_id: item.resource_id,
    quantity: 1,
    estimated_cost: item.estimated_cost,
  }))
}
```

---

## 🔑 必須記錄的欄位

### **建立旅遊團時（tours 表）**

| 欄位 | 說明 | 範例 | 必填 |
|------|------|------|------|
| `code` | 團號 | `FUK260702A` | ✅ |
| `airport_code` | 機場代號 | `FUK` / `KIX` / `NGO` | ✅ |
| `country` | 國家 | `Japan` | ✅ |
| `departure_date` | 出發日 | `2026-07-02` | 開團必填 |
| `return_date` | 回程日 | `2026-07-07` | 開團必填 |
| `duration_days` | 天數 | `5` | 提案/模板必填 |

### **建立行程項目時（tour_itinerary_items 表）**

| 欄位 | 說明 | 範例 | 必填 |
|------|------|------|------|
| `tour_id` | 旅遊團 ID | `FUK260702A` | ✅ |
| `day` | 第幾天 | `1` / `2` / `3` | ✅ |
| `category` | 類別 | `accommodation` / `meals` | ✅ |
| `resource_type` | 資源類型 | `hotel` / `restaurant` | ✅ |
| `resource_id` | 資源 ID | `uuid-123` | ⚠️ 選填（可用文字） |
| `title` | 標題 | `福岡天神日航飯店` | ✅ |
| `estimated_cost` | 預估成本 | `3500` | ⚠️ 選填 |

---

## 🚫 已移除的系統

### **Proposals 系統（2026-03-13 移除）**

**原本的設計**：
- 獨立的 `proposals` 和 `proposal_packages` 表
- 提案要「轉換」成旅遊團

**為什麼移除**：
- ❌ 重複邏輯：提案和旅遊團本質上是同一件事
- ❌ 資料重複：轉換時要複製一次資料
- ❌ 維護成本高：兩套系統要同時維護

**新的設計**：
- ✅ 統一用 `tours` 表，用 `status` 區分
- ✅ 提案就是 `status = 'proposal'` 的旅遊團
- ✅ 不需要「轉換」，直接改狀態

---

## 📐 資料流程圖

```
建立旅遊團（三種方式）
    ↓
寫入 tours 表（記錄 airport_code + country）
    ↓
寫入 tour_itinerary_items（記錄飯店/餐廳/行程）
    ↓
    ├─ 報價單讀取 → 計算成本 → 產生報價
    ├─ 需求單讀取 → 向供應商詢價
    ├─ 確認單讀取 → 確認訂單
    └─ 結帳單讀取 → 結算成本
```

---

## ✅ 核心原則總結

1. **一個核心表** — `tour_itinerary_items` 是唯一真相來源
2. **三種建立方式** — 開團/提案/模板，都寫入 `tours` 表
3. **必須記錄** — `airport_code` 和 `country`
4. **天數計算** — 開團自動算，提案/模板手動輸入
5. **其他表格只讀取** — 報價/需求/確認/結帳都從核心表讀取
6. **不要重複資料** — 同一份資料，不同面向讀取

---

**最後更新**：2026-03-13  
**維護者**：馬修（Matthew）
