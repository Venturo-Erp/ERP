# Agent C — 邏輯重複檢測（/login）

## 1. 驗證邏輯有 3 套並存

**活躍的驗證流程**：
- UI（`src/app/(main)/login/page.tsx:67`）→ 呼叫 `validateLogin` store method
- Store（`src/stores/auth-store.ts:165-244`）→ 呼叫 API + Supabase Auth
- API（`src/app/api/auth/validate-login/route.ts`）→ DB 驗證 + 權限計算 + 角色查詢
- Middleware（`src/middleware.ts:14-45`）→ 檢查 session / token

**殘留機制**：
- 註釋提到「已移除自家 JWT」（`middleware.ts:11` 和 `auth-store.ts:4`）
- 但仍保留 `quick-login-token` 驗證分支（`middleware.ts:16-19`）

## 2. 「30 天」邏輯散在 3 個地方（紅旗）

- **UI 層讀寫**：`login/page.tsx:20` checkbox 寫 state、`:67` 傳給 store
- **Store 層參數化**：`auth-store.ts:169` 參數定義但**未使用**
- **API 層**：`validate-login/route.ts` 的函數簽名根本沒接這參數、第 184 行 JSON 不包含 rememberMe

**結論**：rememberMe UI 控件和參數完全是幻象 —— 點勾選和不點勾選無差別。

## 3. 角色判斷邏輯有 4 套並存（高風險）

**API 層 — 3 個獨立的 `checkIsAdmin` 實作**（同邏輯各寫一次）：
- `src/app/api/employees/create-employee-auth/route.ts:22-43`
- `src/app/api/employees/reset-employee-password/route.ts:15-36`
- `src/app/api/employees/admin-reset-password/route.ts:15-38`

三個都用同邏輯：`role_id` OR `job_info.role_id` → 查 `workspace_roles.is_admin`。

**登入驗證層**：`validate-login/route.ts:143-201` 也有同樣邏輯（**重複第 4 次**）

**前端層**：
- `useAuthStore` state（`isAdmin`）
- 26 個檔案直接讀 `useAuthStore(state => state.isAdmin)`

**權限檢查**：`auth-store.ts:246-250` 的 `checkPermission` 用 OR 邏輯查 `permissions` array

**核心問題**：角色判斷「真相來源」不統一。`isAdmin` flag 來自 API response（登入時計算），之後若任何 API 端點改動角色、前端 `isAdmin` 不會自動更新。

## 改一個容易忘記改另一個的重複點

| 重複點 | 檔案位置 | 風險等級 |
|---|---|---|
| `checkIsAdmin` 函數定義 3 次 | 3 個 API 路由（create-employee-auth、reset-employee-password、admin-reset-password） | 🔴 |
| `isAdmin` 查詢邏輯（role_id + is_admin） | validate-login + 3 × checkIsAdmin | 🔴 |
| rememberMe 參數文案 | login/page.tsx:163 + 實際不用 | 🟡 |
| Supabase session 驗證 | middleware.ts:21-44 | 🟢 |

**最危險的改動情景**：修改「系統主管判斷邏輯」時、需同時改 **4 個檔案**才完整。否則某些 API 用舊判斷、前端用新判斷。

---

## 摘要

**(1) 驗證方式**：2 套活躍（Supabase Auth + quick-login token、後者已註記待移除）+ 無明顯 legacy orphan

**(2) 30 天邏輯**：散在 3 地方、但實際非功能（checkbox → 參數 → API 丟棄）

**(3) 角色判斷**：4 套並存（3 API + 1 store）、同邏輯重複寫、改動容易漏掉

**William 的懷疑點驗證**：確實存在「多套驗證方式會導致後面很多地方出問題」的隱患。特別是 `checkIsAdmin` 重複定義在 3 個 API 端點、任何對角色判斷的改動都需要 4 處同步修改。
