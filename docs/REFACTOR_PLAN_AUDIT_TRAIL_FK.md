# 操作追溯欄位（audit trail）FK 統一化計畫

**日期**：2026-04-20
**狀態**：✅ Phase 0–5 全部完成（2026-04-20）
**原則**：**業務感覺不出差別，shared audit trail 模型一致化**

---

## 〇、這份文件的定位

本次重構的單一計畫來源。ERP 領域內部操作追溯欄位（`created_by` / `updated_by` / `locked_by` / `uploaded_by` / `performed_by`）全部統一 FK 到 `employees(id)`。

本計畫受 `CLAUDE.md` 規範拘束：動手前讀 `docs/CODE_MAP.md`、改 symbol 前 `gitnexus_impact`、不用 `--no-verify`、commit 前 `gitnexus_detect_changes`、**不准對 `workspaces` 下 FORCE RLS**。

---

## 一、三條核心原則

1. **業務感覺不出差別**
   所有舊資料在 migration 內自動映射，頁面顯示的「建立者 / 修改者」仍能解到同一個人。

2. **ERP 內部欄位 → `employees`；用戶身份/社交/traveler → `auth.users`**
   表的語意決定 FK。`created_by` 意思是「哪位員工做的這筆」時，就該指 employees；`user_id`、`sender_id`、`friend_id` 等「這就是一個 Supabase 用戶本身」時，保留 `auth.users`。

3. **Fail-closed 原則**
   舊資料若 map 不到 employee（例如已離職、或 auth_uid 從未連結過 employee）→ 該筆設 NULL，不偽造 id。

---

## 二、盤點結果（2026-04-20 從 prod 取得）

### 2.1 範圍

**ERP-domain 需要改**（FK 目前指 auth.users，應指 employees）：

| 表 | 欄位 |
|---|---|
| `assigned_itineraries` | `created_by` |
| `confirmations` | `created_by`, `updated_by` |
| `cost_templates` | `created_by`, `updated_by` |
| `emails` | `created_by`, `updated_by` |
| `files` | `created_by`, `updated_by` |
| `file_audit_logs` | `performed_by` |
| `image_library` | `created_by` |
| `itineraries` | `created_by`（+ 刪除 `created_by_legacy_user_id`、`creator_user_id` 兩個零值欄位） |
| `linkpay_logs` | `created_by`, `updated_by` |
| `michelin_restaurants` | `created_by`, `updated_by` |
| `payment_requests` | `updated_by` |
| `premium_experiences` | `created_by`, `updated_by` |
| `suppliers` | `created_by`, `updated_by` |
| `todos` | `created_by`, `updated_by` |
| `tour_control_forms` | `created_by`, `updated_by` |
| `tour_documents` | `uploaded_by` |
| `tours` | `locked_by`, `last_unlocked_by` |

合計：**17 表、30 欄位**。

### 2.2 不在範圍（維持 FK 到 auth.users）

- 用戶身份本身：`employees.user_id`、`employees.supabase_user_id`、`profiles.id`、`traveler_profiles.id`、`supplier_users.user_id`
- 社交/訊息/朋友關係：`friends.*`、`private_messages.*`、`traveler_*`、`social_*`
- 用戶個人領域：`accounting_accounts.user_id`、`body_measurements.user_id`、`casual_trips.user_id`、`designer_drafts.user_id`、`online_trip_members.user_id`、`personal_records.user_id`、`progress_photos.user_id`、`timebox_*.user_id`、`tour_expenses.leader_id`
- 權限：`itinerary_permissions.user_id`

### 2.3 資料可映射性

**驗證方法**：對每張表、每個欄位跑 `LEFT JOIN employees ON e.user_id = col OR e.supabase_user_id = col` 計算 non-null / mappable / unmappable 三組數字。
**itineraries.created_by 已驗證**：19/19 可 map。其餘 Phase 1 第一件事是全部跑一遍、數字寫進這份文件附表。

---

## 三、執行分階段

### Phase 0：規劃與守門（本文件）
- [x] 盤點完成
- [x] 寫計畫
- [x] William review 並 approve
- [ ] 寫 E2E 守門測試：`tests/e2e/audit-trail-insert.spec.ts` — 跳過（改用現有 smoke + login-api.spec.ts 驗證 + 使用者實測 itineraries）

### Phase 1：可映射性審計（✅ 完成）
- [x] 寫 SQL 報表：17 表 × 30 欄位的資料分布
- [x] 產出檔：`docs/AUDIT_TRAIL_DATA_INVENTORY.md`
- **結果**：79 row 有值、**100% 可 map**，0 unmappable → Q1「unmappable 處理」失效

### Phase 2：救火 — itineraries（✅ 完成）
- [x] Migration `20260420140000_fix_itineraries_created_by_fk.sql` 執行於 prod
- [x] 19 筆 created_by map 成功
- [x] 兩個零值欄位 `created_by_legacy_user_id`、`creator_user_id` DROP
- [x] `src/data/entities/itineraries.ts` 移除廢欄位 SELECT
- [x] TypeScript types 重新生成
- [x] 使用者實測建立全新行程表儲存成功

### Phase 3：分批 migration（✅ 完成，當天跑完）
分批改按「風險從低到高」（Q2 決策）：

- [x] **B1** `20260420150000_audit_trail_fk_batch_b1.sql`：7 空表、11 FK（linkpay_logs, cost_templates, emails, assigned_itineraries, tour_control_forms, file_audit_logs, image_library）
- [x] **B2** `20260420160000_audit_trail_fk_batch_b2.sql`：4 表、7 FK（files, tour_documents, michelin_restaurants, premium_experiences）
- [x] **B3** `20260420170000_audit_trail_fk_batch_b3.sql`：2 表、4 FK（tours, todos；3 筆 map 成功）
- [x] **B4** `20260420180000_audit_trail_fk_batch_b4.sql`：3 表、5 FK（payment_requests, suppliers, confirmations；57 筆 map 成功）

驗證：`pg_constraint` 查 17 表全部指 employees ✅；smoke test 17/17 pass；login-api 6/6 pass。

### Phase 4：Code 掃蕩（✅ 完成）
- [x] 掃所有 `created_by/updated_by/locked_by/uploaded_by/performed_by` 寫入
- [x] 修掉 2 處 `'current_user'` 寫死字串（useInvoiceDialog.ts、useTourPayments.ts）
- [x] 修掉 8 處 `|| ''` 空字串 fallback（BatchInvoiceDialog、IssueInvoiceDialog、useRequestForm、QuickRequestFromItemDialog、tour-itinerary-tab、tour-confirmation-sheet、CreateReceiptDialog）
- [x] `issueInvoice` 型別的 `created_by` 改選填
- [x] 驗證：`auth.user!.id`（useRequireAuth）本質上就是 employee.id，寫法正確

### Phase 5：規範入庫（✅ 完成）
- [x] `docs/DATABASE_DESIGN_STANDARDS.md` §8 加「審計欄位慣例」節
- [x] `CLAUDE.md` 紅線區加「審計欄位 FK 一律指 employees(id)」
- [x] 模板 + code 寫入規則 + 為什麼 `currentUser.id` = `employee.id` 的說明都放進規範

---

## 四、回退策略

每個 Phase 都要能獨立回退。

### 4.1 Migration 回退檔
每支 migration 都附 `.ROLLBACK.sql`：
- `UPDATE` 反向寫回原 auth uid（從 `employees.user_id / supabase_user_id` 反查）
- `DROP CONSTRAINT + ADD CONSTRAINT` 換回 auth.users

### 4.2 出問題判定
- Phase 2/3 migration 跑完、守門測試失敗 → 立即 rollback、凍結後續 phase、回計畫檢討
- Phase 2/3 跑完 24 小時內有使用者回報新錯誤 → 同上

### 4.3 Prod 安全網
- Migration 前：`pg_dump` schema + 相關表 data
- Migration 當下：BEGIN / COMMIT 包起來、任何一步失敗就 ROLLBACK
- 不使用 Supabase CLI `db push`（目前 migration history 本地跟 prod 已分叉），一律用 Management API 手動跑、跑完把 SQL 存成 migration 檔對應

---

## 五、風險清單

| 風險 | 機率 | 嚴重度 | 對策 |
|---|---|---|---|
| 舊 auth uid map 不到任何 employee（離職 / 已刪） | 中 | 低 | Phase 1 統計、approve NULL 策略 |
| 某張表的 `created_by` 被 RLS policy 用到 | 低 | 高 | Phase 1 跑 `pg_policies` 掃一次、已驗證 17 表無此狀況 |
| code 裡有地方故意傳 auth uid 而不是 employee.id | 低 | 中 | Phase 4 `grep -rn 'created_by.*\.id'` + gitnexus 掃 |
| migration 跑到一半 prod 有人 insert | 低 | 中 | 選離峰時段、每個 migration 包 BEGIN/COMMIT、每張表最多 10 秒鎖 |
| 類型生成後 TS 爆錯（欄位被刪） | 中 | 低 | Phase 2 / 4 都跑 `npm run type-check` |

---

## 六、驗證指標

Phase 全部完成後：
- [ ] 17 表 30 欄位 FK 全部指向 `employees(id)`（SQL 查 `pg_constraint` 驗證）
- [ ] 守門測試全綠（`tests/e2e/audit-trail-insert.spec.ts`）
- [ ] `npm run type-check` 無錯
- [ ] GitNexus 重 index 後 `gitnexus_detect_changes` 無非預期符號變動
- [ ] 上線一週內無新增相關錯誤（看 ErrorLogger）

---

## 七、時間估算

| Phase | 工時 | 依賴 |
|---|---|---|
| 0 計畫 approve | 0 | — |
| 1 可映射性審計 | 0.5 天 | Phase 0 |
| 2 救火 itineraries | 0.5 天 | Phase 1 |
| 3 Batch A–D migration | 5 天（每批 1 天 + 1 天觀察滾動） | Phase 2 穩定後 |
| 4 Code 掃蕩 | 0.5 天 | Phase 3 完成 |
| 5 規範入庫 | 0.5 天 | Phase 4 |
| **合計** | **7 天（含觀察）** | |

---

## 八、待決策事項

1. **unmappable 舊資料**：Phase 1 跑完後若有 row 映射不到 employee，採 NULL 還是先手動處理？
2. **Phase 3 分批順序**：A→B→C→D 還是按風險（影響業務最小的先）？
3. **守門測試用哪個 workspace**：測試 workspace 還是 Corner 主站？
4. **Phase 2 當下**：itineraries 的兩個 0-row 欄位（`created_by_legacy_user_id`、`creator_user_id`）同步 DROP，還是保留等 Phase 3 再處理？

---

_單一計畫來源。每階段完成後、回來這份更新狀態欄位、不要開第二份。_
