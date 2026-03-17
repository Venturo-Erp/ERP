'use client'

import { useEffect, useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { Trash2, Plus, Pencil, X, Save, Layers } from 'lucide-react'
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

  // 編輯模式狀態
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [newItem, setNewItem] = useState({
    category: '' as PaymentRequestItem['category'],
    supplier_id: '',
    supplier_name: '',
    description: '',
    unit_price: 0,
    quantity: 1,
  })
  const [editItem, setEditItem] = useState<Partial<PaymentRequestItem>>({})
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

  // 重置編輯狀態
  useEffect(() => {
    if (!open) {
      setEditingItemId(null)
      setIsAddingItem(false)
      setNewItem({
        category: REQUEST_TYPE_LABELS.CAT_OTHER as PaymentItemCategory,
        supplier_id: '',
        supplier_name: '',
        description: '',
        unit_price: 0,
        quantity: 1,
      })
    }
  }, [open])

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

  if (!request || !currentRequest) return null

  // 取得當前選中請款單的項目
  const items = requestItems.filter(item => item.request_id === currentRequest.id)

  // 取得關聯的團
  const tour = currentRequest.tour_id ? tours.find(t => t.id === currentRequest.tour_id) : null

  // 付款對象選項（給 Combobox 使用）
  const supplierOptions = suppliers.map(s => ({
    value: s.id,
    label: s.name || REQUEST_DETAIL_DIALOG_LABELS.未命名,
  }))

  // 員工選項（代墊款用）
  const employeeOptions = suppliers.filter(s => s.type === 'employee').map(s => ({
    value: s.id,
    label: s.name || REQUEST_DETAIL_DIALOG_LABELS.未命名,
  }))

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

  // 新增項目
  const handleAddItem = async () => {
    if (is_submitting) return
    if (!newItem.description || newItem.unit_price <= 0) {
      await alert(REQUEST_DETAIL_DIALOG_LABELS.請填寫說明和單價, 'warning')
      return
    }

    try {
      const selectedSupplier = suppliers.find(s => s.id === newItem.supplier_id)
      await paymentRequestService.addItem(currentRequest.id, {
        category: newItem.category,
        supplier_id: newItem.supplier_id || '',
        supplier_name: selectedSupplier?.name || newItem.supplier_name || '',
        description: newItem.description,
        unit_price: newItem.unit_price,
        quantity: newItem.quantity,
        notes: '',
        sort_order: items.length + 1,
      })

      await refreshRequestItems()

      // 重算團成本
      if (currentRequest.tour_id) {
        await recalculateExpenseStats(currentRequest.tour_id)
      }

      setIsAddingItem(false)
      setNewItem({
        category: REQUEST_TYPE_LABELS.CAT_OTHER as PaymentItemCategory,
        supplier_id: '',
        supplier_name: '',
        description: '',
        unit_price: 0,
        quantity: 1,
      })
    } catch (error) {
      logger.error('新增項目失敗:', error)
      await alert(REQUEST_DETAIL_DIALOG_LABELS.新增項目失敗, 'error')
    }
  }

  // 開始編輯項目
  const startEditItem = (item: PaymentRequestItem) => {
    setEditingItemId(item.id)
    // 處理資料庫欄位名稱 unitprice vs TypeScript 介面 unit_price
    const unitPrice = (item as unknown as { unitprice?: number }).unitprice ?? item.unit_price ?? 0
    setEditItem({
      category: item.category,
      supplier_id: item.supplier_id,
      supplier_name: item.supplier_name,
      description: item.description,
      unit_price: unitPrice,
      quantity: item.quantity,
    })
  }

  // 儲存編輯
  const handleSaveEdit = async (itemId: string) => {
    if (is_submitting) return
    setIsSubmitting(true)
    try {
      const selectedSupplier = suppliers.find(s => s.id === editItem.supplier_id)
      await paymentRequestService.updateItem(currentRequest.id, itemId, {
        ...editItem,
        supplier_name: selectedSupplier?.name || editItem.supplier_name,
      })
      await refreshRequestItems()
      setEditingItemId(null)

      // 重算團成本
      if (currentRequest.tour_id) {
        await recalculateExpenseStats(currentRequest.tour_id)
      }
    } catch (error) {
      logger.error('更新項目失敗:', error)
      await alert(REQUEST_DETAIL_DIALOG_LABELS.更新項目失敗, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 刪除項目
  const handleDeleteItem = async (itemId: string) => {
    const confirmed = await confirm(REQUEST_DETAIL_DIALOG_LABELS.確定要刪除此項目嗎, {
      title: REQUEST_DETAIL_DIALOG_LABELS.刪除項目,
      type: 'warning',
    })
    if (!confirmed) return

    try {
      await paymentRequestService.deleteItem(currentRequest.id, itemId)
      await refreshRequestItems()

      // 重算團成本
      if (currentRequest.tour_id) {
        await recalculateExpenseStats(currentRequest.tour_id)
      }
    } catch (error) {
      logger.error('刪除項目失敗:', error)
      await alert(REQUEST_DETAIL_DIALOG_LABELS.刪除項目失敗, 'error')
    }
  }

  // 判斷是否可以編輯（只有待處理狀態可以編輯）
  const canEdit = currentRequest.status === 'pending'

  // 是否正在編輯中（新增或編輯項目）
  const isEditing = isAddingItem || editingItemId !== null

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

          {/* 請款項目 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-morandi-primary">
                請款項目 ({items.length} 項)
              </h3>
              {canEdit && !isAddingItem && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddingItem(true)}
                  className="h-7"
                >
                  <Plus size={14} className="mr-1" />
                  {REQUEST_DETAIL_FORM_LABELS.ADD_2089}
                </Button>
              )}
            </div>

            <div className="border border-morandi-container/20 rounded-lg overflow-hidden">
              {/* 表頭 */}
              <div className="bg-morandi-background/50 border-b border-morandi-container/20">
                <div
                  className={`grid ${canEdit ? 'grid-cols-[80px_1fr_1fr_96px_64px_96px_80px]' : 'grid-cols-[80px_1fr_1fr_96px_64px_96px]'} px-3 py-2.5`}
                >
                  <span className="text-xs font-medium text-morandi-muted">
                    {REQUEST_DETAIL_FORM_LABELS.類別}
                  </span>
                  <span className="text-xs font-medium text-morandi-muted">
                    {REQUEST_DETAIL_FORM_LABELS.付款對象}
                  </span>
                  <span className="text-xs font-medium text-morandi-muted">
                    {REQUEST_DETAIL_FORM_LABELS.說明}
                  </span>
                  <span className="text-xs font-medium text-morandi-muted text-right">
                    {REQUEST_DETAIL_FORM_LABELS.單價}
                  </span>
                  <span className="text-xs font-medium text-morandi-muted text-center">
                    {REQUEST_DETAIL_FORM_LABELS.數量}
                  </span>
                  <span className="text-xs font-medium text-morandi-muted text-right">
                    {REQUEST_DETAIL_FORM_LABELS.小計}
                  </span>
                  {canEdit && (
                    <span className="text-xs font-medium text-morandi-muted text-center">
                      {REQUEST_DETAIL_FORM_LABELS.操作}
                    </span>
                  )}
                </div>
              </div>

              {/* 項目區域 */}
              <div className="max-h-[280px] overflow-y-auto">
                {/* 新增項目表單 */}
                {isAddingItem && (
                  <div
                    className={`grid ${canEdit ? 'grid-cols-[80px_1fr_1fr_96px_64px_96px_80px]' : 'grid-cols-[80px_1fr_1fr_96px_64px_96px]'} px-2 py-1.5 border-b border-morandi-container/10 bg-morandi-gold/5 items-center`}
                  >
                    <div>
                      <Select
                        value={newItem.category}
                        onValueChange={value =>
                          setNewItem({
                            ...newItem,
                            category: value as PaymentRequestItem['category'],
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs border-0 shadow-none bg-transparent">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryOptions.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Combobox
                        options={supplierOptions}
                        value={newItem.supplier_id}
                        onChange={value => setNewItem({ ...newItem, supplier_id: value })}
                        placeholder={REQUEST_DETAIL_DIALOG_LABELS.選擇付款對象}
                        className="[&_input]:h-8 [&_input]:text-xs [&_input]:bg-transparent"

                      />
                    </div>
                    <div className="space-y-1">
                      <Input
                        value={newItem.description}
                        onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                        placeholder={REQUEST_DETAIL_DIALOG_LABELS.說明}
                        className="h-8 text-xs border-0 shadow-none bg-transparent"
                      />
                    </div>
                    <div>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={newItem.unit_price || ''}
                        onChange={e => {
                          const num = parseFloat(e.target.value) || 0
                          setNewItem({ ...newItem, unit_price: num })
                        }}
                        className="h-8 text-xs text-right border-0 shadow-none bg-transparent"
                      />
                    </div>
                    <div>
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={newItem.quantity || ''}
                        onChange={e => {
                          const num = parseInt(e.target.value) || 0
                          setNewItem({ ...newItem, quantity: num })
                        }}
                        className="h-8 text-xs text-center border-0 shadow-none bg-transparent"
                      />
                    </div>
                    <div className="text-right pr-2">
                      <CurrencyCell
                        amount={newItem.unit_price * newItem.quantity}
                        className="text-morandi-gold text-sm"
                      />
                    </div>
                    {canEdit && (
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="icon"
                          aria-label="Close"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={handleAddItem}
                        >
                          <Save size={14} className="text-status-success" />
                        </Button>
                        <Button
                          size="icon"
                          aria-label="Close"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => setIsAddingItem(false)}
                        >
                          <X size={14} className="text-status-danger" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {items.length === 0 && !isAddingItem ? (
                  <div className="text-center py-8 text-morandi-muted">
                    {REQUEST_DETAIL_FORM_LABELS.EMPTY_9932}
                  </div>
                ) : (
                  items.map(item => (
                    <div
                      key={item.id}
                      className={`grid ${canEdit ? 'grid-cols-[80px_1fr_1fr_96px_64px_96px_80px]' : 'grid-cols-[80px_1fr_1fr_96px_64px_96px]'} px-2 py-1.5 border-b border-morandi-container/10 items-center hover:bg-morandi-container/5`}
                    >
                      {editingItemId === item.id ? (
                        /* 編輯模式 */
                        <>
                          <div>
                            <Select
                              value={editItem.category || ''}
                              onValueChange={value =>
                                setEditItem({
                                  ...editItem,
                                  category: value as PaymentRequestItem['category'],
                                })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs border-0 shadow-none bg-transparent">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categoryOptions.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Combobox
                              options={supplierOptions}
                              value={editItem.supplier_id || ''}
                              onChange={value => setEditItem({ ...editItem, supplier_id: value })}
                              placeholder={REQUEST_DETAIL_DIALOG_LABELS.選擇付款對象}
                              className="[&_input]:h-8 [&_input]:text-xs [&_input]:bg-transparent"
                            />
                          </div>
                          <div>
                            <Input
                              value={editItem.description || ''}
                              onChange={e =>
                                setEditItem({ ...editItem, description: e.target.value })
                              }
                              className="h-8 text-xs border-0 shadow-none bg-transparent"
                            />
                          </div>
                          <div>
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={editItem.unit_price || ''}
                              onChange={e => {
                                const num = parseFloat(e.target.value) || 0
                                setEditItem({ ...editItem, unit_price: num })
                              }}
                              className="h-8 text-xs text-right border-0 shadow-none bg-transparent"
                            />
                          </div>
                          <div>
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={editItem.quantity || ''}
                              onChange={e => {
                                const num = parseInt(e.target.value) || 0
                                setEditItem({ ...editItem, quantity: num })
                              }}
                              className="h-8 text-xs text-center border-0 shadow-none bg-transparent"
                            />
                          </div>
                          <div className="text-right pr-2">
                            <CurrencyCell
                              amount={(editItem.unit_price || 0) * (editItem.quantity || 0)}
                              className="text-morandi-gold text-sm"
                            />
                          </div>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="icon"
                              aria-label="Close"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => handleSaveEdit(item.id)}
                            >
                              <Save size={14} className="text-status-success" />
                            </Button>
                            <Button
                              size="icon"
                              aria-label="Close"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => setEditingItemId(null)}
                            >
                              <X size={14} className="text-status-danger" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        /* 顯示模式 */
                        <>
                          <div className="text-sm px-1">
                            {categoryOptions.find(c => c.value === item.category)?.label ||
                              item.category}
                          </div>
                          <div className="text-sm px-1">{item.supplier_name || '-'}</div>
                          <div className="text-sm px-1">{item.description || '-'}</div>
                          <div className="text-right pr-2">
                            <CurrencyCell
                              amount={
                                (item as unknown as { unitprice?: number }).unitprice ??
                                item.unit_price ??
                                0
                              }
                              className="text-sm"
                            />
                          </div>
                          <div className="text-sm text-center">{item.quantity}</div>
                          <div className="text-right pr-2">
                            <CurrencyCell
                              amount={item.subtotal || 0}
                              className="text-morandi-gold text-sm"
                            />
                          </div>
                          {canEdit && (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="icon"
                                aria-label="Delete"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => startEditItem(item)}
                              >
                                <Pencil size={14} className="text-morandi-secondary" />
                              </Button>
                              <Button
                                size="icon"
                                aria-label="Delete"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => handleDeleteItem(item.id)}
                              >
                                <Trash2 size={14} className="text-status-danger" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* 合計 */}
              <div className="bg-morandi-background/50 border-t border-morandi-container/20">
                <div
                  className={`grid ${canEdit ? 'grid-cols-[80px_1fr_1fr_96px_64px_96px_80px]' : 'grid-cols-[80px_1fr_1fr_96px_64px_96px]'} px-3 py-3`}
                >
                  <div></div>
                  <div></div>
                  <div></div>
                  <div></div>
                  <div className="text-right font-semibold text-sm">
                    {REQUEST_DETAIL_FORM_LABELS.合計}
                  </div>
                  <div className="text-right pr-2">
                    <CurrencyCell
                      amount={currentRequest.amount || 0}
                      className="font-bold text-morandi-gold"
                    />
                  </div>
                  {canEdit && <div></div>}
                </div>
              </div>
            </div>
          </div>

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
