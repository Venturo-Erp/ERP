# CODE_MAP.md — 程式碼地圖

**用途**：收到任務時，直接查這裡找位置，不用 grep

---

## 🔑 關鍵字速查

| 關鍵字 | 主要檔案 | 說明 |
|--------|---------|------|
| **收款** | `src/app/(main)/finance/payments/` | 收款列表頁 |
| **收款新增** | `src/features/finance/payments/components/AddReceiptDialog.tsx` | 新增收款對話框 |
| **收款確認** | `src/features/finance/payments/components/ReceiptConfirmDialog.tsx` | 會計確認 |
| **批量收款** | `src/features/finance/payments/components/BatchReceiptDialog.tsx` | 批量收款 |
| **請款** | `src/app/(main)/finance/requests/` | 請款列表頁 |
| **請款新增** | `src/features/finance/requests/components/AddRequestDialog.tsx` | 新增請款 |
| **請款詳情** | `src/features/finance/requests/components/RequestDetailDialog.tsx` | 請款詳情 |
| **旅遊團** | `src/app/(main)/tours/` | 旅遊團列表 |
| **旅遊團詳情** | `src/app/(main)/tours/[code]/` | 旅遊團詳情頁 |
| **團詳情-總覽** | `src/features/tours/components/TourOverviewTab.tsx` | 總覽分頁 |
| **團詳情-行程** | `src/features/tours/components/tour-itinerary-tab.tsx` | 行程分頁 |
| **團詳情-報價** | `src/features/tours/components/tour-quote-tab-v2.tsx` | 報價分頁 |
| **團詳情-需求單** | `src/features/tours/components/tour-requirements-tab.tsx` | 需求單分頁 |
| **團詳情-需求列表** | `src/features/confirmations/components/RequirementsList.tsx` | 需求單主組件 |
| **團詳情-結團** | `src/features/tours/components/tour-closing-tab.tsx` | 結團分頁 |
| **團詳情-損益** | `src/features/tours/components/ProfitTab.tsx` | 損益分頁 |
| **團詳情-合約** | `src/features/tours/components/tour-contract-tab/` | 合約分頁 |
| **團詳情-網頁** | `src/features/tours/components/tour-webpage-tab.tsx` | 網頁分頁 |
| **團詳情-獎金** | `src/features/tours/components/BonusSettingTab.tsx` | 獎金分頁 |
| **團詳情-設計** | `src/features/tours/components/tour-designs-tab.tsx` | 設計分頁 |
| **行程** | `src/features/tours/components/itinerary/` | 行程分頁 |
| **行程同步核心表** | `src/features/tours/hooks/useTourItineraryItems.ts` | syncToCore |
| **核心表 Entity** | `src/data/entities/tour-itinerary-items.ts` | tour_itinerary_items |
| **景點庫** | `src/features/tours/components/itinerary/AttractionLibrary.tsx` | 景點側邊欄 |
| **景點資料庫** | `src/features/attractions/` | 資料管理 → 景點 |
| **訂單** | `src/app/(main)/orders/` | 訂單列表 |
| **訂單新增** | `src/features/orders/components/OrderDialog.tsx` | 新增/編輯訂單 |
| **團員** | `src/features/members/` | 團員管理 |
| **結團** | `src/features/tours/components/tour-closing-tab.tsx` | 結團分頁 |
| **損益** | `src/features/tours/components/ProfitTab.tsx` | 損益分頁 |
| **月報表** | `src/app/(main)/finance/reports/monthly-income/` | 月收入報表 |

---

## 📁 目錄結構

```
src/
├── app/(main)/           # 頁面路由
│   ├── tours/            # 旅遊團
│   ├── orders/           # 訂單
│   ├── finance/          # 財務
│   │   ├── payments/     # 收款
│   │   ├── requests/     # 請款
│   │   ├── treasury/     # 資金
│   │   └── reports/      # 報表
│   └── data-management/  # 資料管理
│       └── attractions/  # 景點資料庫
│
├── features/             # 功能模組（業務邏輯）
│   ├── tours/            # 旅遊團
│   │   ├── components/   # 組件
│   │   ├── hooks/        # Hooks
│   │   └── services/     # 服務
│   ├── orders/           # 訂單
│   ├── finance/          # 財務
│   │   ├── payments/     # 收款
│   │   └── requests/     # 請款
│   ├── attractions/      # 景點
│   └── members/          # 團員
│
├── data/                 # 資料層（SWR + Supabase）
│   ├── core/             # createEntityHook
│   └── entities/         # 各表 hook
│
├── components/           # 共用組件
│   ├── ui/               # 基礎 UI
│   └── layout/           # 佈局
│
└── stores/               # Zustand stores
```

---

## 🗄️ 資料表對應

| 資料表 | Entity Hook | 位置 |
|--------|-------------|------|
| `tours` | `useTours` | `src/data/entities/tours.ts` |
| `orders` | `useOrders` | `src/data/entities/orders.ts` |
| `receipts` | `useReceipts` | `src/data/entities/receipts.ts` |
| `payment_requests` | `usePaymentRequests` | `src/data/entities/payment-requests.ts` |
| `attractions` | `useAttractions` | `src/data/entities/attractions.ts` |
| `members` | `useMembers` | `src/data/entities/members.ts` |
| `employees` | `useEmployees` | `src/data/entities/employees.ts` |
| `tour_itinerary_items` | `useTourItineraryItems` | `src/data/entities/tour-itinerary-items.ts` |
| `workspace_roles` | — | `src/app/api/roles/route.ts` |

---

## 🔧 常見操作位置

### 新增功能
- 新增對話框 → `src/features/[模組]/components/AddXxxDialog.tsx`
- 列表頁 → `src/app/(main)/[路徑]/page.tsx`
- Entity CRUD → `src/data/entities/[表名].ts`

### 修改列表
- 欄位定義 → 各頁面的 `columns` 陣列
- 載入邏輯 → `useXxx` hook
- 防閃爍 → 確保傳 `loading` 給 `ListPageLayout`

### 修改表單
- 表單欄位 → Dialog 組件內的 form
- 驗證邏輯 → 同上或獨立 hook
- 提交邏輯 → `handleSubmit` 或 service

---

## 📝 記憶搜尋關鍵字

當我收到任務時，應該先 `memory_search` 這些關鍵字：

| 任務類型 | 搜尋關鍵字 |
|---------|-----------|
| 收款相關 | `receipts 收款 batch_id` |
| 請款相關 | `payment_requests 請款` |
| 行程相關 | `itinerary 行程 景點` |
| 結團相關 | `closing 結團 損益` |
| 訂單相關 | `orders 訂單` |
| 架構決策 | `ADR 架構決策` |

---

---

## 🔐 權限系統

| 關鍵字 | 位置 | 說明 |
|--------|------|------|
| **權限定義** | `src/lib/permissions/` | 權限系統核心 |
| **職務管理** | `src/app/(main)/hr/roles/page.tsx` | HR → 職務管理 |
| **細粒度權限** | `src/lib/permissions/useTabPermissions.tsx` | canRead/canWrite hook |
| **isAdmin 判斷** | `src/stores/auth-store.ts` | `permissions.includes('*')` |
| **RLS 函數** | DB: `is_super_admin()` | 只檢查 `super_admin`（舊） |

---

## 🏢 租戶系統

| 關鍵字 | 位置 | 說明 |
|--------|------|------|
| **租戶列表** | `src/app/(main)/tenants/page.tsx` | 租戶管理頁 |
| **建立租戶** | `src/app/api/tenants/create/route.ts` | 建立租戶 API |
| **workspace store** | `src/stores/workspace/` | workspace 狀態 |

---

## 👤 員工系統

| 關鍵字 | 位置 | 說明 |
|--------|------|------|
| **員工列表** | `src/app/(main)/hr/page.tsx` | HR 頁面 |
| **員工表單** | `src/features/hr/components/EmployeeForm.tsx` | 新增/編輯員工 |
| **建立員工** | `src/app/api/employees/create/route.ts` | 建立員工 API |
| **修改密碼** | `src/app/api/auth/change-password/route.ts` | 修改密碼 API |

---

**更新**：2026-03-30 14:12
