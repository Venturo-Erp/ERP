# Agent B: SSOT / RLS / 欄位一致性（代碼層）— /finance/payments

**日期**：2026-04-22 | **來源**：Agent B Explore + 主 Claude 過濾（剔除 Agent 摻雜 _archived 部分）

---

## 核心結論（已與 venturo-erp 實際代碼對得上）

### SSOT 一致性

- ✅ `Receipt` 型別在 `src/types/receipt.types.ts`、stores / data 層都重新導出同一源、沒有多處定義
- 🔴 `orders.payment_status` 代碼真的存在且會被寫
    - `receipt-core.service.ts:73-81` 每次收款變動都 `update orders.payment_status = 'paid' | 'partial' | 'unpaid'`
    - William 明說「不該存」
- ✅ `tours` 只回寫 `total_revenue` + `profit` 兩個欄位（receipt-core.service.ts:150-157）、沒有 orders 那種冗餘

### 租戶隔離（代碼層）

- 🔴 `usePaymentData:105` `workspace_id: user.workspace_id || ''` — 空字串寫入風險、違反 CLAUDE.md 紅線
- 🔴 `recalculateReceiptStats` 所有 query 都沒加 `.eq('workspace_id', ...)`（orders / tours / receipts 都是只 eq order_id / tour_id / status）— 靠 RLS 守門、改 admin client 或 service_role 時立即洩漏
- 🔴 LinkPay `/api/linkpay/webhook/route.ts` unauthenticated、用 admin client 寫 receipts、**沒做** workspace 一致性檢查 — 跟 /login sync-employee 同型風險

### 欄位一致性

| 欄位 | UI 顯示 | hook 命名 | DB column |
|---|---|---|---|
| 收款金額 | receiptAmount | `amount` + `receipt_amount` 同值雙寫 (L116) | `amount` + `receipt_amount` + `total_amount`（第三個沒人用） |
| 實收金額 | actualAmount | `actual_amount` (L118) | `actual_amount` ✅ |
| 付款方式 | 5 種 | `payment_method` (文字) + `receipt_type` (數字) 雙寫 (L113-114) | 同 + `payment_method_id` (UUID、不寫、F 發現紅燈) |
| 狀態 | 待確認 / 已確認 | `status: '0' / '1'` (L119) | `status` text ✅ 但 `confirmed_at` / `confirmed_by` 孤兒 |
| 日期 | receiptDate | `transaction_date`（1 個來源）分別寫 receipt_date + payment_date (L111-112) | 兩個欄位雙寫 |

### 權限（Role-based vs Permission-based）

- 🔴 `page.tsx:211` 用 `isAdmin` 大鎖、違反原則 1 + 2
- 🔴 `useAuthStore` 的 checkPermission 在 /login 驗證已發現有 `if (isAdmin) return true` 短路（auth-store.ts:249）— **繼承到本頁**
- ❌ 本頁沒呼叫 `useTabPermissions` 或 `usePermissions`、沒去查 workspace_roles.role_tab_permissions
- ⚠️ `role_tab_permissions` 是否有「公司收款」這個 key — 需要 grep 或讀 seed migration 確認（本次沒查、列進 SITEMAP 建議行動）

---

## 嚴重度總結

| # | 項目 | 嚴重度 | 位置 | 原則 |
|---|---|---|---|---|
| 1 | page.tsx 用 isAdmin 大鎖 | 🔴 | page.tsx:211 | 違反 1 + 2 |
| 2 | orders.payment_status 雙寫 + 和 William 設計衝突 | 🔴 | receipt-core.service.ts:73-81 | 違反候選原則 3 |
| 3 | createReceipt 空字串 workspace_id | 🟡 | usePaymentData:105 | 違反 CLAUDE.md 紅線 |
| 4 | recalculateReceiptStats 無 workspace 過濾（靠 RLS） | 🟡 | receipt-core.service.ts 全段 | 潛在污染 |
| 5 | LinkPay webhook 無租戶驗證 | 🔴 | api/linkpay/webhook/route.ts | 跨租戶污染 |
| 6 | payment_method + receipt_type 雙寫硬 coding | 🟡 | usePaymentData:113-114 | 歷史相容但膨脹 |

---

## Agent B 原報告中**剔除**的內容（混到 _archived）

- AddReceiptDialog:88-93 `isAccountant = isAdmin || user?.permissions?.includes('accounting')` — 此片段在 venturo-erp 的該 dialog 可能存在也可能不存在、**本次未 Read 驗證**、不採納、列進 SITEMAP「下次補驗」
- `canBatchConfirm` 變數 — venturo-erp page.tsx 沒有、作廢
