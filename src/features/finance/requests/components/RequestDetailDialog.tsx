'use client'

import { useEffect, useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Layers } from 'lucide-react'
import { EditableRequestItemList } from './RequestItemList'
import type { RequestItem } from '../types'
import {
  useToursSlim,
  useSuppliersSlim,
  usePaymentRequestItems,
  deletePaymentRequest as deletePaymentRequestApi,
} from '@/data'
import { PaymentRequest, PaymentRequestItem, PaymentItemCategory } from '@/stores/types'
import { DateCell, CurrencyCell } from '@/components/table-cells'
import { statusLabels, statusColors, categoryOptions } from '../types'
import { paymentRequestService } from '@/features/payments/services/payment-request.service'
import { recalculateExpenseStats } from '@/features/finance/payments/services/expense-core.service'
import { logger } from '@/lib/utils/logger'
import { confirm, alert } from '@/lib/ui/alert-dialog'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  ADD_REQUEST_DIALOG_LABELS,
  REQUEST_DETAIL_DIALOG_LABELS,
  REQUEST_DETAIL_FORM_LABELS,
  REQUEST_LABELS,
  REQUEST_TYPE_LABELS,
} from '../../constants/labels'

interface RequestDetailDialogProps {
  request: PaymentRequest | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RequestDetailDialog({ request, open, onOpenChange }: RequestDetailDialogProps) {
  const { items: requestItems, refresh: refreshRequestItems } = usePaymentRequestItems()
  const { items: tours } = useToursSlim()
  const { items: suppliers } = useSuppliersSlim()

  // 批次請款單狀態
  const [batchRequests, setBatchRequests] = useState<PaymentRequest[]>([])
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)

  const [is_submitting, setIsSubmitting] = useState(false)

  // 載入批次請款單（如果有 batch_id）
  useEffect(() => {
    const loadBatchRequests = async () => {
      if (!open || !request) {
        setBatchRequests([])
        setSelectedRequestId(null)
        return
      }

      // 如果有 batch_id，查詢同批次的所有請款單
      if (request.batch_id) {
        const { data, error } = await supabase
          .from('payment_requests')
          .select('*')
          .eq('batch_id', request.batch_id)
          .order('code', { ascending: true })
          .limit(500)

        if (error) {
          logger.error('載入批次請款單失敗:', error)
          setBatchRequests([request])
        } else {
          setBatchRequests(data as PaymentRequest[])
        }
      } else {
        // 沒有 batch_id，只有單一請款單
        setBatchRequests([request])
      }

      setSelectedRequestId(request.id)
    }

    loadBatchRequests().catch(err => logger.error('[loadBatchRequests]', err))
  }, [open, request])

  // 載入請款項目
  useEffect(() => {
    if (open && request) {
      refreshRequestItems()
    }
  }, [open, request, refreshRequestItems])

  // 重置編輯狀態（不再需要，統一使用 EditableRequestItemList）

  // 當前選中的請款單
  const currentRequest = useMemo(() => {
    return batchRequests.find(r => r.id === selectedRequestId) || request
  }, [batchRequests, selectedRequestId, request])

  // 是否為批次請款單
  const isBatch = batchRequests.length > 1

  // 批次總金額
  const batchTotalAmount = useMemo(() => {
    return batchRequests.reduce((sum, r) => sum + (r.amount || 0), 0)
  }, [batchRequests])

  // 取得當前選中請款單的項目
  const items = currentRequest ? requestItems.filter(item => item.request_id === currentRequest.id) : []

  // 取得關聯的團
  const tour = currentRequest?.tour_id ? tours.find(t => t.id === currentRequest.tour_id) : null

  // 把 DB items 轉成 EditableRequestItemList 需要的格式
  const editableItems: RequestItem[] = useMemo(() => 
    items.map(item => ({
      id: item.id,
      category: item.category,
      supplier_id: item.supplier_id || '',
      supplierName: item.supplier_name,
      selected_id: item.supplier_id || '',
      description: item.description,
      unit_price: item.unit_price ?? (item as unknown as { unitprice?: number }).unitprice ?? 0,
      quantity: item.quantity,
      tour_request_id: item.tour_request_id,
      confirmation_item_id: (item as unknown as Record<string, unknown>).confirmation_item_id as string | undefined,
      advanced_by: (item as unknown as Record<string, unknown>).advanced_by as string | undefined,
      advanced_by_name: (item as unknown as Record<string, unknown>).advanced_by_name as string | undefined,
    })), [items])

  if (!request || !currentRequest) return null

  // Bridge: 更新項目 → 寫 DB
  const handleUpdateEditableItem = async (itemId: string, updates: Partial<RequestItem>) => {
    try {
      const dbUpdates: Record<string, unknown> = {}
      if (updates.category !== undefined) dbUpdates.category = updates.category
      if (updates.supplier_id !== undefined) dbUpdates.supplier_id = updates.supplier_id || null
      if (updates.supplierName !== undefined) dbUpdates.supplier_name = updates.supplierName
      if (updates.description !== undefined) dbUpdates.description = updates.description
      if (updates.unit_price !== undefined) {
        dbUpdates.unitprice = updates.unit_price
        dbUpdates.subtotal = (updates.unit_price ?? 0) * (updates.quantity ?? items.find(i => i.id === itemId)?.quantity ?? 1)
      }
      if (updates.quantity !== undefined) {
        dbUpdates.quantity = updates.quantity
        const price = updates.unit_price ?? items.find(i => i.id === itemId)?.unit_price ?? 0
        dbUpdates.subtotal = price * updates.quantity
      }
      if (updates.advanced_by !== undefined) dbUpdates.advanced_by = updates.advanced_by || null
      if (updates.advanced_by_name !== undefined) dbUpdates.advanced_by_name = updates.advanced_by_name || null

      await supabase.from('payment_request_items').update(dbUpdates as never).eq('id', itemId)
      await refreshRequestItems()

      if (currentRequest.tour_id) {
        await recalculateExpenseStats(currentRequest.tour_id)
      }
    } catch (error) {
      logger.error('更新項目失敗:', error)
    }
  }

  // Bridge: 刪除項目
  const handleRemoveEditableItem = async (itemId: string) => {
    try {
      await paymentRequestService.deleteItem(currentRequest.id, itemId)
      await refreshRequestItems()
      if (currentRequest.tour_id) {
        await recalculateExpenseStats(currentRequest.tour_id)
      }
    } catch (error) {
      logger.error('刪除項目失敗:', error)
    }
  }

  // Bridge: 新增空白項目
  const handleAddEditableItem = async () => {
    try {
      await paymentRequestService.addItem(currentRequest.id, {
        category: '' as PaymentItemCategory,
        supplier_id: '',
        supplier_name: '',
        description: '',
        unit_price: 0,
        quantity: 1,
        notes: '',
        sort_order: items.length + 1,
      })
      await refreshRequestItems()
    } catch (error) {
      logger.error('新增項目失敗:', error)
    }
  }

  // 刪除請款單
  const handleDelete = async () => {
    if (is_submitting) return
    const deleteMessage = isBatch
      ? REQUEST_LABELS.確定要刪除此請款單(currentRequest.code)
      : REQUEST_DETAIL_DIALOG_LABELS.確定要刪除此請款單嗎_此操作無法復原

    const confirmed = await confirm(deleteMessage, {
      title: REQUEST_DETAIL_DIALOG_LABELS.刪除請款單,
      type: 'warning',
    })
    if (!confirmed) {
      return
    }

    setIsSubmitting(true)
    try {
      await deletePaymentRequestApi(currentRequest.id)

      // 重算團成本
      if (currentRequest.tour_id) {
        await recalculateExpenseStats(currentRequest.tour_id)
      }

      await alert(REQUEST_DETAIL_DIALOG_LABELS.請款單已刪除, 'success')

      // 如果是批次且還有其他請款單，切換到下一個
      if (isBatch && batchRequests.length > 1) {
        const remainingRequests = batchRequests.filter(r => r.id !== currentRequest.id)
        setBatchRequests(remainingRequests)
        setSelectedRequestId(remainingRequests[0].id)
      } else {
        onOpenChange(false)
      }
    } catch (error) {
      logger.error('刪除請款單失敗:', error)
      await alert(REQUEST_DETAIL_DIALOG_LABELS.刪除請款單失敗, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 判斷是否可以編輯（只有待處理狀態可以編輯）
  const canEdit = currentRequest.status === 'pending'

  // 是否正在編輯中（新增或編輯項目）
  const isEditing = false // 統一使用 EditableRequestItemList，不再有 inline 編輯

  // 處理關閉對話框（編輯中時阻止關閉）
  const handleOpenChange = async (newOpen: boolean) => {
    if (!newOpen && isEditing) {
      // 正在編輯中，提示用戶
      await alert(REQUEST_DETAIL_DIALOG_LABELS.請先儲存或取消目前的編輯, 'warning')
      return
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent level={2} className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                請款單 {currentRequest.code}
                {isBatch && (
                  <Badge variant="outline" className="text-xs font-normal">
                    <Layers size={12} className="mr-1" />
                    批次 {batchRequests.findIndex(r => r.id === currentRequest.id) + 1}/
                    {batchRequests.length}
                  </Badge>
                )}
              </DialogTitle>
              <p className="text-sm text-morandi-muted mt-1">
                {currentRequest.tour_code
                  ? `團號：${currentRequest.tour_code}`
                  : REQUEST_DETAIL_DIALOG_LABELS.無關聯團號}
                {currentRequest.order_number && REQUEST_LABELS.訂單(currentRequest.order_number)}
              </p>
            </div>
            <Badge
              className={
                statusColors[
                  (currentRequest.status || 'pending') as 'pending' | 'confirmed' | 'billed'
                ]
              }
            >
              {
                statusLabels[
                  (currentRequest.status || 'pending') as 'pending' | 'confirmed' | 'billed'
                ]
              }
            </Badge>
          </div>
        </DialogHeader>

        {/* 批次請款單切換列 */}
        {isBatch && (
          <div className="mt-2 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Layers size={14} className="text-morandi-muted" />
              <span className="text-xs text-morandi-muted">
                {REQUEST_DETAIL_FORM_LABELS.同批次請款單N張共金額(
                  batchRequests.length,
                  batchTotalAmount
                )}
                <CurrencyCell amount={batchTotalAmount} className="inline text-xs" />)
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {batchRequests.map(br => (
                <Button
                  key={br.id}
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRequestId(br.id)}
                  className={cn(
                    'h-7 text-xs',
                    selectedRequestId === br.id
                      ? 'bg-morandi-gold/10 border-morandi-gold text-morandi-gold'
                      : 'hover:bg-morandi-container/50'
                  )}
                >
                  <span className="font-medium">{br.tour_code || br.code}</span>
                  <span className="ml-1 text-morandi-muted">
                    <CurrencyCell amount={br.amount || 0} className="inline text-xs" />
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6 mt-4">
          {/* 基本資訊 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-morandi-background/50 rounded-lg">
            <InfoItem label={REQUEST_DETAIL_DIALOG_LABELS.請款單號} value={currentRequest.code} />
            <InfoItem
              label={REQUEST_DETAIL_DIALOG_LABELS.團號}
              value={currentRequest.tour_code || '-'}
            />
            <InfoItem
              label={REQUEST_DETAIL_DIALOG_LABELS.團名}
              value={currentRequest.tour_name || tour?.name || '-'}
            />
            <InfoItem
              label={REQUEST_DETAIL_DIALOG_LABELS.訂單編號}
              value={currentRequest.order_number || '-'}
            />
            <InfoItem
              label={REQUEST_DETAIL_DIALOG_LABELS.請款人}
              value={currentRequest.created_by_name || '-'}
            />
            <div>
              <p className="text-xs text-morandi-muted mb-1">
                {REQUEST_DETAIL_FORM_LABELS.請款日期}
              </p>
              <DateCell date={currentRequest.created_at} showIcon={false} />
            </div>
            <div>
              <p className="text-xs text-morandi-muted mb-1">{REQUEST_DETAIL_FORM_LABELS.總金額}</p>
              <CurrencyCell
                amount={currentRequest.amount || 0}
                className="font-semibold text-morandi-gold"
              />
            </div>
          </div>

          {/* 請款項目 — 統一使用 EditableRequestItemList */}
          <EditableRequestItemList
            items={editableItems}
            suppliers={suppliers as unknown as { id: string; name: string | null; type: 'supplier' | 'employee'; group: string }[]}
            updateItem={handleUpdateEditableItem}
            removeItem={handleRemoveEditableItem}
            addNewEmptyItem={handleAddEditableItem}
            tourId={currentRequest.tour_id || null}
          />

          {/* 備註 */}
          {currentRequest.notes && (
            <div className="p-4 bg-morandi-background/50 rounded-lg">
              <h3 className="text-sm font-semibold text-morandi-primary mb-2">
                {REQUEST_DETAIL_FORM_LABELS.備註}
              </h3>
              <p className="text-sm text-morandi-secondary whitespace-pre-wrap">
                {currentRequest.notes}
              </p>
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex items-center justify-end pt-4 border-t border-morandi-container/20">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={is_submitting}
              className="text-morandi-red border-morandi-red hover:bg-morandi-red/10"
            >
              <Trash2 size={16} className="mr-2" />
              {REQUEST_DETAIL_FORM_LABELS.DELETE}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// 資訊項目組件
function InfoItem({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div>
      <p className="text-xs text-morandi-muted mb-1">{label}</p>
      <p
        className={`text-sm ${highlight ? 'font-semibold text-morandi-gold' : 'text-morandi-primary'}`}
      >
        {value}
      </p>
    </div>
  )
}
