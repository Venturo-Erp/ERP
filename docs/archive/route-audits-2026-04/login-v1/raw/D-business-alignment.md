# Agent D — 業務符合驗證（/login）

## 錨點 1：驗證方式歷史多套

> William 原話：「以前登錄的時候好像有不同的驗證方式、這件事情好像會導致後面很多地方出現問題」

**驗證結果：確鑿**

### 已移除的驗證方式（4 組舊制殘留足跡）

1. 自家 base64 JWT（`src/lib/auth.ts` 10-58 行已刪除但註釋仍在）
2. `generateToken()` / `verifyToken()` 舊實作（commit `94fd3fd2`、2026-04-17 移除）
3. Token Blacklist（localStorage 實作、留下 TODO：遷移到 server-side、`src/lib/auth.ts:4`）
4. 8 小時 vs 30 天雙軌 rememberMe（已統一、但歷史改動三次：8h→30d→14d）

### 當前活動系統（2 套）

- **Supabase Auth**（主軌道：JWT + httpOnly cookies、TTL=3600 秒=1 小時）
- **Quick-Login Token**（特殊單軌：HMAC-SHA256 簽名、8 小時、用於 API mobile client）

### 下游已知影響

- `middleware.ts:16-19` 仍檢查舊的 `quick-login-` prefix cookie 格式
- `auth-store.ts:317-321` Session 恢復時才執行 `ensureAuthSync()`、若 `supabase_user_id` 未同步會造成 RLS query 無結果
- git log 顯示 **4 次因舊驗證方式引起的 hotfix**（f6612916、9fa26a0c、94fd3fd2）

**Confidence**：確鑿（code + git log + CLAUDE.md 警告）

---

## 錨點 2：「保持 30 天」假功能懷疑

> William 原話：「上面有顯示登錄幾天、這個好像沒有實作、免密碼那個打勾好像是在顯示三十天、但好像跟實際不一樣」

**驗證結果：方向對待補證據**

### UI 宣稱 30 天

`src/app/(main)/login/page.tsx:163`：「記住我（30 天內免重新登入）」

### rememberMe 參數被接收但未真實使用

- page.tsx 第 67 行：傳 `rememberMe` 給 `validateLogin()`
- auth-store.ts 第 168 行：函簽收 `rememberMe: boolean = true`
- auth-store.ts 第 184 行：呼叫 `/api/auth/validate-login` 但**未在 request body 傳遞** rememberMe
- middleware.ts 第 16-19 行：發現 Quick-Login Token 才有真正的 8 小時 TTL

### 實際 TTL 衝突

- Supabase JWT（`supabase/config.toml:6`）：`jwt_expiry = 3600`（**1 小時**、非 30 天）
- 舊程式碼（`git show f6612916`）：曾經有 30 天 cookie maxAge、改為 14 天（commit 9fa26a0c）
- 當前沒有地方在設定 Supabase session cookie 的 maxAge（`src/lib/supabase/server.ts` 只是轉發 CookieOptions）

### 黑洞

rememberMe 打勾了、UI 說 30 天、但後端沒有讀、Supabase JWT 預設 1 小時、session cookie 沒有明確 maxAge 設定。

**Confidence**：方向對待補（看起來是、但缺一層：確認 Supabase 預設 cookie 有效期到底是多少）

---

## 錨點 3：未來 SaaS 多角色擴張彈性

> William 原話：「員工在使用、未來會變成 SaaS 給簽約廠商、會有旅遊業 Agent 或地接 Loco Agent、未來會有遊覽車公司、希望能發展到飯店以及餐廳使用」

**驗證結果：只是感覺**（hardcoding 證據確鑿、但無「這會卡住未來」的實證）

### 登入完全 hardcode 員工角色

- `validate-login/route.ts:43-55`：只查 `employees` 表、**不分支其他角色**
- 無條件式檢查 `employee.status === 'terminated'` 和 `employee.is_active`（70-75 行）
- 權限系統完全綁定 `workspace_roles` + `role_tab_permissions`（142-201 行）

### 登入成功後重導唯一目標

- `page.tsx:45`：`return '/dashboard'`（hard-coded、無 `user.type` / `user.role` 判斷）
- `middleware:110-112`：`if (authed) { return response }`（直接放行、無重導）

### 尚未實施的架構

- 無 `suppliers_agents` / `tour_leaders` / `loco_agents` 的登入查詢（即使 supplier_users 表 2026-02 建立、但 validate-login 忽略）
- 無 `user.type` 欄位標示「誰是員工、誰是供應商、誰是代理商」
- 無 multi-table union 登入查詢

### 改寫複雜度估計

- 登入頁面不動
- validate-login API 需擴展至 5 個表 union query + user_type 判斷
- middleware 中間件沒有被卡住（邏輯不變）
- dashboard 主頁需根據 user.type 分支
- 每個模組的 role_tab_permissions 需納入新角色

**Confidence**：只是感覺（邏輯上會卡、但沒有「現在已經壞了」的 bug）

---

## 三大錨點總結表

| 錨點             | 狀態                                 | 證據強度 | 緊急度 |
| ---------------- | ------------------------------------ | -------- | ------ |
| 1. 多套驗證遺留  | 活體殘留 4 組舊程式碼 + 2 套當前     | 確鑿     | 中     |
| 2. 30 天假功能   | rememberMe 參數無人讀 + TTL 配置亂套 | 方向對   | 中     |
| 3. SaaS 未來彈性 | 現在純員工、多角色架構為零           | 只是感覺 | 低     |
