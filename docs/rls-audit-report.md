# RLS 安全審計報告

> 2026-04-05 | 狀態：已完成

## 統計

| 等級        | 數量    | 說明                                                         |
| ----------- | ------- | ------------------------------------------------------------ |
| 🔴 必須修復 | **5**   | 無 RLS 保護，任何登入用戶可跨租戶讀寫                        |
| 🟠 高風險   | **5**   | Policy 等同無效（`USING(true)` 或 tautology）                |
| ⚠️ 中風險   | **11**  | 隔離不完整（auth-only、漏洞、缺功能）                        |
| ✅ 安全     | **26+** | workspace_id 過濾 + super_admin bypass                       |
| ⚠️ 需隔離   | **3**   | 原以為共用，實際應隔離（companies, attractions, workspaces） |

---

## 🔴 必須修復（無 RLS 保護）

### 1. `accounting_subjects` — 會計科目主檔

- **資料內容**：各公司自訂的會計科目樹（科目代號、名稱、類型），是記帳的基礎分類
- **現狀**：有 `workspace_id` 欄位但完全沒有啟用 RLS，零條 policy
- **風險**：任何登入用戶可讀寫所有公司的會計科目，可竄改或刪除其他租戶的科目結構
- **修復方向**：啟用 RLS + 標準 workspace_id 四條 CRUD policy

### 2. `company_assets` — 公司資產/文件

- **資料內容**：公司級別的資產與文件紀錄（含限閱文件 `restricted` 標記）
- **現狀**：所有 migration 中都沒有 RLS 相關設定，完全裸露
- **風險**：任何登入用戶可讀取所有公司的資產資料，包括標記為限閱的文件
- **修復方向**：新增 workspace_id 欄位（若缺少）+ 啟用 RLS + workspace 隔離 policy

### 3. `confirmations` — 團務確認單（含行程確認、供應商確認）

- **資料內容**：`tour_confirmation_sheets` + `tour_confirmation_items`，儲存每團的確認文件（領隊、出發日期、供應商項目明細、價格）
- **現狀**：RLS 在 migration `20260102140000` 中被明確停用（`ALTER TABLE ... DISABLE ROW LEVEL SECURITY`）
- **風險**：任何登入用戶可讀寫所有公司的確認單，洩漏供應商報價與團務安排
- **修復方向**：重新啟用 RLS + 透過 tour_id → tours.workspace_id 做子查詢隔離

### 4. `esims` — eSIM 購買與指派紀錄

- **資料內容**：旅客的 eSIM 卡購買、啟用、指派紀錄（含旅客姓名、關聯團號）
- **現狀**：RLS 在 `20251211` bulk disable migration 中被關閉，之後從未重新啟用
- **風險**：任何登入用戶可讀寫所有公司的 eSIM 資料
- **修復方向**：重新啟用 RLS + workspace_id 過濾 policy

### 5. `visas` — 簽證申請紀錄

- **資料內容**：旅客簽證申請（護照號碼、護照效期、簽證類型、目的地國家、申請狀態）
- **現狀**：RLS 在 `20251211` bulk disable migration 中被關閉，從未重啟；有 `workspace_id` 欄位
- **風險**：任何登入用戶可讀取所有公司旅客的護照號碼與簽證資料（個資洩漏）
- **修復方向**：重新啟用 RLS + 標準 workspace_id 四條 CRUD policy

---

## 🟠 高風險（Policy 等同無效）

### 1. `tour_requests` — 團務需求單（訂房、訂車、訂餐等）

- **資料內容**：從行程產生的供應商需求單，包含供應商報價、聯絡人、需求明細 (JSONB)
- **現狀**：RLS policy 含 tautological 子查詢（自引用），條件永遠為真，等同無隔離
- **風險**：任何登入用戶可讀寫所有公司的需求單，洩漏供應商報價與合作細節
- **修復方向**：修正 policy 子查詢，改為 `workspace_id = current_setting('app.workspace_id')::uuid`

### 2. `payment_request_items` — 請款單明細

- **資料內容**：請款單的逐項明細（品項描述、數量、單價、金額、幣別、供應商）
- **現狀**：Policy 使用 `USING(true)`，依賴父表 `payment_requests` 隔離，但直接查詢此表無保護
- **風險**：任何登入用戶可直接查詢看到所有公司的請款明細金額
- **修復方向**：改為 `USING(EXISTS(SELECT 1 FROM payment_requests WHERE id = request_id AND workspace_id = ...))` 子查詢

### 3. `employee_job_roles` — 員工職務角色對應

- **資料內容**：員工與職務角色的多對多關聯表（employee_id + role_id）
- **現狀**：Policy 使用 `USING(true)`，無任何過濾
- **風險**：任何登入用戶可讀取所有公司的員工職務分配，也可竄改
- **修復方向**：透過 employee_id → employees.workspace_id 子查詢隔離

### 4. `tour_role_assignments` — 團務角色指派

- **資料內容**：每團/每訂單的角色指派（哪位員工擔任什麼角色），含 tour_id、order_id、role_id、employee_id
- **現狀**：Policy 使用 `USING(true)`，無任何過濾
- **風險**：任何登入用戶可讀取所有公司的團務人員安排
- **修復方向**：透過 tour_id → tours.workspace_id 子查詢隔離

### 5. `channel_members` — 頻道成員

- **資料內容**：工作區內部通訊頻道的成員清單
- **現狀**：Policy 使用 `USING(true)`，無任何過濾
- **風險**：任何登入用戶可讀寫所有公司的頻道成員資料
- **修復方向**：透過 channel_id → channels.workspace_id 子查詢隔離

---

## ⚠️ 中風險（隔離不完整）

### 1. `accounting_accounts` — 會計帳戶

- **現狀**：RLS 啟用但 policy 僅檢查 `auth.role()='authenticated'`，無 workspace_id 過濾
- **風險**：跨租戶可讀取其他公司帳戶
- **修復方向**：升級為 workspace_id 過濾

### 2. `accounting_entries` — 會計分錄

- **現狀**：同上，僅 authenticated check
- **風險**：跨租戶可讀取其他公司記帳明細
- **修復方向**：升級為 workspace_id 過濾

### 3. `tour_itinerary_items` — 行程項目明細（核心表）

- **現狀**：需確認是否有 workspace_id 欄位，動態 policy 可能失效
- **風險**：若缺 workspace_id，隔離依賴 tour_id 子查詢，效能與正確性需驗證
- **修復方向**：確認 DB 欄位結構，必要時新增 workspace_id

### 4. `tour_rooms` — 團務房間分配

- **現狀**：RLS 啟用但僅 authenticated，無 workspace 隔離
- **風險**：跨租戶可讀取房間安排
- **修復方向**：透過 tour_id → tours.workspace_id 子查詢

### 5. `tour_room_assignments` — 房間旅客指派

- **現狀**：同上，僅 authenticated
- **風險**：跨租戶可讀取旅客房間分配
- **修復方向**：透過 tour_room_id → tour_rooms → tours.workspace_id 子查詢

### 6. `quote_items` — 報價單明細

- **現狀**：Policy 含 `OR workspace_id IS NULL` 條件
- **風險**：無歸屬的舊資料可被任何人讀取
- **修復方向**：移除 `OR workspace_id IS NULL`，先回填舊資料的 workspace_id

### 7. `files` — 檔案管理

- **現狀**：workspace 隔離正確，但缺少 `is_super_admin()` bypass
- **風險**：super_admin 無法跨工作區管理檔案
- **修復方向**：新增 super_admin bypass 條件

### 8. `folders` — 資料夾管理

- **現狀**：同 `files`
- **風險**：同 `files`
- **修復方向**：同 `files`

### 9. `supplier_categories` — 供應商分類

- **現狀**：RLS 啟用但僅 authenticated，無 workspace_id 過濾
- **風險**：跨租戶可讀取其他公司的供應商分類
- **修復方向**：確認是否為共用表；若否，新增 workspace_id 過濾

### 10. `workspace_modules` — 工作區模組設定

- **現狀**：無 RLS migration，狀態不明
- **風險**：可能無保護，洩漏各公司啟用的模組配置
- **修復方向**：確認 DB 實際狀態，新增 workspace_id 過濾 policy

### 11. `tour_leaders` — 領隊資料

- **現狀**：原始 policy 可能僅 auth-only，需確認實際 DB
- **風險**：跨租戶可讀取領隊個資
- **修復方向**：確認後升級為 workspace_id 過濾

---

## ✅ 安全（workspace_id 隔離完整）

以下表格已有完整的 workspace_id 過濾 + super_admin bypass：

`tours` · `orders` · `itineraries` · `receipts` · `payment_requests` · `disbursement_orders` · `employees` · `attendance_records` · `leave_requests` · `leave_types` · `leave_balances` · `employee_route_overrides` · `customers` · `customer_groups` · `regions` · `suppliers` · `leader_schedules` · `fleet_vehicles` · `fleet_drivers` · `fleet_schedules` · `transportation_rates` · `accounting_events` · `accounting_periods` · `quotes` · `channels` · `todos` · `pnrs` · `design_templates` · `office_documents`

---

## ⚠️ 需隔離（原誤判為公開）

> 業主確認：目前除了行程網頁（給旅客）和透過 LINE 發出的需求單（保險等）之外，沒有任何資料需要跨租戶公開。

| 表名          | 說明                                 | 修復方向                                                   |
| ------------- | ------------------------------------ | ---------------------------------------------------------- |
| `companies`   | 公司基本資訊，不應讓其他租戶看到     | 啟用 RLS + workspace_id 過濾                               |
| `attractions` | 景點資料庫，各公司自建的景點不應共享 | 啟用 RLS + workspace_id 過濾                               |
| `workspaces`  | 工作區清單，不應讓其他租戶看到       | 啟用 RLS + workspace_id 過濾（僅允許查看自己的 workspace） |

---

**最後更新**：2026-04-05
**審計範圍**：全資料庫表格（非路由導向）
