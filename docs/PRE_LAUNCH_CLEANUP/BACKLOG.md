# Pre-Launch Cleanup Backlog

> 單一事實來源。每批次結束更新勾選狀態。
> 標記：S（<2 小時）/ M（半天）/ L（1-2 天）
> Wave 編號僅為建議執行順序、實際可由 William 調整

---

## ✅ 已完成（本專案啟動前、2026-04-20）

### [DB] Audit trail FK 統一化

- [x] 17 張 ERP 表、30 FK swap 至 `employees(id)`
- [x] 79 筆資料 100% map
- [x] DROP `itineraries.created_by_legacy_user_id` + `creator_user_id`
- [x] DROP `todos.created_by_legacy`
- Migration：20260420140000、150000、160000、170000、180000、190000
- 紀錄：`docs/REFACTOR_PLAN_AUDIT_TRAIL_FK.md`、`docs/AUDIT_TRAIL_DATA_INVENTORY.md`

### [DB] Hotels/Restaurants city_id nullable

- [x] `restaurants.city_id` / `hotels.city_id` 改 nullable
- Migration：20260420130000

### [CODE] 審計欄位寫入點清理

- [x] `'current_user'` literal 清除 2 處
- [x] `|| ''` 在 audit 欄位改 `|| undefined` 8 處
- [x] server API session → employee id 3 處
- 驗證：2026-04-20 精確 grep `(created_by|updated_by|...)\s*:\s*.*\|\|\s*''` 回傳 0 處

### [DOC] 規範入庫

- [x] `docs/DATABASE_DESIGN_STANDARDS.md` §8 審計欄位慣例
- [x] `CLAUDE.md` 紅線「audit 欄位 FK 必指 employees」

### [INFRA] Supabase CLI link

- [x] 修復 link 到 `wzvwmawpkapcmkfmkvav`
- [x] Repair 9 筆 local-only migration history

---

## ⏳ 待做（上線前）

### Phase A — 盤點（完成 2026-04-20）

- [x] 讀 `VENTURO_ROUTE_AUDIT/00-SUMMARY.md` + 15 份 audit（已整合）
- [x] 讀 `docs/blueprints/_INVARIANTS.md`、`_BLOCKED.md`
- [x] 精確 grep 反 pattern：`|| ''` 在 audit 欄位 → 0 處殘留
- [x] grep `'current_user'` literal → 2 處殘留（見 Wave 0）
- [x] audit FK 檔案端驗證：4-20 inventory 17 表覆蓋（DB 端 pg_constraint 查需後續）
- [x] 硬編 UUID / Bot ID 全掃 → 新發現 Corner WS 6 處、Logan 衝突、payment_method 2 處（Wave 3）
- [x] dead UI dialog：audit 已列 4 個（Wave 4、Phase B 再三方驗證）
- [x] `as unknown as` / `as never`：critical 5 處（/customers Wave 4）、其餘 ~470 處 Post-Launch
- [x] `_pending_review/` 4 支 migration 分類（見下方）
- [ ] `npx gitnexus analyze` 背景執行中（task #9）
- [ ] RLS policy DB 端盤點（需 Supabase API、後續授權才做）
- [ ] audit FK DB 端 pg_constraint 驗證（同上）

#### pending migrations 分類

| Migration                                    | 風險                               | 動作                                                                   |
| -------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| `20260418010000_add_missing_fk_indexes.sql`  | 🟢 低（純加 index CONCURRENTLY）   | Wave 1 併用、內容比 00-SUMMARY 更全                                    |
| `20260418f_create_ref_cities.sql`            | 🟢 低（純建新表 + seed、不動 row） | 🛑 William 確認還要此設計？Phase B 可執行                              |
| `_drop_employee_job_roles.sql`（4-18）       | 🟢 已決策 Option A                 | Wave 2 執行                                                            |
| `20260418000000_archive_empty_tables.sql`    | 🟡 中（搬 184 表到 \_archive）     | 🛑 逐表確認「calendar_events / channel_threads」是否真空（audit 在用） |
| `20260418020000_dead_data_cleanup_DRAFT.sql` | 🛑 紅線（動 12144 列、DROP 表）    | William 逐條確認、備份在 `~/venturo-backups/2026-04-17/`               |

---

### Phase B — 批次執行

---

#### ✅ Wave 0 · P0 紅線違反（完成 2026-04-20 22:30）

- [x] **`'current_user'` literal 殘留 2 處**（S）
  - 改 API 從 `auth.data.employeeId` 取、client 不再傳 operatedBy
- [x] **`/tools/reset-db` 無 系統主管 guard**（S）
- [x] **`/login` 漏檢 `is_active=false`**（S）
- [x] type-check 0 錯

**Wave 0 擴充**（Phase A 盤點補發現）：

- [x] **`tours.deleted_by` FK 指 employees**（2026-04-21 查驗、已在先前工作中修正、BACKLOG 漏勾）
- [x] **Audit FK 全掃**：所有 `created_by/updated_by/performed_by/uploaded_by/locked_by/last_unlocked_by/deleted_by` 欄位掃 profiles/users ref、全 clean（僅剩 `traveler_conversations.created_by → auth.users` 是對的：C 端 traveler 創建）

---

#### ✅ Wave 1 · 100% 安全 DB migration（完成 2026-04-20 23:20）

- [x] **1a**：4 條 CHECK constraint（quote_type / tour_type / invoice jsonb × 2、NOT VALID）
- [x] **1b**：103 條 FK index CONCURRENTLY（走 Management API、prod pg_indexes = 1028）
- [x] **1c**：4 條 DROP 重複 index（依 scan_count 判定、留實戰 / 刪垃圾）
  - 不 DROP `idx_quotes_main_city_id`（airport_code 唯一 index）
  - 不 DROP `idx_tours_deleted/_is_deleted`（Wave 5 SSOT）
- 歸檔：`supabase/migrations/_applied/2026-04-20/wave1[abc]_*.sql`

---

#### 🟡 Wave 2 · 權限守衛（code only、M）

**依據**：INV-A01 / INV-A02 + Phase A 盤點
**方向確立**：走 `useTabPermissions.canRead / canWrite`、不新設計 hasPermission

**前置**（下 session 第一步）：

- [ ] 盤點所有頁面現有權限檢查（hardcode isAdmin vs canRead/canWrite vs 完全沒）
- [ ] 列 permission key 清單（`module.tab` 組合）、讓 William 審
- [ ] 列 role_tab_permissions 表現況（目前有哪些 key）

**執行**：

- [x] **Batch 1**：Finance 6 頁 系統主管 guard（payments/requests/travel-invoice/reports/settings/treasury、2026-04-21）
  - 簡化版：`useAuthStore.isAdmin` + `UnauthorizedPage`、避開 useTabPermissions async race
- [x] **Batch 2**：Accounting layout guard（一次 cover /accounting 10 頁、系統主管-only）
- [ ] **Batch 3**：HR 系統主管 頁（payroll / reports / settings / deductions、需 William 確認哪些 系統主管 only）
- [ ] **Batch 4**：Settings 系統主管 頁（workspaces / modules / receipt-test）
- [x] **Batch 5**：Database 管理頁 layout guard（2026-04-21、9 頁 cover：archive/attractions/company-assets/constants/fleet/suppliers/tour-leaders/transportation-rates/workspaces）
- [ ] **tour_leader 權限 scope 邏輯**（員工→full、客戶→self_only）— Wave 2 後期
- [ ] **沒有系統主管資格 細顆粒權限 migrate 到 canRead/canWrite**（Wave 2 最後階段、用 role_tab_permissions）

---

#### ✅ Wave 2.5 · RLS FORCE 體檢（完成 2026-04-21 00:52）

- [x] 28 張全 `NO FORCE ROW LEVEL SECURITY`
- [x] force_rls=true 表數：28 → 0
- [x] Protected workspace row count 零變動
- [x] Login API smoke 6/6 通過（4 workspace + TESTUX 完整登入）
- 歸檔：`supabase/migrations/_applied/2026-04-21/wave25_no_force_rls.sql`（補寫）

剩餘項目：

- [ ] `ref_cities` 缺 RLS 補 policy（非 critical、延後）

---

#### 🟠 Wave 3 · 多租戶隔離 critical（M-L）

**風險**：Partner 部署會 leak 回 Corner

- [ ] **LINE Bot ID 硬編 `@745gftqd`**（S、2 處）
  - `src/app/(main)/customers/page.tsx:523, 540`
  - 目前是 env fallback（`NEXT_PUBLIC_LINE_BOT_ID || '@745gftqd'`）
  - 症狀：Partner 忘設 env → 顧客綁到 Corner
  - 修法：移 `src/lib/constants/well-known-ids.ts`、env 沒設則 throw（不 fallback）
  - 依據：INV-D05
- [ ] **Corner workspace UUID `8ef05a74-...` 硬編 6 處**（M、新發現、audit 未覆蓋）
  - `src/lib/line/ai-customer-service.ts:10` FALLBACK_WORKSPACE_ID
  - `src/features/attractions/components/DatabaseManagementPage.tsx:20` CORNER_WORKSPACE_ID
  - `src/app/api/finance/account-mappings/route.ts:97` 預設源 workspace
  - `src/app/api/line/send-insurance/route.ts:130` 寫入 workspace_id
  - `src/app/api/tenants/seed-base-data/route.ts:6` + `src/app/api/tenants/create/route.ts:578`
  - 修法：集中到 well-known-ids.ts + 改從 session / req context 取
  - 🛑 部分是 seed 流程的合理寫死（tenants/seed-base-data）、需逐處判定
- [x] **LOGAN_ID 衝突修正**（完成 2026-04-21）
  - DB 實況：`000...001` = VENTURO 機器人 (BOT001)、`000...002` = Logan AI (LOGAN)
  - `ai_memories` 30 筆資料全在 `000...002`（正確）
  - `logan-service.ts:11` 的 `LOGAN_ID=000...001` 其實是 dead export（無 import）、但 comment 誤導
  - 統一：logan-service.ts 改成 `000...002` + 加警告註解
  - `workspace.ts:66` SYSTEM_BOT_ID 維持 `000...001`（指 VENTURO 機器人、正確）
- [ ] **Payment method UUID 硬編 2 處**（S）
  - `src/features/finance/requests/components/AddRequestDialog.tsx:184, 840`
  - `e554fee7-...`（預設匯款）/ `d6e2b71f-...`（batch 預設）
  - 修法：從 payment_methods 表查 is_default = true
- [ ] **`/channel` 切換 workspace 不更新**（M）
  - 症狀：Partner 切換看到錯公司聊天
  - 修法：workspaceId dep + cache invalidate
- [ ] **建 `src/lib/constants/well-known-ids.ts`**（S、Wave 3 前置）
  - 目前只有 `workspace.ts` 定 SYSTEM_BOT_ID、零散

---

#### ✅ Wave 4 · 幽靈欄位 + dead UI（完成 2026-04-21 01:30）

- [x] **quotes 刪 6 phantom fields**（metadata 其實不在 quote-store.types、A4 agent 誤列）
  - 刪 type：contact_person / contact_email / quote_number / requirements / budget_range / payment_terms
  - 清 6 處 read（EnvelopeDialog / QuoteDetailEmbed / useQuoteState × 2 / useQuotesFilters / QuoteHeader）
- [x] **customers LINE 5 casts 移除**
  - Customer type 加 line_user_id / line_linked_at
  - 5 處 `as unknown as Record` 清乾淨
- [x] **payment_requests 加 soft-delete type**
  - finance.types.ts PaymentRequest 加 is_deleted / deleted_at
- [x] type-check 0 錯、smoke 17/17

A3 agent 修正：dead UI 實際只 2 個真 dead（`BatchReceiptConfirmDialog` / `ResetPasswordDialog`）、留待 Wave 9。

---

#### ✅ Wave 5 · 資料一致性（修正：非 trigger、是 DROP dead columns）

- [x] **DROP 3 個 orders dead columns**（完成 2026-04-21 00:49）
  - child_count / infant_count / total_people（3 欄位 0 值 across all workspaces）
  - Protected row count 零變動
  - Type-check 綠、Playwright smoke 17/17 通過
  - 歸檔：`supabase/migrations/_applied/2026-04-21/wave5_drop_dead_order_count_columns.sql`
- [ ] **`adult_count` 保留、待確認**：TESTUX 3 筆有值（非 Corner）、code 層需再驗是否有寫入點
- [x] ~~JSONB 雙軌~~：A5 agent 驗證實際 table-first 寫入、零 drift 風險、**Wave 5 原任務作廢**

---

#### 🔄 Wave 6 · CASCADE 統一（進行中）

決策：全 RESTRICT。目前批次狀況：

- [x] **Batch 1**：5 條 financial/messages/traveler critical CASCADE → RESTRICT（2026-04-21 01:30）
- [x] **Batch 2**：20 條 tours(id) 子表 CASCADE → RESTRICT（2026-04-21 02:00）
- [x] **Batch 3**：14 條 orders/quotes/customers(id) CASCADE → RESTRICT（2026-04-21 02:15）
- [x] **Batch 4**：24 條 suppliers/cities/countries/ref_airports/ref_countries/itineraries（2026-04-21 07:20）
- [x] **Batch 5**：20 條 traveler_trips/workspace_roles/traveler_split_groups/tour_leaders/fleet_vehicles/projects/customer_assigned_itineraries（2026-04-21 07:26）
- [x] **Batch 6**：14 條 employees(12) + channels 業務類(2)（2026-04-21 07:29）
- [x] **Batch 7**：12 條 traveler_profiles 整群（2026-04-21 07:33）→ **已回滾 09:54**（William SSOT 指正、回 CASCADE、交 Post-Launch retention policy 題）
- [x] **Batch 8**：6 條 auth.users 跨 domain/財務/audit FK（accounting×2 / tour_expenses / employees / private_messages×2）（2026-04-21 07:37）
- [x] **Batch 9**：6 條小群財務/審計（linkpay_logs / invoice_orders / opening_balances / accounting_transactions(account_id) / payroll_records(period) / file_audit_logs）（2026-04-21 07:42）

**原 A5 agent 列 271 條 CASCADE、淨改 109 條**（原改 121、B7 回滾 12）。Wave 6 全部核心工程處理完。

### 剩餘 FK 處置（保留 CASCADE 合理、免再動）

- **auth.users 14 條**（Supabase GDPR 1:1 extension pattern）：profiles / traveler_profiles / friends×2 / timebox×4 / body_measurements / designer_drafts / personal_records / progress_photos / itinerary_permissions / traveler_conversation_members
- **pnr_records 11 條**：PNR 是資料單位、segments/passengers/remarks/ssr/fare*alerts/queue_items/flight_status*\* 是 PNR 的 aspect
- **order_members 3 條**：tour_room_assignments / tour_table_assignments / tour_vehicle_assignments（成員退團時 assignment 跟著走）
- **channels 3 條**：messages / channel_members / channel_threads（channel-lifetime 自然內容）
- **meeting_rooms 2 條 / website_itinerary_days 2 條**：composition tree
- **workspaces 74 條**：workspace delete is catastrophic regardless of policy
- **小群剩餘**：self-ref tree（categories / conversations / expense_categories 等）、derived data

### 剩餘保留 CASCADE 明細（header-detail / composition / 合理）

- **header-detail pattern**：journal_lines/voucher、tour_confirmation_items/sheet、request_response_items/response、email_attachments/email
- **composition**：brochure_versions/document、itinerary_versions/document、advance_items/list、magic_combo_items、online_trip_members/trip、wishlist_template_items
- **自然 membership**：traveler_conversation_members/conversation、traveler_expense_splits/expense、bot_groups/bot、company_contacts/company、customer_group_members/group
- **資源 assignment 連動**：tour_room/table/vehicle_assignments、timebox_scheduled_boxes、tour_custom_cost_values/field、selector_field_roles/field
- **badge/lookup 連動**：customer_badges/definition、user_badges/badge+profile、leave_balances/type、line_messages/conversation
- **self-ref tree**：folders.parent_id、company_asset_folders.parent_id、website_itinerary_days/itinerary

~~tour_leader_id FK~~：William 澄清為設計對、不需改（Wave 6 移除此項）

---

#### 🟡 Wave 7 · 大重構（L、維護成本高但不阻上線）

- [ ] **`AddRequestDialog.tsx` 1512 行拆分**（L、維護風險最高）
- [ ] **`/quotes/[id]` 614 行 + `QuoteDetailEmbed` 80% 重複 → `<QuoteDetailCore>`**（L）
- [ ] **`/customers` page 562 行 → 薄殼**（M、違反 INV-P01）
- [ ] **`/finance/requests` page → 薄殼**（M）
- [ ] **todos QuickReceipt / QuickDisbursement 合進正規 Dialog**（L、動錢程式碼、2026-04-20 評估後延後）
  - 現況：`QuickReceipt` 414 行、`QuickDisbursement` 201 行、自己寫的 form + 自己的 save API（`handleCreateReceipt`）
  - 正規：`AddReceiptDialog` 823 行、`AddRequestDialog` 1474 行
  - 底層都 → `createReceipt` entity、**DB 層已統一**
  - 風險：表單/驗證層 divergence（`AddReceiptDialog` 改 bug、QuickReceipt 不會跟）
  - 切法建議：抽 `AddReceiptForm` / `AddRequestForm`（純表單、無 Dialog 殼）→ Dialog 和 todos 面板各自套
  - 🛑 **務必獨立 session 做、需完整測試計畫**（非緊急、DB 層已統一、divergence 風險有界）

---

#### 🟠 Wave 8 · 狀態值與 jsonb 結構（L、🛑 需 William 決策）

- [ ] **中英狀態值統一**（L）
  - tours.status 全中文、quotes.status 中英混、orders.status 各自一套
  - 🛑 決策：全英？全中？範圍一次動還是分批？
  - 依據：INV-S01
- [ ] **jsonb 全加 CHECK constraint**（M）
  - 已有 DRAFT 在 `_pending_review/`
  - 依據：INV-D03
- [ ] **orders `order_number` race 移到 DB RPC**（M）
  - 症狀：併發撞號

---

#### 🟡 Wave 9 · 其他跨路由 pattern

- [ ] **`location` 廢棄欄位 3 處殘留**（S）
  - /quotes 列表 row.location、/quotes/[id] useQuoteTour:81、/tours useToursPaginated:83
- [ ] **page 直查 supabase 多處**（M、違反 INV-P02）
  - /tours tour_requests、/customers 4 處、/quotes/quick tour_itinerary_items
- [ ] **自動 label key 無語意 rename**（M、`LABEL_5810` 等）
- [ ] **spread 寫 DB 掃查**（M、違反 INV-D01）
- [ ] **Magic string filter**（S）
  - /orders `tour_name.includes('簽證專用團')` → 加明確欄位
- [x] **`/tours` 列表缺分頁 UI**（2026-04-21、ToursPage 下加 TablePagination、接 useToursPage 的 totalCount/currentPage/setCurrentPage、pageSize 固定 20）
- [ ] **租戶時區支援**（M、上線後處理）
  - 現況：`today` 用 `new Date().toISOString().split('T')[0]` 取 UTC、台灣凌晨 0–8 點會誤判一天
  - 背景：2026-04-21 修 tours tab 分類 bug 時發現、先統一用 UTC、分類與顯示同步
  - 修法：`workspaces` 表加 `timezone` 欄（TEXT、預設 `Asia/Taipei`）、前端 helper `getWorkspaceToday()` 依租戶時區算 today
  - 未來日本 / 越南 / 新加坡等跨時區租戶必備
  - 影響範圍：`TourTableColumns.tsx` 狀態計算、`useToursPaginated.ts` 日期 filter、任何「比對今日」的地方
- [ ] **出發時間（`departure_time`）與回程時間**（M、上線後處理）
  - 現況：tours 表只有 `departure_date` / `return_date`（DATE 型別、無時間）
  - 需求：航班起降時間、出發集合時間、回程抵達時間
  - 涉及：team 通知、行程表封面、領隊清單、準點追蹤
  - 加欄位 `departure_time` / `return_time`（TIMETZ 或 TIMESTAMPTZ）+ UI 新增/編輯欄位

- [ ] **🏛️ 租戶財務/業務設定中心**（L、架構項、上線後做）
  - **原則**：Corner 專屬邏輯不該寫死 code、應該讓每個租戶在設定介面自己調
  - **好處**：新租戶上線不用改 code、不用工程師；離職/交接不怕 code 藏著 Corner 規則
  - **已有基礎**：`workspace_features` 表（feature flag）、`premium_enabled`（付費大開關）
  - **要新增的 workspace 設定**（建議拆成 `workspace_settings` 表或 JSONB column）：
    - `default_request_date_rule`：`'today'` / `'next_thursday'` / `'next_monday'` / `'fixed_day:15'`（每月 15）
    - `disbursement_cycle_rule`：週結 / 雙週結 / 月結 / 手動
    - `show_special_billing_indicator`：是否顯示「特殊出帳」視覺警示
    - `receipt_number_format` / `invoice_number_format`：編號 pattern
    - `default_tax_rate`：5% / 免稅 / 其他
    - `default_payment_method_id`：預設付款方式（取代目前 AddRequestDialog 硬寫的 UUID）
  - **建一個 `/settings/financial` 頁面**：租戶 系統主管 可調上述所有設定
  - **Code 層全改查 workspace config**、不再 hardcode Corner 規則
  - **背景**：2026-04-21 改「請款預設週四→今天」時發現這 pattern、應該集中處理

- [ ] **ESLint custom rules**（M）
  - 擋 `created_by: ''` / `'current_user'` literal / 寫死 UUID / `spread 寫 DB`
- [ ] **Pre-commit hook**（M）
  - type-check（已有）+ FK 一致性檢查 + smoke E2E 子集
- [ ] **`tests/e2e/audit-trail-insert.spec.ts`**（M、每張目標表 smoke insert）
- [ ] **CI 整合**（M、smoke + login-api + audit-trail-insert）
- [ ] **`eslint-plugin-jsx-a11y`**（S、accessibility 基礎擋）

---

### Phase D — 上線準備 TESTUX 清單

走完整流程、每項打勾：

- [ ] 建員工 / 改權限 / 停用員工（驗 is_active guard）
- [ ] 開團 / 改團 / 鎖團 / 複製團
- [ ] 建訂單 / 加團員 / 改付款狀態
- [ ] 建行程 / 改行程 / 印行程
- [ ] 開請款 / 批次出納 / 確認付款
- [ ] 傳票 / 結轉 / 會計報表
- [ ] 開發票 / 批次發票 / 作廢（測 void 新 signature）
- [ ] 供應商 / 詢價 / 確認單
- [ ] 待辦 / 指派 / 完成
- [ ] 簽證（若租戶啟用）
- [ ] 檔案上傳 / 下載
- [ ] 切換租戶重跑一遍（驗 multi-tenant 隔離）

---

## ✅ William 決策已定（2026-04-20）

| 決策                        | Wave   | 決議                                                                           |
| --------------------------- | ------ | ------------------------------------------------------------------------------ |
| 幽靈欄位 7 個               | 4      | **刪 type**（不補 DB）、code 不再寫                                            |
| CASCADE 策略                | 6      | **全 RESTRICT**（刪 tour 前強制清關聯）                                        |
| tour_leader_id FK 指向      | —      | **不動**（audit 標錯、現狀指 order_members 是對的：領隊先進名單才有保險/機位） |
| tour_leader 權限 scope      | 2      | **依身份自動判斷**：連得到 employees → full scope；純客戶 → self_only          |
| orders 5 人數欄位           | 5      | **合併為 1（SSOT）**、真相來源是 order_members count                           |
| 狀態值中英                  | 8      | **上線前全英統一 + CHECK constraint**                                          |
| 權限系統方向                | 2      | **全站走 hasPermission**、不再 hardcode isAdmin；後台勾權限、code 只問 key     |
| `/hr/roles` 改職務權限      | 2      | 走 hasPermission（走 系統主管 key、不 hardcode）                               |
| archive_empty_tables 184 表 | 1      | **重做盤點**（純讀 code+migration、不動 DB）、分三類：真死 / 未啟用 / 偶爾用   |
| dead_data_cleanup_DRAFT     | —      | **上線前不動** 12144 列 ref_airports_backup                                    |
| create_ref_cities           | B 後期 | **要**、Phase B 後期建（純建新表零風險）                                       |

## 🛑 仍需決策（Post-Launch、不卡現在）

| 決策                                                            | 時機        |
| --------------------------------------------------------------- | ----------- |
| 「記住我」checkbox 刪/30 天/14 天                               | Post-Launch |
| username 欄位重構（employee_number → username）                 | Post-Launch |
| dashboard 偏好存哪（localStorage / DB）                         | Post-Launch |
| `/hr/roles` 預設職務模板                                        | Post-Launch |
| tour_leader 權限細分（加 `compensation_type` 或 `leader_role`） | Post-Launch |

---

## 🏛️ Post-Launch 資料治理（2026-04-21 討論、需獨立專案）

### [POST-CODE] Wave 6 RESTRICT parent 的 child cleanup 全掃

**背景**：2026-04-21 Wave 6 把 189 個 CASCADE FK 改 RESTRICT。原本某些 code 依賴 CASCADE 連帶刪、改 RESTRICT 後必須顯式清 children 才能刪 parent。

已處理（用戶撞到才修）：

- `handleDeleteTour` 漏清 folders / tour_rooms / tour_members 等 16 張配置表（今天補完）
- `deleteTourEmptyOrders` 函式名說「刪空訂單」但 blind delete 所有訂單（今天補 filter）

**還沒掃的 parent**（類似病可能潛伏）：

- orders(id) 子表：member_count / custom_cost_values 等
- quotes(id) 子表
- customers(id) 子表：assigned_itineraries / customization_requests 等
- suppliers(id) 子表：cost_templates / folders / price_list 等
- 所有 Wave 6 Batch 1-9 改的 parent

**要做的**：grep 所有 `.delete().eq('X_id', ...)` 或 `.from('X').delete()`、對照 Wave 6 改的 RESTRICT children、確認該 code 是否有 pre-cleanup。

**優先級**：Post-Launch、用戶撞到才急。不卡上線。

---

### [POST-SCHEMA] payment_requests.payment_method_id 缺 FK

**背景**：2026-04-21 查 CNX260524A-I01 bug 時發現、`payment_requests.payment_method_id` 欄位沒有 FK 約束到 `payment_methods(id)`、理論上可以存任何 UUID、連不存在的 payment_method 也能存。

**風險**：資料一致性、孤兒 id（payment_method 被刪後、request 還指到消失的 id）

**修法**（Post-Launch、純 schema）：

- `ALTER TABLE public.payment_requests ADD CONSTRAINT payment_requests_payment_method_id_fkey FOREIGN KEY (payment_method_id) REFERENCES public.payment_methods(id) ON DELETE SET NULL;`
- 加之前要先清乾淨：查 payment_method_id NOT IN (select id from payment_methods) 的 row、看要 SET NULL 還是其他處理

**為什麼不現在做**：非緊急、Corner 實際資料沒孤兒（剛查過）、等 retention policy 設計一起做

---

### [POST-GOV] 資料 Retention Policy 設計

**背景**：Wave 6 B7 一度把 traveler_profiles 整群改 RESTRICT 想擋「真刪客戶」、但 William 指出這只是把問題擋在門口、不是真解決。真正的做法是：

1. **一致 SSOT**：客戶存不存在用一個 flag（`is_deleted` + `deleted_at`）決定、auth 層和 business 層綁定
2. **明確生命週期**：定義「N 年後自動清除」（法規期限、稅務 7 年、個資法等）
3. **自動清除機制**：cron job 掃 `deleted_at < now() - N years` 的 row 真 DELETE

**現況**：

- customers / payment_requests 等 ERP 表有 `is_deleted / deleted_at` flag（soft-delete）
- auth.users 是 Supabase 原生、沒 soft-delete
- **沒有 retention period、沒有自動清除**、資料永久累積

**要做的**：

- [ ] 盤點需要 retention policy 的表（customer / tour / order / receipt / ...）
- [ ] 諮詢法規：稅務發票 7 年、個資法 ? 年、GDPR 「刪除權」配合
- [ ] 設計 soft-delete → archive → purge 三階段流程
- [ ] 寫 retention cron job + 監控
- [ ] 更新 `docs/DATABASE_DESIGN_STANDARDS.md` 加「資料生命週期」段

**優先級**：Post-Launch、獨立題目。不卡上線、但 6 個月內要處理（個資合規）。

**相關決策**：

- Wave 6 B7 回滾（traveler_profiles 回 CASCADE）交由本題處理
- 未來新 schema 設計都要先問「這筆資料活多久」

---

## 🚫 明確 Out of Scope（Post-Launch）

- [POST] `hotel_1` / `hotel_2` 硬編 → 子表（order_members 107 列大遷移、INV-TBD-01）
- [POST] `gender` vs `sex` 合併（customers 385 列、INV-TBD-02）
- [POST] 全系統硬編中文 → labels 系統（存量太大、INV-U04）
- [POST] `travel-invoice-store` / `payment-store` Zustand → SWR 搬遷（INV-X01）
- [POST] Agent Platform 開發（獨立專案）
- [POST] 語音廣播、會議助理、Amadeus 整合（已排 60 天路線圖）
- [POST] 設計系統完整重構（Blueprint 範圍）

---

_每次 session 結束記得更新勾選狀態。_
_完整 audit 細節見 `/Users/williamchien/Projects/VENTURO_ROUTE_AUDIT/`。_

---

## 🔄 上線後第一週重構

### [SSOT] tour_members 整合進 order_members

**動機**：William 2026-04-22 親口確認「團員必然是訂單成員、tour_members 只是觀看層級不同、應整合才是完整 SSOT」
**現況**：

- tour_members 10 row（Corner 真實資料）、4 欄（room_type / roommate_id / special_requests / dietary_requirements）
- order_members 151 row、47 欄、是 SSOT 主體
- P020 policy bug 已修（2026-04-22）、所以**只剩架構問題、無安全問題**

**做法**（M、半天）：

1. ALTER order_members ADD COLUMN room_type / roommate_id (uuid) / special_requests / dietary_requirements
2. Migrate 10 row：JOIN order_members ON tour_id+customer_id、複製 4 欄值
3. 更新 5 檔 src 改用 order_members：
   - `src/app/public/insurance/[code]/page.tsx`
   - `src/features/tours/components/TourOperationsAddButton.tsx`
   - `src/features/tours/services/tour_dependency.service.ts`
   - `src/features/orders/components/PnrMatchDialog.tsx`
   - `src/features/orders/components/pnr-name-matcher.ts`
4. DROP TABLE tour_members
5. type-check + 對帳（10 row 必須完整 migrate）

**邊界 case**：大團跨訂單同房同車（roommate_id 跨 order）— uuid 不限同訂單、相容
**估時**：M（半天）
**估值**：⚠️ 不急、無安全問題、純架構清晰度

---

## 🟡 上線後待做

### [LOGIN] 「記住我」功能真實實作

**動機**：2026-04-23 盤查發現「記住我」勾選框是**假按鈕**——

- page 收勾選狀態傳給 validateLogin
- validateLogin 函式收進來但內部 0 使用
- Supabase session 預設就會 auto-refresh 30 天、跟勾不勾無關
- 寫「30 天內免重新登入」實質是欺騙用戶

**現狀**：UI 已拔除假按鈕（2026-04-23 commit）、避免欺騙
**未來做**：

- 接 Supabase session expiry 邏輯：勾 = 30 天、不勾 = 短 session（瀏覽器關閉就登出）
- 或考慮整合 OAuth provider 的「保持登入」選項
  **估時**：S（30-60 分鐘）
  **優先級**：低（上線必要功能不缺、是 UX nice-to-have）

---

## 🟡 馬拉松 🟠 第一週清單剩餘 (2026-04-24 完成 8/12)

今天完成 (此 session):

- ✅ #9 Sentry error-tracking wrapper (commit `18f22dc8`)
- ✅ #10 Logger PII redact 生產環境 (commit `06f0e864`)
- ✅ #11 status 編碼統一 (X3、commit `12c607ec`、DB pending)
- ✅ #12 Receipt confirmed 不可逆 trigger (commit `7b23225b`、DB pending)
- ✅ #13 useDraftAutoSave hook (commit `3a9abee8`、各 form 待套)
- ✅ #17 Cron retry + heartbeat (commit `e432b68c`)
- ✅ #18 db-rollback / db-apply-pending scripts (commit `f0a49695`)
- ✅ #19 ContractSignPage XSS sanitize (commit `5e2fb0ab`)
- ✅ #20 DevDatabaseBadge dev mode 警告 (commit `52a46469`)

剩餘 3 條 (規模化才痛、Corner 初期 ROI 低、列 backlog):

### #14 報表全 client 端計算 (3 張: 試算 / 損益 / 資產負債)

**動機**: 月報表全在瀏覽器算 sum / group by、資料量小看不出
**現量**: Corner 21 訂單、月報表算秒級、無感
**何時做**: 訂單破 500 / 月報表載入 > 3 秒、就要做
**做法**: 寫 SQL view + RPC、前端只 SELECT、不算
**估時**: 半天

### #15 /orders 無 server-side 分頁

**動機**: 拿全部訂單到 client 才 filter / sort
**現量**: Corner 21 訂單、全載也才 1 個 SWR call、無感
**現有**: `useOrdersPaginated` (orderEntity.usePaginated) 已存在、是 server-side、只是 page.tsx 沒用
**何時做**: 訂單破 500 / 列表載入 > 2 秒、就改 page 用 useOrdersPaginated
**估時**: 1-2 小時 (改 page UI + pagination component)

### #16 Orders 跨域直 import Tours service

**動機**: Orders 模組直接 import Tours 的 service 函數、跨界耦合
**現況**: 不影響功能、不影響上線
**何時做**: 拆模組成獨立 package / 加 micro-frontend 時才必要
**估時**: 半天 (refactor 抽 service interface)

---

## 🟡 馬拉松 Post-Launch 14 條 (架構級、上線後處理)

詳見 `docs/PRE_LAUNCH_CLEANUP/audit-2026-04-23/marathon/MARATHON-TOTAL.md` 🟡 區塊。
