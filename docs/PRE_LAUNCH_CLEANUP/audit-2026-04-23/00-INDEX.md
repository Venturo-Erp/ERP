# Venturo ERP 總體體檢 · INDEX

**掃描日期**：2026-04-23
**掃描範圍**：56 個 page.tsx + 95 個 API route + 506 個 migration + ~32 萬行 TS/TSX
**方法**：6 場 Explore agent 接力、不並行、純報告不動手
**6 份模組報告**：`01-accounting.md` / `02-finance.md` / `03-database.md` / `04-business-core.md` / `05-admin.md` / `06-peripherals.md`

---

## TL;DR（一頁摘要）

1. **ERP 主體健康**：RLS 正確、audit FK 統一、Wave 0-6 已處理掉大量 critical 問題。
2. **發現 18 個 BACKLOG 沒列到的新問題**：其中 **1 個會讓「建新租戶」直接炸**、**3 個 silent fail**、**其他是架構雷**。
3. **跨模組有 6 種重複 pattern** 值得抽 helper、上線後做、省未來維護成本。

**給老闆的一句話**：能上、但這張清單上 **6 個紅色項目** 上線前一定要清掉、不然新客戶進來就踩雷。

---

## 🔥 上線前必處理（6 個紅色項）

按「會不會當場炸」排序：

### ① Tenants Create API 寫死已砍的 `employees.permissions` 欄位
**影響**：**新建租戶直接失敗 → 新客戶無法開通**
**位置**：`05-admin.md` §1、`src/app/api/tenants/create/route.ts` L235-248
**原因**：DB 2026-04-23 已 DROP 該欄位、但 API 還在 `INSERT employees (permissions, ...)` → FK/column error
**修法**：S、改 API 不再寫 permissions、改走 role_tab_permissions seed

### ② `database.types.ts` 仍有舊欄位（`is_active`、`permissions`）
**影響**：TypeScript 說有 / SQL 說沒有 → runtime 選擇性地 silent fail
**位置**：`05-admin.md` §2
**修法**：S、`npm run db:types` regen

### ③ Accounting `checks` 頁面整頁是 stub
**影響**：使用者能點「標記已兌現」/「作廢」按鈕、但所有 DB 操作都被註解 → 按了沒反應、以為有存、其實沒存
**位置**：`01-accounting.md` §2、`src/app/(main)/accounting/checks/page.tsx`
**修法**：M、要麼刪整頁、要麼完整實作（含 schema + API + dialog）。**不能留現況騙使用者**。

### ④ Todos `column_id` 欄位 code 在用 / DB 沒定義
**影響**：看板拖拉欄位會 silent fail、使用者拖完重新整理就消失
**位置**：`06-peripherals.md` §3
**修法**：S、加 migration 加欄位、或拔掉看板 UI

### ⑤ Accounting `chart_of_accounts.is_favorite` 幽靈欄位
**影響**：使用者「標為常用」按了沒持久化
**位置**：`01-accounting.md` §1、`src/app/(main)/accounting/accounts/page.tsx` L131-135
**修法**：S、加 migration 或拔 UI（二選一）

### ⑥ Accounting auto-create API 違反 CLAUDE.md 紅線（singleton Supabase client）
**影響**：token 過期 / stale state 時悄悄失敗、自動產生傳票會 flaky
**位置**：`01-accounting.md` §4、`src/app/api/accounting/vouchers/auto-create/route.ts` L6-16
**修法**：S、改 per-request client（CLAUDE.md 明確禁止 singleton）

---

## ⚠️ 架構雷（上線後清、但不清會越來越痛）

### 重複組件（同事改 A 忘記改 B、出 bug）
- **CustomerMatchDialog** 在 `orders` 和 `visas` 各 1 份、各 142 行（04 §1）
- **ContractDialog** 在 `contracts/components` 和 `contracts/components/contract-dialog/` 各 1 份（04 §1）
- **CRUD Dialog** 在 database 5 個模組重複 90%（03 §2）

### 繞過 API 層直查 supabase（違反 INV-P02）
- **transportation-rates** 頁面直查（03 §3）
- **Settings > Company** 頁直查、無 RLS 層（05 §5）
- **HR Settings 打卡設定** 無 API 層（05 §10）

### Schema / audit 不完整
- **tour-leaders 表缺 `workspace_id` / `created_by` / `updated_by`**（03 §2）→ 多租戶不完整、追不到誰建的
- **Module-tabs 有定義但路由沒實作 = 幽靈 permission**（05 §3）
- **company-assets 頁面 menu 列出但整頁不存在**（03 §1）→ 404

### 型別安全漏洞（動錢程式碼尤其危險）
- **46 處 `as unknown as` / `as never` / `as any` 在業務邏輯**（04 §2）
  - 熱點：`tour-display-itinerary-tab.tsx` 5 處、`tour-costs.tsx` 5 處、`usePackageItinerary.ts` 5 處
- **`AddRequestDialog.tsx` L823+ 金額計算有 unsafe cast**（02 §1）
- **entity hook vs service `transferred_pair_id` 欄位不同步**（02 §4）

### 半成品警告（老闆要決定上線要不要暴露）
- **ai-bot**：5 個 tab、**只有 LINE 一個能用**、其他 4 個（Meta / AI / 知識庫等）是空殼（06 §4）
  - 建議：上線前用 feature flag 隱藏 4 個未完成 tab、或整個模組先不開放
- **calendar + todos**：架構對、但跟 tours / orders / finance **零交叉引用**（06 §1）
  - 開團不會自動產 calendar event、訂單不會自動變待辦
  - 問題：上線要不要接？接的話是誰的 scope？

### 狀態值混用
- **收款用字串 `'0'/'1'`、請款用英文 `'pending'/'confirmed'`**（02 §3）
  - 同一個財務領域、兩套 status 寫法、邏輯 bug 溫床

### 守門缺 workspace_id 明確檢查
- **`/api/accounting-subjects`、`/api/expense-categories`** 只依賴 RLS、無 code 層 assert（02 §2）
  - RLS 曾出過問題、建議加 code 層雙重保險

---

## 🔁 跨模組重複 pattern（抽 helper 的機會）

這 6 個 pattern **在不同模組都出現**、值得集中處理一次、省未來 N 次重改：

| # | Pattern | 在哪些模組看到 | 建議 helper 位置 |
|---|---|---|---|
| 1 | 「取最後一個編號 + 1」生 voucher_no / tour_code / receipt_number | accounting (3 處)、finance、tours | `src/lib/erp/number-generator.ts` |
| 2 | 報表/統計 `supabase.from().select()` 同樣 query 3 處 copy-paste | accounting (3 報表)、finance reports | `src/hooks/<domain>/use<Entity>ByDateRange.ts` |
| 3 | CRUD Dialog + list + create/edit/delete hook 幾乎一樣 | database (5 處)、tours、orders、customers | `src/hooks/createEntityCrud()` factory |
| 4 | Status machine 分散各處（tour / order / quote / payment / request） | business-core、finance | `src/lib/state-machines/` |
| 5 | Admin guard 檢查在每頁每 API 重抄（isAdmin / checkIsAdmin / hasPermission 3 種並存） | admin、finance、accounting、tours | `src/lib/auth/withAdminGuard.ts` middleware |
| 6 | Floating point 容差 `0.01` 硬編 3 處 | accounting (3 處)、finance 可能也有 | `src/lib/erp/constants.ts` `DECIMAL_TOLERANCE` |

另外兩個「重複 schema 邏輯」值得 Post-Launch 規劃：
- **`tour_members` vs `order_members`** 已列 Post-Launch 合併、不重複
- **`customers` vs `traveler_profiles`** 有重複欄位（phone / email / avatar_url）、SSOT 待確認

---

## 🟢 健康面向（做得好的、別改壞）

Wave 0-6 已經修掉很多問題、目前這些是**健康的護城河**、動 code 時別破壞：

| 面向 | 證據 |
|---|---|
| **RLS 策略** | 所有會計 / 財務 / 業務 / 管理表都 enable RLS + workspace_id filter、無 FORCE RLS 違規（01 §1、02 §1、05） |
| **Audit FK 統一** | `created_by` / `updated_by` 統一指 `employees(id)`、Wave 0 全掃過（01 §2、02、04 §2） |
| **API 授權** | 75 個業務 API 都檢查 workspace_id、多租戶隔離完整（04 §2） |
| **borrow/credit 雙重平衡檢查** | 傳票前後端都驗 debit = credit、會計安全（01 §4） |
| **期末結轉邏輯** | 正確區分月結/季結 vs 年結、符合會計規則（01 §5） |
| **Entity Hook 統一** | 多數 CRUD 走 entity hook、不繞過 API（03 §健康） |
| **Role-Tab-Permissions SSOT** | 權限檢查來源單一、不是 employees.permissions 陣列（05 §健康） |
| **Login 無技術債** | middleware 穩、is_active guard、labels 集中（06 §健康） |
| **Dashboard widget 系統** | 權限清晰、付費 widget 跟租戶管理頁同步（06 §健康） |

---

## 📊 各模組健康度總表

| 模組 | 紅 | 黃 | 綠 | 一句話 |
|---|---|---|---|---|
| 1. Accounting 會計 | 3 | 4 | 6 | 主體健康、但 `is_favorite` 幽靈欄位 + checks 整頁 stub + singleton client 要先修 |
| 2. Finance 財務 | 4 | 6 | 7 | 財務邏輯穩、但 46 處 `as unknown as` + 狀態混用上線前要清 |
| 3. Database 基礎資料 | 3 | 5 | 6 | 骨架乾淨、但 company-assets 404、tour-leaders 缺 audit、transportation-rates 直查 DB |
| 4. 業務核心（tours+orders+customers）| 2 | 5 | 5 | **無上線阻擋**、但 2 個組件重複 + 46 處 `as unknown as` 分散各頁 |
| 5. 管理區（hr+settings+tenants）| 5 | 5 | 5 | **最危險**、Tenants Create 會炸、module-tabs 幽靈 permission |
| 6. 週邊工具 | 4 | 3 | 9 | login/dashboard/channel 漂亮、但 ai-bot 80% 空殼、calendar/todos 孤立、todos column_id 幽靈 |
| **總計** | **21** | **28** | **38** | |

（註：紅/黃/綠數字是各報告本身的歸類、不是絕對指標、供參考）

---

## 🗺️ 建議執行順序

### 今晚 / 明天白天可自主處理的（S = <2 小時）
1. **#2 regen database.types.ts**（`npm run db:types`）
2. **#5 is_favorite** 選「加欄位」或「拔 UI」
3. **#6 auto-create singleton client** 改 per-request
4. **#4 todos column_id** 選「加欄位」或「拔看板」

### 需要你拍板 scope 的（M）
5. **#1 Tenants Create API** — 要改 seed 流程、影響新客戶註冊流程、需你看過改法
6. **#3 checks 頁面** — 是要完整做、還是整頁刪？會計流程決策
7. **ai-bot** — 上線要不要暴露 UI？要的話隱藏哪些 tab？
8. **calendar / todos** — 上線要不要跟 tours / orders 接？

### Post-Launch 架構清單（L、進 BACKLOG 新增項）
- 6 個跨模組 helper（number-generator / state-machines / withAdminGuard / DECIMAL_TOLERANCE / CRUD factory / query hooks）
- `customers` vs `traveler_profiles` SSOT 決策
- 46 處 `as unknown as` 業務邏輯分批清
- `transportation-rates` / `Settings > Company` / `HR Settings` 補 API 層
- `module-tabs` 幽靈 permission 清
- `tour-leaders` 補 audit 欄位
- 重複組件合併（CustomerMatchDialog / ContractDialog / 5 個 CRUD Dialog）

---

## 📎 報告索引

| # | 模組 | 檔案 | 行數 |
|---|---|---|---|
| 1 | Accounting 會計 | [`01-accounting.md`](./01-accounting.md) | 437 |
| 2 | Finance 財務 | [`02-finance.md`](./02-finance.md) | 192 |
| 3 | Database 基礎資料 | [`03-database.md`](./03-database.md) | 291 |
| 4 | 業務核心 | [`04-business-core.md`](./04-business-core.md) | 270 |
| 5 | 管理區 | [`05-admin.md`](./05-admin.md) | 229 |
| 6 | 週邊工具 | [`06-peripherals.md`](./06-peripherals.md) | 492 |
| - | **總計** | | **1911 行報告** |

---

## 方法論備註（給未來的我看）

- 6 場 agent **接力不並行**（single-core 原則、William 要求）
- 每場 agent 讀 BACKLOG 已列項目、**不重複報**（只重報 BACKLOG 漏的）
- 所有發現都有檔案路徑 + 行號 + 證據程式碼
- **全程不動 code、不動 schema、不碰真實租戶資料**
- 報告用業務語言給老闆、技術細節留在「證據」段落

下次跑總體體檢：
1. 直接改一份新的 agent brief、BACKLOG 基準更新
2. 同樣 6 模組切分、或按新增的模組重切
3. 建議頻率：每個大 cleanup wave 結束後跑一次、抓漏
