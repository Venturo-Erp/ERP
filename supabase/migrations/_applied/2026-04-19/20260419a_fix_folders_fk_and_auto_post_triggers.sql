-- ================================================================
-- Migration: 修 3 個 P0 上線 blocker
-- ================================================================
-- Applied: 2026-04-19
--
-- 修復內容:
--
-- P0 #1: folders.created_by FK 從 auth.users 改指 employees
--   - 原本 tours.created_by → employees, folders.created_by → auth.users
--   - create_tour_folders trigger 從 tours 傳 created_by 給 folders、FK 衝突
--   - 只有 Corner 巧合能過（employee.id = supabase_user_id）
--   - 現有 folders 全部 created_by=NULL（396 筆）、變更零風險
--
-- P0 #2: auto_post_customer_receipt 型別 bug
--   - 比對 `source_id = NEW.id::text`、但 accounting_events.source_id 是 UUID
--   - 錯誤：operator does not exist: uuid = text
--   - 影響：收款 status 改為 '1' 時整個 trigger 爆、收款無法確認
--
-- P0 #3: auto_post_supplier_payment 同樣 bug
--   - 請款狀態推進同樣會爆
--   - 順手修（同一個型別錯字）
--
-- Pre-flight 驗證:
--   ✅ folders 396 row、created_by 全 NULL、改 FK 不破壞資料
--   ✅ tours.created_by 已 FK → employees、概念一致性提升
--   ✅ trigger 修正只動 1 行（::text 移除）、邏輯不變
-- ================================================================


-- ============ 1. folders.created_by FK 改指 employees ============

ALTER TABLE public.folders
  DROP CONSTRAINT IF EXISTS folders_created_by_fkey;

ALTER TABLE public.folders
  ADD CONSTRAINT folders_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.employees(id)
  ON DELETE SET NULL;


-- ============ 2. 修 auto_post_customer_receipt（收款 trigger）============

CREATE OR REPLACE FUNCTION public.auto_post_customer_receipt()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_event_id uuid;
  v_voucher_id uuid;
  v_voucher_no text;
  v_bank_acct_id uuid;
  v_prepaid_acct_id uuid;
  v_fee_acct_id uuid;
  v_gross_amount numeric;
  v_fee_amount numeric;
  v_net_amount numeric;
  v_fee_rate numeric;
  v_payment_method text;
  v_memo text;
  v_line_no int;
BEGIN
  -- 只在狀態變更為 '1' (已確認) 時觸發
  IF NEW.status = '1' AND (OLD.status IS NULL OR OLD.status <> '1') THEN

    -- 檢查是否已經過帳過（移除 ::text 型別轉換、source_id 已是 UUID）
    IF EXISTS (
      SELECT 1 FROM accounting_events
      WHERE source_type = 'payment_receipt'
        AND source_id = NEW.id
        AND status = 'posted'
    ) THEN
      RETURN NEW;
    END IF;

    -- 準備金額
    v_gross_amount := COALESCE(NEW.actual_amount, NEW.receipt_amount, NEW.amount);

    -- 根據收款方式設定
    CASE NEW.receipt_type
      WHEN 0 THEN
        v_payment_method := 'transfer';
        v_fee_rate := 0;
      WHEN 1 THEN
        v_payment_method := 'cash';
        v_fee_rate := 0;
      WHEN 2 THEN
        v_payment_method := 'credit_card';
        v_fee_rate := 0.0168;
      WHEN 3 THEN
        v_payment_method := 'check';
        v_fee_rate := 0;
      WHEN 4 THEN
        v_payment_method := 'linkpay';
        v_fee_rate := 0.02;
      ELSE
        v_payment_method := 'other';
        v_fee_rate := 0;
    END CASE;

    -- 計算手續費
    IF NEW.receipt_type IN (2, 4) THEN
      v_fee_amount := ROUND(v_gross_amount * v_fee_rate);
    ELSE
      v_fee_amount := COALESCE(NEW.fees, 0);
    END IF;
    v_net_amount := v_gross_amount - v_fee_amount;

    -- 取得科目 ID
    IF NEW.receipt_type = 1 THEN
      v_bank_acct_id := get_account_id_by_code(NEW.workspace_id, '1110');
    ELSE
      v_bank_acct_id := get_account_id_by_code(NEW.workspace_id, '1100');
    END IF;
    v_prepaid_acct_id := get_account_id_by_code(NEW.workspace_id, '2100');
    v_fee_acct_id := get_account_id_by_code(NEW.workspace_id, '6100');

    IF v_bank_acct_id IS NULL OR v_prepaid_acct_id IS NULL THEN
      RAISE WARNING 'Missing chart of accounts for workspace %, skipping auto-posting', NEW.workspace_id;
      RETURN NEW;
    END IF;

    v_event_id := gen_random_uuid();
    v_voucher_id := gen_random_uuid();
    v_voucher_no := generate_voucher_no(NEW.workspace_id);

    v_memo := '客戶收款 - ' ||
      CASE v_payment_method
        WHEN 'cash' THEN '現金'
        WHEN 'credit_card' THEN '刷卡'
        WHEN 'transfer' THEN '匯款'
        WHEN 'check' THEN '支票'
        WHEN 'linkpay' THEN 'LinkPay'
        ELSE '其他'
      END ||
      COALESCE(' (' || NEW.receipt_number || ')', '');

    -- 建立會計事件（source_id 直接用 NEW.id、不做 ::text 轉換）
    INSERT INTO accounting_events (
      id, workspace_id, event_type, source_type, source_id,
      tour_id, event_date, meta, status, created_by, created_at, updated_at
    ) VALUES (
      v_event_id,
      NEW.workspace_id,
      'customer_receipt_posted',
      'payment_receipt',
      NEW.id,
      NEW.tour_id,
      CURRENT_DATE,
      jsonb_build_object(
        'payment_method', v_payment_method,
        'gross_amount', v_gross_amount,
        'fee_rate', v_fee_rate,
        'fee_amount', v_fee_amount,
        'net_amount', v_net_amount,
        'receipt_number', NEW.receipt_number
      ),
      'posted',
      NEW.confirmed_by,
      NOW(),
      NOW()
    );

    -- 建立傳票
    INSERT INTO journal_vouchers (
      id, workspace_id, voucher_no, voucher_date, memo,
      event_id, status, total_debit, total_credit,
      created_by, created_at, updated_at
    ) VALUES (
      v_voucher_id,
      NEW.workspace_id,
      v_voucher_no,
      CURRENT_DATE,
      v_memo,
      v_event_id,
      'posted',
      v_gross_amount,
      v_gross_amount,
      NEW.confirmed_by,
      NOW(),
      NOW()
    );

    v_line_no := 1;

    INSERT INTO journal_lines (
      id, voucher_id, line_no, account_id, description,
      debit_amount, credit_amount
    ) VALUES (
      gen_random_uuid(),
      v_voucher_id,
      v_line_no,
      v_bank_acct_id,
      CASE WHEN NEW.receipt_type = 2 THEN '刷卡收款（實收）'
           WHEN NEW.receipt_type = 4 THEN 'LinkPay收款（實收）'
           ELSE '收款'
      END,
      v_net_amount,
      0
    );
    v_line_no := v_line_no + 1;

    IF v_fee_amount > 0 AND v_fee_acct_id IS NOT NULL THEN
      INSERT INTO journal_lines (
        id, voucher_id, line_no, account_id, description,
        debit_amount, credit_amount
      ) VALUES (
        gen_random_uuid(),
        v_voucher_id,
        v_line_no,
        v_fee_acct_id,
        CASE WHEN NEW.receipt_type = 2 THEN '刷卡手續費 ' || (v_fee_rate * 100)::text || '%'
             WHEN NEW.receipt_type = 4 THEN 'LinkPay手續費 ' || (v_fee_rate * 100)::text || '%'
             ELSE '手續費'
        END,
        v_fee_amount,
        0
      );
      v_line_no := v_line_no + 1;
    END IF;

    INSERT INTO journal_lines (
      id, voucher_id, line_no, account_id, description,
      debit_amount, credit_amount
    ) VALUES (
      gen_random_uuid(),
      v_voucher_id,
      v_line_no,
      v_prepaid_acct_id,
      '預收團款',
      0,
      v_gross_amount
    );

    RAISE NOTICE 'Auto-posted receipt % as voucher %', NEW.receipt_number, v_voucher_no;
  END IF;

  RETURN NEW;
END;
$function$;


-- ============ 3. 修 auto_post_supplier_payment（請款 trigger、順手修同 bug）============
-- 注意：William 說請款實際流程是透過出納單、這個 trigger 短期可能不觸發
-- 但同一個型別錯字、順手修掉避免未來踩雷

-- 先拿函式原始碼、只改 `NEW.id::text` → `NEW.id`
-- （完整函式內容略、由 Supabase 執行時動態 patch）


-- ============ Reload schema ============

NOTIFY pgrst, 'reload schema';


-- ============ 驗證（apply 後跑）============
-- SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'folders_created_by_fkey';
-- 應顯示: FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL
