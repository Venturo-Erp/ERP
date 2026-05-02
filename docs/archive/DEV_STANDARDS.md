# 開發規範索引

**開發前必讀**：根據任務類型，先讀對應規範。

---

## 📐 規範分類

### 1. 程式碼風格

- **檔案**：`docs/CODING_STANDARDS.md`
- **適用**：所有程式碼
- **重點**：
  - 不用 `@ts-expect-error`
  - Next.js 15 params 必須 await
  - 不用 `any`

### 2. 列印系統

- **檔案**：`src/lib/print/README.md`
- **適用**：任何列印功能
- **重點**：
  - 使用 `PrintableWrapper` 做預覽
  - 使用 `printElement()` 做列印
  - A4 尺寸、頁首頁尾

### 3. 設計系統（顏色）

- **檔案**：`docs/DESIGN_SYSTEM.md`
- **適用**：UI 開發
- **重點**：
  - 使用 `morandi-*` 顏色
  - 不硬編 hex 色碼
  - 元件用 shadcn/ui

### 4. 資料層

- **檔案**：`src/data/README.md`
- **適用**：Supabase query
- **重點**：
  - 使用 entity hooks
  - 欄位要在 select 裡
  - 改完跑 type-check

### 5. 多語系

- **檔案**：`docs/I18N.md`
- **適用**：任何文字
- **重點**：
  - 文字放 `constants/labels.ts`
  - 不硬編中文在 TSX

---

## 🔍 任務對照表

| 任務類型      | 必讀規範              |
| ------------- | --------------------- |
| 新增列印功能  | 列印系統              |
| 修改 UI       | 設計系統              |
| 新增頁面      | 程式碼風格 + 設計系統 |
| 修改 Supabase | 資料層                |
| 新增文字      | 多語系                |
| 重構組件      | 程式碼風格            |

---

## ⚠️ 常見錯誤

### ❌ 顏色

```tsx
// 錯誤
<div className="text-[#8B7355]">

// 正確
<div className="text-morandi-brown">
```

### ❌ 列印

```tsx
// 錯誤：自己寫 iframe
const iframe = document.createElement('iframe')
// ... 100 行 ...

// 正確：用統一服務
import { printElement } from '@/lib/print'
printElement(ref.current, { title: '標題' })
```

### ❌ 硬編文字

```tsx
// 錯誤
<Button>儲存</Button>

// 正確
<Button>{LABELS.SAVE}</Button>
```
