# SWR 樂觀更新規範

## 核心原則

**樂觀更新 = 先改 UI，再同步 Server**

| 時機 | 動作 |
|------|------|
| 操作前 | 樂觀更新 UI（`mutate(key, updater, { revalidate: false })`） |
| 成功後 | **不做任何事**（樂觀更新已經是正確的） |
| 失敗時 | `invalidate()` 或 `mutate(key)` 回滾 |

---

## ❌ 錯誤做法（會閃爍）

```typescript
// 樂觀更新
mutate(key, newData, { revalidate: false })

// API 成功後又 invalidate → 閃爍！
await api.create(data)
await invalidate()  // ❌ 不要這樣
```

## ✅ 正確做法

```typescript
// 樂觀更新
mutate(key, newData, { revalidate: false })

try {
  await api.create(data)
  // 成功：不做任何事，樂觀更新已生效
} catch (err) {
  // 失敗：invalidate 回滾到正確狀態
  await invalidate()
  throw err
}
```

---

## Entity Layer（createEntityHook）

我們的 entity layer 已經遵循這個規範：

| 方法 | 樂觀更新 | 成功後 | 失敗後 |
|------|---------|--------|--------|
| `create()` | ✅ | 不 invalidate | invalidate |
| `update()` | ✅ | 不 invalidate | invalidate |
| `delete()` | ✅ | 不 invalidate | invalidate |
| `batchRemove()` | ✅ | 不 invalidate | invalidate |

**所有使用 entity layer 的地方自動遵循這個規範。**

---

## 自定義 Hook（如 useTodos）

如果你不使用 entity layer，需要自己實作：

```typescript
const create = async (data) => {
  const newItem = { id: generateUUID(), ...data }
  
  // 1. 樂觀更新
  mutate(
    swrKey,
    (current) => [...(current || []), newItem],
    { revalidate: false }
  )

  try {
    // 2. 呼叫 API（直接用 Supabase，不經過 entity layer）
    const { error } = await supabase.from('table').insert(newItem)
    if (error) throw error
    
    // 3. 成功：不做任何事
    return newItem
  } catch (err) {
    // 4. 失敗：回滾
    mutate(swrKey)
    throw err
  }
}
```

---

## Realtime 訂閱

### 單人操作為主
關閉 Realtime，純樂觀更新即可。

### 多人協作
Realtime 收到事件時，**直接更新快取**，不要 `mutate(key)` 重新 fetch：

```typescript
// ✅ 正確：直接更新快取
.on('INSERT', (payload) => {
  mutate(key, (current) => {
    if (current?.some(item => item.id === payload.new.id)) return current
    return [...(current || []), payload.new]
  }, { revalidate: false })
})

// ❌ 錯誤：觸發重新 fetch
.on('INSERT', () => {
  mutate(key)  // 會閃爍！
})
```

---

## 檢查清單

新增 CRUD 功能時：

- [ ] 樂觀更新用 `{ revalidate: false }`
- [ ] 成功後**不** invalidate
- [ ] 只有失敗時 invalidate
- [ ] 如果有 Realtime，用直接更新快取的方式
- [ ] 測試：操作後畫面不閃爍

---

## 相關檔案

- `src/data/core/createEntityHook.ts` — Entity layer 核心
- `src/hooks/useTodos.ts` — 自定義 hook 範例
- `src/lib/swr/config.ts` — SWR 全域設定

---

**更新時間**：2026-03-27
**維護者**：Matthew
