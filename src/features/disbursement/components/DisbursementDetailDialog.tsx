'use client'
/**
 * DisbursementDetailDialog
 * 出納單詳情對話框 - 用於查看詳情和確認出帳
 */

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import {
  DisbursementOrder,
  PaymentRequest,
  EXPENSE_TYPE_CONFIG,
  CompanyExpenseType,
} from '@/stores/types'
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
  const [paymentMethods, setPaymentMethods] = useState<Array<{ id: string; name: string }>>([])

  // 載入付款方式
  useEffect(() => {
    if (!open || !order) return
    const workspaceId = user?.workspace_id
    if (!workspaceId) return
    supabase
      .from('payment_methods')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .eq('type', 'payment')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => setPaymentMethods(data || []))
  }, [open, order, user?.workspace_id])

  // 取得此出納單包含的請款單（FK 反查）
  const includedRequests = useMemo(() => {
    if (!order?.id) return []
    return payment_requests.filter(r => r.disbursement_order_id === order.id) as PaymentRequest[]
  }, [order, payment_requests])

  // 分類：團體請款 vs 公司請款
  const tourRequests = useMemo(
    () => includedRequests.filter(r => r.request_category !== 'company'),
    [includedRequests]
  )
  const companyRequests = useMemo(
    () => includedRequests.filter(r => r.request_category === 'company'),
    [includedRequests]
  )

  // 付款方式統計
  const paymentMethodStats = useMemo(() => {
    const stats = new Map<string, number>()
    for (const req of includedRequests) {
      const methodId = req.payment_method_id || 'unknown'
      stats.set(methodId, (stats.get(methodId) || 0) + (req.amount || 0))
    }
    return Array.from(stats.entries()).map(([id, amount]) => ({
      name: paymentMethods.find(m => m.id === id)?.name || '未指定',
      amount,
    }))
  }, [includedRequests, paymentMethods])

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
      // 1. 更新出納單狀態（先樂觀寫入、傳票失敗會 revert）
      await updateDisbursementOrderApi(order.id, {
        status: 'paid',
        confirmed_by: user?.id || null,
        confirmed_at: new Date().toISOString(),
      })

      // 2. 自動產生會計傳票（沖應付 / 銀行支出）
      // 傳票失敗 = 會計帳會不平、必須擋下、把出納單狀態 revert 回 pending
      try {
        if (user?.workspace_id) {
          const voucherRes = await fetch('/api/accounting/vouchers/auto-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source_type: 'disbursement_order',
              source_id: order.id,
              workspace_id: user.workspace_id,
            }),
          })
          if (!voucherRes.ok) {
            const errText = await voucherRes.text().catch(() => '')
            throw new Error(`產生會計傳票失敗：${errText || voucherRes.status}`)
          }
        }
      } catch (voucherErr) {
        // revert 出納單狀態、避免留下「已出帳但無傳票」的不平帳資料
        logger.error('產生出納傳票失敗、revert 狀態:', voucherErr)
        await updateDisbursementOrderApi(order.id, {
          status: 'pending',
          confirmed_by: null,
          confirmed_at: null,
        })
        throw voucherErr
      }

      // 3. 更新所有請款單狀態為 billed（從 FK 反查）
      const requestIds = includedRequests.map(r => r.id)
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

      // 4. 重算相關團的成本
      for (const tour_id of tour_ids_to_recalculate) {
        await recalculateExpenseStats(tour_id)
      }

      // 5. 自動存檔 PDF（best-effort、失敗不 revert 但要告訴使用者）
      let pdfFailed = false
      try {
        const allItems = await supabase
          .from('payment_request_items')
          .select(
            'id, request_id, description, quantity, unitprice, subtotal, category, tour_id, supplier_name, sort_order, item_number, notes, workspace_id'
          )
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
        if (uploadErr) throw uploadErr
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filename)
        if (urlData?.publicUrl) {
          await updateDisbursementOrderApi(order.id, {
            pdf_url: urlData.publicUrl,
          } as Partial<DisbursementOrder>)
        }
      } catch (pdfErr) {
        pdfFailed = true
        logger.error('PDF 存檔失敗:', pdfErr)
      }

      await alert(
        pdfFailed
          ? `${DISBURSEMENT_LABELS.出納單已標記為已出帳}（但 PDF 存檔失敗、可從列印按鈕重試）`
          : DISBURSEMENT_LABELS.出納單已標記為已出帳,
        pdfFailed ? 'warning' : 'success'
      )
      onOpenChange(false)
    } catch (error) {
      logger.error(DISBURSEMENT_LABELS.更新出納單失敗_2, error)
      const msg = error instanceof Error ? error.message : DISBURSEMENT_LABELS.更新出納單失敗
      await alert(msg, 'error')
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
                  value={`${includedRequests.length} ${DISBURSEMENT_LABELS.筆}`}
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

              {/* 團體請款 */}
              {tourRequests.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-morandi-primary mb-3">
                    團體請款 ({tourRequests.length} {DISBURSEMENT_LABELS.筆})
                  </h3>
                  <div className="border border-morandi-container/20 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-morandi-gold-header border-b border-border">
                          <th className="text-left py-2.5 px-3 text-xs font-medium text-morandi-primary">
                            {DISBURSEMENT_LABELS.請款單號}
                          </th>
                          <th className="text-left py-2.5 px-3 text-xs font-medium text-morandi-primary">
                            {DISBURSEMENT_LABELS.團名}
                          </th>
                          <th className="text-left py-2.5 px-3 text-xs font-medium text-morandi-primary">
                            付款對象
                          </th>
                          <th className="text-left py-2.5 px-3 text-xs font-medium text-morandi-primary">
                            {DISBURSEMENT_LABELS.請款人}
                          </th>
                          <th className="text-right py-2.5 px-3 text-xs font-medium text-morandi-primary">
                            {DISBURSEMENT_LABELS.金額}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tourRequests.map(request => (
                          <tr key={request.id} className="border-b border-morandi-container/10">
                            <td className="py-2 px-3 font-medium text-morandi-primary">
                              {request.code}
                            </td>
                            <td className="py-2 px-3 text-morandi-secondary max-w-[150px] truncate">
                              {request.tour_code
                                ? `${request.tour_code} - ${request.tour_name || ''}`
                                : '-'}
                            </td>
                            <td className="py-2 px-3 text-morandi-secondary">
                              {request.supplier_name || '-'}
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
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-morandi-background/50">
                          <td colSpan={4} className="py-2.5 px-3 text-right font-semibold text-sm">
                            小計
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <CurrencyCell
                              amount={tourRequests.reduce((s, r) => s + (r.amount || 0), 0)}
                              className="font-bold text-morandi-gold"
                            />
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* 公司請款 */}
              {companyRequests.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-morandi-primary mb-3">
                    公司請款 ({companyRequests.length} {DISBURSEMENT_LABELS.筆})
                  </h3>
                  <div className="border border-morandi-container/20 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-morandi-gold-header border-b border-border">
                          <th className="text-left py-2.5 px-3 text-xs font-medium text-morandi-primary">
                            {DISBURSEMENT_LABELS.請款單號}
                          </th>
                          <th className="text-left py-2.5 px-3 text-xs font-medium text-morandi-primary">
                            支出類別
                          </th>
                          <th className="text-left py-2.5 px-3 text-xs font-medium text-morandi-primary">
                            付款對象
                          </th>
                          <th className="text-left py-2.5 px-3 text-xs font-medium text-morandi-primary">
                            項目說明
                          </th>
                          <th className="text-right py-2.5 px-3 text-xs font-medium text-morandi-primary">
                            {DISBURSEMENT_LABELS.金額}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {companyRequests.map(request => (
                          <tr key={request.id} className="border-b border-morandi-container/10">
                            <td className="py-2 px-3 font-medium text-morandi-primary">
                              {request.code}
                            </td>
                            <td className="py-2 px-3 text-morandi-secondary">
                              {request.expense_type
                                ? EXPENSE_TYPE_CONFIG[request.expense_type as CompanyExpenseType]
                                    ?.name || request.expense_type
                                : '-'}
                            </td>
                            <td className="py-2 px-3 text-morandi-secondary">
                              {request.supplier_name || '-'}
                            </td>
                            <td className="py-2 px-3 text-morandi-secondary max-w-[200px] truncate">
                              {request.notes || '-'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <CurrencyCell
                                amount={request.amount || 0}
                                className="font-medium text-morandi-gold"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-morandi-background/50">
                          <td colSpan={4} className="py-2.5 px-3 text-right font-semibold text-sm">
                            小計
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <CurrencyCell
                              amount={companyRequests.reduce((s, r) => s + (r.amount || 0), 0)}
                              className="font-bold text-morandi-gold"
                            />
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* 無資料 */}
              {includedRequests.length === 0 && (
                <div className="text-center py-8 text-morandi-muted">
                  {DISBURSEMENT_LABELS.無請款單資料}
                </div>
              )}

              {/* 付款方式統計 */}
              {paymentMethodStats.length > 0 && (
                <div className="p-4 bg-morandi-background/50 rounded-lg">
                  <h3 className="text-sm font-semibold text-morandi-primary mb-3">付款方式統計</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {paymentMethodStats.map(stat => (
                      <div key={stat.name} className="flex items-center justify-between">
                        <span className="text-sm text-morandi-secondary">{stat.name}</span>
                        <CurrencyCell
                          amount={stat.amount}
                          className="font-semibold text-morandi-gold"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-morandi-container/30">
                    <span className="text-sm font-semibold text-morandi-primary">
                      {DISBURSEMENT_LABELS.合計}
                    </span>
                    <CurrencyCell
                      amount={order.amount || 0}
                      className="font-bold text-lg text-morandi-gold"
                    />
                  </div>
                </div>
              )}

              {/* 操作按鈕 */}
              <div className="flex items-center justify-between pt-4 border-t border-morandi-container/20">
                {/* 列印按鈕只在已出帳時顯示 */}
                {order.status === 'paid' && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="soft-gold"
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
