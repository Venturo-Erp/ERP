-- ============================================
-- Venturo ERP - Supabase Database Schema
-- 自動生成時間：2025-01-15
-- ============================================

-- 啟用必要的擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 清理函數和觸發器（如果重新執行）
-- ============================================

-- 建立 updated_at 自動更新函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 核心業務表
-- ============================================

-- 員工表
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number VARCHAR(50) UNIQUE NOT NULL,
  english_name VARCHAR(100) NOT NULL,
  chinese_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  personal_info JSONB DEFAULT '{}'::JSONB,
  job_info JSONB DEFAULT '{}'::JSONB,
  salary_info JSONB DEFAULT '{}'::JSONB,
  permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
  attendance JSONB DEFAULT '{"leave_records": [], "overtime_records": []}'::JSONB,
  contracts JSONB[] DEFAULT ARRAY[]::JSONB[],
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'probation', 'leave', 'terminated')),
  avatar TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_employee_number ON employees(employee_number);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);

DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 旅遊團表
CREATE TABLE IF NOT EXISTS tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT '提案',
  location VARCHAR(255) NOT NULL,
  price NUMERIC(10, 2) DEFAULT 0,
  max_participants INTEGER DEFAULT 20,
  current_participants INTEGER DEFAULT 0,  -- 可為 null，前端可選欄位
  contract_status VARCHAR(20) DEFAULT '未簽署',
  total_revenue NUMERIC(10, 2) DEFAULT 0,
  total_cost NUMERIC(10, 2) DEFAULT 0,
  profit NUMERIC(10, 2) DEFAULT 0,
  quote_id UUID,
  quote_cost_structure JSONB,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tours_code ON tours(code);
CREATE INDEX IF NOT EXISTS idx_tours_status ON tours(status);
CREATE INDEX IF NOT EXISTS idx_tours_departure_date ON tours(departure_date);
CREATE INDEX IF NOT EXISTS idx_tours_is_active ON tours(is_active);

DROP TRIGGER IF EXISTS update_tours_updated_at ON tours;
CREATE TRIGGER update_tours_updated_at
  BEFORE UPDATE ON tours
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 訂單表
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  order_number VARCHAR(50) NOT NULL,
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  tour_name VARCHAR(255) NOT NULL,
  customer_id UUID,
  contact_person VARCHAR(100) NOT NULL,
  sales_person VARCHAR(100),
  assistant VARCHAR(100),
  member_count INTEGER DEFAULT 1,
  payment_status VARCHAR(20) DEFAULT '未收款',
  status VARCHAR(20) DEFAULT '進行中',
  total_amount NUMERIC(10, 2) DEFAULT 0,
  paid_amount NUMERIC(10, 2) DEFAULT 0,
  remaining_amount NUMERIC(10, 2) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(code);
CREATE INDEX IF NOT EXISTS idx_orders_tour_id ON orders(tour_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_is_active ON orders(is_active);

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 團員表
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),              -- 改為 name_en 符合前端
  gender VARCHAR(10),                -- 'M', 'F', ''
  birthday VARCHAR(20),              -- YYYY-MM-DD 格式字串（符合前端）
  id_number VARCHAR(50),
  passport_number VARCHAR(50),
  passport_expiry VARCHAR(20),       -- YYYY-MM-DD 格式字串（符合前端）
  phone VARCHAR(50),
  email VARCHAR(255),
  emergency_contact VARCHAR(100),
  emergency_phone VARCHAR(50),
  dietary_restrictions TEXT,
  medical_conditions TEXT,
  room_preference VARCHAR(50),
  assigned_room VARCHAR(50),
  reservation_code VARCHAR(50),      -- 新增：訂位代號
  is_child_no_bed BOOLEAN DEFAULT FALSE, -- 新增：小孩不佔床
  add_ons TEXT[],                    -- 新增：加購項目IDs
  refunds TEXT[],                    -- 新增：退費項目IDs
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_order_id ON members(order_id);
CREATE INDEX IF NOT EXISTS idx_members_tour_id ON members(tour_id);
CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);
CREATE INDEX IF NOT EXISTS idx_members_id_number ON members(id_number);
CREATE INDEX IF NOT EXISTS idx_members_passport_number ON members(passport_number);
CREATE INDEX IF NOT EXISTS idx_members_is_active ON members(is_active);

DROP TRIGGER IF EXISTS update_members_updated_at ON members;
CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 客戶表
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  notes TEXT,
  is_vip BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_is_vip ON customers(is_vip);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 財務相關表
-- ============================================

-- 付款記錄表
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT '已收款',
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_code ON payments(code);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_is_active ON payments(is_active);

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 請款單表
CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  supplier_id UUID,
  requester_id UUID NOT NULL REFERENCES employees(id),
  amount NUMERIC(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT '待審核',
  request_date DATE NOT NULL,
  payment_date DATE,
  items JSONB DEFAULT '[]'::JSONB,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_requests_code ON payment_requests(code);
CREATE INDEX IF NOT EXISTS idx_payment_requests_tour_id ON payment_requests(tour_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_supplier_id ON payment_requests(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_requester_id ON payment_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_request_date ON payment_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_payment_requests_is_active ON payment_requests(is_active);

DROP TRIGGER IF EXISTS update_payment_requests_updated_at ON payment_requests;
CREATE TRIGGER update_payment_requests_updated_at
  BEFORE UPDATE ON payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 出納單表
CREATE TABLE IF NOT EXISTS disbursement_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  payment_request_id UUID REFERENCES payment_requests(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  payment_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT '已支付',
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disbursement_orders_code ON disbursement_orders(code);
CREATE INDEX IF NOT EXISTS idx_disbursement_orders_tour_id ON disbursement_orders(tour_id);
CREATE INDEX IF NOT EXISTS idx_disbursement_orders_payment_request_id ON disbursement_orders(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_disbursement_orders_payment_date ON disbursement_orders(payment_date);
CREATE INDEX IF NOT EXISTS idx_disbursement_orders_status ON disbursement_orders(status);
CREATE INDEX IF NOT EXISTS idx_disbursement_orders_is_active ON disbursement_orders(is_active);

DROP TRIGGER IF EXISTS update_disbursement_orders_updated_at ON disbursement_orders;
CREATE TRIGGER update_disbursement_orders_updated_at
  BEFORE UPDATE ON disbursement_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 收款單表
CREATE TABLE IF NOT EXISTS receipt_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID,
  amount NUMERIC(10, 2) NOT NULL,
  receipt_date DATE NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT '已收款',
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipt_orders_code ON receipt_orders(code);
CREATE INDEX IF NOT EXISTS idx_receipt_orders_order_id ON receipt_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_receipt_orders_customer_id ON receipt_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_receipt_orders_receipt_date ON receipt_orders(receipt_date);
CREATE INDEX IF NOT EXISTS idx_receipt_orders_status ON receipt_orders(status);
CREATE INDEX IF NOT EXISTS idx_receipt_orders_is_active ON receipt_orders(is_active);

DROP TRIGGER IF EXISTS update_receipt_orders_updated_at ON receipt_orders;
CREATE TRIGGER update_receipt_orders_updated_at
  BEFORE UPDATE ON receipt_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 報價相關表
-- ============================================

-- 報價單表（對齊前端 quote.types.ts）
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID,
  customer_name VARCHAR(100),          -- 客戶姓名（冗餘欄位）
  name VARCHAR(255),                   -- 報價單名稱
  destination VARCHAR(255),            -- 目的地（對應前端）
  start_date VARCHAR(20),              -- 出發日期 YYYY-MM-DD（對應前端）
  end_date VARCHAR(20),                -- 結束日期 YYYY-MM-DD（對應前端）
  days INTEGER DEFAULT 1,              -- 天數（對應前端）
  nights INTEGER DEFAULT 0,            -- 夜數（對應前端）
  number_of_people INTEGER DEFAULT 1, -- 人數（對應前端）
  group_size INTEGER DEFAULT 1,        -- 團體人數（與 number_of_people 同義）
  accommodation_days INTEGER,          -- 住宿天數
  status VARCHAR(20) DEFAULT 'draft',  -- draft, sent, accepted, rejected, expired, converted
  total_amount NUMERIC(10, 2) DEFAULT 0, -- 總金額（對應前端）
  version INTEGER DEFAULT 1,
  valid_until VARCHAR(20),             -- 有效期限 YYYY-MM-DD
  notes TEXT,
  created_by UUID,                     -- 建立人 ID
  created_by_name VARCHAR(100),        -- 建立人姓名
  converted_to_tour BOOLEAN DEFAULT FALSE, -- 是否已轉成旅遊團
  tour_id UUID REFERENCES tours(id) ON DELETE SET NULL, -- 轉換後的旅遊團 ID
  categories JSONB DEFAULT '[]'::JSONB, -- 報價分類
  versions JSONB[] DEFAULT ARRAY[]::JSONB[], -- 歷史版本
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_code ON quotes(code);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_tour_id ON quotes(tour_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_start_date ON quotes(start_date);
CREATE INDEX IF NOT EXISTS idx_quotes_is_active ON quotes(is_active);

DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes;
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 報價項目表（對齊前端）
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  category_id UUID,
  category_name VARCHAR(100),          -- 分類名稱（冗餘欄位）
  type VARCHAR(50) NOT NULL,           -- accommodation, transportation, meals, etc.
  name VARCHAR(255) NOT NULL,
  description TEXT,                    -- 說明
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC(10, 2) DEFAULT 0,
  total_price NUMERIC(10, 2) DEFAULT 0,
  order_index INTEGER DEFAULT 0,       -- 排序（對應前端的 order）
  notes TEXT,
  is_optional BOOLEAN DEFAULT FALSE,   -- 是否為選配
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_category_id ON quote_items(category_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_type ON quote_items(type);
CREATE INDEX IF NOT EXISTS idx_quote_items_is_active ON quote_items(is_active);

DROP TRIGGER IF EXISTS update_quote_items_updated_at ON quote_items;
CREATE TRIGGER update_quote_items_updated_at
  BEFORE UPDATE ON quote_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 系統管理表
-- ============================================

-- 待辦事項表
CREATE TABLE IF NOT EXISTS todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  deadline TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  creator UUID NOT NULL REFERENCES employees(id),
  assignee UUID REFERENCES employees(id),
  visibility UUID[] DEFAULT ARRAY[]::UUID[],
  related_items JSONB[] DEFAULT ARRAY[]::JSONB[],
  sub_tasks JSONB[] DEFAULT ARRAY[]::JSONB[],
  notes JSONB[] DEFAULT ARRAY[]::JSONB[],
  enabled_quick_actions TEXT[] DEFAULT ARRAY[]::TEXT[],
  needs_creator_notification BOOLEAN DEFAULT FALSE,
  type VARCHAR(50),
  parent_id UUID REFERENCES todos(id) ON DELETE CASCADE,
  project_id UUID,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_todos_creator ON todos(creator);
CREATE INDEX IF NOT EXISTS idx_todos_assignee ON todos(assignee);
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority);
CREATE INDEX IF NOT EXISTS idx_todos_deadline ON todos(deadline);
CREATE INDEX IF NOT EXISTS idx_todos_type ON todos(type);
CREATE INDEX IF NOT EXISTS idx_todos_parent_id ON todos(parent_id);
CREATE INDEX IF NOT EXISTS idx_todos_project_id ON todos(project_id);
CREATE INDEX IF NOT EXISTS idx_todos_is_active ON todos(is_active);

DROP TRIGGER IF EXISTS update_todos_updated_at ON todos;
CREATE TRIGGER update_todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 簽證表
-- 簽證表（更新為符合前端 visa.types.ts）
CREATE TABLE IF NOT EXISTS visas (
  -- BaseEntity 欄位
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 申請人資訊
  applicant_name VARCHAR(100) NOT NULL,
  contact_person VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(50) NOT NULL,

  -- 簽證資訊
  visa_type VARCHAR(100) NOT NULL, -- 簽證類型（護照 成人、台胞證等）
  country VARCHAR(100) NOT NULL,   -- 國家

  -- 狀態
  status VARCHAR(20) DEFAULT '待送件',

  -- 日期
  submission_date DATE,  -- 送件時間
  received_date DATE,    -- 下件時間
  pickup_date DATE,      -- 取件時間

  -- 關聯資訊
  order_id UUID NOT NULL,           -- 關聯的訂單ID
  order_number VARCHAR(50) NOT NULL, -- 訂單號碼快照
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,        -- 團體代碼 (tourCode)

  -- 費用
  fee NUMERIC(10, 2) DEFAULT 0,  -- 代辦費
  cost NUMERIC(10, 2) DEFAULT 0, -- 成本

  -- 其他
  note TEXT,                -- 備註
  created_by UUID,          -- 建立者ID

  -- 同步欄位（Phase 2 離線優先）
  _needs_sync BOOLEAN DEFAULT FALSE,
  _synced_at TIMESTAMPTZ,

  -- 軟刪除
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_visas_tour_id ON visas(tour_id);
CREATE INDEX IF NOT EXISTS idx_visas_order_id ON visas(order_id);
CREATE INDEX IF NOT EXISTS idx_visas_status ON visas(status);
CREATE INDEX IF NOT EXISTS idx_visas_submission_date ON visas(submission_date);
CREATE INDEX IF NOT EXISTS idx_visas_applicant_name ON visas(applicant_name);
CREATE INDEX IF NOT EXISTS idx_visas_is_active ON visas(is_active);
CREATE INDEX IF NOT EXISTS idx_visas_needs_sync ON visas(_needs_sync);

DROP TRIGGER IF EXISTS update_visas_updated_at ON visas;
CREATE TRIGGER update_visas_updated_at
  BEFORE UPDATE ON visas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 供應商表
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  bank_account VARCHAR(100),
  tax_id VARCHAR(50),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_type ON suppliers(type);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 行事曆表
-- ============================================

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES employees(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(50) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  visibility VARCHAR(20) DEFAULT 'private',
  related_id UUID,
  related_type VARCHAR(50),
  color VARCHAR(20),
  is_all_day BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_date ON calendar_events(start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_date ON calendar_events(end_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_visibility ON calendar_events(visibility);

DROP TRIGGER IF EXISTS update_calendar_events_updated_at ON calendar_events;
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 記帳系統表
-- ============================================

-- 帳戶表
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  balance NUMERIC(15, 2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'TWD',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(name);
CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON accounts(is_active);

DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 分類表
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  icon VARCHAR(50),
  color VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories(is_active);

DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 交易表
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  type VARCHAR(20) NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id),
  amount NUMERIC(15, 2) NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_is_active ON transactions(is_active);

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 預算表
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  period VARCHAR(20) NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  spent NUMERIC(15, 2) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period);
CREATE INDEX IF NOT EXISTS idx_budgets_is_active ON budgets(is_active);

DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets;
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 工作空間、時間箱、模板表
-- ============================================

-- 工作空間表
CREATE TABLE IF NOT EXISTS workspace_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES employees(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content JSONB DEFAULT '{}'::JSONB,
  position INTEGER DEFAULT 0,
  size VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_items_user_id ON workspace_items(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_items_type ON workspace_items(type);
CREATE INDEX IF NOT EXISTS idx_workspace_items_position ON workspace_items(position);
CREATE INDEX IF NOT EXISTS idx_workspace_items_is_active ON workspace_items(is_active);

DROP TRIGGER IF EXISTS update_workspace_items_updated_at ON workspace_items;
CREATE TRIGGER update_workspace_items_updated_at
  BEFORE UPDATE ON workspace_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 時間箱表
CREATE TABLE IF NOT EXISTS timebox_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES employees(id),
  date DATE NOT NULL,
  title VARCHAR(255) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'planned',
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timebox_sessions_user_id ON timebox_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_timebox_sessions_date ON timebox_sessions(date);
CREATE INDEX IF NOT EXISTS idx_timebox_sessions_status ON timebox_sessions(status);
CREATE INDEX IF NOT EXISTS idx_timebox_sessions_is_active ON timebox_sessions(is_active);

DROP TRIGGER IF EXISTS update_timebox_sessions_updated_at ON timebox_sessions;
CREATE TRIGGER update_timebox_sessions_updated_at
  BEFORE UPDATE ON timebox_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 模板表
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  content JSONB DEFAULT '{}'::JSONB,
  preview TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON templates(is_active);

DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 同步佇列表
-- ============================================

CREATE TABLE IF NOT EXISTS syncQueue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(100) NOT NULL,
  operation VARCHAR(20) NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  data JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_syncQueue_table_name ON syncQueue(table_name);
CREATE INDEX IF NOT EXISTS idx_syncQueue_operation ON syncQueue(operation);
CREATE INDEX IF NOT EXISTS idx_syncQueue_status ON syncQueue(status);
CREATE INDEX IF NOT EXISTS idx_syncQueue_created_at ON syncQueue(created_at);
CREATE INDEX IF NOT EXISTS idx_syncQueue_retry_count ON syncQueue(retry_count);

DROP TRIGGER IF EXISTS update_syncQueue_updated_at ON syncQueue;
CREATE TRIGGER update_syncQueue_updated_at
  BEFORE UPDATE ON syncQueue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 完成訊息
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Venturo ERP Database Schema 建立完成！';
  RAISE NOTICE '📊 共建立 23 個資料表';
  RAISE NOTICE '🔐 請記得設定 RLS 政策';
END $$;
