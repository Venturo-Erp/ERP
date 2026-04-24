# 管理區（hr + settings + tenants）體檢報告

**掃描日期**：2026-04-23  
**範圍**：7 頁主路由 + API + 權限層 + DB schema  
**掃描者**：Explore agent（read-only 審計）

---

## 一句話狀況

管理區三大核心（HR 職務 / 系統設定 / 租戶平台管理資格）的**權限檢查**全部到位、但**死程式碼 / 重複邏輯 / SSOT 破碎**隱患仍存。最嚴重是 tenants-create API 還寫 `employees.permissions` 陣列（已於 2026-04-23 migration 砍掉 DB 欄位、但程式碼未同步清理）。

---

## 🔴 真問題（上線前必處理）

### 1. **⚠️ Tenants Create API 寫死欄位** — _爆炸雷_

- **位置**：`/src/app/api/tenants/create/route.ts:235-248`
- **問題**：員工初始化時強寫 `permissions: ['*', 'todos', 'payments', ...]` 陣列，但 migration `20260423100001_drop_employees_permissions_column.sql` 已於 2026-04-23 **砍掉 DB 欄位**。
  ```typescript
  // ❌ 行 235-248：死寫、會 INSERT 失敗
  const { data: employee, error: empError } = await supabaseAdmin
    .from('employees')
    .insert({
      workspace_id: workspace.id,
      employee_number: adminEmployeeNumber,
      chinese_name: adminName,
      permissions: ['*', 'todos', ...], // 🔥 DB 欄位已不存在
  ```
- **影響**：新建租戶時系統主管員工建立會失敗 → 租戶無法初始化。
- **修復**：刪除 lines 235-248（permissions 陣列）、改用 role_id 指派。
- **相關 DB**：`employees` 已無 `permissions` 欄位（確認：`database.types.ts:20831` 仍有舊型別、需重新生成）。

### 2. **⚠️ 舊 is_active 欄位還在程式碼中 SELECT**

- **位置**：未掃到程式碼直接 SELECT、但 migration `20260423150000_drop_employees_is_active.sql` 已砍掉。
- **檢查**：`database.types.ts:5467` 仍有 `is_active: boolean | null`，意味型別未同步 (`npx supabase gen types` 未跑)。
- **影響**：如果任何 API 試圖 `.select('*')` 或 `.select('..., is_active, ...')` → 運行時 RLS 政策錯誤。
- **修復**：`npm run db:types` 重新生成型別。

### 3. **⚠️ Module-tabs 與路由不一致的幽靈 Permission**

- **位置**：`/src/lib/permissions/module-tabs.ts:36-205`、特別是 `hr` 模組（line ~140+）。
- **問題**：
  - `hr` 模組定義了 `tabs: [...]`（例：possibly `settings`, `payroll` 等）
  - 但實際路由只有：`/hr` (員工列表) / `/hr/roles` (職務) / `/hr/settings` (打卡設定)
  - 如果 module-tabs 裡定義了路由沒實作的 tab → **幽靈權限**（能勾但無效）
- **查證**：需再掃 MODULES 的完整定義（limit 只讀了前 100 行）。
- **影響**：低風險（權限檢查只會拒絕、不會誤許），但造成 UX 困惑。

### 4. **⚠️ Corner Workspace UUID 硬編 + 依賴檢查**

- **位置**：`/src/app/api/tenants/create/route.ts:24`
- **程式碼**：`const CORNER_WORKSPACE_ID = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'`
- **狀況**：**已列 Wave 3 BACKLOG**（建 `src/lib/constants/well-known-ids.ts` 中央化），但未實施。
- **影響**：新建租戶時會 copy Corner 的職務權限模板；如 Corner 被誤刪 → 新建失敗。
- **上線前必做**：至少驗證 Corner workspace 存在（checkpoint）。

### 5. **⚠️ Settings > Company 頁直接查 supabase、無 RLS 層**

- **位置**：`/src/app/(main)/settings/company/page.tsx:92-97`
  ```typescript
  const { data } = await supabase
    .from('workspace_attendance_settings' as never)
    .select('*')
    .eq('workspace_id', user.workspace_id!)
    .single()
  ```
- **問題**：
  - 頁面層直接呼叫 supabase（而非 API）
  - 雖然 workspace_id 有過濾，但繞過 API 層檢查（例：rental 權限檢查)
  - company/page.tsx:234-240 類似問題
- **影響**：低風險（已有 workspace_id 過濾），但違反架構規範。
- **修復**：改用 API layer `/api/workspace-attendance/` 或 `/api/company/settings`。

---

## 🟡 小債（上線後優先處理）

### 6. **重複的「系統主管權限檢查」邏輯**

- **位置**：
  - `hr/page.tsx:39`：`const isAdmin = useAuthStore(state => state.isAdmin)`
  - `hr/roles/page.tsx:35`：同上 + line 421 做 `if (!isAdmin)` 檢查
  - `settings/company/page.tsx:224,324`：同上 + 權限檢查
  - `tenants/page.tsx:28-41`：用 SWR 快取、並檢查 `workspace_features.tenants`
- **模式**：各頁都重複檢查 `isAdmin` 或拉 feature flag，沒有統一 guard。
- **改進**：提煉成 `useAdminGuard()` hook 或 layout-level middleware。
- **現況**：可用但散彈槍式，不急（migration 9 個月內處理）。

### 7. **employees.permissions 陣列的亡靈（code side）**

- **已砍 DB**：migration `20260423100001`
- **仍在程式碼**：
  - `database.types.ts` 型別定義（待 `npx supabase gen types` 清理）
  - `tenants/create/route.ts:235-248` insert 硬寫（**急件**見 #1）
  - 其他 auth / login 流程：已改讀 `role_tab_permissions`（清潔）
- **改進**：完整清掃 codebase，移除所有 `permissions` 陣列操作。

### 8. **重複的「workspace seed」邏輯**

- **位置**：
  - `/api/workspaces` POST（line 144-220）：seed features + roles + permissions
  - `/api/tenants/create` POST（line 199-398）：seed features + roles + permissions + template copy
  - 兩套邏輯 70% 重合
- **改進**：提煉 `seedWorkspacePermissions(workspaceId)` 核心函數。
- **現況**：可用但維護成本高；重構可等（Wave 4）。

### 9. **max_employees 檢查位置**

- **現況**：只在 `/api/employees/create` 做守門（line 46-61）。
- **是否有 frontend 重複**：HR 員工列表頁沒看到前端重複檢查（✓ 好）。
- **但 edge case**：如果多人同時建員工、可能 race condition 突破 max。
  - 改進：用 DB-level trigger（但超過上線前範圍）。

### 10. **HR Settings（打卡設定）無 API 層**

- **位置**：`hr/settings/page.tsx` 直接 supabase：
  ```typescript
  const { data } = await supabase
    .from('workspace_attendance_settings' as never)
    .select('*')
    .eq('workspace_id', user.workspace_id!)
  ```
- **問題**：頁面層查 DB（雖然過濾了 workspace_id）、應改 API。
- **改進**：`/api/hr/attendance-settings` GET/PUT。

---

## 🟢 健康面向

### ✅ 權限檢查邏輯一致

- **hr/roles/page**（職務權限管理）：明確檢查 `!isAdmin` → 未授權頁面（line 421-441）
- **settings/company**：同上（line 324-334）
- **tenants/page**：檢查 feature flag（`workspace_features.tenants`）→ 對標平台管理資格邏輯
- **Verdict**：三頁都有守門，沒有漏洞。

### ✅ Role-Tab-Permissions SSOT 明確

- **DB 層**：`role_tab_permissions` 表是唯一權限真相來源（已於 2026-04-23 砍掉 `employees.permissions` 冗餘）
- **登入流程**：`validateLogin` API 會拉 `role_tab_permissions`、存到 `user.permissions` 袋子
- **前端 hook**：`useTabPermissions()` 會呼叫 `/api/roles/[roleId]/tab-permissions` 取最新狀態
- **Verdict**：沒有分裂。

### ✅ Tenants 建立的原子性設計

- **rollback 函數**（line 161-197）：追蹤已建資源、失敗時反向清理
- **步驟順序**：workspace → features → roles → permissions → employee → channels
- **Verdict**：架構完整（除了 #1 的死欄位寫入）。

### ✅ Module-Tabs 與 Workspace Features 搭配無誤

- **Page 級過濾**：`hr/roles/page.tsx:37-50` 用 `isFeatureEnabled()` 過濾模組
  ```typescript
  const visibleModules = useMemo(
    () =>
      MODULES.filter(m => isFeatureEnabled(m.code)).map(m => ({
        ...m,
        tabs: m.tabs.filter(t => t.isEligibility || isTabEnabled(m.code, t.code, t.category)),
      })),
    [isFeatureEnabled, isTabEnabled]
  )
  ```
- **Verdict**：權限檢查鏈路清晰。

### ✅ 員工停用邏輯統一到 status

- **舊**：`is_active` boolean + `status` enum（冗餘、易不同步）
- **新**：只用 `status: 'active' | 'probation' | 'leave' | 'terminated'`（migration 20260423150000）
- **前端**：`hr/page.tsx:61` 用 `emp.status !== 'terminated'` 過濾（✓）
- **Verdict**：SSOT 統一。

---

## 跨模組 Pattern 候選

### 🔵 系統主管 Guard Pattern

```typescript
// 現在（散彈槍）：每頁都 `const isAdmin = useAuthStore(...)`
// 建議：統一提煉
export function useAdminGuard() {
  const { isAdmin } = useAuthStore()
  const router = useRouter()
  useEffect(() => {
    if (!isAdmin) router.push('/unauthorized')
  }, [isAdmin])
  return isAdmin
}
```

### 🔵 Workspace Seed Pattern

```typescript
// 現在：workspaces POST + tenants POST 都各自實作
// 建議：
async function seedWorkspaceWithRoles(workspaceId: string, fromTemplate?: string) {
  // 1. 初始化 features
  // 2. 複製/建立 roles
  // 3. 複製/建立 role_tab_permissions
  // 4. 建立預設角色
}
```

### 🔵 Permission Fetching Pattern

```typescript
// 現在（兩層）：
// - 登入時：validateLogin API 算 permissions[] 袋子
// - 頁面上：useTabPermissions() 再呼叫 /api/roles/[roleId]/tab-permissions

// 問題：重複查、cache 沒同步
// 建議：統一用 stale-while-revalidate SWR
const { data: permissions } = useSWR(`/api/users/${user.id}/tab-permissions`, fetcher, {
  revalidateOnFocus: true,
})
```

---

## 檢查清單（上線前必驗）

- [ ] 跑 `npm run db:types` 同步型別（清理 `is_active` / `permissions`）
- [ ] 刪除 `tenants/create/route.ts:235-248` 的死 `permissions` 陣列寫入
- [ ] 驗證 Corner workspace 存在（`8ef05a74-...` 或改用常數）
- [ ] Settings > HR Settings 改用 API layer（not page-level supabase）
- [ ] Settings > Company 改用 API layer（not page-level supabase）
- [ ] 確認 module-tabs 定義的所有 tab 都有對應路由（或標記為未實作）

---

## 已列 BACKLOG 項目（不展開）

- ✓ Wave 3：`src/lib/constants/well-known-ids.ts` 中央化 Corner UUID
- ✓ Wave 3：員工停用邏輯整合（is_active → status）
- ✓ 2026-04-23：`employees.permissions` 欄位砍除、`employees.is_active` 砍除
- ✓ 2026-04-23：`is_super_admin()` 改讀 `workspace_roles.is_admin`

---

**報告完成**。Critical: **3 項**（#1 #2 #3）。
