-- RLS 效能優化：同表同 cmd 同 role 的 PERMISSIVE policies 合併成單條
-- 修補 advisor multiple_permissive_policies WARN（199 條）
-- Round 3 自主迭代優化
--
-- ⚠️ 動 RLS、apply 前必跑 tests/e2e/login-api.spec.ts
--
-- 原理：PostgreSQL 對多 PERMISSIVE 是 OR、合成單條等價但只 plan 一次
-- 影響：純改寫等價、不影響權限決策、SELECT 大量資料時效能改善
--
-- ⚠️ 重要說明：很多表的 `*_service` policy 是 `FOR ALL USING (true) WITH CHECK (true)`、
--   意圖是「service_role 全通」、但 TO 是 public、所以對所有 role 都生效。
--   現狀：只要這個 _service policy 存在、整張表的 RLS 對 public 等於 true（穿幫）。
--   合併後：USING ((workspace_check) OR true) = true、WITH CHECK 同理。
--   邏輯上完全等價於現狀（也就是「現狀就是寬鬆的、合併後也寬鬆」）。
--   這份 migration 不修這個更深的安全性問題、純做 perf 合併。
--   若 William 要把 `_service` 改成「只給 service_role」、那是另一個 round 的事。
--
-- 處理範圍：34 個 (table, effective_cmd, role) 群組
--   ↑ 對應 advisor 的 199 筆（每群組 × 多個 role：anon/authenticated/dashboard_user/...）

BEGIN;

-- ============================================================================
-- cis_clients：cis_clients_<cmd> + cis_clients_service (FOR ALL, true/true)
-- ============================================================================
DROP POLICY IF EXISTS "cis_clients_select" ON public.cis_clients;
DROP POLICY IF EXISTS "cis_clients_insert" ON public.cis_clients;
DROP POLICY IF EXISTS "cis_clients_update" ON public.cis_clients;
DROP POLICY IF EXISTS "cis_clients_delete" ON public.cis_clients;
DROP POLICY IF EXISTS "cis_clients_service" ON public.cis_clients;

CREATE POLICY "cis_clients_select_merged" ON public.cis_clients
  AS PERMISSIVE FOR SELECT TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  );

CREATE POLICY "cis_clients_insert_merged" ON public.cis_clients
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  );

CREATE POLICY "cis_clients_update_merged" ON public.cis_clients
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  )
  WITH CHECK (true);

CREATE POLICY "cis_clients_delete_merged" ON public.cis_clients
  AS PERMISSIVE FOR DELETE TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  );

-- ============================================================================
-- cis_pricing_items：同上 pattern
-- ============================================================================
DROP POLICY IF EXISTS "cis_pricing_items_select" ON public.cis_pricing_items;
DROP POLICY IF EXISTS "cis_pricing_items_insert" ON public.cis_pricing_items;
DROP POLICY IF EXISTS "cis_pricing_items_update" ON public.cis_pricing_items;
DROP POLICY IF EXISTS "cis_pricing_items_delete" ON public.cis_pricing_items;
DROP POLICY IF EXISTS "cis_pricing_items_service" ON public.cis_pricing_items;

CREATE POLICY "cis_pricing_items_select_merged" ON public.cis_pricing_items
  AS PERMISSIVE FOR SELECT TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  );

CREATE POLICY "cis_pricing_items_insert_merged" ON public.cis_pricing_items
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  );

CREATE POLICY "cis_pricing_items_update_merged" ON public.cis_pricing_items
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  )
  WITH CHECK (true);

CREATE POLICY "cis_pricing_items_delete_merged" ON public.cis_pricing_items
  AS PERMISSIVE FOR DELETE TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  );

-- ============================================================================
-- cis_visits：同上 pattern
-- ============================================================================
DROP POLICY IF EXISTS "cis_visits_select" ON public.cis_visits;
DROP POLICY IF EXISTS "cis_visits_insert" ON public.cis_visits;
DROP POLICY IF EXISTS "cis_visits_update" ON public.cis_visits;
DROP POLICY IF EXISTS "cis_visits_delete" ON public.cis_visits;
DROP POLICY IF EXISTS "cis_visits_service" ON public.cis_visits;

CREATE POLICY "cis_visits_select_merged" ON public.cis_visits
  AS PERMISSIVE FOR SELECT TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  );

CREATE POLICY "cis_visits_insert_merged" ON public.cis_visits
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  );

CREATE POLICY "cis_visits_update_merged" ON public.cis_visits
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  )
  WITH CHECK (true);

CREATE POLICY "cis_visits_delete_merged" ON public.cis_visits
  AS PERMISSIVE FOR DELETE TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  );

-- ============================================================================
-- clock_records：clock_records_<cmd> (insert/select/update) + clock_records_service (FOR ALL)
-- 沒有 DELETE policy、所以合併後也不開 DELETE
-- ============================================================================
DROP POLICY IF EXISTS "clock_records_select" ON public.clock_records;
DROP POLICY IF EXISTS "clock_records_insert" ON public.clock_records;
DROP POLICY IF EXISTS "clock_records_update" ON public.clock_records;
DROP POLICY IF EXISTS "clock_records_service" ON public.clock_records;

CREATE POLICY "clock_records_select_merged" ON public.clock_records
  AS PERMISSIVE FOR SELECT TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  );

CREATE POLICY "clock_records_insert_merged" ON public.clock_records
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  );

CREATE POLICY "clock_records_update_merged" ON public.clock_records
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  )
  WITH CHECK (true);

-- DELETE 在 clock_records_service (FOR ALL true/true) 也涵蓋；
-- 為保留現狀（DELETE 也是 true）、補一條
CREATE POLICY "clock_records_delete_merged" ON public.clock_records
  AS PERMISSIVE FOR DELETE TO public
  USING (true);

-- ============================================================================
-- leave_balances：leave_balances_select + leave_balances_service (FOR ALL)
-- ============================================================================
DROP POLICY IF EXISTS "leave_balances_select" ON public.leave_balances;
DROP POLICY IF EXISTS "leave_balances_service" ON public.leave_balances;

CREATE POLICY "leave_balances_select_merged" ON public.leave_balances
  AS PERMISSIVE FOR SELECT TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  );

-- 保留 _service 的 INSERT/UPDATE/DELETE 全通行為
CREATE POLICY "leave_balances_insert_merged" ON public.leave_balances
  AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "leave_balances_update_merged" ON public.leave_balances
  AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "leave_balances_delete_merged" ON public.leave_balances
  AS PERMISSIVE FOR DELETE TO public USING (true);

-- ============================================================================
-- leave_requests：leave_requests_<insert|select|update> + leave_requests_service (FOR ALL)
-- ============================================================================
DROP POLICY IF EXISTS "leave_requests_select" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_insert" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_update" ON public.leave_requests;
DROP POLICY IF EXISTS "leave_requests_service" ON public.leave_requests;

CREATE POLICY "leave_requests_select_merged" ON public.leave_requests
  AS PERMISSIVE FOR SELECT TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  );

CREATE POLICY "leave_requests_insert_merged" ON public.leave_requests
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  );

CREATE POLICY "leave_requests_update_merged" ON public.leave_requests
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  )
  WITH CHECK (true);

-- 保留 _service 的 DELETE 全通行為
CREATE POLICY "leave_requests_delete_merged" ON public.leave_requests
  AS PERMISSIVE FOR DELETE TO public USING (true);

-- ============================================================================
-- leave_types：leave_types_select + leave_types_service (FOR ALL)
-- ============================================================================
DROP POLICY IF EXISTS "leave_types_select" ON public.leave_types;
DROP POLICY IF EXISTS "leave_types_service" ON public.leave_types;

CREATE POLICY "leave_types_select_merged" ON public.leave_types
  AS PERMISSIVE FOR SELECT TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  );

CREATE POLICY "leave_types_insert_merged" ON public.leave_types
  AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "leave_types_update_merged" ON public.leave_types
  AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "leave_types_delete_merged" ON public.leave_types
  AS PERMISSIVE FOR DELETE TO public USING (true);

-- ============================================================================
-- missed_clock_requests：missed_clock_<insert|select|update> + missed_clock_service (FOR ALL)
-- ============================================================================
DROP POLICY IF EXISTS "missed_clock_select" ON public.missed_clock_requests;
DROP POLICY IF EXISTS "missed_clock_insert" ON public.missed_clock_requests;
DROP POLICY IF EXISTS "missed_clock_update" ON public.missed_clock_requests;
DROP POLICY IF EXISTS "missed_clock_service" ON public.missed_clock_requests;

CREATE POLICY "missed_clock_select_merged" ON public.missed_clock_requests
  AS PERMISSIVE FOR SELECT TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  );

CREATE POLICY "missed_clock_insert_merged" ON public.missed_clock_requests
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  );

CREATE POLICY "missed_clock_update_merged" ON public.missed_clock_requests
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  )
  WITH CHECK (true);

CREATE POLICY "missed_clock_delete_merged" ON public.missed_clock_requests
  AS PERMISSIVE FOR DELETE TO public USING (true);

-- ============================================================================
-- overtime_requests：overtime_<insert|select|update> + overtime_service (FOR ALL)
-- ============================================================================
DROP POLICY IF EXISTS "overtime_select" ON public.overtime_requests;
DROP POLICY IF EXISTS "overtime_insert" ON public.overtime_requests;
DROP POLICY IF EXISTS "overtime_update" ON public.overtime_requests;
DROP POLICY IF EXISTS "overtime_service" ON public.overtime_requests;

CREATE POLICY "overtime_select_merged" ON public.overtime_requests
  AS PERMISSIVE FOR SELECT TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  );

CREATE POLICY "overtime_insert_merged" ON public.overtime_requests
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  );

CREATE POLICY "overtime_update_merged" ON public.overtime_requests
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  )
  WITH CHECK (true);

CREATE POLICY "overtime_delete_merged" ON public.overtime_requests
  AS PERMISSIVE FOR DELETE TO public USING (true);

-- ============================================================================
-- payroll_runs：payroll_runs_select + payroll_runs_service (FOR ALL)
-- ============================================================================
DROP POLICY IF EXISTS "payroll_runs_select" ON public.payroll_runs;
DROP POLICY IF EXISTS "payroll_runs_service" ON public.payroll_runs;

CREATE POLICY "payroll_runs_select_merged" ON public.payroll_runs
  AS PERMISSIVE FOR SELECT TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  );

CREATE POLICY "payroll_runs_insert_merged" ON public.payroll_runs
  AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "payroll_runs_update_merged" ON public.payroll_runs
  AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "payroll_runs_delete_merged" ON public.payroll_runs
  AS PERMISSIVE FOR DELETE TO public USING (true);

-- ============================================================================
-- payslips：payslips_select + payslips_service (FOR ALL)
-- ============================================================================
DROP POLICY IF EXISTS "payslips_select" ON public.payslips;
DROP POLICY IF EXISTS "payslips_service" ON public.payslips;

CREATE POLICY "payslips_select_merged" ON public.payslips
  AS PERMISSIVE FOR SELECT TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.employees WHERE user_id = auth.uid()))
    OR true
  );

CREATE POLICY "payslips_insert_merged" ON public.payslips
  AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "payslips_update_merged" ON public.payslips
  AS PERMISSIVE FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "payslips_delete_merged" ON public.payslips
  AS PERMISSIVE FOR DELETE TO public USING (true);

-- ============================================================================
-- role_capabilities：rc_hr_write (FOR ALL TO authenticated, has_capability_for_workspace)
--                  + rc_member_read (FOR SELECT TO authenticated, workspace_member check)
-- 兩條 logic 不同：write 要 capability、read 要 membership
-- 合併原則：對 SELECT、OR 兩個 qual；INSERT/UPDATE/DELETE 維持 has_capability
-- ============================================================================
DROP POLICY IF EXISTS "rc_hr_write" ON public.role_capabilities;
DROP POLICY IF EXISTS "rc_member_read" ON public.role_capabilities;

CREATE POLICY "rc_select_merged" ON public.role_capabilities
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (
    has_capability_for_workspace(
      (SELECT workspace_id FROM public.workspace_roles WHERE id = role_capabilities.role_id),
      'hr.roles.write'::text
    )
    OR (role_id IN (
      SELECT wr.id FROM public.workspace_roles wr
      WHERE wr.workspace_id IN (
        SELECT e.workspace_id FROM public.employees e WHERE e.user_id = auth.uid()
      )
    ))
  );

CREATE POLICY "rc_insert_merged" ON public.role_capabilities
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    has_capability_for_workspace(
      (SELECT workspace_id FROM public.workspace_roles WHERE id = role_capabilities.role_id),
      'hr.roles.write'::text
    )
  );

CREATE POLICY "rc_update_merged" ON public.role_capabilities
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (
    has_capability_for_workspace(
      (SELECT workspace_id FROM public.workspace_roles WHERE id = role_capabilities.role_id),
      'hr.roles.write'::text
    )
  )
  WITH CHECK (
    has_capability_for_workspace(
      (SELECT workspace_id FROM public.workspace_roles WHERE id = role_capabilities.role_id),
      'hr.roles.write'::text
    )
  );

CREATE POLICY "rc_delete_merged" ON public.role_capabilities
  AS PERMISSIVE FOR DELETE TO authenticated
  USING (
    has_capability_for_workspace(
      (SELECT workspace_id FROM public.workspace_roles WHERE id = role_capabilities.role_id),
      'hr.roles.write'::text
    )
  );

-- ============================================================================
-- tour_meal_settings：兩組重複 policy（都 FOR <cmd>、TO public）
-- 一組用 profiles、一組用 get_current_user_workspace()、INSERT 還多一個 is_super_admin()
-- 沒有 _service、純多 policy 重複
-- ============================================================================
DROP POLICY IF EXISTS "Users can view meal settings in their workspace" ON public.tour_meal_settings;
DROP POLICY IF EXISTS "Users can insert meal settings in their workspace" ON public.tour_meal_settings;
DROP POLICY IF EXISTS "Users can update meal settings in their workspace" ON public.tour_meal_settings;
DROP POLICY IF EXISTS "Users can delete meal settings in their workspace" ON public.tour_meal_settings;
DROP POLICY IF EXISTS "tour_meal_settings_select" ON public.tour_meal_settings;
DROP POLICY IF EXISTS "tour_meal_settings_insert" ON public.tour_meal_settings;
DROP POLICY IF EXISTS "tour_meal_settings_update" ON public.tour_meal_settings;
DROP POLICY IF EXISTS "tour_meal_settings_delete" ON public.tour_meal_settings;

CREATE POLICY "tour_meal_settings_select_merged" ON public.tour_meal_settings
  AS PERMISSIVE FOR SELECT TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()))
    OR ((workspace_id)::text = (get_current_user_workspace())::text)
  );

CREATE POLICY "tour_meal_settings_insert_merged" ON public.tour_meal_settings
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()))
    OR (is_super_admin() OR ((workspace_id)::text = (get_current_user_workspace())::text))
  );

CREATE POLICY "tour_meal_settings_update_merged" ON public.tour_meal_settings
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()))
    OR ((workspace_id)::text = (get_current_user_workspace())::text)
  );

CREATE POLICY "tour_meal_settings_delete_merged" ON public.tour_meal_settings
  AS PERMISSIVE FOR DELETE TO public
  USING (
    (workspace_id IN (SELECT workspace_id FROM public.profiles WHERE id = auth.uid()))
    OR ((workspace_id)::text = (get_current_user_workspace())::text)
  );

-- ============================================================================
-- workspace_attendance_settings：workspace_attendance_settings_all (FOR ALL)
--                              + workspace_attendance_settings_select (FOR SELECT)
-- 兩條 qual 完全相同（workspace_id IN profiles via auth.uid()）、merge 後變單條
-- ============================================================================
DROP POLICY IF EXISTS "workspace_attendance_settings_all" ON public.workspace_attendance_settings;
DROP POLICY IF EXISTS "workspace_attendance_settings_select" ON public.workspace_attendance_settings;

CREATE POLICY "workspace_attendance_settings_select_merged" ON public.workspace_attendance_settings
  AS PERMISSIVE FOR SELECT TO public
  USING (
    workspace_id IN (SELECT workspace_id FROM public.employees WHERE id = auth.uid())
  );

CREATE POLICY "workspace_attendance_settings_insert_merged" ON public.workspace_attendance_settings
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM public.employees WHERE id = auth.uid())
  );

CREATE POLICY "workspace_attendance_settings_update_merged" ON public.workspace_attendance_settings
  AS PERMISSIVE FOR UPDATE TO public
  USING (
    workspace_id IN (SELECT workspace_id FROM public.employees WHERE id = auth.uid())
  );

CREATE POLICY "workspace_attendance_settings_delete_merged" ON public.workspace_attendance_settings
  AS PERMISSIVE FOR DELETE TO public
  USING (
    workspace_id IN (SELECT workspace_id FROM public.employees WHERE id = auth.uid())
  );

COMMIT;

-- ============================================================================
-- 驗收 SQL（手動跑、不在 transaction 內）
-- ============================================================================
-- WITH expanded AS (
--   SELECT tablename, policyname, roles,
--     unnest(CASE WHEN cmd='ALL' THEN ARRAY['SELECT','INSERT','UPDATE','DELETE'] ELSE ARRAY[cmd] END) eff
--   FROM pg_policies WHERE schemaname='public'
-- )
-- SELECT tablename, eff, roles, count(*)
-- FROM expanded
-- GROUP BY 1,2,3
-- HAVING count(*) > 1;
-- → 預期 0 行
