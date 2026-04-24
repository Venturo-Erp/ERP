# Agent C: 邏輯重複 + 必抓 pattern — /finance/payments

**日期**：2026-04-22 | **來源**：Agent C Explore + 主 Claude 過濾

---

## Pattern 1：Role-gate 偽裝成 Permission-gate — 🔴

- `page.tsx:211` `if (!isAdmin) return <UnauthorizedPage />` — 整頁 role-gate（主 Claude 親自 Read 確認）
- `useAuthStore.checkPermission` 短路：/login 驗證已發現 `auth-store.ts:249` `if (isAdmin) return true`（本頁繼承）
- 建單 / 核准 / 異常 / 刪 四個動作**完全沒**呼叫 hasPermission
- William 期待的「公司收款」權限 key 在代碼中**從來沒被查過**

---

## Pattern 2：UI 寫了但後端沒接 — 🟡（混合）

### 2.1 LinkPay 欄位使用場景混亂

- `email` / `payment_name` / `pay_dateline` 在 LINKPAY 時必填、在其他付款方式時 UI 仍顯示但 DB 會存（不致命、但 UX 不精確）
- 這不是假功能、是**分界線不清**

### 2.2 核准按鈕傳 receipt_amount 不是 actual_amount

- `page.tsx:170-174` 核准按鈕呼 `handleConfirmReceipt(row.id, row.receipt_amount || 0)`（面額當實收）
- `page.tsx:184-187` 異常按鈕呼 `handleConfirmReceipt(row.id, row.actual_amount || 0, true)`（用 actual_amount）
- **有意設計**：「金額相符 → 按核准（用面額）、不符 → 按異常（用已填 actual_amount）」
- 但 UX 前提：會計要**先編輯填 actual_amount**、再按異常。**目前沒有引導動線**、會計可能直接按核准（=面額當實收）、實際對帳失誤

### 2.3 批量收款無 transaction

- `createReceipt` 在 for 迴圈內逐筆寫（usePaymentData:95-138）
- Supabase 無內建 transaction、半套入庫是**已知限制**、不是代碼 bug
- 🟡 列為「已知限制」、不是紅燈

---

## Pattern 3：歷史驗證方式殘留 — 🟡

- `usePaymentData.ts:37` 孤立註釋「會計模組已停用」— 沒對應的被拿掉的代碼、單獨存在
- **高度相關**：DB 端 `receipts` 表有 AFTER UPDATE trigger `trigger_auto_post_receipt`（Agent F 發現）、可能正在做會計傳票工作、跟「已停用」矛盾
- receipt-number-generator 支援新舊兩格式向後相容、做得好、不是債
- 本資料夾無 TODO / FIXME / legacy / deprecated（grep 結果）

---

## Pattern 4：邏輯重複 — 🟡（中等）

### 4.1 付款方式映射**四處定義**

1. `usePaymentData.ts:114` 硬 coding array
2. `src/app/(main)/finance/constants/labels.ts` PAYMENT_METHOD_MAP（5 項含 linkpay）
3. `src/lib/constants/status-maps.ts:164` PAYMENT_METHOD_MAP（**只 4 項、沒 linkpay**）
4. `useReceiptMutations.ts:16` 另一份（疑似 \_archived 混入、本次沒 Read 驗證）

**後果**：加新付款方式時一定會漏一處。最危險是 `status-maps.ts` 那份不同步。

### 4.2 receipt_number 產生邏輯

- `generateReceiptNumber` 只在 `@/lib/utils/receipt-number-generator.ts`、跨多處呼叫、函數單一 ✅

### 4.3 `recalculateReceiptStats` 邏輯集中

- 只在 `receipt-core.service.ts`、沒有其他地方自己 sum receipts
- ✅ SSOT 乾淨

---

## 額外：通知 + 副作用

- `sendPaymentAbnormalNotification`（`@/lib/utils/bot-notification.ts`）
  - 會計按「異常」時發 → 建單者
  - catch 只 logger.error、不 throw（不阻斷主流程 ✅）
- `deleteReceipt` 走**軟刪**（set `deleted_at`）、符合紅線 ✅

---

## 嚴重度總結

| Pattern            | 嚴重度 | 說明                                |
| ------------------ | ------ | ----------------------------------- |
| 1. Role-gate       | 🔴     | 整頁 系統主管大鎖、4 動作無細分權限 |
| 2. UI / 後端分界線 | 🟡     | 核准 vs 異常 UX 動線需引導          |
| 3. 歷史殘留        | 🟡     | 孤立註釋 + 黑盒 trigger 疑似對應    |
| 4. 邏輯重複        | 🟡     | 付款方式四處 map、一處不同步        |
