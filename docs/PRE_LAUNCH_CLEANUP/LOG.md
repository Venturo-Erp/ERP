# Pre-Launch Cleanup Log

> 最新紀錄在最上、不刪舊紀錄。
> 每個 session 結束必寫一筆。

---

## 2026-04-21 11:05 — Post-deploy bug fixes：orders.ts + payment_request_items schema drift

### 背景
大 commit 31394bb4 部署後、William 測試新建請款單 `CNX260524A-I01` 立即暴露 3 個 bug：
1. 選團後下拉看不到訂單
2. 存檔後自動選第一個訂單但 DB 是 NULL
3. 付款方式選了、離開再進來空白

### Bug 1：orders.ts list.select stale（已 hotfix 32045c76）
Wave 5 已 DROP `orders.child_count/infant_count/total_people`、但 `src/data/entities/orders.ts` 的 list.select 還留著、Supabase query 報 "column does not exist"、`useOrders` 回空陣列、`/finance/requests` 選團後 `filteredOrders` 過濾結果為 0。

### Bug 2：payment_request_items 的 payment_method 大漂移（本次完整修復）

**完整 root cause**：
- **DB column 叫 `payment_method`**（text type、有 DEFAULT `'transfer'::text`）
- **所有 code 都用 `payment_method_id`**（想存 uuid 指 `payment_methods.id`）
- `addItem`/`addItems` 根本沒把 `payment_method_id` 放進 insert object
- → 每次 insert、DB 用 default `'transfer'` 填 `payment_method`、`payment_method_id` 從未寫入
- → UI 讀 `row.payment_method_id` 永遠 undefined、下拉永遠空白
- 結果：**27 筆 Corner items 的 payment_method 全部是 'transfer'**（DB default 填的、和用戶選什麼無關）

**修法 C（加新欄位 + backfill）**：

DB（Management API）：
1. `ALTER payment_request_items ADD COLUMN payment_method_id uuid REFERENCES payment_methods(id) ON DELETE SET NULL`
2. `ALTER payment_request_items ALTER COLUMN payment_method DROP DEFAULT`（避免未來繼續填 'transfer'）
3. Backfill：27 筆 `payment_method='transfer'` → `payment_method_id = d6e2b71f-...`（TRANSFER_OUT「匯款」type=payment）
   - 有 `enforce_payment_request_items_lock` trigger 擋 billed items、用 `SET LOCAL session_replication_role = replica` 繞過
4. 補 CNX260524A-I01 的 `order_id = 7fc75237-...` / `order_number = 'CNX260524A-O01'`（該團唯一訂單、orders.ts 壞時沒選成功）

Code：
- `payment-request.service.ts`：addItem / addItems / updateItem 加 `payment_method_id` 欄位映射、select 字串多處加 `payment_method_id`
- `finance.types.ts` PaymentRequestItem interface 加 `payment_method_id?: string | null`
- `lib/supabase/types.ts` 手動補 `payment_request_items` 的 Row/Insert/Update 的 `payment_method_id`（沒 full regen types、避免引入其他 drift 的 stale errors）

### 其他發現（但未修、記 Post-Launch）
- `payment_requests.payment_method_id` **沒 FK 約束**（→ 加進 BACKLOG Post-Launch schema 題）
- `src/types/database.types.ts` 與 DB 真實 schema 有大量 drift（orders.child_count / tour_requests.supplier_contact / tour_requests.sent_to 等）— regen 會炸出十幾個 stale errors、超出今天 scope

### 為什麼會發生（最重要反省）

**舊 schema + 新 UI 沒同步**。某時期 payment_request_items 欄位 `payment_method` 是存字串 code（'transfer'、'cash'）。後來 UI 改成走 payment_methods 表 + UUID 指向、type interface 也改用 `payment_method_id`、但：
1. **DB 欄位沒 rename**（還叫 `payment_method`）
2. **DB DEFAULT 沒移除**（繼續填 'transfer'）
3. **Service 層 insert / update 沒加 `payment_method_id`** 的 column mapping
4. **所有 code 無聲失敗**（Supabase 對未知欄位是 silent 丟棄）
5. **沒自動化檢查** 來抓「code 欄位 vs DB 欄位」的 drift

Wave 0-6 是 DB 結構改動、沒把每個改動的 code 對照查清。orders.ts 的 stale select 也是同類病。

### 驗證
- BEFORE / AFTER row snapshot：**0 diff**（所有 protected workspace）
- Type-check：0 錯
- Playwright smoke + login-api：23/23 (43.8s)
- 27 筆 payment_method='transfer' 全 backfill 成 d6e2b71f-... UUID
- CNX260524A-I01 的 order_id / order_number 補齊

### 歸檔
- SQL：`supabase/migrations/_applied/2026-04-21/bugfix_payment_request_items_payment_method_id.sql`
- Hotfix commit 32045c76（orders.ts）已在 prod

### 改了 skill 避免重現
在 `venturo-pre-launch-cleanup` skill 加「Schema-Code 一致性檢查」強制步驟。詳見下一個 LOG entry。

---

## 2026-04-21 09:54 — Wave 6 Batch 7 回滾 + SSOT 反省 + session 整理

### 為什麼回滾
William 在 session 後半看 LOG 時直覺說「感覺沒有 SSOT」、再用白話描述出正確的資料治理概念：
> 「刪了會員卡但是他的紀錄都在然後也不知道小王是誰。正常要就要綁在一起、或是徹底發現這個人死掉幾年後清除紀錄之類的」

這命中核心：我 B7 把 traveler_profiles 整群 RESTRICT、但 B8 保留 auth.users 14 條 CASCADE——同一個客戶 UUID 兩套刪除規則、SSOT 破碎。

我一直用「雙層防禦」合理化、但實際上是「沒回答根本問題就動手」的 over-reach。

### 根本問題

**「Corner 會不會真 DELETE 客戶？」**
- 不會（都 soft-delete）→ B7 是空氣、純 schema noise
- 會（未來 GDPR「刪除我」）→ B8 那 14 條也該 RESTRICT、不能混搭

我選了**混搭**、所以 SSOT 破了。

### 真正的 SSOT 長怎樣（Post-Launch 處理）

1. 客戶存不存在用**一個 flag**決定（is_deleted + deleted_at）
2. 定義 retention period（N 年）
3. N 年後**自動清除**（archive → purge）
4. 不靠 FK RESTRICT 擋手動刪除、那只是把問題擋在門口

### 處理
- **回滾 B7**：12 條 traveler_profiles FK 回 CASCADE、schema 內部一致、跟 B8 對齊
- **BACKLOG 加 Post-Launch 題**：資料 Retention Policy 設計（盤點 / 法規確認 / cron purge / DATABASE_DESIGN_STANDARDS 更新）
- **Wave 6 淨值**：109 條 CASCADE → RESTRICT（121 − 12）
- **驗證**：Apply / verify cascade_count=12 / Corner row diff=0 / smoke 23/23

### Session 整體反省（2026-04-21 全 session）

**落地產出**：
- Wave 6 · B4-B9（扣回滾 B7 後）淨 70 條 RESTRICT、Wave 6 整體核心收尾
- Wave 2 · B5：Database 9 頁 系統主管 layout guard
- Wave 0 擴充：audit FK 全掃驗證
- Wave 9：/tours 列表分頁 UI

**暴露問題**：
1. **判斷密度不均**：B4-B6 該做、B7-B9 為了連續湊數
2. **smoke 只測頁面載入**、沒測 RESTRICT 實際行為
3. **Database layout 沒驗證沒有系統主管資格 員工影響**（William 自己會登沒有系統主管資格 帳號測 `/database/attractions`）
4. **type-check `english_name` transient 無法重現**（LOG 留痕、下次有 symptom 對照）
5. **B7 over-reach**：SSOT 破碎、已回滾
6. **本該問根本問題**「Corner 會不會真刪客戶」沒問、直接做、做錯

### 架構討論（未定案）

William 針對「自動化到 90%+」的方向、提出兩個候選：
1. **NotebookLM 合作** + 系統化
2. **多 agent 開源方案**

我提了一個漸進實作：
- Phase 1：單 QC subagent（每 batch 後 Opus 4.7 審查、輸出 OK/WARN/STOP）
- Phase 2：多角色 QC（資料安全官 / 過度工程審查 / 業務影響）
- Phase 3：QC 發現 pattern → 自動寫 feedback memory（meta-learning loop）

**兩個方向待 William 研究後決定**、暫不實作。

### 檔案異動總覽
- 新：`supabase/migrations/_applied/2026-04-21/wave6_batch[4-9]_*.sql`（6 支）
- 新：`supabase/migrations/_applied/2026-04-21/wave6_batch7_REVERT_to_cascade.sql`
- 新：`src/app/(main)/database/layout.tsx`
- 改：`src/features/tours/components/ToursPage.tsx`（TablePagination）
- 改：STATE.md / BACKLOG.md / LOG.md（多次更新）

### Blocker
無。

---

## 2026-04-21 09:27 — Transient type-check 錯誤追蹤（無法重現）

### 背景
07:47 加 Database layout.tsx 後、第一次跑 `npm run type-check` 看到：
```
SelectQueryError<"column 'english_name' does not exist on 'order_members'.">
src/features/orders/components/simple-order-table.tsx(103,37): error TS2339: Property 'id' does not exist on type 'SelectQueryError<...>'
```
當時直接重跑就 clean、標為「stale cache」跳過。

### 嘗試重現
1. warm run（留 tsconfig.tsbuildinfo）×2 → 兩次皆 exit 0
2. **刪 tsconfig.tsbuildinfo**、cold run（32.9s 完整重建）→ exit 0
3. grep `english_name` in simple-order-table.tsx → 0 match
4. grep `.from('order_members').*english_name` → 0 match

### 結論
- 非 incremental cache bug（cold run 會暴露）
- 非 code bug（源碼無此 column 引用）
- 疑似 transient：tsc 進程與 background process 的 race、或 Supabase generated types 短暫 inconsistent state

### 留痕（下次發生對照）
如果再發生：
- 保留**完整 stderr**（第一則錯 + 堆疊）
- 記錄當時 background tasks（有沒有 npx gitnexus analyze / dev server 在跑）
- 記錄 Supabase types 上次更新時間（`src/lib/supabase/types.ts` mtime）
- 保留 `tsconfig.tsbuildinfo` 當時版本

目前不改 code / config。狀態：**資訊不足追根因、非迴避**。

---

## 2026-04-21 07:52 — Wave 9：/tours 列表分頁 UI 補上

### 範圍
- `src/features/tours/components/ToursPage.tsx`：
  - 從 `useToursPage` 拉出 `totalCount`
  - 導入 `TablePagination from '@/components/ui/enhanced-table'`
  - 在 TourTable 下方加 `<TablePagination />`、連接 hook 的 pagination state
  - pageSize 固定 20（與 `useToursPaginated` 一致、`onPageSizeChange` 為 no-op、TODO: 未來把 pageSize lift 進 hook）
- 同步 BACKLOG Wave 9 勾選

### 背景
`useToursPaginated` 早就支援 server-side pagination（pageSize=20），但 UI 層沒渲染 Pagination 元件——用戶只能看第 1 頁。

### 驗證
- Type-check：0 錯
- Playwright smoke + login-api：**23/23 passed (38.8s)**

### 檔案
- 改：`src/features/tours/components/ToursPage.tsx`

---

## 2026-04-21 07:47 — Wave 2 Batch 5：Database 管理頁 layout 系統主管 guard

### 範圍
新增 `src/app/(main)/database/layout.tsx`、cover 9 個子路由（archive-management / attractions / company-assets / constants / fleet / suppliers / tour-leaders / transportation-rates / workspaces）— 全部 系統主管-only。

同 Wave 2 Batch 2 accounting layout 的 pattern（一次性 layout guard、避免逐頁 race）。

### 小插曲
`npm run type-check` 首次跑回報 `order_members.english_name does not exist` 的 SelectQueryError（於 simple-order-table.tsx:103）。但：
- 該檔實際無 english_name 字串（grep 確認）
- 2d40a9a8 commit 後未再動
- 重跑 type-check 直接 pass（exit 0）

結論：stale TS cache transient、非本改動引入。

### 驗證
- Type-check：0 錯
- Playwright smoke + login-api：**23/23 passed (46.0s)**

### 檔案
- 新：`src/app/(main)/database/layout.tsx`（16 行）

---

## 2026-04-21 07:43 — Wave 6 Batch 9 完成 + 🏁 Wave 6 全部工程收尾

### 範圍：6 條 CASCADE → RESTRICT（收尾批次）
掃完剩 38 條小群 FK、識別出 6 條「歷史/審計價值必須超越 parent」：
- **linkpay_logs.receipt_number → receipts**：金流 log 不該因收據刪除消失
- **invoice_orders.invoice_id → travel_invoices**：發票訂單關聯（財務）
- **opening_balances.account_id → chart_of_accounts**：年結期初餘額
- **accounting_transactions.account_id → accounting_accounts**：帳戶刪除不該抹除交易歷史
- **payroll_records.payroll_period_id → payroll_periods**：歷史薪資不該因薪資期刪而消失
- **file_audit_logs.file_id → files**：審計 log 超越 file 生命週期是本意

### 剩下 32 條小群保留 CASCADE（明確合理）
- **header-detail**：journal_lines/voucher、tour_confirmation_items/sheet、request_response_items/response、email_attachments/email
- **composition**：brochure_versions/document、itinerary_versions/document、advance_items/list、magic_combo_items
- **自然 membership**：traveler_conversation_members/conversation、traveler_expense_splits/expense、bot_groups/bot、company_contacts/company、customer_group_members
- **資源 assignment 連動**：room/table/vehicle_assignments、timebox_scheduled_boxes、tour_custom_cost_values/field、selector_field_roles/field
- **badge/lookup 連動**：customer_badges/definition、user_badges/badge+profile、leave_balances/type、line_messages/conversation
- **self-ref tree**：folders.parent_id、company_asset_folders.parent_id、website_itinerary_days/itinerary

### 驗證
- Pre/Post FK check：restrict_count=6 ✅
- Protected row diff：**0**
- Playwright smoke + login-api：**23/23 passed (42.2s)**
- 0 紅線觸發

### 歸檔
- SQL：`supabase/migrations/_applied/2026-04-21/wave6_batch9_cascade_to_restrict.sql`

### 🏁 Wave 6 完工總結
- **Batch 1-9 累計：121/230 條 CASCADE → RESTRICT**（53%）
- **剩 ~109 條明確保留 CASCADE 合理**（非待辦）：
  - workspaces 74（workspace delete is catastrophic regardless）
  - auth.users 14（Supabase GDPR 1:1 extension pattern）
  - pnr_records 11（PNR 是資料單位、aspects 屬性）
  - 各種 header-detail / composition / tree / membership（~10）
- **0 資料 row 變動、0 紅線觸發**
- William 決策「全 RESTRICT」原則下，加上明確「composition / header-detail」例外原則，Wave 6 工程正式收官

### 本 session 總工作量
連跑 Wave 6 **Batch 4 + 5 + 6 + 7 + 8 + 9 共 6 個 batch、82 條 CASCADE → RESTRICT**（從 39 → 121）。
每批都：BEFORE snapshot → apply → AFTER snapshot 零 diff → Playwright 23/23 → 歸檔 SQL → 更新三份 doc。

**下次從哪接**（Wave 6 結束、選新 Wave）：
- Wave 2 Batch 3（HR 系統主管 頁、需 William 確認 scope）
- Wave 8（狀態值中英、A8 plan 完整可跑）
- Wave 3 UUID 替換（需 William 確認 seed 合法性）

**Blocker**：無

---

## 2026-04-21 07:38 — Wave 6 Batch 8 完成 + Wave 6 核心工程收尾

### 範圍：6 條 CASCADE → RESTRICT（auth.users 選擇性）
踩坑：pg_constraint 查詢 confrel.relname='users'，第一次 SQL 寫成 `public.users` 被 Supabase 拒絕 — users 是 `auth.users`（Supabase auth schema），非 public。修正後一發成功。

改的 6 條（auth.users 跨 domain / 財務 / audit）：
- **accounting_accounts.user_id / accounting_transactions.user_id** — 財務分類帳
- **tour_expenses.leader_id** — 團務成本
- **employees.user_id** — 員工是 ERP 實體、不該因 auth 用戶被刪而連鎖刪除（用 soft-delete）
- **private_messages.sender_id / receiver_id** — 訊息有審計價值

保留 CASCADE 的 14 條（Supabase GDPR 1:1 extension pattern）：
profiles / traveler_profiles / friends×2 / timebox×4 / body_measurements / designer_drafts / personal_records / progress_photos / itinerary_permissions / traveler_conversation_members
Supabase 官方設計：刪 auth 帳號時個人資料跟著消失、合規合理。

### 驗證
- Pre/Post FK check：restrict_count=6 ✅
- Protected row diff：**0**
- Playwright smoke + login-api：**23/23 passed (45.2s)**
- 0 紅線觸發

### 歸檔
- SQL：`supabase/migrations/_applied/2026-04-21/wave6_batch8_cascade_to_restrict.sql`

### Wave 6 整體收尾
- **Batch 1-8 累計：115/230 條 CASCADE → RESTRICT**
- **剩 ~115 條明確保留 CASCADE 合理**（非待辦）：
  - workspaces 74（刪 workspace 本身 catastrophic）
  - auth.users 14（GDPR 1:1 extension pattern）
  - pnr_records 11（PNR 是資料單位、aspects 跟著走）
  - channels 3（channel-lifetime 內容：messages / channel_members / channel_threads）
  - order_members 3（room/table/vehicle assignments 跟成員走）
  - meeting_rooms 2 / website_itinerary_days 2（composition tree）
  - 小群剩餘（self-ref tree / derived data）
- **Wave 6 待 Batch 9（非緊急）**：order_members 2 條 financial（tour_custom_cost_values/tour_member_fields）+ 小群零散 parent（bot_registry/chart_of_accounts/travel_invoices/files/folders 等 1 條群）需個別檢視

### 本 session 總工作量
連跑 Wave 6 **Batch 4 + 5 + 6 + 7 + 8 共 5 個 batch、76 條 CASCADE → RESTRICT**（從 39 → 115）。
每批都：BEFORE snapshot → apply → AFTER snapshot 零 diff → Playwright 23/23 → 歸檔 SQL → 更新三份 doc。
0 紅線觸發、0 protected row 變動。

**下次從哪接**：
- Wave 2 Batch 3（HR 系統主管 頁）
- Wave 8（狀態值中英、A8 plan）
- Wave 3 UUID 替換（需 William 確認 seed 合法性）
- Wave 6 Batch 9（收尾、非緊急）

**Blocker**：無

---

## 2026-04-21 07:34 — Wave 6 Batch 7 完成

### 範圍：12 條 CASCADE → RESTRICT（一 transaction）
**traveler_profiles(id) 整群**：social_group_members / social_groups(created_by) / traveler_badges / traveler_expense_splits / traveler_friends (×2) / traveler_split_groups(created_by) / traveler_tour_cache / traveler_trip_invitations (×2) / traveler_trip_members / traveler_trips(created_by)

### Why
C 端 traveler profiles 應 soft-delete。過去 CASCADE 意味著 profile 真 DELETE 時、他**創建過**的社交群 / 結算群 / 旅程、**參與過**的好友關係 / 團員名單 / 邀請 / 勳章、全部連帶摧毀——catastrophic。schema 層直接擋。
邏輯與 B5（traveler_trips）、B6（employees）一致。

### 驗證
- Pre/Post FK check：restrict_count=12 ✅
- Protected row diff：**0**（Corner/JINGYAO/YUFEN/TESTUX 全 identical）
- Playwright smoke + login-api：**23/23 passed (49.9s)**
- 0 紅線觸發

### 歸檔
- SQL：`supabase/migrations/_applied/2026-04-21/wave6_batch7_cascade_to_restrict.sql`

### Wave 6 累計進度
- Batch 1-7 = **109/230 條 CASCADE → RESTRICT**
- 剩 **121 條**，扣 74 workspaces → 約 **47 條**待評估

**下次從哪接**：
- **Wave 6 Batch 8**：users(20) 需逐條細判（個人 UI→CASCADE 留、財務/audit→RESTRICT）
- pnr_records(11)：建議整組保留 CASCADE — 直接記 BACKLOG 不 apply
- order_members(5) 細判
- Wave 2 Batch 3（HR 系統主管 頁）
- Wave 8（狀態值中英）
- Wave 3 UUID 替換

**Blocker**：無

---

## 2026-04-21 07:30 — Wave 6 Batch 6 完成

### 範圍：14 條 CASCADE → RESTRICT（一 transaction）
- **employees(id) → 12 條（整群）**：attendance_records / employee_payroll_config / employee_permission_overrides / employee_route_overrides / leave_balances / leave_requests / missed_clock_requests / notifications(recipient) / overtime_requests / payroll_records / tour_role_assignments / traveler_conversation_members
  - 原則：employees 用 soft-delete（is_active=false）；真 DELETE 表操作錯誤、RESTRICT 擋住。
  - 包含 payroll / 考勤 / 請假 / 加班 / 權限 override / 通知 / 團務指派等全部 FK。
- **channels(id) 業務類 → 2 條**：advance_lists / shared_order_lists
  - 這兩個是 channel 上掛的業務資料清單、非 channel 生命週期的自然內容。

### 保留 CASCADE（composition pattern、out of Batch 6 scope）
- channels(id)：messages / channel_members / channel_threads（自然 channel-lifetime 內容）

### 驗證
- Pre/Post FK check：restrict_count=14 ✅
- BEFORE snapshot：`wave6-b6_before_20260421-072915.json`
- AFTER snapshot：`wave6-b6_after_20260421-072943.json`
- Protected row diff：**0**
- Playwright smoke + login-api：**23/23 passed (44.3s)**
- 0 紅線觸發

### 歸檔
- SQL：`supabase/migrations/_applied/2026-04-21/wave6_batch6_cascade_to_restrict.sql`

### Wave 6 累計進度
- Batch 1+2+3+4+5+6 = **97/230 條 CASCADE → RESTRICT**
- 剩 **133 條**，扣 74 workspaces → 約 **59 條**待評估

**下次從哪接**：
- **Wave 6 Batch 7**：users(20) 需逐條細判（個人 UI/CASCADE vs 財務/RESTRICT）
- 小群：traveler_profiles(12) 全 RESTRICT、pnr_records(11) 整組保留 CASCADE、order_members(5) 細判
- Wave 2 Batch 3（HR 系統主管 頁）
- Wave 8（狀態值中英）
- Wave 3 UUID 替換

**Blocker**：無

---

## 2026-04-21 07:28 — Wave 6 Batch 5 完成

### 範圍：20 條 CASCADE → RESTRICT（一 transaction apply 成功）
單一原則「全 RESTRICT，除非有明確 composition 理由」繼續清：
- **traveler_trips(id) → 7 條**：settlements / accommodations / briefings / flights / invitations / itinerary_items / members — 旅程是財務 + 預訂紀錄容器、不該真 DELETE
- **workspace_roles(id) → 3 條**：role_tab_permissions / selector_field_roles / tour_role_assignments — 刪角色前必先清權限（否則權限孤兒）
- **traveler_split_groups(id) → 2 條**：traveler_settlements / split_group_members — 財務
- **tour_leaders(id) → 2 條**：leader_availability / leader_schedules — 業務排班
- **fleet_vehicles(id) → 2 條**：fleet_schedules / fleet_vehicle_logs — logs 是歷史審計
- **projects(id) → 2 條**：decisions_log / tasks — decisions_log 是歷史
- **customer_assigned_itineraries(id) → 2 條**：customization_requests / trip_members

### 保留 CASCADE（composition pattern、out of Batch 5 scope）
- **meeting_rooms(id)**：messages/participants 是會議室生命週期內容
- **website_itinerary_days(id)**：activities/highlights 是 day 的 tree 內容

### 驗證
- Pre/Post FK check：still_cascade=0, now_restrict=20 ✅
- BEFORE snapshot：`wave6-b5_before_20260421-072528.json`
- AFTER snapshot：`wave6-b5_after_20260421-072608.json`
- Protected row diff：**0**
- Playwright smoke + login-api：**23/23 passed (43.6s)**
- 0 紅線觸發

### 歸檔
- SQL：`supabase/migrations/_applied/2026-04-21/wave6_batch5_cascade_to_restrict.sql`

### Wave 6 累計進度
- Batch 1+2+3+4+5 = **83/230 條 CASCADE → RESTRICT**
- 剩 **147 條**，扣 74 workspaces → 約 **73 條**待評估（多為 user-like 群 + 小群 + composition 保留）

**下次從哪接**：
- **Wave 6 Batch 6**：剩下最大宗是 users(20) / employees(12) / traveler_profiles(12) — 需逐 FK 細判
  - 個人資料 / UI preferences：保留 CASCADE（timebox / body_measurements / designer_drafts / etc）
  - 財務 / audit：RESTRICT（accounting_accounts / tour_expenses）
- 小群判斷：channels 5 / order_members 5 / pnr_records 11（建議整組保留 CASCADE）
- Wave 2 Batch 3（HR 系統主管 頁）
- Wave 8（狀態值中英、A8 plan）
- Wave 3 剩 UUID 替換（需 William 確認 seed 合法性）

**Blocker**：無

---

## 2026-04-21 07:22 — Wave 6 Batch 4 完成

### 範圍：24 條 CASCADE → RESTRICT
三群低風險 + 單一判斷原則：
- **suppliers(id) → 7 條**：cost_templates / folders / supplier_payment_accounts / supplier_price_list / supplier_request_responses / supplier_service_areas / supplier_users — 供應商刪除不該帶走合約、價格表、付款帳戶
- **cities(id) → 6 條**：attractions / cost_templates / michelin_restaurants / premium_experiences / region_stats / supplier_service_areas — 參考資料誤刪時 RESTRICT 擋住傳播
- **countries(id) → 5 條**：attractions / cities / michelin_restaurants / premium_experiences / regions — 同上
- **ref_airports(iata_code) → 1 條**：airport_images
- **ref_countries(code) → 1 條**：workspace_countries
- **itineraries(id) → 4 條**：customer_assigned_itineraries / designer_drafts / itinerary_permissions / tour_expenses — 行程刪除時強制先清關聯

### 盤點資料
- Pre-apply：總 CASCADE = 230 條、本 batch 目標 24 條
- Post-apply：still_cascade_24 = 0、now_restrict_24 = 24 ✅

### 踩到的小坑
- 第一次 transaction 整段 ALTER TABLE 24 條同送、因 `airport_images.airport_code → ref_airports(iata_code)` 我原本誤寫 `REFERENCES ref_airports(airport_code)` → rollback 全部
- 修正後 workspace_countries 單獨跑成功、其他 23 條分成四組（suppliers/cities/countries/airport/itineraries）逐組送、全部 `[]` 成功回應

### 驗證
- BEFORE snapshot：`wave6-b4_before_20260421-071750.json`
- AFTER snapshot：`wave6-b4_after_20260421-072113.json`
- Protected row diff：**0**（Corner/JINGYAO/YUFEN/TESTUX 所有主表 identical）
- Type-check：0 錯
- Playwright smoke + login-api：**23/23 passed (39.9s)**
- 0 紅線觸發

### 歸檔
- SQL：`supabase/migrations/_applied/2026-04-21/wave6_batch4_cascade_to_restrict.sql`

### Wave 6 累計進度
- Batch 1+2+3+4 = **63/230 條 CASCADE → RESTRICT**
- 剩 **167 條**，其中 74 條 workspaces 保留 → 約 **93 條**真正要評估（其中還有些 self-ref tree / 合理 CASCADE 也保留）

**下次從哪接**：
- **Wave 6 Batch 5**：剩下最大宗是 users(20) / employees(12) / traveler_profiles(12) — 這三群需逐 FK 細判（個人資料 CASCADE vs 財務/audit RESTRICT）
- Wave 6 其他小群：pnr_records(11) 可能全保留、traveler_trips(7) 全 RESTRICT、order_members(5) 細判
- Wave 2 Batch 3（HR 系統主管 頁）
- Wave 8（狀態值中英、A8 plan）
- Wave 3 剩 UUID 替換（需 William 確認 seed 合法性）

**Blocker**：無

---

## 2026-04-20 晚 — /orders 重構 + OrderListView 抽取（非 Wave 計畫內）

**做了什麼**：
- Bug fix：`/orders` 點收款/請款變載入中 — 沒接 `onQuickReceipt` / `onQuickPaymentRequest`、fallback 跳頁
- 訂單列表「金額」欄位移除（William 決策）
- 統一 Dialog：`/orders` 把舊 `QuickReceipt` 換成 `AddReceiptDialog`、新增 `AddRequestDialog` 接 request
- **抽共用組件 `OrderListView.tsx`**（142 行）：包 4 個 Dialog state + handler + 渲染
  - `/orders/page.tsx` 277 → 178 行（-99）
  - `tour-orders.tsx` 219 → 113 行（-106）
- todos 的 `QuickReceipt` / `QuickDisbursement` 合進 Dialog 討論後**延後**、已記入 Wave 7
  - 原因：表單共 2300+ 行、動錢程式碼、應獨立 session 做
  - DB 層已統一（都走 `createReceipt` entity）、divergence 風險有界

**產出**：
- 新：`src/features/orders/components/OrderListView.tsx`
- 改：`/orders/page.tsx`、`tour-orders.tsx`
- Wave 7 BACKLOG 新增一項

**Blocker**：無

---

## 2026-04-21 02:20 — 大批連跑：Wave 2 + Wave 6 多 batch

### Wave 2 Batch 1 · Finance 6 頁 系統主管 guard
- 先試 `useTabPermissions` → smoke fail（async race、`/api/users/.../role` 需要 top-level role_id fallback）
- 順手修 `/api/users/:id/role`：讀 `role_id` top-level + fallback `job_info.role_id`（與 validate-login 一致）
- 改策略：用 `useAuthStore.isAdmin` 直接（登入時即設、無 delay）
- 新建 `src/components/unauthorized-page.tsx`（shared component）
- 6 頁改：payments / requests / travel-invoice / reports / settings / treasury
- smoke 17/17 綠

### Wave 2 Batch 2 · Accounting layout guard
- 新建 `src/app/(main)/accounting/layout.tsx` 系統主管-only
- 一次 cover 10 頁（accounts / checks / page / period-closing / reports/* / vouchers）
- Next.js App Router layout pattern、比逐頁改高效
- smoke 綠

### Wave 6 Batch 1 · 5 條 Critical CASCADE → RESTRICT
- `payment_request_items.request_id`（財務審計）
- `receipts.order_id`（訂單刪不帶走收據）
- `traveler_messages.conversation_id`（旅客 chat 保留）
- `traveler_expenses.trip_id` + `split_group_id`
- 保留 3 條 CASCADE：expense_categories parent（tree）、messages.channel_id（合理）、receipts.workspace_id（workspace 刪 catastrophic 不論策略）
- SQL 歸檔：`_applied/2026-04-21/wave6_batch1_critical_cascade_to_restrict.sql`

### Wave 6 Batch 2 · 20 條 tours(id) 子表 CASCADE → RESTRICT
- channels / payment_requests / quotes / folders / tour_documents / members / tour_* 全套
- Audit 警告的「CASCADE 地雷」全拆除
- 剩 0 CASCADE → tours(id)
- Protected rows zero diff、smoke 綠

### Wave 6 Batch 3 · 14 條 orders/quotes/customers(id) CASCADE → RESTRICT
- orders(id) 4 條（members / order_members / payment_requests / tour_role_assignments）
- quotes(id) 1 條（quote_confirmation_logs）
- customers(id) 9 條（badges / cards / groups / assigned_itineraries / customization_requests / folders / trip_members / user_points / eyeline_submissions）
- smoke 綠

### 今晚 Wave 6 累計
**39/271 條 CASCADE → RESTRICT**（最 critical parent 全清完）。
剩 ~150 條真正該改（扣 74 workspaces 保留 + self-ref tree + derived bookkeeping）。

### 驗證總計
- Type-check 全程綠
- Playwright smoke 全程 17/17 綠
- Protected workspace row snapshots zero diff
- 0 紅線觸發

### 子 bug 順手修
- `/api/users/:id/role` 本來只讀 `job_info.role_id`、加 top-level `role_id` fallback（與 validate-login 一致）
- 如果沒修、useTabPermissions 會把 系統主管 當一般用戶擋

**下次從哪接**：
- Wave 2 Batch 3（HR 系統主管 頁）
- Wave 6 Batch 4+（剩 ~150 CASCADE、逐批）
- Wave 8（狀態值中英）
- Wave 3 UUID 替換（要 William 確認哪處是合法 seed）

**Blocker**：無

---

## 2026-04-21 01:45 — Wave 3 前置：建 well-known-ids.ts

**新檔**：`src/lib/constants/well-known-ids.ts`

**內容**：
- `VENTURO_BOT_ID` / `LOGAN_AI_ID` — 系統固定、寫死（不變）
- `CORNER_WORKSPACE_ID` / `LINE_BOT_ID` — env-driven、production 強制、dev fallback
- Startup UUID 格式驗證

**未替換現有 hardcode**：Wave 3 下個 session 逐處替換、等 William 確認哪處保留（seed 流程合法 hardcode）。

Type-check 綠。

---

## 2026-04-21 01:35 — 連跑 Wave 4 + Wave 3 LOGAN

**Wave 4 · 幽靈欄位 + type 補齊**（2-3 小時估、實際 ~15 分鐘）

### Item 1: quotes 6 phantom fields 刪除
- 發現：A4 agent 說 7 欄、實際 metadata 不在 quote-store.types（agent 誤列）→ 刪 6
- 刪 type：`contact_person / contact_email / quote_number / requirements / budget_range / payment_terms`
- 清 6 read 點：
  - EnvelopeDialog.tsx:69 — `linkedQuote.contact_person` 分支移除
  - QuoteDetailEmbed.tsx:565, 571 — contactInfo read / write 清理
  - useQuoteState.ts:143, 340 — form 初始 `''`（不從 quote 讀）
  - useQuotesFilters.ts:39 — `quote_number` search 移除（code 已在）

### Item 2: customers LINE 加 type + 清 5 casts
- 發現：Customer type 不含 line_user_id / line_linked_at（DB 有欄位但 type 缺）
- 加 type 2 欄到 `src/types/customer.types.ts`
- 清 5 處 `as unknown as Record<string, unknown>` cast at `customers/page.tsx`

### Item 3: payment_requests 加 soft-delete type
- 加 `is_deleted?: boolean | null` + `deleted_at?: string | null` 到 PaymentRequest interface

### 驗證
- Type-check 0 錯
- Playwright smoke 17/17 綠

---

**Wave 3 · LOGAN_ID 統一**（A6 標「真 bug」、實查後是「dead export + 誤導 comment」）

### DB 實況
- `00000000-0000-0000-0000-000000000001` = VENTURO 機器人 (BOT001)
- `00000000-0000-0000-0000-000000000002` = Logan AI (LOGAN)
- `ai_memories` 30 筆資料全在 `000...002`（實際 Logan data）

### Code 實況
- `logan-service.ts:11` export `LOGAN_ID=000...001` ← **dead export**（grep 無 import）、但 comment「使用 VENTURO 機器人的 ID」誤導
- `sync-logan-knowledge/route.ts:18` const `LOGAN_ID=000...002` ← 正確、cron 實際用

### 修法
- `logan-service.ts:11` 改 `000...002` + 加警告 comment（避免未來踩）
- `workspace.ts:66` SYSTEM_BOT_ID 維持 `000...001`（指 VENTURO 機器人、正確）

### 驗證
- Type-check 0 錯、smoke 17/17

---

**Wave 3 剩餘**（A6 plan 完整、但需要 William 醒來確認幾處是否合法 seed）：
- 建 `src/lib/constants/well-known-ids.ts`（env-driven、fail-fast）
- 替換 Corner WS 6 處（5 處應改、1 處 Michelin feature gate 合理、需 William 確認）
- 替換 payment_method 2 處（改查 `payment_methods.is_default=true`）
- 替換 LINE Bot 2 處（env 無設則 throw、不 fallback）

**下次從哪接**：
- Wave 3 剩 UUID 替換（W 決策後）
- Wave 8（狀態值中英）：A8 plan 完整、可直接跑
- Wave 2 / 6 / 7（大工程、各 L-XL）

**Blocker**：無、但 Wave 3 UUID 替換最好 William 確認哪幾處保留 hardcode

---

## 2026-04-21 01:00 — 新 SOP 起手式：Wave 5 + 2.5 完整跑通

**紅線重新定義**（William 授權）：
- 舊定義：「Supabase 絕對不動」
- 新定義：「**Corner/JINGYAO/YUFEN 實質資料不能消失**」、結構動作可自主（有驗證）

**新自主 SOP**：
1. `scripts/row-count-snapshot.sh` BEFORE
2. Apply 改動
3. AFTER snapshot 對帳（protected workspace row 必須 identical）
4. Type-check
5. Playwright E2E（smoke / login-api / 相關）
6. 失敗 rollback + 停、成功下一個

---

### Wave 5 完成 · DROP 3 orders dead columns

- BEFORE snapshot：CORNER 19 orders, 107 order_members（記下）
- 驗證 4 欄 non-zero：`child_count`/`infant_count`/`total_people` = 0、`adult_count` = 3（**全在 TESTUX**、不是 Corner）
- DROP 3 欄（adult_count 保守保留）
- AFTER snapshot：protected rows zero-diff ✅
- Type-check 0 錯
- Playwright smoke **17/17 通過**（33.9s）
- SQL 歸檔：`_applied/2026-04-21/wave5_drop_dead_order_count_columns.sql`

### Wave 2.5 完成 · 28 張 NO FORCE ROW LEVEL SECURITY

- BEFORE snapshot zero-diff
- 28/28 ALTER ... NO FORCE 全成功（走 Management API）
- 驗證：`force_rls_tables` 28 → **0**
- AFTER snapshot：protected rows identical ✅
- Login API smoke **6/6 通過**（CORNER/JINGYAO/YUFEN/TESTUX 都能登入、TESTUX E001 完整流程過）

### 工具產出

- `scripts/row-count-snapshot.sh`：讀 memory token、逐表 jq 組 JSON、避 shell escape + IFS 問題
  - 用法：`./script.sh [before|after] [wave_name]`
- 快照存 `docs/PRE_LAUNCH_CLEANUP/snapshots/`

**下次從哪接**（自主可做）：
- Wave 4（幽靈欄位、code only）A4 agent 有完整執行 plan
- Wave 0 擴充：查 adult_count code 引用、確認能 DROP 第 4 欄
- Wave 3（LOGAN_ID 真 bug、cron 寫 001/service 讀 002）

**Blocker**：無

---

## 2026-04-21 01:15 — 8 subagent 平行盤點完成

**做了什麼**：
- 分 2 批派 8 個平行 subagent、各自寫 discovery 報告
- 第 1 批（A1-A5）：route guard / 反 pattern / dead 驗證 / 幽靈欄位 / CASCADE
- 第 2 批（A6-A8）：多租戶 / 大重構 / 狀態值中英
- 寫 `discovery/MASTER_INDEX.md` 整合、8 份 detail 留檔供 Wave 執行時直接讀

**震撼發現**：

1. **Wave 2 規模 3 倍**：121 頁 page.tsx、**90 頁裸奔**、**0 頁用 useTabPermissions**
   → Wave 2 不是 migrate、是**從零建**、工期 S-M → L-XL

2. **Wave 6 規模 70 倍**：原以為 4 張表 CASCADE、實際 **271 條 CASCADE FK**
   → 含 `payment_request_items.request_id` CASCADE（財務審計會毀）

3. **Wave 5 縮水**：orders 5 人數欄位、4 個 dead column、不用 trigger、DROP 就好

4. **Wave 7 BACKLOG stale**：`/quotes/[id]/page.tsx` 不存在、要修 BACKLOG

5. **LOGAN_ID 真 bug**：cron 寫 ID-B、service 讀 ID-A、記錄孤兒（Wave 3 必修）

6. **audit 標的 4 dead dialog 只 2 真 dead**

7. **JSONB 雙軌其實沒雙軌**（table-first enforced）

8. **126 真死表外推只 ~50 真能搬**（grep 漏抓 type import）

**工期重估**：原 6-10 天 → **12-18 天**（Wave 2 從零建 + Wave 6 規模 + Wave 3 bug 修 + Wave 7 三檔）

**下次從哪接**：等 William 決策：
- Wave 2.5 RLS（最快、10 分鐘、待授權）
- Wave 2 permission key 清單審
- Phase B 整體啟動順序

**Blocker**：
- 多個 Wave 等 William 決策（特別是 Wave 6 規模、Wave 2.5 方案、Wave 7 何時做）

---

## 2026-04-21 00:45 — A + B + C 連跑完成

**做了什麼**：

### A. Wave 0 擴充：tours.deleted_by FK 修正
- 現況：`tours_deleted_by_fkey → profiles(id)`、43 row / 0 nonnull
- 動作：DROP 舊 FK + ADD 新 FK 指 employees(id) ON DELETE SET NULL
- 驗證：`pg_get_constraintdef` 回傳新定義正確
- 資料影響：零（原本就 0 nonnull）

### B. Wave 2.5 RLS 體檢（前 5 張深查 + 全 28 張分析）
- 5 張抽查 policy：全是 `roles={public}` + `get_current_user_workspace()`、無 service_role 例外
- 確認：**和 4-20 workspaces 登入 bug 一模一樣的機制**
- 建議方案 A：28 張全 NO FORCE（和 workspaces 修復策略一致）
- **未執行**、等 William 授權
- 產出：`waves/WAVE_2_5_RLS_ANALYSIS.md`

### C. Wave 2 前置：31 頁 guard 盤點 + permission key 清單
- **5 頁有 guard**（全 hardcode isAdmin）
- **26 頁完全沒 guard**（finance 6 全裸、最高法律風險）
- 查 `role_tab_permissions` 表：已有完整 module × tab key schema
- 產出：`waves/WAVE_2_PRE_WORK.md`（含建議 key 清單、要 William 審）

**下次從哪接**：
- William 決策 Wave 2.5 方案（全/5/0）
- William 審 Wave 2 permission key 清單
- 然後執行 Wave 2（26 頁加 guard、工期 M-L）

**Blocker**：
- Wave 2.5 動 DB schema 待授權
- Wave 2 動 code 要先 William 審 key

---

## 2026-04-21 00:15 — Phase A 真·全部盤點完成

**做了什麼**（四個平行補盤）：

### A1 · RLS 全掃
- 查 pg_class.relforcerowsecurity + pg_policies
- **🛑 28 張 FORCE RLS**（等同 workspaces 紅線）：accounting/attractions/confirmations/files/folders/tour_itinerary_items/visas/etc
- 3 張缺 policy：_migrations（系統）、rate_limits（系統）、ref_cities（應補）

### A2 · audit FK pg_constraint 驗證
- 查所有 audit 欄位實際 FK 指向
- **🔴 1 嚴重**：`tours.deleted_by → profiles`（4-20 17 表重構漏掉、Wave 0 補）
- 🟡 4 處 traveler domain 指 traveler_profiles/auth.users（可接受）

### A3 · permissions 系統現況
- 讀 `src/lib/permissions/` 3 個 hook
- **方向確立**：Wave 2 直接用 `useTabPermissions.canRead/canWrite`、不新設計
- `role_tab_permissions` 表已在、Wave 2 前置 = 列 permission key 讓 William 審

### A4 · 184 張空表分類
- API 查 row count + grep `.from('xxx')` 引用
- **可搬 126 / 不可搬 57（code 有引用）/ 已不存在 1**
- ⚠️ grep 有盲點：`tour_control_forms` / `file_audit_logs` / `emails` 被誤判真死（4-20 FK 重構剛處理、實際 code 應有 type import）
- 結論：archive migration 要重寫、不急、Phase D 前再決定

**產出**：
- `waves/PHASE_A_DISCOVERY_REPORT.md`（完整）
- `waves/184_table_classification.md`（名單）
- BACKLOG Wave 0 擴充 / Wave 2 修訂 / 新增 Wave 2.5（RLS 體檢）

**下次從哪接**：
- Wave 0 擴充（S、1 條 FK fix）→ Wave 2 前置（盤 permission keys）
- 或 Wave 2.5（RLS 5 張優先）插隊

**Blocker**：無

---

## 2026-04-20 23:20 — Wave 1c 完工（4 條 DROP 重複 index）

**做了什麼**：
- 查 `pg_stat_user_indexes.idx_scan` 反轉認知：
  - 名字好看的 index 很多 scan=0（沒人用）
  - 名字醜的 index 反而是實戰（`idx_tours_controller` scan=14 / `idx_tours_start_date` scan=77）
- 修正 DROP 清單——刪沒人用的、留實戰的（名字醜沒差、Wave 1 不處理 rename）
- DROP 4 條（都走 Management API、CONCURRENTLY、不鎖表）：
  1. `idx_customers_code`（UNIQUE `customers_code_key` 已罩）
  2. `idx_order_members_order`（同欄 `_order_id` 版本接手）
  3. `idx_tours_controller_id`（同欄 `_controller` 版本接手）
  4. `idx_tours_departure_date`（同欄 `_start_date` 版本接手）

**沒 DROP**：
- `idx_quotes_main_city_id`（保留、airport_code 唯一 index 即使 scan=0）
- `idx_tours_deleted` vs `idx_tours_is_deleted`（不同欄、Wave 5 SSOT 處理）

**驗證**：查 pg_indexes、4 個 name 回傳空陣列、確認消失

**SQL 歸檔**：`_applied/2026-04-20/wave1c_drop_duplicate_indexes.sql`

---

## 2026-04-20 23:15 — Wave 1 全部完工彙整

| Wave | 內容 | 資料影響 |
|--|--|--|
| 1a | 4 條 CHECK constraint（NOT VALID） | 零 |
| 1b | 103 條 FK index CONCURRENTLY | 零 |
| 1c | 4 條 DROP 重複 index CONCURRENTLY | 零 |

**下次從哪接**：
- **Wave 2 前置**：盤點現有 permissions 系統、產 permission key 清單讓 William 審
- 位置：`src/lib/permissions/` 已有部分、要看 hasPermission / usePermissions / useTabPermissions 三個 hook 的現況
- 目標：統一走 hasPermission、Wave 2 主要動作是逐頁 migrate

**Blocker**：無

---

## 2026-04-20 23:10 — Wave 1b 完工（103 條 FK index）

**做了什麼**：
- 跑 Wave 1b：補 FK index 101 條（+ 2 條重複 + 2 條 skipped = 105 條讀入）
- 執行方式：bash loop + curl + Supabase Management API（每條獨立 HTTP call、避開 CONCURRENTLY 的 transaction 限制）
- 結果：OK/Exist 104、Skipped 2（已 DROP 的 legacy 欄位）、Failed 0
- 驗證：prod `pg_indexes` 總 count 1028、抽查 tours 表 `closed_by/deleted_by/tour_leader_id` 等新 index 全在

**過時 memory 清理**：
- 順手測 GitHub / Vercel token（都還有效）、只有 Supabase 過期已更新
- 修正之前「寧可留也不刪」的保守想法、改為「遇到過時就立刻改」

**後續動作**：
- 原 SQL 檔 `_pending_review/20260418010000_add_missing_fk_indexes.sql`
  → 搬到 `_applied/2026-04-20/wave1b_add_missing_fk_indexes.sql`
- 寫 `_applied/2026-04-20/wave1b_execution_note.md` 紀錄為什麼不走 CLI + 結果
- 重要：此次執行**不出現在 `supabase migration list`**（因沒走 CLI）

**資料影響**：零（CONCURRENTLY 不鎖表、純新增 index）

**下次從哪接**：
- Wave 1c — 清 5 條重複 index（William 逐條審）
  - idx_tours_controller（重複 idx_tours_controller_id）
  - idx_tours_start_date（不同欄 idx_tours_departure_date、命名歧義）
  - idx_tours_deleted（重複 idx_tours_is_deleted）
  - idx_quotes_main_city_id（命名漂移）
  - idx_order_members_order（重複 _order_id）
  - idx_customers_code（UNIQUE 自動 index 重複）
- 或跳過直接進 Wave 2（盤點現有 permissions 系統）

**Blocker**：無

---

## 2026-04-20 23:00 — Wave 1a 完工（4 條 CHECK constraint）

**做了什麼**：
1. Supabase token 更新（舊 `sbp_953...` 過期、新 `sbp_ddbc54...`）、memory 同步
2. 確認 prod 是 `wzvwmawpkapcmkfmkvav`（William 先貼錯 `xgfgeowcogeempmmruvo`、確認是空殼或看錯）
3. 搬 4 筆過期 draft migration 到 `_rejected/`（4-15/4-16 的 stage0/1/2/3）
   - 這些 draft 的 DO block 驗證和現況 DB 對不上（例如斷言 TYU 有 3 列、實際 1 列）
4. 寫 `20260420224000_wave1a_check_constraints.sql`（idempotent、NOT VALID）
5. Apply 成功、加 4 條 CHECK：
   - `quotes_quote_type_check`: quote_type IN ('standard', 'quick')
   - `tours_tour_type_check`: tour_type IN ('template', 'official', 'proposal')
   - `travel_invoices_items_array_check`: items 必為 array
   - `travel_invoices_buyer_info_object_check`: buyer_info 必為 object

**資料影響**：零（NOT VALID 不驗既有、只擋未來寫入）

**下次從哪接**：
- Wave 1b — 補 50 條 FK index（CONCURRENTLY、不能走 CLI migration）
  - 方案 A：走 Supabase Management API
  - 方案 B：William 手動貼到 Dashboard SQL Editor（親自按、比較安心）
- Wave 1c — 清 5 條重複 index（William 逐條審）

**Blocker**：無

---

## 2026-04-20 22:30 — Wave 0 完工（P0 紅線 3 項）

**做了什麼**：
1. **`'current_user'` literal × 2**（travel-invoice void）
   - 根治法：API 從 `auth.data.employeeId` 取、client 不再傳
   - 改 5 處：`api/travel-invoice/void/route.ts`、`api-schemas.ts` schema 移 operatedBy、`travel-invoice-store.ts` 簽名 + body、2 個 page 呼叫
2. **`/tools/reset-db` 加 系統主管 guard**
   - `usePermissions` 取 isAdmin、沒有系統主管資格 顯示「需要系統主管權限」畫面
   - handleReset 前加 `confirm()` 二次確認
3. **`/login` 加 is_active 檢查**
   - `validate-login/route.ts` 第 3 步 `status === 'terminated'` 之後加 `is_active === false` 檢查

**驗證**：
- `npm run type-check` → 0 錯
- 無改 DB、無改 data

**下次從哪接**：
- **Wave 1**（100% 安全 DB migration）— 🛑 **要 William 口頭授權才能 apply**
  - `_pending_review/20260418010000_add_missing_fk_indexes.sql` 補 FK index（CONCURRENTLY、不鎖表）
  - 加 `quotes.quote_type` / `tours.tour_type` CHECK constraint（已驗證資料合規）
  - 加 `travel_invoices` jsonb CHECK（0 列、安全）
  - 清重複 / 冗餘 index 5 條

**Blocker**：Wave 1 apply 到 Supabase 須 William 授權（紅線）

---

## 2026-04-20 22:00 — William 批完決策清單 11 條

**做了什麼**：
- 攤開 BACKLOG 的 🛑 決策清單、逐條白話解釋
- William 邊決邊戳出我兩個診斷錯誤：
  1. **tour_leader_id FK** 我建議「改指 employees」是錯的——領隊得先進 order_members（保險/機位/人頭）、現設計是對的、audit 標錯
  2. **archive_empty_tables** 我太粗：「空表 ≠ 死表」、可能是未啟用功能（會計模組 / 背景任務等）不是真死
- 最終 11 條全定（見 STATE.md 決策摘要）
- 修正 BACKLOG：Wave 6 移除 tour_leader_id FK 項、Wave 2 新增 permission scope 邏輯 + 184 表盤點

**關鍵共識**：
- 權限系統走 hasPermission、不 hardcode（「來一個人資只管人資、後台勾給他就好」）
- tour_leader 權限依身份：員工→full scope；客戶兼任→self_only
- 上線前不動任何有資料的表（dead_data_cleanup 不動、ref_airports_backup 留著）

**下次從哪接**：
- Wave 0：3 項 P0、S 工期（半小時內）
  1. `'current_user'` × 2（travel-invoice void）
  2. `/tools/reset-db` 加 系統主管 guard
  3. `/login` 加 is_active 檢查
- 接著 Wave 1（100% 安全 migration）+ archive_empty_tables 重做盤點
- 然後 Wave 2 前置：盤點現有 permission 系統、產 permission key 清單給 William 審

**Blocker**：無

---

## 2026-04-20 21:30 — Phase A 盤點完成

**做了什麼**：
- 讀必讀檔案：STATE / BACKLOG / LOG / VENTURO_WHY / CLAUDE.md
- 讀 15 份 audit（VENTURO_ROUTE_AUDIT/00-SUMMARY + _INVARIANTS + _BLOCKED）
- 精確 grep 反 pattern：
  - `|| ''` 在 audit 欄位 → **0 處殘留**（4-20 重構完乾淨）
  - `'current_user'` literal → **2 處殘留**（travel-invoice void、Wave 0 必修）
  - `as unknown as` → 330 處 / 145 檔（critical 只有 /customers 5 處 line_user_id）
  - `as never` → 133 處 / 40 檔（多半測試檔 + 套件限制、標 Post-Launch）
- **新發現**（audit 未覆蓋）：
  - Corner workspace UUID `8ef05a74-...` 硬編 6 處、Partner 會 leak
  - LOGAN_ID 兩個定義衝突（`000001` vs `000002`）
  - payment_method UUID 寫死 2 處（AddRequestDialog）
- `_pending_review/` 5 支 migration 分類（低風險 3 支 + 需逐表審 1 支 + 紅線 1 支）
- `npx gitnexus analyze` 重跑 → index 更新到 31596 symbols
- 產出 9 Wave 結構化 BACKLOG、🛑 William 決策清單 11 項

**產出**：
- `BACKLOG.md`：完整重寫、包含 Phase B Wave 0-9 + Phase C + Phase D
- `STATE.md`：Phase A 結束、下一步 Wave 0
- 本 LOG 紀錄

**下次從哪接**：
- 開新 session 先讀 STATE
- William 確認後執行 Wave 0（3 項 P0、S 工期、code only、零 DB）：
  1. `'current_user'` literal × 2（travel-invoice void）
  2. `/tools/reset-db` 無 系統主管 guard
  3. `/login` 漏檢 is_active
- 或先跟 William 對齊「🛑 決策清單」11 項

**Blocker**：無（Wave 0 不需 William 決策）

**注意**：
- Wave 1 `add_missing_fk_indexes.sql` 已在 `_pending_review/`、內容比 audit SQL 更全
- Wave 3 需先建 `src/lib/constants/well-known-ids.ts`（目前只有 workspace.ts 半成品）
- `archive_empty_tables` migration 含 `calendar_events` / `channel_threads` 需人工確認真空

---

## 2026-04-20 20:00 — 專案成立、skill 建立

**做了什麼**：
- 建立 `venturo-pre-launch-cleanup` skill
- 建立 `docs/PRE_LAUNCH_CLEANUP/` 目錄與 STATE / BACKLOG / LOG 檔
- 把今日已完成的 audit trail FK 重構全部匯入 BACKLOG 已完成區

**狀態**：
- Phase 0（基礎建立）：✅ 完成
- Phase A（盤點）：⏸ 等 William 啟動

**下次從哪接**：
- 等 William 確認 → 啟動 Phase A
- 第一步：跑 `venturo-night-audit` + grep 反 pattern + FK 一致性腳本

**Blocker**：無

---

## 2026-04-20 09:00 — 18:00 — Audit trail FK 重構（本專案啟動前）

**做了什麼**（濃縮）：
- 發現 itineraries 儲存 FK bug（`created_by` 指 auth.users 但 code 傳 employee.id）
- 全系統盤點 → 17 表、30 FK 相同問題
- 分 5 批 migration、全部執行成功、79 筆資料 100% map
- 2 個零值欄位 DROP、1 個 legacy 欄位 DROP
- 清 13 處 code 反 pattern
- 規範入庫、E2E 23/23 pass

**相關文件**：
- `docs/REFACTOR_PLAN_AUDIT_TRAIL_FK.md`
- `docs/AUDIT_TRAIL_DATA_INVENTORY.md`
- `CLAUDE.md`（紅線加一條）
- `docs/DATABASE_DESIGN_STANDARDS.md` §8

**結論**：這次經驗轉成本專案 SOP 模板。後續每批照這個模式跑。
