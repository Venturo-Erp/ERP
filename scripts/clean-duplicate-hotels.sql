-- 清理 hotels 表的重複資料
-- 保留每家飯店較新的那一筆（根據 created_at）

-- Step 1: 檢視要刪除的資料（DRY RUN）
SELECT 
    h1.id as "將被刪除的 ID",
    h1.name,
    h1.english_name,
    h1.created_at as "舊建立時間",
    h2.created_at as "新建立時間"
FROM hotels h1
INNER JOIN hotels h2 
    ON h1.name = h2.name 
    AND h1.english_name = h2.english_name
    AND h1.created_at < h2.created_at
ORDER BY h1.name;

-- Step 2: 實際刪除（執行前請先跑 Step 1 確認）
-- DELETE FROM hotels h1
-- USING hotels h2
-- WHERE h1.name = h2.name 
--     AND h1.english_name = h2.english_name
--     AND h1.created_at < h2.created_at;

-- Step 3: 驗證結果
-- SELECT name, english_name, COUNT(*) as count 
-- FROM hotels 
-- GROUP BY name, english_name 
-- HAVING COUNT(*) > 1;
