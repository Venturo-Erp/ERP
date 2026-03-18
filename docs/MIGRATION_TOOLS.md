# Migration Tools - Supabase 資料庫遷移工具

## 🗄️ Supabase Migration 執行方法

### 方法 1: Supabase Management API（推薦，已驗證可用）

**使用時機**：本機沒有 psql / supabase CLI

**從 `.env.local` 取得認證資訊**：
```bash
SUPABASE_ACCESS_TOKEN=sbp_ae479b3d5d81d4992b6cebb91d93a16bfa499e02
PROJECT_REF=pfqvdacxowpgfamuvnsn
```

**快速執行 SQL**：

```bash
node -e "
const projectRef = 'pfqvdacxowpgfamuvnsn'
const accessToken = 'sbp_ae479b3d5d81d4992b6cebb91d93a16bfa499e02'

fetch(\`https://api.supabase.com/v1/projects/\${projectRef}/database/query\`, {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${accessToken}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'ALTER TABLE tours ADD COLUMN IF NOT EXISTS new_field TEXT;',
  }),
}).then(r => r.json()).then(d => {
  if (d.message) {
    console.error('❌', d.message)
  } else {
    console.log('✅ 成功')
  }
})
"
```

---

## 📋 已建立的通用腳本

### 1. 執行 Migration（通用）

**檔案**：`scripts/exec-migration.mjs`

```javascript
import { readFileSync } from 'fs'

const projectRef = 'pfqvdacxowpgfamuvnsn'
const accessToken = 'sbp_ae479b3d5d81d4992b6cebb91d93a16bfa499e02'

const migrationSQL = readFileSync(process.argv[2], 'utf-8')

const response = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: migrationSQL }),
  }
)

const result = await response.json()
if (!response.ok) {
  console.error('❌ 失敗:', result)
  process.exit(1)
}
console.log('✅ Migration 執行成功')
```

**使用**：
```bash
node scripts/exec-migration.mjs supabase/migrations/20260318_xxx.sql
```

---

### 2. 檢查表結構

```bash
node -e "
const projectRef = 'pfqvdacxowpgfamuvnsn'
const accessToken = 'sbp_ae479b3d5d81d4992b6cebb91d93a16bfa499e02'

fetch(\`https://api.supabase.com/v1/projects/\${projectRef}/database/query\`, {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${accessToken}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'TABLE_NAME' ORDER BY ordinal_position;\",
  }),
}).then(r => r.json()).then(d => {
  console.log('欄位列表：')
  d.forEach(row => console.log(\`  - \${row.column_name} (\${row.data_type})\`))
})
"
```

---

### 3. 檢查表是否存在

```bash
node -e "
const projectRef = 'pfqvdacxowpgfamuvnsn'
const accessToken = 'sbp_ae479b3d5d81d4992b6cebb91d93a16bfa499e02'

fetch(\`https://api.supabase.com/v1/projects/\${projectRef}/database/query\`, {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${accessToken}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: \"SELECT table_name FROM information_schema.tables WHERE table_name = 'TABLE_NAME';\",
  }),
}).then(r => r.json()).then(d => {
  if (d.length > 0) {
    console.log('✅ 表存在')
  } else {
    console.log('❌ 表不存在')
  }
})
"
```

---

## ⚠️ 常見問題與解決方案

### 問題 1: `column "tour_id" does not exist`

**原因**：外鍵約束參考的欄位型別不符

**解決**：
1. 先檢查 `tours.id` 的型別
2. 確保外鍵也用相同型別（例如 `TEXT` 而非 `UUID`）
3. 如果不確定，先不加外鍵約束

```sql
-- ❌ 錯誤
tour_id UUID NOT NULL REFERENCES tours(id)

-- ✅ 正確（如果 tours.id 是 TEXT）
tour_id TEXT NOT NULL REFERENCES tours(id)

-- ✅ 暫時跳過外鍵約束
tour_id TEXT NOT NULL
```

---

### 問題 2: `relation "workspace_members" does not exist`

**原因**：RLS 策略參考的表不存在

**解決**：跳過 RLS 策略，或確認表名稱

```sql
-- 暫時跳過 RLS
-- ALTER TABLE tour_request_items ENABLE ROW LEVEL SECURITY;
```

---

### 問題 3: 表已存在但 schema 不同

**原因**：之前的 migration 建立了舊版本的表

**解決**：先 DROP 再重建

```sql
DROP TABLE IF EXISTS tour_request_items CASCADE;

CREATE TABLE tour_request_items (
  -- 新的 schema
);
```

---

## 🚀 完整 Migration 流程

### Step 1: 建立 Migration 檔案

```bash
# 檔名格式：YYYYMMDD_description.sql
touch supabase/migrations/20260318_add_local_quote_system.sql
```

### Step 2: 撰寫 SQL

```sql
BEGIN;

-- 擴充現有表
ALTER TABLE tour_requests ADD COLUMN IF NOT EXISTS new_field TEXT;

-- 建立新表
CREATE TABLE IF NOT EXISTS new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- ...
);

COMMIT;
```

### Step 3: 執行 Migration

```bash
# 方法 A: 用腳本執行
node scripts/exec-migration.mjs supabase/migrations/20260318_xxx.sql

# 方法 B: 手動在 Supabase Dashboard
# 1. 複製 SQL 到剪貼簿
pbcopy < supabase/migrations/20260318_xxx.sql
# 2. 前往 https://supabase.com/dashboard/project/pfqvdacxowpgfamuvnsn/sql
# 3. 貼上並執行
```

### Step 4: 驗證

```bash
# 檢查新欄位
node -e "..." # 用上面的「檢查表結構」指令

# 或在 Supabase Dashboard 執行
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'tour_requests' 
  AND column_name = 'new_field';
```

---

## 📊 2026-03-18 成功案例

### 案例：Local 報價系統 Migration

**檔案**：`supabase/migrations/20260318_extend_tour_requests_for_local_quotes.sql`

**執行方式**：

1. **Step 1**: 擴充 `tour_requests` 表
```bash
node scripts/exec-migration-step1.mjs
```

2. **Step 2**: 重建 `tour_request_items` 表
```bash
node scripts/exec-migration-final.mjs
```

**結果**：
- ✅ tour_requests 新增 9 個欄位
- ✅ tour_request_items 表重建（24 個欄位）

**經驗教訓**：
1. 複雜 migration 分多個步驟執行更安全
2. 先檢查表結構再決定是否需要 DROP
3. 外鍵約束要確認型別一致
4. RLS 策略如果參考的表不存在，先跳過

---

## 📝 最佳實踐

1. **Migration 檔案命名**：
   - 格式：`YYYYMMDD_description.sql`
   - 例如：`20260318_add_local_quote_system.sql`

2. **SQL 安全性**：
   - 用 `IF NOT EXISTS` 避免重複執行錯誤
   - 用 `BEGIN; ... COMMIT;` 包裝事務
   - 破壞性操作前先備份

3. **驗證步驟**：
   - 執行後立即驗證表結構
   - 檢查索引是否建立
   - 測試 RLS 策略

4. **錯誤處理**：
   - 如果失敗，檢查錯誤訊息
   - 分步驟執行複雜 migration
   - 必要時先 DROP 再重建

---

**最後更新**：2026-03-18  
**維護者**：Matthew 🔧
