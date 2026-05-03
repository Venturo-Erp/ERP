'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Undo2, X } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import type { Receipt } from '@/stores'

interface RefundReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  receipt: Receipt | null
  onSuccess?: () => void
}

export function RefundReceiptDialog({
  open,
  onOpenChange,
  receipt,
  onSuccess,
}: RefundReceiptDialogProps) {
  const [refundAmount, setRefundAmount] = useState('')
  const [refundDate, setRefundDate] = useState(() => new Date().toISOString().split('T')[0])
  const [refundNotes, setRefundNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const actualAmount =
    Number(receipt?.actual_amount) || Number(receipt?.receipt_amount) || 0

  useEffect(() => {
    if (open && receipt) {
      setRefundAmount(String(actualAmount))
      setRefundDate(new Date().toISOString().split('T')[0])
      setRefundNotes('')
    }
  }, [open, receipt, actualAmount])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!receipt) return

    const amount = Number(refundAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('請輸入有效的退款金額')
      return
    }
    if (amount > actualAmount) {
      toast.error(`退款金額不能超過實收金額 ${actualAmount.toLocaleString()}`)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/accounting/receipts/${receipt.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refund_amount: amount,
          refund_date: refundDate,
          refund_notes: refundNotes || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || '退款失敗')
        return
      }

      toast.success(
        json.refund_voucher_id
          ? '退款成功（已產生反向傳票）'
          : '退款成功（會計未啟用、僅標記退款）'
      )
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      logger.error('退款失敗:', error)
      toast.error('退款失敗、請稍後再試')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!receipt) return null

  const isPartial = Number(refundAmount) > 0 && Number(refundAmount) < actualAmount

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={2} className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 size={18} className="text-morandi-red" />
            退款 — {receipt.receipt_number}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 收款資訊 */}
          <div className="rounded-md bg-morandi-container/40 p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">團名</span>
              <span>{receipt.tour_name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">客戶</span>
              <span>{receipt.customer_name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">實收金額</span>
              <span className="font-mono font-semibold">
                ${actualAmount.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund_amount">退款金額 *</Label>
            <Input
              id="refund_amount"
              type="number"
              step="0.01"
              max={actualAmount}
              value={refundAmount}
              onChange={e => setRefundAmount(e.target.value)}
              required
            />
            {isPartial && (
              <div className="text-xs text-status-warning">
                部分退款（保留 ${(actualAmount - Number(refundAmount)).toLocaleString()}）
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund_date">退款日期 *</Label>
            <Input
              id="refund_date"
              type="date"
              value={refundDate}
              onChange={e => setRefundDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="refund_notes">退款原因</Label>
            <Textarea
              id="refund_notes"
              placeholder="例：客人退團、行程取消、扣手續費..."
              value={refundNotes}
              onChange={e => setRefundNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="text-xs text-muted-foreground bg-status-info/5 border border-status-info/20 rounded p-2">
            退款執行後：原收款狀態改為「已退款」、會計上會自動產生「借收入 / 貸銀行」反向傳票（會計啟用且原傳票存在的情況下）。退款不可復原。
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              <X size={16} className="mr-1" />
              取消
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-morandi-red hover:bg-morandi-red/90 text-white gap-2"
            >
              <Undo2 size={16} />
              {isSubmitting ? '處理中...' : '確認退款'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
