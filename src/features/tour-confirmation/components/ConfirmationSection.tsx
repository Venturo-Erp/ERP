'use client'

/**
 * ConfirmationSection - 出團確認表區塊組件
 *
 * 可重用的表格區塊，用於顯示各類型項目：
 * - 交通、餐食、住宿、活動、其他
 */

import { LucideIcon, Plus, Edit2, Trash2, FileOutput, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type {
  TourConfirmationItem,
  ConfirmationItemCategory,
} from '@/types/tour-confirmation-sheet.types'
import { CONFIRMATION_SECTION_LABELS } from '../constants/labels'
import { formatDateCompactPadded } from '@/lib/utils/format-date'
import { formatMoney } from '@/lib/utils/format-currency'

interface ColumnConfig {
  key: string
  label: string
  width?: number
  flex?: boolean
  type?: 'text' | 'currency' | 'date' | 'number'
}

interface ConfirmationSectionProps {
  title: string
  icon: LucideIcon
  iconColor: string
  items: TourConfirmationItem[]
  category: ConfirmationItemCategory
  columns: ColumnConfig[]
  onAdd: () => void
  onEdit: (item: TourConfirmationItem) => void
  onDelete: (itemId: string) => void
  onGenerateRequest?: (item: TourConfirmationItem) => void
}

export function ConfirmationSection({
  title,
  icon: Icon,
  iconColor,
  items,
  columns,
  onAdd,
  onEdit,
  onDelete,
  onGenerateRequest,
}: ConfirmationSectionProps) {
  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '-'
    return formatMoney(value) || '0'
  }

  const formatDate = (dateStr: string | null | undefined) => {
    return formatDateCompactPadded(dateStr) || '-'
  }

  const getCellValue = (item: TourConfirmationItem, col: ColumnConfig) => {
    const value = item[col.key as keyof TourConfirmationItem]

    switch (col.type) {
      case 'currency':
        return formatCurrency(value as number)
      case 'date':
        return formatDate(value as string)
      case 'number':
        return value != null ? String(value) : '-'
      default:
        return value != null ? String(value) : '-'
    }
  }

  // 計算該區塊的小計
  const sectionTotal = {
    expected: items.reduce((sum, i) => sum + (i.expected_cost || 0), 0),
    actual: items.reduce((sum, i) => sum + (i.actual_cost || 0), 0),
  }

  // 生成導航連結
  const getNavigationUrl = (item: TourConfirmationItem) => {
    // 優先使用儲存的 Google Maps URL
    if (item.google_maps_url) {
      return item.google_maps_url
    }
    // 使用 GPS 座標
    if (item.latitude && item.longitude) {
      return `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`
    }
    return null
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* 標題列 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-morandi-container/30">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${iconColor} flex items-center justify-center`}>
            <Icon size={16} className="text-white" />
          </div>
          <h3 className="font-medium text-morandi-primary">{title}</h3>
          <span className="text-sm text-morandi-secondary">({items.length} 項)</span>
        </div>
        <Button
          size="sm"
          onClick={onAdd}
          className="bg-morandi-gold hover:bg-morandi-gold-hover gap-1"
        >
          <Plus size={14} />
          {CONFIRMATION_SECTION_LABELS.ADD}
        </Button>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-morandi-container/20 border-b border-border/60">
              {columns.map(col => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-left text-xs font-medium text-morandi-secondary"
                  style={{
                    width: col.width ? `${col.width}px` : undefined,
                    minWidth: col.width ? `${col.width}px` : undefined,
                  }}
                >
                  {col.label}
                </th>
              ))}
              <th className="px-3 py-2 text-right text-xs font-medium text-morandi-secondary w-24">
                {CONFIRMATION_SECTION_LABELS.ACTIONS}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-4 py-8 text-center text-morandi-secondary text-sm"
                >
                  {CONFIRMATION_SECTION_LABELS.ADD_6529}
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr
                  key={item.id}
                  className={`border-b border-border/40 hover:bg-morandi-container/10 ${
                    index % 2 === 0 ? '' : 'bg-morandi-container/5'
                  }`}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`px-3 py-2 text-sm ${
                        col.type === 'currency' ? 'text-right font-mono' : ''
                      }`}
                    >
                      {getCellValue(item, col)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* GPS 導航按鈕 */}
                      {getNavigationUrl(item) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const url = getNavigationUrl(item)
                            if (url) window.open(url, '_blank')
                          }}
                          className="h-7 w-7 p-0 text-morandi-green hover:text-morandi-green hover:bg-morandi-green/10"
                          title={CONFIRMATION_SECTION_LABELS.開啟_Google_Maps_導航}
                        >
                          <Navigation size={14} />
                        </Button>
                      )}
                      {onGenerateRequest && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onGenerateRequest(item)}
                          className="h-7 w-7 p-0 text-morandi-secondary hover:text-morandi-gold"
                          title={CONFIRMATION_SECTION_LABELS.產出需求單}
                        >
                          <FileOutput size={14} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(item)}
                        className="h-7 w-7 p-0 text-morandi-secondary hover:text-morandi-primary"
                        title={CONFIRMATION_SECTION_LABELS.編輯}
                      >
                        <Edit2 size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(item.id)}
                        className="h-7 w-7 p-0 text-morandi-secondary hover:text-morandi-red"
                        title={CONFIRMATION_SECTION_LABELS.刪除}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot>
              <tr className="bg-morandi-container/30 border-t border-border">
                <td
                  colSpan={columns.length - 1}
                  className="px-3 py-2 text-right text-sm font-medium text-morandi-primary"
                >
                  {CONFIRMATION_SECTION_LABELS.LABEL_1075}
                </td>
                <td className="px-3 py-2 text-right text-sm font-mono">
                  <div className="flex flex-col">
                    <span className="text-morandi-secondary text-xs">
                      {CONFIRMATION_SECTION_LABELS.LABEL_6009}
                    </span>
                    <span className="font-medium">{formatCurrency(sectionTotal.expected)}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right text-sm font-mono">
                  <div className="flex flex-col">
                    <span className="text-morandi-secondary text-xs">
                      {CONFIRMATION_SECTION_LABELS.LABEL_3550}
                    </span>
                    <span className="font-medium">{formatCurrency(sectionTotal.actual)}</span>
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
