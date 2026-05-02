# 最終 RLS 實作計畫

## 資料庫結構調整

### 1. Quotes 表格

```sql
ALTER TABLE quotes
ADD COLUMN shared_with_workspaces uuid[] DEFAULT '{}';

COMMENT ON COLUMN quotes.shared_with_workspaces IS '分享給哪些辦公室（只有管理者能設定）';
```

### 2. Calendar Events 表格

```sql
ALTER TABLE calendar_events
ADD COLUMN visibility text DEFAULT 'workspace' CHECK (visibility IN ('private', 'workspace', 'company_wide'));

COMMENT ON COLUMN calendar_events.visibility IS '
  private: 只有自己看得到
  workspace: 整個辦公室看得到
  company_wide: 全公司看得到（只有管理者能建立）
';
```

### 3. Employees 表格

```sql
ALTER TABLE employees
ADD COLUMN hidden_menu_items text[] DEFAULT '{}';

COMMENT ON COLUMN employees.hidden_menu_items IS '隱藏的選單項目 (例如: ["suppliers", "destinations"])';
```

### 4. Workspaces 表格 (LinkPay 設定)

```sql
ALTER TABLE workspaces
ADD COLUMN payment_config jsonb DEFAULT '{}';

COMMENT ON COLUMN workspaces.payment_config IS '
  付款設定，例如：
  {
    "linkpay": {
      "api_key": "xxx",
      "merchant_id": "yyy",
      "environment": "production"
    }
  }
';
```

---

## RLS 策略設計

### 完全隔離的表格（各看各的）

```sql
-- orders, itineraries, customers, payments, payment_requests, disbursement_orders
CREATE POLICY "table_select" ON table_name
FOR SELECT TO authenticated
USING (workspace_id = get_current_user_workspace());

CREATE POLICY "table_insert" ON table_name
FOR INSERT TO authenticated
WITH CHECK (workspace_id = get_current_user_workspace());
```

### Tours（管理者能看全部）

```sql
CREATE POLICY "tours_select" ON tours
FOR SELECT TO authenticated
USING (
  workspace_id = get_current_user_workspace()
  OR
  is_admin()  -- 管理者能看所有辦公室的 tours
);

CREATE POLICY "tours_insert" ON tours
FOR INSERT TO authenticated
WITH CHECK (workspace_id = get_current_user_workspace());
```

### Quotes（管理者分享機制）

```sql
CREATE POLICY "quotes_select" ON quotes
FOR SELECT TO authenticated
USING (
  workspace_id = get_current_user_workspace()
  OR
  get_current_user_workspace() = ANY(shared_with_workspaces)
);

CREATE POLICY "quotes_update_share" ON quotes
FOR UPDATE TO authenticated
USING (is_admin())  -- 只有管理者能更新分享設定
WITH CHECK (is_admin());
```

### Calendar Events（管理者建立全公司行事曆）

```sql
CREATE POLICY "calendar_select" ON calendar_events
FOR SELECT TO authenticated
USING (
  CASE visibility
    WHEN 'private' THEN author_id = auth.uid()
    WHEN 'workspace' THEN workspace_id = get_current_user_workspace()
    WHEN 'company_wide' THEN true  -- 所有人都能看
  END
);

CREATE POLICY "calendar_insert" ON calendar_events
FOR INSERT TO authenticated
WITH CHECK (
  CASE
    WHEN visibility = 'company_wide' THEN is_admin()  -- 只有管理者能建立全公司行事曆
    ELSE workspace_id = get_current_user_workspace()
  END
);
```

### Channels（已有 channel_members 控制）

```sql
CREATE POLICY "channels_select" ON channels
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM channel_members
    WHERE channel_id = channels.id
    AND employee_id = get_current_employee_id()
  )
);

-- channel_members 的 INSERT 由管理者/頻道建立者控制
```

### 完全共享的表格（不分辦公室）

```sql
-- suppliers, destinations, supplier_categories, bulletins
-- 不需要 RLS，或者：
CREATE POLICY "table_select" ON table_name
FOR SELECT TO authenticated
USING (true);  -- 所有人都能看
```

---

## Helper Functions

```sql
-- 取得當前使用者的 workspace_id
CREATE OR REPLACE FUNCTION get_current_user_workspace()
RETURNS uuid
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  workspace_id uuid;
BEGIN
  SELECT e.workspace_id INTO workspace_id
  FROM employees e
  WHERE e.user_id = auth.uid();

  RETURN workspace_id;
END;
$$;

-- 檢查是否為管理者
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  admin_role boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  ) INTO admin_role;

  RETURN admin_role;
END;
$$;

-- 取得當前員工 ID
CREATE OR REPLACE FUNCTION get_current_employee_id()
RETURNS uuid
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  emp_id uuid;
BEGIN
  SELECT e.id INTO emp_id
  FROM employees e
  WHERE e.user_id = auth.uid();

  RETURN emp_id;
END;
$$;
```

---

## 前端調整清單

### 1. 員工管理頁面

- ✅ 新增員工時選擇「所屬辦公室」
- ✅ 編輯員工資料時可更改辦公室
- ✅ 管理者可設定員工的「隱藏選單項目」

### 2. Tours 管理頁面（管理者專用）

- ✅ 加入「辦公室篩選」下拉選單
  - 全部
  - 台北辦公室
  - 台中辦公室

### 3. Quotes 詳情頁（管理者專用）

- ✅ 加入「分享設定」區塊
  - ☐ 分享給台北辦公室
  - ☐ 分享給台中辦公室

### 4. Calendar 新增頁面

- ✅ 一般員工：選擇「個人」或「辦公室」
- ✅ 管理者：多一個「全公司」選項

### 5. 選單系統

- ✅ 讀取 `employees.hidden_menu_items`
- ✅ 動態隱藏對應的選單項目

### 6. Workspace 設定頁面（新增）

- ✅ LinkPay 設定（台北/台中各自設定）
  - API Key
  - Merchant ID
  - Environment

### 7. 所有資料建立

- ✅ 自動帶入當前使用者的 `workspace_id`

---

## 實作優先順序

### Phase 1: 資料庫與基礎 RLS（今天）

1. ✅ 建立台北/台中 workspace
2. ✅ 填充所有表格的 workspace_id
3. ⏳ 執行資料庫結構調整 migration
4. ⏳ 建立 Helper Functions
5. ⏳ 啟用基礎 RLS 策略

### Phase 2: 前端基礎調整（明天）

1. 員工管理：加入 workspace 選擇
2. 所有 store：自動帶入 workspace_id
3. 選單系統：實作隱藏功能

### Phase 3: 進階功能（後天）

1. Tours 管理者篩選
2. Quotes 分享功能
3. Calendar 全公司行事曆
4. Workspace 付款設定
