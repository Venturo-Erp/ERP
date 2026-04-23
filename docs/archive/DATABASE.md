# Venturo 資料庫文件

> 版本：1.0
> 最後更新：2025-10-26
> 狀態：正式文件

---

## 🎯 資料庫架構概述

Venturo 採用 **雙層資料庫架構**：

```
┌─────────────────────────────────────────┐
│         前端應用程式                     │
│                                         │
│  ┌─────────────┐    ┌──────────────┐  │
│  │  IndexedDB  │◄──►│   Supabase   │  │
│  │  (離線優先)  │    │   (雲端)      │  │
│  └─────────────┘    └──────────────┘  │
│         ▲                   ▲          │
│         │                   │          │
│         └───────┬───────────┘          │
│                 │                      │
│          Sync Queue                    │
│          (同步佇列)                     │
└─────────────────────────────────────────┘
```

### 設計原則

1. **離線優先** - 所有操作優先寫入 IndexedDB
2. **自動同步** - 網路恢復時自動同步到 Supabase
3. **衝突解決** - 使用時間戳和版本號處理衝突
4. **統一命名** - 全面使用 snake_case

---

## 📊 核心資料表

### 業務實體表

```
tours               # 旅遊團
orders              # 訂單
members             # 團員
customers           # 客戶
payments            # 付款記錄
quotes              # 報價單
contracts           # 合約
visas               # 簽證
employees           # 員工
```

### 工作區表

```
workspaces          # 工作區
channels            # 頻道
messages            # 訊息
channel_members     # 頻道成員
advance_lists       # 預支清單
payment_requests    # 付款請求
```

### 基礎資料表

```
regions             # 地區
transport           # 交通工具
suppliers           # 供應商
activities          # 活動項目
pricing             # 定價項目
```

### 系統表

```
todos               # 待辦事項
calendar_events     # 行事曆事件
templates           # 範本
timebox_sessions    # 時間盒
sync_queue          # 同步佇列
```

---

## 🚀 Supabase 設定

### 1. 建立專案

1. 前往 [Supabase](https://supabase.com)
2. 建立新專案
3. 記下以下資訊：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx`
   - **Service Role Key**: (後端使用)

### 2. 環境變數設定

建立 `.env.local` 檔案：

```env
# Supabase 連線
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx

# 啟用 Supabase
NEXT_PUBLIC_ENABLE_SUPABASE=true
```

### 3. Client 初始化

```typescript
// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'venturo',
    },
  },
})
```

---

## 📋 Schema 定義

### BaseEntity 標準

所有資料表都遵循 BaseEntity 結構：

```sql
-- 基礎欄位
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
created_at TIMESTAMPTZ DEFAULT NOW()
updated_at TIMESTAMPTZ DEFAULT NOW()
is_deleted BOOLEAN DEFAULT false
```

### Tours 表 (旅遊團)

```sql
CREATE TABLE tours (
  -- BaseEntity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,

  -- 基本資訊
  code VARCHAR(50) UNIQUE NOT NULL,           -- 團號 (e.g., TYO250120)
  name TEXT NOT NULL,                         -- 旅遊團名稱
  destination TEXT NOT NULL,                  -- 目的地

  -- 日期資訊
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,                      -- 天數

  -- 人數管理
  min_people INTEGER DEFAULT 10,
  max_people INTEGER DEFAULT 30,
  current_people INTEGER DEFAULT 0,

  -- 價格資訊
  adult_price NUMERIC(10, 2) NOT NULL,
  child_price NUMERIC(10, 2),
  infant_price NUMERIC(10, 2),
  single_supplement NUMERIC(10, 2),

  -- 狀態
  status VARCHAR(20) DEFAULT 'planning',      -- planning | confirmed | ongoing | completed | cancelled
  contract_status VARCHAR(20) DEFAULT 'unsigned',  -- unsigned | partial | signed
  archived BOOLEAN DEFAULT false,

  -- 關聯
  primary_guide_id UUID REFERENCES employees(id),
  secondary_guide_id UUID REFERENCES employees(id),

  -- 額外資訊
  description TEXT,
  notes TEXT,
  tags TEXT[]
);

-- 索引
CREATE INDEX idx_tours_code ON tours(code);
CREATE INDEX idx_tours_status ON tours(status);
CREATE INDEX idx_tours_start_date ON tours(start_date);
CREATE INDEX idx_tours_archived ON tours(archived);
```

### Orders 表 (訂單)

```sql
CREATE TABLE orders (
  -- BaseEntity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,

  -- 基本資訊
  code VARCHAR(50) UNIQUE NOT NULL,           -- 訂單號
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),

  -- 金額資訊
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  balance NUMERIC(10, 2) NOT NULL DEFAULT 0,

  -- 狀態
  status VARCHAR(20) DEFAULT 'pending',       -- pending | confirmed | completed | cancelled
  payment_status VARCHAR(20) DEFAULT 'unpaid', -- unpaid | partial | paid | refunded

  -- 額外資訊
  notes TEXT,
  special_requests TEXT
);

-- 索引
CREATE INDEX idx_orders_code ON orders(code);
CREATE INDEX idx_orders_tour_id ON orders(tour_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
```

### Members 表 (團員)

```sql
CREATE TABLE members (
  -- BaseEntity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,

  -- 關聯 (重要：同時關聯 tour 和 order)
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- 基本資訊
  name TEXT NOT NULL,
  english_name TEXT,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
  birth_date DATE,
  age INTEGER,                                -- 根據 birth_date 和出發日計算

  -- 類型
  member_type VARCHAR(20) NOT NULL,           -- adult | child | infant

  -- 證件資訊
  passport_number VARCHAR(50),
  passport_expiry_date DATE,
  id_number VARCHAR(50),

  -- 聯絡資訊
  phone VARCHAR(50),
  email VARCHAR(100),
  emergency_contact TEXT,

  -- 額外資訊
  dietary_requirements TEXT,
  special_needs TEXT,
  notes TEXT
);

-- 索引
CREATE INDEX idx_members_tour_id ON members(tour_id);
CREATE INDEX idx_members_order_id ON members(order_id);
CREATE INDEX idx_members_name ON members(name);
```

### Employees 表 (員工)

```sql
CREATE TABLE employees (
  -- BaseEntity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,

  -- 基本資訊
  employee_number VARCHAR(50) UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  english_name TEXT,

  -- 密碼（bcrypt hash）
  password_hash TEXT NOT NULL,

  -- 個人資訊 (JSONB)
  personal_info JSONB DEFAULT '{}'::JSONB,
  -- {
  --   "gender": "male",
  --   "birth_date": "1990-01-01",
  --   "phone": "0912345678",
  --   "email": "user@example.com",
  --   "address": "台北市..."
  -- }

  -- 職務資訊 (JSONB)
  job_info JSONB DEFAULT '{}'::JSONB,
  -- {
  --   "department": "業務部",
  --   "position": "團控",
  --   "hire_date": "2020-01-01"
  -- }

  -- 薪資資訊 (JSONB)
  salary_info JSONB DEFAULT '{}'::JSONB,
  -- {
  --   "base_salary": 40000,
  --   "allowances": [],
  --   "salary_history": []
  -- }

  -- 出勤資訊 (JSONB)
  attendance JSONB DEFAULT '{"leave_records": [], "overtime_records": []}'::JSONB,

  -- 權限
  permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
  roles TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- 狀態
  status VARCHAR(20) DEFAULT 'active',
  -- active | probation | leave | terminated

  -- 其他
  avatar TEXT,
  last_login_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_employees_number ON employees(employee_number);
CREATE INDEX idx_employees_status ON employees(status);
```

### Channels 表 (工作區頻道)

```sql
CREATE TABLE channels (
  -- BaseEntity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,

  -- 頻道資訊
  name TEXT NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL,                  -- tour | visa | team | general

  -- 關聯
  workspace_id UUID REFERENCES workspaces(id),
  related_entity_id UUID,                     -- tour_id or visa_id

  -- 設定
  is_private BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false
);

CREATE INDEX idx_channels_type ON channels(type);
CREATE INDEX idx_channels_entity ON channels(related_entity_id);
```

---

## 🔄 Migration 管理

### Migration 檔案結構

```
supabase/migrations/
├── 20251025133900_create_channel_members.sql
├── 20251025134200_complete_workspace_schema.sql
├── 20251025140000_fix_advance_lists.sql
└── 20251025150000_add_contract_fields.sql
```

### Migration 命名規範

格式：`YYYYMMDDHHMMSS_description.sql`

範例：

```
20251025150000_add_tour_archived_field.sql
20251025151000_create_tour_addons_table.sql
20251025152000_add_member_tour_id_foreign_key.sql
```

### 執行 Migration

```bash
# 本地開發
npm run db:migrate

# 或使用 Supabase CLI
supabase db push

# 檢查 migration 狀態
supabase migration list
```

### Migration 範例

```sql
-- 20251025150000_add_tour_archived_field.sql

-- 新增欄位
ALTER TABLE tours
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_tours_archived
ON tours(archived);

-- 更新現有資料（可選）
UPDATE tours
SET archived = false
WHERE archived IS NULL;
```

---

## 🔐 Row Level Security (RLS)

### 啟用 RLS

```sql
-- 為所有表啟用 RLS
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
```

### Policy 範例

```sql
-- 系統主管可以查看所有旅遊團
CREATE POLICY "Admins can view all tours" ON tours
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid()::UUID
      AND '系統主管' = ANY(permissions)
    )
  );

-- 團控可以查看自己負責的旅遊團
CREATE POLICY "Tour managers can view assigned tours" ON tours
  FOR SELECT USING (
    primary_guide_id = auth.uid()::UUID
    OR secondary_guide_id = auth.uid()::UUID
  );

-- 員工只能查看自己的資料
CREATE POLICY "Employees can view own data" ON employees
  FOR SELECT USING (
    auth.uid()::UUID = id
  );

-- 員工可以更新自己的部分資料（不包括權限和薪資）
CREATE POLICY "Employees can update own profile" ON employees
  FOR UPDATE USING (
    auth.uid()::UUID = id
  )
  WITH CHECK (
    auth.uid()::UUID = id
    AND permissions = OLD.permissions
    AND salary_info = OLD.salary_info
  );
```

---

## 💾 IndexedDB Schema

### Store 定義

```typescript
// src/lib/db/schemas.ts

export const SCHEMAS = [
  {
    name: 'tours',
    keyPath: 'id',
    autoIncrement: false,
    indexes: [
      { name: 'code', keyPath: 'code', unique: true },
      { name: 'status', keyPath: 'status', unique: false },
      { name: 'start_date', keyPath: 'start_date', unique: false },
      { name: 'created_at', keyPath: 'created_at', unique: false },
    ],
  },
  {
    name: 'orders',
    keyPath: 'id',
    autoIncrement: false,
    indexes: [
      { name: 'code', keyPath: 'code', unique: true },
      { name: 'tour_id', keyPath: 'tour_id', unique: false },
      { name: 'customer_id', keyPath: 'customer_id', unique: false },
      { name: 'status', keyPath: 'status', unique: false },
    ],
  },
  {
    name: 'members',
    keyPath: 'id',
    autoIncrement: false,
    indexes: [
      { name: 'tour_id', keyPath: 'tour_id', unique: false },
      { name: 'order_id', keyPath: 'order_id', unique: false },
      { name: 'name', keyPath: 'name', unique: false },
    ],
  },
  // ... 其他表
]
```

### 初始化

```typescript
// src/lib/db/database-initializer.ts

import { LocalDatabase } from './local-db'
import { SCHEMAS } from './schemas'

export async function initializeDatabase() {
  const db = LocalDatabase.getInstance()

  for (const schema of SCHEMAS) {
    await db.createStore(schema.name, schema.keyPath, schema.autoIncrement, schema.indexes)
  }

  console.log('✅ IndexedDB 初始化完成')
}
```

---

## 🔄 資料同步策略

### 同步流程

```typescript
// 1. 離線時：寫入本地 + 加入同步佇列
async function createTour(tour: Tour) {
  // 寫入 IndexedDB
  await localDB.create('tours', tour)

  if (!navigator.onLine) {
    // 加入同步佇列
    await syncQueue.add({
      table: 'tours',
      action: 'create',
      data: tour,
      timestamp: Date.now(),
    })
  } else {
    // 直接同步到 Supabase
    await supabase.from('tours').insert(tour)
  }
}

// 2. 恢復在線時：執行同步佇列
window.addEventListener('online', async () => {
  const queue = await syncQueue.getAll()

  for (const item of queue) {
    try {
      await executeSync(item)
      await syncQueue.remove(item.id)
    } catch (error) {
      console.error('同步失敗:', error)
      // 保留在佇列中，稍後重試
    }
  }
})
```

### 衝突解決

使用 **Last Write Wins** 策略：

```typescript
async function resolveConflict(local: Tour, remote: Tour) {
  const localTimestamp = new Date(local.updated_at).getTime()
  const remoteTimestamp = new Date(remote.updated_at).getTime()

  if (localTimestamp > remoteTimestamp) {
    // 本地較新，上傳到 Supabase
    await supabase.from('tours').upsert(local)
  } else {
    // 遠端較新，更新本地
    await localDB.update('tours', local.id, remote)
  }
}
```

---

## 🧪 資料庫測試

### 檢查清單

- [ ] Supabase 連線成功
- [ ] 所有表已建立
- [ ] RLS Policies 正確
- [ ] IndexedDB 初始化成功
- [ ] 同步機制運作
- [ ] 衝突解決正確

### 測試腳本

```typescript
// tests/database.test.ts

describe('Database Integration', () => {
  it('should connect to Supabase', async () => {
    const { data, error } = await supabase.from('tours').select('count');
    expect(error).toBeNull();
  });

  it('should create IndexedDB stores', async () => {
    await initializeDatabase();
    const stores = await localDB.listStores();
    expect(stores).toContain('tours');
    expect(stores).toContain('orders');
  });

  it('should sync offline changes', async () => {
    // 模擬離線
    Object.defineProperty(navigator, 'onLine', { value: false });

    const tour = { id: uuid(), name: 'Test Tour', ... };
    await createTour(tour);

    // 檢查同步佇列
    const queue = await syncQueue.getAll();
    expect(queue).toHaveLength(1);

    // 模擬恢復在線
    Object.defineProperty(navigator, 'onLine', { value: true });
    window.dispatchEvent(new Event('online'));

    // 等待同步完成
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 檢查 Supabase
    const { data } = await supabase.from('tours').select().eq('id', tour.id);
    expect(data).toHaveLength(1);
  });
});
```

---

## 📚 相關文檔

- [ARCHITECTURE.md](../ARCHITECTURE.md) - 系統架構
- [DEVELOPMENT_GUIDE.md](../DEVELOPMENT_GUIDE.md) - 開發指南
- [Supabase 官方文檔](https://supabase.com/docs)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)

---

**文檔版本**: 1.0
**最後更新**: 2025-10-26
**維護者**: William Chien
**狀態**: ✅ 正式文件
