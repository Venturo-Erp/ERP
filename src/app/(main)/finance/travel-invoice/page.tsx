'use client'

/**
 * 代轉發票管理頁面
 * 使用 ListPageLayout 統一佈局
 */

import { useEffect, useState, useMemo } from 'react'
import { FileText, Eye, ListChecks } from 'lucide-react'
import { useAuthStore } from '@/stores'
import { UnauthorizedPage } from '@/components/unauthorized-page'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { TableColumn as Column } from '@/components/ui/enhanced-table'
import { ContentContainer } from '@/components/layout/content-container'
import { Button } from '@/components/ui/button'
import { useTravelInvoiceStore, TravelInvoice } from '@/stores/travel-invoice-store'
import { useToursListSlim } from '@/hooks/useListSlim'
import { StatusCell, DateCell, CurrencyCell, ActionCell } from '@/components/table-cells'
import { InvoiceDialog } from '@/features/finance/components/invoice-dialog'
import { TravelInvoiceDetailDialog } from './components/TravelInvoiceDetailDialog'
import { BatchInvoiceDialog } from '@/features/finance/travel-invoice/components/BatchInvoiceDialog'
import { TRAVEL_INVOICE_LABELS } from './constants/labels'
import { ContentPageLayout } from '@/components/layout/content-page-layout'

// 狀態標籤定義
const statusTabs = [
  { value: 'all', label: TRAVEL_INVOICE_LABELS.STATUS_ALL },
  { value: 'pending', label: TRAVEL_INVOICE_LABELS.STATUS_PENDING },
  { value: 'scheduled', label: TRAVEL_INVOICE_LABELS.STATUS_SCHEDULED },
  { value: 'issued', label: TRAVEL_INVOICE_LABELS.STATUS_ISSUED },
  { value: 'voided', label: TRAVEL_INVOICE_LABELS.STATUS_VOIDED },
  { value: 'allowance', label: TRAVEL_INVOICE_LABELS.STATUS_ALLOWANCE },
  { value: 'failed', label: TRAVEL_INVOICE_LABELS.STATUS_FAILED },
]

export default function TravelInvoicePage() {
  const isAdmin = useAuthStore(state => state.isAdmin)
  const { invoices, isLoading, error, fetchInvoices } = useTravelInvoiceStore()
  const { items: tours } = useToursListSlim()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<TravelInvoice | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false)

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  if (!isAdmin) return <UnauthorizedPage />


  // 轉換 tours 為 Combobox 選項格式
  const tourOptions = useMemo(() => {
    return tours.map(tour => ({
      value: tour.id,
      label: `${tour.code} - ${tour.name}`,
    }))
  }, [tours])

  // 表格欄位定義
  const columns: Column<TravelInvoice>[] = [
    {
      key: 'transactionNo',
      label: TRAVEL_INVOICE_LABELS.COL_TRANSACTION_NO,
      width: '160px',
      render: (value: unknown, row: TravelInvoice) => (
        <div>
          <div className="font-medium text-morandi-primary">{String(value)}</div>
          <div className="text-xs text-morandi-secondary">
            {row.invoice_number || TRAVEL_INVOICE_LABELS.NO_INVOICE_NUMBER}
          </div>
        </div>
      ),
    },
    {
      key: 'invoice_date',
      label: TRAVEL_INVOICE_LABELS.COL_INVOICE_DATE,
      width: '120px',
      render: (value: unknown) => <DateCell date={value as string} />,
    },
    {
      key: 'buyerInfo',
      label: TRAVEL_INVOICE_LABELS.COL_BUYER,
      width: '150px',
      render: (value: unknown) => (
        <span className="text-morandi-primary">
          {(value as { buyerName?: string })?.buyerName || '-'}
        </span>
      ),
    },
    {
      key: 'total_amount',
      label: TRAVEL_INVOICE_LABELS.COL_AMOUNT,
      width: '120px',
      align: 'right',
      render: (value: unknown) => <CurrencyCell amount={value as number} />,
    },
    {
      key: 'status',
      label: TRAVEL_INVOICE_LABELS.COL_STATUS,
      width: '100px',
      render: (value: unknown) => <StatusCell type="invoice" status={String(value)} />,
    },
  ]

  // 開啟詳情 Dialog
  const handleViewDetail = (invoice: TravelInvoice) => {
    setSelectedInvoice(invoice)
    setIsDetailOpen(true)
  }

  // 操作按鈕
  const renderActions = (row: TravelInvoice) => (
    <ActionCell
      actions={[
        {
          icon: Eye,
          label: TRAVEL_INVOICE_LABELS.VIEW,
          onClick: () => handleViewDetail(row),
        },
      ]}
    />
  )

  // 點擊行開啟詳情
  const handleRowClick = (row: TravelInvoice) => {
    handleViewDetail(row)
  }

  // 新增發票 - 改用懸浮視窗
  const handleAdd = () => {
    setIsDialogOpen(true)
  }

  if (error) {
    return (
      <ContentPageLayout title={TRAVEL_INVOICE_LABELS.MANAGE_1246} icon={FileText}>
        <ContentContainer>
          <div className="text-center py-12">
            <p className="text-status-danger">{error}</p>
          </div>
        </ContentContainer>
      </ContentPageLayout>
    )
  }

  return (
    <>
      <ListPageLayout<TravelInvoice>
        title={TRAVEL_INVOICE_LABELS.MANAGE_1246}
        icon={FileText}
        data={invoices || []}
        loading={isLoading}
        columns={columns}
        searchFields={['transactionNo', 'invoice_number']}
        searchPlaceholder={TRAVEL_INVOICE_LABELS.SEARCH_PLACEHOLDER}
        statusTabs={statusTabs}
        statusField="status"
        onAdd={handleAdd}
        addLabel={TRAVEL_INVOICE_LABELS.ADD_INVOICE}
        onRowClick={handleRowClick}
        renderActions={renderActions}
        headerActions={
          <Button variant="outline" onClick={() => setIsBatchDialogOpen(true)} className="gap-2">
            <ListChecks size={16} />
            {TRAVEL_INVOICE_LABELS.LABEL_1677}
          </Button>
        }
      />

      {/* 開立發票懸浮視窗 */}
      <InvoiceDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

      {/* 發票詳情 Dialog */}
      <TravelInvoiceDetailDialog
        invoice={selectedInvoice}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />

      {/* 批次開立 Dialog */}
      <BatchInvoiceDialog
        open={isBatchDialogOpen}
        onOpenChange={setIsBatchDialogOpen}
        tours={tourOptions}
        onSuccess={() => {
          fetchInvoices()
        }}
      />
    </>
  )
}
