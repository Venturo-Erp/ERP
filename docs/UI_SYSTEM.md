# Venturo ERP UI 設計系統規範

參考來源：`docs/design-refs/airtable.md` / `linear.app.md` / `notion.md` / `vercel.md`

## 核心原則

1. **變數優先，禁止硬編顏色**——所有 UI 顏色都走 CSS 變數（`--morandi-*`），才能跟主題切換系統連動
2. **shadcn 元件優先**——`<Button>` / `<Input>` / `<Dialog>` / `<Select>` 等優先用 shadcn，手寫只在沒得選時（列印樣板、email、靜態 marketing 頁）
3. **設計規格一致**——間距、圓角、字級都有統一 scale

主題切換：`/settings/appearance`，目前支援 `morandi` / `iron` / `airtable` 三套。

---

## 1. 顏色系統

### 主色與文字（會跟主題切換）

| Tailwind class | 用途 | 備註 |
|---|---|---|
| `bg-morandi-gold` | 主要 CTA 按鈕、品牌強調色 | airtable 主題會變藍 |
| `hover:bg-morandi-gold-hover` | 主色 hover | 跟 `bg-morandi-gold` 成對用 |
| `text-morandi-gold` | 強調文字、連結色 | |
| `text-morandi-primary` | 主要文字（標題、正文） | |
| `text-morandi-secondary` | 次要文字（描述、標籤） | |
| `text-morandi-muted` | 微弱文字（placeholder、timestamp、disabled） | |
| `bg-card` | 所有白底面板、卡片 | **禁止用 `bg-white`** |
| `bg-background` | 頁面底色 | |
| `bg-morandi-container` | 次要容器、輕微分隔 | |
| `border-border` | 預設邊框 | **禁止用 `border-gray-*`** |
| `border-morandi-muted` | 弱邊框（虛線、輕分隔） | |

### 狀態色

| 用途 | Tailwind class | 對應的底色 |
|---|---|---|
| 成功 | `text-morandi-green` / `bg-morandi-green/10` / `border-morandi-green/30` | 綠 |
| 危險 | `text-morandi-red` / `bg-morandi-red/10` / `border-morandi-red/30` | 紅 |
| 警告 | `text-status-warning` / `bg-status-warning-bg` | 橙黃 |
| 資訊 | `text-status-info` / `bg-status-info-bg` | 藍 |

### 禁止清單（不要在 ERP 主介面 / 公開頁用）

```
bg-white, bg-black, bg-gray-*, bg-blue-*, bg-green-*, bg-red-*, bg-amber-*, bg-yellow-*
text-gray-*, text-blue-*, text-green-*, text-red-* (除了 text-morandi-red)
border-gray-*, border-blue-*
focus:ring-blue-*, focus:ring-amber-*
```

**唯一例外**：`text-white` 放在彩色按鈕上（`bg-morandi-gold text-white`）因為任何主題下 CTA 都是白字。

### print / email / marketing 靜態頁

`src/lib/print/`, `src/components/print-templates/` 可以用 `bg-white text-black` 之類硬編碼——列印不吃主題系統。

---

## 2. Typography

### 階層（一律 `text-morandi-primary` 為預設文字色）

| 用途 | class | 備註 |
|---|---|---|
| 頁面大標（H1） | `text-2xl font-bold text-morandi-primary` | |
| 區塊標題（H2） | `text-xl font-semibold text-morandi-primary` | |
| 子區塊（H3） | `text-base font-semibold text-morandi-primary` | |
| 表單標籤 | `text-sm font-medium text-morandi-primary` | |
| 正文 | `text-sm text-morandi-primary` (預設) / `text-base` (長文內容) | |
| 次要說明 | `text-xs text-morandi-secondary` | |
| 極小標示 | `text-[10px] text-morandi-muted` | 避免用，但某些 badge 必需 |

### 字重慣例

- `font-bold` — 極大標題、強調數字
- `font-semibold` — section 標題
- `font-medium` — 按鈕文字、label（最常用）
- 預設（無 font class）— 正文

### 禁止

- `text-[Xpx]` 自訂 px 值 — 改用 `text-xs / sm / base / lg` scale
- 混用字重（同一種元件有人 `font-bold` 有人 `font-semibold`）

---

## 3. 間距

Tailwind scale 一定夠用，**禁止 `p-[Xpx]` / `m-[Xpx]`**。

| 用途 | 建議 |
|---|---|
| 密集表格 cell | `px-3 py-2` |
| 一般卡片內距 | `p-4` |
| 大 section | `p-6` 或 `p-8` |
| 元件間距 | `gap-2` / `gap-3` / `gap-4` |
| 表單 label↔input 間距 | `mb-1.5` |

---

## 4. Border Radius

| 用途 | class |
|---|---|
| Input / small button | `rounded-md` |
| 一般 button / form field | `rounded-lg` ← 主要 |
| Card / panel | `rounded-xl` |
| 大 section container | `rounded-2xl` |
| 圓形（avatar / pill） | `rounded-full` |

**禁止** `rounded-[6px]` / `rounded-[12px]` 自訂值。

---

## 5. Shadow

| 用途 | class |
|---|---|
| 一般卡片、列表 row | `shadow-sm` |
| 浮起的元件（dropdown、toast） | `shadow-md` |
| Modal / dialog | `shadow-lg` |
| 無陰影（扁平） | （不加 class） |

**禁止** `shadow-[0_1px_3px_rgba(...)]` 自訂 shadow。

---

## 6. 元件規範

### Button

**優先使用 shadcn `<Button>`**（`src/components/ui/button.tsx`），它有 variant 系統。

手寫時（非 shadcn 情境）用 `src/lib/ui/form-classes.ts` 的常數：

```tsx
import { BUTTON_PRIMARY, BUTTON_SECONDARY, BUTTON_DANGER } from '@/lib/ui/form-classes'

<button className={BUTTON_PRIMARY}>送出</button>
```

### Input

優先使用 shadcn `<Input>`。手寫時用 `INPUT_BASE`：

```tsx
import { INPUT_BASE, LABEL_BASE, REQUIRED_MARK } from '@/lib/ui/form-classes'

<label className={LABEL_BASE}>
  姓名<span className={REQUIRED_MARK}>*</span>
</label>
<input className={INPUT_BASE} />
```

### Dialog

優先使用 shadcn `<Dialog>`。**禁止**手刻 `<div className="fixed inset-0 bg-black/50">` 這種。

唯一例外：列印預覽、signed PDF 展示——這些有特殊 print 排版需求，保留手寫。

### Alert / 狀態框

```tsx
import { ALERT_ERROR, ALERT_SUCCESS } from '@/lib/ui/form-classes'

<div className={ALERT_ERROR}>密碼不符</div>
```

---

## 7. 檔案組織

| 位置 | 用途 |
|---|---|
| `src/components/ui/` | shadcn 元件（button / input / dialog / select 等） |
| `src/lib/ui/form-classes.ts` | 手寫場景的 className 常數（`INPUT_BASE` 等） |
| `src/app/globals.css` | CSS 變數定義（三套主題） |
| `src/stores/theme-store.ts` | 主題切換 state |
| `src/components/theme/ThemeSwitcher.tsx` | 主題切換 UI |
| `docs/design-refs/` | 外部設計參考（Airtable / Linear / Notion / Vercel） |
| `docs/UI_SYSTEM.md` | 本文件 |

---

## 8. 新功能檢查清單

寫新頁面 / 元件前，對照：

- [ ] 顏色用 `morandi-*` / `status-*` 變數，不用 `blue-500` / `gray-100` / `bg-white`
- [ ] Button 用 shadcn `<Button>`，不手寫 `<button class="bg-...">`
- [ ] Input 用 shadcn `<Input>` 或 `INPUT_BASE`
- [ ] Dialog 用 shadcn `<Dialog>`
- [ ] Border radius 用 `md/lg/xl`，不用 `rounded-[Xpx]`
- [ ] Shadow 用 `shadow-sm/md/lg`，不自訂
- [ ] 字級用 `text-xs/sm/base/lg`，不用 `text-[Xpx]`
- [ ] 切換主題 (`/settings/appearance`) 測三套主題都正常

---

## 9. 歷史包袱待清理

_（隨時間更新）_

- `src/components/print-templates/`、`src/lib/print/PrintTemplate.tsx`：列印模板，保留硬編 `bg-white text-black`
- `src/features/designer/templates/`：設計器模板，有自己的色彩系統（用來產生美編行程表 PDF）
- 部分 public marketing landing 頁（`src/app/(public)/p/customized/*`）：使用 `public-*` 變數而非 `morandi-*`，這是刻意的獨立設計

## 10. 類別色例外（categorical colors）

某些場景**必須用不同顏色來區分類別**，這類色**不走主題變數**，直接用 Tailwind palette：

### 合理用途

- **獎金類型標籤**（`bonus-labels.ts`）：獎勵獎金綠、稅金紅、OP 藍、團務紫、行政橘──每種類型必須視覺可辨
- **Dashboard 統計卡**（`use-stats-data.ts`）：4-5 張並排卡片必須用對比色區分
- **Todo 欄位顏色**（`/todos`）：使用者自選欄位顏色（看板背景色），不是主題
- **角色 badge**（`rbac-config.ts`）：Admin / OP / 業務 不同角色用不同色
- **餐點圖示**（早/午/晚餐）：語義區分
- **RBAC role 色**：與主題無關的類別標示

### 原則

1. 類別色**可以**用 `bg-purple-*`, `text-indigo-*`, `bg-pink-50` 等
2. 但應該**寫成常數**（像 `bonus-labels.ts` 那樣集中）而非散落各處
3. 類別色**不會**跟主題切換變色——這是刻意的
4. 如果某個 UI 只是想「看起來不一樣」而不是真的要分類，那它**不算類別色**，該用主色（`morandi-gold`）

### 反例

- ❌ 只是想讓 CTA 按鈕「看起來特別」而用 `bg-amber-600`：錯，CTA 應該一律 `bg-morandi-gold`
- ❌ 錯誤訊息紅色用 `text-red-500`：錯，應該用 `text-morandi-red`（主題化的紅）
- ✅ 獎金類型 5 種，其中一種要用紫色區分：OK，寫在 `bonus-labels.ts`
