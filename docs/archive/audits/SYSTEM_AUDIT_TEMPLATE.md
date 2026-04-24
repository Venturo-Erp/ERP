# Venturo ERP 系統完整對照表

> **用途**: 檢查前後端一致性、追蹤功能因果關係、驗證 API 串接
> **最後更新**: 2026-01-03

---

## 1. 首頁小工具 (Dashboard Widgets)

### 設定來源

- **Hook**: `src/features/dashboard/hooks/use-widgets.ts`
- **設定 Dialog**: 首頁右上角齒輪圖示 → `WidgetSettingsDialog`
- **儲存方式**:
  - 登入用戶：Supabase `user_preferences` 表 (key: `homepage-widgets-order`)
  - 未登入：localStorage (key: `homepage-widgets`)
- **預設值**: `['calculator', 'currency']`

### 小工具清單

| 小工具 ID        | 名稱     | 圖示         | 佔用列數 | 組件路徑                    | 說明          |
| ---------------- | -------- | ------------ | -------- | --------------------------- | ------------- |
| `manifestation`  | 顯化魔法 | `Sparkles`   | 1        | `manifestation-widget.tsx`  | 宣示/願望功能 |
| `flight`         | 航班查詢 | `Plane`      | 1        | `flight-widget.tsx`         | 查詢航班資訊  |
| `pnr`            | PNR 解析 | `FileText`   | 1        | `pnr-widget.tsx`            | 解析 PNR 資料 |
| `weather`        | 天氣查詢 | `Cloud`      | 1        | `weather-widget.tsx`        | 查詢城市天氣  |
| `weather-weekly` | 天氣週報 | `CloudSun`   | 2        | `weather-widget-weekly.tsx` | 一週天氣預報  |
| `calculator`     | 計算機   | `Calculator` | 1        | `calculator-widget.tsx`     | 基礎計算機    |
| `currency`       | 匯率換算 | `DollarSign` | 1        | `currency-widget.tsx`       | 多幣別換算    |
| `timer`          | 計時器   | `Clock`      | 1        | `timer-widget.tsx`          | 倒數計時      |
| `notes`          | 便條紙   | `Clipboard`  | 1        | `notes-widget.tsx`          | 個人便條      |

### 小工具類型定義

```typescript
// src/features/dashboard/types/index.ts
export type WidgetType =
  | 'calculator'
  | 'currency'
  | 'timer'
  | 'notes'
  | 'stats'
  | 'pnr'
  | 'flight'
  | 'weather'
  | 'weather-weekly'
  | 'manifestation'

export interface WidgetConfig {
  id: WidgetType
  name: string
  icon: unknown
  component: React.ComponentType
  span?: number // 佔據的列數（1 或 2）
}
```

### 小工具操作功能

| 操作      | 觸發方式          | 說明                                 |
| --------- | ----------------- | ------------------------------------ |
| 顯示/隱藏 | 設定 Dialog 切換  | `toggleWidget(widgetId)`             |
| 拖拽排序  | 長按 500ms 後拖拽 | 使用 `@dnd-kit` 實現                 |
| 儲存順序  | 自動              | `reorderWidgets(oldIndex, newIndex)` |

### 統計項目類型 (Stats Widget)

```typescript
export type StatType =
  | 'todos' // 待辦事項數
  | 'paymentsThisWeek' // 本週收款
  | 'paymentsNextWeek' // 下週收款
  | 'depositsThisWeek' // 本週訂金
  | 'toursThisWeek' // 本週出團
  | 'toursThisMonth' // 本月出團
```

---

## 2. 頁面功能對照表

### 2.1 旅遊團管理 `/tours`

#### 頁面結構

```
/tours
├── 狀態分頁 (Tab)
│   ├── 全部
│   ├── 提案
│   ├── 進行中
│   ├── 結案
│   └── 封存
├── 列表 (EnhancedTable)
│   └── 每列操作按鈕
└── Dialog
    ├── 新增/編輯團 Dialog
    ├── 報價單管理 Dialog
    ├── 行程表連結 Dialog
    ├── 合約 Dialog
    ├── 確認出團 Dialog
    ├── 解鎖 Dialog
    ├── 結案 Dialog
    └── 封存原因 Dialog
```

#### 操作按鈕對照表

| 按鈕     | 圖示             | 顯示條件                                                 | 點擊動作                                   | 開啟元件                                 | 服務層 API                       |
| -------- | ---------------- | -------------------------------------------------------- | ------------------------------------------ | ---------------------------------------- | -------------------------------- |
| 確認     | `CheckCircle2`   | `status === '提案'`                                      | `onConfirmTour(tour)`                      | `DocumentVersionPicker` (mode='confirm') | `tourService.lockTour()`         |
| 解鎖     | `LockOpen`       | `status === '進行中'`                                    | `onUnlockLockedTour(tour)`                 | `TourUnlockDialog`                       | `tourService.unlockTour()`       |
| 鎖定     | `Lock`           | `status === '進行中'` (無解鎖權限)                       | 僅顯示狀態                                 | -                                        | -                                |
| 結案     | `FileCheck`      | `status === '進行中'`                                    | `onCloseTour(tour)`                        | `TourClosingDialog`                      | `tourService.updateTourStatus()` |
| 編輯     | `Edit2`          | 永遠顯示                                                 | `openDialog('edit', tour)`                 | `TourForm`                               | `actions.update()`               |
| 頻道     | `MessageSquare`  | 永遠顯示                                                 | `handleCreateChannel(tour)`                | -                                        | `channelService`                 |
| 報價     | `Calculator`     | 永遠顯示                                                 | `onOpenQuoteDialog(tour)`                  | `DocumentVersionPicker`                  | -                                |
| 行程     | `FileText`       | 永遠顯示                                                 | `onOpenItineraryDialog(tour)`              | `LinkItineraryToTourDialog`              | -                                |
| 合約     | `FileSignature`  | 永遠顯示                                                 | `onOpenContractDialog(tour)`               | `ContractDialog`                         | -                                |
| 需求     | `ClipboardList`  | 永遠顯示                                                 | `onOpenTourRequestDialog(tour)`            | `TourRequestDialog`                      | -                                |
| 封存     | `Archive`        | `!tour.archived`                                         | `onOpenArchiveDialog(tour)`                | `ArchiveReasonDialog`                    | `operations.handleArchiveTour()` |
| 解封     | `ArchiveRestore` | `tour.archived`                                          | `operations.handleArchiveTour(tour)`       | -                                        | `actions.update()`               |
| 解鎖結團 | `LockOpen`       | `archived && closing_status === 'closed' && super_admin` | `handleUnlockTour(tour)`                   | -                                        | `handleUnlockTour()`             |
| 刪除     | `Trash2`         | 永遠顯示                                                 | `setDeleteConfirm({ isOpen: true, tour })` | `DeleteConfirmDialog`                    | `actions.delete()`               |

#### 狀態轉換規則

```
提案 → 進行中 → 結案
  ↑       ↓
  └── (解鎖) ←┘

ALLOWED_STATUS_TRANSITIONS:
- '提案' → ['進行中', '取消']
- '進行中' → ['結案', '取消', '提案']  // 可解鎖回提案
- '結案' → []  // 終態
- '取消' → []  // 終態
```

#### Dialog 元件對照表

| Dialog 元件                 | 檔案路徑                                                    | 觸發來源      | 功能說明                       |
| --------------------------- | ----------------------------------------------------------- | ------------- | ------------------------------ |
| `TourForm`                  | `features/tours/components/TourForm.tsx`                    | 編輯按鈕      | 新增/編輯團資料                |
| `DocumentVersionPicker`     | `components/documents/DocumentVersionPicker.tsx`            | 報價/確認按鈕 | 報價單管理 + 確認出團          |
| `LinkItineraryToTourDialog` | `features/tours/components/LinkItineraryToTourDialog.tsx`   | 行程按鈕      | 連結行程表                     |
| `ContractDialog`            | `components/contracts/ContractDialog.tsx`                   | 合約按鈕      | 合約管理                       |
| `TourRequestDialog`         | `app/(main)/tour-requests/components/TourRequestDialog.tsx` | 需求按鈕      | 需求單管理                     |
| `ArchiveReasonDialog`       | `features/tours/components/ArchiveReasonDialog.tsx`         | 封存按鈕      | 選擇封存原因                   |
| `DeleteConfirmDialog`       | `features/tours/components/DeleteConfirmDialog.tsx`         | 刪除按鈕      | 確認刪除                       |
| `TourUnlockDialog`          | `features/tours/components/TourUnlockDialog.tsx`            | 解鎖按鈕      | 解鎖確認                       |
| `TourClosingDialog`         | `features/tours/components/TourClosingDialog.tsx`           | 結案按鈕      | 結案確認                       |
| `TourConfirmationWizard`    | `features/tours/components/TourConfirmationWizard.tsx`      | (已整合)      | 已整合至 DocumentVersionPicker |
| `TourDetailDialog`          | `components/tours/TourDetailDialog.tsx`                     | 點擊列        | 團詳細資訊                     |

#### 欄位對照表

| 前端顯示 | 前端欄位名             | API 欄位名             | 資料庫欄位                   | 類型      | 備註     |
| -------- | ---------------------- | ---------------------- | ---------------------------- | --------- | -------- |
| 團號     | `code`                 | `code`                 | `tours.code`                 | `string`  | 自動生成 |
| 團名     | `name`                 | `name`                 | `tours.name`                 | `string`  |          |
| 目的地   | `location`             | `location`             | `tours.location`             | `string`  |          |
| 出發日期 | `departure_date`       | `departure_date`       | `tours.departure_date`       | `date`    |          |
| 回程日期 | `return_date`          | `return_date`          | `tours.return_date`          | `date`    |          |
| 狀態     | `status`               | `status`               | `tours.status`               | `string`  | 中文值   |
| 人數上限 | `max_participants`     | `max_participants`     | `tours.max_participants`     | `integer` |          |
| 目前人數 | `current_participants` | `current_participants` | `tours.current_participants` | `integer` |          |
| 售價     | `price`                | `price`                | `tours.price`                | `numeric` |          |

---

### 2.2 訂單管理 `/orders`

#### 頁面來源

- **頁面檔案**: `src/app/(main)/orders/page.tsx`
- **表格組件**: `src/components/orders/simple-order-table.tsx`
- **表單組件**: `src/components/orders/add-order-form.tsx`
- **成員展開**: `src/components/orders/OrderMembersExpandable.tsx`
- **Hook**: `useOrdersListSlim`, `useToursListSlim`, `useMemberActions`

#### 頁面結構

```
/orders
├── ResponsiveHeader (標題、搜尋、分頁)
├── 狀態分頁 (Tab)
│   ├── all - 全部 (ShoppingCart)
│   ├── unpaid - 未收款 (AlertCircle)
│   ├── partial - 部分收款 (Clock)
│   ├── paid - 已收款 (CheckCircle)
│   ├── visa-only - 簽證專用 (Shield)
│   └── sim-only - 網卡專用 (Wifi)
├── SimpleOrderTable
│   └── 可展開 → OrderMembersExpandable
└── Dialog
    ├── AddOrderForm Dialog - 新增訂單
    └── QuickReceipt Dialog - 快速收款
```

#### 訂單操作按鈕對照表

| 按鈕 | 圖示     | 點擊動作                               | 跳轉/開啟                     |
| ---- | -------- | -------------------------------------- | ----------------------------- |
| 成員 | `User`   | `setExpandedOrderId(order.id)`         | 展開 `OrderMembersExpandable` |
| 收款 | `$`      | `router.push('/finance/payments?...')` | 跳轉收款頁面帶參數            |
| 請款 | `¥`      | `router.push('/finance/requests?...')` | 跳轉請款頁面帶參數            |
| 刪除 | `Trash2` | `deleteOrder(order.id)`                | 確認後刪除                    |

#### 篩選邏輯

```typescript
// 狀態篩選
case 'all':      // 排除簽證和網卡專用團
case 'visa-only': // 僅顯示簽證專用團
case 'sim-only':  // 僅顯示網卡專用團
default:          // 按 payment_status 篩選

// 排序：按團的出發日期排序（近的在前）
```

#### 欄位對照表

| 前端顯示 | 前端欄位名       | API 欄位名       | 資料庫欄位              | 類型      | 備註       |
| -------- | ---------------- | ---------------- | ----------------------- | --------- | ---------- |
| 訂單編號 | `order_number`   | `order_number`   | `orders.order_number`   | `string`  |            |
| 團號     | `code`           | `code`           | `orders.code`           | `string`  | 關聯 tours |
| 聯絡人   | `contact_person` | `contact_person` | `orders.contact_person` | `string`  |            |
| 業務     | `sales_person`   | `sales_person`   | `orders.sales_person`   | `string`  |            |
| 人數     | `member_count`   | `member_count`   | `orders.member_count`   | `integer` |            |
| 總金額   | `total_amount`   | `total_amount`   | `orders.total_amount`   | `numeric` |            |
| 已付金額 | `paid_amount`    | `paid_amount`    | `orders.paid_amount`    | `numeric` |            |
| 付款狀態 | `payment_status` | `payment_status` | `orders.payment_status` | `string`  |            |

---

### 2.3 訂單成員 (Order Members)

#### 欄位對照表

| 前端顯示 | 前端欄位名           | API 欄位名           | 資料庫欄位                         | 類型      | 備註 |
| -------- | -------------------- | -------------------- | ---------------------------------- | --------- | ---- |
| 護照姓名 | `passport_name`      | `passport_name`      | `order_members.passport_name`      | `string`  |      |
| 生日     | `birth_date`         | `birth_date`         | `order_members.birth_date`         | `date`    |      |
| 性別     | `gender`             | `gender`             | `order_members.gender`             | `string`  | M/F  |
| 身分證   | `id_number`          | `id_number`          | `order_members.id_number`          | `string`  |      |
| 護照號碼 | `passport_number`    | `passport_number`    | `order_members.passport_number`    | `string`  |      |
| 護照效期 | `passport_expiry`    | `passport_expiry`    | `order_members.passport_expiry`    | `date`    |      |
| 飲食禁忌 | `special_meal`       | `special_meal`       | `order_members.special_meal`       | `string`  |      |
| 應付金額 | `total_payable`      | `total_payable`      | `order_members.total_payable`      | `numeric` |      |
| 訂金     | `deposit_amount`     | `deposit_amount`     | `order_members.deposit_amount`     | `numeric` |      |
| 備註     | `remarks`            | `remarks`            | `order_members.remarks`            | `string`  |      |
| PNR      | `pnr`                | `pnr`                | `order_members.pnr`                | `string`  |      |
| 機票號碼 | `ticket_number`      | `ticket_number`      | `order_members.ticket_number`      | `string`  |      |
| 開票期限 | `ticketing_deadline` | `ticketing_deadline` | `order_members.ticketing_deadline` | `date`    |      |

---

## 3. API 端點完整對照表

### 3.1 Tours API

| 方法   | 端點                    | 功能       | Request Body           | Response      | 資料庫操作                            |
| ------ | ----------------------- | ---------- | ---------------------- | ------------- | ------------------------------------- |
| GET    | `/api/tours`            | 取得團列表 | -                      | `Tour[]`      | `SELECT * FROM tours`                 |
| GET    | `/api/tours/:id`        | 取得單一團 | -                      | `Tour`        | `SELECT * FROM tours WHERE id = :id`  |
| POST   | `/api/tours`            | 新增團     | `CreateTourInput`      | `Tour`        | `INSERT INTO tours`                   |
| PUT    | `/api/tours/:id`        | 更新團     | `UpdateTourInput`      | `Tour`        | `UPDATE tours SET ... WHERE id = :id` |
| DELETE | `/api/tours/:id`        | 刪除團     | -                      | `void`        | `DELETE FROM tours WHERE id = :id`    |
| POST   | `/api/tours/:id/unlock` | 解鎖團     | `{ password, reason }` | `{ success }` | `UPDATE tours SET status = '提案'`    |

### 3.2 Orders API

| 方法   | 端點              | 功能         | Request Body       | Response  | 資料庫操作              |
| ------ | ----------------- | ------------ | ------------------ | --------- | ----------------------- |
| GET    | `/api/orders`     | 取得訂單列表 | -                  | `Order[]` | `SELECT * FROM orders`  |
| POST   | `/api/orders`     | 新增訂單     | `CreateOrderInput` | `Order`   | `INSERT INTO orders`    |
| PUT    | `/api/orders/:id` | 更新訂單     | `UpdateOrderInput` | `Order`   | `UPDATE orders SET ...` |
| DELETE | `/api/orders/:id` | 刪除訂單     | -                  | `void`    | `DELETE FROM orders`    |

### 3.3 Quotes API

| 方法 | 端點              | 功能           | Request Body       | Response  | 資料庫操作              |
| ---- | ----------------- | -------------- | ------------------ | --------- | ----------------------- |
| GET  | `/api/quotes`     | 取得報價單列表 | -                  | `Quote[]` | `SELECT * FROM quotes`  |
| POST | `/api/quotes`     | 新增報價單     | `CreateQuoteInput` | `Quote`   | `INSERT INTO quotes`    |
| PUT  | `/api/quotes/:id` | 更新報價單     | `UpdateQuoteInput` | `Quote`   | `UPDATE quotes SET ...` |

---

## 4. 資料庫表格欄位清單

### 4.1 tours 表

| 欄位名               | 類型        | 預設值            | 說明      | 前端對應                    |
| -------------------- | ----------- | ----------------- | --------- | --------------------------- |
| id                   | uuid        | gen_random_uuid() | 主鍵      | `tour.id`                   |
| workspace_id         | uuid        | -                 | 工作區 ID | - (自動)                    |
| code                 | text        | -                 | 團號      | `tour.code`                 |
| name                 | text        | -                 | 團名      | `tour.name`                 |
| location             | text        | -                 | 目的地    | `tour.location`             |
| departure_date       | date        | -                 | 出發日期  | `tour.departure_date`       |
| return_date          | date        | -                 | 回程日期  | `tour.return_date`          |
| status               | text        | '提案'            | 狀態      | `tour.status`               |
| price                | numeric     | 0                 | 售價      | `tour.price`                |
| max_participants     | integer     | 20                | 人數上限  | `tour.max_participants`     |
| current_participants | integer     | 0                 | 目前人數  | `tour.current_participants` |
| archived             | boolean     | false             | 是否封存  | `tour.archived`             |
| created_at           | timestamptz | now()             | 建立時間  | -                           |
| updated_at           | timestamptz | now()             | 更新時間  | -                           |

### 4.2 orders 表

| 欄位名         | 類型    | 預設值            | 說明      | 前端對應               |
| -------------- | ------- | ----------------- | --------- | ---------------------- |
| id             | uuid    | gen_random_uuid() | 主鍵      | `order.id`             |
| workspace_id   | uuid    | -                 | 工作區 ID | - (自動)               |
| tour_id        | uuid    | -                 | 關聯團 ID | `order.tour_id`        |
| order_number   | text    | -                 | 訂單編號  | `order.order_number`   |
| code           | text    | -                 | 團號      | `order.code`           |
| contact_person | text    | -                 | 聯絡人    | `order.contact_person` |
| sales_person   | text    | -                 | 業務      | `order.sales_person`   |
| member_count   | integer | 1                 | 人數      | `order.member_count`   |
| total_amount   | numeric | 0                 | 總金額    | `order.total_amount`   |
| paid_amount    | numeric | 0                 | 已付金額  | `order.paid_amount`    |
| payment_status | text    | 'unpaid'          | 付款狀態  | `order.payment_status` |
| status         | text    | 'draft'           | 訂單狀態  | `order.status`         |

### 4.3 order_members 表

| 欄位名             | 類型    | 預設值            | 說明        | 前端對應                    |
| ------------------ | ------- | ----------------- | ----------- | --------------------------- |
| id                 | uuid    | gen_random_uuid() | 主鍵        | `member.id`                 |
| order_id           | uuid    | -                 | 關聯訂單 ID | `member.order_id`           |
| passport_name      | text    | -                 | 護照姓名    | `member.passport_name`      |
| birth_date         | date    | -                 | 生日        | `member.birth_date`         |
| gender             | text    | -                 | 性別        | `member.gender`             |
| id_number          | text    | -                 | 身分證      | `member.id_number`          |
| passport_number    | text    | -                 | 護照號碼    | `member.passport_number`    |
| passport_expiry    | date    | -                 | 護照效期    | `member.passport_expiry`    |
| special_meal       | text    | -                 | 飲食禁忌    | `member.special_meal`       |
| total_payable      | numeric | -                 | 應付金額    | `member.total_payable`      |
| deposit_amount     | numeric | -                 | 訂金        | `member.deposit_amount`     |
| remarks            | text    | -                 | 備註        | `member.remarks`            |
| pnr                | text    | -                 | PNR         | `member.pnr`                |
| ticket_number      | text    | -                 | 機票號碼    | `member.ticket_number`      |
| ticketing_deadline | date    | -                 | 開票期限    | `member.ticketing_deadline` |

---

## 5. 欄位名稱一致性檢查清單

### 待檢查項目

| 位置          | 欄位     | 前端名稱        | 後端名稱        | 一致? | 備註      |
| ------------- | -------- | --------------- | --------------- | ----- | --------- |
| order_members | 姓名     | `passport_name` | `passport_name` | ✅    |           |
| order_members | 生日     | `birth_date`    | `birth_date`    | ✅    |           |
| quotes        | 客戶名稱 | `customer_name` | `customer_name` | ✅    |           |
| -             | -        | -               | -               | -     | 待補充... |

### 已知不一致問題

| 位置 | 問題描述 | 前端 | 後端 | 修復建議      |
| ---- | -------- | ---- | ---- | ------------- |
| -    | -        | -    | -    | 待審計發現... |

---

## 6. 自動化檢查腳本

```bash
# 檢查前端 TypeScript 類型與資料庫 schema 是否一致
# 執行: npm run audit:fields

# 檢查 API 端點是否都有對應的前端呼叫
# 執行: npm run audit:api

# 檢查資料庫欄位是否都有在前端使用
# 執行: npm run audit:unused-fields
```

---

## 7. 功能因果關係圖

### 7.1 團確認流程

```
[提案狀態的團]
    │
    ├── 點擊「確認」按鈕
    │       │
    │       ▼
    │   [開啟報價單 Dialog (confirm 模式)]
    │       │
    │       ├── 左側：團體報價單列表
    │       │       └── 底部按鈕：「確認鎖定」
    │       │
    │       └── 右側：快速報價單列表
    │               └── 底部按鈕：「新增快速報價單」
    │
    ├── 點擊「確認鎖定」
    │       │
    │       ▼
    │   [呼叫 tourService.lockTour()]
    │       │
    │       ▼
    │   [資料庫更新]
    │       ├── tours.status = '進行中'
    │       ├── tours.locked_at = now()
    │       └── tours.locked_by = user.id
    │
    └── [團狀態變為「進行中」]
```

---

### 2.4 報價單管理 `/quotes`

#### 頁面結構

```
/quotes (報價單管理列表)
├── ResponsiveHeader
│   ├── 標題：報價單管理
│   ├── 圖標：Calculator
│   ├── 麵包屑：首頁 > 報價單管理
│   └── 搜尋功能：團號、團名搜尋
├── EnhancedTable（團列表）
│   ├── 團號（code）
│   ├── 團名（name）
│   ├── 目的地（location）
│   ├── 出發日期（departure_date）
│   ├── 人數（max_participants）
│   └── 報價單數量（quote_count）
└── DocumentVersionPicker（懸浮對話框）
    ├── 左欄：團體報價單（Q 開頭）
    │   ├── 報價單列表
    │   └── 新增團體報價單按鈕
    └── 右欄：快速報價單（X 開頭）
        ├── 報價單列表
        └── 新增快速報價單按鈕

/quotes/[id] (報價單詳細編輯頁)
├── 標準報價單（viewMode=standard）
│   └── QuoteDetail + QuoteHeader + CategorySection
└── 快速報價單（viewMode=quick）
    └── QuickQuoteDetail
```

#### 報價單類型對照表

| 類型       | 編號格式   | 範例      | 特性                         |
| ---------- | ---------- | --------- | ---------------------------- |
| 標準報價單 | `Q{6位數}` | `Q000001` | 完整分類、成本分析、版本管理 |
| 快速報價單 | `X{6位數}` | `X000001` | 簡易格式、快速產出           |

#### 標準 vs 快速報價單功能對比

| 功能       | 標準 | 快速 | 說明                              |
| ---------- | ---- | ---- | --------------------------------- |
| 分類編輯   | ✅   | ❌   | 標準有7個分類（交通/住宿/餐飲等） |
| 成本分析   | ✅   | ❌   | 標準顯示成本利潤                  |
| 砍次表     | ✅   | ❌   | 不同人數不同價格                  |
| 版本管理   | ✅   | ✅   | 都支援版本歷史                    |
| 行程表同步 | ✅   | ❌   | 只有標準支援                      |
| 確認機制   | ✅   | ✅   | 雙軌確認（客戶+業務）             |

#### 操作按鈕對照表（DocumentVersionPicker）

| 按鈕           | 圖示         | 點擊動作                        | 說明              |
| -------------- | ------------ | ------------------------------- | ----------------- |
| 報價單項目     | -            | `handleView()` → `/quotes/{id}` | 進入編輯頁        |
| 改名 (Hover)   | `Pencil`     | `handleStartRename()`           | inline 編輯       |
| 新增團體報價單 | `Plus`       | `handleCreateStandard()`        | 建立 Q 開頭報價單 |
| 新增快速報價單 | `Zap + Plus` | `handleCreateQuick()`           | 建立 X 開頭報價單 |

#### 使用的 Store 和 Service

| Store/Service   | 用途                                |
| --------------- | ----------------------------------- |
| `useQuoteStore` | 報價單 CRUD（createStore 工廠生成） |
| `quoteService`  | 複製報價單、計算總成本              |

---

### 2.5 行程表管理 `/itinerary`

#### 頁面結構

```
/itinerary（主列表頁面）
├── ResponsiveHeader
│   ├── 搜尋功能
│   ├── 狀態篩選（全部、提案、進行中、公司範例、結案）
│   └── 作者篩選
├── EnhancedTable（行程列表）
└── Dialog
    ├── CreateItineraryDialog
    ├── PasswordDialog
    └── DuplicateDialog

/itinerary/new（網頁行程編輯）
├── ItineraryHeader（發布/版本管理）
├── 左側：ItineraryEditor（表單）
└── 右側：ItineraryPreview（即時預覽）

/itinerary/block-editor（區塊編輯器）
├── BlockToolbox（區塊工具箱）
├── BlockCanvas（區塊畫布）
└── TourPreview（電腦/手機預覽）

/itinerary/print（紙本行程表）
├── PrintItineraryForm
└── PrintItineraryPreview

/itinerary/brochure-designer（A5 手冊設計）
├── BrochureDesignerPage
└── BrochureSidebar
```

#### 區塊類型對照表

| 區塊類型          | 名稱       | 圖示          | 必要 | 可刪除 |
| ----------------- | ---------- | ------------- | ---- | ------ |
| `COVER`           | 封面       | `Image`       | ✅   | ❌     |
| `FLIGHT`          | 航班資訊   | `Plane`       | ✅   | ❌     |
| `FEATURES`        | 行程特色   | `Star`        | ✅   | ❌     |
| `FOCUS_CARDS`     | 精選景點   | `MapPin`      | ✅   | ❌     |
| `LEADER_MEETING`  | 領隊與集合 | `Users`       | ✅   | ❌     |
| `HOTELS`          | 飯店資訊   | `Building`    | ✅   | ❌     |
| `DAILY_ITINERARY` | 每日行程   | `Calendar`    | ✅   | ❌     |
| `PRICING`         | 團費明細   | `DollarSign`  | ❌   | ✅     |
| `PRICE_TIERS`     | 價格方案   | `Tag`         | ❌   | ✅     |
| `FAQS`            | 常見問題   | `HelpCircle`  | ❌   | ✅     |
| `NOTICES`         | 提醒事項   | `AlertCircle` | ❌   | ✅     |
| `CANCELLATION`    | 取消政策   | `XCircle`     | ❌   | ✅     |

#### 版本控制機制

```typescript
interface ItineraryVersionRecord {
  id: string // UUID
  version: number // 版本號
  note: string // 版本備註
  daily_itinerary: DailyItineraryDay[]
  features?: ItineraryFeature[]
  focus_cards?: FocusCard[]
  leader?: LeaderInfo
  meeting_info?: MeetingInfo
  hotels?: HotelInfo[]
  created_at: string
}
```

#### 自動存檔機制

- **間隔**: 30 秒
- **狀態**: `idle` → `saving` → `saved` / `error`
- **觸發條件**: `isDirty = true`

#### 使用的 Store 和 Hook

| Store/Hook               | 用途           |
| ------------------------ | -------------- |
| `useItineraryStore`      | 行程表 CRUD    |
| `useItineraryEditor`     | 編輯器狀態管理 |
| `useItineraryDataLoader` | 資料載入       |
| `usePublish`             | 發布/版本管理  |

---

### 2.6 財務模組 `/finance`

#### 頁面結構

```
/finance（財務首頁）
├── 財務總覽卡片（總收入、總支出、淨利潤、待確認款項）
├── 功能模組連結
│   ├── 財務管理 → /finance/payments
│   ├── 出納管理 → /finance/treasury
│   └── 報表管理 → /finance/reports
└── 交易紀錄表格

/finance/requests（請款管理）
├── ResponsiveHeader
│   ├── 新增請款（Plus）
│   └── 批次請款（Layers）
└── 請款單列表表格
    ├── 請款單號、團名、訂單編號
    ├── 請款日期、金額
    └── 狀態（請款中/已確認/已付款）

/finance/payments（收款管理）
├── ResponsiveHeader
│   ├── 進階搜尋（Search）
│   ├── 匯出 Excel（FileDown）
│   ├── 批量確認（CheckSquare）*需權限
│   ├── 批量收款（Layers）
│   └── 新增收款（Plus）
└── 收款單列表表格
    ├── 收款單號、收款日期
    ├── 訂單編號、團名
    ├── 應收/實收金額
    └── 狀態（待確認/已確認）

/finance/treasury（出納管理）
└── → 重導向到 /finance/treasury/disbursement

/finance/treasury/disbursement（出納單管理）
├── 時間範圍選擇
├── 出納單列表
│   ├── 出納單號（P250128A）
│   ├── 出帳日期、金額
│   └── 狀態（pending/confirmed）
└── 待出帳請款單列表

/finance/travel-invoice（代轉發票）
├── ResponsiveHeader
│   ├── 搜尋（交易編號、發票號碼、買受人）
│   ├── 狀態標籤頁（全部/待處理/已開立/已作廢/已折讓/失敗）
│   └── 開立新發票（Plus）
└── 發票列表表格
```

#### 財務操作按鈕對照表

| 頁面     | 按鈕       | 圖示          | 功能       | 開啟 Dialog                  |
| -------- | ---------- | ------------- | ---------- | ---------------------------- |
| 請款管理 | 新增請款   | `Plus`        | 建立請款單 | `AddRequestDialog`           |
| 請款管理 | 批次請款   | `Layers`      | 批次建立   | `BatchAllocateRequestDialog` |
| 收款管理 | 新增收款   | `Plus`        | 建立收款單 | `AddReceiptDialog`           |
| 收款管理 | 批量收款   | `Layers`      | 批量建立   | `BatchReceiptDialog`         |
| 收款管理 | 批量確認   | `CheckSquare` | 批量確認   | `BatchConfirmReceiptDialog`  |
| 收款管理 | 進階搜尋   | `Search`      | 篩選       | `ReceiptSearchDialog`        |
| 收款管理 | 匯出 Excel | `FileDown`    | 匯出       | -                            |
| 收款管理 | 確認金額   | `Eye`         | 確認收款   | `ReceiptConfirmDialog`       |
| 代轉發票 | 開立新發票 | `Plus`        | 建立發票   | `InvoiceDialog`              |

#### 收款方式

| 代碼 | 收款方式         |
| ---- | ---------------- |
| 0    | 銀行匯款         |
| 1    | 現金             |
| 2    | 信用卡           |
| 3    | 支票             |
| 4    | LinkPay 線上付款 |

#### 財務狀態流轉

```
【請款流程】
  pending → approved → processing → paid

【收款流程】
  status='0'（待確認）→ status='1'（已確認）

【發票流程】
  pending → issued
    ├→ voided（作廢）
    └→ allowance（折讓）

【出納單流程】
  pending → confirmed
```

#### 使用的 Store

| Store                   | 用途               |
| ----------------------- | ------------------ |
| `useAccountingStore`    | 交易資料、統計信息 |
| `usePayments`           | 請款單 CRUD        |
| `usePaymentData`        | 收款單資料         |
| `useTravelInvoiceStore` | 發票管理           |
| `useDisbursementData`   | 出納單資料         |

---

### 2.7 設定與資料庫 `/settings` & `/database`

#### 設定頁面結構

```
/settings（設定首頁）
├── 一般使用者可見
│   ├── AppearanceSettings（主題設定）
│   ├── PreferredFeaturesSettings（常用功能）
│   └── AccountSettings（帳號安全）
└── 需要權限才顯示
    ├── ApiSettings（API 設定）
    ├── NewebPaySettings（藍新金流）
    ├── DevToolsSettings（開發者工具）
    ├── PermissionManagementSettings → /settings/permissions
    ├── ModuleManagementSettings → /settings/modules
    ├── WorkspaceSwitcher（工作空間切換）
    └── SystemSettings（系統維護）

/settings/workspaces（工作空間管理）
├── 資料隔離說明卡片
└── 工作空間列表
    ├── 工作空間名稱、描述
    ├── 員工數統計
    └── 操作：停用/啟用、編輯

/settings/permissions（權限管理）
└── 功能已停用通知（改用前端過濾）

/settings/menu（選單設定）
├── 核心功能說明
├── 分類選單開關
│   ├── 業務管理
│   ├── 財務管理
│   ├── 人力資源
│   └── 系統設定
└── 操作按鈕：儲存、重設

/settings/modules（模組管理）
├── 工作空間資訊卡片
└── 模組卡片列表
    ├── accounting（會計模組）
    ├── inventory（庫存模組）*開發中
    └── bi_analytics（BI 分析）*開發中
```

#### 資料庫頁面結構

```
/database（資料庫首頁）
├── 概覽卡片（統計數字）
└── 資料庫模組卡片
    ├── 旅遊資料庫 → /database/attractions
    ├── 車資管理 → /database/transportation-rates
    ├── 供應商管理 → /database/suppliers
    ├── 公司資源管理 → /database/company-assets
    └── 封存資料管理 → /database/archive-management

/database/attractions（旅遊資料庫）
├── 分頁標籤
│   ├── 國家/區域（Globe）
│   ├── 景點活動（MapPin）
│   ├── 米其林餐廳（Star）
│   └── 頂級體驗（Sparkles）
├── 篩選器（國家、分類）
└── 表格列表

/database/suppliers（供應商管理）
├── 搜尋框
├── 新增按鈕
└── 供應商列表
    ├── name（供應商名稱）*必填
    ├── bank_name（銀行名稱）
    ├── bank_account（銀行帳號）
    └── note（備註）

/database/tour-leaders（領隊資料庫）
├── 搜尋框
├── 新增按鈕
└── 領隊列表
    ├── name（中文名稱）*必填
    ├── name_en（英文名稱）
    ├── phone、email、address
    ├── national_id（身分證）
    ├── passport_number、passport_expiry
    ├── languages、specialties
    ├── license_number（證照編號）
    └── status（active/inactive）

/database/transportation-rates（車資管理）
├── 新增國家按鈕
├── 國家列表卡片
└── RatesDetailDialog（車資詳細表格）

/database/company-assets（公司資源管理）
├── 搜尋框
├── 新增按鈕
└── 資源列表
    ├── 資源類型：image/document/logo/seal
    └── restricted（受限資源）
```

#### 設定頁面權限要求

| 頁面                    | 需要權限          | 說明               |
| ----------------------- | ----------------- | ------------------ |
| `/settings`             | 登入即可          | 帳號設定所有人可見 |
| `/settings/workspaces`  | admin/super_admin | 工作空間管理       |
| `/settings/permissions` | 無（已停用）      | 權限管理已停用     |
| `/settings/menu`        | 登入即可          | 選單個人化         |
| `/settings/modules`     | admin/super_admin | 模組授權           |

#### 使用的 Store

| Store                     | 用途                 |
| ------------------------- | -------------------- |
| `useAuthStore`            | 使用者資訊、權限驗證 |
| `useThemeStore`           | 主題設定             |
| `useUserStore`            | 使用者資料更新       |
| `useWorkspaceChannels`    | 工作空間管理         |
| `useWorkspaceModuleStore` | 模組授權             |
| `useSupplierStore`        | 供應商 CRUD          |
| `useTourLeaderStore`      | 領隊 CRUD            |

---

### 2.8 會計模組 `/accounting` & `/erp-accounting`

#### 頁面結構

```
/accounting（個人記帳）
├── ResponsiveHeader
│   ├── 帳戶管理（Wallet）→ AccountsManagementDialog
│   └── 新增記帳（Plus）→ AddTransactionDialog
├── 統計卡片（本月支出、收入、月底天數）
├── 快速記帳卡片（手機版）
└── 今日交易列表

/erp-accounting（企業會計）
├── /erp-accounting/vouchers（會計傳票）
│   ├── 搜尋：傳票編號、摘要
│   └── VouchersPage 表格
│       ├── voucher_no、voucher_date、memo
│       ├── total_debit、total_credit
│       ├── status（draft/posted/reversed/locked）
│       └── 操作：查看（Eye）、反沖（RotateCcw）
├── /erp-accounting/settings/accounts（科目表管理）
│   └── AccountsPage
│       ├── code、name、account_type
│       ├── is_system_locked、is_active
│       └── 操作：編輯（Pencil）、刪除（Trash2）
└── /erp-accounting/settings/banks（銀行帳戶管理）
    └── BankAccountsPage
        └── name、bank_name、account_number
```

#### 會計操作按鈕對照表

| 頁面     | 按鈕     | 圖示        | 動作     | 開啟 Dialog            |
| -------- | -------- | ----------- | -------- | ---------------------- |
| 傳票列表 | 查看明細 | `Eye`       | 查看分錄 | `VoucherDetailDialog`  |
| 傳票列表 | 反沖     | `RotateCcw` | 反沖傳票 | `ReverseVoucherDialog` |
| 科目表   | 新增     | `Plus`      | 新增科目 | `AccountDialog`        |
| 科目表   | 編輯     | `Pencil`    | 編輯科目 | `AccountDialog`        |
| 銀行帳戶 | 新增     | `Plus`      | 新增帳戶 | `BankAccountDialog`    |
| 銀行帳戶 | 編輯     | `Pencil`    | 編輯帳戶 | `BankAccountDialog`    |

#### 會計 API 端點

| 端點                                         | 功能           |
| -------------------------------------------- | -------------- |
| `POST /api/accounting/reverse`               | 傳票反沖       |
| `POST /api/accounting/post/customer-receipt` | 客戶收款過帳   |
| `POST /api/accounting/post/supplier-payment` | 供應商付款過帳 |
| `POST /api/accounting/post/group-settlement` | 結團過帳       |

#### 使用的 Store

| Store                  | 表格                | 用途                |
| ---------------------- | ------------------- | ------------------- |
| `useAccounts()`        | `chart_of_accounts` | 科目表管理          |
| `useBankAccounts()`    | `erp_bank_accounts` | 銀行帳戶            |
| `useJournalVouchers()` | `journal_vouchers`  | 會計傳票            |
| `useJournalLines()`    | `journal_lines`     | 傳票分錄            |
| `useAccountingStore`   | -                   | 個人記帳（Zustand） |

---

### 2.9 客戶管理 `/customers`

#### 頁面結構

```
/customers（客戶列表）
├── ResponsiveHeader
│   ├── 進階搜尋（Search）→ CustomerSearchDialog
│   ├── 清除條件（X）
│   └── 新增顧客（Plus）→ CustomerAddDialog
├── 客戶列表表格
│   ├── code、name、passport_romanization
│   ├── phone、passport_number、passport_expiry_date
│   ├── national_id、date_of_birth
│   ├── dietary_restrictions、vip
│   └── 操作：驗證（AlertTriangle）、編輯（Edit）、刪除（Trash2）
└── Dialog
    ├── CustomerAddDialog（手動/OCR 新增）
    ├── CustomerVerifyDialog（驗證編輯）
    ├── CustomerDetailDialog（詳情）
    └── ResetPasswordDialog（重設密碼）

/customers/companies（企業客戶）
└── CompanyFormDialog
```

#### 客戶操作按鈕對照表

| 按鈕     | 圖示            | 條件            | 動作     | 開啟 Dialog            |
| -------- | --------------- | --------------- | -------- | ---------------------- |
| 進階搜尋 | `Search`        | 永遠            | 篩選客戶 | `CustomerSearchDialog` |
| 新增顧客 | `Plus`          | 永遠            | 新增客戶 | `CustomerAddDialog`    |
| 驗證     | `AlertTriangle` | 未驗證+有護照圖 | 驗證資料 | `CustomerVerifyDialog` |
| 編輯     | `Edit`          | 永遠            | 編輯客戶 | `CustomerVerifyDialog` |
| 刪除     | `Trash2`        | 永遠            | 刪除客戶 | 確認 Dialog            |

#### 客戶驗證狀態

| 狀態值       | 中文   | 說明                       |
| ------------ | ------ | -------------------------- |
| `verified`   | 已驗證 | 人工驗證通過               |
| `unverified` | 未驗證 | 待驗證（OCR 新建或編輯後） |
| `rejected`   | 已拒絕 | 驗證失敗                   |

#### 使用的 Store/Hook

| Hook                  | 用途               |
| --------------------- | ------------------ |
| `useCustomers()`      | 客戶 CRUD          |
| `useCustomerSearch()` | 搜尋/篩選邏輯      |
| `useCustomerVerify()` | 驗證對話框狀態     |
| `usePassportUpload()` | 護照批次上傳 + OCR |

---

### 2.10 簽證管理 `/visas`

#### 頁面結構

```
/visas（簽證列表）
├── ResponsiveHeader
│   ├── 查看簽證資訊（Info）→ VisasInfoDialog
│   ├── 批次下件（Upload）→ BatchPickupDialog（高級）
│   └── 新增簽證（Plus）→ AddVisaDialog
├── 狀態分頁（Tab）
│   ├── all（全部）
│   ├── pending（待送件）
│   ├── submitted（已送件）
│   ├── collected（已取件）
│   ├── rejected（退件）
│   └── returned（已歸還）
└── 簽證列表（勾選操作）
    └── 批次按鈕：送件、取件、歸還、退件
```

#### 簽證操作按鈕對照表

| 按鈕 | 顯示條件                             | 動作             | 開啟 Dialog             |
| ---- | ------------------------------------ | ---------------- | ----------------------- |
| 送件 | pending/submitted/collected/rejected | 更新為 submitted | `SubmitVisaDialog`      |
| 取件 | submitted/rejected                   | 更新為 collected | `BatchPickupDialog`     |
| 歸還 | collected/rejected                   | 更新為 returned  | `ReturnDocumentsDialog` |
| 退件 | pending/submitted/collected          | 更新為 rejected  | `BatchRejectDialog`     |
| 編輯 | 行內                                 | 編輯簽證         | `EditVisaDialog`        |
| 刪除 | 行內                                 | 刪除簽證         | 確認 Dialog             |

#### 簽證狀態流轉

```
pending（待送件）
  ├─ [送件] → submitted（已送件）
  └─ [退件] → rejected（退件）

submitted（已送件）
  ├─ [取件] → collected（已取件）
  └─ [退件] → rejected（退件）

collected（已取件）
  ├─ [歸還] → returned（已歸還）終態
  └─ [退件] → rejected（退件）

rejected（退件）
  ├─ [送件] → submitted（重新送件）
  └─ [歸還] → returned（已歸還）終態
```

#### 簽證類型與費用

| 簽證類型    | 預設費用  | 預計天數 |
| ----------- | --------- | -------- |
| 護照 成人   | NT$1,800  | 21 天    |
| 護照 兒童   | NT$1,500  | 21 天    |
| 台胞證      | NT$1,800  | 14 天    |
| 台胞證 首辦 | NT$800    | 14 天    |
| 美國 ESTA   | NT$1,000  | 3 天     |
| 急件        | +NT$1,000 | 縮短     |

#### 使用的 Store

| Store                | 用途           |
| -------------------- | -------------- |
| `useVisaStore`       | 簽證 CRUD      |
| `useOrderStore`      | 關聯訂單       |
| `useVendorCostStore` | 代辦商成本歷史 |

---

### 2.11 員工管理 `/hr`

#### 頁面結構

```
/hr（人資管理）
├── ResponsiveHeader
│   ├── 薪資請款（DollarSign）→ SalaryPaymentDialog
│   └── 新增員工（Plus）→ AddEmployeeDialog
├── 員工列表表格
│   ├── employee_number、display_name
│   ├── workspace_id、position
│   ├── roles、personal_info
│   ├── status、hire_date
│   └── 操作：編輯、辦理離職、刪除
└── EmployeeExpandedView（員工詳細 Dialog）
    ├── Tab 1: 基本資料（BasicInfoTab）
    ├── Tab 2: 薪資（SalaryTab）
    └── Tab 3: 權限（PermissionsTabNew）
```

#### 員工操作按鈕對照表

| 位置   | 按鈕     | 圖示         | 動作       | 開啟 Dialog            |
| ------ | -------- | ------------ | ---------- | ---------------------- |
| Header | 薪資請款 | `DollarSign` | 建立請款單 | `SalaryPaymentDialog`  |
| Header | 新增員工 | `Plus`       | 新增員工   | `AddEmployeeDialog`    |
| 行內   | 編輯     | `Edit2`      | 展開詳細   | `EmployeeExpandedView` |
| 行內   | 辦理離職 | `UserX`      | 變更狀態   | 確認 Dialog            |
| 行內   | 刪除     | `Trash2`     | 刪除員工   | 確認 Dialog            |

#### 員工狀態

| 狀態值       | 中文   | 顏色            |
| ------------ | ------ | --------------- |
| `active`     | 在職   | morandi-primary |
| `probation`  | 試用期 | status-warning  |
| `leave`      | 請假   | status-info     |
| `terminated` | 離職   | morandi-red     |

#### RBAC 角色矩陣

| 角色                 | ID            | 說明                   |
| -------------------- | ------------- | ---------------------- |
| 擁有平台管理資格的人 | `super_admin` | 所有權限，跨 workspace |
| 系統主管             | `系統主管`    | workspace 內所有權限   |
| 領隊                 | `tour_leader` | 管理自己帶的團         |
| 業務                 | `sales`       | 報價單、客戶、訂單     |
| 會計                 | `accountant`  | 財務、付款、會計       |
| 助理                 | `assistant`   | 訂單、客戶、行政       |
| 一般員工             | `staff`       | 基本查看權限           |

#### 使用的 Store

| Store                  | 用途         |
| ---------------------- | ------------ |
| `useUserStore`         | 員工 CRUD    |
| `useAuthStore`         | 當前用戶資訊 |
| `useWorkspaceChannels` | 工作空間管理 |

---

### 2.12 頻道管理 `/workspace`

#### 頁面結構

```
/workspace（頻道工作區）
├── ChannelSidebar（左側邊欄）
│   ├── WorkspaceHeader（搜尋、篩選、設定）
│   ├── ChannelList（頻道列表）
│   │   ├── AnnouncementChannels（公告頻道）
│   │   ├── FavoriteChannels（已星標）
│   │   ├── UserGroupedChannels（分組頻道）
│   │   ├── UngroupedChannels（未分組）
│   │   ├── UnjoinedChannels（未加入）
│   │   └── ArchivedChannels（已歸檔）
│   └── DMMembers（私訊成員）
└── ChannelTabs（右側主區域）
    ├── ChatHeader（模式切換）
    ├── ChatMessages（訊息列表）
    │   └── MessageItem（單則訊息）
    │       ├── 反應表情
    │       ├── 回覆討論串
    │       └── 刪除訊息
    └── ThreadPanel（討論串側邊 - Slack 風格）
```

#### 頻道類型

| 類型     | 值                                | 特性                   |
| -------- | --------------------------------- | ---------------------- |
| 公開頻道 | `public`                          | 所有成員可見，自由加入 |
| 私密頻道 | `private`                         | 需邀請加入             |
| 直接訊息 | `direct`                          | 一對一聊天             |
| 公告頻道 | `public` + `is_announcement=true` | 僅系統主管可發言       |

#### 頻道操作按鈕對照表

| 位置     | 按鈕     | 圖示               | 動作           | 開啟 Dialog       |
| -------- | -------- | ------------------ | -------------- | ----------------- |
| Header   | 搜尋     | `Search`           | 篩選頻道       | -                 |
| Header   | 刷新     | `RefreshCw`        | 重載列表       | -                 |
| Header   | 設定     | `Settings`         | 建立頻道/群組  | 下拉菜單          |
| 頻道項目 | 星標     | `Star`             | 加/移除星標    | -                 |
| 頻道項目 | 更多     | `EllipsisVertical` | 編輯/刪除/成員 | 內容菜單          |
| 訊息輸入 | 快速操作 | `Plus`             | 分享清單       | `QuickActionMenu` |
| 訊息輸入 | 附件     | `Paperclip`        | 上傳檔案       | -                 |
| 訊息項目 | 反應     | `Smile`            | 表情反應       | 表情選擇器        |
| 訊息項目 | 回覆     | `MessageSquare`    | 討論串         | `ThreadPanel`     |
| 訊息項目 | 刪除     | `Trash2`           | 刪除訊息       | -                 |

#### 快速操作菜單

| ID              | 圖示          | 名稱         | 開啟 Dialog                  |
| --------------- | ------------- | ------------ | ---------------------------- |
| `share-order`   | `Receipt`     | 分享待收款   | `ShareOrdersDialog`          |
| `share-quote`   | `Receipt`     | 分享報價單   | `ShareQuoteDialog`           |
| `new-payment`   | `DollarSign`  | 新增請款單   | `CreatePaymentRequestDialog` |
| `new-receipt`   | `DollarSign`  | 新增收款單   | `CreateReceiptDialog`        |
| `share-advance` | `Wallet`      | 分享代墊清單 | `ShareAdvanceDialog`         |
| `new-task`      | `CheckSquare` | 新增任務     | 內部邏輯                     |

#### 使用的 Store

| Store                   | 用途       |
| ----------------------- | ---------- |
| `useChannelsStore`      | 頻道 CRUD  |
| `useChatStore`          | 訊息管理   |
| `useChannelMemberStore` | 頻道成員   |
| `useWorkspaceStore`     | 工作區管理 |

---

### 2.13 需求單管理 `/tour-requests`

#### 頁面結構

```
TourRequestsPage (主頁面)
├── ListPageLayout (列表頁佈局)
│   ├── 頁面標題: "需求管理"
│   ├── 麵包屑導航
│   ├── 搜尋功能 (搜尋欄位: code, title, tour_code, tour_name)
│   ├── 狀態標籤頁 (6 個選項)
│   │   ├── 全部
│   │   ├── 待處理 (pending)
│   │   ├── 處理中 (in_progress)
│   │   ├── 已回復 (replied)
│   │   ├── 已確認 (confirmed)
│   │   └── 已完成 (completed)
│   └── EnhancedTable (資料表格)
│       ├── 編號 (code)
│       ├── 需求名稱 + 類別圖示 (title + category icon)
│       ├── 類別 Badge (category)
│       ├── 團號 (tour_code)
│       ├── 服務日期 (service_date)
│       ├── 優先級 Badge (priority)
│       ├── 狀態 (status)
│       ├── 處理方式 (handler_type: 內部/外部)
│       └── 操作按鈕 (檢視、編輯、刪除)
├── TourRequestDialog (新增/編輯對話框)
└── TourRequestDetailDialog (詳情對話框)
```

#### 操作按鈕對照表

| 按鈕     | 圖示     | 位置                  | 動作           | 開啟 Dialog             |
| -------- | -------- | --------------------- | -------------- | ----------------------- |
| 新增需求 | `Plus`   | ListPageLayout 標題列 | 開啟新增對話框 | TourRequestDialog       |
| 檢視     | `Eye`    | ActionCell            | 開啟詳情對話框 | TourRequestDetailDialog |
| 編輯     | `Edit2`  | ActionCell            | 開啟編輯對話框 | TourRequestDialog       |
| 刪除     | `Trash2` | ActionCell            | 刪除後刷新列表 | 確認 Dialog             |

#### 狀態流轉

```
草稿 (draft)
    ↓
待處理 (pending)
    ↓
處理中 (in_progress)
    ↓
已回復 (replied)
    ↓
已確認 (confirmed)
    ↓
已完成 (completed)

備註：可隨時轉入 cancelled (已取消) 狀態
```

#### 類別對應

| 類別       | 圖示             | 顏色         |
| ---------- | ---------------- | ------------ |
| flight     | `Plane`          | info (藍)    |
| hotel      | `Hotel`          | success (綠) |
| transport  | `Car`            | warning (黃) |
| restaurant | `Utensils`       | danger (紅)  |
| ticket     | `Ticket`         | info (藍)    |
| guide      | `User`           | default (灰) |
| itinerary  | `Map`            | success (綠) |
| other      | `MoreHorizontal` | default (灰) |

#### 使用的 Store

| Store                    | 用途                  |
| ------------------------ | --------------------- |
| `useTourRequests()`      | 需求單資料管理 (CRUD) |
| `useWorkspaceChannels()` | 取得當前 workspace_id |

---

### 2.14 日曆功能 `/calendar`

#### 頁面結構

```
日曆頁面 (CalendarPage)
├── ResponsiveHeader
│   ├── 標題: "行事曆"
│   ├── 月份切換控制組
│   ├── 按鈕: 今天
│   ├── 視圖切換按鈕組 (月/週/日)
│   ├── Workspace 篩選 [僅擁有平台管理資格的人]
│   ├── 按鈕: 生日名單 (Cake)
│   ├── 按鈕: 顯示設定 (Settings)
│   └── 按鈕: 新增事項 (Plus)
├── CalendarGrid (FullCalendar)
│   ├── 月視圖: dayGridMonth
│   ├── 週視圖: timeGridWeek
│   └── 日視圖: timeGridDay
├── AddEventDialog (新增事項)
├── EventDetailDialog (事件詳情)
├── EditEventDialog (編輯事項)
├── MoreEventsDialog (更多事件)
├── BirthdayListDialog (生日名單)
└── CalendarSettingsDialog (顯示設定)
```

#### 事件類型與顏色

| 事件類型     | 背景色     | 圖示          | 可編輯 | 可刪除 |
| ------------ | ---------- | ------------- | ------ | ------ |
| **tour**     | 依狀態變化 | `MapPin`      | 否     | 否     |
| **personal** | `#B8A9D1`  | `CheckSquare` | 是     | 是     |
| **company**  | `#E0C3A0`  | `Briefcase`   | 有條件 | 有條件 |
| **birthday** | `#E6B8C8`  | `Cake`        | 否     | 否     |

#### 操作按鈕對照表

| 按鈕         | 圖示                                      | 條件                        | 動作           | 開啟 Dialog            |
| ------------ | ----------------------------------------- | --------------------------- | -------------- | ---------------------- |
| 上月         | `←`                                       | -                           | 顯示上個月     | -                      |
| 下月         | `→`                                       | -                           | 顯示下個月     | -                      |
| 今天         | -                                         | -                           | 回到今月       | -                      |
| 月/週/日視圖 | `Calendar`/`CalendarDays`/`CalendarClock` | -                           | 切換視圖       | -                      |
| 生日名單     | `Cake`                                    | -                           | 打開生日名單   | BirthdayListDialog     |
| 顯示設定     | `Settings`                                | -                           | 打開顯示設定   | CalendarSettingsDialog |
| 新增事項     | `Plus`                                    | -                           | 新增行事曆事項 | AddEventDialog         |
| 刪除         | `Trash2`                                  | 非 tour/birthday 且為建立者 | 刪除事件       | ConfirmDialog          |
| 編輯         | -                                         | 非 tour/birthday 且為建立者 | 編輯事項       | EditEventDialog        |

#### 顯示設定選項

- 個人行事曆：只有您能看到的個人事項
- 公司行事曆：全公司共享的會議與活動
- 旅遊團：自動顯示旅遊團出發與返回日期

#### 使用的 Store/Hook

| Store/Hook                | 用途                           |
| ------------------------- | ------------------------------ |
| `useCalendarStore`        | UI 狀態管理 (日期、視圖、設定) |
| `useCalendarEventStore`   | 行事曆事件 CRUD                |
| `useCalendarEvents()`     | 資料轉換與過濾                 |
| `useCalendarNavigation()` | 月份/視圖切換                  |
| `useEventOperations()`    | 事件 CRUD 操作                 |
| `useTourStore`            | 旅遊團資料                     |
| `useCustomerStore`        | 客戶資料 (生日)                |

---

### 2.15 待辦事項 `/todos`

#### 頁面結構

```
待辦事項頁面
├── ResponsiveHeader
│   ├── 標題: "待辦事項"
│   ├── 搜尋框: 搜尋任務標題
│   ├── 快速新增輸入框 (Enter 提交)
│   └── 狀態篩選按鈕組 (未完成/待辦/進行中/已完成)
├── EnhancedTable (待辦事項列表)
│   ├── 任務標題 + 未讀留言數紅點
│   ├── 優先級 (星級評分)
│   ├── 狀態徽章
│   ├── 期限日期 (帶顏色提示)
│   └── 行操作按鈕 (完成/編輯/刪除)
├── TodoExpandedView (展開詳細檢視)
│   ├── 左半部
│   │   ├── 標題與優先級卡片
│   │   ├── AssignmentSection (基本資訊)
│   │   └── NotesSection (備註)
│   └── 右半部 (僅可編輯者)
│       ├── QuickActionsSection (快速功能分頁)
│       │   ├── 收款 (receipt)
│       │   ├── 請款 (invoice)
│       │   ├── 開團 (group)
│       │   ├── PNR (pnr)
│       │   └── 共享 (share)
│       └── 快速操作按鈕
└── ConfirmDialog (刪除確認)
```

#### 操作按鈕對照表

| 按鈕          | 圖示          | 條件     | 動作             | 開啟 Dialog      |
| ------------- | ------------- | -------- | ---------------- | ---------------- |
| 新增任務      | `Plus`        | 已登入   | 開啟新增對話框   | AddTodoDialog    |
| 快速新增      | Enter         | 輸入內容 | 直接新增待辦     | -                |
| 完成/取消完成 | `CheckCircle` | -        | 切換狀態         | -                |
| 編輯          | `Edit2`       | -        | 展開詳細檢視     | TodoExpandedView |
| 刪除          | `Trash2`      | -        | 確認後刪除       | ConfirmDialog    |
| 標記完成      | `Check`       | canEdit  | 更新為 completed | -                |
| 延期一週      | `Calendar`    | canEdit  | 期限延後7天      | -                |

#### 狀態流轉

```
pending (待辦)
    │
    ├→ in_progress (進行中) ← [新增備註時自動轉換]
    │       │
    │       ├→ completed (已完成)
    │       └→ cancelled (取消)
    │
    ├→ completed (已完成)
    └→ cancelled (取消)
```

#### 權限機制

| 條件                  | 權限                         |
| --------------------- | ---------------------------- |
| creator = 當前用戶    | 完全編輯 (canEdit=true)      |
| assignee = 當前用戶   | 完全編輯 (canEdit=true)      |
| visibility 包含用戶ID | 完全編輯 (canEdit=true)      |
| is_public = true      | 唯讀 (canEdit=false, 可留言) |

#### 截止日期視覺提示

| 條件  | 顏色   |
| ----- | ------ |
| 逾期  | 紅色   |
| 今天  | 金色   |
| 3天內 | 淡金色 |
| 其他  | 次要色 |

#### 使用的 Store/Hook

| Store/Hook         | 用途                     |
| ------------------ | ------------------------ |
| `useTodos`         | 待辦事項 CRUD + Realtime |
| `useAuthStore`     | 當前登入用戶             |
| `useUserStore`     | 員工列表 (用於指派)      |
| `useConfirmDialog` | 刪除確認對話框           |

---

### 2.16 eSIM 管理 `/esims`

#### 頁面結構

```
EsimsPage
├── ListPageLayout
│   ├── ResponsiveHeader (頁面標題：網卡管理)
│   ├── 搜尋列 + "詳細搜尋" 按鈕 + "新增網卡" 按鈕
│   └── EnhancedTable (表格組件)
│       ├── 網卡單號 (esim_number)
│       ├── 團名、訂單編號
│       ├── 商品ID、數量、單價、總金額
│       ├── 供應商訂單號
│       ├── 狀態
│       └── 操作按鈕列
├── EsimSearchDialog (詳細搜尋)
└── EsimCreateDialog (批次新增網卡)
    ├── 上半部：聯絡資訊 (團號/訂單/聯絡人)
    └── 下半部：批次網卡列表
        ├── 產品地區選擇器
        ├── 商品選擇 (依地區過濾)
        ├── 數量選擇 (1-9)
        ├── 接收信箱
        └── 備註
```

#### 操作按鈕對照表

| 按鈕     | 圖示        | 位置         | 動作               | 開啟 Dialog      |
| -------- | ----------- | ------------ | ------------------ | ---------------- |
| 詳細搜尋 | `Search`    | Header       | 開啟搜尋對話框     | EsimSearchDialog |
| 新增網卡 | `Plus`      | Header       | 開啟批次新增對話框 | EsimCreateDialog |
| 編輯     | `Edit2`     | ActionCell   | 跳轉詳細頁         | -                |
| 刪除     | `Trash2`    | ActionCell   | 確認後刪除         | 確認 Dialog      |
| 重新整理 | `RefreshCw` | CreateDialog | 重載 FastMove 產品 | -                |
| 新增行   | `+`         | 批次列表     | 新增網卡項目       | -                |
| 刪除行   | `✕`         | 批次列表     | 刪除該項目         | -                |

#### eSIM 狀態

| 狀態值 | 名稱   | 顏色          | 圖示          |
| ------ | ------ | ------------- | ------------- |
| 0      | 待確認 | morandi-gold  | `Clock`       |
| 1      | 已確認 | morandi-green | `CheckCircle` |
| 2      | 錯誤   | morandi-red   | `XCircle`     |

#### eSIM 編號規則

- 格式：`E{團號}{序號}`
- 範例：`ETP25010101`, `ETP25010102`
- 序號自動遞增

#### 使用的 Store/Service

| Store/Service     | 用途                |
| ----------------- | ------------------- |
| `useEsimStore`    | 網卡資料管理 (CRUD) |
| `useOrderStore`   | 訂單資料 (自動建立) |
| `useTourStore`    | 團資料查詢          |
| `fastMoveService` | FastMove API 呼叫   |

---

### 2.17 報表功能 `/reports` & `/finance/reports`

#### 頁面結構

```
/finance/reports (財務報表主頁 - 待開發)
├── 頁面標題 + "🚧 待開發" 徽章
├── 財務概覽區塊 (總收入/總支出/淨利潤)
├── 旅遊團財務分析區塊
└── 報表功能區塊 (月度損益表/現金流分析 - 開發中)

/reports/tour-closing (結團報表 - 已實現)
├── ResponsiveHeader
│   ├── 標題: "結團報表" (FileText)
│   ├── 月份篩選器 (Select)
│   └── 匯出 Excel 按鈕 (FileDown)
├── 搜尋欄 (團號/團名)
└── EnhancedTable
    ├── 團號、團名
    ├── 出發日、結團日
    ├── 收入 (綠)、成本 (紅)、淨利 (粗體)
    └── 操作：匯出此團 (FileDown)
```

#### 報表類型清單

| 報表類型   | 路由                    | 狀態      | 說明               |
| ---------- | ----------------------- | --------- | ------------------ |
| 結團報表   | `/reports/tour-closing` | ✅ 已實現 | 已結束團隊財務數據 |
| 月度損益表 | `/finance/reports`      | 🚧 開發中 | 月度收支分析       |
| 現金流分析 | `/finance/reports`      | 🚧 開發中 | 現金流動分析       |

#### 結團報表操作按鈕

| 按鈕       | 圖示       | 位置       | 動作             |
| ---------- | ---------- | ---------- | ---------------- |
| 匯出 Excel | `FileDown` | Header     | 匯出選中月份報表 |
| 月份篩選   | -          | Header     | 按月份過濾       |
| 匯出此團   | `FileDown` | ActionCell | 匯出單團報表     |

#### Excel 匯出欄位

團號、團名、出發日、返回日、結團日、業務、OP、訂單金額、成本、行政費、扣稅12%、團體獎金、業務獎金、OP獎金、毛利、淨利

#### 使用的 Store/Hook

| 頁面                    | Store/Hook                      | 用途         |
| ----------------------- | ------------------------------- | ------------ |
| `/finance/reports`      | `useTourStore`, `useOrderStore` | 團+訂單資料  |
| `/reports/tour-closing` | Supabase 直接查詢               | 批量資料載入 |

---

## 附錄：已完成審計項目

- [x] 首頁小工具 (Dashboard Widgets)
- [x] 旅遊團管理頁面 `/tours`
- [x] 訂單管理頁面 `/orders`
- [x] 報價單管理頁面 `/quotes`
- [x] 行程表管理頁面 `/itinerary`
- [x] 財務模組 `/finance` (5 個子頁面)
- [x] 設定頁面 `/settings` (5 個子頁面)
- [x] 資料庫頁面 `/database` (6 個子頁面)
- [x] 會計模組 `/accounting` & `/erp-accounting`
- [x] 客戶管理 `/customers`
- [x] 簽證管理 `/visas`
- [x] 員工管理 `/hr`
- [x] 頻道管理 `/workspace`
- [x] 需求單管理 `/tour-requests`
- [x] 日曆功能 `/calendar`
- [x] 待辦事項 `/todos`
- [x] eSIM 管理 `/esims`
- [x] 報表功能 `/reports` & `/finance/reports`

### 審計完成日期

**2026-01-03** - 所有頁面審計完成

---

## 8. 一致性對照檢查報告

### 8.1 狀態值一致性檢查

#### 狀態定義完整性總覽

| 模組            | 狀態定義    | 配置支援  | 使用正確性      | 評估      |
| --------------- | ----------- | --------- | --------------- | --------- |
| Tours           | ✅ 完整     | ✅ 完整   | ✅ 正確         | 👍 良好   |
| Orders          | ✅ 完整     | ✅ 完整   | ✅ 正確         | 👍 良好   |
| Quotes          | ⚠️ 多處定義 | ❌ 缺失   | ⚠️ 使用本地配置 | 🔴 需修復 |
| Visas           | ✅ 完整     | ✅ 完整   | ✅ 正確         | 👍 良好   |
| Todos           | ✅ 完整     | ✅ 完整   | ✅ 正確         | 👍 良好   |
| Tour Requests   | ⚠️ 不完整   | ❌ 缺失   | ❌ 混用 todo    | 🔴 需修復 |
| Calendar Events | ⚠️ 不完整   | ❌ 缺失   | ✅ 使用類型     | 🟡 中等   |
| eSIMs           | ✅ 完整     | ✅ 完整   | ❌ 類型錯誤     | 🟡 需微調 |
| Disbursement    | ❌ 多處定義 | ⚠️ 不一致 | ⚠️ 混雜         | 🔴 需修復 |
| Voucher         | ✅ 完整     | ✅ 完整   | ✅ 正確         | 👍 良好   |
| Receipt         | ✅ 完整     | ✅ 完整   | ✅ 正確         | 👍 良好   |
| Invoice         | ✅ 完整     | ✅ 完整   | ✅ 正確         | 👍 良好   |

#### 發現的問題

1. **Quote 狀態配置缺失** - `status-config.ts` 中無 `quote` 類型配置
2. **Tour Requests 類型混用** - 使用 `type="todo"` 而非獨立類型
3. **Disbursement 狀態不一致** - constants.ts 與 status-config.ts 定義不符
4. **eSIM 使用錯誤類型** - 使用 `type="order"` 應為 `type="esim"`

---

### 8.2 欄位名稱一致性檢查

#### 檢查結果總覽

| 實體          | 狀態        | 不一致欄位 | 缺失欄位 |
| ------------- | ----------- | ---------- | -------- |
| Tour          | ✅ 一致     | 0          | 0        |
| Order         | ✅ 一致     | 0          | 0        |
| OrderMember   | ⚠️ 需修復   | 1          | 0        |
| Quote         | ❌ 嚴重問題 | 0          | 2        |
| Customer      | ✅ 一致     | 0          | 0        |
| Visa          | ✅ 一致     | 0          | 0        |
| Todo          | ✅ 一致     | 0          | 0        |
| CalendarEvent | ⚠️ 需映射   | 3          | 0        |

#### 發現的問題

1. **OrderMember** - `birth_date` vs `birthday` 混用
2. **Quote** - 缺少 `contact_person` 和 `contact_phone` 資料庫欄位
3. **CalendarEvent** - 日期欄位命名差異 (`start`/`end` vs `start_date`/`end_date`)

---

### 8.3 API 端點映射檢查

#### 端點統計

- **總計**：35 個 API 端點
- **已調用**：31 個 (88.6%)
- **未調用**：4 個 (監控端點，正常)

#### 架構說明

系統採用「Supabase 直連 + 特定功能 API」混合架構：

- **數據操作**：通過 `createCloudHook` 直連 Supabase
- **業務邏輯**：通過特定 API 端點處理

**結論**：API 端點映射一致、設計合理，無重大問題。

---

### 8.4 Store 使用模式檢查

#### Store 統計

- **總計**：45 個 Store
- **createStore 工廠**：36 個
- **Zustand 直接創建**：9 個

#### 發現的問題

1. **重複定義的 Store**
   - `useWorkspaceStore` - 三個不同實現
   - `useRegionStore` vs `useRegionsStore` - 新舊版本並存
   - `useTodos` - 兩種實現方式

2. **命名不規範**
   - `useChannelsStore` (複數，應為單數)
   - `useChatStore`, `useWidgetsStore`, `useCanvasStore`

3. **初始化方式不統一**
   - 混用簡單參數和配置物件兩種方式

**整體評價**：B+（良好，有改進空間）

---

### 8.5 UI 組件一致性檢查

#### 使用統計

- **總頁面數**：71 個
- **使用標準組件**：30 個 (42%)
- **morandi-gold 按鈕**：182 個實例

#### 發現的問題

1. **自訂日期格式化**：9 個頁面未使用 DateCell
2. **顏色規範不一致**：/fitness/ 頁面使用硬編碼顏色
3. **按鈕不規範**：部分頁面使用原生 `<button>`

**整體評價**：8/10

---

## 9. 修復建議優先級

### 優先級 1（高 - 立即修復）

| 問題              | 位置               | 修復方式               |
| ----------------- | ------------------ | ---------------------- |
| Quote 狀態配置    | `status-config.ts` | 新增 quote 類型配置    |
| Tour Request 類型 | `status-config.ts` | 新增 tour_request 類型 |
| eSIM 類型錯誤     | `/esims/page.tsx`  | 改為 `type="esim"`     |
| Disbursement 狀態 | `constants.ts`     | 統一狀態定義           |

### 優先級 2（中 - 近期修復）

| 問題                   | 位置             | 修復方式                           |
| ---------------------- | ---------------- | ---------------------------------- |
| OrderMember birth_date | `order.types.ts` | 統一為 birth_date                  |
| Quote 缺失欄位         | 資料庫           | 新增 contact_person, contact_phone |
| 重複 Store 定義        | `stores/`        | 統一為單一實現                     |
| 日期格式化             | 9 個頁面         | 改用 DateCell 組件                 |

### 優先級 3（低 - 未來優化）

| 問題                   | 位置         | 修復方式       |
| ---------------------- | ------------ | -------------- |
| CalendarEvent 欄位映射 | API 層       | 新增映射函數   |
| Store 命名規範         | workspace/   | 統一命名       |
| createStore 初始化     | 所有 store   | 統一用配置物件 |
| /fitness/ 顏色規範     | fitness 頁面 | 改用 CSS 變數  |

---

## 10. 審計結論

### 系統健康度評估

| 檢查項目       | 評分       | 說明                         |
| -------------- | ---------- | ---------------------------- |
| 狀態值一致性   | 7/10       | 3 個高優先級問題需修復       |
| 欄位名稱一致性 | 8/10       | 1 個嚴重問題、2 個中等問題   |
| API 端點映射   | 10/10      | 無問題，設計合理             |
| Store 使用模式 | 8/10       | 有重複定義需清理             |
| UI 組件一致性  | 8/10       | 大部分符合規範               |
| **總體評分**   | **8.2/10** | **系統整體健康，有改進空間** |

### 總結

Venturo ERP 系統經過全面審計，共審計 **18 個模組**、**71 個頁面**。

**優點**：

- 架構清晰，採用 feature-based + layer-based 混合模式
- 標準組件使用率高，UI 一致性良好
- API 設計合理，Supabase 直連效能優異
- 莫蘭迪色系設計系統確立

**待改進**：

- 狀態配置需補充 Quote 和 Tour Request
- 部分 Store 有重複定義需清理
- 舊頁面日期格式化需升級

**建議**：優先修復 4 個高優先級問題，可在下個 sprint 完成。
