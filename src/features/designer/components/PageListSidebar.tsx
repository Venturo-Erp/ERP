'use client'

/**
 * 頁面列表側邊欄
 *
 * 顯示所有頁面縮圖，支援：
 * - 切換頁面
 * - 新增頁面
 * - 刪除頁面
 * - 拖曳排序
 */

import { useState, useMemo, useCallback } from 'react'
import { Plus, Trash2, GripVertical, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useDragSort } from '@/hooks/useDragSort'
import { Checkbox } from '@/components/ui/checkbox'
import type { CanvasPage } from './types'
import type { StyleSeries } from '../templates/engine'
import type {
  MemoSettings,
  MemoItem,
  SeasonInfo,
  MemoInfoItem,
} from '../templates/definitions/types'
import { DESIGNER_LABELS } from './constants/labels'

// 頁面類型定義
interface PageTypeOption {
  id: string
  templateKey: keyof StyleSeries['templates'] | 'blank'
  name: string
  description: string
}

const PAGE_TYPES: PageTypeOption[] = [
  { id: 'blank', templateKey: 'blank', name: '空白頁', description: '用於排版間隔' },
  { id: 'toc', templateKey: 'toc', name: '目錄', description: '章節目錄頁' },
  { id: 'itinerary', templateKey: 'itinerary', name: '行程總覽', description: '航班、集合資訊' },
  { id: 'daily', templateKey: 'daily', name: '每日行程', description: '單日行程詳情' },
  { id: 'hotel', templateKey: 'hotel', name: '飯店介紹', description: '單一飯店資訊' },
  { id: 'attraction', templateKey: 'attraction', name: '景點介紹', description: '景點特色說明' },
  { id: 'memo', templateKey: 'memo', name: '旅遊提醒', description: '注意事項備忘' },
  { id: 'vehicle', templateKey: 'vehicle', name: '分車/分桌', description: '車輛或桌次分配' },
]

// 備忘錄項目分類標籤
const CATEGORY_LABELS: Record<string, string> = {
  etiquette: '禮儀須知',
  flight: '航空/行李',
  weather: '天氣資訊',
  practical: '實用資訊',
}

// 備忘錄頁面選擇的內容
export interface MemoPageContent {
  items?: MemoItem[]
  seasons?: SeasonInfo[]
  infoItems?: MemoInfoItem[]
  isWeatherPage?: boolean
}

interface PageListSidebarProps {
  pages: CanvasPage[]
  currentPageIndex: number
  selectedStyle: StyleSeries | null
  totalDays?: number // 行程總天數（用於每日行程）
  memoSettings?: MemoSettings | null // 備忘錄設定
  usedMemoItemIds?: string[] // 已使用的備忘錄項目 ID（避免重複）
  onSelectPage: (index: number) => void
  onAddPage: (templateKey: string) => void
  onAddMemoPage?: (content: MemoPageContent) => void // 新增備忘錄頁（帶選擇的內容）
  onAddDailyPages?: () => void // 一次新增所有天的每日行程
  onDeletePage: (index: number) => void
  onDuplicatePage?: (index: number) => void // 複製頁面
  onReorderPages: (fromIndex: number, toIndex: number) => void
}

export function PageListSidebar({
  pages,
  currentPageIndex,
  selectedStyle,
  totalDays = 1,
  memoSettings,
  usedMemoItemIds = [],
  onSelectPage,
  onAddPage,
  onAddMemoPage,
  onAddDailyPages,
  onDeletePage,
  onDuplicatePage,
  onReorderPages,
}: PageListSidebarProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showMemoDialog, setShowMemoDialog] = useState(false)
  const [selectedMemoItemIds, setSelectedMemoItemIds] = useState<string[]>([])
  const [selectedSeasonIds, setSelectedSeasonIds] = useState<string[]>([])
  const [selectedInfoItemIds, setSelectedInfoItemIds] = useState<string[]>([])
  const [memoPageType, setMemoPageType] = useState<'items' | 'weather'>('items')

  // 拖曳排序（封面不可拖曳/放置）
  const { dragState, dragHandlers } = useDragSort({
    onReorder: onReorderPages,
    canDrag: index => index > 0, // 封面不可拖曳
    canDrop: index => index > 0, // 不能拖到封面位置
  })

  // 可用的頁面類型（根據選擇的風格）
  const availablePageTypes = PAGE_TYPES.filter(pt => {
    if (!selectedStyle) return false
    // 空白頁永遠可用
    if (pt.templateKey === 'blank') return true
    return pt.templateKey in selectedStyle.templates
  })

  // 將備忘錄項目按分類分組
  const groupedMemoItems = useMemo(() => {
    if (!memoSettings?.items) return {}
    const grouped: Record<string, MemoItem[]> = {}
    for (const item of memoSettings.items) {
      const category = item.category || 'other'
      if (!grouped[category]) grouped[category] = []
      grouped[category].push(item)
    }
    return grouped
  }, [memoSettings?.items])

  // 處理備忘錄項目勾選
  const handleToggleMemoItem = useCallback((itemId: string) => {
    setSelectedMemoItemIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    )
  }, [])

  // 處理季節勾選
  const handleToggleSeason = useCallback((season: string) => {
    setSelectedSeasonIds(prev =>
      prev.includes(season) ? prev.filter(s => s !== season) : [...prev, season]
    )
  }, [])

  // 處理資訊項目勾選
  const handleToggleInfoItem = useCallback((itemId: string) => {
    setSelectedInfoItemIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    )
  }, [])

  // 確認新增備忘錄頁
  const handleConfirmMemoPage = useCallback(() => {
    if (!onAddMemoPage || !memoSettings) return

    if (memoPageType === 'items') {
      // 項目頁
      const selectedItems =
        memoSettings.items?.filter(item => selectedMemoItemIds.includes(item.id)) || []
      if (selectedItems.length === 0) return

      onAddMemoPage({
        items: selectedItems,
        isWeatherPage: false,
      })
    } else {
      // 天氣/資訊頁
      const selectedSeasons =
        memoSettings.seasons?.filter(s => selectedSeasonIds.includes(s.season)) || []
      const selectedInfos =
        memoSettings.infoItems?.filter(i => selectedInfoItemIds.includes(i.id)) || []
      if (selectedSeasons.length === 0 && selectedInfos.length === 0) return

      onAddMemoPage({
        seasons: selectedSeasons,
        infoItems: selectedInfos,
        isWeatherPage: true,
      })
    }

    // 關閉對話框並重置選擇
    setShowMemoDialog(false)
    setSelectedMemoItemIds([])
    setSelectedSeasonIds([])
    setSelectedInfoItemIds([])
  }, [
    onAddMemoPage,
    memoSettings,
    memoPageType,
    selectedMemoItemIds,
    selectedSeasonIds,
    selectedInfoItemIds,
  ])

  // 打開備忘錄選擇對話框
  const handleOpenMemoDialog = useCallback(() => {
    setShowAddDialog(false)
    setShowMemoDialog(true)
    // 重置選擇狀態
    setSelectedMemoItemIds([])
    setSelectedSeasonIds([])
    setSelectedInfoItemIds([])
    setMemoPageType('items')
  }, [])

  return (
    <div className="w-48 bg-card border-r border-border flex flex-col shrink-0">
      {/* 標題 - 高度與元素庫一致 */}
      <div className="p-3 border-b border-border flex items-center justify-between h-[42px]">
        <span className="text-sm font-medium text-morandi-primary">
          {DESIGNER_LABELS.LABEL_2099}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAddDialog(true)}
          className="h-5 w-5 p-0"
          disabled={!selectedStyle}
        >
          <Plus size={12} />
        </Button>
      </div>

      {/* 頁面列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {pages.map((page, index) => (
          <div
            key={page.id}
            draggable={dragState.canDrag(index)}
            onDragStart={e => dragHandlers.onDragStart(e, index)}
            onDragOver={e => dragHandlers.onDragOver(e, index)}
            onDragLeave={dragHandlers.onDragLeave}
            onDrop={e => dragHandlers.onDrop(e, index)}
            onDragEnd={dragHandlers.onDragEnd}
            className={cn(
              'group relative rounded-lg border-2 transition-all cursor-pointer',
              'hover:border-morandi-gold/50',
              index === currentPageIndex
                ? 'border-morandi-gold bg-morandi-gold/5'
                : 'border-border',
              // 拖曳中的樣式
              dragState.isDragging(index) && 'opacity-50',
              dragState.isDragOver(index) && 'border-morandi-gold border-dashed'
            )}
            onClick={() => onSelectPage(index)}
          >
            {/* 縮圖預覽區 */}
            <div className="aspect-[559/794] bg-card rounded-t flex items-center justify-center text-xs text-morandi-secondary overflow-hidden">
              {/* 簡易預覽：顯示頁面名稱 */}
              <div className="text-center p-2">
                <div className="text-morandi-primary font-medium truncate">{page.name}</div>
                <div className="text-[10px] text-morandi-secondary">第 {index + 1} 頁</div>
              </div>
            </div>

            {/* 頁面操作 */}
            <div className="flex items-center justify-between p-1.5 border-t border-border/50">
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical size={12} className="text-morandi-muted cursor-grab" />
              </div>

              {/* 複製和刪除按鈕（封面不可刪除） */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {onDuplicatePage && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      onDuplicatePage(index)
                    }}
                    className="p-1 rounded hover:bg-morandi-gold/10 text-morandi-muted hover:text-morandi-gold transition-all"
                    title={DESIGNER_LABELS.COPYING_1247}
                  >
                    <Copy size={12} />
                  </button>
                )}
                {index > 0 && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      onDeletePage(index)
                    }}
                    className="p-1 rounded hover:bg-morandi-red/10 text-morandi-muted hover:text-morandi-red transition-all"
                    title={DESIGNER_LABELS.DELETE_6755}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 新增頁面對話框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent level={1} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{DESIGNER_LABELS.ADD_1813}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {availablePageTypes.map(pageType => (
              <button
                key={pageType.id}
                type="button"
                onClick={() => {
                  if (pageType.templateKey === 'daily' && onAddDailyPages) {
                    // 每日行程：一次新增所有天
                    onAddDailyPages()
                    setShowAddDialog(false)
                  } else {
                    // 其他頁面類型（包括備忘錄）：直接新增
                    onAddPage(pageType.templateKey)
                    setShowAddDialog(false)
                  }
                }}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border border-border',
                  'hover:border-morandi-gold hover:bg-morandi-gold/5 transition-all text-left'
                )}
              >
                <div>
                  <div className="font-medium text-morandi-primary">
                    {pageType.name}
                    {pageType.templateKey === 'daily' && totalDays > 0 && (
                      <span className="text-morandi-secondary font-normal ml-1">
                        ({totalDays}天)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-morandi-secondary">{pageType.description}</div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 備忘錄項目選擇對話框 */}
      <Dialog open={showMemoDialog} onOpenChange={setShowMemoDialog}>
        <DialogContent level={1} className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{DESIGNER_LABELS.SELECT_5731}</DialogTitle>
          </DialogHeader>

          {/* 頁面類型切換 */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setMemoPageType('items')}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all',
                memoPageType === 'items'
                  ? 'border-morandi-gold bg-morandi-gold/10 text-morandi-gold'
                  : 'border-border text-morandi-secondary hover:border-morandi-gold/50'
              )}
            >
              {DESIGNER_LABELS.LABEL_4996}
            </button>
            <button
              type="button"
              onClick={() => setMemoPageType('weather')}
              className={cn(
                'flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all',
                memoPageType === 'weather'
                  ? 'border-morandi-gold bg-morandi-gold/10 text-morandi-gold'
                  : 'border-border text-morandi-secondary hover:border-morandi-gold/50'
              )}
            >
              {DESIGNER_LABELS.LABEL_6184}
            </button>
          </div>

          {/* 內容區域 */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {memoPageType === 'items' ? (
              /* 提醒項目列表 */
              <>
                {Object.entries(groupedMemoItems).map(([category, items]) => (
                  <div key={category}>
                    <div className="text-xs font-semibold text-morandi-secondary mb-2 uppercase tracking-wider">
                      {CATEGORY_LABELS[category] || category}
                    </div>
                    <div className="space-y-1">
                      {items.map(item => {
                        const isUsed = usedMemoItemIds.includes(item.id)
                        const isSelected = selectedMemoItemIds.includes(item.id)
                        return (
                          <label
                            key={item.id}
                            className={cn(
                              'flex items-start gap-3 p-2 rounded-lg border cursor-pointer transition-all',
                              isUsed
                                ? 'border-border/50 bg-morandi-container/30 opacity-50 cursor-not-allowed'
                                : isSelected
                                  ? 'border-morandi-gold bg-morandi-gold/5'
                                  : 'border-border hover:border-morandi-gold/50'
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              disabled={isUsed}
                              onCheckedChange={() => !isUsed && handleToggleMemoItem(item.id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-morandi-primary">
                                {item.titleZh || item.title}
                                {isUsed && (
                                  <span className="ml-2 text-xs text-morandi-muted">(已使用)</span>
                                )}
                              </div>
                              <div className="text-xs text-morandi-secondary line-clamp-2">
                                {item.content}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {Object.keys(groupedMemoItems).length === 0 && (
                  <div className="text-center text-morandi-secondary py-8">
                    {DESIGNER_LABELS.NOT_FOUND_4490}
                  </div>
                )}
              </>
            ) : (
              /* 天氣/緊急資訊 */
              <>
                {/* 季節選擇 */}
                {memoSettings?.seasons && memoSettings.seasons.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-morandi-secondary mb-2 uppercase tracking-wider">
                      {DESIGNER_LABELS.LABEL_805}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {memoSettings.seasons.map(season => {
                        const isSelected = selectedSeasonIds.includes(season.season)
                        return (
                          <label
                            key={season.season}
                            className={cn(
                              'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all',
                              isSelected
                                ? 'border-morandi-gold bg-morandi-gold/5'
                                : 'border-border hover:border-morandi-gold/50'
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleSeason(season.season)}
                            />
                            <div>
                              <div className="text-sm font-medium text-morandi-primary">
                                {season.season === 'spring' && '春季'}
                                {season.season === 'summer' && '夏季'}
                                {season.season === 'autumn' && '秋季'}
                                {season.season === 'winter' && '冬季'}
                              </div>
                              <div className="text-xs text-morandi-secondary">{season.months}</div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 資訊項目選擇 */}
                {memoSettings?.infoItems && memoSettings.infoItems.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-morandi-secondary mb-2 uppercase tracking-wider">
                      {DESIGNER_LABELS.LABEL_7094}
                    </div>
                    <div className="space-y-1">
                      {memoSettings.infoItems.map(item => {
                        const isSelected = selectedInfoItemIds.includes(item.id)
                        return (
                          <label
                            key={item.id}
                            className={cn(
                              'flex items-start gap-3 p-2 rounded-lg border cursor-pointer transition-all',
                              isSelected
                                ? 'border-morandi-gold bg-morandi-gold/5'
                                : 'border-border hover:border-morandi-gold/50'
                            )}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleInfoItem(item.id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-morandi-primary">
                                {item.title}
                              </div>
                              <div className="text-xs text-morandi-secondary line-clamp-2">
                                {item.content}
                              </div>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}

                {(!memoSettings?.seasons || memoSettings.seasons.length === 0) &&
                  (!memoSettings?.infoItems || memoSettings.infoItems.length === 0) && (
                    <div className="text-center text-morandi-secondary py-8">
                      {DESIGNER_LABELS.NOT_FOUND_2488}
                    </div>
                  )}
              </>
            )}
          </div>

          {/* 統計與確認 */}
          <DialogFooter className="mt-4 pt-4 border-t border-border">
            <div className="flex-1 text-sm text-morandi-secondary">
              {memoPageType === 'items'
                ? `已選擇 ${selectedMemoItemIds.length} 個項目`
                : `已選擇 ${selectedSeasonIds.length} 個季節, ${selectedInfoItemIds.length} 個資訊`}
            </div>
            <Button variant="outline" onClick={() => setShowMemoDialog(false)}>
              {DESIGNER_LABELS.CANCEL}
            </Button>
            <Button
              onClick={handleConfirmMemoPage}
              disabled={
                memoPageType === 'items'
                  ? selectedMemoItemIds.length === 0
                  : selectedSeasonIds.length === 0 && selectedInfoItemIds.length === 0
              }
              className="bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg gap-1"
            >
              <Check size={14} />
              {DESIGNER_LABELS.ADD_1813}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
