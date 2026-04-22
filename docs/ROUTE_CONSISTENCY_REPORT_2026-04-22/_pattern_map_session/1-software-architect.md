# Architect View — RLS Pattern Family (P016 Session)

**Author**: Software Architect soul
**Date**: 2026-04-22
**Scope**: 4 DB-layer findings from /login v3.0 + 全站 RLS 掃描
**Angle**: 結構 vs 局部、治本 vs 治標、trade-off 先講清楚

---

## 1. 結構性 vs 局部性 判定

| # | Finding | 判定 | 理由 |
|---|---------|------|------|
| 1 | `workspaces_delete` policy = `USING: true` | **結構性**（高危） | `workspaces` 是**租戶 root aggregate**。這條 policy 違反設計原則③「租戶一致性每層都守」——DB 層完全棄守。任何登入用戶可級聯刪除整個租戶所有資料（FK ON DELETE CASCADE 放大）。修單張表不夠、要檢討「根 aggregate 的 mutation policy 通用模型」 |
| 2 | `_migrations` RLS 未啟用 | **局部性**（中危） | 基礎設施表、本質上不該給 app 用戶看。修法固定（`ALTER TABLE ENABLE RLS` + `deny-all to authenticated`）。**但**要升格成結構問題：「`_*` 底線系統表是否一律預設 deny-all」 |
| 3 | `rate_limits` RLS 未啟用 | **局部性但洩漏側信道**（中危） | 別人看到你的 rate 狀態可推敲攻擊窗口；單表修完就結案。不構成模型缺陷 |
| 4 | `employee_permission_overrides` 4 policy 全 USING:true、無 workspace_id | **結構性**（高危） | 這是**權限 meta-表**、還沒 tenant 欄位。違反設計原則①「權限長在人身上」的實作假設——連承載權限的表都跨租戶外洩。這是 schema 設計缺陷、不是 policy 寫錯。v2.0 已點名未修、說明修法路徑不清、需要 migration plan |

**一句話**：#1 和 #4 是結構、#2 和 #3 是局部。但 #2 和 #3 之所以漏、**背後有共通結構病**——沒有「新表建立時 RLS 預設開」的 CI 守門。

---

## 2. Pattern ID 合併建議

**不要全部合一條**（會變成「RLS 漏鎖全症」大雜燴、無法驅動修復）。
**也不要拆 4 條**（重複的修復邏輯、地圖冗餘）。

建議**合併為 3 條 pattern**：

### P016 — 租戶 root 級別 mutation policy 棄守（結構 / 高危）
- 涵蓋：finding #1（workspaces_delete: true）
- 本質：**租戶根 aggregate 的破壞性操作沒有守門人**
- 延伸檢查：workspaces 的 UPDATE policy、未來任何新增的 root-level 表（organizations / tenants 類）
- 修法：policy 改「只有 workspace owner / super_admin 能 DELETE」+ CI 守「所有 root aggregate mutation policy 不得 `USING: true`」

### P017 — 系統基礎設施表 RLS 預設缺失（局部 / 中危）
- 涵蓋：finding #2（_migrations）+ #3（rate_limits）
- 本質：**非業務表的保護靠人工記得、沒有預設規則**
- 修法：
  1. 立刻修這 3 張（含 `ref_cities`）
  2. 建 CI 規則：`_*` 前綴表 / rate_* / audit_* / 所有 non-public-schema 候選表、**必須 RLS enabled + 至少一條非 `USING:true` policy**
- Trade-off：CI 會擋住未來善意的新表、需要明確 opt-out 機制（註解 `-- SECURITY: public-read intentional`）

### P018 — 權限 meta-表本身缺 workspace_id（結構 / 高危 / v2.0 遺留）
- 涵蓋：finding #4（employee_permission_overrides）
- 本質：**承載權限覆寫的表沒有租戶欄位、policy 只能 `USING:true`**（不是 policy 寫錯、是 schema 根本無從判斷）
- 修法三步：
  1. 加 `workspace_id uuid NOT NULL` + backfill（從 employees.workspace_id 推）
  2. 改 4 條 policy 為 `USING (workspace_id IN (current_user_workspaces()))`
  3. CI 守「所有 employee_* / permission_* 表必須有 workspace_id」
- 風險：backfill 時若有孤兒資料需先清；soft-delete 的 override 要不要遷移要 William 拍板

**合併理由**：P016/P018 各有獨立的 schema / policy 變更工作、合併會混淆修復步驟；P017 是一類「同模式、多張表」、合一條剛好。

---

## 3. 83 張 `USING:true` 表的分類框架

不要一張一張看、給**4 類分類原則**：

| 類別 | 判定規則 | 代表表 | 處置 |
|------|---------|-------|------|
| **A. 全域參考資料**（by design 保留） | 表名前綴 `ref_*` / 名稱為靜態字典（國家、城市、機場、米其林餐廳、酒店目錄） | ref_airports, ref_countries, ref_destinations, luxury_hotels, michelin_restaurants, magic_library, badge_definitions, payroll_allowance_types, payroll_deduction_types | **保留 USING:true**、但加 policy 註解 `-- SECURITY: public reference, no tenant` |
| **B. 全域設定 / enum 表**（by design 保留） | workspace 設定的預設模板、不屬於任一租戶 | workspace_bonus_defaults, supplier_categories | 同 A、加註解 |
| **C. 使用者自有資料、但未掛 workspace_id**（該收緊） | 個人層資料（personal_expenses / friends / private_messages / notifications / tasks），policy 應該用 `user_id = auth.uid()`、不該 `USING:true` | personal_expenses, private_messages, notifications, tasks, friends, meeting_messages, timebox_*, expense_streaks | **立刻收緊**、按 user_id 守；若漏 user_id 欄位升格為 schema 問題 |
| **D. 租戶業務資料、應有 workspace_id**（最嚴重） | tour_* / itinerary_* / customer_* / supplier_* / pnr_* / website_* / tour_requests 等主幹業務表 | tour_members, tour_leaders, tour_expenses, customer_inquiries, pnr_passengers, website_itinerary_days, tour_requests, itinerary_permissions | **最高優先**：逐表查 workspace_id 有無、有就收緊 policy、沒有升格成 schema 問題（類 P018） |

**分類原則**：
1. 先看表名語義（ref / 全域 / 個人 / 租戶）
2. 查 `information_schema.columns` 看有沒有 `workspace_id` / `user_id`
3. 沒有 tenant 欄位的 → 不是 policy 寫錯、是 schema 缺陷
4. 有欄位但 policy 仍 `USING:true` → 純粹 policy 寫錯、是低成本高收益修復

**快速勝利**：先掃 83 張中「有 workspace_id 欄位但 policy = USING:true」的、這批是**純 policy 修復**、可批次處理。剩下的再分 A/B/C/D。

---

## 4. 治本方向（ADR 級決議）

### ADR 草稿：DB Policy as Code + CI 守門

**Context**：目前 310 張表的 RLS policy 靠 migration 手寫、人工 review。每張表重複寫「判 workspace_id / user_id / 拒絕 / 允許」的樣板、出錯機率高（已證明：3 張漏 RLS、83 張 USING:true、多張缺 workspace_id）。

**Decision**（三層防護）：

1. **Policy Template Generator**（治 policy 重複）
   - 寫 SQL function `create_tenant_policies(table_name, tenant_column)` 自動產生 4 條 CRUD policy
   - 寫 `create_user_owned_policies(table_name, user_column)` for 個人層表
   - 寫 `create_public_reference_policies(table_name)` for ref 表（明確標記 by design）
   - Migration 只調用 generator、不手寫 policy

2. **CI DB Invariant Check**（治漏鎖）
   - 新 migration 落地前跑：
     - 所有 public schema 表 RLS enabled
     - 所有 policy 的 `USING` / `WITH CHECK` 不得為字面 `true`（除非註解明確 opt-out）
     - 指定名稱模式（tour_* / customer_*）必有 workspace_id 欄位
     - 指定名稱模式（user_* / personal_*）必有 user_id 欄位
   - 跑在 pre-commit + GitHub Actions 雙層

3. **Pattern Map as Living Test**（治退步）
   - P016/P017/P018 修完後、把「不得再出現」的 SQL query 寫成 dbt test 或 pg_prove test
   - 每日 cron 跑、fail 就通報

**Consequences**：
- **變容易**：新表建立有明確軌道、policy 不用思考、CI 擋住低級錯誤
- **變難**：template 不涵蓋的特殊表要明確 opt-out + 寫註解（但這是好事、讓例外顯性化）
- **不可逆成本**：要重寫現有多張表的 policy 走 generator、一次性工作
- **reversibility**：generator 失敗可隨時退回手寫 policy、CI 規則可逐條啟用

**Alternatives considered**：
- 純手工 review：已證明無效（83 張漏鎖）
- 全表 FORCE RLS：踩過雷（workspaces FORCE RLS 打斷登入、列入紅線）
- Supabase Edge Function 當 proxy：多一層延遲、違反「DB 層守」原則

**Recommendation**：採用。優先順序 1 > 2 > 3（generator 先有、CI 才有意義、living test 是長期健康）。

---

## 給主 Claude 的 200 字摘要

4 條 pattern 應合併為 **P016 / P017 / P018** 三條：P016 = workspaces_delete 棄守（結構高危、租戶根 aggregate 問題）、P017 = 系統表 RLS 缺失（_migrations / rate_limits / ref_cities、局部中危、一類多表合併）、P018 = employee_permission_overrides 缺 workspace_id（結構高危、schema 缺陷非 policy 寫錯、v2.0 遺留）。83 張 USING:true 分 4 類：ref_* / 全域設定（保留、加註解）、個人層表（按 user_id 收緊）、租戶業務表（查 workspace_id 有無、最高優先）。治本方向是 **Policy Template Generator + CI DB Invariant Check + Pattern Map as Living Test** 三層防護、不再靠人工 review。優先做 generator、讓新表有軌道；CI 擋住「policy = USING:true」和「業務表缺 workspace_id」兩類低級錯誤。
