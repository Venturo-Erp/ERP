# SWR 最佳實踐規範

## 原則：避免畫面閃爍

**問題**：操作後整個列表重新 fetch，導致畫面閃爍。

**解法**：樂觀更新（Optimistic Update）

---

## 樂觀更新模式

### ✅ 正確做法

```typescript
// 1. 樂觀更新：先更新本地狀態
mutate(
  swrKey,
  (current) => /* 更新後的資料 */,
  { revalidate: false }  // 不重新 fetch
)

// 2. 呼叫 API
try {
  await apiCall()
  // 成功後不需要 revalidate
} catch (err) {
  // 失敗才需要 revalidate 回復正確狀態
  mutate(swrKey)
  throw err
}
```

### ❌ 錯誤做法

```typescript
// 樂觀更新
mutate(swrKey, ..., false)

// API 成功後又 revalidate → 畫面閃爍！
await apiCall()
mutate(swrKey)  // ❌ 不要這樣
```

---

## 各種操作的標準寫法

### 新增

```typescript
const create = async (item: Item) => {
  const newItem = { id: generateUUID(), ...item }
  
  // 樂觀更新：加到列表
  mutate(
    swrKey,
    (current: Item[] | undefined) => [...(current || []), newItem],
    { revalidate: false }
  )

  try {
    await createEntity(newItem)
    // 成功：不 revalidate
    return newItem
  } catch (err) {
    mutate(swrKey)  // 失敗：revalidate 回復
    throw err
  }
}
```

### 更新

```typescript
const update = async (id: string, updates: Partial<Item>) => {
  // 樂觀更新：修改列表中的項目
  mutate(
    swrKey,
    (current: Item[] | undefined) =>
      (current || []).map(item =>
        item.id === id ? { ...item, ...updates } : item
      ),
    { revalidate: false }
  )

  try {
    await updateEntity(id, updates)
    // 成功：不 revalidate
  } catch (err) {
    mutate(swrKey)  // 失敗：revalidate 回復
    throw err
  }
}
```

### 刪除

```typescript
const remove = async (id: string) => {
  // 樂觀更新：從列表移除
  mutate(
    swrKey,
    (current: Item[] | undefined) =>
      (current || []).filter(item => item.id !== id),
    { revalidate: false }
  )

  try {
    await deleteEntity(id)
    // 成功：不 revalidate
  } catch (err) {
    mutate(swrKey)  // 失敗：revalidate 回復
    throw err
  }
}
```

---

## 分頁列表的樂觀更新

```typescript
const remove = async (id: string) => {
  // 樂觀更新：從分頁列表移除 + 更新 count
  await mutateSelf(
    prev => prev ? {
      ...prev,
      items: prev.items.filter(item => item.id !== id),
      count: prev.count - 1,
    } : prev,
    { revalidate: false }
  )

  try {
    await deleteEntity(id)
  } catch (err) {
    await invalidateAllPaginatedQueries()
    throw err
  }
}
```

---

## 何時需要 revalidate

| 情況 | revalidate |
|------|------------|
| 操作成功 | ❌ 不需要 |
| 操作失敗 | ✅ 需要回復 |
| 其他 session 更新（Realtime） | ✅ 自動觸發 |
| 使用者手動重整 | ✅ 自動觸發 |

---

## Realtime 訂閱

如果有 Realtime 訂閱，其他人的操作會自動觸發 revalidate：

```typescript
useEffect(() => {
  const channel = supabase
    .channel('table_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'table' }, () => {
      mutate(swrKey)  // 其他人的操作會觸發這裡
    })
    .subscribe()

  return () => { channel.unsubscribe() }
}, [swrKey])
```

---

## 檢查清單

開發新的 CRUD hook 時：

- [ ] create: 樂觀新增，成功不 revalidate
- [ ] update: 樂觀更新，成功不 revalidate
- [ ] delete: 樂觀刪除，成功不 revalidate
- [ ] 所有操作失敗時 revalidate 回復
- [ ] 測試：操作後畫面不閃爍

---

**更新時間**：2026-03-27
**維護者**：Matthew
