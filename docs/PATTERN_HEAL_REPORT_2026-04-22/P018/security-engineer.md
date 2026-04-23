# P018 安全補強評估 — Security Engineer

**日期**：2026-04-22
**Pattern**：`employee_permission_overrides` 缺 `workspace_id` + 4 policy 全 `USING:true` / `WITH CHECK:true`
**CWE**：CWE-269（權限提升）+ CWE-284（缺失授權）
**OWASP**：API1:2023 BOLA + API5:2023 BFLA
**修法**：加 `workspace_id` uuid NOT NULL（FK → workspaces、ON DELETE CASCADE）+ 重寫 4 條 policy 為 `workspace_id = public.get_current_user_workspace()` + PUT INSERT map 補 `workspace_id: auth.data.workspaceId`

---

## 1. 4 種攻擊評估（跨租戶威脅）

| # | 攻擊 | 封堵依據 | 判定 |
|---|------|----------|------|
| (a) | 讀別家公司員工 overrides（`SELECT WHERE employee_id=B_of_tenantB`） | SELECT policy `USING (workspace_id = get_current_user_workspace())` → 列過濾，B 的 row `workspace_id=tenantB`、呼叫者是 tenantA → **0 row** | 🟢 擋住 |
| (b) | 幫自己 INSERT grant 別家 workspace 的 override（`{workspace_id: tenantB, employee_id: A_of_tenantA}`） | INSERT policy `WITH CHECK (workspace_id = get_current_user_workspace())` → `tenantB ≠ tenantA` → RLS **擋、回 error** | 🟢 擋住 |
| (c) | 幫別家員工 INSERT/DELETE（`{workspace_id: tenantB, employee_id: B_of_tenantB}`） | INSERT 同上；DELETE policy `USING` 條件不符（row `workspace_id=tenantB`）→ **0 row affected** | 🟢 擋住 |
| (d) | DELETE 別家員工的 overrides | 同 (c)、`USING` 列級過濾 → 刪 0 row | 🟢 擋住 |

**判定**：policy `workspace_id = public.get_current_user_workspace()` 對 4 種跨租戶攻擊**完整封堵**。`get_current_user_workspace()` 是 `SECURITY DEFINER STABLE` 函數、從 `auth.uid()` 經 `employees` 表 + fallback `user_metadata` 取得、攻擊者無法偽造（要換 workspace 必須換整個 auth session）。

---

## 2. 同租戶內攻擊（P022 責任、P018 擋不到）

**場景**：員工 A 在 tenantA、打 PUT `/api/employees/B_of_tenantA/permission-overrides` 塞 `{employee_id: B, workspace_id: tenantA, module_code: 'employees', override_type: 'grant'}`。

- RLS `WITH CHECK` 通過（`workspace_id` 一致）。
- route.ts 0 守門、沒 `requireTenantAdmin`、沒檢查「A 是否有 manage_overrides 權限」。
- ✅ INSERT 成功、A 提權了同事 B（或幫自己提權、見下節）。

**結論**：P018 修完**不擋同租戶內的水平 / 垂直提權**，這是 **P022 責任**（route.ts 加 `getServerAuth` + `requireTenantAdmin` 或 `hasPermission('employees.manage_overrides')`）。P018 的威脅模型從「全世界 authenticated 可打」收斂到「**同租戶內任一登入員工可打**」，**攻擊面縮減 ~99%（跨租戶完全擋）但未歸零**。

---

## 3. 員工 A 幫自己 INSERT

**場景**：A 打 PUT 到 `/api/employees/A_self/permission-overrides`、塞 `{employee_id: A_self, workspace_id: tenantA, override_type: 'grant', module_code: 'finance'}`。

- RLS `WITH CHECK` 通過（同租戶）。
- route.ts URL param `employeeId` 沒檢查 `!== auth.data.employeeId || hasAdminPermission`。
- ✅ 自升權限成功。

**結論**：這是 P018 **擋不到** 的剩餘攻擊面、100% 是 **P022 責任**。P022 需在 route.ts 加 `if (employeeId === auth.data.employeeId && !isAdmin) return 403`。

---

## 4. service_role 濫用面（validate-login）

`src/app/api/auth/validate-login/route.ts:178-198` 用 `getSupabaseAdminClient()` 讀 overrides：

```ts
.from('employee_permission_overrides').select(...).eq('employee_id', employee.id)
```

- `employee.id` 來源：`selectFields` 先用 `username + workspace.id` + 密碼驗過 → **不是** 使用者可注入的參數。
- `supabase.auth.signInWithPassword` 成功才跑到這段、等於密碼 / MFA 驗過。
- service_role 繞過 RLS 是設計、但 `employee_id` 被密碼鎖定、**無法切換到別人**。
- ✅ 無注入面、無 IDOR。
- P018 修完後 validate-login 行為**不變**（service_role bypass RLS），對登入流程 0 影響。

---

## 5. 其他跨租戶讀寫路徑

| 路徑 | 風險 | 結論 |
|------|------|------|
| supabase-js client 直接 `from('employee_permission_overrides').select/insert` | anon/authenticated key 走 RLS、新 policy 擋 | 🟢 擋 |
| Browser console 嘗試 DELETE 整表 | 列級過濾、只刪同租戶（配 P022 修完後更佳） | 🟡 同租戶內仍裸 |
| `/api/permissions/check` route.ts SELECT overrides | 用 `createApiClient`（cookie session）→ RLS 走 authenticated → 新 policy 只回同租戶 | 🟢 擋 |
| Webhook / Cron（若有）塞 override | 本次沒看到這類路徑、搜尋 `from('employee_permission_overrides')` 除 route + validate-login 外無命中 | ✅ 無 |
| raw SQL（pgadmin / Supabase Studio） | 用 postgres role、本來就繞 RLS、這是 William 親自操作、不在威脅模型內 | — |

**結論**：跨租戶路徑**只有這 3 條**（validate-login、permissions/check、overrides/route.ts），全部封堵。無第四條新攻擊面。

---

## 6. Backfill 期間 race condition

Migration 3-stage：(1) ADD COLUMN nullable → (2) UPDATE backfill → (3) SET NOT NULL + DROP/CREATE policy。

- 整個 migration 包在 `BEGIN ... COMMIT`（senior-dev 方案第 37、129 行）→ **單一 transaction**、原子性。
- 從 Stage 1 到 Stage 3 其他 session 看到的是**舊狀態**（欄位不存在、舊 policy）或**新狀態**（欄位 NOT NULL、新 policy）、**無中間態洩漏**。
- Race 唯一可能：migration 還沒 commit、其他 session 正在跑 PUT INSERT（舊 code 無 workspace_id 欄）。因為 Stage 1 加的是 nullable + default NULL，**INSERT 不會炸**。Stage 3a `SET NOT NULL` 會 lock 整表、等待其他 write 完成、再改欄位、再 DROP/CREATE policy。`ALTER TABLE ... SET NOT NULL` 需要 ACCESS EXCLUSIVE lock、與併發 INSERT 互斥、**PostgreSQL 會排隊不會丟 row**。
- ⚠️ 唯一需提醒：上線窗口應配合 senior-dev 第 5 節「code + migration 同一 PR 同一 deploy」。否則舊 code 寫入不帶 workspace_id 的 row 會卡在 Stage 3a `SET NOT NULL` 前、但 Stage 2 backfill 已跑過、變孤兒 NULL → Stage 3a 失敗 rollback。結論：**併發安全、但要綁單次 deploy**。✅

---

## 7. Policy 重疊打架（P020）風險驗證

查 `docs/DB_TRUTH.md`：`employee_permission_overrides` 目前**只有 4 條 policy**（select / insert / update / delete 各一）、**無** `ALL` cmd policy、**無** 其他 policy。

Migration Stage 3b 先 DROP 4 條舊 policy、Stage 3c CREATE 4 條新 policy、**無其他 policy 殘留**。

Migration 最後 DO block（senior-dev 第 117-124 行）強制驗證 `COUNT(*) = 4`、若多出 / 少了就 RAISE EXCEPTION。

**結論**：P020 重疊風險 🟢 0。本次修完該表是 4 policy 全嚴、無 USING:true 漏網。

---

## 8. DELETE policy WITH CHECK 驗證

senior-dev 草案第 97-100 行：
```sql
CREATE POLICY employee_permission_overrides_delete
  ON public.employee_permission_overrides
  FOR DELETE TO public
  USING (workspace_id = public.get_current_user_workspace());
```

- PostgreSQL DELETE policy **只需 USING、不支援 WITH CHECK**（DELETE 不寫入資料、只過濾哪些 row 可刪）。
- 草案**沒寫 WITH CHECK**、✅ 正確。
- UPDATE policy 兩者都寫（第 91-95 行）、✅ 正確（UPDATE 要 filter 舊值 USING + 驗新值 WITH CHECK）。
- INSERT 只寫 WITH CHECK、SELECT 只寫 USING、✅ 全部語法正確。

---

## 9. e2e 測試建議（跨租戶守門）

**必寫 spec**：`tests/e2e/permission-overrides-rls.spec.ts`

```ts
// 沙箱：Tenant A（員工 A1 / admin Aadmin）、Tenant B（員工 B1）
test('跨租戶 SELECT 擋住', async () => {
  loginAs(A1)
  const { data } = await supabase
    .from('employee_permission_overrides')
    .select('*').eq('employee_id', B1.id)
  expect(data).toEqual([])  // RLS 過濾
})

test('跨租戶 INSERT with tenantB workspace_id 擋住', async () => {
  loginAs(A1)
  const { error } = await supabase
    .from('employee_permission_overrides')
    .insert({ workspace_id: B.id, employee_id: A1.id, module_code: 'X', override_type: 'grant' })
  expect(error).toBeTruthy()  // WITH CHECK 拒絕
})

test('跨租戶 DELETE 0 rows affected', async () => {
  loginAs(A1)
  const { data } = await supabase
    .from('employee_permission_overrides')
    .delete().eq('employee_id', B1.id)
  expect(data).toEqual([])
})

test('API PUT 跨租戶 target employee 仍回 success（P022 殘留、待修）', async () => {
  loginAs(A1)
  const res = await fetch(`/api/employees/${B1.id}/permission-overrides`, {
    method: 'PUT', body: JSON.stringify({ overrides: [...] })
  })
  // P018 修完後：RLS 擋 INSERT、但 route.ts 回 success:true、行為誤導
  // P022 修完後：回 403
  expect(res.status).toBe(403)  // ← 這個 spec 會 FAIL 直到 P022 修完、守門
})

test('service_role validate-login 仍可讀（不受 RLS 影響）', async () => {
  const admin = createServiceClient()
  const { data } = await admin.from('employee_permission_overrides').select('*').limit(1)
  expect(data).not.toBeNull()
})
```

**守門價值**：`check:patterns P018` 只檢 policy 文字、e2e 驗**行為**、才抓得到 regression（例如未來有人把 FORCE RLS 打開、service_role 會炸）。

---

## 10. 殘存威脅一句話（翻給主席 / William）

> 「修完 P018、**別家公司員工完全碰不到我們的權限資料**；但**同公司內任何登入員工還能透過 `/api/employees/[任意 ID]/permission-overrides` 幫自己或同事加系統主管權限**，這是 P022 的工、下一輪處理。」

## 修完 P018 威脅矩陣（STRIDE 收斂）

| 威脅 | 修前 | 修後（P018 only） | 修後（P018+P022） |
|------|------|------------------|------------------|
| Spoofing | — | — | — |
| Tampering 跨租戶 | 🔴 CRIT | 🟢 擋 | 🟢 擋 |
| Tampering 同租戶提權 | 🔴 CRIT | 🔴 CRIT（不變） | 🟢 擋 |
| Info Disclosure 跨租戶 | 🔴 CRIT | 🟢 擋 | 🟢 擋 |
| DoS | 🟡 低 | 🟡 低 | 🟡 低 |
| Elevation of Privilege 跨租戶 | 🔴 CRIT | 🟢 擋 | 🟢 擋 |
| Elevation of Privilege 同租戶 | 🔴 CRIT | 🔴 CRIT（不變） | 🟢 擋 |

**P018 修完攻擊面縮減**：跨租戶威脅 100% 歸零、同租戶水平/垂直提權 100% 殘留（P022 責任）。

---

**Security Verdict**：P018 修法**通過安全審查**、policy 設計正確、無新攻擊面、backfill 原子性有保障、4 policy cmd-specific 拼寫無誤、DELETE 無 WITH CHECK 符合 PG 規範、0 policy 重疊風險。**放行，務必綁 P022 下輪處理同租戶提權。**
