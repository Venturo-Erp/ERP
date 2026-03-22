# 會計系統實作計畫

**制定日期**: 2026-03-19  
**負責人**: Matthew + William AI

---

## 📋 現況總結

### ✅ 已完成（85%）

1. **科目表** — 完整（asset, liability, equity, revenue, expense, cost）
2. **銀行帳戶** — 完整
3. **自動過帳** — 收款/付款/結團 完整
4. **傳票系統** — 查看/反沖 完整
5. **報表** — 5 大報表（總帳、試算表、損益表、資產負債表、現金流量表）
6. **期末結轉** — 基本功能完整

### ⚠️ 待實作（15%）

1. 個人記帳編輯/刪除（RPC 原子化）
2. 手動新增傳票
3. 保留盈餘結轉優化
4. 現金流量分類優化
5. 帳戶編輯功能

---

## 🎯 Phase 1: 核心功能補完（1 週）

### 1.1 個人記帳 RPC 原子化

**問題**：

- 編輯/刪除交易時，餘額沒有正確回滾
- 目前只有新增交易有 RPC（`create_atomic_transaction`）

**解決方案**：

```sql
-- 1. 刪除 RPC
CREATE OR REPLACE FUNCTION delete_atomic_transaction(
  p_transaction_id uuid,
  p_user_id uuid
) RETURNS void AS $$
BEGIN
  -- 1. 取得交易
  -- 2. 回滾帳戶餘額
  -- 3. 刪除交易
END;
$$ LANGUAGE plpgsql;

-- 2. 更新 RPC
CREATE OR REPLACE FUNCTION update_atomic_transaction(
  p_transaction_id uuid,
  p_user_id uuid,
  p_new_amount numeric,
  p_new_account_id uuid,
  p_new_category_id uuid,
  p_new_description text,
  p_new_transaction_date date
) RETURNS void AS $$
BEGIN
  -- 1. 取得舊交易
  -- 2. 回滾舊餘額
  -- 3. 更新交易
  -- 4. 計算新餘額
END;
$$ LANGUAGE plpgsql;
```

**實作檔案**：

- `supabase/migrations/20260319_accounting_atomic_update_delete.sql`
- `src/stores/accounting-store.ts`（更新 `updateTransaction`, `deleteTransaction`）
- `src/components/accounting/EditTransactionDialog.tsx`（新增）

**測試**：

1. 新增交易 → 檢查餘額
2. 編輯交易金額 → 檢查餘額正確
3. 刪除交易 → 檢查餘額回滾

---

### 1.2 手動新增傳票

**問題**：

- 目前只能查看自動生成的傳票，無法手動建立
- 缺少「調整分錄」功能

**解決方案**：

```typescript
// 1. API Route
POST /api/accounting/vouchers/create
{
  voucher_date: '2026-03-19',
  memo: '手動調整分錄',
  lines: [
    { account_id: 'uuid', debit_amount: 1000, credit_amount: 0, description: '借方' },
    { account_id: 'uuid', debit_amount: 0, credit_amount: 1000, description: '貸方' }
  ]
}

// 2. 借貸平衡檢查
const totalDebit = lines.reduce((sum, l) => sum + l.debit_amount, 0)
const totalCredit = lines.reduce((sum, l) => sum + l.credit_amount, 0)
if (totalDebit !== totalCredit) throw new Error('借貸不平衡')

// 3. 傳票編號生成
function generateVoucherNo(date: Date): string {
  const yearMonth = format(date, 'yyyyMM')
  // SELECT MAX(voucher_no) WHERE voucher_no LIKE 'JV{yearMonth}%'
  const lastNo = ... // 從資料庫取得最後一個編號
  const seq = lastNo ? parseInt(lastNo.slice(-4)) + 1 : 1
  return `JV${yearMonth}${seq.toString().padStart(4, '0')}`
}
```

**實作檔案**：

- `src/features/erp-accounting/components/CreateVoucherDialog.tsx`（新增）
- `src/app/api/accounting/vouchers/create/route.ts`（新增）
- `src/features/erp-accounting/components/VouchersPage.tsx`（加「新增傳票」按鈕）

**UI 設計**：

```
┌─────────────────────────────────────────────┐
│ 新增傳票                                    │
├─────────────────────────────────────────────┤
│ 日期: [2026-03-19]                          │
│ 說明: [手動調整分錄]                        │
│                                             │
│ 分錄明細:                                   │
│ ┌─────────────────────────────────────────┐ │
│ │ 科目      │ 摘要    │ 借方   │ 貸方    │ │
│ │ 1100 銀行 │ 調整    │ 1,000  │ 0       │ │
│ │ 4100 團費 │ 調整    │ 0      │ 1,000   │ │
│ │ [+ 新增分錄]                            │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 總計: 借方 1,000 | 貸方 1,000  ✅ 平衡      │
│                                             │
│ [取消] [儲存草稿] [過帳]                    │
└─────────────────────────────────────────────┘
```

---

### 1.3 保留盈餘結轉優化

**問題**：

- 期末結轉只把損益科目歸零，沒有結轉到「本期損益」和「保留盈餘」

**解決方案**：

```typescript
// 現行邏輯（src/features/accounting/hooks/usePeriodClosing.ts）
// 1. 計算損益科目餘額 → net_income
// 2. 將損益科目借貸互換歸零

// 改良後邏輯
// 1. 計算損益科目餘額 → net_income
// 2. 將損益科目借貸互換歸零
// 3. 新增分錄：
//    - 淨利 → 借: 損益科目總額 | 貸: 3200 本期損益
//    - 淨損 → 借: 3200 本期損益 | 貸: 損益科目總額
// 4. 年度結轉額外步驟：
//    - 將「3200 本期損益」結轉到「3300 保留盈餘」
```

**實作檔案**：

- `src/features/accounting/hooks/usePeriodClosing.ts`（修改 `closePeriod` 函數）

**測試**：

1. 結轉前：損益科目有餘額
2. 結轉後：損益科目歸零 + 3200 本期損益 = net_income
3. 年度結轉：3200 → 3300 保留盈餘

---

## 🎯 Phase 2: 報表優化（3 天）

### 2.1 現金流量表分類優化

**問題**：

- 目前所有現金變動都歸類為「營業活動」
- 缺少「投資活動」和「融資活動」分類

**解決方案**：

```typescript
// 分類規則
const classifyCashFlow = (account: Account): 'operating' | 'investing' | 'financing' => {
  const code = account.code

  // 投資活動（固定資產、長期投資）
  if (code.startsWith('15') || code.startsWith('16')) return 'investing'

  // 融資活動（長期負債、股本）
  if (code.startsWith('25') || code.startsWith('31')) return 'financing'

  // 預設：營業活動
  return 'operating'
}
```

**實作檔案**：

- `src/features/accounting/hooks/useAccountingReports.ts`（修改 `getCashFlowStatement`）

---

### 2.2 帳戶編輯功能

**問題**：

- 個人記帳帳戶管理對話框只能新增/刪除，無法編輯

**解決方案**：

```typescript
// 1. 加入編輯按鈕
<Button variant="ghost" size="iconSm" onClick={() => setEditingAccount(account)}>
  <Edit3 size={16} />
</Button>

// 2. 編輯對話框（複用新增對話框）
<AccountDialog
  mode={editingAccount ? 'edit' : 'create'}
  account={editingAccount}
  onSave={handleSave}
/>
```

**實作檔案**：

- `src/components/accounting/accounts-management-dialog.tsx`

---

## 🎯 Phase 3: 進階功能（可選）

### 3.1 傳票審批流程

- 草稿 → 待審批 → 已過帳
- 審批權限管理

### 3.2 多幣別支援

- 外幣收款/付款
- 匯率管理
- 外幣報表

### 3.3 會計期間鎖定

- 關帳後禁止修改
- 解鎖需要授權

---

## 📅 實作時程

| 階段      | 任務         | 預計時間 | 負責人  |
| --------- | ------------ | -------- | ------- |
| Phase 1.1 | 個人記帳 RPC | 2 天     | Matthew |
| Phase 1.2 | 手動新增傳票 | 3 天     | Matthew |
| Phase 1.3 | 保留盈餘結轉 | 1 天     | Matthew |
| Phase 2.1 | 現金流量優化 | 1 天     | Matthew |
| Phase 2.2 | 帳戶編輯功能 | 1 天     | Matthew |
| **總計**  |              | **8 天** |         |

---

## 🔧 技術債

### 已知問題（低優先級）

1. `IncomeStatementReport.tsx` — useEffect 依賴警告
2. `ReverseVoucherDialog.tsx` — API 參數冗餘（workspace_id, user_id）
3. 預設科目表缺少部分權益科目

---

## 📝 備註

- **Phase 1 是核心功能，必須完成**
- **Phase 2 優化使用者體驗**
- **Phase 3 可依業務需求決定優先級**

---

**下一步**：

1. William 確認優先級
2. Matthew 開始實作 Phase 1.1
3. 每日回報進度

**建立時間**: 2026-03-19 14:26  
**制定者**: William AI 🔱
