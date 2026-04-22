## 身份宣告
我是 Venturo ERP 的 Senior Developer，負責產出 P010 `role_tab_permissions` RLS 修復的可執行 migration 草案。

---

## Migration SQL（完整、可直接跑）

檔名：`supabase/migrations/20260422140000_fix_role_tab_permissions_rls.sql`

```sql
-- =========================================================================
-- P010 FIX: role_tab_permissions RLS tenant isolation
--
-- 問題：4 條 policy 全部 USING/WITH CHECK = true，等於沒有租戶隔離。
-- 目標：聯查 workspace_roles，確保 CRUD 只能碰自家 workspace 的 role。
-- 參考：workspace_roles 自己的 RLS（workspace_id = get_current_user_workspace()）
--       employee_route_overrides 的 service_role_manage policy 樣板
-- =========================================================================

BEGIN;

-- -----------------------------------------------------------------------
-- STEP 0: 預檢（reviewer 要求）— 有髒資料就中止、避免合法 UPDATE/INSERT 被新 policy 擋
-- -----------------------------------------------------------------------
DO $$
DECLARE
  v_null_ws_roles int;
  v_orphan_rtp int;
BEGIN
  SELECT count(*) INTO v_null_ws_roles
  FROM public.workspace_roles
  WHERE workspace_id IS NULL;

  SELECT count(*) INTO v_orphan_rtp
  FROM public.role_tab_permissions rtp
  LEFT JOIN public.workspace_roles wr ON wr.id = rtp.role_id
  WHERE wr.id IS NULL;

  IF v_null_ws_roles > 0 THEN
    RAISE EXCEPTION 'Abort: % workspace_roles rows have NULL workspace_id', v_null_ws_roles;
  END IF;

  IF v_orphan_rtp > 0 THEN
    RAISE EXCEPTION 'Abort: % orphan role_tab_permissions rows (role_id not in workspace_roles)', v_orphan_rtp;
  END IF;
END $$;

-- -----------------------------------------------------------------------
-- STEP 1: DROP 舊 4 policy
-- -----------------------------------------------------------------------
DROP POLICY IF EXISTS role_tab_permissions_select ON public.role_tab_permissions;
DROP POLICY IF EXISTS role_tab_permissions_insert ON public.role_tab_permissions;
DROP POLICY IF EXISTS role_tab_permissions_update ON public.role_tab_permissions;
DROP POLICY IF EXISTS role_tab_permissions_delete ON public.role_tab_permissions;

-- 兼容：新 policy 若已存在也先清（repeat-safe）
DROP POLICY IF EXISTS role_tab_permissions_service_role ON public.role_tab_permissions;
DROP POLICY IF EXISTS role_tab_permissions_tenant_select ON public.role_tab_permissions;
DROP POLICY IF EXISTS role_tab_permissions_tenant_insert ON public.role_tab_permissions;
DROP POLICY IF EXISTS role_tab_permissions_tenant_update ON public.role_tab_permissions;
DROP POLICY IF EXISTS role_tab_permissions_tenant_delete ON public.role_tab_permissions;

-- -----------------------------------------------------------------------
-- STEP 2: 確保 RLS 開、FORCE 關（service_role 要能繞）
-- -----------------------------------------------------------------------
ALTER TABLE public.role_tab_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_tab_permissions NO FORCE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------
-- STEP 3: 新 5 policy（service_role + CRUD 各 1）
-- -----------------------------------------------------------------------

-- 3.1 service_role 管道（後端 admin client 用；樣板來自 employee_route_overrides）
CREATE POLICY role_tab_permissions_service_role ON public.role_tab_permissions
  FOR ALL
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

COMMENT ON POLICY role_tab_permissions_service_role ON public.role_tab_permissions IS
  'Service role (backend admin client) can do anything. Mirrors employee_route_overrides.service_role_manage.';

-- 3.2 SELECT：只看自家 workspace 的 role 的 permission
CREATE POLICY role_tab_permissions_tenant_select ON public.role_tab_permissions
  FOR SELECT
  USING (
    role_id IN (
      SELECT id FROM public.workspace_roles
      WHERE workspace_id = public.get_current_user_workspace()
    )
  );

COMMENT ON POLICY role_tab_permissions_tenant_select ON public.role_tab_permissions IS
  'P010 fix: tenant isolation via workspace_roles join. Only sees perms of roles in same workspace.';

-- 3.3 INSERT：只能塞到自家 workspace 的 role（WITH CHECK only，無 USING）
CREATE POLICY role_tab_permissions_tenant_insert ON public.role_tab_permissions
  FOR INSERT
  WITH CHECK (
    role_id IN (
      SELECT id FROM public.workspace_roles
      WHERE workspace_id = public.get_current_user_workspace()
    )
  );

COMMENT ON POLICY role_tab_permissions_tenant_insert ON public.role_tab_permissions IS
  'P010 fix: INSERT only allowed when target role belongs to current user workspace.';

-- 3.4 UPDATE：USING 擋讀取 + WITH CHECK 擋改寫後的狀態（reviewer blocker #1）
--     沒寫 WITH CHECK 會被人把 role_id UPDATE 到別家 workspace 的 role，繞過隔離
CREATE POLICY role_tab_permissions_tenant_update ON public.role_tab_permissions
  FOR UPDATE
  USING (
    role_id IN (
      SELECT id FROM public.workspace_roles
      WHERE workspace_id = public.get_current_user_workspace()
    )
  )
  WITH CHECK (
    role_id IN (
      SELECT id FROM public.workspace_roles
      WHERE workspace_id = public.get_current_user_workspace()
    )
  );

COMMENT ON POLICY role_tab_permissions_tenant_update ON public.role_tab_permissions IS
  'P010 fix: UPDATE requires BOTH USING (read row) AND WITH CHECK (post-update row) in same workspace, so role_id cannot be moved across tenants.';

-- 3.5 DELETE：只能刪自家 workspace 的 role 的 permission
CREATE POLICY role_tab_permissions_tenant_delete ON public.role_tab_permissions
  FOR DELETE
  USING (
    role_id IN (
      SELECT id FROM public.workspace_roles
      WHERE workspace_id = public.get_current_user_workspace()
    )
  );

COMMENT ON POLICY role_tab_permissions_tenant_delete ON public.role_tab_permissions IS
  'P010 fix: DELETE only allowed when target role belongs to current user workspace.';

COMMIT;
```

---

## Rollback SQL（完整、可直接跑）

```sql
-- Rollback P010 migration: restore the original broken 4-policy state.
-- 只在新 policy 造成功能癱瘓時用；資料不會變動。

BEGIN;

DROP POLICY IF EXISTS role_tab_permissions_service_role ON public.role_tab_permissions;
DROP POLICY IF EXISTS role_tab_permissions_tenant_select ON public.role_tab_permissions;
DROP POLICY IF EXISTS role_tab_permissions_tenant_insert ON public.role_tab_permissions;
DROP POLICY IF EXISTS role_tab_permissions_tenant_update ON public.role_tab_permissions;
DROP POLICY IF EXISTS role_tab_permissions_tenant_delete ON public.role_tab_permissions;

CREATE POLICY role_tab_permissions_select ON public.role_tab_permissions
  FOR SELECT USING (true);

CREATE POLICY role_tab_permissions_insert ON public.role_tab_permissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY role_tab_permissions_update ON public.role_tab_permissions
  FOR UPDATE USING (true);

CREATE POLICY role_tab_permissions_delete ON public.role_tab_permissions
  FOR DELETE USING (true);

COMMIT;
```

---

## 邊界問題回答（4 個 client）

| # | 路由 / 位置 | Client | 走 RLS？ | 新 policy 影響 |
|---|---|---|---|---|
| 1 | `api/auth/validate-login/route.ts:20,160-163` | `getSupabaseAdminClient()` | ❌（service_role） | 不受影響，命中 `role_tab_permissions_service_role`，登入照舊 |
| 2 | `api/roles/[roleId]/tab-permissions/route.ts:20,43` | `createApiClient()` | ✅ 走 RLS | **P010 主戰場**；GET/PUT 需 user JWT，`get_current_user_workspace()` 會回該 user 的 workspace；跨租戶查詢會回空陣列（預期行為）|
| 3 | `api/permissions/check/route.ts:13` | `createApiClient()` | ✅ 走 RLS | 跟 #2 同；user 查自己 workspace 的 role 權限 OK；查到別家 role_id 會回空（預期）|
| 4 | `api/tenants/create/route.ts:43,78,483` | `getSupabaseAdminClient()` | ❌（service_role） | line 78 權限檢查、line 483 seed 新租戶 default permissions，全走 service_role policy，不受影響 |

結論：新 RLS **只影響** `createApiClient()` 的前台呼叫（#2、#3），且正是我們要擋的跨租戶存取。後端 admin 流程全數綠燈。

---

## 快速風險評估

1. **P（低）**：`get_current_user_workspace()` 對每行做子查詢；`role_tab_permissions` 列數不大（模組×分頁×角色數），實測前先看 EXPLAIN；必要時加 `CREATE INDEX idx_rtp_role_id ON role_tab_permissions(role_id)`（通常 FK 已自動建）。
2. **P（低）**：若前台有 anon / 未登入路徑呼叫 `role_tab_permissions`，會全部回空（`get_current_user_workspace()` 回 NULL）。現況：reviewer 已確認無 anon 路徑。
3. **P（低）**：`workspace_roles` FORCE RLS = false + 其 SELECT policy 已在正確 workspace 聯查，子查詢不會遞迴卡死。
4. **P（中）**：若 Step 0 預檢中止、代表線上有髒資料（孤兒或 NULL workspace_id），需先人工清理再跑；這是 feature 不是 bug。
5. **P（低）**：測試覆蓋 = 0（reviewer 已驗）。**部署前建議新增** 1 個 e2e（user A 看不到 user B workspace 的 role_tab_permissions），但不在本次 scope。

---

## 回傳摘要

P010 migration 已寫出 `20260422140000_fix_role_tab_permissions_rls.sql`：DROP 舊 4 條 `true` policy → DROP 新 policy（repeat-safe）→ 確保 RLS on / FORCE off → CREATE 5 條新 policy（service_role 1 + CRUD 4，聯查 `workspace_roles.workspace_id = get_current_user_workspace()`）。UPDATE 同時寫 USING + WITH CHECK（防 role_id 跨租戶 UPDATE 繞過）。加了 Step 0 預檢（孤兒 / NULL workspace_id 就中止）。Rollback SQL 可一鍵還原。4 個 API route 邊界：`validate-login` 和 `tenants/create` 用 admin client 不受影響；`roles/[roleId]/tab-permissions` 和 `permissions/check` 用 api client 走新 RLS，就是要擋的目標。沒動任何 .ts / .tsx、沒碰 `workspace_roles` RLS、沒拆 migration、沒加 CHECK constraint。風險 5 項皆低。等 William 點頭後可直接跑。
