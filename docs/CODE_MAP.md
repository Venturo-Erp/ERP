# CODE_MAP.md — 程式碼地圖

**用途**：收到任務時，直接查這裡找位置，不用 grep

---

## 🔑 關鍵字速查

| 關鍵字              | 主要檔案                                                            | 說明                           |
| ------------------- | ------------------------------------------------------------------- | ------------------------------ |
| **收款**            | `src/app/(main)/finance/payments/`                                  | 收款列表頁                     |
| **收款新增**        | `src/features/finance/payments/components/AddReceiptDialog.tsx`     | 新增收款對話框                 |
| **收款確認**        | `src/features/finance/payments/components/ReceiptConfirmDialog.tsx` | 會計確認                       |
| **批量收款**        | `src/features/finance/payments/components/BatchReceiptDialog.tsx`   | 批量收款                       |
| **請款**            | `src/app/(main)/finance/requests/`                                  | 請款列表頁                     |
| **請款新增**        | `src/features/finance/requests/components/AddRequestDialog.tsx`     | 新增請款                       |
| **請款詳情**        | `src/features/finance/requests/components/RequestDetailDialog.tsx`  | 請款詳情                       |
| **旅遊團**          | `src/app/(main)/tours/`                                             | 旅遊團列表                     |
| **旅遊團詳情**      | `src/app/(main)/tours/[code]/`                                      | 旅遊團詳情頁                   |
| **團詳情-總覽**     | `src/features/tours/components/TourOverviewTab.tsx`                 | 總覽分頁                       |
| **團詳情-行程**     | `src/features/tours/components/tour-itinerary-tab.tsx`              | 行程分頁                       |
| **團詳情-報價**     | `src/features/tours/components/tour-quote-tab-v2.tsx`               | 報價分頁                       |
| **團詳情-需求單**   | `src/features/tours/components/tour-requirements-tab.tsx`           | 需求單分頁                     |
| **團詳情-需求列表** | `src/features/confirmations/components/RequirementsList.tsx`        | 需求單主組件                   |
| **團詳情-結團**     | `src/features/tours/components/tour-closing-tab.tsx`                | 結團分頁                       |
| **團詳情-損益**     | `src/features/tours/components/ProfitTab.tsx`                       | 損益分頁                       |
| **團詳情-合約**     | `src/features/tours/components/tour-contract-tab/`                  | 合約分頁                       |
| **團詳情-網頁**     | `src/features/tours/components/tour-webpage-tab.tsx`                | 網頁分頁                       |
| **團詳情-獎金**     | `src/features/tours/components/BonusSettingTab.tsx`                 | 獎金分頁                       |
| **團詳情-設計**     | `src/features/tours/components/tour-designs-tab.tsx`                | 設計分頁                       |
| **團詳情-房間**     | `src/features/tours/components/assignment-tabs/TourRoomTab.tsx`     | 分房分頁                       |
| **團詳情-車輛**     | `src/features/tours/components/assignment-tabs/TourVehicleTab.tsx`  | 車輛配置分頁                   |
| **行程**            | `src/features/tours/components/itinerary/`                          | 行程分頁                       |
| **行程同步核心表**  | `src/features/tours/hooks/useTourItineraryItems.ts`                 | syncToCore                     |
| **核心表 Entity**   | `src/data/entities/tour-itinerary-items.ts`                         | tour_itinerary_items           |
| **景點庫**          | `src/features/tours/components/itinerary/AttractionLibrary.tsx`     | 景點側邊欄                     |
| **景點資料庫**      | `src/features/attractions/`                                         | 資料管理 → 景點                |
| **訂單**            | `src/app/(main)/orders/`                                            | 訂單列表                       |
| **訂單新增**        | `src/features/orders/components/OrderDialog.tsx`                    | 新增/編輯訂單                  |
| **團員**            | `src/features/members/`                                             | 團員管理                       |
| **客製化行程**      | `src/app/(main)/customized-tours/`                                  | 客製化行程（原 wishlist 更名） |
| **eSIM**            | `src/app/(main)/esims/`                                             | eSIM 產品管理                  |
| **簽證**            | `src/app/(main)/visas/`                                             | 簽證申請管理                   |
| **結團**            | `src/features/tours/components/tour-closing-tab.tsx`                | 結團分頁（結案）               |
| **損益**            | `src/features/tours/components/ProfitTab.tsx`                       | 損益分頁                       |
| **月報表**          | `src/app/(main)/finance/reports/monthly-income/`                    | 月收入報表                     |

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

| 資料表                 | Entity Hook             | 位置                                        |
| ---------------------- | ----------------------- | ------------------------------------------- |
| `tours`                | `useTours`              | `src/data/entities/tours.ts`                |
| `orders`               | `useOrders`             | `src/data/entities/orders.ts`               |
| `receipts`             | `useReceipts`           | `src/data/entities/receipts.ts`             |
| `payment_requests`     | `usePaymentRequests`    | `src/data/entities/payment-requests.ts`     |
| `attractions`          | `useAttractions`        | `src/data/entities/attractions.ts`          |
| `members`              | `useMembers`            | `src/data/entities/members.ts`              |
| `employees`            | `useEmployees`          | `src/data/entities/employees.ts`            |
| `tour_itinerary_items` | `useTourItineraryItems` | `src/data/entities/tour-itinerary-items.ts` |
| `workspace_roles`      | —                       | `src/app/api/roles/route.ts`                |

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

| 任務類型 | 搜尋關鍵字               |
| -------- | ------------------------ |
| 收款相關 | `receipts 收款 batch_id` |
| 請款相關 | `payment_requests 請款`  |
| 行程相關 | `itinerary 行程 景點`    |
| 結團相關 | `closing 結團 損益`      |
| 訂單相關 | `orders 訂單`            |
| 架構決策 | `ADR 架構決策`           |

---

---

## 🔐 權限系統

| 關鍵字           | 位置                                                 | 說明                        |
| ---------------- | ---------------------------------------------------- | --------------------------- |
| **權限定義**     | `src/lib/permissions/`                               | 權限系統核心                |
| **職務管理**     | `src/app/(main)/hr/roles/page.tsx`                   | HR → 職務管理               |
| **團務設定**     | `src/app/(main)/hr/roles/page.tsx`                   | 團務欄位權限設定            |
| **欄位權限 DB**  | `workspace_selector_fields` + `selector_field_roles` | 動態欄位可見度              |
| **細粒度權限**   | `src/lib/permissions/useTabPermissions.tsx`          | canRead/canWrite hook       |
| **isAdmin 判斷** | `src/stores/auth-store.ts`                           | `permissions.includes('*')` |
| **RLS 函數**     | DB: `is_super_admin()`                               | 只檢查 `super_admin`（舊）  |

---

## 🏢 租戶系統

| 關鍵字              | 位置                                  | 說明           |
| ------------------- | ------------------------------------- | -------------- |
| **租戶列表**        | `src/app/(main)/tenants/page.tsx`     | 租戶管理頁     |
| **建立租戶**        | `src/app/api/tenants/create/route.ts` | 建立租戶 API   |
| **workspace store** | `src/stores/workspace/`               | workspace 狀態 |

---

## 👤 員工系統

| 關鍵字       | 位置                                          | 說明          |
| ------------ | --------------------------------------------- | ------------- |
| **員工列表** | `src/app/(main)/hr/page.tsx`                  | HR 頁面       |
| **員工表單** | `src/features/hr/components/EmployeeForm.tsx` | 新增/編輯員工 |
| **建立員工** | `src/app/api/employees/create/route.ts`       | 建立員工 API  |
| **修改密碼** | `src/app/api/auth/change-password/route.ts`   | 修改密碼 API  |

---

---

## 🧠 核心表架構 — tour_itinerary_items（一 row 走到底）

### 設計理念

一個旅遊團的所有項目（住宿、餐飲、活動、交通）都存在 `tour_itinerary_items` 這張核心表。
從行程規劃 → 報價 → 發需求給廠商 → 廠商回覆 → 確認 → 結團，**同一筆 row 從頭走到尾**，不另開表。

```
行程表（寫入）→ 報價單（補價格）→ 需求單（發給廠商）→ 廠商回覆（寫回）→ 確認（定案）→ 結團（結算）
    ↓               ↓                ↓                 ↓              ↓            ↓
 同一筆 tour_itinerary_items row，不同階段填不同欄位
```

### 核心欄位 — 各階段寫入什麼

| 階段         | 寫入欄位                                                                              | 誰寫                  |
| ------------ | ------------------------------------------------------------------------------------- | --------------------- |
| **行程表**   | `day_number`, `title`, `category`, `service_date`, `resource_id`, `resource_type`     | 行程編輯器 syncToCore |
| **報價單**   | `unit_price`, `quantity`, `total_cost`, `pricing_type`, `adult_price`, `child_price`  | writePricingToCore    |
| **需求單**   | `request_status` → 'sent', `request_sent_at`                                          | 發需求時更新          |
| **廠商回覆** | `reply_content`(JSON), `reply_cost`, `request_reply_at`, `request_status` → 'replied' | markRequestReplied    |
| **確認**     | `confirmed_cost`, `confirmation_status` → 'confirmed'                                 | 確認操作              |
| **結團**     | `actual_expense`, `expense_note`, `expense_at`                                        | 結團核銷              |

### 各功能讀取核心表的方式

| 功能                  | 檔案                                                                 | 怎麼讀                                         |
| --------------------- | -------------------------------------------------------------------- | ---------------------------------------------- |
| **行程表寫入**        | `src/features/tours/hooks/useTourItineraryItems.ts`                  | syncToCore: delete-then-insert                 |
| **報價單**            | `src/features/quotes/utils/core-table-adapter.ts`                    | writePricingToCore / coreItemsToCostCategories |
| **需求單**            | `src/features/confirmations/components/RequirementsList.tsx`         | 讀 coreItems → coreItemsToQuoteItems 轉換      |
| **需求單轉換器**      | `src/features/confirmations/components/core-items-to-quote-items.ts` | 合併連續住宿、算日期                           |
| **住宿需求單 UI**     | `src/features/confirmations/components/UnifiedTraditionalView.tsx`   | AccommodationTable                             |
| **住宿需求 Dialog**   | `src/features/confirmations/components/AccommodationQuoteDialog.tsx` | 調用 UnifiedTraditionalView                    |
| **核心表需求 Dialog** | `src/features/tours/components/CoreTableRequestDialog.tsx`           | 直接讀 useCoreRequestItems                     |
| **分房**              | `src/features/tours/hooks/useAccommodationSegments.ts`               | 合併連續住宿成 Segment                         |
| **分房 Tab**          | `src/features/tours/components/assignment-tabs/TourRoomTab.tsx`      | 用 Segment 建房間                              |

---

### 住宿的特殊邏輯 — 續住合併

行程表裡連續住同一間飯店，核心表每晚存一筆 row：

```
Day 1 | accommodation | 上海外灘華爾道夫酒店 | resource_id: xxx
Day 2 | accommodation | 上海外灘華爾道夫酒店 | resource_id: xxx  ← 續住
Day 3 | accommodation | 上海外灘華爾道夫酒店 | resource_id: xxx  ← 續住
Day 4 | accommodation | 上海外灘華爾道夫酒店 | resource_id: xxx  ← 續住
```

**下游功能需要合併**：連續同飯店 = 同一段住宿，不需要每晚分開處理。

| 功能       | 合併？            | 原因                                                     |
| ---------- | ----------------- | -------------------------------------------------------- |
| **報價單** | ❌ 每晚分開       | 每晚價格可能不同（淡旺季、房型差異），需逐晚報價         |
| **需求單** | ✅ 合併成一段     | 發給飯店的需求是「入住 3/12，退房 3/16」，不用每晚分開發 |
| **分房**   | ✅ 合併成 Segment | 同一段住宿配一次房，不用每晚重複配                       |

### 住宿合併的共用 Hook

`src/features/tours/hooks/useAccommodationSegments.ts`

```typescript
interface AccommodationSegment {
  hotel_name: string // 飯店名
  start_night: number // 開始晚數
  end_night: number // 結束晚數
  nights: number[] // [1, 2, 3, 4]
  night_count: number // 4
}
```

分房已經用這個 Hook，需求單也應該用。

---

### ✅ 已修復項目

#### 1. `supplier_name` 和 `resource_name` 未寫入 ✓

**已修復**：`accommodationToItem` 已加入 `resource_name: accommodation` 存檔

---

### ⚠️ 已知問題與待修項目

#### 1. 需求單住宿未用 Segment 合併

**問題**：需求單的住宿資料傳入 `AccommodationQuoteDialog` 時，每晚獨立一筆，
但廠商需求單應該是一整段（入住日~退房日）。

**修法**：需求單也應該用 `useAccommodationSegments` 或同樣邏輯合併後再傳入。

#### 2. 報價單的計價邏輯（重要）

**檔案**：`src/features/quotes/hooks/useCategoryItems.ts` 第 60-130 行

各類別的「小計（每人均價）」計算方式不同：

| 類別           | quantity 意義 | 公式                                  | 範例                                                          |
| -------------- | ------------- | ------------------------------------- | ------------------------------------------------------------- |
| **住宿**       | 幾人房        | `unit_price ÷ quantity`               | 房價 6000 ÷ 2人房 = 每人 3000                                 |
| **餐飲**       | 幾人一桌/一份 | `unit_price ÷ quantity`               | 桌菜 10000 ÷ 10人 = 每人 1000                                 |
| **活動**       | 幾人分攤      | `unit_price ÷ quantity`               | 團體導覽 4000 ÷ 20人 = 200/人；個人門票不填 quantity = 500/人 |
| **交通(團體)** | 台數          | `(quantity × unit_price) ÷ groupSize` | 2台 × 8000 ÷ 20人 = 800/人                                    |
| **領隊導遊**   | 天數          | `(quantity × unit_price) ÷ groupSize` | 5天 × 3000 ÷ 20人 = 750/人                                    |

**關鍵**：住宿和餐飲的 quantity 不是「買幾個」，而是「幾人分攤一份」。

- 不填 quantity → 預設 1（個人餐 / 單人房）
- 填 2 → 兩人分攤（雙人房 / 兩人套餐）
- 填 10 → 十人分攤（桌菜 10 人一桌）

#### 4. 行程表 syncToCore 是 delete-then-insert

**問題**：每次同步行程表，會刪除所有舊 items 再重新 insert。
已填的報價、需求狀態、廠商回覆會嘗試 carry over（`carryOverPricing`），
但匹配靠 `day_number + category`，如果行程順序大幅調整可能丟失資料。

**目前 carry over 邏輯**：第 468-472 行，用 `oldPricingByDayCategory` 匹配。

---

### 相關資料表

| 資料表                                   | 用途                               | 與核心表關係                          |
| ---------------------------------------- | ---------------------------------- | ------------------------------------- |
| `tour_itinerary_items`                   | 核心表 — 一 row 走到底             | 本尊                                  |
| `itineraries`                            | 行程表 JSON（daily_itinerary）     | SSOT，syncToCore 寫入核心表           |
| `tour_rooms`                             | 分房：物理房間（房型、容量、晚數） | 靠 hotel_name + night_number 鬆散對應 |
| `tour_room_assignments`                  | 分房：團員分配到房間               | FK → tour_rooms                       |
| `tour_requests`                          | 需求單狀態（舊版，部分功能仍用）   | 靠 tour_id 關聯                       |
| `suppliers`                              | 供應商資料庫                       | 核心表的 supplier_id 指向             |
| `hotels` / `restaurants` / `attractions` | 資源資料庫                         | 核心表的 resource_id 指向             |

---

## 🤖 AI / 外部 API 功能索引

> 更換 API 或調整 AI 提示詞時，直接查這裡找位置

### 航班查詢 — AeroDataBox (RapidAPI)

| 位置                                                       | 說明                                 |
| ---------------------------------------------------------- | ------------------------------------ |
| `src/features/dashboard/actions/flight-actions.ts`         | 核心查詢邏輯（`searchFlightAction`） |
| `src/features/tours/hooks/useTourForm.ts:33`               | 開團時選航班                         |
| `src/features/tours/components/tour-itinerary-tab.tsx:154` | 行程分頁航班查詢                     |
| `.env.local` → `AERODATABOX_API_KEY`                       | API Key                              |

### 護照辨識 — OCR.space + Google Vision

| 位置                                                  | 說明                            |
| ----------------------------------------------------- | ------------------------------- |
| `src/app/api/ocr/passport/route.ts`                   | 主 API 路由                     |
| `src/app/api/ocr/passport/ocr-clients.ts`             | OCR.space / Google Vision 呼叫  |
| `src/app/api/ocr/passport/passport-parser.ts`         | 解析護照文字                    |
| `src/features/orders/hooks/usePassportUpload.ts`      | **成員** — 護照上傳/辨識        |
| `src/app/(main)/customers/hooks/usePassportUpload.ts` | **顧客** — 護照上傳/辨識        |
| `.env.local` → `OCR_SPACE_API_KEY`                    | OCR.space Key                   |
| `.env.local` → `GOOGLE_VISION_API_KEYS`               | Google Vision Key（可多組輪換） |

### 行程 AI 文案生成 — Gemini

| 位置                                              | 說明                         |
| ------------------------------------------------- | ---------------------------- |
| `src/app/api/ai/generate-itinerary-copy/route.ts` | 行程管理 AI 深層文字         |
| `src/app/api/ai/suggest-attraction/route.ts`      | 景點建議                     |
| `src/app/api/ai/edit-image/route.ts`              | AI 圖片編輯                  |
| `src/app/api/gemini/generate-image/route.ts`      | AI 圖片生成                  |
| `.env.local` → `GEMINI_API_KEY`                   | API Key（可設 KEY_2~5 輪換） |

### LINE 機器人 — LINE Messaging API + Gemini

| 位置                                        | 說明                |
| ------------------------------------------- | ------------------- |
| `src/app/api/line/webhook/route.ts`         | LINE Webhook 入口   |
| `src/app/api/line/push/route.ts`            | 主動推播            |
| `src/app/api/line/test-ai/route.ts`         | AI 測試             |
| `src/app/(main)/settings/bot-line/page.tsx` | LINE Bot 後台設定   |
| `src/app/(main)/settings/ai/page.tsx`       | AI 提示詞設定       |
| `.env.local` → `LINE_CHANNEL_ACCESS_TOKEN`  | LINE Bot Token      |
| `.env.local` → `LINE_CHANNEL_SECRET`        | LINE Channel Secret |
| `.env.local` → `NEXT_PUBLIC_LINE_BOT_ID`    | LINE Bot ID         |

### 旅客聊天 — Gemini

| 位置                                     | 說明        |
| ---------------------------------------- | ----------- |
| `src/app/api/traveler-chat/route.ts`     | 聊天 API    |
| `src/components/workspace/channel-chat/` | 旅客聊天 UI |

### 列印功能

| 位置             | 說明                                                                           |
| ---------------- | ------------------------------------------------------------------------------ | ------------------- |
| **日本入境卡**   | `src/features/tours/components/tour-checkin/print-templates/japan-entry-card/` | 純前端生成 PDF 列印 |
| **列印模板目錄** | `src/features/tours/components/print-templates/`                               | 各類列印模板        |

---

**更新**：2026-04-05
