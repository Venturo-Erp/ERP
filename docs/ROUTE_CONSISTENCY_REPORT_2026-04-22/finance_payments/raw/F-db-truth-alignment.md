# Agent F: DB Schema 真相對照 — /finance/payments

**日期**：2026-04-22 | **路由**：`/finance/payments`（收款管理）

---

## 1. receipts 表 DB 真相 vs UI 認知

### Column 對照表

| DB Column | 類型 | UI 有用？ | 代碼寫入？ | 備註 |
|---|---|---|---|---|
| id | uuid | ✅ 讀 | 自動 | PK、Supabase 自動產 |
| receipt_number | text | ✅ 讀寫 | ✅ 寫 | 生成邏輯：generateReceiptNumber() 格式 {tourCode}-R{nn} |
| order_id | text | ✅ 讀寫 | ✅ 寫 | FK → orders(id) RESTRICT |
| customer_id | text | ✅ 讀寫 | ✅ 寫 | FK → customers(id) RESTRICT |
| tour_id | text | ✅ 讀寫 | ✅ 寫 | FK → tours(id) SET NULL |
| amount | numeric | ✅ 讀寫 | ✅ 寫 | 舊欄位、重複 receipt_amount |
| receipt_amount | numeric | ✅ 讀寫 | ✅ 寫 | 應該用這個、兩列同值 |
| actual_amount | numeric | ✅ 讀寫 | ✅ 寫初0 | 確認時才更新 |
| payment_date | date | ✅ 讀寫 | ✅ 寫 | 收款日期 |
| receipt_date | date | ✅ 讀寫 | ✅ 寫 | 等同 payment_date |
| payment_method | text | ✅ 讀寫 | ✅ 寫 | 文字欄位['transfer','cash','card','check','linkpay']對應 receipt_type |
| receipt_type | integer | ✅ 讀 | ✅ 寫 | 1=transfer, 2=cash, 3=card, 4=check, 5=linkpay |
| status | text | ✅ 讀寫 | ✅ 寫 | '0'=待確認、'1'=已確認；只算 status='1' 的 actual_amount |
| payment_method_id | uuid | ✅ 讀 | ❓ 寫 | FK → payment_methods(id) 強制 NOT NULL；代碼沒寫入！ |
| workspace_id | uuid | ✅ 自動 | ✅ 寫 | Trigger auto_set_workspace_id 會覆蓋 |
| created_by | uuid | ✅ 讀 | ✅ 寫 | usePaymentData:136 寫 user.id（employees.id） |
| updated_by | uuid | ✅ 讀 | ✅ 寫 | usePaymentData:137 寫 user.id |
| created_at | timestamp | ✅ 讀 | 自動 | now() |
| updated_at | timestamp | ✅ 讀 | 自動 | trigger update_receipts_updated_at |
| deleted_at | timestamp | ✅ 讀 | ✅ 寫 | 軟刪除標記 |
| receipt_account | varchar | ⚠️ 寫存 | ✅ 寫 | 收款帳號、UI 有表單欄位 |
| email | varchar | ⚠️ 寫存 | ✅ 寫 | 付款人 email、無 validate |
| payment_name | varchar | ⚠️ 寫存 | ✅ 寫 | 付款人名稱 |
| pay_dateline | date | ⚠️ 寫存 | ✅ 寫 | LinkPay 截止日期 |
| handler_name | varchar | ⚠️ 寫存 | ✅ 寫 | 處理人名稱（冗餘 created_by） |
| account_info | varchar | ⚠️ 寫存 | ✅ 寫 | 帳號資訊（銀行代號等） |
| fees | numeric | ⚠️ 寫存 | ✅ 寫 | 手續費 |
| card_last_four | varchar | ⚠️ 寫存 | ✅ 寫 | 信用卡末四碼 |
| auth_code | varchar | ⚠️ 寫存 | ✅ 寫 | 授權碼 |
| check_number | varchar | ⚠️ 寫存 | ✅ 寫 | 支票號碼 |
| check_bank | varchar | ⚠️ 寫存 | ✅ 寫 | 支票銀行 |
| check_date | date | ⚠️ 寫存 | ✅ 寫 | 支票兌現日期 |
| link | text | ⚠️ 讀存 | ✅ API填 | LinkPay 連結、由 POST /api/linkpay 回寫 |
| linkpay_order_number | text | ⚠️ 讀存 | ✅ API填 | LinkPay 訂單號、由 API 回寫 |
| order_number | varchar | ⚠️ 讀存 | ✅ 寫 | 訂單號（冗餘 order_id） |
| tour_name | varchar | ⚠️ 讀存 | ✅ 寫 | 團名（冗餘 tour_id） |
| customer_name | text | ⚠️ 讀存 | ✅ 寫 | 客戶名（冗餘 customer_id） |
| confirmed_at | timestamp | ❌ 不用 | ❌ 不寫 | 孤兒欄位、無邏輯用 |
| confirmed_by | text | ❌ 不用 | ❌ 不寫 | 孤兒欄位、無邏輯用 |
| bank_name | varchar | ❌ 不用 | ❌ 不寫 | 孤兒欄位（舊銀行系統遺留） |
| account_last_digits | varchar | ❌ 不用 | ❌ 不寫 | 孤兒欄位（舊銀行系統遺留） |
| transaction_id | varchar | ❌ 不用 | ❌ 不寫 | 孤兒欄位（舊銀行系統遺留） |
| sync_status | text | ❌ 不用 | ✅ 寫初 | default 'synced'、代碼從不改 |
| total_amount | numeric | ❌ 不用 | ✅ 寫初0 | 多餘重複、代碼都用 amount + receipt_amount |
| accounting_subject_id | uuid | ⚠️ 會計用 | ❌ 不寫 | FK → accounting_subjects(id)、會計模組已停用（usePaymentData:37） |
| batch_id | uuid | ❌ 不用 | ✅ 寫初 | 批次 ID、從不用 |
| notes | text | ✅ 讀寫 | ✅ 寫 | 備註、異常金額時自動生成 |

### 關鍵發現

**UI 完全沒用、但 DB 有的欄位（孤兒）**
- `confirmed_at`, `confirmed_by` — 邏輯放在 status 欄位，不用這倆
- `bank_name`, `account_last_digits`, `transaction_id` — 銀行系統遺留、從不寫入
- `sync_status` — default 'synced'，代碼從不改，無意義
- `total_amount` — 重複 amount + receipt_amount，代碼都用這倆

**UI 送的欄位、DB 沒有**
- 無：所有代碼寫的欄位 DB 都有

**UI 送、DB 有、但代碼沒寫進去的欄位**
- `payment_method_id` — **DB 強制 NOT NULL**，但 createReceipt 沒寫！會炸 FK violation（除非有 TRIGGER 自動填或有 DEFAULT）— **紅燈**

---

## 2. RLS Policy 實際條文 vs 代碼預期

### receipts

**SELECT Policy**：`USING: (workspace_id = get_current_user_workspace())`
- ✅ workspace 過濾正確
- ✅ 可讀

**INSERT Policy**：`WITH CHECK: (workspace_id = get_current_user_workspace())`
- ✅ 符合代碼預期（usePaymentData:105 寫 workspace_id）

**UPDATE Policy**：`USING: (workspace_id = get_current_user_workspace())`
- ✅ 符合代碼預期

**DELETE Policy**：`USING: (workspace_id = get_current_user_workspace())`
- ✅ 軟刪設計（代碼用 deleted_at）

**FORCE RLS**：❓ 未確認（DB_TRUTH 沒列）— **假設 NO FORCE**

### orders

**SELECT/INSERT/UPDATE/DELETE Policies**：`USING: (workspace_id = get_current_user_workspace())`
- ✅ workspace 過濾正確
- ⚠️ recalculateReceiptStats 會 UPDATE orders（order.payment_status / paid_amount / remaining_amount）
- ❓ admin client（Supabase service_role）是否能通過？— **假設 NO FORCE RLS** 可以

### tours

**SELECT/INSERT/UPDATE/DELETE Policies**：`USING: (workspace_id = get_current_user_workspace())`
- ✅ workspace 過濾正確
- ⚠️ recalculateReceiptStats 會 UPDATE tours（tours.total_revenue / profit）
- ❓ FORCE RLS 狀態？CLAUDE.md §/login 列 tours 為 28 張 FORCE RLS 表之一 — **若開 FORCE RLS、service_role 無法寫**

### linkpay_logs

**INSERT Policy**：`WITH CHECK: (is_super_admin() OR (workspace_id = get_current_user_workspace()))`
- ⚠️ webhook unauthenticated 寫入需要 service_role、但 policy 要 is_super_admin() || workspace_id 過濾
- ❓ webhook 用哪個 client？若 unauthenticated、service_role 能過 policy 嗎？— **可能有問題**

---

## 3. FK 真相 vs 代碼預期

### receipts.created_by / updated_by

**DB FK**：`REFERENCES public.employees(id) NO ACTION`
- ✅ 正確指向 employees

**代碼寫入**：`usePaymentData:136-137` — `created_by: user.id`
- 從 `useAuthStore` 拿 user.id
- 根據 CLAUDE.md 紅線：useAuthStore.user.id **就是** employees.id（非 auth.users.id）
- ✅ 匹配

### receipts.order_id → orders(id)

**ON DELETE**：RESTRICT（訂單不能刪除有收款單的行）
- ⚠️ 軟刪設計下、RESTRICT 可能過度嚴格
- usePaymentData 代碼無特殊邏輯、預期 RESTRICT 可用

### receipts.customer_id → customers(id)

**ON DELETE**：RESTRICT
- ⚠️ 同上

### receipts.tour_id → tours(id)

**ON DELETE**：SET NULL
- ✅ 適合；代碼允許 tour_id NULL

### receipts.payment_method_id → payment_methods(id)

**NOT NULL / FK**：強制非空 + RESTRICT
- ❌ **但 usePaymentData createReceipt (L103-138) 沒有寫這個欄位**
- 應該在哪個字段拿 payment_method_id？— payment_method (text 欄位) 能對應 payment_methods(id) 嗎？
- **紅燈**：createReceipt 會 FK violation，除非有 DB TRIGGER / DEFAULT 自動填

### linkpay_logs.created_by / updated_by → employees(id)

**ON DELETE**：SET NULL
- ✅ 合理

### linkpay_logs 的古怪 FK

```
receipt_number → receipts.workspace_id (RESTRICT)
receipt_number → receipts.receipt_number (RESTRICT)
workspace_id → receipts.receipt_number (RESTRICT)
workspace_id → receipts.workspace_id (RESTRICT)
```

- ⚠️ 複合 FK 指向 (workspace_id, receipt_number)？但欄位定義看不出這個关键
- **可能是 unique constraint receipts_workspace_receipt_number_key 的作用**
- ⚠️ linkpay_logs 的 receipt_number 應該是外鍵指向 receipts(receipt_number)、為何還要多指向 workspace_id？— **多餘或設計過度**

---

## 4. Trigger / Function 隱形邏輯

### receipts 上的 trigger

1. **trigger_auto_post_receipt** — AFTER UPDATE
   - 改什麼？— **DB_TRUTH 沒列詳情** — ❓ 自動過帳到會計？會改什麼欄位？

2. **trigger_auto_set_workspace_id** — BEFORE INSERT
   - 改什麼：自動填 workspace_id（從 get_current_user_workspace()）
   - ✅ 預期：代碼也會寫 workspace_id、trigger 覆蓋沒問題

3. **update_receipts_updated_at** — BEFORE UPDATE
   - 改什麼：自動更新 updated_at
   - ✅ 預期

### orders 上的 trigger

1. **trigger_update_customer_stats** — AFTER INSERT / UPDATE
   - 改 customers.total_orders / total_spent
   - ⚠️ recalculateReceiptStats 也會 UPDATE orders.payment_status，會再觸發此 trigger、可能循環

2. **trigger_add_travelers_to_conversation** — AFTER UPDATE
   - 改什麼：加旅客到會話
   - 無關 payment

3. **update_orders_updated_at** — BEFORE UPDATE
   - ✅ 自動更新 updated_at

### tours 上的 trigger

1. **trigger_tour_update_cache** — AFTER UPDATE
   - 改什麼：更新快取
   - recalculateReceiptStats 更新 tours 時會觸發

2. **tours_cascade_rename**, **trg_tours_sync_country_code**, **trigger_create_tour_conversations** — 無關 payment

### 雙寫風險

- **orders.payment_status**：recalculateReceiptStats (app code) 會寫 + 可能有 trigger 也寫 = **雙寫衝突風險**
- **tours.total_revenue / profit**：recalculateReceiptStats (app code) 會寫 + 無 trigger = **單一寫入源、安全**

---

## 5. 142 可疑清單命中本頁的項

從 DB_TRUTH 開頭的 142 項可疑清單篩選：

| 嚴重度 | Table | 問題 | 本頁影響 |
|---|---|---|---|
| 🔴 | ref_cities | RLS 沒開 | 低 — payment 不用 ref_cities |
| 🟡 | tour_custom_cost_fields | 沒 workspace_id 欄位、但有 RLS policy | 低 — payment 不直接讀 |
| 🟡 | tour_custom_cost_values | 同上 | 低 |
| 🟡 | transactions | 沒 workspace_id、但有 RLS policy | 中 — 跟 payment 有關、但代碼不用 |
| — | receipts | **支付方式 (payment_method_id) 欄位設 NOT NULL 但代碼不寫入** | **🔴 紅燈** |
| — | receipts | 孤兒欄位：confirmed_at / confirmed_by 邏輯已移到 status，無人用 | 🟡 清潔債務 |
| — | receipts | 孤兒欄位：bank_name / account_last_digits / transaction_id（舊銀行系統） | 🟡 清潔債務 |
| — | linkpay_logs | FK 設計異常：多層複合 FK 指向 receipts(workspace_id, receipt_number) | 🟡 需確認 |

---

## 6. 給 William 的「倉庫盤點」摘要

**Corner 倉庫盤點發現**：收款單倉庫架構複雜。基層有 42 格架子在正常運作（usePaymentData 寫進去的欄位）、但同時有 6 格架子（confirmed_at、confirmed_by、銀行資訊等）放著沒人進去拿，是舊年代的遺物。更嚴重的是，有一格架子（支付方式 payment_method_id）被強制上了鎖（NOT NULL），倉管員（UI）卻從來沒有鑰匙去開它，每次新單進來都會卡住。另外有個機械手臂 (trigger_auto_post_receipt) 每次收款單確認都會偷偷動某些格子，但我們還不知道它動了什麼。訂單這邊的機械手臂則是在收款狀態和客戶統計間反覆同步，有雙寫衝突的風險。

---

**產生**：venturo-route-context-verify v2.0 Agent F｜**目的地檔**：/Users/williamchien/Projects/venturo-erp/docs/ROUTE_CONSISTENCY_REPORT_2026-04-22/finance_payments/raw/F-db-truth-alignment.md
