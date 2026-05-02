# 📋 Venturo 代碼規範 - 嚴格執行版

> ⚠️ **DEPRECATED 2026-05-02**：本文件部分跟憲法 `VENTURO_ERP_STANDARDS.md` 重疊、衝突部分以憲法為準。
>
> **跟憲法重疊（以憲法為準）**：
> - **規則 #1 禁 `any`** → 憲法 §11 已規範
> - **規則 #6 禁 `console.log`** → 憲法 §10.19 已規範
> - **`as any` 遺留清單**（2025-12-25 快照、43 處）— 是歷史紀錄、不再維護
>
> **仍有效的獨有細節**：
> - **規則 #2 單檔行數限制**（300 / 200 / 150 行）— 憲法沒涵蓋、繼續適用
> - **規則 #3-5 組件職責 / 嵌套深度 / 參數數量** — 細節規範、繼續適用
> - **日期處理規範**（`parseLocalDate` / `toTaipeiDateString`、避免 UTC 午夜陷阱）— 重要實作細節、繼續適用
> - **Stale Closure 防範**（SWR functional update / `useCallback` 依賴）— 重要實作細節、繼續適用
> - **Next.js RSC 邊界**（`'use client'` 規則）— 重要實作細節、繼續適用
> - **檔案 / 變數命名**（PascalCase / camelCase / kebab-case 規則）— 仍適用
>
> **計畫**：本檔不再更新、實作細節未來考慮合併進憲法或拆成 `IMPLEMENTATION_PATTERNS.md`。

**版本**: 2.0.0
**日期**: 2025-12-10
**狀態**: ⚠️ deprecated（部分有效、見上方 header）

---

## ⚠️ 零容忍規則

以下規則**絕對禁止違反**，違反者必須立即修正：

### 🚫 規則 #1: 禁止使用 `any` 類型

```typescript
// ❌ 絕對禁止
function handleData(data: any) {}
const items: any[] = []
const result: any = await fetch()

// ✅ 必須使用明確類型
function handleData(data: CustomerData) {}
const items: Customer[] = []
const result: ApiResponse = await fetch()

// ✅ 如果真的不知道類型，使用 unknown 並做類型檢查
function handleData(data: unknown) {
  if (isCustomerData(data)) {
    // 現在可以安全使用
  }
}
```

**例外情況**（需要團隊審查）：

- 第三方套件沒有類型定義
- 動態 JSON 解析（但仍需立即驗證）

---

### 🚫 規則 #2: 單一文件行數限制

| 文件類型    | 最大行數 | 超過時的處理 |
| ----------- | -------- | ------------ |
| 組件 (.tsx) | 300 行   | 🔴 必須拆分  |
| Hook        | 200 行   | 🔴 必須拆分  |
| 工具函數    | 150 行   | 🔴 必須拆分  |
| 類型定義    | 500 行   | 🔴 必須拆分  |
| API 路由    | 200 行   | 🔴 必須拆分  |

**檢查命令**：

```bash
# 找出所有超過 300 行的組件
find src -name "*.tsx" -exec wc -l {} \; | awk '$1 > 300 {print}'

# 自動化檢查（CI/CD 中執行）
npm run lint:file-size
```

---

### 🚫 規則 #3: 組件職責單一

```typescript
// ❌ 錯誤：一個組件做太多事
function CustomerPage() {
  // 資料獲取
  const [customers, setCustomers] = useState([])
  useEffect(() => { /* 複雜的 fetch 邏輯 */ }, [])

  // 表單處理
  const handleSubmit = () => { /* 100 行表單邏輯 */ }

  // 過濾排序
  const filtered = customers.filter(/* 複雜邏輯 */)

  // UI 渲染
  return (
    <div>{/* 500 行 JSX */}</div>
  )
}

// ✅ 正確：拆分成多個組件和 Hook
function CustomerPage() {
  const { customers, loading } = useCustomers() // Hook 負責資料
  const { filteredCustomers } = useCustomerFilter(customers) // Hook 負責過濾

  return (
    <div>
      <CustomerFilters /> {/* 獨立組件 */}
      <CustomerTable customers={filteredCustomers} /> {/* 獨立組件 */}
      <CustomerForm /> {/* 獨立組件 */}
    </div>
  )
}
```

---

### 🚫 規則 #4: 禁止超過 3 層嵌套

```typescript
// ❌ 錯誤：嵌套太深
if (user) {
  if (user.role === '系統主管') {
    if (user.workspace) {
      if (user.workspace.active) {
        // 做某事
      }
    }
  }
}

// ✅ 正確：提前返回（Early Return）
if (!user) return
if (user.role !== '系統主管') return
if (!user.workspace) return
if (!user.workspace.active) return

// 做某事
```

---

### 🚫 規則 #5: 函數參數不超過 3 個

```typescript
// ❌ 錯誤：參數太多
function createUser(
  name: string,
  email: string,
  role: string,
  workspace: string,
  department: string,
  active: boolean
) {}

// ✅ 正確：使用物件參數
interface CreateUserParams {
  name: string
  email: string
  role: string
  workspace: string
  department: string
  active: boolean
}

function createUser(params: CreateUserParams) {}

// 使用時更清晰
createUser({
  name: 'John',
  email: 'john@example.com',
  role: '系統主管',
  workspace: 'abc',
  department: 'IT',
  active: true,
})
```

---

## 📁 文件結構規範

### 組件文件結構

```
src/components/
├── feature-name/
│   ├── FeatureComponent.tsx       # 主組件 (< 300 行)
│   ├── index.ts                   # 導出
│   ├── components/                # 子組件
│   │   ├── SubComponent1.tsx     # (< 200 行)
│   │   └── SubComponent2.tsx
│   ├── hooks/                     # 自定義 Hook
│   │   ├── useFeatureData.ts     # (< 200 行)
│   │   └── useFeatureActions.ts
│   ├── types.ts                   # 類型定義 (< 200 行)
│   ├── constants.ts               # 常數
│   └── utils.ts                   # 工具函數 (< 150 行)
```

### 禁止的結構

```
❌ src/components/
   └── MegaComponent.tsx  (2000 行！)

❌ src/types.ts  (7000 行！)

❌ src/utils/
   └── everything.ts  (1000 行！)
```

---

## 🔍 類型安全規範

### 強制啟用 TypeScript 嚴格模式

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 類型定義規範

```typescript
// ✅ 正確：完整的類型定義
interface User {
  id: string
  name: string
  email: string
  role: '系統主管' | 'user' | 'viewer' // 使用聯合類型，不是 string
  workspace: Workspace // 使用接口，不是 any
  createdAt: string // 或 Date
  updatedAt: string
}

// ✅ 正確：泛型使用
interface ApiResponse<T> {
  data: T
  error: string | null
  loading: boolean
}

// ✅ 正確：條件類型
type UserRole = User['role'] // 從接口提取
type RequiredKeys<T> = {
  [K in keyof T]-?: T[K]
}
```

---

## 🎯 組件拆分策略

### 何時拆分組件？

觸發以下**任一條件**就必須拆分：

1. ✅ 組件超過 300 行
2. ✅ 有超過 5 個 useState
3. ✅ 有超過 3 個 useEffect
4. ✅ JSX 嵌套超過 5 層
5. ✅ 函數內有超過 50 行邏輯

### 拆分範例

#### 拆分前（2110 行！）

```typescript
// ❌ src/app/(main)/customers/page.tsx (2110 行)
function CustomersPage() {
  // 100 行狀態定義
  // 200 行資料獲取邏輯
  // 300 行表單處理
  // 400 行過濾排序
  // 500 行 UI 渲染
  // 600 行其他功能
}
```

#### 拆分後

```typescript
// ✅ src/app/(main)/customers/page.tsx (100 行)
function CustomersPage() {
  return (
    <CustomerPageLayout>
      <CustomerFilters />
      <CustomerTable />
      <CustomerActions />
    </CustomerPageLayout>
  )
}

// ✅ src/features/customers/hooks/useCustomers.ts (80 行)
export function useCustomers() {
  // 資料獲取邏輯
}

// ✅ src/features/customers/hooks/useCustomerForm.ts (120 行)
export function useCustomerForm() {
  // 表單邏輯
}

// ✅ src/features/customers/components/CustomerTable.tsx (200 行)
export function CustomerTable() {
  // 表格渲染
}

// ✅ src/features/customers/components/CustomerFilters.tsx (150 行)
export function CustomerFilters() {
  // 過濾 UI
}
```

---

## 🛠️ 自動化檢查

### ESLint 規則

創建 `.eslintrc.strict.json`:

```json
{
  "extends": ["./.eslintrc.json"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "max-lines": ["error", { "max": 300, "skipBlankLines": true, "skipComments": true }],
    "max-lines-per-function": ["warn", { "max": 50, "skipBlankLines": true }],
    "max-depth": ["error", 3],
    "max-params": ["error", 3],
    "complexity": ["warn", 10]
  }
}
```

### Pre-commit Hook

`.husky/pre-commit`:

```bash
#!/bin/sh

# 檢查文件大小
echo "🔍 檢查文件大小..."
./scripts/check-file-size.sh || exit 1

# 檢查 any 類型
echo "🔍 檢查 any 類型使用..."
./scripts/check-any-usage.sh || exit 1

# TypeScript 檢查
echo "🔍 TypeScript 類型檢查..."
npm run type-check || exit 1

# Lint 檢查
echo "🔍 ESLint 檢查..."
npm run lint || exit 1

echo "✅ 所有檢查通過！"
```

### 檢查腳本

`scripts/check-file-size.sh`:

```bash
#!/bin/bash

MAX_LINES=300
violations=0

# 檢查所有 .tsx 和 .ts 文件
for file in $(find src -name "*.tsx" -o -name "*.ts"); do
  lines=$(wc -l < "$file")

  if [ "$lines" -gt "$MAX_LINES" ]; then
    echo "❌ $file 超過 $MAX_LINES 行 (實際: $lines 行)"
    violations=$((violations + 1))
  fi
done

if [ "$violations" -gt 0 ]; then
  echo ""
  echo "🚫 發現 $violations 個文件超過行數限制！"
  echo "請拆分這些文件後再提交。"
  exit 1
fi

echo "✅ 所有文件符合大小限制"
exit 0
```

`scripts/check-any-usage.sh`:

```bash
#!/bin/bash

# 檢查是否有使用 any 類型
any_count=$(grep -r ": any" src --include="*.ts" --include="*.tsx" | wc -l)

if [ "$any_count" -gt 0 ]; then
  echo "❌ 發現 $any_count 處使用 any 類型："
  grep -rn ": any" src --include="*.ts" --include="*.tsx" | head -20
  echo ""
  echo "🚫 請替換為明確的類型定義！"
  exit 1
fi

echo "✅ 沒有使用 any 類型"
exit 0
```

---

## 📊 代碼品質指標

### 必須達成的目標

| 指標                | 目標值 | 當前值 | 狀態 |
| ------------------- | ------ | ------ | ---- |
| TypeScript 嚴格模式 | 100%   | ？     | ⚠️   |
| any 類型使用        | 0 處   | 26+ 處 | ❌   |
| 超過 300 行的文件   | 0 個   | 8 個   | ❌   |
| 超過 500 行的文件   | 0 個   | 6 個   | ❌   |
| 測試覆蓋率          | >80%   | ？     | ⚠️   |
| ESLint 錯誤         | 0 個   | ？     | ⚠️   |

### 每週檢查清單

- [ ] 週一：執行 `npm run audit:code-quality`
- [ ] 週三：檢查新增的 any 類型
- [ ] 週五：檢查文件大小變化
- [ ] 每月：代碼審查，清理技術債

---

## 🚀 立即行動計劃

### Phase 1: 緊急修復（本週）

1. **修正所有 any 類型** (26+ 處)
   - [ ] `src/types/pnr.types.ts` - 定義明確類型
   - [ ] API routes - 使用 zod 驗證
   - [ ] Hooks - 添加泛型類型

2. **拆分超大文件** (8 個)
   - [ ] `src/lib/supabase/types.ts` (7280 行) → 按模組拆分
   - [ ] `src/app/(main)/customers/page.tsx` (2110 行) → 拆成 5 個文件
   - [ ] `src/components/orders/OrderMembersExpandable.tsx` (1799 行) → 拆成 8 個組件

### Phase 2: 建立防護（下週）

3. **設置自動化檢查**
   - [ ] 創建 ESLint 嚴格規則
   - [ ] 設置 pre-commit hook
   - [ ] CI/CD 整合檢查

4. **團隊培訓**
   - [ ] 分享本規範文檔
   - [ ] Code Review 檢查清單
   - [ ] 最佳實踐工作坊

---

## ❌ 違規處理

### 違規等級

| 等級    | 違規內容          | 處理方式       |
| ------- | ----------------- | -------------- |
| 🔴 嚴重 | 使用 any 類型     | PR 立即退回    |
| 🔴 嚴重 | 單文件超過 500 行 | PR 立即退回    |
| 🟠 高   | 單文件超過 300 行 | 要求說明或拆分 |
| 🟡 中   | 函數超過 50 行    | 建議重構       |

### Code Review 檢查清單

審查者必須確認：

- [ ] ✅ 無 any 類型使用
- [ ] ✅ 所有文件 < 300 行
- [ ] ✅ 函數職責單一
- [ ] ✅ 嵌套不超過 3 層
- [ ] ✅ 有適當的類型定義
- [ ] ✅ 有單元測試
- [ ] ✅ 有 TSDoc 註解

---

## 📚 參考資源

- [Clean Code TypeScript](https://github.com/labs42io/clean-code-typescript)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [Effective TypeScript](https://effectivetypescript.com/)

---

---

## 🚫 規則 #6: 禁止 console.log/error/warn

```typescript
// ❌ 絕對禁止
console.log('debug:', data)
console.error('錯誤:', error)
console.warn('警告:', message)

// ✅ 唯一正確做法
import { logger } from '@/lib/utils/logger'

logger.log('資訊:', data)
logger.error('錯誤:', error)
logger.warn('警告:', message)
```

**Logger 優勢**：

- 統一格式
- 可控制輸出級別
- 生產環境可關閉
- 便於追蹤問題

**例外情況**：

1. `src/lib/utils/logger.ts` - Logger 本身的實現
2. `scripts/` - 開發工具腳本

---

## 📅 日期處理規範

> **背景**: 資料庫日期字串解析時常見的時區陷阱

### 問題說明

資料庫存的日期字串（如 `2024-01-15`）使用 `new Date()` 或 `parseISO()` 解析時，會被解析為 **UTC 午夜**，在台灣時區可能導致日期偏差：

```typescript
// ❌ 錯誤：會被解析為 UTC 午夜
new Date('2024-01-15') // → 2024-01-15T00:00:00.000Z (UTC)
parseISO('2024-01-15') // → 2024-01-15T00:00:00.000Z (UTC)
// 在台灣 (UTC+8) 顯示為 2024-01-15 08:00:00，可能導致日期比較錯誤
```

### ✅ 正確做法：使用統一工具

```typescript
import { parseLocalDate, toTaipeiDateString, startOfDay } from '@/lib/utils/format-date'

// ✅ 解析資料庫日期字串（本地時間午夜）
const date = parseLocalDate('2024-01-15')  // → new Date(2024, 0, 15) 本地午夜

// ✅ 將 ISO 時間轉為台灣日期字串
const dateStr = toTaipeiDateString('2024-01-15T16:00:00.000Z')  // → "2024-01-16"

// ✅ 日期比較時使用 startOfDay 消除時間影響
if (isSameDay(startOfDay(date1), startOfDay(date2))) { ... }
```

### 日期工具函式

| 函式                            | 用途                        | 位置                      |
| ------------------------------- | --------------------------- | ------------------------- |
| `parseLocalDate(dateStr)`       | 解析日期字串為本地時間      | `@/lib/utils/format-date` |
| `toTaipeiDateString(isoString)` | ISO → 台灣日期 `YYYY-MM-DD` | `@/lib/utils/format-date` |
| `toTaipeiTimeString(isoString)` | ISO → 台灣時間 `HH:MM`      | `@/lib/utils/format-date` |
| `startOfDay(date)`              | 取得日期午夜時間            | `@/lib/utils/format-date` |
| `formatDate(date)`              | 格式化為 `YYYY-MM-DD`       | `@/lib/utils/format-date` |

### ❌ 禁止的做法

```typescript
// ❌ 不要使用 date-fns 的 parseISO
import { parseISO } from 'date-fns'
const date = parseISO('2024-01-15')  // UTC 午夜

// ❌ 不要直接 new Date 解析日期字串
const date = new Date('2024-01-15')  // UTC 午夜

// ❌ 不要在各組件自己實作日期解析
function myParseDate(str) { ... }  // 應使用統一工具
```

---

## 🔒 Stale Closure 防範

> **背景**: React 閉包陷阱導致資料更新失敗

### 問題說明

**Stale Closure（過時閉包）** 是 React 中最常見的 bug 來源：

```typescript
// ❌ 危險模式：callback 中使用外部狀態變數
const handleSave = useCallback(() => {
  updateField('image', url)
  updateField('position', { x: 50, y: 50 }) // data 可能已過時
}, [updateField]) // 缺少 data 依賴

// ❌ 危險模式：SWR mutate 使用過時陣列
mutate(KEY, [...items, newItem], false) // items 可能是 stale
```

### ✅ 正確做法

```typescript
// ✅ 方案 1：合併多個狀態更新為一次
const handleSave = useCallback(() => {
  onChange({
    ...data,
    image: url,
    position: { x: 50, y: 50 },
  })
}, [data, onChange])

// ✅ 方案 2：SWR 使用 functional update
mutate(KEY, currentItems => [...(currentItems || []), newItem], false)

// ✅ 方案 3：React setState 使用 functional update
setItems(prev => [...prev, newItem])
```

### 必須檢查的情境

| 情境                       | 檢查項目                             |
| -------------------------- | ------------------------------------ |
| SWR mutate 樂觀更新        | 必須使用 `(current) => ...` 函式形式 |
| 連續多次 setState          | 考慮合併為單次更新                   |
| useCallback 中使用外部狀態 | 確認依賴陣列完整                     |
| 事件處理器中讀取狀態       | 使用 `useRef` 或 functional update   |
| 異步操作後更新狀態         | 確認使用最新值                       |

### 開發時自問

- [ ] 這個 callback 內使用的變數，在執行時是最新的嗎？
- [ ] 連續呼叫多次 setState/update，會不會互相覆蓋？
- [ ] 異步操作完成後，使用的狀態是當時的還是最新的？
- [ ] useCallback/useMemo 的依賴陣列是否完整？

---

## 🚨 Next.js RSC 邊界規範

> **背景**: Next.js 16 使用 Turbopack，對 Server/Client Component 邊界檢查更嚴格。

### ❌ 常見錯誤

```typescript
// ❌ 錯誤：在 Server Component 中使用 client hooks
// page.tsx (Server Component)
import { useMyHook } from './hooks' // 會報錯！

// ❌ 錯誤：barrel export 混合 server/client
// features/index.ts
export * from './components' // 包含 client components
export * from './hooks' // 包含 client hooks
```

### ✅ 正確做法

```typescript
// ✅ 1. Client Hooks 檔案必須加 'use client'
// hooks/useMyHook.ts
'use client'
import useSWR from 'swr'
export function useMyHook() { ... }

// ✅ 2. 使用 client hooks 的 index 也要加 'use client'
// features/my-feature/hooks/index.ts
'use client'
export * from './useMyHook'

// ✅ 3. 頁面使用 client component 包裝
// page.tsx (Server Component)
import { MyClientComponent } from './components/MyClientComponent'
export default function Page() {
  return <MyClientComponent />
}

// ✅ 4. 或直接標記頁面為 client
// page.tsx
'use client'
import { useMyHook } from './hooks'
```

### RSC 邊界檢查清單

- [ ] 使用 `useState`, `useEffect`, SWR 等 hooks 的檔案有 `'use client'`
- [ ] 使用 `onClick`, `onChange` 等事件的組件有 `'use client'`
- [ ] barrel export (`index.ts`) 如果包含 client code，整個檔案加 `'use client'`
- [ ] 避免 Server Component 直接 import client hooks

---

## 📝 命名規範

### 檔案命名

| 類型  | 格式                         | 範例                  |
| ----- | ---------------------------- | --------------------- |
| 組件  | PascalCase                   | `CustomerTable.tsx`   |
| Hooks | camelCase                    | `useCustomerStore.ts` |
| 工具  | kebab-case                   | `format-date.ts`      |
| 型別  | kebab-case + `.types.ts`     | `customer.types.ts`   |
| 常數  | kebab-case + `.constants.ts` | `status.constants.ts` |

### 變數命名

```typescript
// ✅ 組件：PascalCase
function CustomerTable() {}

// ✅ Hook：use 前綴 + camelCase
function useCustomerData() {}

// ✅ 常數：UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3

// ✅ 函數/變數：camelCase
const fetchCustomers = async () => {}
const customerList = []

// ✅ 型別/介面：PascalCase
interface Customer {}
type CustomerStatus = 'active' | 'inactive'

// ✅ 私有變數：_ 前綴（僅在 class 中）
class Store {
  private _cache = new Map()
}
```

---

## 📋 as any 遺留清單 (43 處，已凍結)

以下是 2025-12-25 技術債清理時記錄的現存 `as any` 使用。**新代碼絕對禁止新增**。

| 檔案                                | 數量 | 原因                         |
| ----------------------------------- | ---- | ---------------------------- |
| `src/stores/cloud-store-factory.ts` | 8    | Supabase 泛型 store 類型推導 |
| `src/stores/order-store.ts`         | 5    | Supabase 關聯查詢類型        |
| `src/stores/passport-ocr-store.ts`  | 4    | OCR API 回應類型             |
| `src/stores/quote-store.ts`         | 4    | 報價單複雜嵌套類型           |
| `src/stores/tour-store.ts`          | 3    | 團號關聯查詢                 |
| `src/lib/supabase/admin.ts`         | 2    | Supabase Admin 類型          |
| `src/app/api/` 各 route             | 7    | API 請求/回應類型轉換        |
| 其他散落                            | 10   | 各種 edge case               |

**規則**：

1. 現存的 43 處 `as any` 已凍結，不再增加
2. 新代碼絕對禁止使用 `as any`
3. 修改現有檔案時，鼓勵順便修復該檔案的 `as any`

---

**最後更新**: 2026-01-23
**強制執行日期**: 2025-12-11 起
**審查者**: 全體開發團隊

---

_⚠️ 本規範為強制執行，不符合規範的 PR 將被退回。_
