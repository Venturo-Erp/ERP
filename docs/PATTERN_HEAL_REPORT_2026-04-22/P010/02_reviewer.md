# P010 Reviewer 審查報告

## 身份宣告

我是 **Code Reviewer**。任務是挑錯、不是重寫。對 senior-dev 假設中的 migration 草案（把 `role_tab_permissions` 4 條 policy 的 `qual/with_check=true` 改成 `EXISTS(workspace_roles.workspace_id = get_current_user_workspace())` 聯查）做挑剔審查。

整體印象：**方向對、但細節有 3 個 blocker 不處理會破壞登入或雜亂**。以下 7 點由嚴重到次要。

---

## 審查意見

### 1. Policy 邏輯漏洞

**觀察**：
- 聯查的 `workspace_roles` 本身已有 RLS（`workspace_id = get_current_user_workspace()`、`enabled` 但 **未 FORCE**）。Postgres RLS subquery 會繼承當前角色 context、**不會 infinite recursion**（policy 內 SELECT 時 planner 會把 subquery 的 RLS 當成 predicate 套上）。但這造成雙重 predicate：`role_tab_permissions.role_id` 對到的 `workspace_roles` row 若跨 workspace、會先被 `workspace_roles_select` 擋、`EXISTS` 回 false。邏輯結果正確、**效能多一層**（PG 多數情境會 merge、但大量 row 時注意 index）。
- **孤兒 row**：FK 是 `RESTRICT`（`wave6_batch5_cascade_to_restrict.sql:60-63`）、不可能出現 role_id 指向已刪 workspace_role 的 row。但如果歷史資料在 FK 變 RESTRICT 前就存在孤兒、新 policy 會讓這些 row 對任何人都不可見（EXISTS 回 false）、等於「軟隱藏」—— 先跑 `SELECT count(*) FROM role_tab_permissions rtp WHERE NOT EXISTS (SELECT 1 FROM workspace_roles wr WHERE wr.id = rtp.role_id)` 確認孤兒數、再決定。
- **INSERT 的 USING vs WITH CHECK**：senior-dev 草案如果 INSERT 寫 `USING`（應該用 `WITH CHECK`）、會炸 syntax error 或 silently 無效。UPDATE 需要 **兩個** 條件：`USING`（讀取舊 row）+ `WITH CHECK`（驗證新 row）。若只寫 USING、惡意使用者 UPDATE 時把 `role_id` 改到別家 workspace 的 role 也會過、造成跨租戶污染。**這是 blocker**。

**風險等級**：🔴 Blocker（UPDATE 缺 WITH CHECK）/ 🟡 Suggestion（孤兒預檢）

**建議修正**：
- UPDATE policy 必須同時寫 `USING (EXISTS...)` 與 `WITH CHECK (EXISTS...)`、且兩者條件**一致**。
- INSERT 只寫 `WITH CHECK`、不寫 `USING`。
- Migration 前加一段 `DO $$ ... RAISE NOTICE 孤兒數 ... $$;`、有孤兒就中止。

---

### 2. JWT 時間差

**觀察**：
- `get_current_user_workspace()` 我沒讀到定義（migrations 只看到使用、沒看到 CREATE FUNCTION），從命名和行為推測：**從 JWT claims 讀 workspace_id**（Supabase 常見做法）。
- 情境：User 今日 09:00 被 admin 移出 workspace X（`employees.workspace_id` 改成 null 或 Y）、但他的 JWT 在 10:00 才會 refresh。這段 1 hr 內：
  - `get_current_user_workspace()` 回 **JWT 裡的舊 X**（不是 DB 最新值）。
  - 新 policy 下、他還能讀 X 的 `role_tab_permissions`。
- **不一致風險**：前端 UI 用 `useAuthStore.currentUser.workspace_id`（從 DB/API 讀）顯示 Y、但 DB 查詢用 JWT 的 X。使用者看到 Y 的頁面、但 permission 資料來自 X → 空結果或亂跳。
- 目前 codebase 其他表（`workspace_roles`、`workspace_selector_fields`、`rich_documents` 等）都有**一樣的問題**、不是 P010 獨有。**不該由 P010 解決**，但要**記在 BACKLOG**。

**風險等級**：🟡 Suggestion（非 P010 scope、但要 log）

**建議修正**：
- P010 migration 內不處理、但在報告明記「JWT 時間差問題已知、影響所有 workspace_id-based RLS、未來走 session invalidation 或短 JWT TTL」。
- 不要趁機改 `get_current_user_workspace()` 函式定義（那是另一個 pattern 的戰場）。

---

### 3. service_role 繞過的覆蓋面

**觀察**（已 Read 確認）：
- `src/app/api/auth/validate-login/route.ts:20` 用 `getSupabaseAdminClient()`（service_role）、`:160-163` 查 `role_tab_permissions`。**service_role 不走 RLS、登入流程不受新 policy 影響**。✅ 安全。
- `src/app/api/tenants/seed-base-data/route.ts:21-37` 也用 `getSupabaseAdminClient()` 查 role_tab_permissions（檢查 tenants 寫入權限）。✅ 同上。
- `src/app/api/roles/[roleId]/tab-permissions/route.ts:20` 用 `createApiClient()`（使用者 JWT、走 RLS）。GET/PUT 都靠 RLS 擋跨租戶。**這是 P010 主戰場**。
  - PUT 的 `.delete().eq('role_id', roleId)`（:52）：新 policy 下、如果傳入的 `roleId` 是別家的 role、DELETE 會靜默 0 rows affected（不報錯、但也不刪）、接著 INSERT 會因 FK + 新 INSERT policy 擋住 → 回 500 錯誤訊息但**不會洩漏資料**。✅ 行為正確。
- `src/app/api/permissions/check/route.ts:13,30` 用 `createApiClient()` 查 `role_tab_permissions`。走 RLS、新 policy 生效後、使用者查自家 role 正常、查別家會回空 → 前端顯示「無權限」。行為合理。

**風險等級**：🟢 Pass（service_role 覆蓋無問題、RLS 客戶端邏輯正確）

**建議修正**：無。但要 **在 migration 跑完後、立刻手動 curl `/api/auth/validate-login`** 驗證登入仍通（因為 CLAUDE.md 紅線：動 RLS policy 必測 login）。

---

### 4. 邊界值

**觀察**：
- `role_tab_permissions.role_id` schema 為 `NOT NULL`（DB_TRUTH:9638）、**不可能為 NULL**。✅ 免處理。
- `workspace_roles.workspace_id` 為 `nullable`（DB_TRUTH:14465）、**可能存在 workspace_id=NULL 的 role**（理論上不該、但 schema 沒擋）。若有此類 role、新 policy `EXISTS(... wr.workspace_id = get_current_user_workspace())` 會對 NULL 比對回 UNKNOWN→false、**這些 role 的 permissions 對所有使用者都不可見**。需預檢：`SELECT count(*) FROM workspace_roles WHERE workspace_id IS NULL`。
- `workspace_roles` **FORCE RLS = false**（DB_TRUTH:14479 只寫 enabled、未 FORCE；wave25 把所有 FORCE 全關）、✅ service_role 聯查不會被 workspace_roles 的 RLS 擋。

**風險等級**：🟡 Suggestion（NULL workspace_id 預檢）

**建議修正**：migration 前跑：
```sql
SELECT id, name, workspace_id FROM workspace_roles WHERE workspace_id IS NULL;
```
有結果就先 patch 資料、再跑 policy migration。

---

### 5. 測試覆蓋

**觀察**（已 Grep 確認）：
- `tests/e2e/login-api.spec.ts` **完全不碰 role_tab_permissions**（grep 無命中）。只測 login 回 200/401。登入流程走 service_role、不受 P010 影響、但**測試不會捕捉到 P010 如果寫壞**。
- `tests/e2e/tab-gating.spec.ts` **也不 grep 到 role_tab_permissions**。這支測試應該是跨 tab 權限、但實作上沒觸到底層表。
- **沒有 role_tab_permissions 的 unit test**（確認 P015 scope、非本次責任）。

**風險等級**：🟡 Suggestion（測試覆蓋空缺、但不擋本次 merge）

**建議最少手動測試**（migration 跑完必須全部過）：
1. `npx playwright test tests/e2e/login-api.spec.ts` 必過（CLAUDE.md 紅線）。
2. 用 User A（workspace X）登入、開 `/settings/roles`、檢查：
   - 看得到 X 的所有 role 的 tab-permissions（GET /api/roles/[X-role-id]/tab-permissions）。
   - **看不到** Y 的 role（直接 GET /api/roles/[Y-role-id]/tab-permissions 應回空 array、不是 500）。
3. PUT /api/roles/[X-role-id]/tab-permissions 修改 tab 權限、重新登入、驗證 UI 權限跟著變。
4. PUT /api/roles/[Y-role-id]/tab-permissions（跨租戶攻擊）→ 應該 0 rows affected + 不影響 Y 的資料。
5. 跑一次完整的 tab-gating.spec.ts 確認 UI gating 沒壞。

---

### 6. Cascade 與下游

**觀察**：
- **FK**：`role_tab_permissions.role_id` → `workspace_roles.id` **ON DELETE RESTRICT**（2026-04-21 wave6 剛從 CASCADE 改成 RESTRICT）。刪 `workspace_role` 時、若有殘留 permissions 會擋、需先手動清 permissions。RLS policy 改動**不影響 FK 行為**。✅
- **Trigger**：DB_TRUTH 對 `role_tab_permissions` 未列任何 trigger（對比 `rich_documents` 有 `trigger_auto_set_workspace_id`）、所以也無 trigger 遞迴風險。
- **View / Function**：grep DB_TRUTH 未見任何 view 用 `role_tab_permissions`。生產代碼只有上述 4 API 路由使用。
- **下游影響**：新 policy 生效後、**所有用 createApiClient 讀 role_tab_permissions 的 API**（`/api/roles/[roleId]/tab-permissions` GET/PUT、`/api/permissions/check`）都會自動開始 RLS 過濾。**這就是我們要的**。

**風險等級**：🟢 Pass

**建議修正**：無。

---

### 7. Rollback 完整性

**觀察**（假設 senior-dev 會提 rollback）：
- Rollback 要能 100% 回到現況：4 條 policy 都是 `USING true` / `WITH CHECK true`、名稱 `role_tab_permissions_{select,insert,update,delete}`。
- 正確 rollback：**DROP 新 policy → CREATE 舊 policy（true）**。不是 `ALTER POLICY`、因為 CREATE 和 ALTER 對於「沒有 FORCE RLS 的 table」行為有細微差。
- 陷阱：如果 senior-dev rollback 只寫 `DROP POLICY ... ; CREATE POLICY ... USING (true);` 漏了 `WITH CHECK (true)`、INSERT policy 會缺 WITH CHECK、行為就不是 100% 回到現況（現況 INSERT 有 `WITH CHECK: true`）。
- 另外、`ROLLBACK` 要是**冪等**的（IF EXISTS）、因為可能跑一半失敗。

**風險等級**：🟡 Suggestion（rollback 須逐條對比現況、每個 USING / WITH CHECK 都要有）

**建議修正**：rollback SQL 必須包含：
```sql
DROP POLICY IF EXISTS role_tab_permissions_select ON role_tab_permissions;
CREATE POLICY role_tab_permissions_select ON role_tab_permissions FOR SELECT USING (true);
DROP POLICY IF EXISTS role_tab_permissions_insert ON role_tab_permissions;
CREATE POLICY role_tab_permissions_insert ON role_tab_permissions FOR INSERT WITH CHECK (true);
-- update 必須兩條：USING (true) + WITH CHECK (true)
-- delete 只要 USING (true)
```
並在 migration 最後加：`SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename='role_tab_permissions'` 做自動 assertion（之前/之後對比）。

---

## 測試計劃（最少該跑什麼）

**必過（擋住 commit）**：
1. `npm run type-check`（CLAUDE.md 紅線）
2. `npx playwright test tests/e2e/login-api.spec.ts`（CLAUDE.md 紅線：動 RLS 必測 login）
3. Migration SQL 跑 dry-run（Supabase CLI `supabase db push --dry-run`）
4. 跨租戶手測 5 步（見第 5 點）
5. Migration 後跑 `gitnexus_detect_changes()`（CLAUDE.md 規定）

**建議跑**：
6. `npx playwright test tests/e2e/tab-gating.spec.ts`
7. 驗證 `/api/permissions/check` 回傳不變（手 curl）

---

## 給 senior-dev 的修改要求

1. 🔴 **UPDATE policy 必須同時有 USING 和 WITH CHECK**、條件一致。
2. 🔴 **INSERT policy 只寫 WITH CHECK**、不寫 USING（避免語法錯）。
3. 🟡 **migration 開頭加 NULL workspace_id 和孤兒 role_id 的預檢 DO 區塊**，有就中止。
4. 🟡 **rollback SQL 必須逐條對比現況**、4 個 policy 的 USING / WITH CHECK 都要完整復原、用 `IF EXISTS`。
5. 🟡 **migration 結尾加 assertion**：`SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename='role_tab_permissions';` dump 結果到 log。
6. 🟡 **不要順便改 `get_current_user_workspace()` 函式**（那是另一個 pattern 的事、Surgical Changes 原則）。
7. 💭 **不要順便刪 `is_super_admin()` 相關殘影**（已 RETURN false、跟 P010 無關）。

---

## 回傳摘要（< 200 字）

Senior-dev 的修法方向正確（EXISTS 聯查 workspace_roles + service_role 不受影響）。3 個 blocker：(A) UPDATE 必須同時寫 USING + WITH CHECK、否則跨租戶 UPDATE 能過；(B) INSERT 只能寫 WITH CHECK；(C) migration 前要預檢 NULL workspace_id 和孤兒 role_id、有就中止。2 個已知死角不在本次 scope 但要 log：JWT 時間差（影響所有 workspace RLS、不只 P010）、e2e 測試完全無覆蓋 role_tab_permissions（P015 再補）。測試最低門檻：type-check + login-api.spec + 手測跨租戶 5 步。Rollback SQL 必須 4 條 policy 逐條對比現況、用 IF EXISTS。
