import React from 'react'
import { CostItem } from '../types'
import { CalcInput } from '@/components/ui/calc-input'
import { cn } from '@/lib/utils'
import { EyeOff } from 'lucide-react'
import { ACCOMMODATION_ITEM_ROW_LABELS } from '../constants/labels'

interface AccommodationItemRowProps {
  item: CostItem
  categoryId: string
  day: number
  dayIndex: number
  roomIndex: number
  roomCount: number
  prevDayHotelName?: string // 前一天的飯店名稱（用於續住顯示）
  isReadOnly?: boolean
  handleUpdateItem: (
    categoryId: string,
    itemId: string,
    field: keyof CostItem,
    value: unknown
  ) => void
  handleRemoveItem: (categoryId: string, itemId: string) => void
  handleToggleVisibility: (categoryId: string, itemId: string) => void
}

export const AccommodationItemRow: React.FC<AccommodationItemRowProps> = ({
  item,
  categoryId,
  day,
  dayIndex,
  roomIndex,
  roomCount,
  prevDayHotelName,
  isReadOnly,
  handleUpdateItem,
  handleRemoveItem,
  handleToggleVisibility,
}) => {
  // 簡潔輸入框樣式（右側多留空間避免被 table-divider 遮到）
  const inputClass = 'input-no-focus w-full pl-1 pr-3 py-1 text-sm bg-transparent'

  // 是否為續住（只有第一個房型才顯示續住選項）
  const isSameAsPrevious = item.is_same_as_previous || false
  const canShowSameAsPrevious = roomIndex === 0 && day > 1 && prevDayHotelName

  return (
    <tr
      className={cn(
        'border-b border-morandi-container/60 hover:bg-morandi-container/5 transition-colors',
        dayIndex % 2 === 1 && 'bg-muted/40'
      )}
    >
      {/* 分類欄：第一個房型顯示天數，合併儲存格 */}
      {roomIndex === 0 && (
        <td
          className="py-3 px-4 text-sm text-morandi-primary text-center table-divider"
          rowSpan={roomCount}
        >
          DAY{day}
        </td>
      )}

      {/* 項目欄：房型名稱（續住時顯示提示） */}
      <td className="py-3 px-4 text-sm text-morandi-primary text-center table-divider">
        {isSameAsPrevious ? (
          <span className="text-morandi-secondary italic">
            {ACCOMMODATION_ITEM_ROW_LABELS.LABEL_1440}
            {prevDayHotelName})
          </span>
        ) : (
          <input
            type="text"
            value={item.name}
            onChange={e => handleUpdateItem(categoryId, item.id, 'name', e.target.value)}
            className={`${inputClass} text-center`}
            placeholder={ACCOMMODATION_ITEM_ROW_LABELS.房型名稱}
            disabled={isReadOnly}
          />
        )}
      </td>

      {/* 人數欄 */}
      <td className="py-3 px-4 text-sm text-morandi-secondary text-center table-divider">
        <CalcInput
          value={item.quantity}
          onChange={val => handleUpdateItem(categoryId, item.id, 'quantity', val)}
          formula={item.quantity_formula}
          onFormulaChange={f => handleUpdateItem(categoryId, item.id, 'quantity_formula', f)}
          className={`${inputClass} text-center`}
          placeholder={ACCOMMODATION_ITEM_ROW_LABELS.人}
          disabled={isReadOnly}
        />
      </td>

      {/* 單價欄 */}
      <td className="py-3 px-4 text-sm text-morandi-secondary text-center table-divider">
        <CalcInput
          value={item.unit_price}
          onChange={val => handleUpdateItem(categoryId, item.id, 'unit_price', val)}
          formula={item.unit_price_formula}
          onFormulaChange={f => handleUpdateItem(categoryId, item.id, 'unit_price_formula', f)}
          className={`${inputClass} text-center`}
          placeholder={ACCOMMODATION_ITEM_ROW_LABELS.單價}
          disabled={isReadOnly}
        />
      </td>

      {/* 小計欄 */}
      <td className="py-3 px-4 text-sm text-morandi-primary text-center font-medium table-divider whitespace-nowrap">
        {item.total.toLocaleString()}
      </td>

      {/* 備註 / 操作合併欄 */}
      <td colSpan={2} className="py-3 px-4 text-sm text-morandi-secondary">
        <div className="flex items-center justify-between">
          <input
            type="text"
            value={isSameAsPrevious ? ACCOMMODATION_ITEM_ROW_LABELS.續住 : item.note || ''}
            onChange={e => handleUpdateItem(categoryId, item.id, 'note', e.target.value)}
            className={`${inputClass} flex-1`}
            placeholder={ACCOMMODATION_ITEM_ROW_LABELS.備註}
            disabled={isReadOnly || isSameAsPrevious}
          />
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {!isReadOnly && (
              <>
                {/* 隱藏/顯示按鈕 */}
                <button
                  onClick={() => handleToggleVisibility(categoryId, item.id)}
                  className="w-4 h-4 flex items-center justify-center text-morandi-secondary hover:text-morandi-gold hover:bg-morandi-gold/10 rounded transition-all"
                  title="在報價單和需求單隱藏此項目"
                >
                  <EyeOff size={14} />
                </button>
                {/* 刪除按鈕（只有非第一個房型才顯示） */}
                {roomIndex !== 0 && (
                  <button
                    onClick={() => handleRemoveItem(categoryId, item.id)}
                    className="w-4 h-4 flex items-center justify-center text-xs text-morandi-secondary hover:text-morandi-red hover:bg-morandi-red/10 rounded transition-all"
                    title={ACCOMMODATION_ITEM_ROW_LABELS.刪除}
                  >
                    ×
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}
