-- ========================================================================
-- 死資料與雙胞胎表處理（⚠️ DRAFT — 須人工審查後才執行）
-- Generated: 2026-04-17
-- Source: database-optimizer 第二輪診斷
--
-- 🛑 紅線警告：帝王於 2026-04-17 明確設定「Supabase 資料絕對不動」鐵律。
-- 本 DRAFT 含有「動到 12,144 列 ref_airports_backup 資料」的動作。
-- 執行前必須：
--   1. 帝王親口確認每一條
--   2. 確認備份完整（~/venturo-backups/2026-04-17/ 已有 ref_airports_backup.json 4.3 MB）
--   3. 確認 rollback 路徑
--
-- ⚠️ 此 SQL 非 idempotent、且會動到有資料的表
-- 帝王必須逐條確認後才執行（尤其是 DROP / MERGE 類）
-- ========================================================================

-- ---------------------------------------------------------
-- Section 1: ref_airports_backup（12,144 列、seq_scan=2、純死資料）
-- ---------------------------------------------------------
-- 選項 A（保守）：搬到 _archive
ALTER TABLE IF EXISTS public."ref_airports_backup" SET SCHEMA _archive;

-- 選項 B（激進）：直接 DROP（備份已存 ~/venturo-backups/2026-04-17/data/ref_airports_backup.json）
-- DROP TABLE IF EXISTS public."ref_airports_backup";  -- ⚠️ 帝王確認備份還原路徑後才解註


-- ---------------------------------------------------------
-- Section 2: 雙胞胎表（merge 需人工判斷保留哪張）
-- ---------------------------------------------------------

-- 🔍 先診斷：各雙胞胎的 row 數與 column 差異
-- 跑以下 query 看結果再決定：
--
-- SELECT
--   (SELECT count(*) FROM public.my_tours) AS my_tours_rows,
--   (SELECT count(*) FROM public.my_erp_tours) AS my_erp_tours_rows;
--
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name IN ('my_tours', 'my_erp_tours')
-- ORDER BY table_name, ordinal_position;

-- 候選對：
--   ref_airports ↔ ref_airports_backup          (backup 已於 Section 1 處理)
--   my_tours ↔ my_erp_tours                     (TODO)
--   trip_members ↔ trip_members_v2              (TODO)
--   tour_rooms ↔ tour_rooms_status              (TODO)
--   driver_tasks ↔ driver_tasks_today           (TODO)
--   brochure ↔ brochures（pages 層發現，不確定 DB 有無對應）

-- 建議流程（每對雙胞胎）：
-- 1. 比對 row count
-- 2. 比對 columns（找 superset）
-- 3. 找前端 consumer（Grep 程式碼）
-- 4. 用 view 建 alias，讓 code 可以繼續用舊名
-- 5. 雙寫期跑 2-4 週
-- 6. 砍舊表


-- ---------------------------------------------------------
-- Section 3: _backup / _v2 / _today / _status 類命名的歸檔建議
-- ---------------------------------------------------------
-- 以下所有 *_backup 命名的表建議都進 _archive（如果還沒進的話）
-- 跑這個診斷：
--
-- SELECT relname, n_live_tup, seq_scan, idx_scan
-- FROM pg_stat_user_tables
-- WHERE schemaname = 'public'
--   AND (relname LIKE '%_backup' OR relname LIKE '%_v1' OR relname LIKE '%_old')
-- ORDER BY relname;


-- ---------------------------------------------------------
-- Section 4: 回滾機制
-- ---------------------------------------------------------
-- 所有 SET SCHEMA _archive 的表，可用下列語法還原：
-- ALTER TABLE _archive."ref_airports_backup" SET SCHEMA public;
-- DROP 的表則需從備份 ~/venturo-backups/2026-04-17/data/{table}.json 還原（較複雜）


-- ========================================================================
-- 執行順序建議
-- ========================================================================
-- 1. 先跑空表 archive（20260418000000_archive_empty_tables.sql）
-- 2. 再跑 FK index（20260418010000_add_missing_fk_indexes.sql）
-- 3. 驗證 UI 零感知（Playwright / 手動巡邏）
-- 4. 才動此 DRAFT（處理雙胞胎 + 死資料）
-- 5. 每改一張雙胞胎就觀察一週，才動下一張
