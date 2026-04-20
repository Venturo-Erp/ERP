-- ================================================================
-- Migration: Create rate_limit system (table + 2 functions)
-- ================================================================
-- Context: dev server log 顯示 `check_rate_limit` function 不存在
--          types.ts 有定義 rate_limits 表 + check_rate_limit + cleanup_rate_limits
--          但 Supabase DB 實際沒有（查 information_schema 確認為空）
--          → 前端 rate-limit.ts 退回 in-memory、伺服器重啟會忘、多台不共用
-- Authorized by: William on 2026-04-18「移動到 supabase 去計算對吧，那這個我允許你開始作業」
-- Risk: 🟢 純新增、不動現有資料 / row / 欄位（無任何 UPDATE / DELETE 既有 row）
-- ================================================================

-- ============ Step 1: Table ============

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INT NOT NULL DEFAULT 1,
  reset_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON public.rate_limits (reset_at);

COMMENT ON TABLE public.rate_limits IS 'Distributed rate limiter store (key → count + window reset)';

-- ============ Step 2: check_rate_limit function ============

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_limit INT,
  p_window_seconds INT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_reset_at TIMESTAMPTZ;
  v_count INT;
BEGIN
  -- Upsert pattern：若 key 不存在或已過期則重置計數、否則 +1
  INSERT INTO public.rate_limits (key, count, reset_at)
  VALUES (p_key, 1, v_now + (p_window_seconds || ' seconds')::INTERVAL)
  ON CONFLICT (key) DO UPDATE
    SET
      count = CASE
        WHEN public.rate_limits.reset_at < v_now THEN 1
        ELSE public.rate_limits.count + 1
      END,
      reset_at = CASE
        WHEN public.rate_limits.reset_at < v_now THEN v_now + (p_window_seconds || ' seconds')::INTERVAL
        ELSE public.rate_limits.reset_at
      END
  RETURNING count, reset_at INTO v_count, v_reset_at;

  -- 超過 limit 回 false（封鎖）、未超過回 true（放行）
  RETURN v_count <= p_limit;
END;
$$;

COMMENT ON FUNCTION public.check_rate_limit IS 'Distributed rate limit check; returns true if allowed, false if exceeded';

-- ============ Step 3: cleanup_rate_limits function ============

CREATE OR REPLACE FUNCTION public.cleanup_rate_limits() RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE reset_at < now();
END;
$$;

COMMENT ON FUNCTION public.cleanup_rate_limits IS 'Remove expired rate limit entries (call periodically via cron or after spikes)';

-- ============ Step 4: Grants ============

GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_rate_limits() TO service_role;

-- ============ Step 5: 驗證查詢（跑完後 manually check）============

-- SELECT proname FROM pg_proc WHERE proname IN ('check_rate_limit', 'cleanup_rate_limits');
-- 預期: 2 rows

-- SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='rate_limits';
-- 預期: 1 row

-- 測試：
-- SELECT public.check_rate_limit('test_key', 3, 60);  -- 第 1-3 次回 true
-- SELECT public.check_rate_limit('test_key', 3, 60);  -- 第 4 次回 false
-- DELETE FROM public.rate_limits WHERE key = 'test_key';  -- 清測試資料
