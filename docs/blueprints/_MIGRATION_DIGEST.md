# VENTURO Migration Digest · 週三審查日

> **用途**: 防止 `supabase/migrations/_pending_review/` 變墳場。
> **節奏**: 每週三 cron **不跑路由**、只做一件事 —— 列所有 pending migrations、整理成 William 半小時能掃完的 digest。
> **紅線**: migration 仍是只寫不跑、William 點頭才人工執行。
> **狀態**: 待第一個週三觸發。

---

## 📐 Digest 格式（cron 自動產）

```markdown
## Week of YYYY-MM-DD · Pending Migrations Digest

### Stats

- Total pending: N
- Since last digest: +M
- Oldest age: D days
- Affected tables: <list>

### Migrations (sorted by impact)

#### 1. `YYYYMMDDHHMMSS_<name>.sql`

- **Purpose**: <一句話>
- **Type**: CREATE INDEX / ADD CONSTRAINT / RENAME / ADD COLUMN / ...
- **Table**: <name>
- **Affected rows**: <SELECT COUNT estimate>
- **Similar prior**: <已跑過的類似 migration、當範例>
- **EXPLAIN output**: <若能得、貼關鍵部分>
- **Route(s) originating**: /xxx, /yyy
- **Risk**: 🟢 純加 / 🟡 加約束（需驗證無違規）/ 🔴 改結構
- **Recommendation**: RUN / DEFER / REJECT + 原因
- **Rollback plan**: <若 RUN 失敗怎麼回>
```

---

## 🚦 William 的審查決策（每條三選一）

### ✅ RUN（允許執行）

- 我在 CLI 執行 `npx supabase migration up <file>`（手動、非 cron）
- 執行前後都備份（`pg_dump` 該 table）
- 跑完把 file 搬到 `supabase/migrations/_applied/YYYY-MM-DD/`
- 在 `_DAILY_REPORT.md` 記一行

### ⏸ DEFER（延後）

- 加 comment 到 file 頭：「DEFERRED: <理由> by William <date>」
- file 留在 `_pending_review/`、下週再進 digest

### ❌ REJECT（否決）

- 加 comment 到 file 頭：「REJECTED: <理由> by William <date>」
- 搬到 `supabase/migrations/_rejected/`
- 原始觸發 route 的 Blueprint §9 標註「migration 被拒、需改方案」

---

## 📋 Digest 觸發規則（cron 判斷）

- **每週三** `0 9 * * 3` 那輪 wake（Asia/Taipei）
- **或**累積 ≥ 10 條 pending 時立即觸發（即使非週三）
- **或**單條 pending > 14 天未決、寄 alert 進 `_BLOCKED.md`

---

## 🛑 紅線再複誦

1. ❌ cron 絕不自動跑 migration
2. ❌ digest 只做「排序 + 建議」、不做「執行」
3. ❌ William 審過標 RUN 的、也是 William 人工在 CLI 跑、**不是 cron**
4. ✅ 每條 migration 執行前 `pg_dump` 備份該 table
5. ✅ 執行後驗證（SELECT COUNT / sanity check）

---

## 🗂️ 目錄結構

```
supabase/migrations/
├── _pending_review/     ← cron 寫入、digest 讀取
├── _applied/            ← William 跑完搬進來、按日期分資料夾
└── _rejected/           ← William 拒絕、保留記錄
```

---

## 📝 Round 1 實際 Digest（由 cron 寫入）

_（第一個週三觸發後、cron 寫入）_

目前 pending：1 條

- `quick_items_array_check.sql` —— ADD CONSTRAINT jsonb_typeof array（`/quotes/quick/[id]` Blueprint §6）
- 狀態：draft、未格式化、未進正式 `_pending_review/`
