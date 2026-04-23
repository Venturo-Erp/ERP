# Finance 財務模組體檢報告

**掃描日期**：2026-04-23  
**範圍**：8 個 page.tsx + API + 相關 DB table + 49 個 .tsx/.ts 檔案  
**掃描者**：Explore agent (Haiku 4.5)

---

## 一句話狀況

財務模組整體結構清晰，但存在 **3 個設計風險 + 4 個技術債**，其中 **2 個 as unknown 轉型** 在金額計算關鍵路徑上、**1 個 API 缺 系統主管 guard**、**1 個狀態值混用 (字串 '0'/'1' vs 英文)** 跨頁面不一致。巨型組件正按 BACKLOG 計畫拆分。

---

## 🔴 真問題（上線前必須處理）

### 1. **危險的 as unknown 轉型 + 財務邏輯**
- **檔案**: `/src/features/finance/requests/components/AddRequestDialog.tsx`
- **行號**: 823, 833, 841, 848, 857（多處）
- **證據**:
  ```typescript
  const t = tour as unknown as { is_deleted?: boolean; deleted_at?: string | null }
  ((item as unknown as Record<string, unknown>).custom_request_date as string) ||
  unit_price: item.unit_price ?? (item as unknown as { unitprice?: number }).unitprice ?? 0
  advanced_by: (item as unknown as Record<string, unknown>).advanced_by as string | undefined
  ```
- **問題**: 這是 1525 行巨型組件的產物，multiple unsafe casts 在請款項目計算邏輯中。`unitprice` 欄位不存在時 fallback to 0，但無驗證，可能造成**金額計算偏差**。
- **為什麼**: 建構時期傳入的物件結構和 DB schema 沒有同步，只靠 as unknown 跳過型別檢查。
- **風險**: M（財務計算邏輯，但已列 BACKLOG 拆分）
- **備註**: 已列 Wave 7 - AddRequestDialog 1512 行拆分，拆分時應同步補充型別定義。

---

### 2. **API 守門缺失 + 無 workspace_id 檢查**
- **檔案**: `/src/app/api/finance/accounting-subjects/route.ts`、`expense-categories/route.ts`
- **行號**: GET 方法無 workspace_id 明確驗證（第 5-24 行）
- **證據**:
  ```typescript
  // GET 沒有 getCurrentWorkspaceId() 檢查
  let query = supabase.from('chart_of_accounts')
    .select('...')
    .eq('is_active', true)
  // RLS 會自動過濾，但如果 RLS 配置錯誤將返回其他租戶資料
  ```
- **問題**: `payment-methods` route 有 `if (workspaceId) { query.eq('workspace_id', workspaceId) }`（第 30-32 行），但 `accounting-subjects` 和 `expense-categories` 沒有。依賴 RLS，但 CLAUDE.md 已警示「RLS 配置錯誤歷史」。
- **為什麼**: 複製貼上 API 時遺漏了 workspace_id 明確檢查，新手容易踩坑。
- **風險**: M（擁有平台管理資格的人 不受 RLS 限制，可能讀到其他租戶的會計科目）
- **備註**: 與已列 BACKLOG「Wave 2 Batch 1 Finance 6 頁 系統主管 guard」相關，應同步補強。

---

### 3. **狀態值混用：字串 '0'/'1' vs 英文 status**
- **檔案多處**:
  - `/src/features/finance/payments/components/ReceiptConfirmDialog.tsx:47` → `receipt.status === '1'`
  - `/src/app/(main)/finance/treasury/page.tsx:84` → `r.status === '0'` vs `pr.status === 'pending'`
  - `/src/features/finance/payments/services/receipt-core.service.ts:55` → `.eq('status', '1')`
- **證據**:
  ```typescript
  // 收款 status：'0' = 待確認，'1' = 已確認
  const isConfirmed = receipt.status === '1'
  const pendingReceipts = monthReceipts.filter(r => r.status === '0').length
  
  // 請款 status：'pending' / 'confirmed' / 'billed' （或 'approved'）
  const totalExpense = monthPayments
    .filter(pr => pr.status === 'approved' || pr.status === 'paid')
  const pendingPayments = monthPayments.filter(pr => pr.status === 'pending').length
  ```
- **問題**: 收款用數字字串，請款用英文，混合邏輯下容易寫出 `receipt.status === 'pending'` 永遠 false 的 bug。
- **為什麼**: 歷史遺留，最初建模時沒有統一 enum。
- **風險**: M（高機率引發狀態篩選 bug，財務報表統計不對）
- **備註**: 不是 BACKLOG 已列項，應新增清單。

---

### 4. **entity hook vs service 欄位不同步**
- **檔案**: `/src/data/entities/payment-requests.ts` 與 `/src/features/finance/payments/services/receipt-core.service.ts`
- **證據**:
  ```typescript
  // payment-requests entity (line 22)
  select: '...,accounting_subject_id,accounting_voucher_id,budget_warning,transferred_pair_id,...'
  
  // 但前端 AddRequestDialog 用 item 對象讀這些欄位，型別定義卻在 RequestItem interface
  // RequestItem 沒有 transferred_pair_id、accounting_voucher_id（line 24-42 in types.ts）
  ```
- **問題**: `transferred_pair_id` 在 DB 有、entity hook 有 SELECT，但 TypeScript interface 沒定義，造成 `PrintDisbursementPreview` 讀不到對沖標記。
- **為什麼**: 2026-04-24 補欄，但只補 entity hook 的 SELECT，沒補型別。
- **風險**: M（UI 顯示不同步，對沖邏輯可能失效）
- **BACKLOG 備註**: 已列 2026-04-24 筆記但沒從 BACKLOG 追蹤。

---

## 🟡 小債（上線後優化）

### 1. **AddRequestDialog.tsx 1525 行 → 已列 Wave 7**
- **檔案**: `/src/features/finance/requests/components/AddRequestDialog.tsx`
- **狀況**: 已列 BACKLOG
- **分解目標**: 拆成 RequestForm + TourAllocationSection + SupplierSelectionPanel

### 2. **BatchReceiptDialog 625 行 + PaymentItemRow 591 行**
- **檔案**: 兩個大型組件共 1200+ 行邏輯
- **建議**: BatchReceiptDialog 應抽 batchAllocationLogic hook，PaymentItemRow 應拆成 LinkPayGenerator + PaymentInfoInput 子組件

### 3. **收款 vs 請款 API 模式重複**
- **檔案**: `useReceiptMutations.ts` (389 行) vs `useRequestOperations.ts` (257 行)
- **重複**: 都做 insert → validate → recalculate stats → invalidate cache
- **建議**: 抽共用 `useFinanceMutations<T>` generic hook

### 4. **settings page 直接在 page.tsx 定義 3 個 Dialog 內部組件**
- **檔案**: `/src/app/(main)/finance/settings/page.tsx` 第 1002-1434 行
- **問題**: MethodDialog、BankDialog、CategoryDialog 都定義在同檔，1435 行單檔
- **建議**: 拆成 `components/MethodDialog.tsx` 等，page 引入

### 5. **中文標籤集中在一個檔案但尚未 i18n**
- **檔案**: `/src/features/finance/constants/labels.ts` (150+ 行的嵌套 Chinese label object)
- **狀況**: 已集中化，但未進行國際化準備
- **建議**: 留給後續 i18n sprint

### 6. **浮點數精度（無當前問題，但是跨模組風險）**
- **觀察**: `/src/features/finance/payments/services/receipt-core.service.ts` 使用 `DECIMAL(12,2)` 計算，math.js 或 decimal.js 未導入
- **風險**: 前端 JavaScript 浮點運算可能產生 0.1 + 0.2 ≠ 0.3 的精度誤差
- **建議**: 在 `formatCurrency` / `formatMoney` 已有四捨五入，但大額計算應驗證

---

## 🟢 健康面向

✅ **權限檢查** — `useTabPermissions()` 一致應用於所有 page  
✅ **API 封裝** — `createApiClient()` + `getCurrentWorkspaceId()` 統一模式  
✅ **實時同步** — Supabase realtime subscriptions 正常運作  
✅ **Labels 集中化** — 所有 UI 文字在 `constants/labels.ts`  
✅ **Entity Hook 規範** — 收款、請款、出納單都有 createEntityHook 包裝  
✅ **Error Handling** — 大多數地方用 `alert()` / `confirm()` 提示使用者  
✅ **Dynamic Import** — Dialogs 都用 dynamic() 延遲載入，減少初始 bundle  
✅ **Type Safety** — 大部分組件都有 interface 定義（除了 as unknown 地方）

---

## 跨模組 Pattern 候選

### A. **狀態值管理（跨 accounting + orders）**
- 財務：receipt status '0'/'1'、payment_request status 'pending'/'confirmed'
- 訂單：order payment_status 'unpaid'/'partial'/'paid'
- **建議**: 建立統一的 `FinanceStatusEnum` 並進行全 codebase migration

### B. **金額計算精度（跨 payments + disbursement + reports）**
- 當前用 JavaScript 原生 number + DECIMAL DB
- **建議**: 統一導入 `decimal.js` 或 `big.js` 供前端計算

### C. **重複的 stats 重算邏輯**
- `recalculateReceiptStats` (receipt-core.service.ts)
- `recalculateExpenseStats` (expense-core.service.ts，名稱不同但邏輯相似)
- **建議**: 合併成 `recalculateFinanceStats(type, id)`

---

## 掃描方法論

- ✓ 讀 8 個 page.tsx 入點
- ✓ 掃 49 個 finance features 下的 .tsx/.ts 檔
- ✓ 檢查 6 個 API route handlers
- ✓ 檢查 3 個 entity hooks SELECT 欄位
- ✓ 搜尋 `as any` / `as unknown` / `as never` 在財務邏輯區
- ✓ 檢查 status 值（'0'/'1' vs pending/confirmed）
- ✓ 搜尋重複 hook / 重複 service
- ✓ 檢查 workspace_id 過濾
- ✗ 不碰 migration（只讀 archive）
- ✗ 不改任何檔案

---

## 下一步

1. **立即** (上線前)：
   - [ ] 補 accounting-subjects / expense-categories GET 的 workspace_id 檢查
   - [ ] 統一 receipt/payment_request status 值（轉 enum）
   - [ ] RequestItem interface 補 transferred_pair_id、accounting_voucher_id 欄

2. **Wave 7**：
   - [ ] AddRequestDialog 1525 行拆分（已排入）
   - [ ] 補充拆分後的型別定義（配合 as unknown 清理）

3. **後續**：
   - [ ] BatchReceiptDialog 625 行拆分
   - [ ] settings page 對話框提取
   - [ ] 金額計算導入 decimal.js
   - [ ] 統一 stats 重算邏輯

---

**產出時間**: 2026-04-23 23:15 UTC+8  
**估計審計時間**: 45 分鐘  
**技術債總數**: 3 個紅 + 6 個黃 + 7 個綠
