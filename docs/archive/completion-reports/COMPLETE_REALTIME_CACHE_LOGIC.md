# Venturo 完整的 Realtime + 快取邏輯

> **日期**: 2025-10-31
> **狀態**: 架構說明（已移除離線編輯功能）

---

## 🎯 核心概念

### 架構原則

```
Supabase = 唯一的 Source of Truth（資料權威來源）
IndexedDB = 快取層（Cache Layer，可隨時清空）
Zustand = UI 狀態管理

資料流向：Supabase → IndexedDB（快取）→ Zustand → UI
```

**重要**：

- ✅ 所有資料的新增/修改/刪除都直接寫入 Supabase
- ✅ IndexedDB 純粹作為快取，加快頁面載入速度
- ❌ **沒有離線編輯功能**（斷網時無法新增/修改資料）
- ✅ Supabase 連線失敗時，會顯示快取資料（唯讀模式）

---

## 1️⃣ Realtime 訂閱策略：按需訂閱

```
原則：只有「正在看」的頁面才訂閱 Realtime

✅ 正確流程：
1. 同事新增行事曆事件
2. 你還沒去看行事曆頁面 → 沒有訂閱 → 資料不會即時推送 ✅
3. 你打開行事曆頁面 → useRealtimeForCalendarEvents() 觸發訂閱
4. 訂閱建立後，立即從 Supabase 拉取最新資料 ✅
5. 之後任何變更都會即時推送到你的瀏覽器 ✅
6. 你離開行事曆頁面 → useEffect cleanup 取消訂閱 ✅
```

**實作範例**：

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

**連線數估算**：

```
單一使用者：
- 永久訂閱：3 個（user_roles, workspaces, employees）
- 頁面訂閱：1-3 個（當前開啟的頁面）
- 總計：4-6 個連線

20 員工 × 2 裝置 × 5 平均連線 = 200 個連線（剛好在免費方案上限內）
```

---

## 2️⃣ 資料載入流程：快取優先策略

```typescript
// src/stores/operations/fetch.ts

async function fetchAll() {
  // Step 1: 快速顯示快取資料（避免空白畫面）
  const cachedItems = await indexedDB.getAll() // 0.1 秒
  // 立即顯示 UI ✅

  // Step 2: 從 Supabase 拉取最新資料
  const latestItems = await supabase.fetchAll()

  // Step 3: 清空舊快取，寫入新資料
  await indexedDB.clear() // ← 清空舊快取
  await indexedDB.batchPut(latestItems)

  // Step 4: 更新 UI
  return latestItems
}
```

**為什麼要 `indexedDB.clear()`？**

因為 Supabase 是唯一的 Source of Truth：

- ✅ 確保快取與雲端完全一致
- ✅ 避免顯示已刪除的資料
- ✅ 沒有離線編輯，不需要合併衝突
- ✅ 簡化邏輯，提升可靠性

**Supabase 連線失敗時**：

```typescript
try {
  const latestItems = await supabase.fetchAll()
  await indexedDB.clear()
  await indexedDB.batchPut(latestItems)
  return latestItems
} catch (supabaseError) {
  // ✅ 靜默降級：使用快取資料（唯讀模式）
  logger.warn('Supabase 連線失敗，使用快取資料')
  return cachedItems // 顯示快取，但無法編輯
}
```

---

## 3️⃣ 資料新增/修改/刪除：FastInsert 策略

```typescript
// src/stores/operations/create.ts

async function create(data) {
  // Step 1: 立即寫入 IndexedDB（快取）⚡ 樂觀更新
  await indexedDB.put(newItem)

  // Step 2: 立即更新 UI（不等待 Supabase）
  set({ items: [...items, newItem] })

  // Step 3: 背景寫入 Supabase（不阻擋 UI）
  supabase.insert(newItem).catch(error => {
    // 如果失敗，從 UI 移除
    set({ items: items.filter(i => i.id !== newItem.id) })
    alertError('新增失敗，請重試')
  })
}
```

**優勢**：

- ⚡ UI 立即回應（< 10ms）
- ✅ 背景同步到 Supabase
- ✅ 如果失敗會自動回滾

---

## 4️⃣ 權限系統的即時更新

```
情境：系統主管新增了員工的權限

Case A - 員工正在線上：
1. 系統主管更新角色 → Supabase
2. Realtime 推送 → 員工的瀏覽器（< 100ms）
3. 員工立即看到新功能（sidebar 自動更新）✅

Case B - 員工已登出：
1. 系統主管更新角色 → Supabase
2. 員工下次登入 → 載入最新角色
3. 看到新功能 ✅
```

**實作**：

```typescript
// src/components/PermanentRealtimeSubscriptions.tsx

useEffect(() => {
  if (!user?.id) return

  // ✅ 永久訂閱用戶角色（權限變更需立即生效）
  realtimeManager.subscribe({
    table: 'user_roles',
    filter: `user_id=eq.${user.id}`,
    subscriptionId: 'user-role-permanent',
    handlers: {
      onUpdate: newRole => {
        updateUserPermissions(newRole)
        toast.success('你的權限已更新！')
      },
    },
  })
}, [user?.id])
```

---

## 5️⃣ 完整的資料流程圖

```
使用者操作流程：

1. 登入
   └─ 載入快取 → 立即顯示 UI
   └─ 從 Supabase 拉取最新資料 → 更新 UI
   └─ 訂閱永久 Realtime（user_roles, workspaces, employees）

2. 進入列表頁（例如：/tours）
   └─ 呼叫 fetchAll()
      ├─ 顯示 IndexedDB 快取（0.1 秒）
      ├─ 從 Supabase 拉取最新資料（0.5 秒）
      └─ 清空並更新快取
   └─ 訂閱頁面 Realtime（useRealtimeForTours）
   └─ 之後任何變更都即時推送

3. 新增資料（例如：新增旅遊團）
   └─ 立即寫入 IndexedDB ⚡
   └─ 立即更新 UI（樂觀更新）
   └─ 背景寫入 Supabase
   └─ Realtime 推送給其他使用者

4. 離開頁面
   └─ useEffect cleanup 取消訂閱
   └─ 釋放 Realtime 連線

5. 登出
   └─ 取消所有訂閱
   └─ 清空 Zustand 狀態（不清空 IndexedDB，下次登入快速載入）
```

---

## 6️⃣ 斷網處理

**斷網時的行為**：

```
1. 顯示快取資料（IndexedDB）✅
2. 所有新增/修改/刪除操作會失敗 ❌
3. 顯示錯誤訊息：「網路連線失敗，請檢查網路」
4. Realtime 訂閱自動重連（最多重試 5 次）
```

**網路恢復後**：

```
1. Realtime 自動重新訂閱 ✅
2. fetchAll() 重新從 Supabase 拉取資料 ✅
3. 清空並更新快取 ✅
4. 恢復正常操作 ✅
```

**重要**：

- ❌ 沒有離線新增/編輯功能
- ❌ 沒有衝突解決邏輯（不需要）
- ✅ 簡單可靠的快取策略

---

## 7️⃣ 與舊版文檔的差異

| 項目              | 舊版說明（錯誤）          | 新版實際邏輯                  |
| ----------------- | ------------------------- | ----------------------------- |
| 資料來源          | 離線優先                  | **Supabase 優先**（快取輔助） |
| IndexedDB 角色    | 離線儲存                  | **快取層**（可隨時清空）      |
| 斷網新增          | 標記 `_needs_sync` 並上傳 | **直接失敗**（無離線編輯）    |
| 衝突解決          | LastWrite 策略            | **不需要**（無離線編輯）      |
| indexedDB.clear() | 錯誤（會丟失離線變更）    | **正確**（清空舊快取）        |

---

## 📚 相關檔案

### 核心邏輯

- `src/lib/realtime/realtime-manager.ts` - Realtime 訂閱管理
- `src/lib/realtime/createRealtimeHook.ts` - Hook 工廠函數
- `src/hooks/use-realtime-hooks.ts` - 所有表格的 Realtime Hooks

### 資料操作

- `src/stores/operations/fetch.ts` - 讀取邏輯
- `src/stores/operations/create.ts` - 新增邏輯
- `src/stores/operations/update.ts` - 修改邏輯
- `src/stores/operations/delete.ts` - 刪除邏輯

### 適配器

- `src/stores/adapters/indexeddb-adapter.ts` - IndexedDB 快取
- `src/stores/adapters/supabase-adapter.ts` - Supabase 資料庫

### 永久訂閱

- `src/components/PermanentRealtimeSubscriptions.tsx` - 權限/工作空間即時更新

---

## ✅ 總結

**Venturo 的資料架構**：

1. **Supabase 是唯一的 Source of Truth**
2. **IndexedDB 是快取層**（加速載入，可清空）
3. **Realtime 按需訂閱**（節省連線數）
4. **FastInsert 策略**（UI 立即回應）
5. **沒有離線編輯**（簡化邏輯，提升可靠性）

**優勢**：

- ⚡ 快速載入（快取優先）
- 🔄 即時同步（Realtime 推送）
- ✅ 資料一致性（Supabase 為權威）
- 🎯 簡單可靠（無複雜的衝突解決）

**限制**：

- ❌ 無法離線新增/編輯資料
- ❌ 斷網時只能查看快取（唯讀模式）

這個架構非常適合**內部管理系統**，因為：

- 員工通常在辦公室（穩定網路）
- 不需要離線編輯功能
- 重視資料一致性和即時性
