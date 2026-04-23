'use client'

/**
 * 目錄編輯器
 * 設定要顯示在目錄中的頁面
 */

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useDragSort } from '@/hooks/useDragSort'
import {
  MapPin,
  Calendar,
  Hotel,
  Plane,
  Camera,
  Utensils,
  ShoppingBag,
  Mountain,
  TreePine,
  Compass,
  Info,
  Bus,
  Check,
  RefreshCw,
  GripVertical,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { calculatePageNumberForToc } from '../../utils/page-number'
import { DESIGNER_LABELS } from './constants/labels'

// 目錄項目類型
export interface TocItem {
  pageId: string // 對應的頁面 ID
  displayName: string // 顯示名稱（空則用頁面名稱）
  icon: string // 圖標 ID
  enabled: boolean // 是否顯示在目錄
  pageNumber: number // 頁碼（自動計算）
}

// 簡易頁面資訊（給目錄編輯用）
export interface SimplePage {
  id: string
  name: string
  templateKey?: string
}

// 目錄圖標選項
const TOC_ICON_OPTIONS: {
  value: string
  label: string
  Icon: React.ComponentType<{ size?: number; className?: string }>
}[] = [
  { value: 'plane', label: '飛機', Icon: Plane },
  { value: 'calendar', label: '行程', Icon: Calendar },
  { value: 'hotel', label: '飯店', Icon: Hotel },
  { value: 'mappin', label: '景點', Icon: MapPin },
  { value: 'camera', label: '觀光', Icon: Camera },
  { value: 'utensils', label: '餐廳', Icon: Utensils },
  { value: 'shopping', label: '購物', Icon: ShoppingBag },
  { value: 'mountain', label: '自然', Icon: Mountain },
  { value: 'tree', label: '公園', Icon: TreePine },
  { value: 'compass', label: '探索', Icon: Compass },
  { value: 'info', label: '資訊', Icon: Info },
  { value: 'bus', label: '分車', Icon: Bus },
]

interface TocEditorProps {
  templateData: Record<string, unknown>
  pages: SimplePage[]
  onTemplateDataChange: (newData: Record<string, unknown>) => void
  onApplyToc?: () => void
}

export function TocEditor({
  templateData,
  pages,
  onTemplateDataChange,
  onApplyToc,
}: TocEditorProps) {
  // 取得現有的 TOC 項目
  const tocItems = (templateData.tocItems as TocItem[]) || []

  // 過濾掉封面和目錄本身
  const availablePages = pages.filter(
    p => p.templateKey !== 'cover' && p.templateKey !== 'toc' && p.templateKey !== 'blank'
  )

  // 根據頁面類型自動選擇預設圖標
  const getDefaultIcon = (templateKey?: string): string => {
    switch (templateKey) {
      case 'itinerary':
        return 'plane'
      case 'daily':
        return 'calendar'
      case 'hotel':
      case 'hotelMulti':
        return 'hotel'
      case 'attraction':
        return 'mappin'
      case 'memo':
        return 'info'
      case 'vehicle':
        return 'bus'
      default:
        return 'calendar'
    }
  }

  // 初始化 TOC 項目（如果還沒有）
  const initializeTocItems = () => {
    const newTocItems: TocItem[] = availablePages.map(page => {
      // 尋找現有項目
      const existingItem = tocItems.find(item => item.pageId === page.id)
      if (existingItem) {
        // 更新頁碼（使用新的頁碼計算邏輯）
        const pageNumber = calculatePageNumberForToc(page.id, pages)
        return { ...existingItem, pageNumber }
      }
      // 建立新項目
      const pageNumber = calculatePageNumberForToc(page.id, pages)
      return {
        pageId: page.id,
        displayName: page.name,
        icon: getDefaultIcon(page.templateKey),
        enabled: true,
        pageNumber,
      }
    })

    onTemplateDataChange({
      ...templateData,
      tocItems: newTocItems,
    })
  }

  // 如果沒有 TOC 項目，顯示初始化按鈕
  if (tocItems.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-morandi-secondary">{DESIGNER_LABELS.SETTINGS_7690}</p>
        <Button variant="outline" size="sm" onClick={initializeTocItems} className="w-full gap-2">
          <RefreshCw size={14} />
          {DESIGNER_LABELS.LOADING_5110}
        </Button>
      </div>
    )
  }

  // 更新單一項目
  const updateTocItem = (pageId: string, field: keyof TocItem, value: unknown) => {
    const newTocItems = tocItems.map(item => {
      if (item.pageId !== pageId) return item
      return { ...item, [field]: value }
    })
    onTemplateDataChange({
      ...templateData,
      tocItems: newTocItems,
    })
  }

  // 切換啟用狀態
  const toggleEnabled = (pageId: string) => {
    const item = tocItems.find(i => i.pageId === pageId)
    if (item) {
      updateTocItem(pageId, 'enabled', !item.enabled)
    }
  }

  // 重新排序
  const { dragState, dragHandlers } = useDragSort({
    onReorder: (fromIndex, toIndex) => {
      const newTocItems = [...tocItems]
      const [removed] = newTocItems.splice(fromIndex, 1)
      newTocItems.splice(toIndex, 0, removed)
      onTemplateDataChange({
        ...templateData,
        tocItems: newTocItems,
      })
    },
  })

  // 刷新頁碼（使用新的頁碼計算邏輯）
  const refreshPageNumbers = () => {
    const newTocItems = tocItems.map(item => {
      const pageNumber = calculatePageNumberForToc(item.pageId, pages)
      return { ...item, pageNumber }
    })
    onTemplateDataChange({
      ...templateData,
      tocItems: newTocItems,
    })
  }

  // 統計啟用的項目數
  const enabledCount = tocItems.filter(i => i.enabled).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs">
          {DESIGNER_LABELS.LABEL_5681}
          {enabledCount})
        </Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshPageNumbers}
          className="h-6 px-2 text-[10px] gap-1"
          title={DESIGNER_LABELS.LABEL_155}
        >
          <RefreshCw size={10} />
          {DESIGNER_LABELS.LABEL_9382}
        </Button>
      </div>

      <div className="space-y-1.5">
        {tocItems.map((item, idx) => {
          const page = pages.find(p => p.id === item.pageId)
          if (!page) return null

          const iconOption = TOC_ICON_OPTIONS.find(o => o.value === item.icon)
          const IconComponent = iconOption?.Icon || Calendar

          return (
            <div
              key={item.pageId}
              draggable
              onDragStart={e => dragHandlers.onDragStart(e, idx)}
              onDragOver={e => dragHandlers.onDragOver(e, idx)}
              onDragLeave={dragHandlers.onDragLeave}
              onDrop={e => dragHandlers.onDrop(e, idx)}
              onDragEnd={dragHandlers.onDragEnd}
              className={cn(
                'p-2 rounded border border-border/50 bg-morandi-container/10 transition-all',
                !item.enabled && 'opacity-50',
                dragState.isDragging(idx) && 'opacity-30',
                dragState.isDragOver(idx) && 'border-morandi-gold border-dashed'
              )}
            >
              <div className="flex items-center gap-1.5">
                {/* 拖曳手柄 */}
                <div className="cursor-grab active:cursor-grabbing text-morandi-muted hover:text-morandi-primary shrink-0">
                  <GripVertical size={12} />
                </div>

                {/* 勾選 */}
                <Checkbox
                  checked={item.enabled}
                  onCheckedChange={() => toggleEnabled(item.pageId)}
                  className="shrink-0"
                />

                {/* 圖標選擇 */}
                <Select
                  value={item.icon}
                  onValueChange={v => updateTocItem(item.pageId, 'icon', v)}
                >
                  <SelectTrigger className="h-7 w-9 p-0 justify-center shrink-0">
                    <IconComponent size={14} className="text-morandi-gold" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOC_ICON_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <opt.Icon size={14} />
                          <span className="text-xs">{opt.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 名稱 */}
                <Input
                  value={item.displayName}
                  onChange={e => updateTocItem(item.pageId, 'displayName', e.target.value)}
                  placeholder={page.name}
                  className="flex-1 h-7 text-xs"
                />

                {/* 頁碼 */}
                <span className="text-xs text-morandi-secondary w-6 text-right shrink-0">
                  {item.pageNumber}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* 套用按鈕 */}
      {onApplyToc && (
        <Button
          size="sm"
          onClick={onApplyToc}
          className="w-full gap-2 bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg"
        >
          <Check size={14} />
          {DESIGNER_LABELS.LABEL_9768}
        </Button>
      )}
    </div>
  )
}
