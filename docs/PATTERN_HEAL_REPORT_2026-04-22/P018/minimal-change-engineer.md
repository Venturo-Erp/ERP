# P018 Surgical 守門報告 — Minimal Change Engineer

**我的立場**：只動 P018（employee_permission_overrides 四條 USING:true + 缺 workspace_id）要動的、其他一律推回。P022（route.ts 0 守門）**今天不修**、是紅線。

---

## 1. 逐條自問

### Q1. 這個改動可不可以再小？

可以、分兩個層面討論：

- **Migration**：加欄 + backfill + 重寫 4 policy 這三步、每步都是必要的。下面 Q2 有替代方案對比。
- **route.ts PUT**：`insert` 裡補 `workspace_id` 一行就夠、**不需要引 `getServerAuth`**（那是 P022 的事）。見 Q3。

### Q2. Migration 一定要加欄位嗎？policy 靠 JOIN employees 不就夠？

兩方案客觀比：

| 項 | A. 加 workspace_id 欄（統一修法） | B. policy 純 JOIN employees |
|---|---|---|
| Schema 動 | 加欄 + backfill + NOT NULL | **不動** |
| 4 policy 重寫 | `workspace_id = get_current_user_workspace()` | `EXISTS(SELECT 1 FROM employees e WHERE e.id = employee_id AND e.workspace_id = get_current_user_workspace())` |
| route.ts PUT | `insert` 加一行 `workspace_id` | **不動**（純 DB） |
| 代碼 diff | migration + 1 行 | migration |
| RLS 每行 overhead | index scan on `idx_employee_permission_overrides.workspace_id`（之後可建）| 每行 JOIN employees（已有 PK index、仍比同表欄位多一次 lookup）|
| 資料一致性 | workspace_id 冗餘、需靠 trigger 或 app layer 維護同步 | employee_id 是 SSOT、employee 搬 workspace 時自動跟上 |
| 未來維運 | 多一欄要管 | 少一欄、policy 讀起來稍複雜 |
| 跟同類表一致 | **不一致**（`employee_route_overrides` 也沒 workspace_id、policy 走 service_role）| **較一致**（跟 employee_route_overrides 都靠身份 JOIN、不帶冗餘 tenant 欄）|
| 風險 | backfill 若少一筆就 NOT NULL 炸；code 和 migration 必須同批上 | 純 SQL、無 code 同步風險 |

**關鍵資訊**：`employee_permission_overrides.employee_id` FK → `employees.id` (RESTRICT)、**employee 必有 workspace_id**（已 NOT NULL）。所以 JOIN 一定撈得到租戶、語意完整。

**我的判斷**：方案 B 本質更小、更符合「SSOT 靠身份與生命週期」原則（user memory `feedback_ssot_via_identity`）。employee 是「人」的 SSOT、此表 row 是「人的加掛」、租戶應跟隨人、**不該冗餘**。

但方案 A 也不是錯、兩個理由支持：
1. **後端幕僚已拍板**、跟 P016/P017 已修的路徑一致。
2. `get_current_user_workspace() = workspace_id` 直接比對、比 `EXISTS(...employees...)` 簡單、RLS 每行 overhead 小。

**推薦**：**方案 B（policy 純 JOIN）優先試**。若跑 e2e 發現 overhead 大、再退到 A。若主席已決 A、我不否決、但請記錄「B 曾被考慮過」、未來做 employee_route_overrides 對齊時重議。

### Q3. route.ts PUT 為了 INSERT workspace_id，一定要加 `getServerAuth` 嗎？

**否決**。這是跨 P022 的典型 senior-dev 順手改。

- 目前 PUT 走 `createApiClient()`（cookie session、RLS 自動生效）、跟 GET 同一個 client。
- 若走方案 A，取 workspace_id 有**三個辦法**（由小到大）：
  1. **從 session 的 auth.getUser() + employees JOIN 取**（5 行、跟 GET 的 session 模型完全一致、用既有 `getCurrentWorkspaceId()` helper、`src/lib/supabase/api-client.ts:61`）；
  2. **DB trigger 在 INSERT 時自動從 employees 補 workspace_id**（0 行 route.ts 改動、但要寫 trigger migration）；
  3. **拉 getServerAuth + requireTenantAdmin**（P022 領域、**今天禁止**）。

**推薦辦法 1**：`await getCurrentWorkspaceId()` 已有、直接拿。diff 只有 2 行（一行拿、一行填入 map）。**若走方案 B、route.ts 完全不動、0 行**。

### Q4. Backfill UPDATE 要不要包 tx？能不能用 function 動態 JOIN 省掉 backfill？

- **走方案 B、完全沒有 backfill**、不用 tx、0 migration 跟 code 同步風險。**這是方案 B 最大的結構性勝利**。
- 走方案 A、backfill 必須跟「加欄」「改 NOT NULL」包在同一個 `BEGIN; ... COMMIT;`。幕僚 1 草案（3-stage）理論對、但如果 migration template 沒包 BEGIN、必須補上。
- **沒有現成 function 能替代 backfill**、`get_current_user_workspace()` 是 runtime 函式、要 migration-time 回填就只能 `UPDATE ... FROM employees JOIN` 一次性。

### Q5. senior-dev 可能順手做、但其實是 P022 的動作？

**會被識別出來、需要否決的**：

1. **加 `getServerAuth()`**：P022 本體。拒絕。
2. **加 `requireTenantAdmin`**：P022 本體。拒絕。
3. **加 `auth.data.workspaceId === target employee.workspace_id` 防跨租戶改別家員工**：P022 本體。拒絕。
4. **順手改 GET 的 `.eq('employee_id')` → 加上 workspace filter**：多餘、RLS policy 修好後自動擋、不需要 app layer 重複防。拒絕。
5. **順手改 validate-login 裡讀 overrides 那段 try/catch「表不存在」fallback**（`validate-login/route.ts:178-198`）：那是 service_role bypass RLS 讀、不受 P018 影響、**連看都不要看**。拒絕。
6. **順手改 permissions/check 的 overrides SELECT**：它走 session client、P018 policy 修好後自動帶 tenant filter、**0 行改動**。拒絕任何「順手也補個 filter」的動作。
7. **順手加 e2e spec 守跨租戶改 overrides**：有價值、但**屬於 P022 的守門**、那個 PR 才該帶、不是 P018。記為 follow-up。

### Q6. 4 policy 是不是寫成 ALL 一條就好？P020 前車之鑒怎麼避？

親查 DB_TRUTH：`employee_permission_overrides` 目前**只有 4 條 cmd-specific policy**（delete / insert / select / update）、**沒有 ALL policy**、**沒有 P020 衝突風險**。

**寫 ALL 一條 vs 保留 4 條**：

- ALL 一條：`USING (workspace_id = get_current_user_workspace()) WITH CHECK (workspace_id = get_current_user_workspace())` — SELECT/UPDATE/DELETE 用 USING、INSERT 用 WITH CHECK、**PostgreSQL 會自動套對命令**。
- 4 條：跟既有 4 條 policyname 對齊（drop + create 新 4 條、名字保留）。

**我的判斷**：**寫 4 條**。兩個理由：
1. P020 的痛點是「4 條嚴格 + 1 條寬 ALL 互 OR」、只要**不再新增 ALL**、4 條本身不會打架。
2. 既有 policyname 工具鏈（detector `check:patterns P018`）已知 4 條名字、保留可減少 detector 更新。
3. 寫 1 條 ALL 的實際「diff 縮小」只有約 10 行、換來的是「未來讀 policy 的人比較難理解哪條守哪個 cmd」、不值。

**否決任何「順手把 employee_route_overrides 也統一成 ALL」的動作**—那是另一張表、範圍外。

---

## 2. 最小修法版本（我的版本）

### 推薦：**方案 B（純 policy JOIN、零 code 動）**

```sql
-- migration: 20260422XXXXXX_fix_employee_permission_overrides_rls.sql
BEGIN;
DROP POLICY IF EXISTS "employee_permission_overrides_select" ON public.employee_permission_overrides;
DROP POLICY IF EXISTS "employee_permission_overrides_insert" ON public.employee_permission_overrides;
DROP POLICY IF EXISTS "employee_permission_overrides_update" ON public.employee_permission_overrides;
DROP POLICY IF EXISTS "employee_permission_overrides_delete" ON public.employee_permission_overrides;

CREATE POLICY "employee_permission_overrides_select" ON public.employee_permission_overrides
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.workspace_id = get_current_user_workspace()));
CREATE POLICY "employee_permission_overrides_insert" ON public.employee_permission_overrides
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.workspace_id = get_current_user_workspace()));
CREATE POLICY "employee_permission_overrides_update" ON public.employee_permission_overrides
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.workspace_id = get_current_user_workspace()));
CREATE POLICY "employee_permission_overrides_delete" ON public.employee_permission_overrides
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.employees e WHERE e.id = employee_id AND e.workspace_id = get_current_user_workspace()));
COMMIT;
```

- **route.ts 0 行改動**
- **無 backfill、無新欄、無 NOT NULL 風險**
- diff：migration +20 / -0、其他 0

### 備案：**方案 A 精簡版**（若主席堅持加欄、照 A，但 code 只動 2 行）

- Migration：照幕僚 1 3-stage（加欄 + backfill + NOT NULL + policy）。
- route.ts PUT：`import { getCurrentWorkspaceId } from '@/lib/supabase/api-client'` + 開頭拿 `const workspaceId = await getCurrentWorkspaceId()` + map 加 `workspace_id: workspaceId`。**2 行改動**。
- **不 import getServerAuth、不 requireTenantAdmin、不驗 target workspace、不動 GET / validate-login / permissions/check。**

---

## 3. 三層守對照（說明為什麼上面夠）

P018 定義的風險 = 「4 條 policy USING:true、跨租戶讀寫別家員工加掛」。

- 方案 B 三層守：(1) RLS policy EXISTS JOIN employees、(2) employee_id FK RESTRICT 保證 row 一定對應真員工、(3) `get_current_user_workspace()` SECURITY DEFINER 保證 session 與 tenant 對齊。**三層齊全、且不引入冗餘欄**。
- 方案 A 三層守：(1) RLS policy 直接比 workspace_id、(2) NOT NULL + FK CASCADE 保持欄位值、(3) app layer INSERT 帶 workspace_id。**三層齊全、但多了一欄要維護同步、app layer 多一行**。

**P022 的第四層（app layer 守門 / 角色 check）兩方案都沒補**、這是 P022 PR 的事、今天不做。

---

## 4. 摘要（給主席 / William）

**最小修法 = 方案 B（policy 純 JOIN employees、0 行 code）**。不加 workspace_id 欄、不 backfill、不動 route.ts、不引 getServerAuth。migration 約 20 行、PR 10 分鐘可審。語意更乾淨（租戶跟隨人、不冗餘）、符合 SSOT 靠身份原則。

**否決意見三條**：
1. 否決 route.ts PUT 加 `getServerAuth / requireTenantAdmin / target employee workspace 驗證`—**P022 領域**、今天紅線。
2. 否決「順手」動 GET / permissions/check / validate-login 那三個接觸點—RLS 修好後它們自動生效、0 行改動。
3. 否決把 4 條 policy 合成 1 條 ALL—雖然略小、但 detector 對齊成本 + 可讀性下降、不換。

**若主席堅持方案 A**：我不全面反對、但請改成「精簡版 A」（route.ts 只改 2 行、不拉 getServerAuth）。方案 A 多加一欄冗餘、未來與 `employee_route_overrides` 不一致、建議那邊對齊時重議。
