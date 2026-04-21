-- ============================================================
-- Bug fix: payment_request_items.payment_method vs payment_method_id schema drift
-- Executed via Management API: 2026-04-21
--
-- 問題：
--   - DB column: payment_method (text, DEFAULT 'transfer'::text)
--   - Code 全部用 payment_method_id (想存 uuid、指 payment_methods.id)
--   - addItem/addItems 甚至沒把 payment_method_id 放進 insert
--   - 結果：用戶選付款方式被忽略、所有 item DB 值都是 default 'transfer'
--
-- 修法 C：加新欄位 payment_method_id uuid、backfill 舊 'transfer' → TRANSFER_OUT UUID
-- 不動舊 payment_method 欄位（留著 Post-Launch 再 DROP）
--
-- 同時補 CNX260524A-I01 的 order_id / order_number（orders.ts 壞時沒選成功）
-- ============================================================

-- 1. 加新欄位
ALTER TABLE public.payment_request_items
  ADD COLUMN IF NOT EXISTS payment_method_id uuid REFERENCES public.payment_methods(id) ON DELETE SET NULL;

-- 2. 清除舊欄位的 DEFAULT（避免未來新 insert 繼續填 'transfer'）
ALTER TABLE public.payment_request_items
  ALTER COLUMN payment_method DROP DEFAULT;

-- 3. Backfill：'transfer' → TRANSFER_OUT (d6e2b71f-0d06-4119-9047-c709f31dfc31, 匯款, type=payment)
--    只寫新欄位、不改舊 payment_method 值（符合紅線）
UPDATE public.payment_request_items
SET payment_method_id = 'd6e2b71f-0d06-4119-9047-c709f31dfc31'::uuid
WHERE payment_method = 'transfer'
  AND payment_method_id IS NULL;

-- 4. 補 CNX260524A-I01 的 order_id / order_number（orders.ts bug 造成的遺漏）
--    該團只有一筆訂單、明確對應
UPDATE public.payment_requests
SET
  order_id = '7fc75237-5f5e-408d-83ba-81e42e598aa5'::uuid,
  order_number = 'CNX260524A-O01'
WHERE code = 'CNX260524A-I01'
  AND order_id IS NULL;
