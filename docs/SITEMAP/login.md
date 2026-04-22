# /login — 網站地圖

Route：`/login`
Code paths：
- UI：`src/app/(main)/login/page.tsx`
- API：`src/app/api/auth/*`（11 個 endpoint）
- Middleware：`src/middleware.ts`
- Helpers：`src/lib/supabase/admin.ts`、`src/lib/auth/*`、`src/lib/rate-limit.ts`

Last updated：2026-04-22（v2.0 補驗、新增 DB 真相 + API/middleware 維度）

Raw reports：
- v1.2（2026-04-21）：`docs/ROUTE_CONSISTENCY_REPORT_2026-04-21/login_raw/`（Agent A–E）
- v2.0（2026-04-22）：`docs/ROUTE_CONSISTENCY_REPORT_2026-04-22/login/raw/`（Agent F DB 真相、G API+middleware）

---

## 業務目的（William 口述）

- **現在**：員工登入系統
- **未來**：SaaS 提供給多種廠商——旅遊業 Agent、地接 Loco Agent、遊覽車公司、飯店、餐廳
- **登入方式**：每家公司自己一組 workspace code、員工用該公司代號 + 自家帳密登入、**不分角色類型**
- **權限設計**：**權限長在人身上、不是頭銜上**。供應商建立時個別設權限、不管角色類型。管理員 = 預設權限多、不是萬能通行證
- **使用情境**：第一次登入、忘記密碼
- **不會有**：工作空間切換（一個旅行社用自己的帳密）

---

## 對照的跨路由設計原則

- **原則 1**：權限長在人身上、不是頭銜上 → **違反**（前後端 admin 都是萬能通行證、v1.2 + v2.0 雙重確認）
- **原則 2**：職務是身份卡、全系統統一 → 本頁不直接涉及、但登入後權限載入會拖進來

---

## 代碼現況

- **UI**：公司代號 + 帳號（員工編號或 email）+ 密碼 + 「記住我 30 天」checkbox + 登入按鈕
- **提交流程**：POST `/api/auth/validate-login` → Supabase Auth 密碼驗證 → 同步身份 → 存 Zustand store → 重導
- **API 家族**：11 個 `/api/auth/*` endpoint（validate-login、sync-employee、change-password、reset-employee-password、admin-reset-password、create-employee-auth、logout、LINE OAuth 等）
- **Middleware**：全域保護非認證路由、但 `/api/auth/*` 整組列為公開（`src/middleware.ts:67-68`）
- **Session**：Supabase JWT 1 小時（`jwt_expiry = 3600`）、refresh token 可刷、**cookie maxAge 未定義**
- **Rate limit**：validate-login 10 req/min、change-password 5 req/min（覆蓋完整）
- **登入後重導**：`?redirect` → `last-visited-path` → `/dashboard`
- **相關 DB table**：`workspaces`、`employees`、`auth.users`、加間接 `employee_permission_overrides`、`employee_route_overrides`、以及登入後首頁會讀的 28 張 FORCE RLS 表

---

## 真正該警惕的問題

（依嚴重度排、🔴 必須處理、🟡 應該處理、🟢 視情況）

### 🔴 1. 權限模型違背你的設計（v1.2 發現、v2.0 確認仍存在）

**你說的**：權限長在人身上、管理員只是預設權限多、不是萬能通行證。
**代碼實際**：管理員是萬能通行證、前後端都是。

| 層 | 現況 |
|---|---|
| 後端 API（4 個敏感動作） | 直接查 `isAdmin` 當開關、不查個人權限 |
| 前端 `checkPermission`（auth-store.ts:249） | `if (get().isAdmin) return true` **短路掉整個權限查詢** |

**4 個後端 bypass 點**：
- `validate-login/route.ts:143-201`
- `employees/create-employee-auth/route.ts:22-43`
- `employees/reset-employee-password/route.ts:15-36`
- `employees/admin-reset-password/route.ts:15-38`

**v2.0 新確認**：middleware 層也沒擋這些敏感 API（見 🔴 2）、雙重防線都不在。

---

### 🔴 2. Middleware 讓敏感 auth API 預設公開（v2.0 新發現）

**檔案**：`src/middleware.ts:67-68`（公開清單用 `/api/auth` 前綴、整組放行）

**現象**：
- 整個 `/api/auth/*` 不需登入就能打
- 包括：密碼重設、建員工帳號、同步身份、變更密碼
- 每支 API 自己在裡面補檢查（`getServerAuth()`）
- **前線防禦靠開發者記憶、不是架構**

**風險**：
- 某支 API 忘了加檢查就直通
- 不符合「defense in depth」

**修法方向**：middleware 公開清單只留最少必要（validate-login、logout、create-employee-auth 第一筆註冊）、其他要求登入

---

### 🔴 3. `sync-employee` 可跨租戶綁帳號（v2.0 新發現、最危險）

**檔案**：`src/app/api/auth/sync-employee/route.ts:24-52`

**攻擊流程**：
1. 用戶 A 在 workspace X 正常登入、拿到 access_token
2. 用戶 A 呼叫 `/api/auth/sync-employee`、body 帶：
   - `employee_id` = 任意員工（含其他 workspace 的人）
   - `supabase_user_id` = 自己的 user.id
   - `access_token` = 自己的 token
3. API 只檢查 `user.id === supabase_user_id`（自己的 token 對得上自己的 id）
4. 直接 `UPDATE employees SET supabase_user_id = ? WHERE id = ?`
5. **用戶 A 現在綁上了別人的員工身份、包括其他 workspace 的人**

**後果**：多租戶隔離徹底突破。

**修法方向**：API 內部先查 `employees.workspace_id` === 當前登入用戶的 workspace_id、不符拒絕。

---

### 🔴 4. DB 有 28 張表 FORCE RLS + service_role 衝突（登入後首頁會爆）

**背景**：CLAUDE.md 紅線記載過 `workspaces` FORCE RLS 讓登入全體失敗的歷史。

**v2.0 發現**（Agent F 對照 DB_TRUTH）：除 `workspaces` 已關 FORCE 外、還有 **28 張表** 同樣有 FORCE RLS + policy 沒給 `service_role` 例外：
- `tour_itinerary_items`（行程核心表、dashboard 必讀）
- `confirmations`（確認單）
- `files` / `folders`（附件）
- `visas`（簽證）
- 等 28 張

**現象**：登入 API 本身不讀這些表、所以登入成功。但登入後 `/dashboard` 載入就會被擋、用戶看到「空資料」、以為登入壞了。

**狀態**：已有計劃（WAVE_2_5 方案 A：全部改 NO FORCE）、**待 William 授權才修**。

---

### 🟡 5. 「保持 30 天」是假功能（v1.2 + v2.0 雙層確認）

- **UI**：勾了「記住我 30 天」
- **API**：POST body 沒送 rememberMe 參數（`auth-store.ts:184`）
- **JWT TTL**：1 小時
- **Cookie maxAge**：**未定義**（v2.0 新發現、`src/middleware.ts:31-35`）— 實際可能是 session cookie（關瀏覽器就掉）、比 1 小時還短

**三層全假**。

---

### 🟡 6. 驗證方式歷史包袱（v1.2 保留）

殘影 4 組（自家 base64 JWT 註釋、`generateToken`/`verifyToken` 舊實作、Token Blacklist TODO、rememberMe TTL 改過三次）。
git log 顯示 **4 次** 因舊驗證方式的 hotfix（慢性失血）。

---

## 其他觀察

### 身份真相（SSOT）

- `auth.users`（密碼）+ `employees`（身份 + 權限）兩表並存、橋接靠 `supabase_user_id`（v1.2 已述）
- **v2.0 補**：`employees` 表實際有 **3 個登入識別欄位** — `employee_number` / `email` / `supabase_user_id`（加上 `user_id`）、UI「帳號」欄位收哪個不明確
- **v2.0 補**：`getServerAuth()` 用 `.or(id.eq.X, supabase_user_id.eq.X)` 同時匹配兩種架構（新 vs 舊）、`.limit(1)` 回傳順序不保證、**可能身份混淆**（`src/lib/auth/server-auth.ts:39-126`）

### 租戶隔離（RLS、v2.0 對照 DB_TRUTH）

- `workspaces` 表：FORCE RLS **關著**（符合 CLAUDE.md 紅線 ✓）
- `workspaces` policy：unauthenticated user 可能能列舉 workspace code（side-channel、看 `get_current_user_workspace()` 函數內容、DB_TRUTH 沒列源碼、待驗）
- `employees` policy：`(workspace_id)::text = (get_current_user_workspace())::text` — 登入當下是雞生蛋（要 workspace_id 才能查、但這正是要取的）、靠函數 bootstrap 邏輯
- `employee_permission_overrides` policy：**`USING: true`（完全無過濾）** — 任何登入用戶都能讀所有人的權限 override
- `employee_route_overrides` policy：正確（自己能看自己 + service_role）— **同概念兩表強度不一、矛盾**

### 欄位一致性

| 欄位 | 三層一致？ |
|---|---|
| 帳號 | ❌ `employee_number` vs `email`、Store 無統一 |
| 密碼 | ✅ 不存 Store（設計正確） |
| 「記住我 30 天」 | ❌ UI ✓、API ✗、DB ✗、Store ✗、**Cookie ✗**（v2.0 補）|

### 安全實作（v2.0 新增）

- ✅ Admin client per-request（符合 CLAUDE.md 紅線、`src/lib/supabase/admin.ts:10-42`）
- ✅ Rate limit 覆蓋完整
- ⚠️ Rate limit RPC 失敗時 fallback in-memory、多實例各自計算、**brute force 可繞**（`src/lib/rate-limit.ts:15-39`）
- ⚠️ 錯誤訊息不統一（`'帳號或密碼錯誤'` vs `'此帳號已停用'` vs `'已鎖定'`）— **帳號枚舉攻擊面**（`validate-login/route.ts:66`）
- ⚠️ Quick-login token（8 小時）無 IP / device 綁定、竊取可重用（`quick-login-token.ts:50-115`）

### DB 層隱形邏輯（v2.0 新增）

- Trigger `trigger_auto_set_workspace_id` 在 `employees` BEFORE INSERT 自動填 `workspace_id` — 登入邊界依賴這個救場、UI 看不到
- `workspaces.setup_state` jsonb 有 `has_employees` 初始化檢查、**login API 不看這個** — 未初始化租戶可登入成功、之後操作爆炸

### 未來 SaaS 擴張（v1.2 保留）

你設計「每家公司一組 workspace、員工用自家帳密登入、一律同一套 login」、現架構支援（Corner / JINGYAO / YUFEN 三個 workspace 已跑）。唯一要想的是飯店 / 餐廳 / 遊覽車員工登入後**看到的介面不同**（登入後分流、靠權限系統、不靠 login 分支）。

---

## 建議行動（只列項目、不動手、交 council 討論）

| 項目 | 緊急度 | 來自 |
|---|---|---|
| Middleware 收緊 `/api/auth/*` 公開清單 | 🔴 高 | v2.0 |
| `sync-employee` 加 workspace owner 驗證 | 🔴 高 | v2.0 |
| WAVE_2_5：28 張表 NO FORCE RLS | 🔴 高 | v2.0（已有方案 A） |
| `employee_permission_overrides` 補租戶 policy（對齊 `employee_route_overrides`） | 🔴 高 | v2.0 |
| 刪 `checkPermission` 裡的 `if (isAdmin) return true` 短路 | 🔴 高 | v1.2 |
| 4 個後端 API 改 `hasPermission(user, action_key)` | 🔴 高 | v1.2 |
| 管理員 role 在 DB 掛所有權限（作為預設） | 🔴 高 | v1.2 |
| 定義 cookie maxAge + 三層 TTL 規範（JWT / cookie / rememberMe） | 🟡 中 | v2.0 |
| 錯誤訊息統一（防帳號枚舉） | 🟡 中 | v2.0 |
| Rate limit fail-secure（RPC 失敗拒絕、不 fallback） | 🟡 中 | v2.0 |
| 決定「記住我」定位（真做 / 改文案 / 拿掉） | 🟡 中 | v1.2 |
| `employee_number` 定位為唯一登入帳號（email 只作 Supabase Auth 內部用） | 🟡 中 | v2.0 |
| Login API 檢查 `workspaces.setup_state.has_employees`（防未初始化租戶登入） | 🟡 中 | v2.0 |
| Quick-login token 加設備綁定 | 🟢 低 | v2.0 |
| `getServerAuth()` 明確架構優先級（新 > 舊） | 🟢 低 | v2.0 |
| 登入後重驗 workspace_id 有效性 | 🟢 低 | v1.2 |
| 清掉驗證殘影 TODO / 註釋 | 🟢 低 | v1.2 |
| 統一帳號欄位名（UI / API / DB / Store） | 🟢 低 | v1.2 |

**要做任何一項、請開 `venturo-cleanup-council`**。本 skill 只產地圖、不動手。

---

## 下一個相關路由建議

1. **`/dashboard`** ⚠️ 新增優先 — 28 張 FORCE RLS 表的爆點在這頁、要驗「登入成功、首頁載入失敗」會不會發生
2. `/hr/roles` — 權限模型地雷的關鍵對照頁（原則 1 是否在代碼裡活著）
3. `/tenants/[id]` — 你說權限模型已在這做完、要驗是否真符合原則 1
4. `/public/*` — 對外 token 型登入、跟 quick-login token 同線
