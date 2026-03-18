'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { Trash2, Plus, Link2, UserCheck, X } from 'lucide-react'
import { RequestItem, categoryOptions } from '../types'
import { CurrencyCell } from '@/components/table-cells'
import {
  REQUEST_DETAIL_DIALOG_LABELS,
  REQUEST_ITEM_LIST_LABELS,
  LINK_CONFIRMATION_LABELS,
} from '../../constants/labels'
import { LinkConfirmationDialog } from './LinkConfirmationDialog'

interface SupplierOption {
  id: string
  name: string | null
  type: 'supplier' | 'employee'
  group: string
}

interface EditableRequestItemListProps {
  items: RequestItem[]
  suppliers: SupplierOption[]
  updateItem: (itemId: string, updatedFields: Partial<RequestItem>) => void
  removeItem: (itemId: string) => void
  addNewEmptyItem: () => void
  onCreateSupplier?: (name: string) => Promise<string | null>
  tourId?: string | null
}

/**
 * IME 友善的文字輸入元件
 * 使用 local state 避免注音輸入時因 parent re-render 導致的延遲
 * 僅在 blur 或 IME composition 結束時同步回 parent
 */
function DeferredInput({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  const [localValue, setLocalValue] = useState(value)
  const composingRef = useRef(false)

  // 當外部 value 改變時同步（例如重設表單）
  useEffect(() => {
    if (!composingRef.current) {
      setLocalValue(value)
    }
  }, [value])

  return (
    <input
      type="text"
      value={localValue}
      onChange={e => {
        setLocalValue(e.target.value)
        // 非 IME 組字中，即時同步
        if (!composingRef.current) {
          onChange(e.target.value)
        }
      }}
      onCompositionStart={() => {
        composingRef.current = true
      }}
      onCompositionEnd={e => {
        composingRef.current = false
        onChange((e.target as HTMLInputElement).value)
      }}
      onBlur={() => {
        if (localValue !== value) {
          onChange(localValue)
        }
      }}
      className={className}
    />
  )
}

/**
 * 支援算式的數字輸入元件
 * 可輸入 "1000+2000+3000"，blur 時自動計算為 6000
 * 全形符號（＋－＊／）自動轉半形
 */
function CalcInput({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: number
  onChange: (value: number) => void
  className?: string
  placeholder?: string
}) {
  const [displayValue, setDisplayValue] = useState(value ? String(value) : '')
  const focusedRef = useRef(false)

  // 只在非聚焦時同步外部值（避免打字中被蓋掉）
  useEffect(() => {
    if (!focusedRef.current) {
      setDisplayValue(value ? String(value) : '')
    }
  }, [value])

  // 全形轉半形（數字 + 運算符號）
  const normalize = (str: string) =>
    str
      // 全形數字 → 半形
      .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
      // 全形運算符 → 半形
      .replace(/＋/g, '+')
      .replace(/－/g, '-')
      .replace(/＊/g, '*')
      .replace(/×/g, '*')
      .replace(/／/g, '/')
      .replace(/÷/g, '/')
      // 全形小數點
      .replace(/．/g, '.')
      // 移除逗號（千分位）
      .replace(/，/g, '')
      .replace(/,/g, '')
      // 只保留數字和運算符
      .replace(/[^\d+\-*/.]/g, '')

  // 安全計算算式（只允許數字和 +-*/）
  const evaluate = (expr: string): number => {
    const normalized = normalize(expr)
    if (!normalized) return 0
    try {
      // 拆成加減項計算，避免 eval
      const result = normalized
        .split('+')
        .reduce((sum, part) => {
          if (part.includes('-')) {
            const [first, ...rest] = part.split('-')
            return sum + (parseFloat(first) || 0) - rest.reduce((s, v) => s + (parseFloat(v) || 0), 0)
          }
          return sum + (parseFloat(part) || 0)
        }, 0)
      return Math.round(result * 100) / 100
    } catch {
      return parseFloat(normalized) || 0
    }
  }

  const handleBlur = () => {
    const result = evaluate(displayValue)
    setDisplayValue(result ? String(result) : '')
    onChange(result)
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={e => setDisplayValue(e.target.value)}
      onFocus={() => { focusedRef.current = true }}
      onBlur={() => { focusedRef.current = false; handleBlur() }}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.currentTarget.blur()
        }
      }}
      placeholder={placeholder}
      className={className}
    />
  )
}

// 每列高度約 48px，固定顯示 4 列
const ROW_HEIGHT = 48
const VISIBLE_ROWS = 4
const TABLE_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS

export function EditableRequestItemList({
  items,
  suppliers,
  updateItem,
  removeItem,
  addNewEmptyItem,
  onCreateSupplier,
  tourId,
}: EditableRequestItemListProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkingItemId, setLinkingItemId] = useState<string | null>(null)
  const linkingItem = items.find(i => i.id === linkingItemId)
  const total_amount = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)

  const supplierOptions = suppliers.map(s => ({
    value: s.id,
    label: s.name || REQUEST_DETAIL_DIALOG_LABELS.未命名,
  }))

  // 無 focus 樣式的 input class（使用 globals.css 的 input-no-focus）
  const inputClass = 'input-no-focus w-full h-9 px-1 bg-transparent text-sm'

  return (
    <div>
      <h3 className="text-sm font-medium text-morandi-primary mb-3">
        {REQUEST_ITEM_LIST_LABELS.LABEL_475}
      </h3>

      {/* 表頭 */}
      <div className="border-b border-morandi-container/60">
        <div className="grid grid-cols-[80px_1fr_1fr_96px_64px_112px_40px_48px] px-2 py-2.5">
          <span className="text-xs font-medium text-morandi-secondary">
            {REQUEST_ITEM_LIST_LABELS.LABEL_2946}
          </span>
          <span className="text-xs font-medium text-morandi-secondary">
            {REQUEST_ITEM_LIST_LABELS.LABEL_561}
          </span>
          <span className="text-xs font-medium text-morandi-secondary">
            {REQUEST_ITEM_LIST_LABELS.LABEL_6008}
          </span>
          <span className="text-xs font-medium text-morandi-secondary text-right">
            {REQUEST_ITEM_LIST_LABELS.LABEL_9413}
          </span>
          <span className="text-xs font-medium text-morandi-secondary text-center">
            {REQUEST_ITEM_LIST_LABELS.QUANTITY}
          </span>
          <span className="text-xs font-medium text-morandi-secondary text-right">
            {REQUEST_ITEM_LIST_LABELS.LABEL_832}
          </span>
          <span className="text-xs font-medium text-morandi-secondary text-center">
            <Link2 size={12} className="inline" />
          </span>
          <span></span>
        </div>
      </div>

      {/* 項目區域 - 最小 4 列高度，超過則可滾動 */}
      <div
        className="overflow-visible"
        style={{
          minHeight: `${TABLE_HEIGHT}px`,
          maxHeight: `${TABLE_HEIGHT * 1.5}px`,
          overflowY: items.length > VISIBLE_ROWS ? 'auto' : 'visible',
        }}
      >
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`grid grid-cols-[80px_1fr_1fr_96px_64px_112px_40px_48px] px-2 py-1.5 border-b border-morandi-container/30 items-center ${index === 0 ? 'bg-card' : 'hover:bg-morandi-container/5'}`}
          >
            {/* Category */}
            <div>
              <Select
                value={item.category}
                onValueChange={value =>
                  updateItem(item.id, { category: value as RequestItem['category'] })
                }
              >
                <SelectTrigger className="input-no-focus h-9 border-0 shadow-none bg-transparent text-sm px-1">
                  <SelectValue placeholder="類別" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Supplier */}
            <div>
              <Combobox
                options={supplierOptions}
                value={item.selected_id || item.supplier_id}
                onChange={value => {
                  const supplier = suppliers.find(s => s.id === value)
                  const isEmployee = supplier?.type === 'employee'
                  updateItem(item.id, {
                    // 員工不在 suppliers 表，supplier_id 設空避免 FK 衝突
                    supplier_id: isEmployee ? '' : value,
                    supplierName: supplier?.name || '',
                    is_employee: isEmployee,
                    selected_id: value, // 保留選中 ID 供 Combobox 顯示
                  })
                }}
                placeholder={REQUEST_ITEM_LIST_LABELS.選擇供應商}
                className="input-no-focus [&_input]:h-9 [&_input]:px-1 [&_input]:bg-transparent"
                onCreate={onCreateSupplier}
                showSearchIcon={false}
              />
            </div>

            {/* Description */}
            <div className="flex items-center gap-1">
              <DeferredInput
                value={item.description}
                onChange={val => updateItem(item.id, { description: val })}
                className={`${inputClass} flex-1`}
              />
              {!item.advanced_by ? (
                <button
                  type="button"
                  onClick={() => updateItem(item.id, { advanced_by: '_pending' })}
                  className="shrink-0 p-1 rounded hover:bg-morandi-container/20 text-morandi-muted hover:text-morandi-primary transition-colors"
                  title="員工代墊"
                >
                  <UserCheck size={14} />
                </button>
              ) : (
                <div className="shrink-0 flex items-center gap-1">
                  <Combobox
                    options={suppliers.filter(s => s.type === 'employee').map(s => ({ value: s.id, label: s.name || '未命名' }))}
                    value={item.advanced_by === '_pending' ? '' : item.advanced_by}
                    onChange={value => {
                      const emp = suppliers.find(s => s.id === value)
                      updateItem(item.id, { advanced_by: value, advanced_by_name: emp?.name || '' })
                    }}
                    placeholder="代墊人"
                    className="[&_input]:h-7 [&_input]:text-xs [&_input]:px-1 [&_input]:bg-morandi-gold/10 w-[120px]"
                    showSearchIcon={false}
                  />
                  <button
                    type="button"
                    onClick={() => updateItem(item.id, { advanced_by: undefined, advanced_by_name: undefined })}
                    className="shrink-0 p-0.5 rounded hover:bg-morandi-red/10 text-morandi-muted hover:text-morandi-red"
                    title="取消代墊"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Unit Price */}
            <div>
              <CalcInput
                value={item.unit_price}
                onChange={val => updateItem(item.id, { unit_price: val })}
                placeholder="0"
                className={`${inputClass} text-right placeholder:text-morandi-muted`}
              />
            </div>

            {/* Quantity */}
            <div>
              <CalcInput
                value={item.quantity}
                onChange={val => updateItem(item.id, { quantity: val || 1 })}
                placeholder="1"
                className={`${inputClass} text-center placeholder:text-morandi-muted`}
              />
            </div>

            {/* Subtotal */}
            <div className="text-right pr-2">
              <CurrencyCell
                amount={item.unit_price * item.quantity}
                className="text-morandi-gold"
              />
            </div>

            {/* Link to confirmation */}
            <div className="text-center">
              {tourId ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={LINK_CONFIRMATION_LABELS.LINK_BUTTON}
                  onClick={() => {
                    setLinkingItemId(item.id)
                    setLinkDialogOpen(true)
                  }}
                  className={`h-7 w-7 ${item.confirmation_item_id ? 'text-morandi-green' : 'text-morandi-muted hover:text-morandi-secondary'}`}
                  title={
                    item.confirmation_item_id
                      ? LINK_CONFIRMATION_LABELS.LINKED
                      : LINK_CONFIRMATION_LABELS.LINK_BUTTON
                  }
                >
                  <Link2 size={14} />
                </Button>
              ) : (
                <span />
              )}
            </div>

            {/* Actions */}
            <div className="text-center">
              {index === 0 ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Button"
                  onClick={addNewEmptyItem}
                  className="h-8 w-8 text-morandi-gold hover:bg-morandi-gold/10"
                  title={REQUEST_ITEM_LIST_LABELS.新增項目}
                >
                  <Plus size={16} />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete"
                  onClick={() => removeItem(item.id)}
                  className="h-8 w-8 text-morandi-secondary hover:text-morandi-red hover:bg-morandi-red/10"
                  title={REQUEST_DETAIL_DIALOG_LABELS.刪除項目}
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          </div>
        ))}

        {/* 空白佔位列，確保始終顯示 4 列高度 */}
        {items.length < VISIBLE_ROWS &&
          Array.from({ length: VISIBLE_ROWS - items.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="grid grid-cols-[80px_1fr_1fr_96px_64px_112px_40px_48px] px-2 py-1.5 border-b border-morandi-container/30 items-center"
              style={{ height: `${ROW_HEIGHT}px` }}
            >
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
              <div></div>
            </div>
          ))}
      </div>

      {/* Total */}
      <div className="flex justify-end items-center gap-6 pt-4 mt-2">
        <span className="text-sm text-morandi-secondary">
          {REQUEST_ITEM_LIST_LABELS.TOTAL_6550}
        </span>
        <CurrencyCell amount={total_amount} className="text-lg font-semibold text-morandi-gold" />
      </div>

      {/* Link Confirmation Dialog */}
      {tourId && (
        <LinkConfirmationDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          tourId={tourId}
          category={linkingItem?.category}
          currentItemId={linkingItem?.confirmation_item_id ?? null}
          onSelect={confirmationItemId => {
            if (linkingItemId) {
              updateItem(linkingItemId, { confirmation_item_id: confirmationItemId })
            }
          }}
        />
      )}
    </div>
  )
}
