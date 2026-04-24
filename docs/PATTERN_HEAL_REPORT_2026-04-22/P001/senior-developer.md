# P001 — Role-gate 偽裝（isAdmin 大鎖）修法草案

**作者**：senior-developer（engineering 幕僚）
**日期**：2026-04-22
**範圍**：只寫草案、不動代碼。主席收斂 4 份意見後 William 拍板才動。

---

## 1. 修法總方針（< 200 字）

**把 `isAdmin` 從「身分 flag 兼 bypass 權」降級為純 `audit_flag`、唯一的權限真相改為 `role_tab_permissions`（已由 P010 修完 RLS）**。系統主管不是超人、是一個在建 workspace 時**預先勾滿所有 can_read/can_write 的普通 role**。前端 hook 不再短路、後端敏感 API 不再問 `isAdmin`、統一問 `hasPermission(user, 'module.tab.action')`。對應 `_INDEX.md` 原則 1：「權限長在人身上、不是頭銜上」——頭銜只是 UI 顯示用的標籤、真正的門鎖永遠是那張名牌上的通行證列表。

---

## 2. 分階段執行計劃（Phase A/B/C、各自可 revert）

估時 2 人週，拆 3 phase、每 phase 獨立 PR、獨立 migration、獨立可 revert：

| Phase                               | 範圍                                                                                                                                                                                                                                                       | 估時 | 風險                                                                                      | 可 revert？                   |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------- | ----------------------------- |
| **A — DB 補血**                     | 建 workspace 時系統主管 role 已 seed 全權、但要補歷史 workspace 的 系統主管職務 缺權限；新增 `getWorkspaceAdminPermissions()` helper 供後端 API 用                                                                                                         | 2 天 | 低（只加資料不改代碼行為）                                                                | ✅ 一條 SQL 反向 migration    |
| **B — 後端 API 4 支去 isAdmin**     | create-employee-auth / reset-employee-password / admin-reset-password 改成 `hasPermission(user, 'hr.employees.write')` / `'hr.employees.reset_password'`                                                                                                   | 3 天 | 中（若 系統主管職務 漏 seed 會整個 workspace 系統主管做不了事；Phase A 是 precondition）  | ✅ git revert 回 isAdmin 檢查 |
| **C — 前端 3 處短路移除 + UI 調整** | auth-store `checkPermission`、`usePermissions.canAccess/canEdit`、舊 `hooks/usePermissions.ts` 的 `isAdmin \|\|` 短路；`finance/payments/page.tsx:211` 改問 `canRead('finance','payments')`；`tour-itinerary-tab.tsx:80` 改問 `canWrite('database','...')` | 5 天 | 中（cross-cutting、40+ 檔案雖只有 7 處核心點、但 UI 展示層還有 sidebar/profile 等要驗收） | ✅ 每檔獨立 revert            |

**順序鐵律**：A → B → C 不可並行、也不可倒裝。Phase A 沒補、Phase B 合的瞬間所有舊 workspace 的系統主管變殘廢。

---

## 3. 每個命中點的具體修法（7 處）

### 3.1 `src/stores/auth-store.ts:249` — `checkPermission` 短路

**改法（Phase C）**：

```typescript
checkPermission: (permission: string) => {
  const user = get().user
  if (!user) return false
  // ❌ 移除：if (get().isAdmin) return true
  // isAdmin 降級為純 audit_flag、不再是 bypass
  return user.permissions.some(p => p === permission || p.startsWith(`${permission}.`))
},
```

**動的檔**：`src/stores/auth-store.ts`
**前後行為對比**：

- 前：系統主管 任何 permission key 都 return true、`user.permissions` 形同虛設
- 後：系統主管 的 `user.permissions` 在 Phase A 補齊後含所有 key、結果等價但經過查表；沒有系統主管資格 行為完全不變

### 3.2 `src/lib/permissions/hooks.ts:284, 293` — `usePermissions.canAccess/canEdit`

**改法（Phase C）**：

```typescript
const canAccess = useCallback(
  (route: string): boolean => {
    // ❌ 移除：if (isAdmin) return true
    if (!workspaceFeatures.isRouteAvailable(route)) return false
    if (!rolePermissions.canRead(route)) return false
    return true
  },
  [workspaceFeatures, rolePermissions] // isAdmin 從 deps 拿掉
)
// canEdit 同樣處理
```

**動的檔**：`src/lib/permissions/hooks.ts`
**前後行為對比**：系統主管 經過 feature 開關 + role permission 查詢兩層、`workspace_features` 關掉的 feature 系統主管也進不去（符合業務意圖——租戶沒買這個功能、系統主管也不該看到）。

### 3.3 `src/hooks/usePermissions.ts:34-48` — 舊版 permission bool 短路

**改法（Phase C）**：

```typescript
return {
  canViewReceipts: hasModulePermission(userPermissions, 'finance.payments.read'),
  canCreateReceipts: hasModulePermission(userPermissions, 'finance.payments.write'),
  canEditReceipts: hasModulePermission(userPermissions, 'finance.payments.write'),
  canConfirmReceipts: hasModulePermission(userPermissions, 'finance.payments.confirm'),
  // ... 全部去掉 isAdmin ||
  isAdmin, // 保留欄位供 UI 顯示「系統主管」標籤用、但不再用於決策
  // ...
}
```

**動的檔**：`src/hooks/usePermissions.ts`
**注意**：這個 hook 跟 `lib/permissions/hooks.ts` 是兩份、符合 P007 「兩本清單」病、但**本次不合併**（surgical）、只把 `isAdmin ||` 拿掉。

### 3.4 `src/app/api/auth/create-employee-auth/route.ts:95-123`

**改法（Phase B）**：

```typescript
// 現行：const isAdmin = await checkIsAdmin(auth.data.employeeId)
const userPerms = await getEmployeePermissions(auth.data.employeeId)
const canCreateEmp = userPerms.includes('hr.employees.create')

// 新租戶第一個系統主管：仍保留 CORNER 系統主管 特例（這是跨租戶 bootstrap、屬 P003 範圍）
if (isNewTenant) {
  const isCornerAdmin = userPerms.includes('_system.cross_tenant_admin')
  if (!isCornerAdmin) return errorResponse('建立新租戶需要 CORNER 的系統主管權限', 403, ...)
} else {
  if (!canCreateEmp) return errorResponse('沒有建立員工的權限', 403, ...)
}
```

**動的檔**：

- `src/app/api/auth/create-employee-auth/route.ts`
- 新增 `src/lib/auth/permissions-server.ts` 放 `getEmployeePermissions(employeeId) → string[]`（查 role_tab_permissions + employee_permission_overrides、跟 validate-login 同邏輯抽出來）

**前後行為對比**：系統主管職務 在 Phase A 補好 `hr.employees.create` 後、行為不變；日後 William 可在 /hr/roles 給「助理」勾這個 key、助理也能建員工（目前完全不可能）。

### 3.5 `src/app/api/auth/reset-employee-password/route.ts:56-57`

**改法（Phase B）**：

```typescript
const userPerms = await getEmployeePermissions(auth.data.employeeId)
if (!userPerms.includes('hr.employees.reset_password')) {
  return errorResponse('沒有重設密碼的權限', 403, ErrorCode.FORBIDDEN)
}
```

**動的檔**：同上檔 + 共用 `permissions-server.ts`

### 3.6 `src/app/api/auth/admin-reset-password/route.ts:58-59`

**改法（Phase B）**：同 3.5、permission key 用 `hr.employees.reset_password`（同一動作、同一 key、不要為了 endpoint 名不同發明新 key）。

**動的檔**：同上。

### 3.7 UI 層 — `finance/payments/page.tsx:211` + `tour-itinerary-tab.tsx:80`

**finance/payments（Phase C）**：

```typescript
const { canRead } = useTabPermissions()
// ❌ 移除：if (!isAdmin) return <UnauthorizedPage />
if (!canRead('finance', 'payments')) return <UnauthorizedPage />
```

**tour-itinerary-tab（Phase C）**：

```typescript
const { canWrite } = useTabPermissions()
// ❌ 移除：const canEditDatabase = isAdmin || currentUser?.permissions?.includes('database')
const canEditDatabase = canWrite('database', null) // module-level、不指定 tab
```

**動的檔**：兩個對應檔。`useTabPermissions` 內部 Phase C 後 `isAdmin` 分支也該移除（已在 3.1/3.2 範疇內）、但 **`useTabPermissions.tsx:54, 80, 97, 112, 122`** 5 處的 `isAdmin` 短路要跟 auth-store 一併處理（同 Phase C、同檔補 edit）。

### 3.8 `validate-login/route.ts:143-157, 212` — **不動**

這段是登入時計算 `isAdmin` + permissions 簽進 response body、供 front store 使用、**正確用途**（audit_flag + 權限 cache）、不屬於 bypass。保留原樣。

---

## 4. DB 層配套（Phase A 細節）

**現況盤點**：

- `src/app/api/tenants/create/route.ts:271-277` 建新 workspace 時**只 seed 15 個 module 的 module-level 權限**（tab_code = null）、沒有 tab 粒度、也缺 `settings.permissions` 等細分 key
- `src/app/api/workspaces/route.ts:165-197` 另一條建 workspace 路徑、seed 邏輯不同（遍歷 MODULES 常數、有 tab 粒度）
- 歷史 workspace（Corner / JINGYAO / YUFEN）走的是前者 or 手動建、系統主管職務 的 `role_tab_permissions` **不保證齊全**

**Phase A 具體動作**：

1. **統一 seed 邏輯為一個 function**（不動 DB schema、只重構代碼）：

   ```
   src/lib/workspace/seed-系統主管-permissions.ts
     export function buildAdminPermissionRows(roleId, workspaceId) → Row[]
       - 遍歷 MODULES 常數（module-tabs.ts）
       - 每個 module × 每個 tab 都給 can_read: true, can_write: true
       - 加入所有 API action key（'hr.employees.create', 'hr.employees.reset_password' 等）
   ```

   兩條建 workspace 路徑都改用這個 function。

2. **補歷史 workspace 的 系統主管職務**：一次性腳本 `scripts/backfill-系統主管-permissions.mjs`（非 migration、冪等、可重跑）：

   ```
   - 查所有 workspace_roles WHERE is_admin = true
   - 對每個 系統主管職務 執行 upsert buildAdminPermissionRows()
   - DRY_RUN=true 跑一次給 William 看 diff、再正式跑
   ```

3. **action key 定義**：在 `src/lib/permissions/action-keys.ts` 集中定義（**本次新增**）：
   ```typescript
   export const ACTION_KEYS = {
     HR_EMPLOYEES_CREATE: 'hr.employees.create',
     HR_EMPLOYEES_RESET_PASSWORD: 'hr.employees.reset_password',
     FINANCE_PAYMENTS_CONFIRM: 'finance.payments.confirm',
     // ...
   } as const
   ```
   API 層只用這個常數、不出現字串字面值。**這張清單本身不是 SSOT**（SSOT 是 DB + MODULES 常數）、只是給 TypeScript 防打錯的 enum。

**不動的**：DB schema（P009 會動 trigger、P007 會動 module_registry、本次不碰）。

---

## 5. 為什麼這樣拆（Phase 順序論證）

### 為什麼 A 先

**否則 B 合的瞬間系統主管變殘廢**。歷史 workspace 的 系統主管職務 如果只有 15 個 module-level 權限、`hr.employees.create` 這個 action key 根本不存在於他的權限清單、Phase B 的新檢查 `userPerms.includes('hr.employees.create')` 永遠 false、系統主管連建員工都做不了。Phase A 不補血、Phase B 等於關門把系統主管鎖在外面。

### 為什麼 B 在 C 前

**後端是最後防線、先守住才放心拆前端短路**。如果順序倒裝、Phase C 先拿掉前端 `isAdmin` 短路：

- 情境 1（B 未做）：前端 hook 查 permissions 展示「沒權限」、但敏感 API 還在看 `isAdmin`、雙層不一致、用戶可能 UI 看不到按鈕但 curl 打 API 還是通
- 情境 2（B 先做 C 後做）：API 守住、前端短路還在 → 系統主管 照樣可以看到按鈕、但後端攔截、至少不會誤觸發
  情境 2 明顯比情境 1 安全。所以 B 在 C 前。

### 為什麼 C 最後且獨立

前端短路移除是「認知負擔」最大的一步（40+ 檔案 grep 得到）、但**核心命中點只 7 處**、其餘是顯示層（sidebar 灰掉、profile 顯示「系統主管」標籤等）、這些保留 `isAdmin` flag 但不用於決策是 OK 的。Phase C 的風險在 regression、需要 William 手測每個「系統主管能看到 / 員工看不到」的畫面。所以單獨一 phase、便於回歸測試集中安排。

### 為什麼不一次合（bundled PR）

- **Revert 粒度**：任何一 phase 出事、只 revert 那一 phase、另外兩 phase 的成果保留
- **William 風格**：一對一、慢慢做、每 phase 驗收點清晰
- **Pattern-map 指引**：P001 依賴 P015（unit test 前置）、但 P015 是獨立 PR-0、不納入本次。B 和 C 分開後、各自可以先補該 phase 的 unit test 再動手

---

## 6. 測試計劃

### Phase A 驗收

- `npm run type-check` ✅
- 跑 `scripts/backfill-系統主管-permissions.mjs --dry-run` → 輸出 diff、William 確認要 upsert 的 row 數合理
- 正式跑後、SQL 直查 `SELECT COUNT(*) FROM role_tab_permissions WHERE role_id IN (SELECT id FROM workspace_roles WHERE is_admin)` → 每個 workspace 的 系統主管職務 權限數量 ≥ MODULES 展開的總數
- e2e：以 系統主管 身分登入 Corner / JINGYAO / YUFEN、檢查 /hr/roles 顯示系統主管 role 所有 toggle 都打勾

### Phase B 驗收

- `npm run type-check` ✅
- **新增 unit test**（補 P015 缺口）：`src/lib/auth/__tests__/permissions-server.test.ts` 覆蓋 `getEmployeePermissions` 3 種情境（系統主管 補齊 / 一般 role 精確 / 覆蓋 override 生效）
- **新增 API test**：`tests/api/auth-create-employee.test.ts` 覆蓋「系統主管職務 能建 / 助理 role 不能建 / 助理被勾 `hr.employees.create` 後能建」
- 手測：以「助理」登入、打 /api/auth/create-employee-auth → 應 403；系統主管登入 → 應 200

### Phase C 驗收

- `npm run type-check` ✅
- **e2e**：
  - 系統主管 進 /finance/payments 看到整頁（同現行）
  - 會計（`finance.payments.read` 勾了）進 /finance/payments 看到列表、確認按鈕按 role 細分
  - 業務（沒勾 finance）進 /finance/payments 看到 UnauthorizedPage
- `gitnexus_detect_changes` 確認改動範圍在預期內（40+ 檔案中的 7 核心點 + 2-3 個 shared hook）
- William 手測清單（見 §7）

### 全案完工驗收（William 業務話）

1. 「我去 /hr/roles 把『會計』的『公司收款 > 核准』勾掉、會計登入後 /finance/payments 進得去但按不到核准鍵」
2. 「我把『助理』新增一個『建員工』權限、助理登入後 /hr 能看到新增員工按鈕且按下去真的能建」
3. 「isAdmin 這個欄位在代碼裡 grep 只剩顯示用（sidebar 標籤 / profile 名牌 / audit log）、沒有任何一條 if 分支會因為它 return true」

---

## 7. 風險清單

### 容易退化的地方（regression risk）

| 風險                                                        | 緣由                                                                                                              | 防線                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **系統主管 role 漏 seed 某個 key**                          | Phase A 依賴人工確保 buildAdminPermissionRows 跟 MODULES / ACTION_KEYS 同步                                       | 寫 detector 腳本（pattern-map §自動偵測第一支）定期掃                                                                                                                                                                                                                |
| **40+ 檔案 grep 到 isAdmin 有遺漏**                         | gitnexus 報 LOW risk 但索引可能 stale（pattern-map 註明）                                                         | Phase C 前全檔 grep、列清單、每檔 review；保留非決策用的 isAdmin（顯示標籤）不刪                                                                                                                                                                                     |
| **Key 格式分隔符 `.` vs `:` 混用**                          | validate-login:171 目前簽進 JWT 的是 `module:tab` 格式、但 hooks.ts:177 用 `${module}.${tab}`                     | 本次統一用 `.`（pattern-map P008 推薦）、但要改 validate-login 的 permSet 組 key 的地方、並一次性跑一個 migration 把既有 employee_permission_overrides 的 key 改過來；這會擴大本次 scope、**建議延後到 P008 做**、本 PR 維持現格式、只在新增的 action key 一律用 `.` |
| **old `useTabPermissions` 有自己的 系統主管 short-circuit** | 第 54 行 `if (roleData.is_admin) { setIsAdmin(true); setPermissions([]) }` 會讓系統主管 的 permissions 設成空陣列 | Phase C 改：admin 也 fetch 完整 permissions、不要空陣列、`isAdmin` 只作 audit flag                                                                                                                                                                                   |
| **validate-login JWT 沒 permissions_version**               | 改了 role_tab_permissions 後、線上 系統主管 要 1 小時才重登取新權限（P011）                                       | 本次不修 P011、但 Phase A backfill 後建議 William 讓所有系統主管手動重登一次                                                                                                                                                                                         |

### William 必須親自手測

1. **Corner workspace**：自己登入、點進每個模組（/hr / /finance/_ / /tours / /accounting/_ / /settings/\*）、確認所有原本能做的事還能做
2. **JINGYAO / YUFEN**：請兩家的系統主管登入測一輪（至少能進所有頁面）
3. **沒有系統主管資格 員工**：找一個業務 / 會計員工登入、確認該員工原本看不到的頁面**仍然看不到**、原本看得到的**仍然看得到**
4. **`sidebar.tsx` 和 `mobile-sidebar.tsx`**：確認左側選單顯示規則仍對（很多 `isAdmin &&` 控制選單可見、Phase C 後邏輯會從「admin 全顯」變「按 permission 顯」、視覺結果應等價但 cherry-pick 核對）

### 本次 **不**處理（主席請拒絕擴張）

- 合併 `hooks/usePermissions.ts` 和 `lib/permissions/hooks.ts` 兩本（P007 範圍）
- 統一 key 分隔符為 `.`（P008 範圍）
- DB 補 CHECK constraint 擋 key 格式（P007 範圍）
- role_tab_permissions trigger cascade（P009 範圍）
- JWT permissions_version（P011 範圍）

這些是 surgical 紅線、順手改會把 PR 撐爆、review 失控。

---

## 附：不動原則對照表

| 紅線                       | 本案是否觸及                                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| Surgical changes           | ✅ 只動 7 核心點 + 1 個 shared helper + 1 個 backfill script                                        |
| No workarounds             | ✅ 根因是「isAdmin 被當 bypass」、直接讓 DB 有全權 系統主管職務、代碼只查 role 權限、不是 hack 一層 |
| UI 欄位名跟 DB 對齊        | ✅ permission key 格式本次不統一（延後 P008）、但新增 action key 一律 `.` 符合 pattern-map 推薦     |
| 不動 DB schema             | ✅ 只動代碼 + seed 函式 + 一次性 backfill 資料、不 alter table                                      |
| 紅線：workspaces FORCE RLS | ✅ 完全不碰                                                                                         |
| 紅線：審計 FK 指 employees | ✅ 完全不碰                                                                                         |

Phase A/B/C 全部通過 `npm run type-check`、符合 CLAUDE.md Build 規則、不用 `--no-verify`。

---

_end of senior-developer.md_
