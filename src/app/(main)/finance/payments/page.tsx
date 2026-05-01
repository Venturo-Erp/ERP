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
import { cn } from '@/lib/utils'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Button } from '@/components/ui/button'
import { TableColumn } from '@/components/ui/enhanced-table'
import { Plus, Edit2, CheckSquare, Loader2 } from 'lucide-react'
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

// Hooks
import { usePaymentData } from './hooks/usePaymentData'

// Utils

// Types
import type { Receipt, ReceiptItem } from '@/stores'
import { useTranslations } from 'next-intl'

export default function PaymentsPage() {
  const t = useTranslations('finance')

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

  // UI 狀態
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false)
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null)
  const [activeTab, setActiveTab] = useState<ReceiptTabValue>('all')

  // 根據 capability 顯示 tab
  const canTour = can(CAPABILITIES.FINANCE_READ_PAYMENTS)
  const canCompany = can(CAPABILITIES.FINANCE_READ_PAYMENTS_COMPANY)

  const visibleTabs = useMemo<ReceiptTabConfig[]>(() => {
    const tabs: ReceiptTabConfig[] = []
    if (canTour || canCompany) tabs.push({ value: 'all', label: '全部' })
    if (canTour) tabs.push({ value: 'tour', label: '🧳 團體收款' })
    if (canCompany) tabs.push({ value: 'company', label: '🏢 公司收款' })
    return tabs
  }, [canTour, canCompany])

  // Tab filter
  const filteredByTab = useMemo(() => {
    if (activeTab === 'all') {
      return receipts.filter(r => {
        if (canTour && isTourReceipt(r)) return true
        if (canCompany && isCompanyReceipt(r)) return true
        return false
      })
    }
    if (activeTab === 'tour') return receipts.filter(isTourReceipt)
    if (activeTab === 'company') return receipts.filter(isCompanyReceipt)
    return receipts
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
      logger.error(t('finance.createReceiptFailedPrefix') + ':', error)
      void alert(t('finance.createReceiptFailedTitle'), 'error')
    }
  }

  // 表格欄位
  const columns: TableColumn<Receipt>[] = [
    { key: 'receipt_number', label: t('finance.receiptNumber'), sortable: true, width: '155' },
    {
      key: 'receipt_date',
      label: t('finance.receiptDate'),
      sortable: true,
      width: '85',
      render: value => <DateCell date={String(value)} showIcon={false} />,
    },
    {
      key: 'receipt_account',
      label: t('finance.orderNumber'),
      width: '120',
      render: value => {
        const info = String(value || '-')
        return <span className="text-sm text-morandi-secondary">{info}</span>
      },
    },
    { key: 'tour_name', label: t('finance.tourName'), sortable: true },
    {
      key: 'receipt_amount',
      label: t('finance.receiptAmount'),
      sortable: true,
      width: '130',
      render: value => (
        <div className="whitespace-nowrap">
          <CurrencyCell amount={Number(value)} />
        </div>
      ),
    },
    {
      key: 'actual_amount',
      label: t('finance.actualAmount'),
      sortable: true,
      width: '130',
      render: value => (
        <div className="whitespace-nowrap">
          <CurrencyCell amount={Number(value) || 0} />
        </div>
      ),
    },
    {
      key: 'payment_method',
      label: t('finance.paymentMethod'),
      width: '80',
      render: value => (
        <span className="text-sm">{PAYMENT_METHOD_MAP[String(value)] || String(value || '-')}</span>
      ),
    },
    {
      key: 'status',
      label: t('finance.status'),
      width: '110',
      render: value => <StatusCell type="receipt" status={String(value)} />,
    },
    {
      key: 'actions',
      label: t('finance.actions'),
      width: '220',
      render: (_, row) => (
        <div className="flex items-center gap-1 whitespace-nowrap">
          {/* 待確認狀態：顯示核准按鈕 */}
          {row.status === 'pending' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async e => {
                e.stopPropagation()
                await handleConfirmReceipt(row.id, row.receipt_amount || 0)
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
            {row.status === 'confirmed' ? t('finance.view') : t('finance.edit')}
          </Button>
        </div>
      ),
    },
  ]

  if (permLoading) return <ModuleLoading fullscreen />
  if (!canTour && !canCompany) return <UnauthorizedPage />

  return (
    <>
      <ListPageLayout
        title={t('finance.paymentManagement')}
        data={filteredByTab}
        loading={loading}
        columns={columns}
        searchFields={['receipt_number', 'tour_name']}
        searchPlaceholder={t('finance.searchReceiptPlaceholder')}
        onRowClick={handleRowClick}
        defaultSort={{ key: 'receipt_date', direction: 'desc' }}
        initialPageSize={15}
        headerActions={
          <Button variant="soft-gold" onClick={() => setIsDialogOpen(true)}>
            <Plus size={16} />
            {t('finance.addPayment')}
          </Button>
        }
        beforeTable={
          visibleTabs.length > 1 ? (
            <div className="flex items-center gap-1 border-b border-border mb-4">
              {visibleTabs.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium transition-colors border-b-2',
                    activeTab === tab.value
                      ? 'text-morandi-gold border-morandi-gold'
                      : 'text-morandi-secondary border-transparent hover:text-morandi-primary hover:border-morandi-container'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null
        }
      />

      {/* 新增/編輯收款對話框 */}
      <AddReceiptDialog
        open={isDialogOpen}
        onOpenChange={handleAddDialogClose}
        onSuccess={invalidateReceipts}
        defaultOrderId={urlOrderId || undefined}
        editingReceipt={editingReceipt}
        onUpdate={handleUpdateReceipt}
        onDelete={handleDeleteReceipt}
      />

      {/* 批量收款對話框 */}
      <BatchReceiptDialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen} />
    </>
  )
}
