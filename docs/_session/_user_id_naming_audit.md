# user_id / supabase_user_id 命名 Audit

> 2026-05-02 / G2 任務 / 純 read / 不改任何 code/migration/DB

## 1. DB 欄位現況

### `employees` 表（核心矛盾）

兩個欄位並存、應該指向同一個 `auth.users.id`：

| 欄位 | FK | 加入時間 | 現況 |
|---|---|---|---|
| `supabase_user_id` | `auth.users(id)` | `20251220143519_add_supabase_user_id_columns.sql` (2025-12) | 13/16 active 員工有值 |
| `user_id` | `auth.users(id)` (推測) | 早於 supabase_user_id 加的、未找到原始 ADD COLUMN migration | E1 同步後 13/16 有值 |

E1 (`20260502200000_fix_platform_admin_and_user_id.sql`) 處理：
- 把 supabase_user_id 不為 null 的 13 筆 user_id 補齊
- 加 trigger `sync_employee_user_id`：BEFORE INSERT/UPDATE 時雙向同步兩欄位

### 其他表的 user_id（**不同概念、別誤殺**）

從 `src/lib/supabase/types.ts` 掃出有 `user_id` 欄位的表：

- **個人/會計類（指 auth.users 或 employees、私人擁有）**：
  - `accounting_accounts`、`accounting_transactions`、`expense_categories`（個人記帳、E2 RLS 用 `user_id = auth.uid()`）
  - `notes`、`user_preferences`（FK 到 employees(id) 或 auth.users）
  - `customers`、`customer_service_conversations`
- **LINE 整合**：`line_users`、`workspace_line_config`
- **Online 系統**：`traveler_*` 表、`profiles` 相關（指 traveler_profiles 或 auth.users）

**結論**：除 `employees` 外、其他表的 `user_id` 不在本 audit 範圍。

## 2. src 引用統計

`grep -rn "supabase_user_id" src/` 共 **54 處**、分布在 **16 個檔**（不算 types.ts）。

### (a) 寫入 `employees.supabase_user_id`（INSERT/UPDATE）

- `src/app/api/employees/create/route.ts:83` — 建員工時設 `supabase_user_id: authUser.user.id`
- `src/app/api/tenants/create/route.ts:279` — 建租戶 admin 時 update
- `src/app/api/auth/sync-employee/route.ts:91` — 同步用
- `src/lib/auth/auth-sync.ts:41` — server-side 同步

### (b) 讀取 `employees.supabase_user_id`（SELECT / .or 過濾）

- `src/app/api/auth/validate-login/route.ts:43,76,81,86` — 登入流程（核心）
- `src/app/api/auth/change-password/route.ts:38,51,74,79`
- `src/app/api/auth/reset-employee-password/route.ts:48,68,74`
- `src/app/api/auth/sync-employee/route.ts:61,79,82` — 同步檢查
- `src/lib/auth/auth-sync.ts:160,176`
- `src/lib/auth/server-auth.ts:81-82` — `.or(\`id.eq.${user.id},supabase_user_id.eq.${user.id}\`)`
- `src/lib/auth/get-api-context.ts:80` — `.or(\`user_id.eq.${user.id},supabase_user_id.eq.${user.id},id.eq.${user.id}\`)` ← 三路兼容
- `src/lib/auth/get-layout-context.ts:74` — 同上、三路兼容
- `src/lib/supabase/api-client.ts:73` — `.or(\`id.eq.${user.id},supabase_user_id.eq.${user.id}\`)`
- `src/app/api/accounting/vouchers/create/route.ts:87` — 同上
- `src/app/api/accounting/period-closing/route.ts:140` — 同上
- `src/data/entities/employees.ts:14` — list select 同時拉兩個欄位

### (c) 變數命名 / 註解（非 DB 欄位）

- `src/lib/validations/api-schemas.ts:73` — Zod schema 欄位定義（API 接口契約）
- 多個檔案的註解、log message

### 真的指 `employees.user_id` 的 src 引用

`grep -rn "user_id" src/` 結果太雜（其他表的 user_id 占多數）。經人工篩、**src 沒有任何點直接讀寫 `employees.user_id`**：
- 業務 code 一律走 `supabase_user_id`
- 有 3 個檔（get-api-context / get-layout-context / employees entity select）字面包含 `user_id` 但是「兼容寫法」、不是主路徑

## 3. RLS / SQL 函式引用

### 用 `e.user_id` 的函式（E1 之後）

- `is_super_admin()` (E1 重建、`20260502200000`) — `WHERE e.user_id = auth.uid()`
- `has_capability(_code)` (`20260501100000`) — `WHERE e.user_id = auth.uid()`
- `has_capability_for_workspace(_workspace_id, _code)` (`20260501100000`) — `WHERE e.user_id = auth.uid()`
- `role_capabilities` policy `rc_member_read` (`20260501100000`) — `WHERE e.user_id = auth.uid()`

### 用「OR 兼容」雙欄位的（E2 防禦性寫法）

- `20260502210000_fix_rls_policies_19_tables.sql` 多條 policy（itineraries / messages / michelin_restaurants / premium_experiences / todo_columns / tour 子表 / channel 子表）：
  ```
  WHERE e.user_id = auth.uid() OR e.supabase_user_id = auth.uid()
  ```

### 用 `supabase_user_id` 的歷史函式（已被覆蓋、可能仍存活）

- `get_current_user_workspace()` (`20260115100000`) — `WHERE e.id = current_uid OR e.supabase_user_id = current_uid`（注意：用 `e.id` 而非 `e.user_id`、且兼容 supabase_user_id）

## 4. 推薦方案

### **方案 A**（保留 `user_id`、改 src 用 `user_id`、最後砍 `supabase_user_id`）

#### 為什麼選 A

1. **跟 RLS 收斂方向一致**：E1 已把 `user_id` 設為「新真相」、`is_super_admin/has_capability_*` 都用 `e.user_id`。E2 的「OR 兼容」是過渡寫法、明擺著未來要砍掉一邊。
2. **跟 venturo-online 命名一致**：CROSS_SYSTEM_MAP 規範 `user_id` 是標準欄位名（其他表也用 `user_id`、不用 `xxx_user_id`）。
3. **RLS 改錯炸全站**：方案 B 要動 4 個 SECURITY DEFINER 函式 + 11+ 條 policy、任一個 typo 全站 RLS 失效（CLAUDE.md 紅線：動 RLS 必跑 `tests/e2e/login-api.spec.ts`）。風險遠高於 src 機械式 rename。
4. **trigger 已雙向同步**：現在改 src 寫入路徑不會立刻炸（trigger 會回填另一邊）、有緩衝時間。

#### 風險點

- src 16 檔 54 處要改、有些是 `.or()` 的字串拼接（不是純欄位 rename）
- `src/app/api/auth/sync-employee/route.ts` 整個檔的語意都圍繞 `supabase_user_id`、要重新設計
- `src/lib/validations/api-schemas.ts` 是 API 契約（外部呼叫者也要跟著改？需確認誰呼叫 sync-employee）

## 5. 清理計畫（建議下一波執行）

### Phase 1：src rename（高頻路徑優先）
1. `src/lib/auth/server-auth.ts` / `api-client.ts` / `get-api-context.ts` / `get-layout-context.ts` — 4 個 `.or()` 拼字串、把 `supabase_user_id` 那段拿掉、只留 `id` 跟 `user_id`
   - 驗證：`tests/e2e/login-api.spec.ts` 通過
2. `src/app/api/auth/validate-login/route.ts` — 登入主路徑、`.select('... supabase_user_id ...')` 改 `user_id`
3. `src/app/api/auth/change-password` / `reset-employee-password` — 同上
4. `src/data/entities/employees.ts` — list select 拿掉 `supabase_user_id`、留 `user_id`

### Phase 2：sync-employee API 重構
1. `src/app/api/auth/sync-employee/route.ts` + `src/lib/auth/auth-sync.ts` — 整個檔語意改成「同步 user_id」、API 契約改 schema
2. `src/lib/validations/api-schemas.ts` 把 `supabase_user_id` field 改名 `user_id`
3. 確認沒有外部 caller（grep `/api/auth/sync-employee`）

### Phase 3：建立路徑收斂
1. `src/app/api/employees/create/route.ts:83` — INSERT 時直接寫 `user_id`（trigger 仍會回填 `supabase_user_id`）
2. `src/app/api/tenants/create/route.ts:279` — 同上

### Phase 4：DB 收尾（src 全清乾淨後）
1. 重建 `20260502210000` 那批 OR-兼容 policy、移除 `OR e.supabase_user_id = auth.uid()` 段
2. 重建 `get_current_user_workspace()` 移除兼容
3. `DROP TRIGGER trg_sync_employee_user_id`、`DROP FUNCTION sync_employee_user_id()`
4. `ALTER TABLE employees DROP COLUMN supabase_user_id`
5. 重新生成 supabase types、確認 build 通過

### 守門
- 每個 Phase 之間跑 `npm run type-check` + `tests/e2e/login-api.spec.ts`
- Phase 4 前必須確認 `grep -rn "supabase_user_id" src/` 為 0（types.ts 例外）
- Migration 順序：src 改完 deploy 後再執行 DB DROP、不可同時

## 6. 異常與發現

### Finding 1：`get_current_user_workspace()` 用 `e.id`、不是 `e.user_id`

`20260115100000_simplify_rls_id_lookup.sql` 用 `WHERE e.id = current_uid OR e.supabase_user_id = current_uid` — 預設 `auth.uid()` 等於 `employees.id`（Pattern A、舊統一 ID 架構）。但 E1 的新邏輯是 `auth.uid() = employees.user_id`（兩個獨立 UUID）。這個函式可能已經邏輯失效、或者回傳的是另一條兼容路徑、值得 D1/E1 後續再 audit。

### Finding 2：`src/lib/auth/get-api-context.ts:80` 用三路兼容

`.or(\`user_id.eq.${user.id},supabase_user_id.eq.${user.id},id.eq.${user.id}\`)` 同時兼容三種 ID 對應方式（user_id / supabase_user_id / employee.id 直接 = auth.uid）。Phase 4 完成後可降為單路 `.eq('user_id', user.id)`。

### Finding 3：raw_pg_policies.json 是 E2 之前的 snapshot

D1 的 `raw_pg_policies.json` 只看到 7 處 `user_id`（全是 `accounting_accounts` / `user_preferences`、不是 employees）。E2（`20260502210000`）已加上 11+ 條用 `e.user_id OR e.supabase_user_id` 的新 policy、要看實際 DB 狀態請重新 dump pg_policies。

### Finding 4：`employees.user_id` ADD COLUMN migration 找不到

`grep -rn "ALTER TABLE.*employees.*ADD COLUMN.*user_id"` 搜不到單獨 add user_id 的 migration（add supabase_user_id 的 migration 在 `20251220143519`）。可能 user_id 在初始 schema 就有、或在 supabase remote 的 baseline 中。建議查 supabase dump 確認 FK 是否真的指 `auth.users(id)`。
