# 🎨 Venturo 設計系統規範

> **設計理念**：優雅、精緻、有質感的莫蘭迪風格設計
> **參考標準**：登入頁面的視覺風格

---

## 📐 核心設計 Token

### 1. 圓角規範（Border Radius）

**以登入頁面為標準：**

| 用途         | Class          | 數值 | 使用場景                       |
| ------------ | -------------- | ---- | ------------------------------ |
| **大卡片**   | `rounded-xl`   | 12px | 主要卡片容器、對話框、模態視窗 |
| **中型元素** | `rounded-lg`   | 8px  | 按鈕、輸入框、次要卡片         |
| **小型元素** | `rounded-md`   | 6px  | 標籤、小按鈕                   |
| **圓形**     | `rounded-full` | 50%  | 頭像、圖示背景                 |

**範例**：

```tsx
// ✅ 正確：主要卡片使用 rounded-xl
<div className="rounded-xl shadow-lg border border-gray-200 p-8">
  {/* 內容 */}
</div>

// ✅ 正確：按鈕使用 rounded-lg
<button className="rounded-lg px-4 py-2">
  按鈕
</button>

// ❌ 錯誤：不要使用 rounded-sm、rounded-2xl 等其他變體
```

---

### 2. 陰影規範（Shadow）

**以登入頁面為標準：**

| 層級         | Class       | 使用場景                         |
| ------------ | ----------- | -------------------------------- |
| **強陰影**   | `shadow-lg` | 主要卡片、模態視窗、重要提升元素 |
| **中等陰影** | `shadow-md` | 下拉選單、浮動面板               |
| **輕陰影**   | `shadow-sm` | 表格、次要卡片                   |

**範例**：

```tsx
// ✅ 正確：主要卡片使用 shadow-lg
<div className="rounded-xl shadow-lg">
  {/* 登入卡片、設定卡片等 */}
</div>

// ✅ 正確：表格使用 shadow-sm
<table className="rounded-lg shadow-sm">
  {/* 表格內容 */}
</table>
```

---

### 3. 邊框規範（Border）

**統一使用 CSS 變數：**

| Class              | 顏色            | 使用場景   |
| ------------------ | --------------- | ---------- |
| `border-border`    | `var(--border)` | 主要邊框   |
| `border-border/60` | 60% 透明度      | 淡化邊框   |
| `border-border/40` | 40% 透明度      | 表格分隔線 |

**❌ 不要使用**：

- `border-gray-200`、`border-gray-300` 等固定顏色
- 改用 `border-border` CSS 變數，支援深色主題切換

**範例**：

```tsx
// ✅ 正確：使用 CSS 變數
<div className="border border-border rounded-xl">
  {/* 內容 */}
</div>

// ❌ 錯誤：不要硬編碼顏色
<div className="border border-gray-200 rounded-xl">
  {/* 內容 */}
</div>
```

---

### 4. 間距規範（Spacing）

**以登入頁面為標準：**

| 用途         | Class       | 數值          | 使用場景           |
| ------------ | ----------- | ------------- | ------------------ |
| **卡片內距** | `p-8`       | 2rem (32px)   | 主要卡片、表單容器 |
| **元素間距** | `space-y-6` | 1.5rem (24px) | 表單欄位、卡片區塊 |
| **小間距**   | `space-y-4` | 1rem (16px)   | 列表項目           |
| **按鈕內距** | `px-4 py-2` | 1rem × 0.5rem | 按鈕               |

---

### 5. 莫蘭迪色系（Morandi Colors）

**主要色彩**：

| 變數                   | 顏色      | 用途               |
| ---------------------- | --------- | ------------------ |
| `--morandi-primary`    | `#3A3633` | 主要文字、深色元素 |
| `--morandi-secondary`  | `#8B8680` | 次要文字、圖示     |
| `--morandi-gold`       | `#C4A572` | 強調色、按鈕、連結 |
| `--morandi-gold-hover` | `#A08968` | 金色懸停效果       |
| `--morandi-green`      | `#9FA68F` | 成功訊息           |
| `--morandi-red`        | `#C08374` | 錯誤訊息           |
| `--morandi-container`  | `#E8E5E0` | 背景淡色、容器     |

**使用範例**：

```tsx
// ✅ 正確：使用 Tailwind 工具類
<div className="bg-morandi-container text-morandi-primary">
  {/* 內容 */}
</div>

// ✅ 正確：使用 CSS 變數
<div style={{ backgroundColor: 'var(--morandi-gold)' }}>
  {/* 內容 */}
</div>
```

---

## 🎯 常用設計模式

### 1. 主要卡片（Primary Card）

**登入頁面標準**：

```tsx
<div className="rounded-xl shadow-lg border border-border bg-card p-8">
  <div className="space-y-6">{/* 卡片內容 */}</div>
</div>
```

**特點**：

- 大圓角 `rounded-xl`
- 深陰影 `shadow-lg`
- 細邊框 `border border-border`
- 寬敞內距 `p-8`

---

### 2. 次要卡片（Secondary Card）

```tsx
<div className="rounded-lg shadow-sm border border-border bg-card p-6">{/* 卡片內容 */}</div>
```

---

### 3. 主要按鈕（Primary Button）

**登入頁面標準**：

```tsx
<button className="w-full rounded-lg bg-morandi-gold text-white px-4 py-2.5 hover:bg-morandi-gold-hover transition-colors">
  按鈕文字
</button>
```

---

### 4. 輸入框（Input）

```tsx
<input
  type="text"
  className="w-full rounded-lg border border-border px-3 py-2 focus:ring-2 focus:ring-morandi-gold"
/>
```

---

### 5. 表格（Table）

```tsx
<div className="rounded-lg shadow-sm border border-border overflow-hidden">
  <table className="w-full">
    <thead className="bg-morandi-container/40 border-b border-border/60">{/* 表頭 */}</thead>
    <tbody>{/* 表格內容 */}</tbody>
  </table>
</div>
```

---

## 🪟 彈窗與遮罩規範（Modal/Overlay）

### 標準遮罩樣式

所有模態視窗（Dialog、Modal）必須使用統一的遮罩效果：

```tsx
// ✅ 標準方式：使用 shadcn Dialog 組件（推薦）
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
;<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>標題</DialogTitle>
    </DialogHeader>
    {/* 內容 */}
  </DialogContent>
</Dialog>
```

### 自訂彈窗遮罩（當不使用 Dialog 組件時）

如果需要自訂彈窗，**必須**遵循以下樣式：

```tsx
// ✅ 正確：全螢幕遮罩 + 置中內容
<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
  <div className="bg-background rounded-xl shadow-lg border border-border p-6 max-w-lg w-full mx-4">
    {/* 彈窗內容 */}
  </div>
</div>

// ❌ 錯誤：遮罩沒有覆蓋全螢幕
<div className="absolute bg-black/50">...</div>

// ❌ 錯誤：缺少 backdrop-blur
<div className="fixed inset-0 bg-black/50">...</div>
```

### 遮罩層級規範

| z-index     | 用途                          |
| ----------- | ----------------------------- |
| `z-50`      | 一般 Dialog、Modal            |
| `z-[9998]`  | Dialog 遮罩層 (DialogOverlay) |
| `z-[9999]`  | Dialog 內容層 (DialogContent) |
| `z-[10000]` | Dialog 關閉按鈕               |

### 關鍵樣式說明

| 樣式                               | 說明                            |
| ---------------------------------- | ------------------------------- |
| `fixed inset-0`                    | **必須** - 確保遮罩覆蓋整個視窗 |
| `bg-black/60`                      | 標準透明度 60%（比 50% 更明顯） |
| `backdrop-blur-sm`                 | 模糊背景，增加層次感            |
| `flex items-center justify-center` | 彈窗內容置中                    |

### 參考範例

旅遊團快速操作 → 合約 Dialog 是標準實現範例。

---

## 🔘 按鈕規範（Button Standards）

### 主要操作按鈕必須有圖標 + 文字

所有 Dialog 和表單中的主要操作按鈕都必須包含圖標：

```tsx
import { Plus, Save, Check, X, Trash2 } from 'lucide-react'

// ✅ 正確：主要操作按鈕
<Button className="bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-2">
  <Plus size={16} />
  新增項目
</Button>

<Button className="gap-2">
  <Save size={16} />
  儲存
</Button>

<Button className="gap-2">
  <Check size={16} />
  確認
</Button>

// ✅ 正確：取消按鈕
<Button variant="outline" className="gap-2">
  <X size={16} />
  取消
</Button>

// ✅ 正確：危險操作按鈕
<Button variant="outline" className="gap-2 text-morandi-red border-morandi-red hover:bg-morandi-red hover:text-white">
  <Trash2 size={16} />
  刪除
</Button>

// ❌ 錯誤：純文字按鈕
<Button>儲存</Button>
<Button>確認</Button>
```

### 按鈕圖標對應表

| 操作 | 圖標        | 說明                 |
| ---- | ----------- | -------------------- |
| 新增 | `Plus`      | 新增項目、建立資料   |
| 儲存 | `Save`      | 儲存變更             |
| 確認 | `Check`     | 確認操作             |
| 取消 | `X`         | 取消、關閉           |
| 刪除 | `Trash2`    | 刪除項目（危險操作） |
| 編輯 | `Edit2`     | 編輯模式             |
| 同步 | `RefreshCw` | 同步資料             |
| 上傳 | `Upload`    | 上傳檔案             |
| 下載 | `Download`  | 下載檔案             |
| 列印 | `Printer`   | 列印功能             |

---

## 📝 表單組件規範（Form Components）

### 表單標籤統一樣式

```tsx
// ✅ 正確：統一的標籤樣式
<label className="block text-sm font-medium text-morandi-primary mb-2">
  欄位名稱 <span className="text-morandi-red">*</span>
</label>

// ❌ 錯誤：不一致的顏色
<label className="block text-sm font-medium text-morandi-secondary mb-2">
  欄位名稱
</label>
```

### 日期選擇器

**統一使用 DatePicker 組件**：

```tsx
import { DatePicker } from '@/components/ui/date-picker'

// ✅ 正確
;<DatePicker value={date} onChange={setDate} placeholder="選擇日期" />

// ❌ 錯誤：使用其他日期組件
// SimpleDateInput, DateInput 等都應改為 DatePicker
```

### 下拉選擇器

**可搜尋選擇（選項多）用 Combobox**：

```tsx
import { Combobox } from '@/components/ui/combobox'

// ✅ 客戶選擇、團號選擇、城市選擇（選項 > 10）
;<Combobox options={options} value={value} onChange={setValue} placeholder="搜尋..." />
```

**固定選項（選項少）用 Select**：

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ✅ 狀態選擇、排序方式（選項 < 5）
;<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="選擇..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">選項一</SelectItem>
  </SelectContent>
</Select>
```

### 驗證錯誤樣式

```tsx
// ✅ 正確：使用莫蘭迪配色
<div className="bg-morandi-red/5 border border-morandi-red/20 rounded-md p-3 text-sm text-morandi-red">
  錯誤訊息
</div>

// ❌ 錯誤：使用標準紅色
<div className="bg-red-50 border border-red-200 text-red-700">
  錯誤訊息
</div>
```

---

## 🛡️ 自動防範機制

以下規則由 ESLint 自動檢查：

| 規則                            | 說明                          | 嚴重程度 |
| ------------------------------- | ----------------------------- | -------- |
| `venturo/no-forbidden-classes`  | 禁止使用非設計系統的 CSS 類別 | warn     |
| `venturo/no-custom-modal`       | 禁止自訂 Modal 遮罩層         | warn     |
| `venturo/button-requires-icon`  | Dialog 按鈕需要圖標           | warn     |
| `venturo/consistent-form-label` | 表單標籤一致性                | warn     |

執行掃描：

```bash
node scripts/scan-design-violations.js
```

---

## 🚫 避免使用

### 不建議的圓角：

- ❌ `rounded-sm` (太小)
- ❌ `rounded-3xl` (太大)

### 不建議的陰影：

- ❌ `shadow-xl` (過度)
- ❌ `shadow-2xl` (過度)
- ❌ `shadow-none` (在需要提升的地方)

### 不建議的顏色：

- ❌ `border-gray-200` (改用 `border-border`)
- ❌ `bg-gray-100` (改用 `bg-morandi-container`)
- ❌ `text-gray-600` (改用 `text-morandi-secondary`)

---

## 📱 響應式設計

### 間距調整：

```tsx
// ✅ 正確：桌面版寬敞，行動版緊湊
<div className="p-4 md:p-6 lg:p-8">{/* 內容 */}</div>
```

---

## 🌓 深色主題支援

所有顏色使用 CSS 變數，自動支援深色主題：

```tsx
// ✅ 自動支援深色主題
<div className="bg-card text-foreground border-border">{/* 主題切換時自動變色 */}</div>
```

---

## ✅ Code Review 檢查清單

**提交前檢查**：

- [ ] 卡片使用 `rounded-xl` + `shadow-lg`？
- [ ] 按鈕使用 `rounded-lg`？
- [ ] 邊框使用 `border-border` 而非固定顏色？
- [ ] 間距使用 `p-8` (卡片) 或 `p-6` (次要元素)？
- [ ] 顏色使用莫蘭迪 CSS 變數？
- [ ] 支援深色主題？

---

## 📚 參考範例

**最佳範例頁面**：

- ✅ `/login` - 登入頁面（設計標準）
- ✅ 主題設定卡片（設定頁面）

**需要改進的頁面**：

- 🔧 報價單管理（表格需要更柔和）
- 🔧 旅遊團管理（卡片圓角需調整）

---

**最後更新**：2026-01-01
**維護者**：William Chien
**設計參考**：登入頁面 (`/login`)
