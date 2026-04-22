# /finance/payments — 網站地圖

**Route**：`/finance/payments`（收款管理）
**Code paths**：
- UI：`src/app/(main)/finance/payments/page.tsx` + `hooks/usePaymentData.ts` + `components/`
- Dialog：`src/features/finance/payments/components/`（AddReceiptDialog、BatchReceiptDialog 等、動態 import）
- Service：`src/features/finance/payments/services/receipt-core.service.ts`（重算訂單 + 團財務）
- API：`src/app/api/linkpay/route.ts` + `src/app/api/linkpay/webhook/route.ts`
- Middleware：`src/middleware.ts`（`/api/linkpay` 列為公開清單）
- Data layer：`@/data` 的 useReceipts / createReceipt / updateReceipt / deleteReceipt
- 通知：`@/lib/utils/bot-notification`（異常金額發機器人）
- 工具：`@/lib/utils/receipt-number-generator`（單號 `{團號}-R{nn}`）

**Last updated**：2026-04-22（v2.0 首次驗證）
**Raw reports**：`docs/ROUTE_CONSISTENCY_REPORT_2026-04-22/finance_payments/raw/A-F.md`

---

## 業務目的（William 口述 2026-04-22）

- **使用者情境**：OP / 業務建收款單（5 種方式：現金 / 匯款 / 刷卡 / 支票 / LinkPay）→ 系統自動把這筆餵到旅遊團財務 → 會計按「核准 / 異常」確認實收金額
- **權限設計**：**應該吃 /hr role 的「公司收款」權限**、登入時就驗過、進這頁看有沒有這個 key；進來後「建單 / 核准 / 異常 / 改 / 刪」要再分細權限（不是一個通用權限、是各動作分開）
- **訂單付款狀態**：William 明說**不該存**、只要看**這張收款單自己的狀態**（待確認 / 已確認）就好。「未付 / 部分付 / 全付」不需要是欄位
- **旅遊團認列**：收款建好、旅遊團那邊要能看到「團的已收金額 / 已收明細」— 這是目前連動的目的

---

## 對照的跨路由設計原則

- **原則 1**：權限長在人身上、不是頭銜上 → **違反**（整頁用 isAdmin 擋門、4 個核心動作沒查細分權限）
- **原則 2**：職務是身份卡、全系統統一 → **違反**（代碼根本沒去查 workspace_roles 的細分權限 key）
- **原則 3**：租戶一致性每層都守 → **違反**（LinkPay webhook unauthenticated + admin client 無 workspace 驗證；service 所有 query 靠 RLS 無應用層驗）
- **原則 4**（2026-04-22 拍板升正式）：**狀態是真相、數字從狀態算出來** → **違反且雙倍違反**：
    - `orders.payment_status` / `paid_amount` / `remaining_amount` 是冗餘欄位、違反原則
    - `tours.total_revenue` 是冗餘欄位、**而且只算 status='1'**、「待確認金額」完全沒地方顯示、違反「**按狀態分開給**」的補充條款
    - William 業務語意明示：大主管在旅遊團要看**待確認金額 + 已確認金額兩個數字**（區分「卡業務」vs「卡會計」）— 目前代碼做不到

---

## 代碼現況（濃縮）

### 主流程
1. **建單**：OP 選訂單 → 選付款方式 → 輸入金額 → `createReceipt` 寫進 `receipts` 表、`status = '0'`（待確認）
2. **LinkPay 分支**：若選 LinkPay、呼叫 `/api/linkpay` 產付款連結、回寫 `receipts.link` + `linkpay_order_number`
3. **LinkPay 付款成功**：台新 webhook 打 `/api/linkpay/webhook`（unauthenticated）→ 寫回 `receipts.actual_amount`（扣 2% 手續費）、但 `status` 不自動改為 '1'、**還是等會計按核准**
4. **核准 / 異常**：會計按「核准」→ `status = '1'` + actual_amount 用收款單面額；按「異常」→ `status = '1'` + 備註金額落差 + 發機器人通知給建單者
5. **自動連動**：建單 / 核准 / 刪除 後、呼叫 `recalculateReceiptStats(orderId, tourId)`：
    - **回寫 `orders.payment_status` + `paid_amount` + `remaining_amount`**
    - **回寫 `tours.total_revenue` + `profit`**

### 權限控制
- **整頁**：`page.tsx:211` 一句 `if (!isAdmin) return <UnauthorizedPage />`、**和 /login / /hr 同一個地雷**
- **建單 / 核准 / 異常 / 編輯 / 刪除 按鈕**：進得來就能按、無細分權限查
- **刪除有 soft guard**：已確認（status '1'）的單不能刪（usePaymentData:246-250）

### DB table 關係
- 主表：`receipts`（42 欄、其中 5 欄是 UI / 代碼完全沒用的孤兒）
- 連動：`orders` + `tours`（被 service 回寫）+ `linkpay_logs`（LinkPay 記錄）
- FK：審計欄位（`created_by` / `updated_by`）正確指向 `employees(id)`（符合 CLAUDE.md 紅線 ✓）

---

## 真正該警惕的問題（依嚴重度）

### 🔴 1. 權限模型重複中 /login + /hr 同樣地雷

- **你說的**：權限吃 hr role 的「公司收款」、進頁看、進來後各動作再分細權限
- **代碼實際**：整頁 `if (!isAdmin)` 一刀擋、會計不是 admin **連頁都進不來**、更別提按核准
- **後果**：
    - OP / 業務 / 會計三個角色、如果他們在 /hr 被設為非 admin、打開這頁就是 **UnauthorizedPage**、整個「建單 → 核准」流程卡死
    - 你在 /hr/roles 替「會計」設「公司收款」權限 → 代碼完全不看這個 key
- **跟其他頁關聯**：`useAuthStore.checkPermission` 本身就有 `if (isAdmin) return true` 短路（/login 驗證已發現）、就算 page.tsx 改成 `hasPermission`、只要 admin 短路還在、isAdmin 仍是萬能通行證
- **修的順序**：先改 `useAuthStore` 的短路、再改 `page.tsx:211`、再補 4 個動作的權限 key（`finance.payments.view` / `create` / `confirm` / `approve_abnormal` / `delete`）

---

### 🔴 2. 違反原則 4：聚合冗餘欄位雙寫 + 待確認金額沒地方顯示

- **原則 4（2026-04-22 拍板）**：狀態是真相、數字從狀態算、不存冗餘欄位、按狀態分開給
- **代碼違反三點**：
    1. `orders.payment_status` / `paid_amount` / `remaining_amount` 冗餘、`recalculateReceiptStats` 每次收款變動都回寫（`receipt-core.service.ts:73-81`）
    2. `tours.total_revenue` / `profit` 冗餘、同一段 service 回寫（L150-157）
    3. `recalculateTourFinancials` **只算 status='1'**（已確認）、**待確認金額完全沒地方拿**
- **業務後果**（William 明示）：
    - 大主管在 /tours 總覽要看「待確認金額」+「已確認金額」兩個數字 → 目前只有後者
    - 無法分辨「卡業務（OP 沒 key）」vs「卡會計（會計沒核銷）」
    - 讀冗餘欄位沒先重算 → 過期值（同步地雷）
- **修法方向（原則 4 規範版）**：
    1. 建聚合 function：`getTourPaymentSummary(tour_id) → { pending_total, confirmed_total, tour_cost, profit }`
    2. 移除 `orders.payment_status` / `paid_amount` / `remaining_amount` / `tours.total_revenue` / `profit` 欄位
    3. 刪除 `recalculateReceiptStats` 整段 service（不需要了）
    4. `usePaymentData:40-44` 篩「可收款訂單」改走聚合 function 或 view
    5. /tours 頁顯示來源從欄位 → function call
    6. 效能若需要、做 materialized view（不是第一選擇）
- **William 授權範圍**：只要「這裡邏輯對 + 開放 API 給 /tours」、顯示端由 /tours 那邊自己驗

---

### 🔴 3. LinkPay webhook 可能跨租戶污染

- **檔案**：`src/app/api/linkpay/webhook/route.ts` + `middleware.ts`（`/api/linkpay` 列公開）
- **現象**：
    - webhook 是 unauthenticated（台新打進來）
    - 用 admin client 查 `receipts`、用 `receipt_number` 當索引
    - **沒有檢查** receipt 的 workspace_id === linkpay_log 的 workspace_id
- **風險**：攻擊者知道任一個 workspace 的收款單號、偽造台新 webhook 打進來、修別人的 actual_amount
- **跟 /login sync-employee 是同型風險**（跨租戶操作缺 workspace 驗證）
- **修法方向**：webhook 收到後、先 `receipt.workspace_id === linkpay_log.workspace_id` 檢查、不符拒絕

---

### 🔴 4. 一個 DB 欄位 `payment_method_id` 卡著（盤點發現、待人工再驗）

- **DB 真相**（Agent F 盤點）：`receipts.payment_method_id` 是 UUID + **NOT NULL + FK 指 payment_methods(id)**
- **代碼實際**：`usePaymentData.ts:103-138` 建收款單時**完全沒寫這個欄位**
- **應該要炸但沒炸**、表示：
    - a) DB 有 trigger 自動填（可能）
    - b) 欄位實際有 DEFAULT（F 沒看到）
    - c) 欄位其實可 NULL（F 看錯）
- **緊急度**：⚠️ 先確認哪個是對的、不是立刻修
- **如果真的沒 trigger / DEFAULT**：任何 insert receipts 應該會 FK violation — 但目前頁面能跑、推測 a 或 b 成立
- **為什麼列 🔴**：如果哪天 DB migration 動到這個 trigger、所有收款立刻炸

---

### 🟡 5. `workspace_id: user.workspace_id || ''` 空字串風險

- **檔案**：`usePaymentData.ts:105`
- **現象**：如果 `user.workspace_id` 是 falsy（未登入完成、store 沒初始化）、會寫空字串 `''` 進 DB
- **RLS 救場**：receipts 的 INSERT policy 用 `workspace_id = get_current_user_workspace()`、空字串過不了 policy、實務上會被擋
- **根因**：違反 CLAUDE.md 紅線「不准 `|| ''`、應該 `|| undefined`」— 會讓「登入沒跑完就點建單」跑出奇怪錯誤、不是看起來那麼戲劇化但不該留
- **同類**：趁這次把 `user.id || ''` / `created_by: user.id` 沒檢查 undefined 的地方一起掃

---

### 🟡 6. `trigger_auto_post_receipt` 是黑盒

- **DB 真相**（Agent F）：`receipts` 表有 AFTER UPDATE trigger `trigger_auto_post_receipt`、但 DB_TRUTH 沒列 function body
- **推測**：可能是「收款確認後自動開會計傳票」— 跟 `usePaymentData:37` 註釋「會計模組已停用」可能是一對殘影
- **風險**：
    - 會計模組「代碼面」停用、但 DB trigger 還活著、可能每次核准收款都在寫 `accounting_entries` 類的表、UI 看不到
    - 如果「會計模組已停用」是真的、這個 trigger 應該也該停
- **動作**：讀 trigger body、判斷是否要 drop / 是否跟未來重啟會計的設計衝突

---

### 🟡 7. 孤兒欄位 5 個 + 重複欄位 若干

- **完全沒用**：`confirmed_at`、`confirmed_by`、`bank_name`、`account_last_digits`、`transaction_id`
- **概念重複**：
    - `amount` / `receipt_amount` / `total_amount` 三個、代碼用前兩個、`total_amount` 沒人用
    - `payment_method`（文字）和 `receipt_type`（數字）雙寫、硬 coding 映射 `['transfer','cash','card','check','linkpay'][receipt_type]`
    - `order_number` / `tour_name` / `customer_name` 三個「備份名稱」、冗餘於 `order_id` / `tour_id` / `customer_id`（JOIN 即可、但似乎是怕 JOIN 慢而故意冗餘）
- **處理**：先別刪、先標、等 council 判要不要收（動 schema 前問根本問題）

---

### 🟡 8. Tours 表可能在 28 張 FORCE RLS 表內（沿自 /login 地雷）

- `/login` 驗證已列 `tours` 為 28 張 FORCE RLS 未修表之一
- 本頁 `recalculateTourFinancials` 會 UPDATE tours.total_revenue / profit
- 如果 tours 真的還是 FORCE RLS、這段 update 走的是前端 session、**一般有登入就能過**
- **但**、未來如果有 service_role 呼叫（例如 cron job 重算團財務）、會被 FORCE RLS 擋

---

### 🟡 9. `payment_method` / `receipt_type` 兩套並存 + 映射四處

- **四處定義**：`usePaymentData.ts:114` / `finance/constants/labels.ts` PAYMENT_METHOD_MAP / `lib/constants/status-maps.ts` / `useReceiptMutations`
- 有一處 `status-maps.ts` **少了 linkpay**（只 4 種）— 加新付款方式時一定會漏改某一處
- **修法方向**：全站只一個 source（建議移到 `@/lib/constants/payment-methods.ts`）、或直接改走 DB 驅動的 `payment_methods` 表（跟 `payment_method_id` 一起解）

---

## 其他觀察

### SSOT 一致性

- ✅ `Receipt` 型別在 `src/types/receipt.types.ts`、stores / data 層都重新導出同一源
- ❌ 付款方式映射四處並存（見 🟡 9）
- ❌ orders.payment_status 雙寫（見 🔴 2）

### 租戶隔離（RLS）

- ✅ `receipts` 四個 policy（SELECT/INSERT/UPDATE/DELETE）都有 `workspace_id = get_current_user_workspace()` 過濾
- ⚠️ `recalculateReceiptStats` service 層所有 query **都沒加 `.eq('workspace_id', ...)`**、全靠前端 RLS bouncer
    - 如果哪天改用 admin client、或加 service_role 用、立刻全洩漏
- ⚠️ LinkPay webhook 跨租戶（見 🔴 3）

### 欄位一致性

| 業務概念 | UI | API | DB | 一致？ |
|---|---|---|---|---|
| 收款金額 | 收款金額 | `receipt_amount` + `amount`（雙寫） | `receipt_amount` + `amount` + `total_amount` | 🟡 三個欄位 |
| 實收金額 | 實收金額 | `actual_amount` | `actual_amount` | ✅ |
| 付款方式 | 5 種 tag | `payment_method` (文字) + `receipt_type` (數字) | 同 + `payment_method_id` (UUID、沒寫) | 🔴 三套並存 |
| 狀態 | 待確認 / 已確認 | `status: '0' / '1'` | `status` text | ✅ 但有孤兒 `confirmed_at` / `confirmed_by` 沒用 |

### 未來影響

- 權限大修 → 本頁 1 處整頁擋 + 4 個動作要細分、跟 /login + /hr 一起改
- orders.payment_status 移除 → usePaymentData:42 過濾邏輯改走聚合、`availableOrders` 改跨表 JOIN 或 view
- SaaS 多租戶擴張（飯店 / 餐廳）→ 付款方式不該硬 coding 5 種、走 DB 驅動
- 發票 / 收據 PDF、對帳 / 匯差、部分退款、稽核 log：**目前全無**、旅遊業法規上遲早要補

---

## 建議行動（只列、不動手、交 council 討論）

| 項目 | 緊急度 | 出處 |
|---|---|---|
| 改 `useAuthStore.checkPermission` 把 `if (isAdmin) return true` 短路拆掉 | 🔴 高 | 沿 /login 議題、但一起影響這頁 |
| `page.tsx:211` 改查 hr role 的「公司收款」權限 key、不用 isAdmin | 🔴 高 | 本次新增 |
| 建單 / 核准 / 異常 / 刪除 四動作分別補 `hasPermission(user, action)` | 🔴 高 | 本次新增 |
| 驗 DB：`payment_method_id` 真的是 NOT NULL 嗎？有 trigger / DEFAULT 嗎？ | 🔴 高（先查、再決定動不動） | Agent F 盤點 |
| LinkPay webhook 加 workspace 一致性檢查 | 🔴 高 | 本次新增 |
| 讀 `trigger_auto_post_receipt` function body、判斷要不要 drop | 🟡 中 | Agent F 盤點 |
| 付款方式統一（四處 map → 一處；或改 DB 驅動的 payment_methods 表） | 🟡 中 | 本次新增 |
| 孤兒欄位 5 個歸檔（先不刪、council 判） | 🟡 中 | Agent F 盤點 |
| `workspace_id: user.workspace_id \|\| ''` → `\|\| undefined` | 🟡 中 | CLAUDE.md 紅線對齊 |
| **建聚合 function `getTourPaymentSummary(tour_id) → { pending_total, confirmed_total }`** — 給 /tours 用、待確認 / 已確認分開回 | 🔴 高 | 原則 4 拍板、William 授權 |
| **移除冗餘欄位** `orders.payment_status` / `paid_amount` / `remaining_amount` + `tours.total_revenue` / `profit` | 🔴 高 | 原則 4 拍板 |
| **刪除 `recalculateReceiptStats` 整段 service**（冗餘計算、原則 4 後不需要） | 🔴 高 | 原則 4 拍板 |
| `usePaymentData:40-44` 「可收款訂單」篩選改走 function 或 view | 🔴 高 | 原則 4 連動修正 |
| 補：發票 / 收據 PDF、對帳 / 匯差、部分退款、稽核 log | 🟡 中（上線後短期） | Agent E 未來影響 |

---

## 下一個相關路由建議

1. **`/tours/[id]`** — 旅遊團財務頁、直接看 `tours.total_revenue` / `profit` 回來怎麼用；驗「聚合即時算」原則能不能適用
2. **`/orders`** — `orders.payment_status` 冗餘的直接受害者；驗這頁會不會讀過期值
3. **`/accounting/*`** — 驗 `trigger_auto_post_receipt` 是不是在做這邊的工作、有沒有 orphan 對帳紀錄
4. **`/finance/requests`** 或 **`/finance/treasury`** — 本路由群組其他頁、也可能有 admin 大鎖 + 聚合冗餘
