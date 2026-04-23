# Error Tracker 使用範例

## 目的

追蹤「按鈕不見、無法存檔」等使用者體驗問題。

---

## 1. 追蹤按鈕狀態

### 範例 1: 儲存按鈕

```typescript
import { errorTracker } from '@/lib/monitoring/error-tracker';

function SaveButton() {
  const { tour, isLoading } = useTour();
  const canEdit = tour?.status === 'proposal' || tour?.status === 'confirmed';

  // 追蹤按鈕狀態
  useEffect(() => {
    errorTracker.trackButton({
      page: 'tour-edit',
      buttonId: 'save-tour',
      isVisible: true,  // 按鈕是否顯示
      isDisabled: !canEdit || isLoading,  // 按鈕是否 disabled
      expectedVisible: true,  // 預期應該顯示
      expectedDisabled: false,  // 預期應該可點擊
      reason: !canEdit ? `status=${tour?.status}` : undefined,
    });
  }, [tour, canEdit, isLoading]);

  return (
    <button
      disabled={!canEdit || isLoading}
      onClick={handleSave}
    >
      儲存
    </button>
  );
}
```

### 範例 2: 條件渲染的按鈕

```typescript
function DeleteButton() {
  const { user } = useAuth();
  const canDelete = user?.role === 'admin';

  // 追蹤條件渲染
  useEffect(() => {
    errorTracker.trackButton({
      page: 'tour-list',
      buttonId: 'delete-tour',
      isVisible: canDelete,
      isDisabled: false,
      expectedVisible: true,  // 如果你預期系統主管應該看到
      reason: !canDelete ? `role=${user?.role}` : undefined,
    });
  }, [user, canDelete]);

  if (!canDelete) return null;  // ← 按鈕消失的原因

  return <button onClick={handleDelete}>刪除</button>;
}
```

---

## 2. 追蹤存檔失敗

### 範例 1: 簡單的存檔

```typescript
async function saveTour(data: TourFormData) {
  try {
    const { error } = await supabase.from('tours').update(data).eq('id', tourId)

    if (error) throw error
  } catch (error) {
    // 追蹤存檔失敗
    errorTracker.trackSaveFailed({
      page: 'tour-edit',
      entity: 'tour',
      error: error as Error,
      data, // 送出的資料（小心敏感資訊）
      userId: user?.id,
      workspaceId: data.workspace_id,
    })

    throw error
  }
}
```

### 範例 2: 複雜的存檔（多個表）

```typescript
async function saveOrderWithMembers(order: Order, members: Member[]) {
  try {
    // 1. 存訂單
    const { error: orderError } = await supabase.from('orders').insert(order)

    if (orderError) throw orderError

    // 2. 存團員
    const { error: membersError } = await supabase.from('order_members').insert(members)

    if (membersError) throw membersError
  } catch (error) {
    errorTracker.trackSaveFailed({
      page: 'order-create',
      entity: 'order_with_members',
      error: error as Error,
      data: {
        order,
        membersCount: members.length,
      },
      userId: user?.id,
      workspaceId: order.workspace_id,
    })

    throw error
  }
}
```

---

## 3. 追蹤 RLS 錯誤

```typescript
async function fetchTours() {
  try {
    const { data, error } = await supabase.from('tours').select('*').eq('workspace_id', workspaceId)

    if (error) throw error

    return data
  } catch (error) {
    // 檢查是否為 RLS 錯誤
    if (error.message.includes('permission denied') || error.message.includes('RLS')) {
      errorTracker.trackRLSError({
        page: 'tour-list',
        table: 'tours',
        operation: 'select',
        error: error as Error,
        userId: user?.id,
        workspaceId,
      })
    }

    throw error
  }
}
```

---

## 4. 追蹤狀態錯誤

```typescript
function TourStatusBadge({ tour }: { tour: Tour }) {
  const expectedStatuses = ['proposal', 'confirmed', 'closed', 'cancelled'];

  // 檢查狀態是否合法
  useEffect(() => {
    if (!expectedStatuses.includes(tour.status)) {
      errorTracker.trackStateError({
        page: 'tour-detail',
        action: 'render_status_badge',
        actualState: tour.status,
        expectedState: expectedStatuses,
        reason: `Invalid tour status: ${tour.status}`,
      });
    }
  }, [tour.status]);

  return <Badge>{tour.status}</Badge>;
}
```

---

## 5. 在 Console 檢視錯誤

### 開啟瀏覽器 Console，輸入：

```javascript
// 查看所有錯誤
errorTracker.getLogs()

// 查看特定類型
errorTracker.getLogsByType('save_failed')
errorTracker.getLogsByType('button_hidden')

// 查看特定頁面
errorTracker.getLogsByPage('tour-edit')

// 生成報告
errorTracker.generateReport()

// 匯出為 JSON（可以寄給開發者）
console.log(errorTracker.export())

// 清除所有錯誤
errorTracker.clear()
```

---

## 6. 定期檢查

### 在每個頁面加入（開發模式）

```typescript
// src/app/(main)/layout.tsx

useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    const report = errorTracker.generateReport()

    if (report.total > 0) {
      console.warn(`
        ⚠️  發現 ${report.total} 個錯誤
        
        按類型:
        ${JSON.stringify(report.byType, null, 2)}
        
        按頁面:
        ${JSON.stringify(report.byPage, null, 2)}
        
        最近的錯誤:
        ${JSON.stringify(report.recentErrors, null, 2)}
      `)
    }
  }
}, [])
```

---

## 7. 自動化檢測（進階）

```typescript
// scripts/analyze-errors.ts

import { errorTracker } from '@/lib/monitoring/error-tracker'

function analyzeErrors() {
  const report = errorTracker.generateReport()

  // 按鈕問題最多的頁面
  const buttonIssues = errorTracker
    .getLogsByType('button_hidden')
    .concat(errorTracker.getLogsByType('button_disabled'))

  const pageWithMostButtonIssues = Object.entries(
    buttonIssues.reduce((acc, log) => {
      acc[log.page] = (acc[log.page] || 0) + 1
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1])[0]

  console.log('🚨 按鈕問題最多的頁面:', pageWithMostButtonIssues)

  // 存檔失敗最多的功能
  const saveIssues = errorTracker.getLogsByType('save_failed')
  const mostFailedEntity = Object.entries(
    saveIssues.reduce((acc, log) => {
      const entity = log.details.entity || 'unknown'
      acc[entity] = (acc[entity] || 0) + 1
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1])[0]

  console.log('🚨 存檔失敗最多的功能:', mostFailedEntity)

  // RLS 錯誤
  const rlsIssues = errorTracker.getLogsByType('rls_error')
  console.log('🚨 RLS 錯誤:', rlsIssues.length)

  return {
    buttonIssues: pageWithMostButtonIssues,
    saveIssues: mostFailedEntity,
    rlsIssues: rlsIssues.length,
  }
}
```

---

## 注意事項

### ⚠️ 不要記錄敏感資訊

```typescript
// ❌ 錯誤：記錄整個表單（可能包含密碼、信用卡）
errorTracker.trackSaveFailed({
  data: formData, // 包含所有欄位
})

// ✅ 正確：只記錄關鍵資訊
errorTracker.trackSaveFailed({
  data: {
    entity: 'customer',
    hasEmail: !!formData.email,
    hasPhone: !!formData.phone,
    // 不記錄實際內容
  },
})
```

### ⚠️ 效能考量

```typescript
// 在 useEffect 中使用，避免每次 render 都追蹤
useEffect(() => {
  errorTracker.trackButton({...});
}, [依賴項]);  // 只在依賴項改變時追蹤
```

---

## 下一步

1. 在關鍵頁面加入追蹤（Tours, Orders, Payments）
2. 使用 1-2 天，收集錯誤日誌
3. 分析日誌，找出最常見的問題
4. 修復問題
5. 驗證修復效果
