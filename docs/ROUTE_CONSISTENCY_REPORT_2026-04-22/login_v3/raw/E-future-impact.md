# Agent E — 未來影響 + 新引入副作用（v3.0 覆盤）

Route：/login
Date：2026-04-22 晚間
Scope：今晚 11 commit 引入的副作用 + SaaS 未來隱患

---

## 1. 前端拔 isAdmin 短路、影響面

### ✅ 預期內（修好了）

- `/finance/payments`（commit 8038e13f 配套）：`isAdmin` 大鎖改 `canViewFinance` — 由 role_tab_permissions + feature_enabled 雙層把守、不再靠角色短路
- `/tours` itinerary-tab（commit 8038e13f 配套）：`isAdmin` 改純 `permissions.includes('database')` — 靠 feature gate + role 比對

### ⚠️ 疑似副作用：loading 時序風險

- `src/lib/permissions/hooks.ts:285–286 / 296`：`canAccess`/`canEdit` 在 `workspaceFeatures.loading=true` 時**無條件放行**（避免 UnauthorizedPage 閃）
- **問題**：`/accounting`、`/database` layout 用 `isAdmin` 直接擋 UI、**沒走 loading 檢查 hook**
- **風險**：useWorkspaceFeatures 初始化慢時、登入後直接開 `/accounting` 會閃 UnauthorizedPage（實際有權限卻被擋）
- **緩解**：usePermissions Hook 自身有 loading 配套、但 page layout 沒吃到
- **狀態**：⚠️ 未來隱患、非當前炸點

### ✅ 預期內（行為不變）

- 沒有系統主管資格（業務/會計/助理）：原本就靠 role_tab_permissions 查、拔短路後無異
- `auth-store.checkPermission`（L246–249）：仍讀 user.permissions、短路只是拔 isAdmin 直通

---

## 2. Middleware 精確白名單、誰受影響？

### 白名單清單（src/middleware.ts）

**EXACT_PUBLIC_PATHS（~16 項）**：

- UI：`/login`、`/confirm`、`/public`、`/view`、`/game`
- API 公開：`/api/auth/validate-login`、`/api/auth/logout`、`/api/auth/sync-employee`
- 合約簽名：`/api/contracts/sign`、`/api/quotes/confirmation/customer`
- 客戶：`/api/customers/{by-line,link-line,match}`
- Health：`/api/health`

**PREFIX_PUBLIC_PATHS（~8 項）**：

- UI prefix：`/login/`、`/confirm/`、`/public/`、`/view/`、`/p/`、`/game/`
- Webhook：`/api/auth/line`、`/api/line/webhook`、`/api/meta/webhook`、`/api/linkpay/*`、`/api/cron/`
- 資源：`/api/itineraries/`、`/api/d/`、`/_next/`

### ⚠️ 敏感 API 現在被擋（預期內 defense-in-depth）

- `/api/auth/admin-reset-password`、`/api/auth/create-employee-auth`、`/api/auth/reset-employee-password`、`/api/auth/get-employee-data` — 全被 middleware 擋（需 cookie session）
- endpoint 本身還有 `getServerAuth()` 第二道把守

### ⚠️ 登入流程需注意

- `/api/auth/validate-login` 在白名單 ✅
- `/api/auth/sync-employee` 在白名單 ✅（解「session cookie 尚未就緒」雞生蛋）
- `/api/auth/get-employee-data` **不在白名單** — 登入流若有前置階段要呼叫這支、可能卡住（需 curl 實測 validate-login 後 get-employee-data 能否通）

---

## 3. DB Migration 副作用

### 20260422140000_fix_role_tab_permissions_rls

- 從 USING:true 改 5 條 tenant scoped policy
- **連鎖風險**：現有代碼若用 service_role 或跨租戶查 role_tab_permissions 的地方會變成查不到
- 已知安全：permissions/features PUT/GET 用 `requireTenantAdmin`、走 service_role policy、不受影響

### 20260422150000_backfill_admin_role_tab_permissions

- ON CONFLICT 語義：INSERT ON CONFLICT (role_id, module_code, tab_code) DO NOTHING（推測）— **需人工確認**
- **風險**：重複跑會不會覆蓋人為調整

### 20260422160000_sync_default_roles_from_corner

- ON CONFLICT DO UPDATE（以 Corner 為準）
- 保留 JINGYAO / YUFEN / TESTUX 既有額外權限（不在 Corner 裡的不刪）
- **風險**：他們客製的「更嚴格」權限可能被 Corner 的寬鬆預填**放寬**（反向）

### 20260422130000_add_amadeus_totp_to_employees

- 加 `amadeus_totp_secret` / `amadeus_totp_account_name` 欄位
- **風險**：前端誤把 secret 讀進來的漏洞 — 需確認 SELECT 是否有欄位白名單、RLS 是否已限制 secret 欄位

---

## 4. P003 加守門的連鎖反應

### requireTenantAdmin（P003-A）

- 檢查 `role_tab_permissions.settings.tenants.can_write`
- **合規性**：Corner 系統主管 在 tenants/create seed 時會自動補這個權限、合理
- **風險**：非 Corner 的新租戶系統主管 若沒這個 key、打不開自己的 feature 設定頁（需驗）

### workspaces/[id] GET（P003-H）

- 自己 workspace 直通、跨租戶才需 canManageTenants
- **登入流不卡**：login 後取自家 workspace info 走直通路徑 ✅

### sync-employee（P003-B）

- 現在要求 body.workspace_id 對齊 target employee.workspace_id
- **雞生蛋疑慮**：sync-employee 是登入後**第一次同步**、caller 理論上剛登入、body 應由 server 已驗過的 workspace 決定、不應由 client 決定
- **實測需求**：curl validate-login → 只帶 cookie（不帶 access_token）呼叫 sync-employee、確認能通

---

## 5. 未來 SaaS 擴張隱患

### 🔴 高風險

**E-1 · workspace type 無業務隔離**

- `role_tab_permissions` 無 workspace_type 欄位、全租戶共用同份範本
- 飯店 workspace 開 `/api/permissions/features` 可以改「旅行社功能」開關（只要 feature_code 存在）
- 餐廳員工若誤配 `travel_agency` 權限無系統性攔阻

**E-2 · requireTenantAdmin 未檢 workspace type**

- 假設所有租戶都是旅行社、都能互相管理彼此 features
- SaaS 多品牌進來、業務線分離需另加一層 type 檢查

**E-3 · feature_code 無 namespace**

- `itineraries`、`tours`、`quotes` 功能都假設旅行社用途
- 地接 / 飯店 / 遊覽車加入時會誤觸（無型別檢查）

---

## 總結表

| 項目                                             | 類型                                           | 嚴重度 |
| ------------------------------------------------ | ---------------------------------------------- | ------ |
| finance/payments canViewFinance                  | ✅ 預期內修好                                  | —      |
| tours itinerary permissions.includes             | ✅ 預期內修好                                  | —      |
| /accounting、/database layout 仍用 isAdmin       | ⚠️ 疑似副作用（loading 時序）                  | 🟡     |
| 4 支敏感 API middleware 擋                       | ✅ 預期內（defense in depth）                  | —      |
| `/api/auth/get-employee-data` 不在白名單         | ⚠️ 需實測登入流是否卡                          | 🟡     |
| role_tab_permissions RLS tenant scoped           | ✅ 預期內                                      | —      |
| 20260422150000 ON CONFLICT 語義                  | ❓ 需人工確認                                  | 🟡     |
| 20260422160000 反向放寬風險                      | ❓ 需人工確認（JINGYAO/YUFEN/TESTUX 客製權限） | 🟡     |
| amadeus_totp_secret 讀取漏洞                     | ❓ 需確認 SELECT 白名單                        | 🟡     |
| requireTenantAdmin 新租戶系統主管 打不開 feature | ❓ 需實測                                      | 🟡     |
| sync-employee 雞生蛋                             | ❓ 需 curl 實測                                | 🟡     |
| SaaS workspace type 無業務隔離                   | 🔴 未來隱患                                    | 🔴     |
| SaaS feature_code 無 namespace                   | 🔴 未來隱患                                    | 🔴     |

---

**結論**：今晚修法**大部分預期內**、少數「需實測」項目（sync-employee、get-employee-data、ON CONFLICT、amadeus secret）已列。SaaS 層次 workspace type 隔離是**結構性隱患**、非當前炸點、可等 Phase 2 一併處理。
