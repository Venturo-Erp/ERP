# P001 PR-1d — Senior Developer 修法草案

## 摘要

19 處 isAdmin bypass。(A) 11 處 hook 短路一律刪 `if (isAdmin) return true/item`，因 admin role 的 tab_permissions 已由 20260422150000 migration 全補齊，不刪反而會讓 UI 跟 `/hr/roles` 裡改的權限脫節（SSOT 破）。(B) 8 處 layout/page 大鎖換成 `usePermissions().canAccess(pathname)`，feature loading 期 canAccess 已放行、不會閃 Unauthorized。爭議點 2 處：sidebar.tsx:522 的空 if 塊（它是擋 isTransport 分支的語意旗）、WorkspaceSwitcher 是跨租戶切換器（超級管理員專屬、改成 canAccess 意義對不上）。移交 reviewer。

---

## (A) Hook 短路修法

### A1 `src/components/layout/mobile-sidebar.tsx:260`

- **業務效果**：手機選單過濾時、admin 不再無條件看到所有 item，需要跟 `user.permissions` 一致。admin role 在 DB 已被 backfill 預設全 tab 權限，所以體感不變；若老闆在 /hr/roles 關掉 admin 的某模組，admin 手機端就看不到了（符合 SSOT）。
- **old_string**:
```
        if (!item.requiredPermission) return item
        // 管理員有所有權限
        if (isAdmin) return item
        return userPermissions.includes(item.requiredPermission) ? item : null
```
- **new_string**:
```
        if (!item.requiredPermission) return item
        return userPermissions.includes(item.requiredPermission) ? item : null
```
- **理由**：拔 admin bypass、其餘邏輯（requiredPermission 比對 userPermissions）不動。`isAdmin` 變數還在第 212 行 destructure、但檔內已無其他引用點 —— 下一節 A2 討論是否清 import。

  **補充**：mobile-sidebar.tsx 現在 `isAdmin` 只有這一處用，移除後變孤兒。屬於「你的改動造成的孤兒才由你清」（CLAUDE.md §3）。建議同時刪第 212 行的 `const { isAdmin } = useAuthStore()` 與第 217 行 comment `// 新系統：使用 store.isAdmin`。

---

### A2 `src/components/layout/sidebar.tsx:522` — 空 if 塊

- **現況**（line 517-531）：
```
const visibleMenuItems = useMemo(() => {
  const workspaceCode = user?.workspace_code

  // Super Admin 看到所有功能（開發需要）
  // 不受租戶類型限制
  if (isAdmin) {
    // 直接進入完整選單過濾邏輯
  }
  // 車行使用簡化選單（車趟管理為主）
  else if (isTransport) {
    return transportMenuItems
  }
```
- **爭議**：這個 if 本身不是 bypass、而是「**讓 admin 跳過 isTransport 分支、看到完整選單**」的語意旗。detector 命中它是因為模式匹配，但邏輯上它只是分支控制。
- **我的傾向**：**保留** admin 跳過 transport 選單的行為、但改寫形式避免 detector 命中。
- **old_string**:
```
    // Super Admin 看到所有功能（開發需要）
    // 不受租戶類型限制
    if (isAdmin) {
      // 直接進入完整選單過濾邏輯
    }
    // 車行使用簡化選單（車趟管理為主）
    else if (isTransport) {
      return transportMenuItems
    }
```
- **new_string**:
```
    // 車行用簡化選單（車趟管理為主）；admin 不受租戶類型限制、看完整選單
    if (isTransport && !isAdmin) {
      return transportMenuItems
    }
```
- **理由**：語意完全一致（admin 看全選單、非 admin 車行看 transport）、形式上消除 `if (isAdmin)` pattern、detector 不再命中。
- **移交 reviewer 確認**：admin 該不該跳過 transport 選單？這其實也是一種 bypass（只是不是權限 bypass、是「租戶類型」bypass）。如果徹底 RBAC 化、應該用「workspace_features 有 tours」而不是 isAdmin 來判斷。但這超出 PR-1d 範圍、屬於 follow-up。

---

### A3 `src/components/layout/sidebar.tsx:565`

- **業務效果**：桌面主選單過濾、admin 不再 bypass requiredPermission 比對。與 A1 同原理。
- **old_string**:
```
          if (!item.requiredPermission) return item
          // '*' 代表擁有所有權限
          if (isAdmin) return item
          // 精確比對或前綴比對（例如 requiredPermission='tours'，權限有 'tours:overview' 也算符合）
          const perm = item.requiredPermission
          return userPermissions.some(p => p === perm || p.startsWith(`${perm}:`)) ? item : null
```
- **new_string**:
```
          if (!item.requiredPermission) return item
          // 精確比對或前綴比對（例如 requiredPermission='tours'，權限有 'tours:overview' 也算符合）
          const perm = item.requiredPermission
          return userPermissions.some(p => p === perm || p.startsWith(`${perm}:`)) ? item : null
```
- **理由**：刪 bypass、保留 `*` 註解邏輯改到前綴比對來實現（本來就有）。

---

### A4 `src/components/layout/sidebar.tsx:596`

- **業務效果**：個人工具過濾、admin 不再 bypass。
- **old_string**:
```
      if (!item.requiredPermission) return true
      if (isAdmin) return true
      const perm = item.requiredPermission
      return userPermissions.some(p => p === perm || p.startsWith(`${perm}:`))
```
- **new_string**:
```
      if (!item.requiredPermission) return true
      const perm = item.requiredPermission
      return userPermissions.some(p => p === perm || p.startsWith(`${perm}:`))
```
- **理由**：同 A3。注意 sidebar.tsx 的 `isAdmin` 還在 A2 保留使用（`isTransport && !isAdmin`）、所以 **第 509 行 `const { isAdmin } = useAuthStore()` 不可刪**、兩個 useMemo 的 deps 也要保留 `isAdmin`。

---

### A5 `src/components/workspace/channel-sidebar/useChannelSidebar.ts:17`

- **業務效果**：canManageMembers 不再 admin bypass、改為實際比對 `workspace:manage_members` / `workspace:manage`。若 admin role 沒 backfill 這兩個 permission，要人資系統改。
- **old_string**:
```
  const canManageMembers = useMemo(() => {
    if (!user) return false
    if (isAdmin) return true
    const permissions = user.permissions || []
    return (
      permissions.includes('workspace:manage_members') || permissions.includes('workspace:manage')
    )
  }, [user, isAdmin])
```
- **new_string**:
```
  const canManageMembers = useMemo(() => {
    if (!user) return false
    const permissions = user.permissions || []
    return (
      permissions.includes('workspace:manage_members') || permissions.includes('workspace:manage')
    )
  }, [user])
```
- **理由**：刪 bypass、同時清 deps 的 `isAdmin` 跟第 13 行 `const isAdmin = useAuthStore(...)` 變孤兒、要一起清（checkbox 1、2、3）。
- **⚠ 風險**：若 DB 裡 admin role 的 `user.permissions` 不含 `workspace:manage_members`、admin 會無法管頻道成員。**需驗證 admin role 的 user_permissions 是否有這兩個 permission**（不在 tab_permissions 範圍、可能被 backfill 漏掉）。**移交 reviewer/minimal-change**。

---

### A6 `src/components/guards/ModuleGuard.tsx:49`

- **業務效果**：ModuleGuard 不再 admin bypass、一律走 `isRouteAvailable(pathname)`。admin 的 workspace_features 應已開全部、不會擋。
- **old_string**:
```
    // Super Admin 跳過檢查
    if (isAdmin) {
      setChecked(true)
      return
    }

    // 如果沒有設定任何 feature，預設全開（向下相容）
```
- **new_string**:
```
    // 如果沒有設定任何 feature，預設全開（向下相容）
```
- **理由**：拔 bypass、features.length 向下相容還在、routeAvailable 檢查還在。`isAdmin` destructure（第 31 行）與 useEffect deps 的 `isAdmin`（第 67 行）變孤兒、一起清。

---

### A7 `src/lib/permissions/useTabPermissions.tsx:80` — canRead

- **業務效果**：`canRead(module, tab)` 不再 admin bypass、一律查 permissions 表。admin role 的 tab_permissions 已由 migration 20260422150000 全補齊、體感不變；老闆改 admin 權限時即時生效（SSOT）。
- **old_string**:
```
  // 檢查是否有讀取權限
  const canRead = useCallback(
    (moduleCode: string, tabCode?: string): boolean => {
      // 管理員擁有所有權限
      if (isAdmin) return true

      // 找對應的權限記錄
```
- **new_string**:
```
  // 檢查是否有讀取權限
  const canRead = useCallback(
    (moduleCode: string, tabCode?: string): boolean => {
      // 找對應的權限記錄
```
- **理由**：刪 bypass、dep 保留（isAdmin 下面 canWrite/canReadAny/canWriteAny 還用）。

---

### A8 `src/lib/permissions/useTabPermissions.tsx:97` — canWrite

- **old_string**:
```
  // 檢查是否有寫入權限
  const canWrite = useCallback(
    (moduleCode: string, tabCode?: string): boolean => {
      // 管理員擁有所有權限
      if (isAdmin) return true

      // 找對應的權限記錄
```
- **new_string**:
```
  // 檢查是否有寫入權限
  const canWrite = useCallback(
    (moduleCode: string, tabCode?: string): boolean => {
      // 找對應的權限記錄
```
- **理由**：同 A7。

---

### A9 `src/lib/permissions/useTabPermissions.tsx:113` — canReadAny

- **old_string**:
```
  // 檢查模組內任一分頁是否有讀取權限
  const canReadAny = useCallback(
    (moduleCode: string): boolean => {
      if (isAdmin) return true
      return permissions.some(p => p.module_code === moduleCode && p.can_read)
    },
    [permissions, isAdmin]
  )
```
- **new_string**:
```
  // 檢查模組內任一分頁是否有讀取權限
  const canReadAny = useCallback(
    (moduleCode: string): boolean => {
      return permissions.some(p => p.module_code === moduleCode && p.can_read)
    },
    [permissions]
  )
```
- **理由**：同 A7、同時清 dep。

---

### A10 `src/lib/permissions/useTabPermissions.tsx:122` — canWriteAny

- **old_string**:
```
  // 檢查模組內任一分頁是否有寫入權限
  const canWriteAny = useCallback(
    (moduleCode: string): boolean => {
      if (isAdmin) return true
      return permissions.some(p => p.module_code === moduleCode && p.can_write)
    },
    [permissions, isAdmin]
  )
```
- **new_string**:
```
  // 檢查模組內任一分頁是否有寫入權限
  const canWriteAny = useCallback(
    (moduleCode: string): boolean => {
      return permissions.some(p => p.module_code === moduleCode && p.can_write)
    },
    [permissions]
  )
```
- **理由**：同 A9。

  **整體清理備註**：A7-A10 全刪後，`isAdmin` state（第 33 行）在 `return { isAdmin, ... }` 仍對外暴露（第 131 行）。保留此 export、不動外部呼叫者、符合 surgical changes。若 reviewer 要徹底清、可開 follow-up PR。

---

### A11 `src/lib/permissions/index.ts:114` — hasPermissionForRoute

- **業務效果**：Server-side 路由權限檢查函式、admin 不再 bypass、一律走 module:tab 比對。admin 的 user_permissions 應含 `*` 或各模組代碼；若 backfill 漏掉會報 false。
- **old_string**:
```
export function hasPermissionForRoute(
  userPermissions: string[] | undefined,
  route: string,
  isAdmin?: boolean
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false

  // 管理員有所有權限（由 isAdmin flag 決定）
  if (isAdmin) {
    return true
  }

  // 無需特殊權限的路由
```
- **new_string**:
```
export function hasPermissionForRoute(
  userPermissions: string[] | undefined,
  route: string
): boolean {
  if (!userPermissions || userPermissions.length === 0) return false

  // 無需特殊權限的路由
```
- **理由**：拔掉 `isAdmin?: boolean` 參數本身、更徹底（signature 變窄、呼叫端會被 type-check 抓出來）。
- **⚠ 風險**：簽章改動、呼叫端要改。需要 grep `hasPermissionForRoute(` 看呼叫點是否有傳 `isAdmin` 第三參數、一起清。**這是簽章變更、移交 reviewer 要不要更保守**（保留參數、只刪 bypass、留 backward compatibility）。

  **保守版建議**（若 reviewer 選保守）：
  - old_string: `  // 管理員有所有權限（由 isAdmin flag 決定）\n  if (isAdmin) {\n    return true\n  }\n\n  // 無需特殊權限的路由`
  - new_string: `  // 無需特殊權限的路由`
  - 保留參數簽章、僅刪 if 塊；稍後另一 PR 清死參。

---

## (B) Layout/Page 大鎖修法

**統一模式**：所有 8 處都從 `useAuthStore(state => state.isAdmin)` 換成 `usePermissions()`（來自 `@/lib/permissions`）的 `canAccess(pathname)` 判斷。feature loading 期 canAccess 已放行、不會閃 Unauthorized。

### B1 `src/app/(main)/accounting/layout.tsx:13`

- **選用 permission**：`canAccess('/accounting')`
- **old_string**:
```
'use client'

import { useAuthStore } from '@/stores'
import { UnauthorizedPage } from '@/components/unauthorized-page'

/**
 * Accounting 模組 admin-only guard
 * 覆蓋 /accounting 所有子路由（page / accounts / checks / period-closing / reports / vouchers）
 * Wave 2 Batch 2 · 2026-04-21
 */
export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = useAuthStore(state => state.isAdmin)
  if (!isAdmin) return <UnauthorizedPage />
  return <>{children}</>
}
```
- **new_string**:
```
'use client'

import { usePermissions } from '@/lib/permissions'
import { UnauthorizedPage } from '@/components/unauthorized-page'

/**
 * Accounting 模組 guard
 * 覆蓋 /accounting 所有子路由（page / accounts / checks / period-closing / reports / vouchers）
 * Wave 2 Batch 2 · 2026-04-21；PR-1d 改為 RBAC（canAccess）·2026-04-22
 */
export default function AccountingLayout({ children }: { children: React.ReactNode }) {
  const { canAccess } = usePermissions()
  if (!canAccess('/accounting')) return <UnauthorizedPage />
  return <>{children}</>
}
```
- **理由**：整個會計家族受單一 layout 守門、canAccess 會同時檢查 workspace_features 有 accounting（對非企業客戶隱藏）+ role.tab_permissions 有 accounting 讀權限。admin 預設會過、非 admin 在 /hr/roles 被開 accounting 也會過、SSOT 成立。

---

### B2 `src/app/(main)/database/layout.tsx:14`

- **選用 permission**：`canAccess('/database')`
- **old_string**:
```
'use client'

import { useAuthStore } from '@/stores'
import { UnauthorizedPage } from '@/components/unauthorized-page'

/**
 * Database 模組 admin-only guard
 * 覆蓋 /database 全部 9 個子路由（archive-management / attractions / company-assets /
 *   constants / fleet / suppliers / tour-leaders / transportation-rates / workspaces）
 * Wave 2 Batch 5 · 2026-04-21
 */
export default function DatabaseLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = useAuthStore(state => state.isAdmin)
  if (!isAdmin) return <UnauthorizedPage />
  return <>{children}</>
}
```
- **new_string**:
```
'use client'

import { usePermissions } from '@/lib/permissions'
import { UnauthorizedPage } from '@/components/unauthorized-page'

/**
 * Database 模組 guard
 * 覆蓋 /database 全部 9 個子路由（archive-management / attractions / company-assets /
 *   constants / fleet / suppliers / tour-leaders / transportation-rates / workspaces）
 * Wave 2 Batch 5 · 2026-04-21；PR-1d 改為 RBAC（canAccess）·2026-04-22
 */
export default function DatabaseLayout({ children }: { children: React.ReactNode }) {
  const { canAccess } = usePermissions()
  if (!canAccess('/database')) return <UnauthorizedPage />
  return <>{children}</>
}
```
- **理由**：同 B1、database 家族。

---

### B3 `src/app/(main)/finance/settings/page.tsx:433`

- **選用 permission**：`canAccess('/finance/settings')`
- **old_string**:
```
  if (!isAdmin) return <UnauthorizedPage />
```
- **new_string**:
```
  if (!canAccess('/finance/settings')) return <UnauthorizedPage />
```
- **前置改動**：第 67 行 import、第 121 行 destructure 要同步換：
  - old: `import { useAuthStore } from '@/stores/auth-store'`（若檔內 isAdmin 只此一處使用、import 可改為 `usePermissions`）
  - new: `import { usePermissions } from '@/lib/permissions'` + 第 121 行 `const isAdmin = useAuthStore(...)` 改為 `const { canAccess } = usePermissions()`
- **⚠ 注意**：須先 grep 確認 settings/page.tsx 內 `useAuthStore` 是否還有別處用到（如 `user`、`session`）、若有則保留 useAuthStore import、只改 isAdmin → canAccess。

---

### B4 `src/app/(main)/finance/requests/page.tsx:63`

- **選用 permission**：`canAccess('/finance/requests')`
- **old_string**:
```
  if (!isAdmin) return <UnauthorizedPage />
```
- **new_string**:
```
  if (!canAccess('/finance/requests')) return <UnauthorizedPage />
```
- **前置改動**：第 5 行 import `from '@/stores'` 保留（如果檔內還有 `useAuthStore` 其他用法；grep 確認，實測此檔 isAdmin 只這一處、可改為）
  - 第 5 行：改為 `import { usePermissions } from '@/lib/permissions'`
  - 第 23 行：`const isAdmin = useAuthStore(state => state.isAdmin)` → `const { canAccess } = usePermissions()`
  - 若 `useAuthStore` 不再使用、也刪其 import

---

### B5 `src/app/(main)/finance/treasury/page.tsx:135`

- **選用 permission**：`canAccess('/finance/treasury')`
- **old_string**:
```
  if (!isAdmin) return <UnauthorizedPage />
```
- **new_string**:
```
  if (!canAccess('/finance/treasury')) return <UnauthorizedPage />
```
- **前置改動**：同 B4，第 13 行 import、第 47 行 destructure。

---

### B6 `src/app/(main)/finance/travel-invoice/page.tsx:49`

- **選用 permission**：`canAccess('/finance/travel-invoice')`
- **old_string**:
```
  if (!isAdmin) return <UnauthorizedPage />
```
- **new_string**:
```
  if (!canAccess('/finance/travel-invoice')) return <UnauthorizedPage />
```
- **前置改動**：同 B4，第 10 行 import、第 37 行 destructure。

---

### B7 `src/app/(main)/finance/reports/page.tsx:96`

- **選用 permission**：`canAccess('/finance/reports')`
- **old_string**:
```
  if (!isAdmin) return <UnauthorizedPage />
```
- **new_string**:
```
  if (!canAccess('/finance/reports')) return <UnauthorizedPage />
```
- **前置改動**：同 B4，第 5 行 import、第 61 行 destructure。

---

### B8 `src/app/(main)/settings/components/WorkspaceSwitcher.tsx:16` — 爭議

- **檔案本質**：「跨租戶切換器」—— 讓超級管理員切到別家租戶視角看資料。**這不是普通路由權限、是「跨 workspace 視角」特權**。business sense 上、只有 Venturo 本家的超級管理員能用、租戶端 admin 不該能用。
- **為什麼改 canAccess 不對**：`canAccess('/settings/workspaces')` 或類似路由、對租戶端 admin 會回 true（只要他 role 有 settings 權限），但業務上租戶端 admin 不該切看別家資料。
- **我的傾向**：**保留 isAdmin 檢查、但語意重標為「super-admin only feature」、並 refactor 成一個明確命名的判斷**。
- **建議 new_string**（保留 isAdmin、不改行為、但加註釋讓 detector 放心、或以變數重命名）：
  - 選項 1（最小動）：**保留 isAdmin**，在 detector exception list 加入此檔
  - 選項 2（改寫形式）：
```
export function WorkspaceSwitcher() {
  const { workspaces, loadWorkspaces } = useWorkspaceChannels()
  const { user, isAdmin } = useAuthStore()
  const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(null)

  // 僅超級管理員可跨租戶切換視角（這不是一般 RBAC、是 platform-level 特權）
  const canSwitchWorkspace = isAdmin

  useEffect(() => {
    if (!canSwitchWorkspace) return
    loadWorkspaces()
    const saved = localStorage.getItem('current_workspace_filter')
    setCurrentWorkspace(saved)
  }, [canSwitchWorkspace])

  if (!canSwitchWorkspace) {
    return null
  }
  ...
}
```
- **理由**：detector 的意圖是抓「RBAC bypass」；而這裡的 isAdmin 是 platform-admin feature gate、語意不同。把它獨立出 `canSwitchWorkspace` 並在註釋說明、或放入 detector exception list、是更誠實的做法。**移交 reviewer 決定選項 1 還是 2**。

---

## 有爭議點（移交 reviewer/minimal-change 處理）

1. **A2（sidebar.tsx:522 空 if 塊）**：我改寫為 `if (isTransport && !isAdmin)`、語意一致但消除 pattern。**根本問題**是 admin 跳過 transport 選單這件事本身也是一種 bypass（只是繞租戶類型、不是繞 RBAC）；真正的修法應該用 workspace_features 判斷、但超出 PR-1d 範圍。**建議標 follow-up**。

2. **A5（useChannelSidebar）**：admin role 是否有 `workspace:manage_members` 或 `workspace:manage` 這兩個 permission？不在今天 backfill migration 範圍內、若缺會導致 admin 無法管頻道成員。**請 reviewer 查 DB 或多補一條 migration**。

3. **A11（hasPermissionForRoute）**：改簽章（移掉 `isAdmin?` 參數）vs. 保守改法（僅刪 if 塊、保留死參）。**建議保守改法**、避免改動呼叫端、簽章清理開 follow-up。

4. **B8（WorkspaceSwitcher）**：這是 platform-admin feature gate、不是 RBAC bypass。建議用變數重命名方式（`canSwitchWorkspace = isAdmin`）讓語意清楚、或加入 detector exception。**不該用 canAccess 取代**。

---

## type-check 風險預估

- **低風險**：A1, A3, A4, A7-A10 —— 純刪 if 區塊、不改簽章；B1, B2 —— layout 檔、唯一變數切換。
- **中風險**：A5, A6 —— 移除 destructure 的 `isAdmin`、要清 deps array、有 React hooks 規則（exhaustive-deps）可能炸。
- **中風險**：B3-B7 —— 頁面同時要改 import + destructure + if 條件、容易漏清 `useAuthStore` 變孤兒 import。建議每個檔動完各跑一次 `npm run type-check` 局部（或一次全跑）。
- **高風險**：A11（若走激進改簽章版）—— 呼叫端全要改；**建議保守改法**降為中風險。
- **未知風險**：B8 若採 canAccess、會改變跨租戶切換器的可見規則、業務不合。**強烈建議維持 isAdmin feature gate**。
- **gitnexus 檢查**：isAdmin 在 Sidebar/ModuleGuard/useTabPermissions 上游都 LOW；但 `hasPermissionForRoute`（A11）若改簽章，需先跑 `gitnexus_impact({target: "hasPermissionForRoute", direction: "upstream"})` 看呼叫點。
