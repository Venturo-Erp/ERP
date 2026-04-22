# /tours 業務符合驗證 — Agent D

**日期**: 2026-04-22 | **版本**: 1.0 | **重派理由**: stream timeout 重試

---

## 驗證結果

### 1. 開團提案入口 ⚠️

**業務設計**: 詢價階段做開團提案

**代碼實裝**:
- `ConvertToTourDialog` (tour-form-wrapper.tsx, ToursPage.tsx)
  - 支援從 proposal / template 轉換成 official 團
  - 可同時建立第一筆訂單（contact_person, sales_person, assistant）
- `TourFormShell` → `TourBasicInfo` 區分 proposal vs template vs official 三種建立流

**符合度**: ⚠️ **部分符合 — 缺業務邏輯完整性**
- ✅ 對話框存在、可從詢價轉成開團
- ⚠️ 「詢價階段」入口不清楚：無獨立 inquiry entity，只有 proposal 當草案
- ❌ 主管模板製作流程未見代碼實裝（tour_type='template' 存欄位，但無「主管複製給大家」的 UI/API）

**證據**: `src/features/tours/components/ConvertToTourDialog.tsx:60-61`

---

### 2. 行程 / 報價 / 需求 SSOT 同一套 ✅

**業務設計**: 三個 Tab 共用 tour_itinerary_items（景點中的 SSOT 排行程時外掛進來）

**代碼實裝**:
- `tour-itinerary-tab.tsx` (line 83) 讀 `useTourItineraryItemsByTour(tour.id)`
- `tour-quote-tab-v2.tsx` / `tour-quote-tab.tsx` 查詢 `quotes.tour_id`、報價單讀行程做價格
- `tour-requirements-tab.tsx` → `RequirementsList` 讀同樣核心表
- hook `useSyncItineraryToCore` 同步編輯結果到 tour_itinerary_items

**符合度**: ✅ **完全符合**
- ✅ 三個 Tab 確實共用 `tour_itinerary_items` 表（54 欄「世界樹」結構）
- ✅ 改行程自動影響報價欄位（quote 表的 items 會參考 tour_itinerary_items）
- ✅ 改報價不污染需求（報價與需求分開，都讀同源 items）

**證據**: `src/features/tours/hooks/useTourItineraryItems.ts:34-40`

---

### 3. 景點外掛 SSOT ⚠️

**業務設計**: 景點 CRUD 不污染 tour_itinerary_items；DailyScheduleEditor 外掛進來

**代碼實裝**:
- `DailyScheduleEditor` / `PackageItineraryDialog` 允許編輯每日項目
- 核心表結構有 `category` (attraction/meal/accommodation/flight) 區分
- 編輯時用 `updateTourItineraryItem` 更新核心欄位

**符合度**: ⚠️ **部分符合 — 景點系統未見獨立 CRUD**
- ✅ tour_itinerary_items 確有 category 區分
- ⚠️ 景點（attraction）本身無獨立「景點表」、全攤在 itinerary_items 中
- ⚠️ DailyScheduleEditor 編輯邏輯見 itinerary-editor/ 文件夾，但具體外掛流程模糊

**證據**: `src/features/tours/components/itinerary-editor/` 目錄結構

---

### 4. 公司模板未完 ❌

**業務設計**: tour_type='template' 背後有複製流程、主管限制、完成度

**代碼實裝**:
- `tour_type` 欄位存在：'official' | 'proposal' | 'template' 三值
- `TourFormShell` 區分 template UI 標題 / 按鈕
- 無法找到「複製模板」API 或「主管發行模板」的邏輯

**符合度**: ❌ **嚴重缺漏**
- ✅ 欄位定義完整
- ❌ 無 template → official 的複製邏輯代碼
- ❌ 無主管權限限制（tour-itinerary-tab.tsx 只檢查 isAdmin，無角色化）
- ❌ 模板管理 UI 不存在（無模板列表、無發行、無版本管理）

**證據**: `src/features/tours/components/ToursPage.tsx:template 分支無複製流程`

---

### 5. 一團多訂單 ✅

**業務設計**: tour-orders.tsx Tab 能從單團看所有訂單

**代碼實裝**:
- `tour-orders.tsx` (line 24-26)：filter `o.tour_id === tour.id`
- `TourTabs.tsx` case 'orders' 動態載入同元件
- `orders.tour_id` FK 完整存在

**符合度**: ✅ **完全符合**
- ✅ 一團多訂單架構在 DB + UI 中完整實作
- ✅ 訂單新增時自動編號 `${tour.code}-O01/O02/...`
- ✅ 訂單頁面秒速過濾正確

**證據**: `src/features/tours/components/tour-orders.tsx:45-46`

---

### 6. 團員 vs 訂單成員 ⚠️

**業務設計**: 團員分頁（集合、大主管才看）vs 訂單成員（單訂單）是不同 UI；有權限限制

**代碼實裝**:
- `TourTabs.tsx` case 'members' → `OrderMembersExpandable` (mode='tour')
- 此組件支援 tour-level 聚合檢視（所有訂單成員展開）
- 無見到「大主管級」的角色檢查

**符合度**: ⚠️ **部分符合 — UI 存在，但權限機制不符原則**
- ✅ 團員分頁（members Tab）確實聚合所有訂單成員
- ✅ UI 有展開 / 收合邏輯（OrderMembersExpandable）
- ❌ 無「大主管才看到」的權限限制代碼（違反原則 1：權限在人身上）
- ⚠️ 權限機制依賴 `useAuthStore` + `isAdmin` 短路，無細粒度角色檢查

**證據**: `src/features/tours/components/TourTabs.tsx:158-169`

---

### 7. 訂單頁快速收款 / 請款 ✅

**業務設計**: AddPaymentDialog 存的是財務同一張 payments 表（非 snapshot）、支援團級快速操作

**代碼實裝**:
- `AddPaymentDialog` (tour-payments.tsx) 允許選單訂單、輸入金額
- `useTourPayments` hook 呼叫財務 API
- payments 表共用（非 tour 本地）、receipts 與 requests 獨立表

**符合度**: ✅ **完全符合**
- ✅ 快速收款 Dialog 與財務 payments 表同步
- ✅ 支援先選訂單再收款
- ✅ 無 snapshot，資料即時同步

**證據**: `src/features/tours/components/AddPaymentDialog.tsx:1-50`

---

### 8. 結帳未完 ⚠️

**業務設計**: tour-closing-tab.tsx 完成度；「結帳」≠「結團」

**代碼實裝**:
- `tour-closing-tab.tsx` 展示三個組件：TourOverview / TourPayments / TourCosts
- 有 ProfitTab / BonusSettingTab（利潤分配、獎金）
- 狀態機制：open → closing → closed

**符合度**: ⚠️ **部分實裝 — 邏輯框架在但細節不完整**
- ✅ UI 骨架存在
- ⚠️ 無見到「結帳動作」的明確按鈕 / 流程（只有展示）
- ⚠️ 「結團」狀態在代碼中為 closed，但業務流程（誰能結、條件）未在 closing-tab 中實現
- ⚠️ 完成度約 60%（展示層完整、操作層缺漏）

**證據**: `src/features/tours/components/tour-closing-tab.tsx:55-59`

---

### 9. 權限機制 vs 原則 1 ❌

**業務設計 (原則 1)**: 權限長在人身上、不是頭銜上；職務是身份卡

**代碼實裝**:
- `/tours` 層級用 `useAuthStore().isAdmin` 短路（line 80, tour-itinerary-tab.tsx）
- 無細粒度「職務」檢查（employees.role 存在但未用）
- `useVisibleModuleTabs('tours', TOUR_TABS)` 篩選付費 Tab，但無職務隔離

**符合度**: ❌ **違反原則 1**
- ✅ 有 isAdmin 全局檢查
- ❌ 無「職務 → 權限」mapping（應檢查 employees.role + 明確 permission set）
- ❌ /tours 所有 API endpoint 未見 RLS policy 檢查職務（假設由 Supabase RLS 處理）
- ❌ 前端短路風險：若 isAdmin=false 但 employees.permissions 有特定權，邏輯混亂

**證據**: `src/features/tours/components/tour-itinerary-tab.tsx:80-91`

---

## 總結表

| 項目 | 業務 | 代碼 | 符合 | 主要問題 |
|------|------|------|------|---------|
| 1. 開團提案 | 詢→開 | ConvertToTourDialog | ⚠️ | 缺模板複製流 |
| 2. SSOT 同套 | 行/報/需 共用 | tour_itinerary_items | ✅ | OK |
| 3. 景點外掛 | 景點 CRUD | DailyScheduleEditor | ⚠️ | 邏輯模糊 |
| 4. 模板未完 | 主管→複製→團 | tour_type=template | ❌ | 無複製 API |
| 5. 一團多訂 | orders.tour_id | tour-orders.tsx | ✅ | OK |
| 6. 團員分頁 | 聚合+權限 | OrderMembersExpandable | ⚠️ | 缺權限檢查 |
| 7. 快速收款 | payments 同表 | AddPaymentDialog | ✅ | OK |
| 8. 結帳流程 | 結帳≠結團 | tour-closing-tab | ⚠️ | 展示60% |
| 9. 權限 vs 原則 | 人身權限 | isAdmin 短路 | ❌ | 缺職務檢查 |

---

## 紅旗

🚩 Critical:
- 項目 4：模板複製 0% 實裝
- 項目 9：權限違反架構原則

🟡 Medium:
- 項目 1, 3, 6, 8 各部分實裝

✅ OK: 項目 2, 5, 7

