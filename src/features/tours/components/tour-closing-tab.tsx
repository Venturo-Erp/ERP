'use client'

/**
 * TourClosingTab - 結案頁籤
 * 顯示團的收支明細、利潤計算
 */

import { useMemo, useState, useCallback, useEffect } from 'react'
import { TourOverview } from './tour-overview'
import { TourPayments } from './tour-payments'
import { TourCosts } from './tour-costs'
import {
  FileDown,
  FileText,
  Loader2,
  Lock,
  Unlock,
  TrendingUp,
  HandCoins,
  DollarSign,
  ArrowRight,
  MapPin,
  Calendar,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { AddReceiptDialog } from '@/features/finance/payments/components/AddReceiptDialog'
import { AddRequestDialog } from '@/features/finance/requests/components/AddRequestDialog'
import type { Receipt } from '@/types/receipt.types'
import type { PaymentRequest } from '@/types/finance.types'
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
  useSuppliersSlim,
  updateTour,
} from '@/data'
import { calculateFullProfit } from '../services/profit-calculation.service'
import { useAuthStore } from '@/stores'
import { supabase } from '@/lib/supabase/client'
import { usePaymentMethodsCached } from '@/data/hooks'

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
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null)
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)

  // 資料取得
  const { items: allReceipts } = useReceipts()
  const { items: allPaymentRequests } = usePaymentRequests()
  const { items: allBonusSettings } = useTourBonusSettings()
  const { items: allMembers } = useMembers()
  const { items: allOrders } = useOrdersSlim()
  const { items: allSuppliers } = useSuppliersSlim()
  const { get: getEmployee } = useEmployeeDictionary()
  const { user } = useAuthStore()

  // 供應商 ID → 最新名稱 lookup
  const supplierMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const s of allSuppliers ?? []) map[s.id] = s.name
    return map
  }, [allSuppliers])

  const orders = useMemo(
    () => allOrders?.filter(o => o.tour_id === tour.id) ?? [],
    [allOrders, tour.id]
  )

  const orderIds = useMemo(() => new Set(orders.map(o => o.id)), [orders])

  // 收款明細（全部顯示，狀態依核帳結果）
  const receipts = useMemo(
    () =>
      (allReceipts ?? [])
        .filter(r => r.tour_id === tour.id || (r.order_id && orderIds.has(r.order_id)))
        .sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        ),
    [allReceipts, tour.id, orderIds]
  )

  // 請款明細
  const paymentRequests = useMemo(
    () =>
      (allPaymentRequests ?? [])
        .filter(pr => pr.tour_id === tour.id)
        .filter(pr => {
          const rt = (pr.request_type || '').toLowerCase()
          return !rt.includes('bonus') && !rt.includes('獎金')
        })
        .sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        ),
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
  const confirmedIncome = useMemo(
    () =>
      receipts
        .filter(r => r.status === '1')
        .reduce((sum, r) => sum + (Number(r.actual_amount) || Number(r.receipt_amount) || 0), 0),
    [receipts]
  )
  const estimatedIncome = useMemo(
    () =>
      receipts.reduce(
        (sum, r) => sum + (Number(r.actual_amount) || Number(r.receipt_amount) || 0),
        0
      ),
    [receipts]
  )

  const totalExpense = useMemo(
    () => paymentRequests.reduce((sum, pr) => sum + (Number(pr.amount) || 0), 0),
    [paymentRequests]
  )

  const confirmedProfit = confirmedIncome - totalExpense
  const estimatedProfit = estimatedIncome - totalExpense

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
        status: r.status === '1' ? ('received' as const) : ('pending' as const),
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
    return d.toLocaleDateString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 收款方式對照（SWR 快取）
  const { methods: allPaymentMethods } = usePaymentMethodsCached()
  const paymentMethodMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const pm of allPaymentMethods) map[pm.id] = pm.name
    return map
  }, [allPaymentMethods])

  const PAYMENT_METHOD_LABELS: Record<string, string> = {
    transfer: '匯款',
    cash: '現金',
    card: '刷卡',
    check: '支票',
    linkpay: 'LinkPay',
  }

  return (
    <div className="space-y-6">
      {/* 總覽卡片 — 直接使用 TourOverview */}
      <TourOverview tour={tour} />

      {/* 收款總覽 — 使用共用組件 */}
      <TourPayments tour={tour} showSummary={false} />

      {/* 請款總覽 — 使用共用組件 */}
      <TourCosts tour={tour} showSummary={false} />

      {/* 利潤總覽 + 獎金 */}
      <ProfitTab tour={tour} />
      <BonusSettingTab tour={tour} />

      {/* 結案狀態 + PDF */}
      <div className="flex items-center justify-between bg-card border border-border rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-morandi-primary">結案狀態</span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}
          >
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
            className={
              closingStatus === 'closed'
                ? ''
                : 'bg-morandi-gold hover:bg-morandi-gold-hover text-white'
            }
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

      {/* 收款單 Dialog */}
      <AddReceiptDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        editingReceipt={selectedReceipt}
      />

      {/* 請款單 Dialog */}
      <AddRequestDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        editingRequest={selectedRequest}
      />
    </div>
  )
}
