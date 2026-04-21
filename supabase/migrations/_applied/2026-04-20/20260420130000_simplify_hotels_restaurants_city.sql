-- 簡化飯店/餐廳架構：city_id 改成選填
-- 沿用 2025-12-17 景點的先例（20251217120001_simplify_attractions_city.sql）
-- 允許快速新增時先不指定城市、之後再補

BEGIN;

ALTER TABLE public.restaurants
ALTER COLUMN city_id DROP NOT NULL;

ALTER TABLE public.hotels
ALTER COLUMN city_id DROP NOT NULL;

COMMENT ON COLUMN public.restaurants.city_id IS '所屬城市 ID（選填，可之後再補）';
COMMENT ON COLUMN public.hotels.city_id IS '所屬城市 ID（選填，可之後再補）';

COMMIT;
