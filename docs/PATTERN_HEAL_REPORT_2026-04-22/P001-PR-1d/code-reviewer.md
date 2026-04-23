# P001 PR-1d — Code Reviewer 審查意見

## 摘要

預設修法方向**大方向正確**（拔 isAdmin 短路、改走 workspace feature + role permission），但**細節有三個致命落差**會讓 PR merge 後直接退化為**「擴權 + 破窗」**：

1. (B) 系列用 `canAccess(route)` 替 `isAdmin` 只守住 **workspace 有沒有這功能**、**完全沒守住 user 有沒有這權限**（`useRolePermissions.canRead` 預設 true）。
2. (A7-A10) 直接刪 `useTabPermissions` 的短路、**同時沒改 fetchPermissions**（第 53-59 行 admin 走 `setPermissions([])`），admin 會全站 false、整站白屏，比 PR-1a 當初的情況還慘。
3. (B) 用 `canViewFinance` / `canEditDatabase` 這種模組級 bool 替原本「admin only」的設定頁、**granularity 掉太多層**，會把 `/finance/settings`、`/database/workspaces` 這種原本只給老闆動的頁開給一般會計 / DB 操作員。

另 B8 `WorkspaceSwitcher` **不該走 canAccess**，那是 UI 元件、不是頁面閘道；改掉會讓所有 settings 使用者看到跨租戶切換器，是 **privilege escalation**。

---

## 3 個最致命漏洞

### F1：`canAccess(route)` 只檢 workspace feature、沒檢 user role permission — B1-B7 會變成「全 workspace 用戶都能進」

**命中點**：
- `src/lib/permissions/hooks.ts:283-292` `canAccess` 實作
- `src/lib/permissions/hooks.ts:249-263` `useRolePermissions.canRead / canWrite` → `perm?.can_read ?? true`（**預設 true**）
- B1 `accounting/layout.tsx:13` → canAccess('/accounting')
- B2 `database/layout.tsx:14` → canAccess('/database')
- B3-B7 所有 finance 子頁

**為什麼致命**：
`useRolePermissions` 在檔案內 `permissions` **永遠是空陣列**（line 243：`useState<RolePermission[]>([])`、沒有 fetch），所以 `canRead` 的 `permissions.find(...)` 恆為 undefined、回 `true`（預設放行）。結果 `canAccess` 實際只在檢 `workspaceFeatures.isRouteAvailable(route)` — **只檢這個 workspace 是否買了 finance/accounting/database 功能**、**沒檢使用者 role 是不是真的有這模組權限**。

現實情境：Corner workspace 買了 finance 模組（所有會計用戶都能用），但 `/finance/settings`（改會計科目、改付款方式）**原本只給系統主管**。改成 `canAccess('/finance/settings')` 後、**全 Corner 會計都能改會計科目**。這不是功能退化、是**權限放寬**、等於在上線前一週把 系統主管 gate 開成 workspace gate。

**修法補強**（不需改方向、只需補一層）：
```ts
// hooks.ts canAccess 要實際檢 userPermissions（目前 useRolePermissions 是空殼）
const canAccess = useCallback(
  (route: string): boolean => {
    if (workspaceFeatures.loading) return true
    if (!workspaceFeatures.isRouteAvailable(route)) return false
    // 👇 新增：檢 user.permissions 有沒有這模組 key
    const moduleCode = getModuleFromRoute(route)
    if (moduleCode && !user.permissions.some(p => p === moduleCode || p.startsWith(`${moduleCode}:`))) {
      return false
    }
    return true
  },
  [workspaceFeatures, user.permissions]
)
```
**或者**、B1-B7 **不用 canAccess、改用 useTabPermissions.canRead('finance', 'settings')** — 那個 hook 才是真的查 `role_tab_permissions`。預設修法上「用 canAccess」這個選擇本身就該打問號。

---

### F2：A7-A10 刪 `useTabPermissions` 短路但沒改 fetchPermissions — admin 全站白屏

**命中點**：
- `src/lib/permissions/useTabPermissions.tsx:53-59`（fetchPermissions 對 admin 走 `setPermissions([])`、直接 return）
- `src/lib/permissions/useTabPermissions.tsx:80, 97, 113, 121` 4 處 `if (isAdmin) return true`
- 下游：`PermissionGuard` 元件（同檔 line 147）、以及 channel-sidebar、finance tab gating 等所有叫這 hook 的地方

**為什麼致命**：
檔案內部 fetchPermissions 對 admin 的路徑是：
```ts
if (roleData.is_admin) {
  setIsAdmin(true)
  setPermissions([])  // ← 故意留空、因為後面有短路
  return
}
```
然後 canRead / canWrite / canReadAny / canWriteAny 都靠 `if (isAdmin) return true` 接住這個空陣列。

**如果只刪短路不改 fetch**：admin 進來、permissions=[]、`permissions.find(...)` 回 undefined → `canRead` 回 false。**所有用 `useTabPermissions` 的 UI 元件對 admin 全部 gating 失敗**、按鈕消失、tab 消失、core page 破碎。

這比 PR-1a 當初「auth-store 白屏」還慘，因為：
- PR-1a 的修法（backfill role_tab_permissions）已經補了資料、但這個 hook **根本不會去 fetch admin 的 row**（第 53-59 行是 early return）。
- PR-1a 的測試 `admin-login-permissions.spec.ts` 只驗 `/api/auth/validate-login` 的回傳、**沒驗** `/api/roles/:roleId/tab-permissions` 對 admin 的回傳、也**沒驗** `useTabPermissions` hook 本身。

**修法補強**：
A7-A10 的修法必須是**雙層改**：
1. **改 fetchPermissions**：拿掉 `if (roleData.is_admin) { setPermissions([]); return }` 這段、讓系統主管 也正常走 `/api/roles/:roleId/tab-permissions` 的 fetch 把 54 個 row 讀進來（PR-1a backfill 已把資料準備好）。
2. **再刪 4 處 isAdmin 短路**。

**順序反了 = 生產事故**。Senior Dev 的草案如果只改 2 不改 1，或兩者沒同一 commit 落地、上線那刻 admin 就白屏。

---

### F3：B 系列用 `canViewFinance` / `canEditDatabase` 這種「模組級 bool」替「系統主管 gate」— 層級掉太多、靜默擴權

**命中點**：
- `src/hooks/usePermissions.ts:37-41` canViewFinance / canManageFinance / canEditDatabase 的實作（都是 `hasModulePermission(userPermissions, 'finance' | 'database')`）
- B1: `/accounting/layout.tsx` → 原本 admin-only / 預設改 canAccess('/accounting') 或 canManageFinance
- B2: `/database/layout.tsx` → 覆蓋 9 個子路由（含 `/database/workspaces` 這種超 admin）
- B3: `/finance/settings/page.tsx:433` → 改會計科目、付款方式、銀行帳戶
- B8: `WorkspaceSwitcher.tsx:16` → 跨租戶切換器

**為什麼致命**：
`hasModulePermission(perms, 'finance')` 只要 perms 裡有**任何** `finance:*` 的 key 就回 true。admin 在 backfill 後有所有 11 個 finance tab，**但** 一般會計員可能只有 `finance:payments` 和 `finance:requests`、沒有 `finance:settings`。如果 B3 改成 `canManageFinance`、一般會計員也能進 finance/settings 改會計科目了。

**更嚴重的是 B8**：`WorkspaceSwitcher` 是 **settings 頁面上一個跨租戶切換小卡**、這是**平台管理資格 功能**、不是租戶內功能。預設修法寫「依用途判斷」= 沒判斷。如果 senior dev 誤用 `canAccess('/settings')`、**全 workspace 用戶都能看到這張卡**、點進去 `localStorage.setItem('current_workspace_filter', ...)`、然後 reload — 可能導致 UI 以為他切到別的 workspace、雖然後端 RLS 擋、但 UX 錯亂 + 等於暗示有「切換」這個動作存在。

**修法補強**：
| 項目 | 錯誤選項 | 正確選項 |
|------|----------|----------|
| B1 accounting layout | canAccess('/accounting') 或 canManageFinance | `useTabPermissions.canReadAny('accounting')` + feature 檢查 |
| B2 database layout | canAccess('/database') 或 canEditDatabase | `useTabPermissions.canReadAny('database')`；注意 `/database/workspaces` 子頁要加 **額外** admin 檢查 |
| B3 finance/settings | canManageFinance | `useTabPermissions.canWrite('finance', 'settings')`（這是 backfill 過的 tab key） |
| B4 finance/requests | canViewFinance | `useTabPermissions.canRead('finance', 'requests')` |
| B5 finance/treasury | canManageFinance | `useTabPermissions.canRead('finance', 'treasury')` |
| B6 finance/travel-invoice | canViewFinance | `useTabPermissions.canRead('finance', 'travel-invoice')` |
| B7 finance/reports | canViewFinance | `useTabPermissions.canRead('finance', 'reports')` |
| B8 WorkspaceSwitcher | canAccess('/settings') / 依用途判斷 | **維持 isAdmin**（這是平台 admin、不是 workspace 功能）；或引入新概念 `isPlatformAdmin` |

原則：**一律用 `useTabPermissions.canRead/canWrite(module, tab)` 去打 role_tab_permissions、別繞 `canAccess` 這個空殼。**

---

## 邊界條件清單

1. **Admin 第一次登入、workspaceFeatures.loading=true 瞬間**：`canAccess` 回 true（PR-1a 配套），ModuleGuard 顯示 `<ModuleLoading fullscreen />`。但 `useTabPermissions.loading=true` 時，B 系列頁面 `canRead` 回 **false**（檔案內無 loading 放行邏輯） → 頁面閃 `<UnauthorizedPage />` → load 完再跳回頁面。**這個閃爍 PR-1a 已修過、PR-1d 會再度引入、除非 useTabPermissions 也加 `if (loading) return true` 放行**。
2. **Admin 切 workspace 當下**：`featureCache.workspaceId !== user.workspace_id` 會清快取、loading=true → 仍由 (1) 的 loading 放行保護。但 `useTabPermissions` 內部 state 沒感知 workspace 切換、舊的 `permissions` state 仍在。需要 `useEffect` dep 加 `user?.workspace_id`（目前只有 `user?.id`）。**這是既有 bug、PR-1d 不修、但 admin 切換當下會看到舊 workspace 的權限、然後 fetch 回新的**。
3. **role_tab_permissions 查不到某個 tab（seed race / 漏 migration）**：`canRead` 回 false。對沒有系統主管資格 是正確行為。對 admin、backfill migration 應該已補、但**未來新增 module/tab、backfill 不會自動跑**（migration 只跑一次）、結果：新 tab 給 admin 回 false。**必須有 CI / test 守「module-tabs.ts 新增 → backfill 同步」**。
4. **Feature 被系統主管臨時關閉、admin 本在該頁**：`workspaceFeatures.isRouteAvailable` 回 false → `canAccess` 回 false → ModuleGuard useEffect 跑 `router.replace('/unauthorized')` → admin 當下被踢。**這是預期行為（feature 關了誰都不能進）、但 UX 上應該給個 toast 解釋而不是直接跳 404-like 頁**。
5. **沒有系統主管資格 用戶有 `finance:payments` 但沒 `finance:settings`、用 URL 打 `/finance/settings`**：如 F3 所述、預設修法的 `canManageFinance` 會放行。**這是 PR-1d 最大的擴權風險**。
6. **`/database/workspaces` 子頁**：B2 layout 改 canAccess('/database') 後、database 層所有 9 個子頁都開 — 包含 `/database/workspaces` 這種「管所有租戶」的超 admin 頁。目前只有 layout 層的 系統主管 gate、底下子頁沒有。必須**在 `/database/workspaces/page.tsx` 底層再加一層 admin 檢查**、不能只靠 layout。
7. **ModuleGuard.features.length === 0 的 fallback**（index.ts 的 `features.length === 0 → setChecked(true)`）：如果 `/api/permissions/features` fetch 失敗、所有用戶變成 **全開**（包含沒有系統主管資格 進 admin-only 頁）。**這不是 PR-1d 引入的、但 PR-1d 拔 admin 短路後這個洞就更大**、因為原本「沒有系統主管資格 進不去」有頁面層 isAdmin 兜底、拔了之後只剩 ModuleGuard 的這個 fallback — **建議改為 `if (features.length === 0 && !loading) return setChecked(false) + router.replace('/unauthorized')`**。

---

## 必測清單

- [ ] `tests/e2e/admin-login-permissions.spec.ts` 必 pass（守 admin 54 個 role_tab_permissions row 齊全）
- [ ] `tests/e2e/login-api.spec.ts` 必 pass（RLS 紅線、不能動 workspaces FORCE RLS）
- [ ] 新增 `tests/e2e/admin-useTabPermissions.spec.ts` 測 admin 進 `/finance/payments` 時 `useTabPermissions.canRead('finance', 'payments')` = true；admin 打 `/api/roles/<admin_role_id>/tab-permissions` 回傳 ≥ 54 row
- [ ] 新增 `tests/e2e/accountant-no-finance-settings.spec.ts` 測**沒有系統主管資格 會計**（只有 `finance:payments` / `finance:requests`）打 `/finance/settings` 回 `<UnauthorizedPage />`、**不是**放行（守 F1 / F3）
- [ ] 新增 `tests/e2e/沒有系統主管資格-no-database-workspaces.spec.ts` 測 database 權限用戶打 `/database/workspaces` 回 `<UnauthorizedPage />`（守 F3 / 邊界 6）
- [ ] 新增 `tests/e2e/沒有系統主管資格-no-workspace-switcher.spec.ts` 測沒有系統主管資格 進 `/settings`、頁面上**不顯示** WorkspaceSwitcher 卡（守 B8 不要誤用 canAccess）
- [ ] 擴充 `tests/e2e/tab-gating.spec.ts` 加：admin 所有頁 tab 都可見（回歸測試、防 A7-A10 fetchPermissions 不改就刪短路的意外）
- [ ] Playwright manual：admin 登入 → 跑一輪側邊欄所有項目 → 每個都進得去、都看得到按鈕
- [ ] Playwright manual：admin 切 workspace → 新 workspace 的 permissions 有載入（useTabPermissions dep 可能漏 workspace_id）
- [ ] `npm run type-check` 必 pass（CLAUDE.md 紅線）

---

## 待 Senior Dev 草案對齊的點

1. **A7-A10 的 fetchPermissions 改沒改？** — 光刪短路不改 fetch = 全站白屏。兩處必須同 commit 落地。
2. **B1-B7 有沒有用 `useTabPermissions.canRead/canWrite(module, tab)` 而不是 `canAccess(route)` 或 `canViewFinance` ？** — 用後者會 granularity 掉層、擴權。
3. **B8 WorkspaceSwitcher 保留 isAdmin 嗎？** — 這是平台管理資格、不該降成 workspace feature。
4. **`useRolePermissions` 這個空殼要不要填真資料？** — 如果 `canAccess` 要當作真 gate、`useRolePermissions` 必須實際 fetch user 的 role permissions、不能 state 永遠 []。
5. **`/database/workspaces` 底層有沒有補第二層 系統主管 guard？** — layout 層改 `canAccess('/database')` 後、子頁暴露。
6. **ModuleGuard 的 `features.length === 0 → 全開` fallback 要不要同批處理？** — PR-1d 拔 isAdmin 後這個洞變大、應該順便收緊為 default-deny。
7. **有沒有跑 `gitnexus_impact({target: "isAdmin", direction: "upstream"})`？** — 19 處改動、upstream blast radius 建議 PR 內附。
8. **Admin 切 workspace 的 useEffect dep 要不要補 `user?.workspace_id`？** — 既有 bug、PR-1d 不一定要一起修、但 PR description 應該標註。
9. **`useTabPermissions.loading=true` 的放行策略要不要像 `canAccess` 一樣加 `if (loading) return true`？** — 不加 = admin 每次 load 閃 UnauthorizedPage。加 = 破壞 default-deny 原則。這個取捨 senior dev 怎麼選？
10. **未來 module-tabs.ts 新增 tab 的 CI 守門？** — backfill migration 只跑一次、之後新 tab admin 會漏。建議加個 type-check / unit test 確保 migration 和 module-tabs.ts 對齊。
