---
type: boundaries
status: stable
updated: 2026-05-03
summary: HR / Finance / Accounting 三大模組業務邊界 — 開發新功能時判斷該歸哪個模組的依據
---

# HR / Finance / Accounting 模組邊界

> 寫於 2026-05-03 自主迭代 Round 12
> 目的：解決三模組職責模糊、新功能不知道該放哪
> 三者不重疊、有明確業務語意

---

## 一句話定位

| 模組 | 一句話 | 對象 |
|---|---|---|
| **HR** | 「員工的事」 | 員工本人 / HR 主管 |
| **Finance** | 「旅行社業務的金錢工作流」 | 業務員 / 會計助理 |
| **Accounting** | 「給記帳士 / 會計師看的傳統會計帳簿」 | 會計師 / 記帳士 |

---

## 業務鏈條（誰觸發誰）

```
[人] 員工            [業務] 旅遊團 / 訂單              [外部] 客戶 / 供應商
   ↓                       ↓                              ↓
   └──→ HR ←──────────────────────────────────────────────┘
        │ (打卡 / 請假 / 加班 / 薪資)
        ↓
        Finance ←─────────────── (請款 / 付款 / 收款 / 出納) ──── 旅遊團結案
        │
        ↓
        Accounting （傳票 / 帳簿 / 報表）
```

**規則**：
- HR 不直接動會計帳、要走 Finance 中介
- Finance 不直接寫帳、要走 Accounting 傳票
- Accounting 是最末端、只接收已結算的金錢動作

---

## HR 模組職責

**定位**：管「人」（員工）的所有事、產出對員工的金額決定（薪資 / 加班費）。

### 路由
- `/hr` — 員工列表 / 主入口
- `/hr/attendance` — 打卡
- `/hr/leave` — 請假
- `/hr/overtime` — 加班
- `/hr/missed-clock` — 補卡
- `/hr/deductions` — 扣項
- `/hr/payroll` → `/hr/payroll/[id]` — 薪資批次
- `/hr/roles` — 角色 / 權限
- `/hr/reports` — 人資報表
- `/hr/settings` — 人資設定
- `/payslip` — 員工查自己薪資（跨模組、員工視角）

### Schema
- `employees / employees_terminated / workspace_roles / role_capabilities`
- `clock_records / attendance_*`
- `leave_requests / leave_balances / leave_types`
- `overtime_requests / missed_clock_requests`
- `payroll_runs / payslips`

### 不該放 HR 的（誤判清單）
- ❌ 員工請款報帳 → 屬 Finance（那是「金錢工作流」、不是 HR 業務）
- ❌ 薪資的會計傳票 → 屬 Accounting（HR 算出薪資金額、Accounting 入帳）

---

## Finance 模組職責

**定位**：旅行社做業務時的「金錢流動」工作流（請款 → 付款 → 收款 → 出納）、串接旅遊團 / 訂單跟最末端的 Accounting。

### 路由
- `/finance` — 主入口
- `/finance/requests` — 請款單（業務發起）
- `/finance/payments` — 付款（給供應商）
- `/finance/treasury` → `/finance/treasury/disbursement` — 出納單
- `/finance/reports` → `/finance/reports/unpaid-orders` — 業務財務報表
- `/finance/settings` — 財務設定

### Schema
- `payment_requests / payment_request_items` — 請款 SSOT
- `disbursement_orders` — 出納單
- `receipts` — 收據（含 LinkPay 付款連結紀錄）
- `bank_accounts / payment_methods` — 工具表

### Code 結構（職責不重疊、不該砍）
- `features/payments/` — **請款 / 出納 service 核心**（payment-request.service / disbursement-order.service）
- `features/finance/payments/` — **付款 form / 收據 mutation**（usePaymentForm / useReceiptMutations）
- `features/disbursement/` — **出納單獨立模組**（17 files、跟 payment-request 是「請款 → 出納」兩階段）

→ 三者命名重疊但職責不同、命名建議統整見下節。

### 不該放 Finance 的
- ❌ 會計科目 / 傳票 → 屬 Accounting
- ❌ 員工薪資計算 → 屬 HR（Finance 只接 HR 算好的金額去出納）

---

## Accounting 模組職責

**定位**：傳統會計帳簿、給記帳士 / 會計師看的標準會計流程（科目 → 傳票 → 結帳 → 報表）。

### 路由
- `/accounting` — 主入口
- `/accounting/accounts` — 會計科目
- `/accounting/checks` — 票據
- `/accounting/opening-balances` — 期初餘額
- `/accounting/period-closing` — 期末結算
- `/accounting/vouchers` — 傳票
- `/accounting/reports/balance-sheet` — 資產負債表
- `/accounting/reports/general-ledger` — 總帳
- `/accounting/reports/income-statement` — 損益表
- `/accounting/reports/trial-balance` — 試算表

### Schema
- `chart_of_accounts / accounting_accounts` — 會計科目表
- `journal_vouchers / journal_lines` — 傳票
- `accounting_period_closings` — 期末結轉
- `checks` — 票據

### 不該放 Accounting 的
- ❌ 業務報表（哪個團賺多少）→ 屬 Finance/reports
- ❌ 員工出勤統計 → 屬 HR/reports

---

## 邊界模糊點 + 建議

### 1. payments 三邊命名重疊

現況：
- `features/payments/` — 請款 service（核心）
- `features/finance/payments/` — 付款 form
- `features/disbursement/` — 出納單

職責不重疊、但名字都含「payment」。

**建議重構（不急、看到時順手改）**：
- `features/payments/` → 改名 `features/finance/billing/`（請款 = billing）
- `features/finance/payments/` 維持（付款 = payment）
- `features/disbursement/` → 移到 `features/finance/disbursement/`（同一個 finance 範疇）

### 2. payslip 跨 HR / Finance

員工查薪資（`/payslip`）：
- 資料來源 = HR（`payslips` 表）
- 但語意是「員工拿錢」、跟 Finance 互動

**結論**：保持 `/payslip` 獨立路由（員工視角）、實作走 HR schema、UI 設計時提示「這是你 N 月份的薪水」（員工友善）、不必塞進 `/hr/payroll/[id]` （那是 HR 主管視角）。

### 3. 旅遊團結案 → Finance 觸發

旅遊團結案時自動建請款單（payment_request）→ 走 Finance 流程。
這是「業務事件」觸發「Finance 模組」、不是 Finance 主動發起、code 應放 Finance（接收 event）、不放 features/tours/。

---

## 開發判斷流程

新功能要放哪個模組：

1. **是員工的事嗎？**（薪水 / 出勤 / 請假 / 員工自己看的）→ HR
2. **是金錢工作流嗎？**（請款 / 付款 / 收款 / 出納）→ Finance
3. **是會計師看的嗎？**（科目 / 傳票 / 帳簿 / 標準會計報表）→ Accounting
4. **跨多個？** → 用「對象」決定路由放哪、用「資料 SSOT」決定 service 放哪
   例：員工薪資 → 路由 `/hr/payroll`（HR 主管管）、出納 service 在 `features/disbursement/`、傳票 service 在 `features/accounting/`
