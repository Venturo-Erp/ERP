'use client'
/**
 * Add Receipt Dialog (Table-based Input)
 * 新增收款單對話框（表格式輸入，參考請款管理風格）
 */

import { logger } from '@/lib/utils/logger'
import { getTodayString } from '@/lib/utils/format-date'
import { useEffect, useState } from 'react'
import { Plus, Save, X, Copy, ExternalLink, Check, Trash2, Lock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/status-badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import { useToast } from '@/components/ui/use-toast'
import { confirm } from '@/lib/ui/alert-dialog'
import { usePaymentForm } from '../hooks/usePaymentForm'
import { useReceiptMutations, type LinkPayResult } from '../hooks/useReceiptMutations'
import { recalculateReceiptStats } from '../services/receipt-core.service'
import { PaymentItemRow } from './PaymentItemRow'
import { InlineEditTable, type InlineEditColumn } from '@/components/ui/inline-edit-table'
import { useResetOnTabChange } from '@/hooks/useResetOnTabChange'
import { formatMoney } from '@/lib/utils/format-currency'
import type { PaymentItem } from '../types'
import { Input } from '@/components/ui/input'
import type { Receipt } from '@/stores'
import { useAuthStore } from '@/stores'
import { useCapabilities, CAPABILITIES } from '@/lib/permissions'
import { usePaymentMethodsCached } from '@/data/hooks'
import { useTranslations } from 'next-intl'

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
  const t = useTranslations('finance')

  const { toast } = useToast()
  const {
    tours,
    formData,
    setFormData,
    paymentItems,
    filteredOrders,
    selectedOrder,
    totalAmount,
    totalActualAmount,
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

  // 是否為已確認狀態
  const isConfirmed = editingReceipt?.status === 'confirmed'

  // 權限判斷（HR 職務管理為單一標準）
  const { user } = useAuthStore()
  const { can } = useCapabilities()
  const canManagePayments = can(CAPABILITIES.FINANCE_MANAGE_PAYMENTS)
  const canConfirmCheck = can(CAPABILITIES.FINANCE_CONFIRM_PAYMENTS)

  // 是否可編輯（未確認 or 有收款寫入權）
  const canEdit = !isConfirmed || canManagePayments
  // 是否可確認（有確認核帳寫入權 + 編輯模式 + 未確認）
  const canConfirm = canConfirmCheck && isEditMode && !isConfirmed

  // Tab 狀態
  const [activeTab, setActiveTab] = useState('tour')

  // 切 tab 時清空表單，避免殘留資料污染另一種收款類型
  useResetOnTabChange(activeTab, resetForm, !isEditMode)

  // 收款項目表格的欄位定義（團體/公司共用；cell 內容由 PaymentItemRow 透過 rowRender 提供）
  const receiptColumns: InlineEditColumn<PaymentItem>[] = [
    {
      key: 'method',
      label: t('addReceiptDialog.label5187'),
      width: '110px',
      render: () => null,
    },
    {
      key: 'date',
      label: t('addReceiptDialog.label1182'),
      width: '150px',
      render: () => null,
    },
    {
      key: 'detail',
      label: t('addReceiptDialog.label6465'),
      width: '180px',
      render: () => null,
    },
    { key: 'remarks', label: t('addReceiptDialog.remarks'), render: () => null },
    { key: 'amount', label: '收款金額', width: '120px', align: 'right', render: () => null },
    { key: 'actual', label: '實收金額', width: '120px', align: 'right', render: () => null },
  ]

  // 提交狀態（防止重複點擊）
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // LinkPay 結果
  const [linkPayResults, setLinkPayResults] = useState<LinkPayResult[]>([])
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  // 收款方式（SWR 快取，統一在 Dialog 層級載入）
  const { methods: paymentMethods, loading: methodsLoading } = usePaymentMethodsCached('receipt')
  const [dialogLoading, setDialogLoading] = useState(false)

  // 當對話框開啟時：載入資料、重置表單、設定預設值
  useEffect(() => {
    if (!open) return

    // 重置狀態
    setIsSubmitting(false)
    setLinkPayResults([])
    setCopiedLink(null)
    setDialogLoading(true)

    const initialize = async () => {
      const { invalidateTours, invalidateOrders } = await import('@/data')
      const { supabase } = await import('@/lib/supabase/client')

      // 並行載入 SWR 快取（收款方式由 usePaymentMethodsCached hook 自動管理）
      await Promise.all([invalidateTours(), invalidateOrders()])

      // 使用 hook 提供的 paymentMethods（SWR 快取）
      const loadedMethods = paymentMethods

      // 編輯模式：載入收款單資料和項目
      if (editingReceipt) {
        setFormData({
          tour_id: editingReceipt.tour_id || '',
          order_id: editingReceipt.order_id || '',
          receipt_date: editingReceipt.receipt_date || getTodayString(),
        })

        // 從 receipt 主表載入（receipt_items 表尚未建立）
        // 需要用 payment_method_id 去查詢對應的收款方式名稱（使用上方已載入的資料）
        const extReceipt = editingReceipt as { payment_method_id?: string; payment_method?: string }
        let receiptTypeValue: string | number = editingReceipt.receipt_type ?? 0

        // 如果有 payment_method_id，從已載入的收款方式中查找
        if (extReceipt.payment_method_id && loadedMethods.length > 0) {
          const matched = loadedMethods.find(m => m.id === extReceipt.payment_method_id)
          if (matched) {
            receiptTypeValue = matched.name
          }
        }

        setPaymentItems([
          {
            id: editingReceipt.id,
            receipt_type: receiptTypeValue as number,
            transaction_date: editingReceipt.receipt_date || getTodayString(),
            receipt_account: editingReceipt.receipt_account || '',
            notes: editingReceipt.notes || '',
            amount: editingReceipt.receipt_amount || 0,
            actual_amount: editingReceipt.actual_amount || 0,
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

    initialize()
      .catch(err => logger.error('[initialize]', err))
      .finally(() => setDialogLoading(false))
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
        title: t('addReceiptDialog.表單驗證失敗'),
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
        throw new Error(t('addReceiptDialog.無法取得_workspace_ID'))
      }

      // 編輯模式：更新收款單
      if (isEditMode && editingReceipt) {
        // 如果沒有傳入 onUpdate，使用預設的 supabase update
        const defaultUpdate = async (receiptId: string, data: Partial<Receipt>) => {
          const { supabase } = await import('@/lib/supabase/client')
          const { error } = await supabase
            .from('receipts')
            .update(data as Record<string, unknown>)
            .eq('id', receiptId)
          if (error) throw error
        }
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
          onUpdate: onUpdate || defaultUpdate,
        })

        toast({
          title: t('addReceiptDialog.收款單更新成功'),
          description: `已更新收款單 ${editingReceipt.receipt_number}（${result.itemCount} 個項目）`,
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
          title: t('addReceiptDialog.收款單建立成功'),
          description: `已新增 ${result.itemCount} 項收款，其中 ${result.linkPayResults.length} 項 LinkPay 已產生連結`,
        })
        resetForm()
        onSuccess?.()
        // 不關閉對話框，讓使用者複製連結
      } else {
        toast({
          title: t('addReceiptToast.createSuccess'),
          description: `已新增 ${result.itemCount} 項收款，總金額 NT$ ${formatMoney(result.totalAmount)}`,
        })
        resetForm()
        onOpenChange(false)
        onSuccess?.()
      }
    } catch (error) {
      logger.error(
        '[AddReceiptDialog] Create Receipt Error:',
        error,
        JSON.stringify(
          error,
          Object.getOwnPropertyNames(error instanceof Error ? error : Object(error))
        )
      )

      // 解析錯誤訊息
      let errorMessage = t('addReceiptDialog.發生未知錯誤_請檢查必填欄位是否完整')
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
          errorMessage = `錯誤代碼: ${err.code}`
        } else if (Object.keys(error).length > 0) {
          errorMessage = JSON.stringify(error)
        }
      }

      toast({
        title: t('addReceiptDialog.建立失敗'),
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
    if (!editingReceipt) return

    // 如果沒有傳入 onDelete，使用預設的 supabase delete
    const deleteFunc =
      onDelete ||
      (async (receiptId: string) => {
        const { supabase } = await import('@/lib/supabase/client')
        const { error } = await supabase.from('receipts').delete().eq('id', receiptId)
        if (error) throw error
      })

    const confirmed = await confirm(
      `確定要刪除收款單 ${editingReceipt.receipt_number} 嗎？此操作無法復原。`,
      { type: 'warning', title: t('addReceiptDialog.刪除收款單') }
    )

    if (!confirmed) return

    setIsDeleting(true)
    try {
      await deleteFunc(editingReceipt.id)
      toast({
        title: t('addReceiptDialog.刪除成功'),
        description: `收款單 ${editingReceipt.receipt_number} 已刪除`,
      })
      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      logger.error('[AddReceiptDialog] Delete receipt failed:', error)
      toast({
        title: t('addReceiptDialog.刪除失敗'),
        description: t('addReceiptDialog.請稍後再試'),
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={1} className="max-w-[95vw] w-[95vw] h-[90vh] flex flex-col">
        {/* 收款類型 Tab - 包住整個 header 和內容 */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {/* Header: Tab + 選擇器 + 標題 同一行 */}
          <DialogHeader className="flex-row items-center justify-between pb-4">
            {/* 左邊：Tab + 選擇器 */}
            <div className="flex items-center gap-4">
              {/* Tab 切換 */}
              <TabsList className="w-fit h-10">
                <TabsTrigger value="tour">團體收款</TabsTrigger>
                <TabsTrigger value="company">公司收款</TabsTrigger>
              </TabsList>

              {/* 團體收款：團號 + 訂單選擇器 */}
              {activeTab === 'tour' && (
                <>
                  <div className="relative z-[10020]">
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
                      placeholder={t('addReceiptDialog.請選擇團體')}
                      emptyMessage={t('addReceiptDialog.找不到團體')}
                      className="w-[350px]"
                      maxHeight="300px"
                    />
                  </div>

                  <div className="relative z-[10019]">
                    <Combobox
                      options={filteredOrders.map(order => ({
                        value: order.id,
                        label: `${order.order_number} - ${order.contact_person || t('addReceiptDialog.無聯絡人')}`,
                      }))}
                      value={formData.order_id}
                      onChange={value => setFormData(prev => ({ ...prev, order_id: value }))}
                      placeholder={
                        !formData.tour_id
                          ? '選擇團體後選擇訂單'
                          : filteredOrders.length === 0
                            ? t('addReceiptDialog.此團體沒有訂單')
                            : t('addReceiptDialog.請選擇訂單')
                      }
                      disabled={!formData.tour_id || filteredOrders.length === 0}
                      className="w-[300px]"
                      maxHeight="300px"
                    />
                  </div>
                </>
              )}
            </div>

            {/* 右邊：標題 */}
            <div className="text-right">
              <DialogTitle className="flex items-center justify-end gap-2">
                {isEditMode
                  ? t('addReceiptDialog.編輯收款單')
                  : t('addReceiptDialog.新增收款單')}
                {isConfirmed && (
                  <StatusBadge tone="success" label={t('addReceiptDialog.confirm469')} />
                )}
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* 團體收款 */}
          <TabsContent value="tour" className="flex-1 flex flex-col overflow-hidden">
            {dialogLoading ? (
              <div className="space-y-4 py-6 px-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-[60%]" />
              </div>
            ) : (
              <>
                <div className="flex-1 flex flex-col overflow-hidden pt-4 border-t border-morandi-container/30">
                  <InlineEditTable<PaymentItem>
                    title={t('addReceiptDialog.label4595')}
                    rows={paymentItems}
                    columns={receiptColumns}
                    onAdd={isConfirmed ? undefined : addPaymentItem}
                    addLabel={t('addReceiptDialog.add2089')}
                    readonly={isConfirmed}
                    className="flex-1 overflow-auto"
                    rowRender={(item, index) => (
                      <PaymentItemRow
                        key={item.id}
                        item={item}
                        index={index}
                        onUpdate={updatePaymentItem}
                        onRemove={removePaymentItem}
                        canRemove={paymentItems.length > 1}
                        isNewRow={!isEditMode && index === paymentItems.length - 1}
                        readonly={isConfirmed}
                        canConfirmReceipt={canConfirmCheck}
                        paymentMethods={paymentMethods}
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
                    )}
                  />
                </div>

                {/* LinkPay 結果區域 */}
                {linkPayResults.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-morandi-gold/30 bg-morandi-gold/5 -mx-6 px-6 py-4">
                    <h3 className="text-sm font-medium text-morandi-gold flex items-center gap-2">
                      <ExternalLink size={16} />
                      {t('addReceiptDialog.linkpayLinksGenerated')}
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
                                {t('addReceiptDialog.copying1937')}
                              </>
                            ) : (
                              <>
                                <Copy size={14} />
                                {t('addReceiptDialog.copy')}
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
                            {t('addReceiptDialog.label1670')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* 公司收款 */}
          <TabsContent value="company" className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden pt-4 border-t border-morandi-container/30">
              <InlineEditTable<PaymentItem>
                title={t('addReceiptDialog.label4595')}
                rows={paymentItems}
                columns={receiptColumns}
                onAdd={isConfirmed ? undefined : addPaymentItem}
                addLabel={t('addReceiptDialog.add2089')}
                readonly={isConfirmed}
                className="flex-1 overflow-auto"
                rowRender={(item, index) => (
                  <PaymentItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    onUpdate={updatePaymentItem}
                    onRemove={removePaymentItem}
                    canRemove={paymentItems.length > 1}
                    isNewRow={!isEditMode && index === paymentItems.length - 1}
                    mode="company"
                    readonly={isConfirmed}
                    canConfirmReceipt={canConfirmCheck}
                    paymentMethods={paymentMethods}
                  />
                )}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* 操作按鈕 */}
        <div className="flex justify-between items-center pt-4 border-t border-border">
          {/* 左側：總金額 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-morandi-secondary">
              {t('addReceiptDialog.total6550')}
            </span>
            <span className="text-lg font-semibold text-morandi-gold whitespace-nowrap">
              NT$ {formatMoney(totalAmount)}
            </span>
          </div>

          {/* 右側：刪除 + 存檔 */}
          <div className="flex items-center gap-2">
            {/* 刪除按鈕：編輯模式且未確認 */}
            {isEditMode && !isConfirmed && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={isDeleting}
                className="gap-2 text-morandi-red border-morandi-red hover:bg-morandi-red hover:text-white"
              >
                <Trash2 size={16} />
                {isDeleting ? t('addReceiptDialog.刪除中') : t('addReceiptDialog.刪除')}
              </Button>
            )}

            {/* 存檔按鈕 */}
            {linkPayResults.length === 0 && canEdit && (
              <Button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  !formData.tour_id ||
                  !formData.order_id ||
                  paymentItems.length === 0
                }
                className="bg-morandi-gold/15 text-morandi-primary border border-morandi-gold/30 hover:bg-morandi-gold/25 hover:border-morandi-gold/50 transition-colors gap-2"
              >
                <Save size={16} />
                {isSubmitting
                  ? isEditMode
                    ? t('addReceiptDialog.更新中')
                    : t('addReceiptDialog.建立中')
                  : isEditMode
                    ? t('addReceiptDialog.更新收款單')
                    : t('addReceiptDialog.新增收款單')}
              </Button>
            )}

            {/* 會計專用：確認收款 */}
            {canConfirm && (
              <Button
                onClick={async () => {
                  if (!editingReceipt) return
                  setIsSubmitting(true)
                  try {
                    await handleSubmit()
                    const updateFunc =
                      onUpdate ||
                      (async (id: string, data: Partial<Receipt>) => {
                        const { supabase } = await import('@/lib/supabase/client')
                        await supabase
                          .from('receipts')
                          .update(data as Record<string, unknown>)
                          .eq('id', id)
                      })
                    await updateFunc(editingReceipt.id, {
                      status: 'confirmed',
                      actual_amount: totalActualAmount || totalAmount,
                    } as Partial<Receipt>)
                    await recalculateReceiptStats(
                      editingReceipt.order_id,
                      editingReceipt.tour_id || null
                    )
                    toast({ title: '已確認收款' })
                    onSuccess?.()
                    onOpenChange(false)
                  } catch (error) {
                    toast({ title: '確認失敗', variant: 'destructive' })
                  } finally {
                    setIsSubmitting(false)
                  }
                }}
                disabled={isSubmitting}
                className="gap-2 bg-morandi-green hover:bg-morandi-green/90 text-white"
              >
                <Check size={16} />
                確認
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
