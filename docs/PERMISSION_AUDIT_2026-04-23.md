# 權限系統稽核報告 — HR 設定為單一標準

**日期**：2026-04-23
**稽核範圍**：`src/app/(main)/**/page.tsx`、`src/app/(main)/**/layout.tsx`、`src/features/**/*.tsx`、`src/components/**/*.tsx`
**不在此次範圍**：`src/lib/permissions/`（SSOT 本身）、`src/app/(auth)/`、`src/app/api/`

## TL;DR

UI 層的權限檢查目前並存三套：

| 系統 | 例子 | 狀態 |
| --- | --- | --- |
| ✅ `useTabPermissions.canRead/canWrite(module, tab)` | finance/requests、finance/reports、finance/treasury、finance/settings、accounting/layout、database/layout、attraction-selector、WorkspaceSwitcher | 唯一讀 `role_tab_permissions`（HR 職務管理設定的） |
| ⚠️ `usePermissions`（`src/hooks/usePermissions.ts`） | finance/payments、AdvanceListCard、OrderListCard | 模組級 bool、讀 `user.permissions` 字串陣列 |
| ⚠️ 裸字串 `user.permissions.includes(...)` / `isAccountant` / `useRolePermissions`（空殼） | AddReceiptDialog、ReceiptConfirmDialog、AddRequestDialog、tour-itinerary-tab、useChannelSidebar、settings/page、AttractionsDialog | 完全繞過 HR 職務設定 |

**最該優先處理的 3 個熱點**（HR 改職務 → 實際權限不變）：

1. `finance/payments/page.tsx` 頁面本身用 `canViewFinance`（`usePermissions`）— HR 把「收款管理」關掉也擋不住。
2. `AddReceiptDialog` / `ReceiptConfirmDialog` / `AddRequestDialog` 三個 dialog 的「編輯/確認/刪除/公司請款 tab」都靠 `isAccountant = isAdmin || permissions.includes('accounting')` 守 — HR 沒辦法細分「這個會計只能收款、不能確認核帳」。
3. `AttractionsDialog` 用 `useRolePermissions.canWrite('/database')` — 這個 hook 是空殼（`permissions` 永遠是 `[]`），實際永遠 `return true`，readOnly 永遠 false；等於沒 gate。

---

## 模組分解

### 模組：finance

#### /finance（`src/app/(main)/finance/page.tsx`）

**頁面層**
- 檔案：`src/app/(main)/finance/page.tsx:26`
- 現況：**完全沒有權限 gate** ❌。這是 finance 模組的入口頁（總覽 + 4 張統計卡 + 交易列表），任何能進 `(main)` 的人都看得到。
- 仰賴：`src/components/layout/sidebar.tsx:137` 用 `requiredPermission: 'finance'` 隱藏側邊欄入口；但直接輸入 `/finance` URL 沒擋。
- 建議：加 `canReadAny('finance')` gate（若只要任一 finance tab 就放行）。

#### /finance/payments（收款管理）

**頁面層**
- 檔案：`src/app/(main)/finance/payments/page.tsx:15,62,224`
- 現況：用 `usePermissions().canViewFinance` ⚠️。底層是 `hasModulePermission(perms, 'finance') || hasModulePermission(perms, 'accounting')`，granularity 掉到模組級。
- 建議：改 `useTabPermissions.canRead('finance', 'payments')`。
- tab 定義：`finance.payments` 已存在 ✅。

**Action 層（同頁 dialog 由上游傳入，不另 gate 開啟）**
- `AddReceiptDialog`：開啟按鈕 `setIsDialogOpen(true)` 沒檢查（page.tsx:241）。建議：按鈕顯示/觸發用 `canWrite('finance', 'payments')`。
- `BatchReceiptDialog`：目前 UI 沒按鈕觸發（`setIsBatchDialogOpen` 僅宣告、未綁按鈕）；若之後開放，需補 `canWrite('finance', 'payments')`。

#### /finance/payments 相關 Dialog

**`src/features/finance/payments/components/AddReceiptDialog.tsx:87-93,542,644`**
- 現況：
  ```ts
  const { user, isAdmin } = useAuthStore()
  const isAccountant = isAdmin || user?.permissions?.includes('accounting')
  const canEdit = !isConfirmed || isAccountant
  const canConfirm = isAccountant && isEditMode && !isConfirmed
  ```
- 建議：
  - `canEdit` → `canWrite('finance', 'payments')`
  - `canConfirm`（決定能不能「確認核帳」）→ `canWrite('finance', 'payments-confirm')`（tab 已定義）
- 影響：現在 accounting 模組任一權限都能確認核帳，HR 沒辦法把「只能填單、不能核帳」的會計分開。

**`src/features/finance/payments/components/ReceiptConfirmDialog.tsx:54-57`**
- 現況：`isAccountant = isAdmin || user?.permissions?.includes('accounting')`，`canDelete = isAccountant || isCreator`。
- 建議：`canDelete = canWrite('finance', 'payments') || isCreator`。
- 注意：刪除收款單在 `finance.payments` 寫入權限下合理；若要再細分「確認後才能刪」，可用 `payments-confirm`。

#### /finance/requests（請款管理）

**頁面層**
- 檔案：`src/app/(main)/finance/requests/page.tsx:5,24,65`
- 現況：`canRead('finance', 'requests')` ✅
- tab 定義：`finance.requests` 已存在 ✅

**Action 層：`src/features/finance/requests/components/AddRequestDialog.tsx:143-147,1011,1341`**
- 現況：
  ```ts
  const isAdmin = useAuthStore(state => state.isAdmin)
  const canCreateCompanyPayment = useMemo(() => {
    if (!currentUser?.permissions) return false
    return isAdmin || currentUser.permissions.includes('accounting')
  }, [currentUser?.permissions, isAdmin])
  ```
  這個 flag 控制「公司請款」tab 是否顯示。
- 建議：改 `canWrite('finance', 'requests-company')`（tab 已定義 ✅）。

#### /finance/treasury（金庫總覽）

- 檔案：`src/app/(main)/finance/treasury/page.tsx:13,48,137`
- 現況：`canRead('finance', 'treasury')` ✅

#### /finance/treasury/disbursement（出納管理）

- 檔案：`src/app/(main)/finance/treasury/disbursement/page.tsx`
- 現況：**頁面本身沒有 gate** ❌。目前依賴 sidebar 隱藏入口和 `finance` 模組整體過濾。
- 建議：加 `canRead('finance', 'disbursement')`。
- tab 定義：`finance.disbursement` 已存在 ✅。

#### /finance/reports（財務報表）

- 檔案：`src/app/(main)/finance/reports/page.tsx:62,98`
- 現況：`canRead('finance', 'reports')` ✅

#### /finance/reports/unpaid-orders（未收款訂單）

- 檔案：`src/app/(main)/finance/reports/unpaid-orders/page.tsx:46`
- 現況：**頁面本身沒有 gate** ❌
- 建議：加 `canRead('finance', 'reports')`（或新增專用 tab）。

#### /finance/settings（財務設定：付款方式/科目/銀行）

- 檔案：`src/app/(main)/finance/settings/page.tsx:123,435-436`
- 現況：`canRead('finance', 'settings')` ✅
- 注意：進頁用 `canRead`，但頁內按鈕（新增付款方式、刪除銀行帳戶等）未細分 read/write — 若要區分「看得到但改不了」需補 `canWrite('finance', 'settings')` 的 disabled 控制。

---

### 模組：accounting

**Layout 層：`src/app/(main)/accounting/layout.tsx:3,13,15`**
- 現況：`canReadAny('accounting')` ✅。涵蓋所有 6 個子路由。

**子頁面**（accounts / checks / period-closing / reports / reports/{balance-sheet,general-ledger,income-statement,trial-balance} / vouchers）
- 現況：**子頁面層沒有自己的 gate**，完全仰賴 layout。
- 評估：目前 OK，因為 layout 用 `canReadAny` 只守「有任一 accounting 權限」就放行；子頁面若要細分（例：讓某職務只能看 vouchers 不能看 checks）要另外在每個 page.tsx 加 `canRead('accounting', '<tab>')`。
- 建議：先不動，等 HR 有需要再細分。

---

### 模組：hr

#### /hr（員工列表）
- 檔案：`src/app/(main)/hr/page.tsx:39`
- 現況：讀了 `isAdmin` 但**沒拿來 gate 頁面**，只在後面一些按鈕邏輯可能會用到。頁面任何進得來 `(main)` 的 user 都看得到員工列表。
- tab 定義：`hr.employees` 已存在 ✅。
- 建議：加 `canRead('hr', 'employees')`。

#### /hr/roles（職務管理 — 本次稽核的 SSOT 設定頁）
- 檔案：`src/app/(main)/hr/roles/page.tsx:35,421-441`
- 現況：`if (!isAdmin) return <權限不足>` ⚠️ 只用 auth-store 的 `isAdmin` 判定。
- 建議：**這頁是特例**，改職務權限設定本身 = 平台管理操作，建議保留 `isAdmin` 檢查（呼應 P001 PR-1d 報告對 WorkspaceSwitcher 的同樣結論）。若要給特定職務管理，才改 `canWrite('hr', 'roles')`（tab 已定義 ✅）。

#### /hr/settings（出勤/LINE 打卡設定）
- 檔案：`src/app/(main)/hr/settings/page.tsx`
- 現況：**完全沒有 gate** ❌。任何進得來 `(main)` 的 user 都看得到/改得到。
- 建議：加 `canWrite('hr', '<settings-tab>')`。**但目前 `module-tabs.ts` 的 `hr` 模組只有 `employees` / `roles`，需新增 `settings` tab。**

---

### 模組：database

**Layout 層：`src/app/(main)/database/layout.tsx:3,14,16`**
- 現況：`canReadAny('database')` ✅ 涵蓋所有子路由（archive-management / attractions / page / suppliers / tour-leaders / transportation-rates）。

**子頁面**
- 現況：所有子頁面均無自己的 gate，完全仰賴 layout。
- 注意：P001 PR-1d audit 曾警告若 database 之下包含 `/database/workspaces`（平台管理資格）、要在子頁再加系統主管 gate。實際檢查下來 **`workspaces` 路由目前不存在**（layout 註解寫覆蓋 9 個但檔案只有 6 個），所以眼下沒此風險；但若未來真的恢復 `/database/workspaces` 必須雙層 gate。

**dialog 層：`src/features/attractions/components/AttractionsDialog.tsx:14,54-55`**
- 現況：
  ```ts
  const { canWrite } = useRolePermissions()
  const readOnly = !!attraction && !canWrite('/database')
  ```
- ⚠️ **這是空殼**：`src/lib/permissions/hooks.ts:240-269` 的 `useRolePermissions` 內部 `permissions` state 永遠是 `[]`（從未 fetch），`canWrite` 回 `perm?.can_write ?? true` → 對所有人回 `true`。等於沒 gate（readOnly 永遠 false）。
- 建議：改 `useTabPermissions.canWrite('database', 'attractions')`。

**元件層：`src/components/editor/attraction-selector/index.tsx:19,86-87`**
- 現況：`canEditDatabase = canWrite('database', 'attractions')` ✅。

**元件層：`src/components/resource-panel/ResourcePanel.tsx:167,179` + `ResourceDetailDialog.tsx:55,69`**
- 現況：`canEditDatabase` 是 prop，預設 `false`。實際上只有一個呼叫點 `src/features/tours/components/tour-itinerary-tab.tsx:1868,1906` 傳。

**`src/features/tours/components/tour-itinerary-tab.tsx:91-92`**
- 現況：
  ```ts
  const canEditDatabase =
    currentUser?.permissions?.some(p => p === 'database' || p.startsWith('database:')) ?? false
  ```
- 建議：改 `canWriteAny('database')` 或更精準的 `canWrite('database', 'attractions')`（視 UI 內容而定）。

---

### 模組：tours

- `src/app/(main)/tours/page.tsx`、`src/app/(main)/tours/[code]/page.tsx`：**無 gate** ❌
- tab 定義齊全（overview / orders / members / itinerary / display-itinerary / quote / contract / checkin / closing）+ 三個 eligibility tab (`as_sales`/`as_assistant`/`as_tour_controller`)
- 建議：列表頁加 `canReadAny('tours')`；詳情頁依當下 active tab 動態 `canRead('tours', '<tab>')`。

---

### 模組：orders

- `src/app/(main)/orders/page.tsx`：**無 gate** ❌
- tab 定義齊全（list / create / edit / payments / travelers）
- 建議：加 `canRead('orders', 'list')`。

---

### 模組：customers（**此模組 module-tabs.ts 未定義** — 依 sidebar 視為 `database.customers` 子項）

- `src/app/(main)/customers/page.tsx`、`src/app/(main)/customers/companies/page.tsx`：**無 gate** ❌
- sidebar 用 `requiredPermission: 'customers'`，但 `module-tabs.ts` 沒有 `customers` 模組，只有 `database.customers` 這個 tab。
- 建議：加 `canRead('database', 'customers')`。需要釐清：sidebar 的 `customers` 字串對應的是 `role_tab_permissions` 裡哪個 row？若 HR 介面讓職務開 `database.customers`，user.permissions 會放 `customers` 還是 `database:customers`？這是 **實作 coherence 問題**，需 William 先確認 SSOT 是哪種命名。

---

### 模組：visas / calendar / channel / todos / ai-bot / dashboard

- 全部 page 均**無 gate** ❌
- `module-tabs.ts` 這些模組都是 `tabs: []`（沒有分頁）
- 建議：用 `canRead('<module>')`（不帶 tab）gate，除了 dashboard（註解說明不受職務權限控管）可不加。

---

### 模組：settings / tenants

#### /settings（個人設定）
- 檔案：`src/app/(main)/settings/page.tsx:47-48`
- 現況：
  ```ts
  const { isAdmin } = useAuthStore()
  const hasSettingsAccess = isAdmin || user?.permissions?.includes('settings')
  ```
  裸字串 check ⚠️。
- 注意：`hasSettingsAccess` 僅用來控制是否顯示 `<SettingsTabs />` tab 切換列；頁面本身沒被擋。
- 建議：改 `canWriteAny('settings')` 決定是否顯示 tabs。

#### /settings/company（公司設定）
- 檔案：`src/app/(main)/settings/company/page.tsx:224,324`
- 現況：`if (!isAdmin) return <無權限>` ⚠️
- 建議：改 `canWrite('settings', 'company')`（tab 已定義 ✅）。

#### /settings/components/SettingsTabs.tsx:22,25
- 現況：`const tabs = ALL_TABS.filter(tab => !tab.adminOnly || isAdmin)` ⚠️
- 建議：`company` tab 改以 `canWrite('settings', 'company')` 決定。

#### /settings/components/WorkspaceSwitcher.tsx:5,13-14
- 現況：`canWrite('settings', 'company')` ✅ 已走 useTabPermissions
- 注意：P001 PR-1d audit 主張這個是「平台管理資格 功能」應該保留 isAdmin，不該用 workspace tab。目前 code 已經改成 settings.company 寫入權 — 如果 系統主管職務 backfill 正確這個 OK；如果 HR 給某 workspace 用戶開 `settings.company` 寫入，那他就能看到跨 workspace 切換卡。**請 William 確認這個選擇是否符合預期**。

#### /settings/appearance、/settings/bot-line、/settings/menu、/settings/modules、/settings/receipt-test
- 現況：**全部無 gate** ❌
- 建議：至少 `bot-line`/`modules` 這類「系統級」設定要 gate；`appearance` 屬個人可放過。
- tab 定義：**目前 settings 模組只有 `personal` 和 `company` 兩個 tab，下面頁面沒對應 tab。需新增**：
  - `settings.appearance`（或併入 personal）
  - `settings.bot-line`（LINE 打卡機器人）
  - `settings.menu`（側邊欄客製）
  - `settings.modules`（租戶功能開關）
  - `settings.receipt-test`（測試頁，可能不需要 gate，或只給系統主管）

#### /tenants、/tenants/[id]（平台管理資格）
- 現況：**無 gate** ❌
- module-tabs.ts 註解：「租戶管理（tenants）為 Venturo 平台管理資格內部功能、不開放給租戶職務管理」
- 建議：保留純 `isAdmin` 或引入 `isPlatformAdmin` 概念（與 P001 PR-1d 結論一致）。**不該走 useTabPermissions**。

---

### 元件層（跨模組）

#### `src/components/workspace/AdvanceListCard.tsx:9,27,32`
- 現況：`const { canManageFinance } = usePermissions()`；`canProcess = canManageFinance`
- 建議：`canWrite('finance', 'disbursement')` 或 `canWrite('finance', 'requests')`（依動作而定）。

#### `src/components/workspace/OrderListCard.tsx:8,27,30`
- 現況：`const { canCreateReceipts } = usePermissions()`
- 建議：`canWrite('finance', 'payments')`。

#### `src/components/workspace/channel-sidebar/useChannelSidebar.ts:15-22`
- 現況：
  ```ts
  const permissions = user.permissions || []
  return (
    permissions.includes('workspace') ||
    permissions.includes('workspace:manage_members') ||
    permissions.includes('workspace:manage')
  )
  ```
  裸字串 check ⚠️，且 module-tabs.ts 的 `workspace` 模組 `tabs: []`（無分頁）。
- 建議：改 `canRead('workspace')`（不帶 tab），或新增 `workspace.manage` tab 再用 `canWrite('workspace', 'manage')`。需 William 決定 workspace 模組要不要細分。

---

### `isAdmin` 非權限 gate 的合理使用（保留、不改）

這些使用 `isAdmin` 的地方**不是**權限 gate，而是「平台平台管理資格 only」或「UI 功能差異」，建議保留：

| 檔案 | 用途 |
| --- | --- |
| `src/app/(main)/calendar/page.tsx:56,183` | 跨 workspace 篩選器（僅平台管理資格可見） |
| `src/components/workspace/channel-sidebar/CreateChannelDialog.tsx:47,55,166` | 建立頻道時的跨 workspace scope 選項 |
| `src/components/workspace/channel-chat/useChannelChat.ts:50,188`、`ChatMessages.tsx`、`ChannelList.tsx` 等 | 「公告頻道只有系統主管能發訊息」— 聊天室邏輯、非權限 gate |
| `src/components/workspace/chat/MessageInput.tsx:26,55,83` | 同上 |
| `src/features/calendar/components/EventDetailDialog.tsx:48-49` | 公司事項編輯檢查（creator 或系統主管） |
| `src/features/calendar/hooks/useCalendarEvents.ts:77,82,229,277,392` | 平台管理資格看全部 workspace 行事曆 |
| `src/features/dashboard/components/DashboardClient.tsx:62,73`、`widget-settings-dialog.tsx:26,35` | `admin_only` widget 的顯示切換 |
| `src/components/layout/sidebar.tsx:419,467,483` | 側邊欄 menu 整體過濾（底層用 `user.permissions` 前綴比對） |

這些「不是 HR 職務管理能設定的概念」：跨 workspace、公告頻道、平台管理資格 dashboard widget 等。

---

## 最後彙總

### 統計

| 類別 | 數量 |
| --- | --- |
| 用 ✅ `useTabPermissions` 的頁面/元件 | 8（finance/requests、finance/reports、finance/treasury、finance/settings、accounting/layout、database/layout、WorkspaceSwitcher、attraction-selector） |
| 用 ⚠️ `usePermissions`（`src/hooks/usePermissions.ts`）的 | 3（finance/payments page、AdvanceListCard、OrderListCard） |
| 用 ⚠️ 裸 `permissions.includes(...)` / `isAccountant` 的 | 5（AddReceiptDialog、ReceiptConfirmDialog、AddRequestDialog、useChannelSidebar、settings/page） |
| 用 ⚠️ `useRolePermissions` 空殼的 | 1（AttractionsDialog） |
| 完全**沒有**頁面 gate 的頁面（URL 直接打就進） | 19<br>/finance、/finance/treasury/disbursement、/finance/reports/unpaid-orders、/accounting 子頁 *6、/hr、/hr/settings、/database 子頁 *6、/tours、/tours/[code]、/orders、/customers、/customers/companies、/visas、/calendar、/channel、/todos、/ai-bot、/settings/appearance、/settings/bot-line、/settings/menu、/settings/modules、/settings/receipt-test、/tenants、/tenants/[id]<br>（其中部分靠 layout 層 gate：accounting 和 database 子頁） |
| `isAccountant` 變數出現次數 | 3（AddReceiptDialog:88, ReceiptConfirmDialog:55, AddRequestDialog:146 的 inline 版） |
| `user.permissions.includes(...)` 在 features/components/app 的出現次數 | 5（AddReceiptDialog, ReceiptConfirmDialog, AddRequestDialog, useChannelSidebar 三次, settings/page） |
| `canViewFinance`/`canManageFinance`/`canCreateReceipts` 等 legacy flag 實際使用 | 3（finance/payments、AdvanceListCard、OrderListCard） |

### 建議在 `module-tabs.ts` 新增的 tab 定義

| 模組 | 建議新增的 tab | 原因（對應路由/元件） |
| --- | --- | --- |
| `hr` | `settings` | `/hr/settings`（出勤、LINE 打卡機器人）目前無對應 tab |
| `settings` | `appearance` | `/settings/appearance` 頁無對應 tab |
| `settings` | `bot-line` | `/settings/bot-line` |
| `settings` | `menu` | `/settings/menu`（側邊欄客製） |
| `settings` | `modules` | `/settings/modules`（租戶功能開關） |
| `workspace`（選配） | `manage`（`isEligibility` 或普通 tab） | `useChannelSidebar.canManageMembers` 目前靠 `workspace:manage_members` 裸字串 |

不建議新增（需釐清）：
- `customers` 模組 / tab：目前 sidebar 用 `requiredPermission: 'customers'`、module-tabs 有 `database.customers`；需 William 確認 `user.permissions` 實際放的是哪個 key，才能決定「保留 customers 模組獨立」還是「統一到 database.customers」。

### 建議清理順序（按破壞性 × 影響範圍排序，William 自行取捨）

1. **先修這三個，HR 職務設定才會真的生效**：
   - `finance/payments/page.tsx` → `canRead('finance', 'payments')`
   - `AddReceiptDialog`（canEdit / canConfirm）→ `canWrite('finance', 'payments')` + `canWrite('finance', 'payments-confirm')`
   - `AttractionsDialog` → 換掉 `useRolePermissions` 空殼

2. **補未 gate 的頁面**（順手就能修、不動邏輯只加兩行）：
   - `/finance`、`/finance/treasury/disbursement`、`/finance/reports/unpaid-orders`、`/hr`、`/tours`、`/tours/[code]`、`/orders`、`/customers`、`/visas` 等

3. **清掉 `usePermissions` 和 `isAccountant`**：
   - `ReceiptConfirmDialog`、`AddRequestDialog`、`AdvanceListCard`、`OrderListCard`、`useChannelSidebar`、`settings/page`

4. **module-tabs.ts 新增上表 6 個 tab + 對應 migration 把 系統主管職務 的 `can_read` / `can_write` backfill 開啟**（呼應 P001 PR-1d §9「未來新增 tab 的 CI 守門」擔心的坑）。

5. **終態**：`src/hooks/usePermissions.ts` 整支刪除；`src/lib/permissions/hooks.ts` 的 `useRolePermissions`（空殼）與 `canAccess` 要嘛填真資料要嘛刪掉。

### 與 P001 PR-1d audit 的交集

`docs/PATTERN_HEAL_REPORT_2026-04-22/P001-PR-1d/code-reviewer.md` 的 F1 / F3 finding 指出：若 PR-1d 用 `canAccess()` / `canViewFinance` 替代 系統主管 gate 會擴權。本次稽核證實：
- `finance/payments` 目前仍用 `canViewFinance`（未隨 PR-1d 改掉）。
- `useRolePermissions` 空殼沒修，所以 `AttractionsDialog` 的 `readOnly` 一直是 false。
- `useTabPermissions` 已由 PR-1a 補好 backfill（系統主管 54 個 row）；本報告建議的「改用 useTabPermissions.canRead/canWrite」方向與 PR-1d audit 結論一致。
