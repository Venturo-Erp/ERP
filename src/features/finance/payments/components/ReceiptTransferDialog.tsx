'use client'

import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import { ArrowRightLeft, Loader2 } from 'lucide-react'
import { useToursSlim, invalidateReceipts } from '@/data'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores'
import { logger } from '@/lib/utils/logger'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils/format-currency'

interface ReceiptTransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 來源收款資訊（已 confirmed 的、要轉到別團） */
  sourceReceipt: {
    id: string
    receipt_number: string
    tour_id: string | null
    order_id?: string | null
    tour_code: string
    tour_name: string
    receipt_amount: number
    actual_amount?: number | null
    fees?: number | null
    payment_method_id: string | null
    payment_method: string
    receipt_type: number
  } | null
  onSuccess?: () => void
}

/**
 * 收款轉移 Dialog（跟 CostTransferDialog 鏡像、視覺一致）
 *
 * 邏輯：不改既有 receipt、改成建兩張新 receipt：
 *   src: tour=來源團、amount=-X、status=pending、pair_id=X
 *   dst: tour=目標團、amount=+X、status=pending、pair_id=X
 * 兩張共用 transferred_pair_id、走 pending → confirmed flow
 */
export function ReceiptTransferDialog({
  open,
  onOpenChange,
  sourceReceipt,
  onSuccess,
}: ReceiptTransferDialogProps) {
  const { items: tours } = useToursSlim()
  const { user } = useAuthStore()
  const { toast } = useToast()
  const [targetTourId, setTargetTourId] = useState('')
  const [transferring, setTransferring] = useState(false)

  // 排除來源團（不能轉給自己）
  const tourOptions = useMemo(() => {
    return tours
      .filter(t => t.id !== sourceReceipt?.tour_id)
      .map(t => ({
        value: t.id,
        label: `${t.code || ''} - ${t.name || ''}`,
      }))
  }, [tours, sourceReceipt?.tour_id])

  const handleTransfer = async () => {
    if (!sourceReceipt || !targetTourId) return
    if (!user?.workspace_id) {
      toast({ title: '轉移失敗', description: '找不到 workspace', variant: 'destructive' })
      return
    }

    const targetTour = tours.find(t => t.id === targetTourId) as
      | { id: string; code?: string | null; name?: string | null }
      | undefined
    if (!targetTour) return

    setTransferring(true)
    try {
      const pairId = crypto.randomUUID()
      const today = new Date().toISOString().split('T')[0]
      const amount = sourceReceipt.receipt_amount

      // 1. 產生兩張 receipt 編號
      const { data: srcReceiptNo, error: srcNoErr } = await supabase.rpc('generate_receipt_no', {
        p_tour_id: sourceReceipt.tour_id || '',
      })
      if (srcNoErr || !srcReceiptNo) throw srcNoErr || new Error('生成來源端收款單號失敗')

      const { data: dstReceiptNo, error: dstNoErr } = await supabase.rpc('generate_receipt_no', {
        p_tour_id: targetTour.id,
      })
      if (dstNoErr || !dstReceiptNo) throw dstNoErr || new Error('生成目標端收款單號失敗')

      // 2. 建 src receipt（來源團、負金額）
      // fees 也帶過去（負）、之前漏複製、刷卡收款轉團後手續費歸零、淨額算錯
      const srcFees = sourceReceipt.fees ? -Number(sourceReceipt.fees) : 0
      const srcPayload = {
        receipt_number: srcReceiptNo,
        workspace_id: user.workspace_id,
        tour_id: sourceReceipt.tour_id,
        tour_name: sourceReceipt.tour_name,
        receipt_date: today,
        payment_date: today,
        payment_method: sourceReceipt.payment_method,
        payment_method_id: sourceReceipt.payment_method_id,
        receipt_type: sourceReceipt.receipt_type,
        receipt_amount: -amount,
        actual_amount: 0,
        fees: srcFees,
        status: 'pending',
        transferred_pair_id: pairId,
        notes: `收款轉移至 ${targetTour.code || ''}`,
        created_by: user.id,
        updated_by: user.id,
        is_active: true,
      }
      const { data: srcReceipt, error: srcErr } = await supabase
        .from('receipts')
        .insert(srcPayload as never)
        .select('id, transferred_pair_id')
        .single()
      if (srcErr || !srcReceipt) throw srcErr || new Error('建來源端收款單失敗')

      // 防守：DB 沒寫進 transferred_pair_id（schema 變動 / RLS 等）→ 立即 rollback
      if (!(srcReceipt as { transferred_pair_id?: string | null }).transferred_pair_id) {
        await supabase
          .from('receipts')
          .delete()
          .eq('id', (srcReceipt as { id: string }).id)
        throw new Error('來源端收款單 transferred_pair_id 寫入失敗、轉移已取消')
      }

      // 3. 建 dst receipt（目標團、正金額）
      const dstFees = sourceReceipt.fees ? Number(sourceReceipt.fees) : 0
      const dstPayload = {
        receipt_number: dstReceiptNo,
        workspace_id: user.workspace_id,
        tour_id: targetTour.id,
        tour_name: targetTour.name || '',
        receipt_date: today,
        payment_date: today,
        payment_method: sourceReceipt.payment_method,
        payment_method_id: sourceReceipt.payment_method_id,
        receipt_type: sourceReceipt.receipt_type,
        receipt_amount: amount,
        actual_amount: 0,
        fees: dstFees,
        status: 'pending',
        transferred_pair_id: pairId,
        notes: `從 ${sourceReceipt.tour_code} 轉入`,
        created_by: user.id,
        updated_by: user.id,
        is_active: true,
      }
      const { data: dstReceipt, error: dstErr } = await supabase
        .from('receipts')
        .insert(dstPayload as never)
        .select('id, transferred_pair_id')
        .single()
      if (dstErr || !dstReceipt) {
        // rollback src
        await supabase
          .from('receipts')
          .delete()
          .eq('id', (srcReceipt as { id: string }).id)
        throw dstErr || new Error('建目標端收款單失敗')
      }

      // 防守：dst 沒寫進 pair_id → rollback 兩邊
      if (!(dstReceipt as { transferred_pair_id?: string | null }).transferred_pair_id) {
        await supabase
          .from('receipts')
          .delete()
          .in('id', [
            (srcReceipt as { id: string }).id,
            (dstReceipt as { id: string }).id,
          ])
        throw new Error('目標端收款單 transferred_pair_id 寫入失敗、轉移已取消')
      }

      // 4. 重算來源 / 目標團的收款統計（pending 狀態 actual_amount=0、不影響數字、
      //    但 invalidate cache 讓 UI 立即抓到新建的兩張）
      try {
        const { recalculateReceiptStats } = await import(
          '@/features/finance/payments/services/receipt-core.service'
        )
        await Promise.all([
          recalculateReceiptStats(sourceReceipt.order_id ?? null, sourceReceipt.tour_id),
          recalculateReceiptStats(null, targetTour.id),
        ])
      } catch (recalcErr) {
        logger.error('轉移後重算統計失敗（不阻擋成功訊息）:', recalcErr)
      }

      // 5. 成功
      await invalidateReceipts()
      toast({
        title: '收款轉移成功',
        description: `已建立 2 張對沖收款單：${sourceReceipt.tour_code} -${formatCurrency(
          amount
        )} / ${targetTour.code} +${formatCurrency(amount)}`,
      })

      setTargetTourId('')
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      logger.error('收款轉移失敗:', error)
      toast({
        title: '轉移失敗',
        description: (error as Error)?.message || '請稍後再試',
        variant: 'destructive',
      })
    } finally {
      setTransferring(false)
    }
  }

  if (!sourceReceipt) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={3} className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft size={18} />
            收款轉移
          </DialogTitle>
        </DialogHeader>

        {/* 來源資訊 */}
        <div className="text-sm text-morandi-secondary mb-2">
          從 <span className="font-medium text-morandi-primary">{sourceReceipt.tour_code}</span>{' '}
          {sourceReceipt.tour_name} 轉移至其他團
        </div>

        {/* 來源金額 */}
        <div className="mb-4 p-3 bg-morandi-container/30 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-morandi-secondary">收款單號</span>
            <span className="text-sm font-medium text-morandi-primary">
              {sourceReceipt.receipt_number}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-morandi-secondary">轉移金額</span>
            <span className="text-base font-semibold text-morandi-gold">
              {formatCurrency(sourceReceipt.receipt_amount)}
            </span>
          </div>
        </div>

        {/* 選擇目標團 */}
        <div className="mb-4">
          <label className="text-sm font-medium text-morandi-primary mb-1 block">
            目標團 <span className="text-morandi-red">*</span>
          </label>
          <Combobox
            options={tourOptions}
            value={targetTourId}
            onChange={setTargetTourId}
            placeholder="搜尋團號或團名..."
            emptyMessage="找不到團"
            className="w-full"
            maxHeight="200px"
          />
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="soft-gold" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            variant="soft-gold"
            onClick={handleTransfer}
            disabled={transferring || !targetTourId}
            className="gap-2"
          >
            {transferring ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ArrowRightLeft size={14} />
            )}
            確認轉移
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
