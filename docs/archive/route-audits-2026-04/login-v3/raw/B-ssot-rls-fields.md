# Agent B — SSOT / RLS / 欄位一致性（v3.0 覆盤）

Route：/login
Date：2026-04-22（晚間、11 commit 推後）
Scope：今晚修法落地驗證 + v2.0 遺留項追蹤

---

## 1. 原則 3「租戶一致性三層守門」

### Middleware 層（`src/middleware.ts`）

- ✅ **修法落地**（L16–41 `EXACT_PUBLIC_PATHS` + `PREFIX_PUBLIC_PATHS`）
- L72–103 `isPublicPath()` 二層判斷
- 4 支敏感 auth API（admin-reset-password / create-employee-auth / reset-employee-password / get-employee-data）**不在白名單**、middleware 會 307 redirect 到 /login（curl 實測通過）

### API 層 — P003 九支修法（A–I）

| Route                                            | 修法落地？                    | 證據（file:line）                                                              |
| ------------------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `/api/auth/validate-login`                       | ✅（公開、查 workspace code） | L25 `eq('code', code.trim().toUpperCase())`                                    |
| `/api/auth/sync-employee`（P003-B）              | ✅                            | L59–77 查目標 employee.workspace_id、驗 body 對齊、拒覆蓋已綁帳號              |
| `/api/auth/admin-reset-password`（P003-D）       | ✅                            | L86–99 `eq('supabase_user_id', user.id)` 反查 target workspace、比 caller、403 |
| `/api/auth/create-employee-auth`（P003-E）       | ✅                            | L132–138 驗 workspace_code 對齊；new-tenant 分支不動                           |
| `/api/auth/reset-employee-password`（P003-C）    | ✅                            | L81 `employee.workspace_id !== auth.data.workspaceId` 則 403                   |
| `/api/auth/get-employee-data`（P003-I）          | ✅                            | L49–56 驗 body workspace code 解析後 === caller workspace                      |
| `/api/permissions/features`（P003-A）            | ✅                            | 新增 `requireTenantAdmin()` helper、PUT 套、GET `?workspace_id=` 套            |
| `/api/workspaces/[id]`（P003-H）                 | ✅                            | 自己 workspace 直通、跨租戶需「租戶管理」權限                                  |
| `/api/tours/[tourId]/requests/[requestId]/accept | reject`（P003-F）             | ✅                                                                             | UPDATE WHERE id + tour_id filter、accept 前置 SELECT 驗 |

### DB RLS 層（對照 DB_TRUTH 2026-04-22 16:07 重拍）

- `workspaces`：select/update 用 `id = get_current_user_workspace()` ✅、insert 用 `is_super_admin()` ✅、**delete 用 `USING: true`（任何登入用戶可刪、新發現、見 Agent F）**
- `employees` / `workspace_roles`：4 條 policy 全用 workspace scoped ✅
- `role_tab_permissions`：今晚 migration 20260422140000 從 USING:true 改 5 條 tenant scoped policy（service_role 管理 + 4 條 tenant subquery）✅
- `employee_permission_overrides`：**4 條全 USING:true / WITH CHECK:true**（從 v2.0 至今未修）❌
- `employee_route_overrides`：policy 正確（自己看自己 + service_role）✅

---

## 2. 欄位一致性 UI ↔ API ↔ DB ↔ Store

### 「帳號」

| 層          | 取值                                                                    |
| ----------- | ----------------------------------------------------------------------- |
| UI          | placeholder `"帳號（例：E001）"`（login/page.tsx:126）                  |
| API request | `username`                                                              |
| API query   | employee_number 優先 / email 次優（validate-login L39–55 isEmail 判斷） |
| DB          | employees.employee_number / employees.email 兩欄並存                    |
| Store       | `user.employee_number`（auth-store L70）                                |

**結論**：✅ 三層對齊、UI 說明是「員工編號例 E001」→ API 優先查 employee_number ILIKE。

### 「保持 30 天」rememberMe

| 層            | 狀態                                                                        |
| ------------- | --------------------------------------------------------------------------- |
| UI            | ✅ checkbox（login/page.tsx:150–165、label「記住我（30 天內免重新登入）」） |
| API 傳輸      | ✅ auth-store.ts:67 傳 `rememberMe` 到 validate-login                       |
| API 處理      | ❌ validate-login/route.ts 完全無 rememberMe 邏輯                           |
| Cookie maxAge | ❌ 未顯式定義（依賴 Supabase ssr 預設）                                     |
| JWT TTL       | 1 小時（Supabase 預設）                                                     |

**結論**：⚠️ **仍是假功能**（v2.0 已發現、今晚未修）。UI 有收、API 有傳、後端完全沒消費。建議 v3.1 補齊或刪除 UI。

### workspace_code

| 層                       | 說明                                            |
| ------------------------ | ----------------------------------------------- |
| UI                       | input line:114–120、自動 uppercase              |
| API validate-login       | L25 `eq('code', code.trim().toUpperCase())`     |
| API create-employee-auth | L132 驗 workspace_code 與 caller 對齊（P003-E） |
| Store                    | user.workspace_code                             |

**結論**：✅ workspace_code 查詢統一大寫、三層對齊。

---

## 3. getServerAuth `.or()` 混淆（v2.0 遺留）

### 位置

`src/lib/auth/server-auth.ts:79–83`

```ts
.or(`id.eq.${user.id},supabase_user_id.eq.${user.id}`)
.limit(1)
```

### 狀態：⚠️ **原樣保留、未改**

- Pattern A（標準）：employee.id = auth.uid
- Pattern B（舊制）：supabase_user_id = auth.uid
- 兩種混查、順序不保證 → 若同時匹配多 row 會隨機返回其一

### 風險評估

- P003 五支 API 都有「二次驗收」（比對 workspace）兜回、實際安全影響降低
- 但 **根本問題未解**：`.or()` 無序性仍在、若某用戶同時符合兩 pattern、回傳行為不定

### 建議修法

- 優先查 id.eq、找不到才查 supabase_user_id.eq（明確優先級）

---

## 4. `|| ''` 空字串陷阱（v2.0 + CLAUDE.md 紅線）

### 掃描結果：✅ 無殘留

- validateLoginSchema L234：code 必填、無 `|| ''`
- syncEmployeeSchema L205：workspace_id optional、但 route.ts 不用 body 值、用 `targetEmp.workspace_id`（P003-B 修法）
- auth-store.ts:107 / 219：無 `|| ''`

---

## 5. SSOT 追蹤（登入流程）

```
login page.tsx:67 → validateLogin(username, password, code, rememberMe)
  ↓
auth-store.ts:181–184 → fetch /api/auth/validate-login {username, password, code}
  ↓
validate-login/route.ts:22–35 → query workspaces by code、查 employees by username
  ↓
sync-employee 階段 → ensureAuthSync(employeeId, workspaceId) → sync-employee API → 驗 workspace 對齊（P003-B）
  ↓
auth-store.ts:223 → fetchWorkspaceInfo(employeeData.workspace_id)
```

**SSOT 評分**：✅ workspace 真相來源唯一（employees.workspace_id）、後續層次都驗證。

**可議**：workspace 資訊有兩次查詢（validate-login 回 workspaceId/Code、再 fetchWorkspaceInfo）、可優化但非 bug。

---

## 總結表

| 項目                                        | v3.0 評分               | v2.0 狀態  |
| ------------------------------------------- | ----------------------- | ---------- | --------- | ---- |
| P001 前端拔 isAdmin 短路                    | ✅ 落地                 | 🔴 發現    |
| P002 Middleware 精確白名單                  | ✅ 落地                 | 🔴 發現    |
| P003 A–I 九支跨租戶守門                     | ✅ 落地                 | 🔴 發現    |
| P010 role_tab_permissions RLS tenant scoped | ✅ 落地                 | 🆘 新      |
| rememberMe 30 天                            | ❌ 未修（仍假功能）     | 🟡         |
| getServerAuth `.or()` 混淆                  | ⚠️ 未修（二次驗收兜回） | 🟡         |
| `                                           |                         | ''` 空字串 | ✅ 無殘留 | 紅線 |
| 欄位一致性（帳號 / workspace_code）         | ✅ 三層對齊             | 部分       |
| `employee_permission_overrides` USING:true  | ❌ 未修（v2.0 至今）    | 🔴         |
| **`workspaces_delete` USING:true**          | ❌ **v2.0 漏抓新紅色**  | 🆘         |

---

**結論**：今晚核心安全修法（P001 / P002 / P003 / P010）**全部著陸 ✅**。v2.0 遺留的 rememberMe / .or() / employee_permission_overrides 全部未動、workspaces_delete 是 v2.0 漏抓的新紅色警訊（見 Agent F 詳）。
