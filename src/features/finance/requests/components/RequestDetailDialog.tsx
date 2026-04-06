'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Layers, Save } from 'lucide-react'
import { EditableRequestItemList } from './RequestItemList'
import { CreateSupplierDialog } from './CreateSupplierDialog'
import type { RequestItem } from '../types'
import {
  useToursSlim,
  useSuppliersSlim,
  useEmployeesSlim,
  usePaymentRequestItems,
  invalidatePaymentRequests,
  deletePaymentRequest as deletePaymentRequestApi,
} from '@/data'
import { PaymentRequest, PaymentItemCategory } from '@/stores/types'
import { DateCell, CurrencyCell } from '@/components/table-cells'
import { statusLabels, statusColors } from '../types'
import { paymentRequestService } from '@/features/payments/services/payment-request.service'
import { recalculateExpenseStats } from '@/features/finance/payments/services/expense-core.service'
import { logger } from '@/lib/utils/logger'
import { confirm, alert } from '@/lib/ui/alert-dialog'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  REQUEST_DETAIL_DIALOG_LABELS,
  REQUEST_DETAIL_FORM_LABELS,
  REQUEST_LABELS,
} from '../../constants/labels'

interface RequestDetailDialogProps {
  request: PaymentRequest | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 只讀模式：隱藏編輯/刪除按鈕 */
  readOnly?: boolean
}

export function RequestDetailDialog({
  request,
  open,
  onOpenChange,
  readOnly = false,
}: RequestDetailDialogProps) {
  const { items: requestItems, refresh: refreshRequestItems } = usePaymentRequestItems()
  const { items: tours } = useToursSlim()
  const { items: suppliers } = useSuppliersSlim()
  const { items: employees } = useEmployeesSlim()

  // 付款方式
  const [paymentMethods, setPaymentMethods] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    if (open && request?.workspace_id) {
      supabase
        .from('payment_methods')
        .select('id, name')
        .eq('workspace_id', request.workspace_id)
        .eq('type', 'payment')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .then(({ data }) => {
          setPaymentMethods(data || [])
        })
    }
  }, [open, request?.workspace_id])

  // 合併供應商和員工
  const combinedSuppliers = useMemo(() => {
    const supplierList = suppliers.map(s => ({
      id: s.id,
      name: s.name,
      type: 'supplier' as const,
      group: '供應商',
    }))
    const employeeList = employees
      .filter(
        e => e.employee_number !== 'BOT001' && e.id !== '00000000-0000-0000-0000-000000000001'
      )
      .map(e => ({
        id: e.id,
        name: e.display_name,
        type: 'employee' as const,
        group: '員工',
      }))
    return [...supplierList, ...employeeList]
  }, [suppliers, employees])

  // 批次請款單狀態
  const [batchRequests, setBatchRequests] = useState<PaymentRequest[]>([])
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [is_submitting, setIsSubmitting] = useState(false)

  // 快速新增供應商
  const [createSupplierDialogOpen, setCreateSupplierDialogOpen] = useState(false)
  const [pendingSupplierName, setPendingSupplierName] = useState('')
  const [supplierCreateResolver, setSupplierCreateResolver] = useState<
    ((id: string) => void) | null
  >(null)

  // === 本地編輯狀態（不即時寫 DB，按存檔才寫） ===
  const [localItems, setLocalItems] = useState<RequestItem[]>([])
  const [localPaymentMethodId, setLocalPaymentMethodId] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [deletedItemIds, setDeletedItemIds] = useState<string[]>([])
  const [newItemIds, setNewItemIds] = useState<string[]>([])

  const handleCreateSupplier = async (name: string): Promise<string | null> => {
    return new Promise(resolve => {
      setPendingSupplierName(name)
      setSupplierCreateResolver(() => resolve)
      setCreateSupplierDialogOpen(true)
    })
  }

  const handleSupplierCreated = (supplierId: string) => {
    if (supplierCreateResolver) {
      supplierCreateResolver(supplierId)
      setSupplierCreateResolver(null)
    }
    setPendingSupplierName('')
  }

  // 載入批次請款單
  useEffect(() => {
    const loadBatchRequests = async () => {
      if (!open || !request) {
        setBatchRequests([])
        setSelectedRequestId(null)
        return
      }
      if (request.batch_id) {
        const { data, error } = await supabase
          .from('payment_requests')
          .select(
            'id, code, request_number, request_type, amount, total_amount, status, tour_id, tour_code, supplier_name, expense_type, notes, workspace_id, created_at'
          )
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

  const currentRequest = useMemo(() => {
    return batchRequests.find(r => r.id === selectedRequestId) || request
  }, [batchRequests, selectedRequestId, request])

  const isBatch = batchRequests.length > 1
  const batchTotalAmount = useMemo(() => {
    return batchRequests.reduce((sum, r) => sum + (r.amount || 0), 0)
  }, [batchRequests])

  const tour = currentRequest?.tour_id ? tours.find(t => t.id === currentRequest.tour_id) : null

  // DB items → 本地 editable 格式（依賴穩定的 requestItems + currentRequest.id）
  const currentRequestId = currentRequest?.id
  const dbEditableItems: RequestItem[] = useMemo(() => {
    if (!currentRequestId) return []
    return requestItems
      .filter(item => item.request_id === currentRequestId)
      .map(item => ({
        id: item.id,
        category: item.category,
        supplier_id: item.supplier_id || '',
        supplierName: item.supplier_name,
        selected_id: item.supplier_id || '',
        description: item.description,
        unit_price: item.unit_price ?? (item as unknown as { unitprice?: number }).unitprice ?? 0,
        quantity: item.quantity,
        tour_request_id: item.tour_request_id,
        confirmation_item_id: (item as unknown as Record<string, unknown>).confirmation_item_id as
          | string
          | undefined,
        advanced_by: (item as unknown as Record<string, unknown>).advanced_by as string | undefined,
        advanced_by_name: (item as unknown as Record<string, unknown>).advanced_by_name as
          | string
          | undefined,
      }))
  }, [requestItems, currentRequestId])

  // 當 DB 資料載入/變更時，同步到本地（僅在非 dirty 時）
  // 用 JSON 序列化比對避免物件參考不同導致無限迴圈
  const dbItemsJson = JSON.stringify(dbEditableItems)
  const prevDbItemsJsonRef = useRef('')
  useEffect(() => {
    if (dbItemsJson !== prevDbItemsJsonRef.current) {
      prevDbItemsJsonRef.current = dbItemsJson
      if (!isDirty) {
        setLocalItems(JSON.parse(dbItemsJson))
      }
    }
  }, [dbItemsJson, isDirty])

  // 切換請款單時重置 dirty 狀態
  useEffect(() => {
    setIsDirty(false)
    setDeletedItemIds([])
    setNewItemIds([])
    setLocalPaymentMethodId(currentRequest?.payment_method_id || null)
  }, [selectedRequestId, currentRequest?.payment_method_id])

  // === 本地操作（不寫 DB） ===
  const handleUpdateItem = useCallback((itemId: string, updates: Partial<RequestItem>) => {
    setLocalItems(prev => prev.map(item => (item.id === itemId ? { ...item, ...updates } : item)))
    setIsDirty(true)
  }, [])

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      setLocalItems(prev => prev.filter(item => item.id !== itemId))
      // 只有 DB 已存在的項目才需要刪除
      if (!newItemIds.includes(itemId)) {
        setDeletedItemIds(prev => [...prev, itemId])
      }
      setNewItemIds(prev => prev.filter(id => id !== itemId))
      setIsDirty(true)
    },
    [newItemIds]
  )

  const handleAddItem = useCallback(() => {
    const newId = `new_${Math.random().toString(36).substr(2, 9)}`
    setLocalItems(prev => [
      ...prev,
      {
        id: newId,
        category: '' as PaymentItemCategory,
        supplier_id: '',
        supplierName: '',
        description: '',
        unit_price: 0,
        quantity: 1,
      },
    ])
    setNewItemIds(prev => [...prev, newId])
    setIsDirty(true)
  }, [])

  // 確保 supplierName 有值（新建供應商時 suppliers 可能還沒刷新）
  const resolveSupplierName = (item: RequestItem): string | null => {
    if (item.supplierName) return item.supplierName
    const id = item.supplier_id || item.selected_id
    if (!id) return null
    return combinedSuppliers.find(s => s.id === id)?.name || null
  }

  // === 存檔：一次寫入 DB ===
  const handleSave = async () => {
    if (!currentRequest || is_submitting) return
    setIsSubmitting(true)

    try {
      // 1. 刪除被移除的項目
      for (const id of deletedItemIds) {
        await paymentRequestService.deleteItem(currentRequest.id, id)
      }

      // 2. 新增新項目（直接 insert，避免 service 的 getById 快取問題）
      const newItems = localItems.filter(i => newItemIds.includes(i.id))
      if (newItems.length > 0) {
        const rows = newItems.map((item, idx) => ({
          request_id: currentRequest.id,
          category: item.category || null,
          supplier_id: item.supplier_id || null,
          supplier_name: resolveSupplierName(item),
          description: item.description,
          unitprice: item.unit_price,
          quantity: item.quantity,
          subtotal: item.unit_price * item.quantity,
          sort_order: localItems.indexOf(item) + 1,
          advanced_by: item.advanced_by === '_pending' ? null : item.advanced_by || null,
          advanced_by_name: item.advanced_by_name || null,
          item_number: `${currentRequest.code}-${dbEditableItems.length + idx + 1}`,
        }))
        await supabase.from('payment_request_items').insert(rows)
      }

      // 3. 更新既有項目
      for (const item of localItems.filter(i => !newItemIds.includes(i.id))) {
        const dbUpdates: Record<string, unknown> = {
          category: item.category,
          supplier_id: item.supplier_id || null,
          supplier_name: resolveSupplierName(item),
          description: item.description,
          unitprice: item.unit_price,
          quantity: item.quantity,
          subtotal: item.unit_price * item.quantity,
          advanced_by: item.advanced_by === '_pending' ? null : item.advanced_by || null,
          advanced_by_name: item.advanced_by_name || null,
        }
        await supabase
          .from('payment_request_items')
          .update(dbUpdates as never)
          .eq('id', item.id)
      }

      // 4. 更新請款單總金額和付款方式
      const newTotal = localItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
      const { error: amountError } = await supabase
        .from('payment_requests')
        .update({
          amount: newTotal,
          payment_method_id: localPaymentMethodId || null,
        })
        .eq('id', currentRequest.id)
      if (amountError) {
        logger.error('更新請款單金額失敗:', amountError)
      }

      // 5. 重新整理快取（items + 列表）
      await refreshRequestItems()
      await invalidatePaymentRequests()
      if (currentRequest.tour_id) {
        await recalculateExpenseStats(currentRequest.tour_id)
      }

      setIsDirty(false)
      setDeletedItemIds([])
      setNewItemIds([])
      await alert('儲存成功', 'success')
      onOpenChange(false)
    } catch (error) {
      logger.error('儲存失敗:', error)
      void alert('儲存失敗，請稍後再試', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 刪除請款單
  const handleDelete = async () => {
    if (!currentRequest || is_submitting) return
    const deleteMessage = isBatch
      ? REQUEST_LABELS.確定要刪除此請款單(currentRequest.code)
      : REQUEST_DETAIL_DIALOG_LABELS.確定要刪除此請款單嗎_此操作無法復原

    const confirmed = await confirm(deleteMessage, {
      title: REQUEST_DETAIL_DIALOG_LABELS.刪除請款單,
      type: 'warning',
    })
    if (!confirmed) return

    setIsSubmitting(true)
    try {
      await deletePaymentRequestApi(currentRequest.id)
      if (currentRequest.tour_id) {
        await recalculateExpenseStats(currentRequest.tour_id)
      }
      await alert(REQUEST_DETAIL_DIALOG_LABELS.請款單已刪除, 'success')

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

  // 關閉時如果有未儲存的修改，提示
  const handleOpenChange = async (newOpen: boolean) => {
    if (!newOpen && isDirty) {
      const confirmed = await confirm('有未儲存的修改，確定要離開嗎？', {
        title: '未儲存的修改',
        type: 'warning',
      })
      if (!confirmed) return
    }
    if (!newOpen) {
      setIsDirty(false)
      setDeletedItemIds([])
      setNewItemIds([])
    }
    onOpenChange(newOpen)
  }

  // 只有待處理狀態才能編輯（已確認/已出帳的被出納單鎖定）
  const canEdit = !readOnly && currentRequest?.status === 'pending'

  if (!request || !currentRequest) return null

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
              <DateCell
                date={currentRequest.request_date || currentRequest.created_at}
                showIcon={false}
              />
            </div>
            <div>
              <p className="text-xs text-morandi-muted mb-1">{REQUEST_DETAIL_FORM_LABELS.總金額}</p>
              <CurrencyCell
                amount={currentRequest.amount || 0}
                className="font-semibold text-morandi-gold"
              />
            </div>
            <div>
              <p className="text-xs text-morandi-muted mb-1">付款方式</p>
              {canEdit ? (
                <Select
                  value={localPaymentMethodId || ''}
                  onValueChange={value => {
                    setLocalPaymentMethodId(value || null)
                    setIsDirty(true)
                  }}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="選擇付款方式" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((m: { id: string; name: string }) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium text-morandi-primary">
                  {paymentMethods.find(
                    (m: { id: string; name: string }) => m.id === currentRequest.payment_method_id
                  )?.name || '-'}
                </p>
              )}
            </div>
          </div>

          {/* 請款項目 */}
          <EditableRequestItemList
            items={localItems}
            suppliers={combinedSuppliers}
            updateItem={handleUpdateItem}
            removeItem={handleRemoveItem}
            addNewEmptyItem={handleAddItem}
            onCreateSupplier={handleCreateSupplier}
            tourId={currentRequest.tour_id || null}
            disabled={!canEdit}
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
          <div className="flex items-center justify-between pt-4 border-t border-morandi-container/20">
            {canEdit ? (
              <>
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
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={is_submitting || !isDirty}
                  className={cn(
                    'transition-all',
                    isDirty
                      ? 'bg-morandi-gold hover:bg-morandi-gold/90 text-white'
                      : 'bg-morandi-container/50 text-morandi-muted cursor-not-allowed'
                  )}
                >
                  <Save size={16} className="mr-2" />
                  {is_submitting ? '儲存中...' : '儲存'}
                </Button>
              </>
            ) : (
              <p className="text-sm text-morandi-muted w-full text-center">
                此請款單已加入出納單，如需修改請先從出納單移除
              </p>
            )}
          </div>
        </div>
      </DialogContent>

      {/* 快速新增供應商 Dialog */}
      <CreateSupplierDialog
        open={createSupplierDialogOpen}
        onOpenChange={dialogOpen => {
          setCreateSupplierDialogOpen(dialogOpen)
          if (!dialogOpen && supplierCreateResolver) {
            supplierCreateResolver(null as unknown as string)
            setSupplierCreateResolver(null)
            setPendingSupplierName('')
          }
        }}
        defaultName={pendingSupplierName}
        onSuccess={handleSupplierCreated}
      />
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
