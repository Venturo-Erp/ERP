# Agent F — /tours DB 真相對照

_由 Explore agent 產出（2026-04-22）、主 Claude 補寫檔案（原 agent 在 read-only mode）_

---

## 1. FORCE RLS + service_role 衝突

**tours 相關表狀態**：全部只開 RLS、**無 FORCE RLS**（✅ 無紅線命中）
- `tours` / `tour_itinerary_items` / `tour_members` / `tour_room_assignments` / `tour_rooms` / `tour_documents` / `orders` / `payments` / `attractions` 全部 RLS enabled、NO FORCE
- policy 都用 `get_current_user_workspace()` 隔離

**對比**：28 張 FORCE RLS 問題表（確認書、附件、簽證等）主要影響 dashboard 載入、**/tours 本體不在這批**（已在 login 驗證報告列出）

---

## 2. 欄位 UI 看不到、DB 有的

**tours 表 DB 有但 NewTourData interface 未涵蓋**：
- `closing_status` / `closing_date` / `closed_by` — 結案流程（對照 E 報告：結帳未完的 DB 欄位已預留）
- `locked_quote_id` / `locked_quote_version` / `locked_by` / `locked_at` — 報價鎖定
- `locked_itinerary_id` / `locked_itinerary_version` / `last_unlocked_at` / `last_unlocked_by` — 行程鎖定
- `confirmed_requirements` (jsonb) — 確認需求 SSOT
- `custom_cost_fields` (jsonb) — 自訂成本
- `accommodation_days` — 住宿天數
- `selling_prices` / `participant_counts` / `tier_pricings` (jsonb) — 分層定價
- `archive_reason` / `modification_reason` — 審計
- `country_code` — 國家代碼

→ **UI 送得出的欄位 < DB 能存的欄位**、trigger / 其他模組可能在寫

---

## 3. 審計欄位 FK 對齊（CLAUDE.md 紅線）

**全部符合** ✅（指 `employees(id)`、無一指 `auth.users`）：
- `tours.{created_by, updated_by, closed_by, deleted_by, locked_by, last_unlocked_by}` → employees
- `tour_itinerary_items.{created_by, updated_by, assigned_by, override_by}` → employees
- `tour_documents.{created_by, updated_by, uploaded_by}` → employees
- `tour_members.{created_by, updated_by}` → employees
- `tour_rooms.{created_by, updated_by}` → employees
- `orders.{created_by, updated_by}` → employees
- `payments.{created_by, updated_by}` → employees
- `attractions.{created_by, updated_by}` → employees

---

## 4. Trigger 偷改清單

**tours 表上 8 個 trigger**（UI 通常看不到觸發、但結果看得到）：
1. `tours_cascade_rename` — AFTER UPDATE — 級聯改名
2. `tr_create_tour_folders` — AFTER INSERT — 自動建檔案夾
3. `trg_tours_sync_country_code` — BEFORE INSERT/UPDATE — 同步國家代碼
4. `trigger_auto_set_workspace_id` — BEFORE INSERT — 自動填 workspace_id（登入邊界救場）
5. `trigger_create_tour_conversations` — AFTER INSERT — 自動建會話
6. `trigger_tour_update_cache` — AFTER UPDATE — 快取更新
7. `update_tours_updated_at` — BEFORE UPDATE — 時戳

**tour_itinerary_items**：`tii_updated_at` BEFORE UPDATE

✅ 無異常、行為可預期、UI 看得到下游結果（資料夾、會話、快取）

---

## 5. RLS policy 真相（內容檢查）

**tours 表 4 policy**（workspace 隔離）：
```
tours_select / insert / update / delete
  USING / WITH CHECK: workspace_id = get_current_user_workspace()
```

**tour_itinerary_items**：同 workspace 隔離、無 `USING: true` 過寬條文

**tour_members**：⚠️ `tour_members_insert` 的 **`WITH CHECK: true`**
- 允許任何登入用戶插入記錄、其他操作才用 EXISTS(tour workspace_id) 檢查
- **潛在風險**：惡意用戶可能插入到別 workspace 的團員表（需 tour_id 對得上、但若 tour_id 被列舉就成立）

**tour_room_assignments**：全 EXISTS 檢查（room → tour → workspace 鏈正確）

**orders / payments**：workspace 隔離、payments 有 `is_super_admin()` 例外

---

## 6. UNIQUE / CHECK constraint 隱形規則

⚠️ **tours.code 無 UNIQUE constraint**（DB_TRUTH 未顯示 unique 索引）
- 風險：跨租戶或租戶內可能撞 code
- UI 有沒有自動生成唯一 code 的邏輯？（需 Agent A/B 代碼側驗證）

**tour_itinerary_items** 無 `(day_number + category + tour_id)` 的 UNIQUE 鍵
- syncToCore carryOverPricing 匹配靠這組鍵、但 DB 沒強制唯一 → 同 day+category 可能兩筆、匹配不定

**attractions(workspace_id, id)** CASCADE DELETE（workspace 刪則景點級聯）

---

## 7. 「行程報價需求景點 SSOT」DB 層真相

**tour_itinerary_items 五階段欄位**（✅ 都存在）：
- `quote_status` — none/quoted/rejected/confirmed
- `confirmation_status` — none/confirmed/cancelled
- `leader_status` — none/accepted/declined
- `request_status` — none/sent/replied/confirmed
- `booking_status` — 訂位

**resource 三件套**：
- `resource_type` (text) — attraction / hotel / restaurant
- `resource_id` (uuid) — 指向該資源 id
- `resource_name` (text) — 冗備名稱（避免 JOIN）

**attractions 的租戶隔離**：✅ 有 workspace_id
- FK `attractions.workspace_id → workspaces(id) CASCADE`
- policy 允許 `is_super_admin() OR has_attraction_license() OR workspace_id match`
- 景點**可跨租戶共用**（via license 模型）、符合 William「景點外掛 SSOT」設計

---

## 8. 公司模板 DB 真相

**無獨立 `tour_templates` / `company_templates` / `package_templates` 表**

**NewTourData 中 tour_type 欄位**：`'official' | 'proposal' | 'template'`
- tours 表本身存所有類型、用 `tour_type` 區分、不是分表
- 「template」值只標記身份、無獨立複製邏輯 / 預設權限 / 主管限制
- → William 「特定主管製作、大家複製」的流程在 DB **完全沒底層支撐**

---

## 9. 一團多訂單 DB 真相

**orders.tour_id** (text) ✅ 存在
- FK `tours.id ON DELETE SET NULL`

**「訂單成員」vs「團員」兩張表**（概念符合 William 口述）：
- `tour_members` — 團員清單（customer_id、member_type、roommate_id）
- `order_members` — 訂單成員（與 customer_id 關聯）

**SSOT 統一性**：
- `tour_members.tour_id` 和 `order_members → orders.tour_id` 應同步
- **但 DB 無 constraint 確保**「同一人同一團只能在一筆訂單」
- 風險：客人 A 在同團 Tour_X、被登入兩張訂單 Order_1、Order_2 → 結帳對不到

---

## 🎯 關鍵結論摘要

### 🟢 符合的部分
- 審計欄位 FK 全指 employees（CLAUDE.md 紅線完全合規）
- tours 相關表全部 NO FORCE RLS
- 景點外掛 SSOT 設計有 DB 支持（workspace_id + license 模型）

### 🟡 需要關注
- `tour_members_insert` policy `WITH CHECK: true` 過寬
- `tours.code` 無 UNIQUE（跨租戶撞 code 風險）
- `tour_itinerary_items` 無 `(day_number, category, tour_id)` 唯一鍵（syncToCore 匹配不定）
- NewTourData 遺漏 10+ 個 DB 欄位（UI 看不到 closing_status / locked_* / tier_pricings 等、但 DB 可能有值）
- 一團多訂單無「同人同團僅一訂單」constraint

### 🔴 紅線命中
- **無**（tours 相關表 FORCE RLS 議題乾淨、FK 合規）
