# /tours — 網站地圖

Route：`/tours`（列表）/ `/tours/[code]`（單團）/ `/m/tours/[id]`（行動版單團）
Code paths：
- UI 入口：`src/app/(main)/tours/page.tsx`（delegate）、`src/app/(main)/tours/[code]/page.tsx`、`src/app/m/tours/[id]/page.tsx`
- Feature 主體：`src/features/tours/`（160+ components / 23 hooks / 5 services）
- 耦合 features：`quotes`、`orders`、`payments`、`disbursement`、`confirmations`、`itinerary`、`attractions`、`tour-leaders`、`tour-confirmation`、`tour-documents`
- API：`src/app/api/tours/[tourId]/requests/[requestId]/{accept,reject}/route.ts`、`src/app/api/tours/by-code/[code]/route.ts`

Last updated：2026-04-22（v2.0）
Raw reports：`docs/ROUTE_CONSISTENCY_REPORT_2026-04-22/tours/raw/A-F.md`

---

## 業務目的（William 口述、2026-04-22）

「客人詢價階段我們會做**開團提案**、然後去做行程做報價單。**公司模板**會有特定主管製作模板給大家參考複製使用、但目前還沒做完整。

**報價之後客人收名單、不會整理到訂單成員**。有可能**一個旅遊團會有很多訂單**、**團員分頁就是他們集合再一起、大主管才會看到**。

在**訂單頁面收款請款和財務功能是連結的**、也是同一套概念、只是目前這裡是針對**這一團這一個訂單**快速收款或請款。

**行程 / 報價 / 需求都是完整的 SSOT**、景點中的是他們自己的 SSOT、我們有點像排行程的時候外掛進來。

**結帳目前還沒做完**。」

**澄清**（William 同日確認）：
- `/inquiries` 是舊版殘影、**跟本流程無關**、「詢價→開團提案」不在 /inquiries 做

---

## 對照的跨路由設計原則

### 原則 1：權限長在人身上、不是頭銜上
- **/tours 現況**：❌ **違反**
- hook 層 `auth-store.ts:249` 的 `usePermissions` 有 `if (isAdmin) return true` 短路
- API 層（accept / reject）不顯式檢查職務、完全靠 RLS
- 無「職務 → 權限」的 mapping 實裝、員工看到的 Tab 只靠 workspace feature flag 過濾（`useVisibleModuleTabs`）、沒有「業務員 vs 會計 vs OP」的差異

### 原則 2：職務是身份卡、全系統統一
- **/tours 現況**：❌ **違反**
- 「團員分頁大主管才看到」= William 的職務分層設計、代碼沒有實裝
- OrderMembersExpandable 沒有角色級篩選
- /tours 所有 Tab 對所有職務（除了 isAdmin）一視同仁

### 新候選原則（本次驗證浮現、建議收進 _INDEX）

- **A. 核心業務事件走一張真相表**（「一 row 走到底」）：tour_itinerary_items 承載行程/報價/需求/確認/結帳五階段、證明此原則在代碼活著、但也暴露「單表擴張風險」（見後警惕項）
- **B. 聚合層 vs 明細層分離**：一團多訂單（tour ↔ orders 一對多）、團員是跨訂單聚合視圖
- **C. 資源類型獨立生命週期**：景點/酒店/餐廳是外部 SSOT、行程表「外掛進來」、CRUD 不混在 tour_itinerary_items
- **D. 快速入口 ≠ 獨立資料**：訂單頁快速收款 / 請款打進**財務模組同一張表**（payments / payment_requests）、不是平行系統

這 4 條需 William 確認是否收進跨路由原則。

---

## 代碼現況

- **列表頁** `page.tsx` 只有 7 行、delegate 到 `features/tours/ToursPage`。建團流程支援三種 `tour_type`（official / proposal / template）
- **單團頁** 用 URL code → SWR 轉 tour_id → `useTourDetails` → TourTabContent
- **11 個 Tab**（順序）：總覽 / 訂單 / 團員 / 行程 / 展示行程 / 報價 / 需求 / 團確單 / 合約 / 報到 / 結案
- **所有 Tab 都 dynamic() 載入**、付費 Tab 用 `useVisibleModuleTabs` 按 workspace feature flag 過濾（合約是付費）
- **SSOT 核心表**：`tour_itinerary_items`（DB 81 欄）、寫入器 = `syncToCore()`（delete-then-insert、匹配 day_number+category）
- **報價寫回器** = `writePricingToCore()`（UPDATE 用 itinerary_item_id）、報價計算 `useCategoryItems.ts`
- **展示行程主題**：6+ 套（default / Luxury / Collage / Dreamscape / Gemini / Nature / Art）、每套 section 獨立一組 .tsx 檔
- **API**：accept / reject / by-code 三支；by-code 用 service_role 無 auth
- **外部依賴**：AeroDataBox（航班）/ OCR + Gemini Vision（護照辨識）/ Gemini（AI 行程文案）/ LINE（工作頻道）
- **行動版 `/m/tours/[id]`** 共用 hooks 層、UI 獨立

---

## 真正該警惕的問題（按嚴重度）

### 🔴 高（必處理）

#### 1. syncToCore delete-then-insert 是時炸彈
- **檔案**：`src/features/tours/hooks/useTourItineraryItems.ts:232-580`
- **現象**：每次同步行程表、delete 所有舊 items 再 INSERT、carryOverPricing 靠 `day_number + category` 匹配
- **風險**：客人要求大幅調日序（第 3 天改第 1 天）、或 AI 重排行程、或多地接協作改行程 → 報價/需求/廠商回覆的聯繫斷、老 item 成孤兒
- **佐證**：`useSyncItineraryToCore:404-409` 直接 `update({ status: 'outdated' })` 覆蓋需求單狀態、**沒檢查該需求單是否已成交**、可能覆蓋已接受訂單
- **未來影響**：Venturo roadmap 的「AI 重排行程」、「多地接協作」上線前**這套一定要改成軟更新**

#### 2. 跨租戶寫入漏洞：writePricingToCore UPDATE 缺 workspace 過濾
- **檔案**：`src/features/quotes/utils/core-table-adapter.ts:155-173`
- **現象**：UPDATE 只用 `.eq('id', item.itinerary_item_id)`、沒 `.eq('workspace_id', ...)`
- **風險**：若 client 送別租戶的 item id、會直接改別租戶的報價
- **配套**：INSERT 有傳 workspace_id（第 228 行）、但 UPDATE 忘補

#### 3. `/api/tours/by-code/[code]` 用 service_role 且無 auth
- **檔案**：`src/app/api/tours/by-code/[code]/route.ts`
- **現象**：用 `SUPABASE_SERVICE_ROLE_KEY` 繞過 RLS、無任何認證
- **風險**：任何人可用任意 code 查詢任一租戶的 tour 資料
- **影響**：違反「/login v2.0 發現的設計原則：跨租戶操作缺 workspace 一致性驗證」

#### 4. accept / reject API 無顯式 workspace 檢查
- **檔案**：`src/app/api/tours/[tourId]/requests/[requestId]/{accept,reject}/route.ts`
- **現象**：取出 `request.workspace_id` 後**沒比對 `session.workspace_id`**
- **風險**：完全依賴 RLS、若 RLS 有漏洞就跨租戶越界
- **對照**：/login 驗證的 `sync-employee` 同型問題

#### 5. `tour_members_insert` policy 過寬
- **位置**：DB policy
- **現象**：`WITH CHECK: true`（任何登入用戶都能插記錄）、其他操作（select / update）才用 EXISTS(tour.workspace_id) 檢查
- **風險**：惡意用戶若能列舉別 workspace 的 tour_id、可插入團員到別人的團
- **對照**：與 /login 的 `employee_permission_overrides USING: true` 是同類設計錯誤

#### 6. 報價計算邏輯兩套不一致
- **檔案**：
  - `src/features/quotes/hooks/useCategoryItems.ts:44-136`（主流、有住宿/餐飲/交通/領隊完整分攤邏輯）
  - `src/features/tours/hooks/useQuoteLoader.ts:168-242`（向後相容、只做簡單映射、**無 quantity 分攤**）
- **風險**：快速報價載入的 quantity 意義 ≠ 手工編輯、同行程估金額會對不齊
- **影響**：報價 SSOT 雖存同一張表、但計算器分裂

#### 7. 結帳未完成（William 已確認）
- **現象**：`tour_itinerary_items.actual_expense / expense_note / expense_at` 欄位存在、但**無任何 hook / API 在寫**
- **UI**：`tour-closing-tab.tsx` 展示層約 60%（讀 paymentRequests 算 totalExpense）、操作層缺「結帳動作」按鈕
- **阻塞**：月結對帳 / 分潤計算（ProfitTab）/ 獎金計算（BonusSettingTab）

#### 8. 公司模板 0% 實裝（William 已確認）
- **現象**：`tour_type='template'` 欄位值存在、**但無複製 API、無主管限制、無模板列表 UI、無版本管理**
- **DB**：無獨立 `tour_templates` 表（Agent F 確認）、template 只是 tour 表的一筆值
- **意義**：William 「特定主管做模板、大家複製」完全是需求、未開工

#### 9. 違反原則 1（職務權限未活、靠 isAdmin 短路）
- hook `usePermissions` 有 `if (isAdmin) return true` 短路（auth-store.ts:249）
- 單團 Tab 裡 `canEditDatabase = isAdmin || permissions.includes('database')` 雖非純短路、但仍靠 isAdmin 當第一判斷
- API 層（accept/reject）完全沒職務檢查、只有 RLS
- **後果**：William 在 /hr/roles 定義的職務權限、在 /tours 裡實質失效

---

### 🟡 中（應處理）

#### 10. tour-quote-tab v1 vs v2 並存
- v2 已掛在 TourTabs（`TourTabs.tsx:67-70`）、v1 (`tour-quote-tab.tsx`) 留著無人用
- 改報價邏輯只改 v2、若 hardcode import v1 → 邏輯分歧
- 無文檔說明何時能刪 v1

#### 11. 多主題展示 6+ 套
- Luxury / Collage / Dreamscape / Gemini / Nature / Art / default、每套獨立 Hero + Features + Hotels + Itinerary + Leader + Pricing + Flight 的 section 組件
- 改顯示欄位（例：景點經緯度）要改 6 份、測試 6 倍工
- 無文檔說明「哪套是預設、哪套淘汰」

#### 12. `tour_itinerary_items` 已 81 欄、接近擴張上限
- 跨 7 業務維度（報價 / 需求 / 確認 / 結帳 / 定價 / 預訂 / 供應商回覆）
- 新需求欄位不斷加、100 欄是轉折點（效能 + 可讀性崩）
- 建議設 hard limit（例 95）、超過強制拆表

#### 13. `tours.code` 無 UNIQUE constraint
- DB_TRUTH 未見 unique 索引
- 代碼層 `isTourCodeExists` 用跨租戶 `.eq('code', code)`、無 workspace 過濾
- 風險：不同租戶可能撞 code、或同租戶重複 code 未攔

#### 14. `tour_itinerary_items` 無 (day_number, category, tour_id) UNIQUE
- syncToCore carryOverPricing 匹配靠這組鍵、但 DB 沒強制唯一
- 若同 day+category 有兩筆（例：同日兩間飯店）、carry over 匹配不定

#### 15. Hub 化風險
- 單團頁依賴 10+ features、TourTabContent switch 涵蓋所有
- 未來加發票 / 簽核 / 多語言 / Loco 協作 → 單頁責任無限擴張
- 建議 tab 上限 + plugin 機制

#### 16. ⚠️ 團員 vs 訂單成員兩表並存（raw 有矛盾、本層判定）
- **Agent B 結論**：只找到 order_members、UI 用這張
- **Agent F 結論**：tour_members 和 order_members 兩張表都在 DB 存在
- **主 Claude 判定**：grep 確認 `tour_members` 在 4 個檔有用到（types / dependency service / RequirementsList）
- 現況：兩表共存、職責分工未明、可能是「團級名單（tour_members）vs 訂單級明細（order_members）」但無文檔
- **需補**：釐清兩表關係、避免同人雙記錄

---

### 🟢 低（視情況）

- **17. `tours.status` 註解 vs type 定義矛盾**（`tour.types.ts:436` 註解「狀態（英文）」、type `'開團'|'待出發'|'已出發'|'待結團'|'已結團'|'取消'` 是中文）
- **18. 行動版 `/m/tours` 與 PC 版分離**：共用 hooks 但 UI 雙份維護、新功能（如 CheckinQRCode）要手動同步
- **19. 歷史殘留**：`syncItineraryToQuote 已移除`、`quote_items 表已廢棄` 註解都在；不影響功能、可清

---

## 其他觀察

### 身份真相（SSOT）

- ✅ `Tour` interface 統一來源 `src/types/tour.types.ts`、Store 正確 re-export
- ✅ 行程 / 報價 / 需求三 Tab 確實共讀 `tour_itinerary_items`
- ✅ 景點 SSOT 獨立（attractions 表、workspace_id + license 模型、可跨租戶共用）
- ⚠️ `location` 欄位已廢棄（改用 country_id + airport_code）、但 Tour interface 還留著
- ⚠️ `getServerAuth()`（login 驗證已發現）同一用戶兩架構匹配的問題、在 /tours 也會影響所有 API

### 租戶隔離（RLS、對照 DB_TRUTH）

- ✅ tours / tour_itinerary_items / tour_rooms / tour_room_assignments / tour_documents / orders / payments / attractions 全部 **NO FORCE RLS**（沒中 login 驗證發現的 28 張表地雷）
- ✅ 租戶 policy 用 `workspace_id = get_current_user_workspace()` 一致
- ⚠️ tour_members `WITH CHECK: true`（見警惕項 5）
- ⚠️ 代碼層 UPDATE 缺 workspace 過濾、靠 policy 擋（見警惕項 2）

### 欄位一致性

- ✅ tour_id 關聯命名統一（orders.tour_id → tours.id）
- ⚠️ tours.status 的值型不統一（英文 vs 中文）
- ⚠️ UI 的 `NewTourData` interface 漏了 10+ 個 DB 欄位（closing_status / locked_* / tier_pricings / custom_cost_fields / selling_prices 等）—— 代表 UI 能送的 < DB 能存的、trigger 或其他模組可能在默默寫

### DB 層隱形邏輯（v2.0）

- Trigger `trigger_auto_set_workspace_id` BEFORE INSERT 自動填 workspace_id（/login 已見、/tours 同依賴）
- Trigger `tours_cascade_rename` AFTER UPDATE 級聯改名
- Trigger `tr_create_tour_folders` AFTER INSERT 自動建檔案夾
- Trigger `trigger_create_tour_conversations` AFTER INSERT 自動建會話
- **審計欄位 FK 全部合規**（created_by/updated_by/closed_by/locked_by 都指 employees(id)）

### 未來 SaaS 擴張

- 旅遊業 Agent / 地接 Loco / 司機 / 飯店 / 餐廳若多角色進來、目前 Tab 系統只按 workspace feature flag 過濾、**無法按角色給 Loco 子集 itinerary_items**
- 建議預留 `tour_itinerary_items.visibility_scope` 欄或新增 `itinerary_item_viewers` 表（RBAC）

---

## 建議行動（只列項目、不動手、交 council 討論）

| 項目 | 緊急度 | 來自 |
|---|---|---|
| syncToCore 改軟更新（UPDATE 不 DELETE+INSERT）、或加 version_id snapshot | 🔴 高 | E, C |
| writePricingToCore UPDATE 補 `.eq('workspace_id', ...)` | 🔴 高 | B |
| `/api/tours/by-code` 加認證或刪除 | 🔴 高 | C |
| accept / reject API 補 workspace 一致性驗證 | 🔴 高 | C |
| `tour_members` policy 改成 `WITH CHECK: workspace_id = get_current_user_workspace()` | 🔴 高 | F |
| 報價計算邏輯統一（useCategoryItems = 唯一真相、useQuoteLoader 改呼叫它） | 🔴 高 | C |
| 實作結帳 flow（actual_expense 寫入 API / hook） | 🔴 高 | D, E |
| 公司模板完整設計（複製流程、主管限制、模板列表）| 🔴 高（業務要求）| D |
| 刪 `auth-store.ts:249` 的 `if (isAdmin) return true` 短路（對照 /login 同一項）| 🔴 高 | C |
| 刪 v1 tour-quote-tab.tsx | 🟡 中 | C, E |
| 多主題精簡（用 theme prop 取代 6 份獨立元件） | 🟡 中 | E |
| `tours.code` 加租戶內 UNIQUE constraint | 🟡 中 | B, F |
| `tour_itinerary_items` 加 (day_number, category, tour_id) UNIQUE | 🟡 中 | F |
| 釐清 tour_members vs order_members 職責、補文檔 | 🟡 中 | B/F 矛盾 |
| tour_itinerary_items 設 95 欄 hard limit、超過強制拆表 | 🟡 中 | E |
| Tour interface 同步補齊 DB 欄位（或確認哪些是 trigger 專用、UI 不送）| 🟡 中 | F |
| tours.status 值型統一（英文 or 中文擇一） | 🟢 低 | B |
| 清 `syncItineraryToQuote 已移除`、`quote_items 廢棄` 註解 | 🟢 低 | C |
| 預留 `tour_itinerary_items.visibility_scope`（Loco / 司機上線前）| 🟢 低（現在）🔴（SaaS 時）| E |

**要做任何一項、請開 `venturo-cleanup-council`**。本 skill 只產地圖、不動手。

---

## 下一個相關路由建議

1. **`/dashboard`** ⚠️ 優先 — /login 驗證發現 28 張 FORCE RLS 表會擋首頁、tours 頁本體雖免、但 dashboard widget 讀的表（tour_itinerary_items 不在 28 張但 confirmations 等在）仍會爆
2. **`/hr/roles`** — 職務權限的本體頁、要在 /tours 動職務分層前先搞定它
3. **`/orders`** — /tours 的下層、一團多訂單的訂單側、SSOT 在此延伸
4. **`/customized-tours/*`** — William 說的「開團提案 / 行程 / 報價」階段、可能是 proposal 型 tour 的另一入口
5. **`/finance/*`** + `/accounting/*` — 訂單頁快速收付打進來的財務本尊、原則 D「快速入口 ≠ 獨立資料」要在那邊對照驗證
