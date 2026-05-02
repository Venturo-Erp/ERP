# Venturo ERP Schema 業務地圖

> 更新：2026-05-01
> 用途：把 117 張表按業務概念分組、列出每個概念的 SSOT 主表 + 衍生關係。寫 code / query 前先查這份。
> 讀者：未來的 Claude（含我自己）+ William
>
> 數據來源：`pg_stat_user_tables`（live tuples）+ `pg_tables`（rowsecurity）

---

## 目錄

| # | Group | 表數 | 狀態 |
|---|-------|------|------|
| 1 | 認證 / 權限 / HR | 8 | 核心 |
| 2 | 租戶 / Workspace | 9 | 核心 |
| 3 | 旅遊團 | 11 | 核心 |
| 4 | 行程（核心 SSOT 之一） | 3 | ⚠️ 3 表並存待整併 |
| 5 | 訂單與團員 | 3 | 核心 |
| 6 | 客戶 | 4 | 核心（companies 0 row） |
| 7 | 報價 / 合約 / 確認 | 5 | 核心 |
| 8 | 財務（收/付/出納） | 5 | 核心 |
| 9 | 會計 / 傳票 | 8 | ⚠️ 3 套科目並存待整併 |
| 10 | 旅遊資料庫（景餐宿） | 9 | 核心 |
| 11 | 供應商 | 3 | 核心 |
| 12 | 通訊（頻道 / LINE / 客服） | 9 | 部分上線 |
| 13 | 行事曆 / 待辦 / 通知 / 公告 | 6 | 部分上線 |
| 14 | 簽證 / 旅遊文件 / 代轉發票 | 3 | ⚠️ visas 0 row |
| 15 | AI / 知識庫 | 4 | 核心 |
| 16 | 參考資料（ref_*） | 8 | 純查找、5 表無 RLS |
| 17 | 工具 / log / 系統 | 9 | 系統用 |

**合計：117 張表**

---

## 1. 認證 / 權限 / HR

**概念**：誰是員工、屬於哪個職務、有什麼權限。SSOT 是 `employees`（不是 `auth.users`、不是 `profiles`）。

### SSOT 主表

| 表 | 行數 | RLS | 關鍵欄位 | 說明 |
|----|------|-----|---------|------|
| `employees` | 16 | ✅ | id, workspace_id, user_id (→auth.users), workspace_role_id, employee_code, name, email | **審計欄位 FK 指向這裡**（`created_by`、`updated_by` 全部 → employees.id）|
| `workspace_roles` | 25 | ✅ | id, workspace_id, name, capabilities (jsonb) | 職務定義（業務員 / 會計 / 主管…） |
| `role_capabilities` | 1367 | ✅ | role_id, capability_code | 職務 → capability 的多對多 |

### 衍生 / 關聯表

| 表 | 行數 | 用途 |
|----|------|------|
| `profiles` | 12 | 舊 auth profile、仍被 RLS / 部分 FK 用、**不要再寫新東西到這**（看 9.HR 紅線） |
| `selector_field_roles` | 4 | 動態欄位 ↔ 職務多對多 |
| `tour_role_assignments` | 0 | 「某團某員工擔任什麼角色」（待用） |

### 常見 query 入口

- `useAuthStore` → 取 `currentUser`（型態是 employees row、不是 auth.users）
- `useEmployees()` → `src/data/entities/employees.ts`
- `useWorkspaceRoles()` → `src/data/hooks/useWorkspaceRoles.ts`
- 權限判斷：`src/lib/permissions/`

### 紅線

- **`created_by` 等審計 FK 一律 → `employees(id)`**、不准 → `auth.users(id)`（CLAUDE.md 已記、2026-04-20 全面切換完畢）
- 客戶端寫入 `created_by: currentUser?.id || undefined`、不要 `|| ''`

---

## 2. 租戶 / Workspace

**概念**：多租戶隔離。每個業務表必有 `workspace_id`、RLS 第一條一律是 tenant 隔離。

### SSOT 主表

| 表 | 行數 | RLS | 關鍵欄位 | 說明 |
|----|------|-----|---------|------|
| `workspaces` | 4 | ✅（**NO FORCE**）| id, code, name, plan, is_active | 租戶本表。**FORCE RLS 絕不開**（會打斷登入） |
| `workspace_features` | 235 | ✅ | workspace_id, feature_code, is_enabled | feature flag、租戶開通哪些 module |

### 衍生 / 設定表

| 表 | 行數 | 用途 |
|----|------|------|
| `workspace_attendance_settings` | 1 | 出勤規則（上班時間、休息時段） |
| `workspace_countries` | 258 | 租戶啟用哪些國家 |
| `workspace_line_config` | 1 | 租戶 LINE Bot 設定 |
| `workspace_meta_config` | 0 | 租戶 metadata（待用） |
| `workspace_modules` | 0 | ⚠️ 跟 `workspace_features` 概念重疊、0 row、待業務拍板 |
| `workspace_selector_fields` | 3 | 租戶自訂欄位 |

### 常見 query 入口

- `src/stores/workspace/` → workspace store
- `src/lib/permissions/hooks.ts` → feature flag 模組級快取（登入一次、session 共用）
- `src/app/(main)/tenants/` → 租戶管理 UI

### ⚠️ 同概念冗餘

- **`workspace_features` vs `workspace_modules`**：前者 235 row 在用、後者 0 row 待砍 / 待業務確認用途

### 紅線

- 所有業務表 INSERT/UPDATE 必帶 `workspace_id`
- `workspaces` 不准 `FORCE ROW LEVEL SECURITY`（會讓 service_role 也被擋、登入死）
- Admin client 必須 per-request、不准 singleton（見 `src/lib/supabase/admin.ts`）

---

## 3. 旅遊團

**概念**：一團從規劃到結團的所有資料。`tours` 是主表、其他都掛在 `tours.id` 下。

### SSOT 主表

| 表 | 行數 | RLS | 說明 |
|----|------|-----|------|
| `tours` | 35 | ✅ | 旅遊團本表（團號、名稱、出發日、狀態、損益…） |

### 衍生 / 關聯表

| 表 | 行數 | 用途 |
|----|------|------|
| `tour_destinations` | 47 | 團 ↔ 目的地多對多 |
| `tour_documents` | 3 | 團文件（合約 PDF、結案報告…） |
| `tour_leaders` | 1 | 領隊指派 |
| `tour_custom_cost_fields` | 0 | 團自訂成本欄位（待用） |
| `tour_departure_data` | 0 | 出發資料（待用） |
| `tour_meal_settings` | 0 | 團餐食設定（待用） |
| `tour_member_fields` | 0 | 團員自訂欄位（待用） |
| `leader_availability` | 0 | 領隊可用日期（待用） |

### ❌ 該檢討

- `tour_addons` (0 row) — 團附加產品、code 還在引用、業務待拍板
- `tour_role_assignments` (0 row) — 看 1.HR section、沒在用

### 常見 query 入口

- `useTours()` → `src/data/entities/tours.ts`
- 列表頁：`src/app/(main)/tours/page.tsx`
- 詳情頁：`src/app/(main)/tours/[code]/page.tsx`（用 code 不用 id）

---

## 4. 行程（核心 SSOT 之一）⚠️

**概念**：一個團的每天行程明細（住宿、餐飲、活動、交通）。從規劃 → 報價 → 需求 → 廠商回 → 確認 → 結團、**同一筆 row 走到底**。

### ⚠️ 已知技術債：3 張表並存

| 表 | 行數 | RLS | 角色 |
|----|------|-----|------|
| `tour_itinerary_items` | 404 | ✅ | **真正的核心表 SSOT**（一 row 走到底） |
| `itineraries` | 23 | ✅ | 行程編輯器的 daily_itinerary JSON、`syncToCore` 寫入 `tour_itinerary_items` |
| `tour_itinerary_days` | 109 | ✅ | 待 A2 報告釐清角色（疑似舊版 / 中間表） |

### SSOT 主表

`tour_itinerary_items` 是核心、各階段寫入不同欄位（見 `docs/CODE_MAP.md` §核心表架構）：

| 階段 | 寫入欄位 | 誰寫 |
|------|---------|------|
| 行程表 | day_number, title, category, service_date, resource_id, resource_type, supplier_name, resource_name | `useTourItineraryItems.syncToCore` |
| 報價單 | unit_price, quantity, total_cost, pricing_type, adult_price, child_price | `writePricingToCore` |
| 需求單 | request_status, request_sent_at | 發需求時 |
| 廠商回覆 | reply_content (JSON), reply_cost, request_reply_at | `markRequestReplied` |
| 確認 | confirmed_cost, confirmation_status | 確認操作 |
| 結團 | actual_expense, expense_note, expense_at | 結團核銷 |

### 常見 query 入口

- `useTourItineraryItemsByTour(tourId)` → `src/data/entities/tour-itinerary-items.ts`
- 行程編輯器：`src/features/tours/components/itinerary/`
- 報價：`src/features/quotes/utils/core-table-adapter.ts`
- 需求單：`src/features/confirmations/components/RequirementsList.tsx`

### 待 A2 報告決定

3 表並存到底是「JSON 主表 + 核心明細表 + 中間表」三層架構必要、還是冗餘可砍。**不要在這個 session 自行決定。**

---

## 5. 訂單與團員

**概念**：誰報名了哪一團、訂單金額、團員護照資料。

### SSOT 主表

| 表 | 行數 | RLS | 說明 |
|----|------|-----|------|
| `orders` | 25 | ✅ | 訂單（訂單號、團、客戶、金額、狀態） |
| `order_members` | 150 | ✅ | **真正的團員表**（訂單 ↔ 人多對多、含護照、生日、特殊需求） |

### 衍生 / 關聯表

| 表 | 行數 | 用途 |
|----|------|------|
| `shared_order_lists` | 0 | 訂單分享連結（待用） |

### ❌ 該檢討

- `members` (0 row) — `useMembers()` 還在引用、但 `order_members` 才是真資料、業務待拍板要不要砍

### 常見 query 入口

- `useOrders()` → `src/data/entities/orders.ts`
- `useMembers()` → `src/data/entities/members.ts`（指向 `members` 表、要釐清）
- `usePassportUpload` → `src/features/orders/hooks/usePassportUpload.ts`

---

## 6. 客戶

**概念**：個人客戶資料。`customers` 是主表。

### SSOT 主表

| 表 | 行數 | RLS | 說明 |
|----|------|-----|------|
| `customers` | 385 | ✅ | 客戶本表（姓名、電話、護照、會員等級、來源） |

### 衍生 / 關聯表

| 表 | 行數 | 用途 |
|----|------|------|
| `companies` | 0 | B2B 企業客戶（保留、2026-05-02 修齊憲法 schema 對齊 UI） |
| `company_contacts` | 0 | 企業聯絡人（保留、ON DELETE CASCADE 跟 companies） |
| `company_announcements` | 0 | 企業公告（保留） |

### 常見 query 入口

- `src/app/(main)/customers/` → 客戶管理頁
- 護照辨識：`src/app/api/ocr/passport/`

---

## 7. 報價 / 合約 / 確認

**概念**：報價單（葡萄串模型：1 主報價 + N 快速報價）、合約、需求單回覆。

### SSOT 主表

| 表 | 行數 | RLS | 說明 |
|----|------|-----|------|
| `quotes` | 58 | ✅ | 報價單（含 quote_type='standard' 主 / 'quick' 快速）|
| `contracts` | 10 | ✅ | 合約 |
| `request_responses` | 0 | ✅ | 廠商需求回覆主表 |
| `request_response_items` | 0 | ✅ | 廠商需求回覆明細 |

### 關聯 log

| 表 | 行數 | 用途 |
|----|------|------|
| `quote_confirmation_logs` | 0 | 報價確認操作 log（待用）。**例外**：append-only log、無 `updated_at`（憲法 §2）|

### 紅線（葡萄串）

- 主報價 `quote_type='standard'`、0 或 1 張/團
- 快速報價 `quote_type='quick'`、0~N 張/團
- 找主報價：`quotes.tour_id + quote_type='standard'` 反查、**不要再加 `tours.quote_id` 捷徑**（會破壞 SSOT、見 BUSINESS_MAP）

### 常見 query 入口

- `useQuotes()` / 報價分頁 `src/features/tours/components/tour-quote-tab-v2.tsx`
- 需求單：`src/features/confirmations/components/RequirementsList.tsx`

---

## 8. 財務（收 / 付 / 出納）

**概念**：收客戶錢（receipts）、付供應商錢（payment_requests）、出納整批撥款（disbursement_orders）。

### SSOT 主表

| 表 | 行數 | RLS | 說明 |
|----|------|-----|------|
| `receipts` | 20 | ✅ | 收款單（向客戶收）|
| `payment_requests` | 16 | ✅ | 請款單（要付廠商）|
| `payment_request_items` | 34 | ✅ | 請款單明細 |
| `disbursement_orders` | 6 | ✅ | 出納單（一張出納單可對應多張請款單）|
| `bank_accounts` | 12 | ✅ | 公司銀行帳戶 |

### 衍生 / 設定表

| 表 | 行數 | 用途 |
|----|------|------|
| `payment_methods` | 36 | 付款 / 收款方式（type='receipt' / 'payment'）|
| `expense_categories` | 53 | 費用類別（餐 / 交通 / 住…） |
| `cost_templates` | 0 | 成本範本（待用） |
| `vendor_costs` | 8 | 供應商成本 |
| `transportation_rates` | 0 | 交通費率（待用） |
| `checks` | 0 | 支票（待用） |
| `advance_lists` | 0 | 預支申請（待用） |
| `advance_items` | 0 | 預支明細（待用） |

### 常見 query 入口

- 收款：`src/app/(main)/finance/payments/` + `useReceipts()`
- 請款：`src/app/(main)/finance/requests/` + `usePaymentRequests()`
- 出納：`src/app/(main)/finance/treasury/disbursement/`
- 報表：`src/app/(main)/finance/reports/`

### 報表邏輯

- 收入 = `receipts.status='1'`（已確認）
- 支出 = `payment_requests.status IN ('billed','paid')`
- 按供應商展開：從 `payment_request_items` 看、不只看主表 supplier_name

---

## 9. 會計 / 傳票 ⚠️

**概念**：複式會計、借貸傳票。

### ⚠️ 已知技術債：3 套科目表並存

| 表 | 行數 | RLS | 角色（推測） |
|----|------|-----|------|
| `chart_of_accounts` | 267 | ✅ | 標準會計科目表（COA） |
| `accounting_subjects` | 148 | ✅ | 疑似自訂科目 / 中文版 |
| `accounting_categories` | 78 | ✅ | 疑似分類層 |

### SSOT 主表（傳票）

| 表 | 行數 | RLS | 說明 |
|----|------|-----|------|
| `journal_vouchers` | 11 | ✅ | 傳票主表 |
| `journal_lines` | 22 | ✅ | 傳票明細（借貸行）|

### 其他

| 表 | 行數 | 用途 |
|----|------|------|
| `accounting_transactions` | 0 | 待用 |
| `accounting_accounts` | 0 | 待用 |
| `accounting_period_closings` | 0 | 期末結帳（待用） |

### 待 A3 報告決定

3 套科目表是「分類 / 科目 / COA」三層必要、還是兩套舊的可砍。**不要在這個 session 自行決定。**

### 常見 query 入口

- `src/app/(main)/accounting/vouchers/`
- `src/app/(main)/accounting/accounts/`
- `docs/accounting-implementation-plan.md` / `docs/ACCOUNT_CODE_MAPPING.md`

---

## 10. 旅遊資料庫（景餐宿）

**概念**：行程編輯時拖拉的景點 / 餐廳 / 飯店資料源。每一筆都可以被多個團的 `tour_itinerary_items.resource_id` 引用。

### SSOT 主表

| 表 | 行數 | RLS | 說明 |
|----|------|-----|------|
| `attractions` | 2444 | ✅ | 景點資料庫（清邁 / 上海 / 台灣…）|
| `hotels` | 480 | ✅ | 飯店 |
| `restaurants` | 275 | ✅ | 餐廳 |
| `michelin_restaurants` | 26 | ✅ | 米其林餐廳（疑似 restaurants 子集）|
| `premium_experiences` | 80 | ✅ | 高端體驗 |
| `airport_images` | 2 | ✅ | 機場圖片 |

### 知識相關

| 表 | 行數 | 用途 |
|----|------|------|
| `image_library` | 0 | 圖片庫（待用） |
| `rich_documents` | 0 | 富文本文件（待用） |
| `notes` | 3 | 筆記 |

### 常見 query 入口

- `useAttractions()` → `src/data/entities/attractions.ts`
- 景點側欄：`src/features/tours/components/itinerary/AttractionLibrary.tsx`
- 預覽 enrich：`src/app/api/itineraries/[id]/route.ts` (`enrichDailyItinerary` / `enrichHotels`)

---

## 11. 供應商

**概念**：跟你交易的廠商（飯店業者、車行、餐廳老闆…）。

### SSOT 主表

| 表 | 行數 | RLS | 說明 |
|----|------|-----|------|
| `suppliers` | 15 | ✅ | 供應商主表 |
| `supplier_categories` | 7 | ✅ | 供應商分類 |

### 衍生

| 表 | 行數 | 用途 |
|----|------|------|
| `pnr_records` | 0 | 機票 PNR 記錄（待用） |

### 常見 query 入口

- `src/app/(main)/database/suppliers/`

---

## 12. 通訊（頻道 / LINE / 客服）

**概念**：內部頻道（員工聊天）+ 對外通訊（LINE / FB / IG 客服整合）。

---

### 🗑️ 內部頻道（已徹底刪除、2026-05-02）

**狀態**：DB 4 張表 + 整個 UI 模組於 2026-05-02 整套刪除（migration `20260503040000_drop_channel_chat_system.sql`）。

**刪除原因**（William 2026-05-02 拍板）：
- 凍結中、用不到、保留在系統內變技術債
- 強制員工從 LINE 轉換到內部聊天難度高、不是首要解決
- 「直接完全刪除、不需要區分解凍或凍結、直接移除即可」

**未來若需重做**：
- 依憲法重新審視 schema、UI 拆模組、不繼承現有實作半成品
- 跟團務流程整合、做事件驅動通知（不是純聊天）

### LINE 整合

| 表 | 行數 | 用途 |
|----|------|------|
| `line_users` | 2 | LINE 用戶 |
| `line_groups` | 5 | LINE 群組 |
| `line_conversations` | 0 | LINE 對話 |
| `line_messages` | 0 | LINE 訊息（待用）。**例外**：append-only log、無 `updated_at`（憲法 §2）|

### 客服

| 表 | 行數 | 用途 |
|----|------|------|
| `customer_service_conversations` | 81 | 客服對話 |

### 常見 query 入口

- 頻道：`src/app/(main)/channel/`（凍結中）
- LINE webhook：`src/app/api/line/webhook/route.ts`
- 客服：`src/components/workspace/channel-chat/`（凍結中、含內部頻道邏輯）

---

## 13. 行事曆 / 待辦 / 通知 / 公告

**概念**：個人 / 團隊的事件、任務、通知。

### SSOT 主表

| 表 | 行數 | RLS | 說明 |
|----|------|-----|------|
| `todos` | 6 | ✅ | 待辦事項 |
| `todo_columns` | 13 | ✅ | 待辦看板欄位 |
| `tasks` | 12 | ✅ | 任務（疑似跟 todos 概念重疊、待釐清） |
| `calendar_events` | 0 | ✅ | 行事曆事件 |
| `notifications` | 0 | ✅ | 通知 |
| `bulletins` | 0 | ✅ | 公告 |

### 常見 query 入口

- 待辦：`src/app/(main)/todos/`
- 行事曆：`src/app/(main)/calendar/`

### ⚠️ 同概念可能重疊

- `todos` vs `tasks` — 兩張表並存、12 vs 6 row、待釐清

---

## 14. 簽證 / 旅遊文件 / 代轉發票

**概念**：簽證申請、團隊文件、代轉發票（給供應商開）。

### 表清單

| 表 | 行數 | RLS | 說明 |
|----|------|-----|------|
| `visas` | 0 | ✅ | ⚠️ 簽證、code 還在引用（含獨立路由 `/visas`、entity hook）、業務待拍板要不要保留功能 |
| `travel_invoices` | 0 | ✅ | 代轉發票（路由 `/finance/travel-invoice`） |
| `flight_status_subscriptions` | 0 | ✅ | 航班狀態訂閱（待用） |

### 常見 query 入口

- 簽證：`src/app/(main)/visas/`
- 代轉發票：`src/app/(main)/finance/travel-invoice/`

---

## 15. AI / 知識庫

**概念**：AI 對話、記憶、設定、知識庫。

### 表清單

| 表 | 行數 | RLS | 說明 |
|----|------|-----|------|
| `ai_conversations` | 2 | ✅ | AI 對話 |
| `ai_memories` | 30 | ✅ | AI 記憶 |
| `ai_settings` | 6 | ✅ | AI 提示詞 / 設定 |
| `knowledge_base` | 0 | ✅ | 知識庫（待用） |

### 常見 query 入口

- AI Bot：`src/app/(main)/ai-bot/`
- AI 設定：`src/app/(main)/settings/ai/`
- 行程文案 AI：`src/app/api/ai/generate-itinerary-copy/`

---

## 16. 參考資料（ref_*）

**概念**：純查找資料、跨租戶共用、不可變（航空公司代碼、機場代碼、艙位代碼…）。

### 表清單

| 表 | 行數 | RLS | 說明 |
|----|------|-----|------|
| `ref_airlines` | 59 | ❌ | 航空公司 |
| `ref_airports` | 6075 | ❌ | 機場 |
| `ref_booking_classes` | 26 | ❌ | 訂位艙等 |
| `ref_cities` | 3250 | ✅ | 城市 |
| `ref_countries` | 86 | ✅ | 國家 |
| `ref_destinations` | 5 | ✅ | 目的地 |
| `ref_ssr_codes` | 60 | ❌ | 特殊服務代碼 |
| `ref_status_codes` | 30 | ❌ | 狀態碼 |

### 其他地理 / 分類

| 表 | 行數 | RLS | 說明 |
|----|------|-----|------|
| `cities` | 304 | ✅ | 跟 `ref_cities` 並存、待釐清 |
| `countries` | 120 | ✅ | 跟 `ref_countries` 並存、待釐清 |
| `regions` | 44 | ✅ | 區域 |

### 紅線

- ref_* 5 張無 RLS 是預期（純查找、無租戶概念）
- `cities` / `countries` 跟 `ref_*` 並存看 `docs/REFACTOR_PLAN_REF_DATA.md`

---

## 17. 工具 / log / 系統

**概念**：基礎設施。

### 表清單

| 表 | 行數 | RLS | 說明 |
|----|------|-----|------|
| `_migrations` | 365 | ✅ | migration 紀錄 |
| `cron_execution_logs` | 237 | ✅ | cron 執行 log |
| `cron_heartbeats` | 0 | ✅ | cron 心跳 |
| `webhook_idempotency_keys` | 167 | ✅ | webhook 冪等鍵 |
| `rate_limits` | 21 | ✅ | rate limit |
| `api_usage` | 7 | ✅ | API 用量計費 |
| `background_tasks` | 0 | ✅ | 背景任務（待用） |
| `user_preferences` | 2 | ✅ | 使用者偏好 |

### ❌ 該檢討

- `linkpay_logs` (0 row) — code 還在引用、業務待拍板
- `departments` (0 row) — code 還在引用（HR 模組）、業務待拍板

---

## SSOT 設計原則（仿 venturo-app）

開新表 / 改 schema 前必過這些檢查：

### 1. 一個業務概念 → 一張主表 + 必要的明細表

- ✅ `payment_requests` (主表) + `payment_request_items` (明細)
- ❌ 同時存在 `accounting_subjects` / `accounting_categories` / `chart_of_accounts` 三張概念重疊

### 2. 每張 business table 必有

```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
created_at   timestamptz NOT NULL DEFAULT now(),
updated_at   timestamptz NOT NULL DEFAULT now()

-- trigger: set_updated_at()
-- index:   (workspace_id)
-- RLS:     已啟用、3 個 policy（select / insert / update）
```

ref_* 是例外（純查找、跨租戶共用）。

### 3. 軟刪除統一 `is_active boolean`

```sql
is_active boolean NOT NULL DEFAULT true
-- index:   (workspace_id, is_active)
-- query:   .eq('is_active', true)
```

不要再混用 `deleted_at` / `is_deleted` / `archived_at`（A1 正在統一）。

### 4. 命名 snake_case

| 對象 | 規則 | 範例 |
|------|------|------|
| Table | plural snake_case | `customers`、`tour_leaders` |
| Column | singular snake_case | `full_name`、`workspace_id` |
| Index | `idx_{table}_{cols}` | `idx_customers_workspace` |
| FK constraint | `{table}_{col}_{ref}_{ref_col}_fk` | `orders_customer_id_customers_id_fk` |

### 5. 審計欄位 FK 一律 `→ employees(id)`

`created_by` / `updated_by` / `performed_by` / `uploaded_by` / `locked_by` 等 → `employees(id) ON DELETE SET NULL`。

不准 → `auth.users(id)`（front-end `currentUser?.id` 是 employees.id、會 FK violation）。

### 6. 不要再建概念重疊的新表

開新表前先在這份文件搜「概念」、確認沒人在做同件事。

---

## 已完成的清理（2026-05-01 / 02）

### A2 行程 3 表 ✅ 合併
- `tour_itinerary_days` 109 筆 day metadata 遷進 `tour_itinerary_items.category='day_meta'` anchor row、表 DROP
- `itineraries` 留下（對外文宣 + 版本管理）、jsonb 簡化是後續工作

### A3 會計 3 套科目 ✅ 合併
- `chart_of_accounts`（267）保留為唯一 SSOT
- `accounting_subjects`（148）DROP（v2 並列死表、0 業務寫入）
- `accounting_categories`（78）DROP（純孤兒、0 FK 指向）
- `payment_requests.accounting_subject_id` / `receipts.accounting_subject_id` FK 切到 `chart_of_accounts`

### A1 軟刪除 ✅ 統一
- 全站只用 `is_active boolean NOT NULL DEFAULT true`
- `is_deleted` / `deleted_at` 全砍

### 7 個中度引用孤兒 ✅ 業務拍板完成

| 表 | William 拍板 | 結果 |
|----|------|------|
| `visas` | 保留 + 修齊 | ✅ 已修齊憲法標準（C2 修） |
| `messages` / `channels` / `channel_members` | 凍結 | 🟡 標記凍結中、不動（見 §12） |
| `members` | 砍 | ✅ 表 DROP（C1） |
| `departments` | 砍 | ✅ 表 DROP + UI / FK / 部門前綴邏輯全清（C1） |
| `linkpay_logs` | 保留 + 修齊 | ✅ 已修齊（C2 修、webhook 邏輯不動） |
| `tour_addons` | 砍（替代方案：order_members.add_ons） | ✅ 表 DROP（C1） |
| `companies` + `company_contacts` + `company_announcements` | 保留 + 修齊 | ✅ DB schema 對齊 UI（B2B 發票銀行欄位）、4-policy RLS（C2 修） |

## 第二波重構（2026-05-02 進行中）

### 已完成：權限基礎修復

- ✅ `is_super_admin()` 從 stub `RETURN false` 改成真實邏輯（E1）
- ✅ `employees.user_id` 13/16 員工補齊（從 `supabase_user_id` 反向同步、E1）
- ✅ trigger `trg_sync_employee_user_id` 雙向同步、防未來脫鉤
- ✅ 21 張表 RLS 4-policy 標準（E2、用 `is_super_admin` + `has_capability_for_workspace`）
- ✅ `itineraries` / `messages` 舊 OR-insert 漏洞清掉
- ✅ 22+3 個 P0 admin client / [id] route 加 workspace_id filter（E3）

### 進行中：第三波（F + G）

- ⏳ F1：D2 P1 admin client 45 個（工作中）
- ⏳ F2：效能優化 — `getLayoutContext` 模式（工作中）
- ⏳ G1：SyncFields (`_needs_sync` / `_synced_at` / `_deleted`) 全站 audit
- ⏳ G2：`user_id` vs `supabase_user_id` 命名不一致 audit

## 仍待處理的技術債

### 同類資源存兩份（憲法 §10.15 違反）

| 資源 | 兩份各是什麼 | 計畫 |
|---|---|---|
| DB types | `src/types/database.types.ts` vs `src/lib/supabase/types.ts` | 收斂單一份、其他改 re-export |
| migration tracking | `_migrations` vs `supabase_migrations.schema_migrations` | 收斂、選一個為主 |
| user FK 欄位 | `employees.user_id` vs `employees.supabase_user_id` | G2 audit 後決定方向、F3 執行 |

### 其他可疑重疊（待 review）

- `workspace_features` (235) vs `workspace_modules` (0) → workspace_modules 0 row、可砍
- `todos` (6) vs `tasks` (12) → 用途不同（個人 vs 團隊）但命名易混、考慮 rename
- LINE 系列表（`line_users` / `line_groups` / `line_conversations` / `line_messages`）vs 客服系列 vs 凍結中的 messages / channels — 未來解凍時一起整理

### 守門機制（憲法 §12 待落地）

- pattern checker script 自動掃禁止清單違反
- pre-commit hook 跑 type-check + standards check
- CI 擋

### 其他可疑重疊（沒列入 A2/A3、但值得 review）

- `workspace_features` (235) vs `workspace_modules` (0)
- `todos` (6) vs `tasks` (12)
- `cities` (304) vs `ref_cities` (3250) / `countries` (120) vs `ref_countries` (86)
- `restaurants` (275) vs `michelin_restaurants` (26)（後者疑似前者子集）

---

## 維護規則

1. 開新表、改 schema、砍表 → **這份文件同步更新**
2. 業務拍板某「待用」表確定不做 → 標 ❌、列入下次 cleanup
3. 發現新的概念重疊 → 加到「已知技術債」section、不要自行併
4. 數據過 30 天 → 重跑開頭的 `pg_stat_user_tables` query 更新 row 數

---

**參考文件**：
- `docs/CODE_MAP.md` — 程式碼地圖（路由 / 檔案位置）
- `docs/BUSINESS_MAP.md` — 業務地圖（規則 / 流程）
- `docs/DATABASE_DESIGN_STANDARDS.md` — 命名規範詳細
- `docs/FIELD_NAMING_STANDARDS.md` — 欄位命名規範
- `docs/CROSS_SYSTEM_MAP.md` — ERP ↔ Online 欄位對應
