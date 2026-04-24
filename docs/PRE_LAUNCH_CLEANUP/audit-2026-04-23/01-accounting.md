# Accounting 會計模組體檢報告

**掃描日期**：2026-04-23  
**範圍**：10 個 page.tsx + 3 個 API route + 5 個 component + DB schema  
**掃描者**：Explore agent

---

## 一句話狀況

會計模組主體架構健康、RLS 正確、API 層設計良好，**但前端高重複度** - 試算表/損益表/資產負債表各自重寫相同的查詢邏輯（3 處 copy-paste），科目頁面的 `is_favorite` 欄位定義散亂（DB 無欄位但程式碼在用），支票頁面留 commented code 佔位、建議清理。

---

## 🔴 真問題（上線前處理）

### 1. DB + Code 不同步：`chart_of_accounts.is_favorite` 欄位幽靈化

**檔案**：

- DB Schema: `/Users/williamchien/Projects/venturo-erp/supabase/migrations/20251216130000_create_accounting_module.sql` (無 `is_favorite` 定義)
- Code 使用: `/Users/williamchien/Projects/venturo-erp/src/app/(main)/accounting/accounts/page.tsx` L131-135
- Type 宣告: `/Users/williamchien/Projects/venturo-erp/src/types/database.types.ts` L2553 (標記 `is_favorite: boolean | null`)

**證據**：

```typescript
// accounts/page.tsx L131-135
setAccounts(
  (data || []).map(d => ({
    ...d,
    is_favorite: ((d as Record<string, unknown>).is_favorite as boolean) ?? false,
  }))
)
```

程式碼在試圖讀取一個 **DB 表裡不存在的欄位**，用 `??false` 當保險，但這是破窗信號。

**為什麼是問題**：

- 頁面能「標記為常用」（L145-164 的 `toggleFavorite` 呼叫 `update` 但欄位不存在 → silent fail）
- 後續若有 migration 加上 `is_favorite`，之前執行過的 toggle 會被丟棄（無資料持久化）
- Type 欺騙：TypeScript 說有、SQL 說沒有

**建議**：S（Simple）

- **方案 A**（推薦）：在 migration 加欄位：`ALTER TABLE chart_of_accounts ADD COLUMN is_favorite boolean DEFAULT false;`
- **方案 B**：移除所有 `is_favorite` UI（Star button、localStorage 改方案）

---

### 2. 支票頁面 → Stub 實現（所有操作被註解掉）

**檔案**：`/Users/williamchien/Projects/venturo-erp/src/app/(main)/accounting/checks/page.tsx`

**證據**：

```typescript
// L43-65: loadChecks 被棄用
const loadChecks = async () => {
  if (!user?.workspace_id) return
  setIsLoading(true)
  try {
    // const supabase = createBrowserClient(...)
    // const { data, error } = await supabase
    //   .from('checks')
    //   .select('*')
    //   .eq('workspace_id', user.workspace_id)
    // ...
    setChecks([]) // 永遠回傳空陣列
  }
}

// L152: 查看詳細 → empty handler
const handleViewDetail = (check: Check) => {}

// L154-172: 標記已兌現 → 所有 DB 操作被註解、無實作
const handleClearCheck = async (check: Check) => {
  if (!confirm(...)) return
  try {
    // const supabase = createBrowserClient(...)
    // const { error } = await supabase
    //   .from('checks')
    //   .update({ status: 'cleared' })
    // ...
  }
}
```

**為什麼是問題**：

- 頁面提供的「標記已兌現」「作廢」按鈕是騙人的（能點但沒反應）
- 使用者期望能管理支票狀態、但功能根本沒完成
- 留著 commented code 造成閱讀困擾、暗示「還在施工」

**建議**：M（Medium）

- 要麼 **完整實作**（需要 `checks` 表 schema + API + dialog component）
- 要麼 **移除整個頁面**（改為「期末支票管理」BACKLOG）
- **不接受** 一直掛在那邊有殘留代碼

---

### 3. 報表層計算邏輯 3 處 copy-paste（無共用 hook）

**檔案**：

- 試算表：`/Users/williamchien/Projects/venturo-erp/src/app/(main)/accounting/reports/trial-balance/page.tsx` L56-94
- 損益表：`/Users/williamchien/Projects/venturo-erp/src/app/(main)/accounting/reports/income-statement/page.tsx` L56-96
- 資產負債表：`/Users/williamchien/Projects/venturo-erp/src/app/(main)/accounting/reports/balance-sheet/page.tsx` L50-89

**證據**（共用邏輯）：

```typescript
// 試算表 L66-82
const { data: lines } = await supabase
  .from('journal_lines')
  .select(
    `
    account_id,
    debit_amount,
    credit_amount,
    voucher:journal_vouchers!inner(voucher_date, workspace_id)
  `
  )
  .eq('voucher.workspace_id', user.workspace_id)
  .lte('voucher.voucher_date', endDate)

// 損益表 L68-82（幾乎相同，只改了日期條件）
const { data: lines } = await supabase
  .from('journal_lines')
  .select(
    `
    account_id,
    debit_amount,
    credit_amount,
    voucher:journal_vouchers!inner(voucher_date, workspace_id)
  `
  )
  .eq('voucher.workspace_id', user.workspace_id)
  .gte('voucher.voucher_date', startDate)
  .lte('voucher.voucher_date', endDate)

// 資產負債表 L62-75（又是一份copy）
const { data: lines } = await supabase
  .from('journal_lines')
  .select(
    `
    account_id,
    debit_amount,
    credit_amount,
    voucher:journal_vouchers!inner(voucher_date, workspace_id)
  `
  )
  .eq('voucher.workspace_id', user.workspace_id)
  .lte('voucher.voucher_date', asOfDate)
```

**後續計算也是重複**：

```typescript
// 試算表 L85-94 計算餘額
const balanceMap = new Map<string, { debit: number; credit: number }>()
lines.forEach(line => {
  const existing = balanceMap.get(line.account_id) || { debit: 0, credit: 0 }
  existing.debit += line.debit_amount || 0
  existing.credit += line.credit_amount || 0
  balanceMap.set(line.account_id, existing)
})

// 損益表 L87-96（邏輯不同但結構 copy）
const balanceMap = new Map<string, number>()
lines.forEach(line => {
  const existing = balanceMap.get(line.account_id) || 0
  balanceMap.set(line.account_id, existing + (line.credit_amount - line.debit_amount))
})

// 資產負債表 L80-89（又是一份）
const balanceMap = new Map<string, number>()
lines.forEach(line => {
  const existing = balanceMap.get(line.account_id) || 0
  balanceMap.set(line.account_id, existing + (line.debit_amount - line.credit_amount))
})
```

**為什麼是問題**：

- 如果 journal_lines schema 改變，需要 3 處都改（易漏、易出 bug）
- 查詢邏輯如果需要加 workspace_id filter 增強安全性，要改 3 次
- 計算邏輯有細微差異（debit-credit vs credit-debit）容易混淆、下次改會出錯

**建議**：M（Medium）

- 提取共用 hook：`useJournalLinesByDateRange()` → 返回 `(startDate?, endDate?) => Promise<JournalLine[]>`
- 提取計算 hook：`useAccountBalances(lines, balanceType: 'standard'|'plStatement')` → 返回計算好的 Map

---

### 4. 傳票編號生成 2 處重複 + 1 處 singleton bug

**檔案**：

- `/Users/williamchien/Projects/venturo-erp/src/app/api/accounting/vouchers/create/route.ts` L23-51
- `/Users/williamchien/Projects/venturo-erp/src/app/api/accounting/vouchers/auto-create/route.ts` L64-86（copy）
- `/Users/williamchien/Projects/venturo-erp/src/app/api/accounting/period-closing/route.ts` L21-48（又是copy）

**證據**：

```typescript
// create/route.ts L23-51 首個實作
async function generateVoucherNo(...) {
  const yearMonth = date.substring(0, 7).replace('-', '')
  const prefix = `JV${yearMonth}`
  const { data, error } = await supabase.from('journal_vouchers').select(...)
    .like('voucher_no', `${prefix}%`)
    .order('voucher_no', { ascending: false })
    .limit(1)
  // ... seq 計算邏輯
  return `${prefix}${seq.toString().padStart(4, '0')}`
}

// auto-create/route.ts L64-86 完全複製（只改參數順序）
async function generateVoucherNo(workspaceId: string, date: string) {
  const yearMonth = date.substring(0, 7).replace('-', '')
  const prefix = `JV${yearMonth}`
  // ... 同上
}
```

**還有 singleton 風險**：

```typescript
// auto-create/route.ts L6-16
let supabase: SupabaseClient // ⚠️ 全域 singleton

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabase
}
```

違反 CLAUDE.md 規則：「系統主管 client 必須 per-request、不准 singleton」（L18）。

**為什麼是問題**：

- 3 處都改會漏
- Singleton client 若中途 token 過期、不會重建、會在後續請求中悄悄失敗
- 編號衝突風險：3 個 API endpoint 同時呼叫會產生重複編號（race condition）

**建議**：M（Medium）

- 提取 helper：`src/lib/accounting/voucher-utils.ts` 內含 `generateVoucherNo()`
- 修正 auto-create 改用 per-request client（改成 `const supabase = await createSupabaseServerClient()`）

---

## 🟡 小債（上線後處理）

### 5. 檢查頁面 interface 定義多了無用欄位

**檔案**：`/Users/williamchien/Projects/venturo-erp/src/app/(main)/accounting/checks/page.tsx` L14-24

**證據**：

```typescript
interface Check {
  id: string
  check_number: string
  check_date: string
  due_date: string
  amount: number
  payee_name: string
  status: 'pending' | 'cleared' | 'voided' | 'bounced'
  memo: string | null
  created_at: string
}
```

但 `checks` 表根本不查（永遠 `setChecks([])`），這個 interface 無用。

**建議**：S（Simple）

- 清理時一起刪

---

### 6. 期末結轉 API 查詢 「3200」「3300」 科目代碼硬編

**檔案**：`/Users/williamchien/Projects/venturo-erp/src/app/api/accounting/period-closing/route.ts` L195-221

**證據**：

```typescript
// L196-205
const { data: currentProfitAccount, error: profitAccountError } = await supabase
  .from('chart_of_accounts')
  .select('id')
  .eq('workspace_id', workspaceId)
  .eq('code', '3200') // 硬編 ❌
  .single()

if (profitAccountError || !currentProfitAccount) {
  return NextResponse.json({ error: '找不到「3200 本期損益」科目' }, { status: 400 })
}

// L210-221
const { data, error } = await supabase
  .from('chart_of_accounts')
  .select('id')
  .eq('workspace_id', workspaceId)
  .eq('code', '3300') // 硬編 ❌
  .single()
```

**為什麼是問題**：

- 已列 BACKLOG（「3200 / 3300 硬編碼」在規格中標註為 TODO）
- Corner 旅行社可能用不同科目代碼（e.g. 「3999 本期損益」）
- 年結時會 crash 而非優雅降級

**建議**：L（Low priority）

- 建議納入「科目管理 UI」讓使用者自訂「損益結轉科目」「保留盈餘科目」
- 暫時可用 `workspace_settings` 表存放預設

---

### 7. 試算表平衡檢查 floating point 容差寫法散亂

**檔案**：

- trial-balance/page.tsx L239
- period-closing/route.ts L107
- balance-sheet/page.tsx L321

**證據**：

```typescript
// trial-balance L239-245
if (Math.abs(totals.debit - totals.credit) > 0.01 && ...) {
  return <tr className="bg-morandi-red/10">

// balance-sheet L321-322
Math.abs(data.totalAssets - (data.totalLiabilities + data.totalEquity)) < 0.01
  ? 'bg-morandi-green/10'
  : 'bg-morandi-red/10'
```

**為什麼是問題**：

- `0.01` vs `0.01` 容差沒統一（都是 0.01 還好，但改容差要改 3 處）
- 應該用常數

**建議**：S（Simple）

- 新增常數：`src/lib/accounting/constants.ts` 內 `DECIMAL_TOLERANCE = 0.01`

---

### 8. 科目樹狀顯示邏輯高度複雜、維護性低

**檔案**：`/Users/williamchien/Projects/venturo-erp/src/app/(main)/accounting/accounts/page.tsx` L28-88

**證據**：

```typescript
// L28-35 層級計算（基於 code 長度、很脆弱）
function getAccountLevel(code: string): number {
  if (code.length === 1) return 0
  if (code.length === 2) return 1
  if (code.length === 4) return 2
  if (code.includes('-')) return 3
  return 2
}

// L73-85 可見性判斷（遍歷祖先鏈、O(n) 複雜度）
const isVisible = (account: Account): boolean => {
  if (!account.parent_id) return true
  let current = account
  while (current.parent_id) {
    if (!expandedIds.has(current.parent_id)) return false
    const parent = accounts.find(a => a.id === current.parent_id)
    if (!parent) break
    current = parent
  }
  return true
}
```

**為什麼是問題**：

- `getAccountLevel()` 假設特定代碼長度規則（如果資料不符會 bug）
- `isVisible()` 邏輯每個 account 都跑、當科目數 >500 會變慢
- 應該用 `parent_id` FK 而不是 `code` 推測層級

**建議**：L（Low priority）

- 改用 DB 計算或展開成樹狀結構傳回（而非 client 端計算）

---

## 🟢 健康面向

### 1. ✅ RLS 策略完整

所有表（chart_of_accounts、journal_vouchers、journal_lines 等）都啟用 RLS + workspace_id 過濾，無 `FORCE RLS` 違規。參考：`20251216130000_create_accounting_module.sql` L214-220。

### 2. ✅ 審計欄位正確化

`created_by` / `closed_by` 統一指 `employees(id)`，不是 `auth.users(id)`。參考：period-closing API L152-158。

### 3. ✅ API 層驗證完整

三個 API endpoint 都用 Zod schema 驗證輸入、回滾邏輯完善（傳票失敗時自動刪除分錄）。參考：create/route.ts L7-21、L141-147。

### 4. ✅ 傳票平衡檢查 (debit = credit)

前端 (CreateVoucherDialog L191-193) 和後端 (create/route.ts L88-97) 都檢查借貸平衡，雙重防護。

### 5. ✅ 結轉邏輯符合會計規則

period-closing API 正確區分「月結/季結」(損益結轉到「本期損益」) vs「年結」(另結轉到「保留盈餘」)。邏輯清晰。

### 6. ✅ 報表 UI 提供用戶指引

每份報表都有「說明」section，標註公式、平衡檢查、顏色含義等，降低誤讀風險。

---

## 跨模組 pattern 候選

### 1. 「中央化 query hook」template

```
本模組找到：3 份報表都重寫 journal_lines 查詢
其他模組風險：finance/payments、sales/orders 很可能也在 copy-paste 數據查詢
建議：src/hooks/accounting/useJournalLines.ts
      src/hooks/finance/usePaymentRequests.ts
      ...
提高整個 ERP 的查詢一致性、減少 schema 變更時的修改面。
```

### 2. 「編號生成器」工廠

```
本模組找到：voucher_no 3 處生成邏輯、還有 singleton client bug
其他模組風險：payment_requests.code、tours.tour_code、receipts.receipt_number 等
             很可能也在 copy-paste「取最後一個編號、+1」邏輯
建議：src/lib/erp/number-generator.ts
      export function createNumberGenerator(prefix: string, workspace: string) {
        return async () => { ... }
      }
提高可測試性、減少 race condition。
```

### 3. 「floating point 容差常數」

```
本模組找到：3 個地方各自 hardcode 0.01
其他模組風險：金額比較散布在 finance、tours 模組
建議：src/lib/erp/constants.ts
      export const DECIMAL_TOLERANCE = 0.01
統一所有金額/餘額的容差。
```

---

## 行動清單

### 上線前必做（RED）

1. **解決 `is_favorite` 幽靈欄位** - 加 migration 或拔掉 UI
2. **刪掉支票頁面的 commented code** - 或完整實作
3. **修正 auto-create API 的 singleton client** - 改 per-request

### 上線後優化（YELLOW）

4. 提取報表查詢共用 hook
5. 統一傳票編號生成器
6. 「3200」「3300」科目代碼參數化

### 可緩後處理（GREEN）

7. 科目樹狀顯示邏輯重構（改 server-side）
8. Floating point 容差統一到常數

---

**掃描結束** | 這份報告可供產品經理/CTO 上線決策參考。
