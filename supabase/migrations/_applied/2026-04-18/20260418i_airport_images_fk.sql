-- ================================================================
-- Migration I: airport_images.airport_code → ref_airports.iata_code FK
-- ================================================================
-- Applied: 2026-04-18
--
-- Goal:
--   補 airport_images 與 ref_airports 的 SSOT 連結
--   防止未來 ref_airports 刪除時、airport_images 留孤兒照片
--
-- Pre-flight 驗證:
--   ✅ 4 筆 airport_images、4 個 airport_code 全部在 ref_airports（AOJ/CNX/KUL/NGO）
--   ✅ 零孤兒、可用 VALID FK（嚴格檢查）
--
-- Risk: 🟢 LOW（零孤兒、VALID FK 可直接加）
-- ================================================================


ALTER TABLE public.airport_images
  ADD CONSTRAINT airport_images_airport_code_fkey
  FOREIGN KEY (airport_code) REFERENCES public.ref_airports(iata_code)
  ON DELETE CASCADE;


-- ============ Reload schema ============

NOTIFY pgrst, 'reload schema';


-- ============ 驗證 ============

-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid = 'public.airport_images'::regclass AND contype = 'f';
-- 預期: 3 條 FK（workspace_id, uploaded_by, airport_code）
