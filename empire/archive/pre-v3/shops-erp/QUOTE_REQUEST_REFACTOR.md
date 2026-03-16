# 需求單重構計畫（B 方案：分階段）

**日期**：2026-03-14  
**版本**：Phase 1 - 設計階段  
**維護者**：馬修（Matthew）

---

## 🎯 **目標**

### **現有系統（手動輸入）**
```typescript
TourRequestFormDialog {
  items: 手動輸入 []
  
  流程：
    1. 手動輸入項目（日期、標題、數量）
    2. 選擇供應商
    3. 產生 PDF
    4. 儲存到 tour_requests（包含所有項目資料）
}
```

### **新系統（核心表模式）**
```typescript
CoreTableRequestDialog {
  items: 從 tour_itinerary_items 讀取
  
  流程：
    1. 從核心表讀取（已有報價資料）
    2. JOIN 供應商資料（restaurants/hotels）
    3. 帶入訂單總人數
    4. 產生 PDF
    5. tour_requests 只存狀態（新增 is_from_core 標記）
}
```

---

## 📊 **Phase 1：設計資料結構**

### **1. tour_requests 表結構調整**

```sql
-- 新增欄位（相容舊資料）
ALTER TABLE tour_requests
ADD COLUMN is_from_core BOOLEAN DEFAULT false;

-- 標記說明：
-- is_from_core = false → 手動輸入模式（舊資料）
-- is_from_core = true  → 核心表模式（新資料）

-- 核心表模式下：
-- title, description, quantity 等欄位不使用
-- 資料來源：tour_itinerary_items（透過 tour_id + supplier_id）
```

---

### **2. 資料讀取邏輯**

```typescript
// 從核心表讀取需求單資料
async function fetchRequestItemsFromCore(
  tourId: string,
  supplierId: string
) {
  const { data } = await supabase
    .from('tour_itinerary_items')
    .select(`
      *,
      restaurants (
        id, name, address, phone, fax,
        latitude, longitude, google_maps_url
      ),
      hotels (
        id, name, address, phone, fax,
        latitude, longitude, google_maps_url
      ),
      attractions (
        id, name, address, phone,
        latitude, longitude, google_maps_url
      )
    `)
    .eq('tour_id', tourId)
    .eq('supplier_id', supplierId)
    .eq('quote_status', 'quoted')  // 只抓有報價的項目
    .order('day_number', { ascending: true })
    .order('sort_order', { ascending: true })
  
  return data || []
}
```

---

### **3. 訂單總人數計算**

```typescript
// 從訂單讀取總人數
async function fetchTotalPax(tourId: string) {
  const { data: orders } = await supabase
    .from('orders')
    .select('adult, child_with_bed, child_no_bed, infant')
    .eq('tour_id', tourId)
    .eq('status', 'confirmed')  // 只計算已確認訂單
  
  if (!orders || orders.length === 0) return 0
  
  return orders.reduce((total, order) => {
    return total + 
      (order.adult || 0) + 
      (order.child_with_bed || 0) + 
      (order.child_no_bed || 0) + 
      (order.infant || 0)
  }, 0)
}
```

---

### **4. 需求單 PDF 格式（核心表模式）**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    餐廳需求單
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【我方資訊】
  公司：角落旅行社
  電話：02-1234-5678
  業務：王小明
  助理：李小華

【供應商資訊】
  餐廳：一蘭拉麵總本店
  地址：福岡市博多區中洲5-3-2
  電話：092-262-0433
  聯絡人：田中先生

【團體資訊】
  團號：FUK260515A
  團名：福岡美食 5 日
  出發日期：2026/05/15
  總人數：30 人  ← 自動帶入

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【需求明細】

┌─────┬──────┬──────┬──────┬──────┬──────────┐
│ 日期│ 餐別 │ 預算 │ 桌數 │ 備註 │ 特殊需求 │
├─────┼──────┼──────┼──────┼──────┼──────────┤
│Day 1│ 午餐 │1,000 │ ___ │      │ 司機餐   │
│Day 2│ 晚餐 │1,500 │ ___ │      │ 素食 2位 │
└─────┴──────┴──────┴──────┴──────┴──────────┘

桌數：助理手動填寫  ← 空白欄位

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【供應商回覆】（待填）

□ 確認價格：_______ 元/人
□ 確認桌數：_______ 桌
□ 回覆日期：_______
```

---

## 📋 **Phase 2：實作計畫**

### **Step 1：新增資料庫欄位**
```sql
-- Migration: 20260314_add_is_from_core_to_tour_requests.sql
ALTER TABLE tour_requests
ADD COLUMN IF NOT EXISTS is_from_core BOOLEAN DEFAULT false;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_tour_requests_is_from_core
ON tour_requests(is_from_core);
```

### **Step 2：建立新的 Hook**
```typescript
// src/features/tours/hooks/useCoreRequestItems.ts

export function useCoreRequestItems(
  tourId: string,
  supplierId: string
) {
  return useSWR(
    tourId && supplierId 
      ? ['core-request-items', tourId, supplierId]
      : null,
    () => fetchRequestItemsFromCore(tourId, supplierId)
  )
}
```

### **Step 3：建立新的 Component**
```typescript
// src/features/tours/components/CoreTableRequestDialog.tsx

export function CoreTableRequestDialog({
  isOpen,
  onClose,
  tour,
  supplierId,
  supplierName,
  category
}: CoreTableRequestDialogProps) {
  // 從核心表讀取資料
  const { data: coreItems } = useCoreRequestItems(tour.id, supplierId)
  
  // 讀取訂單總人數
  const { data: totalPax } = useTotalPax(tour.id)
  
  // JOIN 供應商資料
  const supplierData = getSupplierDataFromCoreItems(coreItems, category)
  
  // 產生 PDF
  const generatePDF = () => {
    // 使用 coreItems + totalPax + supplierData
  }
  
  // 儲存狀態
  const saveRequestStatus = async () => {
    await supabase.from('tour_requests').insert({
      tour_id: tour.id,
      supplier_id: supplierId,
      category,
      status: 'sent',
      is_from_core: true,  // ← 標記為核心表模式
      has_printed: true,
      printed_at: new Date().toISOString()
    })
  }
}
```

### **Step 4：整合到現有流程**
```typescript
// 在需求確認單頁面新增「從核心表產生」按鈕

<Button onClick={() => setShowCoreRequestDialog(true)}>
  從報價單產生需求單
</Button>

<CoreTableRequestDialog
  isOpen={showCoreRequestDialog}
  onClose={() => setShowCoreRequestDialog(false)}
  tour={tour}
  supplierId={selectedSupplierId}
  supplierName={selectedSupplierName}
  category={selectedCategory}
/>

// 保留舊的手動輸入按鈕
<Button onClick={() => setShowManualRequestDialog(true)}>
  手動建立需求單
</Button>
```

---

## 🔄 **Phase 3：資料流程對照**

### **舊流程（手動輸入）**
```
需求確認單
  ↓
手動輸入項目
  ↓
選擇供應商
  ↓
產生 PDF
  ↓
tour_requests.insert({
  title, description, quantity,
  specifications, ...
})
```

### **新流程（核心表模式）**
```
需求確認單
  ↓
從核心表讀取
  ↓
JOIN 供應商資料
  ↓
帶入訂單總人數
  ↓
產生 PDF
  ↓
tour_requests.insert({
  tour_id, supplier_id,
  status, is_from_core: true
})
```

---

## ⚠️ **相容性設計**

### **讀取邏輯**
```typescript
// 判斷是核心表模式還是手動模式
if (request.is_from_core) {
  // 從核心表讀取
  const items = await fetchRequestItemsFromCore(
    request.tour_id,
    request.supplier_id
  )
} else {
  // 從 tour_request_items 讀取（舊資料）
  const items = await supabase
    .from('tour_request_items')
    .select('*')
    .eq('request_id', request.id)
}
```

---

## 📈 **遷移計畫**

### **階段 1**（現在）
- ✅ 新增 is_from_core 欄位
- ✅ 建立新 Component
- ✅ 新增「從報價單產生」按鈕
- ❌ 保留舊的手動輸入功能

### **階段 2**（觀察期）
- 測試新功能 2 週
- 收集使用者回饋
- 修正 Bug

### **階段 3**（正式上線）
- 預設使用核心表模式
- 保留手動輸入作為備用

### **階段 4**（未來）
- 評估是否完全移除手動輸入
- 資料遷移（舊資料標記 is_from_core）

---

## ✅ **檢查清單**

```
□ Phase 1：設計
  ✅ 資料結構設計
  ✅ 資料流程設計
  ✅ 相容性設計
  
□ Phase 2：實作
  ⏳ Migration（is_from_core 欄位）
  ⏳ useCoreRequestItems Hook
  ⏳ CoreTableRequestDialog Component
  ⏳ 整合到現有頁面
  
□ Phase 3：測試
  ⏳ 讀取核心表資料
  ⏳ JOIN 供應商資料
  ⏳ 總人數計算
  ⏳ PDF 產生
  ⏳ 狀態儲存
  
□ Phase 4：部署
  ⏳ 測試環境驗證
  ⏳ 正式環境部署
  ⏳ 使用者訓練
```

---

**最後更新**：2026-03-14  
**維護者**：馬修（Matthew）
