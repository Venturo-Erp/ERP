# 01 · Software Architect

## 身份宣告

我是 Software Architect。我設計能比團隊活得更久的系統，每個決策都有 trade-off，我的工作是把它說出口。看到 `FEATURES` 和 `MODULES` 兩本清單、靠工程師記憶同步的那一刻，我嗅到的不是 bug，是**領域邊界錯位**的結構訊號。

---

## 發現的 pattern

### P-ARCH-01 · Feature Catalog 雙形態、缺 SSOT registry 🔴
**現況描述**
同一個領域概念（「系統可提供的功能單元」）被切成兩個不同 shape 的清單：
- `FEATURES[]`：視角是「路由 / 計費方案」，key=feature_code，附 category (basic/premium/enterprise) 和 routes[]。對應 DB `workspace_features` row。
- `MODULES[]`：視角是「模組 + 分頁 + 資格」，key=module_code，tabs[] 含 isEligibility、category。對應 DB `role_tab_permissions`。

兩者沒有任何型別或常數互相 reference。`hooks.ts` 的 `isFeatureEnabled(code)` 查 FEATURES 維度，`isTabEnabled(moduleCode, tabCode)` 查 `{module}.{tab}` 維度——**同一張 `workspace_features` 表被兩種 key schema 寫入**（`'tours'` vs `'tours.contract'`），靠字串約定不靠型別。

**影響檔案**
- `src/lib/permissions/features.ts`（FEATURES 本體）
- `src/lib/permissions/module-tabs.ts`（MODULES 本體）
- `src/lib/permissions/hooks.ts:140-185`（兩個形態的消費點）
- `src/app/(main)/hr/roles/page.tsx:43-52`（`MODULES.filter(isFeatureEnabled(m.code))` — 直接把 module.code 當 feature.code 用、隱含兩本 code 必須同名）
- `src/components/layout/sidebar.tsx:440,541`（只問 FEATURES）
- `src/app/api/auth/validate-login/route.ts:160-175`（只寫 MODULES 維度到 JWT）

**修法建議**
引入 `MODULE_REGISTRY`（William 方案的層 1），但**不是**把 FEATURES 和 MODULES 平鋪合併，而是讓 registry 定義**單一聚合根**：
```ts
MODULE_REGISTRY: {
  code: 'tours',
  routes: [...],           // FEATURES 的 routes
  plan: 'basic'|'premium', // FEATURES 的 category
  tabs: [...],             // MODULES 的 tabs
  eligibilities: [...],    // MODULES 的 isEligibility
}
```
`FEATURES` 和 `MODULES` 降級為**從 registry 派生的 view**，保留舊 API（`getFeatureByCode` / `getModuleByCode`）當 adapter，讓消費端零改動。

**優先級** 🔴（是其他 pattern 的根）
**估時** 4–6h（含型別收斂、adapter、hr/roles 回歸測）

---

### P-ARCH-02 · Runtime 權限雙源讀取、缺 single decision function 🔴
**現況描述**
「這個 tab 能不能看」現在要**雙查 + AND**：
1. `workspace_features` 有沒有開（`isFeatureEnabled` / `isTabEnabled`）— 租戶方案閘道
2. JWT `user.permissions` 有沒有這個 `module:tab` — 職務 RBAC 閘道

而且兩邊 key 不一致（前者 `tours.contract`、後者 `tours:contract`——分隔符不同！），任何消費端都要記得兩邊都查、用對符號、AND 起來。`usePermissions.canAccess` 只看 `isRouteAvailable` 沒看 tab 級權限。`sidebar.tsx` 只查 feature 沒查 role。`hr/roles/page.tsx` 同時查兩者但是用在「顯示可設定項」而非「訪問守門」。

**這是典型的 Anemic Permission Model——決策邏輯散佈在消費端**、不存在一個 `canAccess(user, resource)` 的權威函式。

**影響檔案**
同上全體、特別是 `hooks.ts` `usePermissions` 和每個消費頁。

**修法建議**
層 2（William 方案）+ 我加一條：
- 建 `src/lib/permissions/policy.ts`、導出 `canAccessTab(user, moduleCode, tabCode): Decision`
- Decision 回 `{allowed: bool, reason: 'feature_off'|'role_deny'|'admin'|'ok'}`——可觀測
- 消費端**只呼叫 policy**，不再自己 AND
- 統一 key 分隔符（選一個、`.` 或 `:`，我建議 `.` 跟 DB 一致）

**優先級** 🔴 **估時** 3–4h

---

### P-ARCH-03 · 狀態遷移無 cascade、SSOT 在邊界被沖刷 🟡
**現況描述**
關 feature 時（`workspace_features.enabled = false`）、`role_tab_permissions` 不 cascade 清除。重開 feature、舊的 role 授權自動「復活」。這違反 William 的意圖（「重開要 admin 重勾」）。也讓 `workspace_features` 不是 SSOT——它只是「當前閘門」、role 權限是獨立保留的舊資料。

**影響檔案**
- DB：`workspace_features`、`role_tab_permissions`
- 沒有 migration、沒有 trigger

**修法建議**
層 3（William 方案）正解。我補一個細節：
- Trigger `AFTER UPDATE OF enabled ON workspace_features WHEN NEW.enabled = false` → `DELETE FROM role_tab_permissions WHERE workspace_id = NEW.workspace_id AND module_code 屬於此 feature`
- **不**做對稱 trigger（重開不自動 grant），符合 William「admin 重勾」語意
- 寫一個 SQL function `features_owned_by(feature_code)` 返回該 feature 涵蓋的 module_code list——此 function 的真相來自 MODULE_REGISTRY export 出來的 seed（CI 時校對）

**優先級** 🟡（等 P-ARCH-01 完再做）**估時** 2h

---

### P-ARCH-04 · JWT 是快照、無失效機制 🟡
**現況描述**
`validate-login` 簽 JWT 時一次讀 `role_tab_permissions` 灌進 `user.permissions`，之後每次請求都拿舊快照。admin 剛關 feature、使用者還在 session 內、JWT 不會重簽——前端靠 `isFeatureEnabled`（realtime 查 workspace_features）擋、但如果改了 P-ARCH-02 變成「只看 role permission」、JWT 的舊資料就失效無感。

**影響檔案**
- `src/app/api/auth/validate-login/route.ts:141-200`
- `src/stores/auth-store.ts:246-251`（checkPermission）

**修法建議**
兩條路、二選一：
- **A（輕）**：JWT 加 `permissions_version` claim、workspace 層 bump version 時前端 detect 並強制 refetch
- **B（重）**：每次 request middleware 重查 role_tab_permissions（加 Redis 短 TTL 快取）

William 目前規模用 A、扔個 ADR 進 `docs/` 記下為什麼不選 B。

**優先級** 🟡 **估時** A=2h / B=6h

---

### P-ARCH-05 · Sidebar 的「裸路由導航」繞過 policy 🟢
**現況描述**
`sidebar.tsx:440+` 直接用 `isFeatureEnabled`、沒走 `canAccessTab`。沒 role 的人看到 tab、點進去才被擋。UX 小問題、但也是**決策邏輯散佈**的病徵。

**修法建議**
P-ARCH-02 做完後、sidebar 改用 `policy.canAccessTab`。不急。

**優先級** 🟢 **估時** 1h

---

## 候選幕僚演進建議

Pattern Map 長出來後、建議補一個幕僚：**Domain Modeler / DDD 視角**。現有 6 靈魂偏執行面（架構、SRE、DB、安全、QA、PO），缺一個專門幫 William 畫 bounded context 的人。這次的「FEATURES vs MODULES」本質是 bounded context 沒畫、拆不乾淨的後果、未來 AI 客服、OTA 整合、會議助理這些新模組進來、沒有 DDD 視角會一直長新的 `features.ts` 孿生表。

---

## 回傳摘要（< 200 字）

這是**結構性 SSOT 破碎**、不是表面修補能解。根因：`FEATURES` 和 `MODULES` 是同一領域概念的兩種投影、但沒有共同來源，兩條消費路徑（feature 閘門 + JWT RBAC）在每個消費端各自 AND、沒有權威決策函式。

William 的三層修法方向正確、但順序與邊界要明確：
- 層 1（MODULE_REGISTRY）**必做且先做**——這是 SSOT
- 層 2（policy.canAccessTab）**必做**——收斂決策
- 層 3（DB trigger cascade）**做**——但依賴層 1 定義的「feature 擁有哪些 module」
- 加一條：JWT 失效機制（P-ARCH-04）——否則層 2 的新 policy 會被舊快照繞過

這個 pattern 是「SSOT 破碎」的母 pattern、跟 _INDEX 原則 4「狀態是真相」同源；_INDEX 可新增候選第 5 條：**「領域概念只能有一個 registry、投影可以多個」**。
