/**
 * Payment Item Row (Table-based Input)
 * 收款項目行（表格式輸入）
 */

import { formatMoney } from '@/lib/utils/format-currency'
import { useState, useEffect } from 'react'
import { usePaymentMethodsCached } from '@/data/hooks'
import { Trash2 } from 'lucide-react'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { PaymentItem, ReceiptType } from '../types'
import { codeToReceiptType } from '@/types/receipt.types'
import {
  ADD_RECEIPT_DIALOG_LABELS,
  PAYMENT_ITEM_ROW_LABELS,
} from '../../constants/labels'

interface PaymentItemRowProps {
  item: PaymentItem
  index: number
  onUpdate: (id: string, updates: Partial<PaymentItem>) => void
  onRemove: (id: string) => void
  canRemove: boolean
  isNewRow?: boolean
  /** 訂單資訊，用於 LinkPay 預設值 */
  orderInfo?: {
    order_number?: string
    tour_name?: string
    contact_person?: string
    contact_email?: string
  }
  /** 收款模式：tour = 團體收款，company = 公司收款 */
  mode?: 'tour' | 'company'
  /** 唯讀模式（已確認的收款單） */
  readonly?: boolean
  /** 收款方式列表（從父組件傳入，避免重複載入） */
  paymentMethods?: Array<{
    id: string
    code: string
    name: string
    description?: string | null
    placeholder?: string | null
  }>
  /** 是否有核帳權限（可填寫實收金額） */
  canConfirmReceipt?: boolean
}

export function PaymentItemRow({
  item,
  index,
  onUpdate,
  onRemove,
  canRemove,
  isNewRow = false,
  orderInfo,
  mode = 'tour',
  readonly = false,
  paymentMethods: propPaymentMethods,
  canConfirmReceipt = false,
}: PaymentItemRowProps) {
  // 讀取收入類會計科目（僅公司收款需要）
  const [incomeSubjects, setIncomeSubjects] = useState<
    Array<{ id: string; code: string; name: string }>
  >([])

  // 從 SWR 快取讀取收款方式（fallback，如果父組件沒有傳入）
  const { methods: cachedMethods } = usePaymentMethodsCached('receipt')
  const paymentMethods =
    propPaymentMethods && propPaymentMethods.length > 0 ? propPaymentMethods : cachedMethods

  useEffect(() => {
    if (mode === 'company') {
      // 讀取收入類科目（帶 workspace_id 過濾）
      const loadSubjects = async () => {
        const { supabase } = await import('@/lib/supabase/client')
        const { useAuthStore } = await import('@/stores')
        const wsId = useAuthStore.getState().user?.workspace_id
        let query = supabase
          .from('chart_of_accounts')
          .select('id, code, name')
          .eq('account_type', 'revenue')
          .eq('is_active', true)
          .order('code')
        if (wsId) query = query.eq('workspace_id', wsId)
        const { data } = await query
        setIncomeSubjects(data || [])
      }
      loadSubjects()
    }
  }, [mode])

  // 收款方式選項：使用 DB 的資料（必須等載入完成）
  const isLoading = paymentMethods.length === 0

  const receiptTypeOptions = paymentMethods.map(m => ({ value: m.name, label: m.name }))

  // 計算 Select value：
  // 1. 如果還在載入，保留原值（顯示 placeholder「載入中...」但不清空）
  // 2. 如果已載入，檢查值是否在選項中
  const rawValue = (item.receipt_type as unknown as string) ?? ''
  const isValidValue = receiptTypeOptions.some(opt => opt.value === rawValue)
  // 載入中時保留原值（避免清空編輯中的資料），載入完成後才驗證
  const selectValue = rawValue && (isLoading || isValidValue) ? rawValue : ''

  // 根據 receipt_type（DB name）找到對應的 code
  const currentMethod = paymentMethods.find(m => m.name === String(item.receipt_type))
  const currentCode = item.payment_method_code || currentMethod?.code || ''

  // 當收款方式變更時（method 為 SSOT、receipt_type 從 method.code 反推給 trigger 兼容）
  const handleReceiptTypeChange = (value: string) => {
    const method = paymentMethods.find(m => m.name === value)
    const code = method?.code || ''
    const updates: Partial<PaymentItem> = {
      // SSOT：method.id + method.code
      payment_method_id: method?.id,
      payment_method_code: code,
      // receipt_type 數字（DB auto_posting trigger 還在吃）— 從 code 反推大類
      receipt_type: codeToReceiptType(code) as unknown as ReceiptType,
    }
    onUpdate(item.id, updates)
  }

  return (
    <>
      {/* 主要資料行 */}
      <tr className={cn(index > 0 && 'border-t border-border/50')}>
        {/* 收款方式 */}
        <td className="py-2 px-3 border-b border-border/50">
          <Select
            value={selectValue}
            onValueChange={handleReceiptTypeChange}
            disabled={readonly || isLoading}
          >
            <SelectTrigger className="h-8 text-sm w-full border-0 shadow-none bg-transparent px-0">
              <SelectValue placeholder={isLoading ? '載入中...' : '請選擇'} />
            </SelectTrigger>
            <SelectContent align="start" className="min-w-0 w-[var(--radix-select-trigger-width)]">
              {receiptTypeOptions.map(option => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>

        {/* 交易日期 */}
        <td className="py-2 px-3 border-b border-border/50">
          <DatePicker
            value={item.transaction_date}
            onChange={date => onUpdate(item.id, { transaction_date: date })}
            placeholder={PAYMENT_ITEM_ROW_LABELS.選擇日期}
            buttonClassName="h-auto p-0 border-0 shadow-none bg-transparent"
          />
        </td>

        {/* 收款項目（公司收款 = 會計科目下拉，團體收款 = 手打） */}
        <td className="py-2 px-3 border-b border-border/50">
          {mode === 'company' ? (
            <Select
              value={item.accounting_subject_id || ''}
              onValueChange={value => onUpdate(item.id, { accounting_subject_id: value })}
              disabled={readonly}
            >
              <SelectTrigger className="h-8 text-sm w-full border-0 shadow-none bg-transparent px-0">
                <SelectValue placeholder="選擇收入科目" />
              </SelectTrigger>
              <SelectContent align="start">
                {incomeSubjects.map(subject => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.code} {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <input
              type="text"
              value={item.receipt_account || ''}
              onChange={e => {
                onUpdate(item.id, { receipt_account: e.target.value })
              }}
              placeholder="付款資訊"
              disabled={readonly}
              className="input-no-focus w-full bg-transparent text-sm"
            />
          )}
        </td>

        {/* 備註 */}
        <td className="py-2 px-3 border-b border-border/50">
          <input
            type="text"
            value={item.notes || ''}
            onChange={e => onUpdate(item.id, { notes: e.target.value })}
            placeholder={PAYMENT_ITEM_ROW_LABELS.備註_選填}
            className="input-no-focus w-full bg-transparent text-sm"
          />
        </td>

        {/* 收款金額 */}
        <td className="py-2 px-3 border-b border-border/50 text-right">
          <input
            type="text"
            inputMode="numeric"
            value={item.amount ? formatMoney(item.amount) : ''}
            onChange={e => {
              const raw = e.target.value.replace(/,/g, '')
              const num = parseInt(raw, 10)
              onUpdate(item.id, { amount: isNaN(num) ? 0 : num })
            }}
            placeholder="0"
            disabled={readonly}
            className="input-no-focus w-full bg-transparent text-sm text-right"
          />
        </td>

        {/* 實收金額 + 刪除 */}
        <td className="py-2 px-3 border-b border-border/50 text-right">
          <div className="flex items-center justify-end gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={item.actual_amount ? formatMoney(item.actual_amount) : ''}
              onChange={e => {
                const raw = e.target.value.replace(/,/g, '')
                const num = parseInt(raw, 10)
                onUpdate(item.id, { actual_amount: isNaN(num) ? 0 : num })
              }}
              placeholder="0"
              disabled={!canConfirmReceipt}
              className="input-no-focus w-full bg-transparent text-sm text-right"
            />
            {canRemove && (
              <button
                onClick={() => onRemove(item.id)}
                className="text-morandi-secondary/50 hover:text-morandi-red transition-colors p-1 rounded hover:bg-morandi-red/10"
                title={ADD_RECEIPT_DIALOG_LABELS.刪除}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </td>
      </tr>

    </>
  )
}
