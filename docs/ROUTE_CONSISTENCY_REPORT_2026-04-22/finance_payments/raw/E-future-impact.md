# Agent E: 未來影響預測 — /finance/payments

**日期**：2026-04-22 | **來源**：Agent E Explore + 主 Claude 過濾（剔除引用 _archived 的部分）

---

## 1. 會被未來功能拖累 / 直接改寫

### 🔴 權限模型改造（isAdmin → hasPermission）
- 本頁 1 處整頁擋 + 4 個動作要補細分權限
- 建議 permission keys：`finance.payments.view` / `.create` / `.confirm` / `.approve_abnormal` / `.delete`
- **預留空間**：❌ 無、現在完全沒走 hasPermission 管道

### 🔴 訂單 payment_status 移除（William 本次表態）
- `recalculateReceiptStats` 要改：刪掉 L73-81 寫 orders.payment_status 那段
- `usePaymentData:42` `availableOrders` 過濾要改走聚合查詢（或新增 `orders_with_payment` view）
- BatchReceiptDialog 的「可收款訂單」篩選同理
- **預留空間**：🟡 service 層已抽、但 UI 篩選是硬 coding

### 🟡 SaaS 多租戶擴張（飯店 / 餐廳）付款方式
- 現有 5 種是硬 coding array `['transfer','cash','card','check','linkpay']`
- 飯店可能要 QR / 信用卡分期 / 儲值 / Apple Pay
- DB 已有 `payment_methods` 表 + `payment_method_id` 欄位（但代碼沒寫！見 Agent F 紅燈）
- 重啟這個欄位的使用 + 把 UI 硬 coding 改 DB 驅動

### 🟡 會計模組重啟
- `usePaymentData:37` 註釋「會計模組已停用」
- DB 有 `trigger_auto_post_receipt` AFTER UPDATE 可能是會計過帳的殘留
- 重啟時需對齊：app 端 hook / DB trigger 擇一、避免雙寫傳票

### 🟡 團財務（`/tours/*`）驗證時的連鎖
- `recalculateTourFinancials` 寫 `tours.total_revenue` + `profit`
- `/tours/*` 驗證時若發現有「預估 vs 實際拆分」等新欄位、本頁計算要跟著改

### 🟢 LinkPay 換金流商
- 目前硬 coding 台新 API
- 換商只需改 `/api/linkpay` + webhook、不影響本頁其他邏輯
- 建議抽 `paymentGatewayFactory`（低優先）

---

## 2. 回頭打到本頁的改動（必須監控）

| 改動源 | 打到 | 影響程度 |
|---|---|---|
| `workspace_roles` 加細分 permission key | `page.tsx:211` + 4 動作 | 🔴 高 |
| `orders` 去掉 `payment_status` | `usePaymentData:40-44` + `receipt-core.service.ts:73-81` | 🔴 高 |
| `receipts` 加欄位（銀行流水、匯差、手續費） | UI + hook + type 三層 | 🟡 中 |
| `tours` 財務 schema 改 | `recalculateTourFinancials` | 🟡 中 |
| LinkPay 換金流商 | `/api/linkpay` + webhook | 🟢 低 |

---

## 3. 本頁擴展點

- **LinkPay**：半硬 coding、換商成本中
- **Receipt number**：`{團號}-R{nn}` 2 位數、最多 99 張單、**會撞號**（同團 100+ 張就炸）
- **Batch**：只基本批量、無銀行對帳單匹配 / 匯差調整 / 部分退款

---

## 4. 沒做但之後會痛

### 🔴 發票 / 收據 PDF
- 無代碼、旅遊業常見剛需
- 建議預留 `receipt_pdf_config` + 樣板機制

### 🔴 對帳 / 匯差
- 無 `exchange_rate` / `bank_fee` / `variance` 欄位
- 外幣收款實收 vs 入帳不同幣別
- 建議新增 `actual_exchange_rate` + `bank_fee` + `variance_reason`

### 🟡 部分退款 / 取消
- 只有建 / 確認 / 軟刪
- 無法記錄「原收 $50K、退 $10K、淨 $40K」
- 建議 status '3' 已退款 + `refund_receipt_id` 反向單

### 🟢 稽核 log
- 只有 `updated_by` + `updated_at`、無完整異動歷史
- 建議 `receipt_audit_logs` 或 Supabase audit

---

## 5. 結論

**上線前必想 🔴（3）**：
1. 權限模型細分（跟 /login + /hr 一起大修）
2. payment_status 聚合策略決定（存還是算）
3. payment_method_id 欄位 + 付款方式 DB 驅動（F 紅燈）

**上線後快做 🟡（3）**：
1. 發票 / 收據 PDF
2. 對帳 + 匯差
3. LinkPay 抽象化

**有空再想 🟢（2）**：
1. 部分退款
2. 稽核 log
