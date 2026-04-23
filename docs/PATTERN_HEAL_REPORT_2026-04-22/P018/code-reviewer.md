# P018 修法審查報告 — Code Reviewer

**審查人格**：Code Reviewer
**審查對象**：P018 統一修法草案（employee_permission_overrides 加 workspace_id + 重寫 4 policy + route.ts PUT INSERT 補 workspace_id + getServerAuth）
**審查時機**：senior-developer.md 尚未落稿、本審查基於 pattern-map 給的修法綱領 + 現有程式碼事實提前寫「審查 checklist」、待草案落稿後逐條對表
**紅線**：本 pattern 的範圍是 P018（DB + route.ts PUT 的 INSERT 欄位）；**P022**（route.ts 整支無 getServerAuth / 無 isAdmin / 無 target.workspace_id 驗證）**不在今天範圍**

---

## 總評（TL;DR）

以 P010 為範本、P018 做法方向正確、但有 **6 個 blocker / 4 個 suggestion** 要在草案成形前回覆清楚、否則落地會踩雷。

**最大風險**：① 3-stage migration 的「中間狀態期」（nullable 已加但 backfill 未完 / policy 已重寫但 NOT NULL 未加）怎麼跟 code deploy 順序對齊、② FK 是 `ON DELETE RESTRICT` 所以 backfill 不會有 orphan、但 workspace_id IS NULL 的 employees 會讓 backfill 漏網、③ **senior-dev 若照 pattern-map 的「統一修法」把 getServerAuth 補進 route.ts、那是跨進 P022 的工作 — 要擋**。

---

## 逐項審查（對應使用者 9 題）

### 1. 🔴 Migration atomicity — 3-stage 不能真原子、要明示部署分段

**問題**：pattern-map 寫「3-stage migration」但沒說清楚是**同一個 migration 檔 3 個 BEGIN**還是**3 個分開的 migration 檔**。

**實務**：
- `ADD COLUMN workspace_id uuid NULL` 與 `UPDATE ... SET workspace_id = FROM employees` 可以放**同一個 BEGIN/COMMIT**（零停機、DDL+DML 同交易、Postgres 支援）。
- `ALTER COLUMN workspace_id SET NOT NULL` + 重寫 4 policy 則**必須等 code PR 先 deploy** — 否則舊 code 的 PUT INSERT 沒送 workspace_id 進來、新 NOT NULL 直接 500。
- 建議草案寫成**兩個 migration 檔**：
  - `migration_A`：add column nullable + backfill + 驗 0 rows NULL（DO block RAISE EXCEPTION if count > 0）
  - `migration_B`（等 code deploy 完才跑）：SET NOT NULL + DROP 舊 4 policy + CREATE 5 新 policy（含 service_role）

**若草案把所有事情塞一個 migration**：🔴 blocker — 跟 code deploy 無法解耦、上線當下會有幾秒內 PUT 全炸的窗口。

**回滾**：migration_A 若 backfill 失敗、RAISE EXCEPTION 自動 rollback ADD COLUMN（同交易）— OK。migration_B 若 policy 有錯、DROP COLUMN 不行（已有資料），需要另寫 `rollback.sql` 把 policy 退回舊 USING:true（不能 NOT NULL 退回 NULL，但可以退回 policy）。草案要附 rollback 腳本。

### 2. 🔴 Backfill 邏輯 — orphan 不會有、但 NULL workspace 會漏網

**事實**：`wave6_batch6_cascade_to_restrict.sql`（2026-04-21 applied）把 FK 改成 **ON DELETE RESTRICT**、意味著資料層**不可能存在 employee_id 指向已刪員工**（employees 本身採 soft-delete `is_active=false`，row 還在）。

**結論**：
- orphan override 不會出現、`UPDATE FROM employees INNER JOIN` **不會漏任何已存在 row**（前提：FK RESTRICT 生效中、沒有歷史髒資料繞過 FK 插進來）。
- 但：**若 employees 表有 `workspace_id IS NULL` 的 row**（理論上不該、實務可能有），對應 override row backfill 後仍 NULL → migration_B 的 `SET NOT NULL` 會直接炸。

**建議**（比照 P010 的 STEP 0 預檢樣板）：
```sql
DO $$
DECLARE v_orphan int; v_null_ws int;
BEGIN
  SELECT count(*) INTO v_orphan
  FROM employee_permission_overrides epo
  LEFT JOIN employees e ON e.id = epo.employee_id
  WHERE e.id IS NULL;

  SELECT count(*) INTO v_null_ws
  FROM employee_permission_overrides epo
  JOIN employees e ON e.id = epo.employee_id
  WHERE e.workspace_id IS NULL;

  IF v_orphan > 0 THEN RAISE EXCEPTION 'Abort: % orphan overrides', v_orphan; END IF;
  IF v_null_ws > 0 THEN RAISE EXCEPTION 'Abort: % overrides point to NULL-workspace employees', v_null_ws; END IF;
END $$;
```
**若草案沒有預檢 DO block**：🔴 blocker — 跟 P010 範本對不齊、上線當下才發現髒資料太晚。

### 3. 🔴 Policy 邊界 — UPDATE 必須 USING + WITH CHECK 雙寫、service_role 例外必補

**事實**（P010 範本 line 103-119 明示）：UPDATE policy **只寫 USING 不寫 WITH CHECK = 有人可以把 row 的 workspace_id UPDATE 成別家 workspace**、繞過隔離（水平提權變種）。

**必檢查草案的 4 條新 policy**：
- [ ] SELECT：USING（workspace_id = get_current_user_workspace()）— 單邊 OK
- [ ] INSERT：WITH CHECK（workspace_id = get_current_user_workspace()）— 單邊 OK
- [ ] UPDATE：**USING + WITH CHECK 兩邊都要** — 缺一 = 🔴 blocker
- [ ] DELETE：USING 單邊 OK
- [ ] **第 5 條 service_role policy**：`FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role')` — **必須有**、否則 validate-login 用 admin client 讀 overrides 會被 policy 擋（雖然 service_role 本應 bypass RLS、但只有 RLS 沒 FORCE 時才 bypass；若有人誤加 FORCE、service_role 會被鎖）。P010 這條有、P018 必須一樣。

**is_super_admin 例外**：tour_itinerary_days 範本有 `OR is_super_admin()`、P010 沒加（因為 role_tab_permissions 沒 cross-workspace 管理需求）。**employee_permission_overrides 也沒有 cross-workspace 管理需求 → 不加 is_super_admin 更安全**。若草案加了、要說明為什麼。

### 4. 🔴 部署順序 — code PR 必先於 migration_B

**正確順序**：
1. migration_A deploy（workspace_id nullable + backfill + 預檢）— 此時 policy 仍是 USING:true、code 仍是舊版、一切運作如常。
2. code PR deploy（route.ts PUT INSERT 補 workspace_id: auth.data.workspaceId）— 此時 PUT INSERT 會開始寫 workspace_id、policy 還沒收緊不影響。
3. migration_B deploy（SET NOT NULL + 4 policy 改寫 + service_role policy）— 此時 code 已送正確 workspace_id、policy 收緊也能 pass。

**反過來會怎樣**：
- 若 migration_B 先 deploy、code 還沒上 → 舊 code PUT INSERT 沒送 workspace_id → NOT NULL 違反 → 500 error、PUT 全死。
- 若 code 先 deploy、migration_A 還沒上 → code 送 workspace_id 但欄位不存在 → Supabase client error（unknown column）→ PUT 全死。

**建議草案明示 deploy runbook**、不能只丟兩個檔案給 devops。

### 5. 🟡 validate-login 影響 — 用 service_role + 新 service_role policy = OK

**驗證**：`validate-login/route.ts` 用 `getSupabaseAdminClient()`（service_role key）讀 overrides。

- 若新 policy 裡**有**第 5 條 service_role policy（`FOR ALL USING auth.role()='service_role'`）→ admin client 100% 通過、無影響。
- 若新 policy **沒有**第 5 條 + 表沒 FORCE RLS → service_role 仍 bypass RLS（Supabase 預設行為）、無影響。
- 若新 policy 沒有第 5 條 + 有人誤加 FORCE RLS → 炸。⚠️ CLAUDE.md 紅線：workspaces 禁止 FORCE、但 employee_permission_overrides 的 FORCE 狀態未知、草案要在 migration_B STEP 2 明示 `NO FORCE ROW LEVEL SECURITY`（比照 P010 line 60）。

**additional check**：`validate-login` 查 override 後會把 `grant` 加進 permSet、`revoke` 移除。若 overrides 表有 workspace_id 不對的 row（理論上 policy 會擋、但 service_role 會拿到）→ 可能把別家 workspace 的 override 套到這家員工身上。**但因為 WHERE 是 `.eq('employee_id', employee.id)`、而 employee 已經是 `.eq('workspace_id', workspace.id)` 鎖過、transitively 不會跨租戶**。OK。

### 6. 🔴 permissions/check 影響 — backfill 跟 policy 切換之間有空窗

**情境**：migration_A 已跑但還沒跑到 migration_B（幾小時到幾天之間）：
- 此時 policy 還是 USING:true、cookie session SELECT 照舊看得到任何 row（**仍有 P018 漏洞**、這段時間不安全）。
- migration_B 一跑 → policy 立刻收緊為 `workspace_id = get_current_user_workspace()`。
- 如果 backfill 某些 row 漏掉（e.g. 稍後 INSERT 但 code 還沒 deploy、workspace_id 是 NULL）→ policy 判斷 `NULL = <uuid>` = NULL → 被過濾掉（SQL NULL 語義）→ permissions/check 拿不到這些 override → **使用者權限錯誤**（該 grant 的沒 grant、該 revoke 的沒 revoke）。

**但：** migration_B 有 SET NOT NULL、同交易先檢查 NULL 為 0、所以進 migration_B 的瞬間不會有 NULL row。**真正的風險是 migration_A → code deploy 中間的 PUT INSERT**（因為這段時間新 code 還沒上、舊 code INSERT 不帶 workspace_id → nullable 接受 → 產生 NULL row → migration_B 的 NOT NULL 檢查失敗）。

**解**（部署順序題、回到 #4）：code PR 必**先於** migration_B、**晚於** migration_A 也沒關係（因為欄位 nullable、舊 code 不送也不會炸）。若部署順序不對、會在 migration_B 那一步 `RAISE EXCEPTION 'Abort: N NULL workspace_id rows'` — 至少會被擋住、不會上線後炸。**建議 migration_B 第一步重跑 STEP 0 預檢**（不要只在 migration_A 跑）。

### 7. 🔴 PUT handler 的 DELETE — 新 policy 下 delete 會**看到 0 row**（預期行為）

**程式碼**（route.ts:51-54）：
```ts
await supabase.from('employee_permission_overrides').delete().eq('employee_id', employeeId)
```

- 舊 policy USING:true → 任何 employeeId 的 overrides 都刪得掉（跨租戶漏洞）。
- 新 policy USING:`workspace_id = get_current_user_workspace()` → 只刪自家 workspace 的、別家 workspace 的刪不到（**這是正確行為**）。

**但有 bug 情境**：backfill 漏網、某些 row 的 workspace_id 是 NULL → 新 policy 下 NULL ≠ current_workspace → **自己人的 override 刪不掉**、但 INSERT 會重新塞一批新的（帶正確 workspace_id）→ 舊 NULL row 永遠留著、變孤兒、未來套 override 時會有雙重記錄。

**解**：migration_A 的 STEP 0 預檢已經擋住 NULL、只要預檢有寫對、這情境不會發生。但若 senior-dev 省略預檢 → 會變幽靈 bug、很難 debug。

**另一面**：草案若把 route.ts 的 DELETE 加上 `.eq('workspace_id', auth.data.workspaceId)` → 那是**跨進 P022 的工作**、屬於應用層雙重防禦、今天不做。🔴 注意這一點、若 senior-dev 順手加了、請退回。

### 8. 🟡 測試覆蓋 — e2e 守門必加、建議 2 個 spec

**必加**：
- `tests/e2e/permission-overrides-tenant-isolation.spec.ts` — 建 2 個 workspace A/B、各建 admin + employee、A admin 嘗試 PUT `/api/employees/<B 的 employeeId>/permission-overrides` → 預期：policy 擋、INSERT 回 0 rows 或 error、PUT response 成功但 DB 無 row（因為 policy 讓 DELETE 刪 0 row + INSERT 因 WITH CHECK 失敗）。

- 簡化版：直接在 DB 用 A 的 JWT 做 `INSERT INTO employee_permission_overrides (employee_id, workspace_id, ...) VALUES (<B 員工>, <B workspace>, ...)` → 預期 policy 擋、回 42501 或 0 rows affected。

**建議**：
- `tests/e2e/permission-overrides-detector.spec.ts` — 跑 detector 的 SQL（`SELECT count(*) FROM pg_policies WHERE tablename='employee_permission_overrides' AND (qual='true' OR with_check='true')`）、assert 0 筆。

**守門優先級**：第 1 個（租戶隔離 e2e）是 🟡 應該加、第 2 個（detector spec）🟡 nice to have（因為 `npm run check:patterns P018` 會跑）。

### 9. 🟡 邊界條件 — 空陣列與跨租戶攻擊

- **空 overrides 陣列**：`overrides.filter(...).length === 0` → 不 INSERT、直接 return success。修法不改這邏輯 → 無影響。
- **跨租戶攻擊（payload 層）**：攻擊者 PUT `/api/employees/<B 公司員工>/permission-overrides` body `{ overrides: [{ module: 'admin', override_type: 'grant' }] }`：
  - DELETE 階段：policy 擋、0 rows deleted（原本 B 的 overrides 安全）。
  - INSERT 階段：`workspace_id: auth.data.workspaceId`（A 的 workspace）+ `employee_id: <B 員工>` → WITH CHECK `workspace_id = get_current_user_workspace()` pass（**是 A 的 workspace、通過**）→ **row 被寫進去了、workspace_id=A、employee_id=B 員工**。
  - 然後 B 員工登入、validate-login 用 `.eq('employee_id', employee.id)` 撈 overrides、拿到這條 workspace_id=A 的 row → permSet 加了 admin → **B 員工取得 系統主管權限**。

**⚠️ 這是 P018 修法的漏洞**：P018 只驗 `workspace_id = 當前 user workspace`、沒驗 `employee_id 屬於當前 user workspace`。修 P018 沒修掉這個。

**要不要擋？**：
- 這個攻擊的真正守門是 P022（應用層驗 `target employee.workspace_id === auth.data.workspaceId`）、**不是 P018 的工作**。
- 但若 pattern-map 宣稱「P018 修完等於關上跨租戶提權」是不正確的 — **P018 只修一半、另一半要 P022 補**。
- 建議草案在最後加「known gap」段落、明說「P018 migration 不擋 employee_id 跨租戶、那個由 P022 處理」、讓 William 知道這個 CRITICAL 今天只修一半。

**或者更好**：加第 2 條 INSERT WITH CHECK 子句：
```sql
WITH CHECK (
  workspace_id = get_current_user_workspace()
  AND employee_id IN (SELECT id FROM employees WHERE workspace_id = get_current_user_workspace())
)
```
這是 DB 層的雙保險、跟 P022（應用層）不衝突、且在 P018 修法範圍內（仍然是這張表的 policy）。**建議 senior-dev 採這個版本**。

---

## Surgical Changes 檢查（跨範圍警告）

- 🔴 若 senior-dev 在 route.ts 加 `getServerAuth` / `requireTenantAdmin` / `isAdmin` 檢查 → **跨 P022**、退回
- 🔴 若 senior-dev 順手把 route.ts 的 GET / DELETE 也加 `.eq('workspace_id', ...)` → **跨 P022**、退回
- 🟢 route.ts 的 PUT INSERT 補 `workspace_id: auth.data.workspaceId` → 在 P018 範圍（因為 DB 欄位新增、code 不補會炸）、OK
- 🟢 但為了拿 `auth.data.workspaceId`、route.ts PUT 勢必要引入 `getServerAuth()` — **這一點會跨 P022 邊界**、senior-dev 必須想清楚：
  - 選項 A（純 P018）：改用 `getCurrentWorkspaceId()`（api-client.ts line 61）— 已存在、只拿 workspace_id、不帶 isAdmin 驗證、不跨 P022
  - 選項 B（順手 P022）：用 `getServerAuth()` 拿完整 auth、但**只用 workspaceId 不驗 isAdmin**、isAdmin 驗證留給 P022

**建議採選項 A** — 完全守住範圍、P022 要改時再從 `getCurrentWorkspaceId()` 升級到 `getServerAuth()` + isAdmin 檢查、心智負擔小。

---

## Blocker / Suggestion 總表

### 🔴 Blockers（修法落稿前必解）
1. Migration 必須拆兩檔（A: add+backfill、B: NOT NULL+policy）、明示 deploy runbook
2. 比照 P010 加 STEP 0 預檢 DO block（orphan + NULL workspace）
3. UPDATE policy 必須 USING + WITH CHECK 雙寫、避免 workspace_id 被改跨租戶
4. 必須加第 5 條 service_role policy（FOR ALL + auth.role()='service_role'）+ migration_B 明示 NO FORCE RLS
5. route.ts PUT 補 workspace_id 時、優先用 `getCurrentWorkspaceId()`（選項 A）、不跨進 P022
6. 草案必明示「P018 不擋 employee_id 跨租戶、那個歸 P022」；或在 INSERT WITH CHECK 加 `AND employee_id IN (...)` 雙重保險

### 🟡 Suggestions（應該做）
1. 加 e2e spec `permission-overrides-tenant-isolation.spec.ts`（跨租戶攻擊）
2. migration_B STEP 0 重跑 NULL workspace_id 預檢（不要只在 migration_A 跑）
3. 附 rollback.sql（把 policy 退回、但欄位不動）
4. Not-add `is_super_admin()` OR 子句（沒跨 workspace 管理需求）

### 💭 Nits
1. Policy COMMENT 文字可加「P018 fix: ...」方便未來考古
2. `check:patterns P018` detector 可加 qual/with_check 兩個欄位都驗

---

## 若草案已滿足以上、審查通過；若有遺漏、退回 senior-dev 補稿

**下游**：main chair 彙整後、翻 Corner 話給 William 點頭；William 點頭後才動代碼。
