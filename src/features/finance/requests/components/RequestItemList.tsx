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
import { DatePicker } from '@/components/ui/date-picker'
import { Trash2, Plus, Link2, UserCheck, X, BookOpen, ArrowRightLeft } from 'lucide-react'
import { RequestItem, categoryOptions } from '../types'
import {
  useAccountingSubjects,
  getDefaultSubjectByCategory,
} from '../../hooks/useAccountingSubjects'
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
  disabled?: boolean
  paymentMethods?: Array<{ id: string; name: string }>
  onTransfer?: () => void
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
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
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
      disabled={disabled}
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
  disabled,
}: {
  value: number
  onChange: (value: number) => void
  className?: string
  placeholder?: string
  disabled?: boolean
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
      .replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
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
      const result = normalized.split('+').reduce((sum, part) => {
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
      onFocus={() => {
        focusedRef.current = true
      }}
      onBlur={() => {
        focusedRef.current = false
        handleBlur()
      }}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault()
          e.stopPropagation()
          ;(e.target as HTMLInputElement).blur()
        }
      }}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
    />
  )
}

export function EditableRequestItemList({
  items,
  suppliers,
  updateItem,
  removeItem,
  addNewEmptyItem,
  onCreateSupplier,
  tourId,
  disabled = false,
  paymentMethods = [],
  onTransfer,
}: EditableRequestItemListProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkingItemId, setLinkingItemId] = useState<string | null>(null)
  const linkingItem = items.find(i => i.id === linkingItemId)
  const total_amount = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)

  // 會計科目選項
  const { subjects, costOptions } = useAccountingSubjects()

  const supplierOptions = suppliers.map(s => ({
    value: s.id,
    label: s.name || REQUEST_DETAIL_DIALOG_LABELS.未命名,
  }))

  // 無 focus 樣式的 input class（使用 globals.css 的 input-no-focus）
  const inputClass = 'input-no-focus w-full h-10 px-2 bg-transparent text-sm'

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <h3 className="text-sm font-medium text-morandi-primary mb-3">
        {REQUEST_ITEM_LIST_LABELS.LABEL_475}
      </h3>

      {/* 外框 */}
      <div className="border border-border/50 rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
        {/* 表頭 */}
        <div className="bg-morandi-gold-header border-b border-border">
          <div className="grid grid-cols-[110px_100px_80px_1fr_1fr_96px_64px_112px_40px_48px] px-3 py-2.5">
            <span className="text-sm font-semibold text-morandi-primary">日期</span>
            <span className="text-sm font-semibold text-morandi-primary">付款方式</span>
            <span className="text-sm font-semibold text-morandi-primary">
              {REQUEST_ITEM_LIST_LABELS.LABEL_2946}
            </span>
            <span className="text-sm font-semibold text-morandi-primary">
              {REQUEST_ITEM_LIST_LABELS.LABEL_561}
            </span>
            <span className="text-sm font-semibold text-morandi-primary">
              {REQUEST_ITEM_LIST_LABELS.LABEL_6008}
            </span>
            <span className="text-sm font-semibold text-morandi-primary text-right">
              {REQUEST_ITEM_LIST_LABELS.LABEL_9413}
            </span>
            <span className="text-sm font-semibold text-morandi-primary text-center">
              {REQUEST_ITEM_LIST_LABELS.QUANTITY}
            </span>
            <span className="text-sm font-semibold text-morandi-primary text-right">
              {REQUEST_ITEM_LIST_LABELS.LABEL_832}
            </span>
            <span className="text-sm font-semibold text-morandi-primary text-center">
              <Link2 size={14} className="inline" />
            </span>
            <span></span>
          </div>
        </div>

        {/* 項目區域 - 自動填滿可用空間，超出可滾動 */}
        <div className="flex-1 overflow-y-auto">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="grid grid-cols-[110px_100px_80px_1fr_1fr_96px_64px_112px_40px_48px] px-3 py-2 border-b border-border/50 items-center"
            >
              {/* Date */}
              <div>
                <DatePicker
                  value={item.request_date || ''}
                  onChange={date => updateItem(item.id, { request_date: date })}
                  placeholder="選擇日期"
                  disabled={disabled}
                  hideYear
                  buttonClassName="h-10 p-0 px-2 border-0 shadow-none bg-transparent text-sm"
                />
              </div>

              {/* Payment Method */}
              <div>
                <Select
                  value={item.payment_method_id || ''}
                  onValueChange={value =>
                    updateItem(item.id, { payment_method_id: value || undefined })
                  }
                  disabled={disabled}
                >
                  <SelectTrigger className="input-no-focus h-10 border-0 shadow-none bg-transparent text-sm px-2">
                    <SelectValue placeholder="付款方式" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category - 選擇時自動帶入會計科目 */}
              <div>
                <Select
                  value={item.category}
                  onValueChange={value => {
                    // 自動帶入對應的會計科目
                    const defaultSubject = getDefaultSubjectByCategory(value, subjects)
                    updateItem(item.id, {
                      category: value as RequestItem['category'],
                      accounting_subject_id: defaultSubject?.id || null,
                      accounting_subject_name: defaultSubject
                        ? `${defaultSubject.code} ${defaultSubject.name}`
                        : null,
                    })
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger className="input-no-focus h-10 border-0 shadow-none bg-transparent text-sm px-2">
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
                  disabled={disabled}
                />
              </div>

              {/* Description */}
              <div className="flex items-center gap-1">
                <DeferredInput
                  value={item.description}
                  onChange={val => updateItem(item.id, { description: val })}
                  className={`${inputClass} flex-1 disabled:cursor-default disabled:text-morandi-primary`}
                  disabled={disabled}
                />
                {!item.advanced_by ? (
                  <button
                    type="button"
                    onClick={() => updateItem(item.id, { advanced_by: '_pending' })}
                    disabled={disabled}
                    className="shrink-0 p-1 rounded hover:bg-morandi-container/20 text-morandi-muted hover:text-morandi-primary transition-colors disabled:cursor-default disabled:text-morandi-primary"
                    title={disabled ? '此請款單已加入出納單，無法修改' : '員工代墊'}
                  >
                    <UserCheck size={14} />
                  </button>
                ) : (
                  <div className="shrink-0 flex items-center gap-1">
                    <Combobox
                      options={suppliers
                        .filter(s => s.type === 'employee')
                        .map(s => ({ value: s.id, label: s.name || '未命名' }))}
                      value={item.advanced_by === '_pending' ? '' : item.advanced_by}
                      onChange={value => {
                        const emp = suppliers.find(s => s.id === value)
                        updateItem(item.id, {
                          advanced_by: value,
                          advanced_by_name: emp?.name || '',
                        })
                      }}
                      placeholder="代墊人"
                      className="[&_input]:h-7 [&_input]:text-xs [&_input]:px-1 [&_input]:bg-morandi-gold/10 w-[120px]"
                      showSearchIcon={false}
                      disabled={disabled}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateItem(item.id, { advanced_by: undefined, advanced_by_name: undefined })
                      }
                      disabled={disabled}
                      className="shrink-0 p-0.5 rounded hover:bg-morandi-red/10 text-morandi-muted hover:text-morandi-red disabled:cursor-default disabled:text-morandi-primary"
                      title={disabled ? '此請款單已加入出納單，無法修改' : '取消代墊'}
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
                  disabled={disabled}
                />
              </div>

              {/* Quantity */}
              <div>
                <CalcInput
                  value={item.quantity}
                  onChange={val => updateItem(item.id, { quantity: val || 1 })}
                  placeholder="1"
                  className={`${inputClass} text-center placeholder:text-morandi-muted`}
                  disabled={disabled}
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
                    disabled={disabled}
                    className={`h-7 w-7 ${item.confirmation_item_id ? 'text-morandi-green' : 'text-morandi-muted hover:text-morandi-secondary'} disabled:cursor-default disabled:text-morandi-primary`}
                    title={
                      disabled
                        ? '此請款單已加入出納單，無法連結確認單'
                        : item.confirmation_item_id
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
                  disabled && onTransfer ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Transfer"
                      onClick={onTransfer}
                      className="h-8 w-8 text-morandi-secondary hover:text-morandi-gold hover:bg-morandi-gold/10"
                      title="成本轉移"
                    >
                      <ArrowRightLeft size={16} />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Button"
                      onClick={addNewEmptyItem}
                      disabled={disabled}
                      className="h-8 w-8 text-morandi-gold hover:bg-morandi-gold/10 disabled:cursor-default disabled:text-morandi-primary"
                      title={REQUEST_ITEM_LIST_LABELS.新增項目}
                    >
                      <Plus size={16} />
                    </Button>
                  )
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete"
                    onClick={() => removeItem(item.id)}
                    disabled={disabled}
                    className="h-8 w-8 text-morandi-secondary hover:text-morandi-red hover:bg-morandi-red/10 disabled:cursor-default disabled:text-morandi-primary"
                    title={
                      disabled
                        ? '此請款單已加入出納單，無法刪除項目'
                        : REQUEST_DETAIL_DIALOG_LABELS.刪除項目
                    }
                  >
                    <Trash2 size={16} />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {/* 空白佔位列，確保始終顯示 4 列高度 */}
        </div>
      </div>
      {/* 外框結束 */}

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
