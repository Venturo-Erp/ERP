'use client'
/**
 * 收款管理頁面（重構版）
 *
 * 功能：
 * 1. 收款單列表（含 [全部 / 團體收款 / 公司收款] 三 tab）
 * 2. 支援 5 種收款方式（現金/匯款/刷卡/支票/LinkPay）
 * 3. LinkPay 自動生成付款連結
 * 4. 會計確認實收金額流程
 * 5. Realtime 即時同步
 */

import { logger } from '@/lib/utils/logger'
import { useAuthStore } from '@/stores'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
import { UnauthorizedPage } from '@/components/unauthorized-page'
import { ModuleLoading } from '@/components/module-loading'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { FinanceLabels } from '../constants/labels'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Button } from '@/components/ui/button'
import { TableColumn } from '@/components/ui/enhanced-table'
import { Plus, Edit2, CheckSquare, Loader2, Undo2, Printer } from 'lucide-react'
import { alert } from '@/lib/ui/alert-dialog'
import { DateCell, StatusCell, ActionCell, CurrencyCell } from '@/components/table-cells'

type ReceiptTabValue = 'all' | 'tour' | 'company'

interface ReceiptTabConfig {
  value: ReceiptTabValue
  label: string
}

// 團體收款 = 有 tour_id（直接綁團、或有 order_id 透過 order 綁團）
function isTourReceipt(r: Receipt): boolean {
  return !!r.tour_id || !!r.order_id
}

// 公司收款 = 沒綁 tour 也沒綁 order（公司其他進帳：退稅、利息、佣金等）
function isCompanyReceipt(r: Receipt): boolean {
  return !r.tour_id && !r.order_id
}

// Dynamic imports for dialogs (reduce initial bundle)
const AddReceiptDialog = dynamic(
  () => import('@/features/finance/payments').then(m => m.AddReceiptDialog),
  { loading: () => null }
)
const BatchReceiptDialog = dynamic(
  () => import('@/features/finance/payments').then(m => m.BatchReceiptDialog),
  { loading: () => null }
)
const RefundReceiptDialog = dynamic(
  () => import('@/features/finance/payments').then(m => m.RefundReceiptDialog),
  { loading: () => null }
)
const ReceiptPrintDialog = dynamic(
  () => import('@/features/finance/payments').then(m => m.ReceiptPrintDialog),
  { loading: () => null }
)

// Hooks
import { usePaymentData } from './hooks/usePaymentData'

// Utils

// Types
import type { Receipt, ReceiptItem } from '@/stores'

export default function PaymentsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // 資料與業務邏輯
  const {
    receipts,
    availableOrders,
    loading,
    invalidateReceipts,
    handleCreateReceipt,
    handleConfirmReceipt,
    handleUpdateReceipt,
    handleDeleteReceipt,
  } = usePaymentData()
  const { user } = useAuthStore()
  const { can, loading: permLoading } = useCapabilities()

  // 讀取 URL 參數（從快速收款按鈕傳入）
  const urlOrderId = searchParams.get('order_id')
  const urlTourId = searchParams.get('tour_id')

  // UI 狀態
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false)
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null)
  const [refundingReceipt, setRefundingReceipt] = useState<Receipt | null>(null)
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false)
  const [printingReceipt, setPrintingReceipt] = useState<Receipt | null>(null)
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ReceiptTabValue>('all')

  // 根據 capability 顯示 tab
  const canTour = can(CAPABILITIES.FINANCE_READ_PAYMENTS)
  const canCompany = can(CAPABILITIES.FINANCE_READ_PAYMENTS_COMPANY)

  const visibleTabs = useMemo<ReceiptTabConfig[]>(() => {
    const tabs: ReceiptTabConfig[] = []
    if (canTour || canCompany) tabs.push({ value: 'all', label: '全部' })
    if (canTour) tabs.push({ value: 'tour', label: '團體收款' })
    if (canCompany) tabs.push({ value: 'company', label: '公司收款' })
    return tabs
  }, [canTour, canCompany])

  // Tab filter + 預設排序：待確認優先 + 日期最早優先（讓 user 看到最遠還沒處理的）
  const filteredByTab = useMemo(() => {
    let list: typeof receipts
    if (activeTab === 'all') {
      list = receipts.filter(r => {
        if (canTour && isTourReceipt(r)) return true
        if (canCompany && isCompanyReceipt(r)) return true
        return false
      })
    } else if (activeTab === 'tour') list = receipts.filter(isTourReceipt)
    else if (activeTab === 'company') list = receipts.filter(isCompanyReceipt)
    else list = receipts

    return [...list].sort((a, b) => {
      // 1. status='pending'（待確認）排前
      const aPending = a.status === 'pending' ? 0 : 1
      const bPending = b.status === 'pending' ? 0 : 1
      if (aPending !== bPending) return aPending - bPending
      // 2. 同 status 內、receipt_date 早的在前
      const aDate = a.receipt_date ? new Date(a.receipt_date).getTime() : 0
      const bDate = b.receipt_date ? new Date(b.receipt_date).getTime() : 0
      return aDate - bDate
    })
  }, [receipts, activeTab, canTour, canCompany])

  // 如果有 URL 參數，自動開啟新增對話框
  useEffect(() => {
    if (urlOrderId) {
      setIsDialogOpen(true)
    }
  }, [urlOrderId])

  // 當對話框關閉時，清除 URL 參數和編輯狀態
  const handleAddDialogClose = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setEditingReceipt(null)
      if (urlOrderId) {
        // 清除 URL 參數，避免重新開啟
        router.replace('/finance/payments')
      }
    }
  }

  // 載入收款單進行編輯
  const loadReceiptForEdit = useCallback((receipt: Receipt) => {
    setEditingReceipt(receipt)
    setIsDialogOpen(true)
  }, [])

  // 處理列點擊 - 開啟編輯對話框
  const handleRowClick = useCallback(
    (receipt: Receipt) => {
      loadReceiptForEdit(receipt)
    },
    [loadReceiptForEdit]
  )

  const handleSubmit = async (data: { selectedOrderId: string; paymentItems: ReceiptItem[] }) => {
    try {
      await handleCreateReceipt(data)
      setIsDialogOpen(false)
    } catch (error) {
      logger.error(FinanceLabels.createReceiptFailedPrefix + ':', error)
      void alert(FinanceLabels.createReceiptFailedTitle, 'error')
    }
  }

  // 表格欄位（widths 帶 px 單位、tour_name 不設 width、由 table-fixed 自動吃剩餘空間、跟旅遊團列表一致）
  const columns: TableColumn<Receipt>[] = [
    { key: 'receipt_number', label: FinanceLabels.receiptNumber, sortable: true, width: '140px' },
    {
      key: 'receipt_date',
      label: FinanceLabels.receiptDate,
      sortable: true,
      width: '90px',
      render: value => <DateCell date={String(value)} showIcon={false} />,
    },
    {
      key: 'receipt_account',
      label: FinanceLabels.orderNumber,
      width: '90px',
      // 收款明細：未核准灰色、核准後黑色（跟其他資料一樣）
      render: (value, row) => {
        const info = String(value || '-')
        const cls = row.status === 'confirmed' ? 'text-morandi-primary' : 'text-morandi-secondary'
        return <span className={`text-sm ${cls}`}>{info}</span>
      },
    },
    { key: 'tour_name', label: FinanceLabels.tourName, sortable: true, width: '200px' },
    {
      key: 'receipt_amount',
      label: FinanceLabels.receiptAmount,
      sortable: true,
      width: '120px',
      render: value => (
        <div className="whitespace-nowrap">
          <CurrencyCell amount={Number(value)} />
        </div>
      ),
    },
    {
      key: 'actual_amount',
      label: FinanceLabels.actualAmount,
      sortable: true,
      width: '120px',
      // 實收金額：核准前顯示灰色短 dash
      render: (value, row) => {
        if (row.status !== 'confirmed') {
          return <span className="text-morandi-muted text-sm">-</span>
        }
        return (
          <div className="whitespace-nowrap">
            <CurrencyCell amount={Number(value) || 0} />
          </div>
        )
      },
    },
    {
      key: 'payment_method_id',
      label: FinanceLabels.paymentMethod,
      width: '80px',
      // SSOT：唯一真相是 payment_methods.name (FK join)
      // 抓不到顯示「-」、不再用 5 大類中文 fallback 污染
      render: (_, row) => (
        <span className="text-sm">{row.payment_methods?.name || '-'}</span>
      ),
    },
    {
      key: 'status',
      label: FinanceLabels.status,
      width: '75px',
      render: value => <StatusCell type="receipt" status={String(value)} />,
    },
    {
      key: 'actions',
      label: FinanceLabels.actions,
      width: '220px',
      render: (_, row) => (
        <div className="flex items-center gap-1 whitespace-nowrap">
          {/* 待確認狀態：顯示核准按鈕 */}
          {row.status === 'pending' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async e => {
                e.stopPropagation()
                await handleConfirmReceipt(row.id)
                await invalidateReceipts()
              }}
              className="h-7 px-2 text-xs text-morandi-green hover:text-morandi-green hover:bg-morandi-green/10"
            >
              <CheckSquare size={14} className="mr-1" />
              核准
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation()
              loadReceiptForEdit(row)
            }}
            className="h-7 px-2 text-xs text-morandi-secondary hover:text-morandi-primary"
          >
            <Edit2 size={14} className="mr-1" />
            {row.status === 'confirmed' ? FinanceLabels.view : FinanceLabels.edit}
          </Button>
          {/* 退款按鈕：已確認且未退款才顯示 */}
          {row.status === 'confirmed' && !row.refunded_at && (
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                setRefundingReceipt(row)
                setIsRefundDialogOpen(true)
              }}
              className="h-7 px-2 text-xs text-morandi-red hover:text-morandi-red hover:bg-morandi-red/10"
            >
              <Undo2 size={14} className="mr-1" />
              退款
            </Button>
          )}
          {/* 列印收據按鈕：已確認 / 已退款都能印 */}
          {(row.status === 'confirmed' || row.status === 'refunded') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                setPrintingReceipt(row)
                setIsPrintDialogOpen(true)
              }}
              className="h-7 px-2 text-xs text-morandi-secondary hover:text-morandi-primary"
            >
              <Printer size={14} className="mr-1" />
              收據
            </Button>
          )}
        </div>
      ),
    },
  ]

  if (permLoading) return null  // ModuleGuard 已在外層顯示 loading
  if (!canTour && !canCompany) return <UnauthorizedPage />

  return (
    <>
      <ListPageLayout
        title={FinanceLabels.paymentManagement}
        data={filteredByTab}
        loading={loading}
        columns={columns}
        searchFields={['receipt_number', 'tour_name']}
        searchPlaceholder={FinanceLabels.searchReceiptPlaceholder}
        onRowClick={handleRowClick}
        // 不設 defaultSort、用 filteredByTab 已經 sort 過的順序（status pending → 日期 asc）
        initialPageSize={15}
        primaryAction={{
          label: FinanceLabels.addPayment,
          icon: Plus,
          onClick: () => setIsDialogOpen(true),
        }}
        statusTabs={visibleTabs.length > 1 ? visibleTabs : undefined}
        activeStatusTab={activeTab}
        onStatusTabChange={tab => setActiveTab(tab as ReceiptTabValue)}
      />

      {/* 新增/編輯收款對話框 */}
      <AddReceiptDialog
        open={isDialogOpen}
        onOpenChange={handleAddDialogClose}
        onSuccess={invalidateReceipts}
        defaultOrderId={urlOrderId || undefined}
        defaultTourId={urlTourId || undefined}
        editingReceipt={editingReceipt}
        onUpdate={handleUpdateReceipt}
        onDelete={handleDeleteReceipt}
      />

      {/* 批量收款對話框 */}
      <BatchReceiptDialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen} />

      {/* 退款對話框 */}
      <RefundReceiptDialog
        open={isRefundDialogOpen}
        onOpenChange={setIsRefundDialogOpen}
        receipt={refundingReceipt}
        onSuccess={() => {
          invalidateReceipts()
          setRefundingReceipt(null)
        }}
      />

      {/* 列印收據對話框 */}
      <ReceiptPrintDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        receipt={printingReceipt}
      />
    </>
  )
}
