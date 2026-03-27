# Venturo ERP UI 設計規範

**版本**：1.0  
**日期**：2026-03-27  
**適用範圍**：所有新功能開發

---

## 🎯 核心原則

**William 說**：
> 不管怎麼樣的設計都是以這個規範為準則。AI 開發速度快，但不能每次都給醜的 UI。

---

## 📐 整體版面架構

### Layout 結構

```
┌─────────────────────────────────────────────┐
│  側邊欄 (Sidebar)                           │
│  - 固定在左側                               │
│  - 圖示 + 文字標籤                          │
│  - Active 狀態有背景色                      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  上方標題區 (Header)                        │
│  ┌──────────────────────┬─────────────────┐│
│  │ 麵包屑 (Breadcrumb) │  按鈕區          ││
│  │ - 主標題 (大)       │  - 搜尋          ││
│  │ - 次標題 (小)       │  - 篩選分頁      ││
│  └──────────────────────┴─────────────────┘│
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  內容區 (Main Content)                      │
│  ┌─────────────────────────────────────────┐│
│  │  列表 (Table) 或 區塊 (Cards)          ││
│  │  - EnhancedTable 組件                  ││
│  │  - 統一樣式                            ││
│  └─────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────┐│
│  │  分頁控制                              ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

---

## 📊 標題階層

### 主標題（頁面級）
```tsx
// 範例：旅遊團管理
<ContentPageLayout title="旅遊團管理">
```

**規範**：
- 字體大小：`text-2xl` 或 `text-xl`
- 字重：`font-semibold`
- 顏色：`text-morandi-primary`
- 位置：Breadcrumb 第一層

---

### 次標題（詳情頁）
```tsx
// 範例：點進旅遊團後，「團號」變大，「旅遊團」變小
<h1 className="text-2xl font-bold">XIY260311A</h1>
<p className="text-sm text-morandi-secondary">旅遊團</p>
```

**規範**：
- 團號/詳情 ID：`text-2xl font-bold`
- 上層類別：`text-sm text-morandi-secondary`（較淡）

---

## 🗂️ 分頁（Tabs）

**使用時機**：
- 旅遊團詳情（基本資訊/行程/財務/...）
- 財務設定（兩個區塊的情況）
- 報價單分頁

**規範**：
```tsx
<Tabs defaultValue="overview" className="w-full">
  <TabsList className="grid w-full grid-cols-5">
    <TabsTrigger value="overview">基本資訊</TabsTrigger>
    <TabsTrigger value="itinerary">行程</TabsTrigger>
    <TabsTrigger value="finance">財務</TabsTrigger>
    <TabsTrigger value="members">團員</TabsTrigger>
    <TabsTrigger value="documents">文件</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">...</TabsContent>
</Tabs>
```

**樣式規範**：
- 使用 shadcn/ui `Tabs` 組件
- Active Tab：有底線或背景色
- Padding：`p-4` 或 `p-6`

---

## 📋 表格（Table）

### 強制規範

**必須使用**：`EnhancedTable` 組件

```tsx
import { EnhancedTable } from '@/components/ui/enhanced-table'

<EnhancedTable
  columns={columns}
  data={tours}
  loading={loading}
  onSort={onSort}
  actions={renderActions}
  actionsWidth="50px"
  onRowClick={onRowClick}
  bordered={true}  // 必須有邊框
/>
```

---

### 表格樣式規範

**Header（表頭）**：
- 背景色：`bg-slate-100` 或 `bg-morandi-container`
- 字重：`font-medium`
- 顏色：`text-morandi-secondary`
- Padding：`px-4 py-3`

**Body（內容）**：
- Hover 效果：**必須有**（`hover:bg-morandi-container/50`）
- 條紋：可選（`striped={true}`）
- Padding：`px-4 py-3`
- 邊框：`border-b border-border`

**操作欄（Actions）**：
- 位置：**永遠在最右邊**
- 寬度：`50px` 或 `80px`
- 對齊：`text-right`
- 按鈕：`iconSm` size

---

### 分頁

**規範**：
- 每頁預設：**15 筆**（`initialPageSize={15}`）
- 可選項：10, 15, 20, 50
- 顯示：「顯示第 1 到 15 筆，共 100 筆資料」
- 樣式：使用 `TablePagination` 組件

---

### 空狀態

**必須包含**：
- Icon（例如 `MapPin`）
- 主文案：「目前沒有資料」
- 副文案：「點擊上方按鈕新增」

```tsx
emptyState={
  <div className="flex flex-col items-center py-12">
    <MapPin size={48} className="text-morandi-secondary/30 mb-4" />
    <p className="text-morandi-secondary">目前沒有旅遊團</p>
    <p className="text-sm text-morandi-secondary/70">點擊「新增旅遊團」開始建立</p>
  </div>
}
```

---

## 🪟 浮動窗（Dialog/Sheet）

### 強制規範

**必須使用**：shadcn/ui `Dialog` 或 `Sheet`

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle className="text-lg font-semibold">
        編輯旅遊團
      </DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      {/* 表單內容 */}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={onCancel}>取消</Button>
      <Button onClick={onConfirm}>確認</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### Dialog 樣式規範

**寬度**：
- 小型表單：`max-w-md`（400px）
- 中型表單：`max-w-2xl`（672px）
- 大型表單：`max-w-4xl`（896px）

**標題（DialogTitle）**：
- 字體大小：`text-lg`
- 字重：`font-semibold`
- 顏色：`text-morandi-primary`

**Footer（DialogFooter）**：
- 取消按鈕：**永遠在左邊**（`variant="outline"`）
- 確認按鈕：**永遠在右邊**（`variant="default"`）
- 間距：`gap-2`

---

## 🎨 按鈕（Button）

### 按鈕變體（Variant）

**Primary（主按鈕）**：
```tsx
<Button variant="default">新增旅遊團</Button>
```
- 使用時機：主要操作（新增、確認、提交）
- 顏色：`bg-primary text-primary-foreground`

**Secondary（次要按鈕）**：
```tsx
<Button variant="outline">取消</Button>
```
- 使用時機：取消、返回
- 顏色：`border-input bg-background`

**Destructive（危險按鈕）**：
```tsx
<Button variant="destructive">刪除</Button>
```
- 使用時機：刪除、封存
- 顏色：`bg-destructive text-destructive-foreground`

---

### 按鈕尺寸

| Size | 高度 | 使用時機 |
|------|------|----------|
| `xs` | 32px | 表格內操作 |
| `sm` | 36px | 卡片內操作 |
| `default` | 40px | 一般按鈕 |
| `lg` | 44px | 強調按鈕 |
| `icon` | 40x40px | 圖示按鈕 |
| `iconSm` | 32x32px | 小圖示按鈕 |

---

### 按鈕組合

**Header 按鈕區**：
```tsx
<div className="flex items-center gap-3">
  <Button variant="outline" size="sm">
    <Search className="h-4 w-4" />
    搜尋
  </Button>
  <Button variant="default">
    <Plus className="h-4 w-4" />
    新增旅遊團
  </Button>
</div>
```

**Dialog Footer**：
```tsx
<DialogFooter>
  <Button variant="outline" onClick={onCancel}>取消</Button>
  <Button onClick={onConfirm}>確認</Button>
</DialogFooter>
```

---

## 🎨 顏色系統

### 主色（Primary）
- **用途**：主按鈕、強調元素
- **色碼**：`bg-primary` / `text-primary-foreground`

### 次要色（Secondary）
- **用途**：次要按鈕、標籤
- **色碼**：`bg-secondary` / `text-secondary-foreground`

### 狀態色

| 狀態 | 顏色 | 使用時機 |
|------|------|----------|
| Success | `bg-morandi-green` | 成功、已完成 |
| Warning | `bg-morandi-gold` | 警告、待處理 |
| Danger | `bg-morandi-red` | 錯誤、刪除 |
| Info | `bg-morandi-blue` | 資訊提示 |

---

### Morandi 色系（品牌色）

```css
/* 主色 */
--morandi-primary: #2D2D2D;       /* 深灰 */
--morandi-secondary: #6B6B6B;     /* 中灰 */
--morandi-tertiary: #A8A8A8;      /* 淺灰 */

/* 強調色 */
--morandi-gold: #C9A96E;          /* 金色 */
--morandi-green: #8FAE8D;         /* 綠色 */
--morandi-blue: #7E9BAF;          /* 藍色 */
--morandi-red: #C97E7E;           /* 紅色 */

/* 容器色 */
--morandi-container: #F5F5F5;     /* 淺背景 */
--morandi-border: #E0E0E0;        /* 邊框 */
```

---

## 📏 間距系統（Spacing）

### Padding 規範

**頁面 Padding**：
```tsx
<ContentPageLayout className="p-6">
  {/* 內容 */}
</ContentPageLayout>
```

**Card Padding**：
```tsx
<Card className="p-4">
  {/* 卡片內容 */}
</Card>
```

**Dialog Padding**：
```tsx
<DialogContent className="p-6">
  {/* Dialog 內容 */}
</DialogContent>
```

---

### Margin/Gap 規範

| 元素間距 | 值 | 使用時機 |
|----------|-----|----------|
| `gap-1` | 4px | 緊密排列（icon + text） |
| `gap-2` | 8px | 按鈕組 |
| `gap-3` | 12px | 表單欄位 |
| `gap-4` | 16px | 卡片間距 |
| `gap-6` | 24px | 區塊間距 |

---

## 🔍 特殊情況：兩區塊版面

**使用時機**：財務設定、儀表板

**版面結構**：
```tsx
<ContentPageLayout title="財務設定">
  <Tabs defaultValue="payment">
    <TabsList>
      <TabsTrigger value="payment">收款設定</TabsTrigger>
      <TabsTrigger value="account">帳戶管理</TabsTrigger>
    </TabsList>
    
    <TabsContent value="payment">
      <div className="grid grid-cols-2 gap-6">
        <Card className="p-6">
          {/* 左邊區塊 */}
        </Card>
        <Card className="p-6">
          {/* 右邊區塊 */}
        </Card>
      </div>
    </TabsContent>
  </Tabs>
</ContentPageLayout>
```

**規範**：
- 使用 `grid grid-cols-2`
- 間距：`gap-6`
- 每個區塊用 `Card` 包裹
- Padding：`p-6`

---

## ✅ 檢查清單（Matthew 必讀）

### 新功能開發前

- [ ] 確認使用 `ContentPageLayout`
- [ ] 確認標題階層正確（主標題 > 次標題）
- [ ] 如果有表格 → 使用 `EnhancedTable`
- [ ] 如果有浮動窗 → 使用 `Dialog` 或 `Sheet`
- [ ] 按鈕位置正確（取消左/確認右）

### 開發中

- [ ] 表格有 Hover 效果
- [ ] 操作欄在最右邊
- [ ] 分頁設定 15 筆/頁
- [ ] 空狀態有 icon + 文案
- [ ] Dialog 寬度符合規範

### 開發後

- [ ] 顏色符合 Morandi 色系
- [ ] Padding/Gap 符合間距系統
- [ ] 手機版 RWD 正常
- [ ] 沒有 `any` 型別（參考 ecc-coding-standards）

---

## 🚨 禁止事項

❌ **不准**自己定義表格樣式（必須用 `EnhancedTable`）  
❌ **不准**按鈕亂放（取消永遠左邊，確認永遠右邊）  
❌ **不准**忽略 Hover 效果  
❌ **不准**用奇怪的顏色（必須用 Morandi 色系或 shadcn 預設）  
❌ **不准**不寫空狀態（空表格必須有提示）

---

## 📚 參考組件

### 已實作的標準組件

1. **EnhancedTable**（`src/components/ui/enhanced-table/`）
   - 統一表格樣式
   - 內建排序、分頁、篩選

2. **ContentPageLayout**（`src/components/layout/content-page-layout.tsx`）
   - 統一頁面版面
   - 麵包屑 + Header

3. **shadcn/ui 組件**
   - Button, Dialog, Card, Tabs, Input, Select 等

---

## 🔧 Matthew 的工作流程

### 收到新需求時

1. **先看這份文件**（`UI_DESIGN_SYSTEM.md`）
2. 確認頁面類型：
   - 列表頁 → `EnhancedTable`
   - 詳情頁 → `Tabs` + 區塊
   - 表單 → `Dialog`
3. 複製類似頁面當範本
4. 按照規範調整
5. **開發完自我檢查**（用上面的 Checklist）

---

## 📝 更新記錄

- **2026-03-27**：初版（基於 William 的口述整理）

---

**這份文件是 Venturo ERP 的 UI 聖經。所有新功能都必須遵守。** 🎯
