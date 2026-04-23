'use client'
/**
 * Receipt Confirm Dialog
 * 收款單確認對話框（與新增介面相同風格）
 */

import { RECEIPT_CONFIRM_LABELS } from '../../constants/labels'
import { formatMoney } from '@/lib/utils/format-currency'

import { useState } from 'react'
import { Check, X, AlertCircle, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { confirm } from '@/lib/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { RECEIPT_TYPE_OPTIONS } from '../types'
import { useAuthStore } from '@/stores'
import { useTabPermissions } from '@/lib/permissions'
import { deleteReceipt, invalidateReceipts } from '@/data'
import { recalculateReceiptStats } from '../services/receipt-core.service'
import type { Receipt } from '@/types/receipt.types'
import {
  ADD_RECEIPT_DIALOG_LABELS,
  RECEIPT_CONFIRM_DIALOG_LABELS,
  RECEIPT_CONFIRM_TOAST_LABELS,
} from '../../constants/labels'

interface ReceiptConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  receipt: Receipt | null
  onConfirm: (receiptId: string, actualAmount: number, isAbnormal: boolean) => Promise<void>
  onSuccess?: () => void
}

export function ReceiptConfirmDialog({
  open,
  onOpenChange,
  receipt,
  onConfirm,
  onSuccess,
}: ReceiptConfirmDialogProps) {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const { canWrite } = useTabPermissions()
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showAbnormalInput, setShowAbnormalInput] = useState(false)
  const [abnormalAmount, setAbnormalAmount] = useState('')

  if (!receipt) return null

  // 檢查是否可以刪除：有「收款管理」寫入權 或 建立者
  const isCreator = user?.id === receipt.created_by
  const canDelete = canWrite('finance', 'payments') || isCreator

  const receiptTypeLabel =
    RECEIPT_TYPE_OPTIONS.find(opt => opt.value === receipt.receipt_type)?.label ||
    RECEIPT_CONFIRM_DIALOG_LABELS.未知

  const isConfirmed = receipt.status === '1'

  // 確認金額正確
  const handleConfirmCorrect = async () => {
    setIsConfirming(true)
    try {
      await onConfirm(receipt.id, receipt.receipt_amount || 0, false)
      toast({
        title: RECEIPT_CONFIRM_DIALOG_LABELS.確認成功,
        description: RECEIPT_CONFIRM_DIALOG_LABELS.收款金額已確認,
      })
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: RECEIPT_CONFIRM_DIALOG_LABELS.確認失敗,
        description: error instanceof Error ? error.message : ADD_RECEIPT_DIALOG_LABELS.請稍後再試,
        variant: 'destructive',
      })
    } finally {
      setIsConfirming(false)
    }
  }

  // 金額異常，輸入實際金額
  const handleConfirmAbnormal = async () => {
    const amount = parseFloat(abnormalAmount)
    if (isNaN(amount) || amount < 0) {
      toast({
        title: RECEIPT_CONFIRM_DIALOG_LABELS.請輸入有效金額,
        variant: 'destructive',
      })
      return
    }

    setIsConfirming(true)
    try {
      await onConfirm(receipt.id, amount, true)
      toast({
        title: RECEIPT_CONFIRM_TOAST_LABELS.CONFIRM_SUCCESS,
        description: RECEIPT_CONFIRM_DIALOG_LABELS.已記錄實際收款金額_並通知建立者,
      })
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: RECEIPT_CONFIRM_TOAST_LABELS.CONFIRM_FAILED,
        description:
          error instanceof Error ? error.message : RECEIPT_CONFIRM_TOAST_LABELS.PLEASE_TRY_LATER,
        variant: 'destructive',
      })
    } finally {
      setIsConfirming(false)
      setShowAbnormalInput(false)
      setAbnormalAmount('')
    }
  }

  const handleClose = () => {
    setShowAbnormalInput(false)
    setAbnormalAmount('')
    onOpenChange(false)
  }

  // 刪除收款單
  const handleDelete = async () => {
    const confirmed = await confirm(
      RECEIPT_CONFIRM_TOAST_LABELS.DELETE_CONFIRM(receipt.receipt_number),
      { title: ADD_RECEIPT_DIALOG_LABELS.刪除收款單, type: 'error' }
    )

    if (!confirmed) return

    setIsDeleting(true)
    try {
      await deleteReceipt(receipt.id)
      await recalculateReceiptStats(receipt.order_id, receipt.tour_id || null)
      await invalidateReceipts()
      toast({
        title: ADD_RECEIPT_DIALOG_LABELS.刪除成功,
        description: RECEIPT_CONFIRM_TOAST_LABELS.DELETED(receipt.receipt_number),
      })
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: ADD_RECEIPT_DIALOG_LABELS.刪除失敗,
        description:
          error instanceof Error ? error.message : RECEIPT_CONFIRM_TOAST_LABELS.PLEASE_TRY_LATER,
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent level={2} className="max-w-[800px] flex flex-col">
        <DialogHeader>
          <DialogTitle>{RECEIPT_CONFIRM_LABELS.TITLE}</DialogTitle>
          <p className="text-sm text-muted-foreground">{receipt.receipt_number}</p>
        </DialogHeader>

        {/* 基本資訊 */}
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-muted-foreground">{RECEIPT_CONFIRM_LABELS.TOUR_NAME}</span>
            <span className="font-medium">{receipt.tour_name || '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{RECEIPT_CONFIRM_LABELS.ORDER}</span>
            <span className="font-medium">{receipt.order_number || '-'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">{RECEIPT_CONFIRM_LABELS.STATUS}</span>
            <span
              className={cn(
                'font-medium',
                isConfirmed ? 'text-morandi-green' : 'text-morandi-gold'
              )}
            >
              {isConfirmed
                ? RECEIPT_CONFIRM_DIALOG_LABELS.已確認
                : RECEIPT_CONFIRM_DIALOG_LABELS.待確認}
            </span>
          </div>
        </div>

        {/* 收款項目表格 */}
        <div className="border border-border rounded-lg overflow-hidden bg-card mt-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-xs text-morandi-primary font-medium bg-morandi-container/50">
                <th
                  className="text-left py-2.5 px-3 border-b border-r border-border"
                  style={{ width: '100px' }}
                >
                  {RECEIPT_CONFIRM_LABELS.PAYMENT_METHOD}
                </th>
                <th
                  className="text-left py-2.5 px-3 border-b border-r border-border"
                  style={{ width: '120px' }}
                >
                  {RECEIPT_CONFIRM_LABELS.TRANSACTION_DATE}
                </th>
                <th className="text-left py-2.5 px-3 border-b border-r border-border">
                  {RECEIPT_CONFIRM_LABELS.PAYER}
                </th>
                <th className="text-left py-2.5 px-3 border-b border-r border-border">
                  {RECEIPT_CONFIRM_LABELS.REMARKS}
                </th>
                <th
                  className="text-right py-2.5 px-3 border-b border-r border-border"
                  style={{ width: '120px' }}
                >
                  {RECEIPT_CONFIRM_LABELS.RECEIVABLE}
                </th>
                {!isConfirmed && (
                  <th
                    className="text-center py-2.5 px-3 border-b border-border"
                    style={{ width: '100px' }}
                  >
                    {RECEIPT_CONFIRM_LABELS.CONFIRM}
                  </th>
                )}
                {isConfirmed && (
                  <th
                    className="text-right py-2.5 px-3 border-b border-border"
                    style={{ width: '120px' }}
                  >
                    {RECEIPT_CONFIRM_LABELS.LABEL_8417}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              <tr className="bg-card">
                <td className="py-3 px-3 border-b border-r border-border text-sm">
                  {receiptTypeLabel}
                </td>
                <td className="py-3 px-3 border-b border-r border-border text-sm">
                  {receipt.receipt_date || '-'}
                </td>
                <td className="py-3 px-3 border-b border-r border-border text-sm">
                  {receipt.receipt_account || '-'}
                </td>
                <td className="py-3 px-3 border-b border-r border-border text-sm text-muted-foreground">
                  {receipt.notes || '-'}
                </td>
                <td className="py-3 px-3 border-b border-r border-border text-sm text-right font-medium">
                  NT$ {formatMoney(receipt.receipt_amount || 0)}
                </td>
                {!isConfirmed && (
                  <td className="py-2 px-3 border-b border-border text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleConfirmCorrect}
                        disabled={isConfirming}
                        className="h-8 w-8 p-0 text-morandi-green hover:bg-morandi-green/10"
                        title={RECEIPT_CONFIRM_DIALOG_LABELS.金額正確}
                      >
                        <Check size={18} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowAbnormalInput(true)}
                        disabled={isConfirming}
                        className="h-8 w-8 p-0 text-morandi-red hover:bg-morandi-red/10"
                        title={RECEIPT_CONFIRM_DIALOG_LABELS.金額異常}
                      >
                        <X size={18} />
                      </Button>
                    </div>
                  </td>
                )}
                {isConfirmed && (
                  <td
                    className={cn(
                      'py-3 px-3 border-b border-border text-sm text-right font-medium',
                      receipt.actual_amount !== receipt.receipt_amount && 'text-morandi-red'
                    )}
                  >
                    NT$ {formatMoney(receipt.actual_amount || 0)}
                    {receipt.actual_amount !== receipt.receipt_amount && (
                      <AlertCircle size={14} className="inline ml-1" />
                    )}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>

        {/* 金額異常輸入區 */}
        {showAbnormalInput && (
          <div className="bg-morandi-red/5 border border-morandi-red/20 rounded-lg p-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={16} className="text-morandi-red" />
              <span className="text-sm font-medium text-morandi-red">
                {RECEIPT_CONFIRM_LABELS.PLEASE_ENTER_6193}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm text-muted-foreground">
                  {RECEIPT_CONFIRM_LABELS.LABEL_8417}
                </span>
                <Input
                  type="number"
                  value={abnormalAmount}
                  onChange={e => setAbnormalAmount(e.target.value)}
                  placeholder={RECEIPT_CONFIRM_DIALOG_LABELS.輸入實際金額}
                  className="max-w-[200px]"
                  autoFocus
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAbnormalInput(false)
                  setAbnormalAmount('')
                }}
                className="gap-1"
              >
                <X size={14} />
                {RECEIPT_CONFIRM_LABELS.CANCEL}
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmAbnormal}
                disabled={isConfirming || !abnormalAmount}
                className="bg-morandi-red hover:bg-morandi-red/90 text-white gap-1"
              >
                <Check size={14} />
                {RECEIPT_CONFIRM_LABELS.CONFIRM_9972}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {RECEIPT_CONFIRM_DIALOG_LABELS.確認後將通知建立者(receipt.receipt_number)}
            </p>
          </div>
        )}

        {/* 底部按鈕 */}
        <div className="flex justify-between pt-4 border-t border-border mt-4">
          <div>
            {canDelete && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isDeleting}
                className="gap-2 text-morandi-red border-morandi-red hover:bg-morandi-red hover:text-white"
              >
                <Trash2 size={16} />
                {isDeleting ? RECEIPT_CONFIRM_DIALOG_LABELS.刪除中 : ADD_RECEIPT_DIALOG_LABELS.刪除}
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={handleClose} className="gap-2">
            <X size={16} />
            {RECEIPT_CONFIRM_LABELS.CLOSE}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
