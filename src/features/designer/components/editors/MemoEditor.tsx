'use client'

/**
 * 備忘錄編輯器 - 扁平化可排序列表
 *
 * 將一般項目、天氣季節、緊急聯絡整合到同一個列表
 */

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useDragSort } from '@/hooks/useDragSort'
import { GripVertical } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import type { CountryCode } from '../../templates/definitions/types'
import { getMemoSettingsByCountry } from '../../templates/definitions/country-presets'
import { DESIGNER_LABELS } from './constants/labels'

// 統一項目類型（用於扁平化顯示）
type UnifiedMemoItem = {
  type: 'item' | 'season' | 'info'
  id: string
  label: string // 顯示名稱
  enabled: boolean
  originalIndex: number // 原陣列中的索引
}

interface MemoEditorProps {
  templateData: Record<string, unknown>
  onTemplateDataChange: (newData: Record<string, unknown>) => void
}

export function MemoEditor({ templateData, onTemplateDataChange }: MemoEditorProps) {
  // 取得備忘錄設定
  const memoSettings = templateData.memoSettings as
    | {
        title?: string
        subtitle?: string
        items?: Array<{
          id: string
          category: string
          icon: string
          title: string
          titleZh?: string
          content: string
          enabled: boolean
        }>
        seasons?: Array<{
          season: string
          icon: string
          iconColor?: string
          months: string
          description: string
          enabled: boolean
        }>
        infoItems?: Array<{
          id: string
          icon: string
          iconColor?: string
          title: string
          content: string
          enabled: boolean
        }>
        // 儲存統一排序
        unifiedOrder?: string[] // 儲存所有項目的 ID，決定顯示順序
      }
    | undefined

  // 季節名稱對照
  const seasonLabels: Record<string, string> = {
    spring: '🌸 春季氣候',
    summer: '☀️ 夏季氣候',
    autumn: '🍂 秋季氣候',
    winter: '❄️ 冬季氣候',
  }

  // 建立統一列表
  const buildUnifiedList = (): UnifiedMemoItem[] => {
    const list: UnifiedMemoItem[] = []

    // 一般項目
    memoSettings?.items?.forEach((item, idx) => {
      list.push({
        type: 'item',
        id: item.id,
        label: item.titleZh || item.title,
        enabled: item.enabled,
        originalIndex: idx,
      })
    })

    // 季節項目（每個季節獨立）
    memoSettings?.seasons?.forEach((season, idx) => {
      list.push({
        type: 'season',
        id: `season-${season.season}`,
        label: seasonLabels[season.season] || season.season,
        enabled: season.enabled,
        originalIndex: idx,
      })
    })

    // 緊急聯絡項目
    memoSettings?.infoItems?.forEach((info, idx) => {
      list.push({
        type: 'info',
        id: info.id,
        label: `📞 ${info.title}`,
        enabled: info.enabled,
        originalIndex: idx,
      })
    })

    // 如果有儲存的排序，按照排序調整
    if (memoSettings?.unifiedOrder && memoSettings.unifiedOrder.length > 0) {
      const orderMap = new Map(memoSettings.unifiedOrder.map((id, idx) => [id, idx]))
      list.sort((a, b) => {
        const orderA = orderMap.get(a.id) ?? 999
        const orderB = orderMap.get(b.id) ?? 999
        return orderA - orderB
      })
    }

    return list
  }

  const unifiedList = buildUnifiedList()

  // 切換項目啟用狀態
  const toggleItem = (item: UnifiedMemoItem) => {
    if (!memoSettings) return

    if (item.type === 'item') {
      const newItems = memoSettings.items?.map((i, idx) => {
        if (idx !== item.originalIndex) return i
        return { ...i, enabled: !i.enabled }
      })
      onTemplateDataChange({
        ...templateData,
        memoSettings: { ...memoSettings, items: newItems },
      })
    } else if (item.type === 'season') {
      const newSeasons = memoSettings.seasons?.map((s, idx) => {
        if (idx !== item.originalIndex) return s
        return { ...s, enabled: !s.enabled }
      })
      onTemplateDataChange({
        ...templateData,
        memoSettings: { ...memoSettings, seasons: newSeasons },
      })
    } else if (item.type === 'info') {
      const newInfoItems = memoSettings.infoItems?.map((i, idx) => {
        if (idx !== item.originalIndex) return i
        return { ...i, enabled: !i.enabled }
      })
      onTemplateDataChange({
        ...templateData,
        memoSettings: { ...memoSettings, infoItems: newInfoItems },
      })
    }
  }

  // 拖曳排序（統一列表）
  const { dragState, dragHandlers } = useDragSort({
    onReorder: (fromIndex, toIndex) => {
      const newList = [...unifiedList]
      const [removed] = newList.splice(fromIndex, 1)
      newList.splice(toIndex, 0, removed)

      // 儲存新的排序
      const newOrder = newList.map(item => item.id)
      onTemplateDataChange({
        ...templateData,
        memoSettings: { ...memoSettings, unifiedOrder: newOrder },
      })
    },
  })

  // 國家選項（可選擇的國家）
  const countryOptions: { value: CountryCode; label: string }[] = [
    { value: 'JP', label: '🇯🇵 日本' },
    { value: 'TH', label: '🇹🇭 泰國' },
    { value: 'KR', label: '🇰🇷 韓國' },
    { value: 'VN', label: '🇻🇳 越南' },
    { value: 'CN', label: '🇨🇳 中國' },
    { value: 'HK', label: '🇭🇰 香港' },
    { value: 'OTHER', label: '🌍 其他' },
  ]

  // 當前選擇的國家代碼
  const currentCountryCode = (templateData.countryCode as CountryCode) || ''

  // 選擇國家後載入對應的備忘錄設定
  const handleCountryChange = (countryCode: CountryCode) => {
    const settings = getMemoSettingsByCountry(countryCode)
    onTemplateDataChange({
      ...templateData,
      countryCode,
      memoSettings: settings,
    })
  }

  // 如果沒有選擇國家或沒有 memoSettings，顯示國家選擇器
  if (!memoSettings || !memoSettings.items) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-morandi-secondary">{DESIGNER_LABELS.LOADING_9662}</p>
        <div className="space-y-2">
          <Label className="text-xs">{DESIGNER_LABELS.SELECT_8015}</Label>
          <Select
            value={currentCountryCode}
            onValueChange={v => handleCountryChange(v as CountryCode)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={DESIGNER_LABELS.SELECT_7302} />
            </SelectTrigger>
            <SelectContent>
              {countryOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-sm">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  }

  // 計算頁數（統一列表中啟用的項目）
  const enabledItemCount = unifiedList.filter(i => i.enabled).length
  const totalPages = Math.max(1, Math.ceil(enabledItemCount / 7)) // 每頁 7 個項目

  return (
    <div className="space-y-3">
      {/* 國家選擇 */}
      <div className="space-y-1.5">
        <Label className="text-xs">{DESIGNER_LABELS.LABEL_2650}</Label>
        <Select
          value={currentCountryCode}
          onValueChange={v => handleCountryChange(v as CountryCode)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder={DESIGNER_LABELS.SELECT_7169} />
          </SelectTrigger>
          <SelectContent>
            {countryOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-sm">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 頁數預估 */}
      <div className="p-2 bg-morandi-gold/10 rounded text-xs text-morandi-primary">
        已選 <span className="font-bold">{enabledItemCount}</span> {DESIGNER_LABELS.LABEL_2697}
        預計 <span className="font-bold">{totalPages}</span> {DESIGNER_LABELS.LABEL_8392}
      </div>

      {/* 提示文字 */}
      <p className="text-[10px] text-morandi-muted">{DESIGNER_LABELS.LABEL_177}</p>

      {/* 扁平化項目列表（一般項目 + 天氣季節 + 緊急聯絡） */}
      <div className="space-y-1">
        {unifiedList.map((item, idx) => (
          <label
            key={item.id}
            draggable
            onDragStart={e => dragHandlers.onDragStart(e, idx)}
            onDragOver={e => dragHandlers.onDragOver(e, idx)}
            onDragLeave={dragHandlers.onDragLeave}
            onDrop={e => dragHandlers.onDrop(e, idx)}
            onDragEnd={dragHandlers.onDragEnd}
            className={cn(
              'flex items-center gap-1.5 p-2 rounded border border-border/50 bg-morandi-container/10 cursor-pointer transition-all',
              !item.enabled && 'opacity-50',
              dragState.isDragging(idx) && 'opacity-30',
              dragState.isDragOver(idx) && 'border-morandi-gold border-dashed',
              // 不同類型可選擇不同背景色
              item.type === 'season' && 'bg-status-info/10/30',
              item.type === 'info' && 'bg-morandi-gold/10/30'
            )}
          >
            {/* 拖曳手柄 */}
            <div className="cursor-grab active:cursor-grabbing text-morandi-muted hover:text-morandi-primary shrink-0">
              <GripVertical size={12} />
            </div>

            {/* 勾選框 */}
            <Checkbox
              checked={item.enabled}
              onCheckedChange={() => toggleItem(item)}
              className="shrink-0"
            />

            {/* 標題 */}
            <span className="flex-1 text-xs text-morandi-primary truncate">{item.label}</span>

            {/* 類型標籤（可選） */}
            {item.type === 'season' && (
              <span className="text-[10px] text-status-info shrink-0">
                {DESIGNER_LABELS.LABEL_270}
              </span>
            )}
            {item.type === 'info' && (
              <span className="text-[10px] text-morandi-gold shrink-0">
                {DESIGNER_LABELS.LABEL_2152}
              </span>
            )}
          </label>
        ))}
      </div>

      <p className="text-[10px] text-morandi-muted">{DESIGNER_LABELS.ADD_9046}</p>
    </div>
  )
}
