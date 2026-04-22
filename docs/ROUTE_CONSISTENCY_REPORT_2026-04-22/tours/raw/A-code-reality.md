# Agent A — /tours 代碼現況

_Agent 失敗、主 Claude 補寫（從檔案盤點 + page 源碼 + B/C/D 的副產物彙整）、純中立描述、不批判_

---

## 1. 入口結構

**PC 列表頁**：`src/app/(main)/tours/page.tsx`（7 行、delegate）
```
import { ToursPage } from '@/features/tours'
export default ToursPage
```

**PC 單團頁**：`src/app/(main)/tours/[code]/page.tsx`
- 用 URL 的 `code` 透過 `fetchTourIdByCode` 轉 tour_id（SWR 快取）
- 載入 `useTourDetails(tourId)` 拿完整 tour 物件
- 分頁用 `useState` + URL 的 `?tab=` 同步
- 付費 tab 用 `useVisibleModuleTabs('tours', TOUR_TABS)` 過濾
- Dialog：需求單對話框（TourRequestFormDialog、dynamic import）

**行動版單團頁**：`src/app/m/tours/[id]/page.tsx`（用 `id` 不是 `code`、跟 PC 不同）

**API 家族**（`src/app/api/tours/`）：
- `[tourId]/requests/[requestId]/accept/route.ts` — 接受需求單
- `[tourId]/requests/[requestId]/reject/route.ts` — 拒絕需求單
- `by-code/[code]/route.ts` — 用 code 查 tour（用 service_role、無 auth、Agent C 標 🔴）

---

## 2. Tab 系統（11 個分頁）

`TOUR_TABS` 定義在 `features/tours/components/TourTabs.tsx:105-117`：

| 順序 | value | label | 動態載入元件 |
|---|---|---|---|
| 1 | overview | 總覽 | `tour-overview.tsx` |
| 2 | orders | 訂單 | `tour-orders.tsx` |
| 3 | members | 團員 | `orders/components/OrderMembersExpandable`（mode='tour'）|
| 4 | itinerary | 行程 | `tour-itinerary-tab.tsx` |
| 5 | display-itinerary | 展示行程 | `tour-display-itinerary-tab.tsx`（多主題載入點）|
| 6 | quote | 報價 | **`tour-quote-tab-v2.tsx`**（v1 存在但未掛）|
| 7 | requirements | 需求 | `tour-requirements-tab.tsx` |
| 8 | confirmation-sheet | 團確單 | `confirmations/components/ConfirmationSheet` |
| 9 | contract | 合約 | `tour-contract-tab/` |
| 10 | checkin | 報到 | `tour-checkin/` |
| 11 | closing | 結案 | `tour-closing-tab.tsx` |

所有 Tab 都 `dynamic()` 載入（SSR lazy）、可用 `useVisibleModuleTabs` 按 workspace feature flag 過濾（例：合約是付費 tab）。

---

## 3. 資料流

**建團**（ToursPage 主流程）：
- `useTourOperations` / `useToursForm` / `useToursDialogs` 三個 hook 管 CRUD、form、對話框
- `ConvertToTourDialog` 把 proposal / template 轉成 official（可同時帶第一筆訂單的 contact_person / sales_person / assistant）
- `AddOrderForm`（from `features/orders`）直接在建團時開訂單
- 建團 API 靠 `createOrder` + supabase client、workspace_id 由 DB trigger 自動填（`// workspace_id is now auto-set by DB trigger`）

**單團讀取**：
```
/tours/[code]/page.tsx
  → fetchTourIdByCode(code)    [SWR]
  → useTourDetails(tourId)     [取 tour + 相關]
  → TourTabContent             [依 activeTab 動態載入分頁]
```

**SSOT 核心表 `tour_itinerary_items`**：
- 寫入器 = `useTourItineraryItems.ts` 的 `syncToCore()`（delete-then-insert、匹配 day_number+category）
- 報價寫回器 = `features/quotes/utils/core-table-adapter.ts` 的 `writePricingToCore()`（UPDATE 用 itinerary_item_id）
- 需求讀取器 = `features/confirmations/components/core-items-to-quote-items.ts`（純轉換）
- 分房讀取器 = `useAccommodationSegments.ts`（合併連住）

---

## 4. 關鍵 components 分類（features/tours/components 共 160+）

**列表相關**：
- `ToursPage.tsx`、`TourTable.tsx`、`TourTableColumns.tsx`、`TourMobileCard.tsx`、`TourFilters.tsx`

**Tab 內容 / 編輯**：
- `tour-overview.tsx` / `tour-orders.tsx` / `tour-itinerary-tab.tsx` / `tour-quote-tab.tsx`（v1）/ `tour-quote-tab-v2.tsx`（v2）/ `tour-requirements-tab.tsx` / `tour-closing-tab.tsx` / `tour-contract-tab/` / `tour-display-itinerary-tab.tsx`
- `TourPage.tsx`（跟 ToursPage 不同、是單團集合 wrapper）

**對話框（17+）**：
- `AddPaymentDialog` / `ArchiveReasonDialog` / `BonusSettingDialog` / `ConvertToTourDialog` / `CoreTableRequestDialog` / `DeleteConfirmDialog` / `InvoiceDialog` / `ItinerarySyncDialog` / `LinkItineraryToTourDialog` / `TourClosingDialog` / `TourConfirmationDialog` / `TourConfirmationWizard` / `TourEditDialog` / `TourItineraryDialog` / `TourPrintDialog` / `TourRequestFormDialog` / `TourUnlockDialog`

**行程編輯器**（`components/itinerary-editor/`）：
- `DailyScheduleEditor.tsx` / `TimelineEditor.tsx` / `PackageItineraryDialog.tsx` / `AiGenerateDialog.tsx` / `FlightSection.tsx` / `ItineraryPreview.tsx` / `VersionDropdown.tsx` / `usePackageItinerary.ts` / `format-itinerary.ts`

**Drag-drop 行程**（`components/itinerary/`）：DayRow、DroppableZone、SortableAttractionChip、AccommodationChangeDialog

**分配分頁**（`components/assignment-tabs/`）：TourRoomTab / TourTableTab / TourVehicleTab

**報到功能**（`components/tour-checkin/`）：CheckinMemberList / CheckinQRCode / CheckinSettings

**報價追蹤**（`components/tour-tracking/`）：AcceptQuoteDialog / RejectQuoteDialog / QuoteCard / CollaborativeConfirmationSheet / TourTrackingPanel

**展示主題 `sections/`（最多重複的區塊）**：
- Hero 6 款：default / Luxury / Collage / Dreamscape / Gemini / Nature / Art
- Features 4 款：default / Art / Collage / Luxury
- Hotels 4 款：default / Art / Collage / Luxury
- Itinerary section 4 款：default / Art / Dreamscape / Luxury
- Leader section 4 款：default / Art / Collage / Luxury
- Pricing section 4 款：default / Art / Collage / Luxury
- PriceTiers 2 款：default / Luxury
- Flight section 4 款：default (Unified) / Collage / Dreamscape / Luxury
- 共用 layout/modals/hooks/utils 在子目錄

**列印模板**（`components/print-templates/`）：flight / hotel / members 各一份 + flight-print-labels

**PNR 工具**（`components/pnr-tool/`）：TourPnrToolDialog + 配對邏輯

---

## 5. Hooks 層（features/tours/hooks 共 23 個）

資料存取 / 商業邏輯集中：
- `useTours.ts` / `useTours-advanced.ts`（主資料 + 詳情）
- `useTourItineraryItems.ts`（SSOT 寫入器 syncToCore）
- `useTourPayments.ts`（訂單快速收款）
- `useTourOperations.ts`（CRUD 主入口）
- `useTourEdit.ts`、`useTourPageState.ts`、`useToursForm.ts`、`useToursPage.ts`、`useToursDialogs.ts`、`useToursPaginated.ts`
- `useTourDailyData.ts` / `useTourDepartureData.ts` / `useTourDepartureTotals.ts`
- `useTourDestinations.ts` / `useTourGallery.ts` / `useTourHealth.ts`
- `useAccommodationSegments.ts`（住宿合併、需求單 + 分房共用）
- `useAirports.ts` / `useItineraryDrag.ts` / `useQuoteLoader.ts`（舊 quote_items 相容）
- `useCoreRequestItems.ts`（核心表需求 dialog 用）
- `useTourRequests.ts`、`useTourItineraryNav.ts`、`useTourScrollEffects.ts`

---

## 6. Services（5 個 + tests）

- `tour.service.ts` — 主 CRUD（含 `isTourCodeExists`、`generateTourCode`、`updateTourStatus`）
- `tour-channel.service.ts` — 工作頻道
- `tour-stats.service.ts`（含 test）
- `profit-calculation.service.ts` — 利潤計算
- `tour_dependency.service.ts` — 依賴分析

---

## 7. 外部依賴

- **AeroDataBox**（RapidAPI）— 航班查詢、用在 `useTourForm` + 行程分頁
- **OCR.space + Google Vision** — 護照辨識（團員上傳護照）
- **Gemini** — 行程 AI 文案（`/api/ai/generate-itinerary-copy/`）+ 景點建議 + 圖片編輯
- **LINE Messaging API** — 工作頻道通知

---

## 8. PC (`/tours`) vs 行動版 (`/m/tours`) 差異

| 項目 | PC `/tours/[code]` | 行動 `/m/tours/[id]` |
|---|---|---|
| URL 參數 | code（如 `TOUR-2026-01`） | id（uuid） |
| 頁面入口 | 完整 Tab 系統（11 tab） | 獨立行動版 layout |
| 共用層 | `useTourDetails`、`Tour` type、SSOT hooks | 同上（共用 hooks 層） |
| UI 元件 | TourTabContent + dynamic tabs | `m/tours/[id]/page.tsx` 獨立 |
| CheckinQRCode | 有（Tab 9）| 有（獨立功能）|

---

## 9. Tour 類型三態（tour_type 欄位）

- **official** — 正式出團團
- **proposal** — 草案 / 提案團（報價階段）
- **template** — 公司模板團（William 說未完成）

`ConvertToTourDialog` 用來把 proposal/template 轉成 official。
