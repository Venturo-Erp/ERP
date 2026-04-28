# Agent F — DB Schema 真相對照（v3.0 覆盤）

Route：/login
Date：2026-04-22 晚間（DB_TRUTH 剛重拍）
Scope：對照 DB_TRUTH 找 UI / 代碼不知道的事、找 v2.0 漏抓 / 未修 / 新冒出的 DB 層問題

---

## 1. Policy 原文檢查 — 是否真的擋住

| Table                           | Policy                                            | 條文                                                                                         | 擋住？            | v2.0 狀態                              |
| ------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------- |
| `workspaces`                    | `workspaces_delete`                               | `USING: true`                                                                                | 🔴 **否**         | **v2.0 漏抓新紅色**                    |
| `workspaces`                    | `workspaces_insert`                               | `WITH CHECK: is_super_admin()`                                                               | ✅                | ✅                                     |
| `workspaces`                    | `workspaces_select`                               | `USING: (id = get_current_user_workspace())`                                                 | ⚠️ bootstrap 疑慮 | v2.0 已知                              |
| `workspaces`                    | `workspaces_update`                               | `USING: (id = get_current_user_workspace())`                                                 | ✅                | ✅                                     |
| `employees`                     | 4 條 policy                                       | 全用 `get_current_user_workspace()`                                                          | ✅                | ✅                                     |
| `workspace_roles`               | 4 條 policy                                       | 全 tenant scoped                                                                             | ✅                | ✅                                     |
| `role_tab_permissions`          | 5 條（service_role + 4 tenant）                   | `role_id IN (SELECT FROM workspace_roles WHERE workspace_id = get_current_user_workspace())` | ✅                | **今晚 migration 20260422140000 修完** |
| `employee_permission_overrides` | 4 條全 `USING:true` / `WITH CHECK:true`           | 零條件                                                                                       | 🔴 否             | **v2.0 點名、至今未修**                |
| `employee_route_overrides`      | 2 條（SELECT EXISTS subquery + ALL service_role） | 正確                                                                                         | ✅                | ✅（對照組）                           |

---

## 🔴 關鍵威脅

### F-1 · `workspaces_delete` = `USING: true`（v2.0 漏抓、今晚仍存在）

- **威脅**：任何登入用戶可以 DELETE 任一 workspace row
- **級聯後果**：workspace*roles / employees / tour*\* / orders / receipts 全部跟著刪（CASCADE FK）
- **根因**：DELETE policy 無條件、沒像 SELECT/UPDATE 那樣檢查 `id = get_current_user_workspace()`
- **v2.0**：login.md 列了 workspaces 的 SELECT/UPDATE 都對、但**沒細看 DELETE**
- **修法**：`ALTER POLICY workspaces_delete USING (id = get_current_user_workspace() AND is_super_admin())`、或更嚴格

### F-2 · `employee_permission_overrides` 無 workspace_id + USING:true

- **威脅**：任何登入用戶可讀寫所有 workspace 員工的權限覆蓋記錄
- **表設計缺陷**：無 workspace_id 欄位、無法直接 tenant scoped policy
- **現狀**：4 條 policy 全 `USING:true` / `WITH CHECK:true`（無防火牆）
- **v2.0**：已點名「USING:true 完全無過濾」、至今未修
- **對照組**：employee_route_overrides 有正確 policy（EXISTS subquery 檢查同 workspace）
- **修法**：加 workspace_id 欄位 + FK → workspaces(id) CASCADE、policy 改用 subquery（參照 employee_route_overrides）

### F-3 · `workspaces.setup_state` 登入階段未被讀取

- **表設計**：setup_state 是 jsonb、default `{"has_employees": false, "password_changed": false, ...}`
- **login API 現狀**：validate-login/route.ts L24 只讀 `id, code`、**不讀 setup_state**
- **隱患**：未初始化租戶可登入、之後操作爆炸；onboarding 流程可能被略過
- **v2.0 login.md**：已列「Login API 檢查 workspaces.setup_state（防未初始化租戶登入）」🟡 中、未修
- **修法**：validate-login 補讀 setup_state、傳給 client、client 根據 setup_state 判斷跳 onboarding

---

## 2. Trigger 對 Login 的影響

| Table        | Trigger                               | 時機          | 風險                                                |
| ------------ | ------------------------------------- | ------------- | --------------------------------------------------- |
| `employees`  | `trigger_auto_set_workspace_id`       | BEFORE INSERT | 低（插入 workspace_id 若未明指）                    |
| `employees`  | `update_employees_updated_at`         | BEFORE UPDATE | 低                                                  |
| `workspaces` | `trg_create_default_finance_settings` | AFTER INSERT  | 🟡 新租戶建時若 trigger 失敗會 rollback 整個 INSERT |
| `workspaces` | `trg_create_default_todo_columns`     | AFTER INSERT  | 🟡 同上                                             |
| `workspaces` | `workspaces_updated_at`               | BEFORE UPDATE | 低                                                  |

### F-4 · AFTER INSERT trigger 時序風險

- **場景**：新租戶第一次建立
- **流程**：INSERT workspaces → AFTER trigger 執行 → 若失敗整個 INSERT 被 rollback → 建租戶失敗
- **現狀**：2 個 AFTER INSERT trigger 都無顯式 error handling
- **建議**：trigger 函式包 EXCEPTION、失敗時 log warning 但不 raise
- **v2.0**：未提及此時序

---

## 3. UI / 代碼不知道的欄位

### employees 表（44 欄、login API 讀 41 欄）— 漏讀 3 欄

| 欄位                        | Type         | 備註                                                    |
| --------------------------- | ------------ | ------------------------------------------------------- |
| `amadeus_totp_secret`       | text         | **今晚新增**（migration 20260422130000）                |
| `amadeus_totp_account_name` | text         | 同上                                                    |
| `roles`                     | ARRAY text[] | **三套權限並存的舊欄**（permissions / roles / role_id） |

### F-5 · employees 三套權限系統並存

- `employees.permissions` ARRAY text[]（舊）
- `employees.roles` ARRAY text[]（舊）
- `employees.role_id` UUID（新、指 workspace_roles.id）
- `role_tab_permissions`（新架構、per-role 權限明細）

**Login API 現狀**：只讀 role_id、從 role_tab_permissions 組權限、不碰 permissions / roles
**UI 可能仍讀舊欄**（HR 頁面）
**v2.0**：未特別點名「三套並存」
**建議**：確認無代碼依賴後 DROP permissions / roles 欄位（列 cleanup-council 待辦）

### F-6 · workspaces 欄位選擇性讀取

- validate-login L24 只讀 `id, code`
- 漏讀但可能需要的：
  - `setup_state`（F-3）
  - `premium_enabled`（決定功能啟用）
  - `enabled_tour_categories` ARRAY（決定 tour type）
  - `max_employees` INT（員工人數上限）
- **隱患**：登入成功後 client 不知這些值、UI 可能空指針或預設錯
- **建議**：login 階段補讀、或在 /api/auth/get-employee-data 補帶

### F-7 · amadeus_totp_secret 洩漏風險（今晚新增欄位）

- **資料敏感度**：TOTP secret 是加密過的（應用層 AES-256-GCM、key 由 env 管理）
- **Migration 註解**：「此欄位不應被前端直接 SELECT」
- **風險確認點**：
  - employees 表現有 RLS policy 是否限制 secret 欄（RLS 是 row-level、不限欄、無保護）
  - 前端 SELECT 時有沒有欄位白名單（若 `select('*')` 就會包含）
- **建議**：
  - 確認所有前端 SELECT employees 的地方不用 `*`、用明確欄位清單
  - 所有 amadeus_totp 相關讀寫走 /api/amadeus-totp/\* API、不經 RLS

---

## 4. FK 走向合規性（CLAUDE.md 紅線檢查）

| FK                                                           | From → To | ON DELETE | 合規                                    | 備註 |
| ------------------------------------------------------------ | --------- | --------- | --------------------------------------- | ---- |
| `workspaces.created_by` → `employees.id`                     | NO ACTION | ✅        | 正確                                    |
| `workspaces.updated_by` → `employees.id`                     | NO ACTION | ✅        | 正確                                    |
| `employees.created_by` → `employees.id`                      | SET NULL  | ✅        | 正確                                    |
| `employees.updated_by` → `employees.id`                      | NO ACTION | ✅        | 正確                                    |
| `employees.role_id` → `workspace_roles.id`                   | NO ACTION | ⚠️        | RESTRICT 會更嚴格、但 NO ACTION 也可    |
| `employees.supabase_user_id` → auth.users.id                 | —         | 🔴        | **無 FK**（外部 schema）                |
| `role_tab_permissions.role_id` → `workspace_roles.id`        | RESTRICT  | ✅        | 正確                                    |
| `employee_permission_overrides.employee_id` → `employees.id` | RESTRICT  | ⚠️        | 無 workspace_id、soft-delete 員工時會卡 |
| `employee_route_overrides.employee_id` → `employees.id`      | RESTRICT  | ✅        | 正確                                    |

### F-8 · employees.supabase_user_id 缺 FK 約束

- **現狀**：純應用層假設、auth.users 是 Supabase 內部 schema 無法加 FK
- **login API 防禦**：validate-login L88 用 `auth.admin.getUserById()`、若 null 應 log warning
- **建議**：應用層每次讀 supabase_user_id 後驗 auth.users 存在性、或允許 null 降級

---

## 5. RLS FORCE 狀態 — P004 Wave 2.5 驗證

| 指標                       | 值          |
| -------------------------- | ----------- |
| 310 張 public 表           | -           |
| `rowsecurity=true`         | 307 張      |
| `relforcerowsecurity=true` | **0 張** ✅ |

**結論**：P004 Wave 2.5（全部關 FORCE RLS）**已完全落地** ✅

---

## 6. DB_TRUTH 可疑清單中的 login 直接相關項

| 項目                                                         | 嚴重度 | v2.0 狀態 | 今晚修？ |
| ------------------------------------------------------------ | ------ | --------- | -------- |
| `_migrations` RLS 沒開                                       | 🔴     | 未列      | 未修     |
| `rate_limits` RLS 沒開                                       | 🔴     | 未列      | 未修     |
| `employee_permission_overrides` 無 workspace_id + USING:true | 🔴     | 點名      | 未修     |
| `workspaces_delete` = USING:true                             | 🔴     | **漏抓**  | 未修     |

### F-9 · `_migrations` RLS 沒開

- **威脅**：任何登入用戶可讀所有 migration SQL 內容
- **影響**：洩漏整套 DB 架構、policy 邏輯、歷史漏洞修補路徑（攻擊者可查出修過哪些漏洞、推測未修的）
- **v2.0**：未特別處理
- **修法**：`ALTER TABLE _migrations ENABLE ROW LEVEL SECURITY`、policy 限 service_role only

### F-10 · `rate_limits` RLS 沒開

- **威脅**：login 用的 rate limit 表無保護、攻擊者可讀其他用戶的 rate limit 狀態
- **影響**：可能洩漏登入模式（哪些帳號被 rate-limit 過、多頻繁）
- **v2.0**：未特別處理
- **修法**：加 RLS、policy 走 service_role（check_rate_limit function 用 SECURITY DEFINER 不受 RLS 影響）

---

## 結論表（嚴重度 + 優先）

| ID   | 發現                                                         | 來源           | 嚴重度      | 修復難度                 | 優先   |
| ---- | ------------------------------------------------------------ | -------------- | ----------- | ------------------------ | ------ |
| F-1  | `workspaces_delete` = USING:true                             | v2.0 漏抓      | 🔴 CRITICAL | 低（1 行 SQL）           | **P0** |
| F-2  | `employee_permission_overrides` 無 workspace_id + USING:true | v2.0 未修      | 🔴 CRITICAL | 中（migration + policy） | **P1** |
| F-3  | workspaces.setup_state login 未讀                            | v2.0 列🟡      | 🟡 MEDIUM   | 低（+1 欄查詢）          | P2     |
| F-4  | AFTER INSERT trigger 無 error handling                       | 新發現         | 🟡 MEDIUM   | 低（+exception handle）  | P2     |
| F-5  | 三套權限系統並存（permissions / roles / role_id）            | v2.0 漏抓      | 🟡 MEDIUM   | 高（需先清 UI 依賴）     | P3     |
| F-6  | workspaces 欄位 login 選擇性讀取                             | v2.0 漏抓      | 🟡 MEDIUM   | 低                       | P2     |
| F-7  | amadeus_totp_secret 讀取漏洞                                 | 今晚新欄、未驗 | 🟡 MEDIUM   | 低（欄位白名單）         | P1     |
| F-8  | employees.supabase_user_id 無 FK                             | v2.0 漏抓      | 🟡 MEDIUM   | 不可行（外部 schema）    | 文檔化 |
| F-9  | `_migrations` 無 RLS                                         | v2.0 漏抓      | 🔴 CRITICAL | 低                       | **P0** |
| F-10 | `rate_limits` 無 RLS                                         | v2.0 漏抓      | 🔴 CRITICAL | 中                       | **P0** |

---

## 建議行動（列項、不動手）

**立刻修（P0、SQL 單行級別）**：

1. `workspaces_delete` policy 加 `USING: (id = get_current_user_workspace())`
2. `_migrations` 開 RLS、policy 限 service_role
3. `rate_limits` 開 RLS、policy 走 service_role（check_rate_limit function SECURITY DEFINER 不受影響）

**本週（P1）**：4. `employee_permission_overrides` 加 workspace_id + 改 policy（blocking migration）5. amadeus_totp_secret 所有 SELECT 加欄位白名單（不用 `*`）

**下週（P2）**：6. validate-login 補讀 workspaces.setup_state / premium_enabled / enabled_tour_categories / max_employees 7. workspaces AFTER INSERT trigger 加 exception handler

**規劃清理（P3）**：8. 清除 employees.permissions / roles 舊欄位（cleanup-council 任務）

---

**結論**：今晚 P004 / P010 DB 層修法**全部落地 ✅**、但 DB_TRUTH 盤點**冒出 3 項 v2.0 漏抓的 🔴 新紅色**（workspaces_delete / \_migrations / rate_limits）+ 2 項 v2.0 點名未修仍在（employee_permission_overrides / setup_state）。P0 三件都是單行 SQL 等級、當晚可補修。
