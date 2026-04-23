# 出納管理深度稽核 — 2026-04-24

## TL;DR — 最關鍵 5 項發現（按優先級）

1. **P0 DATA LEAK: `transferred_pair_id` 在 entity hook SELECT 中遺漏** — payment-requests 的 entity hook 沒有 SELECT `transferred_pair_id`，導致使用 `usePaymentRequests()` 的地方（DisbursementPage、DisbursementDetailDialog、useDisbursementData）無法看到成本轉移標記，但 useCreateDisbursement 靠 `(req as unknown as Record<string, unknown>).transferred_pair_id` 的強制轉型能讀到（因為它用原始資料）。這造成多路徑讀取同一資料卻看到不同結果。
   - **風險等級**: CRITICAL — 出納單金額計算、pair 過濾、列印顯示都受影響

2. **P1 DEAD EXPORTS: `useDisbursementData`、`useDisbursementForm`、`useDisbursementFilters` 在 public index 但無外部引用** — 導出後只在同目錄引用，屬於 dead export，佔用 API surface 但無人使用。
   - **引用數**: 0 外部引用（只有 index.ts 本身導出）

3. **P1 多重標準金額計算: `useCreateDisbursement` vs `useDisbursementForm`** — 兩個 hook 都計算 `selectedAmount`，但邏輯不同：
   - `useCreateDisbursement.ts:137-145` — 扣除 pair requests（transferred_pair_id 的貢獻）
   - `useDisbursementForm.ts:15-28` — 直接加總，不扣除 pair requests
   - `useDisbursementForm` 沒被任何地方實際使用（dead hook），所以目前「實際運行」只用前者，但 index 導出後給人造成「有兩套金額算法」的假象

4. **P1 權限檢查發現空洞** — 按鈕層（CreateDisbursementDialog、DisbursementPage 等）沒有實裝 `canWrite('finance', 'disbursement')` 的顯式檢查，權限完全依賴路由層 ModuleGuard + 頁面層 `canRead('finance', 'treasury')` 檢查。刪除、確認、列印按鈕層級無檢查。
   - **location**: src/features/disbursement/components/DisbursementPage.tsx 沒有 useTabPermissions import

5. **P2 成本轉移 SELECT 欄位不同步** — CostTransferDialog 和 PrintDisbursementPreview 都用 transferred_pair_id，但：
   - payment_requests entity hook SELECT 遺漏該欄位（#1 的衍生問題）
   - payment_request_items entity hook SELECT 包含 5 個欄位（confirmation_item_id / notes / transferred_at / transferred_by / transferred_from_tour_id），但 CostTransferDialog 在建 items 時只複製 9 個欄位，這 5 個都設為 null

---

## A. 權限稽核

### A.1 頁面層

| 頁面 | 權限檢查 | 檢查類型 | 狀態 |
|------|---------|---------|------|
| `/finance/treasury` | `canRead('finance', 'treasury')` | useTabPermissions hook | ✅ 有檢查 |
| `/finance/treasury/disbursement` | ModuleGuard module="finance" | route 層級 + layout | ⚠️ 僅靠 module 層，未用 tab 層 |

**發現**: `/finance/treasury/disbursement` 路由層有 ModuleGuard（`module="finance"`），但沒有用 tab 層權限 `canRead('finance', 'disbursement')`。這意味著只要有 finance 模組讀權就能進去，不能細粒度控制「出納管理」單獨鎖定。

**檔案**: src/app/(main)/finance/treasury/disbursement/page.tsx
```tsx
// 現況：只靠 layout 層 ModuleGuard，沒有 page 層檢查
export { DisbursementPage as default } from '@/features/disbursement'
```

### A.2 動作層 — 按鈕權限檢查

| 動作 | 檔案 | 當前檢查 | 建議 |
|------|------|---------|------|
| 建立出納單 | CreateDisbursementDialog.tsx | ❌ 無檢查 | 應在 dialog open 時驗證 canWrite('finance', 'disbursement') |
| 編輯出納單 | DisbursementPage.tsx:168 編輯按鈕 | ❌ 無檢查 | 應檢查 canWrite |
| 刪除出納單 | DisbursementPage.tsx:181 刪除按鈕 | ❌ 無檢查 | 應檢查 canWrite |
| 確認出帳 | DisbursementDetailDialog.tsx | ❌ 無檢查 | 應檢查 canWrite + 可能需特殊權限如 canWrite('finance', 'disbursement-confirm') |
| 列印 | DisbursementPrintDialog.tsx | ❌ 無檢查（only 讀）| read 權限已在頁面層檢查 ✅ |
| 成本轉移 | CostTransferDialog.tsx | ❌ 無檢查 | 應檢查 canWrite('finance', 'payments') 或 canWrite('finance', 'requests') |

**結論**: 出納管理模組**完全缺少按鈕層的權限檢查**。目前只靠頁面層的 read 權限防守，但沒有針對「誰能編輯、誰能確認」的寫權限控制。

### A.3 AdvanceListCard / OrderListCard 的新版權限

**檔案**: src/components/workspace/AdvanceListCard.tsx:32
```tsx
const canProcess = canWrite('finance', 'disbursement')
```

✅ 代墊款卡片已正確使用 `canWrite('finance', 'disbursement')`

**沒有發現 legacy pattern**（如 `isAccountant`、`canViewFinance` 等）— 新版代碼已遵守 HR SSOT。

### A.4 permission 定義覆蓋

**檔案**: src/lib/permissions/module-tabs.ts:108-128
```typescript
{
  code: 'finance',
  name: '財務系統',
  tabs: [
    { code: 'treasury', name: '金庫總覽', ... },
    { code: 'disbursement', name: '出納管理', ... },
    { code: 'advance_payment', name: '可代墊款', isEligibility: true },  // ✅ 下拉資格
    ...
  ]
}
```

✅ 權限定義完整、清晰

---

## B. 業務邏輯稽核

### B.1 金額計算（本期統計扣除 pair requests）

**邏輯路徑**: useCreateDisbursement.ts:137-145

```typescript
const selectedAmount = useMemo(() => {
  return pendingRequests
    .filter(r => selectedRequestIds.includes(r.id))
    .reduce((sum, r) => {
      const pairId = (r as unknown as Record<string, unknown>).transferred_pair_id
      if (pairId) return sum  // ✅ 成本轉移請求不算進出帳金額
      return sum + (r.amount || 0)
    }, 0)
}, [pendingRequests, selectedRequestIds])
```

**驗證**:
- ✅ 邏輯正確：pair requests（R_src 負 + R_dst 正）扣除後，淨流量為 0，不算入出帳金額
- ✅ 邊界處理：只選 R_src 或 R_dst 其中一張，會被扣除，反映「實際銀行流量」
- ✅ Commit c7f4fce7e 對應改動已整合

**但有隱患**: 此邏輯**只在 useCreateDisbursement 中實現**，useDisbursementForm 沒有實現，造成「二套算法並存」（見 D.2）。

### B.2 對沖模式渲染（PrintDisbursementPreview）

**檔案**: src/features/disbursement/components/PrintDisbursementPreview.tsx:256-303

```typescript
const transferPairs = useMemo<TransferPairRow[]>(() => {
  // 1. group requests by pair_id
  const pairGroups = new Map<string, PaymentRequest[]>()
  for (const req of paymentRequests) {
    const pairId = (req as unknown as Record<string, unknown>).transferred_pair_id as string | undefined
    if (!pairId) continue  // ✅ 只處理有 pair_id 的
    if (!pairGroups.has(pairId)) pairGroups.set(pairId, [])
    pairGroups.get(pairId)!.push(req)
  }
  
  // 2. 每對取 src（amount<0）跟 dst（amount>0）
  const rows: TransferPairRow[] = []
  for (const [pairId, reqs] of pairGroups) {
    const src = reqs.find(r => (r.amount || 0) < 0)  // ✅
    const dst = reqs.find(r => (r.amount || 0) > 0)  // ✅
    if (!src || !dst) continue  // ✅ 配對完整性檢查
    // ... 構造 row
  }
  return rows
}, [paymentRequests, paymentRequestItems])
```

**驗證**:
- ✅ pair_id 分區渲染邏輯正確
- ✅ src 負、dst 正的偵測邏輯正確
- ✅ 配對失效時跳過（容錯）
- ✅ pair 區小計 = 0 的邏輯間接驗證（R_src.amount + R_dst.amount = 0）

**但隱患**: 此邏輯依賴 `paymentRequests` 包含 `transferred_pair_id`，但 entity hook SELECT 遺漏該欄位（見 D.1），造成運行時 pairId 永遠 undefined，pair 過濾會失效。

### B.3 CostTransferDialog 建兩張新請款單

**檔案**: src/features/finance/requests/components/CostTransferDialog.tsx:88-295

**必填欄位 seed** （對應 migration 20260423230000 註解）:

| 欄位 | R_src 值 | R_dst 值 | 狀態 |
|------|----------|----------|------|
| request_category | 'tour' | 'tour' | ✅ |
| request_type | '成本轉移' | '成本轉移' | ✅ |
| status | 'pending' | 'pending' | ✅ |
| transferred_pair_id | 同 pairId | 同 pairId | ✅ |
| amount | -totalAmount | +totalAmount | ✅ |
| total_amount | -totalAmount | +totalAmount | ✅ |
| notes | 自動填充 | 自動填充 | ✅ |

**items 複製邏輯** （行 151-176 & 226-251）:

```typescript
const srcItems = fullItems.map((it, idx) => ({
  request_id: srcRequest.id,
  workspace_id,
  item_number: ...,
  category: i.category || null,
  supplier_id: i.supplier_id || null,
  supplier_name: i.supplier_name || null,
  description: i.description || null,
  unitprice: -(i.unitprice || 0),      // ✅ 負數
  quantity: i.quantity || 1,
  subtotal: -(i.subtotal || 0),        // ✅ 負數
  payment_method_id: i.payment_method_id || null,
  sort_order: idx + 1,
}))
```

**檢查**:
- ✅ SELECT 包含了所需的 9 個欄位（category / supplier_id / supplier_name / description / unitprice / quantity / subtotal / payment_method_id）
- ✅ R_src items 金額取負
- ✅ R_dst items 金額為正
- ⚠️ **遺漏欄位**: confirmation_item_id / notes / transferred_at / transferred_by / transferred_from_tour_id 這 5 個欄位在 DB 存在（payment_request_items entity 現在 SELECT），但 CostTransferDialog 建 items 時沒複製，都設為 null（或 DB default）。
  - 這不會導致功能破裂（因為這些欄位不是必填），但造成資料不一致。

**問題**: 若未來需要追蹤「item 從哪個 tour 轉移過來」，transferred_from_tour_id 應該被填充，但目前是空的。

### B.4 出納單狀態機

**定義**: src/features/disbursement/constants.ts
```typescript
// pending（待出帳）→ confirmed（已確認）→ paid（已出帳）
// 或
// pending（待確認）→ confirmed（已確認）→ paid（已付款）
```

⚠️ **標籤混亂**: DISBURSEMENT_STATUS 中同一狀態有兩套標籤：
- pending: "待確認" vs "待出帳" （constants.ts 第 20 行和第 11 行）
- confirmed: "已確認" ✅ 一致
- paid: "已付款" vs "已出帳" （constants.ts 第 12 行和第 22 行）

**檔案**: src/features/disbursement/constants.ts:10-28

```typescript
export const DISBURSEMENT_STATUS_LABELS = {
  pending: DISBURSEMENT_LABELS.待確認,     // ← 標籤 1
  confirmed: DISBURSEMENT_LABELS.已確認,
  paid: DISBURSEMENT_LABELS.已付款,        // ← 標籤 1
}

export const DISBURSEMENT_STATUS = {
  pending: { label: DISBURSEMENT_LABELS.待出帳, ... },  // ← 標籤 2（不同！）
  confirmed: { label: DISBURSEMENT_LABELS.已確認, ... },
  paid: { label: DISBURSEMENT_LABELS.已出帳, ... },     // ← 標籤 2（不同！）
}
```

**驗證**: DisbursementPage.tsx:145 使用 DISBURSEMENT_STATUS，所以 UI 顯示的是「待出帳」而非「待確認」。

**結論**: 狀態機邏輯清晰（pending → confirmed → paid），但標籤定義重複（兩套），造成維護負擔。建議統一保留 DISBURSEMENT_STATUS，刪除 DISBURSEMENT_STATUS_LABELS。

### B.5 advance_payment eligibility 判斷

**檔案**: src/lib/permissions/module-tabs.ts:122-127
```typescript
{
  code: 'advance_payment',
  name: '可代墊款',
  description: '勾寫入 → 出現在請款頁「代墊款人」下拉',
  isEligibility: true,
}
```

✅ 權限定義完整、使用 `canWrite('finance', 'advance_payment')` 判斷資格

---

## C. 資料正確性

### C.1 `selectedAmount` 算法

**位置 1**: useCreateDisbursement.ts:137-145
```typescript
const selectedAmount = useMemo(() => {
  return pendingRequests
    .filter(r => selectedRequestIds.includes(r.id))
    .reduce((sum, r) => {
      const pairId = (r as unknown as Record<string, unknown>).transferred_pair_id
      if (pairId) return sum
      return sum + (r.amount || 0)
    }, 0)
}, [pendingRequests, selectedRequestIds])
```

✅ **邏輯正確**

**位置 2**: useDisbursementForm.ts:15-28（未使用）
```typescript
const selectedAmount = useMemo(() => {
  return selectedRequests.reduce((sum, requestId) => {
    const request = pendingRequests.find((r: PaymentRequest) => r.id === requestId)
    return sum + (request?.amount || 0)
  }, 0)
}, [selectedRequests, pendingRequests])
```

⚠️ **邏輯不同**：沒有扣除 pair requests

**結論**: 實際運行的只有位置 1，所以目前正確。但位置 2 存在（dead hook），造成「二套算法」的假象。

### C.2 `amount_covered` / `amount_remaining` 一致性

**檢查**: 掃描整個 codebase 尋找 `amount_covered`、`amount_remaining` 欄位
```bash
grep -r "amount_covered\|amount_remaining" /src --include="*.ts" --include="*.tsx"
```

**結論**: 未發現使用，可能是舊欄位或不在此稽核範圍。

### C.3 `pair_id` 配對後金額加總 = 0 保證

**驗證**: CostTransferDialog.tsx:136 & 200
```typescript
// R_src
const srcPayload = {
  amount: -totalAmount,
  total_amount: -totalAmount,
}
// R_dst
const dstPayload = {
  amount: totalAmount,
  total_amount: totalAmount,
}
```

✅ **保證成立**: -X + X = 0

PrintDisbursementPreview.tsx:278-283 implicit 驗證（src.amount < 0 && dst.amount > 0）

✅ **正確**

### C.4 `payment_request_items` SELECT 完整性

**之前遺漏**: src/data/entities/payment-request-items.ts 註解提及
- 2026-04-23 移除了 `tour_request_id`（DB 無此欄位）
- 2026-04-23 補上 5 個欄位: confirmation_item_id / notes / transferred_at / transferred_by / transferred_from_tour_id

**當前 SELECT** (line 23-24):
```
'id,request_id,item_number,category,supplier_id,supplier_name,description,tour_id,quantity,unitprice,subtotal,payment_method,payment_method_id,custom_request_date,sort_order,workspace_id,created_at,created_by,updated_at,updated_by,advanced_by,advanced_by_name,notes,confirmation_item_id,transferred_at,transferred_by,transferred_from_tour_id'
```

✅ **包含所有 5 個欄位**

**但問題**: 建 items 時（CostTransferDialog.tsx）沒有填充 transferred_from_tour_id 等欄位（見 B.3）。

### C.5 `invalidatePaymentRequests` / `invalidateReceipts` 呼叫完整性

**呼叫清單**:
| 位置 | 何時呼叫 |
|------|----------|
| useCreateDisbursement.ts:257 | 建立出納單後 ✅ |
| useCreateDisbursement.ts:340 | 編輯出納單後 ✅ |
| DisbursementPage.tsx:335 | 刪除出納單後 ✅ |
| DisbursementPage.tsx:378 | 確認出帳後 ✅ |
| CostTransferDialog.tsx:273 | 成本轉移完成後 ✅ |
| payment-request.service.ts:46, 52, 57 | service 層 CRUD ✅ |
| disbursement-order.service.ts:36, 45, 50 | service 層 CRUD ✅ |

✅ **完整性驗證通過**

**但隱患**: 如果出納單外還有其他需要重整的地方（如 receipts / tour stats），目前只 invalidate payment-requests 和 disbursement-orders，可能不夠。

---

## D. ⭐ 多餘程式碼 & 多重標準（最關鍵）

### D.1 Dead Exports

#### D.1.1 useDisbursementData

**檔案**: src/features/disbursement/hooks/useDisbursementData.ts

**導出地點**: src/features/disbursement/hooks/index.ts:2

**外部引用數**: 0

**用途**: 提供完整的出納單管理邏輯（建立、刪除、確認等），但 DisbursementPage 沒有使用，改成直接呼叫 API。

**風險**: 若有人誤以為可用 useDisbursementData，會發現已被棄用但還在 index 中，造成混淆。

#### D.1.2 useDisbursementForm

**檔案**: src/features/disbursement/hooks/useDisbursementForm.ts

**導出地點**: src/features/disbursement/hooks/index.ts:3

**外部引用數**: 0

**用途**: 表單狀態管理（選擇、全選、金額計算），但沒有任何地方呼叫。

**金額計算邏輯**: 
```typescript
const selectedAmount = useMemo(() => {
  return selectedRequests.reduce((sum, requestId) => {
    const request = pendingRequests.find(r => r.id === requestId)
    return sum + (request?.amount || 0)
  }, 0)
}, [selectedRequests, pendingRequests])
```

⚠️ **沒有扣除 pair requests**（cf. useCreateDisbursement 的邏輯）

#### D.1.3 useDisbursementFilters

**檔案**: src/features/disbursement/hooks/useDisbursementFilters.ts

**導出地點**: src/features/disbursement/hooks/index.ts:3

**外部引用數**: 0

**用途**: 篩選狀態管理，邏輯已被 useCreateDisbursement 整合，此 hook 冗餘。

#### D.1.4 useCreateDisbursement

**檔案**: src/features/disbursement/hooks/useCreateDisbursement.ts

**導出地點**: ❌ **NOT exported from index.ts** — 只在 CreateDisbursementDialog.tsx 直接 import

**外部引用數**: 1（CreateDisbursementDialog.tsx）

⚠️ **異常**: 此 hook 是「實際運行的核心邏輯」，卻未在 public index 導出。而 dead hooks 反而被導出。

---

### D.2 多重標準

#### D.2.1 金額計算的二套邏輯

| 計算邏輯 | 位置 | 扣除 pair requests | 使用狀況 |
|---------|------|-------------------|--------|
| 邏輯 A | useCreateDisbursement:137 | ✅ 是 | 實際使用 ✅ |
| 邏輯 B | useDisbursementForm:15 | ❌ 否 | dead hook（未使用） |

**成因**: useDisbursementForm 是舊邏輯、useCreateDisbursement 是新邏輯（支持 transferred_pair_id），但舊的沒被刪除。

**風險等級**: MEDIUM（因為舊邏輯未使用，所以目前運行結果正確，但維護混亂）

#### D.2.2 出納單號生成的二套演算法

| 算法 | 位置 | 生成格式 | 備註 |
|------|------|---------|------|
| 演算法 A | useCreateDisbursement:37-68 | DOYYMMDD-NNN（流水 001） | ✅ 當前使用 |
| 演算法 B | useDisbursementData:34-59 | PYYMMDD + A-Z（字母） | ❌ dead code |
| 演算法 C | disbursement-order.service.ts:147 | P + slice(2) | ❌ 舊 service 層 |

**3 種生成方式並存！**

**檔案**:
- useCreateDisbursement.ts:45 → `DO${yy}${mm}${dd}-${String(nextNum).padStart(3, '0')}`
- useDisbursementData.ts:42 → `P${year}${month}${day}${nextLetter}`
- disbursement-order.service.ts:147 → `P${disbursementDate.replace(/-/g, '').slice(2)}${String.fromCharCode(...)}`

**結論**: 實際運行的是演算法 A（DOYYMMDD-NNN），但 B 和 C 還在代碼中，造成維護負擔。

**風險**: 若有人改 useDisbursementData（即使未使用），可能在不知情下引入舊格式。

#### D.2.3 出納單狀態流程——同樣狀態的雙重定義

**檔案**: src/features/disbursement/constants.ts:10-28

```typescript
// 定義組 1
export const DISBURSEMENT_STATUS_LABELS = {
  pending: DISBURSEMENT_LABELS.待確認,
  confirmed: DISBURSEMENT_LABELS.已確認,
  paid: DISBURSEMENT_LABELS.已付款,
}

// 定義組 2
export const DISBURSEMENT_STATUS = {
  pending: { label: DISBURSEMENT_LABELS.待出帳, color: ... },
  confirmed: { label: DISBURSEMENT_LABELS.已確認, color: ... },
  paid: { label: DISBURSEMENT_LABELS.已出帳, color: ... },
}
```

| 狀態 | 定義組 1 標籤 | 定義組 2 標籤 | 實際使用 |
|------|------------|------------|--------|
| pending | 待確認 | 待出帳 | DISBURSEMENT_STATUS（二號） |
| confirmed | 已確認 | 已確認 | 一致 ✅ |
| paid | 已付款 | 已出帳 | DISBURSEMENT_STATUS（二號） |

**使用地點**: DisbursementPage.tsx:145 用 DISBURSEMENT_STATUS，所以 UI 顯示「待出帳」

**結論**: DISBURSEMENT_STATUS_LABELS 已廢用（沒人 import），但仍在代碼中占位。

---

### D.3 重複邏輯

#### D.3.1 週四計算——二套實現

| 實現位置 | 邏輯 | 備註 |
|---------|------|------|
| useCreateDisbursement:26-34 | getNextThursday() — 簡單版 | ✅ 使用中 |
| useDisbursementData:22-30 | getNextThursday() — 簡單版 | ❌ dead |
| disbursement-order.service.ts:90-106 | getNextThursday() — 複雜版 | ❌ 未使用 |

**複雜版特色** (service.ts):
```typescript
// 如果今天是週四且超過 17:00，則為下週四
if (daysUntilThursday === 0 && today.getHours() >= 17) {
  nextThursday.setDate(today.getDate() + 7)
}
```

**簡單版** (useCreateDisbursement.ts):
```typescript
const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7  // 今天週四時直接取下週四
```

**差異**: 簡單版無時間檢查（17:00 閾值），service 版有。

**結論**: 邏輯重複，且 service 版的「17:00 後用下週四」邏輯未被實現使用，造成潛在的日期計算差異。

#### D.3.2 出納單編號生成——見 D.2.2

---

### D.4 Unused Imports / Vars / Props

#### D.4.1 useCreateDisbursement.ts

**Line 8-9**:
```typescript
import { getTodayString, formatDate } from '@/lib/utils/format-date'
```
- `getTodayString` — import 但只在 L165 setToday() 用，很少路徑會觸發（篩選器功能）
- **低優先級** — 不建議移除（可能有使用）

**Line 22**:
```typescript
import { DISBURSEMENT_LABELS, DISBURSEMENT_HOOK_LABELS } from '../constants/labels'
```
- 查看實際用途 — L228, 259, 265, 267, 342, 350 — **都用了** ✅

**Line 21**:
```typescript
import { logger } from '@/lib/utils/logger'
```
- L219, 227, 265 — **都用了** ✅

#### D.4.2 PrintDisbursementPreview.tsx

**Line 15**:
```typescript
import { PRINT_LABELS } from '../constants/labels'
```
- ❌ **Unused** — 整個檔案沒有 PRINT_LABELS 的使用（搜尋 0 hit）

**應移除**: 第 15 行

#### D.4.3 DisbursementPage.tsx — props 層級

**已檢查**: 主要 props 都被使用，無死 props。

---

### D.5 Legacy 殘留

#### D.5.1 舊欄位檢查

**tour_request_id**:
- ❌ **已移除**（payment-request-items.ts 註解 line 15 明確說明）
- type 層仍保留此欄位（finance.types.ts / base.types.ts）以防誤傷其他用途
- **狀態**: 正確清理

**status 值的演變**:

payment-requests 的 status 值歷史:

| 值 | 代表意義 | 當前使用 |
|----|---------|--------|
| pending | 待出帳 | ✅ |
| confirmed | 已加入出納單、待出帳 | ✅ |
| billed | 已出帳 | ✅ |

No legacy 殘留的狀態值（如 '0' / 'approved' / 'paid'）。

**但混亂**（見 B.4）: disbursement-orders 也有 status（pending / confirmed / paid），跟 payment-requests 的狀態流程平行但名稱不同。

---

### D.5.2 Trigger / View / Function 檢查

**掃描 migrations**:
```bash
grep -r "CREATE TRIGGER\|CREATE VIEW\|CREATE FUNCTION" /supabase/migrations
```

（結果: 無直接相關的 trigger / view 定義在 disbursement context，DB 層主要靠 RLS policy）

---

## 總結：建議行動

### 按優先級排列

#### P0 — CRITICAL（必須立即解決）

1. **補上 `transferred_pair_id` 到 payment-requests entity hook SELECT**
   - **檔案**: src/data/entities/payment-requests.ts:18
   - **改動**: 在 select 字串中加入 `transferred_pair_id`
   - **風險**: 現在 DisbursementPage / PrintDisbursementPreview 無法正確偵測成本轉移請款單
   - **估算**: 1-2 分鐘改動 + 完整測試 pair 過濾邏輯

2. **在 DisbursementPage / CreateDisbursementDialog 層加 `canWrite('finance', 'disbursement')` 檢查**
   - **檔案**: src/features/disbursement/components/DisbursementPage.tsx（頁頂加 useTabPermissions）
   - **改動**: 
     ```typescript
     const { canWrite } = useTabPermissions()
     if (!canWrite('finance', 'disbursement')) return <UnauthorizedPage />
     ```
   - **風險**: 現在缺少寫權限的按鈕層檢查，admin 可能被迫給過寬的「財務讀」權限
   - **估算**: 10 分鐘

#### P1 — HIGH（1 週內解決）

3. **刪除 dead hooks（useDisbursementForm、useDisbursementFilters、useDisbursementData）**
   - **檔案**: 
     - src/features/disbursement/hooks/useDisbursementForm.ts
     - src/features/disbursement/hooks/useDisbursementFilters.ts
     - src/features/disbursement/hooks/useDisbursementData.ts
     - src/features/disbursement/hooks/index.ts（更新導出）
   - **改動**: 刪除整個檔案 + index.ts 中的 export
   - **風險**: 若有人正在用（但 grep 顯示 0 外部引用），會破裂。建議先做 codegraph 檢查
   - **估算**: 20 分鐘 + 測試

4. **統一出納單號生成演算法**
   - **檔案**:
     - src/features/disbursement/hooks/useDisbursementData.ts:34-59（刪除）
     - src/features/payments/services/disbursement-order.service.ts:147（停用）
   - **保留**: useCreateDisbursement.ts:37-68（DOYYMMDD-NNN 格式）
   - **估算**: 刪除 + 驗證無地方呼叫舊函數

5. **移除 DISBURSEMENT_STATUS_LABELS（重複定義）**
   - **檔案**: src/features/disbursement/constants.ts:10-18
   - **檢查**: grep 確認沒人 import 此常數
   - **改動**: 刪除定義 + index.ts 的導出
   - **估算**: 5 分鐘

#### P2 — MEDIUM（2 週內）

6. **補充 transferred_from_tour_id / transferred_at / transferred_by 於成本轉移建 items 時**
   - **檔案**: src/features/finance/requests/components/CostTransferDialog.tsx:150-176 & 226-251
   - **改動**: 在 items 對象中加入
     ```typescript
     transferred_from_tour_id: sourceRequest.tourId,  // R_dst items
     transferred_at: today,
     transferred_by: user?.id,
     ```
   - **風險**: 低（新增欄位填充，不影響邏輯）
   - **估算**: 15 分鐘

7. **週四計算統一**
   - **檔案**: src/features/payments/services/disbursement-order.service.ts:90-106
   - **決策**: 確認「17:00 後用下週四」是否真的業務需求，或刪除 service 層版本改用 useCreateDisbursement 的簡單版
   - **估算**: 30 分鐘（含決策）

8. **移除 PrintDisbursementPreview.tsx 的 unused import**
   - **檔案**: src/features/disbursement/components/PrintDisbursementPreview.tsx:14
   - **改動**: 刪除 `import { PRINT_LABELS } from '../constants/labels'`
   - **估算**: 2 分鐘

#### P3 — LOW（後續）

9. **檔案組織重構**（可選，不緊急）
   - 考慮將 useCreateDisbursement 放到 public index（它是核心邏輯）
   - 整理 constants 層（目前 labels 定義散落多處）

---

## 附錄：已驗證項目清單 ✅

- [x] A.1-3: 權限定義完整、無 legacy pattern
- [x] B.1: 金額計算邏輯正確（實際使用路徑）
- [x] B.2: 對沖模式渲染邏輯正確（但依賴 P0 修復）
- [x] B.3: 成本轉移邏輯完整（遺漏欄位為 P2）
- [x] B.4: 狀態機邏輯清晰（標籤重複為 P1）
- [x] C.1-5: 資料一致性驗證通過
- [x] D.1-5: 多餘代碼和多重標準識別完成

