/**
 * Payment Item Row (Table-based Input)
 * 收款項目行（表格式輸入）
 */

import { formatDate } from '@/lib/utils/format-date'
import { useState, useEffect } from 'react'
import { Link2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { useToast } from '@/components/ui/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { PaymentItem, ReceiptType } from '../types'
import { RECEIPT_TYPES, RECEIPT_TYPE_OPTIONS, BANK_ACCOUNTS } from '../types'
import {
  ADD_RECEIPT_DIALOG_LABELS,
  BATCH_RECEIPT_DIALOG_LABELS,
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
}: PaymentItemRowProps) {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // 讀取收入類會計科目（僅公司收款需要）
  const [incomeSubjects, setIncomeSubjects] = useState<Array<{ id: string; code: string; name: string }>>([])
  
  // 從 DB 讀取收款方式
  const [paymentMethods, setPaymentMethods] = useState<Array<{ id: string; name: string }>>([])
  
  useEffect(() => {
    // 讀取收款方式（從 payment_methods 表）
    const loadPaymentMethods = async () => {
      const { useAuthStore } = await import('@/stores')
      const workspaceId = useAuthStore.getState().user?.workspace_id
      if (!workspaceId) return
      
      const response = await fetch(`/api/finance/payment-methods?workspace_id=${workspaceId}&type=receipt`)
      if (response.ok) {
        const data = await response.json()
        setPaymentMethods(data || [])
      }
    }
    loadPaymentMethods()
    
    if (mode === 'company') {
      // 讀取收入類科目
      const loadSubjects = async () => {
        const { supabase } = await import('@/lib/supabase/client')
        const { data } = await supabase
          .from('accounting_subjects')
          .select('id, code, name')
          .eq('type', 'revenue')
          .order('code')
        setIncomeSubjects(data || [])
      }
      loadSubjects()
    }
  }, [mode])

  // 收款方式選項：優先使用 DB 的資料，fallback 到 hardcoded
  const useDbMethods = paymentMethods.length > 0
  
  // receipt_type (數字) → payment method name 映射
  const receiptTypeToName: Record<number, string> = {
    0: '匯款',
    1: '現金',
    2: '信用卡',
    3: '支票',
    4: 'LINE Pay',
  }
  
  const receiptTypeOptions = useDbMethods
    ? paymentMethods.map(m => ({ value: m.name, label: m.name }))
    : (mode === 'company'
        ? RECEIPT_TYPE_OPTIONS.filter(opt => opt.value !== RECEIPT_TYPES.LINK_PAY)
        : RECEIPT_TYPE_OPTIONS)

  // 計算 Select value：如果是 DB 模式，從數字映射到名稱
  const selectValue = useDbMethods
    ? (typeof item.receipt_type === 'number' 
        ? receiptTypeToName[item.receipt_type] || String(item.receipt_type)
        : String(item.receipt_type))
    : item.receipt_type.toString()

  const receiptTypeLabel =
    receiptTypeOptions.find(opt => String(opt.value) === selectValue)?.label ||
    item.receipt_type ||
    BATCH_RECEIPT_DIALOG_LABELS.現金

  // 產生 LinkPay 連結
  const handleGenerateLink = async () => {
    if (!item.email || !item.amount || !item.pay_dateline) {
      toast({
        title: PAYMENT_ITEM_ROW_LABELS.請填寫必要欄位,
        description: PAYMENT_ITEM_ROW_LABELS.Email_金額_付款截止日為必填,
        variant: 'destructive',
      })
      return
    }

    setIsGenerating(true)
    try {
      const { useAuthStore } = await import('@/stores')
      const user = useAuthStore.getState().user

      const response = await fetch('/api/linkpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receipt_number: `PREVIEW-${Date.now()}`, // 預覽用臨時編號
          user_name: item.receipt_account || '',
          email: item.email,
          payment_name: item.payment_name || orderInfo?.tour_name || '',
          create_user: user?.id || '',
          amount: item.amount,
          end_date: item.pay_dateline,
        }),
      })
      const data = await response.json()
      if (data.success && data.data?.payment_link) {
        setGeneratedLink(data.data.payment_link)
        toast({
          title: PAYMENT_ITEM_ROW_LABELS.連結產生成功,
          description: PAYMENT_ITEM_ROW_LABELS.可複製連結發送給客戶,
        })
      } else {
        throw new Error(data.error || PAYMENT_ITEM_ROW_LABELS.產生連結失敗)
      }
    } catch (error) {
      toast({
        title: PAYMENT_ITEM_ROW_LABELS.產生連結失敗,
        description: error instanceof Error ? error.message : ADD_RECEIPT_DIALOG_LABELS.請稍後再試,
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // 當收款方式變更時（支援 DB 字串值和 hardcoded 數字值）
  const handleReceiptTypeChange = (value: string) => {
    const newType = useDbMethods ? (value as unknown as ReceiptType) : (Number(value) as ReceiptType)
    const updates: Partial<PaymentItem> = { receipt_type: newType }

    // 如果切換到 LinkPay，自動帶入預設值
    if (newType === RECEIPT_TYPES.LINK_PAY || value === 'LinkPay' || value === 'LINE Pay') {
      // 預設付款截止日為 7 天後
      if (!item.pay_dateline) {
        const deadline = new Date()
        deadline.setDate(deadline.getDate() + 7)
        updates.pay_dateline = formatDate(deadline)
      }
      // 預設 Email 從訂單聯絡人
      if (!item.email && orderInfo?.contact_email) {
        updates.email = orderInfo.contact_email
      }
      // 預設收款對象從訂單聯絡人
      if (!item.receipt_account && orderInfo?.contact_person) {
        updates.receipt_account = orderInfo.contact_person.slice(0, 5) // 五字內
      }
      // 預設付款名稱
      if (!item.payment_name && orderInfo?.tour_name) {
        updates.payment_name = orderInfo.tour_name
      }
    }

    onUpdate(item.id, updates)
  }

  return (
    <>
      {/* 主要資料行 */}
      <tr className={cn('bg-card', index > 0 && 'border-t-2 border-t-morandi-container')}>
        {/* 收款方式 */}
        <td className="py-2 px-3 border-b border-r border-border">
          <Select
            value={selectValue}
            onValueChange={handleReceiptTypeChange}
            disabled={readonly}
          >
            <SelectTrigger className="h-8 text-sm w-full border-0 shadow-none bg-transparent px-0">
              <SelectValue placeholder="請選擇" />
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
        <td className="py-2 px-3 border-b border-r border-border">
          <DatePicker
            value={item.transaction_date}
            onChange={date => onUpdate(item.id, { transaction_date: date })}
            placeholder={PAYMENT_ITEM_ROW_LABELS.選擇日期}
            buttonClassName="h-auto p-0 border-0 shadow-none bg-transparent"
          />
        </td>

        {/* 收款項目（公司收款 = 會計科目下拉，團體收款 = 手打） */}
        <td className="py-2 px-3 border-b border-r border-border">
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
                // LinkPay 限制五字內，匯款限制五碼
                const value =
                  item.receipt_type === RECEIPT_TYPES.LINK_PAY ||
                  item.receipt_type === RECEIPT_TYPES.BANK_TRANSFER
                    ? e.target.value.slice(0, 5)
                    : e.target.value
                onUpdate(item.id, { receipt_account: value })
              }}
              placeholder={
                item.receipt_type === RECEIPT_TYPES.LINK_PAY
                  ? PAYMENT_ITEM_ROW_LABELS.收款對象_五字內
                  : item.receipt_type === RECEIPT_TYPES.BANK_TRANSFER
                    ? PAYMENT_ITEM_ROW_LABELS.帳號後五碼
                    : item.receipt_type === RECEIPT_TYPES.CREDIT_CARD
                      ? PAYMENT_ITEM_ROW_LABELS.調閱編號
                      : item.receipt_type === RECEIPT_TYPES.CHECK
                        ? PAYMENT_ITEM_ROW_LABELS.到期日
                        : item.receipt_type === RECEIPT_TYPES.CASH
                          ? PAYMENT_ITEM_ROW_LABELS.收款人
                          : ''
              }
              maxLength={
                item.receipt_type === RECEIPT_TYPES.LINK_PAY ||
                item.receipt_type === RECEIPT_TYPES.BANK_TRANSFER
                  ? 5
                  : undefined
              }
              disabled={readonly}
              className="input-no-focus w-full bg-transparent text-sm"
            />
          )}
        </td>

        {/* 備註 */}
        <td className="py-2 px-3 border-b border-r border-border">
          <input
            type="text"
            value={item.notes || ''}
            onChange={e => onUpdate(item.id, { notes: e.target.value })}
            placeholder={PAYMENT_ITEM_ROW_LABELS.備註_選填}
            className="input-no-focus w-full bg-transparent text-sm"
          />
        </td>

        {/* 金額 */}
        <td className="py-2 px-3 border-b border-r border-border text-right">
          <input
            type="number"
            value={item.amount || ''}
            onChange={e => onUpdate(item.id, { amount: Number(e.target.value) })}
            placeholder="0"
            className="input-no-focus w-full bg-transparent text-sm text-right"
          />
        </td>

        {/* 操作 */}
        <td className="py-2 px-3 border-b border-border text-center">
          {canRemove && (
            <span
              onClick={() => onRemove(item.id)}
              className="text-morandi-secondary cursor-pointer hover:text-morandi-red text-sm"
              title={ADD_RECEIPT_DIALOG_LABELS.刪除}
            >
              ✕
            </span>
          )}
        </td>
      </tr>

      {/* LinkPay 額外欄位 - 表頭 */}
      {item.receipt_type === RECEIPT_TYPES.LINK_PAY && (
        <tr className="text-xs text-morandi-primary font-medium bg-card">
          <th className="text-left py-2.5 px-3 border-b border-r border-border">Email *</th>
          <th className="text-left py-2.5 px-3 border-b border-r border-border">
            {PAYMENT_ITEM_ROW_LABELS.LABEL_6186}
          </th>
          <th className="text-left py-2.5 px-3 border-b border-r border-border" colSpan={2}>
            {PAYMENT_ITEM_ROW_LABELS.LABEL_4673}
          </th>
          <th className="border-b border-border" colSpan={2}></th>
        </tr>
      )}

      {/* LinkPay 額外欄位 - 輸入 */}
      {item.receipt_type === RECEIPT_TYPES.LINK_PAY && (
        <tr className="bg-card">
          <td className="py-2 px-3 border-b border-r border-border">
            <input
              type="email"
              value={item.email || ''}
              onChange={e => onUpdate(item.id, { email: e.target.value })}
              placeholder="user@example.com"
              className="input-no-focus w-full bg-transparent text-sm"
            />
          </td>
          <td className="py-2 px-3 border-b border-r border-border">
            <DatePicker
              value={item.pay_dateline || ''}
              onChange={date => onUpdate(item.id, { pay_dateline: date })}
              placeholder={PAYMENT_ITEM_ROW_LABELS.選擇日期}
              buttonClassName="h-auto p-0 border-0 shadow-none bg-transparent"
            />
          </td>
          <td className="py-2 px-3 border-b border-r border-border" colSpan={2}>
            <input
              type="text"
              value={item.payment_name || ''}
              onChange={e => onUpdate(item.id, { payment_name: e.target.value })}
              placeholder={PAYMENT_ITEM_ROW_LABELS.例如_峇里島五日遊_尾款}
              className="input-no-focus w-full bg-transparent text-sm"
            />
          </td>
          <td className="py-2 px-3 border-b border-border text-center" colSpan={2}>
            <Button
              type="button"
              onClick={handleGenerateLink}
              disabled={isGenerating || !item.email || !item.amount || !item.pay_dateline}
              size="sm"
              className="bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {PAYMENT_ITEM_ROW_LABELS.LABEL_3875}
                </>
              ) : (
                <>
                  <Link2 size={14} />
                  {PAYMENT_ITEM_ROW_LABELS.LABEL_2899}
                </>
              )}
            </Button>
          </td>
        </tr>
      )}

      {/* LinkPay 產生的連結 */}
      {item.receipt_type === RECEIPT_TYPES.LINK_PAY && generatedLink && (
        <tr className="bg-morandi-gold/10">
          <td className="py-2 px-3 border-b border-r border-border text-xs text-morandi-secondary">
            {PAYMENT_ITEM_ROW_LABELS.LABEL_1487}
          </td>
          <td className="py-2 px-3 border-b border-r border-border" colSpan={3}>
            <input
              type="text"
              value={generatedLink}
              readOnly
              className="input-no-focus w-full bg-transparent text-xs"
            />
          </td>
          <td className="py-2 px-3 border-b border-border text-center" colSpan={2}>
            <span
              onClick={handleCopyLink}
              className="text-morandi-gold cursor-pointer hover:text-morandi-gold-hover text-sm mr-3"
            >
              {copied ? '✓ 已複製' : PAYMENT_ITEM_ROW_LABELS.複製}
            </span>
            <span
              onClick={() => window.open(generatedLink, '_blank')}
              className="text-morandi-secondary cursor-pointer hover:text-morandi-primary text-sm"
            >
              {PAYMENT_ITEM_ROW_LABELS.LABEL_1670}
            </span>
          </td>
        </tr>
      )}
    </>
  )
}
