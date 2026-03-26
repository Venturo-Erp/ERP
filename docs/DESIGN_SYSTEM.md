# 設計系統

## 顏色

**只用 Tailwind class，不硬編 hex。**

### 主要顏色

| 用途 | Class | 說明 |
|-----|-------|------|
| 主色 | `morandi-gold` | 金色，用於強調 |
| 次色 | `morandi-brown` | 棕色，用於標題 |
| 背景 | `morandi-background` | 淺色背景 |
| 容器 | `morandi-container` | 卡片背景 |
| 邊框 | `morandi-border` | 分隔線 |

### 狀態顏色

| 狀態 | Class |
|-----|-------|
| 成功 | `morandi-green` |
| 警告 | `morandi-yellow` |
| 錯誤 | `morandi-red` |
| 資訊 | `morandi-blue` |

### 文字顏色

| 用途 | Class |
|-----|-------|
| 主要 | `text-morandi-primary` |
| 次要 | `text-morandi-secondary` |
| 提示 | `text-morandi-muted` |

---

## ❌ 錯誤示範

```tsx
// ❌ 不要硬編顏色
<div className="text-[#8B7355]">
<div style={{ color: '#C4A052' }}>

// ✅ 正確
<div className="text-morandi-brown">
<div className="text-morandi-gold">
```

---

## 元件

使用 shadcn/ui 元件，不自己寫。

| 元件 | 來源 |
|-----|------|
| Button | `@/components/ui/button` |
| Dialog | `@/components/ui/dialog` |
| Input | `@/components/ui/input` |
| Select | `@/components/ui/select` |
| Table | `@/components/ui/table` |

---

## 間距

使用 Tailwind 標準：

| 用途 | Class |
|-----|-------|
| 區塊間距 | `space-y-4` |
| 卡片內距 | `p-4` |
| 表格間距 | `gap-2` |

---

## 字體大小

| 用途 | Class |
|-----|-------|
| 標題 | `text-xl font-bold` |
| 副標題 | `text-lg font-semibold` |
| 內文 | `text-sm` |
| 提示 | `text-xs text-morandi-muted` |
