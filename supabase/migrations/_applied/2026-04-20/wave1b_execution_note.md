# Wave 1b 執行紀錄

**執行時間**：2026-04-20 23:05
**執行者**：Claude Code（透過 Supabase Management API）
**SQL 原檔**：`wave1b_add_missing_fk_indexes.sql`（本資料夾）

## 為什麼不走 CLI migration

- `CREATE INDEX CONCURRENTLY` 不能在 transaction 內
- `supabase db push` 會 wrap migration 成 transaction → CONCURRENTLY 失敗
- 因此改用 Management API `/v1/projects/{ref}/database/query`、每條獨立 HTTP call

## 結果

- 105 條 CREATE INDEX 讀入
- 103 條 unique（line 81 + 83 重複 `idx_receipts_payment_method_id`）
- **OK/Exist**: 104（含重複的 skip）
- **Skipped**: 2（`idx_itineraries_creator_user_id` + `idx_itineraries_created_by_legacy_user_id`、欄位 4-20 已 DROP）
- **Failed**: 0

## 驗證

```sql
SELECT count(*) FROM pg_indexes WHERE schemaname='public' AND indexname LIKE 'idx_%';
-- 結果：1028
```

## 影響

- 純新增 index、不動資料
- CONCURRENTLY、不鎖表
- 既有 query 變快、寫入多一點點 overhead（可忽略）

## CLI migration history

此執行**不會**出現在 `supabase migration list`、因為沒走 CLI。
未來若要重跑、可再用 Management API、SQL 是 idempotent（IF NOT EXISTS）。
