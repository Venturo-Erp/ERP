# UX 健康檢查清單

**目的**: 系統性檢測「按鈕不見、無法存檔」等使用者體驗問題

---

## 🔍 檢查維度

### 1. 前端狀態管理 ✅

#### 檢查項目

- [ ] React 狀態與 Zustand 狀態是否同步？
- [ ] 樂觀更新失敗後是否有回滾？
- [ ] Loading 狀態是否正確處理？
- [ ] 錯誤發生後 UI 是否能復原？

#### 檢測方法

```typescript
// 在 Console 執行
// 1. 檢查 Zustand store
import { useAuthStore } from '@/stores/auth-store'
console.log('Auth Store:', useAuthStore.getState())

// 2. 檢查 localStorage（離線資料）
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('venturo_')) {
    console.log(key, localStorage.getItem(key))
  }
})

// 3. 檢查是否有殘留的 loading 狀態
document.querySelectorAll('[data-loading="true"]')
```

#### 常見問題

**問題 1: 狀態不同步**

```typescript
// 症狀：按鈕應該出現但沒出現
// 原因：React 狀態更新了，但 Zustand 沒更新

// 解決方案：統一使用 Zustand
const tour = useToursStore(state => state.currentTour) // ✅
const [tour, setTour] = useState() // ❌ 容易不同步
```

**問題 2: 樂觀更新失敗**

```typescript
// 症狀：點了儲存，UI 更新了，但實際沒存成功

// 解決方案：錯誤時回滾
try {
  // 樂觀更新 UI
  updateTourInStore(newTour)

  const { error } = await saveTour(newTour)
  if (error) throw error
} catch (error) {
  // 回滾 UI
  updateTourInStore(originalTour) // ← 關鍵
  showError(error)
}
```

---

### 2. RLS 政策問題 ✅

#### 檢查項目

- [ ] 使用者是否有正確的 workspace_id？
- [ ] RLS 政策是否太嚴格？
- [ ] 角色權限是否正確？

#### 檢測方法

```sql
-- 在 Supabase SQL Editor 執行

-- 1. 檢查使用者的 workspace_id
SELECT id, email, workspace_id, role
FROM profiles
WHERE email = 'user@example.com';

-- 2. 檢查 RLS 政策（以 tours 為例）
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'tours';

-- 3. 測試查詢權限
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub = 'user-uuid-here';
SET LOCAL request.jwt.claims.workspace_id = 'workspace-uuid-here';

SELECT * FROM tours LIMIT 1;  -- 應該要能查到
```

#### 常見問題

**問題 1: workspace_id 不一致**

```typescript
// 症狀：存檔失敗，錯誤訊息「permission denied」

// 檢查：
const user = useAuthStore(state => state.user)
const tour = useToursStore(state => state.currentTour)

console.log('User workspace:', user.workspace_id)
console.log('Tour workspace:', tour.workspace_id)

// 如果不一致 → 問題找到了！
```

**問題 2: 只能看不能改**

```sql
-- RLS 政策太嚴格（只允許 SELECT，不允許 UPDATE）

-- 修正：加入 UPDATE 政策
CREATE POLICY "Users can update tours in their workspace"
ON tours FOR UPDATE
USING (workspace_id = auth.jwt()->>'workspace_id')
WITH CHECK (workspace_id = auth.jwt()->>'workspace_id');
```

---

### 3. 資料完整性約束 ✅

#### 檢查項目

- [ ] NOT NULL 約束是否導致存檔失敗？
- [ ] FK 約束是否阻擋操作？
- [ ] CHECK 約束是否太嚴格？

#### 檢測方法

```sql
-- 1. 檢查哪些欄位有 NOT NULL
SELECT
  table_name,
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tours'
  AND is_nullable = 'NO';

-- 2. 檢查 FK 約束
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'tours';

-- 3. 檢查 CHECK 約束
SELECT
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'tours'
  AND con.contype = 'c';
```

#### 常見問題

**問題 1: 忘記填必填欄位**

```typescript
// 症狀：存檔失敗，錯誤訊息「null value in column "workspace_id"」

// 解決方案：確保必填欄位都有值
const tour = {
  ...formData,
  workspace_id: user.workspace_id, // ← 必填
  created_at: new Date().toISOString(), // ← 必填
  status: 'proposal', // ← 必填
}
```

**問題 2: FK 指向的資料不存在**

```typescript
// 症狀：存檔失敗，錯誤訊息「violates foreign key constraint」

// 檢查：
const { data: supplier } = await supabase
  .from('suppliers')
  .select('id')
  .eq('id', formData.supplier_id)
  .single()

if (!supplier) {
  console.error('Supplier 不存在:', formData.supplier_id)
  // → 清除不存在的 supplier_id
  formData.supplier_id = null
}
```

---

### 4. UI 條件邏輯 ✅

#### 檢查項目

- [ ] 按鈕顯示/隱藏的條件是否正確？
- [ ] 按鈕 disabled 的條件是否正確？
- [ ] 錯誤後 UI 是否能復原？

#### 檢測方法

```typescript
// 在元件中加入 debug 資訊

function SaveButton() {
  const { tour, isLoading, isSaving } = useTour();
  const canEdit = tour?.status === 'proposal';

  // Debug: 印出所有條件
  useEffect(() => {
    console.log('SaveButton Debug:', {
      tour: tour?.id,
      status: tour?.status,
      isLoading,
      isSaving,
      canEdit,
      shouldShow: true,
      shouldDisable: !canEdit || isLoading || isSaving,
    });
  }, [tour, isLoading, isSaving, canEdit]);

  const shouldDisable = !canEdit || isLoading || isSaving;

  return (
    <button
      disabled={shouldDisable}
      onClick={handleSave}
    >
      {isSaving ? '儲存中...' : '儲存'}
    </button>
  );
}
```

#### 常見問題

**問題 1: 條件太複雜**

```typescript
// ❌ 錯誤：條件太複雜，容易出錯
const canEdit =
  (tour &&
    tour.status !== 'closed' &&
    tour.status !== 'cancelled' &&
    !isLoading &&
    !isSaving &&
    user.role === '系統主管') ||
  user.id === tour.created_by

// ✅ 正確：拆解條件，清楚易懂
const isTourEditable = tour?.status === 'proposal' || tour?.status === 'confirmed'
const hasPermission = user.role === '系統主管' || user.id === tour?.created_by
const isNotBusy = !isLoading && !isSaving

const canEdit = isTourEditable && hasPermission && isNotBusy
```

**問題 2: 錯誤後 UI 卡住**

```typescript
// ❌ 錯誤：存檔失敗後，isSaving 沒有重設
async function handleSave() {
  setIsSaving(true)
  await saveTour(data)
  // 如果 saveTour 失敗，isSaving 永遠是 true！
}

// ✅ 正確：用 try-finally 確保重設
async function handleSave() {
  try {
    setIsSaving(true)
    await saveTour(data)
  } finally {
    setIsSaving(false) // ← 一定會執行
  }
}
```

---

### 5. 離線同步 ✅

#### 檢查項目

- [ ] 離線編輯的資料是否正確同步？
- [ ] 版本衝突是否有處理？
- [ ] 樂觀鎖定是否正確？

#### 檢測方法

```typescript
// 檢查 localStorage 的離線資料

// 1. 查看所有離線資料
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('offline_')) {
    console.log(key, JSON.parse(localStorage.getItem(key)))
  }
})

// 2. 清除離線資料（如果有問題）
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('offline_')) {
    localStorage.removeItem(key)
  }
})
```

#### 常見問題

**問題: 離線編輯，上線後存檔失敗**

```typescript
// 症狀：離線時編輯了資料，上線後存檔失敗（版本衝突）

// 解決方案：加入版本檢查
async function saveTourWithVersionCheck(tour: Tour) {
  // 1. 先取得最新版本
  const { data: latestTour } = await supabase
    .from('tours')
    .select('version, updated_at')
    .eq('id', tour.id)
    .single()

  // 2. 檢查版本
  if (latestTour.version !== tour.version) {
    // 版本衝突！需要使用者選擇
    showConflictDialog(tour, latestTour)
    return
  }

  // 3. 更新並遞增版本
  const { error } = await supabase
    .from('tours')
    .update({
      ...tour,
      version: tour.version + 1,
    })
    .eq('id', tour.id)
    .eq('version', tour.version) // ← 樂觀鎖定

  if (error) throw error
}
```

---

## 🛠️ 快速診斷流程

### 當使用者回報「按鈕不見」或「存檔失敗」

1. **立即檢查 Console**

   ```javascript
   errorTracker.generateReport()
   ```

2. **檢查網路**
   - 打開 DevTools → Network
   - 查看是否有紅色的失敗請求
   - 查看錯誤訊息

3. **檢查 RLS**

   ```sql
   -- 在 Supabase SQL Editor
   SELECT * FROM tours WHERE id = 'problem-tour-id';
   -- 如果查不到 → RLS 問題
   ```

4. **檢查約束**
   - 查看錯誤訊息中的關鍵字
   - `null value in column` → NOT NULL 約束
   - `violates foreign key` → FK 約束
   - `permission denied` → RLS 問題

5. **檢查狀態**
   ```javascript
   // Console
   useToursStore.getState()
   useAuthStore.getState()
   ```

---

## 📊 長期監控

### 每週檢查

```javascript
// 每週五執行
const report = errorTracker.generateReport()

console.log(`
本週錯誤統計:
- 總錯誤數: ${report.total}
- 按鈕問題: ${report.byType.button_hidden + report.byType.button_disabled}
- 存檔失敗: ${report.byType.save_failed}
- RLS 錯誤: ${report.byType.rls_error}

問題最多的頁面:
${JSON.stringify(report.byPage, null, 2)}
`)

// 匯出並寄給開發團隊
const exportData = errorTracker.export()
// TODO: 寄信或上傳
```

---

## 🎯 優先級

### P0 - 立即修復

- 存檔失敗（資料遺失風險）
- RLS 錯誤（無法存取資料）

### P1 - 本週修復

- 按鈕消失（影響操作流程）
- 按鈕 disabled（無法完成任務）

### P2 - 下週修復

- 狀態錯誤（不影響功能但需要修正）
- UI 小問題

---

**更新日期**: 2026-03-09  
**維護者**: Matthew (馬修)
