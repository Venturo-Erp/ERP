'use client'
/**
 * DisbursementDetailDialog
 * 出納單詳情對話框 - 用於查看詳情和確認出帳
 */

import { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { DisbursementOrder, PaymentRequest } from '@/stores/types'
import {
  usePaymentRequests,
  updatePaymentRequest as updatePaymentRequestApi,
  updateDisbursementOrder as updateDisbursementOrderApi,
  invalidateDisbursementOrders,
} from '@/data'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { DateCell, CurrencyCell } from '@/components/table-cells'
import { DisbursementPrintDialog } from './DisbursementPrintDialog'
import { confirm, alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { DISBURSEMENT_STATUS } from '../constants'
import { DISBURSEMENT_LABELS } from '../constants/labels'
import { recalculateExpenseStats } from '@/features/finance/payments/services/expense-core.service'
import { generateDisbursementPDF } from '@/lib/pdf/disbursement-pdf'

interface DisbursementDetailDialogProps {
  order: DisbursementOrder | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DisbursementDetailDialog({
  order,
  open,
  onOpenChange,
}: DisbursementDetailDialogProps) {
  const { items: payment_requests } = usePaymentRequests()
  const user = useAuthStore(state => state.user)
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)

  // 取得此出納單包含的請款單
  const includedRequests = useMemo(() => {
    if (!order?.payment_request_ids) return []
    return order.payment_request_ids
      .map(id => payment_requests.find(r => r.id === id))
      .filter(Boolean) as PaymentRequest[]
  }, [order, payment_requests])

  if (!order) return null

  const status =
    DISBURSEMENT_STATUS[order.status as keyof typeof DISBURSEMENT_STATUS] ||
    DISBURSEMENT_STATUS.pending

  // 確認出帳（銀行帳戶已在建立時選好）
  const handleConfirmPaid = async () => {
    const confirmed = await confirm(DISBURSEMENT_LABELS.確定要將此出納單標記為_已出帳_嗎, {
      title: DISBURSEMENT_LABELS.確認出帳,
      type: 'warning',
    })
    if (!confirmed) return

    try {
      // 更新出納單狀態
      await updateDisbursementOrderApi(order.id, {
        status: 'paid',
        confirmed_by: user?.id || null,
        confirmed_at: new Date().toISOString(),
      })

      // 更新所有請款單狀態為 billed
      const requestIds = order.payment_request_ids || []
      const tour_ids_to_recalculate = new Set<string>()
      for (const requestId of requestIds) {
        await updatePaymentRequestApi(requestId, {
          status: 'billed',
        })
        const req = payment_requests.find(r => r.id === requestId)
        if (req?.tour_id) {
          tour_ids_to_recalculate.add(req.tour_id)
        }
      }

      // 重算相關團的成本
      for (const tour_id of tour_ids_to_recalculate) {
        await recalculateExpenseStats(tour_id)
      }

      // 自動存檔 PDF
      try {
        const allItems = await supabase
          .from('payment_request_items')
          .select('*')
          .in('request_id', requestIds)
        const blob = await generateDisbursementPDF({
          order: {
            ...order,
            status: 'paid',
            confirmed_by: user?.id || null,
            confirmed_at: new Date().toISOString(),
          },
          paymentRequests: includedRequests,
          paymentRequestItems: (allItems.data ||
            []) as unknown as import('@/stores/types').PaymentRequestItem[],
        })
        const filename = `disbursement/${order.order_number || order.id}.pdf`
        const { error: uploadErr } = await supabase.storage
          .from('documents')
          .upload(filename, blob, { contentType: 'application/pdf', upsert: true })
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filename)
          if (urlData?.publicUrl) {
            await updateDisbursementOrderApi(order.id, {
              pdf_url: urlData.publicUrl,
            } as Partial<DisbursementOrder>)
          }
        }
      } catch (pdfErr) {
        logger.error('Auto-save PDF failed (non-blocking):', pdfErr)
      }

      await alert(DISBURSEMENT_LABELS.出納單已標記為已出帳, 'success')
      onOpenChange(false)
    } catch (error) {
      logger.error(DISBURSEMENT_LABELS.更新出納單失敗_2, error)
      await alert(DISBURSEMENT_LABELS.更新出納單失敗, 'error')
    }
  }

  const handlePrintPDF = () => {
    setIsPrintDialogOpen(true)
  }

  return (
    <>
      {/* 主 Dialog：子 Dialog 開啟時完全不渲染（避免多重遮罩） */}
      {!isPrintDialogOpen && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent level={1} className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl">
                    {DISBURSEMENT_LABELS.出納單} {order.order_number}
                  </DialogTitle>
                  <div className="text-sm text-morandi-muted mt-1 flex items-center gap-1">
                    {DISBURSEMENT_LABELS.出帳日期_label}：
                    <DateCell
                      date={order.disbursement_date}
                      showIcon={false}
                      className="text-morandi-muted"
                    />
                  </div>
                </div>
                <Badge className={cn('text-white', status.color)}>{status.label}</Badge>
              </div>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* 基本資訊 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-morandi-background/50 rounded-lg">
                <InfoItem label={DISBURSEMENT_LABELS.出納單號} value={order.order_number || '-'} />
                <div>
                  <p className="text-xs text-morandi-muted mb-1">
                    {DISBURSEMENT_LABELS.出帳日期_label}
                  </p>
                  <DateCell date={order.disbursement_date} showIcon={false} className="text-sm" />
                </div>
                <InfoItem
                  label={DISBURSEMENT_LABELS.請款單數}
                  value={`${order.payment_request_ids?.length || 0} ${DISBURSEMENT_LABELS.筆}`}
                />
                <div>
                  <p className="text-xs text-morandi-muted mb-1">
                    {DISBURSEMENT_LABELS.總金額_label}
                  </p>
                  <CurrencyCell
                    amount={order.amount || 0}
                    className="font-semibold text-morandi-gold"
                  />
                </div>
              </div>

              {/* 包含的請款單 */}
              <div>
                <h3 className="text-sm font-semibold text-morandi-primary mb-3">
                  {DISBURSEMENT_LABELS.包含請款單} ({includedRequests.length}{' '}
                  {DISBURSEMENT_LABELS.筆})
                </h3>

                <div className="border border-morandi-container/20 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-morandi-background/50 border-b border-morandi-container/20">
                        <th className="text-left py-2 px-3 text-morandi-muted font-medium">
                          {DISBURSEMENT_LABELS.請款單號}
                        </th>
                        <th className="text-left py-2 px-3 text-morandi-muted font-medium">
                          {DISBURSEMENT_LABELS.團號}
                        </th>
                        <th className="text-left py-2 px-3 text-morandi-muted font-medium">
                          {DISBURSEMENT_LABELS.團名}
                        </th>
                        <th className="text-left py-2 px-3 text-morandi-muted font-medium">
                          {DISBURSEMENT_LABELS.請款人}
                        </th>
                        <th className="text-right py-2 px-3 text-morandi-muted font-medium">
                          {DISBURSEMENT_LABELS.金額}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {includedRequests.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-morandi-muted">
                            {DISBURSEMENT_LABELS.無請款單資料}
                          </td>
                        </tr>
                      ) : (
                        includedRequests.map(request => (
                          <tr key={request.id} className="border-b border-morandi-container/10">
                            <td className="py-2 px-3 font-medium text-morandi-primary">
                              {request.code}
                            </td>
                            <td className="py-2 px-3 text-morandi-secondary">
                              {request.tour_code || '-'}
                            </td>
                            <td className="py-2 px-3 text-morandi-secondary max-w-[150px] truncate">
                              {request.tour_name || '-'}
                            </td>
                            <td className="py-2 px-3 text-morandi-secondary">
                              {request.created_by_name || '-'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <CurrencyCell
                                amount={request.amount || 0}
                                className="font-medium text-morandi-gold"
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-morandi-background/50">
                        <td colSpan={4} className="py-3 px-3 text-right font-semibold">
                          {DISBURSEMENT_LABELS.合計}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <CurrencyCell
                            amount={order.amount || 0}
                            className="font-bold text-morandi-gold"
                          />
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* 操作按鈕 */}
              <div className="flex items-center justify-between pt-4 border-t border-morandi-container/20">
                {/* 列印按鈕只在已出帳時顯示 */}
                {order.status === 'paid' && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={handlePrintPDF}
                      className="text-morandi-gold border-morandi-gold hover:bg-morandi-gold/10"
                    >
                      <FileText size={16} className="mr-2" />
                      {DISBURSEMENT_LABELS.列印PDF}
                    </Button>
                    {order.pdf_url && (
                      <a href={order.pdf_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="text-morandi-secondary">
                          {DISBURSEMENT_LABELS.查看存檔}
                        </Button>
                      </a>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  {order.status === 'pending' && (
                    <Button
                      onClick={handleConfirmPaid}
                      className="bg-morandi-green hover:bg-morandi-green/90 text-white"
                    >
                      <Check size={16} className="mr-2" />
                      {DISBURSEMENT_LABELS.確認出帳}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 列印預覽對話框 - 放在外層避免多重遮罩 */}
      <DisbursementPrintDialog
        order={order}
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
      />
    </>
  )
}

// 資訊項目組件
function InfoItem({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div>
      <p className="text-xs text-morandi-muted mb-1">{label}</p>
      <p
        className={`text-sm ${highlight ? 'font-semibold text-morandi-gold' : 'text-morandi-primary'}`}
      >
        {value}
      </p>
    </div>
  )
}
