-- ================================================================
-- Migration: 修 workspaces FORCE RLS 阻擋登入的問題
-- ================================================================
-- Applied: 2026-04-20
--
-- 症狀：登入時 API 回「找不到此代號」、即使 CORNER workspace 存在
--
-- 根因：
--   20260405500000_fix_rls_medium_risk_tables.sql 對 workspaces 下：
--     ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
--     ALTER TABLE workspaces FORCE ROW LEVEL SECURITY;  ← 這行太嚴
--
--   FORCE RLS 會讓 service_role 也受 policy 限制。
--   policy 是 `(id = get_current_user_workspace())`、登入前沒 workspace、返回 null。
--   所以 /api/auth/validate-login 的 admin client 查不到 workspace、登入全部失敗。
--
-- 解法：
--   只拿掉 FORCE RLS、保留 RLS + 原有 policy。
--   效果：
--     - 一般 authenticated 用戶：依然只能看自己 workspace（policy 還在）
--     - service_role（admin client）：可繞 RLS 做 login lookup（正確行為）
--     - anon：依然完全擋（沒 policy）
--
-- 驗證：
--   Corner / JINGYAO / YUFEN / TESTUX 資料行數不變
--   登入 API 應該恢復正常
-- ================================================================

ALTER TABLE public.workspaces NO FORCE ROW LEVEL SECURITY;

-- 驗證
DO $$
DECLARE
  force_rls boolean;
BEGIN
  SELECT relforcerowsecurity INTO force_rls
  FROM pg_class
  WHERE relname = 'workspaces' AND relnamespace = 'public'::regnamespace;

  IF force_rls THEN
    RAISE EXCEPTION '❌ FORCE RLS 仍然 on、修改失敗';
  END IF;

  RAISE NOTICE '✅ workspaces FORCE RLS 已關閉、service_role 可正常 login 查詢';
END $$;
