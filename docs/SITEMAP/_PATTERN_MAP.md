# Venturo Pattern Map — 病症修復地圖

Last updated：2026-04-22
Schema version：1.0

Status summary：🔵 10 發現 / 🟡 0 計畫 / 🟠 1（P003 大部分完、剩 non-auth endpoints）/ 🟢 **4 完成（P001 / P002 / P004 / P010）** / ⚫ 0 廢棄
本次更新：**2026-04-22 今日大修**。
- P001 升 🟢（tenants/create seed e2e 驗收：TESTAUTH → Playwright 登入 → POST /api/tenants/create → TESTSEED、4 職務 row 74/40/26/32 全對齊 Corner）
- P002 升 🟢（middleware 前門從 prefix 放行改精確白名單、5 支敏感 auth API 不再裸奔、e2e 4 家 workspace 守門過）
- P003 🟠 **5 支 auth API 子彈全清**（A PUT features / B sync-employee / C reset-employee-password / D admin-reset-password / E create-employee-auth）、剩 webhook 與 frontend hook 類的（多為 RLS 已保護、非今日 scope）
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
| 估時 | ~~2 人週~~ 實際 Phase A ~1 小時（含 4 幕僚會議 + migration + code edit + type-check） |
| 優先級 | 🔴 上線前必改 |
| 狀態 | 🟢 **完成（Phase A + PR-1c + tenants/create seed 全落地、e2e 驗過；P001-B 4 敏感 API 延 P008）** |
| 首次發現 | 2026-04-22 |
| 最後更新 | 2026-04-22 |

**幕僚會議摘要**（2026-04-22 4 位：senior-dev / code-reviewer / minimal-change / security）：
- senior-dev 原方案 2 人週 Phase A/B/C（完整 action-key）→ 被 3 位否決
- code-reviewer 抓 3 致命漏（F1 老 admin 白屏 / F2 action-key schema 無法表達 / F3 loading 閃 UnauthorizedPage）
- minimal-change 判 P001 真實 scope < 2 人日、8 項否決丟其他 pattern
- security 🔴 CRITICAL：`employees.create` 等 action-key 現行 role_tab_permissions schema（只有 module × tab × CRUD）**無法表達**、必須延到 schema 擴張
- 主席收斂：採 minimal-change + security 聯合勝出、只做拔短路 + backfill、後端 4 API 延

**修復紀錄**：
- 2026-04-22 10:00：pattern-map 首版加入（🔵 發現）
- 2026-04-22 10:50：pattern-heal 4 幕僚會議（senior-dev / code-reviewer / minimal-change / security）、主席收斂 PR-1a/1b/1c 方案、William 拍板「修復」
- 2026-04-22 11:10：PR-1a 落地：
  - migration `20260422150000_backfill_admin_role_tab_permissions.sql` 套到線上 DB（Supabase ref wzvwmawpkapcmkfmkvav）
  - 4 個 workspace 的管理員 role 從 14-24 row → 68-74 row（> 54 目標、含舊殘留無害）
  - 前端 3 處 isAdmin 短路移除（auth-store.ts:249、permissions/hooks.ts:284/293、usePermissions.ts 九 bool）
  - canAccess/canEdit 加 `if (workspaceFeatures.loading) return true` 避免閃 UnauthorizedPage
  - e2e `tests/e2e/admin-login-permissions.spec.ts` 守門新增
  - type-check ✅ 0 錯誤、gitnexus detect_changes LOW risk（2 個 usePermissions 符合預期）
  - 狀態 🔵 → 🟠
- 2026-04-22 11:30：William 手測 Corner 管理員登入 5 個主項目全過 ✅、PR-1a 驗收通過
- 2026-04-22 11:40：PR-1c 落地：
  - `src/app/(main)/finance/payments/page.tsx:211` — `if (!isAdmin) return UnauthorizedPage` → 改用 `usePermissions().canViewFinance`、會計/財務職務可進、純業務仍擋
  - `src/features/tours/components/tour-itinerary-tab.tsx:91` — `canEditDatabase = isAdmin || ...` → 純 permission 比對（match 'database' root 或 'database:*' tab）
  - type-check ✅ 0 錯誤
- **等 William 手測 PR-1c**（Corner 管理員點 /finance/payments 仍能進 + 點 /tours 某團行程 Tab 仍能編輯）
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
  - `scripts/test-tenants-create-seed.mjs` 一次性腳本：建 TESTAUTH workspace + 管理員（帶 Corner 管理員權限）→ Playwright 以 TESTAUTH 管理員登入 → 取 session cookies → 帶 cookies POST `/api/tenants/create` 建 TESTSEED → 查 4 職務 row 數 → 全 DELETE CASCADE 清乾淨
  - 結果：管理員 74/74、業務 40/40、會計 26/26、助理 32/32 全對齊 Corner
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
| 估時 | 3 人週（散在各處） |
| 優先級 | 🔴 上線前必改 |
| 狀態 | 🟠 **部分完成（P003-A PUT /api/permissions/features 🟢、P003-B sync-employee 🟢、其他 endpoints 待掃）** |

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
  - 攻擊情境：Corner admin 拿 JINGYAO 員工的 UUID 打這支、成功重設 JINGYAO 員工密碼
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
| 統一修法 | DB AFTER UPDATE trigger on workspace_features：enabled: true → false 時、DELETE role_tab_permissions WHERE 對應 module/tab。William 拍板：feature 重開時**不**自動恢復（admin 重勾）。注意：trigger 必須檢查 workspace_id 防跨租戶污染（幕僚 3 警告）。 |
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
