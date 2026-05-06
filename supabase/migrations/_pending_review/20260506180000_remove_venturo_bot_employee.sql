-- 清掉 VENTURO 機器人員工殘留（William 拍板：機器人不該是員工）
-- 2026-05-05 已在 application 層砍掉 bot 顯示 / 過濾邏輯
-- 但 DB 還有 1 row：BOT001 「VENTURO 機器人」、in workspace 8ef05a74-1f87-48ab-afd3-9bfeb423935d
-- 也清掉 is_bot 欄位本身

-- ⚠️ DESTRUCTIVE：
-- 1. DELETE row（紅線 #0「不准 DELETE FROM 既有資料」、進 _pending_review/）
-- 2. DROP COLUMN（不可逆、column 有資料）

-- 動之前要確認：
-- - 沒其他 row 還引用這個 bot id（employees.id FK 是 ON DELETE SET NULL、不會炸、但要意識到）
-- - 應用層真的不再讀 is_bot（已驗、code 沒人讀）

-- ============================================================================

-- 1. 刪掉 BOT001 員工 row
-- 影響的 FK（ON DELETE SET NULL）：
--   * employees.id 被任何 created_by / updated_by / performed_by 等審計欄位引用 → 自動 NULL
--   * channel_messages.sender_id（user_id 路徑、跟 employees.id 不同）→ 不影響
DELETE FROM public.employees
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND is_bot = true;

-- 2. 刪 is_bot 欄位
ALTER TABLE public.employees DROP COLUMN IF EXISTS is_bot;

-- ============================================================================
-- Apply 步驟：
--   npx supabase db push  --or--
--   psql -f 此檔
-- 或用 Supabase MCP apply_migration（需 William 確認）
