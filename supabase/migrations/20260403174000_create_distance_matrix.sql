-- 距離矩陣表 - 用於清邁景點路線優化
-- 一次性計算所有景點間的距離，避免重複呼叫 Google Maps API

BEGIN;

-- ============================================
-- 1. distance_matrix 表
-- ============================================
CREATE TABLE IF NOT EXISTS public.distance_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL DEFAULT '清邁',
  from_destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  to_destination_id UUID NOT NULL REFERENCES public.destinations(id) ON DELETE CASCADE,
  
  -- 距離與時間
  distance_km DECIMAL(10, 2),  -- 公里
  duration_minutes INTEGER,     -- 分鐘
  
  -- Google Maps API 原始資料（保留備查）
  raw_response JSONB,
  
  -- 計算時間
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- 唯一約束：同一城市的兩個景點只能有一條記錄
  UNIQUE(city, from_destination_id, to_destination_id)
);

-- 索引優化（快速查詢）
CREATE INDEX IF NOT EXISTS idx_distance_matrix_city 
  ON public.distance_matrix(city);

CREATE INDEX IF NOT EXISTS idx_distance_matrix_from 
  ON public.distance_matrix(from_destination_id);

CREATE INDEX IF NOT EXISTS idx_distance_matrix_to 
  ON public.distance_matrix(to_destination_id);

CREATE INDEX IF NOT EXISTS idx_distance_matrix_from_to 
  ON public.distance_matrix(from_destination_id, to_destination_id);

-- ============================================
-- 2. RLS 政策（內部工具全開）
-- ============================================
ALTER TABLE public.distance_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "distance_matrix_public_read" 
  ON public.distance_matrix
  FOR SELECT USING (true);

CREATE POLICY "distance_matrix_service_write" 
  ON public.distance_matrix
  FOR ALL USING (true);

-- ============================================
-- 3. 查詢函數：取得兩點間距離
-- ============================================
CREATE OR REPLACE FUNCTION public.get_distance_between(
  p_from_id UUID,
  p_to_id UUID
) RETURNS TABLE (
  distance_km DECIMAL,
  duration_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dm.distance_km,
    dm.duration_minutes
  FROM public.distance_matrix dm
  WHERE 
    dm.from_destination_id = p_from_id
    AND dm.to_destination_id = p_to_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 4. 批次查詢函數：取得多點距離（用於路線優化）
-- ============================================
CREATE OR REPLACE FUNCTION public.get_distance_matrix_for_route(
  p_destination_ids UUID[]
) RETURNS TABLE (
  from_id UUID,
  to_id UUID,
  distance_km DECIMAL,
  duration_minutes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dm.from_destination_id AS from_id,
    dm.to_destination_id AS to_id,
    dm.distance_km,
    dm.duration_minutes
  FROM public.distance_matrix dm
  WHERE 
    dm.from_destination_id = ANY(p_destination_ids)
    AND dm.to_destination_id = ANY(p_destination_ids);
END;
$$ LANGUAGE plpgsql STABLE;

COMMIT;

-- ============================================
-- 註解
-- ============================================
COMMENT ON TABLE public.distance_matrix IS '清邁景點距離矩陣（一次性計算，節省 Google Maps API 成本）';
COMMENT ON COLUMN public.distance_matrix.distance_km IS '兩景點間的駕車距離（公里）';
COMMENT ON COLUMN public.distance_matrix.duration_minutes IS '兩景點間的駕車時間（分鐘）';
COMMENT ON COLUMN public.distance_matrix.raw_response IS 'Google Maps API 原始回應（JSONB 格式）';
COMMENT ON FUNCTION public.get_distance_between IS '查詢兩個景點間的距離與時間';
COMMENT ON FUNCTION public.get_distance_matrix_for_route IS '批次查詢多個景點間的距離矩陣（用於路線優化）';
