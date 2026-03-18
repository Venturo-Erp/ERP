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
import { FileText, Eye, Pencil, Trash2 } from 'lucide-react'
import {
  usePaymentRequests,
  usePaymentRequestItems,
  useDisbursementOrders,
  deleteDisbursementOrder as deleteDisbursementOrderApi,
  invalidatePaymentRequests,
  invalidateDisbursementOrders,
} from '@/data'
import { DateCell, CurrencyCell } from '@/components/table-cells'
import { DisbursementOrder, PaymentRequest } from '@/stores/types'
import { cn } from '@/lib/utils'
import { CreateDisbursementDialog } from './CreateDisbursementDialog'
import { DisbursementDetailDialog } from './DisbursementDetailDialog'
import { PrintDisbursementPreview } from './PrintDisbursementPreview'
import { confirm, alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { DISBURSEMENT_STATUS } from '../constants'
import { DISBURSEMENT_LABELS } from '../constants/labels'

export function DisbursementPage() {
  // 使用 @/data hooks（SWR 自動載入）
  const { items: disbursement_orders } = useDisbursementOrders()
  const { items: payment_requests } = usePaymentRequests()
  const { items: payment_request_items } = usePaymentRequestItems()

  // 狀態
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<DisbursementOrder | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<DisbursementOrder | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
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

  // 查看詳情（Eye 按鈕，永遠可用）
  const handleViewDetail = useCallback((order: DisbursementOrder) => {
    setSelectedOrder(order)
    setIsDetailDialogOpen(true)
  }, [])

  // 列印 - 直接觸發瀏覽器列印對話框
  const handlePrintPDF = useCallback((order: DisbursementOrder) => {
    setPrintOrder(order)
    // 等待狀態更新後觸發列印
    setTimeout(() => {
      window.print()
    }, 100)
  }, [])

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

  // 統計：本週（週一～週日）
  const thisWeekOrders = useMemo(() => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    monday.setHours(0, 0, 0, 0)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)

    return disbursement_orders.filter(o => {
      const date = new Date(o.disbursement_date || o.created_at || '')
      return date >= monday && date <= sunday
    })
  }, [disbursement_orders])
  const thisWeekAmount = useMemo(
    () => thisWeekOrders.reduce((sum, o) => sum + (o.amount || 0), 0),
    [thisWeekOrders]
  )

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
        initialPageSize={20}
        headerChildren={
          <div className="flex items-center gap-6 text-sm">
            <div className="text-right">
              <span className="text-morandi-muted">{DISBURSEMENT_LABELS.待出帳}</span>
              <span className="ml-2 font-semibold text-morandi-gold">
                {pendingRequests.length}
                {DISBURSEMENT_LABELS.筆}
              </span>
            </div>
            <div className="text-right">
              <span className="text-morandi-muted">{DISBURSEMENT_LABELS.本週出帳}</span>
              <span className="ml-2 font-semibold text-morandi-primary">
                {thisWeekOrders.length}
                {DISBURSEMENT_LABELS.筆}
              </span>
            </div>
            <div className="text-right flex items-center gap-2">
              <span className="text-morandi-muted">{DISBURSEMENT_LABELS.本週金額}</span>
              <CurrencyCell amount={thisWeekAmount} className="font-semibold text-morandi-green" />
            </div>
          </div>
        }
        renderActions={(row: DisbursementOrder) => (
          <div className="flex items-center gap-2">
            {row.status === 'pending' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={e => {
                  e.stopPropagation()
                  setEditingOrder(row)
                  setIsCreateDialogOpen(true)
                }}
                className="h-8 w-8 p-0"
              >
                <Pencil size={16} className="text-morandi-secondary" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                handleViewDetail(row)
              }}
              className="h-8 w-8 p-0"
            >
              <Eye size={16} className="text-morandi-secondary" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                handlePrintPDF(row)
              }}
              className="h-8 w-8 p-0"
            >
              <FileText size={16} className="text-morandi-gold" />
            </Button>
            {row.status === 'pending' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={e => {
                  e.stopPropagation()
                  handleDelete(row)
                }}
                className="h-8 w-8 p-0"
              >
                <Trash2 size={16} className="text-status-danger" />
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

      {/* 隱藏的列印內容（@media print 時顯示） */}
      {printOrder && (
        <div className="hidden print:block">
          <PrintDisbursementPreview
            order={printOrder}
            paymentRequests={payment_requests.filter(pr =>
              printOrder.payment_request_ids?.includes(pr.id)
            )}
            paymentRequestItems={payment_request_items.filter(item =>
              payment_requests.some(
                pr => pr.id === item.request_id && printOrder.payment_request_ids?.includes(pr.id)
              )
            )}
          />
        </div>
      )}
    </>
  )
}
