# P018 修法草案 — Senior Developer

**日期**：2026-04-22
**Pattern**：`employee_permission_overrides` 缺 `workspace_id` + 4 policy 全 `USING:true`（CWE-269 跨租戶提權）
**本次 scope**：DB schema + 4 policy + `route.ts` PUT INSERT 塞 `workspace_id`
**不做**：P022（同檔整支 0 身份檢查）。報告最後標示殘留。

---

## 1. Migration SQL（`supabase/migrations/20260422190000_fix_P018_employee_permission_overrides.sql`）

```sql
-- ============================================================================
-- P018 修復：employee_permission_overrides 加 workspace_id + 重寫 4 條 RLS policy
-- Date: 2026-04-22
-- Source: docs/SITEMAP/_PATTERN_MAP.md P018
-- ============================================================================
-- 歷史：
--   原表建立時未加 workspace_id、4 條 policy 全 USING (true) / WITH CHECK (true)
--   => 任何 authenticated 員工可對別租戶的 overrides 做 SELECT/INSERT/UPDATE/DELETE
--   => CWE-269 跨租戶提權（改別家公司員工的模組權限）
--
-- 今日修法（2026-04-22） 3-stage：
--   (1) ADD COLUMN workspace_id（先允許 NULL）
--   (2) UPDATE 回填 workspace_id = employees.workspace_id
--   (3) SET NOT NULL + DROP 4 policy + CREATE 4 新 policy（用 get_current_user_workspace()）
--
-- 安全前提（已驗）：
--   - employee_id FK 是 RESTRICT（wave6_batch6 2026-04-21）、刪員工會被擋、
--     不會產生指向已刪員工的孤兒 row。
--   - 本表從未寫資料（check:patterns 顯示 policy 全開代表沒前端真的在寫）、
--     但為保守仍做 backfill。
--
-- 不動：workspaces 表、不 FORCE RLS（CLAUDE.md 紅線）。
-- ============================================================================

BEGIN;

-- Stage 1：加欄位（允許 NULL、先不強制）
ALTER TABLE public.employee_permission_overrides
  ADD COLUMN IF NOT EXISTS workspace_id uuid
  REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Stage 2：回填（從 employee_id 對應到 employees.workspace_id）
UPDATE public.employee_permission_overrides epo
SET workspace_id = e.workspace_id
FROM public.employees e
WHERE epo.employee_id = e.id
  AND epo.workspace_id IS NULL;

-- 驗證：回填後不該有 NULL
DO $$
DECLARE null_count int;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM public.employee_permission_overrides
  WHERE workspace_id IS NULL;

  IF null_count > 0 THEN
    RAISE EXCEPTION 'P018 回填後仍有 % 筆 workspace_id IS NULL（孤兒 row？）', null_count;
  END IF;

  RAISE NOTICE 'P018 Stage 2 完成：workspace_id 全部回填';
END $$;

-- Stage 3a：設 NOT NULL
ALTER TABLE public.employee_permission_overrides
  ALTER COLUMN workspace_id SET NOT NULL;

-- Stage 3b：DROP 4 舊 policy
DROP POLICY IF EXISTS employee_permission_overrides_select
  ON public.employee_permission_overrides;
DROP POLICY IF EXISTS employee_permission_overrides_insert
  ON public.employee_permission_overrides;
DROP POLICY IF EXISTS employee_permission_overrides_update
  ON public.employee_permission_overrides;
DROP POLICY IF EXISTS employee_permission_overrides_delete
  ON public.employee_permission_overrides;

-- Stage 3c：CREATE 4 新 policy（租戶隔離）
CREATE POLICY employee_permission_overrides_select
  ON public.employee_permission_overrides
  FOR SELECT TO public
  USING (workspace_id = public.get_current_user_workspace());

CREATE POLICY employee_permission_overrides_insert
  ON public.employee_permission_overrides
  FOR INSERT TO public
  WITH CHECK (workspace_id = public.get_current_user_workspace());

CREATE POLICY employee_permission_overrides_update
  ON public.employee_permission_overrides
  FOR UPDATE TO public
  USING (workspace_id = public.get_current_user_workspace())
  WITH CHECK (workspace_id = public.get_current_user_workspace());

CREATE POLICY employee_permission_overrides_delete
  ON public.employee_permission_overrides
  FOR DELETE TO public
  USING (workspace_id = public.get_current_user_workspace());

-- 驗證：4 policy 都不是 USING:true / WITH CHECK:true
DO $$
DECLARE
  bad_count int;
BEGIN
  SELECT COUNT(*) INTO bad_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'employee_permission_overrides'
    AND (qual = 'true' OR with_check = 'true');

  IF bad_count > 0 THEN
    RAISE EXCEPTION 'P018 驗證失敗：仍有 % 條 policy 是 USING:true / WITH CHECK:true', bad_count;
  END IF;

  SELECT COUNT(*) INTO bad_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'employee_permission_overrides';

  IF bad_count <> 4 THEN
    RAISE EXCEPTION 'P018 驗證失敗：預期 4 條 policy、實際 %', bad_count;
  END IF;

  RAISE NOTICE 'P018 驗證通過：4 條 policy 全部租戶隔離、0 條 USING:true';
END $$;

COMMIT;
```

---

## 2. `route.ts` PUT handler 修改 diff（最小範圍）

**檔**：`src/app/api/employees/[employeeId]/permission-overrides/route.ts`

```diff
 import { NextRequest, NextResponse } from 'next/server'
 import { createApiClient } from '@/lib/supabase/api-client'
+import { getServerAuth } from '@/lib/auth/server-auth'

 // GET 保持不變（RLS 會自動用 workspace_id 過濾）

 export async function PUT(
   request: NextRequest,
   { params }: { params: Promise<{ employeeId: string }> }
 ) {
   const { employeeId } = await params
+
+  // P018：INSERT 需要 workspace_id、取當前登入者的 workspace
+  const auth = await getServerAuth()
+  if (!auth.success) {
+    return NextResponse.json({ error: auth.error.error }, { status: 401 })
+  }
+
   const supabase = await createApiClient()
   const body = await request.json()
   const { overrides } = body as { overrides: PermissionOverride[] }

   if (!Array.isArray(overrides)) {
     return NextResponse.json({ error: '缺少 overrides 陣列' }, { status: 400 })
   }

-  // 刪除舊的覆寫
+  // 刪除舊的覆寫（RLS 仍會過濾跨租戶）
   await supabase
     .from('employee_permission_overrides' as 'employees')
     .delete()
     .eq('employee_id', employeeId)

   const overridesToInsert = overrides
     .filter(o => o.override_type)
     .map(o => ({
+      workspace_id: auth.data.workspaceId,
       employee_id: employeeId,
       module_code: o.module_code,
       tab_code: o.tab_code,
       override_type: o.override_type,
     }))
```

P018 **不** 做：`getServerAuth` 後比對 target employee 的 workspace（那是 P022）、DELETE 前的身份檢查（P022）、requireTenantAdmin（P022）。

---

## 3. PUT INSERT map 新版

```ts
const overridesToInsert = overrides
  .filter(o => o.override_type)
  .map(o => ({
    workspace_id: auth.data.workspaceId, // 來源：getServerAuth() → employees.workspace_id
    employee_id: employeeId,
    module_code: o.module_code,
    tab_code: o.tab_code,
    override_type: o.override_type,
  }))
```

`workspace_id` 來源：`getServerAuth()` 從 cookie session → `auth.uid()` → `employees` 表的 `workspace_id`。新 RLS `WITH CHECK` 會要求這個值 = `get_current_user_workspace()`、等於要求呼叫者不能跨租戶塞資料、三層防禦（app 帶、RLS 擋、middleware 已驗身份）對齊。

---

## 4. 回填正確性評估

**孤兒風險評估**：`employee_id` FK 從 2026-04-21 wave6_batch6 起是 `ON DELETE RESTRICT`、刪員工會被擋、**理論上不存在** 指向已刪員工的孤兒 row。

**但歷史殘留可能**：wave6 之前是 CASCADE、若早期有員工被刪過、CASCADE 會把 overrides row 也帶走、所以殘餘 row 的 `employee_id` 應都指向存活員工。

**安全網**：Stage 2 回填後若仍有 `workspace_id IS NULL`（代表 `employees` JOIN 不到）、Stage 2 的 DO $$ block 會 RAISE EXCEPTION 讓整個 migration rollback、不會污染 Stage 3。

**William 驗證用 SQL**（migration 前先跑）：

```sql
-- (a) 當前表內 row 數
SELECT COUNT(*) AS total_rows FROM employee_permission_overrides;

-- (b) 孤兒檢測（employee_id 不在 employees 表）
SELECT COUNT(*) AS orphan_rows
FROM employee_permission_overrides epo
LEFT JOIN employees e ON e.id = epo.employee_id
WHERE e.id IS NULL;

-- (c) 回填預演（不寫入）
SELECT COUNT(*) AS will_backfill
FROM employee_permission_overrides epo
JOIN employees e ON e.id = epo.employee_id;
```

預期結果：(a) = (c)、(b) = 0。若 (b) > 0、先決定孤兒 row 處置（建議 DELETE、因為指向已不存在員工、權限覆寫已無意義）再跑 migration。

---

## 5. 部署順序與 atomicity

**關鍵**：code 跟 migration 不能倒序。

- 先 migration、後 code：migration 上去後 PUT INSERT 不帶 `workspace_id`、違反 `NOT NULL`、**PUT 全部 500**。
- 先 code、後 migration：code 上去後 insert payload 多塞一個欄位、但表還沒有該欄位、PostgreSQL 會因為 unknown column 報錯、**PUT 也全部 500**。

**正確順序（單次原子上線）**：

1. William 本地跑驗證 SQL（上節第 4 點 a/b/c）、確認 0 孤兒。
2. 在**同一個 PR / 同一次 deploy** 包 code diff + migration 檔、**一起進 main**。
3. Vercel build 通過 → deploy。
4. 上線後 Supabase Migration 自動套用（或 William 手動 `supabase db push`）。
5. 最短窗口：migration 套用前那幾秒、PUT 仍是舊 policy（USING true）+ 舊 insert（無 workspace_id）、行為一致、不會炸。
6. 套完後：PUT 需 workspace_id + RLS 擋跨租戶、新 code 也帶了、一致。

**不能**：先合 code 讓它等 migration；也不能先手動跑 migration 等 code PR。**綁一起**。

---

## 6. William / safe-tenant-test 驗證 SQL（migration 後）

```sql
-- (1) policy 正確性
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND tablename='employee_permission_overrides'
ORDER BY policyname;
-- 預期：4 條、qual/with_check 都含 get_current_user_workspace()、無 'true'

-- (2) 欄位存在且 NOT NULL
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_schema='public' AND table_name='employee_permission_overrides'
  AND column_name='workspace_id';
-- 預期：1 row、is_nullable='NO'、data_type='uuid'

-- (3) 跨租戶提權實測（safe-tenant-test 沙箱）
--     以 tenant A 員工 session 嘗試 SELECT tenant B 的 override：預期 0 row
--     以 tenant A session INSERT 帶 tenant B 的 workspace_id：預期 RLS 擋
```

---

## 7. 風險點自陳

1. **Super 系統主管 例外**：現行其他表 RLS 常 `OR is_super_admin()`（見 `20260110100000_fix_rls_null_workspace.sql` 慣例）、但本方案**沒加**、因為 pattern-map 規格就是純 `workspace_id =` 且 `is_super_admin()` 已被停用（`20260422170000` 註解）。若未來 擁有平台管理資格的人 需要跨租戶改 override、要另開 admin API 走 service role（同 workspaces 模式）。**目前採極簡**。
2. **`validate-login/route.ts` 用 service_role**、policy 收緊後**不受影響**、行為不變。✅
3. **GET handler `createApiClient`**：policy 從全開改成租戶隔離、跨租戶 GET 從「能拿到」變「0 row」。若目前 UI 有靠這個漏洞看別家員工權限、會顯示空。合理行為、不算 regression。
4. **`createApiClient` 54 caller**：本次不改其簽章、0 影響。
5. **舊 row 回填失敗 rollback**：若 Stage 2 發現孤兒、整個 migration rollback、表維持原狀（仍裸奔）、William 需決定孤兒處置再重跑。非靜默失敗、RAISE EXCEPTION 會中止。✅
6. **P022 仍裸奔**：本 route.ts 整支沒 系統主管 身份檢查、任何員工可改任一員工的 overrides（**同租戶內**）、也沒檢查 target employee 是不是同租戶（跨租戶仍有縫、雖 RLS 會擋 DELETE 生效也會擋 INSERT、但 PUT 回 `success: true` 誤導）。**P022 下一輪處理**。

---

**P018 修完後殘留警告**：`/api/employees/[employeeId]/permission-overrides` 整支 handler 仍無 `requireTenantAdmin` / 無 target employee workspace 一致性驗證 / GET 也沒驗身份。RLS 是最後防線、擋住跨租戶資料外洩、但應用層仍裸奔。P022 需另行處理、scope 含：(a) GET/PUT 加 `requireTenantAdmin`、(b) PUT 前驗 `target employee.workspace_id === auth.data.workspaceId`、(c) audit log。
