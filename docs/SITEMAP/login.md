# /login — 網站地圖

Route：`/login`
Code paths：
- UI：`src/app/(main)/login/page.tsx`
- API：`src/app/api/auth/*`（9 endpoint）、`src/app/api/permissions/features/route.ts`、`src/app/api/workspaces/[id]/route.ts`
- Middleware：`src/middleware.ts`
- Helpers：`src/lib/supabase/admin.ts`、`src/lib/auth/*`、`src/lib/rate-limit.ts`、`src/lib/permissions/*`
- Stores / Hooks：`src/stores/auth-store.ts`、`src/hooks/usePermissions.ts`、`src/lib/permissions/hooks.ts`
- e2e：`tests/e2e/admin-login-permissions.spec.ts`、`tests/e2e/login-api.spec.ts`

Last updated：2026-04-22（**v3.0 覆盤**、今晚 11 commit 大修後）

Raw reports：
- v1.2（2026-04-21）：`docs/ROUTE_CONSISTENCY_REPORT_2026-04-21/login_raw/`（Agent A–E）
- v2.0（2026-04-22）：`docs/ROUTE_CONSISTENCY_REPORT_2026-04-22/login/raw/`
- **v3.0（2026-04-22 晚間）**：`docs/ROUTE_CONSISTENCY_REPORT_2026-04-22/login_v3/raw/`（Agent A–F）

---

## 業務目的（William 口述、沿用 v2.0）

- **現在**：員工登入系統
- **未來**：SaaS 多廠商（旅遊業 Agent / 地接 Loco / 遊覽車 / 飯店 / 餐廳）
- **登入方式**：每家公司一組 workspace code、員工用該公司代號 + 自家帳密登入、不分角色類型
- **權限設計**：權限長在人身上、不是頭銜上。管理員 = 預設權限多、不是萬能通行證
- **使用情境**：第一次登入、忘記密碼
- **不會有**：工作空間切換

---

## 對照的跨路由設計原則

- **原則 1**：權限長在人身上、不是頭銜上 → **今晚拔短路已修** ✅
- **原則 2**：職務是身份卡、全系統統一 → 本頁不直接涉及
- **原則 3**：租戶一致性每層都守 → **今晚三層補齊** ✅（見警惕項）

---

## 代碼現況（v3.0 更新）

- **UI**：公司代號 + 帳號 + 密碼 + 「記住我 30 天」checkbox（**仍是假功能、無後端邏輯**）+ 登入按鈕
- **提交流程**：POST `/api/auth/validate-login` → Supabase Auth 密碼驗證 → 同步身份（sync-employee 新加跨租戶守門）→ 存 Zustand store → 重導
- **API 家族**：9 個 `/api/auth/*` endpoint（其中 4 支今晚加跨租戶守門）+ `/api/permissions/features`（今晚加 `requireTenantAdmin`）+ `/api/workspaces/[id]`（今晚加「自己直通、跨租戶需租戶管理」）
- **Middleware**：今晚從「`/api/auth/*` 整組公開」改「EXACT_PUBLIC_PATHS 精確白名單 + PREFIX_PUBLIC_PATHS」、4 支敏感 auth API 不再裸奔
- **前端權限**：`auth-store.ts:249` / `permissions/hooks.ts:284/293` / `usePermissions.ts` 九 bool 今晚全部拔 isAdmin 短路、改走 role_tab_permissions
- **Backfill migration**（20260422150000 + 160000）：admin role 預填所有 MODULES×tabs、其他 3 家 workspace 的業務/會計/助理從 Corner 同步
- **Session**：Supabase JWT 1 小時；rememberMe 仍未接；cookie maxAge 未定義
- **Rate limit**：validate-login 10 req/min、change-password 5 req/min

---

## 真正該警惕的問題

### ✅ v2.0 四紅色警告、今晚已修

| ID | 原問題 | 修法 | 狀態 |
|---|---|---|---|
| P001 | 權限模型違背（admin 萬能通行證、前後端皆是）| 前端拔短路 + admin role 補齊 role_tab_permissions | ✅ |
| P002 | Middleware `/api/auth/*` 整組公開 | 改精確白名單（EXACT + PREFIX）| ✅ |
| P003-B | sync-employee 可跨租戶綁帳號 | 查目標 employee workspace、body 對齊、拒覆蓋已綁 | ✅ |
| P004 | 28 張 FORCE RLS + service_role 衝突 | Wave 2.5 全部 NO FORCE（pg_class 驗 0 張）| ✅ |

**其他今晚補充修的**：
- P003-A: `/api/permissions/features` PUT/GET 加 `requireTenantAdmin`
- P003-C: `reset-employee-password` 驗 employee.workspace_id === auth.data.workspaceId
- P003-D: `admin-reset-password` 從 employees 反查 target workspace、對齊 caller
- P003-E: `create-employee-auth` existing-tenant 分支驗 workspace_code 對齊
- P003-F: tours accept/reject 加 tour/request 錯配守門
- P003-G: writePricingToCore UPDATE 加 workspace_id filter
- P003-H: GET `/api/workspaces/[id]` 跨租戶需「租戶管理」權限
- P003-I: get-employee-data 驗 body workspace code 對齊 caller
- P010: role_tab_permissions RLS 從 USING:true 改 tenant scoped（migration 20260422140000）

---

### 🔴 v3.0 覆盤新挖到的紅色（v2.0 漏抓、今晚未修）

#### 1. `workspaces_delete` policy = `USING: true`（🆘 嚴重）
- **條文**：DELETE policy 無任何條件、任何登入用戶可 DELETE 任一 workspace row
- **級聯後果**：workspace_roles / employees / tour_* / orders / receipts 會全部 CASCADE 刪
- **為什麼 v2.0 沒抓到**：v2.0 Agent F 列了 workspaces SELECT/UPDATE 都對、沒細看 DELETE
- **修法**（1 行 SQL）：`ALTER POLICY workspaces_delete USING (id = get_current_user_workspace() AND is_super_admin())`

#### 2. `_migrations` 表 RLS 沒開（🆘 架構洩漏）
- **現狀**：RLS disabled、任何登入用戶可讀所有 migration SQL 內容
- **威脅**：攻擊者可查出整套 DB 架構 + 歷次漏洞修補路徑
- **修法**：開 RLS、policy 限 service_role only

#### 3. `rate_limits` 表 RLS 沒開（🆘 登入側洩漏）
- **現狀**：login 用的 rate limit 表無保護
- **威脅**：可讀其他用戶 rate limit 狀態、推測登入模式
- **修法**：開 RLS、policy 走 service_role（`check_rate_limit` function 是 SECURITY DEFINER、不受影響）

---

### 🔴 v2.0 點名、今晚未修（仍存在）

#### 4. `employee_permission_overrides` 無 workspace_id + 4 條 policy 全 USING:true
- **現狀**：任一登入用戶可讀寫任一 workspace 員工的權限覆蓋記錄
- **對照組**：`employee_route_overrides` 有正確 policy（自己看自己 + service_role）
- **修法**（中等）：加 workspace_id 欄位 + FK → workspaces CASCADE、policy 參照 route_overrides

---

### 🟡 v2.0 遺留、今晚未修

#### 5. 「保持 30 天」仍是假功能
- UI ✓、auth-store.ts:67 傳 rememberMe ✓、validate-login/route.ts 完全無處理 ❌
- Cookie maxAge 仍未定義、JWT TTL 仍 1 小時

#### 6. `getServerAuth()` `.or()` 混淆
- `src/lib/auth/server-auth.ts:79–83` 仍用 `.or(id.eq.X, supabase_user_id.eq.X).limit(1)`
- P003 各 API 有二次驗收兜回、實際風險降低
- 根本問題未解：混查順序不保證

---

### 🟡 v3.0 結構性發現（未來隱患）

#### 7. P003 九支 API 寫法 5 variant（無共用 helper）
- 每支各寫 `checkIsAdmin()` + 跨租戶守門邏輯
- 某支有 bug、其他支漏抓的風險
- pattern map 原計劃「寫成通用 middleware withWorkspaceCheck()」今晚未做

#### 8. employees 三套權限系統並存（permissions / roles / role_id）
- Login API 只讀 role_id、新架構
- UI（HR 頁）可能仍讀 permissions / roles 舊欄位
- 改 schema 難察覺下游

#### 9. SaaS workspace type 無業務隔離
- `role_tab_permissions` / feature_code 無 workspace_type namespace
- 飯店 / 餐廳 / 地接進來時、跟旅行社共用同一套 feature 清單
- 當前單租戶類型（全 travel_agency）不炸、SaaS 多品牌時是結構性隱患

#### 10. `/accounting`、`/database` layout 仍直接用 isAdmin
- usePermissions hook 的 loading 配套不適用於 page layout
- 初始化慢時可能閃 UnauthorizedPage（非當前炸點、時序邊界 case）

---

### ❓ 需人工實測（無法靜態判斷）

- **sync-employee 雞生蛋**：登入完尚無 cookie session、這支 P003-B 修法要求 body workspace 對齊、curl 實測 validate-login → sync-employee 流程是否通
- **get-employee-data 不在 middleware 白名單**：登入前置階段若要呼叫這支會被擋、需確認流程是否走這支
- **migration 20260422150000 ON CONFLICT 語義**：是 DO NOTHING 還是 DO UPDATE？重跑會不會覆蓋人為調整
- **migration 20260422160000 反向放寬風險**：JINGYAO/YUFEN/TESTUX 客製「更嚴格」權限有沒有被 Corner 寬鬆預填放寬
- **amadeus_totp_secret 讀取**：確認所有前端 SELECT employees 不用 `*`、用明確欄位清單
- **非 admin 跨路由視野**：JINGYAO 業務登入 /tours 能看到所有該看的 tab？role_tab_permissions 74 row 是否真的覆蓋所有路由需要的 tab key？

---

## 其他觀察（v3.0）

### DB 層（對照 DB_TRUTH 2026-04-22 16:07）
- RLS FORCE：**0 張**（P004 Wave 2.5 驗證通過）✅
- workspaces trigger：2 條 AFTER INSERT（finance/todo 初始化）無 error handling、新租戶建若 trigger 失敗會 rollback 整個 INSERT（🟡 未發生但設計脆弱）
- workspaces.setup_state 登入階段仍未讀（v2.0 點名、未修）
- employees.supabase_user_id 無 FK（外部 schema 限制、純應用層假設）

### 欄位一致性
- 帳號（employee_number / email / username）三層對齊 ✅
- workspace_code UI/API/DB 對齊 ✅
- rememberMe UI/API/DB/Cookie **四層不對齊** ❌

### 安全實作
- ✅ Admin client per-request（符合 CLAUDE.md 紅線）
- ✅ Rate limit 覆蓋完整
- ⚠️ Rate limit RPC 失敗 fallback in-memory、多實例可繞（v2.0 遺留）
- ⚠️ 錯誤訊息不統一（帳號枚舉攻擊面、v2.0 遺留）
- ⚠️ Quick-login token 無 IP/device 綁定（v2.0 遺留）

---

## 建議行動（列項、不動手、交 council）

### 🔴 可今晚加的 P0（單行 SQL 級別）
| 項目 | 來自 |
|---|---|
| `workspaces_delete` policy 加 `USING: (id = get_current_user_workspace())` | v3.0 F-1 |
| `_migrations` 開 RLS + policy 限 service_role | v3.0 F-9 |
| `rate_limits` 開 RLS + policy service_role | v3.0 F-10 |

### 🔴 本週 P1
| 項目 | 來自 |
|---|---|
| `employee_permission_overrides` 加 workspace_id + 改 policy（參照 employee_route_overrides）| v2.0 遺留、v3.0 F-2 |
| amadeus_totp_secret 所有 SELECT 加欄位白名單（不用 `*`）| v3.0 新欄 |
| P003 九支 API 共用 helper `withWorkspaceCheck()` 抽出 | v3.0 結構性 |

### 🟡 下週 P2
| 項目 | 來自 |
|---|---|
| `validate-login` 補讀 workspaces.setup_state / premium_enabled / enabled_tour_categories / max_employees | v2.0 遺留 |
| workspaces AFTER INSERT trigger 加 exception handler | v3.0 F-4 |
| 決定「記住我」定位（真做 / 改文案 / 拿掉）| v1.2 遺留 |
| Cookie maxAge 定義 + 三層 TTL 規範 | v2.0 遺留 |
| 錯誤訊息統一（防帳號枚舉）| v2.0 遺留 |
| `getServerAuth()` `.or()` 改明確優先級（id 優先、找不到才 supabase_user_id）| v2.0 遺留 |

### 🟢 P3
| 項目 | 來自 |
|---|---|
| 清除 employees.permissions / roles 舊欄位（cleanup-council 任務）| v3.0 F-5 |
| Quick-login token 加設備綁定 | v2.0 遺留 |
| 非 admin 跨路由視野矩陣驗證（4 職務 × 關鍵路由）| v3.0 回歸驗證 |
| SaaS workspace type 業務隔離設計 | v3.0 未來隱患 |

---

## 下一個相關路由建議

1. **`/dashboard`** — /login 驗證發現 28 張 FORCE RLS 表已全關、但 dashboard widget 調用的 API（workspaces/[id] 等）今晚加守門、需驗 Corner admin 登入後 widget 正常載入
2. **`/tenants`**（租戶管理）— 本頁今晚 e2e smoke 過、但 requireTenantAdmin 邏輯需驗新租戶 admin 第一次進能否打開 feature 設定
3. **`/hr/roles`** — 權限模型本體、v2.0 已驗（有 isAdmin 短路地雷）、今晚拔短路後要覆盤
4. **`/finance/payments`** — v2.0 已驗、新原則 4（狀態是真相、數字從狀態算）未修、跟 /login P001 同病配套修

由 William 指。
