'use client'

import { getTodayString } from '@/lib/utils/format-date'

import { useState } from 'react'
import { DollarSign, Calendar, X, Save } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { createReceipt } from '@/data'
import { useAuthStore } from '@/stores'
import type { Receipt } from '@/types/receipt.types'
import { alert } from '@/lib/ui/alert-dialog'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { CurrencyCell } from '@/components/table-cells'
import { COMP_WORKSPACE_LABELS } from './constants/labels'

interface CreateReceiptDialogProps {
  order: {
    id: string
    order_number: string | null
    contact_person: string
    total_amount: number
    paid_amount: number
    gap: number
    tour_id?: string | null
    customer_id?: string | null
  }
  open: boolean
  onClose: () => void
  onSuccess: (receiptId: string) => void
}

export function CreateReceiptDialog({ order, open, onClose, onSuccess }: CreateReceiptDialogProps) {
  const { user } = useAuthStore()
  const [receiptDate, setReceiptDate] = useState(getTodayString())
  const [paymentMethod, setPaymentMethod] = useState<'現金' | '匯款' | '刷卡' | '支票'>('匯款')
  const [amount, setAmount] = useState(order.gap.toString())
  const [note, setNote] = useState('')

  const handleCreate = async () => {
    try {
      const paymentMethodMap: Record<string, string> = {
        現金: 'cash',
        匯款: 'transfer',
        刷卡: 'card',
        支票: 'check',
      }

      const receiptData = {
        receipt_number: '', // 會由後端生成
        order_id: order.id,
        tour_id: order.tour_id || null,
        customer_id: order.customer_id || null,
        receipt_date: receiptDate,
        payment_date: receiptDate,
        payment_method: paymentMethodMap[paymentMethod] || 'transfer',
        receipt_amount: parseFloat(amount),
        amount: parseFloat(amount),
        actual_amount: 0,
        status: '0',
        notes: note,
        workspace_id: user?.workspace_id || '',
        created_by: user?.id || '',
        updated_by: user?.id || '',
        deleted_at: null,
      }

      const receipt = await createReceipt(receiptData as Parameters<typeof createReceipt>[0])
      onSuccess(receipt.id)
      onClose()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      void alert(`建立收款單失敗：${errorMessage}`, 'error')
    }
  }

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent level={1} className="max-w-[500px]">
        <DialogHeader className="pb-3 border-b border-morandi-gold/20">
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="text-morandi-gold" size={20} />
            <span>{COMP_WORKSPACE_LABELS.LABEL_1761}</span>
          </DialogTitle>
        </DialogHeader>

        {/* 內容 */}
        <div className="space-y-4 my-4">
          {/* 訂單資訊 */}
          <div className="bg-morandi-container/5 rounded-lg p-3 border border-morandi-gold/20">
            <div className="text-sm font-medium text-morandi-secondary mb-2">
              {COMP_WORKSPACE_LABELS.LABEL_1002}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-morandi-secondary">{COMP_WORKSPACE_LABELS.LABEL_9754}</span>
                <span className="font-medium text-morandi-primary">
                  {order.order_number || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-morandi-secondary">{COMP_WORKSPACE_LABELS.LABEL_6286}</span>
                <span className="text-morandi-primary">{order.contact_person}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-morandi-secondary">{COMP_WORKSPACE_LABELS.TOTAL_8832}</span>
                <CurrencyCell amount={order.total_amount} className="text-morandi-primary" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-morandi-secondary">{COMP_WORKSPACE_LABELS.LABEL_7341}</span>
                <CurrencyCell amount={order.paid_amount} className="text-morandi-primary" />
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t border-morandi-gold/20">
                <span className="text-morandi-secondary">{COMP_WORKSPACE_LABELS.LABEL_385}</span>
                <CurrencyCell
                  amount={order.gap}
                  variant="expense"
                  className="text-lg font-semibold"
                />
              </div>
            </div>
          </div>

          {/* 收款日期 */}
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-2">
              {COMP_WORKSPACE_LABELS.LABEL_4500}
            </label>
            <div className="relative">
              <DatePicker
                value={receiptDate}
                onChange={date => setReceiptDate(date)}
                placeholder={COMP_WORKSPACE_LABELS.選擇日期}
                className="pl-10"
              />
              <Calendar
                className="absolute left-3 top-1/2 -translate-y-1/2 text-morandi-secondary pointer-events-none"
                size={16}
              />
            </div>
          </div>

          {/* 收款方式 */}
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-2">
              {COMP_WORKSPACE_LABELS.LABEL_5187}
            </label>
            <Select
              value={paymentMethod}
              onValueChange={value => {
                if (value === '現金' || value === '匯款' || value === '刷卡' || value === '支票') {
                  setPaymentMethod(value)
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="現金">{COMP_WORKSPACE_LABELS.現金}</SelectItem>
                <SelectItem value="匯款">{COMP_WORKSPACE_LABELS.匯款}</SelectItem>
                <SelectItem value="刷卡">{COMP_WORKSPACE_LABELS.刷卡}</SelectItem>
                <SelectItem value="支票">{COMP_WORKSPACE_LABELS.支票}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 收款金額 */}
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-2">
              {COMP_WORKSPACE_LABELS.LABEL_811}
            </label>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={COMP_WORKSPACE_LABELS.輸入收款金額}
            />
          </div>

          {/* 備註 */}
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-2">
              {COMP_WORKSPACE_LABELS.LABEL_8278}
            </label>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder={COMP_WORKSPACE_LABELS.輸入備註}
            />
          </div>
        </div>

        {/* 底部操作按鈕 */}
        <DialogFooter className="pt-3 border-t border-morandi-gold/20">
          <Button variant="outline" onClick={onClose}>
            <X size={16} />
            {COMP_WORKSPACE_LABELS.CANCEL}
          </Button>
          <Button onClick={handleCreate} disabled={!amount || parseFloat(amount) <= 0}>
            <Save size={16} />
            {COMP_WORKSPACE_LABELS.LABEL_1761}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
