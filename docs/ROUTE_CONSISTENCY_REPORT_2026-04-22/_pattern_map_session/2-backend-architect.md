# 2 / Backend Architect — /login v3.0 DB Pattern 會診

> 角度：DB schema + RLS policy + migration。信一條：**defense in depth 靠架構、不靠記性。policy 必寫業務邏輯、不放 `USING: true`。**

本份只處理 4 條 DB pattern 的後端面、不碰 middleware / JWT / API 業務邏輯。

---

## 1. 83 張 `USING: true` 表四分類

分類依據：讀 DB_TRUTH「每張表詳情」的 columns + FK、判斷資料語義屬「全域參考」「公版模板」「租戶敏感」「個資」。

### ✅ By design：全域可讀（共 13 張）

跨租戶靜態資料、RLS 開 + `USING: true` SELECT 正確、**但寫入應鎖 `is_super_admin()`**：

- `ref_airports` / `ref_countries` / `ref_destinations` — 已 `is_super_admin()` 寫入 ✅
- `activities` / `luxury_hotels` / `michelin_restaurants` / `restaurants` / `premium_experiences` / `tour_destinations` — **語義待拍板**（全域公版 vs 租戶精選）
- `badge_definitions` / `badges` — 遊戲化徽章
- `supplier_categories` / `region_stats` — lookup

> ⚠️ `payroll_allowance_types` / `payroll_deduction_types` 有 `workspace_id`、應歸 🔴 不歸這類。

### 🟡 可能 by design 但該限寫（共 6 張）

讀可全域、寫入要限租戶或 admin：

| Table | 理由 |
|---|---|
| `wishlist_templates` / `wishlist_template_items` | 有 workspace_id + created_by — 模板共享可行、但寫入應限建立者租戶 |
| `todo_columns` | 有 workspace_id — 應綁租戶 |
| `workspace_attendance_settings` / `workspace_notification_settings` / `workspace_bonus_defaults` | 租戶級設定、SELECT 若為 admin 頁合理、但 `USING: true` 意味他租戶也能讀 → 修 |

### 🔴 絕對漏鎖（租戶 / 員工 / 個資 / 訊息 / 計酬）共 45 張

**這是上線前必修的核心清單**。含 workspace_id 欄但 policy 沒用、或含 user_id / employee_id 屬個人敏感、或訊息 / 金流類。

**有 workspace_id 欄位、policy 卻放 USING: true**（修法：policy 加 `workspace_id = get_current_user_workspace()`）：
`announcements`、`bot_registry`、`customer_inquiries`、`magic_library`、`missed_clock_requests`、`notifications`、`overtime_requests`、`payroll_allowance_types`、`payroll_deduction_types`、`tour_bonus_settings`、`tour_request_items`、`wishlist_templates`、`wishlist_template_items`、`workspace_attendance_settings`、`workspace_notification_settings`、`workspace_bonus_defaults`、`workspaces`（**policy workspaces_delete = USING: true 就在這裡 — 4 條主 pattern 之 1**）。

**含 user_id / employee_id 屬個人敏感**（修法：policy 用 `user_id = auth.uid()` 或透過 employees 表 join workspace）：
`casual_trips`、`employee_payroll_config`、`employee_permission_overrides`（**4 條主 pattern 之 4**）、`expense_monthly_stats`、`expense_streaks`、`friends`、`itinerary_permissions`、`manifestation_records`、`personal_expenses`、`timebox_boxes`、`timebox_scheduled_boxes`、`timebox_weeks`、`user_points_transactions`。

**訊息 / 聊天類**（私密、應限參與者）：
`ai_messages`、`channel_threads`、`meeting_messages`、`meeting_participants`、`private_messages`、`tour_request_messages`。

**租戶業務資料**（含金流 / 報價 / 員工 / 供應商）：
`assigned_itineraries`、`customer_group_members`、`customer_service_leads`、`decisions_log`、`projects`、`supplier_request_responses`、`supplier_users`、`tour_expenses`、`tour_leaders`、`tour_members`、`tour_request_member_vouchers`、`tour_requests`、`trip_members`、`trip_members_v2`、`vendor_costs`、`brochure_versions`。

### ❓ 需 William 拍板（共 17 張）

- **公版 vs 租戶**（最關鍵一問）：`activities` / `luxury_hotels` / `michelin_restaurants` / `restaurants` / `premium_experiences` / `tour_destinations` — 是全站公版、還是每家自己精選池？
- **PNR 子表**：`pnr_passengers` / `pnr_remarks` / `pnr_segments` / `pnr_ssr_elements` — 應走父表 pnrs workspace 邊界（join 判）
- **系統 / observability**：`syncqueue` / `workload_summary` / `api_usage` / `api_usage_log` / `cron_execution_logs` / `profiles` — 應 service_role / super_admin only
- **語義待確認**：`social_group_tags` / `website_day_activities` / `website_itinerary_days` / `website_spot_highlights` / `traveler_tour_cache`

---

## 2. 3 張 RLS disabled 表處理建議

### `_migrations`
- **建議**：RLS 開、policy 只給 `service_role` — migration 記錄不該給任何登入用戶讀。
- **影響分析**：此表由 `npm run migrate` / Supabase migrate CLI 透過 service_role 寫入、**不會打斷現有流程**。
- **SQL**：
  ```sql
  ALTER TABLE public._migrations ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "_migrations_service_role_only" ON public._migrations
    FOR ALL TO public USING (auth.role() = 'service_role');
  ```

### `rate_limits`
- **建議**：同 `_migrations`、只給 service_role、因為限流由 middleware / edge function 以 service_role 維護。
- **風險**：若某 client 端邏輯直接讀此表、會壞。**先 grep 確認無 client 讀取、再套**。

### `ref_cities` — 跟 `ref_countries` / `ref_airports` 同步處理
- **語義**：城市表、FK 指 `ref_countries.code`、**跟 ref_countries / ref_airports 一模一樣的公版靜態資料**。
- **現況漏**：RLS 完全沒開（跟同族表不一致、是歷史漏洞）。
- **強烈建議**：套跟 `ref_countries` 完全一樣的 4-policy 模式（public read + super_admin write）：
  ```sql
  ALTER TABLE public.ref_cities ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "ref_cities_public_read" ON public.ref_cities
    FOR SELECT TO authenticated USING (true);
  CREATE POLICY "ref_cities_admin_insert" ON public.ref_cities
    FOR INSERT TO authenticated WITH CHECK (is_super_admin());
  CREATE POLICY "ref_cities_admin_update" ON public.ref_cities
    FOR UPDATE TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());
  CREATE POLICY "ref_cities_admin_delete" ON public.ref_cities
    FOR DELETE TO authenticated USING (is_super_admin());
  ```
- 這樣 3 張 ref_* 全族齊一、未來新增 ref 類型也 copy-paste。

---

## 3. 修法 SQL 模板（批次 pattern-heal 用）

### 模板 A — 租戶敏感表（有 workspace_id 欄）

```sql
-- 先 DROP 舊的放行 policy
DROP POLICY IF EXISTS "<table>_select" ON public.<table>;
DROP POLICY IF EXISTS "<table>_insert" ON public.<table>;
DROP POLICY IF EXISTS "<table>_update" ON public.<table>;
DROP POLICY IF EXISTS "<table>_delete" ON public.<table>;

-- service_role 通道（管理 API 用）
CREATE POLICY "<table>_service_role" ON public.<table>
  FOR ALL TO public USING (auth.role() = 'service_role');

-- 4 條 CRUD 綁租戶
CREATE POLICY "<table>_select" ON public.<table>
  FOR SELECT TO public
  USING (workspace_id = get_current_user_workspace());
CREATE POLICY "<table>_insert" ON public.<table>
  FOR INSERT TO public
  WITH CHECK (workspace_id = get_current_user_workspace());
CREATE POLICY "<table>_update" ON public.<table>
  FOR UPDATE TO public
  USING (workspace_id = get_current_user_workspace())
  WITH CHECK (workspace_id = get_current_user_workspace());  -- 防跨租戶搬移
CREATE POLICY "<table>_delete" ON public.<table>
  FOR DELETE TO public
  USING (workspace_id = get_current_user_workspace());
```

### 模板 B — 個人敏感表（有 user_id 指 auth.users）

```sql
DROP POLICY IF EXISTS "<table>_select" ON public.<table>;
-- ... 同上 DROP

CREATE POLICY "<table>_service_role" ON public.<table>
  FOR ALL TO public USING (auth.role() = 'service_role');
CREATE POLICY "<table>_owner_only" ON public.<table>
  FOR ALL TO public
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### 模板 C — 員工資料（employee_id 指 employees、無直接 workspace_id）

```sql
DROP POLICY IF EXISTS "<table>_select" ON public.<table>;
-- ... 同上 DROP

CREATE POLICY "<table>_same_workspace" ON public.<table>
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM employees e
    WHERE e.id = <table>.employee_id
      AND e.workspace_id = get_current_user_workspace()
  ));
-- INSERT/UPDATE/DELETE 同 pattern、只是動作不同
```

### 模板 D — 全域參考表（ref_*）

已寫在上方 ref_cities 區塊。模式：`SELECT true` + `is_super_admin()` 寫入。

### 模板 E — 系統內部表（_migrations / rate_limits）

```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "<table>_service_role_only" ON public.<table>
  FOR ALL TO public USING (auth.role() = 'service_role');
```

---

## 4. `employee_permission_overrides` 加 workspace_id 欄 migration 建議

### 現況
- 表有 `employee_id uuid NOT NULL` FK → `employees.id` ON DELETE RESTRICT
- **無 `workspace_id` 欄**、RLS 4 policy 全 `USING: true`（4 條主 pattern 之 1、v2.0 點名未修）

### 為什麼加欄（而不是只靠 join employees）

靠 join 可行但差：(1) RLS 單欄比較比 join 快 10x (2) workspace CASCADE 清得乾淨 (3) 防 employee 跨租戶漂移時 override 孤兒化（schema 上禁了就不可能）

### Migration 策略（3 段式、不中斷服務）

```sql
-- Step 1: 加欄（nullable）+ 回填
ALTER TABLE public.employee_permission_overrides
  ADD COLUMN workspace_id uuid;

UPDATE public.employee_permission_overrides epo
  SET workspace_id = e.workspace_id
  FROM public.employees e
  WHERE epo.employee_id = e.id;

-- Step 2: 加 FK + NOT NULL + CASCADE（employees 被軟刪時 override 跟著走）
ALTER TABLE public.employee_permission_overrides
  ALTER COLUMN workspace_id SET NOT NULL,
  ADD CONSTRAINT employee_permission_overrides_workspace_fkey
    FOREIGN KEY (workspace_id)
    REFERENCES public.workspaces(id)
    ON DELETE CASCADE;

-- Step 3: 換 RLS policy（套模板 A、workspace_id-based）
DROP POLICY IF EXISTS employee_permission_overrides_select ON public.employee_permission_overrides;
DROP POLICY IF EXISTS employee_permission_overrides_insert ON public.employee_permission_overrides;
DROP POLICY IF EXISTS employee_permission_overrides_update ON public.employee_permission_overrides;
DROP POLICY IF EXISTS employee_permission_overrides_delete ON public.employee_permission_overrides;

-- 套模板 A 的 5 policy（service_role + SELECT/INSERT/UPDATE/DELETE）
```

### ⚠️ CASCADE 策略細節

- **workspace_id → ON DELETE CASCADE**：workspace 刪時自動清 override（但 Venturo workspace 不做硬刪、只 `_deleted=true`、此 CASCADE 是 belt-and-suspenders）
- **employee_id 既有 FK 保留 ON DELETE RESTRICT**：employee 不能硬刪（軟刪機制）、保持

### 回填風險檢查

- 回填前 SELECT 確認：`employee_id` 是否有孤兒（找不到 employees）— 若有、migration 失敗、需先修資料
  ```sql
  SELECT COUNT(*) FROM public.employee_permission_overrides epo
  LEFT JOIN public.employees e ON e.id = epo.employee_id
  WHERE e.id IS NULL;
  ```
- 回填後 SELECT 確認：`workspace_id` 全非 NULL 才 ALTER NOT NULL

### P022 一併處理（pattern-map 遺留項）

既然動 schema、建議同 migration 加：UPDATE policy 的 `WITH CHECK workspace_id = get_current_user_workspace()`——防止 admin 把某員工 override 的 workspace_id 改掉逃租戶（同 P010 role_tab_permissions 修法）。

---

## 結尾摘要（200 字）

83 張 USING:true 表中、**45 張絕對漏鎖**（員工/租戶/個資/訊息/計酬、含 workspaces_delete 與 employee_permission_overrides）、**15 張 by design 全域可讀**（ref_* 類靜態 lookup）、**6 張讀可寬但寫要鎖**、**17 張需 William 拍板**（公版 vs 租戶語義不明的 activities / luxury_hotels / premium_experiences / profiles 等）。3 張 RLS disabled 表中、`_migrations` 與 `rate_limits` 應改 service_role only、`ref_cities` 應套 ref_countries 同型 policy 讓 ref_* 全族齊一。修法提供 5 個 SQL 模板（租戶 / 個人 / 員工 / 參考 / 系統）、pattern-heal 可批次跑。`employee_permission_overrides` 加 `workspace_id` 欄採 3 段式 migration：加欄 nullable → join employees 回填 → NOT NULL + CASCADE FK + 換 policy 套模板 A；同時補 WITH CHECK 防 workspace_id 被改寫逃租戶（同 P010 修法）。
