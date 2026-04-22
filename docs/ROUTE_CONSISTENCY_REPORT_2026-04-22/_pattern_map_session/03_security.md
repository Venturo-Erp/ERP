# 03 · Security Engineer 會診：權限雙層檢查 SSOT 破碎 + 模組清單未連結

**日期**：2026-04-22
**角色**：Security Engineer（威脅建模 / 攻擊面 / defense in depth / least privilege）
**範圍**：病症（權限雙層檢查 SSOT、模組兩本清單）加 William 的七個特別問題
**限制**：純診斷，不動代碼 / DB

---

## 身份宣告

我用攻擊者腦去讀這套權限系統。評估標準：**每一層擋板被繞過時、blast radius 多大**、**least privilege 有沒有守**、**fail-safe 是 fail-open 還 fail-closed**。對 William「單層化」的傾向、我的立場是：**單一來源 SSOT 要統一，但擋板不能從兩層砍成一層；要做的是把「多層擋板」從人工同步改成「系統自動同步」**。

---

## Pattern 清單（威脅建模）

### P-SEC-01 · `PUT /api/permissions/features` 零認證（Critical）
**檔**：`src/app/api/permissions/features/route.ts:48-94`

**攻擊面**：任一 authenticated user（middleware 只看 Supabase session 有沒有、不看 role），呼叫
`PUT /api/permissions/features { workspace_id: <別家>, features: [...], premium_enabled: true }`
→ 端點完全沒驗 `role.is_admin`、沒驗 `is_super_admin()`、沒驗 caller 的 workspace_id、直接 `createServiceClient()` 繞 RLS 寫別家 workspace。

**Blast radius**：跨租戶開關任何功能 / 打開 premium 旁路付費 / 關掉受害租戶所有功能 → 有人付的月費被「關水龍頭」。配合 `/login` 的 `sync-employee` 跨租戶綁帳號漏洞，外部攻擊者只要在自家 workspace 建一個員工就能達到。

**根因**：DB RLS 寫得對（`is_super_admin() OR 同 workspace`），但應用層用 service_role 繞 RLS、又沒補應用層 auth guard。這正是原則 3 警戒的「單點防禦打穿」。

**修法**：應用層補 `if (!isSuperAdmin(caller) && caller.workspace_id !== targetWorkspaceId) return 403`；或乾脆不用 service client、讓 RLS 擋。

---

### P-SEC-02 · `workspace_features` RLS 雖有、但 INSERT policy 過寬
**DB_TRUTH:14209-14216**

- SELECT / UPDATE / DELETE：`workspace_id = get_current_user_workspace()`（OK）
- INSERT：`is_super_admin() OR workspace_id = get_current_user_workspace()`（**任何一般員工都能 INSERT 自家 feature row**）

**威脅**：沒有 `is_admin` 檢查。普通員工能直接 `insert into workspace_features (...)` 打開 premium feature。**搭配 client-side 沒有阻擋、Supabase REST API 可直接呼叫**。

**修法**：INSERT policy 應該是 `is_super_admin() OR (同 workspace AND is_role_admin(auth.uid()))`。

---

### P-SEC-03 · 雙層檢查 SSOT 破碎（病症主題）

**雙層**：
1. UI / API：`isFeatureEnabled`（查 `workspace_features` 即時）
2. JWT：`rolePermissions`（登入當下 snapshot 進 JWT claim）

**SSOT 破碎面**：
- 層 1 開關：`workspace_features.enabled`（租戶管理頁改）
- 層 2 權限：`role_tab_permissions`（HR 改 role 權限）
- **關閉 feature 不會 cascade 清掉 role permission**（設計：重開要 admin 重勾）

**安全意涵分層**：

| 情境 | 只看 layer 2 | 雙層都看 | 風險 |
|---|---|---|---|
| Feature 關、role perm 沒清 | **越權放行** | 擋住 | layer 2 單層 = fail-OPEN |
| `role_tab_permissions` 誤寫 / SQL 注入 | **越權放行** | feature 關還擋 | layer 2 單層 blast radius 擴大 |
| Feature 重開、admin 還沒重勾 | **拒絕**（安全預設） | 拒絕 | 一致 |

**我的立場（回應 William 傾向「使用端單層、只看 role permission」）**：
- **NO**，拿掉 workspace feature 那層、等於放棄租戶邊界擋板。威脅模型：若 `role_tab_permissions` 被惡意寫入（SQL 注入 / 管理員錯誤 / 內部惡意 / bug 生出過寬的 row）、單層會**全站擴散**；雙層會被 feature 開關擋在租戶邊界。
- **正確走法**：把「feature off → role perm 自動 revoke」做成 **DB trigger（層 3）**，但 **不要刪掉使用端的雙層判斷**。Trigger 保證 data consistency（SSOT），雙層保證 runtime defense-in-depth。**SSOT ≠ 單層檢查**；SSOT 是「這個租戶該有什麼權限」只有一個真相來源（= feature 開關 + role perm 的交集），檢查的點可以多個。

---

### P-SEC-04 · JWT 權限即時性（William 問題 7）

**現況**（`validate-login/route.ts:141-201`）：
- 登入時從 `role_tab_permissions` 撈成陣列、夾進 response body、前端存進 auth-store
- Supabase session TTL 預設 1 小時（access token）
- **Feature 關 / role 改 / 員工離職** 後、JWT 內的 permissions 在 TTL 到期前繼續有效
- 沒有 revocation list、沒有 session-level 強制登出

**威脅**：
- **撤職 lag 最多 1 小時**：被裁員工在 TTL 內仍能用原權限
- **Feature 關了還能用 1 小時**：可接受度取決於「這 1 小時能做什麼壞事」→ 用 /finance/payments（付款）或 /tours/writePricingToCore（跨租戶 UPDATE）這種高敏感 API，1 小時 = 很大的 blast radius

**修法階梯（由輕到重）**：
1. 敏感 API（寫 DB、跨租戶、金流）**每次都即時查 DB**、不信 JWT claim（只信身份）
2. 登出 / 離職觸發 `supabase.auth.admin.signOut(user_id)` 強制 session 失效
3. JWT TTL 降到 15 分鐘（目前 1 小時偏長）
4. 引入 session version number、server-side 改 role / feature → 把版本號 bump → JWT 舊版本拒收

**我的推薦**：1 + 2 先做、3 看體驗能不能接受、4 是之後的事。

---

### P-SEC-05 · 員工能自改 `role_id`（/hr 已發現）→ 整合後的安全意涵（William 問題 5）

**威脅**：任一員工能 UPDATE 自己的 `employees.role_id` → 改成 admin role → 下次登入 JWT 就是 admin。

**整合後**（層 1 MODULE_REGISTRY + 層 3 cascade trigger）：
- **更危險**：若整合後仍沒堵這個洞、自改 role_id + cascade trigger 自動同步 = 員工自己把自己變 admin 速度更快
- **更安全**：若整合時順手做「`employees.role_id` UPDATE 加 policy：僅 admin 可改別人、無人可改自己」→ 借整合機會關洞

**結論**：整合本身中性、關鍵看有沒有順手修。建議整合 PR 的 checklist 裡硬性加一條「employees role_id UPDATE policy 檢查」。

---

### P-SEC-06 · Layer 3 DB trigger 的跨租戶隔離風險（William 問題 4）

**威脅模型**：DB trigger 執行身份是 `security definer`、跑在 DB superuser 下、繞過 RLS。若 trigger 邏輯寫錯 / 被 inject、blast radius 是**整個 DB**。

**具體風險點**：
- Trigger on `workspace_features` → auto revoke `role_tab_permissions`：要確保 WHERE clause 有 `workspace_id = NEW.workspace_id` 限定（**不要只用 feature_code 比對**、否則 A 租戶關 feature 把 B 租戶的 role perm 也清掉）
- Trigger 裡 `role_tab_permissions` DELETE 的 WHERE 要把 `module_code / tab_code / workspace_id` 三個一起比、少一個就跨租戶污染

**防守**：
- Trigger function 用 `security invoker`（若可行）而非 `security definer`
- 單元測試：建兩個 workspace、分別有同樣 feature_code、一個 feature 關、驗另一個不受影響
- Trigger 裡寫明 workspace_id filter、加註解警告

---

### P-SEC-07 · Middleware 放行 `/api/auth/*` 全組（_INDEX 既有）

**重訪**：`middleware.ts:68` publicPaths 放行 `/api/auth` 整個 prefix。本次分析的 `/api/permissions/features`（P-SEC-01）雖不在 `/api/auth/*`、但同 pattern——**middleware 粗放 + 應用層零認證 = fail-open**。

**修法**：publicPaths 用 exact match 或精確白名單（`/api/auth/validate-login`、`/api/auth/logout`、`/api/auth/sync-employee` 逐條列），不用 prefix。

---

## 演進建議（優先級）

### P0 · 本週必修（Critical）
1. **`PUT /api/permissions/features` 補 auth guard**：檢查 caller 是 super_admin 或 same-workspace admin
2. **`employees.role_id` UPDATE policy 加自改擋板**：`can_update_role_id(target_employee)` predicate
3. **`workspace_features` INSERT policy 加 is_admin 檢查**

### P1 · 兩週內（整合前必備）
4. **敏感 API 不信任 JWT permissions claim**，每次即時查 DB：金流、跨租戶寫、密碼重設、角色變更
5. **登出 / 離職強制 session 失效**（`supabase.auth.admin.signOut`）
6. **Middleware publicPaths 改白名單精確匹配**

### P2 · 整合階段（層 1 + 層 3 啟動時）
7. **Layer 3 trigger 設計審查**：workspace_id filter 必備、加跨租戶測試、偏好 `security invoker`
8. **保留雙層 runtime check**（不砍 feature 檢查）、只把 data sync 交給 trigger
9. **JWT TTL 降到 15 min + session version bump 機制**

### P3 · 長期
10. 建立 security regression test suite（每個 pattern 一個 failing test、修好轉 passing）

---

## 對 William 傾向的正式回應

> William 的偏好：「層 1 MODULE_REGISTRY 合一、層 2 使用端單層只看 role permission、層 3 DB trigger cascade」

**同意**：
- 層 1 MODULE_REGISTRY 合一（消除兩本清單 drift）—— 攻擊面減少、**純贏**
- 層 3 DB trigger cascade —— SSOT 自動同步、**正確方向**（但實作要小心跨租戶）

**反對 / 建議調整**：
- **層 2 不要砍到單層**。把「資料同步」（SSOT）和「檢查時機」（defense in depth）分開。SSOT 用 trigger 做到 feature off 自動清 role perm、**但使用端仍然兩個都看**——因為任何一邊被誤寫、另一邊當 fail-safe。成本：兩行 code，`if (!featureEnabled) return false; if (!hasRolePerm) return false;`。收益：role_tab_permissions 誤寫時、blast radius 只到「該 role 自己」、不擴散到租戶以外。

**哲學**：SSOT 是資料原則、defense in depth 是 runtime 原則。兩者不衝突、砍 runtime 檢查換 SSOT 是把兩個不相關的概念混為一談。

---

## < 200 字摘要

這套雙層檢查的**資料 SSOT** 該修（feature 關、role perm 沒自動清、靠人工）、建議用 DB trigger 自動同步；但**使用端兩層 runtime check 不能砍**、那是 defense in depth，砍了系統變成單點防禦、role_tab_permissions 誤寫直接全站越權。更急的是 `PUT /api/permissions/features` 零認證可跨租戶改功能（Critical）、`employees.role_id` 員工能自改（High）、JWT 權限 1 小時 TTL 內撤職/關 feature 仍生效（High）。整合層 1 / 層 3 時把這三個洞順手關、defense in depth 維持、SSOT 交給 trigger——這樣 William 要的「乾淨」和安全的「多層」可以同時拿。
