-- 統一 thumbnail 和 images 欄位：把 thumbnail 合併進 images[0]，然後刪除 thumbnail 欄位
-- 適用於 attractions、hotels、restaurants、michelin_restaurants 四個表

-- Step 1: 把 thumbnail 有值但不在 images 裡的，插到 images 最前面
UPDATE attractions
SET images = CASE
  WHEN thumbnail IS NOT NULL AND (images IS NULL OR array_length(images, 1) IS NULL)
    THEN ARRAY[thumbnail]
  WHEN thumbnail IS NOT NULL AND NOT (thumbnail = ANY(images))
    THEN ARRAY[thumbnail] || images
  WHEN thumbnail IS NOT NULL AND thumbnail = ANY(images)
    THEN ARRAY[thumbnail] || array_remove(images, thumbnail)
  ELSE images
END,
updated_at = now()
WHERE thumbnail IS NOT NULL;

UPDATE hotels
SET images = CASE
  WHEN thumbnail IS NOT NULL AND (images IS NULL OR array_length(images, 1) IS NULL)
    THEN ARRAY[thumbnail]
  WHEN thumbnail IS NOT NULL AND NOT (thumbnail = ANY(images))
    THEN ARRAY[thumbnail] || images
  WHEN thumbnail IS NOT NULL AND thumbnail = ANY(images)
    THEN ARRAY[thumbnail] || array_remove(images, thumbnail)
  ELSE images
END,
updated_at = now()
WHERE thumbnail IS NOT NULL;

UPDATE restaurants
SET images = CASE
  WHEN thumbnail IS NOT NULL AND (images IS NULL OR array_length(images, 1) IS NULL)
    THEN ARRAY[thumbnail]
  WHEN thumbnail IS NOT NULL AND NOT (thumbnail = ANY(images))
    THEN ARRAY[thumbnail] || images
  WHEN thumbnail IS NOT NULL AND thumbnail = ANY(images)
    THEN ARRAY[thumbnail] || array_remove(images, thumbnail)
  ELSE images
END,
updated_at = now()
WHERE thumbnail IS NOT NULL;

UPDATE michelin_restaurants
SET images = CASE
  WHEN thumbnail IS NOT NULL AND (images IS NULL OR array_length(images, 1) IS NULL)
    THEN ARRAY[thumbnail]
  WHEN thumbnail IS NOT NULL AND NOT (thumbnail = ANY(images))
    THEN ARRAY[thumbnail] || images
  WHEN thumbnail IS NOT NULL AND thumbnail = ANY(images)
    THEN ARRAY[thumbnail] || array_remove(images, thumbnail)
  ELSE images
END,
updated_at = now()
WHERE thumbnail IS NOT NULL;

-- Step 2: 刪除 thumbnail 欄位
ALTER TABLE attractions DROP COLUMN IF EXISTS thumbnail;
ALTER TABLE hotels DROP COLUMN IF EXISTS thumbnail;
ALTER TABLE restaurants DROP COLUMN IF EXISTS thumbnail;
ALTER TABLE michelin_restaurants DROP COLUMN IF EXISTS thumbnail;
