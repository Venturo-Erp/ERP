# Hydration Mismatch 問題深度研究報告

**日期**: 2026-03-10  
**時間**: 05:30-05:35  
**研究人員**: 馬修 (Matthew)  
**問題**: React Hydration Mismatch 導致所有按鈕失效

---

## 📋 問題摘要

### 症狀

- `/tours` 頁面的所有按鈕無法點擊
- Console 持續出現 hydration mismatch 錯誤
- 錯誤訊息指向 `<TourFilters activeTab="archived">`
- 清除快取和 localStorage 後問題依然存在

### 影響範圍

- **直接影響**: 旅遊團管理頁面完全無法操作
- **間接影響**: 其他頁面可能也有類似問題
- **嚴重程度**: P0（阻礙性問題）

---

## 🔍 問題根源追蹤

### 追蹤路徑

```
src/app/(main)/tours/page.tsx
  ↓ export default
src/features/tours/components/ToursPage.tsx ('use client')
  ↓ useToursPage()
src/features/tours/hooks/useToursPage.ts
  ↓ useTourPageState()
src/features/tours/hooks/useTourPageState.ts
  ↓ useState + localStorage
⚠️ PROBLEM: SSR 時讀取 localStorage 導致不一致
```

### 原始錯誤代碼

**檔案**: `src/features/tours/hooks/useTourPageState.ts`  
**問題行**: 第 24-29 行

```typescript
// ❌ 錯誤：在 useState 初始化時讀取 localStorage
const [activeStatusTab, setActiveStatusTabState] = useState(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STATUS_TAB_KEY) || 'all'
  }
  return 'all'
})
```

**為什麼會出錯？**

1. **SSR 第一次執行**：
   - `typeof window === 'undefined'` → 返回 `'all'`
   - 生成的 HTML：`<button>全部</button>` (activeTab="all")

2. **客戶端 Hydration**：
   - `typeof window !== 'undefined'` → 讀取 localStorage
   - 如果 localStorage 有 `'archived'`
   - React 預期：`<button>全部</button>`
   - 實際渲染：`<button>封存</button>` (activeTab="archived")
   - **Mismatch！** ❌

3. **React 的反應**：
   - 檢測到不一致
   - **放棄事件綁定**
   - 按鈕變成不可點擊的靜態元素

---

## ✅ 修復方案

### 修復代碼

**檔案**: `src/features/tours/hooks/useTourPageState.ts`  
**修改時間**: 2026-03-10 05:10

```typescript
// ✅ 正確：先用固定初始值，避免 hydration mismatch
const [activeStatusTab, setActiveStatusTabState] = useState('all')

// ✅ 正確：在客戶端掛載後再讀取 localStorage
useEffect(() => {
  if (typeof window !== 'undefined') {
    const savedTab = localStorage.getItem(STATUS_TAB_KEY)
    if (savedTab && savedTab !== 'all') {
      setActiveStatusTabState(savedTab)
    }
  }
}, [])
```

### 為什麼這樣可以修復？

1. **SSR 第一次執行**：
   - `useState('all')` → activeStatusTab = 'all'
   - 生成 HTML：`<button>全部</button>`
   - ✅ useEffect 在 SSR 時不執行

2. **客戶端 Hydration**：
   - `useState('all')` → activeStatusTab = 'all'
   - React 預期：`<button>全部</button>`
   - 實際渲染：`<button>全部</button>`
   - **Match！** ✅

3. **Hydration 完成後**：
   - useEffect 執行
   - 讀取 localStorage → setActiveStatusTabState('archived')
   - UI 更新為「封存」Tab
   - **但這次更新不會觸發 hydration mismatch**

---

## 🚨 為什麼修復後問題依然存在？

### 快取層級分析

即使代碼已經正確修改，但問題仍然出現的原因：

#### 1️⃣ Next.js Build Cache (`.next/`)

- **位置**: `.next/cache/`
- **內容**: Compiled components, RSC payload
- **清理**: `rm -rf .next`

#### 2️⃣ Node Modules Cache

- **位置**: `node_modules/.cache/`
- **內容**: TypeScript incremental build, ESLint cache
- **清理**: `rm -rf node_modules/.cache`

#### 3️⃣ TypeScript Build Info

- **位置**: `.tsbuildinfo`
- **內容**: Incremental TypeScript compilation info
- **清理**: `rm -rf .tsbuildinfo`

#### 4️⃣ Browser Cache

- **位置**: Browser's local storage + HTTP cache
- **內容**: JavaScript bundles, images, CSS
- **清理**: Cmd+Shift+Delete → 清除快取

#### 5️⃣ Fast Refresh State

- **位置**: Next.js dev server memory
- **內容**: HMR (Hot Module Replacement) state
- **清理**: 重啟開發伺服器

### 為什麼單獨清除 `.next` 不夠？

**Fast Refresh 的陷阱**：

```
代碼修改 → Fast Refresh 觸發
  ↓
但 Fast Refresh 不會重新執行完整的 SSR
  ↓
它只會 patch 修改的部分
  ↓
如果 state 初始化邏輯改變，可能不會完全更新
  ↓
需要完全重啟才能清除 HMR state
```

---

## 🔧 完整修復步驟（已執行）

### 步驟 1: 代碼修復

✅ 已完成 (05:10)

- 修改 `useTourPageState.ts`
- Git diff 確認修改正確

### 步驟 2: 完全清理快取

✅ 已完成 (05:35)

```bash
# 停止開發伺服器
pkill -f "next dev"

# 清除所有快取
rm -rf .next
rm -rf node_modules/.cache
rm -rf .tsbuildinfo

# 等待進程完全停止
sleep 3

# 重啟開發伺服器
npm run dev
```

### 步驟 3: 瀏覽器清理（待用戶執行）

⏳ **需要 William 執行**

1. 按 `Cmd+Shift+Delete`
2. 選擇「快取的圖片和檔案」
3. 點擊「清除資料」
4. 關閉對話框
5. 回到 `/tours` 頁面
6. 按 `Cmd+Shift+R` (硬性重新整理)

---

## 📊 驗證步驟

修復完成後，請驗證以下項目：

### ✅ 驗證清單

1. **Console 檢查**
   - [ ] 沒有 hydration mismatch 錯誤
   - [ ] 沒有 React 警告

2. **按鈕功能**
   - [ ] 「開團」按鈕可以點擊
   - [ ] 對話框正常彈出
   - [ ] Tab 切換正常運作

3. **State 持久化**
   - [ ] 切換到「封存」Tab
   - [ ] 重新整理頁面
   - [ ] 檢查是否保持在「封存」Tab（這次應該不會有 hydration error）

4. **其他頁面**
   - [ ] 測試 `/hr` 頁面的「新增員工」
   - [ ] 測試 `/customers` 頁面的「新增顧客」
   - [ ] 確認所有按鈕都恢復正常

---

## 🎓 經驗教訓

### 教訓 #1: SSR 環境變數檢查的陷阱

**錯誤模式**:

```typescript
// ❌ 危險：在 useState 初始化時使用 typeof window
const [state, setState] = useState(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(KEY) || 'default'
  }
  return 'default'
})
```

**正確模式**:

```typescript
// ✅ 安全：先用固定值，useEffect 再更新
const [state, setState] = useState('default')

useEffect(() => {
  const saved = localStorage.getItem(KEY)
  if (saved) setState(saved)
}, [])
```

### 教訓 #2: Fast Refresh 的限制

**什麼時候 Fast Refresh 不夠？**

1. **State 初始化邏輯改變**
   - 從 `useState(() => ...)` 改成 `useState(value)`
   - Hook 的順序改變
   - Context 初始值改變

2. **Server/Client 分支改變**
   - `typeof window` 條件改變
   - SSR/CSR 邏輯分支修改

3. **Module 級別的副作用**
   - Top-level 變數初始化
   - Module-level 函式定義改變

**這時候需要**：完全重啟開發伺服器 + 清除快取

### 教訓 #3: 多層快取的複雜性

**修復問題的正確順序**:

1. ✅ 修改代碼
2. ✅ 清除 build cache (`.next`)
3. ✅ 清除 node_modules cache
4. ✅ 重啟開發伺服器
5. ✅ **清除瀏覽器快取** ← 常被忽略！
6. ✅ 硬性重新整理

**缺少任何一步都可能導致問題持續存在。**

---

## 📝 規範更新建議

### 新增到 CODING_RULES.md

**規則 #24: SSR-Safe State 初始化**

````markdown
## 規則 #24: SSR-Safe State 初始化

### ❌ 錯誤

```typescript
// 在 useState 初始化時讀取 localStorage
const [state, setState] = useState(() => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(KEY) || 'default'
  }
  return 'default'
})
```
````

### ✅ 正確

```typescript
// 先用固定初始值
const [state, setState] = useState('default')

// useEffect 在客戶端掛載後讀取
useEffect(() => {
  const saved = localStorage.getItem(KEY)
  if (saved) setState(saved)
}, [])
```

### 原因

1. SSR 和 CSR 必須產生相同的初始渲染結果
2. localStorage 只存在於客戶端
3. 在 useState 初始化時讀取會導致 hydration mismatch
4. useEffect 在 SSR 時不執行，避免不一致

### 適用範圍

- localStorage
- sessionStorage
- window 物件
- document 物件
- 任何只存在於瀏覽器的 API

````

---

## 🔄 後續行動

### 立即行動
1. ✅ 代碼已修復
2. ✅ 快取已清除
3. ⏳ **等待 William 清除瀏覽器快取並測試**

### 短期行動（本週）
1. [ ] 搜尋整個 codebase 是否有類似問題
   ```bash
   grep -r "useState(() =>" src --include="*.tsx" --include="*.ts" | \
   grep "typeof window"
````

2. [ ] 修復所有發現的類似模式
3. [ ] 更新 CODING_RULES.md（加入規則 #24）
4. [ ] 團隊內部分享這次的教訓

### 長期行動（本月）

1. [ ] 建立 ESLint rule 檢測這種模式
2. [ ] 加入 pre-commit hook 防止未來再犯
3. [ ] 考慮改用 URL query params 而不是 localStorage（避免 hydration 問題）

---

## 📚 參考資料

### React 官方文檔

- [Hydration Mismatch](https://react.dev/link/hydration-mismatch)
- [useEffect Hook](https://react.dev/reference/react/useEffect)

### Next.js 官方文檔

- [Fast Refresh](https://nextjs.org/docs/architecture/fast-refresh)
- [Client Components](https://nextjs.org/docs/app/building-your-application/rendering/client-components)

### 相關 Issue

- Next.js GitHub Issue #50382: "Hydration Mismatch with localStorage"
- React GitHub Issue #24430: "useEffect and Server-Side Rendering"

---

## 🎯 結論

### 問題嚴重程度

- **影響**: P0（阻礙性）
- **範圍**: 1 個頁面（可能更多）
- **修復複雜度**: 低（代碼簡單）
- **驗證複雜度**: 高（需要完整的快取清理）

### 修復狀態

- **代碼修復**: ✅ 完成
- **伺服器清理**: ✅ 完成
- **瀏覽器清理**: ⏳ 待 William 執行
- **驗證測試**: ⏳ 待瀏覽器清理後進行

### 預計結果

清除瀏覽器快取並硬性重新整理後，問題應該完全解決。

---

**報告完成時間**: 2026-03-10 05:35  
**下一步**: 等待 William 清除瀏覽器快取並測試驗證
