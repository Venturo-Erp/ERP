# P001 Role-gate 偽裝 — Security Engineer 會診報告

Date：2026-04-22
Reviewer：Security Engineer（security-engineer 靈魂）
對象 Pattern：P001（isAdmin 萬能通行證 → hasPermission 細緻化）
交互 Pattern：P002（middleware 公開面）/ P003（跨租戶無驗證）/ P009（feature cascade）/ P010（已修、RLS）/ P011（JWT 快照無版本）

---

## TL;DR

P001 目前的「提案修法」（移 isAdmin 短路 + 4 API 改 hasPermission + 管理員 role 預填全權限）**不是安全修復、是架構重構**。修完攻擊面**幾乎沒降**、但會新引入 **2 個 HIGH 和 1 個 CRITICAL** 風險（lockout + schema 不匹配 + 跨頁未收斂）。上線前若照目前描述直接動手、會當場把生產環境的員工管理 API 全部擊倒。必須加前置條件再動。

---

## 一、修完仍存的風險（attack surface 幾乎沒降）

### 1.1 isAdmin 三條管道全部還活著

目前 codebase 三處 `isAdmin`：

| 位置 | 來源 | 消費者 | P001 修後狀態 |
|---|---|---|---|
| JWT `is_admin` claim | `validate-login/route.ts:153-157` 查 `workspace_roles.is_admin` 簽進 JWT | 前端 auth-store、server-side `getServerAuth()` | **保留**（P001 沒移除） |
| Zustand `isAdmin` flag | `auth-store.ts:127 / 232 / 311 persist` | 整個前端 UI 判斷 | **保留**（persist 了） |
| DB `workspace_roles.is_admin` | migration `20260422000000` 每租戶種一個 | seeding + JWT 查 | **保留**（是 seeding 依據） |

**結論**：P001 只拆了 `auth-store.ts:249` 的 `if (get().isAdmin) return true` 短路 + 4 個 API 的 `if (!isAdmin)`。但 JWT 仍簽 `is_admin` 給前端、前端仍 persist、DB 仍有 `is_admin: true` 的 role。**後門管道 3 條仍在**、未來任何工程師一句 `if (user.is_admin)` 就復辟整個 P001。

**嚴重度**：MEDIUM — 現在沒人用不代表以後沒人用；等同沒改、只是現在沒在用。

**建議**：要嘛真移除（workspace_roles.is_admin 欄位 drop、JWT claim 拿掉、store 拔掉）、要嘛明文 deprecate 並加 lint rule 禁止新增 reference。**不做會回流**。

### 1.2 降級攻擊面未變（CRITICAL 等級的認知陷阱）

- **修前**：攻擊者拿到 admin JWT = 完全控制一個 workspace
- **修後**：攻擊者拿到 admin JWT = 管理員 role → 預填全權限 → 仍完全控制一個 workspace

**P001 沒有降低 blast radius、只換了內部決策路徑**。這是 refactor、不是 mitigation。如果團隊以為「改了就變安全」而放鬆其他防線（例如 2FA 延後、JWT TTL 不縮）、就是被自己騙。

**真正降低攻擊面需要（不在 P001 scope、但必須寫入 roadmap）**：
1. 敏感動作（建員工、重設密碼、改 role）強制 **step-up authentication**（重新輸密碼或 TOTP）
2. Admin JWT **TTL 縮短至 15 分鐘**（目前 1 小時、配 refresh token）
3. 敏感 API 加 **audit log with tamper-evident storage**（WORM / append-only）
4. 最終 **WebAuthn / passkey** 取代純密碼

### 1.3 P002 / P003 完全沒動

- sync-employee 跨租戶綁帳號（P003）：P001 不會改善、因為那支 API 用的是 `access_token.sub === body.supabase_user_id` 檢查、跟 isAdmin 無關。要 P003 獨立修。
- middleware `/api/auth/*` 全公開（P002）：P001 修的 4 個 API 仍然走 middleware、middleware 放行 → P001 加的 hasPermission 檢查在 endpoint 內、**defense in depth 只剩一層**。P002 不先修、P001 的 hasPermission 等於裸奔。
- `employee_permission_overrides` RLS `USING: true`（P022 遺留）：如果未來 policy 函式會讀 overrides、這張表可被跨租戶讀取、形成**另一條繞 P001 的管道**。

**嚴重度**：HIGH — P001 和 P002/P003 不是獨立問題、是同一條鏈。只修 P001 會讓人以為權限模型安全了、但實際上門是敞開的。

---

## 二、修完新引入的風險（可能比現況更糟）

### 2.1 🔴 CRITICAL：permission key schema 根本不匹配

**盤點發現**：`role_tab_permissions` 實際 schema 是 `(module_code, tab_code, can_read, can_write)` — **tab 級 CRUD**、不是 action 級 permission。

| 任務要求的 key | 實際 DB 能表達的 | 匹配？ |
|---|---|---|
| `employees.create` | `('hr', 'employees', can_write=true)` | ❌ 概念對不上 |
| `employees.reset_password` | 無法在現行 schema 表達 | ❌ 必須 schema 變更 |
| `employees.admin_reset` | 無法在現行 schema 表達 | ❌ 必須 schema 變更 |

**如果直接套用 `hasPermission(user, 'employees.reset_password')`**：
- 查 role_tab_permissions 永遠查不到這個 key
- **所有用戶（含 admin）都無法重設密碼**
- /login 流程在「忘記密碼」就死、admin 也救不了

**嚴重度**：CRITICAL（production outage 級）

**修正建議**：
1. **Option A（推薦）**：P001 先只做 tab 級 — `hasPermission(user, 'hr', 'employees', 'write')` 作為四個 API 的門檻、延後 action 級到 P008（policy 函式統一入口）時一併處理
2. **Option B**：擴張 schema 加 `role_action_permissions(role_id, module_code, action_key, allowed)`；seeding 預填 admin role 全部 action；但這大幅超出 P001 scope
3. **絕對不可**：硬上 action key 而沒 migration 預填 — 會立刻鎖死生產

### 2.2 🔴 HIGH：migration 順序錯 → lockout window

即使走 Option A（tab 級）、如果執行順序不對：

```
危險順序：
  ① 部署代碼（移 isAdmin 短路）→ admin 還沒拿到新 role_tab_permissions
  ② 生產 admin 立刻全部 403
  ③ 手忙腳亂
```

**正確順序（必須）**：
1. **先** migration：確保每個 admin role 在 `role_tab_permissions` 有對應 `(hr, employees, can_read=true, can_write=true)` 等全套 row。寫一個 idempotent SQL：對每個 `workspace_roles.is_admin=true` 的 role、INSERT ON CONFLICT DO NOTHING 全部 MODULES / tabs。
2. **再** 部署代碼（移 isAdmin 短路）
3. **回滾計劃**：migration 要有 `down.sql`、代碼要有 feature flag 可即時切回 isAdmin 短路（安全網）

**守門測試**：e2e 必須覆蓋「admin 用戶登入 → 進入 hr/employees → 點新增 → 成功」。沒這支 e2e、不准 merge。

### 2.3 🟡 MEDIUM：跨租戶污染（trigger + seeding）

- P001 修法要求「管理員 role 預填全權限」。如果走 DB trigger（例如 AFTER INSERT on workspace_roles）、必須 `SECURITY INVOKER` + 內部過濾 `workspace_id`、否則 admin role 建立 trigger 可能被利用污染別 workspace 的 role_tab_permissions。
- P010 已修 role_tab_permissions RLS（service_role + 同 workspace）、但**不守 trigger**（trigger 內 DML 不走 RLS 檢查）。
- P009（feature cascade trigger）未修、跟 P001 預填衝突：admin role 預填全部 tab permission → feature 關掉某模組 → role_tab_permissions 資料還在 → 下次 feature 重開、admin 自動有權（可能是 desired、但要 William 拍板）。

**建議**：P001 的 seeding 邏輯用 **application-layer function**（在 `/api/workspaces/create` 裡呼叫）、**不寫 DB trigger**。原因：
- trigger 繞 RLS、跨租戶風險大
- application-layer 可寫 unit test
- P007 已經計劃建 `module_registry` 當 SSOT、seeding 應該走那條路

### 2.4 🟡 MEDIUM：P011 JWT 時間差（P001 修完後變嚴重）

**目前**：admin 一刀過、前端 JWT 的 `is_admin` 跟後端一致、沒有「前後端不同步」問題。

**P001 修後**：前端讀 JWT 裡的 `user.permissions` 快照、後端即時查 DB。**改 role 權限後 1 小時**（JWT TTL）：
- 前端 UI 仍顯示舊的「可以按」按鈕
- 後端拒絕執行
- 用戶體驗：「按了沒反應」、容易誤以為是 bug

**對 admin 降權場景**（業務要求：admin 被降成 OP）：
- 1 小時內 admin 在前端仍看到「建員工」按鈕、點了才發現被擋
- 這 1 小時內 admin JWT 若被竊（P001 之前提過攻擊面沒降）、攻擊者**仍可用舊 JWT 執行部分動作**（因為有些動作可能只走前端檢查）

**建議**：P011 **必須跟 P001 同時發**、不能延後。`permissions_version` claim 加上 + role 改權限時 bump + auth-sync 比對不一致強制 refresh。

### 2.5 🟡 MEDIUM：permission key seeding 分散（與 P007 衝突）

P001 如果自己在 4 API 硬 code permission key（例如 `'hr.employees.write'`）、migration 也用這個 key 預填、**但 P007 規劃中的 `module_registry` 還沒做**、會發生：
- key 在代碼、role_tab_permissions、features.ts、module-tabs.ts 四處又多一份
- 跟 P007/P008/P009 的「收斂到 SSOT」方向衝突

**建議**：P001 的 4 個 permission key **必須等 P007 層 1（module_registry 表）建好再套用**、不然會製造更多 tech debt。

---

## 三、上線前必驗（e2e / 手測清單）

### 3.1 必跑 e2e（建議寫進 `tests/e2e/`）

1. **admin 回歸測試**（CRITICAL）
   - admin 登入 → 進 `/hr/employees` → 新增員工成功
   - admin 登入 → 進 `/finance/payments` → 建收款單成功
   - admin 登入 → 進 `/hr/roles` → 改某 role 權限成功
   - **判定**：改前改後行為一致、不得回歸
2. **非 admin 正向測試**（HIGH）
   - 建一個「會計」role、賦予 `(finance, payments, can_read, can_write)`
   - 該 role 員工登入 → 進 /finance/payments → 建收款成功
   - 該 role 員工 → 進 /hr/employees → 403
3. **非 admin 反向測試**（HIGH）
   - 「OP」role 只有 `(hr, employees, can_read=true, can_write=false)`
   - 直接 POST `/api/auth/employees/create-employee-auth` → 應 403
   - （不能靠 UI 隱藏按鈕、要直接打 API）
4. **lockout 防禦**（CRITICAL）
   - 部署新 migration 後、**全租戶至少 1 個 admin 能正常操作**（查 `SELECT COUNT(*) FROM workspace_roles WHERE is_admin=true GROUP BY workspace_id HAVING COUNT(*) < 1` 應為 0 rows）
   - 若有租戶沒 admin、部署擋住
5. **JWT 延遲測試**（MEDIUM、P011 配套）
   - admin A 改 admin B 的 role 從 admin 降成 OP
   - B 用舊 JWT（未 refresh）打 `/api/auth/employees/create-employee-auth`
   - **應 403**（如果 P011 沒修、會 200、是 bug）

### 3.2 必手測

1. **生產資料 smoke test**（在 staging）：每個租戶至少一個 admin、登入 + 執行「建員工 / 重設密碼 / 改 role」三動作、全綠才部署
2. **rollback 演練**：migration + 代碼能在 5 分鐘內回退、不留髒資料
3. **audit log 確認**：所有 permission-gated API 的成功 / 失敗呼叫寫入 log、含 actor_id / target / action / result

### 3.3 不得上線的 red flag

- [ ] migration 沒有 idempotent / 沒 down.sql
- [ ] 任一 admin 帳號在 staging 測失敗
- [ ] P011 沒同時修（JWT 時間差是展示 / 執行不一致的幫兇）
- [ ] P002 沒同時修（middleware 仍放行 /api/auth/\*、P001 的檢查等於只有一層）
- [ ] 沒有 feature flag 可快速 rollback 到 isAdmin 短路
- [ ] permission key 格式沒跟 P007 `module_registry` 規劃對齊（或 P007 未排入）

---

## 主席請特別留意

1. **P001 提案的 `employees.create` 這類 action key 在現行 DB schema 完全無法表達** — 照抄會 production outage。必須先改成 tab 級（`(hr, employees, write)`）、或等 schema 擴張
2. **P001 沒降低攻擊面** — 不要跟 William 宣稱「修完更安全」、要講「修完符合你的業務語意、安全性要靠 P002/P003/step-up auth 另外加」
3. **修 P001 不能不修 P011**（JWT version）、否則 1 小時時間差會放大問題
4. **seeding 走 application-layer 不走 DB trigger**、避免跨租戶污染
5. **建議改順序**：P002（middleware 收緊）→ P015（補 unit test）→ P010 ✅ → **P011（JWT version）→ P001（tab 級先做）** → P007 → P008 → P009 → P001 Phase 2（action 級細分）

---

_by Security Engineer · 2026-04-22_
