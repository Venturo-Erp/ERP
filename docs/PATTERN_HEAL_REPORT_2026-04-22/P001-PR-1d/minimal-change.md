# P001 PR-1d — Minimal-Change 守門意見

**角色**：Minimal Change Engineer（只動要動的、拒絕順手）
**基準**：CLAUDE.md `## 🧠 四大行為原則 > 3. Surgical Changes`
**範圍**：19 處 isAdmin 短路（A 11 處 hook/component + B 8 處 layout/page）

## 摘要

- **✅ 可改 13 件**、**⚠️ 小心 3 件**、**🔴 DEFER 3 件**（`permissions/index.ts:114`、`sidebar.tsx:522` 空 if、`ModuleGuard.tsx:49`）
- **本次要守的 3 件事**：
  1. **不准順手刪 `const { isAdmin } = useAuthStore()`**——本 PR 製造的孤兒才由本 PR 清（符合 CLAUDE.md 原則 3）；若檔內其他分支或 useMemo deps 還在讀 `isAdmin`、**禁動**。
  2. **不准順手重寫 layout/page 元件**——只改 `!isAdmin` 那一行；別把元件改成「順便把 UnauthorizedPage 導回 /unauthorized」「順便加 loading skeleton」——那是 PR-1a 的 canAccess loading 放行的職責，已完成。
  3. **不准順手改 `hasPermissionForRoute(index.ts:114)`**——被 `src/lib/auth-guard.tsx` 的 `checkAuth` 和 `usePermissionCheck` 兩處呼叫、影響範圍橫跨整個 AuthGuard 執行流、改了會波及所有受保護路由。DEFER。

---

## 逐點判定

### A1 `src/components/layout/mobile-sidebar.tsx:260` — `if (isAdmin) return item`

- 判定：✅ **可改**
- 具體改什麼行：**只刪 L259-260 這兩行**（註解 `// 系統主管有所有權限` + `if (isAdmin) return item`）。L261 `return userPermissions.includes(item.requiredPermission) ? item : null` 保留、已是正確 fallback。
- 絕對不可順手改：
  - ❌ 刪 `isAdmin` state / destructure（其他地方可能還在用、grep 該檔全文確認孤兒才刪）
  - ❌ 重寫 `filterMenuByPermissions` 整支
  - ❌ 改 useMemo deps 陣列風格
- 理由：系統主管職務 已 PR-1a backfill 過、走 `userPermissions.includes(...)` 等價正確。

---

### A2 `src/components/layout/sidebar.tsx:522` — `if (isAdmin) { ... }` 空塊

- 判定：🔴 **DEFER**
- 具體改什麼行：本 PR **不動**。
- 絕對不可順手改：
  - ❌ 不要「順手清掉空 if」──這是技術債、但不在 P001 修法範圍
  - ❌ 不要「順便重組 visibleMenuItems useMemo」
- 理由：L522-524 是空 if+註解（「直接進入完整選單過濾邏輯」）、刪了以後 L525 的 `else if (isTransport) return transportMenuItems` 會對整個函式造成**控制流改變**（系統主管 改走 transportMenuItems 分支、炸掉車行 系統主管 體驗）。這是 sidebar 整體重構的議題、不是 P001 拔短路。建議 DEFER 到 sidebar 重構 PR。

---

### A3 `src/components/layout/sidebar.tsx:565` — `if (isAdmin) return item`

- 判定：✅ **可改**
- 具體改什麼行：**只刪 L564-565 兩行**（註解 `// '*' 代表擁有所有權限` + 條件式）。L566-568 的 prefix-match 保留、已是正確的權限比對（例如 `tours` 匹配 `tours:overview`）。
- 絕對不可順手改：
  - ❌ 不可刪 L509 的 `const { isAdmin } = useAuthStore()`——L522（A2 DEFER）、L579/L596（A4）、L600 useMemo deps 都還在用
  - ❌ 不可改 prefix-match 的寫法
- 理由：prefix-match fallback 對 系統主管 backfilled role 等價正確。

---

### A4 `src/components/layout/sidebar.tsx:596` — `if (isAdmin) return true`

- 判定：⚠️ **小心**
- 具體改什麼行：**只刪 L595-596 兩行**。保留 L597-598 `const perm = item.requiredPermission; return userPermissions.some(...)`。
- 絕對不可順手改：
  - ❌ 不可刪 `isAdmin` destructure（A2 空 if 還在讀）
  - ❌ 不可從 L600 useMemo deps 陣列移除 `isAdmin`——A2 還在讀、移了會閉包過期
  - ❌ 不可合併 A3+A4 變成 helper 函式（3 次重複 < 4、CLAUDE.md 原則 2）
- 理由：只要 A2 DEFER、`isAdmin` 仍是 live reference、不能當孤兒清。

---

### A5-A8 `src/lib/permissions/useTabPermissions.tsx:80,97,113,122` — 4 處 `if (isAdmin) return true`

- 判定：✅ **可改（4 處同時動）**
- 具體改什麼行：**只刪每個 useCallback 裡的 `if (isAdmin) return true` 與其上一行註解 `// 系統主管擁有所有權限`**（共 4 組、每組 2 行）。
- 絕對不可順手改：
  - ❌ 不可刪 L33 `const [isAdmin, setIsAdmin] = useState(false)`——L55 的 `setIsAdmin(true)` 還在寫、且 L131 return 物件還 export isAdmin 給消費者
  - ❌ 不可刪 L54-58 的 系統主管 shortcut fetch 路徑（那是 API 層設計、不是前端短路）
  - ❌ 不可改 4 個 useCallback deps 陣列（`[permissions, isAdmin]`）──isAdmin 還在 return 物件裡、消費者可能讀
  - ❌ 不可移除 return 物件裡的 `isAdmin`（grep 消費者前禁動）
  - ❌ 不可把 `canRead`/`canWrite`/`canReadAny`/`canWriteAny` 4 函式抽成 helper（CLAUDE.md 原則 2、4 次重複才抽）
- 理由：系統主管職務 已 backfill、`permissions` array 對 admin 也完整、fallback 等價正確。但 `isAdmin` state 本身要保留給消費者、避免造成 useTabPermissions consumer 的 breakage（超出本 PR 範圍）。

---

### A9 `src/lib/permissions/index.ts:114` — `if (isAdmin) return true`（在 `hasPermissionForRoute` 裡）

- 判定：🔴 **DEFER**
- 具體改什麼行：本 PR **不動**。
- 絕對不可順手改：
  - ❌ 不可刪這 4 行（L113 註解 + L114-116 if 塊）
  - ❌ 不可改 `hasPermissionForRoute` 簽名（把 `isAdmin?: boolean` 拿掉）
- 理由（DEFER 依據）：
  - 這函式被 `src/lib/auth-guard.tsx:170`（`checkAuth`）和 `:216`（`usePermissionCheck`）呼叫、GitNexus 顯示參與 `AuthGuard → GetModuleFromRoute` 執行流（step 3/4）
  - 影響面是**全站 AuthGuard**、不是前端 hook 層；scope 跟 PR-1d 「前端拔短路」不同層
  - AuthGuard 是 server-ish 守門、它的 isAdmin 短路改動應歸屬 P002 / P008（後端統一 policy）的 PR
  - 本 PR 範圍明確 = 前端；不准跨層混修

---

### A10 `src/components/guards/ModuleGuard.tsx:49` — `if (isAdmin) { setChecked(true); return }`

- 判定：🔴 **DEFER**（或降級為 ⚠️ 小心並連同 AuthGuard 家族一起排）
- 具體改什麼行：本 PR **不動**。
- 絕對不可順手改：
  - ❌ 不可刪 L48-52（isAdmin 跳過檢查整段）
  - ❌ 不可順便把 ALWAYS_ALLOWED 陣列重排
- 理由（DEFER 依據）：
  - `ModuleGuard` 掛在 `src/app/(main)/layout.tsx` 全域根節點、所有 /(main)/\* 路由都經過它
  - 系統主管 若拔掉這個短路、會走 `isRouteAvailable(pathname)`（來自 `useWorkspaceFeatures`）、系統主管 的 workspace features 是否涵蓋所有路由**沒有驗過**（features table ≠ role_tab_permissions backfill）
  - 風險 > 收益：一行改動 = 全站 系統主管 可能閃 `/unauthorized`
  - 建議 DEFER 到「workspace_features × isAdmin」一致性驗過後的獨立 PR

---

### A11 `src/components/workspace/channel-sidebar/useChannelSidebar.ts:17` — `if (isAdmin) return true`（在 `canManageMembers` useMemo 裡）

- 判定：✅ **可改**
- 具體改什麼行：**只刪 L17 一行**（`if (isAdmin) return true`）。保留 L18-21 permissions.includes 檢查。
- 絕對不可順手改：
  - ❌ 不可刪 L13 `const isAdmin = useAuthStore(state => state.isAdmin)`——L22 useMemo deps 還在用（⚠️ 嚴格說 L22 deps 的 `isAdmin` 在拔短路後變 unused、允許一起清；但這是「你造成的孤兒」才清、先確認 type-check + linter 抓到才動）
  - ❌ 不可改 `canManageMembers` useMemo deps 陣列
  - ❌ 不可「順便把 workspace:manage_members / workspace:manage 的 OR 改成 helper」
- 理由：系統主管 已有 `workspace:manage_members` permission backfill、fallback 等價。

---

### B1 `src/app/(main)/accounting/layout.tsx:13` — `if (!isAdmin) return <UnauthorizedPage />`

- 判定：✅ **可改**
- 具體改什麼行：**只改 L13 一行**。從 `if (!isAdmin) return <UnauthorizedPage />` 改成 `if (!canAccess('accounting')) return <UnauthorizedPage />`（或等價的 module permission 檢查、接 `usePermissions` / `hasPermissionForRoute` 前端 hook）。
- 絕對不可順手改：
  - ❌ 不可刪 L12 `const isAdmin = useAuthStore(...)`——若完全不用、型別檢查會抓 unused、這時才允許清（屬於「改動造成的孤兒」）
  - ❌ 不可刪 L4 `import { UnauthorizedPage }`——新邏輯還會 return `<UnauthorizedPage />`
  - ❌ 不可把整個元件改寫成 generic `<PermissionGate module="accounting">`——那是抽象化 / 重構、不是本 PR 範圍（CLAUDE.md 原則 2）
  - ❌ 不可刪 L6-10 註解區塊
- 理由：只改守門條件、元件骨架不動、符合 minimal diff。

---

### B2 `src/app/(main)/database/layout.tsx:14` — `if (!isAdmin) return <UnauthorizedPage />`

- 判定：✅ **可改**
- 具體改什麼行：**只改 L14 一行**、條件換成 `canAccess('database')` 或等價。
- 絕對不可順手改：
  - ❌ 不可刪 L13 isAdmin state（若新邏輯不用才清、且只清 state 宣告、不動 import）
  - ❌ 不可合併 accounting + database layout 成 helper（2 次重複遠 < 4、CLAUDE.md 原則 2）
  - ❌ 不可動 L6-10 註解
- 理由：對稱於 B1、一行守門換邏輯。

---

### B3 `src/app/(main)/finance/settings/page.tsx:433` — `if (!isAdmin) return <UnauthorizedPage />`

- 判定：⚠️ **小心**
- 具體改什麼行：**只改 L433 一行**、條件換成對應 `canViewFinance` / `canAccess('finance:settings')` 或等價。
- 絕對不可順手改：
  - ❌ 不可刪 L4 `import { UnauthorizedPage }`（L433 新邏輯還會回傳它）
  - ❌ 不可刪 L121 `const isAdmin = useAuthStore(...)`——**除非** grep 全檔確認沒有其他地方用到（本檔 433 行、很可能還在別處引用）
  - ❌ 不可「順便重寫 getActionButton 或 tabs 邏輯」
  - ❌ 不可把 `if (!isAdmin) return <UnauthorizedPage />` 移到元件頂端（會動到 hooks 順序、React rules 衝突）
- 理由：finance/settings 內部可能多處讀 isAdmin（例如 save 按鈕 disable）、盲刪會炸。

---

### B4 `src/app/(main)/finance/treasury/page.tsx:135` — `if (!isAdmin) return <UnauthorizedPage />`

- 判定：⚠️ **小心**
- 具體改什麼行：**只改 L135 一行**、條件換成 `canViewFinance` 等模組 permission。
- 絕對不可順手改：
  - ❌ 不可刪 L14 UnauthorizedPage import（新邏輯還用）
  - ❌ 不可刪 L47 isAdmin 宣告——先 grep 檔案全文、確認 L135 以外不用才刪
  - ❌ 不可順便動 L117-131 的 transactions 合併邏輯（那是 OCD 陷阱、與守門無關）
- 理由：同 B3、內部可能有其他 isAdmin 讀取。

---

### B5 `src/app/(main)/finance/requests/page.tsx:63` — `if (!isAdmin) return <UnauthorizedPage />`

- 判定：⚠️ **小心**
- 具體改什麼行：**只改 L63 一行**、條件換成 `canAccess('finance:requests')` 等。
- 絕對不可順手改：
  - ❌ 不可刪 L6 UnauthorizedPage import
  - ❌ 不可刪 L23 isAdmin 宣告（先 grep 確認）
  - ❌ 不可「順便把 handleRowClick 重構」
  - ❌ 不可改 ListPageLayout props 風格
- 理由：OP 業務職務是這頁實際使用者、權限檢查要嚴謹；守門換 permission 必驗 role 有 `finance:requests` 或 `finance` backfill。

---

### B6 `src/app/(main)/finance/travel-invoice/page.tsx:49` — `if (!isAdmin) return <UnauthorizedPage />`

- 判定：⚠️ **小心**
- 具體改什麼行：**只改 L49 一行**、條件換成 `canAccess('finance:travel-invoice')` 等。
- 絕對不可順手改：
  - ❌ 不可刪 L11 UnauthorizedPage import
  - ❌ 不可刪 L37 isAdmin 宣告（先 grep）
  - ❌ 不可刪 L50 的空行（stylistic）
  - ❌ 不可順便改 useMemo tourOptions 的寫法
- 理由：同 B3-B5 模式。

---

### B7 `src/app/(main)/finance/reports/page.tsx:96` — `if (!isAdmin) return <UnauthorizedPage />`

- 判定：⚠️ **小心**
- 具體改什麼行：**只改 L96 一行**、條件換成 `canViewFinance` 或 `canAccess('finance:reports')`。
- 絕對不可順手改：
  - ❌ 不可刪 L6 UnauthorizedPage import
  - ❌ 不可刪 L61 isAdmin 宣告（先 grep）
  - ❌ 不可改 L85-94 tabs 陣列（與守門無關）
  - ❌ 不可動 ContentPageLayout props 風格
- 理由：同 B3-B6。

---

### B8 `src/app/(main)/settings/components/WorkspaceSwitcher.tsx:16` — `if (!isAdmin) return`（在 useEffect 裡 early-return）

- 判定：🔴 **DEFER**（候選、主席可再議）
- 具體改什麼行：本 PR **不動**、或至少 **不套 canAccess 改法**。
- 絕對不可順手改：
  - ❌ 不可把 `if (!isAdmin) return` 改成 `if (!canAccess('workspace:switch')) return`——`canAccess('workspace:switch')` 這個 permission key 不一定存在、硬換會讓「系統主管 以外永遠拿不到」
  - ❌ 不可刪 L27 的第二個 `if (!isAdmin) return null`（return component null 的那個、語意不同、是顯示控制）
  - ❌ 不可移除 L11 的 `isAdmin` destructure（L16、L24、L27 全都還在用）
- 理由（DEFER 依據）：
  - L16 是 useEffect 內 early-return、不等於「頁面大鎖」——它只是「系統主管才載 workspaces 列表」的優化
  - L27 的 `return null` 才是顯示控制、但這屬於 UI 元件本身的業務含義（「這元件本來就擁有管理員資格-only 工具」）、拔了得重新定義這元件給誰用
  - 本 PR 範圍是「細權限取代 系統主管大鎖」；WorkspaceSwitcher 目前是跨租戶切換器、業務語意就是只給 擁有平台管理資格的人 用、硬改 canAccess 等於**改變產品行為**、不是拔短路
  - 建議 DEFER 到 系統主管 dashboard / 擁有平台管理資格的人 tooling 的獨立 PR

---

## 否決清單（幕僚 1 可能會想做、你不准）

- [ ] **刪 `const { isAdmin } = useAuthStore()` from `mobile-sidebar.tsx`**（A1 改完後看似 unused、但要 grep 全檔確認、且檔內其他處可能仍讀）
- [ ] **刪 `sidebar.tsx:509` 的 `isAdmin` destructure**（A2 DEFER + A3+A4 還在讀、禁動）
- [ ] **刪 `useTabPermissions.tsx` 的 `isAdmin` state + return 物件的 `isAdmin` export**（下游 consumer 未驗、禁動、屬於獨立 PR「清 useTabPermissions.isAdmin API」）
- [ ] **把 `canRead` / `canWrite` / `canReadAny` / `canWriteAny` 4 個 useCallback 抽成 helper** — 3 次重複 < 4、CLAUDE.md 原則 2 禁抽
- [ ] **順手清 `accounting/layout.tsx` / `database/layout.tsx` 的註解區塊**（L6-10 Wave 2 Batch 記錄、跟守門無關）
- [ ] **把 5 個 finance 子頁的 `if (!isAdmin) return <UnauthorizedPage />` 抽成 `<FinanceGate>` 共用元件** — 5 次重複、看似到 4 次門檻了、但 **不同頁 permission key 不同**（settings/treasury/requests/travel-invoice/reports）、抽了會被 props 參數化稀釋成「殼」、本 PR 範圍是拔短路、不是建抽象
- [ ] **把所有 `const isAdmin = useAuthStore(state => state.isAdmin)` 改成 `useIsAdmin()` helper hook** — 純風格化重構、禁
- [ ] **順手修掉 `travel-invoice/page.tsx:49-51` 那個雙空行** — 風格、禁
- [ ] **順手把 `treasury/page.tsx:123` 的 `pr.status === 'paid' ? '已付款' : pr.status === 'approved' ? '已核准' : '待審核'` 三元式重構成 lookup table** — OCD、禁
- [ ] **順手改 `ModuleGuard.tsx` 的 `ALWAYS_ALLOWED` 陣列 / `PUBLIC_ROUTES` 陣列** — DEFER 對象、禁動

---

## DEFER 清單（本 PR 不要做）

1. **`src/components/layout/sidebar.tsx:522` 空 if 塊** — 刪了會改變系統主管 走 transportMenuItems 分支的控制流、是 sidebar 重構議題、非 P001 拔短路。DEFER 到 sidebar 重構 PR。

2. **`src/lib/permissions/index.ts:114` `hasPermissionForRoute` 的 isAdmin 短路** — 被 `auth-guard.tsx` 的 `checkAuth` / `usePermissionCheck` 兩處呼叫、參與全站 AuthGuard 執行流（GitNexus AuthGuard → GetModuleFromRoute step 3/4）、影響面橫跨所有受保護路由。屬 P002 / P008 後端統一 policy 範圍、不在前端拔短路 scope。DEFER。

3. **`src/components/guards/ModuleGuard.tsx:49` 系統主管 跳過檢查** — 掛在 `/(main)/layout.tsx` 全域根節點、所有主框架路由都過它。拔了會讓系統主管 走 `isRouteAvailable(pathname)` 查 workspace_features、但 系統主管 的 features 是否涵蓋所有路由**尚未驗**（features table ≠ role_tab_permissions backfill）。一行改動 = 全站 系統主管 可能閃 `/unauthorized`。DEFER 到獨立「workspace_features × isAdmin 一致性驗」的 PR。

4. **`WorkspaceSwitcher.tsx:16` useEffect 內 `if (!isAdmin) return`** — 這元件業務語意本身就是「擁有平台管理資格的人 跨租戶切換器」、L16 是載資料的優化、L27 是顯示控制、拔了等於改變產品定義。建議 DEFER 到 擁有平台管理資格的人 tooling PR。

---

## Scope 自檢總表

| 分類                                      | 命中點                          | 判定                        |
| ----------------------------------------- | ------------------------------- | --------------------------- |
| A1 mobile-sidebar.tsx:260                 | `if (isAdmin) return item`      | ✅                          |
| A2 sidebar.tsx:522                        | 空 if 塊                        | 🔴 DEFER                    |
| A3 sidebar.tsx:565                        | `if (isAdmin) return item`      | ✅                          |
| A4 sidebar.tsx:596                        | `if (isAdmin) return true`      | ⚠️（配合 A2 DEFER）         |
| A5-A8 useTabPermissions.tsx:80/97/113/122 | 4 處 `if (isAdmin) return true` | ✅（4 處統一、禁抽 helper） |
| A9 permissions/index.ts:114               | `hasPermissionForRoute` 內短路  | 🔴 DEFER                    |
| A10 ModuleGuard.tsx:49                    | 系統主管 跳過 guard             | 🔴 DEFER                    |
| A11 useChannelSidebar.ts:17               | `if (isAdmin) return true`      | ✅                          |
| B1 accounting/layout.tsx:13               | layout 大鎖                     | ✅                          |
| B2 database/layout.tsx:14                 | layout 大鎖                     | ✅                          |
| B3 finance/settings/page.tsx:433          | page 大鎖                       | ⚠️                          |
| B4 finance/treasury/page.tsx:135          | page 大鎖                       | ⚠️                          |
| B5 finance/requests/page.tsx:63           | page 大鎖                       | ⚠️                          |
| B6 finance/travel-invoice/page.tsx:49     | page 大鎖                       | ⚠️                          |
| B7 finance/reports/page.tsx:96            | page 大鎖                       | ⚠️                          |
| B8 WorkspaceSwitcher.tsx:16               | useEffect early-return          | 🔴 DEFER                    |

**PR 預估 diff 行數**：

- 本次建議修 13 件（A1、A3、A4、A5-A8、A11、B1-B7）
- 每件改動 1-3 行（含刪註解）、5 個 finance page 可能多 2 行（canAccess import + 替換）
- 總計 ≈ 30-50 行 diff、符合 CLAUDE.md 原則 3「精簡」

**Follow-up PR 建議**：

- PR-1e（sidebar 重構）：處理 A2 空 if
- PR-P008 相關：處理 A9（lib）、A10（ModuleGuard）
- PR-平台管理資格：處理 B8 WorkspaceSwitcher

---

_Minimal Change Engineer 署名：本 PR 的成功指標 = diff < 60 行、touch ≤ 13 檔案、0 處順手清理、0 處 helper 抽象、0 處風格改動。_
