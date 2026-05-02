'use client'
/**
 * DisbursementPage
 * 出納單管理主頁面
 *
 * 設計理念（參考 cornerERP）：
 * - 列表顯示「出納單」，不是請款單
 * - 點「新增」進入選擇請款單的流程
 * - 出納單包含多張請款單
 * - 點 pending 出納單 → 編輯模式（同新增頁面）
 * - 點 paid 出納單 → 確認出帳詳情
 */

import { useCallback, useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { DISBURSEMENT_STATUS } from '../constants'
import { DISBURSEMENT_LABELS } from '../constants/labels'
import { useAuthStore } from '@/stores/auth-store'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
import { UnauthorizedPage } from '@/components/unauthorized-page'
import { ModuleLoading } from '@/components/module-loading'
import { recalculateExpenseStats } from '@/features/finance/payments/services/expense-core.service'

export function DisbursementPage() {
  // 使用 @/data hooks（SWR 自動載入）
  const { items: disbursement_orders } = useDisbursementOrders()
  const { items: payment_requests } = usePaymentRequests()
  const { items: payment_request_items } = usePaymentRequestItems()

  const user = useAuthStore(state => state.user)
  const { can, canRead, loading: permLoading } = useCapabilities()
  const canManage = can(CAPABILITIES.FINANCE_MANAGE_DISBURSEMENT)

  // 狀態
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<DisbursementOrder | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<DisbursementOrder | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [printOrder, setPrintOrder] = useState<DisbursementOrder | null>(null)

  // 取得待出帳的請款單（狀態為 pending、且尚未綁到任何出納單）
  // FK 標籤式：直接看 disbursement_order_id 是不是 NULL
  const pendingRequests = useMemo(() => {
    return payment_requests.filter(r => r.status === 'pending' && !r.disbursement_order_id)
  }, [payment_requests])

  // 編輯模式用的請款單列表：當前出納單綁定的 + pending 且未綁
  const editableRequests = useMemo(() => {
    if (!editingOrder) return pendingRequests

    return payment_requests.filter(
      r =>
        r.disbursement_order_id === editingOrder.id ||
        (r.status === 'pending' && !r.disbursement_order_id)
    )
  }, [editingOrder, pendingRequests, payment_requests])

  // 表格欄位
  const columns = useMemo(
    () => [
      {
        key: 'order_number' as const,
        label: DISBURSEMENT_LABELS.出納單號,
        sortable: true,
        width: '140px',
        render: (value: unknown) => (
          <div className="font-medium text-morandi-primary">
            {String(value || DISBURSEMENT_LABELS.自動產生)}
          </div>
        ),
      },
      {
        key: 'disbursement_date' as const,
        label: DISBURSEMENT_LABELS.出帳日期,
        sortable: true,
        width: '110px',
        render: (value: unknown) => (
          <DateCell
            date={value as string | null}
            showIcon={false}
            className="text-morandi-secondary"
          />
        ),
      },
      {
        key: 'request_count' as const,
        label: DISBURSEMENT_LABELS.請款單數,
        width: '80px',
        render: (_value: unknown, row: unknown) => {
          const orderId = (row as DisbursementOrder).id
          return (
            <div className="text-center">
              {payment_requests.filter(r => r.disbursement_order_id === orderId).length}{' '}
              {DISBURSEMENT_LABELS.筆}
            </div>
          )
        },
      },
      {
        key: 'amount' as const,
        label: DISBURSEMENT_LABELS.總金額,
        sortable: true,
        width: '120px',
        render: (value: unknown) => (
          <div className="text-right">
            <CurrencyCell amount={Number(value) || 0} className="font-semibold text-morandi-gold" />
          </div>
        ),
      },
      {
        key: 'status' as const,
        label: DISBURSEMENT_LABELS.狀態,
        sortable: true,
        width: '80px',
        render: (value: unknown) => {
          const status =
            DISBURSEMENT_STATUS[value as keyof typeof DISBURSEMENT_STATUS] ||
            DISBURSEMENT_STATUS.pending
          return <Badge className={cn('text-white', status.color)}>{status.label}</Badge>
        },
      },
    ],
    []
  )

  // 點擊列：pending → 編輯模式，paid → 詳情
  const handleRowClick = useCallback((order: DisbursementOrder) => {
    if (order.status === 'pending') {
      // 編輯模式：開啟 CreateDisbursementDialog
      setEditingOrder(order)
      setIsCreateDialogOpen(true)
    } else {
      // 已出帳：開啟詳情（確認出帳用）
      setSelectedOrder(order)
      setIsDetailDialogOpen(true)
    }
  }, [])

  // 查看詳情
  const handleViewDetail = useCallback((order: DisbursementOrder) => {
    setSelectedOrder(order)
    setIsDetailDialogOpen(true)
  }, [])

  // 列印預覽
  const handlePreview = useCallback((order: DisbursementOrder) => {
    setPrintOrder(order)
    setIsPrintDialogOpen(true)
  }, [])

  // 確認出帳（直接從列表操作）
  const handleConfirmPaid = useCallback(
    async (order: DisbursementOrder) => {
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

        // 更新所有請款單狀態為 billed（從 FK 反查）
        const linkedRequests = payment_requests.filter(r => r.disbursement_order_id === order.id)
        const tour_ids_to_recalculate = new Set<string>()
        for (const req of linkedRequests) {
          await updatePaymentRequestApi(req.id, { status: 'billed' })
          if (req.tour_id) {
            tour_ids_to_recalculate.add(req.tour_id)
          }
        }

        // 重算相關團的成本
        for (const tour_id of tour_ids_to_recalculate) {
          await recalculateExpenseStats(tour_id)
        }

        // SWR 快取失效
        await Promise.all([invalidateDisbursementOrders(), invalidatePaymentRequests()])

        await alert(DISBURSEMENT_LABELS.出納單已標記為已出帳, 'success')
      } catch (error) {
        logger.error(DISBURSEMENT_LABELS.更新出納單失敗_2, error)
        await alert(DISBURSEMENT_LABELS.更新出納單失敗, 'error')
      }
    },
    [user, payment_requests]
  )

  // 刪除出納單
  const handleDelete = useCallback(async (order: DisbursementOrder) => {
    const confirmed = await confirm(
      `${DISBURSEMENT_LABELS.CONFIRM_DELETE_PREFIX}${order.order_number}${DISBURSEMENT_LABELS.CONFIRM_DELETE_SUFFIX}`,
      {
        title: DISBURSEMENT_LABELS.刪除出納單,
        type: 'warning',
      }
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

  // 新增/編輯出納單成功後
  const handleCreateSuccess = useCallback(async () => {
    setIsCreateDialogOpen(false)
    setEditingOrder(null)
    // SWR 快取失效，自動重新載入
    await Promise.all([invalidateDisbursementOrders(), invalidatePaymentRequests()])
  }, [])

  // 新增按鈕（清除編輯狀態）
  const handleAdd = useCallback(() => {
    setEditingOrder(null)
    setIsCreateDialogOpen(true)
  }, [])

  // 關閉建立/編輯對話框
  const handleCreateDialogClose = useCallback((open: boolean) => {
    setIsCreateDialogOpen(open)
    if (!open) {
      setEditingOrder(null)
    }
  }, [])

  if (permLoading) return <ModuleLoading fullscreen />
  if (!can(CAPABILITIES.FINANCE_READ_DISBURSEMENT)) return <UnauthorizedPage />

  return (
    <>
      <ListPageLayout<DisbursementOrder>
        title={DISBURSEMENT_LABELS.出納單管理}
        data={disbursement_orders}
        columns={columns}
        searchFields={['order_number']}
        searchPlaceholder={DISBURSEMENT_LABELS.搜尋出納單號}
        primaryAction={
          canManage
            ? { label: DISBURSEMENT_LABELS.新增出納單, icon: Plus, onClick: handleAdd }
            : undefined
        }
        onRowClick={handleRowClick}
        initialPageSize={15}
        renderActions={(row: DisbursementOrder) => (
          <div className="flex items-center gap-1">
            {row.status === 'pending' && canManage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={e => {
                  e.stopPropagation()
                  setEditingOrder(row)
                  setIsCreateDialogOpen(true)
                }}
                className="h-7 px-2 text-xs text-morandi-secondary hover:text-morandi-primary"
              >
                編輯
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                handlePreview(row)
              }}
              className="h-7 px-2 text-xs text-morandi-secondary hover:text-morandi-primary"
            >
              預覽
            </Button>
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
        )}
      />

      {/* 新增/編輯出納單對話框 */}
      <CreateDisbursementDialog
        open={isCreateDialogOpen}
        onOpenChange={handleCreateDialogClose}
        pendingRequests={editingOrder ? editableRequests : pendingRequests}
        onSuccess={handleCreateSuccess}
        editingOrder={editingOrder}
      />

      {/* 出納單詳情對話框（確認出帳） */}
      <DisbursementDetailDialog
        order={selectedOrder}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
      />

      {/* 列印預覽對話框 */}
      <DisbursementPrintDialog
        order={printOrder}
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
      />
    </>
  )
}
