# 🔒 資安健檢會議報告

## 會議日期：2026-04-16
## 參與角色：資安工程師、後端架構師

---

### 執行摘要（3 句話總結）

Venturo ERP 已建立基礎的認證與授權架構（JWT + Supabase Auth + RLS + RBAC），但 P0 清單中有多項尚未完成修復，尤其是 Cookie 未使用 httpOnly、Token Blacklist 僅存在 localStorage（client-side）、以及登入失敗鎖定機制完全缺失。整體而言，系統已從「無防護」進入「有基本防護」的階段，但距離 SaaS 上線標準仍有顯著差距，需優先處理身份認證與 session 管理的漏洞。

---

### P0 修復進度

| # | 項目 | 狀態 | 說明 |
|---|------|------|------|
| 1 | Cron endpoint 驗證邏輯修正 | ⚠️ 部分完成 | `process-tasks`、`ticket-status`、`sync-logan-knowledge` 三個 cron 有 `CRON_SECRET` 驗證，但驗證邏輯有缺陷：當 `CRON_SECRET` 未設定時 (`undefined`)，條件 `CRON_SECRET && ...` 直接跳過驗證，等於**無 secret 就無驗證**。`auto-insurance` 的 GET endpoint **完全沒有任何驗證**，任何人可觸發。 |
| 2 | JWT 過期時間統一 14 天 | ❌ 未完成 | `src/lib/auth.ts` 的 `generateToken()` 已改為 14 天，但**實際使用的 JWT 簽發**在 `validate-login/route.ts` 第 168 行仍寫死 `'30d'`（30 天）。Cookie max-age 在 `auth-store.ts` 第 120 行也是 `30 * 24 * 60 * 60`（30 天）。三處不一致。 |
| 3 | Production JWT_SECRET 強制檢查 | ✅ 已完成 | `middleware.ts` 第 8-9 行：`if (!JWT_SECRET && process.env.NODE_ENV === 'production') throw new Error(...)`。Production 環境未設定 JWT_SECRET 會直接 crash。 |
| 4 | 刪除 auth.ts 死碼 | ⚠️ 部分完成 | `src/lib/auth.ts` 仍存在 `generateToken()`（base64 編碼，無簽名的舊格式）和 `verifyToken()` 函數。這些是**不安全的 token 格式**（僅 base64，任何人可偽造），雖然 middleware 已改用 jose JWT 驗證，但舊函數仍被 export，可能被其他地方誤用。 |
| 5 | Cookie 改 httpOnly | ❌ 未完成 | `auth-store.ts` 第 125 行：`document.cookie = \`auth-token=${token}; ...\`` 透過 JavaScript 設定 cookie，**無法**設定 httpOnly 屬性（httpOnly 只能由 server-side Set-Cookie header 設定）。目前 auth-token cookie 可被任何 JS 讀取，存在 XSS token 竊取風險。唯一使用 httpOnly 的是 LINE OAuth callback（`src/app/api/auth/line/callback/route.ts`）。 |
| 6 | Rate limit 改 Supabase table | ❌ 未完成 | `src/lib/rate-limit.ts` 使用 in-memory `Map` 實作。在 Vercel serverless 環境中，每個 function instance 有獨立記憶體，rate limit **無法跨 instance 共享**，等於形同虛設。攻擊者只需頻繁觸發新 instance 即可繞過。 |
| 7 | 登入失敗 5 次鎖定 15 分鐘 | ❌ 未完成 | 完全沒有實作。`validate-login/route.ts` 僅有 rate limit（10 req/min），但 rate limit 本身是 in-memory 的（見 #6），且 10 次/分鐘的限制對暴力破解防護不足。沒有帳號鎖定機制、沒有累計失敗次數、沒有指數退避。 |
| 8 | 員工數量上限檢查 | ❌ 未完成 | `src/app/api/employees/create/route.ts` 在建立員工時**沒有檢查**當前 workspace 的員工數量是否超過 plan 上限。任何有登入的使用者都可以無限建立員工。 |

**完成率：1/8 完成，2/8 部分完成，5/8 未完成**

---

### 發現的新風險

#### 🔴 Critical（必須立即修復）

**C1. 預設密碼硬編碼 `12345678`**
- 檔案：`src/app/api/employees/create/route.ts` 第 51 行
- 問題：`password: password || '12345678'` — 若前端未傳密碼，所有新建員工使用相同的弱密碼
- 影響：任何知道員工編號的人都可以用 `12345678` 嘗試登入
- 建議：改為隨機產生強密碼，並強制首次登入時修改（Phase 2 項目，但應提前處理）

**C2. auth-token Cookie 無 httpOnly，可被 XSS 竊取**
- 檔案：`src/stores/auth-store.ts` 第 125 行
- 問題：JWT token 存在 client-side 可讀的 cookie 中，任何 XSS 漏洞都能直接竊取 session
- 影響：若任何頁面有 XSS 漏洞（包含第三方套件），攻擊者可竊取所有使用者的 JWT
- 建議：改由 server-side API route 設定 httpOnly cookie（用 `Set-Cookie` response header）

**C3. Token Blacklist 僅在 client-side localStorage**
- 檔案：`src/lib/auth.ts` 第 16-37 行
- 問題：`addTokenToBlacklist()` 寫入 `localStorage`，只在**當前瀏覽器**有效。登出後的 token 在其他裝置或直接 API 呼叫中仍然有效
- 影響：登出功能形同虛設 — token 仍可使用至過期（最長 30 天）
- 建議：實作 server-side token blacklist（Supabase table 或 Redis），middleware 中檢查

**C4. Cron `auto-insurance` GET endpoint 無驗證**
- 檔案：`src/app/api/cron/auto-insurance/route.ts` 第 228 行
- 問題：GET handler 沒有 CRON_SECRET 驗證，任何人可以呼叫觸發保險通知
- 影響：可能導致重複發送保險通知給保險公司群組、洩漏團員個資（姓名、身分證字號、出生日期）
- 建議：加入 CRON_SECRET 驗證，與其他 cron endpoint 一致

#### 🟠 High（應在上線前修復）

**H1. JWT Secret Fallback 可能在 non-production 環境使用弱密鑰**
- `middleware.ts` 第 11 行、`validate-login/route.ts` 第 11 行：都有 `|| 'venturo_dev_jwt_secret_local_only'` fallback
- 問題：staging 環境若未設 `JWT_SECRET`，會使用硬編碼的弱 secret
- 建議：staging 也應強制設定，或至少在 log 中 warn

**H2. `employees` 表 RLS 被 DISABLE**
- 檔案：`supabase/migrations/20251211120001_enable_complete_rls_system.sql` 第 166-183 行
- 問題：`employees` 表被列在 `tables_to_disable` 陣列中，理由是「全公司共用」。但這意味著**任何已登入的 Supabase 用戶**可以讀取所有 workspace 的員工資料（包含其他租戶）
- 影響：多租戶資料隔離失效 — 租戶 A 的員工可以查到租戶 B 的員工列表
- 建議：啟用 RLS 並加上 workspace_id 過濾

**H3. `useRolePermissions()` 永遠回傳 true**
- 檔案：`src/lib/permissions/hooks.ts` 第 172-202 行
- 問題：`canRead` 和 `canWrite` 的 fallback 是 `?? true`（預設允許），而 `permissions` state 永遠是空陣列（沒有 API 載入邏輯）
- 影響：所有 route-level 的 RBAC 權限檢查形同虛設
- 注意：`useTabPermissions` 是有效的（有 API 查詢），但 `useRolePermissions` 是空殼

**H4. 多個 API 路由缺少認證保護**
- `auto-insurance` POST：無 `getServerAuth` 或任何認證
- `bot-notification` POST：僅靠 `x-bot-secret` header，Production 未設時直接跳過驗證
- 多數 `finance/` 和 `accounting/` 路由未在列表中，需逐一確認（middleware 會擋，但 API 本身應有二次驗證）

**H5. `admin-reset-password` 使用 `listUsers()` 遍歷全部用戶**
- 檔案：`src/app/api/auth/admin-reset-password/route.ts` 第 68-75 行
- 問題：使用 `supabaseAdmin.auth.admin.listUsers()` 取得所有用戶，再用 `find` 比對 email。當用戶量增長，這會有效能問題，且回傳了過多資料
- 建議：改用 `getUserByEmail` 或直接查 employees 表

#### 🟡 Medium（上線後第一輪修復）

**M1. 建立租戶時回傳明文密碼**
- 檔案：`src/app/api/tenants/create/route.ts` 第 580 行
- 問題：`password: adminPassword` 直接在 API response 中回傳，可能被 log 記錄

**M2. Quick Login Token 的 secret 有弱 fallback**
- 檔案：`src/lib/auth/quick-login-token.ts` 第 7 行
- `QUICK_LOGIN_SECRET || 'venturo_dev_quick_login_local_only'`

**M3. 權限系統新舊混合**
- `src/lib/permissions/index.ts` 同時維護 `SYSTEM_PERMISSIONS`、`FEATURE_PERMISSIONS`（舊版）和 `MODULES`、`FEATURES`（新版）
- 舊系統的 `permissions.includes('*')` 判斷已被移除但 `tenants/create` 仍在寫入 `'*'` 到 employee permissions
- 建議：統一清理

---

### 具體建議（按優先級）

#### 立即（本週內）

1. **修復 `auto-insurance` cron 無驗證**：加入 CRON_SECRET 檢查（預估 10 分鐘）
2. **統一 JWT 過期時間為 14 天**：修改 `validate-login/route.ts` 的 `.setExpirationTime('30d')` 為 `'14d'`，同步修改 `auth-store.ts` cookie max-age 為 `14 * 24 * 60 * 60`（預估 15 分鐘）
3. **清除 auth.ts 死碼**：移除 `generateToken()`、`verifyToken()`、`getUserFromToken()`（預估 30 分鐘，需確認無其他引用）
4. **修復 Cron Secret 驗證邏輯**：將 `if (CRON_SECRET && ...)` 改為 Production 環境強制要求 CRON_SECRET（預估 15 分鐘）

#### 短期（兩週內）

5. **Cookie 改 httpOnly**：建立 `/api/auth/set-session` 路由，由 server-side 設定 httpOnly cookie，前端 login flow 改為呼叫此 API（預估 2-3 小時）
6. **Server-side Token Blacklist**：建立 `token_blacklist` Supabase table，logout 時寫入，middleware 檢查（預估 3-4 小時）
7. **登入失敗鎖定機制**：建立 `login_attempts` Supabase table，紀錄失敗次數，5 次後鎖定 15 分鐘（預估 3-4 小時）
8. **員工數量上限檢查**：在 `employees/create` 中查詢 workspace plan 的 employee_limit 並驗證（預估 1 小時）
9. **預設密碼改隨機**：使用 `crypto.randomBytes` 產生 12 位隨機密碼（預估 30 分鐘）

#### 中期（一個月內）

10. **Rate Limit 遷移 Supabase**：建立 `rate_limits` table，改用 DB 層面的 rate limit（預估 4-5 小時）
11. **`employees` 表啟用 RLS**：設計 workspace_id 隔離策略，確保多租戶安全（預估 3-4 小時）
12. **清理 `useRolePermissions` 空殼**：要麼實作完整功能，要麼移除並統一使用 `useTabPermissions`（預估 2 小時）
13. **Concurrent Session Limit**：限制同一帳號同時登入的裝置數量（Phase 2 項目）

---

### 下一步行動

| 行動項目 | 負責人 | 預計完成日 | 備註 |
|----------|--------|-----------|------|
| 修復 cron 驗證 (#1, #4) | 後端 | 2026-04-18 | 影響小，快速修復 |
| 統一 JWT 14 天 (#2) | 後端 | 2026-04-18 | 三處改動 |
| 清除 auth.ts 死碼 (#3) | 後端 | 2026-04-20 | 需要確認引用 |
| Cookie httpOnly (#5) | 後端 | 2026-04-25 | 需改 login flow |
| Server-side Blacklist (#6) | 後端 | 2026-04-25 | 搭配 cookie 修改一起做 |
| 登入鎖定 (#7) | 後端 | 2026-04-25 | 依賴 #10 的 rate limit table |
| 員工上限 + 預設密碼 (#8, #9) | 後端 | 2026-04-23 | 獨立修復 |
| Rate Limit 遷移 (#10) | 後端 | 2026-04-30 | 搭配 #7 |
| Employees RLS (#11) | 後端 | 2026-05-05 | 需做 migration |
| 下次資安複查會議 | 全員 | 2026-05-01 | 驗證修復進度 |

---

### 附錄：審計覆蓋範圍

本次審計覆蓋了以下檔案與模組：

- **認證系統**：`src/stores/auth-store.ts`、`src/lib/auth.ts`、`src/lib/auth/`（server-auth、quick-login-token）
- **Middleware**：`src/middleware.ts`
- **權限系統**：`src/lib/permissions/`（features、hooks、module-tabs、useTabPermissions）
- **API 路由**：`src/app/api/auth/`（validate-login、change-password、admin-reset-password、create-employee-auth）、`src/app/api/cron/`（4 個 cron job）、`src/app/api/employees/create/`、`src/app/api/tenants/create/`、`src/app/api/bot-notification/`
- **Rate Limiting**：`src/lib/rate-limit.ts`
- **RLS Migrations**：`supabase/migrations/20251211120001_enable_complete_rls_system.sql`
- **API 認證覆蓋率**：確認 49 個 API route 使用 `getServerAuth`，133 個檔案中有 194 個 handler

---

*報告由資安工程師於 2026-04-16 產出，下次複查預定 2026-05-01。*
