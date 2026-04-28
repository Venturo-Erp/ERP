# /login 路由代碼現況 v3.0（2026-04-22 大修後）

## 前端登入頁面

- **src/app/(main)/login/page.tsx** — 未動過 v2.0
  - 職責：登入表單呈現、workspace code + username + password 欄位、遞交 validateLogin
  - 關鍵邏輯：呼叫 useAuthStore.validateLogin()、取 redirect 參數返回
  - **修法**：無（UI 層）

## 認證層（State + API 協調）

- **src/stores/auth-store.ts** — 2026-04-22 動過（拔 isAdmin 短路）
  - 職責：Zustand store，用戶資訊 + 登入狀態 + 權限驗證
  - 關鍵：validateLogin() 呼叫 /api/auth/validate-login、接收 JWT 的 isAdmin + permissions、setUser 時帶入 isAdmin flag
  - **修法**：P001 Phase A，移除 isAdmin 從 permissions.includes('\*') 推斷、改由 API response 的 isAdmin 決定；logout() 清 isAdmin=false

- **src/hooks/usePermissions.ts** — 2026-04-22 動過（拔 isAdmin 短路）
  - 職責：前端權限查詢 hook、定義 canViewReceipts / canCreateReceipts / canManageFinance / isAdmin 等 boolean
  - 關鍵：讀 authStore.user.permissions（module:tab 格式）、storeIsAdmin flag
  - **修法**：P001 Phase A，isAdmin 不再從 permissions 推斷、直接讀 storeIsAdmin（來自 JWT）

## 網域層（Middleware）

- **src/middleware.ts** — 2026-04-22 動過（P002：公開路由改精確白名單）
  - 職責：全局路由守門、區分公開 vs. 受保護路由、認證 Supabase session
  - 關鍵邏輯：EXACT_PUBLIC_PATHS（精確匹配）+ PREFIX_PUBLIC_PATHS（前綴匹配）二分法；驗 quick-login token 或 Supabase session
  - **修法**：P002，原 `startsWith('/api/auth')` 太寬會洩漏 admin-reset-password 等敏感 API，改精確列舉 /api/auth/validate-login、/api/auth/logout、/api/auth/sync-employee（自帶 access_token 驗證）

## 認證 API 端點（9 支）

### 1. validate-login — 密碼驗證 + 權限一併取得（核心路由）

- **src/app/api/auth/validate-login/route.ts** — 2026-04-22 未動（邏輯完整）
- 職責：查 workspace code → 查員工 + 驗密碼 → 拼 auth email → 從 role_tab_permissions 讀權限 → 返回 isAdmin + permissions
- 關鍵：`checkRateLimit(10/min)`；admin client 繞 RLS 查 workspace；嘗試從 auth.users 讀真實 authEmail、fallback 拼假 email；權限讀 role_tab_permissions（非 employees.permissions）
- **修法**：無（已是 P001 後的完整版、包含 isAdmin + permissions 雙返）

### 2. sync-employee — 同步 supabase_user_id（解雞生蛋）

- **src/app/api/auth/sync-employee/route.ts** — 2026-04-22 動過（P003-B：跨租戶綁帳號守門）
- 職責：登入後同步 employees.supabase_user_id、處理 RLS 所需 metadata
- 關鍵：驗 access_token 或 cookie session；admin client 繞 RLS 更新 employees 表
- **修法**：P003-B，原沒驗 employee_id 屬於哪個 workspace、攻擊者可用自己的 access_token 綁到別家公司員工；改驗 body.workspace_id == 目標員工的 workspace_id、拒絕覆蓋已綁定的帳號

### 3. logout — 清 session（placeholder）

- **src/app/api/auth/logout/route.ts** — 2026-04-18 簡化
- 職責：保留端點兼容、實際清除由前端 supabase.auth.signOut() + SSR 自動清 cookies
- **修法**：無（已簡化成純 placeholder、自家 JWT 時代舊邏輯已移除）

### 4. admin-reset-password — 系統主管重設員工密碼

- **src/app/api/auth/admin-reset-password/route.ts** — 2026-04-22 未動（邏輯完整）
- 職責：驗 getServerAuth() + 系統主管權限 → 生成新密碼 → 更新 Supabase Auth
- 關鍵：`checkIsAdmin()` 讀 role_id（優先 top-level、fallback job_info.role_id）→ 查 workspace_roles.is_admin；rate limit 5/min
- **修法**：無

### 5. reset-employee-password — 員工忘記密碼

- **src/app/api/auth/reset-employee-password/route.ts** — 2026-04-22 未動（邏輯完整）
- 職責：員工忘記密碼、透過 workspace code + employee_number 驗證 → 生新密碼 email
- 關鍵：checkIsAdmin()；rate limit 10/min；修正的 email 寄送邏輯
- **修法**：無

### 6. change-password — 用戶自行改密碼

- **src/app/api/auth/change-password/route.ts** — 2026-04-22 未動（邏輯完整）
- 職責：需登入、驗當前密碼 → 更新新密碼（Supabase Auth）
- 關鍵：getServerAuth() 驗登入；rate limit 5/min；取 auth.data.employeeId 直接查
- **修法**：無

### 7. create-employee-auth — 建立員工帳號

- **src/app/api/auth/create-employee-auth/route.ts** — 2026-04-22 未動（邏輯完整）
- 職責：系統主管新增員工時建 Supabase Auth 帳號
- 關鍵：getServerAuth() + checkIsAdmin()；檢查租戶是否為新租戶（無 auth 員工 → 種子人系統主管 開全權）
- **修法**：無

### 8. get-employee-data — 取員工資料（配合登入）

- **src/app/api/auth/get-employee-data/route.ts** — 2026-04-22 動過（P003-I：跨租戶查員工資料守門）
- 職責：返回員工詳細資料（登入後取 profile 用）
- 關鍵：getServerAuth()；admin client 查 employees、role_tab_permissions
- **修法**：P003-I，原沒驗 body.code 的 workspace 是否等於 auth.workspaceId、攻擊者可查任一家員工的 supabase_user_id 和 permissions；改驗 workspace.id == auth.data.workspaceId

### 9. line — LINE LIFF customer 登入（public）

- **src/app/api/auth/line/** — 2026-04-22 未動
- 職責：LINE OAuth 流程（client 登入用、非員工登入）
- **修法**：無（不屬 /login 員工登入路由）

## 權限管理層

- **src/lib/permissions/index.ts** — 2026-04-22 未動（兼容舊系統）
  - 職責：導出權限系統（features / hooks / module-tabs / useTabPermissions）
  - **修法**：無

- **src/lib/permissions/features.ts** — 2026-04-22 未動（定義功能模組）
  - 職責：FEATURES 常數列舉（dashboard / tours / orders / finance / accounting... 等 16 個功能及路由對應）
  - **修法**：無

- **src/lib/permissions/module-tabs.ts** — 2026-04-22 未動（定義模組分頁結構）
  - 職責：MODULES 常數列舉（13 個模組 × 各自的 tabs 定義、含 isEligibility / category 標籤）
  - **修法**：無

- **src/app/api/permissions/features/route.ts** — 2026-04-22 動過（P003-A：租戶管理權限守門）
  - 職責：GET/PUT 租戶功能權限（workspace_features 表）
  - 關鍵：`requireTenantAdmin()` 檢查 role_tab_permissions.settings.tenants.can_write
  - **修法**：P003-A，原無認證守門、任何 API 客戶端都能改任一家的 workspace_features；改加租戶管理權限檢查

## API 資源層

- **src/app/api/workspaces/[id]/route.ts** — 2026-04-22 動過（P003-H：跨租戶讀守門）
  - 職責：GET 租戶詳情（含員工人數、系統主管名稱）
  - 關鍵：getServerAuth()；自家 workspace 任何登入用戶可讀、跨租戶需「租戶管理」權限
  - **修法**：P003-H，原無租戶邊界檢查、任何登入用戶可讀任一家租戶詳情；改走 requireTenantAdmin() 同 P003-A 邏輯

## 認證工具函式庫

- **src/lib/supabase/admin.ts** — 2026-04-22 未動（設計決策確認）
  - 職責：每次呼叫建新 admin client（非 singleton），確保 schema 變更後 RLS 狀態同步
  - 關鍵註解：2026-04-20 遇過 FORCE RLS bug、singleton 拿過期狀態、改每次 createClient() 新建
  - **修法**：無（設計本身正確）

- **src/lib/auth/server-auth.ts** — 2026-04-22 未動（邏輯完整）
  - 職責：伺服器端統一認證服務、getServerAuth() 返回 {user, workspaceId, employeeId}
  - 關鍵：從 user_metadata 取 workspace_id（快速路徑）、fallback 查 employees 表；支援 Pattern A (employee.id=auth.uid) + Pattern B (supabase_user_id=auth.uid)
  - **修法**：無

- **src/lib/rate-limit.ts** — 2026-04-22 未動（邏輯完整）
  - 職責：分散式 rate limit（優先 Supabase RPC、fallback in-memory Map）
  - 關鍵：validate-login 10/min、admin-reset 5/min、change-password 5/min、reset-employee 10/min
  - **修法**：無

## 資料庫 Migration（5 支 2026-04-22 新增）

- **20260422000000_check_and_seed_admin_roles.sql** — 驗證 系統主管職務 存在、否則種子
- **20260422130000_add_amadeus_totp_to_employees.sql** — 新增 Amadeus TOTP 欄位（無關 login）
- **20260422140000_fix_role_tab_permissions_rls.sql** — 修 role_tab_permissions RLS（P003-A 前置）
- **20260422150000_backfill_admin_role_tab_permissions.sql** — 預填 系統主管職務 所有 module:tab 權限（P001 Phase A 配套）
- **20260422160000_sync_default_roles_from_corner.sql** — 從 Corner workspace 複製預設職務（P001 收尾）

## E2E 測試

- **tests/e2e/admin-login-permissions.spec.ts** — 2026-04-22 新增（P001 Phase A 配套）
  - 職責：驗證 系統主管登入後 permissions 非空、包含所有必需 module + tab key
  - 關鍵：loginAsAdmin()、檢查 isAdmin=true、permissions.length > 40、涵蓋 13 個 MODULES + 10 個關鍵 module:tab
  - **修法**：新增（守門 backfill migration + validate-login 邏輯不退化）

---

## 今晚修法總結（11 commit）

| 修法                               | 檔案數 | 主要檔案                                                  | 目的                                     |
| ---------------------------------- | ------ | --------------------------------------------------------- | ---------------------------------------- |
| **P001：拔 isAdmin 短路**          | 6      | auth-store.ts, usePermissions.ts, migrations              | 系統主管判定改走 role_tab_permissions    |
| **P002：middleware 改白名單**      | 1      | middleware.ts                                             | 收緊公開路由、敏感 API 改精確列舉        |
| **P003-A/B/C/D/E/H/I：跨租戶守門** | 9      | 4 支 auth API + 1 permissions + 1 workspaces + migrations | 防止跨租戶資料竊取                       |
| **e2e 測試**                       | 1      | admin-login-permissions.spec.ts                           | 守門 P001 backfill + validate-login 邏輯 |

---

**統計**：23 檔案涉及（含 migration、docs、e2e）；7 個 endpoint 動過；3 個權限系統層檔案重構
