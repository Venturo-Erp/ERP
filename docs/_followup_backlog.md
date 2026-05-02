# ERP Followup Backlog
> Agent 持續優化的 task 清單。配合 `docs/_agent_entry.md` 跟 `scripts/audit-loop.sh` 使用。
>
> 最後更新：2026-05-02

---

## 怎麼讀這份檔（給 agent）

每個 task 是一個 markdown section、含：
- **ID**：唯一識別、報告時用
- **狀態**：pending / in-progress / human-review / done / blocked
- **風險**：low / medium / high
- **前置**：依賴哪個 task ID（無 = 可立即做）
- **範圍**：明確的檔案 / 表 / function 清單
- **驗證**：怎麼確認做完
- **不要做**：明確不要擴大的部分

**挑 task 規則**：先做風險 low、無前置依賴、範圍最小的。

---

## 🟢 LOW 風險（agent 可自動跑）

### B-001: 整合 8 個重複 trigger function

**狀態**：pending
**風險**：low
**前置**：無
**來源**：I2 finding (2026-05-02)

**範圍**：
- DB function（不動 src）
- 已知重複 functions（同樣只做 `NEW.updated_at := now()`）：
  - `update_updated_at_column`
  - `update_ai_memories_updated_at`
  - `update_airport_images_updated_at`
  - `update_hotels_updated_at`
  - `update_image_library_updated_at`
  - `update_michelin_restaurants_updated_at`
  - `update_premium_experiences_updated_at`
  - `update_regions_updated_at`
  - `update_restaurants_updated_at`
  - `update_supplier_categories_updated_at`
  - `update_suppliers_updated_at`
  - `update_tii_updated_at`
  - `update_tour_meal_settings_updated_at`
  - `update_payment_requests_updated_at`
  - `trigger_payment_requests_updated_at`（duplicate、跟上面同表）
  - `suppliers_updated_at_trigger`（duplicate）

**做法**：
1. 寫 migration `20260503???_consolidate_updated_at_triggers.sql`
2. 對每張用上面變體 function 的 trigger、改成用 `set_updated_at()`（已是憲法標準）
3. DROP 上面的變體 function
4. 不動 trigger 名稱、只動 trigger function reference

**驗證**：
- 所有業務表的 `*_updated_at` trigger 都呼叫 `set_updated_at()`
- 重複的變體 function 都已 DROP
- 抽查：UPDATE 一筆業務表 row、確認 updated_at 自動更新
- type-check 0 errors、守門 11/11

**不要做**：
- 不動 trigger 名稱
- 不動其他 trigger function（只動「同樣只做 NEW.updated_at := now()」的變體）
- 不動憲法 §16 凍結模組的 trigger

---

### B-002: payment_requests / suppliers 表 duplicate trigger 清理

**狀態**：pending
**風險**：low
**前置**：B-001（先整合 function 再砍 duplicate trigger）
**來源**：I2 finding

**範圍**：
- `payment_requests` 表掛了 2 個 updated_at trigger（`update_payment_requests_updated_at` + `trigger_payment_requests_updated_at`）
- `suppliers` 表掛了 2 個（`suppliers_updated_at_trigger` + `update_suppliers_updated_at`）

**做法**：
1. 看哪個 trigger 名字符合命名慣例（`{table}_updated_at` 風格）
2. DROP 不合慣例的那條
3. 確認剩下那條呼叫 `set_updated_at()`（B-001 處理過）

**驗證**：
- 兩張表各只剩 1 條 updated_at trigger
- 該 trigger 用 `set_updated_at()`

---

### B-003: 缺 updated_at 欄位的兩張 log 表標例外

**狀態**：pending
**風險**：low
**前置**：無
**來源**：I2 finding

**範圍**：
- `line_messages` 跟 `quote_confirmation_logs` 是 append-only log、不需 updated_at
- 但憲法 §2「業務表必有 updated_at」沒明確列例外

**做法**：
1. 改 `docs/SCHEMA_PLAN.md`、把這兩張表標 `# 例外（append-only log、無 updated_at）`、寫理由
2. 改憲法 §2 例外段、加「append-only log 表」豁免條款

**驗證**：
- SCHEMA_PLAN 跟憲法都有對應註明
- 不動 DB schema

**不要做**：
- 不要 ALTER TABLE 加 updated_at 欄位（log 表不需要）

---

### B-004: SCHEMA_PLAN 補 line_messages / quote_confirmation_logs 例外條目

**狀態**：pending
**風險**：low
**前置**：B-003
**來源**：I2 follow-up

**範圍**：純 docs 改

跟 B-003 可合併、保持獨立避免混亂。

---

### B-005: 加 `is_active` partial index 給高頻列表表

**狀態**：pending
**風險**：low
**前置**：無
**來源**：I2 follow-up + venturo-app 標準

**範圍**：
- 對高頻列表 query 的業務表加 `(workspace_id, is_active) WHERE is_active = true` partial index
- 候選表（按行數）：
  - `customers` (385) → 高
  - `tour_itinerary_items` (404) → 高
  - `attractions` (2444) → 高
  - `hotels` (480) → 中
  - `restaurants` (275) → 中
  - `cities` (304) → 中

**做法**：
1. 寫 migration 加 partial index（`CREATE INDEX IF NOT EXISTS`）
2. 不動既有 index

**驗證**：
- DB 確認新 index 存在
- 跑 EXPLAIN 看一個典型列表 query、確認 index 被用到

**不要做**：
- 不在 0 row / log 表加 partial index（沒意義）
- 不動既有 index（可能有人在用）

---

## 🟡 MEDIUM 風險（agent 可做、但要小心驗證）

### B-006: 加 composite index `(workspace_id, status)` 給 status 常 filter 表

**狀態**：pending
**風險**：medium（影響 query plan、可能變慢某些 query）
**前置**：無
**來源**：I2 follow-up

**範圍**：
- `tours.status` / `orders.status` / `payment_requests.status` 等常 filter

**做法**：
1. 先用 `pg_stat_statements` 看實際 query 是不是 status filter（可能要 production data 才看得到）
2. 如果沒 production data → 標 `human-review needed`、不自動做

**驗證**：
- 加完 index 跑 EXPLAIN ANALYZE 看是否 plan 變好
- 沒明顯 regression

---

### B-007: 5 份 deprecated standards docs 整合進憲法或刪

**狀態**：pending
**風險**：medium（doc 砍錯可能誤導）
**前置**：無
**來源**：I3 follow-up（已標 deprecated、未真正合併）

**範圍**：
- `docs/NAMING_CONVENTION_STANDARD.md`
- `docs/DATABASE_DESIGN_STANDARDS.md`
- `docs/CODE_STANDARDS.md`
- `docs/ARCHITECTURE_STANDARDS.md`
- 已 archived 的 `docs/archive/DEV_STANDARDS.md` 不動

**做法**：
1. 對每份 deprecated doc 的「仍有效部分」、判斷：
   - 真該寫進憲法 → 整合
   - 過期 → 移到 archive
2. 移 archive 後、把 README 跟憲法的引用更新

**驗證**：
- 沒 deprecated doc 還在 active 狀態
- 憲法引用都活的

---

### B-008: G2 audit 的 4 個遺留人類問題清

**狀態**：pending
**風險**：medium
**前置**：無
**來源**：G2 finding

**範圍**：
- 看 `docs/_session/_user_id_naming_audit.md` 提到的 3 個異常 finding
- 確認它們是否仍存在

**做法**：
1. 重跑 audit
2. 對殘留 finding 提出修法
3. 風險高的標 `needs_human`

---

## 🔴 HIGH 風險 / 需人類介入（agent 不該自動做）

### C-001: God component 拆解（tour-itinerary-tab.tsx 1908 行 等）

**狀態**：blocked
**風險**：high
**理由**：
- 沒 e2e 守住
- UI 行為改錯不會 type-check 抓到
- 拆完可能 break 視覺 / 互動
**建議**：先寫 e2e、再拆

---

### C-002: God component 拆解（tour-detail-view.tsx 1400+ 行）

同 C-001。

---

### C-003: 凍結模組解凍

**狀態**：blocked（凍結中）
**理由**：憲法 §16、業務面拍板才能解凍

---

### C-004: e2e smoke test 自動化

**狀態**：pending
**風險**：medium-high（要寫真實 UI 互動 test）
**前置**：無
**理由**：值得做但工程量大、人類介入比較好決定 test scope

---

### C-005: bundle size / 慢 query 優化

**狀態**：blocked（要 production data）
**理由**：沒上線資料、agent 沒辦法決定優化什麼

---

## ✅ 已完成（agent 不要再挑）

下列 task ID 已完成、保留歷史紀錄：

- E1：is_super_admin + employees user_id 同步
- E2：21 表 RLS 4-policy
- E3：22+3 P0 admin client 漏洞
- F1：45 P1 admin client（4 真實修 + 標合法例外）
- F2：getLayoutContext 效能
- F3：user_id 收斂（54 處）
- F4：SyncFields 全清
- F5：兩套 migration tracking 收斂
- F6：兩份 database.types 收斂
- H1：console.log 清 + escape hatch 砍 + 憲法 #19 + 守門 #19
- I1：any 清 + 憲法 #20 + 守門 #20
- I2：DB index + trigger 全表 audit + 補齊（部分 follow-up 變 B-001~B-006）
- I3：5 份 standards docs 收斂（部分 follow-up 變 B-007）
- I4：GitHub Actions standards-check workflow

---

## Backlog 維護規則

- 新 task 加進對應風險等級 section、給新 ID
- agent 完成後標 `done`、移到「已完成」
- agent 失敗後標 `blocked` + 寫 retry note 在該 task 下方
- 人類發現新優化 → 加進 backlog、不要直接派 agent
