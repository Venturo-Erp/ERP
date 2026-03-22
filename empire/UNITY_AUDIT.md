# 🔍 帝國統一性審計

**日期**：2026-03-17 08:15  
**審計者**：建築師 Matthew  
**目的**：確認一切是否遵循「世界樹 = 唯一真相」的統一概念

---

## ✅ 統一的部分（通過審計）

### 五面都從核心表讀取

| 面   | 視角 | 讀取方式                                                 | 狀態 |
| ---- | ---- | -------------------------------------------------------- | ---- |
| 東面 | 行程 | `useTourDailyData` → core table                          | ✅   |
| 南面 | 報價 | `core-table-adapter` → core table                        | ✅   |
| 西面 | 需求 | `RequirementsList` → core table                          | ✅   |
| 北面 | 確認 | `ConfirmationSheet` + `useCoreRequestItems` → core table | ✅   |
| 落葉 | 結團 | `tour-closing-tab` → core table                          | ✅   |

### 寫入核心表的 6 個入口（全部識別）

| 入口        | 檔案                           | 寫什麼                             |
| ----------- | ------------------------------ | ---------------------------------- |
| 行程編輯    | `useTourItineraryItems.ts`     | INSERT/DELETE 行程項目             |
| 報價填寫    | `core-table-adapter.ts`        | UPDATE 價格 / INSERT 非行程成本    |
| 確認單同步  | `confirmationCoreTableSync.ts` | UPDATE 確認狀態、confirmed_cost    |
| 需求單同步  | `requestCoreTableSync.ts`      | UPDATE 需求狀態、request_id        |
| 回填成本    | `RequirementsList.tsx:686`     | UPDATE unit_price from quoted_cost |
| 需求 Dialog | `CoreTableRequestDialog.tsx`   | UPDATE 需求相關欄位                |

### 核心表欄位完整性

57 個欄位，涵蓋完整生命週期：

- 身份（id, tour_id, day_number, sort_order）
- 內容（category, title, description, resource_id）
- 定價（unit_price, adult/child/infant_price, estimated_cost, quoted_cost）
- 需求（request_id, request_status, request_sent_at, reply_cost）
- 確認（confirmation_item_id, confirmed_cost, booking_reference, booking_status）
- 結算（actual_expense, expense_note, receipt_images）
- 狀態（quote_status, confirmation_status, leader_status）

**核心表本身設計是統一的 ✅**

---

## ⚠️ 斷裂點（需要修復）

### 🔴 斷裂 1：tours.total_cost 沒有從核心表同步

```
問題：
  tour-pnl 報表讀 tours.total_cost 計算損益
  但 tours.total_cost 沒有自動從核心表 SUM(unit_price) 更新

  核心表 unit_price 被修改 → tours.total_cost 不會變
  → 損益報表不準確

現況：
  tours.total_cost — 不知道誰在寫（可能是手動或舊邏輯）
  tours.total_revenue — useTourPayments 從 receipts 計算（✅ 正確）
  tours.profit — total_revenue - total_cost（❌ total_cost 來源不明）

修復方案：
  A) DB trigger：核心表 INSERT/UPDATE/DELETE → 自動更新 tours.total_cost
  B) 前端同步：每次寫入核心表後，重算 SUM 並更新 tours
  建議用 A，因為不管誰寫核心表都能保持一致
```

### 🟡 斷裂 2：財務系統不直接讀核心表

```
問題：
  payment_requests（請款）有自己的 items JSONB
  receipts（收款）有自己的 receipt_items
  這些和核心表沒有 foreign key 連結

現況：
  請款時手動填項目 → 存在 payment_request_items
  核心表有 tour_itinerary_items.actual_expense 欄位
  但兩邊沒有同步

影響：
  助理填請款 $2,800，核心表的 actual_expense 還是空的
  結團時損益算不出來

修復方案：
  請款確認時 → 回填核心表的 actual_expense
  類似「委託回填 quoted_cost」的機制
```

### 🟡 斷裂 3：useTours-advanced 硬編碼利潤率

```
位置：src/features/tours/hooks/useTours-advanced.ts:238-239

total_revenue: (tour.price || 0) * (tour.current_participants || 0),
total_cost: (tour.price || 0) * (tour.current_participants || 0) * 0.7,

問題：total_cost = price × 人數 × 0.7（硬編碼 30% 利潤）
這完全不是從核心表來的！

影響：團列表頁的成本和利潤是假的

修復：應該從核心表 SUM 或 tours.total_cost（修復斷裂 1 後）
```

### 🟢 輕微：HR/出勤/請假 與核心業務無關

```
HR 系統（出勤、請假、薪資）是獨立模組
不需要和世界樹連接
這是正確的——不是所有東西都要走核心表
```

---

## 📊 統一性評分

```
核心流程（行程→報價→委託→確認→回填）: 95/100 ✅
  扣分：回填 unit_price 但沒更新 tours.total_cost

財務系統 ↔ 核心表：40/100 ⚠️
  收款正確（從 receipts 計算 total_revenue）
  支出斷裂（total_cost 來源不明，請款不回填核心表）

報表準確性：60/100 ⚠️
  tour-pnl 依賴 tours.total_cost（來源有問題）
  useTours-advanced 硬編碼 0.7 毛利率

HR / 租戶：不適用（獨立模組）

整體統一性：75/100
```

---

## 🎯 修復優先順序

| 優先 | 問題                           | 影響                   | 工時  |
| ---- | ------------------------------ | ---------------------- | ----- |
| P0   | tours.total_cost 從核心表同步  | 所有損益報表失準       | 1h    |
| P0   | useTours-advanced 硬編碼 0.7   | 團列表利潤是假的       | 30min |
| P1   | 請款→回填核心表 actual_expense | 結團損益算不出         | 2h    |
| P2   | 金庫/出納頁面填充              | 功能缺失但不影響準確性 | 2h    |

---

## 🌳 修復後的統一資料流

```
核心表（世界樹）
  ├── unit_price 被修改 → trigger → tours.total_cost 自動更新
  ├── 報價頁填成本 → 寫 unit_price → trigger → tours.total_cost ✅
  ├── 委託回填 → 寫 unit_price → trigger → tours.total_cost ✅
  ├── 請款確認 → 寫 actual_expense → trigger → tours.total_cost ✅
  └── 結團 → 讀 actual_expense vs unit_price → 精確損益 ✅

tours 表
  ├── total_revenue ← receipts SUM（已正確）
  ├── total_cost ← 核心表 SUM（需修復）
  └── profit ← total_revenue - total_cost（自動正確）

tour-pnl 報表
  └── 讀 tours.total_revenue / total_cost / profit → 精確 ✅
```

---

> **建築師結論**：
>
> 核心流程本身是統一的——五面都從世界樹讀，寫入有 6 個明確入口。
>
> **但世界樹和金庫之間有一道裂縫**：
> 核心表的成本加總沒有同步到 tours.total_cost，
> 導致所有損益報表的數字來源有問題。
>
> 這是 P0 必修——修好這道裂縫，
> 整個帝國的金幣流才是一致的。
