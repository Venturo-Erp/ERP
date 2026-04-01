'use client'

/**
 * TourClosingTab - 結案頁籤
 * 顯示團的收支明細、利潤計算
 */

import { useMemo, useState, useCallback, useEffect } from 'react'
import { FileDown, Loader2, Lock, Unlock, TrendingUp, TrendingDown, DollarSign, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { formatCurrency } from '@/lib/utils/format-currency'
import { generateTourClosingPDF } from '@/lib/pdf/tour-closing-pdf'
import type { TourClosingPDFData } from '@/lib/pdf/tour-closing-pdf'
import type { Tour } from '@/stores/types'
import { ProfitTab } from './ProfitTab'
import { BonusSettingTab } from './BonusSettingTab'
import {
  useReceipts,
  usePaymentRequests,
  useTourBonusSettings,
  useEmployeeDictionary,
  useMembers,
  useOrdersSlim,
  updateTour,
} from '@/data'
import { calculateFullProfit } from '../services/profit-calculation.service'
import { useAuthStore } from '@/stores'
import { supabase } from '@/lib/supabase/client'

// === 結案狀態 ===
const CLOSING_STATUS_MAP: Record<string, { label: string; color: string }> = {
  open: { label: '進行中', color: 'bg-morandi-gold/20 text-morandi-gold' },
  closing: { label: '結團中', color: 'bg-morandi-gold/20 text-morandi-gold' },
  closed: { label: '已結團', color: 'bg-morandi-green/20 text-morandi-green' },
}

interface TourClosingTabProps {
  tour: Tour
}

export function TourClosingTab({ tour }: TourClosingTabProps) {
  const [pdfLoading, setPdfLoading] = useState(false)

  // 資料取得
  const { items: allReceipts } = useReceipts()
  const { items: allPaymentRequests } = usePaymentRequests()
  const { items: allBonusSettings } = useTourBonusSettings()
  const { items: allMembers } = useMembers()
  const { items: allOrders } = useOrdersSlim()
  const { get: getEmployee } = useEmployeeDictionary()
  const { user } = useAuthStore()

  const orders = useMemo(
    () => allOrders?.filter(o => o.tour_id === tour.id) ?? [],
    [allOrders, tour.id]
  )

  const orderIds = useMemo(() => new Set(orders.map(o => o.id)), [orders])

  // 收款明細（已確認的）
  const receipts = useMemo(
    () => (allReceipts ?? [])
      .filter(r => r.tour_id === tour.id || (r.order_id && orderIds.has(r.order_id)))
      .filter(r => r.status === '1') // 只顯示已確認
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()),
    [allReceipts, tour.id, orderIds]
  )

  // 請款明細
  const paymentRequests = useMemo(
    () => (allPaymentRequests ?? [])
      .filter(pr => pr.tour_id === tour.id)
      .filter(pr => {
        const rt = (pr.request_type || '').toLowerCase()
        return !rt.includes('bonus') && !rt.includes('獎金')
      })
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()),
    [allPaymentRequests, tour.id]
  )

  const bonusSettings = useMemo(
    () => (allBonusSettings ?? []).filter(s => s.tour_id === tour.id),
    [allBonusSettings, tour.id]
  )

  const memberCount = useMemo(
    () => (allMembers ?? []).filter(m => m.order_id && orderIds.has(m.order_id)).length,
    [allMembers, orderIds]
  )

  const employeeDict = useMemo(() => {
    const dict: Record<string, string> = {}
    for (const s of bonusSettings) {
      if (s.employee_id) {
        const emp = getEmployee(s.employee_id)
        dict[s.employee_id] = emp?.display_name || emp?.chinese_name || s.employee_id
      }
    }
    return dict
  }, [bonusSettings, getEmployee])

  // 計算總額
  const totalIncome = useMemo(
    () => receipts.reduce((sum, r) => sum + (Number(r.actual_amount) || Number(r.receipt_amount) || 0), 0),
    [receipts]
  )

  const totalExpense = useMemo(
    () => paymentRequests.reduce((sum, pr) => sum + (Number(pr.amount) || 0), 0),
    [paymentRequests]
  )

  const profit = totalIncome - totalExpense

  // 結案狀態
  const closingStatus = tour.closing_status ?? 'open'
  const statusInfo = CLOSING_STATUS_MAP[closingStatus] ?? CLOSING_STATUS_MAP.open
  const [statusUpdating, setStatusUpdating] = useState(false)

  const handleToggleClosingStatus = useCallback(async () => {
    const nextStatus = closingStatus === 'closed' ? 'open' : 'closed'
    setStatusUpdating(true)
    try {
      await updateTour(tour.id, {
        closing_status: nextStatus,
        ...(nextStatus === 'closed'
          ? { closing_date: new Date().toISOString() }
          : { closing_date: null }),
      })
      toast.success(nextStatus === 'closed' ? '已標記為結團' : '已重新開啟團')
    } catch (err) {
      logger.error('更新結案狀態失敗', err)
      toast.error('狀態更新失敗')
    } finally {
      setStatusUpdating(false)
    }
  }, [closingStatus, tour.id])

  // PDF 生成
  const handleGeneratePDF = async () => {
    setPdfLoading(true)
    try {
      const adaptedReceipts = receipts.map(r => ({
        ...r,
        receipt_number: r.receipt_number ?? '',
        allocation_mode: 'single' as const,
        payment_items: [],
        total_amount: Number(r.receipt_amount) || Number(r.amount) || 0,
        status: r.status === '1' ? 'received' as const : 'pending' as const,
        created_by: r.created_by ?? '',
        updated_at: r.updated_at ?? '',
        created_at: r.created_at ?? '',
      }))

      const profitResult = calculateFullProfit({
        receipts: adaptedReceipts,
        expenses: paymentRequests.map(pr => ({ amount: pr.amount ?? 0 })),
        settings: bonusSettings,
        memberCount,
        employeeDict,
      })

      const pdfData: TourClosingPDFData = {
        tour,
        orders: orders.map(o => ({
          code: o.code,
          contact_person: o.contact_person,
          member_count: o.member_count,
          total_amount: o.total_amount,
        })),
        receipts: receipts.map(r => ({
          receipt_number: r.receipt_number,
          receipt_date: r.receipt_date,
          receipt_amount: Number(r.receipt_amount) || Number(r.amount) || 0,
          amount: Number(r.receipt_amount) || Number(r.amount) || 0,
          payment_method: r.payment_method,
        })),
        costs: paymentRequests,
        profitResult,
        preparedBy: user?.name ?? undefined,
      }

      await generateTourClosingPDF(pdfData)
      toast.success('結案報告 PDF 已生成')
    } catch (err) {
      logger.error('PDF generation failed', err)
      toast.error('PDF 生成失敗')
    } finally {
      setPdfLoading(false)
    }
  }

  // 格式化日期
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
  }

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  // 收款方式對照（從 payment_methods 表載入，以 id 為 key）
  const [paymentMethodMap, setPaymentMethodMap] = useState<Record<string, string>>({})
  useEffect(() => {
    supabase.from('payment_methods').select('id,name').then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {}
        for (const pm of data) map[pm.id] = pm.name
        setPaymentMethodMap(map)
      }
    })
  }, [])

  const PAYMENT_METHOD_LABELS: Record<string, string> = {
    transfer: '匯款',
    cash: '現金',
    card: '刷卡',
    check: '支票',
    linkpay: 'LinkPay',
  }

  return (
    <div className="space-y-6">
      {/* 總覽卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-morandi-green mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">總收入</span>
          </div>
          <div className="text-2xl font-bold text-morandi-green">
            {formatCurrency(totalIncome)}
          </div>
          <div className="text-xs text-morandi-secondary mt-1">
            {receipts.length} 筆收款
          </div>
        </div>

        <div className="bg-white border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-morandi-red mb-2">
            <TrendingDown className="w-4 h-4" />
            <span className="text-sm font-medium">總支出</span>
          </div>
          <div className="text-2xl font-bold text-morandi-red">
            {formatCurrency(totalExpense)}
          </div>
          <div className="text-xs text-morandi-secondary mt-1">
            {paymentRequests.length} 筆請款
          </div>
        </div>

        <div className="bg-white border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-morandi-primary mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm font-medium">淨利潤</span>
          </div>
          <div className={`text-2xl font-bold ${profit >= 0 ? 'text-morandi-green' : 'text-morandi-red'}`}>
            {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
          </div>
          <div className="text-xs text-morandi-secondary mt-1">
            利潤率 {totalIncome > 0 ? ((profit / totalIncome) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {/* 收支明細表 */}
      <div className="bg-white border border-border rounded-lg overflow-x-auto">
        <div className="px-4 py-3 border-b border-border bg-morandi-bg">
          <h3 className="text-sm font-semibold text-morandi-primary">收支明細</h3>
        </div>

        {receipts.length === 0 && paymentRequests.length === 0 ? (
          <div className="px-4 py-12 text-center text-morandi-secondary text-sm">
            尚無收支紀錄
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* 收款區塊 */}
            {receipts.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-morandi-green/10 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-morandi-green" />
                  <span className="text-sm font-medium text-morandi-green">收款 ({receipts.length})</span>
                </div>
                <table className="w-full text-sm table-fixed" style={{ minWidth: 900 }}>
                  <colgroup>
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '5%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '8%' }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border text-xs text-morandi-secondary">
                      <th className="px-4 py-2 text-left font-medium">單號</th>
                      <th className="px-4 py-2 text-left font-medium">收款日期</th>
                      <th className="px-4 py-2 text-left font-medium">收款方式</th>
                      <th className="px-4 py-2 text-left font-medium">收款明細</th>
                      <th className="px-4 py-2 text-left font-medium" colSpan={4}>備註</th>
                      <th className="px-4 py-2 text-left font-medium">狀態</th>
                      <th className="px-4 py-2 text-right font-medium">金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map(r => {
                      const receiptStatus = r.status === '1'
                        ? { label: '已確認', style: 'bg-morandi-green/20 text-morandi-green' }
                        : { label: '待確認', style: 'bg-morandi-secondary/20 text-morandi-secondary' }
                      return (
                      <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-morandi-bg/50">
                        <td className="px-4 py-2 font-medium text-morandi-primary">{r.receipt_number || '-'}</td>
                        <td className="px-4 py-2 text-morandi-secondary">{formatDate(r.receipt_date)}</td>
                        <td className="px-4 py-2 text-morandi-secondary">
                          {(r.payment_method_id && paymentMethodMap[r.payment_method_id]) || PAYMENT_METHOD_LABELS[r.payment_method || ''] || r.payment_method || '-'}
                        </td>
                        <td className="px-4 py-2 text-morandi-secondary">{r.receipt_account || r.payment_name || '-'}</td>
                        <td className="px-4 py-2 text-morandi-secondary" colSpan={4}>{r.notes || '-'}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${receiptStatus.style}`}>
                            {receiptStatus.label}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-green font-medium">
                          +{formatCurrency(Number(r.actual_amount) || Number(r.receipt_amount) || 0)}
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* 請款區塊 */}
            {paymentRequests.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-morandi-red/10 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-morandi-red" />
                  <span className="text-sm font-medium text-morandi-red">請款 ({paymentRequests.length})</span>
                </div>
                <table className="w-full text-sm table-fixed" style={{ minWidth: 900 }}>
                  <colgroup>
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '5%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '8%' }} />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-border text-xs text-morandi-secondary">
                      <th className="px-4 py-2 text-left font-medium">單號</th>
                      <th className="px-4 py-2 text-left font-medium">請款日期</th>
                      <th className="px-4 py-2 text-left font-medium">類別</th>
                      <th className="px-4 py-2 text-left font-medium">供應商</th>
                      <th className="px-4 py-2 text-left font-medium">項目描述</th>
                      <th className="px-4 py-2 text-right font-medium">單價</th>
                      <th className="px-4 py-2 text-right font-medium">數量</th>
                      <th className="px-4 py-2 text-right font-medium">小計</th>
                      <th className="px-4 py-2 text-left font-medium">狀態</th>
                      <th className="px-4 py-2 text-right font-medium">金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentRequests.map(pr => {
                      const items = (pr as unknown as { items?: Array<{ id?: string; category?: string; supplier_name?: string; description?: string; unitprice?: number; quantity?: number; subtotal?: number }> }).items ?? []

                      // 狀態對應
                      const statusMap: Record<string, { label: string; style: string }> = {
                        pending: { label: '待處理', style: 'bg-morandi-secondary/20 text-morandi-secondary' },
                        confirmed: { label: '已確認', style: 'bg-morandi-gold/20 text-morandi-gold' },
                        billed: { label: '已出帳', style: 'bg-morandi-green/20 text-morandi-green' },
                        approved: { label: '已核准', style: 'bg-morandi-gold/20 text-morandi-gold' },
                        paid: { label: '已付', style: 'bg-morandi-green/20 text-morandi-green' },
                      }
                      const statusInfo = statusMap[pr.status || ''] ?? { label: pr.status || '待處理', style: 'bg-morandi-secondary/20 text-morandi-secondary' }

                      if (items.length === 0) {
                        return (
                          <tr key={pr.id} className="border-b border-border last:border-b-0 hover:bg-morandi-bg/50">
                            <td className="px-4 py-2 font-medium text-morandi-primary">{pr.code || '-'}</td>
                            <td className="px-4 py-2 text-morandi-secondary">{formatDate(pr.request_date)}</td>
                            <td className="px-4 py-2 text-morandi-secondary">{pr.request_type || '-'}</td>
                            <td className="px-4 py-2 text-morandi-secondary">{pr.supplier_name || '-'}</td>
                            <td className="px-4 py-2 text-morandi-secondary">{pr.notes || '-'}</td>
                            <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-secondary">-</td>
                            <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-secondary">-</td>
                            <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-secondary">-</td>
                            <td className="px-4 py-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.style}`}>{statusInfo.label}</span>
                            </td>
                            <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-red font-medium">-{formatCurrency(Number(pr.amount) || 0)}</td>
                          </tr>
                        )
                      }

                      return items.map((item, idx) => (
                        <tr key={`${pr.id}-${item.id || idx}`} className="border-b border-border last:border-b-0 hover:bg-morandi-bg/50">
                          {idx === 0 ? (
                            <>
                              <td className="px-4 py-2 font-medium text-morandi-primary" rowSpan={items.length}>{pr.code || '-'}</td>
                              <td className="px-4 py-2 text-morandi-secondary" rowSpan={items.length}>{formatDate(pr.request_date)}</td>
                            </>
                          ) : null}
                          <td className="px-4 py-2 text-morandi-secondary">{item.category || '-'}</td>
                          <td className="px-4 py-2 text-morandi-secondary">{item.supplier_name || '-'}</td>
                          <td className="px-4 py-2 text-morandi-secondary">{item.description || '-'}</td>
                          <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-secondary">{formatCurrency(item.unitprice ?? 0)}</td>
                          <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-secondary">{item.quantity ?? '-'}</td>
                          <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-secondary">{formatCurrency(item.subtotal ?? 0)}</td>
                          {idx === 0 ? (
                            <>
                              <td className="px-4 py-2" rowSpan={items.length}>
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.style}`}>{statusInfo.label}</span>
                              </td>
                              <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-red font-medium" rowSpan={items.length}>-{formatCurrency(Number(pr.amount) || 0)}</td>
                            </>
                          ) : null}
                        </tr>
                      ))
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* 利潤總覽 + 獎金 */}
      <ProfitTab tour={tour} />
      <BonusSettingTab tour={tour} />

      {/* 結案狀態 + PDF */}
      <div className="flex items-center justify-between bg-white border border-border rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-morandi-primary">結案狀態</span>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleGeneratePDF} disabled={pdfLoading}>
            {pdfLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            生成結案報告 PDF
          </Button>
          <Button
            variant={closingStatus === 'closed' ? 'outline' : 'default'}
            onClick={handleToggleClosingStatus}
            disabled={statusUpdating}
            className={closingStatus === 'closed' ? '' : 'bg-morandi-gold hover:bg-morandi-gold-hover text-white'}
          >
            {statusUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : closingStatus === 'closed' ? (
              <Unlock className="h-4 w-4 mr-2" />
            ) : (
              <Lock className="h-4 w-4 mr-2" />
            )}
            {closingStatus === 'closed' ? '重新開啟' : '標記結團'}
          </Button>
        </div>
      </div>
    </div>
  )
}
