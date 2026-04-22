# Agent A: 代碼現況 — /finance/payments

**日期**：2026-04-22 | **狀態**：⚠️ **Agent 原報告作廢**、主 Claude 自記代碼現況

---

## ⚠️ Agent 原報告作廢原因

Agent A（Explore）掃到 `/Users/williamchien/Projects/_archived/Corner/` 舊歸檔 repo、引用的檔案路徑、行號、變數名都是那邊的（例：宣稱 page.tsx 有 `canBatchConfirm = isAdmin || permissions.includes('accounting')` + 無整頁 role-gate — 跟 venturo-erp 實際代碼**不符**）。

**對照實際**：主 Claude Read `/Users/williamchien/Projects/venturo-erp/src/app/(main)/finance/payments/page.tsx` 確認：
- 共 254 行
- 第 60 行：`const { user, isAdmin } = useAuthStore()`（無 canBatchConfirm）
- **第 211 行：`if (!isAdmin) return <UnauthorizedPage />`**（整頁 role-gate、不是只擋 batch confirm）

---

## 主 Claude 手寫代碼現況

### 檔案清單（全部在 venturo-erp 內）

| 類型 | 路徑 | 用途 |
|---|---|---|
| Page | `src/app/(main)/finance/payments/page.tsx` (254 行) | 收款單列表 + 整頁 admin gate |
| Hook | `src/app/(main)/finance/payments/hooks/usePaymentData.ts` (277 行) | 建單 / 核准 / 改 / 刪、呼叫 service 重算 |
| Components (本路由) | `src/app/(main)/finance/payments/components/` | CreateReceiptDialog.tsx、PaymentItemForm.tsx |
| Components (feature) | `src/features/finance/payments/components/` | AddReceiptDialog、BatchReceiptDialog（page 動態 import） |
| Service | `src/features/finance/payments/services/receipt-core.service.ts` (185 行) | `recalculateReceiptStats` 重算 orders / tours |
| API | `src/app/api/linkpay/route.ts` | POST 建 LinkPay 連結（呼台新） |
| API | `src/app/api/linkpay/webhook/route.ts` | 台新回調、unauthenticated |
| Middleware | `src/middleware.ts:67-68` | `/api/linkpay` 列公開清單 |
| Data layer | `@/data` | useReceipts / createReceipt / updateReceipt / deleteReceipt |
| 通知 | `@/lib/utils/bot-notification.ts` | sendPaymentAbnormalNotification |
| 工具 | `@/lib/utils/receipt-number-generator.ts` | `{tourCode}-R{nn}` 格式 |

### 業務動作 vs 代碼對照

| 動作 | 代碼位置 | 動到的 DB table |
|---|---|---|
| 整頁進入 | `page.tsx:211` `if (!isAdmin)` | — |
| 建收款單 | `usePaymentData:75-151` `handleCreateReceipt` | receipts |
| 核准（面額 → 實收） | `usePaymentData:154-223` status='1' | receipts |
| 異常（差額 + 備註 + 通知） | 同上、第三參 `isAbnormal=true` | receipts |
| 改 | `usePaymentData:225-238` | receipts |
| 刪（已確認的擋下） | `usePaymentData:240-261` | receipts |
| 建 LinkPay 連結 | `usePaymentData:46-73` → `/api/linkpay` | linkpay_logs + receipts（回寫 link） |
| LinkPay 付款成功 | `/api/linkpay/webhook/route.ts` | linkpay_logs + receipts（actual_amount） |
| 重算訂單 | `receipt-core.service.ts:35-93` `recalculateOrderPayment` | **orders**（paid_amount + remaining_amount + **payment_status**） |
| 重算團財務 | `receipt-core.service.ts:99-169` `recalculateTourFinancials` | **tours**（total_revenue + profit） |

### 路由入口權限

- **只有 `page.tsx:211` `if (!isAdmin) return <UnauthorizedPage />`**
- 進頁後所有按鈕（新增 / 核准 / 異常 / 改 / 刪）**都沒有細分權限檢查**
- 刪除有 soft guard（`status === '1'` 擋下）、不是權限檢查

### 跨模組呼叫摘要

- `recalculateReceiptStats(orderId, tourId)` 在建單、核准、刪除後都會跑
- **所有 query 都沒加 `.eq('workspace_id', ...)`**、靠前端 session 的 RLS bouncer
- LinkPay webhook 是 unauthenticated、用 admin client 寫 receipts、**沒做 workspace 一致性檢查**
