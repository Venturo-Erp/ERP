# Venturo ERP 架構演進手冊

> 最後更新：2026-04-09
> 參考來源：Carbon ERP、NocoBase、SaaS Starter Kit

---

## 🏗️ 架構哲學

### 三個原則（學自 Carbon ERP）
1. **RLS 為王** — 權限判斷在資料庫層，不只靠前端
2. **Server 先行** — 資料在渲染前準備好，避免畫面跳動
3. **快取優先** — 不常變的資料（權限、設定）只 fetch 一次

### 參考專案
| 專案 | 路徑 | 學什麼 |
|------|------|--------|
| Carbon ERP | `/Users/william/Projects/reference/carbon` | RLS 權限、模組架構、API Key |
| NocoBase | `/Users/william/Projects/reference/nocobase` | 欄位級權限、資料範圍 |
| SaaS Starter Kit | `/Users/william/Projects/reference/saas-starter-kit` | 多租戶、Audit Log、Webhook |
| Ever Gauzy | `/Users/william/Projects/reference/ever-gauzy` | 會計模組、HR、薪資 |
| Open SaaS | `/Users/william/Projects/reference/open-saas` | 付款、Email、背景任務 |
| SaaS Boilerplate | `/Users/william/Projects/reference/SaaS-Boilerplate` | 國際化、角色權限 |

---

## 🔒 權限系統（三層架構）

### 第一層：租戶隔離（✅ 已完成）
- **方式**：Supabase RLS policy
- **規則**：`workspace_id = get_current_user_workspace()`
- **所有核心表都已啟用**：tours, orders, receipts, payment_requests, payment_request_items, customers, employees, suppliers
- **參考**：`src/lib/supabase/` + Supabase Dashboard

### 第二層：功能開關（✅ 已完成）
- **方式**：`workspace_features` 表 + `useWorkspaceFeatures()` hook
- **規則**：租戶層級的功能啟用/停用
- **快取**：模組級快取，登入後只 fetch 一次
- **參考**：`src/lib/permissions/hooks.ts`

### 第三層：模組權限（🚧 規劃中）
- **目標**：學 Carbon 的 `get_companies_with_employee_permission('finance_view')`
- **做法**：
  1. 建 `user_permissions` 表（user_id, permission_code, granted）
  2. 建 `get_user_permissions()` DB function
  3. RLS policy 加上 `has_permission('finance_view')` 判斷
- **原則**：沒設定 = 全開（向下相容，不影響現有使用者）
- **參考**：`/Users/william/Projects/reference/carbon/packages/database/supabase/migrations/`

### 未來：欄位級權限（📋 參考用）
- **學自 NocoBase**
- **做法**：每個角色對每個欄位設定 read/write
- **參考**：`/Users/william/Projects/reference/nocobase/packages/core/acl/src/acl.ts`

---

## ⚡ 資料載入架構

### 原則
```
不常變的資料 → SWR 快取或模組快取（登入後一次）
常變的資料   → SWR 自動 revalidate（背景更新）
即時資料     → Supabase Realtime
```

### 快取層級

| 資料類型 | 載入方式 | 檔案位置 |
|---------|---------|---------|
| Feature flags | 模組快取（登入一次） | `src/lib/permissions/hooks.ts` |
| 收款/請款方式 | SWR hook | `src/data/hooks/usePaymentMethods.ts` |
| 角色列表 | SWR hook | `src/data/hooks/useWorkspaceRoles.ts` |
| 選人欄位 | API fetch（Dialog 載入） | `src/features/tours/components/tour-form/TourSettings.tsx` |
| 旅遊團列表 | SWR entity hook | `src/data/entities/tours.ts` |
| 訂單列表 | SWR entity hook | `src/data/entities/orders.ts` |
| 收款單 | SWR entity hook | `src/data/entities/receipts.ts` |
| 請款單 | SWR entity hook | `src/data/entities/payment-requests.ts` |

### ❌ 禁止的做法
```typescript
// ❌ 不要在 component 裡直接 fetch
useEffect(() => {
  fetch('/api/something').then(...)
}, [])

// ✅ 用 SWR hook
const { data, loading } = useSomething()

// ❌ 不要在 component 裡直接 supabase.from()
useEffect(() => {
  supabase.from('table').select('*').then(...)
}, [])

// ✅ 用 @/data entity hook
const { items } = useTableName()
```

### 待優化清單（從審計報告）
| 檔案 | 問題 | 優先級 |
|------|------|--------|
| `EmployeeForm.tsx` | 3 個 useEffect + fetch | HIGH |
| `RequirementsList.tsx` | 7 個查詢在 callback | HIGH |
| `useRequirementsData.ts` | 無快取多表查詢 | HIGH |
| `BatchReceiptConfirmDialog.tsx` | Dialog 開啟才載入 | MEDIUM |
| `usePayroll.ts` | 手動 state 管理 | MEDIUM |

---

## 🎨 UI 設計系統

### 表頭規範
- **CSS class**：`.bg-morandi-gold-header`
- **CSS 變數**：`--morandi-gold-light: rgba(201, 170, 124, 0.12)`
- **文字**：`text-morandi-primary`（黑字）
- **無分隔線**
- **檔案**：`src/app/globals.css`

### 表格規範
- **EnhancedTable**：`src/components/ui/enhanced-table/`
- **欄位寬度**：用 `width` prop，會自動加 `px`
- **border**：用 `border-separate border-spacing-0`，避免重疊

### responsive-header 排列順序
```
標題 | 搜尋/篩選 | 功能區(日期等) | ← flex-1 → | 分頁 | 按鈕(新增)
```
- **檔案**：`src/components/layout/responsive-header.tsx`

### Loader 動畫
- **幾何描邊**：`src/components/ui/loader.tsx`（頁面載入用）
- **熔岩球**：`src/components/ui/orb-loader.tsx`（行程生成轉場用）

---

## 🔄 SSOT（Single Source of Truth）

### 已實作
| 資料 | 真相來源 | 引用方式 |
|------|---------|---------|
| 行程核心 | `tour_itinerary_items` | `useTourItineraryItemsByTour(tourId)` |
| 飯店資訊 | `hotels` 表 | HotelSection 即時讀取（唯讀） |
| 飯店預覽 | `hotels` 表 | API `enrichHotels()` 即時補資料 |
| 景點資訊 | `attractions` 表 | API `enrichDailyItinerary()` 即時補資料 |
| 收款方式 | `payment_methods` 表 | `usePaymentMethodsCached()` hook |

### 原則
- 行程管理的飯店/景點資訊**從資料庫即時讀取**，不存快照
- 預覽頁（`/view/`）透過 API 層 `enrich*()` 補資料
- **檔案**：`src/app/api/itineraries/[id]/route.ts`

---

## 📊 財務報表邏輯

### 收支判斷規則
| 類型 | 條件 | 日期依據 |
|------|------|---------|
| 收入 | 收款單 status = '1'（已確認） | receipt_date |
| 支出 | 請款單 status = 'billed' 或 'paid'（已出帳/已付款） | request_date |
| 待處理 | 不顯示在報表中 | — |

### 按供應商
- 從 `payment_request_items` 展開每個項目的供應商
- 不只看請款主表的 `supplier_name`
- 可展開看明細
- **檔案**：`src/features/finance/reports/components/OverviewTab.tsx`

---

## 🏢 SaaS 多租戶

### 收款方式預設（新租戶建立時）
1. 匯款（placeholder: 帳號後五碼）
2. 現金（placeholder: 收款人）
3. 支票（placeholder: 支票號碼）
4. 信用卡（placeholder: 卡號末四碼）

### 動態選人欄位
- 表：`workspace_selector_fields`
- level: `tour`（開團用）或 `order`（訂單用）
- **檔案**：`src/features/tours/components/tour-form/TourSettings.tsx`

---

## 🗺️ 關鍵檔案地圖

### 權限系統
```
src/lib/permissions/hooks.ts          — useWorkspaceFeatures（含模組快取）
src/components/guards/ModuleGuard.tsx — 頁面權限檢查
src/components/layout/sidebar.tsx     — 選單權限過濾
```

### 資料快取
```
src/data/hooks/usePaymentMethods.ts   — 收款/請款方式 SWR
src/data/hooks/useWorkspaceRoles.ts   — 角色列表 SWR
src/data/core/createEntityHook.ts     — Entity hook 工廠
```

### UI 系統
```
src/app/globals.css                            — CSS 變數、表頭、Loader 動畫
src/components/ui/enhanced-table/              — 通用表格
src/components/layout/responsive-header.tsx     — 標題列排版
src/components/layout/content-page-layout.tsx   — 內容頁佈局
```

### 財務
```
src/features/finance/reports/components/OverviewTab.tsx  — 收支總覽 + 供應商彙總
src/features/finance/payments/components/               — 收款單 UI
src/features/finance/requests/components/               — 請款單 UI
src/app/api/finance/payment-methods/route.ts            — 收款方式 API
```

### 行程管理
```
src/features/tours/components/tour-itinerary-tab.tsx    — 簡易行程表
src/features/tours/components/itinerary/DayRow.tsx      — 行程表每日列
src/app/api/itineraries/[id]/route.ts                   — 行程 API（含 enrichHotels/enrichDailyItinerary）
src/components/editor/tour-form/sections/HotelSection.tsx — 飯店資訊（SSOT）
```
