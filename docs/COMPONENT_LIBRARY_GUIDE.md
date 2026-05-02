# Venturo 組件庫使用指南

> **最後更新**: 2025-10-30
> **版本**: Phase 5 完成

---

## 📚 目錄

- [組件庫總覽](#組件庫總覽)
- [對話框組件](#對話框組件)
- [UI 組件](#ui-組件)
- [使用範例](#使用範例)
- [遷移指南](#遷移指南)

---

## 組件庫總覽

Venturo 專案已建立完整的可重用組件庫，包含 **9 個核心組件系統**。

### 已完成組件清單

| 組件                    | 檔案位置                                      | 用途            | 影響檔案數 |
| ----------------------- | --------------------------------------------- | --------------- | ---------- |
| **FormDialog**          | `src/components/dialog/form-dialog.tsx`       | 統一表單對話框  | 13         |
| **ConfirmDialog**       | `src/components/dialog/confirm-dialog.tsx`    | 統一確認對話框  | 15+        |
| **useConfirmDialog**    | `src/hooks/useConfirmDialog.ts`               | 確認對話框 Hook | -          |
| **EnhancedStatusBadge** | `src/components/ui/enhanced-status-badge.tsx` | 狀態標籤        | 9          |
| **EmptyState**          | `src/components/ui/empty-state.tsx`           | 空狀態提示      | 22         |
| **LoadingState**        | `src/components/ui/loading-state.tsx`         | 載入狀態        | 22         |
| **Card System**         | `src/components/ui/card-system.tsx`           | 卡片系統        | 29         |
| **Accordion**           | `src/components/ui/accordion.tsx`             | 展開/收合       | 20         |

---

## 對話框組件

### 1. FormDialog - 表單對話框

**適用場景**：所有包含表單的對話框

**已應用檔案**：

- ✅ AddAccountDialog (288 → 277 行, -11)
- ✅ AddTransactionDialog (240 → 232 行, -8)
- ✅ RegionsDialogs (415 → 382 行, -33)
- ✅ AttractionsDialog (299 → 289 行, -10)
- ✅ SuppliersDialog (275 → 259 行, -16)
- ✅ SaveVersionDialog (68 → 72 行, +4)
- ✅ CreateChannelDialog (87 → 68 行, -19)
- ✅ DisbursementDialog (177 → 163 行, -14)
- ✅ AddVisaDialog (248 → 234 行, -14)
- ✅ EditCityImageDialog (321 → 308 行, -13)

**基本用法**：

```tsx
import { FormDialog } from '@/components/dialog';

<FormDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  title="新增項目"
  subtitle="副標題（選填）"
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  submitLabel="確定"
  submitDisabled={!isValid}
  loading={isLoading}
  maxWidth="md"
>
  {/* 表單欄位 */}
  <Input ... />
  <Select ... />
</FormDialog>
```

**完整 API**：

```typescript
interface FormDialogProps {
  // 核心
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  children: ReactNode
  onSubmit: () => void | Promise<void>
  onCancel?: () => void

  // 按鈕控制
  submitLabel?: string // 預設「確定」
  cancelLabel?: string // 預設「取消」
  loading?: boolean
  submitDisabled?: boolean

  // 佈局
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl'
  contentClassName?: string
  showFooter?: boolean
  footer?: ReactNode // 自定義底部
}
```

---

### 2. ConfirmDialog - 確認對話框

**適用場景**：刪除確認、警告確認、資訊確認

**待應用檔案（15 個）**：

- [ ] `/app/hr/page.tsx` - 員工刪除（高優先級）
- [ ] `/app/todos/page.tsx` - 待辦刪除
- [ ] `/app/timebox/components/box-dialogs/workout-dialog.tsx`
- [ ] `/components/tours/tour-operations.tsx`
- [ ] `/components/accounting/transaction-list.tsx`
- [ ] 等 10+ 個檔案

**方法 A：使用 Hook（推薦）**：

```tsx
import { ConfirmDialog } from '@/components/dialog'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'

function MyComponent() {
  const { confirm, confirmDialogProps } = useConfirmDialog()

  const handleDelete = async () => {
    const confirmed = await confirm({
      type: 'danger',
      title: '確認刪除',
      message: '確定要刪除此員工嗎？',
      details: ['員工的所有資料會被刪除', '相關的待辦事項會被移除', '此操作無法復原'],
      confirmLabel: '確認刪除',
    })

    if (confirmed) {
      await deleteEmployee()
    }
  }

  return (
    <>
      <Button onClick={handleDelete}>刪除</Button>
      <ConfirmDialog {...confirmDialogProps} />
    </>
  )
}
```

**方法 B：直接使用組件**：

```tsx
import { ConfirmDialog } from '@/components/dialog'

const [showConfirm, setShowConfirm] = useState(false)

;<ConfirmDialog
  open={showConfirm}
  onOpenChange={setShowConfirm}
  type="danger" // 'danger' | 'warning' | 'info'
  title="確認刪除"
  message="確定要刪除此項目嗎？"
  details={['相關資料會被刪除', '此操作無法復原']}
  onConfirm={handleDelete}
  loading={isDeleting}
/>
```

**對話框類型**：

- **danger** (紅色) - 刪除、永久操作
- **warning** (橘色) - 警告、風險操作
- **info** (藍色) - 資訊、一般確認

---

## UI 組件

### 3. EnhancedStatusBadge - 狀態標籤

**適用場景**：所有狀態顯示（旅遊團、付款、合約等）

**基本用法**：

```tsx
import { EnhancedStatusBadge, BADGE_CONFIGS } from '@/components/ui/enhanced-status-badge';

// 使用預設配置
<EnhancedStatusBadge
  value="進行中"
  config={BADGE_CONFIGS.tourStatus}
  dot
/>

// 直接指定樣式
<EnhancedStatusBadge
  value="已付款"
  variant="success"
  size="sm"
/>
```

**內建配置**：

```typescript
BADGE_CONFIGS = {
  tourStatus, // 旅遊團狀態
  paymentMethod, // 付款方式
  paymentStatus, // 付款狀態
  receiptStatus, // 收據狀態
  documentStatus, // 文件狀態
  requestStatus, // 請款狀態
  contractStatus, // 合約狀態
  quoteStatus, // 報價單狀態
}
```

**變體**：

- `default` - 灰色
- `success` - 綠色
- `warning` - 橘色
- `danger` - 紅色
- `info` - 藍色
- `secondary` - 金色

---

### 4. EmptyState - 空狀態提示

**適用場景**：列表為空、搜尋無結果、無資料

**基本用法**：

```tsx
import { EmptyState } from '@/components/ui/empty-state'
import { MapPin, Plus } from 'lucide-react'
;<EmptyState
  variant="search"
  title="沒有找到景點"
  description="試著調整篩選條件"
  icon={<MapPin />}
  action={
    <Button onClick={onAdd}>
      <Plus /> 新增第一個景點
    </Button>
  }
  size="md"
/>
```

**變體**：

- `default` - 一般空狀態（FileQuestion icon）
- `search` - 搜尋無結果（Search icon）
- `inbox` - 收件箱空（Inbox icon）

---

### 5. LoadingState - 載入狀態

**適用場景**：資料載入中

**基本用法**：

```tsx
import { LoadingState, LoadingSpinner, LoadingOverlay } from '@/components/ui/loading-state'

// 區塊載入
{
  loading && <LoadingState message="載入景點中..." size="md" />
}

// 小型 Spinner
;<LoadingSpinner size={16} />

// 全屏 Overlay
{
  processing && <LoadingOverlay message="處理中，請稍候..." />
}
```

---

### 6. Card System - 卡片系統

**適用場景**：資訊卡片、內容卡片

**基本用法**：

```tsx
import {
  Card, CardHeader, CardContent, CardActions, CardDivider, CardGrid
} from '@/components/ui/card-system';

<Card variant="elevated" hoverable>
  <CardHeader
    icon={<MapPin />}
    title="景點資訊"
    subtitle="共 10 個景點"
    action={<Button size="sm">編輯</Button>}
  />
  <CardContent>
    <p>景點內容...</p>
  </CardContent>
  <CardDivider />
  <CardActions align="right">
    <Button variant="outline">取消</Button>
    <Button>確認</Button>
  </CardActions>
</Card>

// 卡片網格
<CardGrid cols={3} gap={4}>
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
</CardGrid>
```

**變體**：

- `default` - 基本卡片（邊框）
- `elevated` - 陰影卡片
- `outline` - 強調邊框
- `ghost` - 半透明背景

---

### 7. Accordion - 展開/收合

**適用場景**：FAQ、可展開內容、分組資料

**基本用法**：

```tsx
import { Accordion, AccordionItem, SimpleAccordion } from '@/components/ui/accordion';

// 多個 Accordion
<Accordion type="multiple" gap={3}>
  <AccordionItem
    title="景點列表"
    icon={<MapPin />}
    badge={<Badge>10</Badge>}
    defaultOpen={true}
  >
    <p>景點內容...</p>
  </AccordionItem>
  <AccordionItem title="住宿列表">
    <p>住宿內容...</p>
  </AccordionItem>
</Accordion>

// 單一展開模式
<Accordion type="single">
  <AccordionItem title="第一項">內容 1</AccordionItem>
  <AccordionItem title="第二項">內容 2</AccordionItem>
</Accordion>

// 簡化版
<SimpleAccordion trigger="點擊展開">
  <p>展開的內容</p>
</SimpleAccordion>
```

---

## 使用範例

### 完整頁面範例

```tsx
'use client'

import { useState } from 'react'
import { FormDialog, ConfirmDialog } from '@/components/dialog'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { EnhancedStatusBadge, BADGE_CONFIGS } from '@/components/ui/enhanced-status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingState } from '@/components/ui/loading-state'
import { Card, CardHeader, CardContent, CardGrid } from '@/components/ui/card-system'

function AttractionsPage() {
  const [attractions, setAttractions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)

  const { confirm, confirmDialogProps } = useConfirmDialog()

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      type: 'danger',
      title: '確認刪除',
      message: '確定要刪除此景點嗎？',
      details: ['相關行程會受影響', '此操作無法復原'],
    })

    if (confirmed) {
      await deleteAttraction(id)
    }
  }

  if (loading) {
    return <LoadingState message="載入景點中..." />
  }

  if (attractions.length === 0) {
    return (
      <EmptyState
        title="尚無景點"
        description="開始新增您的第一個景點"
        action={<Button onClick={() => setShowAddDialog(true)}>新增景點</Button>}
      />
    )
  }

  return (
    <>
      <CardGrid cols={3} gap={4}>
        {attractions.map(attraction => (
          <Card key={attraction.id} variant="elevated">
            <CardHeader
              title={attraction.name}
              subtitle={attraction.city}
              action={
                <EnhancedStatusBadge value={attraction.status} config={BADGE_CONFIGS.tourStatus} />
              }
            />
            <CardContent>
              <p>{attraction.description}</p>
            </CardContent>
            <CardActions>
              <Button onClick={() => handleDelete(attraction.id)}>刪除</Button>
            </CardActions>
          </Card>
        ))}
      </CardGrid>

      <FormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        title="新增景點"
        onSubmit={handleAddAttraction}
      >
        {/* 表單欄位 */}
      </FormDialog>

      <ConfirmDialog {...confirmDialogProps} />
    </>
  )
}
```

---

## 遷移指南

### 從舊模式遷移到新組件

#### 1. Dialog → FormDialog

**Before**:

```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>標題</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">{/* 表單 */}</div>
    <div className="flex justify-end gap-2">
      <Button onClick={onCancel}>取消</Button>
      <Button onClick={onSubmit}>確定</Button>
    </div>
  </DialogContent>
</Dialog>
```

**After**:

```tsx
<FormDialog open={open} onOpenChange={setOpen} title="標題" onSubmit={onSubmit} onCancel={onCancel}>
  {/* 表單 */}
</FormDialog>
```

#### 2. confirm() → useConfirmDialog

**Before**:

```tsx
const handleDelete = () => {
  if (confirm('確定要刪除嗎？')) {
    deleteItem()
  }
}
```

**After**:

```tsx
const { confirm, confirmDialogProps } = useConfirmDialog()

const handleDelete = async () => {
  const confirmed = await confirm({
    type: 'danger',
    title: '確認刪除',
    message: '確定要刪除此項目嗎？',
  })

  if (confirmed) {
    await deleteItem()
  }
}

// 在 JSX 中加入
;<ConfirmDialog {...confirmDialogProps} />
```

#### 3. 自訂 Badge → EnhancedStatusBadge

**Before**:

```tsx
const getStatusBadge = (status: string) => {
  const badges = {
    提案: 'bg-morandi-gold text-white',
    進行中: 'bg-morandi-green text-white',
  }
  return badges[status] || 'bg-gray-300'
}

;<span className={`px-2 py-1 rounded ${getStatusBadge(status)}`}>{status}</span>
```

**After**:

```tsx
<EnhancedStatusBadge value={status} config={BADGE_CONFIGS.tourStatus} />
```

#### 4. 自訂 Empty State → EmptyState

**Before**:

```tsx
<div className="text-center py-12 text-morandi-secondary">
  <MapPin size={48} className="mx-auto mb-4 opacity-50" />
  <p>無符合條件的資料</p>
</div>
```

**After**:

```tsx
<EmptyState icon={<MapPin />} title="無符合條件的資料" />
```

---

## 效益總結

### 代碼減少統計

| Phase            | 優化內容   | 減少行數      | 受益檔案數   |
| ---------------- | ---------- | ------------- | ------------ |
| Phase 2          | 列表頁優化 | -215          | 3            |
| Phase 3          | 小型對話框 | -93           | 7            |
| Phase 4          | 中型對話框 | -41           | 3            |
| **已完成總計**   | -          | **-349 行**   | **13 檔案**  |
| **Phase 6 預期** | 應用新組件 | **-2,000 行** | **126 檔案** |
| **總預期**       | -          | **-2,349 行** | **139 檔案** |

### 維護性提升

✅ **統一的 API**：所有對話框/組件使用一致的介面
✅ **型別安全**：完整的 TypeScript 支援
✅ **一致的 UX**：統一的樣式、動畫、互動
✅ **易於擴展**：新增功能只需修改組件庫
✅ **降低學習曲線**：新開發者只需學習一套 API

---

## 相關文檔

- [FormDialog 原始碼](src/components/dialog/form-dialog.tsx)
- [ConfirmDialog 原始碼](src/components/dialog/confirm-dialog.tsx)
- [useConfirmDialog Hook](src/hooks/useConfirmDialog.ts)
- [EnhancedStatusBadge 原始碼](src/components/ui/enhanced-status-badge.tsx)
- [完整組件庫](src/components/ui/)

---

**祝開發順利！** 🚀
