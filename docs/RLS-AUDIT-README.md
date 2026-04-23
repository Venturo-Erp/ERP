# RLS 逐路由審計 - 項目指南

> 最後更新: 2026-04-05
> 審計狀態: 第一階段完成 ✓

## 概述

此項目是為 venturo-erp 系統進行全面的行級安全性 (Row-Level Security, RLS) 審計。目標是確保所有 Supabase 表格都有正確的 RLS 策略來保護數據。

**項目範圍**:

- 掃描 96 個應用路由 (routes)
- 識別 60+ 個 Supabase 表格
- 驗證每個路由的數據存取方式
- 檢查和改進 RLS 策略

---

## 文檔導航

### 1. 主審計報告 📋

**檔案**: `docs/rls-audit-report.md`

包含:

- 完整的 96 個路由列表
- 每個路由使用的表格
- 敏感性分類 (高/中/低)
- 審計進度追蹤
- 優先審計列表

**使用場景**:

- 了解全貌
- 查看哪些路由已審計
- 跟蹤整體進度

---

### 2. 檢查清單 ✓

**檔案**: `docs/rls-audit-checklist.md`

包含:

- 按優先級組織的檢查項目
- 14 個主要路由的詳細檢查清單
- 批量表格檢查表
- 常見 RLS 模式範例

**使用場景**:

- 執行實際的 RLS 檢查
- 記錄檢查結果
- 跟蹤個人進度

---

### 3. CSV 快速參考 📊

**檔案**: `docs/rls-routes-summary.csv`

包含:

- 96 個路由的簡潔列表
- 路由編號、名稱、表格、敏感性、狀態
- 便於導入電子表格或分析工具

**使用場景**:

- 快速查找特定路由
- 匯出到 Excel 進行跟蹤
- 生成統計報告

---

## 快速開始

### Step 1: 選擇要審計的路由

建議按優先級進行:

**優先級 1 (高敏感性 - 財務/人資)** 🔴

```
finance/payments          → receipts, orders
finance/requests          → payment_requests, payment_request_items, tours
finance/treasury          → receipts, payment_requests, disbursement_orders
hr/payroll               → employees, salary_payments
```

**優先級 2 (中敏感性 - 核心業務)** 🟠

```
tours/[code]             → tours, tour_itinerary_items, itineraries
confirmations            → tour_itinerary_items, confirmations
quotes/[id]              → quotes, quote_items, tours, tour_itinerary_items
orders                   → orders, tours, receipts
```

**優先級 3 (低敏感性 - 參考資料)** 🟡

```
database/attractions     → attractions, regions
database/suppliers       → suppliers, supplier_categories
database/fleet           → fleet_vehicles, fleet_drivers, fleet_schedules
```

### Step 2: 開始審計

1. 打開 `docs/rls-audit-checklist.md`
2. 選擇優先級 1 的路由
3. 檢查該路由的所有 Supabase 表格
4. 驗證 RLS 設定
5. 記錄檢查結果

### Step 3: 更新進度

1. 在檢查清單中標記完成 [ ]
2. 記錄檢查人員和日期
3. 更新 `rls-audit-report.md` 中的結果欄位

---

## 表格分類

### 高敏感性表格 (需優先檢查)

| 表格名           | 用途     | 相關路由                           |
| ---------------- | -------- | ---------------------------------- |
| receipts         | 收款記錄 | finance/payments, finance/treasury |
| payment_requests | 請款單   | finance/requests, finance/treasury |
| orders           | 訂單     | orders, finance/payments           |
| employees        | 員工資料 | hr/\*, finance/payroll             |
| salary_payments  | 薪資記錄 | hr/payroll                         |
| tours            | 旅遊團   | 大多數路由                         |

### 核心業務表格

| 表格名               | 用途     | 相關路由                                 |
| -------------------- | -------- | ---------------------------------------- |
| tour_itinerary_items | 行程詳項 | confirmations, tours/[code], quotes/[id] |
| quotes               | 報價單   | quotes, quotes/[id]                      |
| confirmations        | 確認單   | confirmations, confirmations/[id]        |
| itineraries          | 行程     | itinerary/\*, tours                      |

### 參考資料表格 (可能無需隔離)

| 表格名      | 用途     | 範圍           |
| ----------- | -------- | -------------- |
| attractions | 景點庫   | 全用戶可見？   |
| suppliers   | 供應商庫 | 需要工作室隔離 |
| customers   | 客戶庫   | 需要工作室隔離 |

---

## 常見 RLS 模式

### 工作室隔離

```sql
CREATE POLICY "workspace_isolation"
  ON tours FOR SELECT USING (
    workspace_id = (SELECT workspace_id FROM auth.users WHERE id = auth.uid())
  );
```

✓ 適用於: tours, orders, receipts, itineraries 等

### 角色型限制

```sql
CREATE POLICY "accounting_only"
  ON payment_requests FOR SELECT USING (
    (SELECT role FROM auth.users WHERE id = auth.uid()) IN ('系統主管', '會計')
  );
```

✓ 適用於: receipts (會計確認), salary_payments (HR/會計)

### 租戶隔離

```sql
CREATE POLICY "tenant_isolation"
  ON orders FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM auth.users WHERE id = auth.uid())
  );
```

✓ 適用於: 如果系統支持多租戶

---

## 檢查清單

### 每個表格都應該有:

- [ ] RLS 已啟用 (`ALTER TABLE xxx ENABLE ROW LEVEL SECURITY`)
- [ ] 默認拒絕策略 (保險起見)
- [ ] SELECT 策略 (讀取)
- [ ] INSERT 策略 (新增) - 如果支援寫入
- [ ] UPDATE 策略 (編輯) - 如果支援寫入
- [ ] DELETE 策略 (刪除) - 如果支援寫入

### 策略應該驗證:

- [ ] 工作室隔離正確 (workspace_id)
- [ ] 租戶隔離有效 (若為多租戶)
- [ ] 權限過濾正確 （系統主管 vs 員工）
- [ ] 沒有過度寬鬆的策略 (如 AS (TRUE))
- [ ] 效能合理 (有適當的索引)

---

## 常見問題

### Q: 如何檢查特定表格的 RLS 設定?

A: 在 Supabase 控制面板中:

1. 進入 Authentication → Policies
2. 選擇表格
3. 檢查是否啟用了 RLS
4. 查看所有策略

### Q: RLS 策略應該如何設計?

A: 遵循最小權限原則:

1. 默認拒絕所有 (`AS (FALSE)`)
2. 明確允許特定操作
3. 包含身份檢查 (auth.uid())
4. 包含工作室/租戶隔離

### Q: 如何處理跨表格的關聯?

A: 使用 SQL 的外鍵關聯:

```sql
CREATE POLICY "can_read_related_tours"
  ON orders FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tours
      WHERE tours.id = orders.tour_id
      AND tours.workspace_id = (SELECT workspace_id FROM auth.users WHERE id = auth.uid())
    )
  );
```

### Q: 性能會受影響嗎?

A: 是的，需要優化:

- 在 workspace_id 上建立索引
- 避免複雜的子查詢
- 使用視圖預計算複雜邏輯
- 定期執行 EXPLAIN ANALYZE

---

## 進度追蹤

### 第一階段 ✓ (完成)

- [x] 掃描所有 96 個路由
- [x] 識別使用的 60+ 個表格
- [x] 編製路由與表格的對應
- [x] 分類敏感性等級
- [x] 建立檢查清單

### 第二階段 ⏳ (準備中)

- [ ] 審計優先級 1 的表格 (財務/人資)
- [ ] 審計優先級 2 的表格 (核心業務)
- [ ] 審計優先級 3 的表格 (參考資料)
- [ ] 識別缺失的 RLS 策略
- [ ] 識別不完整的策略

### 第三階段 ⏳ (計畫中)

- [ ] 實施缺失的 RLS 策略
- [ ] 優化現有策略效能
- [ ] 新增必要的索引
- [ ] 測試所有策略
- [ ] 文件化所有決策

---

## 相關資源

### 官方文檔

- [Supabase RLS 指南](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase 政策示例](https://supabase.com/docs/guides/auth/row-level-security/concepts)
- [PostgreSQL 安全性](https://www.postgresql.org/docs/current/sql-createrole.html)

### 內部文檔

- `docs/CODE_MAP.md` - 程式碼地圖
- `docs/ARCHITECTURE.md` - 架構設計 (若存在)

---

## 聯絡與回報

如有問題或發現缺陷:

1. **缺失的表格**: 更新此文檔，重新掃描 src/app/(main)/
2. **路由分類錯誤**: 檢查實際的 page.tsx 和 features/ 模組
3. **RLS 策略問題**: 在相應的檢查清單項目中詳細記錄

---

**項目負責人**: 待分配
**最後審計日期**: 2026-04-05
**下次審計計畫**: TBD
