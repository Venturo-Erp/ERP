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
import { UserCheck, X, ArrowRightLeft } from 'lucide-react'
import { RequestItem, categoryOptions } from '../types'
import { EXPENSE_TYPE_CONFIG } from '@/stores/types/finance.types'
import {
  useAccountingSubjects,
  getDefaultSubjectByCategory,
} from '../../hooks/useAccountingSubjects'
import { CurrencyCell } from '@/components/table-cells'
import { REQUEST_DETAIL_DIALOG_LABELS, REQUEST_ITEM_LIST_LABELS } from '../../constants/labels'
import { InlineEditTable, type InlineEditColumn } from '@/components/ui/inline-edit-table'

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
  /** 隱藏 item 級日期欄（編輯模式用、SSOT：只有 header.request_date 才是真相）*/
  hideDateColumn?: boolean
  /** 公司請款模式：「類別」col 顯示費用類型選項（差旅 / 辦公 / 雜支等）取代供應商品項類別 */
  expenseTypeMode?: boolean
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
  hideDateColumn = false,
  expenseTypeMode = false,
}: EditableRequestItemListProps) {
  // 公司請款模式：類別 col 用費用類型選項
  const categoryColumnOptions = expenseTypeMode
    ? Object.entries(EXPENSE_TYPE_CONFIG).map(([code, config]) => ({
        value: code,
        label: config.name,
      }))
    : categoryOptions
  const total_amount = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)

  // 會計科目選項
  const { subjects, costOptions } = useAccountingSubjects()

  // 供應商下拉只要供應商、員工走獨立的「代墊人」欄位（line 344）
  const supplierOptions = suppliers
    .filter(s => s.type === 'supplier')
    .map(s => ({
      value: s.id,
      label: s.name || REQUEST_DETAIL_DIALOG_LABELS.未命名,
    }))

  // 無 focus 樣式的 input class（使用 globals.css 的 input-no-focus）
  const inputClass = 'input-no-focus w-full h-10 px-2 bg-transparent text-sm'

  const columns: InlineEditColumn<RequestItem>[] = [
    {
      key: 'date',
      label: '日期',
      width: '220px',
      render: ({ row, onUpdate }) => (
        <DatePicker
          value={row.custom_request_date || ''}
          onChange={date => onUpdate({ custom_request_date: date })}
          placeholder="選擇日期"
          disabled={disabled}
          hideYear
          buttonClassName="h-10 p-0 px-2 border-0 shadow-none bg-transparent text-sm"
        />
      ),
    },
    {
      key: 'payment_method',
      label: '付款方式',
      width: '140px',
      render: ({ row, onUpdate }) => (
        <Select
          value={row.payment_method_id || ''}
          onValueChange={value => onUpdate({ payment_method_id: value || undefined })}
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
      ),
    },
    {
      key: 'category',
      label: REQUEST_ITEM_LIST_LABELS.LABEL_2946,
      width: '104px',
      render: ({ row, onUpdate }) => (
        <Select
          value={row.category}
          onValueChange={value => {
            const defaultSubject = getDefaultSubjectByCategory(value, subjects)
            onUpdate({
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
            {categoryColumnOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'supplier',
      label: REQUEST_ITEM_LIST_LABELS.LABEL_561,
      render: ({ row, onUpdate }) => (
        <Combobox
          options={supplierOptions}
          value={row.selected_id || row.supplier_id}
          onChange={value => {
            const supplier = suppliers.find(s => s.id === value)
            const isEmployee = supplier?.type === 'employee'
            onUpdate({
              supplier_id: isEmployee ? '' : value,
              supplierName: supplier?.name || '',
              is_employee: isEmployee,
              selected_id: value,
            })
          }}
          placeholder={REQUEST_ITEM_LIST_LABELS.選擇供應商}
          className="input-no-focus [&_input]:h-9 [&_input]:px-1 [&_input]:bg-transparent"
          onCreate={onCreateSupplier}
          showSearchIcon={false}
          disabled={disabled}
        />
      ),
    },
    {
      key: 'description',
      label: REQUEST_ITEM_LIST_LABELS.LABEL_6008,
      render: ({ row, onUpdate }) => (
        <div className="flex items-center gap-1">
          <DeferredInput
            value={row.description}
            onChange={val => onUpdate({ description: val })}
            className={`${inputClass} flex-1 disabled:cursor-default disabled:text-morandi-primary`}
            disabled={disabled}
          />
          {!row.advanced_by ? (
            <button
              type="button"
              onClick={() => onUpdate({ advanced_by: '_pending' })}
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
                value={row.advanced_by === '_pending' ? '' : row.advanced_by}
                onChange={value => {
                  const emp = suppliers.find(s => s.id === value)
                  onUpdate({
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
                onClick={() => onUpdate({ advanced_by: undefined, advanced_by_name: undefined })}
                disabled={disabled}
                className="shrink-0 p-0.5 rounded hover:bg-morandi-red/10 text-morandi-muted hover:text-morandi-red disabled:cursor-default disabled:text-morandi-primary"
                title={disabled ? '此請款單已加入出納單，無法修改' : '取消代墊'}
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'unit_price',
      label: REQUEST_ITEM_LIST_LABELS.LABEL_9413,
      width: '96px',
      align: 'right',
      render: ({ row, onUpdate }) => (
        <CalcInput
          value={row.unit_price}
          onChange={val => onUpdate({ unit_price: val })}
          placeholder="0"
          className={`${inputClass} text-right placeholder:text-morandi-muted`}
          disabled={disabled}
        />
      ),
    },
    {
      key: 'quantity',
      label: REQUEST_ITEM_LIST_LABELS.QUANTITY,
      width: '64px',
      align: 'center',
      render: ({ row, onUpdate }) => (
        <CalcInput
          value={row.quantity}
          onChange={val => onUpdate({ quantity: val || 1 })}
          placeholder="1"
          className={`${inputClass} text-center placeholder:text-morandi-muted`}
          disabled={disabled}
        />
      ),
    },
    {
      key: 'subtotal',
      label: REQUEST_ITEM_LIST_LABELS.LABEL_832,
      width: '112px',
      align: 'right',
      render: ({ row }) => (
        <CurrencyCell amount={row.unit_price * row.quantity} className="text-morandi-gold" />
      ),
    },
  ]

  // SSOT：編輯模式下隱藏 item 級日期欄、header.request_date 才是唯一真相
  const visibleColumns = hideDateColumn ? columns.filter(c => c.key !== 'date') : columns

  return (
    <InlineEditTable<RequestItem>
      title={REQUEST_ITEM_LIST_LABELS.LABEL_475}
      rows={items}
      columns={visibleColumns}
      onUpdate={(index, patch) => updateItem(items[index].id, patch)}
      onAdd={disabled ? undefined : addNewEmptyItem}
      onRemove={disabled ? undefined : index => removeItem(items[index].id)}
      canRemove={() => items.length > 1}
      readonly={disabled}
      addLabel={REQUEST_ITEM_LIST_LABELS.新增項目}
      headerExtra={
        disabled && onTransfer ? (
          <Button
            size="sm"
            variant="soft-gold"
            onClick={onTransfer}
            className="text-morandi-secondary hover:text-morandi-gold hover:bg-morandi-gold/10"
          >
            <ArrowRightLeft size={14} className="mr-1" />
            成本轉移
          </Button>
        ) : undefined
      }
      className="flex-1"
    />
  )
}
