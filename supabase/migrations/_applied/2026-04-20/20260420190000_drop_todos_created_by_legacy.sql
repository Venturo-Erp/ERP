-- 殘留 #1：todos.created_by_legacy 是 2026-01-12 DB 重建的過渡欄位
-- 跟 created_by 並存、NOT NULL 無 default、導致 INSERT todos 都會被擋
-- 2026-04-20 決策：把 legacy 的值搬進 created_by、DROP 整個欄位
--
-- 已於 2026-04-20 透過 Management API 執行於 prod（wzvwmawpkapcmkfmkvav）

BEGIN;

UPDATE public.todos SET created_by = created_by_legacy
WHERE created_by IS NULL AND created_by_legacy IS NOT NULL;

ALTER TABLE public.todos DROP CONSTRAINT IF EXISTS todos_creator_fkey;
ALTER TABLE public.todos DROP COLUMN IF EXISTS created_by_legacy;

COMMIT;
