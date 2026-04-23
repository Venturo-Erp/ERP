# 04 · Senior Developer 會診：4 條 DB RLS pattern 的 Migration 實作可行性

**日期**：2026-04-22
**角色**：Senior Developer（實作可行性、blast radius、migration 工藝）
**範圍**：William 指定 4 條 DB-layer pattern、寫 ready-to-run SQL + 評估代碼連動
**限制**：只給草稿、不自動跑；每條都附 rollback；假設先於 staging 驗再動正式

---

## 身份宣告

架構師畫藍圖、Security 畫防線、Backend 畫骨頭——**我把這三份變成能貼進 Supabase Studio 跑的 SQL**。我在乎的是「這段 migration 上 staging 會不會有 5 個地方壞」、「rollback 兩分鐘內能不能回來」、「本週內有沒有 type-check / e2e 守門可以擋」。以下每條 pattern 的 SQL 都是 idempotent + transactional 草稿，不是 copy-paste 就能上線的成品。

---

## Pattern 1 · `workspaces_delete` 收緊

### 現況查證
- 現況 policy（`20260405500000_fix_rls_medium_risk_tables.sql:622-626`）：`USING (is_super_admin())` — **不是** `USING (true)`。
- William 標「USING:true」推測來自 audit 老資料 stale、或把 `workspaces_select` `id = get_current_user_workspace() OR is_super_admin()` 這類 OR 條件誤讀。
- 實情：DELETE 已經只 super_admin 能做。Level 目前其實偏嚴。
- 但代碼端：`WorkspacesManagePage.tsx:77` 用 anon client（`supabase.from('workspaces').delete()`）、是 super_admin 身份下的 RLS 擋板放行才會過。

### Migration SQL 草稿
**前提**：如果 pattern 是 audit stale，實際 policy 已經對、不動 DB、只更新 `_PATTERN_MAP.md` 狀態。如果 William 要**再收一層**（例如「必須是該 workspace 自己的系統主管 才能刪自家，其他人一律不准」），用下面：

```sql
-- 先看現況（務必手動跑、確認再往下）：
SELECT polname, polcmd, pg_get_expr(polqual, polrelid) AS using_clause
FROM pg_policy WHERE polrelid = 'public.workspaces'::regclass;

BEGIN;
  DROP POLICY IF EXISTS "workspaces_delete" ON public.workspaces;

  -- 選項 A（建議、符合 William 模型：super_系統主管才能刪）：維持原狀、純正名
  CREATE POLICY "workspaces_delete" ON public.workspaces
    FOR DELETE TO authenticated
    USING (is_super_admin());

  -- 選項 B（可選、更嚴：同 workspace + is_admin、且非最後一間）：
  -- CREATE POLICY "workspaces_delete" ON public.workspaces
  --   FOR DELETE TO authenticated
  --   USING (
  --     is_super_admin()
  --     AND id != (SELECT id FROM public.workspaces WHERE code = 'SYSTEM')
  --   );
COMMIT;
```

### Blast Radius（代碼連動）
- `src/features/workspaces/components/WorkspacesManagePage.tsx:77` — 需要 super_admin 身份才走得過、目前就這樣、不用改。
- `src/features/workspaces/components/AddWorkspaceDialog.tsx:139` — 建立失敗回滾時 DELETE、必須是 super_admin 建立才走得通（現在就是這樣）。
- `src/app/api/tenants/create/route.ts:197` — 用 `supabaseAdmin`（service_role 繞 RLS）、不受 policy 影響。

**沒有代碼要改**；只要前端 UI 層確保非 super_admin 不顯示「刪除公司」按鈕（我檢查 `WorkspacesManagePage` 沒有 guard、應加）。

### Rollback
```sql
-- 無資料改動、rollback 只是回 policy（其實本來就是這樣、等於 no-op）
BEGIN;
  DROP POLICY IF EXISTS "workspaces_delete" ON public.workspaces;
  CREATE POLICY "workspaces_delete" ON public.workspaces
    FOR DELETE TO authenticated USING (is_super_admin());
COMMIT;
```

### 測試守門
- `tests/e2e/login-api.spec.ts`（動 workspaces RLS 必跑、CLAUDE.md 紅線）。
- 新增 `tests/e2e/workspaces-delete.spec.ts`：登入 沒有平台管理資格 → DELETE /workspaces → 應 403。

---

## Pattern 2 · `_migrations` 開 RLS

### 現況查證
- `_migrations` 是 Supabase CLI 內部表（schema 紀錄）、app 幾乎不該 query。
- grep 結果：`src/types/database.types.ts:17` 有 type、但 **沒有任何一處 app code 查它**（`from('_migrations')` 命中 0 筆）。
- `src/app/api/health/db/route.ts:76` 查的是 `schema_migrations`（不同表）、且已 cast 成 `'employees'` type workaround。

### Migration SQL 草稿
```sql
BEGIN;
  ALTER TABLE public._migrations ENABLE ROW LEVEL SECURITY;

  -- 僅 service_role 可讀寫（CLI 用 service_role 跑 migrations）
  DROP POLICY IF EXISTS "_migrations_service_only" ON public._migrations;
  CREATE POLICY "_migrations_service_only" ON public._migrations
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

  -- authenticated / anon 完全擋：不寫 policy、RLS 預設拒絕
  -- （開 RLS 而沒 policy = 沒人能讀、正是我要的效果）
COMMIT;
```

### Blast Radius
- **app 零影響**：沒有 code path 依賴 `_migrations`。
- **CLI 影響**：Supabase CLI `supabase db push` / `supabase migration up` 用 service_role、policy 放行、正常運作。
- **health check 影響**：`api/health/db` 查的是 `schema_migrations`、不受此 migration 影響。

### Rollback
```sql
BEGIN;
  DROP POLICY IF EXISTS "_migrations_service_only" ON public._migrations;
  ALTER TABLE public._migrations DISABLE ROW LEVEL SECURITY;
COMMIT;
```

### 測試守門
- 本地 `supabase db push` 驗一次（CLI 通）。
- `tests/e2e/login-api.spec.ts`（paranoid；動 RLS 一律跑）。

---

## Pattern 3 · `rate_limits` 開 RLS

### 現況查證
- 表設計：`rate_limits(key, count, reset_at)` — 不含 workspace_id / user_id、是**全局共用**的 rate limiter store。
- 寫入路徑只有 `check_rate_limit()` / `cleanup_rate_limits()` function（`SECURITY DEFINER`）、app code **完全沒有** `from('rate_limits')` 直接讀寫。
- GRANT 目前：`check_rate_limit` 對 `authenticated, service_role, anon` 都開、`cleanup_rate_limits` 只 `service_role`。

### Migration SQL 草稿
```sql
BEGIN;
  ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

  -- 只 service_role / SECURITY DEFINER function（以 function owner 身份跑）能碰
  DROP POLICY IF EXISTS "rate_limits_service_only" ON public.rate_limits;
  CREATE POLICY "rate_limits_service_only" ON public.rate_limits
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

  -- authenticated / anon 無 policy = 直接 query 被擋
  -- check_rate_limit() 是 SECURITY DEFINER、以 owner（postgres / service_role）身份跑、照常運作
COMMIT;
```

### Blast Radius
- **零代碼異動**：grep `rate_limits` 在 `src/` 只命中 types、沒任何直查。
- **function 照跑**：SECURITY DEFINER 繞 RLS、`check_rate_limit` 不受影響。
- **風險點**：如果未來有人 bypass function 直接 `supabase.from('rate_limits')`、會突然失敗——**這是我們要的**（防 abuse）。

### Rollback
```sql
BEGIN;
  DROP POLICY IF EXISTS "rate_limits_service_only" ON public.rate_limits;
  ALTER TABLE public.rate_limits DISABLE ROW LEVEL SECURITY;
COMMIT;
```

### 測試守門
- 手動 `SELECT check_rate_limit('test', 3, 60);` 跑 4 次、驗第 4 次回 false。
- `tests/e2e/login-api.spec.ts` 跑一次（登入走 rate limit path）。

---

## Pattern 4 · `employee_permission_overrides` 補 `workspace_id` + RLS 重寫（最大條）

### 現況查證
- Schema 只有：`id, employee_id, module_code, tab_code, override_type, created_at, updated_at`。
- **無 workspace_id**。現有 RLS 4 條全 USING:true（Backend 同事已標 P4 critical）。
- 代碼使用：
  - `src/app/api/auth/validate-login/route.ts:180` — login 時 SELECT（登入後立即查）
  - `src/app/api/permissions/check/route.ts:48` — 權限檢查 SELECT
  - `src/app/api/employees/[employeeId]/permission-overrides/route.ts:22,52,68` — GET / DELETE / INSERT
- 現有 row 數（需查、假設有資料）：透過 `employee_id` → `employees.workspace_id` 可 JOIN 還原。

### Migration SQL 草稿（分 3 step、單 transaction）

```sql
-- ============================================================================
-- Migration: employee_permission_overrides + workspace_id + RLS
-- 前置驗證（請手動跑、確認 row count 與預期一致再往下）：
--   SELECT COUNT(*) FROM public.employee_permission_overrides;
--   SELECT COUNT(*) FROM public.employee_permission_overrides epo
--   LEFT JOIN public.employees e ON e.id = epo.employee_id
--   WHERE e.id IS NULL OR e.workspace_id IS NULL;  -- 預期 0（沒孤兒）
-- ============================================================================

BEGIN;

  -- Step 1: 加欄位（nullable 先、回填後再 NOT NULL）
  ALTER TABLE public.employee_permission_overrides
    ADD COLUMN IF NOT EXISTS workspace_id UUID;

  -- Step 2: 回填（JOIN employees）
  UPDATE public.employee_permission_overrides epo
  SET workspace_id = e.workspace_id
  FROM public.employees e
  WHERE epo.employee_id = e.id
    AND epo.workspace_id IS NULL;

  -- 驗證：無 NULL workspace_id（失敗則整個 tx rollback）
  DO $$
  DECLARE
    null_count INT;
  BEGIN
    SELECT COUNT(*) INTO null_count
    FROM public.employee_permission_overrides
    WHERE workspace_id IS NULL;

    IF null_count > 0 THEN
      RAISE EXCEPTION 'Backfill failed: % rows still have NULL workspace_id', null_count;
    END IF;
  END $$;

  -- Step 3: 加 NOT NULL + FK
  ALTER TABLE public.employee_permission_overrides
    ALTER COLUMN workspace_id SET NOT NULL;

  ALTER TABLE public.employee_permission_overrides
    ADD CONSTRAINT employee_permission_overrides_workspace_id_fkey
    FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id)
    ON DELETE CASCADE;  -- 刪 workspace 時連帶清（符合租戶隔離）

  CREATE INDEX IF NOT EXISTS idx_epo_workspace_id
    ON public.employee_permission_overrides(workspace_id);

  -- Step 4: 重寫 RLS 4 policy
  DROP POLICY IF EXISTS "epo_select" ON public.employee_permission_overrides;
  DROP POLICY IF EXISTS "epo_insert" ON public.employee_permission_overrides;
  DROP POLICY IF EXISTS "epo_update" ON public.employee_permission_overrides;
  DROP POLICY IF EXISTS "epo_delete" ON public.employee_permission_overrides;

  ALTER TABLE public.employee_permission_overrides ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "epo_select" ON public.employee_permission_overrides
    FOR SELECT TO authenticated
    USING (
      workspace_id = get_current_user_workspace()
      OR is_super_admin()
    );

  CREATE POLICY "epo_insert" ON public.employee_permission_overrides
    FOR INSERT TO authenticated
    WITH CHECK (
      is_super_admin()
      OR (
        workspace_id = get_current_user_workspace()
        AND is_role_admin(auth.uid())  -- 若無此 function、暫時允許 same-workspace
      )
    );

  CREATE POLICY "epo_update" ON public.employee_permission_overrides
    FOR UPDATE TO authenticated
    USING (
      workspace_id = get_current_user_workspace()
      AND (is_super_admin() OR is_role_admin(auth.uid()))
    );

  CREATE POLICY "epo_delete" ON public.employee_permission_overrides
    FOR DELETE TO authenticated
    USING (
      workspace_id = get_current_user_workspace()
      AND (is_super_admin() OR is_role_admin(auth.uid()))
    );

COMMIT;
```

### Blast Radius（代碼）
1. `validate-login/route.ts:180` — 目前 SELECT 用 supabase client (anon key authenticated)、加 RLS 後**仍會通**（因為 login 當下已 authenticated、employee 在該 workspace）。**不用改**。
2. `permissions/check/route.ts:48` — 同上、不用改。
3. `employees/[employeeId]/permission-overrides/route.ts:52-68` — **DELETE + INSERT**：
   - `createApiClient()`（authenticated user context）
   - INSERT 時沒帶 `workspace_id`、**會炸 NOT NULL constraint**
   - **必須改**：INSERT payload 加 `workspace_id: auth.workspaceId`（從 session 拿）
4. Type 檔：`src/types/database.types.ts` + `src/lib/supabase/types.ts` 要 regen（`supabase gen types`）。

### 需要改的代碼片段（必改）
```ts
// src/app/api/employees/[employeeId]/permission-overrides/route.ts:57-64
// 加 workspace_id、從 server auth 取：
const auth = await getServerAuth()
if (!auth.success) return NextResponse.json({ error: '請先登入' }, { status: 401 })

const overridesToInsert = overrides
  .filter(o => o.override_type)
  .map(o => ({
    employee_id: employeeId,
    workspace_id: auth.data.workspaceId,  // ← 新增
    module_code: o.module_code,
    tab_code: o.tab_code,
    override_type: o.override_type,
  }))
```

### Rollback
```sql
BEGIN;
  DROP POLICY IF EXISTS "epo_select" ON public.employee_permission_overrides;
  DROP POLICY IF EXISTS "epo_insert" ON public.employee_permission_overrides;
  DROP POLICY IF EXISTS "epo_update" ON public.employee_permission_overrides;
  DROP POLICY IF EXISTS "epo_delete" ON public.employee_permission_overrides;
  ALTER TABLE public.employee_permission_overrides DISABLE ROW LEVEL SECURITY;

  ALTER TABLE public.employee_permission_overrides
    DROP CONSTRAINT IF EXISTS employee_permission_overrides_workspace_id_fkey;
  DROP INDEX IF EXISTS public.idx_epo_workspace_id;
  ALTER TABLE public.employee_permission_overrides DROP COLUMN IF EXISTS workspace_id;
COMMIT;
```

### 測試守門
- `tests/e2e/login-api.spec.ts`（RLS 變動必跑）
- `tests/e2e/admin-login-permissions.spec.ts`（若不存在、**必須新建**）
- 新建 `tests/e2e/permission-overrides.spec.ts`：
  - 系統主管可在自家 workspace CRUD override
  - 沒有系統主管資格 不能 write、可以 read 自己
  - 跨 workspace SELECT 回空

---

## Migration 順序（依賴性分析）

| 順序 | Pattern | 依賴 | 原因 |
|---|---|---|---|
| 1 | Pattern 2 `_migrations` RLS | 無 | 零代碼風險、先熱身、驗 pipeline |
| 2 | Pattern 3 `rate_limits` RLS | 無 | 同上、純防守型 |
| 3 | Pattern 1 `workspaces_delete` | 無 | 若是 audit stale、只是 re-assert、更新文件 |
| 4 | Pattern 4 `employee_permission_overrides` | 有：需要 `get_current_user_workspace()` function 存在（已存在、`20260405500000...` 已建）；code PR 與 migration 要**同一批上線** | 最大條、最後做 |

**不能一起跑的理由**：Pattern 4 需要對應 API code 改 `workspace_id` 欄、若 migration 先跑、舊 code 還在、INSERT 必炸。必須：
1. 開 PR 包含 migration + code 改動
2. Staging 先跑 migration、跑新 code、驗通
3. 正式環境同步 deploy（Vercel + Supabase）

---

## 回滾策略總結

| Pattern | Rollback 複雜度 | 資料風險 | 時間 |
|---|---|---|---|
| 1 | 零（no-op） | 無 | < 1 min |
| 2 | 兩條 SQL | 無 | < 1 min |
| 3 | 兩條 SQL | 無 | < 1 min |
| 4 | 5 條 SQL（policy + FK + index + col） | **有**：workspace_id 資料丟失（回填可重跑）| ~ 3 min |

Pattern 4 rollback 後、若要 re-apply、重跑 migration 就會再 JOIN employees 重填、**data 可恢復**（因為 employees.workspace_id 是 source of truth）。

---

## 測試矩陣（e2e spec 守門）

| Migration | 必跑 spec |
|---|---|
| Pattern 1 | `login-api.spec.ts`（CLAUDE.md 紅線）、新 `workspaces-delete.spec.ts` |
| Pattern 2 | `login-api.spec.ts`（paranoid） |
| Pattern 3 | 手動測 `check_rate_limit` + `login-api.spec.ts` |
| Pattern 4 | `login-api.spec.ts` + `admin-login-permissions.spec.ts`（若存在） + 新 `permission-overrides.spec.ts` |

**所有 pattern 上線前、`npm run type-check` 必通**（pre-commit hook 強制、不能 `--no-verify`、CLAUDE.md 紅線）。

---

## < 200 字摘要

Pattern 1 很可能 audit stale（現況就是 `is_super_admin()`、不是 USING:true）、先查證真偽再決定動不動。Pattern 2 和 3 是純防守增強、零代碼風險、先做當熱身。Pattern 4 最大、要加 `workspace_id` 欄、回填用 JOIN employees 可 100% 還原、RLS 4 policy 全重寫、同時需改 `permission-overrides/route.ts` PUT 的 INSERT payload 加 workspace_id、type-gen regenerate、migration 和 code 必須同 PR 同時上。順序：2 → 3 → 1 → 4。Rollback 都 < 3 分鐘、Pattern 4 復原可重跑 backfill 不丟資料。守門必跑 `login-api.spec.ts`（紅線）+ 新增 `permission-overrides.spec.ts`（跨租戶 + admin-only CRUD 各三情境）。
