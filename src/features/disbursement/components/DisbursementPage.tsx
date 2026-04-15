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
import { recalculateExpenseStats } from '@/features/finance/payments/services/expense-core.service'

export function DisbursementPage() {
  // 使用 @/data hooks（SWR 自動載入）
  const { items: disbursement_orders } = useDisbursementOrders()
  const { items: payment_requests } = usePaymentRequests()
  const { items: payment_request_items } = usePaymentRequestItems()

  const user = useAuthStore(state => state.user)

  // 狀態
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<DisbursementOrder | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<DisbursementOrder | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false)
  const [printOrder, setPrintOrder] = useState<DisbursementOrder | null>(null)

  // 取得待出帳的請款單（狀態為 pending，且尚未加入任何出納單）
  const pendingRequests = useMemo(() => {
    // 收集所有已在出納單中的請款單 ID
    const usedRequestIds = new Set<string>()
    disbursement_orders.forEach(order => {
      order.payment_request_ids?.forEach(id => usedRequestIds.add(id))
    })

    // 只顯示「請款中」且「尚未加入出納單」的請款單
    return payment_requests.filter(r => r.status === 'pending' && !usedRequestIds.has(r.id))
  }, [payment_requests, disbursement_orders])

  // 編輯模式用的請款單列表：pending + 目前編輯中出納單包含的 billed 請款單
  const editableRequests = useMemo(() => {
    if (!editingOrder) return pendingRequests

    const editingIds = new Set(editingOrder.payment_request_ids || [])

    // 收集其他出納單中的請款單 ID（排除當前編輯的）
    const usedByOthers = new Set<string>()
    disbursement_orders.forEach(order => {
      if (order.id === editingOrder.id) return
      order.payment_request_ids?.forEach(id => usedByOthers.add(id))
    })

    // 可選的請款單：
    // 1. 屬於當前出納單的（billed 狀態，顯示為已勾選）
    // 2. pending 且不在其他出納單中的
    return payment_requests.filter(
      r => editingIds.has(r.id) || (r.status === 'pending' && !usedByOthers.has(r.id))
    )
  }, [editingOrder, pendingRequests, payment_requests, disbursement_orders])

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
        key: 'payment_request_ids' as const,
        label: DISBURSEMENT_LABELS.請款單數,
        width: '80px',
        render: (value: unknown) => (
          <div className="text-center">
            {Array.isArray(value) ? value.length : 0} {DISBURSEMENT_LABELS.筆}
          </div>
        ),
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

  return (
    <>
      <ListPageLayout<DisbursementOrder>
        title={DISBURSEMENT_LABELS.出納單管理}
        data={disbursement_orders}
        columns={columns}
        searchFields={['order_number']}
        searchPlaceholder={DISBURSEMENT_LABELS.搜尋出納單號}
        onAdd={handleAdd}
        addLabel={DISBURSEMENT_LABELS.新增出納單}
        onRowClick={handleRowClick}
        initialPageSize={15}
        renderActions={(row: DisbursementOrder) => (
          <div className="flex items-center gap-1">
            {row.status === 'pending' && (
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
            {row.status === 'pending' && (
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
            {row.status === 'pending' && (
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
