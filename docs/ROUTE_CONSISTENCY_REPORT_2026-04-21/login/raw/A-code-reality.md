# Agent A — 代碼現況分析（/login）

## 1. UI 組成

- 公司代號輸入框（`code`）— 自動轉大寫、autofocus
- 帳號輸入框（`username`）— 支援員工編號（E001）或 Email
- 密碼輸入框（`password`）— 顯示/隱藏切換
- **「記住我（30 天內免重新登入）」Checkbox** — 預設勾選（`rememberMe: true`）
- 登入按鈕
- 錯誤訊息顯示區
- 品牌標題與副標題

## 2. State 與 Hook

- **Zustand Store**：`useAuthStore()` — 管理全域 auth 狀態
  - `user: User | null`、`isAuthenticated: boolean`、`isAdmin: boolean`、`sidebarCollapsed: boolean`
  - 持久化到 localStorage（`auth-storage` key）
- **React Hooks**：`useState` 管理 code / username / password / showPassword / rememberMe / isLoading / error
- **Next.js Hooks**：`useRouter()` / `useSearchParams()`
- **LocalStorage**：`LAST_CODE_KEY` / `LAST_USERNAME_KEY` — 記住上次登入資訊（page.tsx 27-32 行）

## 3. 提交流程

按下登入 → `handleLogin()`：

1. 前端校驗：code / username 非空
2. 存 localStorage：上次用過的 code / username
3. 呼叫 `/api/auth/validate-login`（POST）
   - Body：`{ username, password, code, rememberMe }`（但 rememberMe **無人用**）
   - 後端步驟：
     - Workspace 代號查詢
     - 員工查詢（支援編號或 Email、大小寫不敏感）
     - 帳號狀態檢查（terminated / is_active = false）
     - 帳號鎖定檢查（5 次失敗鎖 15 分鐘）
     - Supabase Auth 密碼驗證（signInWithPassword）
     - 權限計算（role_tab_permissions + employee_permission_overrides）
     - 回傳：employee 資料 + authEmail + 權限列表 + isAdmin flag
4. **Client-side Supabase 登入**（supabase.auth.signInWithPassword）
   - 用 authEmail + password 建立 Supabase session
   - Session cookies 由 `@supabase/ssr` 自動設為 httpOnly
5. **Auth 同步**（ensureAuthSync）— 同步 `supabase_user_id` 到 employees 表（RLS 用）
6. **setUser()**：存進 Zustand store（同步 localStorage）
7. **重導**：`window.location.href = getRedirectPath()`

## 4. 「保持 30 天」實際路徑

**UI 層**：line 152-165

- Checkbox id=`rememberMe`
- Label：「記住我（30 天內免重新登入）」
- State：`rememberMe` useState（預設 true）
- onChange：`setRememberMe(e.target.checked)`

**送出層**：line 67

- `const result = await validateLogin(username.trim(), password, trimmedCode, rememberMe)`

**auth-store.ts**：

- 簽名（line 165-170）：`rememberMe: boolean = true` 接收
- **實際代碼**：line 181-185
  ```javascript
  body: JSON.stringify({ username, password, code })
  ```
  **rememberMe 參數被無視** — POST body 裡沒有送

**後端**：validate-login/route.ts

- 函數簽名完全沒有 rememberMe 參數
- 無任何邏輯處理 30 天

**Session TTL**：supabase/config.toml line 127

- `jwt_expiry = 3600` — JWT 有效期 **1 小時**（不是 30 天）
- `enable_refresh_token_rotation = true` — 可自動刷新 token
- Refresh token 無明確 TTL

**結論**：「30 天」完全未實作。復選框存 state、但：

- 不送到後端
- 後端無邏輯
- JWT 固定 1 小時
- No `maxAge` / `expires` cookie 指令

## 5. Middleware / Guard

**middleware.ts** 全局路由保護：

- 先檢 quick-login-token（特殊一次性登入）
- 再檢 Supabase session（createServerClient 讀 cookies）
- Token 過期 → 自動刷新（line 32-35）
- 未認證 → 重導 `/login?redirect=<path>`（line 115-119）
- 公開路由白名單：`/login` 等

**登入後重導**：

- 優先 query param `?redirect=`
- Fallback localStorage `last-visited-path`
- 最終 fallback `/dashboard`

## 6. Session / Token 建立

**Supabase Auth（@supabase/ssr）**：

- `supabase.auth.signInWithPassword()` → Supabase 簽發 JWT + refresh token
- JWT：1 小時有效期
- Refresh token：內建機制
- Cookies：自動 httpOnly
- **無自家 JWT**（已移除）

**Client State Persistence**：

- Zustand store 持久化到 localStorage（`auth-storage`）
- `skipHydration: true`
- 重載頁面時 rehydrate + 觸發 `ensureAuthSync()`

## 7. 相關 Import 樹

- `@supabase/ssr`：createBrowserClient, createServerClient（cookie 管理）
- `zustand`：create, persist（全域 auth state）
- `@/lib/auth/auth-sync`：ensureAuthSync, resetAuthSyncState（RLS 同步）
- `@/lib/auth/quick-login-token`：verifyQuickLoginToken（middleware 用）
- `@/lib/supabase/admin`：getSupabaseAdminClient()（API 後端用）
- `@/lib/rate-limit`：checkRateLimit()（登入防暴力）
- `@/lib/validations/api-schemas`：validateLoginSchema

---

## 摘要

**(1) 登入後 session 實際活多久**
`supabase/config.toml` line 127 — `jwt_expiry = 3600`（**1 小時**）。Refresh token 啟用、可自動刷新、無明確 30 天上限。Cookie 由 `@supabase/ssr` 設為 httpOnly（無手動 maxAge）。

**(2) 「保持 30 天」打勾實際上改了什麼**
**改了**：Zustand state 內的 `rememberMe`（UI 反應、localStorage 可見）。
**沒改**：

- 未送到後端（auth-store.ts line 184 POST body 無此參數）
- 後端無邏輯
- JWT TTL 仍為 1 小時
  **這個打勾是 UI 假象、無後端支撐**。

**(3) 多套驗證方式並存跡象**

- 主流：Supabase Auth + JWT cookie（`@supabase/ssr`）
- 特殊：Quick-Login Token（HMAC 驗、一次性、middleware.ts 16-18）
- 舊已移除：自家 JWT auth-token cookie（2026-04-18 移除）
  主要是「保留 quick-login（內部機制）+ 標準 Supabase Auth」的雙軌。
