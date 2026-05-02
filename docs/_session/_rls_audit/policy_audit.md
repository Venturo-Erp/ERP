# RLS Policy Audit Report
> 2026-05-02 / D1 全表 RLS 全面 audit / 純 read / 不改任何東西

## 統計總覽

- public schema 表總數：**110**
- RLS 開啟：**105**
- RLS 未開啟：**5**（皆為 `ref_*` 對照表、見 Class A）
- public schema 全部 policy 數：**376**
- 有問題的 policy（落入 Class B–F）：詳下
- 完全合規（符合憲法 Section 5 三 policy 標準）：**0** ← 全站沒有任何業務表用 `has_capability_for_workspace` 守 read/write

**最大宏觀發現**：
1. `is_super_admin()` 函數已停用、永遠 `RETURN false`（DB 確認）。意味全站 **69 條 policy** 引用 `is_super_admin()` 作 platform admin 繞過、實際全部失效。
2. **沒有任何業務表用 `has_capability_for_workspace`**（憲法 Section 5 規定）。只有 `role_capabilities.rc_hr_write` 一條孤例使用、且檢查的是它自己的 `hr.roles.write` capability。
3. **0 條 policy reference `role_tab_permissions`**（Class D 清空、好消息）。
4. 多數業務表用 `workspace_id = get_current_user_workspace()`（單租戶 ID 比對）取代 `has_capability_for_workspace`、安全性夠但偏離憲法、且因 admin 後門失效造成平台管理員被自己鎖死。

---

## Class A — 業務表沒開 RLS（CRITICAL）

僅 5 張表沒開 RLS、全為 `ref_*` 對照表、屬可豁免範圍。

| 表 | rows | 性質 | 評估 |
|---|---|---|---|
| `ref_airlines` | 59 | 全站航空公司對照 | 可豁免（純參考、無敏感）|
| `ref_airports` | 6075 | IATA 機場對照 | 可豁免 |
| `ref_booking_classes` | -1 | 艙等代號 | 可豁免 |
| `ref_ssr_codes` | 60 | SSR 服務代號 | 可豁免 |
| `ref_status_codes` | -1 | 狀態代號 | 可豁免 |

**結論**：Class A **無 CRITICAL 級違規**。但 `cron_heartbeats` 與 `webhook_idempotency_keys` 兩表 **RLS enabled 但 0 policy** —— 因 RLS 預設 deny、實質完全鎖死（service_role 仍可繞），可接受但反映 policy 設計遺漏、見「異常與發現」。

---

## Class B — Policy 沒 workspace_id filter（CRITICAL）

排除 INSERT（多在 `with_check` 已守 workspace_id）、僅列 SELECT/UPDATE/DELETE/ALL。**真正高風險（業務表）以粗體標示**。

### B1. 業務表 — 任何登入用戶可跨租戶讀取（高優先處理）

| 表.policy | cmd | using_clause | 風險 |
|---|---|---|---|
| **`accounting_transactions.accounting_transactions_authenticated`** | ALL | `auth.role() = 'authenticated'` | 任何登入用戶看全租戶會計交易 |
| **`advance_items.advance_items_authenticated`** | ALL | `auth.role() = 'authenticated'` | 預付單明細跨租戶可見/可寫 |
| **`advance_lists.advance_lists_authenticated`** | ALL | `auth.role() = 'authenticated'` | 預付單主表跨租戶可見/可寫 |
| **`cost_templates.cost_templates_authenticated`** | ALL | `auth.role() = 'authenticated'` | 成本範本跨租戶 |
| **`expense_categories.expense_categories_authenticated_access`** | ALL | `auth.role() = 'authenticated'` | 費用類別跨租戶 |
| **`hotels.hotels_authenticated`** | ALL | `auth.role() = 'authenticated'` | 飯店資料庫跨租戶（474 列） |
| **`michelin_restaurants.michelin_restaurants_*`**（select/update/delete）| 三條 | `true` | 米其林資料跨租戶（26 列） |
| **`premium_experiences.premium_experiences_*`**（select/update/delete）| 三條 | `true` | 高端體驗跨租戶（80 列） |
| **`restaurants.restaurants_*`**（select/update/delete）| 三條 | `true` | 餐廳跨租戶（265 列） |
| **`shared_order_lists.shared_order_lists_authenticated`** | ALL | `auth.role() = 'authenticated'` | 共享訂單清單跨租戶 |
| **`supplier_categories.supplier_categories_*`**（select/update/delete）| 三條 | `true` | 供應商分類跨租戶 |
| **`tasks.tasks_*`**（select/update/delete）| 三條 | `true` | 任務跨租戶（無 workspace_id 守門） |
| **`todo_columns.todo_columns_workspace_access`** | ALL | `true` | Todo 欄位跨租戶 |
| **`tour_custom_cost_fields.tour_custom_cost_fields_authenticated`** | ALL | `auth.role() = 'authenticated'` | 行程自訂成本欄位跨租戶 |
| **`tour_departure_data.tour_departure_data_authenticated`** | ALL | `auth.role() = 'authenticated'` | 行程出發資料跨租戶 |
| **`tour_destinations.tour_destinations_*`**（select/update/delete）| 三條 | `true` | 跨租戶 |
| **`tour_leaders.tour_leaders_*`**（select/update/delete）| 三條 | `true`/`auth.role` | 領隊資料跨租戶 |
| **`tour_member_fields.tour_member_fields_authenticated`** | ALL | `auth.role() = 'authenticated'` | 行程團員自訂欄位跨租戶 |
| **`vendor_costs.vendor_costs_*`**（select/update/delete）| 三條 | `true` | 供應商成本跨租戶 |

合計 **19 張業務表** policy 缺 workspace_id filter、**CRITICAL**。

### B2. accounting_accounts —— 改用 `user_id = auth.uid()`（屬個人資料、可疑）

| 表.policy | cmd | using_clause |
|---|---|---|
| `accounting_accounts.accounting_accounts_select/update/delete` | 三條 | `user_id = auth.uid()` |

不是按 workspace 守、是按個人。可能是個人理財表設計、需確認業務語意。如果是組織會計表、屬 CRITICAL；如果是員工個人記帳、可接受。

### B3. 系統表（合理 / 可接受）

`_migrations`、`rate_limits`（service_role only）、`api_usage`、`cron_execution_logs`、`notifications.notifications_select_own/update_own`（按 recipient_id）、`user_preferences`（按 user_id）、`workspaces`（按 id = get_current_user_workspace、設計上正確）、`messages.Allow members to read messages`（用 channel_members EXISTS、間接守 workspace_id、頻道模組已凍結）。

---

## Class C — service_role 繞過漏洞（CRITICAL）

僅 3 條 policy 顯式用 `auth.role() = 'service_role'`：

| 表.policy | cmd | 評估 |
|---|---|---|
| `_migrations._migrations_service_role_only` | ALL | OK、系統表用 admin client 讀寫 |
| `rate_limits.rate_limits_service_role_only` | ALL | OK、純後端 |
| `workspaces.workspaces_delete` | DELETE | OK、刪租戶必須走 service_role |

**結論**：Class C **無漏洞**。沒有用 `auth.jwt() ->> 'role'` 之類 JWT-claim 比對（容易被偽造）的繞過邏輯。

---

## Class D — Reference 已砍 `role_tab_permissions`（HIGH）

**全部 376 條 policy 掃過、0 條 reference `role_tab_permissions`**。

```
jq | grep role_tab_permissions → 0 hits
```

**結論**：D-class 漏洞 **完全清空**。`role_tab_permissions` 已 DROP、policy 也都遷移完成。**這是好消息**。

---

## Class E — Capability code 不存在（HIGH）

**只有 1 條 policy 用 `has_capability_for_workspace`**：

| 表.policy | capability_code | 存在於 role_capabilities？ |
|---|---|---|
| `role_capabilities.rc_hr_write` | `hr.roles.write` | ✅ 存在（5 個 role 啟用） |

**結論**：Class E **無不存在的 capability**。

但**反向發現**（更嚴重）：**全站只有這一條 policy 用 capability 守門**。憲法 Section 5 規定「每張業務表必有 `tenant_read` 用 `has_capability_for_workspace(_, '{module}.read')`」、實況**完全沒有任何業務表落實**。所有業務表用 `workspace_id = get_current_user_workspace()` 取代——能擋跨租戶、但無法擋同租戶內不該有 read 權限的員工。

---

## Class F — 缺 platform_admin 繞過（MEDIUM → 升級為 CRITICAL）

### F1. 形式上「有」繞過（69 policy）但實際失效

`is_super_admin()` 在 DB 內已被改成 `RETURN false`（已驗證、見 raw dump）：

```sql
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $function$ BEGIN
  -- 已停用：所有使用者統一靠 workspace_id RLS 過濾
  -- 租戶管理頁面使用 service role API 繞過 RLS
  RETURN false;
END; $function$
```

意涵：

- **69 條 policy** 寫 `OR is_super_admin()` 或 `USING is_super_admin()`、實際永遠 false
- 純靠 service-role API 才能管平台 → **如果哪個平台管理頁忘記用 admin client、就會被自己 RLS 鎖死**
- 業務上「平台管理員一般登入後沒法看任何租戶資料」（被工作區 RLS 擋）—— 跟憲法「platform_admin_all 繞過租戶隔離」直接矛盾

### F2. 純粹缺 platform_admin 繞過的表

| 表 | 現狀 |
|---|---|
| 所有 Class B1 列出的 19 張業務表 | 連 `is_super_admin()` 都沒寫、純按 `auth.role()` 或 `true`、形式上沒守 platform admin |
| `workspaces.workspaces_select/update` | 純按 `id = get_current_user_workspace()`、平台管理員無法繞、**且 `workspaces.workspaces_insert` 寫 `is_super_admin()` = 永遠擋**——意味**沒人能用 SQL 直接 INSERT workspace**、必須走 service-role API |
| `ref_airports/ref_cities/ref_countries/ref_destinations` admin write | 用 `is_super_admin()` = 永遠擋、**ref 對照表透過 RLS 唯讀公開、寫入只能走 service_role**（可接受） |

---

## 偏離憲法三 policy 標準的表

憲法要求每張業務表 3 條 policy（`platform_admin_all` + `tenant_read` + `tenant_write`）+ capability 守 read/write。

**結論：0 張業務表完全符合**。多數表的偏離模式：

| 偏離模式 | 表數量（含業務 + 系統） | 範例 |
|---|---|---|
| 4 條 policy（拆 select/insert/update/delete、用 workspace_id 等值 + `is_super_admin()` 失效繞過、但無 capability）| ~80 | `tours`、`orders`、`customers`、`receipts`、`payment_requests`、`employees`、`quotes`、`journal_vouchers` 等主要業務表 |
| 1 條 ALL 用 `auth.role() = 'authenticated'`（Class B 嚴重） | 11 | `accounting_transactions`、`advance_items`、`hotels` 等 |
| 4 條按 user_id（個人化）| 1+ | `accounting_accounts`（B2 待確認） |
| 4–6 條混合（含舊 deprecated policy 並列）| 數張 | `itineraries`（同時有 `auth.uid IS NOT NULL` 跟 `workspace_id = ...`）、`messages`（同時有 channel_members EXISTS 跟 workspace_id）|
| 偏離 `has_capability_for_workspace` 標準 | **109 張中 108 張** | 全站只 `role_capabilities.rc_hr_write` 一條符合 |

---

## 修復建議優先順序

### P0 — Class B1 業務表立即補 workspace_id filter（CRITICAL）

19 張表上線前必修。建議方式：DROP 既有 `*_authenticated` / `*_select=true` policy、改用 4 條按 `workspace_id = get_current_user_workspace()` 標準。
受影響：`accounting_transactions`、`advance_items`、`advance_lists`、`cost_templates`、`expense_categories`、`hotels`、`michelin_restaurants`、`premium_experiences`、`restaurants`、`shared_order_lists`、`supplier_categories`、`tasks`、`todo_columns`、`tour_custom_cost_fields`、`tour_departure_data`、`tour_destinations`、`tour_leaders`、`tour_member_fields`、`vendor_costs`。

### P1 — 修復 platform_admin 繞過（CRITICAL）

選擇一條路：
- (A) 重新實作 `is_super_admin()`（從 `auth.jwt()` 或 employees.is_platform_admin 查），並把所有 platform admin 操作從 service-role API 收回到一般 client。
- (B) **保留 `is_super_admin() RETURN false`、明文宣告「平台管理只走 service-role API、不允許從 RLS 繞過」**、但要把 69 條 policy 內的 `OR is_super_admin()` 全部刪掉（已知失效、製造誤解）。

### P2 — 業務表全面遷往 `has_capability_for_workspace`（HIGH）

憲法 Section 5 要求。當前 100+ 張業務表全偏離。建議分模組分批：先 hr → finance → tours → 其他。每張業務表收斂到三標準 policy：
```
platform_admin_all  (FOR ALL, TO authenticated, USING ...)
tenant_read  (FOR SELECT, USING has_capability_for_workspace(workspace_id, '{module}.read'))
tenant_write (FOR ALL,    USING has_capability_for_workspace(workspace_id, '{module}.write'))
```

### P3 — 確認 `accounting_accounts` 業務語意（MEDIUM）

決定是「組織會計帳」（必須改 workspace_id）還是「員工個人記帳」（保留 user_id）。

### P4 — 清掉 `itineraries` / `messages` / `knowledge_base` 殘留 policy（LOW）

舊 policy（`Authenticated users can ...`、`Allow channel members to ...`）跟新 policy 並存、行為衝突可能漏出資料。建議統一刪除舊版。

### P5 — has_capability_for_workspace 自身的 user_id 比對風險（驗證）

函數用 `e.user_id = auth.uid()` 但 `get_current_user_workspace()` 同時查 `e.id = auth.uid() OR e.supabase_user_id = auth.uid()`、且 `employees` 表 16 列中只有 3 列 `user_id` 不為 NULL、13 列 `supabase_user_id` 不為 NULL。**意味即使開始用 has_capability_for_workspace、對 13/16 員工會永遠 false、capability 永遠拒**。修法：把 `e.user_id` 改成跟 `get_current_user_workspace` 同樣的多 ID 查找。

---

## 異常與發現

1. **`cron_heartbeats` / `webhook_idempotency_keys`**：RLS enabled 但 0 policy。對 anon/authenticated 完全鎖死、只 service_role 能讀寫。可接受但反映 policy 設計遺漏。
2. **`workspaces.workspaces_insert` 用 `is_super_admin()`** = 永遠擋、純靠 service-role 開租戶。跟 CLAUDE.md 紅線「不准 FORCE RLS」配合下、目前是 RLS 開、insert 透過 admin client API、**符合不准 FORCE RLS 的紅線**。
3. **`itineraries` 表 5 條 policy**：含一條 deprecated `Authenticated users can insert itineraries` (USING `auth.uid IS NOT NULL`) 跟新 `itineraries_insert` (USING `is_super_admin OR workspace_id = ...`) 並存。新舊並存的 INSERT policy 是 **OR 關係**、所以 deprecated 那條讓**任何登入用戶能 INSERT 任何 workspace_id 的 itinerary**——CRITICAL、列入 P0。
4. **`messages` 表**：類似情況、deprecated `Allow channel members to insert messages` (with_check 用 channel_members EXISTS) 跟 `messages_insert` (用 workspace_id) 並存、且模組已凍結（CLAUDE.md 第 10 條）、**但 RLS 殘留 = 凍結模組仍能寫**、應 DROP 或統一鎖死。
5. **`knowledge_base` 4 條 policy 用 `profiles.workspace_id`**（不是 employees）：跟全站不一致、profiles 表自身 RLS 用 `workspace_id = get_current_user_workspace()` 串起來算可用、但偏離標準。
6. **`tour_meal_settings` 8 條 policy**（最多）：值得單獨 audit 是否多套並存。
7. 整體看：ERP RLS 是「半成品」階段——主要業務表大部分有 workspace_id 守門（不至於跨租戶外洩）、但完全沒按憲法 capability-based 落地、且 platform admin 繞過實質失效。距離 venturo-app 等級乾淨還有一個 P2 級重構距離。
