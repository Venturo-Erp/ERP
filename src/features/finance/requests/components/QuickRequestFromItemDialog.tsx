'use client'

/**
 * QuickRequestFromItemDialog - 從需求單項目快速建立請款
 *
 * 用於團確檔案中，針對單一有供應商的需求單項目快速請款
 */

import { useState, useEffect } from 'react'
import { DollarSign, X, Check, Building2, Calendar, FileText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RequestDateInput } from './RequestDateInput'
import { formatMoney } from '@/lib/utils/format-currency'
import { useRequestOperations } from '../hooks/useRequestOperations'
import { useAuthStore } from '@/stores/auth-store'
import { PaymentItemCategory } from '@/stores/types'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import {
  ADD_REQUEST_DIALOG_LABELS,
  QUICK_REQUEST_FROM_ITEM_DIALOG_LABELS,
  REQUEST_TYPE_LABELS,
} from '../../constants/labels'

// 類別對應的圖標和顏色
const CATEGORY_CONFIG: Record<string, { icon: string; color: string }> = {
  [REQUEST_TYPE_LABELS.CAT_ACCOMMODATION]: { icon: '🏨', color: 'text-status-info' },
  accommodation: { icon: '🏨', color: 'text-status-info' },
  [REQUEST_TYPE_LABELS.CAT_TRANSPORTATION]: { icon: '🚌', color: 'text-morandi-green' },
  transportation: { icon: '🚌', color: 'text-morandi-green' },
  [REQUEST_TYPE_LABELS.CAT_TICKET]: { icon: '🎫', color: 'text-morandi-secondary' },
  ticket: { icon: '🎫', color: 'text-morandi-secondary' },
  activity: { icon: '🎫', color: 'text-morandi-secondary' },
  [REQUEST_TYPE_LABELS.CAT_MEAL]: { icon: '🍽️', color: 'text-status-warning' },
  meal: { icon: '🍽️', color: 'text-status-warning' },
  [REQUEST_TYPE_LABELS.CAT_OTHER]: { icon: '📦', color: 'text-morandi-secondary' },
}

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] || CATEGORY_CONFIG[ADD_REQUEST_DIALOG_LABELS.其他]
}

interface QuickRequestFromItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // 需求單項目資訊
  item: {
    id: string
    category: string
    title: string
    supplierName: string
    supplierId: string
    estimatedCost: number
    tourId: string
    tourCode: string
    tourName: string
  }
  onSuccess?: () => void
}

export function QuickRequestFromItemDialog({
  open,
  onOpenChange,
  item,
  onSuccess,
}: QuickRequestFromItemDialogProps) {
  const { user } = useAuthStore()
  const { generateRequestCode, createRequest } = useRequestOperations()

  // 表單狀態
  const [amount, setAmount] = useState<string>('')
  const [requestDate, setRequestDate] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 預覽編號
  const previewCode = item.tourCode ? generateRequestCode(item.tourCode) : ''

  // 重置表單
  useEffect(() => {
    if (open) {
      // 預填金額（如果有預估成本）
      setAmount(item.estimatedCost > 0 ? item.estimatedCost.toString() : '')
      setNote('')
    }
  }, [open, item.estimatedCost])

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount.replace(/,/g, ''))
    if (!numAmount || numAmount <= 0) {
      toast.error(QUICK_REQUEST_FROM_ITEM_DIALOG_LABELS.請輸入有效的金額)
      return
    }

    setIsSubmitting(true)
    try {
      await createRequest(
        {
          request_category: 'tour',
          tour_id: item.tourId,
          order_id: '',
          expense_type: '',
          request_date: requestDate,
          notes: note || `${item.category} - ${item.title}`,
          is_special_billing: false,
          created_by: user?.id || '',
        },
        [
          {
            id: Math.random().toString(36).substr(2, 9),
            request_date: requestDate,
            payment_method_id: undefined,
            category: item.category as PaymentItemCategory,
            supplier_id: item.supplierId,
            supplierName: item.supplierName,
            description: item.title,
            unit_price: numAmount,
            quantity: 1,
            tour_request_id: item.id, // 連結需求單
          },
        ],
        item.tourName,
        item.tourCode,
        undefined,
        user?.display_name || user?.chinese_name || ''
      )

      toast.success(QUICK_REQUEST_FROM_ITEM_DIALOG_LABELS.請款單建立成功)
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      logger.error('建立請款單失敗:', error)
      toast.error(QUICK_REQUEST_FROM_ITEM_DIALOG_LABELS.建立請款單失敗)
    } finally {
      setIsSubmitting(false)
    }
  }

  const categoryConfig = getCategoryConfig(item.category)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={2} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign size={20} className="text-morandi-gold" />
            {QUICK_REQUEST_FROM_ITEM_DIALOG_LABELS.LABEL_8944}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 項目資訊（唯讀） */}
          <div className="bg-morandi-container/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{categoryConfig.icon}</span>
              <span className={cn('text-sm font-medium', categoryConfig.color)}>
                {item.category}
              </span>
            </div>

            <div>
              <div className="text-sm text-morandi-secondary">
                {QUICK_REQUEST_FROM_ITEM_DIALOG_LABELS.LABEL_7325}
              </div>
              <div className="font-medium text-morandi-primary">{item.title}</div>
            </div>

            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-morandi-secondary" />
              <span className="text-sm text-morandi-secondary">
                {QUICK_REQUEST_FROM_ITEM_DIALOG_LABELS.LABEL_4947}
              </span>
              <span className="text-sm font-medium text-morandi-primary">{item.supplierName}</span>
            </div>

            <div className="flex items-center gap-2">
              <FileText size={14} className="text-morandi-secondary" />
              <span className="text-sm text-morandi-secondary">
                {QUICK_REQUEST_FROM_ITEM_DIALOG_LABELS.LABEL_1073}
              </span>
              <span className="text-sm font-medium text-morandi-primary">{item.tourCode}</span>
            </div>

            {item.estimatedCost > 0 && (
              <div className="text-xs text-morandi-secondary">
                預估成本：NT$ {formatMoney(item.estimatedCost)}
              </div>
            )}
          </div>

          {/* 請款單編號預覽 */}
          <div className="text-sm text-morandi-secondary">
            請款單號：<span className="font-medium text-morandi-primary">{previewCode}</span>
          </div>

          {/* 金額輸入 */}
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {QUICK_REQUEST_FROM_ITEM_DIALOG_LABELS.LABEL_3827}
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-morandi-secondary">
                NT$
              </span>
              <Input
                type="text"
                value={amount}
                onChange={e => {
                  // 只允許數字和逗號
                  const value = e.target.value.replace(/[^\d,]/g, '')
                  setAmount(value)
                }}
                className="pl-12 text-right font-medium"
                placeholder="0"
                autoFocus
              />
            </div>
          </div>

          {/* 請款日期 */}
          <RequestDateInput value={requestDate} onChange={date => setRequestDate(date)} />

          {/* 備註 */}
          <div>
            <label className="text-sm font-medium text-morandi-primary">
              {QUICK_REQUEST_FROM_ITEM_DIALOG_LABELS.REMARKS}
            </label>
            <Input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={ADD_REQUEST_DIALOG_LABELS.輸入備註_可選}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="gap-2"
          >
            <X size={16} />
            {QUICK_REQUEST_FROM_ITEM_DIALOG_LABELS.CANCEL}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !amount}
            className="bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-2"
          >
            <Check size={16} />
            {isSubmitting ? '建立中...' : QUICK_REQUEST_FROM_ITEM_DIALOG_LABELS.確認請款}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
