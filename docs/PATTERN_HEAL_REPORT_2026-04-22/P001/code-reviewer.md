# P001 Code Reviewer 審查報告

## 身份宣告

我是 **Code Reviewer**。任務是挑 P001 修法的錯、找漏、找邊界條件、找副作用、檢查 P010 相依。**不重寫、不動代碼**。已讀 `_PATTERN_MAP.md`（P001 + P010）、`_INDEX.md`（原則 1、3）、`DB_TRUTH.md` 內 `role_tab_permissions` / `workspace_roles` 段、P010 幕僚 4 份會議紀錄、P001 精確命中點全部原始碼（auth-store.ts、hooks.ts、usePermissions.ts、4 個 API、finance/payments page.tsx、tour-itinerary-tab.tsx），以及 `20260422000000_check_and_seed_admin_roles.sql` + `workspaces/route.ts` 的 admin seeding 流程。

整體印象：**方向對、但隱藏 3 個致命漏洞、5 個該注意、若照 senior-dev 描述的最小修法會有老租戶直接白屏的風險**。

---

## 🔴 致命漏洞（上線前必擋）

### F1. Admin backfill 漏洞——老租戶可能 0 permissions，拔短路後整站白屏

**觀察**：
- `20260422000000_check_and_seed_admin_roles.sql` **只補了「系統主管職務」本身**（`workspace_roles` 有 is_admin=true 的 row）、**沒有 seed `role_tab_permissions`**（見 migration L44-52、只 INSERT workspace_roles 不 INSERT permissions）。
- `workspaces/route.ts:164-197` 新租戶走完整流程（建 系統主管職務 + 全 MODULES seed permissions）、但這條路徑**只對未來新租戶生效**。
- 歷史 workspace 若透過 2026-04-22 之前的老 API 建立（或手動建 role）、很可能**只有 workspace_role.is_admin=true、但 role_tab_permissions 空白**。登入時 validate-login:160-175 從 `role_tab_permissions` 讀 permissions、老 admin 會拿到 `permissions: []`、`isAdmin: true`。
- 現況靠 `checkPermission` 和 `canAccess`/`canEdit` 的 `if (isAdmin) return true` 短路救、**拔掉短路**後、老 admin 的 `user.permissions` 是空陣列、sidebar 所有項目過不了 `hasModulePermission` → **整個左選單空白、進每個模組都 UnauthorizedPage**。

**風險等級**：🔴 Blocker

**建議**：
1. **Migration 必須雙 seed**：補一支 migration、為所有 `is_admin=true` 的 role、對齊 MODULES 全開 `role_tab_permissions`（UPSERT 不覆蓋已存在）。
2. 在部署 P001 前、跑 `SELECT wr.id, wr.name, wr.workspace_id, COUNT(rtp.id) FROM workspace_roles wr LEFT JOIN role_tab_permissions rtp ON rtp.role_id = wr.id WHERE wr.is_admin = true GROUP BY wr.id HAVING COUNT(rtp.id) = 0;` 確認孤兒 系統主管職務 數為 0、否則中止。
3. 部署順序：**先 backfill → 再部署前端拔短路**。反過來順序直接線上爆炸。

---

### F2. UPDATE 權限不在 `module:tab` key schema 裡——後端敏感 API 會全滅

**觀察**：
- validate-login:170-175 把 `role_tab_permissions` 組成 `${module}:${tab}` 或純 `${module}`、塞進 `user.permissions`。
- 4 個後端 API 若改 `hasPermission(user, action)`、**action 要叫什麼 key**？若是 `employees.create` / `employees.reset_password` / `employees.admin_reset`——這些 key 在 MODULES (`module-tabs.ts:36`) 的 tabs 陣列**完全沒定義**、自然也不會在 `role_tab_permissions` 裡。
- 後果：**連合法 admin 都過不了 hasPermission 檢查**（因為 permissions 陣列裡根本沒這個字串）、所有 4 個 API 回 403、建員工 / 重設密碼 / 建租戶全部炸。

**風險等級**：🔴 Blocker

**建議**：
1. 設計兩條路、二選一：
   - **A. 保留 `is_admin` 語義化檢查**：後端敏感 API 改成 `if (!user.is_admin && !hasPermission(user, 'hr:manage_auth')) return 403`——admin 走第一條、沒有系統主管資格 走細分權限。這不是 bypass key、是把「系統主管 = 有高權限 tab」寫成可讀的 OR。
   - **B. 擴充 MODULES 加 `hr.manage_auth` / `hr.reset_password` 等 tab**、validate-login backfill 補資料、再完全拔掉後端的 `isAdmin` 判斷。
2. 選哪條 senior-dev 要明講、**不能默默選**（Think Before Coding 原則）。我個人建議 A、因為符合 William 的「系統主管 = 預設權限多的 role」心智模型、且不必動 MODULES 常數。

---

### F3. UPDATE policy 的 role_id 跨租戶搬移已被 P010 防住——但 P001 新的 hasPermission 邏輯在前端預設阻斷 admin 登入一秒

**觀察**（P010 依賴）：
- P010 新 RLS 靠 `EXISTS(workspace_roles.workspace_id = get_current_user_workspace())`、而 `get_current_user_workspace()` 從 **JWT claims** 讀。
- 登入流程：validate-login **用 service_role**（`getSupabaseAdminClient()`）查 role_tab_permissions、**不走 RLS**、所以 P010 新 policy 不影響登入階段的 permissions 拉取。✅
- **但登入後**前端 `useWorkspaceFeatures`（hooks.ts:60、112-114）用 user JWT 查 `/api/permissions/features`、若 user 第一次登入 `get_current_user_workspace()` 的 JWT claim 尚未 hydrate（Supabase signInWithPassword 需要一次 round-trip）、會有**< 1 秒**空窗期、fetch 回 0 筆 → `workspaceFeatures.isRouteAvailable` 全 false。
- 目前短路救：isAdmin 短路直接 return true、看不到 loading 狀態。拔掉短路後、登入完成到 feature fetch 回來這段、canAccess 全返 false、前端可能閃 UnauthorizedPage。
- **連鎖**：finance/payments page.tsx:211 已是 `if (!isAdmin) return <UnauthorizedPage />`、若改成 `if (!canAccess('finance/payments')) return <UnauthorizedPage />`、會閃一秒空頁、然後才正常。

**風險等級**：🔴 Blocker（UX 災難、不是資料洩漏，但會讓用戶覺得登入壞了）

**建議**：
1. `canAccess` / `canEdit` 必須**明確區分三態**：`loading` / `allow` / `deny`。loading 時 UI 顯示骨架屏、不是 UnauthorizedPage。
2. `workspaceFeatures.loading` 在 hooks.ts:68 有、但 `usePermissions` 沒往外暴露、canAccess 沒用它。這是 P001 修法必須補的。
3. 配合 P011（permissions_version）時更該處理、但 P011 是 🟡 排期、P001 不能等。

---

## 🟡 應該注意（會留技術債）

### N1. `permissions` key schema 已是 `:`、hasModulePermission 和 validate-login 都用 `:`、但 hooks.ts:177 的 `isTabEnabled` 用 `.`（feature 的 key）

**觀察**：
- validate-login:171 組 `${module_code}:${tab_code}` → 權限 key 用**冒號**。
- hooks.ts:7 `hasModulePermission` match 用**冒號**。
- hooks.ts:177 `isTabEnabled` 讀 `workspace_features.feature_code = ${module}.${tab}` → feature key 用**點**。
- P007 已列「兩套 key 分隔符不一致」是跨 pattern 病、P008 統一 policy 函式時要收斂。**P001 不該順便改**（Surgical Changes）、但要知道：新的 hasPermission(user, action) 如果 action 傳 `hr.manage_auth`（點）、會跟 user.permissions 裡的 `hr:manage_auth`（冒號）比對失敗、silent deny。
- senior-dev 動手時、**必須嚴格用冒號**、和 validate-login 的輸出格式一致。

**風險等級**：🟡 Suggestion

**建議**：
1. P001 修法文件明寫：**action key 全用冒號**、交給 P008 統一時再全站處理。
2. 加個 assertion 在 hasPermission 開頭：`if (action.includes('.')) console.warn('permission key should use colon')`。

---

### N2. usePermissions 的 9 個 bool——遷移後會錯殺「會計只能看、不能建」

**觀察**（usePermissions.ts:34-48）：
```ts
canViewReceipts: isAdmin || hasModulePermission(userPermissions, 'finance'),
canCreateReceipts: isAdmin || hasModulePermission(userPermissions, 'finance'),  // 同
canEditReceipts: isAdmin || hasModulePermission(userPermissions, 'finance'),    // 同
canConfirmReceipts: isAdmin || hasModulePermission(userPermissions, 'finance'), // 同
```

- 這 4 個 bool **邏輯完全相同**、全部是「有 finance 就全能」。是 isAdmin 短路掩蓋住的假區分——原本的意圖（會計可 create+confirm、業務只能 view）**根本沒實裝過**。
- 拔 isAdmin 短路後、效果等於：只要有 finance 權限就全能。跟修前行為一致、**沒有退化**。但這不是 P001 的失敗、是**揭露出 usePermissions 本身就是壞的**（P008 主病）。
- P001 應該**不動這 9 個 bool 的語義**、只拔 `isAdmin ||` 部分、交給 P008 重設計。但要記進 `_PATTERN_MAP.md` 的 P008 備忘欄：「9 個 bool 實際只有 3 個獨立語義」。

**風險等級**：🟡 Suggestion（揭露真相、不退化）

**建議**：
1. 不在 P001 範圍重設計 9 個 bool、但要**寫一行註解**說明現況。
2. 在 P008 統一 policy 函式時、拆成 `finance:view` / `finance:create` / `finance:confirm` 三個 tab-level action。

---

### N3. JWT isAdmin claim 會留下「前端 bypass key」影子

**觀察**：
- validate-login:212 回傳 `isAdmin` 給前端、auth-store.ts:127 存成 `state.isAdmin`。
- 拔掉 hooks.ts:284、hooks.ts:293、auth-store.ts:249 的 `if (isAdmin) return true` 後、前端 state.isAdmin 變成只有 UI 展示用（例如「顯示一顆紅色 admin 徽章」）、**但 store 裡還能被任何地方讀**。
- grep 結果：`isAdmin` 在 src 下有 **228 個命中點**。這些點大部分是合法 UI 顯示（/hr/missed-clock 選單隱藏沒有系統主管資格 項目、/calendar 顯示 workspace 切換）、但藏著幾個危險的：
  - `src/app/(main)/accounting/layout.tsx:13` `if (!isAdmin) return <UnauthorizedPage />` — 整個會計模組大鎖
  - `src/app/(main)/database/layout.tsx:14` 同上
  - `src/app/(main)/tools/reset-db/page.tsx:115` reset-db 整頁
  - `src/app/(main)/settings/page.tsx:48` `hasSettingsAccess = isAdmin || user?.permissions?.includes('settings')`（有 OR 邏輯、相對好）
- **不拔完就等於 P001 只修一半**。3 個 layout 整頁用 isAdmin 擋、如果不動、就還是 role-gate 偽裝、只是換個位置。

**風險等級**：🟡 Suggestion（P001 scope 擴張、但不擴會留半條根）

**建議**：
1. P001 真正要拔的是**所有前端「靠 state.isAdmin 做是否顯示整頁」的地方**、至少含上面 4 個 layout。
2. senior-dev 列命中點時、不能只列靈魂定義裡的 3 處、要全掃 `useAuthStore.*isAdmin\|\.isAdmin`。
3. JWT 本身可保留 isAdmin claim（給 UI 徽章用）、但**定義為展示訊息、不是授權依據**。寫進 CLAUDE.md 的權限紅線。

---

### N4. finance/payments 改完後、沒有系統主管資格 會看到空白 ListPageLayout

**觀察**：
- page.tsx:211 `if (!isAdmin) return <UnauthorizedPage />` 改掉後、沒有系統主管資格 會進入 ListPageLayout。
- 但 hooks.ts:34-37（usePermissions.canViewReceipts）回 false → `receipts` 載不到？要查 usePaymentData 是否用 canViewReceipts 擋 query。若**沒擋、receipts 會正常載入**（靠 RLS 擋）、那 UI 正常。若**有擋、會空白**（Empty state、不是 UnauthorizedPage）。
- 目前 UnauthorizedPage 是正確 UX、空白 list 不是。若 P001 拔掉這行、必須補：`if (!canAccess('finance/payments')) return <UnauthorizedPage />`。
- **細節**：page.tsx:211 在 columns 定義之後、**columns 裡若有用 user 相關的東西（例如 `row.created_by` 顯示邏輯）、沒有系統主管資格 進來會不會炸**？快看一下、columns 是純 row 欄位渲染、沒用 user、應該安全。

**風險等級**：🟡 Suggestion

**建議**：
1. 替換 `!isAdmin` 為 `!canAccess('finance:view')`（注意冒號、N1）、UnauthorizedPage 保留。
2. 順便 grep 有沒有其他 page.tsx 在 return 前 if isAdmin、逐頁補。

---

### N5. validate-login 的 isAdmin 依賴 workspace_roles.is_admin、但新的後端 API 若統一 hasPermission、卡 Corner 建新租戶流程

**觀察**：
- create-employee-auth:95-127 的邏輯：`isCornerAdmin = isAdmin && currentUserWorkspaceCode === 'CORNER'`、只有 Corner workspace 的 admin 能建新租戶。
- 這是**跨租戶授權**、不是一般權限。若要改 hasPermission、key 要叫什麼？`tenants:create`？但 MODULES 裡 `tenants` 模組**不存在**（module-tabs.ts:33 註解明寫「租戶管理（tenants）為 Venturo 平台管理資格內部功能、不開放給租戶職務管理」）。
- 若 hasPermission 拿不到對應 key、所有人 403、Corner 也不能建新租戶——**Venturo 平台管理資格流程斷**。

**風險等級**：🟡 Suggestion（屬於跨租戶平台管理資格授權、架構特殊）

**建議**：
1. create-employee-auth 不走一般 hasPermission、保留特殊路徑：`if (!isCornerAdmin) return 403`。這是合理的特化。
2. `reset-employee-password` / `admin-reset-password` 走一般 hasPermission、因為是單租戶內的 admin 動作。
3. 把這個邊界明確寫進 P001 修法文件：**跨租戶平台管理資格授權是獨立語義、不走 hasPermission**。

---

## 🟢 建議觀察（不擋 P001、但記錄）

### O1. P015 零測試覆蓋是 P001 的真正地雷

- `tests/e2e/` 沒有任何 permissions / admin login 之後的測試。P001 動 auth-store、hooks、usePermissions 三個核心 hook、**沒測試 = 沒安全網**。
- 建議**最低測試**：e2e 優先於 unit、寫一支 `tests/e2e/admin-login-permissions.spec.ts`、測：
  1. 老 系統主管登入後 sidebar 有項目（F1 偵測器）
  2. 沒有系統主管資格 不能看 /accounting（N3 偵測器）
  3. 沒有系統主管資格 打 `/api/auth/reset-employee-password` 回 403（F2 偵測器）
- 這一支測試完整覆蓋 P001 三個致命漏洞、**P001 部署前必寫**。

### O2. P010 依賴確認——新 RLS 不影響 P001 的登入

- validate-login 用 service_role、P010 新 policy 不生效。✅
- 登入後 `/api/permissions/check` / `/api/roles/[roleId]/tab-permissions` 用 user JWT、走 P010 新 policy。影響面：hr/roles 頁、沒有系統主管資格 看別家 role → 空結果、正確 UX。✅
- 沒看到「雞生蛋」問題。P010 已於 2026-04-22 套到線上、P001 可安全在其之後做。

### O3. `employees.supabase_user_id` 尚未同步時的 role 讀取

- auth-store.ts:260 註解「maybeSingle() 避免 RLS 返回 0 筆時拋錯」——代表 refreshUserData 有可能拿到 `data: null`、這時 permissions 保留舊值。
- 若 admin 中途被移除 role、JWT 到期前 state.isAdmin 還是 true、但 permissions 拿不到更新（refreshUserData 靜默 return）。拔短路後、這段空窗期的行為**取決於 store 裡留的 permissions**。不是新問題、P001 不負責修、但**P011 必須優先**。

---

## CARD 檢查總結

| 項 | 評語 |
|---|---|
| **C**lean | 🟡 拔 3 處短路的修改本身乾淨、但會揭露 usePermissions.ts 9 個 bool 的假區分（N2）、需要註解標記 |
| **A**uth | 🔴 F2 是 auth 大洞（4 API key 遷移沒想好）、F1 是 auth 資料洞（老 admin backfill 缺）、N5 是 auth 特化邊界（跨租戶平台管理資格） |
| **R**edundant | 🟡 N3 還有 4+ 處 layout.tsx 用 isAdmin、必須一起拔否則只修半條根 |
| **D**ependencies | 🟢 P010 ✅ 已完成、無雞生蛋；🟡 P011（JWT 時間差）P015（0 測試）是 P001 的上游債、P001 部署前該先點掉 |

---

## 部署前 5 個必過關

1. ✅ Backfill migration 跑完、`HAVING COUNT(rtp.id) = 0` 查詢回 0 row（F1）
2. ✅ 4 個後端 API 的權限 key 決策寫進文件、senior-dev 明選 A 或 B（F2）
3. ✅ `usePermissions` / `canAccess` 補 loading 三態、不在 feature fetch 中閃 UnauthorizedPage（F3）
4. ✅ 全掃 `useAuthStore.*isAdmin\|\.isAdmin` 命中點、至少 4 個 layout.tsx 全處理（N3）
5. ✅ `tests/e2e/admin-login-permissions.spec.ts` 至少 3 個 case 過（O1）

---

## 給主席的 < 200 字摘要

P001 修法方向對、但隱 3 致命漏：(F1) `20260422_check_and_seed_admin_roles` 只補 系統主管職務 不補 permissions、老 admin 拔短路後整站白屏、migration 要改雙 seed 並先部署；(F2) 4 個後端 API 的權限 key（`employees.create`/`reset_password`）MODULES 沒定義、所有人 403、建議 admin 走 `is_admin` 快速 OR、不完全拔後端 isAdmin；(F3) canAccess 沒 loading 態、feature fetch 的 1 秒空窗會閃 UnauthorizedPage。5 個應注意：N1 冒號 vs 點分隔符、N2 usePermissions 9 個 bool 假區分、N3 還有 4+ 個 layout.tsx 用 isAdmin 要一起拔、N4 finance/payments 替換後 UnauthorizedPage 保留、N5 Corner 建新租戶跨租戶平台管理資格是特化路徑。P010 ✅ 不影響登入；P001 真正的上游債是 P015 零測試、部署前必補 1 支 e2e。
