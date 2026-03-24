-- 修正顧客重複和護照驗證狀態
-- 執行方式：在 Supabase SQL Editor 執行這個腳本

-- 步驟 1：合併重複的顧客
-- 對每組重複的護照號碼，保留最早建立的，刪除其他的

DO $$
DECLARE
  dup_record RECORD;
  keep_id UUID;
  delete_ids UUID[];
BEGIN
  -- 遍歷每組重複的護照號碼
  FOR dup_record IN
    SELECT passport_number, ARRAY_AGG(id ORDER BY created_at) AS ids
    FROM customers
    WHERE workspace_id = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'
      AND passport_number IS NOT NULL
      AND passport_number != ''
    GROUP BY passport_number
    HAVING COUNT(*) > 1
  LOOP
    -- 保留第一個（最早建立的）
    keep_id := dup_record.ids[1];
    delete_ids := dup_record.ids[2:array_length(dup_record.ids, 1)];

    RAISE NOTICE '護照 %: 保留 %, 刪除 %', dup_record.passport_number, keep_id, delete_ids;

    -- 更新 order_members 的 customer_id 指向保留的顧客
    UPDATE order_members
    SET customer_id = keep_id
    WHERE customer_id = ANY(delete_ids);

    -- 刪除重複的顧客
    DELETE FROM customers
    WHERE id = ANY(delete_ids);
  END LOOP;
END $$;

-- 步驟 2：同步護照驗證狀態
-- 如果顧客有完整的護照資料（從 order_members 判斷），更新 verification_status = 'verified'

UPDATE customers c
SET verification_status = 'verified'
WHERE c.workspace_id = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'
  AND c.verification_status != 'verified'
  AND EXISTS (
    SELECT 1
    FROM order_members om
    WHERE om.customer_id = c.id
      AND om.passport_number IS NOT NULL
      AND om.passport_name IS NOT NULL
      AND om.passport_expiry IS NOT NULL
      AND LENGTH(om.passport_number) >= 8
  );

-- 顯示統計
SELECT
  '合併重複' AS action,
  COUNT(DISTINCT passport_number) AS affected
FROM (
  SELECT passport_number
  FROM customers
  WHERE workspace_id = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'
    AND passport_number IS NOT NULL
    AND passport_number != ''
  GROUP BY passport_number
  HAVING COUNT(*) > 1
) AS dups

UNION ALL

SELECT
  '更新驗證狀態' AS action,
  COUNT(*) AS affected
FROM customers c
WHERE c.workspace_id = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'
  AND c.verification_status = 'verified'
  AND EXISTS (
    SELECT 1
    FROM order_members om
    WHERE om.customer_id = c.id
  );
