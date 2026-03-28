'use client'
/**
 * 批量確認收款對話框
 *
 * 功能：
 * 1. 顯示所有待確認的收款單
 * 2. 允許會計輸入每筆的實收金額
 * 3. 批量確認收款狀態
 * 4. 每筆獨立處理，失敗不影響其他
 * 
 * ADR-001: 不再使用 receipt_items，直接用 receipts
 */

import { useState, useMemo, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  useReceipts,
  updateReceipt,
  invalidateReceipts,
} from '@/data'
import { CheckCircle, AlertCircle, DollarSign, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { alert } from '@/lib/ui/alert-dialog'
import { RECEIPT_TYPE_LABELS, ReceiptType, Receipt } from '@/types/receipt.types'
import { CurrencyCell } from '@/components/table-cells'
import { logger } from '@/lib/utils/logger'
import { recalculateReceiptStats } from '@/features/finance/payments/services/receipt-core.service'
import { BATCH_CONFIRM_LABELS } from '../../constants/labels'

interface BatchConfirmReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface ConfirmItem {
  receipt: Receipt
  actualAmount: number
  selected: boolean
}

export function BatchConfirmReceiptDialog({
  open,
  onOpenChange,
  onSuccess,
}: BatchConfirmReceiptDialogProps) {
  const { items: receipts } = useReceipts()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmItems, setConfirmItems] = useState<Map<string, ConfirmItem>>(new Map())

  // 篩選待確認的收款單（status = '0'）
  const pendingReceipts = useMemo(() => {
    return receipts.filter(r => r.status === '0' && !r.deleted_at)
  }, [receipts])

  // 初始化確認項目
  useMemo(() => {
    const newMap = new Map<string, ConfirmItem>()
    pendingReceipts.forEach(receipt => {
      if (!confirmItems.has(receipt.id)) {
        newMap.set(receipt.id, {
          receipt,
          actualAmount: receipt.receipt_amount || receipt.amount || 0,
          selected: false,
        })
      } else {
        newMap.set(receipt.id, confirmItems.get(receipt.id)!)
      }
    })
    if (newMap.size !== confirmItems.size) {
      setConfirmItems(newMap)
    }
  }, [pendingReceipts])

  // 切換選取
  const toggleSelect = useCallback((id: string) => {
    setConfirmItems(prev => {
      const newMap = new Map(prev)
      const item = newMap.get(id)
      if (item) {
        newMap.set(id, { ...item, selected: !item.selected })
      }
      return newMap
    })
  }, [])

  // 全選/取消全選
  const toggleSelectAll = useCallback(() => {
    const allSelected = Array.from(confirmItems.values()).every(item => item.selected)
    setConfirmItems(prev => {
      const newMap = new Map(prev)
      newMap.forEach((item, id) => {
        newMap.set(id, { ...item, selected: !allSelected })
      })
      return newMap
    })
  }, [confirmItems])

  // 更新實收金額
  const updateActualAmount = useCallback((id: string, amount: number) => {
    setConfirmItems(prev => {
      const newMap = new Map(prev)
      const item = newMap.get(id)
      if (item) {
        newMap.set(id, { ...item, actualAmount: amount })
      }
      return newMap
    })
  }, [])

  // 選中的項目
  const selectedItems = useMemo(() => {
    return Array.from(confirmItems.values()).filter(item => item.selected)
  }, [confirmItems])

  // 總金額
  const totalAmount = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.actualAmount, 0)
  }, [selectedItems])

  // 確認收款
  const handleConfirm = async () => {
    if (selectedItems.length === 0) {
      await alert(BATCH_CONFIRM_LABELS.SELECT_AT_LEAST_ONE, 'warning')
      return
    }

    setIsSubmitting(true)
    let successCount = 0
    let failCount = 0

    try {
      for (const item of selectedItems) {
        try {
          await updateReceipt(item.receipt.id, {
            actual_amount: item.actualAmount,
            status: '1',
          })

          // 重算訂單付款狀態
          if (item.receipt.order_id) {
            await recalculateReceiptStats(item.receipt.order_id, item.receipt.tour_id || null)
          }

          successCount++
        } catch (error) {
          logger.error('確認收款失敗:', { receiptId: item.receipt.id, error })
          failCount++
        }
      }

      await invalidateReceipts()

      if (failCount === 0) {
        await alert(BATCH_CONFIRM_LABELS.CONFIRM_SUCCESS(successCount), 'success')
      } else {
        await alert(BATCH_CONFIRM_LABELS.CONFIRM_PARTIAL(successCount, failCount, ''), 'warning')
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      logger.error('批量確認失敗:', error)
      await alert(BATCH_CONFIRM_LABELS.UNKNOWN_ERROR, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const allSelected = confirmItems.size > 0 && Array.from(confirmItems.values()).every(item => item.selected)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={2} className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-morandi-gold" />
            {BATCH_CONFIRM_LABELS.CONFIRM_2930}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {pendingReceipts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mb-4 text-morandi-green" />
              <p>{BATCH_CONFIRM_LABELS.NO_PENDING_ITEMS}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* 表頭 */}
              <div className="flex items-center gap-4 px-4 py-2 bg-muted/50 rounded-lg text-sm font-medium text-muted-foreground">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                />
                <div className="w-32">{BATCH_CONFIRM_LABELS.LABEL_6427}</div>
                <div className="w-24">{BATCH_CONFIRM_LABELS.LABEL_5187}</div>
                <div className="flex-1">{BATCH_CONFIRM_LABELS.LABEL_7017}</div>
                <div className="w-28 text-right">{BATCH_CONFIRM_LABELS.LABEL_6261}</div>
                <div className="w-32">{BATCH_CONFIRM_LABELS.LABEL_8417}</div>
                <div className="w-20">狀態</div>
              </div>

              {/* 列表 */}
              {Array.from(confirmItems.values()).map(({ receipt, actualAmount, selected }) => {
                const expectedAmount = receipt.receipt_amount || receipt.amount || 0
                const isAbnormal = actualAmount !== expectedAmount

                return (
                  <div
                    key={receipt.id}
                    className={cn(
                      'flex items-center gap-4 px-4 py-3 rounded-lg border transition-colors',
                      selected ? 'bg-morandi-gold/5 border-morandi-gold/30' : 'bg-card border-border'
                    )}
                  >
                    <Checkbox
                      checked={selected}
                      onCheckedChange={() => toggleSelect(receipt.id)}
                    />
                    <div className="w-32 font-mono text-sm">{receipt.receipt_number}</div>
                    <div className="w-24 text-sm">
                      {RECEIPT_TYPE_LABELS[receipt.receipt_type as ReceiptType] || '-'}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{receipt.order_number || '-'}</div>
                      <div className="text-xs text-muted-foreground">{receipt.tour_name || '-'}</div>
                    </div>
                    <div className="w-28 text-right">
                      <CurrencyCell amount={expectedAmount} />
                    </div>
                    <div className="w-32">
                      <Input
                        type="number"
                        value={actualAmount}
                        onChange={e => updateActualAmount(receipt.id, parseFloat(e.target.value) || 0)}
                        className={cn(
                          'h-8 text-right',
                          isAbnormal && 'border-orange-400 bg-orange-50'
                        )}
                      />
                    </div>
                    <div className="w-20 flex justify-center">
                      {isAbnormal ? (
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                      ) : (
                        <Check className="h-5 w-5 text-morandi-green" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex-1 flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {BATCH_CONFIRM_LABELS.SELECTED_STATS(selectedItems.length, pendingReceipts.length)}
            </span>
            <span className="text-sm font-medium">
              {BATCH_CONFIRM_LABELS.TOTAL_PREFIX}<CurrencyCell amount={totalAmount} />
            </span>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {BATCH_CONFIRM_LABELS.CANCEL}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || selectedItems.length === 0}
            className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
          >
            {isSubmitting ? BATCH_CONFIRM_LABELS.CONFIRMING : BATCH_CONFIRM_LABELS.CONFIRM_N_RECEIPTS(selectedItems.length)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
