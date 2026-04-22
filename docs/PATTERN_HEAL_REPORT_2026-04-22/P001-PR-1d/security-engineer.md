# P001 PR-1d — Security Engineer 安全審

審人：Security Engineer（紅線幕僚）
日期：2026-04-22
範圍：全站 19 處 `isAdmin` 短路清理（A 類 11 處 `if (isAdmin) return true`、B 類 8 處 `if (!isAdmin) return <UnauthorizedPage />`）

---

## 摘要（CRITICAL 2 / HIGH 3 / MEDIUM 3 / LOW 1）

PR-1d 本身「只動前端」、**沒引入新的跨租戶提權**（workspace RLS + 後端 API 大多已守 workspace_id）、但有兩個致命面：

1. 🔴 **admin 權限下降會把 `/tenants`、`/ai-bot`、`/workspace`（付費功能）直接白屏** — Corner admin 現在可進、PR-1d 後會被擋、業務當機。
2. 🔴 **PR-1a 加的 `if (workspaceFeatures.loading) return true` 是「載入期放行」** — 搭配 `canEdit` 也放行、造成「連續快點」的 TOCTOU 寫入窗口；加上後端 write API 多半沒檢 `role_tab_permissions`、這個 loading bypass 是跨越「UI 唯一防線」的現成入口。

多防線已塌的是 **HR 審批 / 公告 / 會計科目** 三條：後端 API 完全不查 `role_tab_permissions`、一旦前端放行、任何 session 就能改。PR-1d 沒讓它變糟、但**沒讓它變好、拔 isAdmin 後「看似有權限系統」的安全感更需戳破**。

---

## 🔴 CRITICAL 發現

### S1: `/tenants` / `/ai-bot` / `/workspace` 三類路由 PR-1d 後 admin 會白屏（權限下降 CRITICAL）

**命中點**：
- B1 `/accounting/layout.tsx` 改 `canAccess('/accounting')`
- B2 `/database/layout.tsx` 改 `canAccess('/database')`
- 擴散風險：ModuleGuard 拔 admin bypass（A6）後、所有 `PREMIUM_FEATURE_CODES` 中的模組會改走 `isRouteAvailable` → `isFeatureEnabled` → 付費大開關 `premium_enabled`

**攻擊情境 / 實際影響**（非攻擊、是 self-DoS）：
- `workspace_features.premium_enabled` 在 `/api/tenants/create` 預設 `false`（見 `src/app/api/tenants/create/route.ts:149`）。
- `features.ts` 裡 `workspace` / `ai_bot` / `accounting` / `tenants` 都列 `PREMIUM_FEATURE_CODES`（`src/lib/permissions/hooks.ts:24-38`）。
- `isFeatureEnabled` 對 premium 回傳 `premiumEnabled && featureOn`（hooks.ts:147-149）。
- Corner workspace **當前 premium_enabled 狀態未驗證**（我沒下 DB、只能從代碼推）— 如果 premium_enabled=false、PR-1d 一上線、Corner admin 進 `/accounting`、`/tenants`、`/ai-bot` 通通變「無權限」。
- **最關鍵**：`settings.tenants` tab **根本不在 `MODULES` 裡面**（module-tabs.ts 只有 personal/company）、也不在 `20260422150000_backfill_admin_role_tab_permissions.sql` 的 VALUES 清單裡（只 seed 了 `settings.personal` / `settings.company`）。即使 Corner admin role 有 `is_admin=true`、也沒有 `role_tab_permissions(module='settings', tab='tenants', can_write=true)` 這筆 row。`/api/tenants/create`、`/api/workspaces/[id]` DELETE、`/api/permissions/features` PUT 全部 403。

**修法補強（CRITICAL 必做、阻斷上線）**：
1. PR-1d 進下一步前、**先下 DB 指令驗 Corner admin 的 `role_tab_permissions` 是否有 `settings/tenants/can_write=true` 這筆**；沒有就先補 migration。
2. `module-tabs.ts` MODULES 增一個 `settings.tenants` tab（或明確宣告「tenants 是 system-level、另有管道」、不走 module-tabs seed）；把 backfill migration 加一行 `('settings', 'tenants')` 補齊。
3. 驗 `workspaces.premium_enabled` 在 Corner 是 true；否則把 ModuleGuard 的 admin bypass 保留（A6 不在 PR-1d 拔）。
4. 寫 e2e：Corner / JINGYAO / YUFEN 三租戶 admin 登入、依序點 /tenants、/ai-bot、/accounting、/database、/hr/roles 不得被擋。

---

### S2: canAccess loading-state 放行 + 後端沒檢 role 權限 = TOCTOU 寫入窗口（提權 CRITICAL）

**命中點**：
- PR-1a `src/lib/permissions/hooks.ts:286` `if (workspaceFeatures.loading) return true` （canAccess）
- PR-1a `src/lib/permissions/hooks.ts:296` `if (workspaceFeatures.loading) return true` （canEdit）
- 後端同租戶但沒檢 role 的 write API（不完整列表）：
  - `/api/accounting/accounts` POST/PUT/DELETE（只檢 session + RLS、**沒檢 role**）
  - `/api/accounting/vouchers/create` POST（只檢 session、沒檢 role）
  - `/api/finance/payment-methods` POST/PUT/DELETE（只檢 session、沒檢 role）
  - `/api/roles/[roleId]/tab-permissions` PUT（**高危、直接蓋別人的權限表、完全沒檢 role**）
  - `/api/hr/approval` POST（**高危、任何 session 能審批任何請假/加班/補打卡**）
  - `/api/suppliers` POST（只檢 session、沒檢 role；目前 GET stub 回空 array）
  - announcements 走 client supabase 直接 insert、RLS policy `WITH CHECK (true)` 根本不檢

**攻擊情境**：

情境 A（TOCTOU 提權）：
1. 租戶 A 的「助理」role 用戶登入、`useWorkspaceFeatures` 第一次 fetch `/api/permissions/features` + `/api/workspaces/:id` 這段約 100-400ms、`canAccess = true`。
2. 攻擊者在同網路（含 CSRF 場景）或打開 devtools 直接叫 `fetch('/api/accounting/vouchers/create', {method:'POST', ...})`、後端不查 role、直接落帳。
3. `canEdit` 也同樣放行、對 `/api/roles/[roleId]/tab-permissions` PUT 可改自己的 role 變 super、持久化。
4. 幫兇條件：feature cache 失效時（`invalidateFeatureCache()` 被叫、hooks.ts:54）會重 fetch、再開一個 loading 窗口。

情境 B（非 admin 直接打後端）：
- PR-1d 只動前端、後端原本就不查 role、非 admin 本來就能 POST `/api/accounting/vouchers/create`。這不是 PR-1d 新增的、但 PR-1d 讓前端的「`if (!isAdmin) return <UnauthorizedPage />`」變弱、使用者體感「會計頁我進得去、表示我有權限」、**會降低對後端 API 的警覺**、擴大實際被打穿的風險。

**修法補強**：
1. **立即**：PR-1d 不動 `canEdit` 的 loading 放行（只保留 canAccess 給 UX 防閃）；`canEdit` loading 期間應回 `false` 或 `undefined`，UI 顯 disabled 不是「看起來可以點但打過去會炸」。
2. **短期（搭 P001-B 或新 issue）**：高風險寫 API 加 role 檢查、清單：
   - `/api/accounting/**` POST/PUT/DELETE → 檢 `accounting.*.can_write`
   - `/api/finance/**` POST/PUT/DELETE → 檢 `finance.*.can_write`
   - `/api/roles/[roleId]/tab-permissions` PUT → 檢 `hr.roles.can_write`（這最危險）
   - `/api/hr/approval` POST → 檢 `hr.attendance.can_write` / `hr.leave.can_write`
   - `/api/suppliers` POST/PUT → 檢 `database.suppliers.can_write`
3. **長期**：announcements 表 RLS `WITH CHECK (true)` 改為 `WITH CHECK (EXISTS (SELECT 1 FROM role_tab_permissions WHERE role_id = get_current_user_role() AND module_code='hr' AND tab_code='announcements' AND can_write))` 或類似；現狀是打開大門。

---

## 🟠 HIGH 發現

### S3: A11 `hasPermissionForRoute` 拔 isAdmin 短路 → AuthGuard 全站重跑（Blast Radius HIGH）

**命中點**：`src/lib/permissions/index.ts:114` `if (isAdmin) return true`

**使用者**（從 GitNexus / grep）：
- `src/lib/auth-guard.tsx:170` AuthGuard（包所有 (main) 路由、CRITICAL 路徑）
- `src/lib/auth-guard.tsx:216` usePermissionCheck

**影響**：
- AuthGuard 是整個 /(main) 路由群組的上游入口、hasPermissionForRoute 回 false 會 `router.push('/unauthorized')`。
- 拔 isAdmin 短路後、admin 走 `userPermissions`（登入時從 `role_tab_permissions` 轉成 `module:tab` 字串陣列、見 validate-login/route.ts:159）。
- 風險窗口：login → validate-login API 要跑一次、才把 permissions 塞進 user。登入完成但 JWT 尚未刷新那幾毫秒若有路由跳轉、permissions 為空、hasPermissionForRoute 第一行 `if (!userPermissions || userPermissions.length === 0) return false` 會直接把 admin 踢到 /unauthorized。

**修法補強**：
1. hasPermissionForRoute 第一行改：`if (!userPermissions) return false; if (userPermissions.length === 0 && !isAdmin) return false`（保留對 admin 的寬容度）、或直接在 AuthGuard 加 permissions loading state、跟 canAccess 同步。
2. 寫 unit test：空 permissions + isAdmin=true 案例、應放行 dashboard。
3. 驗證 login flow：`validate-login` 回應要 synchronous 塞完 user.permissions 才讓前端跳轉（看 auth-store 有沒有保證這點）。

---

### S4: A6 ModuleGuard 若同時拔 isAdmin 短路、premium feature 全部擋住 admin（HIGH）

**命中點**：`src/components/guards/ModuleGuard.tsx:49` `if (isAdmin) { setChecked(true); return }`

**影響**：
- ModuleGuard 的職責是 workspace-level feature gate（有沒有買某模組）、不是 role-level permission。
- PR-1d 規劃沒列 ModuleGuard 為 A 類短路、但 senior-dev 若順手拔、會造成：Corner workspace 若沒買某個 premium module（ai_bot / fleet / local / supplier_portal / esims / accounting / tenants）、admin 進該路由會被踢到 /unauthorized。
- 跟 S1 是同一根問題（admin 權限「降到」workspace_features 層），但 ModuleGuard 拔掉的影響更大：它是 /(main) layout 附近的 guard、錯了全站受影響。

**修法補強**：
1. **PR-1d 明確不動 ModuleGuard**；ModuleGuard 的 admin bypass 是「workspace 層級的 sales-safety」、該由付費大開關（billing）決定、不由 role 決定。
2. 或改成：`if (isAdmin && premium_enabled) { setChecked(true); return }` — 仍允許 admin bypass、但前提是該 workspace 有付費、避免「不付費也能 admin 跳進所有功能」的漏洞（這屬於另一個商業層問題、不是 PR-1d 要修的、但要講清楚）。

---

### S5: B1/B2 layout.tsx 改 canAccess(pathname) 的 pathname 污染風險（HIGH）

**命中點**：B1 `/accounting/layout.tsx`、B2 `/database/layout.tsx`；任何 B 類「改查 canAccess(pathname)」的 layout。

**攻擊情境**：
- `usePathname()` 回的是 Next.js 正規化後的 pathname、query string 不含在內、原則上不可污染。但如果修法用 `window.location.pathname` 或 server 端讀 `request.nextUrl.pathname` + 做 `startsWith` 比對、攻擊者可用 `//tenants/../accounting` 或 matrix params（`/tenants;fake=/accounting`）欺騙 startsWith-based 規則。
- `hasPermissionForRoute` 的 `getModuleFromRoute` 用 `startsWith(routePrefix)`（index.ts:92）、若 `routePrefix='/tenants'` 且 pathname='/tenants/../accounting'、normalize 前會炸 match。
- 實務上 Next.js App Router 已經把 pathname normalize 過、不太可能穿；但 PR-1d 的 B 類修改**必須**：
  - 用 `usePathname()`、不用 `window.location.pathname`
  - 不用 string concat、用硬 coded route key（`canAccess('/accounting')` 不是 `canAccess(pathname)`）

**修法補強**：
1. PR-1d 的 layout.tsx 改寫、**禁止**傳 `pathname` 給 canAccess、改硬 coded：
   ```tsx
   // ❌ 禁止 — canAccess(pathname)
   // ✅ 正確 — canAccess('/accounting')
   ```
2. 加 `hasPermissionForRoute` 的 input normalize（第一行 `const normalized = route.replace(/\/+/g, '/').replace(/\/\.\.+/g, '')`）、防禦性深度。
3. 寫 unit test：`canAccess('/tenants/../accounting')` 應跟 `canAccess('/accounting')` 行為一致或 reject。

---

## 🟡 MEDIUM 發現

### S6: useTabPermissions 拔 isAdmin（A7-A10）後、admin 依 `fetchPermissions` 結果、race 時窗內 canRead/canWrite 回 false（MED）

**命中點**：`src/lib/permissions/useTabPermissions.tsx:80, 97, 113, 122`

**影響**：初次渲染 loading=true 時 useTabPermissions 回的 canRead/canWrite 會 `false`（見 88 行 `return perm?.can_read ?? false`）、之前 isAdmin 短路頂住了；拔掉後 loading 期間會閃一下「按鈕 disabled」狀態。

**修法補強**：
- PermissionGuard（useTabPermissions.tsx:162）已經有 `if (loading) return null`、可以參考該 pattern；canRead/canWrite 也在 loading 時回 `undefined`（distinct from `false`）、呼叫端用 `?? true` 當 loading-optimistic fallback。

---

### S7: `hasPermissionForRoute` 的 `publicRoutes` 白名單 + admin 短路拔後、舊格式權限仍放行（MED）

**命中點**：`src/lib/permissions/index.ts:127-138` 的 legacy fallback。

**影響**：拔掉 isAdmin 短路後、仍有兩條「通往 true」的 fallback：
1. 舊格式權限 `perm.id === 'admin'`（SYSTEM_PERMISSIONS 定義）、若 user.permissions 含字串 `'admin'`、依 routes `['*']` 任何路由都回 true。
2. 若 user.permissions 含 `'tours'`（舊格式）、依 FEATURE_PERMISSIONS 的 routes 比對也會放行。

這是 **隱形提權路徑**：攻擊者如果能透過任何 path（例：自訂 role name= 'admin'、或打 `/api/roles` PUT 塞 name）影響 user.permissions 陣列、就能拿到 `'admin'` 或 `'*'`。

**修法補強**：
- 前端 hasPermissionForRoute 把 legacy ALL_PERMISSIONS 分支刪掉、只走 `role_tab_permissions` 路徑（與後端對齊）。
- 或在 validate-login/route.ts:159 的 permissions 陣列構建時、**明確禁止** `'admin'` / `'*'` 字串出現在 permissions（白名單 strict）。

---

### S8: `/api/users/[userId]/role` 無 caller ownership 檢查（MED）

**命中點**：`/api/users/[userId]/role/route.ts`

**影響**：useTabPermissions 在 PR-1d 流程會頻繁呼叫這支（hooks.ts:46）。任何 session 都能用任意 userId 查到別人 is_admin flag + role_id。跨租戶有 RLS 擋、同租戶同僚互查是 privacy leak、且 role_id 可被用來組 `/api/roles/[roleId]/tab-permissions` 的攻擊鏈（見 S2）。

**修法補強**：
- 檢查：`if (userId !== auth.employeeId && !canAccessHR(caller)) return 403`
- 或乾脆只接 `/api/users/me/role`、不接任意 userId。

---

## 🔵 LOW 發現

### S9: isAdmin 三條管道仍在（JWT / Zustand / DB role.is_admin）、PR-1d 沒降這個（LOW、已知 debt）

**影響**：PR-1d 只動前端短路、`useAuthStore(s => s.isAdmin)` 依然活著、A 類剩下的零星 `isAdmin &&` UI 裝飾（calendar workspace switch、profile admin badge、sidebar 展開 workspaces）仍依 JWT。未來若 JWT claim 被偽造（middleware 已用 Supabase session 驗、可信）、還有第二條路（zustand 持久化的 user.isAdmin）、第三條（DB role.is_admin）。**pattern-map P011 已記、不屬 PR-1d scope**。

---

## 多層防禦驗證表

| 命中點 | 前端守門（改後） | 後端 API 守門 | DB RLS 守門 | 防禦是否完整 |
|---|---|---|---|---|
| B1 `/accounting/layout.tsx` | `canAccess('/accounting')` | /api/accounting/** 只檢 session、**未檢 role** | workspace_id = 自己、cross-ws 擋得住、role 不擋 | ⚠️ 跨租戶守得住、同租戶 role 檻為零 |
| B2 `/database/layout.tsx` | `canAccess('/database')` | /api/suppliers 只檢 session | workspace_id = 自己 | ⚠️ 同上 |
| B3 `/finance/settings/page.tsx` | 改查 `canAccess('/finance/settings')` | /api/finance/payment-methods 只檢 session | workspace_id | ⚠️ 同上 |
| B4 `/finance/requests/page.tsx` | 改 canAccess | /api/... 需看個別 | workspace_id | ⚠️ |
| B5 `/finance/treasury/page.tsx` | canAccess | RPC / RLS | workspace_id | ⚠️ |
| B6 `/finance/travel-invoice/page.tsx` | canAccess | /api/travel-invoice/* 只檢 session（P003 已補 workspace） | workspace_id | ⚠️ |
| B7 `/finance/reports/page.tsx` | canAccess | RPC 多數 RLS 擋 workspace | workspace_id | ⚠️ |
| B8 announcements / HR operations（A 類） | `isAdmin &&` 渲染 | `/api/hr/approval` **完全不檢 role** | announcements RLS `WITH CHECK (true)` **洞** | ❌ 唯前端為門、前端一去就是裸奔 |
| A6 ModuleGuard | 拔短路（不建議在 PR-1d 做） | 無對應 API | workspace_features 表是資料、不是 policy | ⚠️ |
| A7-A10 useTabPermissions 4 處 | 拔短路 | N/A | N/A | ✅（讀 role_tab_permissions、server-truth） |
| A11 hasPermissionForRoute | 拔 isAdmin 短路 | N/A（前端只） | N/A | ⚠️ legacy fallback 仍在（S7） |

**標示規則**：✅ = 三層完整；⚠️ = workspace 隔離有、role 檢查缺；❌ = 只靠前端。

---

## admin 權限下降風險清單

1. **`/tenants` 路由**（SEVERE、必爆）：`settings.tenants` 不在 MODULES、不在 backfill、Corner admin 的 role_tab_permissions **沒有這筆**；PR-1d 一改前端守門、admin 進不去。搭配 `/api/tenants/create`、`/api/workspaces/[id]` DELETE、`/api/permissions/features` PUT 的 server guard 也 fail。
2. **`/ai-bot` 路由**（依 premium_enabled 狀態）：ai_bot 是 PREMIUM_FEATURE；若 workspace 未開付費大開關、admin 自己也進不去。
3. **`/workspace` 頻道路由**：workspace 本身是 premium feature、同上。
4. **`/accounting` / `/database`**（依 Corner workspace 當前 state）：不是 premium、但要 `role_tab_permissions` 有對應 row。P001 backfill 已處理、有 54 rows、**理論 OK 但要 e2e 驗一次**。
5. **`/hr/roles`**（B 類）：admin 能進、canAccess OK；但權限編輯時 render 依賴 isAdmin flag（見 hr/roles/page.tsx:386, 400, 408）、拔掉 isAdmin 後那個「admin 鎖死全開」的視覺狀態不見、可能讓 admin 誤把自己的權限關掉（UX bug、不是 security）。
6. **`/calendar` workspace switcher**（A 類）：非 admin 看不到選單、拔 isAdmin 後仍看不到（靠 workspaces.length > 0）、但語意飄移；不致命。

---

## 建議測試補強

### Blocker（PR-1d merge 前必備）

- **e2e `tests/e2e/admin-can-enter-all-routes.spec.ts`**：
  Corner admin / JINGYAO admin 兩人、依序訪問 `/tenants`、`/ai-bot`、`/accounting`、`/database`、`/hr/roles`、`/finance/settings`、`/finance/requests`、`/finance/treasury`、`/finance/travel-invoice`、`/finance/reports`、`/workspace`、`/calendar`；期待：不閃 UnauthorizedPage、不 redirect to /unauthorized、render 主要內容。
- **unit test `src/lib/permissions/__tests__/hasPermissionForRoute.test.ts`**：
  - admin=true 且 permissions=[] 時、access 任何路由應 true（或 false、取決於最終 contract）
  - admin=false 且 permissions=['accounting:vouchers'] 時、access `/accounting` 應 true
  - path `/accounting/../tenants` normalize 測試
- **DB 驗證 script**：
  ```
  SELECT wr.workspace_id, wr.name, COUNT(rtp.id)
  FROM workspace_roles wr LEFT JOIN role_tab_permissions rtp ON rtp.role_id = wr.id
  WHERE wr.is_admin = true GROUP BY 1,2;
  ```
  預期每個 admin 有 ≥ 54 row；**外加**必查有沒有 `(module='settings', tab='tenants')` 這筆（backfill 目前沒 seed）。

### 短期（P001-B 或 independent issue）

- **寫 API-level role guard 測試**（API BFLA suite）：
  - 非 admin role 打 `/api/accounting/vouchers/create` POST、應 403
  - 非 admin role 打 `/api/roles/[roleId]/tab-permissions` PUT、應 403
  - 非 admin role 打 `/api/hr/approval` POST、應 403
  - 這四支是 S2 列的高危寫 API、**目前 CI 不會抓到**。
- **RLS 測試**：
  - announcements insert 走 non-admin session、目前會成功（RLS `WITH CHECK (true)`）、測試應 fail → 迫使 policy 收緊。

### 長期（pattern P008 / P007 合流）

- 建 `hasRole(moduleCode, tabCode, action)` shared helper、後端 API 全部改用、不再散落 `if (!isAdmin)`。
- audit log：高危 API（accounting / roles / tenants）寫入時 log `actor_employee_id / target / action`、留 8 週可追。

---

## 給主席彙整的三行話

1. 🔴 S1 先驗 DB：Corner admin 在 `role_tab_permissions` 有沒有 `settings.tenants` 跟所有 54 row；沒有先補。ModuleGuard 的 admin bypass 在 PR-1d **不動**（搭 S4）。
2. 🔴 S2 PR-1a 的 canEdit loading 放行**拿掉**、canAccess 保留即可；後端寫 API（accounting / roles / hr/approval / suppliers）延 P001-B 補 role 守門。
3. 🟠 S5 B1/B2 layout 硬 coded 寫 `canAccess('/accounting')`、不傳 pathname；加 `hasPermissionForRoute` input normalize。
