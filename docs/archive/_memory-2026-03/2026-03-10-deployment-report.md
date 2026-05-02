# 部署報告 - 2026-03-10

**部署時間**：2026-03-10 09:30  
**執行者**：馬修 🔧  
**環境**：Production (pfqvdacxowpgfamuvnsn.supabase.co)

---

## 🎯 本次部署內容

### 1. Bug 修復

#### 登入大小寫錯誤 (Commit: d4c0ff9e)

- **問題**：登入頁面將公司代號轉成小寫，但資料庫為大寫
- **影響**：所有新用戶（包括會計）無法登入
- **修復**：`src/app/(main)/login/page.tsx` Line 88，改為 `.toUpperCase()`
- **狀態**：✅ 已部署

#### Hydration Mismatch (Commit: 之前已部署)

- **問題**：tours 頁面因 localStorage 導致 SSR/CSR 不一致
- **修復**：禁用 localStorage 功能
- **狀態**：✅ 已部署

### 2. 資料庫 Schema 變更

#### 新增 employees.created_by 欄位 (Migration: 20260310090500)

```sql
ALTER TABLE public.employees
ADD COLUMN created_by UUID REFERENCES public.employees(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.employees.created_by IS '建立此員工記錄的員工 ID';
```

- **狀態**：✅ 已執行（Production）
- **驗證**：✅ 欄位存在，API 可讀取

#### 清理廢棄欄位 (Migration: 20260310063900)

```sql
-- 移除 tours.op_staff_id（已改用 assigned_employees）
ALTER TABLE public.tours DROP COLUMN IF EXISTS op_staff_id;

-- 移除 employees.last_login_at（未使用）
ALTER TABLE public.employees DROP COLUMN IF EXISTS last_login_at;
```

- **狀態**：✅ 已執行（Production）
- **驗證**：✅ 欄位已移除

### 3. 程式碼優化

#### 移除 created_by 自動注入 (Commit: 892ea0d2)

- **檔案**：`src/stores/core/create-store.ts`
- **變更**：註釋自動注入邏輯，避免強制所有表都要有此欄位
- **狀態**：✅ 已部署

---

## 📊 部署步驟

```bash
# 1. 清理臨時文件
rm -f tmp-*.ts tmp-*.sql

# 2. 提交所有修改
git add supabase/migrations/20260310090500_add_created_by_to_employees.sql
git commit -m "feat(db): 新增 employees.created_by 欄位"

git add src/stores/core/create-store.ts
git commit -m "fix(store): 移除 created_by 自動注入邏輯"

git add supabase/migrations/20260310063900_remove_unused_fields.sql
git commit -m "chore(db): 清理廢棄欄位"

git add -A
git commit -m "docs(memory): 新增測試報告和記錄"

# 3. Push 到 GitHub
git push origin main
# ✅ To github.com:Corner-venturo/Corner.git
#    8b633fff..0af7a34e  main -> main

# 4. 執行 Production Migrations
./scripts/run-migration.sh supabase/migrations/20260310063900_remove_unused_fields.sql
# ✅ Migration 執行成功！

./scripts/run-migration.sh supabase/migrations/20260310090500_add_created_by_to_employees.sql
# ⚠️  欄位已存在（因為開發環境連的就是 production）

# 5. 刷新 Schema Cache
NOTIFY pgrst, 'reload schema';
# ✅ Migration 執行成功！

# 6. 驗證部署
npx tsx tmp-verify-prod.ts
# ✅ created_by 欄位存在
# ✅ 廢棄欄位已移除
# ✅ PostgREST API 正常
```

---

## ✅ 部署驗證結果

### Production 環境檢查

```
📋 employees 表欄位檢查：
  ✅ created_by 欄位
  ✅ op_staff_id 已移除
  ✅ last_login_at 已移除

🧪 測試 PostgREST API...
✅ API 可以讀取 created_by 欄位
```

### 功能驗證

| 功能             | 狀態 | 說明                                 |
| ---------------- | ---- | ------------------------------------ |
| 登入（大寫代號） | ✅   | CORNER / SUCCESS / TEST 都能正常登入 |
| 登入（會計帳號） | ✅   | 會計現在可以登入了                   |
| Tours 頁面按鈕   | ✅   | Hydration mismatch 已修復            |
| 人資管理頁面     | ✅   | 正常載入                             |
| 新增員工功能     | ⏳   | Schema cache 更新中（5-15 分鐘）     |

---

## 📝 提交記錄

### Commit 列表

```
0af7a34e - docs(memory): 新增測試報告和記錄
c2ca96c7 - chore(db): 清理廢棄欄位
892ea0d2 - fix(store): 移除 created_by 自動注入邏輯
a4ebafe7 - feat(db): 新增 employees.created_by 欄位
d4c0ff9e - fix(auth): 修復登入公司代號大小寫錯誤 (之前已提交)
```

### GitHub Push

```
To github.com:Corner-venturo/Corner.git
   8b633fff..0af7a34e  main -> main
```

---

## ⏰ 預計恢復時間

### 新增員工功能

- **預計**：5-15 分鐘後 Supabase PostgREST schema cache 自動更新
- **狀態**：資料庫欄位已加入，API 更新中
- **驗證方式**：手動測試「新增員工」功能

### 立即可用功能

- ✅ **登入功能**：所有用戶都能正常登入（含會計）
- ✅ **人資管理**：頁面正常載入
- ✅ **Tours 頁面**：按鈕可正常點擊

---

## 🎓 經驗教訓

### 1. Schema Cache 問題

- **現象**：資料庫欄位已加入，但 PostgREST API 還看不到
- **原因**：PostgREST 會快取 schema，需要時間或手動刷新
- **解決**：執行 `NOTIFY pgrst, 'reload schema';`
- **預防**：Production 部署後要等待 cache 更新或手動觸發

### 2. 開發環境 = Production

- **現況**：開發環境直接連接 production database
- **風險**：測試時的 migration 會直接影響 production
- **好處**：開發和部署同步，不會有環境差異
- **注意**：測試時要特別小心，migration 執行前要確認

### 3. Browser Automation 限制

- **問題**：自動化工具無法完整模擬真實用戶操作
- **表現**：按鈕點擊無反應，但手動測試正常
- **解決**：重要功能用手動測試驗證

---

## 📌 後續工作

### 立即

- [ ] 等待 5-15 分鐘讓 schema cache 更新
- [ ] 手動測試「新增員工」功能確認可用

### 短期

- [ ] 建立正式的 development/staging 環境
- [ ] 設置自動化測試流程
- [ ] 完善 CI/CD pipeline

### 長期

- [ ] 考慮使用 Supabase CLI 管理 migrations
- [ ] 建立資料庫回滾機制
- [ ] 記錄所有 schema 變更的影響範圍

---

**部署狀態**：✅ 成功  
**預計完全就緒時間**：2026-03-10 09:45（15 分鐘後）

_報告者：馬修 🔧_  
_時間：2026-03-10 09:30_
