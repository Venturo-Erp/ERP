# Venturo 程式碼檢查清單

> **最後更新**: 2025-12-08
> **目的**: 避免系統性邏輯錯誤重複發生

---

## 一、必須立即處理的問題

### 1. 登入流程 workspace_code 問題 ✅ 已修復 (2025-12-08)

**問題**: 登入後 workspace_code 可能是 undefined，導致編號生成錯誤
**修復**: 登入時一併查詢 workspace_code 並存入 user 物件

---

## 二、程式碼檢查清單 (Code Review Checklist)

### A. 資料取得與空值處理

| 檢查項目               | 問題模式                | 正確做法                          |
| ---------------------- | ----------------------- | --------------------------------- |
| ❌ 用預設值掩蓋問題    | `value \|\| 'TP'`       | 拋出錯誤或顯示提示                |
| ❌ 空 catch 區塊       | `catch (e) {}`          | `catch (e) { logger.error(...) }` |
| ❌ 背景 .then() 不等待 | `fetchData().then(...)` | `await fetchData()`               |
| ❌ 假設資料已載入      | 直接使用 store.items    | 先檢查 `items.length > 0`         |

### B. 型別安全

| 檢查項目             | 問題數量 | 說明               |
| -------------------- | -------- | ------------------ |
| `as any` 使用        | 20+ 處   | 應該定義正確的型別 |
| `as unknown` 使用    | 10+ 處   | 應該使用型別守衛   |
| 可選鏈 `?.` 隱藏 bug | 15+ 處   | 應該先驗證資料存在 |

### C. Store 依賴關係

**必須按順序載入的 Stores:**

```
1. authStore (登入時)
   └── 包含 workspace_id, workspace_code
2. workspaceStore (app 啟動時)
   └── 提供 workspace 列表給 擁有平台管理資格的人
3. 其他業務 stores (進入頁面時)
```

**問題檔案清單:**

- `src/stores/auth-store.ts:87, 207` - `as any` 需要移除
- `src/stores/core/create-store.ts:126, 149, 191` - 多處型別斷言
- `src/features/tours/services/tour.service.ts:239, 314` - 空 catch

---

## 三、常見錯誤模式與修正

### 模式 1: 用預設值掩蓋問題

```typescript
// ❌ 錯誤：用 'TP' 掩蓋問題，台中同事會看到錯誤資料
const workspaceCode = getCurrentWorkspaceCode() || 'TP'

// ✅ 正確：拋出錯誤，讓使用者知道問題
const workspaceCode = getCurrentWorkspaceCode()
if (!workspaceCode) {
  throw new Error('無法取得 workspace code，請重新登入')
}
```

### 模式 2: 空 Catch 區塊

```typescript
// ❌ 錯誤：完全忽略錯誤
try {
  await doSomething()
} catch (_error) {}

// ✅ 正確：記錄錯誤，必要時通知使用者
try {
  await doSomething()
} catch (error) {
  logger.error('Operation failed:', error)
  toast.error('操作失敗，請稍後再試')
}
```

### 模式 3: 背景 .then() 不等待

```typescript
// ❌ 錯誤：不等待結果，後續代碼可能在資料載入前執行
if (store.items.length === 0) {
  store
    .fetchAll()
    .then(() => {
      // 更新快取...
    })
    .catch(() => {})
}
return null // 立即返回，資料可能還沒載入

// ✅ 正確：等待資料載入完成
if (store.items.length === 0) {
  await store.fetchAll()
}
const items = store.items
```

### 模式 4: 假設資料已載入

```typescript
// ❌ 錯誤：假設 workspaces 已載入
const workspace = workspaces.find(w => w.id === id)
return workspace.code // 可能是 undefined

// ✅ 正確：先檢查資料存在
if (!workspaces || workspaces.length === 0) {
  await loadWorkspaces()
}
const workspace = workspaces.find(w => w.id === id)
if (!workspace) {
  throw new Error(`Workspace ${id} not found`)
}
return workspace.code
```

---

## 四、新功能開發前檢查清單

### 開發前

- [ ] 這個功能需要哪些資料？
- [ ] 這些資料在使用時一定已經載入了嗎？
- [ ] 如果資料不存在，應該怎麼處理？

### 開發中

- [ ] 有沒有用 `as any` 繞過型別檢查？
- [ ] 有沒有用預設值（如 `|| 'TP'`）掩蓋問題？
- [ ] 所有 catch 區塊都有記錄錯誤嗎？
- [ ] 非同步操作有正確等待嗎？

### 開發後

- [ ] 測試：登入後立即使用這個功能
- [ ] 測試：重新整理頁面後使用這個功能
- [ ] 測試：不同 workspace 的使用者使用這個功能

---

## 五、高風險檔案清單

以下檔案有較多的型別斷言或錯誤處理問題，修改時需特別注意：

| 檔案                                          | 問題數量 | 主要問題           |
| --------------------------------------------- | -------- | ------------------ |
| `src/stores/auth-store.ts`                    | 5+       | `as any`、錯誤處理 |
| `src/stores/core/create-store.ts`             | 10+      | 大量 `as any`      |
| `src/features/tours/services/tour.service.ts` | 5+       | 空 catch、型別斷言 |
| `src/features/tours/components/ToursPage.tsx` | 6+       | 資料類型斷言       |
| `src/lib/workspace-helpers.ts`                | 3+       | 背景載入邏輯       |

---

## 六、建議的修復優先順序

### Phase 1: 立即修復 (影響資料正確性)

1. ✅ workspace_code 登入時取得
2. ⬜ auth-store.ts 的 `as any` 移除
3. ⬜ 空 catch 區塊添加錯誤記錄

### Phase 2: 短期改善 (1-2 週)

1. ⬜ 統一非同步資料載入模式
2. ⬜ 建立 Store 初始化順序文檔
3. ⬜ 改進錯誤邊界

### Phase 3: 長期改善 (1-2 月)

1. ⬜ 逐步移除所有 `as any`
2. ⬜ 添加關鍵流程的單元測試
3. ⬜ 啟用 TypeScript strict mode

---

## 七、Claude Code 開發提醒

當我（Claude Code）在開發時，必須檢查：

1. **不要用預設值掩蓋 null/undefined**
   - 問自己：這個預設值合理嗎？會不會造成資料混亂？

2. **不要假設資料已載入**
   - 問自己：這個 store 在這個時間點一定有資料嗎？

3. **不要用 `as any` 繞過型別**
   - 問自己：為什麼型別不對？根本問題是什麼？

4. **不要寫空的 catch 區塊**
   - 至少要 `logger.error()`

5. **多 workspace 測試**
   - 問自己：如果是台中辦公室的同事，這段代碼會正常運作嗎？

---

**維護者**: Claude Code
**最後審核**: 2025-12-08
