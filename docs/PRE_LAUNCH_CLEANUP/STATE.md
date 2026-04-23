# Pre-Launch Cleanup State

**當前階段**：**Wave 6 完全收尾**（B7 回滾後淨 109 條）+ Wave 2 Batch 5 + Wave 9 /tours 分頁 + Post-Launch retention policy 題加入 BACKLOG
**上次 session 結束時間**：2026-04-21 09:54
**下一步**（新紅線下可自主）：
- Wave 2 Batch 3：HR 系統主管 頁（payroll/reports/settings/deductions、需 William 確認 scope）
- Wave 2 Batch 4：Settings admin 頁（workspaces/modules、可能有普通員工用，需 William 確認）
- Wave 8：狀態值中英（A8 plan、需 William 決策範圍）
- Wave 3 剩：well-known-ids.ts 替換現有 hardcode（需 William 確認哪處保留 seed）
**等待 William**：無
**Blocker**：無

## Wave 執行統計（2026-04-20→21 至此）

| Wave | 狀態 | 成績 |
|--|--|--|
| 0 | ✅ 完成 | 4 項 P0（current_user ×2 / reset-db / login / tours.deleted_by） |
| 1a | ✅ 完成 | 4 條 CHECK |
| 1b | ✅ 完成 | 103 條 FK index |
| 1c | ✅ 完成 | 4 條 DROP 重複 index |
| 2 Batch 1 | ✅ 完成 | Finance 6 頁 系統主管 guard |
| 2 Batch 2 | ✅ 完成 | Accounting layout guard（10 頁 cover）|
| 2.5 | ✅ 完成 | 28 張 NO FORCE RLS |
| 3 LOGAN | ✅ 完成 | 1 bug 修 + well-known-ids.ts 骨架 |
| 4 | ✅ 完成 | quotes 6 欄刪 + customers 5 casts + payment_requests 2 type |
| 5 | ✅ 完成 | 3 dead column DROP |
| 6 Batch 1 | ✅ 完成 | 5 條 financial/messages critical RESTRICT |
| 6 Batch 2 | ✅ 完成 | 20 條 tours(id) 子表 RESTRICT |
| 6 Batch 3 | ✅ 完成 | 14 條 orders/quotes/customers(id) RESTRICT |
| 6 Batch 4 | ✅ 完成 | 24 條 suppliers/cities/countries/ref_airports/ref_countries/itineraries RESTRICT |
| 6 Batch 5 | ✅ 完成 | 20 條 traveler_trips/workspace_roles/traveler_split_groups/tour_leaders/fleet_vehicles/projects/customer_assigned_itineraries RESTRICT |
| 6 Batch 6 | ✅ 完成 | 14 條 employees(12) + channels 業務類(2) RESTRICT |
| 6 Batch 7 | ⏪ 回滾 | 原改 12 條 → 09:54 SSOT 指正後全回 CASCADE、交 Post-Launch retention policy |
| 6 Batch 8 | ✅ 完成 | 6 條 auth.users 跨 domain (accounting×2/tour_expenses/employees/private_messages×2) RESTRICT |
| 6 Batch 9 | ✅ 完成 | 6 條小群財務/審計 (linkpay_logs/invoice_orders/opening_balances/accounting_transactions(account)/payroll_records(period)/file_audit_logs) RESTRICT |
| 2 Batch 5 | ✅ 完成 | Database 管理頁 layout 系統主管 guard（9 頁 cover） |
| 9 /tours 分頁 | ✅ 完成 | 接上 TablePagination、用 useToursPage.totalCount + currentPage |

**Wave 6 淨值**：109 條 CASCADE → RESTRICT（原 121、B7 回滾 12）。**核心全部收尾**。剩 121 條保留 CASCADE 合理（74 workspaces + auth.users 14 GDPR + traveler_profiles 12 GDPR 對齊 + pnr 11 unit + composition 小群 + header-detail pattern 等）。

**Phase A → B 進度**：**Wave 6 完成** + Wave 2 Batch 5 / 剩 Wave 2 Batch 3/4（需 William）/3 UUID 替換/7/8/9 其他

## 🛑 紅線新版（2026-04-21 更新）
- **絕不**刪 CORNER/JINGYAO/YUFEN 的 row
- **絕不** DROP 有資料（non-zero across real tenants）的 column
- **絕不**修改既有 row 的值（除非備份 + 正規化）
- **可自主**：ALTER schema、加 constraint、改 FK、RLS policy、DROP 確認空的 column、改 code（有測試驗證）

## 新自主 SOP（每個 Wave）
1. BEFORE snapshot（`scripts/row-count-snapshot.sh`）
2. 驗證待改動對 Corner 真資料零影響
3. Apply 改動
4. AFTER snapshot 對帳（Corner/JINGYAO/YUFEN row 必須 identical）
5. Type-check
6. Playwright smoke + login-api（或對應 Wave 相關 E2E）
7. 失敗 → rollback + LOG 標紅 + 停
8. 成功 → 下一個

## 完整 Discovery 檔案索引

**主索引**（先看這個）：
- `discovery/MASTER_INDEX.md` — 8 agent 整合、Wave 重估工期

**8 份 agent 報告**：
- `discovery/A1_all_routes_guard.md` — 121 頁 guard 全盤點
- `discovery/A2_antipatterns.md` — 8 類反 pattern 數量
- `discovery/A3_dead_verification.md` — dead dialog + table 三方驗證
- `discovery/A4_phantom_fields.md` — 幽靈欄位細節
- `discovery/A5_fk_cascade_trigger.md` — 271 CASCADE + SSOT 寫入點
- `discovery/A6_tenant_isolation.md` — 多租戶 + well-known-ids 設計
- `discovery/A7_large_refactor.md` — 3 檔重構藍圖
- `discovery/A8_status_normalization.md` — 中英 status 對應

**Phase A 早期產出**（續用）：
- `waves/PHASE_A_DISCOVERY_REPORT.md`
- `waves/WAVE_2_PRE_WORK.md`
- `waves/WAVE_2_5_RLS_ANALYSIS.md`
- `waves/184_table_classification.md`

## 附記
- Token 已更新（`sbp_ddbc54...`）、memory 同步
- 搬 4 筆 4-15/4-16 過期 draft migration 到 `_rejected/`
- Wave 1a：4 條 CHECK constraint（NOT VALID）
- Wave 1b：103 條 FK index（Management API、pg_indexes 1028 條）
- Wave 1c：4 條 DROP 重複 index（依 scan_count 判定實戰 vs 垃圾）
- 所有 Wave 1 SQL 歸檔在 `_applied/2026-04-20/`

---

## William 已定決策摘要（2026-04-20）

- **幽靈欄位**：刪 type
- **CASCADE**：全 RESTRICT
- **tour_leader_id FK**：不動（原設計對、audit 標錯）
- **tour_leader 權限 scope**：依身份（employees→full、客戶→self_only）
- **人數欄位**：合併為 1（SSOT、從 order_members count 算）
- **狀態值**：上線前全英 + CHECK
- **權限系統**：全站 hasPermission、不 hardcode（Wave 2 前置工作：定 permission key 清單）
- **archive_empty_tables**：重做盤點、不動 DB、分三類（真死/未啟用/偶爾用）
- **dead_data_cleanup**：不動（12144 列 ref_airports_backup）
- **ref_cities**：Phase B 後期建

---

## 歷史里程碑

- 2026-04-20 08:00-18:00：audit trail FK 17 表重構（本專案啟動前）
- 2026-04-20 20:00：專案成立、skill + STATE/BACKLOG/LOG 建立
- 2026-04-20 21:30：**Phase A 盤點完成**
  - 整合 15 份 audit + `_INVARIANTS` + `_BLOCKED`
  - 新發現：Corner workspace UUID 硬編 6 處、LOGAN_ID 定義衝突、payment_method 寫死 2 處
  - `|| ''` audit 欄位精確 grep：0 處殘留
  - `'current_user'` literal：2 處殘留（travel-invoice void）
  - gitnexus index 更新到 2026-04-20（31596 symbols）
  - 產出 9 個 Wave 結構化的 BACKLOG

---

## 負載狀態

- Phase 0（skill 與 state 檔建立）：✅ 完成
- Phase A（全面盤點）：✅ **完成 2026-04-20 21:30**
- Phase B（批次執行）：⏸ 等 William 確認進 Wave 0
  - Wave 0：P0 紅線違反、Code only、S 工期
  - Wave 1：100% 安全 DB migration
  - Wave 2：權限守衛
  - Wave 3：多租戶隔離（Corner UUID 集中化）
  - Wave 4：幽靈欄位 + dead UI（🛑 部分需 William 決策）
  - Wave 5：資料一致性 trigger（🛑 需決策）
  - Wave 6：CASCADE 策略統一（🛑 需決策）
  - Wave 7-9：重構、狀態值、其他
- Phase C（守門機制）：⏸ 未開始
- Phase D（上線準備 TESTUX）：⏸ 未開始
- Phase E（完工）：⏸ 未開始

---

## Phase A 未覆蓋、Phase B 執行時補做

- RLS policy DB 端盤點（需 Supabase API、紅線涉及）
- audit FK pg_constraint DB 端驗證（同上）
- 各 Wave 動到具體符號時才跑 gitnexus_impact（多方驗證）
