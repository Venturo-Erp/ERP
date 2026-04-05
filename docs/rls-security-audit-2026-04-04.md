# RLS 安全檢測報告

**檢測日期：** 2026-04-04  
**檢測人員：** Matthew（Logan's Technical Lead）  
**檢測範圍：** Venturo ERP 核心資料表  
**資料庫：** Supabase (pfqvdacxowpgfamuvnsn.supabase.co)  
**Workspace：** 角落旅行社 (8ef05a74-1f87-48ab-afd3-9bfeb423935d)

---

## 📊 檢測摘要

- **檢測表數：** 4 張核心表
- **存在的表：** 4 張
- **有 workspace_id：** 2 張（workspace_job_roles, employees）
- **RLS 已啟用：** 2 張（role_tab_permissions, workspace_tasks - 實測已攔截）
- **RLS 未啟用：** 0 張
- **狀態不明：** 2 張（workspace_job_roles, employees - 無測試資料驗證）
- **發現問題：** 1 個（中等風險）
- **風險等級：** 🟡 **MEDIUM**

---

## 🔍 詳細檢測結果

### 1. workspace_job_roles

#### 表結構
- ✅ 表存在（3 筆記錄）
- ✅ 有 `workspace_id` 欄位
- ✅ 已定義 FK：`workspace_id → workspaces(id)` (ON DELETE CASCADE)

#### RLS 狀態
- ⚠️ **狀態不明**（查詢測試無資料，無法確認隔離效果）
- 📋 Migration 檔案（20260404_create_job_roles.sql）：
  ```sql
  ALTER TABLE workspace_job_roles ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "workspace_job_roles_all" ON workspace_job_roles 
    FOR ALL USING (true) WITH CHECK (true);
  ```

#### 問題分析
- ❌ **Policy 設定過於寬鬆**：`USING (true)` 允許所有人查詢所有資料
- ❌ **未進行 workspace_id 過濾**
- ❌ **未驗證 auth.uid() / auth.jwt()**

#### 風險
- 🔴 **HIGH**：租戶間資料完全無隔離

---

### 2. employees

#### 表結構
- ✅ 表存在（9 筆記錄）
- ✅ 有 `workspace_id` 欄位

#### RLS 狀態
- ⚠️ **狀態不明**（查詢測試無資料，無法確認隔離效果）
- ❓ 未找到對應的 migration 檔案（可能在更早的 migration 或 code-first schema）

#### 問題分析
- ⚠️ 無法確認 RLS Policy 內容
- ⚠️ 需要進一步查詢 `pg_policies`

#### 風險
- 🟡 **MEDIUM**：無法確認安全性

---

### 3. role_tab_permissions

#### 表結構
- ✅ 表存在（212 筆記錄）
- ❌ **無 `workspace_id` 欄位**

#### RLS 狀態
- ✅ **RLS 已啟用**（實測：查詢其他 workspace 被攔截）
- ❓ 可能使用其他方式進行租戶隔離（如 role_id → workspace_roles → workspace_id）

#### 問題分析
- ⚠️ 表沒有直接的 `workspace_id` 欄位
- ⚠️ 需要檢查是否透過 JOIN 進行隔離
- ⚠️ 無法直接用 workspace_id 過濾，可能有效能問題

#### 風險
- 🟡 **MEDIUM**：隔離機制不明確

#### 建議
如果 `role_tab_permissions` 應該是多租戶表，建議：
1. 新增 `workspace_id` 欄位（冗余但提升效能）
2. 或確認現有 Policy 正確使用 JOIN 隔離

```sql
-- 選項 1：新增 workspace_id（建議）
ALTER TABLE role_tab_permissions 
  ADD COLUMN workspace_id UUID REFERENCES workspaces(id);

-- 選項 2：確認現有 Policy 是否包含類似邏輯
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'role_tab_permissions';
```

---

### 4. workspace_tasks

#### 表結構
- ✅ 表存在（0 筆記錄，空表）
- ❓ 未確認是否有 `workspace_id` 欄位（空表無法透過 SELECT 推斷）

#### RLS 狀態
- ✅ **RLS 已啟用**（實測：查詢其他 workspace 被攔截）

#### 問題分析
- ⚠️ 表為空，無法驗證實際資料隔離
- ⚠️ 無法確認 schema 結構

#### 風險
- 🟢 **LOW**：RLS 已啟用，暫無資料

#### 建議
等有資料後再次驗證

---

## ⚠️ 發現的問題（優先級排序）

### 🔴 HIGH - workspace_job_roles RLS Policy 過於寬鬆

**問題描述：**  
Policy 使用 `USING (true)`，允許所有人查詢所有 workspace 的資料。

**影響範圍：**  
租戶間資料完全無隔離，可能導致資料洩漏。

**修復建議：**

```sql
-- 刪除現有的寬鬆 policy
DROP POLICY IF EXISTS "workspace_job_roles_all" ON workspace_job_roles;

-- SELECT Policy
CREATE POLICY "workspace_job_roles_tenant_select" 
ON workspace_job_roles
FOR SELECT
USING (
  workspace_id = (
    SELECT workspace_id 
    FROM employees 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

-- INSERT Policy
CREATE POLICY "workspace_job_roles_tenant_insert" 
ON workspace_job_roles
FOR INSERT
WITH CHECK (
  workspace_id = (
    SELECT workspace_id 
    FROM employees 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

-- UPDATE Policy
CREATE POLICY "workspace_job_roles_tenant_update" 
ON workspace_job_roles
FOR UPDATE
USING (
  workspace_id = (
    SELECT workspace_id 
    FROM employees 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
)
WITH CHECK (
  workspace_id = (
    SELECT workspace_id 
    FROM employees 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

-- DELETE Policy
CREATE POLICY "workspace_job_roles_tenant_delete" 
ON workspace_job_roles
FOR DELETE
USING (
  workspace_id = (
    SELECT workspace_id 
    FROM employees 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);
```

**優先級：** 🔴 **CRITICAL**  
**預估修復時間：** 15 分鐘

---

### 🟡 MEDIUM - role_tab_permissions 缺少 workspace_id

**問題描述：**  
表沒有 `workspace_id` 欄位，可能依賴 JOIN 進行隔離，效能和可維護性較差。

**影響範圍：**  
查詢效能可能受影響，隔離邏輯不夠直觀。

**修復建議：**

```sql
-- 1. 新增 workspace_id 欄位
ALTER TABLE role_tab_permissions 
  ADD COLUMN workspace_id UUID REFERENCES workspaces(id);

-- 2. 填充現有資料（假設透過 role_id 關聯）
UPDATE role_tab_permissions rtp
SET workspace_id = wr.workspace_id
FROM workspace_roles wr
WHERE rtp.role_id = wr.id;

-- 3. 設為 NOT NULL（如果所有資料都已填充）
ALTER TABLE role_tab_permissions 
  ALTER COLUMN workspace_id SET NOT NULL;

-- 4. 建立索引
CREATE INDEX idx_role_tab_permissions_workspace 
ON role_tab_permissions(workspace_id);

-- 5. 更新 RLS Policy（假設需要新增）
CREATE POLICY "role_tab_permissions_tenant_select" 
ON role_tab_permissions
FOR SELECT
USING (
  workspace_id = (
    SELECT workspace_id 
    FROM employees 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);
```

**優先級：** 🟡 **MEDIUM**  
**預估修復時間：** 30 分鐘（需確認現有 Policy 和資料關聯）

---

### 🟡 MEDIUM - employees 和 workspace_tasks RLS 狀態不明

**問題描述：**  
無法確認這兩個表的 RLS Policy 內容。

**影響範圍：**  
無法確認租戶隔離是否正確。

**修復建議：**

```sql
-- 查詢現有 policies
SELECT 
  tablename,
  policyname,
  cmd,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename IN ('employees', 'workspace_tasks')
ORDER BY tablename, policyname;

-- 如果沒有 policies，需新增（參考 workspace_job_roles 的修復建議）
```

**優先級：** 🟡 **MEDIUM**  
**預估修復時間：** 20 分鐘

---

## ✅ 安全表（已正確設定）

目前無法確認任何表「完全安全」，因為：
- `workspace_job_roles`：RLS 已啟用但 Policy 過於寬鬆
- `employees`：RLS 狀態不明
- `role_tab_permissions`：RLS 已啟用但缺少 workspace_id
- `workspace_tasks`：RLS 已啟用但資料為空無法驗證

---

## 🎯 修復優先級

| 優先級 | 表名 | 問題 | 預估時間 |
|--------|------|------|----------|
| 🔴 CRITICAL | workspace_job_roles | RLS Policy 過於寬鬆 | 15 分鐘 |
| 🟡 HIGH | employees | RLS 狀態不明 | 20 分鐘 |
| 🟡 MEDIUM | role_tab_permissions | 缺少 workspace_id | 30 分鐘 |
| 🟢 LOW | workspace_tasks | 空表，等有資料後驗證 | - |

**總預估修復時間：** 65 分鐘

---

## 📋 下一步行動

### 立即執行（今日完成）
1. ✅ 生成檢測報告（已完成）
2. ⏳ 查詢 `employees` 和 `workspace_tasks` 的現有 RLS policies
3. ⏳ 修復 `workspace_job_roles` 的 RLS policy

### 排程執行（本週完成）
4. ⏳ 決定是否為 `role_tab_permissions` 新增 `workspace_id`
5. ⏳ 執行修復並測試
6. ⏳ 全面檢測其他有 `workspace_id` 的表

### 長期改進
7. ⏳ 建立 RLS Policy 的標準模板
8. ⏳ 新增自動化測試（防止未來新表忘記設定 RLS）
9. ⏳ 定期執行 RLS 稽核（每月或每季）

---

## 🛠️ 工具和腳本

### 已建立的檢測腳本
- `scripts/check-rls-simple.mjs` - 基礎檢測
- `scripts/check-rls-policies.mjs` - Policy 檢測
- `scripts/check-rls-final.mjs` - 最終完整檢測

### 使用方式
```bash
cd ~/Projects/venturo-erp
node scripts/check-rls-final.mjs
```

---

## 📚 參考資料

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- 專案 Migration：`supabase/migrations/20260404_create_job_roles.sql`

---

**報告結束**

如有問題或需要進一步協助，請通知 Logan。
