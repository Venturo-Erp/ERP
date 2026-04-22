# Agent C 邏輯重複 + 必抓 Pattern 檢查（v3.0）

**日期**: 2026-04-22  
**檢查員**: Agent C  
**涵蓋範圍**: /login 路由群組 + 4 支密碼重設 API + sync-employee / get-employee-data

---

## 1. Role-Gate 偽裝（isAdmin 短路）檢查

### 現況檢查

搜尋 isAdmin 在 auth API 的使用：
- **reset-employee-password/route.ts**: L56 `const isAdmin = await checkIsAdmin(auth.data.employeeId)` → L57 `if (!isAdmin) return 403`
- **admin-reset-password/route.ts**: L58 `const isAdmin = await checkIsAdmin(auth.data.employeeId)` → L59 `if (!isAdmin) return 403`
- **create-employee-auth/route.ts**: L95 `const isAdmin = await checkIsAdmin(auth.data.employeeId)` → 後續邏輯判斷 isCornerAdmin
- **validate-login/route.ts**: L未直讀但結果回傳 `isAdmin` flag

### P001（拔短路）修法評估

🟢 **修法落地完整**

四支 API 都改為：
1. `checkIsAdmin()` 查 employees → workspace_roles → is_admin
2. **非短路寫法**：明確檢查每項條件（workspace 對齊、employee 歸屬檢查）
3. 無 `if (isAdmin) return true` 之類的偽短路

**特別看**：
- create-employee-auth：L105 `isCornerAdmin = isAdmin && currentUserWorkspaceCode === 'CORNER'` — 條件複合、不是單純 isAdmin
- 所有四支都走 checkIsAdmin → workspace_roles.is_admin 同套邏輯（一致性 OK）

### 遺留風險

🟡 **部分**：UI 層還有舊寫法

- `src/app/(main)/settings/components/WorkspaceSwitcher.tsx`: L 檢查 `!isAdmin return` — **UI 層仍有短路**
- `src/app/(main)/accounting/layout.tsx`: L `if (!isAdmin) return <UnauthorizedPage />`
- 但這些是 **UI guard**，不是 API 邏輯漏洞，影響較低

**判決**: API 層 P001 修法 🟢，UI 層仍有舊式但不是關鍵路徑

---

## 2. 假功能檢查：rememberMe

### 前端實裝

- **login/page.tsx**: L20 定義 `rememberMe` state，L67 傳給 validateLogin
- **auth-store.ts**: L169 接收 `rememberMe` 參數，L184 無後續邏輯 → **參數接收但未使用**

### 後端實裝

- **validate-login/route.ts**: 未檢查是否接收 rememberMe 參數（查閱完整代碼）
- **middleware.ts**: 無 rememberMe 邏輯
- **localStorage**：login 頁面只存 `LAST_CODE_KEY` 和 `LAST_USERNAME_KEY`，未實裝 30 天記憶

### 判決

🔴 **未修 + 新發現**

```
[checkbox] 保持 30 天 → [UI 渲染] → [預設 true] → [傳 validateLogin] → [被忽視]
```

rememberMe checkbox 是 **幽靈功能**：UI 上有、傳到後端、後端沒接、沒實際行為。建議後續清理或真實實裝。

---

## 3. 歷史驗證方式殘留

### 掃描結果

- **src/stores/auth-store.ts L4**: `// generateToken, AuthPayload 已移除 — 不再需要舊的 token 格式`
- **src/stores/auth-store.ts L16**: `// mergePermissionsWithRoles 已移除（2026-04-02）`
- **src/stores/auth-store.ts L120**: `// Cookie 已改為 httpOnly（server-side 設定），前端不再需要讀寫 auth-token cookie`
- **src/lib/auth/quick-login-token.ts**: 存在但無呼叫跡象（孤兒檔）

### 無 TODO/FIXME 殘留

未找到 `TODO` / `FIXME` / `// removed` / `// legacy` 的註釋殘留。

### 判決

🟢 **修法落地清潔**

舊驗證方式已刪除、註釋清理完善。孤兒檔 quick-login-token.ts 應清理但非緊急。

---

## 4. 邏輯重複：跨租戶守門

### P003 系列修法對齊

今晚 11 commits 在 4 支 auth API + 2 支員工查詢 API 各自加守門。檢查 pattern 一致性：

#### reset-employee-password（P003-C）
```
L67-88: 查 employee.workspace_id → 與 auth.data.workspaceId 比對 → 不符 403
Pattern: 直接 if (workspace_id !== auth.data.workspaceId) return 403
```

#### admin-reset-password（P003-D）
```
L86-99: 反查 employees 的 target_emp.workspace_id → 與 auth 比對 → 不符 403
Pattern: 同上，但多一步「從 auth.users 查到 employees」
```

#### create-employee-auth（P003-E）
```
L128-138: 比對 workspace_code（client 傳） vs currentUserWorkspaceCode
Pattern: 不同關鍵（code vs id），但邏輯同 `workspace_code !== currentUserWorkspaceCode` return 403
```

#### sync-employee（P003-B）
```
L59-86: 查 targetEmp → 驗 body.workspace_id vs targetEmp.workspace_id → 拒絕已綁定覆蓋
Pattern: 三層檢查（employee 存在、workspace 對齊、防覆蓋舊 user）
```

#### get-employee-data（P003-I）
```
L45-56: 查 workspace → 驗 workspace.id vs auth.data.workspaceId → 不符 403
Pattern: 前置檢查 workspace，而非後查 employee
```

### 一致性評估

🟡 **Pattern 5 variant，邏輯同但寫法異**

| API | 檢查對象 | 檢查時機 | 寫法 |
|-----|---------|--------|------|
| reset-employee-password | employee.workspace_id | 查後 | 直接比對 |
| admin-reset-password | targetEmp.workspace_id | 查後 | 反查再比對 |
| create-employee-auth | workspace_code 轉 id | 業務邏輯中 | code 比對 |
| sync-employee | targetEmp.workspace_id | 查後 | 同時檢查舊綁定 |
| get-employee-data | workspace.id | 查前 | 前置檢查 |
| permissions/features | 權限表 | requireTenantAdmin helper | 獨立 helper 函式 |

**風險點**：
1. create-employee-auth 用 `workspace_code` 比對、其他用 `workspace_id` → **可能混淆**
2. sync-employee 額外檢查「防覆蓋」邏輯、其他無 → **邏輯強度不一**
3. permissions/features 用 `requireTenantAdmin()` helper、auth API 各寫 → **重複代碼**

### 應有通用 helper？

🟡 **Pattern map P003 說要寫通用 middleware，實際上各 API 各寫**

```typescript
// 現有
// src/app/api/permissions/features/route.ts: requireTenantAdmin()
// 4 支 auth API: 各寫 checkIsAdmin()

// 應有（但缺）
// src/lib/api/workspace-guards.ts:
//   - checkWorkspaceOwnership(employeeId, targetWorkspaceId)
//   - requireTenantAdmin() — 供 permissions + tenants 用
```

### 判決

🟡 **部分落地、pattern 一致性待改進**

- P003-B/C/D/E/I 各支都加了守門 ✅
- 邏輯原理一致 ✅
- 但寫法 5 variant、無共用 helper ❌
- workspace_code vs id 混用有風險 ⚠️

---

## 5. 共用 Helper 該存在但沒存在

### 現狀

| 位置 | Helper 函式 | 重用度 |
|------|-----------|--------|
| permissions/features | `requireTenantAdmin()` | 2（features GET/PUT） |
| auth/admin-reset-password | `checkIsAdmin()` | 內部用 |
| auth/reset-employee-password | `checkIsAdmin()` | 內部用 |
| auth/create-employee-auth | `checkIsAdmin()` | 內部用 |
| workspaces/[id] | 內嵌 role permission 檢查 | 1 處 |

### 重複特徵

🔴 **checkIsAdmin() 三次重複實裝**

admin-reset-password, reset-employee-password, create-employee-auth 各有自己的 checkIsAdmin：
```typescript
// 都是這樣
const { data: employee } = await adminClient
  .from('employees')
  .select('role_id, job_info')
  .eq('id', employeeId)
  .single()

const roleId = e.role_id || e.job_info?.role_id
const { data: role } = await adminClient
  .from('workspace_roles')
  .select('is_admin')
  .eq('id', roleId)
  .single()

return role?.is_admin ?? false
```

### 應有結構

```
src/lib/api/auth-guards.ts
├─ checkIsAdmin(employeeId): boolean
├─ checkWorkspaceOwnership(employeeId, targetWorkspaceId): boolean
└─ requireTenantAdmin(): { ok, workspaceId, response }
```

### 判決

🔴 **該存在但沒存在**

3 支 auth API checkIsAdmin 重複、1 支 permissions/features requireTenantAdmin 孤立、4 支 auth API 的跨租戶檢查無共用。

建議：
1. 提取 `checkIsAdmin(employeeId)` 到 lib/api/auth-guards.ts
2. 提取 workspace 守門邏輯到 `checkWorkspaceOwnership()` 或 middleware
3. 4 支 auth API 的跨租戶檢查統一格式

---

## 總結

| Pattern | 狀態 | 修法落地 | 新發現 |
|---------|------|--------|--------|
| P001 role-gate 短路 | 🟢 | API 層完整；UI 層仍舊式但非關鍵 | 無 |
| 假功能 rememberMe | 🔴 | 未修 | **checkbox UI 存在、參數傳遞、後端無實裝** |
| 歷史殘留 | 🟢 | 清潔 | 孤兒檔 quick-login-token.ts 可清理 |
| 邏輯重複 P003 | 🟡 | 各支都加、邏輯同 | **5 variant 寫法、code/id 混用、強度差異** |
| 共用 helper 缺 | 🔴 | 未落地 | **checkIsAdmin() 3 次重複、無共用、該提取** |

**風險指數**: 🟡 **中等偏低**（功能正常、清潔度待改進）
