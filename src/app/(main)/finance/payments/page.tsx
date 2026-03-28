'use client'
/**
 * 收款管理頁面（重構版）
 *
 * 功能：
 * 1. 收款單列表
 * 2. 支援 5 種收款方式（現金/匯款/刷卡/支票/LinkPay）
 * 3. LinkPay 自動生成付款連結
 * 4. 會計確認實收金額流程
 * 5. Realtime 即時同步
 */

import { logger } from '@/lib/utils/logger'
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { FinanceLabels, PAYMENT_METHOD_MAP } from '../constants/labels'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Button } from '@/components/ui/button'
import { TableColumn } from '@/components/ui/enhanced-table'
import { Plus, FileDown, Layers, Edit2, CheckSquare, Loader2 } from 'lucide-react'
import { alert } from '@/lib/ui/alert-dialog'
import { DateCell, StatusCell, ActionCell, CurrencyCell } from '@/components/table-cells'

// Dynamic imports for dialogs (reduce initial bundle)
const BatchConfirmReceiptDialog = dynamic(
  () => import('./components').then(m => m.BatchConfirmReceiptDialog),
  { loading: () => null }
)
const ReceiptConfirmDialog = dynamic(
  () => import('@/features/finance/payments').then(m => m.ReceiptConfirmDialog),
  /* eslint-disable venturo/no-custom-modal -- 動態載入時的 loading 狀態 */
  {
    loading: () => (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9000]">
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    ),
  }
)
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
import { useAuthStore } from '@/stores'

// Utils
import { exportReceiptsToExcel } from '@/lib/excel/receipt-excel'

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

  // 檢查是否為可批量確認的角色（管理員、會計、超級管理員）
  const canBatchConfirm = user?.roles?.some(role =>
    ['super_admin', 'admin', 'accountant'].includes(role)
  )

  // 讀取 URL 參數（從快速收款按鈕傳入）
  const urlOrderId = searchParams.get('order_id')

  // UI 狀態
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false)
  const [isBatchConfirmDialogOpen, setIsBatchConfirmDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null)
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null)

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

  // 同步 selectedReceipt（確認後更新狀態）
  useEffect(() => {
    if (selectedReceipt && receipts.length > 0) {
      const updated = receipts.find(r => r.id === selectedReceipt.id)
      if (updated && updated.status !== selectedReceipt.status) {
        setSelectedReceipt(updated)
      }
    }
  }, [receipts, selectedReceipt])

  // 事件處理（會計確認對話框用）
  const handleViewDetail = useCallback((receipt: Receipt) => {
    setSelectedReceipt(receipt)
    setIsDetailDialogOpen(true)
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

  const handleExportExcel = () => {
    exportReceiptsToExcel(receipts)
  }

  // 表格欄位
  const columns: TableColumn<Receipt>[] = [
    { key: 'receipt_number', label: FinanceLabels.receiptNumber, sortable: true },
    {
      key: 'receipt_date',
      label: FinanceLabels.receiptDate,
      sortable: true,
      render: value => <DateCell date={String(value)} />,
    },
    { key: 'order_number', label: FinanceLabels.orderNumber, sortable: true },
    { key: 'tour_name', label: FinanceLabels.tourName, sortable: true },
    {
      key: 'receipt_amount',
      label: FinanceLabels.receiptAmount,
      sortable: true,
      render: value => <CurrencyCell amount={Number(value)} />,
    },
    {
      key: 'actual_amount',
      label: FinanceLabels.actualAmount,
      sortable: true,
      render: value => <CurrencyCell amount={Number(value) || 0} />,
    },
    {
      key: 'payment_method',
      label: FinanceLabels.paymentMethod,
      render: value => (
        <span className="text-sm">{PAYMENT_METHOD_MAP[String(value)] || String(value || '-')}</span>
      ),
    },
    {
      key: 'status',
      label: FinanceLabels.status,
      render: value => <StatusCell type="receipt" status={String(value)} />,
    },
    {
      key: 'actions',
      label: FinanceLabels.actions,
      render: (_, row) => (
        <ActionCell
          actions={[
            { icon: Edit2, label: FinanceLabels.edit, onClick: () => loadReceiptForEdit(row) },
          ]}
        />
      ),
    },
  ]

  return (
    <>
      <ListPageLayout
        title={FinanceLabels.paymentManagement}
        data={receipts}
        loading={loading}
        columns={columns}
        searchFields={['receipt_number', 'order_number', 'tour_name']}
        searchPlaceholder={FinanceLabels.searchReceiptPlaceholder}
        onRowClick={handleRowClick}
        defaultSort={{ key: 'receipt_date', direction: 'desc' }}
        initialPageSize={30}
        headerActions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="text-morandi-secondary"
            >
              <FileDown size={16} className="mr-2" />
              {FinanceLabels.exportExcel}
            </Button>
            {canBatchConfirm && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsBatchConfirmDialogOpen(true)}
                className="text-morandi-gold border-morandi-gold hover:bg-morandi-gold/10"
              >
                <CheckSquare size={16} className="mr-2" />
                {FinanceLabels.batchConfirm}
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setIsBatchDialogOpen(true)}
              className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
            >
              <Layers size={16} className="mr-2" />
              {FinanceLabels.batchPayment}
            </Button>
            <Button
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
            >
              <Plus size={16} className="mr-2" />
              {FinanceLabels.addPayment}
            </Button>
          </div>
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

      {/* 批量確認收款對話框 */}
      <BatchConfirmReceiptDialog
        open={isBatchConfirmDialogOpen}
        onOpenChange={setIsBatchConfirmDialogOpen}
        onSuccess={invalidateReceipts}
      />

      {/* 收款單確認對話框 */}
      <ReceiptConfirmDialog
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        receipt={selectedReceipt}
        onConfirm={handleConfirmReceipt}
        onSuccess={invalidateReceipts}
      />
    </>
  )
}
