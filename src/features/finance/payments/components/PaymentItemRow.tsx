/**
 * Payment Item Row (Table-based Input)
 * 收款項目行（表格式輸入）
 */

import { formatDate } from '@/lib/utils/format-date'
import { formatMoney } from '@/lib/utils/format-currency'
import { useState, useEffect } from 'react'
import { usePaymentMethodsCached } from '@/data/hooks'
import { Link2, Loader2, Trash2 } from 'lucide-react'
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
import { codeToReceiptType, isLinkPayCode } from '@/types/receipt.types'
import { BANK_ACCOUNTS } from '../types'
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
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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

    // 如果切換到 LinkPay 類型，自動帶入預設值
    if (isLinkPayCode(code)) {
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

      {/* LinkPay 額外欄位 - 表頭 */}
      {(currentCode === 'LINKPAY' || currentCode === 'LINEPAY') && (
        <tr className="text-xs text-morandi-primary font-medium bg-card">
          <th className="text-left py-2.5 px-3 border-b border-border/50">Email *</th>
          <th className="text-left py-2.5 px-3 border-b border-border/50">
            {PAYMENT_ITEM_ROW_LABELS.LABEL_6186}
          </th>
          <th className="text-left py-2.5 px-3 border-b border-border/50" colSpan={2}>
            {PAYMENT_ITEM_ROW_LABELS.LABEL_4673}
          </th>
          <th className="border-b border-border/50" colSpan={2}></th>
        </tr>
      )}

      {/* LinkPay 額外欄位 - 輸入 */}
      {(currentCode === 'LINKPAY' || currentCode === 'LINEPAY') && (
        <tr className="bg-card">
          <td className="py-2 px-3 border-b border-border/50">
            <input
              type="email"
              value={item.email || ''}
              onChange={e => onUpdate(item.id, { email: e.target.value })}
              placeholder="user@example.com"
              className="input-no-focus w-full bg-transparent text-sm"
            />
          </td>
          <td className="py-2 px-3 border-b border-border/50">
            <DatePicker
              value={item.pay_dateline || ''}
              onChange={date => onUpdate(item.id, { pay_dateline: date })}
              placeholder={PAYMENT_ITEM_ROW_LABELS.選擇日期}
              buttonClassName="h-auto p-0 border-0 shadow-none bg-transparent"
            />
          </td>
          <td className="py-2 px-3 border-b border-border/50" colSpan={2}>
            <input
              type="text"
              value={item.payment_name || ''}
              onChange={e => onUpdate(item.id, { payment_name: e.target.value })}
              placeholder={PAYMENT_ITEM_ROW_LABELS.例如_峇里島五日遊_尾款}
              className="input-no-focus w-full bg-transparent text-sm"
            />
          </td>
          <td className="py-2 px-3 border-b border-border/50 text-center" colSpan={2}>
            <Button variant="soft-gold"
              type="button"
              onClick={handleGenerateLink}
              disabled={isGenerating || !item.email || !item.amount || !item.pay_dateline}
              size="sm"
 className="gap-1"
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
      {(currentCode === 'LINKPAY' || currentCode === 'LINEPAY') && generatedLink && (
        <tr className="bg-morandi-gold/10">
          <td className="py-2 px-3 border-b border-border/50 text-xs text-morandi-secondary">
            {PAYMENT_ITEM_ROW_LABELS.LABEL_1487}
          </td>
          <td className="py-2 px-3 border-b border-border/50" colSpan={3}>
            <input
              type="text"
              value={generatedLink}
              readOnly
              className="input-no-focus w-full bg-transparent text-xs"
            />
          </td>
          <td className="py-2 px-3 border-b border-border/50 text-center" colSpan={2}>
            <button
              type="button"
              onClick={handleCopyLink}
              className="text-morandi-gold hover:text-morandi-gold-hover text-sm mr-3"
            >
              {copied ? '✓ 已複製' : PAYMENT_ITEM_ROW_LABELS.複製}
            </button>
            <button
              type="button"
              onClick={() => window.open(generatedLink, '_blank')}
              className="text-morandi-secondary hover:text-morandi-primary text-sm"
            >
              {PAYMENT_ITEM_ROW_LABELS.LABEL_1670}
            </button>
          </td>
        </tr>
      )}

      {/* 匯款額外欄位 */}
      {currentCode === 'TRANSFER' && !readonly && (
        <tr className="bg-card">
          <td className="py-2 px-3 border-b border-border/50 text-xs text-morandi-primary font-medium">
            匯入帳戶
          </td>
          <td className="py-2 px-3 border-b border-border/50" colSpan={2}>
            <Select
              value={item.account_info || ''}
              onValueChange={value => onUpdate(item.id, { account_info: value })}
            >
              <SelectTrigger className="h-8 text-sm w-full border-0 shadow-none bg-transparent px-0">
                <SelectValue placeholder="請選擇帳戶" />
              </SelectTrigger>
              <SelectContent>
                {BANK_ACCOUNTS.map(bank => (
                  <SelectItem key={bank.value} value={bank.value}>
                    {bank.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </td>
          <td className="py-2 px-3 border-b border-border/50 text-xs text-morandi-primary font-medium">
            手續費
          </td>
          <td className="py-2 px-3 border-b border-border/50" colSpan={2}>
            <input
              type="number"
              value={item.fees || ''}
              onChange={e => onUpdate(item.id, { fees: Number(e.target.value) })}
              placeholder="0"
              className="input-no-focus w-full bg-transparent text-sm"
            />
          </td>
        </tr>
      )}

      {/* 刷卡額外欄位 */}
      {currentCode === 'CREDIT_CARD' && !readonly && (
        <tr className="bg-card">
          <td className="py-2 px-3 border-b border-border/50 text-xs text-morandi-primary font-medium">
            卡號末四碼
          </td>
          <td className="py-2 px-3 border-b border-border/50">
            <input
              type="text"
              maxLength={4}
              value={item.card_last_four || ''}
              onChange={e =>
                onUpdate(item.id, { card_last_four: e.target.value.replace(/\D/g, '') })
              }
              placeholder="1234"
              className="input-no-focus w-full bg-transparent text-sm"
            />
          </td>
          <td className="py-2 px-3 border-b border-border/50 text-xs text-morandi-primary font-medium">
            授權碼
          </td>
          <td className="py-2 px-3 border-b border-border/50">
            <input
              type="text"
              value={item.auth_code || ''}
              onChange={e => onUpdate(item.id, { auth_code: e.target.value })}
              placeholder="授權碼"
              className="input-no-focus w-full bg-transparent text-sm"
            />
          </td>
          <td className="py-2 px-3 border-b border-border/50 text-xs text-morandi-primary font-medium">
            手續費
          </td>
          <td className="py-2 px-3 border-b border-border/50">
            <input
              type="number"
              value={item.fees || ''}
              onChange={e => onUpdate(item.id, { fees: Number(e.target.value) })}
              placeholder="0"
              className="input-no-focus w-full bg-transparent text-sm"
            />
          </td>
        </tr>
      )}

      {/* 支票額外欄位 */}
      {currentCode === 'CHECK' && !readonly && (
        <tr className="bg-card">
          <td className="py-2 px-3 border-b border-border/50 text-xs text-morandi-primary font-medium">
            支票號碼
          </td>
          <td className="py-2 px-3 border-b border-border/50" colSpan={2}>
            <input
              type="text"
              value={item.check_number || ''}
              onChange={e => onUpdate(item.id, { check_number: e.target.value })}
              placeholder="票據號碼"
              className="input-no-focus w-full bg-transparent text-sm"
            />
          </td>
          <td className="py-2 px-3 border-b border-border/50 text-xs text-morandi-primary font-medium">
            開票銀行
          </td>
          <td className="py-2 px-3 border-b border-border/50" colSpan={2}>
            <input
              type="text"
              value={item.check_bank || ''}
              onChange={e => onUpdate(item.id, { check_bank: e.target.value })}
              placeholder="銀行名稱"
              className="input-no-focus w-full bg-transparent text-sm"
            />
          </td>
        </tr>
      )}

    </>
  )
}
