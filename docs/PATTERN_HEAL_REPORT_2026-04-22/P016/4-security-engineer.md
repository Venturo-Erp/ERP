# P016 安全驗證 — Security Engineer

**Pattern**：`workspaces.workspaces_delete` policy 走 `USING (true)` 的 workaround、任何 authenticated 員工可 `supabase-js.from('workspaces').delete()` 刪任一 workspace、CASCADE 毀整租戶。
**CWE**：CWE-284（缺失授權）+ CWE-285（授權過寬）
**OWASP**：API5:2023 Broken Function Level Authorization
**驗證對象**：幕僚 1（Senior Dev）方案 B+ — DB policy `USING (false)` + 新增 API DELETE handler（`requireTenantAdmin` + service_role）+ UI 改 fetch API。

---

## 1. 修法真的擋住 P016 威脅？

### 🟢 DB 層 — `USING (false)` 阻斷所有 client-side DELETE

**攻擊路徑**：authenticated 員工在 browser console 打
`await supabase.from('workspaces').delete().eq('id', 'uuid')`
- 走 PostgREST、anon/authenticated token、RLS policy evaluated。
- `USING (false)` → 每一 row 都不符合條件 → **0 rows affected**。
- Supabase 的語意：**不報 error、回空陣列**（這是 RLS 預設行為、不是 bug）。

**攻擊者會知道失敗嗎？**：會、而且**這剛好是我們要的**。
- `delete()` 回的 `data` 是 `[]`、`error` 是 `null`。
- 攻擊者看 UI：刪除鈕按了沒反應 → 會去 refresh → 看到 workspace 還在。
- 攻擊者會接著試別條路、見第 3 節。
- **沒有 info leak**（沒告訴他「你沒權限」還是「根本被擋」）、符合 Fail Securely。

### 🟢 Service role bypass — 符合 Supabase 官方設計

service_role JWT 走 PostgREST 時 `rolname=service_role`、RLS policy evaluator 直接跳過（`FORCE ROW LEVEL SECURITY` 才會連 service_role 都擋、但 `workspaces` 是 `NO FORCE`、符合 CLAUDE.md 紅線）。
API 內 `createServiceClient()` → `getSupabaseAdminClient()` 拿的是 server-side `SUPABASE_SERVICE_ROLE_KEY`、**永遠不會出現在 client bundle**（驗過：`src/lib/supabase/admin.ts` 是 server-only）。

### ⚠️ `USING (false)` vs `USING (auth.role() = 'service_role')` 的差異

兩者**實際效果一樣**（service_role 都 bypass RLS），但語意與防禦深度不同：

| 寫法 | 實際效果 | 意圖清晰度 | 建議 |
|------|---------|-----------|------|
| `USING (false)` | authenticated 100% 擋、service_role bypass | 需看 comment 才知 service_role 是合法路徑 | 幕僚 1 採用 |
| `USING (auth.role() = 'service_role')` | authenticated 100% 擋、service_role bypass | 意圖寫死在 policy 上 | 略優 |

**安全判定**：兩者漏洞修補力度相同。幕僚 1 選 `USING (false)` + COMMENT 清楚註明合法路徑、**可接受**。若未來 pg_role 體系改變（例如加 anon_custom 角色）、`USING (false)` 更保險（預設拒絕）、`auth.role()` 判斷可能被新角色繞過。**保留 `USING (false)`**。

---

## 2. 新 API DELETE handler 是否引入新漏洞

### `requireTenantAdmin` 權限語意 — ⚠️ 跨租戶刪除能力

查代碼 `src/app/api/permissions/features/route.ts:9-55` 與幕僚 1 的 DELETE handler：
- 檢查的是 `role_tab_permissions.settings.tenants.can_write`。
- **不限制 workspace 同源**：有此權限者可刪**任一 workspace**（不只自家）。
- 這**符合業務設計**：Corner(Venturo 母公司)員工帶此權限、要能管理所有旗下租戶。

**新引入的風險**：
- 這是「租戶管理權限」的**固有語意**、不是 P016 新增的漏洞。
- 但之前 `workspaces.delete()` 靠 RLS `is_super_admin()` 擋（停用後 workaround 成 `USING true`）、沒人去定義「誰可以刪別家」；現在明確走 `tenants.can_write`、**權限邊界比之前清楚**。

### ⚠️ 業務確認需求
William 要**明確確認**以下假設：
- Corner 系統主管 可以刪除任何客戶 workspace（包括付費客戶的生產資料）。
- 這是 Corner 作為「平台運營方」的合理權限、還是應該多一層「客戶同意」？
- 若要分級、建議**第二階段**加 `workspace.can_be_deleted_by_platform` flag 或「軟刪除 + 30 天真實刪除」。**目前版本先擋住 P016、延後考慮**。

### 🟢 Self-delete 風險（admin 刪自家）
- Tenant admin 刪自家 workspace = 自願蒸發、**不是安全漏洞、是 UX/防呆問題**。
- 幕僚 1 已在 UI 加 confirm、API 加 409「還有員工」擋呆。
- **建議**：UI 若刪自家 workspace、額外彈二次確認「這會登出所有員工、刪除當前登入帳號」。

### 🟢 CSRF 保護 — SameSite cookies 已足夠

Next.js App Router DELETE handler 預設**沒有 CSRF token**、但：
- Supabase session cookies 預設 `sameSite=lax`（驗過：`src/app/api/auth/line/callback/route.ts:100`、`@supabase/ssr` 預設也是 lax）。
- `sameSite=lax` 擋住所有 cross-site DELETE 請求（lax 只允許 top-level GET 帶 cookie）。
- 惡意站的 `<form action="https://venturo/api/workspaces/xxx" method="POST">` 沒辦法發 DELETE（form 本身不支援 DELETE method）、用 `fetch()` 則需要 CORS preflight、預設被擋。
- **結論**：現代瀏覽器 + SameSite cookies + 沒 CORS allowlist、CSRF 風險可忽略。

### 🟢 Middleware 白名單驗證
`src/middleware.ts:16-65` 的 `EXACT_PUBLIC_PATHS` / `PREFIX_PUBLIC_PATHS`：
- `/api/workspaces/` 不在其中。
- 未登入者請求 → `isAuthenticated()` 回 false → `307 redirect to /login`（不是 401、但對 browser fetch 也是擋住）。
- ⚠️ **小瑕疵**：API 路徑被 307 到 `/login` HTML 頁、fetch client 可能困惑（response.ok = false、但 body 是 HTML）。幕僚 1 的 UI code 已處理（catch 後看 status、非 401/403/409 走 default error）、**OK**。

---

## 3. 新 attack surface

### 🟢 攻擊者發現 client delete 失敗後、會去打 API 嗎？

**會、而且 API 擋得住**：
1. 攻擊者 F12 看 network → 發現 `WorkspacesManagePage` 打 `/api/workspaces/[id]` DELETE。
2. 攻擊者帶自己的 session cookie 重發 → `requireTenantAdmin` 查 `role_tab_permissions` → `can_write=false` → **403**。
3. 攻擊者換 UUID 亂試（IDOR 變體）→ 一樣 403（權限檢查先於 UUID 存在性檢查、不 leak 哪些 workspace 存在）。

### ⚠️ 建議加 Rate Limit（防暴力嘗試 + 防滑鼠抖動連按）

幕僚 1 版**沒加 rate-limit**。建議加：
```ts
import { checkRateLimit } from '@/lib/rate-limit'
// 在 gate 驗過之後、DB 操作之前
const rateLimited = await checkRateLimit(request, 'workspaces-delete', 10, 60_000)
if (rateLimited) return rateLimited
```
- 基礎設施已存在（`src/app/api/auth/change-password/route.ts:19` 是範例）。
- 防：攻擊者拿到 Corner 系統主管 帳號後一秒刪 20 個 workspace。
- 加一行、幾乎零成本、**建議上線前補**。

### ⚠️ 強烈建議加 Audit Log（敏感操作必留痕）

刪 workspace = 整租戶資料蒸發、**這是整個系統最敏感的操作之一**、必須留 audit trail。
- 現況：幕僚 1 版沒 audit log。專案內 `audit_log` / `system_events` 表搜索回空、**沒有現成 audit infra**。
- **建議短期**：在 DELETE handler 加 `console.log({ event: 'workspace_deleted', actor: gate.employeeId, target: workspaceId, workspace_name: existing.name, timestamp: new Date().toISOString() })`、Vercel log 至少留 30 天可回溯。
- **建議中期**：建 `admin_audit_log` 表（actor_employee_id, action, target_type, target_id, workspace_snapshot, created_at）、把所有 `requireTenantAdmin`-protected 操作都寫入。
- P016 的 fix 不 block 這件事、但**上線前至少加 console log**（最簡可行版）。

---

## 4. 殘留風險

### 🟢 P016 的 CWE/OWASP 是否解決
- **CWE-284 缺失授權**：🟢 解決。DB 層 `USING (false)` + API 層 `requireTenantAdmin` 雙保險。
- **CWE-285 授權過寬**：🟢 解決。從「任何 authenticated」收窄到「`tenants.can_write` = true 的員工」。
- **OWASP API5 BFLA**：🟢 解決。Function-level authorization 明確守門、不是靠 RLS 默默擋。

### ⚠️ P018 類似漏洞警戒
**`employee_permission_overrides`**（pattern map 疑似問題）：
- 若該表的 policy 也靠 `is_super_admin()` 或被 workaround、同 P016 模式。
- **建議**：P016 fix 合併後、用相同驗證思路掃 `employee_permission_overrides` + `role_tab_permissions` + `workspace_features` 的 RLS、確認沒有同 pattern。
- 這不阻擋 P016 上線、但**必追**。

### ⚠️ Pattern 推廣建議
**Client → API → service_role** 這個 pattern 應該**推廣到所有敏感 delete**：
- 🔴 `tenants` / `workspaces` delete：已被 P016 納管。
- 🟡 `employees` delete：目前還是 client-side?（需查）。
- 🟡 `tours` / `orders` / `quotations` delete：client-side、但 RLS policy 限 workspace_id 同源、**中等風險**（租戶內 employee 可刪同租戶所有 tour）。
- **這是 P019 候選 pattern**、請 pattern-map 階段納入觀察。

---

## 5. 上線前驗證測試（必跑）

**測 1 — RLS client 直接刪**（CWE-284 最核心證據）：
```js
// Browser console, 一般員工登入後
const { data, error } = await supabase
  .from('workspaces')
  .delete()
  .eq('id', 'ANY_UUID')
// 預期：data = []、error = null、DB 完全沒變。
```

**測 2 — 一般員工 fetch API**（BFLA 守門）：
```bash
curl -X DELETE https://venturo.../api/workspaces/<uuid> \
  -H "Cookie: <一般員工 session>"
# 預期：403 '沒有租戶管理權限'
```

**測 3 — Corner 系統主管 刪空 workspace**（happy path）：
```bash
# 先 create 一個空 workspace
curl -X DELETE https://venturo.../api/workspaces/<空 workspace uuid> \
  -H "Cookie: <corner admin session>"
# 預期：200 { success: true, workspace: {...} }、DB 真的刪掉。
```

**測 4 — Corner 系統主管 刪非空 workspace**（防呆）：
```bash
curl -X DELETE https://venturo.../api/workspaces/<有員工的 uuid> \
  -H "Cookie: <corner admin session>"
# 預期：409 '此公司還有 N 位員工、無法刪除'
```

**Bonus 測 5（若加 rate-limit）**：快速連發 20 次 → 第 11 次起 429。
**Bonus 測 6（未登入）**：不帶 cookie fetch → 307 redirect to `/login`（middleware 擋、未進 handler）。

---

## 🟢 修法確認擋住威脅

- ✅ DB 層 `USING (false)` 讓 client-side delete 100% 擋、service_role 合法 bypass。
- ✅ API 層 `requireTenantAdmin` 收窄至 `tenants.can_write` 員工、BFLA 修補。
- ✅ UI 改 fetch API + AddWorkspaceDialog rollback 搬 server-side、client 完全碰不到 `workspaces.delete()`。
- ✅ Middleware 白名單未放行 `/api/workspaces/[id]`、未登入 307。
- ✅ CSRF 靠 `sameSite=lax` + 無 CORS allowlist + DELETE 需 preflight、實務擋得住。
- ✅ CLAUDE.md 紅線（`workspaces FORCE RLS 必須關`）未破壞、login-api.spec.ts 會守門。

---

## ⚠️ 新引入風險清單

1. **跨租戶刪除能力明確化**：`tenants.can_write` = 可刪**任一** workspace。業務需 William 點頭（**建議先點頭、細分留 Phase 2**）。
2. **缺 Rate Limit**：建議 handler 裡加 `checkRateLimit(request, 'workspaces-delete', 10, 60_000)`（一行、infra 已有）。
3. **缺 Audit Log**：極敏感操作無痕。**上線前至少加 `console.log`**、中期建 `admin_audit_log` 表。
4. **Middleware 307 對 API fetch 語意小瑕疵**：非 P016 引入、幕僚 1 UI 已處理、OK。
5. **P018 / 其他敏感 delete 潛在同 pattern**：P016 fix 後立即掃 `employee_permission_overrides` 與其他敏感 table 的 RLS。

---

## 📋 上線前必跑驗證測試（4 個 + 2 個 bonus）

| # | 測試 | 預期結果 | 阻擋 |
|---|-----|---------|------|
| 1 | 一般員工 `supabase.from('workspaces').delete()` | 0 rows affected、no error | RLS `USING (false)` |
| 2 | 一般員工 fetch `/api/workspaces/[id]` DELETE | 403 `沒有租戶管理權限` | `requireTenantAdmin` |
| 3 | Corner 系統主管 fetch 刪空 workspace | 200、DB 真刪 | happy path |
| 4 | Corner 系統主管 fetch 刪有員工 workspace | 409 `還有 N 位員工` | 防呆 |
| 5* | 快速連打 DELETE 20 次 | 第 11 次起 429 | Rate Limit（若實作） |
| 6* | 未登入 fetch | 307 to /login | Middleware |

**同時必跑**（CLAUDE.md 紅線）：`tests/e2e/login-api.spec.ts`（動 RLS policy 的守門測試）。

---

## 摘要（200 字）

P016 修法（DB `USING (false)` + API `/api/workspaces/[id]` DELETE 走 `requireTenantAdmin` + service_role + UI 改 fetch）**有效擋住 CWE-284/285 + OWASP API5**：authenticated client delete 被 RLS 擋回 0 rows、service_role 合法 bypass、function-level authorization 明確守門於 `tenants.can_write`。`USING (false)` 語意稍不如 `auth.role()=service_role` 清楚但防禦力相同、以 COMMENT 補足可接受。新引入風險：(1) `tenants.can_write` = 可刪**任一** workspace、需 William 業務確認；(2) 缺 rate-limit 建議加一行 `checkRateLimit`；(3) 缺 audit log，上線前至少 `console.log` 留痕、中期建表。CSRF 靠 `sameSite=lax` 足夠、middleware 白名單正確擋未登入。必追：同 pattern 掃 `employee_permission_overrides` + `tours/orders` 等 client-side delete。上線必跑 4 個驗證測試 + `login-api.spec.ts` RLS 紅線守門。**結論：🟢 可上線、前 3 項建議最遲 Phase 2 補上**。
