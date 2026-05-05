-- ============================================================================
-- 2026-05-05 William 拍板：員工機器人系統整套砍除
-- ============================================================================
-- 範圍：
--   1. 砍掉所有 workspace 的 bot 員工資料（is_bot=true 的 row）
--   2. DROP COLUMN employees.is_bot
--   3. DROP COLUMN employees.employee_type
--   4. DROP TABLE notifications（通知概念重做、舊表清掉）
--   5. 砍 workspace_features 的 bot_line / bot_telegram
--
-- 風險：紅線 #0 — DROP COLUMN with data + DROP TABLE、不可逆
-- 為何：機器人原本就不該是員工、SSOT 不乾淨、通知概念重做
--
-- 須由 William 審核資料殘留後再決定 apply
-- ============================================================================

BEGIN;

-- 1. 砍 bot 員工 row（先刪資料、再 DROP COLUMN）
DELETE FROM public.employees
WHERE is_bot = true
   OR employee_type = 'bot'
   OR employee_number = 'BOT001'
   OR id = '00000000-0000-0000-0000-000000000001';

-- 2. DROP 員工的 bot 相關欄位
ALTER TABLE public.employees
  DROP COLUMN IF EXISTS is_bot;

ALTER TABLE public.employees
  DROP COLUMN IF EXISTS employee_type;

-- 3. DROP notifications 表（舊通知系統、之後重做）
DROP TABLE IF EXISTS public.notifications CASCADE;

-- 4. 砍 workspace_features 的 bot 相關 feature flags
DELETE FROM public.workspace_features
WHERE feature_code IN ('bot_line', 'bot_telegram');

DELETE FROM public.features
WHERE code IN ('bot_line', 'bot_telegram');

COMMIT;
