# 系統健康檢查報告

**日期**: 2026-03-09  
**檢查人**: 馬修 (Matthew)  
**基於**: 今天租戶建立功能的錯誤經驗

---

## 🎯 檢查項目

根據今天發現的問題，檢查全系統是否有類似錯誤：

1. ❌ SQL 查詢寫法錯誤（`!inner()` 語法）
2. ❌ 大小寫不匹配（'Corner' vs 'CORNER'）
3. ❌ 前端邏輯分散、缺乏事務控制

---

## 🔴 發現的問題

### 問題 1: SQL 查詢寫法錯誤

**檔案**: `src/app/api/auth/create-employee-auth/route.ts`  
**行數**: 74  
**問題**:

```typescript
.select('roles, workspace_id, workspaces!inner(code)')
```

**影響**:

- 可能導致查詢失敗
- 與今天修正的 `create/route.ts` 相同錯誤

**建議修正**:

```typescript
// 分兩步查詢
.select('roles, workspace_id')
// 然後再查 workspace
```

---

### 問題 2: 大小寫不匹配

**檔案**: `src/app/api/auth/create-employee-auth/route.ts`  
**行數**: 84  
**問題**:

```typescript
if (!isSuperAdmin || currentUserWorkspaceCode !== 'Corner') {
```

**資料庫實際值**: `'CORNER'` (全大寫)

**影響**:

- 權限檢查永遠失敗
- 無法建立新租戶的第一個員工

**建議修正**:

```typescript
if (!isSuperAdmin || currentUserWorkspaceCode !== 'CORNER') {
```

---

## ⚠️ 其他發現（低風險）

### 其他使用 !inner() 的地方

這些地方使用 `!inner()` 但**可能**沒問題（需要驗證）：

1. **src/app/(main)/customers/page.tsx**

   ```typescript
   .select('id, order_id, orders!inner(code, tour_name)')
   ```

2. **src/app/(main)/finance/reports/unpaid-orders/page.tsx**

   ```typescript
   tours!inner(code, name, departure_date)
   ```

3. **src/components/editor/hotel-selector/hooks/useHotelSearch.ts**

   ```typescript
   cities!inner(name)
   ```

4. **src/lib/utils/sync-passport-image.ts**
   ```typescript
   orders!inner(code, tour_name)
   ```

**建議**: 逐一測試這些功能，確認是否有查詢失敗

---

## ✅ 建議修正優先級

### P0 - 立即修正（影響核心功能）

1. **create-employee-auth/route.ts**
   - [ ] 修正 SQL 查詢寫法
   - [ ] 修正大小寫不匹配

### P1 - 驗證測試

2. **customers/page.tsx** - 驗證客戶列表是否正常
3. **unpaid-orders/page.tsx** - 驗證未付款報表是否正常
4. **hotel-selector** - 驗證飯店選擇器是否正常
5. **sync-passport-image** - 驗證護照同步是否正常

### P2 - 預防性改善

6. 建立 SQL 查詢 Linter 規則
7. 建立大小寫一致性檢查
8. 統一 API 錯誤處理模式

---

## 📋 修正計劃

### Step 1: 立即修正 P0 問題

**檔案**: `src/app/api/auth/create-employee-auth/route.ts`

**修正 1**: SQL 查詢

```typescript
// ❌ 舊的
const { data: currentEmployee } = await supabaseAdmin
  .from('employees')
  .select('roles, workspace_id, workspaces!inner(code)')
  .eq('id', auth.data.employeeId)
  .single()

const currentUserWorkspaceCode = (currentEmployee?.workspaces as any)?.code

// ✅ 新的
const { data: currentEmployee } = await supabaseAdmin
  .from('employees')
  .select('roles, workspace_id')
  .eq('id', auth.data.employeeId)
  .single()

const { data: currentWorkspace } = await supabaseAdmin
  .from('workspaces')
  .select('code')
  .eq('id', currentEmployee.workspace_id)
  .single()

const currentUserWorkspaceCode = currentWorkspace?.code
```

**修正 2**: 大小寫

```typescript
// ❌ 舊的
if (!isSuperAdmin || currentUserWorkspaceCode !== 'Corner') {

// ✅ 新的
if (!isSuperAdmin || currentUserWorkspaceCode !== 'CORNER') {
```

### Step 2: 測試驗證

**測試案例**:

1. 用非 Corner 管理員登入 → 建立員工 → 應該拒絕
2. 用 Corner super_admin 登入 → 建立新租戶員工 → 應該成功
3. 用 Corner super_admin 登入 → 建立現有租戶員工 → 應該成功

### Step 3: 檢查其他 !inner() 使用

**執行測試**:

- [ ] 客戶管理頁面
- [ ] 未付款報表
- [ ] 飯店選擇器
- [ ] 護照圖片同步

---

## 🎓 經驗教訓

### 1. SQL 查詢最佳實踐

**避免**:

```typescript
.select('field1, related!inner(field2)')
```

**建議**:

```typescript
// 分兩步查詢
.select('field1, related_id')
// 再查 related table
```

**原因**:

- 更清晰
- 更容易 debug
- 錯誤訊息更明確

### 2. 大小寫一致性

**原則**:

- 資料庫值用什麼，程式碼就用什麼
- 不要假設大小寫

**檢查方式**:

```sql
-- 查詢實際值
SELECT code FROM workspaces WHERE name LIKE '%角落%';
-- 結果: CORNER (全大寫)
```

### 3. 權限檢查模式

**統一模式**:

```typescript
// 1. 檢查登入狀態
const auth = await getServerAuth()
if (!auth.success) return error('請先登入')

// 2. 查詢用戶資料
const { data: employee } = await supabase
  .from('employees')
  .select('roles, workspace_id')
  .eq('id', auth.data.employeeId)
  .single()

// 3. 查詢 workspace
const { data: workspace } = await supabase
  .from('workspaces')
  .select('code')
  .eq('id', employee.workspace_id)
  .single()

// 4. 檢查權限
const isSuperAdmin = employee.roles?.includes('super_admin')
const isCorner = workspace.code === 'CORNER'

if (!isSuperAdmin || !isCorner) {
  return error('權限不足')
}
```

---

## 📊 統計

- **掃描檔案**: 全部 TypeScript/TSX 檔案
- **發現問題**: 2 個 P0 問題，5 個待驗證
- **影響範圍**: 員工建立、租戶管理
- **修正時間**: 預計 30 分鐘

---

## ✅ 下一步

1. [ ] 修正 `create-employee-auth/route.ts` 的兩個問題
2. [ ] 測試修正後的功能
3. [ ] 逐一驗證其他 `!inner()` 使用是否正常
4. [ ] 建立 SQL 查詢規範文件
5. [ ] 加入 pre-commit 檢查（避免類似錯誤）

---

_本報告基於 2026-03-09 租戶建立功能的實際問題經驗_
