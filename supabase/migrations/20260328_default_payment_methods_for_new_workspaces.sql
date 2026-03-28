-- ============================================
-- Migration: 新租戶自動建立預設收款/付款方式
-- Date: 2026-03-28
-- Author: Matthew (AI Agent)
-- ============================================

-- 建立函數：為新 workspace 建立預設收款/付款方式
CREATE OR REPLACE FUNCTION create_default_payment_methods()
RETURNS TRIGGER AS $$
BEGIN
  -- 插入 5 種收款方式
  INSERT INTO payment_methods (workspace_id, code, name, type, description, sort_order)
  VALUES 
    (NEW.id, 'CASH', '現金', 'receipt', '現金收款', 1),
    (NEW.id, 'TRANSFER', '匯款', 'receipt', '銀行轉帳', 2),
    (NEW.id, 'CREDIT_CARD', '刷卡', 'receipt', '信用卡收款', 3),
    (NEW.id, 'CHECK', '支票', 'receipt', '支票收款', 4),
    (NEW.id, 'LINKPAY', 'LinkPay', 'receipt', 'LinkPay 線上收款', 5);
  
  -- 標記 LinkPay 為需要串接（新租戶預設待設定）
  UPDATE payment_methods 
  SET requires_integration = TRUE,
      integration_type = 'linkpay',
      integration_status = 'pending'
  WHERE code = 'LINKPAY' AND workspace_id = NEW.id;
  
  -- 插入 4 種付款方式（請款用）
  INSERT INTO payment_methods (workspace_id, code, name, type, description, sort_order)
  VALUES 
    (NEW.id, 'CASH_PAYMENT', '現金', 'payment', '現金付款', 1),
    (NEW.id, 'TRANSFER_PAYMENT', '匯款', 'payment', '銀行轉帳付款', 2),
    (NEW.id, 'CARD_PAYMENT', '刷卡', 'payment', '信用卡付款', 3),
    (NEW.id, 'CHECK_PAYMENT', '支票', 'payment', '支票付款', 4);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 建立 trigger：當 workspace 建立時自動執行
DROP TRIGGER IF EXISTS trg_create_default_payment_methods ON workspaces;
CREATE TRIGGER trg_create_default_payment_methods
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION create_default_payment_methods();

-- 補齊既有 workspace 的預設收款方式（如果沒有的話）
DO $$
DECLARE
  ws RECORD;
  method_count INT;
BEGIN
  FOR ws IN SELECT id FROM workspaces LOOP
    -- 檢查這個 workspace 有沒有收款方式
    SELECT COUNT(*) INTO method_count 
    FROM payment_methods 
    WHERE workspace_id = ws.id AND type = 'receipt';
    
    IF method_count = 0 THEN
      -- 插入預設收款方式
      INSERT INTO payment_methods (workspace_id, code, name, type, description, sort_order)
      VALUES 
        (ws.id, 'CASH', '現金', 'receipt', '現金收款', 1),
        (ws.id, 'TRANSFER', '匯款', 'receipt', '銀行轉帳', 2),
        (ws.id, 'CREDIT_CARD', '刷卡', 'receipt', '信用卡收款', 3),
        (ws.id, 'CHECK', '支票', 'receipt', '支票收款', 4),
        (ws.id, 'LINKPAY', 'LinkPay', 'receipt', 'LinkPay 線上收款', 5);
      
      -- 標記 LinkPay 需要串接
      UPDATE payment_methods 
      SET requires_integration = TRUE,
          integration_type = 'linkpay',
          integration_status = 'pending'
      WHERE code = 'LINKPAY' AND workspace_id = ws.id;
    END IF;
    
    -- 檢查付款方式
    SELECT COUNT(*) INTO method_count 
    FROM payment_methods 
    WHERE workspace_id = ws.id AND type = 'payment';
    
    IF method_count = 0 THEN
      INSERT INTO payment_methods (workspace_id, code, name, type, description, sort_order)
      VALUES 
        (ws.id, 'CASH_PAYMENT', '現金', 'payment', '現金付款', 1),
        (ws.id, 'TRANSFER_PAYMENT', '匯款', 'payment', '銀行轉帳付款', 2),
        (ws.id, 'CARD_PAYMENT', '刷卡', 'payment', '信用卡付款', 3),
        (ws.id, 'CHECK_PAYMENT', '支票', 'payment', '支票付款', 4);
    END IF;
  END LOOP;
END $$;

-- 驗證
SELECT workspace_id, type, COUNT(*) as count
FROM payment_methods
GROUP BY workspace_id, type
ORDER BY workspace_id, type;
