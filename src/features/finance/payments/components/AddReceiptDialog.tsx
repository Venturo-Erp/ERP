'use client'
/**
 * Add Receipt Dialog (Table-based Input)
 * 新增收款單對話框（表格式輸入，參考請款管理風格）
 */

import { logger } from '@/lib/utils/logger'
import { getTodayString } from '@/lib/utils/format-date'
import { useEffect, useState } from 'react'
import { Plus, Save, X, Copy, ExternalLink, Check, Trash2, Lock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Users, Building2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { confirm } from '@/lib/ui/alert-dialog'
import { usePaymentForm } from '../hooks/usePaymentForm'
import { useReceiptMutations, type LinkPayResult } from '../hooks/useReceiptMutations'
import { PaymentItemRow } from './PaymentItemRow'
import { Input } from '@/components/ui/input'
import type { Receipt } from '@/stores'
import { ADD_RECEIPT_DIALOG_LABELS, ADD_RECEIPT_TOAST_LABELS } from '../../constants/labels'

interface AddReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  /** 預設團 ID（從快速收款按鈕傳入） */
  defaultTourId?: string
  /** 預設訂單 ID（從快速收款按鈕傳入） */
  defaultOrderId?: string
  /** 編輯模式：傳入要編輯的收款單 */
  editingReceipt?: Receipt | null
  /** 編輯模式：更新回呼 */
  onUpdate?: (receiptId: string, data: Partial<Receipt>) => Promise<void>
  /** 編輯模式：刪除回呼 */
  onDelete?: (receiptId: string) => Promise<void>
}

export function AddReceiptDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultTourId,
  defaultOrderId,
  editingReceipt,
  onUpdate,
  onDelete,
}: AddReceiptDialogProps) {
  const { toast } = useToast()
  const {
    tours,
    formData,
    setFormData,
    paymentItems,
    filteredOrders,
    selectedOrder,
    totalAmount,
    addPaymentItem,
    removePaymentItem,
    updatePaymentItem,
    resetForm,
    validateForm,
    setPaymentItems,
  } = usePaymentForm()

  const { createReceiptWithItems, updateReceiptWithItems } = useReceiptMutations()

  // 是否為編輯模式
  const isEditMode = !!editingReceipt

  // 是否為已確認狀態（已確認的收款單不可編輯或刪除）
  const isConfirmed = editingReceipt?.status === '1'

  // 提交狀態（防止重複點擊）
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // LinkPay 結果
  const [linkPayResults, setLinkPayResults] = useState<LinkPayResult[]>([])
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  // 當對話框開啟時：載入資料、重置表單、設定預設值
  useEffect(() => {
    if (!open) return

    // 重置狀態
    setIsSubmitting(false)
    setLinkPayResults([])
    setCopiedLink(null)

    const initialize = async () => {
      const { invalidateTours, invalidateOrders } = await import('@/data')
      const { supabase } = await import('@/lib/supabase/client')

      // 確保 SWR 快取已載入
      await Promise.all([invalidateTours(), invalidateOrders()])

      // 編輯模式：載入收款單資料和項目
      if (editingReceipt) {
        setFormData({
          tour_id: editingReceipt.tour_id || '',
          order_id: editingReceipt.order_id || '',
          receipt_date: editingReceipt.receipt_date || getTodayString(),
        })

        // 從 receipt_items 載入項目
        const { data: receiptItems } = await supabase
          .from('receipt_items')
          .select('*')
          .eq('receipt_id', editingReceipt.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: true })
          .limit(500)

        if (receiptItems && receiptItems.length > 0) {
          // 有 receipt_items，用新的結構
          setPaymentItems(
            receiptItems.map(item => ({
              id: item.id,
              receipt_type: (item.receipt_type ?? 0) as 0 | 1 | 2 | 3 | 4,
              transaction_date: item.created_at?.split('T')[0] || getTodayString(),
              receipt_account: item.receipt_account || '',
              notes: item.notes || '',
              amount: Number(item.amount) || 0,
              email: item.email || '',
              payment_name: item.payment_name || '',
              pay_dateline: item.pay_dateline || '',
              handler_name: item.handler_name || '',
              account_info: item.account_info || '',
              fees: item.fees || 0,
              card_last_four: item.card_last_four || '',
              auth_code: item.auth_code || '',
              check_number: item.check_number || '',
              check_bank: item.check_bank || '',
            }))
          )
        } else {
          // 舊資料：從 receipt 主表載入（向下相容）
          setPaymentItems([
            {
              id: editingReceipt.id,
              receipt_type: editingReceipt.receipt_type ?? 0,
              transaction_date: editingReceipt.receipt_date || getTodayString(),
              receipt_account: editingReceipt.receipt_account || '',
              notes: editingReceipt.notes || '',
              amount: editingReceipt.receipt_amount || 0,
              email: editingReceipt.email || '',
              payment_name: editingReceipt.payment_name || '',
              pay_dateline: editingReceipt.pay_dateline || '',
              handler_name: editingReceipt.handler_name || '',
              account_info: editingReceipt.account_info || '',
              fees: editingReceipt.fees || 0,
              card_last_four: editingReceipt.card_last_four || '',
              auth_code: editingReceipt.auth_code || '',
              check_number: editingReceipt.check_number || '',
              check_bank: editingReceipt.check_bank || '',
            },
          ])
        }
        return
      }

      // 如果有預設訂單 ID，直接查詢該訂單取得團 ID
      if (defaultOrderId) {
        const { data: order } = await supabase
          .from('orders')
          .select('tour_id')
          .eq('id', defaultOrderId)
          .single()
        const tourId = order?.tour_id || defaultTourId || ''
        setFormData({
          tour_id: tourId,
          order_id: defaultOrderId,
          receipt_date: getTodayString(),
        })
      } else if (defaultTourId) {
        // 只有團 ID，沒有訂單 ID
        setFormData({
          tour_id: defaultTourId,
          order_id: '',
          receipt_date: getTodayString(),
        })
      } else {
        // 沒有任何預設值，重置表單
        resetForm()
      }
    }

    initialize().catch(err => logger.error('[initialize]', err))
  }, [open, defaultTourId, defaultOrderId, resetForm, setFormData, editingReceipt, setPaymentItems])

  // 如果只有一個訂單，自動帶入（編輯模式除外）
  useEffect(() => {
    if (!isEditMode && formData.tour_id && filteredOrders.length === 1 && !formData.order_id) {
      const order = filteredOrders[0]
      setFormData(prev => ({ ...prev, order_id: order.id }))
    }
  }, [isEditMode, formData.tour_id, filteredOrders, formData.order_id, setFormData])

  const handleSubmit = async () => {
    // 防止重複提交
    if (isSubmitting) return

    // 驗證表單
    const errors = validateForm()
    if (errors.length > 0) {
      toast({
        title: ADD_RECEIPT_DIALOG_LABELS.表單驗證失敗,
        description: errors[0],
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      // 取得使用者資訊
      const { useAuthStore } = await import('@/stores')
      const authStore = useAuthStore.getState()
      const user = authStore.user

      if (!user?.workspace_id) {
        throw new Error(ADD_RECEIPT_DIALOG_LABELS.無法取得_workspace_ID)
      }

      // 編輯模式：更新收款單
      if (isEditMode && editingReceipt && onUpdate) {
        const result = await updateReceiptWithItems({
          receipt: editingReceipt,
          formData,
          paymentItems,
          orderInfo: selectedOrder
            ? {
                customer_id: selectedOrder.customer_id,
              }
            : null,
          userId: user.id,
          workspaceId: user.workspace_id,
          onUpdate,
        })

        toast({
          title: ADD_RECEIPT_DIALOG_LABELS.收款單更新成功,
          description: ADD_RECEIPT_TOAST_LABELS.UPDATED(
            editingReceipt.receipt_number,
            result.itemCount
          ),
        })
        resetForm()
        onOpenChange(false)
        onSuccess?.()
        return
      }

      // 新增模式：建立收款單
      const tourInfo = tours.find(t => t.id === (selectedOrder?.tour_id || formData.tour_id))

      const result = await createReceiptWithItems({
        formData,
        paymentItems,
        orderInfo: selectedOrder
          ? {
              tour_id: selectedOrder.tour_id,
              customer_id: selectedOrder.customer_id,
              order_number: selectedOrder.order_number,
              tour_name: selectedOrder.tour_name,
            }
          : null,
        tourInfo: tourInfo
          ? {
              id: tourInfo.id,
              code: tourInfo.code,
              name: tourInfo.name,
            }
          : null,
        userId: user.id,
        workspaceId: user.workspace_id,
      })

      // 設定 LinkPay 結果
      if (result.linkPayResults.length > 0) {
        setLinkPayResults(result.linkPayResults)
        toast({
          title: ADD_RECEIPT_DIALOG_LABELS.收款單建立成功,
          description: ADD_RECEIPT_TOAST_LABELS.CREATED_WITH_LINKPAY(
            result.itemCount,
            result.linkPayResults.length
          ),
        })
        resetForm()
        onSuccess?.()
        // 不關閉對話框，讓使用者複製連結
      } else {
        toast({
          title: ADD_RECEIPT_TOAST_LABELS.CREATE_SUCCESS,
          description: ADD_RECEIPT_TOAST_LABELS.CREATED(
            result.itemCount,
            result.totalAmount.toLocaleString()
          ),
        })
        resetForm()
        onOpenChange(false)
        onSuccess?.()
      }
    } catch (error) {
      logger.error('[AddReceiptDialog] Create Receipt Error:', error)

      // 解析錯誤訊息
      let errorMessage = ADD_RECEIPT_DIALOG_LABELS.發生未知錯誤_請檢查必填欄位是否完整
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        const err = error as { message?: string; error?: string; details?: string; code?: string }
        if (err.message) {
          errorMessage = err.message
        } else if (err.error) {
          errorMessage = err.error
        } else if (err.details) {
          errorMessage = err.details
        } else if (err.code) {
          errorMessage = ADD_RECEIPT_TOAST_LABELS.ERROR_CODE(err.code)
        } else if (Object.keys(error).length > 0) {
          errorMessage = JSON.stringify(error)
        }
      }

      toast({
        title: ADD_RECEIPT_DIALOG_LABELS.建立失敗,
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    resetForm()
    setLinkPayResults([])
    setCopiedLink(null)
    onOpenChange(false)
  }

  const handleDelete = async () => {
    if (!editingReceipt || !onDelete) return

    const confirmed = await confirm(
      ADD_RECEIPT_TOAST_LABELS.DELETE_CONFIRM(editingReceipt.receipt_number),
      { type: 'warning', title: ADD_RECEIPT_DIALOG_LABELS.刪除收款單 }
    )

    if (!confirmed) return

    setIsDeleting(true)
    try {
      await onDelete(editingReceipt.id)
      toast({
        title: ADD_RECEIPT_DIALOG_LABELS.刪除成功,
        description: ADD_RECEIPT_TOAST_LABELS.DELETED(editingReceipt.receipt_number),
      })
      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      logger.error('[AddReceiptDialog] Delete receipt failed:', error)
      toast({
        title: ADD_RECEIPT_DIALOG_LABELS.刪除失敗,
        description: ADD_RECEIPT_DIALOG_LABELS.請稍後再試,
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={2} className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditMode
              ? ADD_RECEIPT_DIALOG_LABELS.編輯收款單
              : ADD_RECEIPT_DIALOG_LABELS.新增收款單}
            {isConfirmed && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-morandi-green/20 text-morandi-green text-xs font-medium">
                <Lock size={12} />
                {ADD_RECEIPT_DIALOG_LABELS.CONFIRM_469}
              </span>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isConfirmed
              ? ADD_RECEIPT_TOAST_LABELS.CONFIRMED_READONLY(editingReceipt?.receipt_number || '')
              : isEditMode
                ? ADD_RECEIPT_TOAST_LABELS.EDIT_TITLE(editingReceipt?.receipt_number || '')
                : ADD_RECEIPT_DIALOG_LABELS.收款單號將自動產生}
          </p>
        </DialogHeader>

        {/* 收款類型 Tab */}
        <Tabs defaultValue="tour" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-fit">
            <TabsTrigger value="tour" className="gap-2">
              <Users size={14} />
              團體收款
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-2">
              <Building2 size={14} />
              公司收款
            </TabsTrigger>
          </TabsList>

          {/* 團體收款 */}
          <TabsContent value="tour" className="flex-1 flex flex-col overflow-hidden mt-4">
            {/* 基本資訊 */}
            <div className="flex items-end gap-4">
          {/* 選擇團體 */}
          <div className="w-[300px]">
            <Label className="text-sm font-medium text-muted-foreground">
              {ADD_RECEIPT_DIALOG_LABELS.LABEL_3406}
            </Label>
            <Combobox
              options={tours.map(tour => ({
                value: tour.id,
                label: `${tour.code || ''} - ${tour.name || ''}`,
              }))}
              value={formData.tour_id}
              onChange={value => {
                setFormData(prev => ({
                  ...prev,
                  tour_id: value,
                  order_id: '',
                }))
              }}
              placeholder={ADD_RECEIPT_DIALOG_LABELS.請選擇團體}
              emptyMessage={ADD_RECEIPT_DIALOG_LABELS.找不到團體}
              className="mt-1 bg-card"
            />
          </div>

          {/* 選擇訂單 */}
          <div className="w-[350px]">
            <Label className="text-sm font-medium text-muted-foreground">
              {ADD_RECEIPT_DIALOG_LABELS.LABEL_3874}
            </Label>
            <Select
              disabled={!formData.tour_id || filteredOrders.length === 0}
              value={formData.order_id}
              onValueChange={value => setFormData(prev => ({ ...prev, order_id: value }))}
            >
              <SelectTrigger className="mt-1 bg-card border-morandi-container/30">
                <SelectValue
                  placeholder={
                    !formData.tour_id
                      ? ADD_RECEIPT_DIALOG_LABELS.請先選擇團體
                      : filteredOrders.length === 0
                        ? ADD_RECEIPT_DIALOG_LABELS.此團體沒有訂單
                        : ADD_RECEIPT_DIALOG_LABELS.請選擇訂單
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredOrders.map(order => (
                  <SelectItem key={order.id} value={order.id}>
                    {order.order_number} -{' '}
                    {order.contact_person || ADD_RECEIPT_DIALOG_LABELS.無聯絡人}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 收款項目 - 文青風表格 */}
        <div className="flex-1 flex flex-col overflow-hidden pt-4 border-t border-morandi-container/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-morandi-primary">
              {ADD_RECEIPT_DIALOG_LABELS.LABEL_4595}
            </h3>
            {/* 未確認的收款單都可以新增/刪除項目 */}
            {!isConfirmed && (
              <Button
                onClick={addPaymentItem}
                size="sm"
                variant="ghost"
                className="text-morandi-gold hover:bg-morandi-gold/10"
              >
                <Plus size={14} className="mr-2" />
                {ADD_RECEIPT_DIALOG_LABELS.ADD_2089}
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {/* 項目表格 */}
            <div className="border border-border rounded-lg overflow-hidden bg-card">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-xs text-morandi-primary font-medium bg-morandi-container/50">
                    <th
                      className="text-left py-2.5 px-3 border-b border-r border-border"
                      style={{ width: '110px' }}
                    >
                      {ADD_RECEIPT_DIALOG_LABELS.LABEL_5187}
                    </th>
                    <th
                      className="text-left py-2.5 px-3 border-b border-r border-border"
                      style={{ width: '150px' }}
                    >
                      {ADD_RECEIPT_DIALOG_LABELS.LABEL_1182}
                    </th>
                    <th
                      className="text-left py-2.5 px-3 border-b border-r border-border"
                      style={{ width: '180px' }}
                    >
                      {ADD_RECEIPT_DIALOG_LABELS.LABEL_6465}
                    </th>
                    <th className="text-left py-2.5 px-3 border-b border-r border-border">
                      {ADD_RECEIPT_DIALOG_LABELS.REMARKS}
                    </th>
                    <th
                      className="text-right py-2.5 px-3 border-b border-r border-border"
                      style={{ width: '120px' }}
                    >
                      {ADD_RECEIPT_DIALOG_LABELS.AMOUNT}
                    </th>
                    <th className="border-b border-border" style={{ width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {paymentItems.map((item, index) => (
                    <PaymentItemRow
                      key={item.id}
                      item={item}
                      index={index}
                      onUpdate={updatePaymentItem}
                      onRemove={removePaymentItem}
                      canRemove={paymentItems.length > 1}
                      isNewRow={index === paymentItems.length - 1}
                      orderInfo={
                        selectedOrder
                          ? {
                              order_number: selectedOrder.order_number || undefined,
                              tour_name: selectedOrder.tour_name || undefined,
                              contact_person: selectedOrder.contact_person || undefined,
                              contact_email:
                                (selectedOrder as { contact_email?: string }).contact_email ||
                                undefined,
                            }
                          : undefined
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* LinkPay 結果區域 */}
        {linkPayResults.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-morandi-gold/30 bg-morandi-gold/5 -mx-6 px-6 py-4">
            <h3 className="text-sm font-medium text-morandi-gold flex items-center gap-2">
              <ExternalLink size={16} />
              {ADD_RECEIPT_DIALOG_LABELS.LINKPAY_LINKS_GENERATED}
            </h3>
            <div className="space-y-2">
              {linkPayResults.map(result => (
                <div
                  key={result.receiptNumber}
                  className="flex items-center gap-3 bg-card rounded-lg px-4 py-3 border border-morandi-gold/20"
                >
                  <span className="text-sm font-medium text-morandi-primary min-w-[120px]">
                    {result.receiptNumber}
                  </span>
                  <Input
                    value={result.link}
                    readOnly
                    className="flex-1 text-xs bg-morandi-container/30 border-0"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(result.link)
                      setCopiedLink(result.receiptNumber)
                      setTimeout(() => setCopiedLink(null), 2000)
                    }}
                    className="gap-1 text-morandi-gold hover:bg-morandi-gold/10"
                  >
                    {copiedLink === result.receiptNumber ? (
                      <>
                        <Check size={14} />
                        {ADD_RECEIPT_DIALOG_LABELS.COPYING_1937}
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        {ADD_RECEIPT_DIALOG_LABELS.COPY}
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(result.link, '_blank')}
                    className="gap-1 text-morandi-secondary hover:bg-morandi-container/50"
                  >
                    <ExternalLink size={14} />
                    {ADD_RECEIPT_DIALOG_LABELS.LABEL_1670}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

          </TabsContent>

          {/* 公司收款 */}
          <TabsContent value="company" className="flex-1 flex flex-col overflow-hidden mt-4">
            <div className="flex-1 flex items-center justify-center text-morandi-secondary">
              <div className="text-center space-y-4">
                <Building2 size={48} className="mx-auto text-morandi-container" />
                <div>
                  <p className="text-lg font-medium">公司收款</p>
                  <p className="text-sm">非旅遊團的收入（顧問費、利息收入等）</p>
                  <p className="text-sm text-morandi-gold mt-2">功能開發中...</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* 操作按鈕 */}
        <div className="flex justify-between items-center pt-4 border-t border-border">
          {/* 左側：總金額 + 刪除按鈕 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-morandi-secondary">
                {ADD_RECEIPT_DIALOG_LABELS.TOTAL_6550}
              </span>
              <span className="text-lg font-semibold text-morandi-gold w-[120px]">
                NT$ {totalAmount.toLocaleString()}
              </span>
            </div>
            {/* 刪除按鈕：只在編輯模式且未確認時顯示 */}
            {isEditMode && !isConfirmed && onDelete && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isDeleting}
                className="gap-2 text-morandi-red border-morandi-red hover:bg-morandi-red hover:text-white"
              >
                <Trash2 size={16} />
                {isDeleting ? ADD_RECEIPT_DIALOG_LABELS.刪除中 : ADD_RECEIPT_DIALOG_LABELS.刪除}
              </Button>
            )}
          </div>

          {/* 右側：按鈕 */}
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleCancel} className="gap-2">
              <X size={16} />
              {linkPayResults.length > 0
                ? ADD_RECEIPT_DIALOG_LABELS.關閉
                : isConfirmed
                  ? ADD_RECEIPT_DIALOG_LABELS.關閉
                  : ADD_RECEIPT_DIALOG_LABELS.取消}
            </Button>
            {linkPayResults.length === 0 && !isConfirmed && (
              <Button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  !formData.tour_id ||
                  !formData.order_id ||
                  paymentItems.length === 0
                }
                className="bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-2"
              >
                <Save size={16} />
                {isSubmitting
                  ? isEditMode
                    ? ADD_RECEIPT_DIALOG_LABELS.更新中
                    : ADD_RECEIPT_DIALOG_LABELS.建立中
                  : isEditMode
                    ? ADD_RECEIPT_DIALOG_LABELS.更新收款單
                    : ADD_RECEIPT_TOAST_LABELS.ADD_TITLE(paymentItems.length)}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
