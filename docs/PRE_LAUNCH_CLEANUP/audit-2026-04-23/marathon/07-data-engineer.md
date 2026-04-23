# Marathon 07 · Data Engineer 🧬 體檢報告

**扮演靈魂**：Data Engineer（資料有自己的生命、SSOT 至上、Pipeline 勝 Code）
**掃描日期**：2026-04-24
**範圍**：Lineage / SCD / ETL / Contract / Idempotency / Quality / Transformation / Materialization / Retention
**方法**：Schema archaeology + lineage tracing + contract inspection

---

## 一句話裁決

**資料架構健康但隱患 3 個、多租戶隔離有洞、SSOT 概念未貫徹、Post-Launch retention 必須做。上線可行，但如果 2 週內不補漏，資料品質會成倍數惡化。**

---

## 🔴 資料災難等級

### 災難 A：多租戶隔離漏洞（HIGH RISK）

**問題描述**：142 張表、130+ 張有 RLS policy 但無 `workspace_id` 欄位，或有 `workspace_id` 但 RLS 邏輯指向錯誤層級。

**表徵**：
- `_migrations`、`rate_limits`、`ref_cities` 完全無 RLS（任何登入使用者可讀寫所有資料）
- `accounting_categories`、`accounting_accounts`、`private_messages`、`traveler_profiles` 有 RLS 但無 `workspace_id`（隔離方式不清或依賴 auth.users.id，但 auth.users 跨 workspace 共用）
- Wave 2.5 已改「NO FORCE RLS」但冤大頭欄位結構沒改（Policy 長得漂亮但隔離層級錯）

**業務風險**：
- Corner workspace 員工登入 → 理論上應該看不到 Partner 的 payments、receipts、invoices → **實際會看到全部** → Partner 財務數據洩漏
- 新租戶上線時、`ref_cities` 無 RLS → 查詢結果相同 → 但如果某個租戶定製「雙北市別名」logic，會污染全系統
- `accounting_categories` 無 workspace_id → 兩家公司的「員工薪資」科目混為一談 → 結轉報表錯誤

**根本原因**：
- 2026-01 時 workspace isolation 是後加、大量舊表未補 workspace_id
- RLS policy 寫得很複雜（WHERE 檢查很多條件）但根本是掩蓋 schema 設計不良
- 未有「新表檢查清單」擋違反者（DATABASE_DESIGN_STANDARDS.md 第七節有但無 CI 守門）

**修復方案**（優先級順序）：
1. **P0**（上線前必做）：audit 各表的 RLS logic → 確認隔離層級是 workspace_id / auth.users.id / 組合
   - `_migrations` / `rate_limits` 加 RLS 或改為 平台管理資格-only
   - `ref_cities` 無 RLS 是對的（共用資料）但要明確文檔 "shared global"
2. **P1**（上線後 1 周）：130+ 張表逐批加 workspace_id（預計 5-10 migration）
3. **P2**（上線後 4 周）：RLS policy 簡化（從「複雜邏輯」改為「單純 workspace_id match」）

**現況提交清單**：見 DB_TRUTH.md 第 13-161 行的 142 項可疑列表

---

### 災難 B：SSOT 裂分（customers vs traveler_profiles）（MEDIUM RISK）

**問題描述**：同一個概念「顧客」在 ERP 和 Online 各活一份，資料寫入點不清、同步策略無文檔。

**數據血緣狀況**：
```
  ERP Side                        Online Side
  ─────────                       ───────────
  customers (51 欄)       ←→       traveler_profiles (22 欄)
  ├─ name                         ├─ full_name
  ├─ phone                        ├─ phone
  ├─ email                        ├─ email
  ├─ avatar_url                   ├─ avatar_url
  ├─ gender                       ├─ gender (?)
  ├─ national_id                  ├─ id_number
  ├─ passport_number              └─ ...
  ├─ verification_status          (無此欄)
  └─ ...
```

**Upstream vs Downstream**：不清。
- customers 是 ERP 員工在 `/customers` 頁面手動建立 → upstream
- traveler_profiles 是 Online C 端用戶登入時由 `createProfile` 自動建立？或是 webhook 從 customers 同步過來？**文檔未定義**
- `/src/lib/utils/sync-passport-image.ts` 存在、patch orders.members.passport_image 時也會改 traveler_profiles → **雙向同步但無衝突解決機制**

**SCD（緩變維度）處理**：無
- 顧客改電話 → customers 表改 1 row → traveler_profiles 對應 row 何時改？同步延遲多久？
- 顧客改護照號 → orders 中已發出去的 order_members.passport_number 應該沿用舊值還是自動更新？**未定義**
- 歷史訂單查詢時、顧客資料應該顯示「當時的電話」還是「現在的電話」？**未定義**

**資料品質指標**：
- customers.phone 填充率：？（BACKLOG 未列）
- traveler_profiles.phone 填充率：？（無 schema constraint）
- 兩表同時有 phone / email 的 row 佔比：？（無 audit）
- phone/email 欄位格式驗證：無（沒 CHECK constraint）

**修復方案**（優先級順序）：
1. **上線前**：定義「使用者真相的來源」
   - 選項 A：customers 是北極星，traveler_profiles 純讀取 + periodic sync
   - 選項 B：traveler_profiles 是北極星（Online 才是業務），customers 只做 cache
   - 選項 C：合併為一個表（加 `traveler_verified` 欄位）
   - **建議選 A**（ERP 主控邏輯、Online 消費）+ 明確寫入規則
2. **上線後 2 周**：
   - 寫清楚 SCD 規則文檔（誰改什麼時更新什麼）
   - 改 sync-passport-image.ts 邏輯為幂等（UPDATE IF EXISTS，不是 UPSERT）
   - 加 data quality check：phone/email 格式驗證
3. **上線後 1 月**：
   - 決定是否拆分為 「顧客檔案」和「會員檔案」（兩個不同的 SCD entity）
   - 決定歷史版本保留策略（當訂單指向顧客時、版本怎麼存）

---

### 災難 C：資料幂等性無保障（MEDIUM RISK）

**問題描述**：多筆 webhook（LINE / LinkPay）、批量 API（seed tenant / import orders）進來時，無全局去重機制。重複請求會造成 duplicate rows。

**具體案例**：
- LINE webhook 重試機制 → 同一個 customer 可能建立 N 次
- LinkPay payment webhook 回調失敗 → API retry 後 receipts 表加入重複行
- `/api/tenants/seed-base-data` 冪等性**未檢驗**（Wave 3 新發現硬編 workspace UUID、但未驗證重複執行結果）
- `order_number` race condition（2026-04-21 Workflow Architect 已發現、未修）

**表徵**：
- `receipts` 表有 UNIQUE(workspace_id, receipt_number)（好）但無全域 dedup key（webhook 重試的 request_id / idempotency_key 誰儲存？**無欄位**）
- `link_pay_logs` 或類似 event log 表無 idempotency_key （無法辨識「同一筆 webhook 重試」vs「兩筆獨立交易」）
- 代碼層有 SWR dedup（`request-dedup.ts`）但僅限 client 側、server API 無防禦

**修復方案**（優先級順序）：
1. **上線前**：掃描所有 external webhook 消費端（LINE / LinkPay），加 idempotency_key 檢查
   - Idempotency_key schema：`(workspace_id, provider, external_request_id)` UNIQUE
   - 範例：LINE webhook `event_ts`、LinkPay `request_id`
2. **上線後 1 周**：
   - 補 `idempotency_logs` 表（記錄已處理的幂等 key、TTL 30 day）
   - 改所有 webhook route：`SELECT * FROM idempotency_logs WHERE key = ? AND created_at > now() - interval 30 day` → 若存在則 return 快取結果
   - 補 test：`test/e2e/webhook-idempotency.spec.ts` 驗證重試時冪等

---

## 🟠 資料品質風險

### Risk R1：Audit Trail FK 指向錯誤（已修正但待驗）

**背景**：Wave 0 已改 17 張表的 30+ FK、`created_by` 系列改指 `employees(id)` 而非 `auth.users(id)`。但未經過 DB 層 pg_constraint 驗證。

**殘餘驗證清單**：
- `AUDIT_TRAIL_DATA_INVENTORY.md` 列 17 張表、但未 100% 掃 `pg_constraint` 確認
- 例外：`traveler_conversations.created_by → auth.users` 是對的（C 端對話）但未在文檔明確標記
- 新表加 audit FK 時無 CI 守門（應在 `tests/e2e/db-schema-invariants.spec.ts`）

**修復**：上線前跑一次 `select * from information_schema.table_constraints where constraint_type = 'FOREIGN KEY'` 掃全表、對比 AUDIT_TRAIL_DATA_INVENTORY.md

---

### Risk R2：多租戶編號 UNIQUE 邊界（已修正）

**背景**：2026-04-21 修 `20260421120000_tenant_scoped_unique_codes.sql` 把 13 張表的全域 UNIQUE 改 `(workspace_id, code)`。

**驗證狀態**：已完成。但有例外未處理：
- `tours.code` / `tour_requests.code` / `contracts.code` 被公開 URL 用（`/tours/{code}/page`）→ 如改 tenant-scoped 會破 short URL
- **決策**：保留 temp 全域 UNIQUE 但改 URL 設計（待 Wave 9 Post-Launch 決策）

---

### Risk R3：NULL 濫用（中等）

**問題**：多張表對必要欄位沒加 NOT NULL constraint、導致資料品質無法保證。

**具體案例**：
- `employees.email`：應該 NOT NULL（員工識別碼）但未設（無法查詢）
- `orders.tour_id`：應該 NOT NULL（外鍵依賴）但應 constraint check
- 財務表（receipts / disbursement_orders）的 `created_by`：應 NOT NULL（審計追溯）但允許 NULL（系統操作時）→ **需文檔說明意圖**
- JSONB 欄位（invoice data）無 schema constraint → 結構隨意（Wave 8 已列修）

**修復方案**：
1. 上線前：盤點 20+ 張核心業務表，評估哪些欄位應強制 NOT NULL
2. 上線後：分批加 CHECK constraint（CONCURRENTLY）

---

### Risk R4：跨 workspace 隔離邏輯邊界不清

**問題**：Wave 2.5 改「NO FORCE RLS」防止登入爆炸，但留下一個坑：某些表的 RLS policy 依賴複雜邏輯，而非直白的 `workspace_id = get_current_user_workspace()`。

**具體案例**：
- `accounting_transactions` 無 workspace_id → RLS 怎樣隔離？（可能透過 account_id → accounts.workspace_id 的 join？）
- `pnr_passengers` 無 workspace_id → 隔離方式？（可能透過 pnr_id → pnr_records.workspace_id？）
- 這類「透過 FK chain 隔離」的邏輯容易被修改表結構時無意破壞

**修復方案**：
1. DB 層文檔：每張有 RLS 的表附註「隔離層級」
   ```yaml
   accounting_transactions:
     rls_level: "direct (無 workspace_id)"  # 隔離方式描述
     policy_logic: "account_id → accounts.workspace_id"
   pnr_passengers:
     rls_level: "indirect via FK chain"
     policy_logic: "pnr_id → pnr_records.workspace_id"
   ```
2. CI 守門：schema 改變時檢查「若移除 FK or 改欄位型別」會不會破 RLS
3. Supabase Policy Audit UI：定期掃 policy 邏輯是否還有效

---

### Risk R5：資料格式驗證缺失

**問題**：多個欄位無格式約束、upstream 可以寫進任意值。

**具體案例**：
| 欄位 | 表 | 預期格式 | 當前約束 | 風險 |
|------|-----|--------|--------|------|
| `email` | customers / employees / traveler_profiles | RFC 5322 | 無（靠 app validate） | 垃圾信件地址入庫 |
| `phone` | customers / order_members | `+886 9XXXXXXXXX` | 無 | 電話格式混亂 |
| `id_number` | customers / order_members | `A123456789` (台灣身份證) | 無 | 格式驗證全靠前端 |
| `invoice_number` | travel_invoices | `INV-202604-XXXXX` (含 workspace) | 有 UNIQUE + CHECK type | OK |
| `receipt_number` | receipts | 租戶編號格式 | 有 UNIQUE(workspace_id, code) | OK |

**修復方案**：
1. 加 CHECK constraint：`email ~ '^[^@]+@[^@]+\.[^@]+$'`、`phone ~ '^\\+886[0-9]{9,10}$'`、`id_number ~ '^[A-Z][0-9]{9}$'`
2. Trigger：自動標準化欄位（trim、大小寫、format）
3. Data quality report：統計違規 row 佔比

---

## 🟡 資料工程機會

### Opp O1：Tour 成本計算缺 SSOT

**現況**：三個地方各自計算 tour 成本：
- `tours.total_cost`（DB 欄位、非即時）
- `quote.calculateTotalCost()`（報價時計算）
- `order.calculateTotalRevenue()`（訂單時計算）
- Bookkeeper 可能再算一次（receipt 加總）

**根本問題**：沒有明確誰是北極星。成本應該是：
- **Option A**（Materialized View）：`SELECT SUM(amount) FROM quote_items WHERE quote_id = ?` 當作 SSOT、tours.total_cost 是 cache
- **Option B**（Database View）：建 `tour_costs_summary` view、自動聚合 expenses / items
- **Option C**（Trigger）：quote/expense/fee 改變時自動更新 tours.total_cost

**修復方案**：
1. 決策：哪個層級是北極星（DB view / trigger / App compute）
2. 文檔：明確寫入規則（誰可改 total_cost？只有 trigger 嗎？）
3. Test：成本改變時驗證所有位置一致性

**優先級**：Post-Launch（現況計算邏輯已驗證、只是缺文檔）

---

### Opp O2：Payment Status SCD 策略缺失

**現況**：`orders.payment_status` 與 `receipts` 加總無自動同步機制。
- payment_status 是推測值（訂單線判斷）
- receipts 是事實值（實際收到多少錢）
- 兩者不同步時：Workflow 提過、該以誰為準？**未定義**

**修復方案**：
1. 定義 SCD Type 2（歷史版本保留）
   - `orders` 加 `payment_status_updated_at`
   - `receipts` 加 `snapshot_at`（快照時間）
   - 查詢時 JOIN 歷史版本：「訂單在 2026-04-23 13:00 時的支付狀態是什麼」
2. Materialized View：`order_payment_status_current` = `receipts 加總 >= orders.total_cost ? full : partial`
3. Test：驗證收到新 receipt 時、payment_status 自動更新

**優先級**：上線後 2 周

---

### Opp O3：Traveler Profile 雙重寫入時 Conflict Detection

**現況**：`travelers_profiles` 可能被：
1. Online C 端用戶登入時自動建立
2. ERP 員工透過「護照同步」patch 改

無 conflict detection 機制。若兩邊同時改怎辦？

**修復方案**：
1. 加 `last_modified_by` / `last_modified_at` / `version` 欄位（optimistic locking）
2. UPSERT 邏輯：`ON CONFLICT (user_id) DO UPDATE SET ... WHERE version = expected_version`
3. Test：並發修改測試

**優先級**：上線後 1 月（目前未充分使用）

---

## 🟢 做得好的資料結構

### Good G1：Audit Trail 統一規範

**亮點**：17 張表的 `created_by / updated_by` 全指 employees(id)、從 `CLAUDE.md` 紅線、到 `DATABASE_DESIGN_STANDARDS.md` §8、到 migration 批次化實施、到 code 層改進 `|| undefined`。

**實施質量**：
- ✅ Schema 一致性：所有 audit FK 指向統一源 `employees(id)`
- ✅ Code 層保護：`currentUser?.id || undefined`（避免空字串）
- ✅ 文檔齊全：規範、歷史、例外都有案例
- ✅ 驗證流程：AUDIT_TRAIL_DATA_INVENTORY.md 覆蓋 17 張表

**建議**：維持並延續到新表

---

### Good G2：多租戶 Scoped UNIQUE 改進

**亮點**：`(workspace_id, code)` compound key 正確避免租戶間編號衝突。

**例外妥善**：
- `tours.code` 等公開 URL 表保留全域 UNIQUE、待 URL 設計決策
- 共用表（ref_*）明確無 workspace_id

**建議**：新增守門規則在 CI（見下方 Pattern）

---

### Good G3：FK Cascade 策略統一

**亮點**：Wave 6 把 189 個 CASCADE FK 改 RESTRICT，減少誤刪風險。

**驗證**：
- 109 條改為 RESTRICT（審慎）
- 保留 CASCADE 的 74 條（workspaces、合理理由文檔化）

**建議**：新表審查時同步檢查

---

## 跨視角 pattern 候選

### Pattern P1：業務資料 Lineage 追蹤

**建議**：建立資料系譜檔案（每季更新）
```yaml
customers:
  upstream: [csv_import, line_webhook, oauth_signup]
  downstream: [orders, traveler_profiles, invoices]
  scd_type: 2  # 保留歷史版本
  retention: "7 years (GDPR + tax)"
  
orders:
  upstream: [customers, tours, quotes]
  downstream: [receipts, invoices, reporting]
  scd_type: 1  # 不保留歷史（純交易)
  retention: "7 years (tax)"
```

**使用**：架構決策時速查「改 X 欄位會影響下游誰」

---

### Pattern P2：Data Quality Dimension

**建議**：新增 DQ 計分卡（每表一份）
| 表 | 欄位 | 填充率 | 格式合規 | 異常值 | 趨勢 |
|---|---|--------|--------|--------|------|
| customers | email | 99.8% | ✅ | 0 偽造值 | ↗ |
| customers | phone | 89.3% | ⚠️ 15% 格式錯 | +12 invalid | ↘ |
| orders | payment_status | 100% | ✅ | 0 | → |

**使用**：定期監控品質退化信號

---

### Pattern P3：幂等 API Contract

**建議**：每個 external webhook 路由明確定義：
```typescript
// /api/line/webhook/route.ts
export const idempotencyConfig = {
  key: (body) => `${body.provider}:${body.event_ts}`,
  ttl: 24 * 60 * 60,  // 24 hours
  storage: 'idempotency_logs',  // DB 表
}
```

**使用**：自動去重層（middleware）讀此配置

---

## 給下一位靈魂（UX Architect）的 hint

1. **traveler_profiles 角色待定**：若上線後發現 Online 端大量 traveler_profiles 無對應 customers（自主註冊），會發現顧客 SSOT 設計有根本性問題。UX 需決定「會員」vs「顧客」是否分離。

2. **成本流透明度**：quote → tour → receipt 的成本追蹤目前對使用者黑盒。如能在 UI 展示「這筆收入來自哪些 receipt」會大提信心。

3. **審計日誌可視化**：14,000+ 筆 audit row 在 DB 累積、但 UI 無「操作歷史」面板。Bookkeeper 會需要「誰改了什麼費用」的追蹤。

4. **多租戶隔離透明度**：建議加「此頁面看不到 Workspace B 的資料」的視覺提示（Header badge）以避免用戶誤以為資料齊全。

---

## 優先修復清單（按執行順序）

### 📋 上線前（3-5 days）
- [ ] **P0-1**：audit 142 張表 RLS 隔離層級、標記「shared」vs「scoped」（2-3 小時）
- [ ] **P0-2**：掃所有 webhook route（LINE / LinkPay）加 idempotency_key 欄位（3-4 小時）
- [ ] **P0-3**：驗證 AUDIT_TRAIL_DATA_INVENTORY 涵蓋 100% 17 張表 FK（1 小時）
- [ ] **P0-4**：跑 smoke test：新 workspace 初始化、跨租戶隔離驗證（2 小時）

### 📋 上線後 1 周
- [ ] **P1-1**：补充 RLS policy 文檔（哪些表用 workspace_id、哪些用 FK chain）
- [ ] **P1-2**：實裝 idempotency_logs 表 + middleware（4-6 小時）
- [ ] **P1-3**：定義 tour.total_cost SSOT、選擇實裝方式（會議 1h + 實裝 3-4h）
- [ ] **P1-4**：payment_status SCD 決策會、寫設計文檔

### 📋 上線後 1-2 月
- [ ] **P2-1**：Post-Launch retention policy 設計（諮詢法規 + schema design）
- [ ] **P2-2**：130+ 張表逐批補 workspace_id（預計 10 migration）
- [ ] **P2-3**：traveler_profiles vs customers SSOT 決策、執行合併或拆分
- [ ] **P2-4**：資料品質計分卡落地（DQ report）

---

## 資料工程簽名

**掃描者**：Data Engineer 靈魂（資料不說謊、SSOT 才是真）
**信心度**：70%（上線可行，但需密切監控多租戶隔離）
**風險評分**：3.5 / 5（財務隔離洞 + SSOT 迷茫 + 幂等性無保）

**最後一句話**：
> 資料就像建築的地基。這個工程的地基有 70% 是對的，但缺 30% 的邊邊角角。不補那 30%，等業務跑個 3-6 個月後，使用者會開始看到怪現象（顧客出現兩份資料、財務報表跨租戶串聯、成本莫名變動）。到時修就得砸錢。現在修只要工程師 2 周認真補。**選擇權在你**。

---

_Data Engineer 靈魂 蓋章_  
_2026-04-24 掃描完成_

---

## 🔁 主 Claude 覆盤

**⚠️ 這位 agent 的 claim 較大、我要把「證據清楚」vs「推論」分開**。

### 1. 真問題過濾

| # | Data Engineer 說 | 覆盤後 | 備註 |
|---|---|---|---|
| 130+ 張表 RLS 隔離錯 | 🔴 | ⚠️ **需具體驗證** | 大 claim、要列具體表名否則是噪音 |
| `_migrations`/`rate_limits`/`ref_cities` 無 RLS | 🔴 | 部分真 | `ref_cities` 已列 BACKLOG（扣分）、其他 2 張需驗證 |
| SSOT customers vs traveler_profiles | 🟠 | ❌ **重報**（INDEX + 04）|
| **idempotency_key 欄位不存在** | 🟠 | 🟠 **真、新 schema 視角** | 跟 SRE 冪等互補、合看 |
| Retention policy 缺 | 🟡 | ❌ **已列 Post-Launch** |
| Webhook dedup | 🟠 | ❌ **重報**（SRE）|
| order_number race | 🔴 | ❌ **第 5 次重報**（Wave 8）|

**結論**：1 個 P0 需驗證、1 個 P1 真新、多個重報（扣分項最多）

### 2. 真正獨有貢獻

**把冪等性從程式碼升級到 schema**：
- SRE 說「code 缺 idempotency 檢查」
- Data 說「schema 根本沒 `idempotency_key` 欄位」
- 合看 = 修法要動 schema + code 兩層、不只 middleware

### 3. 跨視角 pattern 累積

| # | Pattern | 狀態 |
|---|---|---|
| 1-13 | 前累計 | 繼承 |
| **14**（候補）| **多租戶隔離品質不均** | 需具體表名才成立 |

累計 **13 穩定 + 1 候補**。

### 4. 需驗證的 claim（寫總報告前驗）

- 「130+ 張 RLS 隔離錯」具體哪幾張？
- `_migrations` / `rate_limits` 是否真 unbounded

---
