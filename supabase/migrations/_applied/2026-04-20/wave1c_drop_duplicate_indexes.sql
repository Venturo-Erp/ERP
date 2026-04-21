-- ============================================================
-- Wave 1c: 清 4 條重複 / 未使用 index
-- 判定依據：pg_stat_user_indexes.idx_scan（實戰被查幾次）
-- 策略：DROP 沒被用的那份、保留實戰的（名字醜無所謂）
--
-- 1. idx_customers_code (scan=0、UNIQUE customers_code_key 已罩)
-- 2. idx_order_members_order (scan=0、_order_id 版本 scan=84)
-- 3. idx_tours_controller_id (scan=0、_controller 版本 scan=14)
-- 4. idx_tours_departure_date (scan=0、_start_date 版本 scan=77)
--
-- 執行方式：Management API 逐條（DROP INDEX CONCURRENTLY 需 transaction 外）
-- 執行時間：2026-04-20 23:15
-- ============================================================

DROP INDEX CONCURRENTLY IF EXISTS public.idx_customers_code;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_order_members_order;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_tours_controller_id;
DROP INDEX CONCURRENTLY IF EXISTS public.idx_tours_departure_date;
