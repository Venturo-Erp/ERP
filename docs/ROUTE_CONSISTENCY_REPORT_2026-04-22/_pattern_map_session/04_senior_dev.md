# 04 · Senior Developer — 權限雙層 SSOT 破碎 · Blast Radius & 漸進路徑

> 角色：資深工程實作者 · Date: 2026-04-22
> 病症：雙層檢查（FEATURES × MODULES）+ 兩份清單未連結 + sidebar 全站依賴 `isFeatureEnabled`
> 輸出目的：不動代碼、只做風險評估 + 漸進遷移路徑 + gate/測試策略

---

## 1. Blast Radius（gitnexus_impact 實跑）

### 🔴 HIGH / CRITICAL

| Symbol                                                   | Risk     | d=1                          | d=2 | 備註              |
| -------------------------------------------------------- | -------- | ---------------------------- | --- | ----------------- |
| `useWorkspaceFeatures` (`src/lib/permissions/hooks.ts`)  | **HIGH** | **11**                       | 3   | 全站「牆」級 hook |
| `getFeaturesByRoute` (`src/lib/permissions/features.ts`) | **HIGH** | 1 (→ `useWorkspaceFeatures`) | 11  | 透過 hook 傳導    |

`useWorkspaceFeatures` 的 11 個 d=1（WILL BREAK）直接調用點：

1. `Sidebar` — 全站選單牆（conf 0.5，但看 L440 實證確實依賴）
2. `ModuleGuard` — 路由守門
3. `RolesPage` — 職務管理本身（雙層檢查震央）
4. `OrderListView`
5. `MemberActions`
6. `EmployeeForm`
7. `TourBasicInfo`
8. `TourControllerSection`（settings/company 子段）
9. `DepartmentsSection`（settings/company 主頁）
10. `useVisibleModuleTabs`（內部重用）
11. `usePermissions`（內部重用）

d=2 往 `TourDetailPage`、`TourTabs`、`ResetDBPage` 擴散。**影響 2 個 execution flow（TourDetailPage、RolesPage）且 earliest_broken_step=1**（即流程第一步就斷）。

### ⚪ 符號沒入 gitnexus 索引（= 不是 top-level export）

`isFeatureEnabled`、`isTabEnabled` 是 `useWorkspaceFeatures` 內的 `useCallback` 閉包，不是獨立符號。它們的 blast radius **等於宿主 hook 的 blast radius**（即 HIGH, 11 direct）。這解釋了為什麼搜不到。

`checkPermission`、`MODULES`、`FEATURES`、`PREMIUM_FEATURE_CODES` — gitnexus 目前索引 function/class，常數陣列不在圖內。我用 grep 校驗：`MODULES` 實際被 `hr/roles/page.tsx:24`、以及 settings/company 系列使用，影響面與 `useWorkspaceFeatures` **重疊 ≈ 90%**（同一批 11 個檔案）。所以實務上可視作「耦合在一起的一個群集」。

### 結論：這不是 11 個獨立修法點，是一個「7 檔共生群」

- Hook（`hooks.ts`）
- 資料（`features.ts` + `module-tabs.ts`）
- 消費（`sidebar.tsx` + `roles/page.tsx` + `settings/company/*` + 4 個 feature 元件）

**改動要跨這 7 個檔才能算完整。** 只改 hook 不改 sidebar，選單會炸；只改 sidebar 不改 roles page，職務表會對不上。

---

## 2. Sidebar 的 `requiredPermission` 對應新世界

現況：`sidebar.tsx` 中 `MenuItem.requiredPermission: string` 值都是 FEATURES.code（`'tours'`、`'finance'`、`'accounting'`…），L540-544 用 `isFeatureEnabled(item.requiredPermission)` 擋。

**合一後（William 傾向層 1：MODULE_REGISTRY）對應方式**：

```ts
// 方案 A（最小侵入）：requiredPermission 改指 MODULE_REGISTRY.code
// 因為新 registry 是「FEATURES + MODULES 的合集」、code 保持一致
//   → sidebar 不用改、只改 hook 內部實作改查 registry
// 方案 B（對齊 role 權限）：requiredPermission 兩用
//   - workspace 層：isFeatureEnabled（還是需要、因為租戶要能關模組）
//   - user 層：checkPermission(item.requiredPermission + ':view')
//   → sidebar L540-568 其實已經雙檢（L541 feature + L568 user permission）
```

**關鍵發現**：sidebar L541 + L568 **已經是雙層**（workspace feature + user permission），只是命名亂。真正要改的是「資料源」而非「檢查邏輯」—— 讓 `isFeatureEnabled` 背後查的是 MODULE_REGISTRY 而不是 FEATURES × MODULES 兩張表。

---

## 3. 層 1→2→3 Step-by-step Plan

### 層 1：MODULE_REGISTRY 合一（預計 4-6h、LOW risk）

1. 新建 `src/lib/permissions/module-registry.ts`，把 `FEATURES` 與 `MODULES` 合成一份，保留 backward-compat export（`export const FEATURES = MODULE_REGISTRY.map(...)`、`MODULES` 同）
2. 驗證：`npm run type-check` + 跑 `tests/e2e/tab-gating.spec.ts`
3. **沒 breaking change**、只是加一層

**Break 風險**：極低。純資料結構重組，消費端原名稱仍可用。

### 層 2：使用端單層（預計 2-3d、MEDIUM risk）

1. 先改 `hooks.ts`：`isFeatureEnabled` 與 `isTabEnabled` 合併成 `canAccess(moduleCode, tabCode?)`、背後查 MODULE_REGISTRY + `workspace_features` 表
2. 保留舊 API 當 deprecated alias（`@deprecated` 注記、內部呼叫新 API）
3. 跨 7 檔把消費端逐一換到新 API（roles page 的 `MODULES.filter + isFeatureEnabled + isTabEnabled` 三段式變一段 `getVisibleStructure()`）
4. 每檔改完跑 `gitnexus_impact` 驗證沒踩到隱形依賴

**Break 風險**：sidebar 的 useMemo dep array（L573-585）要跟著改、忘了會造成「切租戶選單不更新」（有 session 殘影）。

### 層 3：DB trigger cascade（預計 1-2d、HIGH risk）

1. 寫 `after_insert_on_workspaces` trigger：自動 seed 所有 MODULE_REGISTRY 項目為 `workspace_features` row（`enabled` 依 category 預設）
2. 寫 `after_update_on_workspaces.premium_enabled` trigger：付費大開關關掉時 cascade 到所有 premium rows
3. 驗證：`tests/e2e/login-api.spec.ts` 不能破（RLS 紅線）+ 新建租戶流程測試
4. 舊 workspace 用一次性 migration backfill

**Break 風險**：⚠️ **這層動 RLS/trigger 必呼叫 `venturo-safe-tenant-test`**（CLAUDE.md 紅線）。`workspaces` 表的 FORCE RLS 陷阱是真實歷史血債（2026-04-20）。

---

## 4. 可以漸進式嗎？可以，而且應該

**建議順序：層 1 → 層 3 → 層 2**（不是 1→2→3）

原因：

- 層 1 只加不減，**零破壞**、先落地
- 層 3 在層 2 之前做，讓 DB 先變乾淨（所有 workspace 有完整 seed row）、層 2 的 hook 簡化才有底氣（可以假設 row 一定存在）
- 層 2 最後做，因為它同時改 API + 消費端，需要前兩層打好地基

**每層之間可以停**：層 1 做完就能 ship，層 2 做一半可以 freeze（舊 API 還在當 alias）。這就是 revertable。

**不要一次切**的理由：11 個 d=1 + 2 個 execution flow + earliest_broken_step=1 = 一刀切等於「整個系統所有角色頁 + sidebar 同時壞」，生產事故風險太高。

---

## 5. 測試策略

### 現有覆蓋率（實查）

- **整合測試** `tests/integration/`：6 個，**都是業務流程**（tour-lifecycle、order-flow、financial-flow…）、**沒有權限專項**
- **E2E** `tests/e2e/`：有 `tab-gating.spec.ts`（tab 層 gating）、`login-api.spec.ts`（登入紅線）、`auth.spec.ts`
- **unit/permissions 測試**：`find tests -name '*permission*'` 回空 — **零 unit 覆蓋**

這是紅旗。重構前應該**先補 unit**。

### 重構前必補（建議 1 天）

1. `tests/lib/permissions.test.ts` — 覆蓋 `useWorkspaceFeatures` 的 8 個分支（快取命中、workspace 切換、premium 關+feature 開、basic default-deny…）
2. `tests/e2e/role-permission.spec.ts` — 覆蓋 `roles/page.tsx` 的三段式過濾（MODULES.filter + isFeatureEnabled + isTabEnabled 合體）

### 重構每階段必跑

| 階段    | type-check | lint | tab-gating e2e | login-api e2e | 新加 unit | 新加 role-perm e2e |
| ------- | ---------- | ---- | -------------- | ------------- | --------- | ------------------ |
| 層 1 後 | ✅         | ✅   | ✅             | —             | ✅        | —                  |
| 層 3 後 | ✅         | ✅   | ✅             | **✅ 必跑**   | ✅        | —                  |
| 層 2 後 | ✅         | ✅   | ✅             | ✅            | ✅        | ✅                 |

---

## 6. CI/Gate 設置

**現況**（`.github/workflows/ci.yml` + `.husky/pre-commit`）：

- pre-commit：type-check + 禁 `@ts-expect-error` + 警告 console.log
- CI `quality`：format:check + lint + type-check
- CI `build`：next build（失敗擋 merge）
- **沒有跑 e2e**、**沒有跑 integration**、**沒有跑 vitest**

### 此次重構應加的 gate

1. CI 加 `npm run test`（vitest）job，擋層 1 常數結構破壞
2. CI 加 `npm run test:e2e:smoke` + `tab-gating.spec.ts`，擋層 2 UI 連動斷裂
3. 層 3 migration 前本地 **必跑** `login-api.spec.ts`（CLAUDE.md 硬性規定）
4. 新增 `npm run audit:code-quality` 到 PR checklist（已有 script 但未接 CI）

---

## 7. 「不傷筋動骨的準備」（Do This First）

按風險從低到高、立即可做：

1. **把 hard-code 抽常數**（零風險、1h）
   - `sidebar.tsx` 的 `requiredPermission: 'tours'` 等 18+ 處散落字串 → `import { FEATURE_CODES } from '@/lib/permissions/codes'`
   - 這樣未來改 code 名稱編譯器會報錯、不會 silent break

2. **補 JSDoc 標記「這是 SSOT」**（零風險、30min）
   - `FEATURES`、`MODULES` 頂部加 `@ssot` 注記 + 「修改前必讀 PATTERN_MAP.md」
   - 未來 Claude session 讀到會留意

3. **補 unit test 覆蓋現況**（低風險、1d）
   - 凍結當前行為，之後重構有回歸保障

4. **把 `useVisibleModuleTabs` 的雙層邏輯抽純函式**（低風險、2h）
   - `isTabVisible(module, tab, features, premiumEnabled)` 拉出 hook 成 pure function
   - 可獨立測試、也為層 2 的 `canAccess` 鋪路

5. **寫一份 MIGRATION.md 草稿**（0 代碼、2h）
   - 明確寫出「層 1 產物」「層 2 產物」「層 3 產物」
   - 每層的 rollback plan（revert commit range）

做完這 5 項、才啟動層 1。

---

## 8. 資深工程結論（TL;DR）

- **HIGH risk**、但 **可漸進**。不是刀口擺著不敢切、是要先舖路
- **順序：層 1 → 層 3 → 層 2**（不是直覺的 1→2→3）
- **每層 revertable**：層 1 純加不減、層 3 有 migration rollback、層 2 保留 deprecated alias
- **最大盲點**：unit test 零覆蓋、CI 沒跑 e2e —— **補測試比動 hook 更急**
- **紅線提醒**：層 3 碰 RLS/trigger、必呼叫 `venturo-safe-tenant-test`、`login-api.spec.ts` 必過
- **總工期估**：準備 5 項 ≈ 1.5d + 層 1 ≈ 0.5d + 層 3 ≈ 1.5d + 層 2 ≈ 2.5d = **約 6 個工作天**。一次切等不到、分 3 PR 各自 review 是正解

---

_Senior Developer · 2026-04-22 · 不動代碼、只給路徑_
