# Realtime 即時同步系統指南

> **最後更新**: 2025-11-09
> **系統狀態**: ✅ 已上線，支援 20 個表格

---

## 🎯 核心概念

### 什麼是 Realtime 同步？

Realtime 同步讓你的 Venturo 系統能夠：

- 🔄 **多裝置同步**：公司刪除的資料，家裡立即消失
- ⚡ **即時更新**：團隊成員的變更 < 100ms 同步
- 📱 **離線支援**：斷網時可操作，網路恢復自動同步
- 🔒 **權限更新**：系統主管變更權限，使用者立即生效

---

## 📊 按需訂閱 (On-Demand Subscription)

### 核心原則

```typescript
// ✅ 正確行為
情境：同事新增了行事曆

1. 你還沒去看行事曆頁面 → 沒訂閱 → 什麼都不會發生 ✅
2. 你打開行事曆頁面 → 觸發訂閱 → 立即下載同事新增的資料 ✅
3. 你離開行事曆頁面 → 取消訂閱 ✅
```

```typescript
// ❌ 錯誤行為（已修正）
1. 你登入系統 → 所有 50 個表格立即訂閱 ❌
2. 同事新增行事曆 → 你收到推送（即使你沒在看） ❌
3. 浪費連線數（2000+ 連線 vs 200 上限） ❌
```

### 為什麼要「按需訂閱」？

**連線數限制**：

```
目前: 20 個表格 × 40 使用者 = 800 個連線（如果全部訂閱）
免費上限: 200 個連線

如果全部 50 個表格同時訂閱:
50 × 40 = 2000 個連線 ⚠️ 超標 10 倍

使用按需訂閱後:
單一使用者：2-4 個連線（當前頁面 + 永久訂閱）
20 員工 × 2 裝置 × 2.5 頁面：平均 100 個連線
占用率：50% ✅ 安全範圍
```

---

## 🚀 如何使用

### 1. 在頁面中加入 Realtime Hook

```typescript
// src/app/calendar/page.tsx
import { useRealtimeForCalendarEvents } from '@/hooks/use-realtime-hooks';

export default function CalendarPage() {
  // ✅ 進入頁面時訂閱，離開時自動取消
  useRealtimeForCalendarEvents();

  const events = useCalendarEventStore(state => state.items);

  return <div>...</div>;
}
```

### 2. 多個表格同時訂閱

```typescript
// src/features/tours/components/ToursPage.tsx
import {
  useRealtimeForTours,
  useRealtimeForOrders,
  useRealtimeForMembers,
  useRealtimeForQuotes
} from '@/hooks/use-realtime-hooks';

export default function ToursPage() {
  // ✅ 同時訂閱多個相關表格
  useRealtimeForTours();
  useRealtimeForOrders();
  useRealtimeForMembers();
  useRealtimeForQuotes();

  const tours = useTourStore(state => state.items);

  return <div>...</div>;
}
```

---

## 📋 已支援的 Realtime Hooks

### 業務實體（13 個）

| Hook 名稱                            | 對應表格            | 使用頁面     |
| ------------------------------------ | ------------------- | ------------ |
| `useRealtimeForTours()`              | tours               | 旅遊團頁面   |
| `useRealtimeForOrders()`             | orders              | 訂單頁面     |
| `useRealtimeForQuotes()`             | quotes              | 報價頁面     |
| `useRealtimeForCustomers()`          | customers           | 客戶頁面     |
| `useRealtimeForItineraries()`        | itineraries         | 行程表頁面   |
| `useRealtimeForPaymentRequests()`    | payment_requests    | 請款頁面     |
| `useRealtimeForDisbursementOrders()` | disbursement_orders | 出納頁面     |
| `useRealtimeForReceiptOrders()`      | receipt_orders      | 收款頁面     |
| `useRealtimeForVisas()`              | visas               | 簽證頁面     |
| `useRealtimeForSuppliers()`          | suppliers           | 供應商頁面   |
| `useRealtimeForRegions()`            | regions             | 地區頁面     |
| `useRealtimeForCalendarEvents()`     | calendar_events     | 行事曆頁面   |
| `useRealtimeForTodos()`              | todos               | 待辦事項頁面 |

### 子實體（3 個）

| Hook 名稱                    | 對應表格    | 使用頁面     |
| ---------------------------- | ----------- | ------------ |
| `useRealtimeForMembers()`    | members     | 團員頁面     |
| `useRealtimeForQuoteItems()` | quote_items | 報價項目頁面 |
| `useRealtimeForTourAddons()` | tour_addons | 加購項目頁面 |

### Workspace 系統（2 個）

| Hook 名稱               | 對應表格 | 使用頁面 |
| ----------------------- | -------- | -------- |
| `useChannelsRealtime()` | channels | 頻道頁面 |
| `useChatRealtime()`     | messages | 訊息頁面 |

### 其他（2 個）

| Hook 名稱                   | 對應表格  | 使用頁面 |
| --------------------------- | --------- | -------- |
| `useRealtimeForEmployees()` | employees | 員工頁面 |
| `useRealtimeForTemplates()` | templates | 範本頁面 |

**所有 Hooks 位置**: `src/hooks/use-realtime-hooks.ts`

---

## 🔒 永久訂閱（系統表格）

### 哪些表格需要永久訂閱？

僅限以下 3 個系統表格：

1. **user_roles** - 使用者權限
   - 系統主管變更權限需立即生效
   - 通知使用者 → 2 秒後自動重新整理

2. **workspaces** - 工作空間設定
   - 工作空間變更需立即通知所有成員

3. **employees** - 員工資料
   - 常用於下拉選單，需要永久保持最新

### 永久訂閱實作

```typescript
// src/components/PermanentRealtimeSubscriptions.tsx
export function PermanentRealtimeSubscriptions() {
  const user = useAuthStore(state => state.user)
  const { toast } = useToast()

  useEffect(() => {
    if (!user) return

    // 訂閱 user_roles
    realtimeManager.subscribe<UserRole>({
      table: 'user_roles',
      filter: `user_id=eq.${user.id}`,
      subscriptionId: `user-role-${user.id}`,
      handlers: {
        onUpdate: newRole => {
          toast({
            title: '你的權限已更新！',
            description: '請重新整理頁面以套用新權限。',
          })
          setTimeout(() => window.location.reload(), 2000)
        },
      },
    })

    // 訂閱 workspaces
    realtimeManager.subscribe<Workspace>({
      table: 'workspaces',
      subscriptionId: 'workspace-permanent',
      handlers: {
        onUpdate: async workspace => {
          await workspaceIndexedDB.put(workspace)
          useWorkspaceStore.setState({ currentWorkspace: workspace })
        },
      },
    })

    // 訂閱 employees
    realtimeManager.subscribe<Employee>({
      table: 'employees',
      subscriptionId: 'employees-permanent',
      handlers: {
        onInsert: async employee => {
          await employeeIndexedDB.put(employee)
          useEmployeeStore.setState(state => ({
            items: [...state.items, employee],
          }))
        },
        onUpdate: async employee => {
          await employeeIndexedDB.put(employee)
          useEmployeeStore.setState(state => ({
            items: state.items.map(e => (e.id === employee.id ? employee : e)),
          }))
        },
        onDelete: async oldEmployee => {
          await employeeIndexedDB.delete(oldEmployee.id)
          useEmployeeStore.setState(state => ({
            items: state.items.filter(e => e.id !== oldEmployee.id),
          }))
        },
      },
    })

    return () => {
      realtimeManager.unsubscribeAll()
    }
  }, [user])

  return null
}
```

**整合位置**: `src/components/layout/main-layout.tsx`

---

## 📱 離線優先策略

### fetchAll 流程

```typescript
// 三階段載入策略
Step 1: 立即載入 IndexedDB（0.1 秒）→ 顯示畫面
Step 2: 背景同步 Supabase（只下載變更）→ 靜默更新
Step 3: 訂閱 Realtime（進入頁面時）→ 持續即時
```

### 離線新增流程

```typescript
1. 資料存入 IndexedDB
2. 標記 _needs_sync: true
3. 網路恢復時自動上傳
```

### 衝突解決策略

```typescript
// LastWrite 策略：最後寫入者獲勝
if (remoteItem.updated_at > localItem.updated_at) {
  // 使用遠端版本
  await indexedDB.put(remoteItem)
} else {
  // 保留本地版本，上傳到 Supabase
  await supabase.update(localItem)
}
```

---

## 🔧 進階：建立新的 Realtime Hook

### 使用 Hook 工廠函數

```typescript
// src/hooks/use-realtime-hooks.ts
import { createRealtimeHook } from '@/lib/realtime/createRealtimeHook'
import { IndexedDBAdapter } from '@/lib/indexeddb/indexeddb-adapter'
import { useNotificationStore } from '@/stores/notification-store'

// 建立新的 Hook
export const useRealtimeForNotifications = createRealtimeHook<Notification>({
  tableName: 'notifications',
  indexedDB: new IndexedDBAdapter<Notification>('notifications'),
  store: useNotificationStore,
})
```

### Hook 工廠函數的內部邏輯

```typescript
// src/lib/realtime/createRealtimeHook.ts
export function createRealtimeHook<T extends { id: string }>(
  options: CreateRealtimeHookOptions<T>
) {
  const { tableName, indexedDB, store } = options

  return function useRealtimeForTable() {
    useEffect(() => {
      const subscriptionId = `${tableName}-realtime`

      realtimeManager.subscribe<T>({
        table: tableName,
        subscriptionId,
        handlers: {
          onInsert: async record => {
            await indexedDB.put(record)
            store.setState(state => ({
              items: [...state.items, record],
            }))
          },
          onUpdate: async record => {
            await indexedDB.put(record)
            store.setState(state => ({
              items: state.items.map(item => (item.id === record.id ? record : item)),
            }))
          },
          onDelete: async oldRecord => {
            await indexedDB.delete(oldRecord.id)
            store.setState(state => ({
              items: state.items.filter(item => item.id !== oldRecord.id),
            }))
          },
        },
      })

      // 清理：離開頁面時取消訂閱
      return () => {
        realtimeManager.unsubscribe(subscriptionId)
      }
    }, [])
  }
}
```

---

## 📈 連線數監控

### 如何檢查當前連線數

1. **開啟開發者工具**
   - Chrome/Edge: F12 → Network → WS (WebSocket)
   - Firefox: F12 → 網路 → WS

2. **查看訂閱數量**
   - 每個 WebSocket 連線 = 1 個表格訂閱
   - 正常狀況：3-7 個連線（永久訂閱 + 當前頁面）

3. **Supabase Dashboard**
   - [Database → Realtime](https://supabase.com/dashboard/project/pfqvdacxowpgfamuvnsn/database/realtime)
   - 可以看到即時連線數

### 連線數估算

| 情境                   | 連線數     | 狀態        |
| ---------------------- | ---------- | ----------- |
| 單一使用者（1 個頁面） | 3-4 個     | ✅ 正常     |
| 單一使用者（多個分頁） | 4-7 個     | ✅ 正常     |
| 10 人同時在線          | 50-70 個   | ✅ 安全     |
| 20 人同時在線          | 100-140 個 | ✅ 安全     |
| 40 人同時在線          | 200-280 個 | ⚠️ 接近上限 |

**免費上限**: 200 個連線
**目標占用率**: 50% (100 個連線)

---

## ✅ 測試清單

### 1. 多裝置同步測試

#### Test Case 1: 新增資料

- [ ] 公司電腦：新增旅遊團「北海道賞雪」
- [ ] 家裡電腦：打開旅遊團頁面
- [ ] 預期結果：立即看到「北海道賞雪」✅

#### Test Case 2: 刪除資料

- [ ] 公司電腦：刪除旅遊團「北海道賞雪」
- [ ] 家裡電腦：旅遊團頁面已開啟
- [ ] 預期結果：旅遊團立即消失 ✅

#### Test Case 3: 更新資料

- [ ] 公司電腦：修改旅遊團「北海道賞雪」→「北海道滑雪」
- [ ] 家裡電腦：旅遊團頁面已開啟
- [ ] 預期結果：名稱立即更新為「北海道滑雪」✅

### 2. 離線支援測試

#### Test Case 4: 離線新增

- [ ] 家裡電腦：斷網
- [ ] 家裡電腦：新增旅遊團「沖繩陽光」
- [ ] 家裡電腦：恢復網路
- [ ] 公司電腦：打開旅遊團頁面
- [ ] 預期結果：看到「沖繩陽光」✅

### 3. 權限即時更新測試

#### Test Case 5: 新增權限

- [ ] 威廉（系統主管）：新增雅萍的「財務管理」權限
- [ ] 雅萍：正在線上
- [ ] 預期結果：雅萍立即收到通知，2 秒後頁面重新整理 ✅

---

## 🚨 常見問題

### Q1: 為什麼我看不到即時更新？

**可能原因**：

1. 沒有在頁面中加入 Realtime Hook
2. 網路連線問題
3. Supabase Realtime 未啟用

**解決方式**：

```typescript
// 確認頁面中有加入 Hook
useRealtimeForXXX()

// 檢查網路連線
console.log(navigator.onLine) // true = 有網路

// 檢查 Supabase Dashboard
// Database → Realtime → 確認表格已啟用
```

### Q2: 連線數超標怎麼辦？

**解決方式**：

1. 確認只訂閱當前頁面需要的表格
2. 離開頁面時自動取消訂閱（Hook 已處理）
3. 減少永久訂閱的表格數量

### Q3: 如何知道 Realtime 有沒有在運作？

**驗證方式**：

1. 開啟開發者工具 → Network → WS
2. 看到 `wss://pfqvdacxowpgfamuvnsn.supabase.co/realtime/v1/websocket`
3. 修改資料 → 觀察是否立即更新

---

## 📚 相關文檔

- **開發指南**: `docs/DEVELOPMENT_GUIDE.md`
- **Supabase 操作**: `docs/SUPABASE_GUIDE.md`
- **完整邏輯說明**: `ALL_TABLES_REALTIME_STATUS.md`
- **Phase 4 完成報告**: `docs/archive/phase-reports/PHASE_4_COMPLETE_ON_DEMAND_REALTIME.md`

---

## 🎯 總結

### 核心優勢

✅ **按需訂閱** - 只訂閱當前頁面，節省連線數
✅ **自動管理** - 進入頁面訂閱，離開頁面取消
✅ **離線支援** - 斷網可操作，網路恢復自動同步
✅ **即時更新** - < 100ms 同步團隊變更
✅ **權限即時** - 系統主管變更立即生效

### 使用建議

1. **新頁面開發**：記得加入對應的 Realtime Hook
2. **監控連線數**：定期檢查不要超過 200 個
3. **測試同步**：開發完成後測試多裝置同步
4. **離線測試**：確認離線時功能正常

---

**提示**: Realtime 系統已經完全自動化，你只需要在頁面中加入對應的 Hook 即可！
