# RLS 現況總表

> 最後審計：2026-04-05 | 下次審計時只需比對此表

## 使用方式

新增或修改表時，對照此表確認：

1. 新表是否已加入且標記正確？
2. 既有表的 policy 類型有沒有被改動？
3. 有沒有新的子表需要 sub-query 隔離？

---

## 全表 RLS 狀態

### A. 直接 workspace_id 隔離（標準模式）

這些表有 `workspace_id` 欄位，policy 為 `workspace_id = get_current_user_workspace() OR is_super_admin()`。

| 表名                       | 資料說明                       | 修復 migration                            |
| -------------------------- | ------------------------------ | ----------------------------------------- |
| `tours`                    | 旅遊團主表                     | 既有                                      |
| `orders`                   | 訂單                           | 既有                                      |
| `itineraries`              | 行程範本                       | 既有                                      |
| `receipts`                 | 收款紀錄                       | 既有                                      |
| `payment_requests`         | 請款單                         | 既有                                      |
| `disbursement_orders`      | 撥款單                         | 既有                                      |
| `employees`                | 員工（含 self-update）         | 既有                                      |
| `attendance_records`       | 出勤紀錄                       | 既有                                      |
| `leave_requests`           | 請假申請                       | 既有                                      |
| `leave_types`              | 假別設定                       | 既有                                      |
| `leave_balances`           | 假期餘額                       | 既有                                      |
| `employee_route_overrides` | 員工路由權限覆寫               | 既有                                      |
| `customers`                | 客戶資料                       | 既有                                      |
| `customer_groups`          | 客戶群組                       | 既有                                      |
| `regions`                  | 地區（workspace-scoped）       | 既有                                      |
| `suppliers`                | 供應商                         | 既有                                      |
| `leader_schedules`         | 領隊排班                       | 既有                                      |
| `fleet_vehicles`           | 車輛                           | 既有                                      |
| `fleet_drivers`            | 司機                           | 既有                                      |
| `fleet_schedules`          | 車隊排班                       | 既有                                      |
| `transportation_rates`     | 運輸費率                       | 既有                                      |
| `accounting_events`        | 會計事件                       | 既有                                      |
| `accounting_periods`       | 會計期間                       | 既有                                      |
| `quotes`                   | 報價單                         | 既有                                      |
| `channels`                 | 通訊頻道                       | 既有                                      |
| `todos`                    | 待辦事項                       | 既有                                      |
| `pnrs`                     | 航班 PNR                       | 既有                                      |
| `design_templates`         | 設計範本（含 public template） | 既有                                      |
| `office_documents`         | Office 文件                    | 既有                                      |
| `confirmations`            | 確認單                         | `20260405_fix_rls_critical_tables.sql`    |
| `tour_confirmation_sheets` | 出團確認表                     | `20260405_fix_rls_critical_tables.sql`    |
| `tour_confirmation_items`  | 出團確認明細                   | `20260405_fix_rls_critical_tables.sql`    |
| `company_assets`           | 公司資產/文件                  | `20260405_fix_rls_critical_tables.sql`    |
| `esims`                    | eSIM 購買指派                  | `20260405_fix_rls_critical_tables.sql`    |
| `visas`                    | 簽證申請（含護照號碼）         | `20260405_fix_rls_critical_tables.sql`    |
| `tour_requests`            | 供應商需求單                   | `20260405_fix_rls_high_risk_tables.sql`   |
| `tour_itinerary_items`     | 行程項目明細（核心表）         | `20260405_fix_rls_medium_risk_tables.sql` |
| `files`                    | 檔案                           | `20260405_fix_rls_medium_risk_tables.sql` |
| `folders`                  | 資料夾                         | `20260405_fix_rls_medium_risk_tables.sql` |
| `workspace_modules`        | 工作區模組設定                 | `20260405_fix_rls_medium_risk_tables.sql` |

### B. workspace_id + NULL 共用（系統預設資料可見）

這些表的 `workspace_id IS NULL` 資料所有人可讀（系統預設），workspace 專屬資料只有自己能看。

| 表名                  | 資料說明   | NULL 資料是什麼   |
| --------------------- | ---------- | ----------------- |
| `accounting_subjects` | 會計科目   | 41 筆系統預設科目 |
| `companies`           | 公司資訊   | 目前 0 筆         |
| `attractions`         | 景點資料庫 | 85 筆共用景點     |

### C. Sub-query 隔離（無 workspace_id，透過父表 join）

這些表沒有 `workspace_id`，透過 FK → 父表 → `workspace_id` 做隔離。

| 表名                    | 資料說明     | 隔離路徑                                            |
| ----------------------- | ------------ | --------------------------------------------------- |
| `payment_request_items` | 請款明細     | `request_id → payment_requests.workspace_id`        |
| `employee_job_roles`    | 員工職務對應 | `employee_id → employees.workspace_id`              |
| `tour_role_assignments` | 團務角色指派 | `tour_id → tours.workspace_id`                      |
| `channel_members`       | 頻道成員     | `channel_id → channels.workspace_id`                |
| `tour_rooms`            | 房間分配     | `tour_id → tours.workspace_id`                      |
| `tour_room_assignments` | 房間旅客指派 | `room_id → tour_rooms.tour_id → tours.workspace_id` |

### D. 使用者層級隔離（非 workspace，by auth.uid）

| 表名                  | 資料說明 | 隔離方式                                                              |
| --------------------- | -------- | --------------------------------------------------------------------- |
| `accounting_accounts` | 會計帳戶 | `user_id = auth.uid()`                                                |
| `accounting_entries`  | 會計分錄 | `tour_id → tours.workspace_id`；無 tour 時 `recorded_by = auth.uid()` |

### E. 共用基礎資料（auth-only，限制寫入）

無 `workspace_id`，所有人可讀，寫入受限。

| 表名                  | 資料說明      | 寫入權限                          |
| --------------------- | ------------- | --------------------------------- |
| `supplier_categories` | 供應商分類    | 僅 super_admin                    |
| `tour_leaders`        | 領隊/導遊資料 | 認證用戶可寫，僅 super_admin 可刪 |

### F. 特殊隔離

| 表名         | 資料說明   | 隔離方式                                          |
| ------------ | ---------- | ------------------------------------------------- |
| `workspaces` | 工作區清單 | `id = get_current_user_workspace()`（只看自己的） |

---

## 新增表時的 RLS checklist

```
□ 表有 workspace_id 欄位嗎？
  → 有：用 A 類標準 policy
  → 沒有但有 FK 到有 workspace_id 的父表：用 C 類 sub-query
  → 都沒有：考慮加 workspace_id，或歸類為 E 類共用表

□ ENABLE ROW LEVEL SECURITY + FORCE ROW LEVEL SECURITY

□ 四條 policy（SELECT / INSERT / UPDATE / DELETE）

□ INSERT 用 WITH CHECK（不含 is_super_admin）

□ 更新此文件
```

---

## 修復紀錄

| 日期       | Migration                                 | 修復內容                                                                                                                                                                            |
| ---------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-05 | `20260405_fix_rls_critical_tables.sql`    | accounting_subjects, company_assets, confirmations, tour_confirmation_sheets/items, esims, visas                                                                                    |
| 2026-04-05 | `20260405_fix_rls_high_risk_tables.sql`   | tour_requests, payment_request_items, employee_job_roles, tour_role_assignments, channel_members                                                                                    |
| 2026-04-05 | `20260405_fix_rls_medium_risk_tables.sql` | accounting_accounts/entries, tour_rooms/assignments, supplier_categories, tour_leaders, files, folders, workspace_modules, tour_itinerary_items, companies, attractions, workspaces |

---

## 排查結果（2026-04-05）

- `get_current_user_workspace()` 和 `is_super_admin()` 函數正常
- 所有 sub-query 的 FK 完整，零孤兒記錄
- `accounting_subjects` 41 筆 NULL、`attractions` 85 筆 NULL 已在 policy 中允許
- 其餘所有表 workspace_id 零 NULL
