# RLS 審計檢查清單

> 用於逐路由檢查 RLS 策略
> 更新時間: 2026-04-05

## 使用說明

1. 選擇要審計的路由（建議按優先級順序）
2. 查看該路由使用的表
3. 檢查每個表的 RLS 設定
4. 記錄檢查結果
5. 更新本文檔的狀態

---

## 優先級 1 - 高敏感性路由（財務/人資）

### [ ] finance/payments

**使用的表**: receipts, orders
**功能**: 收款管理
**敏感性**: 🔴 高 - 涉及財務數據
**檢查項目**:

- [ ] receipts 表 RLS 啟用
- [ ] orders 表 RLS 啟用
- [ ] 驗證 workspace_id 隔離
- [ ] 驗證權限檢查（是否限制會計角色）

**檢查人員**: \***\*\_\_\_\*\***
**完成日期**: \***\*\_\_\_\*\***
**結果**:

---

### [ ] finance/requests

**使用的表**: payment_requests, payment_request_items, tours
**功能**: 請款管理
**敏感性**: 🔴 高 - 涉及財務數據
**檢查項目**:

- [ ] payment_requests 表 RLS 啟用
- [ ] payment_request_items 表 RLS 啟用
- [ ] tours 表 RLS 啟用
- [ ] 驗證 workspace_id 隔離
- [ ] 驗證公司支出與團體請款隔離

**檢查人員**: \***\*\_\_\_\*\***
**完成日期**: \***\*\_\_\_\*\***
**結果**:

---

### [ ] finance/treasury

**使用的表**: receipts, payment_requests, disbursement_orders
**功能**: 現金流量管理
**敏感性**: 🔴 高 - 涉及多個財務表
**檢查項目**:

- [ ] receipts 表 RLS 啟用
- [ ] payment_requests 表 RLS 啟用
- [ ] disbursement_orders 表 RLS 啟用
- [ ] 驗證 workspace_id 隔離
- [ ] 驗證三個表之間的數據一致性

**檢查人員**: \***\*\_\_\_\*\***
**完成日期**: \***\*\_\_\_\*\***
**結果**:

---

### [ ] hr/payroll

**使用的表**: employees, salary_payments
**功能**: 薪資管理
**敏感性**: 🔴 高 - 涉及人資敏感數據
**檢查項目**:

- [ ] employees 表 RLS 啟用
- [ ] salary_payments 表 RLS 啟用（若存在）
- [ ] 驗證只有 HR/會計可存取
- [ ] 驗證員工只能查看自己的薪資

**檢查人員**: \***\*\_\_\_\*\***
**完成日期**: \***\*\_\_\_\*\***
**結果**:

---

## 優先級 2 - 中敏感性路由（核心業務）

### [ ] tours/[code]

**使用的表**: tours, tour_itinerary_items, itineraries
**功能**: 旅遊團詳情
**敏感性**: 🟠 中 - 核心業務數據
**檢查項目**:

- [ ] tours 表 RLS 啟用
- [ ] tour_itinerary_items 表 RLS 啟用
- [ ] itineraries 表 RLS 啟用
- [ ] 驗證 workspace_id 隔離
- [ ] 驗證三個表間的關聯正確

**檢查人員**: \***\*\_\_\_\*\***
**完成日期**: \***\*\_\_\_\*\***
**結果**:

---

### [ ] confirmations

**使用的表**: tour_itinerary_items, confirmations
**功能**: 確認單管理
**敏感性**: 🟠 中 - 涉及供應商協調
**檢查項目**:

- [ ] tour_itinerary_items 表 RLS 啟用
- [ ] confirmations 表 RLS 啟用
- [ ] 驗證 workspace_id 隔離
- [ ] 驗證供應商只能查看相關項目

**檢查人員**: \***\*\_\_\_\*\***
**完成日期**: \***\*\_\_\_\*\***
**結果**:

---

### [ ] quotes/[id]

**使用的表**: quotes, quote_items, tours, tour_itinerary_items
**功能**: 報價詳情
**敏感性**: 🟠 中 - 涉及定價策略
**檢查項目**:

- [ ] quotes 表 RLS 啟用
- [ ] quote_items 表 RLS 啟用
- [ ] tours 表 RLS 啟用
- [ ] tour_itinerary_items 表 RLS 啟用
- [ ] 驗證 workspace_id 隔離
- [ ] 驗證四個表間的關聯正確

**檢查人員**: \***\*\_\_\_\*\***
**完成日期**: \***\*\_\_\_\*\***
**結果**:

---

### [ ] orders

**使用的表**: orders, tours, receipts
**功能**: 訂單管理
**敏感性**: 🟠 中 - 涉及顧客數據與支付
**檢查項目**:

- [ ] orders 表 RLS 啟用
- [ ] tours 表 RLS 啟用
- [ ] receipts 表 RLS 啟用
- [ ] 驗證 workspace_id 隔離
- [ ] 驗證客服只能查看相關訂單

**檢查人員**: \***\*\_\_\_\*\***
**完成日期**: \***\*\_\_\_\*\***
**結果**:

---

## 優先級 3 - 低敏感性路由（資料管理/設定）

### [ ] database/attractions

**使用的表**: attractions, regions
**功能**: 景點資料庫
**敏感性**: 🟡 低 - 主要是參考數據
**檢查項目**:

- [ ] attractions 表 RLS（如需隔離）
- [ ] regions 表 RLS（如需隔離）
- [ ] 驗證是否應該全公開

**檢查人員**: \***\*\_\_\_\*\***
**完成日期**: \***\*\_\_\_\*\***
**結果**:

---

### [ ] database/suppliers

**使用的表**: suppliers, supplier_categories
**功能**: 供應商資料庫
**敏感性**: 🟡 低 - 主要是參考數據
**檢查項目**:

- [ ] suppliers 表 RLS（如需隔離）
- [ ] supplier_categories 表 RLS（如需隔離）
- [ ] 驗證 workspace_id 隔離（如有）

**檢查人員**: \***\*\_\_\_\*\***
**完成日期**: \***\*\_\_\_\*\***
**結果**:

---

### [ ] database/fleet

**使用的表**: fleet_vehicles, fleet_drivers, fleet_schedules
**功能**: 車隊管理
**敏感性**: 🟡 低 - 營運資產
**檢查項目**:

- [ ] fleet_vehicles 表 RLS（如需隔離）
- [ ] fleet_drivers 表 RLS（如需隔離）
- [ ] fleet_schedules 表 RLS（如需隔離）
- [ ] 驗證 workspace_id 隔離

**檢查人員**: \***\*\_\_\_\*\***
**完成日期**: \***\*\_\_\_\*\***
**結果**:

---

## 批量檢查表

使用此表快速標記所有表的審計狀態：

| 表名                 | RLS 啟用 | 完整性 | 性能 | 備註 |
| -------------------- | -------- | ------ | ---- | ---- |
| tours                | [ ]      | [ ]    | [ ]  |      |
| orders               | [ ]      | [ ]    | [ ]  |      |
| receipts             | [ ]      | [ ]    | [ ]  |      |
| payment_requests     | [ ]      | [ ]    | [ ]  |      |
| tour_itinerary_items | [ ]      | [ ]    | [ ]  |      |
| itineraries          | [ ]      | [ ]    | [ ]  |      |
| quotes               | [ ]      | [ ]    | [ ]  |      |
| quote_items          | [ ]      | [ ]    | [ ]  |      |
| confirmations        | [ ]      | [ ]    | [ ]  |      |
| employees            | [ ]      | [ ]    | [ ]  |      |
| customers            | [ ]      | [ ]    | [ ]  |      |
| suppliers            | [ ]      | [ ]    | [ ]  |      |
| attractions          | [ ]      | [ ]    | [ ]  |      |
| workspace_roles      | [ ]      | [ ]    | [ ]  |      |
| disbursement_orders  | [ ]      | [ ]    | [ ]  |      |
| visas                | [ ]      | [ ]    | [ ]  |      |
| esims                | [ ]      | [ ]    | [ ]  |      |
| files                | [ ]      | [ ]    | [ ]  |      |
| todos                | [ ]      | [ ]    | [ ]  |      |

---

## 檢查準則

### RLS 啟用檢查

- [ ] 表已啟用 RLS (`ALTER TABLE xxx ENABLE ROW LEVEL SECURITY`)
- [ ] 有默認拒絕政策 (`CREATE POLICY ... ON xxx AS (FALSE)`)
- [ ] 有具體的 SELECT/INSERT/UPDATE/DELETE 政策

### 完整性檢查

- [ ] 政策涵蓋所有操作類型（CRUD）
- [ ] workspace_id 隔離正確實施
- [ ] 租戶隔離有效（若為多租戶）
- [ ] 權限過濾正確（系統主管 vs 員工）

### 性能檢查

- [ ] 政策條件有相應索引
- [ ] 避免複雜的子查詢
- [ ] 避免全表掃描

---

## 常見問題與模式

### 工作室隔離模式

```sql
CREATE POLICY "users_can_read_own_workspace_data"
  ON tours FOR SELECT USING (
    workspace_id = (SELECT workspace_id FROM auth.users WHERE id = auth.uid())
  );
```

### 租戶隔離模式

```sql
CREATE POLICY "users_can_read_own_tenant_data"
  ON orders FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid())
  );
```

### 角色型隔離模式

```sql
CREATE POLICY "only_admin_can_delete"
  ON receipts FOR DELETE USING (
    (SELECT role FROM auth.users WHERE id = auth.uid()) = '系統主管'
  );
```

---

**最後更新**: 2026-04-05
