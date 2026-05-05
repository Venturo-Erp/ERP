'use client'
/**
 * DisbursementPage
 * 出納單管理主頁面
 *
 * 設計理念：
 * - 單一列表：全部出納單一覽、分類顯示在欄位內
 * - 點 pending 列 → 編輯 / 點 paid 列 → 詳情
 * - 分類差異化在「預覽」（PrintDisbursementPreview）時才呈現
 */

import { useCallback, useState, useMemo } from 'react'
import { Plus, Wallet } from 'lucide-react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Button } from '@/components/ui/button'
import { StatusBadge, type StatusTone } from '@/components/ui/status-badge'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import {
  usePaymentRequests,
  usePaymentRequestItems,
  useDisbursementOrders,
  deleteDisbursementOrder as deleteDisbursementOrderApi,
  updateDisbursementOrder as updateDisbursementOrderApi,
  updatePaymentRequest as updatePaymentRequestApi,
  invalidatePaymentRequests,
  invalidateDisbursementOrders,
} from '@/data'
import { DateCell, CurrencyCell } from '@/components/table-cells'
import { DisbursementOrder, PaymentRequest } from '@/stores/types'
import { cn } from '@/lib/utils'
import { CreateDisbursementDialog } from './CreateDisbursementDialog'
import { DisbursementDetailDialog } from './DisbursementDetailDialog'
import { DisbursementPrintDialog } from './DisbursementPrintDialog'
import { confirm, alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { DISBURSEMENT_STATUS, DISBURSEMENT_STATUS_LABELS, DISBURSEMENT_STATUS_TONES } from '../constants'
import { DISBURSEMENT_LABELS } from '../constants/labels'
import { useAuthStore } from '@/stores/auth-store'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
import { UnauthorizedPage } from '@/components/unauthorized-page'
import { ModuleLoading } from '@/components/module-loading'
import { recalculateExpenseStats } from '@/features/finance/payments/services/expense-core.service'

const TYPE_BADGE: Record<string, { label: string; color: string }> = {
  payment_request: { label: '團體請款', color: 'bg-morandi-gold/30 text-morandi-primary' },
  payroll: { label: '薪資', color: 'bg-morandi-green/30 text-morandi-primary' },
  cost_transfer: { label: '成本轉移', color: 'bg-status-info/30 text-morandi-primary' },
  refund: { label: '退款', color: 'bg-morandi-red/30 text-morandi-primary' },
  company_expense: { label: '公司費用', color: 'bg-morandi-secondary/30 text-morandi-primary' },
}

export function DisbursementPage() {
  const { items: disbursement_orders } = useDisbursementOrders()
  const { items: payment_requests } = usePaymentRequests()
  const { items: payment_request_items } = usePaymentRequestItems()

  const user = useAuthStore(state => state.user)
  const { can, loading: permLoading } = useCapabilities()
  const canManage = can(CAPABILITIES.FINANCE_MANAGE_DISBURSEMENT)

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<DisbursementOrder | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<DisbursementOrder | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [printOrder, setPrintOrder] = useState<DisbursementOrder | null>(null)
  const [search, setSearch] = useState('')

  // 待出帳請款（建立模式用）
  const pendingRequests = useMemo(
    () => payment_requests.filter(r => r.status === 'pending' && !r.disbursement_order_id),
    [payment_requests]
  )

  const editableRequests = useMemo(() => {
    if (!editingOrder) return pendingRequests
    return payment_requests.filter(
      r =>
        r.disbursement_order_id === editingOrder.id ||
        (r.status === 'pending' && !r.disbursement_order_id)
    )
  }, [editingOrder, pendingRequests, payment_requests])

  // 單一列表：全部出納單 + 搜尋過濾
  const filteredList = useMemo(() => {
    if (!search) return disbursement_orders
    const q = search.toLowerCase()
    return disbursement_orders.filter(o => (o.order_number || '').toLowerCase().includes(q))
  }, [disbursement_orders, search])

  // 表格欄位（兩區共用）
  const columns: TableColumn<DisbursementOrder>[] = useMemo(
    () => [
      {
        key: 'order_number',
        label: '出納單號',
        sortable: true,
        width: '140px',
        render: (value: unknown) => (
          <div className="font-medium text-morandi-primary">
            {String(value || '自動產生')}
          </div>
        ),
      },
      {
        key: 'disbursement_type',
        label: '分類',
        width: '100px',
        render: (value: unknown) => {
          const t = (value as string) || 'payment_request'
          const cfg = TYPE_BADGE[t] || TYPE_BADGE.payment_request
          return <span className={cn('text-xs px-2 py-0.5 rounded', cfg.color)}>{cfg.label}</span>
        },
      },
      {
        key: 'disbursement_date',
        label: '出帳日期',
        sortable: true,
        width: '110px',
        render: (value: unknown) => (
          <DateCell date={value as string | null} showIcon={false} className="text-morandi-secondary" />
        ),
      },
      {
        key: 'request_count' as keyof DisbursementOrder,
        label: '請款單數',
        width: '80px',
        render: (_value: unknown, row: DisbursementOrder) => (
          <div className="text-center">
            {payment_requests.filter(r => r.disbursement_order_id === row.id).length} 筆
          </div>
        ),
      },
      {
        key: 'amount',
        label: '總金額',
        sortable: true,
        width: '120px',
        render: (value: unknown) => (
          <div className="text-right">
            <CurrencyCell amount={Number(value) || 0} className="font-semibold text-morandi-gold" />
          </div>
        ),
      },
      {
        key: 'status',
        label: '狀態',
        sortable: true,
        width: '80px',
        render: (value: unknown) => {
          const k = value as keyof typeof DISBURSEMENT_STATUS_TONES
          const tone = (DISBURSEMENT_STATUS_TONES[k] || 'pending') as StatusTone
          const label =
            DISBURSEMENT_STATUS_LABELS[k] ||
            DISBURSEMENT_STATUS[value as keyof typeof DISBURSEMENT_STATUS]?.label ||
            String(value || '')
          return <StatusBadge tone={tone} label={label} />
        },
      },
    ],
    [payment_requests]
  )

  // 點擊列：pending → 編輯、paid → 詳情
  const handleRowClick = useCallback((order: DisbursementOrder) => {
    if (order.status === 'pending') {
      setEditingOrder(order)
      setIsCreateDialogOpen(true)
    } else {
      setSelectedOrder(order)
      setIsDetailDialogOpen(true)
    }
  }, [])

  const handlePreview = useCallback((order: DisbursementOrder) => {
    setPrintOrder(order)
    setIsPrintDialogOpen(true)
  }, [])

  const handleConfirmPaid = useCallback(
    async (order: DisbursementOrder) => {
      const confirmed = await confirm(DISBURSEMENT_LABELS.確定要將此出納單標記為_已出帳_嗎, {
        title: DISBURSEMENT_LABELS.確認出帳,
        type: 'warning',
      })
      if (!confirmed) return

      try {
        await updateDisbursementOrderApi(order.id, {
          status: 'paid',
          confirmed_by: user?.id || null,
          confirmed_at: new Date().toISOString(),
        })

        // 出納確認付款 → 自動產生會計傳票
        try {
          if (user?.workspace_id) {
            await fetch('/api/accounting/vouchers/auto-create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                source_type: 'disbursement_order',
                source_id: order.id,
                workspace_id: user.workspace_id,
              }),
            })
          }
        } catch (err) {
          logger.error('產生出納傳票失敗:', err)
        }

        const linkedRequests = payment_requests.filter(r => r.disbursement_order_id === order.id)
        const tour_ids_to_recalculate = new Set<string>()
        for (const req of linkedRequests) {
          await updatePaymentRequestApi(req.id, { status: 'billed' })
          if (req.tour_id) tour_ids_to_recalculate.add(req.tour_id)
        }

        for (const tour_id of tour_ids_to_recalculate) {
          await recalculateExpenseStats(tour_id)
        }

        await Promise.all([invalidateDisbursementOrders(), invalidatePaymentRequests()])

        await alert(DISBURSEMENT_LABELS.出納單已標記為已出帳, 'success')
      } catch (error) {
        logger.error('確認出帳失敗:', error)
        await alert('確認出帳失敗', 'error')
      }
    },
    [user, payment_requests]
  )

  const handleDelete = useCallback(async (order: DisbursementOrder) => {
    const confirmed = await confirm(
      `確定要刪除出納單 ${order.order_number || order.id}？`,
      { title: '刪除出納單', type: 'warning' }
    )
    if (!confirmed) return

    try {
      await deleteDisbursementOrderApi(order.id)
      await alert(DISBURSEMENT_LABELS.出納單已刪除, 'success')
    } catch (error) {
      logger.error(DISBURSEMENT_LABELS.刪除出納單失敗_2, error)
      await alert(DISBURSEMENT_LABELS.刪除出納單失敗, 'error')
    }
  }, [])

  const handleCreateSuccess = useCallback(async () => {
    setIsCreateDialogOpen(false)
    setEditingOrder(null)
    await Promise.all([invalidateDisbursementOrders(), invalidatePaymentRequests()])
  }, [])

  const handleAdd = useCallback(() => {
    setEditingOrder(null)
    setIsCreateDialogOpen(true)
  }, [])

  const handleCreateDialogClose = useCallback((open: boolean) => {
    setIsCreateDialogOpen(open)
    if (!open) setEditingOrder(null)
  }, [])

  // 操作按鈕渲染（順序：預覽 → 編輯 → 出帳 → 刪除）
  const renderActions = (row: DisbursementOrder) => (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={e => {
          e.stopPropagation()
          handlePreview(row)
        }}
        className="h-7 px-2 text-xs"
      >
        預覽
      </Button>
      {row.status === 'pending' && canManage && (
        <Button
          variant="ghost"
          size="sm"
          onClick={e => {
            e.stopPropagation()
            setEditingOrder(row)
            setIsCreateDialogOpen(true)
          }}
          className="h-7 px-2 text-xs"
        >
          編輯
        </Button>
      )}
      {row.status === 'pending' && canManage && (
        <Button
          variant="ghost"
          size="sm"
          onClick={e => {
            e.stopPropagation()
            handleConfirmPaid(row)
          }}
          className="h-7 px-2 text-xs text-morandi-green hover:text-morandi-green/80"
        >
          出帳
        </Button>
      )}
      {row.status === 'pending' && canManage && (
        <Button
          variant="ghost"
          size="sm"
          onClick={e => {
            e.stopPropagation()
            handleDelete(row)
          }}
          className="h-7 px-2 text-xs text-status-danger hover:text-status-danger/80"
        >
          刪除
        </Button>
      )}
    </div>
  )

  // 加進 actions column
  const columnsWithActions: TableColumn<DisbursementOrder>[] = useMemo(
    () => [
      ...columns,
      {
        key: 'actions' as keyof DisbursementOrder,
        label: '操作',
        width: '180px',
        render: (_value, row) => renderActions(row),
      },
    ],
    [columns, canManage, payment_requests, user]
  )

  if (permLoading) return null  // ModuleGuard 已在外層顯示 loading
  if (!can(CAPABILITIES.FINANCE_READ_DISBURSEMENT)) return <UnauthorizedPage />

  return (
    <ContentPageLayout
      title="出納單管理"
      icon={Wallet}
      showSearch
      searchTerm={search}
      onSearchChange={setSearch}
      searchPlaceholder="搜尋出納單號..."
      primaryAction={
        canManage
          ? {
              label: '新增出納單',
              icon: Plus,
              onClick: handleAdd,
            }
          : undefined
      }
    >
      <EnhancedTable<DisbursementOrder>
        data={filteredList}
        columns={columnsWithActions}
        onRowClick={handleRowClick}
      />

      {/* Dialogs */}
      <CreateDisbursementDialog
        open={isCreateDialogOpen}
        onOpenChange={handleCreateDialogClose}
        pendingRequests={editingOrder ? editableRequests : pendingRequests}
        onSuccess={handleCreateSuccess}
        editingOrder={editingOrder}
      />
      <DisbursementDetailDialog
        order={selectedOrder}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
      />
      <DisbursementPrintDialog
        order={printOrder}
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
      />
    </ContentPageLayout>
  )
}
