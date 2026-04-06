'use client'

import React, { useRef, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { QuickQuoteItem } from '@/stores/types'
import { evaluateExpression } from '@/components/widgets/calculator/calculatorUtils'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import {
  ACCOMMODATION_ITEM_ROW_LABELS,
  QUICK_QUOTE_DIALOG_LABELS,
  QUICK_QUOTE_ITEMS_TABLE_LABELS,
} from '../../constants/labels'
import { QUOTE_COMPONENT_LABELS } from '../../constants/labels'

interface QuickQuoteItemsTableProps {
  items: QuickQuoteItem[]
  isEditing: boolean
  onAddItem: () => void
  onRemoveItem: (id: string) => void
  onUpdateItem: <K extends keyof QuickQuoteItem>(
    id: string,
    field: K,
    value: QuickQuoteItem[K]
  ) => void
  onReorderItems?: (oldIndex: number, newIndex: number) => void
}

// 可排序的表格列
interface SortableRowProps {
  item: QuickQuoteItem
  isEditing: boolean
  cellClass: string
  inputClass: string
  onUpdateItem: <K extends keyof QuickQuoteItem>(
    id: string,
    field: K,
    value: QuickQuoteItem[K]
  ) => void
  onRemoveItem: (id: string) => void
  handleTextChange: (
    id: string,
    field: 'description' | 'notes',
    e: React.ChangeEvent<HTMLInputElement>
  ) => void
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  handleCompositionStart: () => void
  handleCompositionEnd: (
    id: string,
    field: 'description' | 'notes',
    e: React.CompositionEvent<HTMLInputElement>
  ) => void
  normalizeNumber: (val: string) => string
  cleanExpressionInput: (val: string) => string
}

const SortableRow: React.FC<SortableRowProps> = ({
  item,
  isEditing,
  cellClass,
  inputClass,
  onUpdateItem,
  onRemoveItem,
  handleTextChange,
  handleKeyDown,
  handleCompositionStart,
  handleCompositionEnd,
  normalizeNumber,
  cleanExpressionInput,
}) => {
  // 本地狀態：用於暫存計算式（如 "18000+45"）
  const [costExpr, setCostExpr] = useState<string>(
    item.cost === 0 || item.cost === undefined ? '' : String(item.cost)
  )
  const [unitPriceExpr, setUnitPriceExpr] = useState<string>(
    item.unit_price === 0 ? '' : String(item.unit_price)
  )
  const [quantityExpr, setQuantityExpr] = useState<string>(
    item.quantity === 0 ? '' : String(item.quantity)
  )

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !isEditing,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // 處理聚焦 - Excel 式行為：顯示公式
  const handleFocus = (
    field: 'cost' | 'unit_price' | 'quantity',
    setExpr: (val: string) => void
  ) => {
    const formulaField = `${field}_formula` as
      | 'cost_formula'
      | 'unit_price_formula'
      | 'quantity_formula'
    const formula = item[formulaField]
    if (formula) {
      setExpr(formula)
    }
  }

  // 處理計算式欄位的 Enter 或 blur - 計算並更新
  const handleExpressionCommit = (
    field: 'cost' | 'unit_price' | 'quantity',
    expr: string,
    setExpr: (val: string) => void
  ) => {
    const cleaned = cleanExpressionInput(expr)
    const formulaField = `${field}_formula` as
      | 'cost_formula'
      | 'unit_price_formula'
      | 'quantity_formula'

    if (!cleaned || cleaned === '-') {
      onUpdateItem(item.id, field, 0)
      onUpdateItem(item.id, formulaField, undefined)
      setExpr('')
      return
    }

    // 檢查是否包含運算符號（是計算式）
    const hasOperator = /[+\-*/()]/.test(cleaned.replace(/^-/, '')) // 忽略開頭的負號

    if (hasOperator) {
      // 有運算符號，計算結果並儲存公式
      const result = evaluateExpression(cleaned, NaN)
      if (!isNaN(result)) {
        onUpdateItem(item.id, field, result)
        onUpdateItem(item.id, formulaField, cleaned) // 儲存公式
        setExpr(String(result))
      }
    } else {
      // 純數字，清除公式
      const num = parseFloat(cleaned)
      if (!isNaN(num)) {
        onUpdateItem(item.id, field, num)
        onUpdateItem(item.id, formulaField, undefined)
        setExpr(String(num))
      }
    }
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn('hover:bg-morandi-container/10', isDragging && 'opacity-50 bg-morandi-gold/10')}
    >
      {/* 拖曳把手 */}
      {isEditing && (
        <td className={`${cellClass} w-8 text-center`}>
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-morandi-secondary hover:text-morandi-primary p-1"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </td>
      )}
      <td className={cellClass}>
        <input
          value={item.description}
          onChange={e => handleTextChange(item.id, 'description', e)}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={e => handleCompositionEnd(item.id, 'description', e)}
          placeholder={QUICK_QUOTE_DIALOG_LABELS.項目說明}
          disabled={!isEditing}
          className={inputClass}
        />
      </td>
      <td className={cellClass}>
        <input
          type="text"
          value={quantityExpr}
          onChange={e => {
            const cleaned = cleanExpressionInput(e.target.value)
            setQuantityExpr(cleaned)
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleExpressionCommit('quantity', quantityExpr, setQuantityExpr)
              e.currentTarget.blur()
            }
          }}
          onFocus={() => handleFocus('quantity', setQuantityExpr)}
          onBlur={() => handleExpressionCommit('quantity', quantityExpr, setQuantityExpr)}
          disabled={!isEditing}
          placeholder={QUICK_QUOTE_ITEMS_TABLE_LABELS.可輸入算式}
          className={cn(inputClass, 'text-center', item.quantity_formula && '!text-status-info')}
          title={item.quantity_formula ? `公式: ${item.quantity_formula}` : undefined}
        />
      </td>
      {isEditing && (
        <td className={cellClass}>
          <input
            type="text"
            value={costExpr}
            onChange={e => {
              const cleaned = cleanExpressionInput(e.target.value)
              setCostExpr(cleaned)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleExpressionCommit('cost', costExpr, setCostExpr)
                e.currentTarget.blur()
              }
            }}
            onFocus={() => handleFocus('cost', setCostExpr)}
            onBlur={() => handleExpressionCommit('cost', costExpr, setCostExpr)}
            placeholder={QUICK_QUOTE_ITEMS_TABLE_LABELS.可輸入算式}
            className={cn(inputClass, 'text-right', item.cost_formula && '!text-status-info')}
            title={item.cost_formula ? `公式: ${item.cost_formula}` : undefined}
          />
        </td>
      )}
      <td className={cellClass}>
        <input
          type="text"
          value={unitPriceExpr}
          onChange={e => {
            const cleaned = cleanExpressionInput(e.target.value)
            setUnitPriceExpr(cleaned)
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleExpressionCommit('unit_price', unitPriceExpr, setUnitPriceExpr)
              e.currentTarget.blur()
            }
          }}
          onFocus={() => handleFocus('unit_price', setUnitPriceExpr)}
          onBlur={() => handleExpressionCommit('unit_price', unitPriceExpr, setUnitPriceExpr)}
          disabled={!isEditing}
          placeholder={QUICK_QUOTE_ITEMS_TABLE_LABELS.可輸入算式}
          className={cn(inputClass, 'text-right', item.unit_price_formula && '!text-status-info')}
          title={item.unit_price_formula ? `公式: ${item.unit_price_formula}` : undefined}
        />
      </td>
      <td className={`${cellClass} text-right font-medium`}>{item.amount.toLocaleString()}</td>
      {isEditing && (
        <td className={`${cellClass} text-right font-medium`}>
          <span
            className={
              (item.unit_price - (item.cost || 0)) * item.quantity >= 0
                ? 'text-morandi-green'
                : 'text-morandi-red'
            }
          >
            {((item.unit_price - (item.cost || 0)) * item.quantity).toLocaleString()}
          </span>
        </td>
      )}
      <td className={cellClass}>
        <input
          value={item.notes}
          onChange={e => handleTextChange(item.id, 'notes', e)}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={e => handleCompositionEnd(item.id, 'notes', e)}
          placeholder={ACCOMMODATION_ITEM_ROW_LABELS.備註}
          disabled={!isEditing}
          className={inputClass}
        />
      </td>
      {isEditing && (
        <td className={`${cellClass} text-center`}>
          <button
            type="button"
            onClick={() => onRemoveItem(item.id)}
            className="text-morandi-red hover:text-status-danger"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </td>
      )}
    </tr>
  )
}

export const QuickQuoteItemsTable: React.FC<QuickQuoteItemsTableProps> = ({
  items,
  isEditing,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  onReorderItems,
}) => {
  // IME 組合輸入狀態追蹤
  const isComposingRef = useRef(false)

  // 拖曳感測器設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id && onReorderItems) {
      const oldIndex = items.findIndex(item => item.id === active.id)
      const newIndex = items.findIndex(item => item.id === over.id)
      onReorderItems(oldIndex, newIndex)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 組合輸入中按 Enter 不處理
    if (e.key === 'Enter' && isComposingRef.current) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }

  /**
   * 清理輸入：移除中文、轉換全形為半形
   * 支援計算式輸入（如 18000+45）
   */
  const cleanExpressionInput = (text: string): string => {
    let result = text

    // 移除中文字符
    result = result.replace(/[\u4e00-\u9fa5]/g, '')

    // 轉換全形數字為半形 (０１２３４５６７８９)
    result = result.replace(/[０１２３４５６７８９]/g, char =>
      String.fromCharCode(char.charCodeAt(0) - 0xfee0)
    )

    // 轉換全形符號為半形（直接用字元比對更可靠）
    const fullToHalf: Record<string, string> = {
      '＋': '+',
      '－': '-',
      '＊': '*',
      '×': '*',
      '／': '/',
      '÷': '/',
      '（': '(',
      '）': ')',
      '．': '.',
      '。': '.',
    }
    result = result
      .split('')
      .map(char => fullToHalf[char] || char)
      .join('')

    // 移除所有空白
    result = result.replace(/\s/g, '')

    // 只保留數字、運算符號、小數點、括號
    result = result.replace(/[^0-9+\-*/.()]/g, '')

    return result
  }

  const normalizeNumber = (val: string): string => {
    // 全形轉半形
    val = val.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    val = val.replace(/[．]/g, '.')
    val = val.replace(/[－]/g, '-')
    return val
  }

  // 處理文字欄位變更
  const handleTextChange = useCallback(
    (id: string, field: 'description' | 'notes', e: React.ChangeEvent<HTMLInputElement>) => {
      // 直接更新，不阻擋 IME 輸入
      onUpdateItem(id, field, e.target.value)
    },
    [onUpdateItem]
  )

  // 組合輸入結束時更新
  const handleCompositionEnd = useCallback(
    (id: string, field: 'description' | 'notes', e: React.CompositionEvent<HTMLInputElement>) => {
      isComposingRef.current = false
      onUpdateItem(id, field, e.currentTarget.value)
    },
    [onUpdateItem]
  )

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true
  }, [])

  // 儲存格樣式（簡潔版，參考請款單）
  const cellClass = 'px-2 py-1.5'
  const headerCellClass = 'px-2 py-2 text-left font-medium text-morandi-secondary text-xs'
  const inputClass = 'input-no-focus w-full h-7 px-1 bg-transparent text-sm'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-morandi-primary">
          {QUICK_QUOTE_ITEMS_TABLE_LABELS.LABEL_728}
        </h2>
        {isEditing && (
          <Button onClick={onAddItem} size="sm" variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            {QUICK_QUOTE_ITEMS_TABLE_LABELS.ADD_2089}
          </Button>
        )}
      </div>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-morandi-container/60">
                {isEditing && <th className={`${headerCellClass} w-8`}></th>}
                <th className={headerCellClass}>{QUICK_QUOTE_ITEMS_TABLE_LABELS.LABEL_466}</th>
                <th className={`${headerCellClass} text-center w-20`}>
                  {QUICK_QUOTE_ITEMS_TABLE_LABELS.QUANTITY}
                </th>
                {isEditing && (
                  <th className={`${headerCellClass} text-center w-24`}>
                    {QUICK_QUOTE_ITEMS_TABLE_LABELS.LABEL_7178}
                  </th>
                )}
                <th className={`${headerCellClass} text-center w-28`}>
                  {QUICK_QUOTE_ITEMS_TABLE_LABELS.LABEL_9413}
                </th>
                <th className={`${headerCellClass} text-center w-28`}>
                  {QUICK_QUOTE_ITEMS_TABLE_LABELS.AMOUNT}
                </th>
                {isEditing && (
                  <th className={`${headerCellClass} text-center w-24`}>
                    {QUICK_QUOTE_ITEMS_TABLE_LABELS.LABEL_7705}
                  </th>
                )}
                <th className={`${headerCellClass} w-32`}>
                  {QUICK_QUOTE_ITEMS_TABLE_LABELS.REMARKS}
                </th>
                {isEditing && <th className={`${headerCellClass} text-center w-12`}></th>}
              </tr>
            </thead>
            <tbody>
              <SortableContext
                items={items.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                {items.map(item => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    isEditing={isEditing}
                    cellClass={cellClass}
                    inputClass={inputClass}
                    onUpdateItem={onUpdateItem}
                    onRemoveItem={onRemoveItem}
                    handleTextChange={handleTextChange}
                    handleKeyDown={handleKeyDown}
                    handleCompositionStart={handleCompositionStart}
                    handleCompositionEnd={handleCompositionEnd}
                    normalizeNumber={normalizeNumber}
                    cleanExpressionInput={cleanExpressionInput}
                  />
                ))}
              </SortableContext>
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={isEditing ? 9 : 5}
                    className="px-3 py-8 text-center text-morandi-secondary border border-morandi-gold/20"
                  >
                    {QUICK_QUOTE_ITEMS_TABLE_LABELS.EMPTY_1514}
                    {isEditing && QUICK_QUOTE_ITEMS_TABLE_LABELS.點擊_新增項目_開始}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </DndContext>
      </div>
    </div>
  )
}
