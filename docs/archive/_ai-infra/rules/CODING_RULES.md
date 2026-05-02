# Coding Rules - Venturo ERP 開發鐵律

> **版本**：1.0  
> **最後更新**：2026-03-08  
> **適用對象**：所有 coding agent、AI 開發者、人類開發者

這是 Venturo ERP 開發的**不可妥協規則**。違反這些規則的程式碼**不會被接受**。

---

## 🚨 第一鐵律：永遠讀文件，不要猜

### 開發前必讀

1. **`/ai/maps/SYSTEM_MAP.md`** — 系統結構、29 domains
2. **`/ai/maps/ROUTES_MAP.md`** — 70+ 頁面路由
3. **`/ai/maps/DB_SCHEMA.md`** — 259 張資料表
4. **`/ai/rules/DOMAIN_RULES.md`** — 業務邏輯（AI 猜不到的規則）
5. **`DESIGN_SYSTEM.md`** — 設計系統規範（莫蘭迪色系）

### 為什麼？

- ❌ 猜測會導致重複開發、業務邏輯錯誤、UI 不一致
- ✅ 讀文件會讓你了解現有架構、避免衝突、符合規範

---

## 🎨 UI 規範（設計系統鐵律）

### Rule 1：禁止硬編碼顏色

#### ❌ 禁止使用

```tsx
// 禁止 Tailwind 預設顏色
className="border-black"
className="border-gray-300"
className="text-gray-600"
className="bg-gray-100"

// 禁止 hex 顏色值
style={{ color: '#000' }}
style={{ color: '#333' }}
style={{ color: '#666' }}
style={{ borderColor: '#ccc' }}
```

#### ✅ 正確使用

```tsx
// 使用設計系統 CSS 變數
className = 'border-[var(--border)]' // 奶茶邊框 #d4c4b0
className = 'text-[var(--morandi-primary)]' // 主要文字 #3a3633
className = 'text-[var(--morandi-secondary)]' // 次要文字 #8b8680
className = 'text-[var(--morandi-muted)]' // 淡化文字 #b8b2aa
className = 'bg-[var(--background)]' // 頁面背景 #f6f4f1
className = 'bg-[var(--card)]' // 卡片背景 #ffffff
```

#### 為什麼？

1. **深色模式自動適配** — CSS 變數會隨主題切換
2. **視覺一致性** — 所有元件都用同一套配色
3. **品牌識別度** — 莫蘭迪色系是 Venturo 的視覺特色
4. **維護性** — 改一個變數，全站更新

### Rule 2：禁止使用 Emoji

#### ❌ 禁止使用

```tsx
<button>✅ 確認</button>
<div>🔥 熱門行程</div>
<span>📍 東京</span>
```

#### ✅ 正確使用

```tsx
// 使用 Lucide React icons
import { Check, Flame, MapPin } from 'lucide-react'

<button><Check className="w-4 h-4" /> 確認</button>
<div><Flame className="w-4 h-4" /> 熱門行程</div>
<span><MapPin className="w-4 h-4" /> 東京</span>
```

#### 為什麼？

1. **跨平台一致性** — Emoji 在不同系統顯示不同
2. **專業感** — 企業系統不該用 Emoji
3. **可控性** — Icon 可以調大小、顏色、對齊

### Rule 3：統一使用設計系統元件

#### 按鈕

```tsx
// ❌ 自己寫樣式
<button className="px-4 py-2 bg-blue-500 text-white rounded">

// ✅ 使用設計系統
<button className="btn-morandi-primary">
```

#### 卡片

```tsx
// ❌ 自己寫樣式
<div className="p-4 bg-white border border-gray-200 rounded-lg shadow">

// ✅ 使用設計系統
<div className="morandi-card">
```

#### 輸入框

```tsx
// ❌ 硬編碼樣式
<input className="border-gray-300 focus:border-blue-500" />

// ✅ 使用設計系統（預設就有樣式）
<input className="w-full" />
```

### Rule 4：邊框樣式規範

#### 實線邊框

```tsx
// ✅ 正確
className = 'border border-[var(--border)]' // 1px 實線
className = 'border-2 border-[var(--border)]' // 2px 實線
className = 'border-[var(--morandi-gold)]' // 強調色邊框
```

#### 虛線邊框

```tsx
// ✅ 正確
className = 'border-dashed border-[var(--border)]' // 虛線
className = 'border-dashed border-[var(--border)]/50' // 半透明虛線
```

#### 陰影

```tsx
// ❌ 不要用 Tailwind 預設陰影
className = 'shadow-md'

// ✅ 使用設計系統陰影（在 CSS 定義好的）
className = 'morandi-card' // 自帶陰影
```

---

## 💾 資料庫規範

### Rule 5：改之前先查 Schema

#### ❌ 錯誤做法

```ts
// 直接假設欄位存在
const { name, email, phone } = customer
```

#### ✅ 正確做法

```bash
# 先查 DB_SCHEMA.md 或實際資料庫
grep -A 20 "CREATE TABLE customers" /ai/maps/DB_SCHEMA.md
```

#### 為什麼？

- 欄位名稱可能不是你想的（例如 `first_name` 不是 `name`）
- 可能有必填欄位（`NOT NULL`）
- 可能有外鍵約束（`REFERENCES`）

### Rule 6：所有表都有 workspace_id

Venturo ERP 是**多租戶系統**，每個公司的資料隔離。

#### ✅ 正確查詢

```ts
const tours = await supabase.from('tours').select('*').eq('workspace_id', workspaceId) // 必須過濾
```

#### ❌ 錯誤查詢

```ts
const tours = await supabase.from('tours').select('*') // 會拿到所有公司的資料！
```

### Rule 7：Soft Delete

不要真的刪除資料，用 `deleted_at` 標記。

#### ✅ 正確

```ts
await supabase.from('tours').update({ deleted_at: new Date().toISOString() }).eq('id', tourId)
```

#### ❌ 錯誤

```ts
await supabase.from('tours').delete().eq('id', tourId)
```

---

## 🔧 TypeScript 規範

### Rule 8：零錯誤原則

TypeScript 錯誤**不是警告**，是**絕對錯誤**。

#### ✅ 開發流程

1. 寫完程式碼
2. 等 dev server 編譯
3. 確認**零 TypeScript 錯誤**
4. 測試功能
5. Commit

#### ❌ 不可接受

- 「先 commit，晚點再修 TypeScript 錯誤」
- 「只是 type 錯誤，不影響功能」
- 用 `@ts-ignore` 略過錯誤

### Rule 9：Type 定義在 `/src/types/`

```ts
// ✅ 正確
import { Tour } from '@/types/tour'

// ❌ 錯誤
interface Tour {
  // 在檔案裡自己定義
  id: string
  name: string
}
```

### Rule 10：API Response 要驗證

```ts
// ❌ 錯誤
const data = await fetch('/api/tours').then(r => r.json())
console.log(data.name) // 假設一定有 name

// ✅ 正確
const response = await fetch('/api/tours')
if (!response.ok) throw new Error('Failed to fetch')
const data = await response.json()
if (!data || typeof data.name !== 'string') {
  throw new Error('Invalid response')
}
```

---

## 📁 檔案結構規範

### Rule 11：不要隨便新增檔案

檢查是否已有類似功能：

```bash
# 先搜尋
grep -r "CustomerList" src/
grep -r "function createCustomer" src/

# 確認沒有才新增
```

### Rule 12：刪檔案前查所有引用

```bash
# 刪除 src/components/old-button.tsx 前
grep -r "old-button" src/

# 如果有引用，要一起改
```

### Rule 13：元件放對位置

```
src/
├── app/              ← Next.js 頁面路由
├── components/       ← 通用元件（Button, Card, Input）
├── features/         ← 功能模組（tours, customers, orders）
│   └── tours/
│       ├── components/    ← 該功能專用元件
│       ├── hooks/         ← 該功能專用 hooks
│       └── utils/         ← 該功能專用工具
├── lib/              ← 通用工具（supabase client, utils）
└── types/            ← TypeScript 定義
```

---

## 🧪 測試與驗證規範

### Rule 14：改之前跑一次，改之後跑一次

```bash
# 改之前
npm run dev
# 測試現有功能正常

# 修改程式碼

# 改之後
npm run dev
# 測試新功能 + 確認沒破壞舊功能
```

### Rule 15：Console.log 要清掉

```ts
// ❌ Commit 前要刪掉
console.log('Debug:', data)
console.log('TEST TEST TEST')

// ✅ 可以保留（有意義的錯誤處理）
console.error('Failed to fetch tour:', error)
```

---

## 📝 業務邏輯規範

### Rule 16：讀 DOMAIN_RULES.md

Venturo ERP 的業務邏輯**不是常識**，必須讀文件。

#### 範例：訂單是唯一源頭

```ts
// ✅ 正確：先建訂單，才能建客戶
1. 建立 order
2. 建立 customer（關聯到 order）
3. 建立 tour（從 order 來）

// ❌ 錯誤：先建客戶
1. 建立 customer
2. 建立 order  // 找不到客戶！
```

#### 範例：代收轉付

```ts
// ✅ 正確：收款和付款分開記
收款：客戶付 50000 → 記錄 payment_received
付款：付給飯店 40000 → 記錄 payment_disbursed
毛利：50000 - 40000 = 10000

// ❌ 錯誤：直接記毛利
profit = 10000  // 無法追蹤金流！
```

### Rule 17：不確定就問，不要猜

```ts
// ❌ 錯誤
// 我猜 tour_code 格式是 "TOUR-001"
const tourCode = `TOUR-${String(id).padStart(3, '0')}`

// ✅ 正確
// 查 DOMAIN_RULES.md 或問 William AI
// 發現實際格式是 "JP-OSA-20260401-001"
```

---

## 🚀 效能規範

### Rule 18：避免 N+1 查詢

```ts
// ❌ 錯誤（每個 tour 查一次客戶）
const tours = await getTours()
for (const tour of tours) {
  const customer = await getCustomer(tour.customer_id) // N+1!
}

// ✅ 正確（一次拿全部）
const tours = await supabase.from('tours').select('*, customer:customers(*)')
```

### Rule 19：分頁查詢

```ts
// ❌ 錯誤（一次拿全部）
const allTours = await supabase.from('tours').select('*')

// ✅ 正確（分頁）
const { data: tours } = await supabase.from('tours').select('*').range(0, 49) // 只拿 50 筆
```

---

## ⚠️ 安全規範

### Rule 20：永遠驗證輸入

```ts
// ❌ 錯誤
async function createTour(name: string) {
  await supabase.from('tours').insert({ name })
}

// ✅ 正確
async function createTour(name: string) {
  if (!name || name.length < 2) {
    throw new Error('Tour name must be at least 2 characters')
  }
  if (name.length > 100) {
    throw new Error('Tour name too long')
  }
  await supabase.from('tours').insert({ name })
}
```

### Rule 21：API 要檢查權限

```ts
// ❌ 錯誤（沒檢查權限）
export async function GET(req: Request) {
  const tours = await supabase.from('tours').select('*')
  return Response.json(tours)
}

// ✅ 正確
export async function GET(req: Request) {
  const session = await getSession(req)
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const tours = await supabase.from('tours').select('*').eq('workspace_id', session.workspace_id) // 只能看自己公司的

  return Response.json(tours)
}
```

---

## 🎯 Commit 規範

### Rule 22：有意義的 Commit Message

```bash
# ❌ 錯誤
git commit -m "fix"
git commit -m "update"
git commit -m "aaa"

# ✅ 正確
git commit -m "fix: 修復訂單列表的分頁錯誤"
git commit -m "feat: 新增客戶詳細頁的編輯功能"
git commit -m "refactor: 統一使用設計系統的按鈕樣式"
```

### Rule 23：Pre-commit Hook 會檢查

Venturo ERP 有 pre-commit hook，會自動檢查：

- TypeScript 錯誤
- ESLint 錯誤
- Prettier 格式

**不要略過 hook！**

```bash
# ❌ 錯誤
git commit --no-verify

# ✅ 正確
# 修正所有錯誤後再 commit
```

---

## 📚 總結：開發前檢查清單

- [ ] 讀過 `/ai/maps/` 相關文件
- [ ] 讀過 `/ai/rules/DOMAIN_RULES.md`
- [ ] 讀過 `DESIGN_SYSTEM.md`
- [ ] 確認沒有硬編碼顏色
- [ ] 確認沒有 Emoji
- [ ] 確認 TypeScript 零錯誤
- [ ] 確認有 `workspace_id` 過濾
- [ ] 確認有權限檢查
- [ ] 測試過功能正常
- [ ] Commit message 有意義

---

## 🔴 違反後果

- **硬編碼顏色** → Code review 不通過，要求重寫
- **TypeScript 錯誤** → CI/CD 失敗，無法部署
- **業務邏輯錯誤** → 資料錯亂，嚴重影響客戶
- **安全漏洞** → 資料外洩風險

**這些規則不是建議，是鐵律。**

---

**版本記錄**：

- 2026-03-08：v1.0 初版（馬修建立）

_最後更新：2026-03-08_  
_維護者：馬修 🔧 + William AI 🔱_
