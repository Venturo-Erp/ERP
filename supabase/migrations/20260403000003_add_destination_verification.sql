-- 景點資料確認欄位

BEGIN;

-- ============================================
-- 新增確認相關欄位
-- ============================================
ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT,
  ADD COLUMN IF NOT EXISTS opening_hours TEXT,
  ADD COLUMN IF NOT EXISTS ticket_price TEXT,
  ADD COLUMN IF NOT EXISTS suggested_duration_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS images TEXT[], -- 改為陣列（多張圖片）
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending', -- pending/reviewing/verified
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- 移除舊的 image_url（改用 images 陣列）
-- ALTER TABLE public.destinations DROP COLUMN IF EXISTS image_url;

-- 索引
CREATE INDEX IF NOT EXISTS idx_destinations_verification_status 
  ON public.destinations(verification_status);

-- ============================================
-- 確認狀態檢查函數
-- ============================================
CREATE OR REPLACE FUNCTION public.check_destination_completeness(dest_id UUID)
RETURNS JSONB AS $$
DECLARE
  dest RECORD;
  missing_fields TEXT[] := ARRAY[]::TEXT[];
  is_complete BOOLEAN := true;
BEGIN
  SELECT * INTO dest FROM public.destinations WHERE id = dest_id;
  
  IF dest IS NULL THEN
    RETURN jsonb_build_object('error', 'Destination not found');
  END IF;
  
  -- 檢查必填欄位
  IF dest.google_maps_url IS NULL OR dest.google_maps_url = '' THEN
    missing_fields := array_append(missing_fields, 'google_maps_url');
    is_complete := false;
  END IF;
  
  IF dest.description IS NULL OR length(dest.description) < 100 THEN
    missing_fields := array_append(missing_fields, 'description');
    is_complete := false;
  END IF;
  
  IF dest.images IS NULL OR array_length(dest.images, 1) < 3 THEN
    missing_fields := array_append(missing_fields, 'images');
    is_complete := false;
  END IF;
  
  IF dest.latitude IS NULL OR dest.longitude IS NULL THEN
    missing_fields := array_append(missing_fields, 'coordinates');
    is_complete := false;
  END IF;
  
  RETURN jsonb_build_object(
    'is_complete', is_complete,
    'missing_fields', missing_fields,
    'completion_percentage', 
      CASE 
        WHEN array_length(missing_fields, 1) IS NULL THEN 100
        ELSE 100 - (array_length(missing_fields, 1) * 25)
      END
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 批量檢查完整度
-- ============================================
CREATE OR REPLACE FUNCTION public.get_destinations_verification_summary()
RETURNS JSONB AS $$
DECLARE
  total_count INTEGER;
  verified_count INTEGER;
  pending_count INTEGER;
  reviewing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM public.destinations;
  
  SELECT COUNT(*) INTO verified_count 
  FROM public.destinations 
  WHERE verification_status = 'verified';
  
  SELECT COUNT(*) INTO pending_count 
  FROM public.destinations 
  WHERE verification_status = 'pending';
  
  SELECT COUNT(*) INTO reviewing_count 
  FROM public.destinations 
  WHERE verification_status = 'reviewing';
  
  RETURN jsonb_build_object(
    'total', total_count,
    'verified', verified_count,
    'pending', pending_count,
    'reviewing', reviewing_count,
    'completion_percentage', 
      CASE 
        WHEN total_count = 0 THEN 0
        ELSE (verified_count::FLOAT / total_count::FLOAT * 100)::INTEGER
      END
  );
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================
-- 註解
-- ============================================
COMMENT ON COLUMN public.destinations.verification_status IS '確認狀態：pending（待確認）/ reviewing（確認中）/ verified（已確認）';
COMMENT ON COLUMN public.destinations.verified_by IS '確認者（員工 ID）';
COMMENT ON COLUMN public.destinations.verified_at IS '確認時間';
COMMENT ON COLUMN public.destinations.suggested_duration_minutes IS '建議停留時間（分鐘）';
COMMENT ON FUNCTION public.check_destination_completeness IS '檢查景點資料完整度';
COMMENT ON FUNCTION public.get_destinations_verification_summary IS '取得景點確認進度摘要';
