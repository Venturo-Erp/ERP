# Venturo Pattern Map — 病症修復地圖

Last updated：2026-04-22（v1.6 detector 對帳：P001 / P022 真實已綠、地圖同步）
Schema version：1.1（加 `detector` 欄位 + `npm run check:patterns` baseline）

Status summary：🔵 12 發現 / 🟡 0 計畫 / 🟠 **1 部分（P019）** / 🟢 **9 完成（P001 / P002 / P003 / P004 / P010 / P016 / P017 / P018 / P022）** / ⚫ 0 廢棄

---

## 🔍 自動 Detector — 讓「忘」不會再發生

每個有 detector 的 pattern 都加了 `detector` 欄位、寫成 grep / SQL 命令。**整批跑**：
```bash
npm run check:patterns          # 跑全部 8 個
npm run check:patterns P001 P020  # 只跑指定
```

退出碼：0 = 全 pass、1 = 有 fail（CI 可擋 PR）。

| Detector | Pattern | 失敗條件 | 修法 |
|---|---|---|---|
| P001 | isAdmin 短路 | grep 全站 `if (!?isAdmin)` 任何 hook 短路或 layout/page 大鎖 > 0 | 拔短路 / 改 hasPermission |
| P004 | FORCE RLS 紅線 | `pg_class WHERE relforcerowsecurity=true` > 0 | NO FORCE |
| P016 | workspaces policy | workspaces 表任一 policy `qual='true'` 或 `with_check='true'` | 改 service_role / workspace_id |
| P017 | 系統表 RLS | `_migrations` / `rate_limits` / `ref_cities` 任一 RLS 沒開 | ENABLE RLS |
| P018 | overrides USING:true | employee_permission_overrides 任一 policy USING:true | 加 workspace_id + 重寫 policy |
| P020 | 多 policy 重疊 | ALL policy 不含 service_role/is_super_admin/workspace_id/employee_id 但同表有 cmd-specific | DROP 該 ALL policy |
| P022 | API 雙層裸奔 | permission-overrides route.ts 沒 getServerAuth/requireTenantAdmin/checkIsAdmin | 加守門 |
| API_UNGUARDED | 無守門 API 清單 | informational only | 人工 review |

**Baseline 建立日**：2026-04-22 深夜（4 紅 4 綠：P001/P018/P020/P022 fail；P004/P016/P017/API informational pass）

---
本次更新：**2026-04-22 深夜 v1.3（/login + /hr + /tours + /finance/payments 4 路由並行重驗）**。
- **P001 從 🟢 → 🟠 部分**：4 路由重驗親查代碼發現 `useTabPermissions.tsx` 4 處 + `sidebar.tsx:596` + `useChannelSidebar.ts:17` 共 **6 處 isAdmin 短路** PR-1a 沒涵蓋（PR-1a scope 是 `auth-store.ts:249` / `permissions/hooks.ts:284,293` / `usePermissions.ts` 9 bool、那 3 處確實已修）
- **新 P020**：`tour_members` ALL `auth.role()='authenticated'` policy 與 cmd-specific 4 條 workspace EXISTS 並存、PostgreSQL RLS 多 policy 是 OR、effective 結果是「任何登入者可讀寫該表」、cmd-specific 形同虛設
- **新 P021**：`tour_destinations` / `tour_leaders` 兩張無 workspace_id 欄、4 條 policy 全 USING:true（讀寫刪都放）、屬於 P019 ❓「公版 vs 租戶」待拍板家族但比 ref_* 嚴重（ref_* 至少寫入 admin only）
- **P019 名單修正**（重驗親查 DB 實證）：`workspace_roles` ✅ 全 4 條 workspace_id filter（不在紅 45 張）/ `workspace_job_roles` ✅ 4 條 employees JOIN tenant scoped（不是孤兒、是 tenant scoped、僅前端代碼遷出沒人用）/ `tour_role_assignments` ✅ 4 條 EXISTS workspace（不在紅 45 張）
- **finance/payments DB 層全綠**：receipts / linkpay_logs / payment_methods / payment_requests / orders 4 條 policy 都有 workspace_id filter（不在 P019 紅 45 張）
- **payment_method_id 之謎結案**：DB 真相 `is_nullable=YES`、FK SET NULL（不是 NOT NULL）— sitemap 文字錯了
- **/login agent 兩處錯報**已親查更正：(1) `useTabPermissions` 4 處短路說「已拔」實際還在；(2) `admin-reset-password` route 說「已廢」實際 117 行活 route
**2026-04-22 白天**：
- P001 升 🟢（tenants/create seed e2e 驗收：TESTAUTH → Playwright 登入 → POST /api/tenants/create → TESTSEED、4 職務 row 74/40/26/32 全對齊 Corner）
- P002 升 🟢（middleware 前門從 prefix 放行改精確白名單、5 支敏感 auth API 不再裸奔、e2e 4 家 workspace 守門過）
- P003 升 🟢（9 支子彈全清：A-G + 覆盤 sub-agent 補抓 H `GET workspaces/[id]` + I `get-employee-data`；recalculateReceiptStats + linkpay webhook 評估後 RLS/簽章已充分）
- P004 升 🟢（Wave 2.5 其實 04-21 就做掉了、pg_class 查 0 張 FORCE RLS、今天只是補文件狀態）

---

## 嚴重度分布

| 級別 | 🔴 上線前必改 | 🟡 上線後短期 | 🟢 長期架構 |
|---|---|---|---|
| 數量 | 5（**P010 已修完**） | 5 | 4 |

---

## 對照的 Venturo 設計原則（從 `_INDEX.md`）

1. 權限長在人身上、不是頭銜上
2. 職務是身份卡、全系統統一識別
3. 租戶一致性必須每層都守（Middleware + API + DB RLS）
4. 狀態是真相、數字從狀態算出來（聚合即時算、不存冗餘欄位）
5-8. 候選：一 row 走到底 / 聚合 vs 明細 / 資源獨立生命週期 / 快速入口 ≠ 獨立資料

**本次幕僚推薦候選 9、10**（待升格）：
- 候選 9：跨存儲語義實體必須有雙向一致性測試（本次 + /finance/payments 共同命中）
- 候選 10：權限檢查只需一層業務邏輯、展示層只照映射（原則 1 的延伸）

---

## 🔴 上線前必改

### P001 — Role-gate 偽裝（isAdmin 大鎖）

| 欄位 | 值 |
|---|---|
| ID | P001 |
| 對應原則 | 1 |
| 業務翻譯 | 你想「權限長在人身上」、代碼都用 isAdmin 當萬能通行證繞掉細緻權限 |
| 命中（Phase A 已修 ✅） | /login auth-store.ts:249、/lib/permissions/hooks.ts:284/293 canAccess/canEdit、/hooks/usePermissions.ts:34-48 九個 bool |
| 命中（待 PR-1c） | /finance/payments page.tsx:211 整頁大鎖、/tours tour-itinerary-tab.tsx:80 canEditDatabase |
| 命中（延 P001-B / P008） | 4 支敏感 API（validate-login 簽 JWT OK、create-employee-auth / reset-employee-password / admin-reset-password 仍用 `if(!isAdmin)`）、accept/reject API、/tenants/[id]、/finance/* 與 /accounting/* 其餘頁 |
| 統一修法（Phase A 已落地） | ① SQL migration 回填所有 is_admin=true role 的 54+ role_tab_permissions row（can_read/write=true）② 前端 3 處 `if (isAdmin) return true` 移除 ③ canAccess/canEdit 加 loading 放行（code-reviewer F3 對策） |
| 估時 | ~~2 人週~~ Phase A ~1 小時（PR-1a/1b/1c）；2026-04-22 重驗發現需追加 PR-1d 涵蓋 11 處 hook 短路 + 8 處 layout/page 大鎖 |
| 優先級 | 🔴 上線前必改 |
| 狀態 | 🟢 **完成**（2026-04-22 v1.6 detector 對帳）：detector 跑出 0 處 hook 短路 + 0 處 layout 大鎖、PR-1d 已涵蓋全 17 處；P001-B 4 敏感 API 延 P008 但 middleware 已擋（P002）攻擊面已降 |
| **detector** | `npm run check:patterns P001` — pass = 0 處 hook 短路 + 0 處 layout 大鎖（API 合法守門 `if (!isAdmin) return errorResponse` 不算）|
| 首次發現 | 2026-04-22 |
| 最後更新 | 2026-04-22（v1.6 detector 對帳：地圖原寫 🟠 部分、實際 detector 跑出 0 處、升 🟢）|

**重驗追加紀錄（2026-04-22 深夜 v1.3 → v1.4 強迫症深掘）**：
- v1.3 親查 `grep -rn "if (isAdmin) return true"` src/ 找到 6 處
- **v1.4 強迫症深掘 `grep -rn "if (isAdmin)" src/` 共 17 處 isAdmin 短路**（不是 6 處）：

| 類別 | 檔案 | 位置 | 業務影響 |
|---|---|---|---|
| **整 layout 大鎖** | `src/app/(main)/accounting/layout.tsx` | L13 | 會計 / 業務 / 助理進不了會計家族任何頁 |
| | `src/app/(main)/database/layout.tsx` | L14 | 進不了資料庫家族任何頁 |
| **整頁大鎖** | `src/app/(main)/finance/settings/page.tsx` | L433 | 進不了 finance/settings |
| | `src/app/(main)/finance/requests/page.tsx` | L63 | 進不了請款管理（OP 業務本來該用）|
| | `src/app/(main)/finance/travel-invoice/page.tsx` | L49 | 進不了旅遊發票 |
| | `src/app/(main)/finance/treasury/page.tsx` | L135 | 進不了金庫管理 |
| | `src/app/(main)/finance/reports/page.tsx` | L96 | 進不了財務報表 |
| **權限 hook 短路** | `src/lib/permissions/useTabPermissions.tsx` | L80, 97, 113, 122 | 4 個權限檢查函式 admin 跳過細權限 |
| | `src/lib/permissions/index.ts` | L114 | 共用 lib 的 isAdmin 短路 |
| | `src/components/guards/ModuleGuard.tsx` | L49 | 模組守衛短路 |
| **UI 顯示層短路** | `src/components/layout/sidebar.tsx` | L522, 565, 596 | sidebar 三處 isAdmin 短路 |
| | `src/components/layout/mobile-sidebar.tsx` | L260 | 行動版 sidebar |
| | `src/components/workspace/channel-sidebar/useChannelSidebar.ts` | L17 | channel sidebar |
| | `src/app/(main)/settings/components/WorkspaceSwitcher.tsx` | L16 | workspace 切換器 |

- **PR-1a 已修確認 ✅**（grep 親驗 0 處）：`auth-store.ts:249` / `permissions/hooks.ts:284,293` / `usePermissions.ts` 9 個 bool
- **PR-1c 已修確認 ✅**：`/finance/payments/page.tsx:213` 改 canViewFinance（但 finance 其餘 5 個子頁沒一起改 — finance 模組整體還擁有管理員資格 大鎖）
- **影響評估**（業務話）：
  - 🔴 高：accounting/database 整 layout + finance/{requests,treasury,reports,settings,travel-invoice} 5 個子頁都還擁有管理員資格 大鎖、會計 / 業務 / 助理職務在這 7 個地方都進不去、跟 PR-1c 修 finance/payments 形成「半通半不通」狀態
  - 🟡 中：useTabPermissions / ModuleGuard / sidebar 的 isAdmin 短路是「hook 層本身對 admin 失效」、API 層雖有 role_tab_permissions 兜底、但「權限長在人身上」原則沒落地
  - 🟢 低：WorkspaceSwitcher 是 UI 顯示細節
- **修法**（PR-1d 範圍擴大）：
  - 7 個整頁/layout 改查模組 permission（accounting/database/finance.requests 等）
  - 4 處 useTabPermissions + ModuleGuard + index.ts 拔短路（系統主管職務 已 PR-1a backfill 過、可直接走真正 permission flow）
  - 4 處 sidebar 顯示短路改菜單動態過濾
- **估時**：PR-1d 約 1 人日（17 處改、有測 spec 守門）

**幕僚會議摘要**（2026-04-22 4 位：senior-dev / code-reviewer / minimal-change / security）：
- senior-dev 原方案 2 人週 Phase A/B/C（完整 action-key）→ 被 3 位否決
- code-reviewer 抓 3 致命漏（F1 老 系統主管白屏 / F2 action-key schema 無法表達 / F3 loading 閃 UnauthorizedPage）
- minimal-change 判 P001 真實 scope < 2 人日、8 項否決丟其他 pattern
- security 🔴 CRITICAL：`employees.create` 等 action-key 現行 role_tab_permissions schema（只有 module × tab × CRUD）**無法表達**、必須延到 schema 擴張
- 主席收斂：採 minimal-change + security 聯合勝出、只做拔短路 + backfill、後端 4 API 延

**修復紀錄**：
- 2026-04-22 10:00：pattern-map 首版加入（🔵 發現）
- 2026-04-22 10:50：pattern-heal 4 幕僚會議（senior-dev / code-reviewer / minimal-change / security）、主席收斂 PR-1a/1b/1c 方案、William 拍板「修復」
- 2026-04-22 11:10：PR-1a 落地：
  - migration `20260422150000_backfill_admin_role_tab_permissions.sql` 套到線上 DB（Supabase ref wzvwmawpkapcmkfmkvav）
  - 4 個 workspace 的系統主管 role 從 14-24 row → 68-74 row（> 54 目標、含舊殘留無害）
  - 前端 3 處 isAdmin 短路移除（auth-store.ts:249、permissions/hooks.ts:284/293、usePermissions.ts 九 bool）
  - canAccess/canEdit 加 `if (workspaceFeatures.loading) return true` 避免閃 UnauthorizedPage
  - e2e `tests/e2e/admin-login-permissions.spec.ts` 守門新增
  - type-check ✅ 0 錯誤、gitnexus detect_changes LOW risk（2 個 usePermissions 符合預期）
  - 狀態 🔵 → 🟠
- 2026-04-22 11:30：William 手測 Corner 系統主管登入 5 個主項目全過 ✅、PR-1a 驗收通過
- 2026-04-22 11:40：PR-1c 落地：
  - `src/app/(main)/finance/payments/page.tsx:211` — `if (!isAdmin) return UnauthorizedPage` → 改用 `usePermissions().canViewFinance`、會計/財務職務可進、純業務仍擋
  - `src/features/tours/components/tour-itinerary-tab.tsx:91` — `canEditDatabase = isAdmin || ...` → 純 permission 比對（match 'database' root 或 'database:*' tab）
  - type-check ✅ 0 錯誤
- **等 William 手測 PR-1c**（Corner 系統主管點 /finance/payments 仍能進 + 點 /tours 某團行程 Tab 仍能編輯）
- 2026-04-22 11:55：William 指示「補其他 workspace 的業務/會計/助理職務權限、以 Corner 為模板」（屬 P007 scope、pattern-heal 代執行）
  - migration `20260422160000_sync_default_roles_from_corner.sql` 套到線上 DB
  - JINGYAO / YUFEN / TESTUX 的 業務 / 會計 / 助理 以 Corner 為範本 UPSERT（UPSERT 模式、保留他們既有額外權限）
  - 結果：業務 Corner 40 → JINGYAO 45 / YUFEN 48 / TESTUX 40；會計 Corner 26 → JINGYAO/YUFEN 30 / TESTUX 26；助理 Corner 32 → JINGYAO 37 / YUFEN 41 / TESTUX 32
  - 理由：兩層守門架構下（workspace_features + role_tab_permissions）職務寬鬆預填不影響租戶邊界、workspace 沒買的功能仍擋在最外層
- 2026-04-22 12:20：tenants/create seed 邏輯收尾
  - `src/app/api/tenants/create/route.ts` 2.5 節重寫：移除 ~240 行 hardcoded 4 職務 permissions、改成查 Corner 4 個預設職務 + 複製其 role_tab_permissions 到新租戶
  - 跟 migration 20260422160000 同源邏輯（Corner 是 SSOT 模板）、不再雙份定義
  - 新增模組常數 `CORNER_WORKSPACE_ID` / `DEFAULT_ROLE_NAMES`
  - Fallback：若 Corner 職務不存在、warn log + skip（不 rollback、admin 仍可 log in，僅無預設權限）
  - 變動量 -245/+65 lines（淨省 180）、type-check ✅ 0 錯誤、gitnexus detect_changes MEDIUM（預期範圍）
- 2026-04-22 12:17：**e2e 驗收通過 🟢**
  - `scripts/test-tenants-create-seed.mjs` 一次性腳本：建 TESTAUTH workspace + 系統主管（帶 Corner 系統主管權限）→ Playwright 以 TESTAUTH 系統主管登入 → 取 session cookies → 帶 cookies POST `/api/tenants/create` 建 TESTSEED → 查 4 職務 row 數 → 全 DELETE CASCADE 清乾淨
  - 結果：系統主管 74/74、業務 40/40、會計 26/26、助理 32/32 全對齊 Corner
  - 對 Corner/JINGYAO/YUFEN/TESTUX 零影響、DB 清乾淨（殘留檢查 0）
- P001-B（後端 4 API create-employee-auth / reset-employee-password / admin-reset-password / change-password）延 P008 統一 policy 函式時一併做；middleware 已擋在門外（P002）、攻擊面已降

---

### P002 — Middleware 公開路由清單過寬

| 欄位 | 值 |
|---|---|
| ID | P002 |
| 對應原則 | 3 |
| 業務翻譯 | 前線大門全部放行整組 API、靠每個員工自己記得檢查身份；其中一支忘了就直接穿透 |
| 命中（已驗） | /login（`src/middleware.ts:67-68` `/api/auth/*`）、/finance/payments（`/api/linkpay` 列公開） |
| 命中（預測） | 其他 `/api/*` 子家族 |
| 統一修法 | publicPaths 改白名單精確匹配（validate-login、logout、create-employee-auth 首筆、linkpay 特定 webhook 路徑）、其餘全部要求登入 |
| 估時 | 0.5 人週 |
| 優先級 | 🔴 上線前必改 |
| 狀態 | 🔵 發現 |

**幕僚會議摘要**：Defense in depth 靠架構不是記性。前線收緊公開面、敏感 API（密碼重設、建帳號、改 feature、改權限）必須全部要求已登入 session。本次幕僚 3 新挖 `PUT /api/permissions/features` 也是受害者。

---

### P003 — 跨租戶 API 無 workspace 一致性驗證

| 欄位 | 值 |
|---|---|
| ID | P003 |
| 對應原則 | 3 |
| 業務翻譯 | API 驗了你是誰、沒驗你要改的這筆資料是不是你家的；可跨公司改別家資料 |
| 命中（已驗） | /login（sync-employee/route.ts:24-52 可跨租戶綁帳號）、/finance/payments（linkpay webhook unauthenticated + admin client、recalculateReceiptStats 無 workspace 過濾靠 RLS）、/tours（writePricingToCore 跨租戶 UPDATE + /api/tours/by-code 用 service_role 無 auth + accept/reject 不驗 workspace） |
| 命中（本次新挖 🆘） | **`PUT /api/permissions/features` (`src/app/api/permissions/features/route.ts:48-94`)**：零認證、service_role 繞 RLS、任一登入用戶可改任何 workspace 的 feature 開關 / 打開 premium（幕僚 3 發現） |
| 命中（預測） | 所有用 admin client 做 INSERT/UPDATE/DELETE 的 endpoint |
| 統一修法 | 每支敏感 API：(1) 取 session workspace_id (2) 查目標資料 workspace_id (3) 不符 → 403。寫成通用 middleware `withWorkspaceCheck()` 套用 |
| 估時 | ~~3 人週~~ 9 支子彈今日收完 |
| 優先級 | 🔴 上線前必改 |
| 狀態 | 🟢 **9 支子彈全清完**（A PUT features / B sync-employee / C reset-employee-password / D admin-reset-password / E create-employee-auth / F accept+reject / G writePricingToCore / H GET workspaces/[id] / I get-employee-data）；recalculateReceiptStats 與 linkpay webhook 評估後 RLS/簽章守門已充分、不需額外動 |

**幕僚會議摘要**：這是 Venturo SaaS 多租戶的命脈。本次在盤權限病時又挖到一支（PUT /api/permissions/features）、證明此 pattern 不是零散 bug 而是架構漏。中央式 workspace middleware 是上線前必須。

**修復紀錄**：
- 2026-04-22 11:xx：**P003-A 🟢** `PUT /api/permissions/features` + `GET ?workspace_id=` 加「租戶管理」權限守門、配套改 hooks.ts 自己 workspace 不再帶 query 參數
- 2026-04-22 下午：**P003-B 🟢** `sync-employee` 跨租戶綁帳號漏洞修復
  - 原本只驗 access_token.user.id === body.supabase_user_id、不驗 target employee 所屬 workspace
  - 攻擊情境：user A（ws X）拿自己的 access_token 打 sync-employee、body 傳 employee_id 指向 ws Y 的員工、update 會把 A 綁到 Y 的員工 row
  - 修法：新增 3 道守門（1）查目標 employee.workspace_id 必存在（2）body.workspace_id 必等於員工真實 workspace（3）若員工已綁其他 supabase_user_id 則拒絕覆蓋
  - user_metadata.workspace_id 改用員工真實值、不信任 body
  - type-check ✅
- 2026-04-22 下午：**P003-C 🟢** `reset-employee-password` 跨租戶重設密碼漏洞修復
  - 原本只查 isAdmin、拿 body.employee_id 重設密碼、沒驗目標員工 workspace
  - 攻擊情境：Corner 系統主管 拿 JINGYAO 員工的 UUID 打這支、成功重設 JINGYAO 員工密碼
  - 修法：查目標 employee.workspace_id、必須等於 auth.data.workspaceId、否則 403
  - type-check ✅
- 2026-04-22 下午：**P003-D 🟢** `admin-reset-password` 跨租戶漏洞修復
  - 原本用 email 全域查 auth.users、重設任何人密碼、沒驗 target workspace
  - 修法：從 employees 反查 target 的 workspace_id（用 supabase_user_id）、必須等於登入者 workspace、否則 403
  - type-check ✅
- 2026-04-22 下午：**P003-E 🟢** `create-employee-auth` existing tenant 分支跨租戶漏洞修復
  - 原本只查 isAdmin、body.workspace_code 隨便填都過、JINGYAO admin 可在 Corner 建員工
  - 修法：existing-tenant 分支加 `workspace_code === currentUserWorkspaceCode` 檢查、不符 403
  - new-tenant 分支邏輯不動（isCornerAdmin only、已對）
  - type-check ✅
- 2026-04-22 傍晚：**P003-F 🟢** `accept/reject` API tour↔request 錯配守門
  - 同租戶內可打 `/tours/T1/requests/R2/accept` 讓 R2 掛到 T1、資料錯亂
  - 修法：update WHERE 加 tour_id filter、accept 前置 SELECT 驗 request.tour_id === path tourId
- 2026-04-22 傍晚：**P003-G 🟢** `writePricingToCore` 加 workspace defense-in-depth
  - 函式已收 workspace_id、但 UPDATE/SELECT/DELETE 沒用它 filter
  - RLS 是第一道、加 `.eq('workspace_id', ws)` 當第二道、6 處補上
- 2026-04-22 傍晚：**評估後不動**
  - `recalculateReceiptStats`：查 order/tour 先走 RLS、跨租戶 query 必空、到不了 UPDATE、加 defense 要改簽名 + 5+ caller、代價大
  - `linkpay webhook`：已有 verifyWebhookSignature MAC 簽章 + 金額驗證、pattern map 原紀錄 stale
- 2026-04-22 傍晚（覆盤 sub-agent 補抓）：**P003-H 🟢 + P003-I 🟢**
  - **H** `GET /api/workspaces/[id]`：0 auth + service_role、登入用戶可讀別家 workspace 名稱/付費狀態 + 員工花名冊
  - 修法：自己 workspace 直通、跨租戶需「租戶管理」權限（同 P003-A pattern）
  - **I** `POST /api/auth/get-employee-data`：有登入但沒驗 body.code 對齊 caller workspace、可查別家員工 supabase_user_id / permissions / job_info
  - 修法：body 的 workspace.id 必須等於 auth.data.workspaceId、否則 403
  - 這 2 支是「讀側 information disclosure」、不是寫側、嚴重度比 A-G 低但仍上線前必修

---

### P004 — 28 張 FORCE RLS + service_role 衝突（首頁爆表）

| 欄位 | 值 |
|---|---|
| ID | P004 |
| 對應原則 | 3 |
| 業務翻譯 | 有 28 張重要表把安全鎖得太緊、連公司自己的 admin API 都讀不到 |
| 命中（歷史） | 28 張表（tour_itinerary_items、confirmations、files、folders、visas 等） |
| 統一修法 | WAVE_2_5 方案 A：全部改 NO FORCE |
| 估時 | ~~1 人週~~ **Wave 2.5 已完成（2026-04-21）** |
| 優先級 | 🔴 上線前必改 |
| 狀態 | 🟢 **已完成（2026-04-21 Wave 2.5 + 2026-04-22 驗證）** |
| **detector** | `npm run check:patterns P004` — pass = 0 張 force_rls=true 表 |
| 最後更新 | 2026-04-22 |

**修復紀錄**：
- 2026-04-21：Wave 2.5 落地、ALTER TABLE NO FORCE × 28（STATE.md 記錄）
- 2026-04-22：pattern-heal 驗證。透過 Supabase Management API 查 `pg_class`：`relforcerowsecurity = true` 的表數 **0 張**（310 張 public 表、307 開 RLS）。pattern-map 原紀錄是舊的、升 🟢

---

### P005 — Delete-then-insert 破下游聯繫

| 欄位 | 值 |
|---|---|
| ID | P005 |
| 對應原則 | — |
| 業務翻譯 | 同步邏輯用「刪光再重建」、下游所有連結（廠商回覆、需求單、報價）的指向全斷成孤兒；AI 重排行程必爆 |
| 命中（已驗） | /tours（useTourItineraryItems.ts:232-580 syncToCore()、useSyncItineraryToCore:407 直接 update status：outdated 沒檢查需求單是否已成交） |
| 命中（預測） | /customized-tours 行程同步、/confirmations 需求重建、/itineraries daily 同步 |
| 統一修法 | DELETE 改成 UPSERT、保留 FK 穩定（用業務鍵 tour_id + day_number + item_order）；有下游 FK 的先檢查是否引用再決定 |
| 估時 | 2 人週 |
| 優先級 | 🔴 上線前必改（AI 重排、多地接協作上線前必修） |
| 狀態 | 🔵 發現 |

---

### P008 — 權限檢查雙層散佈 + key schema 不一致（**本次主病**）

| 欄位 | 值 |
|---|---|
| ID | P008 |
| 對應原則 | 1、2 |
| 業務翻譯 | UI 檢查權限「這功能租戶有買嗎」＋「員工職務能進嗎」兩層，分散在 11+ 檔案、沒有一個統一入口；而且 DB 裡 feature 的 key 一會兒寫 `tours`、一會兒寫 `tours.contract`、連分隔符都 `.` vs `:` 不一致 |
| 命中（本次新挖） | `src/components/layout/sidebar.tsx:440/541/583/726`（全站 sidebar）、`src/app/(main)/hr/roles/page.tsx:38-51`、`src/app/(main)/settings/company/page.tsx` + `tour-features-section.tsx`、`src/features/tours/components/tour-form/TourBasicInfo.tsx`、`src/features/hr/components/EmployeeForm.tsx`、`src/features/orders/components/OrderListView.tsx` + `MemberActions.tsx`、`src/lib/permissions/hooks.ts`（useWorkspaceFeatures、isFeatureEnabled、isTabEnabled）、`src/stores/auth-store.ts`（checkPermission） |
| 命中（DB 證據） | `workspace_features.feature_code` 同欄混裝兩語意格式（整模組 `tours` vs tab 粒度 `tours.contract`）、無 CHECK constraint；hooks.ts 內 key 用 `${module}.${tab}`、但其他地方有 `${module}:${tab}` 格式 |
| 統一修法 | **單一 policy 函式** `canAccessTab(user, module, tab) → Decision`：<br>• 統一分隔符（推 `.`）<br>• 內部仍做 feature + role permission 雙 runtime check（保 defense in depth）<br>• 返回 Decision 物件可觀測（allow / deny / reason）<br>• 所有消費端只呼叫這個函式、不再自行 AND<br>• key schema 加 CHECK constraint 強制格式 |
| 估時 | 2.5 人日（資深工程 04 估） |
| 優先級 | 🔴 上線前必改（幕僚 6 排本 pattern 群組 #1 最急） |
| 狀態 | 🔵 發現 |

**幕僚會議摘要**：William 的 SSOT 直覺對，但「只看 role permission」並不等於「砍雙層 runtime check」。安全幕僚（03）提醒：若 role_tab_permissions 被誤寫（如它 RLS 現在全 `USING: true`、見 P010）、單層就是災難。折衷：**收斂入口**到統一 policy 函式、內部仍雙查、寫好對 detector 能驗。順序：這個（P008）比 P007（MODULE_REGISTRY）更急、因為 policy 函式立即停血。

**依賴**：前置 P001（isAdmin 短路必先解）+ P002（公開面收緊）、否則 policy 被繞。

---

## 🟡 上線後短期

### P006 — 衍生狀態寫成 DB 欄位（違原則 4）

| 欄位 | 值 |
|---|---|
| ID | P006 |
| 對應原則 | 4 |
| 業務翻譯 | 本該從原始資料即時算的數字（已收 / 已付 / 剩餘 / 利潤）被寫成 DB 欄位、每次收款都要回寫、真相分兩處容易失同步 |
| 命中（已驗） | /finance/payments（`orders.payment_status` + `paid_amount` + `remaining_amount` 由 recalculateReceiptStats 回寫、`tours.total_revenue` + `profit` 同） |
| 命中（預測） | /orders（讀 orders.payment_status）、/tours/*（讀 tours.total_revenue）、/customers/*、/supplier/*、/accounting/* |
| 統一修法 | 移除冗餘聚合欄位、改用 view 或 helper function 即時算（按 status 分開給待確認 / 已確認） |
| 估時 | 2 人週 |
| 優先級 | 🟡 上線後短期 |
| 狀態 | 🔵 發現 |

---

### P007 — 模組清單兩本未連結 + workspace_features 混裝 key + Seeding 分散（**本次主病的另一面**）

| 欄位 | 值 |
|---|---|
| ID | P007 |
| 對應原則 | 2、候選 9 |
| 業務翻譯 | 系統有「兩本模組清單」：一本給租戶管理頁看、一本給職務設定頁看、兩本不互相引用；新增模組要改兩本；而且建新租戶時種子資料散在三個檔案、每個寫法不一樣 |
| 命中（本次新挖） | `src/lib/permissions/features.ts:17`（FEATURES）vs `src/lib/permissions/module-tabs.ts:36`（MODULES）無互引；`src/app/api/workspaces/route.ts:145+197` / `src/app/api/tenants/create/route.ts:79+483+552` / `src/app/api/auth/validate-login/route.ts:141-161` 三處 seeding 邏輯不一致；itinerary 模組漏改 MODULES 的根因 |
| 相關 | _INDEX 既有「常數 / 映射表多處定義」pattern（/finance/payments 付款方式 4 處）—— 本次是同母 pattern 的權限版 |
| 統一修法 | 建新 DB 表 `module_registry` 當唯一 SSOT（code、name、category、parent_code）、FEATURES 和 MODULES 降級為 TS 派生 view；`workspace_features.feature_code` + `role_tab_permissions.module_code` 都加 FK 指向 `module_registry`；三處 seeding 收斂成 `seedWorkspaceDefaults()` 函式 |
| 估時 | 層 1 常數合一 = 1-2 人日（但先要 P008 policy 函式當消費端出口） |
| 優先級 | 🟡 上線後短期（優先級 06 評 1 個月內） |
| 狀態 | 🔵 發現 |

**幕僚會議摘要**：後端（02）堅持不合表（workspace_features 和 role_tab_permissions 生命週期不同），但要有上位 registry 表。架構（01）同意 MODULE_REGISTRY 是正本、其他是 view。**依賴順序**：P007 層 1 先做 → P009 層 3 才有 FK 可掛 → P008 層 2 policy 函式可用新 key 格式。

---

### P009 — Feature 關閉不 cascade 清 role permission（**本次主病的第三面**）

| 欄位 | 值 |
|---|---|
| ID | P009 |
| 對應原則 | 2 |
| 業務翻譯 | 租戶關掉一個功能、職務設定裡的權限資料還留著；要靠使用端雙層檢查擋、資料本身不乾淨 |
| 命中（本次新挖） | workspace_features + role_tab_permissions 兩表無 trigger、無 FK cascade；關 feature 只是 update enabled=false、相關 role_tab_permissions.can_read 不動 |
| 統一修法 | DB AFTER UPDATE trigger on workspace_features：enabled: true → false 時、DELETE role_tab_permissions WHERE 對應 module/tab。William 拍板：feature 重開時**不**自動恢復（系統主管重勾）。注意：trigger 必須檢查 workspace_id 防跨租戶污染（幕僚 3 警告）。 |
| 估時 | 1.5 人日（資深工程 04）但依賴 P007 層 1 先做 |
| 優先級 | 🟡 上線後短期（依賴 P007） |
| 狀態 | 🔵 發現 |

**幕僚會議摘要**：後端（02）確認目前兩表都**沒有任何 trigger**（clean slate）、新 trigger 不會衝突。安全（03）提醒 trigger 用 `security definer` 要小心跨租戶污染、需跨租戶測試。動前必跑 `venturo-safe-tenant-test`。

---

### P010 — role_tab_permissions RLS 全 `USING: true`（**本次幕僚 2 新挖 🆘**）

| 欄位 | 值 |
|---|---|
| ID | P010 |
| 對應原則 | 3 |
| 業務翻譯 | 管所有職務權限的那張表（role_tab_permissions）、RLS policy 全部設成「誰都能讀」；任何登入員工可查全公司所有職務能進哪些頁面；INSERT/UPDATE policy 也一樣寬 |
| 命中 | ✅ `role_tab_permissions` 表 4 個 RLS policy 全 `USING: true` / `WITH CHECK: true`（已修） |
| 對比 | `workspace_features` 有正確 RLS（is_super_admin OR 同 workspace）；_INDEX 既有「employee_permission_overrides 也是 USING: true」屬於同類問題 |
| 統一修法（已實施） | DROP 舊 4 policy、CREATE 新 5 policy：1 service_role + SELECT/INSERT/UPDATE/DELETE 各 1、聯查 `workspace_roles.workspace_id = get_current_user_workspace()`；UPDATE 同時寫 USING + WITH CHECK 防 role_id 跨租戶搬移 |
| 估時 | ~~0.5 人日~~ **實際 ~1 小時（含 4 幕僚會議 + migration + 驗證）** |
| 優先級 | 🔴 上線前必改 |
| 狀態 | 🟢 **已完成（2026-04-22）** |
| 最後更新 | 2026-04-22 |

**幕僚會議摘要**：主席判斷 P010 應升為 🔴（優先級 06 原評 🟡、幕僚 2+3 強烈反對）。理由：這是 SaaS 多租戶的洩漏邊界、1 行 SQL 可修、不動業務邏輯、風險低收益高。

**修復紀錄**：
- 2026-04-22：pattern-map 首版加入（狀態 🔵 發現）
- 2026-04-22：pattern-heal 執行、4 幕僚會議（senior-dev / code-reviewer / minimal-change / security）、William 拍板 A（直接套用線上）、migration `20260422140000_fix_role_tab_permissions_rls.sql` 套到線上 DB（Supabase ref `wzvwmawpkapcmkfmkvav`）、5 新 policy 驗證就位、type-check ✅ 0 錯誤、gitnexus detect_changes 無誤傷、狀態 🔵 → 🟢

**遺留（不屬本次 scope、另案處理）**：
- P022 `employee_permission_overrides` 同病（同型 `USING: true`、下次修）
- P003 `/api/roles/[roleId]/tab-permissions` API 層 0 auth 檢查（security 幕僚發現、屬 P001 + P003 範圍）
- P011 JWT permissions_version claim 缺（新 RLS 下 JWT 時間差仍存在）
- P015 e2e 測試 0 覆蓋（permissions / role_tab_permissions 無 e2e test）

---

### P011 — JWT 快照、無 permissions_version claim（**本次幕僚 1 新挖**）

| 欄位 | 值 |
|---|---|
| ID | P011 |
| 對應原則 | — |
| 業務翻譯 | 改員工職務後、他的 JWT 還是舊的、要等到 1 小時過期重登才生效；改完後的空窗期員工可能還能做被剝奪的動作 |
| 命中 | `src/app/api/auth/validate-login/route.ts:141-161` 簽 JWT 時不加版本號；`src/stores/auth-store.ts` 也不比對版本 |
| 統一修法 | JWT 加 `permissions_version` claim；role 改權限時 bump `workspace_roles.permissions_version`；auth-sync 每次啟動比對、不符則強制 refresh token |
| 估時 | 0.5 人日 |
| 優先級 | 🟡 上線後短期 |
| 狀態 | 🔵 發現 |

**幕僚會議摘要**：敏感 API（金流、跨租戶寫）不應單信 JWT claim、該每次即時查 DB；一般頁面可容忍 1 小時延遲。層 2 policy 函式做完後、敏感 API 走 DB path 即可。

---

## 🟢 長期架構

### P012 — 單表擴張超寬（tour_itinerary_items 81 欄）

| 欄位 | 值 |
|---|---|
| ID | P012 |
| 對應原則 | 候選 5 |
| 業務翻譯 | 一 row 走到底設計讓 tour_itinerary_items 已 81 欄、接近 100 欄 hard limit |
| 命中 | /tours（tour_itinerary_items 跨 7 業務維度 81 欄） |
| 統一修法 | 監控、接近 95 欄時強制拆表（主表 + 階段子表） |
| 估時 | 視情況 |
| 優先級 | 🟢 長期（監控） |
| 狀態 | 🔵 發現 |

---

### P013 — 歷史驗證方式殘留 + UI/API/DB 欄位三層不一致（合併）

| 欄位 | 值 |
|---|---|
| ID | P013 |
| 對應原則 | — |
| 業務翻譯 | 舊版註釋、並存檔案、廢棄欄位到處都是；同一概念在 UI/API/DB 名字不同 |
| 命中 | /login、/hr、/finance/payments、/tours 全中 |
| 統一修法 | 按模組逐一清掃、搭配 `venturo-cleanup-council` skill |
| 估時 | 3 人週（跨全站） |
| 優先級 | 🟢 長期 |
| 狀態 | 🔵 發現 |

---

### P014 — 職務系統分裂（workspace_job_roles 孤兒表）

| 欄位 | 值 |
|---|---|
| ID | P014 |
| 對應原則 | 2 |
| 業務翻譯 | 同概念「職務」在兩個表、一個有人用、一個是孤兒 |
| 命中 | /hr（workspace_roles 活、workspace_job_roles 孤兒） |
| 統一修法 | 歸檔或刪除 workspace_job_roles |
| 估時 | 0.5 人週 |
| 優先級 | 🟢 長期（上線後） |
| 狀態 | 🔵 發現 |

---

### P015 — unit test 零覆蓋（本次幕僚 4 新挖）

| 欄位 | 值 |
|---|---|
| ID | P015 |
| 對應原則 | — |
| 業務翻譯 | 全站 unit test 幾乎是零、只有登入 e2e 有守門；任何 refactor 沒有安全網 |
| 命中 | `tests/` 只有 e2e 少量；`vitest.config` / `jest.config` 不見在 package.json scripts 啟用 |
| 統一修法 | 建立 `src/lib/permissions/__tests__/` + `auth/__tests__/` + 核心業務 hook unit test；先補再 refactor |
| 估時 | 1 人週（初批覆蓋率 30%） |
| 優先級 | 🟢 長期（但作為 P007/P008/P009 的前置、建議提前） |
| 狀態 | 🔵 發現 |

**幕僚會議摘要**：資深工程（04）提醒、重構 permissions/ 前先補 unit test 比動 hook 更急。是所有結構重構的前置、否則改了沒人知道有沒有退化。

---

### P016 — `workspaces_delete` policy = `USING: true`（**v3.0 覆盤挖到、v2.0 漏抓**）

| 欄位 | 值 |
|---|---|
| ID | P016 |
| 對應原則 | 3（租戶一致性每層都守）|
| 業務翻譯 | 「公司名牌」那張表、3 條規則鎖緊（誰能看、誰能改、誰能建）、**只有「刪除」那條忘了鎖** — 任何員工（包括別家公司的）技術上可以刪掉 Corner 整間公司、連帶刪掉所有員工/旅遊團/訂單/收款（CASCADE）|
| 命中（已驗） | `workspaces` 表 DELETE policy（DB 實證查 `qual="true"`）|
| 命中（gitnexus/全站掃預測） | 見 P019 的 45 張漏鎖表分類、有 workspace_id 欄但 policy USING:true 的需逐張驗 |
| 審計盲點 | **原始 migration `20260405500000:622-626` 是 `USING (is_super_admin())`、但 DB 現況被覆寫成 `USING: true`、覆寫來源不明**（某個 `disable_all_remaining_rls` 類 migration 或手動 console 操作）。需補 audit trail |
| 統一修法 | `ALTER POLICY workspaces_delete ON workspaces USING (is_super_admin())`（回到原始設計）；或更嚴格 `USING (id = get_current_user_workspace() AND is_super_admin())`|
| 估時 | 0.3 人日（1 行 SQL + 驗）實際 ~45 分鐘（含方案 B+ 配套 API + UI）|
| 優先級 | 🔴 上線前必改 |
| 狀態 | 🟢 **完成（2026-04-22 晚間 pattern-heal v1）** |
| **detector** | `npm run check:patterns P016` — pass = workspaces 4 條 policy 都不是 USING:true |
| 首次發現 | 2026-04-22（/login v3.0）|
| 最後更新 | 2026-04-22 晚間 |

**幕僚會議摘要**：安全（03）判 existential risk — 整間公司可被蒸發、普通 authenticated 員工即可打。資深工程（04）抓到 migration 歷史矛盾、建議修前先找覆寫來源、避免下次再被覆蓋。優先級（06）判 🥇 今晚就能修、0.3 人日極低風險高收益。

**修復紀錄**：
- 2026-04-22 晚間：pattern-heal v1 執行（方案 B+、4 幕僚會議 senior-dev / code-reviewer / minimal-change / security）
- Migration `20260422170000_fix_workspaces_delete_policy.sql` 套到線上 DB：policy 改 `USING (auth.role() = 'service_role')`、DB 驗證 DO block 守 CLAUDE.md 紅線（workspaces 不 FORCE RLS）
- API `src/app/api/workspaces/[id]/route.ts` 新增 DELETE handler：`requireTenantAdmin`（tenants.can_write）+ 3 道 guard（Corner 硬擋 / self-delete 禁 / 員工數 > 0 防呆）+ rate limit（10/分鐘）+ audit log（logger.warn 留痕）
- UI `WorkspacesManagePage.tsx:77` 改呼叫 API（非 client-side DB）
- UI `AddWorkspaceDialog.tsx:139` rollback 改呼叫 API（0 員工情境 guard 不觸發、可通過）
- type-check ✅ 0 error
- login-api 4 家 workspace 守門 ✅（CLAUDE.md 紅線 NO FORCE RLS 未動）
- middleware 擋未登入 DELETE → 307 ✅
- William 拍板：Q1 Corner 可跨租戶刪、Q2 rate limit + audit log 都加（未加新 audit_log 表、只 console.log 留痕）
- 覆寫來源未查（原始 20260405500000 是 is_super_admin()、DB 現況是 true）、已寫進 migration 註解歷史

---

### P017 — 系統表 RLS 未啟用（`_migrations` / `rate_limits` / `ref_cities`、**v3.0 新挖**）

| 欄位 | 值 |
|---|---|
| ID | P017 |
| 對應原則 | 3 |
| 業務翻譯 | 3 張「系統性表」根本沒上 RLS 鎖 — `_migrations`（裝修藍圖）、`rate_limits`（登入嘗試紀錄）、`ref_cities`（城市參考）。前兩張是漏鎖、`ref_cities` 可能是漏掉沒補（同族 `ref_countries` / `ref_airports` / `ref_destinations` 都開了 RLS）|
| 命中（已驗） | `_migrations` / `rate_limits` / `ref_cities` 三張 |
| 威脅 | `_migrations`：攻擊者可讀所有 migration SQL、洩漏架構與歷次漏洞修補路徑；`rate_limits`：可讀別人登入 rate limit 狀態推模式；`ref_cities`：全域參考資料、通常 by design 但該跟 ref_* 家族齊一 |
| 統一修法 | `_migrations` + `rate_limits`：`ENABLE ROW LEVEL SECURITY` + policy 限 service_role；`ref_cities`：套 `ref_countries` 同型 4-policy（public read + super_admin write）|
| 估時 | 0.5 人日（3 張各 1 行 SQL + 測）實際 ~15 分鐘 |
| 優先級 | 🔴 上線前必改（`_migrations` + `rate_limits`）/ 🟡 上線後短期（`ref_cities` 齊一化）|
| 狀態 | 🟢 **完成（2026-04-22 晚間、單一 migration 20260422180000）** |
| **detector** | `npm run check:patterns P017` — pass = `_migrations` / `rate_limits` / `ref_cities` 都 RLS enabled |
| 首次發現 | 2026-04-22（/login v3.0）|
| 最後更新 | 2026-04-22 晚間 |

**幕僚會議摘要**：後端（02）確認 `check_rate_limit()` 是 SECURITY DEFINER、ENABLE RLS 不影響既有邏輯。資深工程（04）grep 確認 `src/` 沒有直接讀 `_migrations` / `rate_limits` 的代碼、修這兩張 blast radius 趨近 0。優先級（06）判 🥈 今晚可順手做、1-2h。

**修復紀錄**：
- 2026-04-22 晚間：migration `20260422180000_enable_system_tables_rls.sql` 套到線上 DB
  - `_migrations`：ENABLE RLS + policy 限 service_role（FOR ALL、app 沒直讀、blast radius 0）
  - `rate_limits`：ENABLE RLS + policy 限 service_role（`check_rate_limit()` SECURITY DEFINER 繞 RLS、login-api 4 家守門驗證運作正常）
  - `ref_cities`：ENABLE RLS + 套 `ref_countries` 同族模式（SELECT public read + INSERT/UPDATE/DELETE is_super_admin()）
- 驗證：3 張表 rls=true、force_rls=false、policy_count 分別 1/1/4 ✅
- login-api 4 家 workspace 守門 ✅（CLAUDE.md 紅線 NO FORCE RLS 守住）
- type-check 不需跑（純 SQL migration、沒動代碼）

---

### P018 — `employee_permission_overrides` 缺 workspace_id + 4 policy 全 `USING: true`（**v2.0 點名未修、v3.0 升格 pattern**）

| 欄位 | 值 |
|---|---|
| ID | P018 |
| 對應原則 | 3 |
| 業務翻譯 | 這張表是「某員工的特殊權限加掛」、但**沒有 workspace_id 欄位**、加上 4 條 RLS 規則全部零條件（讀/寫/刪/新增都放行）→ 任何員工可以對別家公司員工的權限加掛做任意操作。是 v2.0 Agent F 就點名「USING:true 完全無過濾」的那張、沒升格 pattern、沒人動、至今仍在 |
| 命中（已驗） | `employee_permission_overrides` 表 |
| 對比組 | `employee_route_overrides` 同概念、policy 正確（自己看自己 + service_role）— 同概念兩表強度不一 |
| 威脅 | 攻擊門檻低：普通 authenticated 員工 → 用 supabase-js `from('employee_permission_overrides').insert(...)` → 幫自己加「系統主管」權限 bypass、或改別人的 |
| 統一修法 | 3-stage migration：(1) 加 `workspace_id` nullable 欄 + FK → workspaces(id) CASCADE (2) `UPDATE` 從 employees JOIN 回填 (3) `ALTER` NOT NULL + 重寫 4 條 policy 為 `workspace_id = get_current_user_workspace()` + `WITH CHECK` 同；**同步** `src/app/api/employees/[employeeId]/permission-overrides/route.ts:57-64` PUT insert 加 `workspace_id: auth.data.workspaceId` |
| 估時 | 0.8 人日（migration + backfill + 代碼同步 + 新 e2e spec）|
| 優先級 | 🔴 上線前必改（舊債）|
| 狀態 | 🟢 **完成**（2026-04-22 v1.6）：表 0 rows、單批 migration `20260422190000_p018_employee_permission_overrides_tenant_scope.sql` 套用、加 workspace_id NOT NULL FK、5 policy 重寫（service_role + 4 tenant scoped）、API route insert 同步、type-check ✅、Corner/JINGYAO/YUFEN row 前後 identical |
| **detector** | `npm run check:patterns P018` — pass = employee_permission_overrides 4 條 policy 都不是 USING:true |
| 首次發現 | 2026-04-22（v2.0 Agent F）|
| 最後更新 | 2026-04-22（v1.6 修復完成）|

**幕僚會議摘要**：安全（03）判 Top priority 威脅（CWE-269 提權）、優先度高於 P016。後端（02）給 3-stage migration 樣板、backfill 邏輯走 employees JOIN 可完整還原。資深工程（04）警告 migration 跟 code PR 必須同批上線、不能先 migration 後 code 否則 PUT insert 會因 NOT NULL 炸。優先級（06）判：**不要今晚動**（schema migration + backfill 在疲勞下不適合）、排本週。

**修復紀錄**：
- 2026-04-22（v1.6）：實際動手前查 `SELECT COUNT(*) FROM employee_permission_overrides` = 0、3-stage 簡化為單批（無資料無需 backfill stage）
  - migration `20260422190000_p018_employee_permission_overrides_tenant_scope.sql`：ADD workspace_id NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE + 4 條 USING:true DROP + 5 條新 policy（service_role + tenant_select/insert/update/delete 用 `workspace_id = get_current_user_workspace()`）
  - API `src/app/api/employees/[employeeId]/permission-overrides/route.ts`：requireHrEmployeesAdmin 回傳值加 workspaceId、PUT insert payload 加 workspace_id
  - BEFORE/AFTER row count 對帳：Corner 5 / JINGYAO 1 / YUFEN 5 員工數 identical、overrides 0 → 0
  - type-check ✅ 0 錯誤、`npm run check:patterns P018` ✅ 綠

---

### P020 — 多 RLS policy 重疊互相打架（PostgreSQL 多 policy 是 OR、寬的會覆蓋嚴的）（**v1.3 新挖、v1.4 全站盤點完整**）

| 欄位 | 值 |
|---|---|
| ID | P020 |
| 對應原則 | 3 |
| 業務翻譯 | 同一張表上有人寫了「嚴格 cmd-specific tenant scoped」+ 有人另寫一條「ALL USING:true 或 USING:authenticated」、PostgreSQL 把兩條 OR 起來 → 嚴格那條等於沒寫、任一登入用戶通吃 |
| **v1.4 全站盤點命中（共 31 張、其中 18 張 effective 失守）**| 親查 SQL `pg_policies WHERE cmd='ALL' AND USING不嚴` 結果：|
| 🔴 **ALL policy = `true`（任何用戶通吃、13 張）** | `bot_groups` / `bot_registry` / `customer_inquiries`（policyname 寫 "Service role full access" 但 USING/CHECK 都是 true、命名錯置）/ `employee_payroll_config` / `itinerary_permissions` / `magic_library`（可能 by design）/ `payroll_allowance_types` / `payroll_deduction_types` / `tour_bonus_settings` / `tour_expenses` / `wishlist_template_items`（命名錯置同上）/ `wishlist_templates`（同）/ `workspace_attendance_settings`（重複 ALL policy 一條 true 一條 employee JOIN）/ `workspace_bonus_defaults` / `workspace_notification_settings` |
| 🟡 **ALL policy = `auth.role()='authenticated'`（任意登入者、5 張）** | `system_settings` / `tour_members` / `tour_request_items` / `tour_request_member_vouchers` / `tour_request_messages` |
| ✅ **ALL policy 寫對的（13 張、不在受害名單）**| `attraction_licenses`（`is_super_admin`）/ `company_asset_folders`（workspace_id）/ `employee_route_overrides`（service_role）/ `fleet_drivers / schedules / vehicle_logs / vehicles`（4 張、workspace_id）/ `members`（workspace_id OR NULL）/ `michelin_restaurants`（workspace_id OR is_super_admin）/ `premium_experiences`（同）/ `role_tab_permissions`（service_role、P010 修法正確）|
| 業務後果 | 業務員可讀寫別家公司薪資設定 / 加項扣項類型 / 團獎金設定 / 團支出 / 通知設定 / 出勤設定；可讀寫別家公司的需求單 items / messages / vouchers；可塞 tour_members 到別家團 |
| 統一修法 | 對 18 張受害表：DROP 該條 ALL policy（保留 cmd-specific tenant scoped 即可）；若該表沒 cmd-specific、補 4 條 cmd-specific（依表的業務語意決定 workspace_id filter 或 employee_id filter）|
| 估時 | 18 張 × 0.2 人日 = 3.6 人日（含 e2e 測）；可批次 SQL 處理 |
| 優先級 | 🔴 上線前必改（含 5 張 🟡 因為 authenticated 範圍極大、實質與 USING:true 同等）|
| 狀態 | 🟠 **部分**（2026-04-22 v1.6）：20 → 18（DROP `magic_library` + `system_settings` 兩張未用表、連帶 War Room features + NewebPay/travel-invoice 整套 UI/API 移除、code 0 殘留、type-check ✅）；剩 18 張待批次修 |
| **detector** | `npm run check:patterns P020` — pass = ALL policy 都含 service_role / is_super_admin / workspace_id / employee_id / get_current_user_workspace 之一 |
| 首次發現 | 2026-04-22 深夜（v1.3 從 tour_members 起頭、v1.4 全站盤完成）|
| 最後更新 | 2026-04-22 深夜 v1.5 |

**全站盤點 SQL**（可重複跑驗證進度）：
```sql
WITH counts AS (
  SELECT tablename,
    COUNT(*) FILTER (WHERE cmd = 'ALL') AS all_count,
    COUNT(*) FILTER (WHERE cmd != 'ALL') AS specific_count
  FROM pg_policies WHERE schemaname = 'public' GROUP BY tablename
)
SELECT tablename FROM counts WHERE all_count > 0 AND specific_count > 0 ORDER BY tablename;
```

**驗證**：
```sql
SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE tablename = 'tour_members';
-- 5 row：4 cmd-specific（嚴格 EXISTS workspace）+ 1 ALL（USING: auth.role()='authenticated'）
```

---

### P021 — `tour_destinations` / `tour_leaders` 無 workspace_id + policy 全 USING:true（**v1.3 重驗新挖、屬 P019 ❓ 子家族**）

| 欄位 | 值 |
|---|---|
| ID | P021 |
| 對應原則 | 3 |
| 業務翻譯 | 兩張表（旅遊團目的地 / 領隊資料）沒有 workspace_id 欄、4 條 RLS policy 全部「誰都能讀寫刪改」、業務員可隨意動別家公司的領隊資料、可亂塞團目的地 |
| 命中（已驗）| `tour_destinations`（4 條 policy 全 USING:true / WITH CHECK:true、無 workspace_id 欄）；`tour_leaders`（SELECT/DELETE USING:true、INSERT/UPDATE 任意 authenticated 可改、無 workspace_id 欄）|
| 對比 ref_* 家族 | ref_countries / ref_airports 等：SELECT USING:true（公開可讀）但 INSERT/UPDATE/DELETE 限 `is_super_admin()` — **比 P021 嚴格**。tour_destinations / tour_leaders 連寫入都沒鎖、跨租戶任意污染 |
| 待 William 拍板的根本問題 | (a) **公版**：類似 ref_* 全公司共用、若 yes 則應改成 「SELECT public read + 寫入 admin only」一律齊 ref_* 家族 ；(b) **租戶私有**：應加 workspace_id 欄 + tenant scoped policy、各家公司各自管自己的領隊和目的地池 |
| 統一修法（依拍板）| (a) 公版方向：DROP USING:true policy、CREATE 新 4 條（SELECT public、INSERT/UPDATE/DELETE is_super_admin）；(b) 租戶方向：3-stage migration（加 workspace_id 欄 → backfill → NOT NULL + 重寫 policy）|
| 估時 | (a) 0.3 人日；(b) 0.8 人日 |
| 優先級 | 🔴 上線前必改（兩種拍板方向都不能維持現狀）|
| 狀態 | 🔵 發現（待 William 拍板「公版 vs 租戶」）|
| 首次發現 | 2026-04-22 深夜（v1.3 重驗 /tours）|
| 最後更新 | 2026-04-22 深夜 |

**驗證**：
```sql
SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies WHERE tablename IN ('tour_destinations','tour_leaders');
-- tour_destinations 4 條：select/update/delete USING:true、insert WITH CHECK:true
-- tour_leaders 4 條：select/delete USING:true、insert WITH CHECK auth.role()='authenticated'、update USING auth.role()='authenticated'
```

**業務語境問 William**：
- 領隊資料是「Corner 自己的領隊池」、還是「全 Venturo 共用的領隊資料庫、各家旅行社挑用」？
- 旅遊團目的地是「自家精選池」、還是「全公司共用、跟 ref_destinations 同類」？

---

### P022 — Permission-overrides API 應用層 + DB 層雙層裸奔（**v1.4 強迫症深掘新挖、CRITICAL**）

| 欄位 | 值 |
|---|---|
| ID | P022 |
| 對應原則 | 1 + 3 |
| 業務翻譯 | `/api/employees/任意員工ID/permission-overrides` 是「員工個人權限加掛」API、整支 route.ts 78 行**沒有任何身份檢查**（沒 getServerAuth、沒 isAdmin、沒 workspace 對齊）；後端用 cookie session client 想靠 RLS 兜底、但 employee_permission_overrides 表的 RLS 4 條 policy 全部 USING:true（P018）等於沒鎖 — **應用層 + DB 層雙層裸奔、任何登入用戶可以打 PUT 幫自己加系統主管權限或刪別家公司員工的權限** |
| 命中（已驗）| `src/app/api/employees/[employeeId]/permission-overrides/route.ts` 全 78 行；DB `employee_permission_overrides` 4 條 USING:true policy（P018）|
| 攻擊演練 | `curl -X PUT https://erp/api/employees/<別家任一員工ID>/permission-overrides -H 'Cookie: <自己登入的session>' -d '{"overrides":[{"module_code":"finance","tab_code":null,"override_type":"grant"}]}'` → 200 OK、別家員工得到 finance 權限。同理可給自己加任何模組權限 |
| 為什麼 v3.0 沒抓到 | v3.0 raw report Agent F 點名 `employee_permission_overrides` USING:true、但沒順著爬 API 端點、所以 P018 升 pattern 但 API 漏網。本次 v1.4 強迫症深掘 grep 「workspace\|tenant\|requireTenantAdmin\|getServerAuth\|auth\.data」結果空、才發現 |
| 統一修法 | 兩件事一起做（DB 修不夠、API 也要修）：(1) **API 層**：route.ts 加 `getServerAuth` + `requireTenantAdmin` 或 `hasPermission(user, 'employees.manage_overrides')` + 驗 `target employee.workspace_id === auth.data.workspaceId`（防 Corner 系統主管 改別家員工）；(2) **DB 層**：跟 P018 一起做、加 workspace_id 欄位 + 重寫 4 條 policy 為 workspace tenant scoped；(3) 寫 e2e spec 守門 |
| 估時 | API 層 0.5 人日、DB 層跟 P018 一起 0.8 人日、合計 1.3 人日 |
| 優先級 | 🔴 **CRITICAL 上線前必改**（提權漏洞、CWE-269）|
| 狀態 | 🟢 **API 層完成**（2026-04-22 v1.6 detector 對帳）：route.ts 加 `requireHrEmployeesAdmin`（getServerAuth + can_write 權限 + workspace 一致性）、detector 綠。DB 層另由 P018 追蹤（仍紅）|
| **detector** | `npm run check:patterns P022` — pass = `src/app/api/employees/[employeeId]/permission-overrides/route.ts` 含 `getServerAuth`/`requireTenantAdmin`/`checkIsAdmin` |
| 首次發現 | 2026-04-22 深夜（v1.4 強迫症深掘）|
| 最後更新 | 2026-04-22（v1.6 detector 對帳：地圖原寫 🔵、實際 API 層守門已加、升 🟢；DB 層留 P018 處理）|

**驗證**：
```bash
# API 0 守門證據
grep -n "workspace\|tenant\|requireTenantAdmin\|getServerAuth\|auth\.data" src/app/api/employees/\[employeeId\]/permission-overrides/route.ts
# 結果：空（無任何守門）
```
```sql
-- DB 4 條 USING:true 證據
SELECT cmd, qual, with_check FROM pg_policies WHERE tablename = 'employee_permission_overrides';
-- 4 row：select USING:true / insert WITH CHECK:true / update USING:true / delete USING:true
```

---

### P019 — DB Policy `USING: true` 全站盤點（**本次 pattern-map 新挖、分類待 William 拍板**）

| 欄位 | 值 |
|---|---|
| ID | P019 |
| 對應原則 | 3 |
| 業務翻譯 | 跟 P016 / P018 同病、但掃全站發現 **83 張表的 policy 有 `USING: true` 或 `WITH CHECK: true`**。大部分是全域參考表（ref_* / 米其林餐廳 / 機場等）by design 要全員可讀、**但至少 45 張是真漏鎖**（薪資 / 訊息 / 加班 / 通知 / 團員 / 團需求 / 網站設計等個人或租戶敏感資料）|
| 命中分類（幕僚 2 後端）| ✅ by design ~13 張（ref_*、badge_definitions、magic_library）/ 🟡 可能 by design 要鎖寫 ~6 張 / 🔴 絕對漏鎖 ~45 張（含 P016 + P018 + payroll_allowance_types / payroll_deduction_types / meeting_messages / tour_members / tour_requests / overtime_requests / notifications / personal_expenses 等）/ ❓ 需 William 拍板 ~17 張（luxury_hotels、premium_experiences、michelin_restaurants：「公版還是租戶精選」邊界）|
| 全清單 | `/Users/williamchien/Projects/venturo-erp/docs/ROUTE_CONSISTENCY_REPORT_2026-04-22/_pattern_map_session/_using_true_tables.txt` 83 張；分類詳見同資料夾 `2-backend-architect.md` |
| 統一修法 | 5 個 SQL migration template（A 租戶敏感 / B 個人敏感 / C 員工資料 / D 全域參考（只鎖寫）/ E 系統內部）見 `2-backend-architect.md`；pattern-heal 可批次跑 |
| 估時 | 🔴 45 張 sprint 1-2 約 4.5 人日；🟡 ❓ 類等 William 決策後排 |
| 優先級 | 🔴 敏感資料分批（Sprint 1-2）/ 🟢 全域參考標 by design 不動 |
| 狀態 | 🟠 **部分完成（2026-04-22 晚間、✅ + 🟡 + ❓ 分類完成並記錄 by design、🔴 45 張待 pattern-heal 批次修）** |
| 首次發現 | 2026-04-22（pattern-map v2）|
| 最後更新 | 2026-04-22 晚間 |

**幕僚會議摘要**：這是 P016 + P018 的**全站母 pattern**、光靠 per-route verify 永遠挖不完（被動觸發）、需靠 DB_TRUTH 全站掃。優先級（06）建議快速勝利：先掃「有 workspace_id 欄位但 policy = USING:true」的 → 純 policy 修復、不動 schema。❓ 17 張語義不明的請 William 拍板「公版還是租戶精選」。

---

#### 📋 P019 分類 ADR（2026-04-22 晚間、來源：幕僚 2 backend-architect）

**✅ By design 全域可讀（13 張、不改）** — SELECT `USING:true` 正確、寫入應限 admin：

- `ref_airports` / `ref_countries` / `ref_destinations`（已 `is_super_admin()` 寫入、✅ 齊整）
- `ref_cities`（本次 P017 修完、已齊一 ref_* 家族）
- `badge_definitions` / `badges`（遊戲化徽章、全站共用）
- `supplier_categories` / `region_stats`（lookup 表）
- `activities` / `luxury_hotels` / `michelin_restaurants` / `restaurants` / `premium_experiences` / `tour_destinations` — **分類為 by design 前提是「全域公版」**、若實際是「每家租戶自己精選池」則應歸 🔴、**語義待 William 拍板**

**🟡 讀可寬、寫要鎖（6 張、下次修）**：

| Table | 修法方向 |
|---|---|
| `wishlist_templates` / `wishlist_template_items` | 有 workspace_id + created_by — 模板共享可、但寫入應限建立者租戶 |
| `todo_columns` | 有 workspace_id — 應綁租戶 |
| `workspace_attendance_settings` / `workspace_notification_settings` / `workspace_bonus_defaults` | 租戶級設定、SELECT `USING:true` 意味他租戶可讀 → 應綁自家 workspace |

**❓ 需 William 拍板（17 張）**：

- **公版 vs 租戶**：`activities` / `luxury_hotels` / `michelin_restaurants` / `restaurants` / `premium_experiences` / `tour_destinations` — 全站公版還是每家精選池？
- **PNR 子表**：`pnr_passengers` / `pnr_remarks` / `pnr_segments` / `pnr_ssr_elements` — 應走父表 pnrs workspace 邊界（join 判）
- 其他：`profiles` / `hotels` / `customer_inquiries` / `friends` / `notifications` / `private_messages` / `meeting_messages`（均涉人際 / 個資邊界、需業務語義確認）

**🔴 絕對漏鎖 45 張（下一輪 pattern-heal 批次修、Sprint 1-2 約 4.5 人日）**：

含 workspace_id 欄但 policy 沒用、或含 user_id / employee_id 屬個人敏感、或訊息 / 金流類。完整清單見：
- `docs/ROUTE_CONSISTENCY_REPORT_2026-04-22/_pattern_map_session/_using_true_tables.txt`（83 張全清單）
- `docs/ROUTE_CONSISTENCY_REPORT_2026-04-22/_pattern_map_session/2-backend-architect.md`（5 個 SQL template：租戶 / 個人 / 員工 / 參考 / 系統）

代表性：`payroll_allowance_types` / `payroll_deduction_types`（有 workspace_id 但 USING:true）/ `meeting_messages` / `tour_members` / `tour_requests` / `overtime_requests` / `notifications` / `personal_expenses` / `website_day_activities` 等。

**本次 ADR 不動代碼 / DB、只做分類留痕 + 標記哪些「是漏洞」vs「是 by design」、讓下輪 pattern-heal 知道優先級**。

---

## Pattern 依賴圖（修復順序）

```
P001 isAdmin 短路 ─┐
P002 middleware 公開面 ─┤── 前置 ──→ P008 policy 函式
P010 RLS USING: true ────┘                ↓
                                   P007 MODULE_REGISTRY
                                        ↓
                                   P009 DB trigger cascade
                                        ↓
                                   P011 permissions_version

P003 跨租戶驗證（獨立並行）
P004 FORCE RLS 28 張（獨立並行）
P005 Delete-then-insert（獨立並行）
P015 unit test（P007/P008/P009 的前置）
```

---

## 本次主病修復建議路線（P007 + P008 + P009 + P010 + P011）

幕僚一致建議：**拆 5 個 PR，不 bundled**。William 風格（一對一、慢慢做）+ revert 粒度 + 驗收時機 三層都要求分開。

| 順序 | 編號 | 內容 | 估時 | PR |
|---|---|---|---|---|
| 0（前置） | P015 | 補 permissions/ + auth/ unit test | 1 週 | PR-0 |
| 0（前置） | P001 | 移 isAdmin 短路、敏感 API 改 hasPermission | 1 週 | 已列 🔴 獨立 |
| 1 | P010 | role_tab_permissions RLS 改嚴 | 0.5 日 | PR-1 |
| 2 | P007 | 建 module_registry 表 + FK + seeding 函式 | 1-2 日 | PR-2 |
| 3 | P009 | AFTER UPDATE trigger on workspace_features | 1.5 日 | PR-3（動 DB、呼叫 `venturo-safe-tenant-test`） |
| 4 | P008 | 統一 policy.canAccessTab 函式、消費端收斂 | 2.5 日 | PR-4 |
| 5 | P011 | JWT permissions_version claim | 0.5 日 | PR-5 |

**William 驗收（業務話）**：
1. 「我在租戶頁關掉會計功能、重登後所有職務的會計頁都進不去、不用再去改職務設定」（P009 + P008 合驗）
2. 「搜尋整個 codebase 只有一份 module_registry、找不到第二份權限模組清單」（P007）
3. 「一般員工打我們的 PUT /api/permissions/features 會被拒絕」（P003 新命中 + P010）

---

## 幕僚演進建議（下次 pattern-map 套用）

從幕僚 5（autonomous-optimization-architect）回報：

**下次加 1 位**：**Product Translator**（產品翻譯員）——獨立負責把技術語言翻成 William 能懂的業務話。目前這活由主席兼、有時會淡化。

**再下次加 2 位**：**QA / 測試工程師** + **UX / 前端工程師**。超過 9 位邊際效益遞減。

**地圖結構加欄位**（本次已採用其中 4 個）：
- ✅ `對應原則`（已加）
- ✅ `依賴順序 / 修復順序`（已加、見依賴圖）
- ⚠️ `detector`（腳本路徑）— 下次加
- ⚠️ `regression_risk`（修了會退化什麼）— 下次加
- ⚠️ `last_touched`（上次狀態變動日期）— 下次加
- ⚠️ `Schema Version` migration 機制 — 已加 Schema 1.0、下次 bump 需要 migration note

---

## 自動偵測機制（Phase 0 提案）

從幕僚 5 建議：**pattern 分四級（A 結構 / B 一致性 / C 行為 / D 語義）**、A/B 級必寫 detector 腳本、修完 = 代碼 + detector + CI 三缺一不算修完。

**第一支 detector（優先做）**：
```
scripts/pattern-detectors/check-feature-consistency.mjs
```
做：四方 set diff
1. DB `workspace_features.feature_code`（實際資料）
2. DB `role_tab_permissions.module_code`（實際資料）
3. TS `FEATURES` 常數（features.ts）
4. TS `MODULES` 常數（module-tabs.ts）

對齊度 100% = P007 修完；任一 diff = P007 未修完。

**CI 整合**：重構 permissions/ 時、`npm run type-check` 之外加 `node scripts/pattern-detectors/check-feature-consistency.mjs`、不通過擋 PR。

---

## 跟 `_INDEX.md` 的關係

本次會議 **建議 _INDEX 新增**：
1. **新候選原則 9**：跨存儲語義實體必須有雙向一致性測試（本次 + /finance/payments 常數多處定義、相同母 pattern）
2. **新候選原則 10**：權限檢查只需一層業務邏輯、展示層只照映射（原則 1 的延伸、層 2 policy 函式收斂）
3. 跨路由共通問題**擴展**：
   - 「常數 / 映射表多處定義」擴到 module/feature 層（本次 P007）
   - 「RLS USING: true」明確標註 `role_tab_permissions` 比 `employee_permission_overrides` 更嚴重（P010）
4. 新加跨路由共通問題：「跨租戶 API 無 workspace 驗證」應獨立成一條（原本在 P003 分散記錄）

---

## WHY 同步備忘（下次 `venturo-why-sync` 使用）

本次會議浮現、可進 `VENTURO_WHY.md` 的候選：

- **候選原則 9、10**：等第二個路由命中再升格。
- **VENTURO_WHY §15 哲學候選**：「SSOT 有**結構性**和**表面**兩種、結構性 SSOT 破碎必須靠架構守（trigger、FK、派生 view），不能靠人記得兩邊同步」——從本次 P007 抽出。
- **VENTURO_WHY §8 業務洞察候選**：「老闆對『權限』的心智模型是一層（職務決定員工能進哪些功能）、現行代碼是兩層（租戶買了 + 職務開了）。一層模型較貼近業務直覺、兩層架構是防守疊加」。
- **VENTURO_WHY 特洛伊意義候選**：「Venturo 對部署到其他旅行社的價值、是把『架構級 SSOT 紀律』當成產品特徵、而不是工程習慣」——因為跨租戶 SaaS 才會真的需要 module_registry + trigger cascade 這種治理。

---

## 修訂紀錄

| 日期 | 版本 | 變更 | 誰 |
|---|---|---|---|
| 2026-04-22 | 1.0 | 首版建立。6 幕僚並行會診、15 個 pattern（6🔴 5🟡 4🟢）、本次核心是 P007/P008/P009 三位一體的權限 SSOT 破碎、新挖 P010 / P011 致命問題 | pattern-map skill |
| 2026-04-22 | 1.1 | **P010 修完 🟢**。pattern-heal 執行、migration 20260422140000 已套到線上 DB。分布改為 5🔴 / 5🟡 / 4🟢 **+ 1🟢 已完成** | pattern-heal skill |
| 2026-04-22 | 1.2 | **/login v3.0 覆盤接力、pattern-map 第二輪**。6 幕僚會診 DB 層 4 條新/遺留紅色、合併為 P016 P017 P018 + 全站掃新增 P019（USING:true 83 張表分類）。現況 8🔴（5 舊 + P016/P017 部分/P018）+ 5🟡 + 4🟢 + 5🟢 完成（P001-P004 + P010）+ P019 待分類。v2.0 三項盲點（4-policy 抽樣、RLS disabled 全站掃、per-route 點名不自動升格）交幕僚 5 產演進建議、已寫入本檔與 skill meta | pattern-map v2 |
| 2026-04-22 | 1.3 | **4 路由並行重驗（/login + /hr + /tours + /finance/payments）**。重大修正：(a) **P001 從 🟢 → 🟠 部分**、親查 grep 發現 useTabPermissions 4 處 + sidebar 1 處 + useChannelSidebar 1 處共 6 處 isAdmin 短路 PR-1a 沒涵蓋；(b) **新加 P020**（tour_members ALL `authenticated` policy 與 cmd-specific 並存、Postgres 多 policy OR 讓嚴格守門失效）；(c) **新加 P021**（tour_destinations / tour_leaders 無 workspace_id + 全 USING:true、屬 P019 ❓ 子家族待拍板「公版 vs 租戶」）；(d) **P019 名單修正**（workspace_roles / workspace_job_roles / tour_role_assignments 親查 DB 證實有 workspace 守門、不在紅 45 張）；(e) **finance/payments DB 層全綠**（receipts / linkpay_logs / payment_methods / payment_requests / orders 4 條 policy 都有 workspace_id filter）；(f) **payment_method_id 之謎結案**（DB 真相 nullable、FK SET NULL、不是 NOT NULL）；(g) /login agent 兩處錯報（useTabPermissions 短路說已拔、admin-reset-password 說已廢）親查更正 | pattern-map v3 |
| 2026-04-22 | 1.4 | **強迫症深掘第二輪（William 要求挖到無錯）**。重大新發現：(a) **P001 17 處 isAdmin 短路完整盤**（不是 6 處）— 含 accounting/database 兩 layout + finance/{requests,treasury,reports,settings,travel-invoice} 5 子頁整頁大鎖、useTabPermissions + ModuleGuard + permissions/index 等 hook 層、sidebar/mobile-sidebar/channel-sidebar/WorkspaceSwitcher 4 處 UI 層；(b) **P020 全站盤完成 — 18 張表 effective 失守**（不只 tour_members、含薪資 3 張 / 旅遊團獎金支出 2 張 / 需求單 4 張 / 系統與租戶設定 3 張 / bot/magic/wishlist/customer_inquiries/itinerary_permissions 等）；(c) **P020 13 張命名錯置**（policyname 寫 "Service role full access" 但 USING/CHECK 都是 true、明顯複製貼上錯誤、屬高度可疑技術債）；(d) **新加 P022 CRITICAL**：`/api/employees/[employeeId]/permission-overrides` 整 route.ts 78 行 0 守門 + employee_permission_overrides 表 4 條 USING:true（P018）= 雙層裸奔、任何登入用戶可幫自己加系統主管權限（CWE-269 提權）；(e) **P017 / P016 落地驗親查全綠**（_migrations / rate_limits / ref_cities / workspaces 4 條 policy 都對）；(f) **P010 親查證實正確**（role_tab_permissions ALL policy = service_role 是設計、不是漏）；(g) create-employee-auth P003-E 親查守門完整（agent 報告對）| pattern-map v4 |
| 2026-04-22 | 1.5 | **解「為什麼會忘」流程漏洞**。建 `scripts/pattern-detectors/check-all.mjs` 8 個 detector + `npm run check:patterns`、把每個有 detector 的 pattern 加 `detector` 欄位、跑一次 baseline（4 紅 4 綠 + 1 informational）。從此「修完」必須 detector 通過、不准只看標籤；agent 重驗時 prompt 強制要求跑 detector。Schema 升 1.1（加 detector 欄位）。順手修 dotfiles `.zshrc` 過期 `SUPABASE_ACCESS_TOKEN`（從 sbp_ae47 改 sbp_ddbc、原來 env 失效就是這次 fetch 403 的根因）| detector framework v1 |

**P020 修復紀錄（2026-04-22 v1.6 第一批）**：
- 動因：William 說「magic_library + NewebPay 都未上線、現在重新檢就好、之後重新開發」、決定砍掉而非單純改 policy
- DB：migration `20260422200000_drop_unused_magic_library_and_system_settings.sql` DROP 2 表（magic_library 14 row、system_settings 1 row）
- Code 砍除清單：
  - `src/features/war-room/` 整個資料夾
  - `src/app/(main)/war-room/` 路由
  - `src/lib/newebpay/` 整個資料夾（client/crypto/index/test）
  - `src/app/api/travel-invoice/` 6 個 API（allowance / batch-issue / issue / void / orders / query）
  - `src/app/(main)/finance/travel-invoice/` 整套 UI（page / [id] / create / components / constants / error / loading）
  - `src/features/finance/travel-invoice/` 整套 components
  - `src/features/finance/components/invoice-dialog.tsx` + `invoice/` 子資料夾
  - `src/features/tours/components/InvoiceDialog.tsx` + `tour-payments.tsx` + `useTourPayments.ts`
  - `src/stores/travel-invoice-store.ts`
  - `src/app/(main)/settings/components/NewebPaySettings.tsx`
  - settings index export / labels.ts NEWEBPAY_LABELS
  - sidebar / mobile-sidebar / mobile-header / breadcrumb-config / module-tabs / features.ts / useEligibleEmployees 殘留參考全清
- 連帶清 OrderListView / TourTabs / tour-closing-tab 對 InvoiceDialog 跟 TourPayments 的引用
- type-check ✅ 0 錯誤、`npm run check:patterns P020` 受害數 20 → 18
- 待續：剩 18 張表（bot_groups / bot_registry / customer_inquiries / employee_payroll_config / itinerary_permissions / payroll_allowance_types / payroll_deduction_types / tour_bonus_settings / tour_expenses / tour_members / tour_request_items / tour_request_member_vouchers / tour_request_messages / wishlist_template_items / wishlist_templates / workspace_attendance_settings / workspace_bonus_defaults / workspace_notification_settings）— 等下一輪批次決策

**P020 第 2-4 批修復紀錄（2026-04-22 v1.6 收尾）**：

**第 2 批**（客製化整族）：DROP customer_inquiries / wishlist_templates(2)+template_items(12) / tour_request_items+vouchers+messages / tour_requests(10)+progress view / tour_expenses 共 9 表+1 view、砍 features/tour-confirmation + features/tour-documents + /customized-tours + /inquiries + /p/customized + auth/line + tour-request store/entities/types

**第 3 批**（供應商 portal + 確認單）：DROP confirmations(12)+customer_assigned_itineraries / 5 supplier_* 表 / 4 fleet_* 表+1 view / tour_confirmation_items+sheets 共 14 表+2 view、砍 features/supplier(單)+features/fleet+features/confirmations+features/tour-confirmation+/supplier+/local+/database/fleet+/confirmations、清 OrderListView/TourTabs 對 InvoiceDialog/TourPayments 引用

**第 4 批**（HR + 個人功能）：DROP attendance_records(2)+leave_balances/requests/types+payroll_* (5)+tour_bonus_settings+workspace_bonus_defaults+workspace_notification_settings+leader_schedules+1 view+personal_canvases/records/expenses(3)+timebox_scheduled_boxes+pnr_schedule_changes 共 18 表+1 view、保留 employees/workspace_attendance_settings(給未來打卡)/  /hr/roles+/hr/settings、砍 13 個 /hr/* 子路由

**最後修 1 條 policy**：tour_members 拔 `tour_members_authenticated` 寬鬆 ALL、保留 4 條 cmd-specific workspace EXISTS、tour_members 10 row 對帳 identical

**今天最終成績**：4 個 detector 紅燈 → 8 個 detector 全綠（P022 / P001 / P018 修+對帳 / P020 大清掃）；total DROP 42 張表+4 view、砍 30+ feature/路由資料夾、type-check 全程 ✅
