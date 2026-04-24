# Venturo 網站地圖索引

每頁一份、跨時間只有一份（每次重驗覆蓋最新）。
歷史驗證紀錄、原始研究素材在 `docs/ROUTE_CONSISTENCY_REPORT_<date>/` 下（時間序、不覆蓋）。

**這份 \_INDEX.md 是累積脈絡的靈魂**——每次驗新頁前必讀、subagent prompt 必帶、確保 SSOT 不在驗證元層級破碎。

Last updated：2026-04-22 深夜（**v1.4 強迫症深掘第二輪**：在 4 路由重驗結果上、用 SQL 全站盤 P020、grep 全站盤 P001 isAdmin 短路、API endpoint grep 找出 P022 CRITICAL）

**📋 跨 pattern 統籌修復地圖**：見 [`_PATTERN_MAP.md`](./_PATTERN_MAP.md)（v1.4 2026-04-22 深夜、18 條 pattern、6🔴 5🟡 4🟢 + P020 P021 P022 新加）

---

## 🎯 上線必驗範圍（William 2026-04-22 定義）

最小可上線集合、全部驗完即可上線：

| 類別              | 路由                                                                                                                                         | 頁數（估） | 狀態                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------- |
| 首頁登入          | `/login`                                                                                                                                     | 1          | ✅ 完成                                  |
| 儀表板            | `/dashboard` + 主 root                                                                                                                       | 2          | ⚪ 待驗                                  |
| 行事曆            | `/calendar`                                                                                                                                  | 1          | ⚪ 待驗                                  |
| 人資 + 權限       | `/hr/*`                                                                                                                                      | ~16        | ⚪ 待驗                                  |
| 旅遊團開團 + 管理 | ~~`/inquiries`（殘影、跟流程無關）~~、`/customized-tours/*`、`/tours`（✅ 已驗）、`/orders`、`/confirmations/*`、`/scheduling`、`/contracts` | ~10        | 🟡 `/tours` ✅、其餘 ~8 待驗             |
| 財務管理          | `/finance/*`、`/accounting/*`                                                                                                                | ~24        | 🟡 `/finance/payments` ✅、其餘 ~23 待驗 |
| 資料庫管理        | `/customers/*`、`/database/*`、`/supplier/*`                                                                                                 | ~19        | ⚪ 待驗                                  |

**粗估剩 ~70 頁**。

---

## 📜 William 的跨路由設計原則（累積中）

**每次驗新頁、Agent D 必對照這份清單檢查代碼是否符合。**

### 1. 權限長在人身上、不是頭銜上

**來自**：/login 驗證（2026-04-22）

**原則**：系統主管 = 預設權限多的 role、**不是 bypass key**。API 應該查 `hasPermission(user, action)`、不是 `if (user.isAdmin)`。

**違反樣態**（要警覺）：

- 後端 API 直接用 `isAdmin` 當大鎖
- `checkPermission` 裡有 `if (isAdmin) return true` 短路
- 權限真相分兩套（前端細緻、後端粗暴）
- 老闆在設定頁改某個 role 的權限、後端沒感覺（因為還在用 isAdmin）

**遇到敏感 API（重設密碼、建帳號、刪資料等）時、必追這個 pattern**。

### 2. 職務是身份卡，全系統統一識別

**來自**：/hr 驗證（2026-04-22）

**原則**：員工被分配一個職務（role），系統用這一套職務定義在**每個地方**（每個路由、每個功能）檢查他的權限。不是每個地方各自定義一套職務。

**實例**（William 的名牌模型）：

- 新增員工 → 選職務（給一張「名牌」）
- 職務定義中央集中（/hr/roles）→ 有哪些權限（名牌上有什麼通行證）
- 員工登入後 → 系統讀這張名牌 → 在任何地方都用同一套職務決策

**違反樣態**（要警覺）：

- 有多套職務系統並存（例如 workspace_roles + workspace_job_roles）
- 同一概念「職務」在不同表、定義不同、ID 不同
- 某個地方有自己的「職務」定義、沒人用

### 3. 租戶一致性必須每層都守、不能只靠一層

**來自**：/login v2.0 補驗（2026-04-22）

**原則**：多租戶隔離**不是單點防禦**、要 **Middleware（前線）+ API 應用層（驗一致性）+ DB RLS（最後防線）** 三層都守。任何一層漏、都會被打穿。特別是 API 做 INSERT / UPDATE / DELETE 時、不能只信任 token 驗證成功、必須驗**目標資料的 workspace_id 是不是等於當前登入者的 workspace_id**。

**實例**（William 的公司比喻）：

- Corner 員工登入後、理論上只能管 Corner 的人
- 如果 API 只檢查「token 對得上自己」就讓你改別人資料、你就能改到 JINGYAO、YUFEN 的人
- 所以每個會動資料的 API、必須**先驗這筆資料屬不屬於你的公司**

**違反樣態**（要警覺）：

- Middleware 放行整組 prefix（`/api/auth/*` 全公開）、靠每支 endpoint 自己補認證
- API 驗了 token 就直接 `UPDATE ... WHERE id = ?`、沒檢查目標的 workspace_id
- RLS policy 依賴 `get_current_user_workspace()`、但 admin client 用 service_role 繞過、應用層沒補檢查
- 敏感操作（密碼重設、身份綁定、資料修改）只靠一層擋

**遇到**任何涉及跨 workspace 的動作（sync、bind、update、delete 別家資料）、必追此原則。

### 4. 狀態是真相、數字從狀態算出來（聚合即時算、不存冗餘欄位）

**來自**：/finance/payments 驗證（2026-04-22 William 拍板升正式）

**原則**：

- 最原始的**狀態（status）才是 SSOT**（收款單 status='0' 待確認 / '1' 已確認；請款單 status；訂單狀態等）
- 「數字」（已收總額、待確認總額、剩餘、利潤）**是從狀態衍生、要看時即時加總、不存成欄位**
- 同一個團 / 訂單 / 客戶的聚合數字在**多種狀態下要分開給**（例：旅遊團看到「待確認金額 + 已確認金額」兩個數字、不是只一個「已收總額」）

**William 的業務語言（原話）**：

> 「狀態有了就有可能。收款目前是待確認 / 已確認。旅遊團總覽會顯示**待確認金額還有已確認的金額**、這樣可以確認是不是 key 單了、只是會計還沒核銷。」

**業務意義**：

- 待確認金額 = 業務端已 key 單、但會計端還沒核銷
- 已確認金額 = 會計已核銷
- 大主管看這兩個數字 = 分清楚「卡在業務」還是「卡在會計」

**應用範圍（全系統）**：

- 旅遊團：總收入（已確認收款加總）、待收（已 key 未核銷收款加總）、總支出（已付請款加總）、待付（已送未付請款加總）
- 訂單：付款狀態 = 收款單加總 vs 訂單總額、不存 orders.payment_status 欄位
- 客戶應收 / 供應商應付 同理
- 任何「已收 / 已付 / 已出 / 剩餘」類數字、**全部**從 status 算

**違反樣態**（要警覺）：

- `orders.payment_status` 冗餘欄位、每次收款變動都要回寫（/finance/payments 已發現）
- `tours.total_revenue` 只寫已確認、待確認完全沒地方拿（/finance/payments 已發現）
- 有聚合欄位但算法散在多個 service（trigger + app hook 雙寫）
- 直接讀冗餘欄位、沒先重算就顯示 UI（看到過期值）

**實裝規範**：

- 建 function / view / helper 提供聚合數字（按 status 分開）
- 例：`getTourPaymentSummary(tour_id) → { pending_total, confirmed_total }`
- 移除冗餘聚合欄位（orders.payment_status、tours.total_revenue / profit 等）
- cache / materialized view 視效能需求再加、不是預設

**實務注意**：William 明說顯示端的主要消費者是**旅遊團頁面**（給大主管看）、其他頁面按需即時算、不特別設計冗餘顯示。

### 🟡 候選原則 5：核心業務事件走一張真相表（2026-04-22 /tours 口述、**待 William 拍板**）

**來自**：/tours 驗證。William「行程 / 報價 / 需求都是完整的 SSOT」、確認 `tour_itinerary_items` 一張表承載行程 / 報價 / 需求 / 確認 / 結帳 五階段、一 row 走到底。

**候選定義**：同一個業務事件在不同階段填不同欄位、不各階段開新表。

**可能適用範圍**：

- 旅遊團的行程項（已實裝、5 階段共用 tour_itinerary_items）
- 訂單的生命週期（新訂 → 確認 → 收訂金 → 收尾款 → 出團 → 結案）
- 請款單（送審 → 核准 → 付款 → 入帳）

**違反樣態**（若收）：同事件每階段各開一張表、跨表 JOIN 才能拼完整狀態

**副作用警覺**：單表擴張（tour_itinerary_items 已 81 欄、100 欄是轉折點）、需配 hard limit

### 🟡 候選原則 6：聚合層 vs 明細層分離（2026-04-22 /tours 口述、**待 William 拍板**）

**來自**：/tours 驗證。William「一個旅遊團會有很多訂單、團員分頁是他們集合再一起大主管才會看到」。

**候選定義**：聚合視圖（tour → many orders）和明細視圖（order → members）應該是**兩種 UI**、不是同一個 UI 塞兩種角度。

**可能適用範圍**：

- 團 / 訂單 / 團員（已實裝）
- 客戶 / 客戶訂單 / 訂單商品
- 供應商 / 採購單 / 採購項目

**違反樣態**（若收）：

- 大主管想看「這團有哪些人」卻只能一筆筆翻訂單
- 業務想看「這張訂單含哪些人」卻被迫看全團列表

### 🟡 候選原則 7：資源類型獨立生命週期（2026-04-22 /tours 口述、**待 William 拍板**）

**來自**：/tours 驗證。William「景點中的是他們自己的 SSOT、我們有點像排行程的時候外掛近來」。

**候選定義**：景點 / 酒店 / 餐廳 / 供應商是獨立 SSOT、有自己的 CRUD 生命週期、不跟業務事件表綁。行程「外掛進來」= resource_id / resource_type 關聯、**不複製資料**。

**可能適用範圍**：

- 景點（attractions、已驗有 workspace_id + license 模型）
- 酒店、餐廳、航班、車輛
- 客戶檔案（跨訂單共用）
- 供應商資料

**違反樣態**（若收）：

- 建團時把景點「複製」進 tour_itinerary_items 的欄位（應存 resource_id）
- 改景點名稱、舊團顯示不同步
- 景點 CRUD 在建團 UI 裡完成（應在 /database/\* 獨立）

### 🟡 候選原則 8：快速入口 ≠ 獨立資料（2026-04-22 /tours 口述、**待 William 拍板**）

**來自**：/tours 驗證。William「訂單頁面收款請款和財務功能是連結的、也是同一套概念、只是這裡針對這一團這一個訂單快速收款或請款」。

**候選定義**：從業務頁開啟的「快速動作」入口（快速收款、快速建事件、快速建待辦）**必須寫進主模組同一張表**、不是 /tours 本地的平行系統。

**可能適用範圍**：

- 訂單頁快速收款 → payments 主表（已實裝、Agent D 確認）
- 訂單頁快速請款 → payment_requests 主表
- 行事曆快速建事件
- /tours 快速加待辦 → /todos 主表

**違反樣態**（若收）：

- 訂單頁快速收款、存在 tour.quick_payments JSON 不寫 payments 表
- 財務頁看不到從訂單頁來的收款、真相分裂
- 兩套資料各自維護、對帳靠記憶

---

_（後續驗證累積的原則會加在這裡）_

---

## 已驗證路由

| 路由                                       | 業務目的                                                    | 最新驗證                   | 最嚴重問題（白話）                                                                                                                                                                                                                                                                                                                                                                                         | 對照原則                                             |
| ------------------------------------------ | ----------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [/login](./login.md)                       | 員工登入（未來 SaaS 多租戶）                                | 2026-04-22 **v3.1 落地驗** | v3.0 修的 P001-P004/P010/P016/P017 全落地 ✅；**重驗親查發現 P001 漏修 6 處 isAdmin 短路**（useTabPermissions 4 處 + sidebar + useChannelSidebar）；P018 + rememberMe + getServerAuth `.or()` 仍未修                                                                                                                                                                                                       | 違反原則 1（hook 層仍有缺口）+ 3（DB 層補完）        |
| [/hr](./hr.md)                             | 職務定義 + 員工管理                                         | 2026-04-22 **v2.0 重驗**   | useTabPermissions 4 處 isAdmin 短路（屬 P001 漏修部分）+ 員工自改 role_id 仍仰賴 RLS 兜底（P003 應用層應補）+ employee_permission_overrides P018 仍 4 條 USING:true + workspace_job_roles 是 tenant scoped 不是 USING:true 孤兒（前一輪沒查清）                                                                                                                                                            | 違反原則 1（hook 層）+ 2（職務系統）+ 3（P018 仍開） |
| [/finance/payments](./finance_payments.md) | 收款管理（5 種方式、會計核准 / 異常、自動連動訂單與團財務） | 2026-04-22 **v3.0 重驗**   | P001 PR-1c 整頁大鎖已修 ✅（page.tsx:213 改 canViewFinance）；DB 層親查全綠 ✅（receipts/linkpay_logs/payment_methods/payment_requests/orders 都有 workspace_id filter）；payment_method_id 之謎結案（DB 真相 nullable + FK SET NULL、不是 NOT NULL）；trigger_auto_post_receipt 是活的會計過帳 trigger 不是殘影；recalculateReceiptStats 雙寫仍在（原則 4 違反）；4 動作細權限仍未做                      | 違反原則 1（4 動作）+ 4（雙寫）                      |
| [/tours](./tours.md)                       | 旅遊團管理本體（列表 + 單團 11 Tab + 行動版）               | 2026-04-22 **v3.0 重驗**   | P003-F P003-G 親查確認落地 ✅；**新挖 P020**（tour_members ALL `authenticated` policy 與 cmd-specific 並存、effective 任何登入者可讀寫該表）；**新挖 P021**（tour_destinations / tour_leaders 無 workspace_id + 4 條 USING:true、待 William 拍板「公版 vs 租戶」）；syncToCore delete-then-insert 仍未修；by-code service_role 仍無 auth；tour_role_assignments 親查證實 4 條 EXISTS workspace（不是裸表） | 違反原則 3（P020 P021）、涉候選原則 4-8              |

### ⏳ 待重驗（新 pattern 可能也中、本輪未涵蓋）

| 路由                                  | 可能中的 pattern                                                                               | 緊急度 |
| ------------------------------------- | ---------------------------------------------------------------------------------------------- | ------ |
| [/login](./login.md) + [/hr](./hr.md) | 候選原則 6（聚合 vs 明細分離）在員工列表、客戶列表、訂單列表的適用性                           | 🟢 低  |
| 其他未驗路由                          | P020 多 policy 重疊（pg_policies WHERE cmd='ALL' 跟同表 cmd-specific 並存的全站盤）            | 🔴 高  |
| `/dashboard` `/calendar` 等待驗路由   | P001 6 處 isAdmin 短路是不是全 codebase 還有更多、P018 / P019 ❓ 17 張公版 vs 租戶拍板後的影響 | 🟡 中  |

---

## 跨路由共通問題（累積中）

**每項會標「已確認命中的路由」+「可能也中的路由」**。驗新頁時必查本頁是否中。

### 🔴 Role-gate 偽裝成 Permission-gate

**樣態**：API 用 `isAdmin` 當大鎖、繞過細緻權限系統；`checkPermission` 有 `if (isAdmin) return true` 短路。

**v1.4 強迫症深掘 grep 全站結果 — 17 處 isAdmin 短路完整清單**：

🔴 **整 layout 大鎖（業務員 / 會計 / 助理進不去整個家族）**：

- `src/app/(main)/accounting/layout.tsx:13`
- `src/app/(main)/database/layout.tsx:14`

🔴 **整頁大鎖**：

- `src/app/(main)/finance/settings/page.tsx:433`
- `src/app/(main)/finance/requests/page.tsx:63`（請款管理、OP / 業務本來就該用）
- `src/app/(main)/finance/travel-invoice/page.tsx:49`
- `src/app/(main)/finance/treasury/page.tsx:135`
- `src/app/(main)/finance/reports/page.tsx:96`

🟡 **權限 hook 短路**：

- `src/lib/permissions/useTabPermissions.tsx:80, 97, 113, 122`（canRead / canWrite / canReadAny / canWriteAny 4 函式各一）
- `src/lib/permissions/index.ts:114`
- `src/components/guards/ModuleGuard.tsx:49`

🟢 **UI 顯示層**：

- `src/components/layout/sidebar.tsx:522, 565, 596`（3 處）
- `src/components/layout/mobile-sidebar.tsx:260`
- `src/components/workspace/channel-sidebar/useChannelSidebar.ts:17`
- `src/app/(main)/settings/components/WorkspaceSwitcher.tsx:16`

**PR-1a 已修確認 ✅**（grep 親驗 0 處）：`auth-store.ts:249` / `permissions/hooks.ts:284,293` / `usePermissions.ts` 9 個 bool
**PR-1c 已修確認 ✅**：`/finance/payments/page.tsx:213` 改 canViewFinance（但 finance 其餘 5 子頁沒一起改 — finance 模組整體還是「半通半不通」）
**/tours**：`tour-itinerary-tab.tsx:91` canEditDatabase 改純 permission 比對 ✅、API 層 accept/reject 已加 tour_id filter ✅

### 🟡 職務系統分裂（多套並存）

**樣態**：同一概念「職務」在多個表、定義不同、ID 不同、某些表沒人用。

- **已確認命中**：/hr（workspace_roles 有人用、workspace_job_roles 是孤兒表）
- **可能也中**：其他有選人欄位的地方

### 🟡 UI 寫了但後端沒接的「假功能」

**樣態**：UI 有 checkbox / toggle、但送 API 時沒帶參數、後端無邏輯處理。

- **已確認命中**：
  - /login（「保持 30 天」）
  - /hr（權限矩陣 UI 因 isAdmin 短路形同虛設）
- **可能也中**：任何有進階設定 / toggle 的頁

### 🟡 欄位三層不一致（UI / API / DB 命名漂移）

**樣態**：同一概念 UI 叫 A、API 叫 B、DB 叫 C。

- **已確認命中**：
  - /login（帳號欄位：employee_number / email / Store 無統一）
  - /hr（.name 在三個地方意思不同）
  - /finance/payments（收款金額 amount + receipt_amount + total_amount 三個、付款方式 payment_method + receipt_type + payment_method_id 三套並存）
  - /tours（`tours.status` 註解說英文型別卻是中文列舉 / Tour interface 漏 DB 10+ 欄位 `closing_status` `locked_*` `tier_pricings` `custom_cost_fields` `selling_prices`）
- **可能也中**：任何跨模組共用的欄位（例如「訂單」、「客戶」、「金額」）

### 🟡 歷史驗證方式殘留

**樣態**：已移除的舊驗證方式、註釋 / TODO / 殘影還在 codebase。

- **已確認命中**：
  - /login（4 組舊註釋、Token Blacklist TODO）
  - /hr（舊的字符陣列權限系統 vs 新模組二維表並存）
  - /finance/payments（usePaymentData:37「會計模組已停用」孤立註釋 + 5 個孤兒欄位 confirmed_at / confirmed_by / bank_name / account_last_digits / transaction_id）
  - /tours（`tour-quote-tab.tsx` v1 vs `tour-quote-tab-v2.tsx` v2 並存、v2 已掛 Tab 但 v1 未刪 + `syncItineraryToQuote 已移除` 註釋 + `quote_items 表已廢棄` 向後相容註釋）
- **可能也中**：`src/lib/auth.ts`、`src/middleware.ts` 相關共用檔

### 🔴 Middleware 公開路由清單過寬（v2.0 新增）

**樣態**：middleware 放行整組 prefix（如 `/api/auth/*`）、靠每支 endpoint 內部記得補驗證。前線防禦靠開發者記憶、不是架構。

- **已確認命中**：
  - /login（`src/middleware.ts:67-68` `/api/auth/*`）
  - /finance/payments（`src/middleware.ts` `/api/linkpay` 列公開、webhook 無租戶驗證）
- **可能也中**：其他有 `/api/*` 子家族的路由（/tenants、/employees 等）

### 🔴 Cookie / JWT / rememberMe TTL 三層不一致（v2.0 新增）

**樣態**：session cookie maxAge 沒定義、JWT 1 小時、rememberMe 從 UI 送不到後端、三層時間各講各的、session 行為不明。

- **已確認命中**：/login
- **可能也中**：所有需要 session 的頁（= 幾乎全站）

### 🔴 跨租戶操作缺 workspace 一致性驗證（v2.0 新增）

**樣態**：API token 驗證成功後、直接 `UPDATE ... WHERE id = ?`、沒檢查目標資料的 workspace_id 是否等於當前登入者的 workspace_id。跨租戶污染風險。

- **已確認命中**：
  - /login（`sync-employee/route.ts:24-52`）
  - /finance/payments（`/api/linkpay/webhook` unauthenticated + admin client + 只用 receipt_number 查、沒驗 workspace；`recalculateReceiptStats` 所有 query 無 workspace 過濾靠 RLS）
  - /tours（`writePricingToCore` UPDATE `core-table-adapter.ts:155-173` 缺 workspace 過濾 / `/api/tours/by-code` 用 service_role 無 auth / `accept & reject` 不驗 request.workspace_id == session.workspace_id）
- **可能也中**：所有用 admin client 做 INSERT / UPDATE / DELETE 的 endpoint

### 🔴 FORCE RLS + service_role 衝突（v2.0 新增）

**樣態**：table 開了 FORCE RLS、policy 用 `get_current_user_workspace()` 但沒給 `service_role` 例外。admin client 查會回空、但資料明明存在。2026-04-20 `workspaces` 的登入 bug 即此類。

- **已確認命中**：28 張表（`tour_itinerary_items`、`confirmations`、`files`、`folders`、`visas` 等、已識別但未修、WAVE_2_5 方案 A）
- **可能也中**：所有會讀這些表的頁 — /dashboard、/tours/_、/confirmations/_、/scheduling 等
- **緊急度**：🔴 高。用戶會登入成功、但首頁載入失敗、以為登入壞了

### 🔴 衍生狀態寫成 DB 欄位（v2.0 新增、2026-04-22 /finance/payments）

**樣態**：本該從事件聚合算出的值（已收 / 已付 / 剩餘 / 利潤）、被寫成 DB 欄位、靠 app service 或 trigger 每次重算回寫。真相分兩處、雙寫不同步風險、改 schema 時連動大。

- **已確認命中**：/finance/payments（`orders.payment_status` + `paid_amount` + `remaining_amount` 由 `recalculateReceiptStats` 回寫；`tours.total_revenue` + `profit` 同）
- **可能也中**：/orders（直接讀 orders.payment_status 的位置）、/tours/_（讀 tours.total_revenue）、/customers/_（若有 total_spent）、/supplier/_（若有 total_owed）、/accounting/_
- **對應候選原則 4**

### 🔴 DB 欄位強制 NOT NULL 但代碼不寫（v2.0 新增、2026-04-22 /finance/payments）

**樣態**：DB schema 某欄位設 NOT NULL + FK、但應用層 insert 時完全不帶這個欄位。表面沒炸代表：a) 有 DB trigger / DEFAULT 自動填、b) schema 欄位實際可 NULL（誤讀）、c) 有 migration 沒跑。哪天 trigger / default 動了立刻整個 insert 掛。

- **已確認命中**：/finance/payments（`receipts.payment_method_id` UUID NOT NULL FK、createReceipt 不寫、**待驗**哪個解釋對）
- **可能也中**：所有表有 UUID FK 欄位但代碼直接塞 text / 舊欄位的地方
- **動作**：列進 DB_TRUTH 「可疑清單」定期掃、migration 審查時必看

### 🔴 RLS policy `USING: true`（完全無過濾）（v2.0 新增、v3.0 升級）

**樣態**：table RLS 開了、但 policy 條件是 `true`（任何登入用戶都能讀/寫/刪全部）。看起來有保護、實際沒有。**v3.0 發現**：特別容易漏抓在 DELETE policy — 因為 v2.0 第一輪看 SELECT/UPDATE 正確就下結論。

- **已確認命中**：
  - `employee_permission_overrides`（v2.0 點名、仍未修）
  - **`workspaces_delete`（v3.0 新挖）**：任何登入用戶可 DELETE 任一 workspace row、級聯刪所有 workspace_roles/employees/tours/orders/receipts — SELECT/UPDATE 都對、偏偏 DELETE 弱
- **對比**：`employee_route_overrides` 同概念、policy 正確（自己看自己 + service_role）— **同概念兩表強度不一**
- **驗證盲點**：每張 table 的 4 條 policy（SELECT/INSERT/UPDATE/DELETE）要逐條看、不能看 2 條就判

### 🔴 多 RLS policy 重疊互相打架（v1.3 新增、v1.4 全站盤完）— 18 張 effective 失守

**樣態**：同一表上 `cmd='ALL'` policy 跟 `cmd='SELECT/INSERT/UPDATE/DELETE'` cmd-specific policy 並存。PostgreSQL 多 policy 是 OR 邏輯、寬的會覆蓋嚴的、cmd-specific 守門等於沒寫。

**v1.4 全站盤點完整**（用 SQL `pg_policies WHERE cmd='ALL'` join 同表 cmd-specific）：

🔴 **ALL policy = `true`（任何用戶通吃、13 張）**：

- `bot_groups` / `bot_registry`
- `customer_inquiries`（policyname 寫 "Service role full access" 但 USING/CHECK 都是 true、命名錯置）
- `employee_payroll_config`
- `itinerary_permissions`
- `magic_library`（可能 by design）
- `payroll_allowance_types` / `payroll_deduction_types`
- `tour_bonus_settings` / `tour_expenses`
- `wishlist_template_items` / `wishlist_templates`（命名錯置同 customer_inquiries）
- `workspace_attendance_settings`（重複 ALL policy 一條 true 一條 employee JOIN）
- `workspace_bonus_defaults` / `workspace_notification_settings`

🟡 **ALL policy = `auth.role()='authenticated'`（任意登入者、5 張）**：

- `system_settings`
- `tour_members`
- `tour_request_items` / `tour_request_member_vouchers` / `tour_request_messages`

✅ **ALL policy 寫對的（13 張、不在受害名單）**：

- `attraction_licenses`（is_super_admin）
- `company_asset_folders`（workspace_id）
- `employee_route_overrides`（service_role）
- `fleet_drivers / fleet_schedules / fleet_vehicle_logs / fleet_vehicles`（4 張、workspace_id）
- `members`（workspace_id OR NULL）
- `michelin_restaurants` / `premium_experiences`（workspace_id OR is_super_admin）
- `role_tab_permissions`（service_role、P010 修法正確）

**驗證 SQL**：

```sql
WITH counts AS (SELECT tablename, COUNT(*) FILTER (WHERE cmd='ALL') AS all_count, COUNT(*) FILTER (WHERE cmd!='ALL') AS specific_count FROM pg_policies WHERE schemaname='public' GROUP BY tablename)
SELECT tablename FROM counts WHERE all_count > 0 AND specific_count > 0 ORDER BY tablename;
-- 31 row、其中 18 張需修
```

### 🔴 應用層 + DB 層雙層裸奔（v1.4 新增、CRITICAL CWE-269 提權）

**樣態**：API endpoint 用 cookie session client 想靠 RLS 兜底、但對應表的 RLS 4 條 policy 全 USING:true（如 P018 的 employee_permission_overrides）、應用層自己又 0 守門 — 雙層都沒、任何登入用戶可任意操作。

- **已確認命中**：`/api/employees/[employeeId]/permission-overrides` route.ts（0 auth 檢查）+ employee_permission_overrides 表（4 條 USING:true）= P022 CRITICAL
- **可能也中**：任何「靠 RLS 守 + 表 RLS 沒鎖」的 API、需全站盤 `grep -L "getServerAuth\|requireTenantAdmin" src/app/api/**/route.ts`
- **修法**：API 加 `getServerAuth` + 業務權限檢查 + 目標 workspace 對齊；同時表的 RLS 補完
- **緊急度**：🔴 CRITICAL 上線前必修（提權漏洞）

### 🔴 系統表 RLS 沒開（v3.0 新增）

**樣態**：Supabase 建 schema 時某些系統性 table 預設 RLS 未啟用、任何登入用戶可完全讀取。

- **已確認命中**：
  - `_migrations` — 攻擊者可讀所有 migration SQL、洩漏整套架構 + 歷次漏洞修補路徑
  - `rate_limits` — login 用的限流表、可讀別人 rate limit 狀態推測登入模式
- **可能也中**：其他 `_` 前綴系統表、或 `check_rate_limit` 類 function 寫入的非顯性表
- **修法**：開 RLS + policy 限 service_role（function 若是 SECURITY DEFINER、走 service_role 不受影響）

### 🟡 敏感 API 跨租戶守門無共用 helper、N 支各寫（v3.0 新增）

**樣態**：同一類「查目標資料 workspace_id === caller workspace_id」邏輯在多支 API 各自實作、寫法 variant 5+。某支有 bug 其他支漏抓、或未來新加 API 忘了補。

- **已確認命中**：/login 路由家族 P003 九支（sync-employee / admin-reset-password / reset-employee-password / create-employee-auth / get-employee-data / workspaces/[id] / permissions/features / tours accept / tours reject）
- **可能也中**：未來任何涉及跨租戶操作的新 API
- **修法**：抽共用 middleware `withWorkspaceCheck()` / `requireTenantAdmin()`、強制 API 引用
- **緊急度**：🟡 現有 9 支都 OK、但結構性脆弱

### 🟡 Unauthenticated RLS bootstrap（v2.0 新增）

**樣態**：登入前需要查 workspace code 確認租戶存在（允許 unauthenticated）、但這導致 unauthenticated user 可列舉所有 workspace code（side-channel、非致命但 privacy 瑕疵）。

- **已確認命中**：/login（`workspaces` 表）
- **可能也中**：/public/_、/invite/_ 等不需登入的前置頁

### 🟡 欄位識別符多重定義（v2.0 新增）

**樣態**：同一個登入身份在 DB 存了多個識別欄位（`employee_number` / `email` / `supabase_user_id` / `user_id`）、UI 不清楚收哪個。

- **已確認命中**：/login
- **可能也中**：/hr/\*（新增員工 / 編輯員工）

### 🟡 常數 / 映射表多處定義（v2.0 新增、2026-04-22 /finance/payments）

**樣態**：同一組列舉（付款方式、訂單狀態、付款狀態）在代碼中多處獨立定義、其中某處沒跟上新增項、加新選項時漏改一處必出 bug。

- **已確認命中**：/finance/payments（付款方式 4 處：`usePaymentData.ts:114` 硬 coding array、`finance/constants/labels.ts` PAYMENT_METHOD_MAP、`lib/constants/status-maps.ts:164` PAYMENT_METHOD_MAP【缺 linkpay】、`useReceiptMutations`）
- **可能也中**：訂單狀態、確認單狀態、收款類型、任何 status enum

### 🟡 DB trigger 黑盒（v2.0 新增、2026-04-22 /finance/payments）

**樣態**：DB 上有 trigger 但 DB_TRUTH 沒列 function body、不知道它改了什麼、UI 層完全看不到。跟「已停用模組」的代碼殘留相關時特別危險。

- **已確認命中**：
  - /finance/payments（`trigger_auto_post_receipt` AFTER UPDATE on receipts、疑似會計自動過帳、但 `usePaymentData:37` 註釋「會計模組已停用」）
  - /tours（tours 表 7 個 trigger：cascade_rename / create_folders / sync_country_code / auto_set_workspace_id / create_conversations / update_cache / updated_at、UI 只看到結果）
- **可能也中**：所有 Supabase trigger、尤其是 AFTER INSERT/UPDATE 的
- **動作**：寫個 trigger 清單 + function body 摘要檔、`generate-db-truth.mjs` 未來擴充列 function body

### 🔴 Delete-then-insert 破下游聯繫（v2.0 新增、2026-04-22 /tours）

**樣態**：同步邏輯用 DELETE 所有舊記錄 + INSERT 新記錄、靠內存 carryOver 試著保留關聯值、但一旦業務鍵變動（順序調整、AI 重排）下游（報價 / 需求 / 廠商回覆）的 FK 全斷成孤兒。

- **已確認命中**：/tours（`useTourItineraryItems.ts:232-580` `syncToCore()` + `useSyncItineraryToCore:407` 直接 `update status: outdated` 沒檢查需求單是否已成交）
- **可能也中**：任何「同步」「rebuild」類邏輯（/customized-tours 行程同步、/confirmations 需求重建、/itineraries daily 同步）
- **緊急度**：🔴 高。AI 重排行程 / 多地接協作上線前必改

### 🔴 單表擴張超寬（v2.0 新增、2026-04-22 /tours）

**樣態**：SSOT 設計走「一 row 走到底」、但單表欄位隨需求不斷加、接近 100 欄時 INSERT/UPDATE 效能 + 權限粒度 + 可讀性同時崩。

- **已確認命中**：/tours（`tour_itinerary_items` 已 81 欄、跨 7 業務維度）
- **可能也中**：任何「狀態機共用同表」的設計（orders / confirmations / payment_requests）
- **緊急度**：🟡 中。接近 95 欄 hard limit 時強制拆表

### 🟡 UI/API interface 漏 DB 實際欄位（v2.0 新增、2026-04-22 /tours）

**樣態**：DB 實際有 N 欄、UI 的 interface / form type 只定義 N-10 欄。UI 送不出漏的欄位、但 trigger / 其他模組可能在偷偷寫。改 schema 時難察覺下游影響。

- **已確認命中**：/tours（`NewTourData` 漏 `closing_status` / `locked_quote_id` / `locked_itinerary_id` / `tier_pricings` / `custom_cost_fields` / `selling_prices` / `participant_counts` / `archive_reason` / `modification_reason` / `country_code` 等 10+ 欄）
- **可能也中**：任何 Supabase auto-generated types 沒同步的表
- **動作**：定期 regen `database.types.ts`、對照 UI Form 是否有漏

### 🟡 多 UI 主題並存無文檔（v2.0 新增、2026-04-22 /tours）

**樣態**：同一個區塊有 N 套 UI 元件並存（主題 / 風格 / 版型）、無文檔說明哪個是預設、哪個該淘汰、切換規則。改邏輯要改 N 份、測試 N 倍工。

- **已確認命中**：/tours（`sections/` 下 Hero 6 款 / Features / Hotels / Itinerary / Leader / Pricing / Flight 各 4 款主題：default / Luxury / Collage / Dreamscape / Gemini / Nature / Art）
- **可能也中**：/customized-tours 展示行程、任何對客戶端輸出的頁（報價單列印、團確單）
- **動作**：統一元件結構、用 `theme` prop 控樣式

---

## 如何讀單頁網站地圖

每份 `<route>.md` 結構：

1. 路由資訊 + 業務目的（William 口述）
2. 對照的跨路由設計原則
3. 代碼現況（中立描述）
4. 真正該警惕的問題（重點、已分層）
5. 其他觀察（SSOT / RLS / 欄位 / 未來影響）
6. 建議行動（只列、不動手、交給 council）
7. 下一個相關路由建議

---

## 跟其他地圖的關係

| 地圖                              | 位置                                          | 用途                                                |
| --------------------------------- | --------------------------------------------- | --------------------------------------------------- |
| **本地圖**（網站地圖 + 累積脈絡） | `docs/SITEMAP/`                               | **每頁的最新真相 + 跨路由原則**（單一檔、覆蓋最新） |
| 路由速覽                          | `docs/SITEMAP_CURRENT_2026-04-21/`            | 全站 127 頁的一行摘要（sitemap-scan 產出）          |
| 業務地圖                          | `docs/BUSINESS_MAP.md`                        | 業務邏輯、規則、流程                                |
| 程式地圖                          | `docs/CODE_MAP.md`                            | 程式結構、檔案位置                                  |
| 路由驗證歷史                      | `docs/ROUTE_CONSISTENCY_REPORT_<date>/`       | 每次驗證當下的原始 agent 報告、時間序               |
| 核心價值                          | `/Users/williamchien/Projects/VENTURO_WHY.md` | 特洛伊意義、核心為什麼                              |

---

## 下次驗證優先順序建議

從業務流骨幹 → 金流交界 → 主檔類 → 對外觸點 → 基建雜項的順序。

**下一頁候選**（2026-04-22 更新）：

1. `/orders` — /tours 的下層、一團多訂單的訂單側；直接驗候選原則 6（聚合 vs 明細）+ `orders.payment_status` 冗餘的直接受害者
2. `/customized-tours/*` — William 的「開團提案 / 行程 / 報價」階段、proposal 型 tour 的另一入口；驗候選原則 5（一 row 走到底）是否擴張到這條線
3. `/dashboard` — /login 驗證發現 28 張 FORCE RLS 表會擋 widget 載入、/tours 本體雖乾淨但 widget 讀的相關表（confirmations 等）會爆
4. `/hr/roles` — 職務權限本體頁、要在 /tours 動職務分層前先搞定它
5. `/finance/*` + `/accounting/*` — /tours 訂單頁快速收付打進來的財務本尊、驗候選原則 8（快速入口 ≠ 獨立資料）
6. `/accounting/*` — 驗 `trigger_auto_post_receipt` 是不是在這邊做工、有沒有 orphan 對帳紀錄

由 William 指。
