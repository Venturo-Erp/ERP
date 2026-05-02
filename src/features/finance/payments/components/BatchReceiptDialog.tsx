'use client'

import { getTodayString } from '@/lib/utils/format-date'

import { useState, useMemo, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useOrdersSlim, useToursSlim, createReceipt, invalidateReceipts } from '@/data'
import { useAuthStore } from '@/stores'
import { usePaymentMethodsCached } from '@/data/hooks'
import { logger } from '@/lib/utils/logger'
import { PaymentMethod } from '@/stores/types'
import {
  ADD_RECEIPT_DIALOG_LABELS,
  BATCH_RECEIPT_DIALOG_LABELS,
  BATCH_RECEIPT_FORM_LABELS,
  BATCH_RECEIPT_TOAST_LABELS,
} from '../../constants/labels'

// 擴展 OrderAllocation 加入備註
interface OrderAllocationWithNote {
  order_id: string
  order_number: string
  tour_id: string
  code: string
  tour_name: string
  contact_person: string
  allocated_amount: number
  notes: string
}
import { Plus, DollarSign, X, Check } from 'lucide-react'
import { UnallocatedAmountWarning } from '@/features/finance/components/UnallocatedAmountWarning'
import { formatMoney } from '@/lib/utils/format-currency'
import { cn } from '@/lib/utils'
import { alert } from '@/lib/ui/alert-dialog'
import { CurrencyCell } from '@/components/table-cells'

interface BatchReceiptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// 收款方式選項（從 DB 讀取）
// 不再使用 hardcoded fallback — 新租戶會透過 trigger 自動建立預設值

export function BatchReceiptDialog({ open, onOpenChange }: BatchReceiptDialogProps) {
  const { items: orders } = useOrdersSlim()
  const { items: tours } = useToursSlim()
  const { user } = useAuthStore()

  const [receiptDate, setReceiptDate] = useState(getTodayString())
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('' as PaymentMethod)
  const [totalAmount, setTotalAmount] = useState(0)
  // 訂單分配列表
  const [orderAllocations, setOrderAllocations] = useState<OrderAllocationWithNote[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  // 從 DB 讀取的收款方式
  const [paymentMethods, setPaymentMethods] = useState<{ value: string; label: string }[]>([])
  // 會計科目（選填）
  const [accountingSubjectId, setAccountingSubjectId] = useState<string>('')
  const [accountingSubjects, setAccountingSubjects] = useState<{ value: string; label: string }[]>(
    []
  )

  // 原始收款方式資料（含 id）
  // 收款方式（SWR 快取）
  const { methods: cachedMethods } = usePaymentMethodsCached('receipt')
  const [paymentMethodsRaw, setPaymentMethodsRaw] = useState<
    { id: string; code: string; name: string }[]
  >([])

  // 同步 SWR 快取到本地 state
  useEffect(() => {
    if (cachedMethods.length > 0) {
      const methods = cachedMethods as { id: string; code: string; name: string }[]
      setPaymentMethodsRaw(methods)
      setPaymentMethods(methods.map(m => ({ value: m.id, label: m.name })))
      if (!paymentMethod && methods.length > 0) {
        setPaymentMethod(methods[0].id as PaymentMethod)
      }

      // 載入會計科目（收入類）
      fetch(
        `/api/finance/accounting-subjects?workspace_id=${user?.workspace_id || ''}&type=revenue`
      )
        .then(res => res.json())
        .then(data => {
          const subjects = Array.isArray(data) ? data : []
          setAccountingSubjects(
            subjects.map((s: { id: string; code: string; name: string }) => ({
              value: s.id,
              label: `${s.code} ${s.name}`,
            }))
          )
        })
        .catch(() => {})
    }
  }, [user?.workspace_id])

  // 可用訂單（未收款或部分收款）
  const availableOrders = useMemo(() => {
    return orders.filter(
      order => order.payment_status === 'unpaid' || order.payment_status === 'partial'
    )
  }, [orders])

  // 已選擇的訂單 ID
  const selectedOrderIds = useMemo(() => {
    return new Set(orderAllocations.filter(a => a.order_id).map(a => a.order_id))
  }, [orderAllocations])

  // 計算已分配金額
  const totalAllocatedAmount = useMemo(() => {
    return orderAllocations.reduce((sum, allocation) => sum + allocation.allocated_amount, 0)
  }, [orderAllocations])

  // 未分配金額
  const unallocatedAmount = totalAmount - totalAllocatedAmount

  // 初始化（預設兩個空白行）
  useEffect(() => {
    if (open) {
      setReceiptDate(getTodayString())
      // 重置為第一個收款方式
      if (paymentMethodsRaw.length > 0) {
        setPaymentMethod(paymentMethodsRaw[0].id as PaymentMethod)
      }
      setTotalAmount(0)
      setOrderAllocations([
        {
          order_id: '',
          order_number: '',
          tour_id: '',
          code: '',
          tour_name: '',
          contact_person: '',
          allocated_amount: 0,
          notes: '',
        },
        {
          order_id: '',
          order_number: '',
          tour_id: '',
          code: '',
          tour_name: '',
          contact_person: '',
          allocated_amount: 0,
          notes: '',
        },
      ])
    }
  }, [open])

  // 新增訂單分配（空白行）
  const addOrderAllocation = () => {
    setOrderAllocations(prev => [
      ...prev,
      {
        order_id: '',
        order_number: '',
        tour_id: '',
        code: '',
        tour_name: '',
        contact_person: '',
        allocated_amount: 0,
        notes: '',
      },
    ])
  }

  // 移除訂單分配
  const removeOrderAllocation = (index: number) => {
    setOrderAllocations(prev => prev.filter((_, i) => i !== index))
  }

  // 更新訂單分配
  const updateOrderAllocation = (index: number, updates: Partial<OrderAllocationWithNote>) => {
    setOrderAllocations(prev =>
      prev.map((allocation, i) => (i === index ? { ...allocation, ...updates } : allocation))
    )
  }

  // 選擇訂單
  const selectOrder = (index: number, orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    updateOrderAllocation(index, {
      order_id: order.id,
      order_number: order.code,
      tour_id: order.tour_id ?? '',
      code: order.code || '',
      tour_name: order.tour_name || '',
      contact_person: order.contact_person ?? '',
    })
  }

  // 平均分配
  const distributeEvenly = () => {
    const validAllocations = orderAllocations.filter(a => a.order_id)
    if (validAllocations.length === 0 || totalAmount <= 0) return

    const amountPerOrder = Math.floor(totalAmount / validAllocations.length)
    const remainder = totalAmount - amountPerOrder * validAllocations.length

    let validIndex = 0
    setOrderAllocations(prev =>
      prev.map(allocation => {
        if (!allocation.order_id) return allocation
        const amount = amountPerOrder + (validIndex === 0 ? remainder : 0)
        validIndex++
        return { ...allocation, allocated_amount: amount }
      })
    )
  }

  // 重置表單
  const resetForm = () => {
    setReceiptDate(getTodayString())
    // 重置為第一個收款方式
    if (paymentMethodsRaw.length > 0) {
      setPaymentMethod(paymentMethodsRaw[0].id as PaymentMethod)
    }
    setTotalAmount(0)
    setOrderAllocations([
      {
        order_id: '',
        order_number: '',
        tour_id: '',
        code: '',
        tour_name: '',
        contact_person: '',
        allocated_amount: 0,
        notes: '',
      },
      {
        order_id: '',
        order_number: '',
        tour_id: '',
        code: '',
        tour_name: '',
        contact_person: '',
        allocated_amount: 0,
        notes: '',
      },
    ])
  }

  // 儲存
  const handleSave = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    // 過濾有選擇訂單且金額 > 0 的分配
    const validAllocations = orderAllocations.filter(a => a.order_id && a.allocated_amount > 0)

    if (validAllocations.length === 0) {
      void alert(BATCH_RECEIPT_DIALOG_LABELS.請至少選擇一個訂單並輸入金額, 'warning')
      return
    }

    if (totalAmount === 0) {
      void alert(BATCH_RECEIPT_DIALOG_LABELS.收款金額不能為_0, 'warning')
      return
    }

    if (unallocatedAmount !== 0) {
      void alert(
        BATCH_RECEIPT_FORM_LABELS.還有NT金額未分配(
          Math.abs(unallocatedAmount),
          unallocatedAmount > 0
            ? BATCH_RECEIPT_FORM_LABELS.未分配
            : BATCH_RECEIPT_DIALOG_LABELS.超出
        ),
        'warning'
      )
      return
    }

    if (!user?.workspace_id) {
      void alert(ADD_RECEIPT_DIALOG_LABELS.無法取得_workspace_ID, 'error')
      return
    }

    try {
      // 取得選中的收款方式
      const selectedPaymentMethod = paymentMethodsRaw.find(m => m.id === paymentMethod)
      const paymentMethodId = selectedPaymentMethod?.id || null

      // 收款方式名稱（新格式直接用 name）
      const paymentMethodName = selectedPaymentMethod?.name || '現金'

      // 映射到 receipt_type 數字（用於舊欄位向下相容）
      const nameToReceiptType: Record<string, number> = {
        現金: 1,
        匯款: 0,
        刷卡: 2,
        信用卡: 2,
        支票: 3,
        LinkPay: 4,
        'LINE Pay': 4,
      }
      const receiptTypeNum = nameToReceiptType[paymentMethodName] ?? 0

      // 為每個訂單分配建立一筆收款單
      for (const allocation of validAllocations) {
        const order = orders.find(o => o.id === allocation.order_id)
        if (!order) continue

        // 取得團號
        const tour = order.tour_id ? tours.find(t => t.id === order.tour_id) : null
        const tourCode = tour?.code || ''

        if (!tourCode || !order.tour_id) {
          logger.warn(`訂單 ${order.code} 沒有關聯團號，跳過`)
          continue
        }

        // 生成收款單號 — 透過 DB RPC、advisory lock 防 race
        const { supabase } = await import('@/lib/supabase/client')
        const { data: receiptNumber, error: numErr } = await supabase.rpc('generate_receipt_no', {
          p_tour_id: order.tour_id,
        })
        if (numErr || !receiptNumber) {
          logger.warn(`訂單 ${order.code} 生成收款單號失敗、跳過`)
          continue
        }

        await createReceipt({
          receipt_number: receiptNumber,
          workspace_id: user.workspace_id,
          order_id: allocation.order_id,
          tour_id: order.tour_id || null,
          customer_id: order.customer_id || null,
          order_number: order.order_number || order.code || '',
          tour_name: order.tour_name || tour?.name || '',
          receipt_date: receiptDate,
          payment_date: receiptDate,
          payment_method: paymentMethodName,
          payment_method_id: paymentMethodId,
          receipt_type: receiptTypeNum,
          receipt_amount: allocation.allocated_amount,
          actual_amount: 0,
          status: 'pending',
          notes: allocation.notes || null,
          created_by: user.id,
          updated_by: user.id,
          accounting_subject_id: accountingSubjectId || null,
          receipt_account: null,
          fees: null,
          is_active: true,
        })
      }

      // 刷新資料
      await invalidateReceipts()

      await alert(BATCH_RECEIPT_TOAST_LABELS.SUCCESS(validAllocations.length), 'success')
      onOpenChange(false)
      resetForm()
    } catch (error) {
      logger.error('批量收款建立失敗:', error)
      void alert(BATCH_RECEIPT_DIALOG_LABELS.建立失敗_請稍後再試, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={2} className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-morandi-gold" />
            {BATCH_RECEIPT_FORM_LABELS.LABEL_6021}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 基本資訊 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>{BATCH_RECEIPT_FORM_LABELS.收款日期}</Label>
              <DatePicker value={receiptDate} onChange={date => setReceiptDate(date)} />
            </div>
            <div>
              <Label>{BATCH_RECEIPT_FORM_LABELS.收款方式}</Label>
              <Select
                value={paymentMethod}
                onValueChange={value => setPaymentMethod(value as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(method => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{BATCH_RECEIPT_FORM_LABELS.總金額}</Label>
              <Input
                type="number"
                value={totalAmount || ''}
                onChange={e => setTotalAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* 會計科目（選填）*/}
          {accountingSubjects.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>會計科目（選填）</Label>
                <Select value={accountingSubjectId} onValueChange={setAccountingSubjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="請選擇會計科目" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">不指定</SelectItem>
                    {accountingSubjects.map(subject => (
                      <SelectItem key={subject.value} value={subject.value}>
                        {subject.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* 訂單分配表格 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                {BATCH_RECEIPT_FORM_LABELS.訂單分配}
              </Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={distributeEvenly}
                  disabled={
                    orderAllocations.filter(a => a.order_id).length === 0 || totalAmount === 0
                  }
                >
                  {BATCH_RECEIPT_FORM_LABELS.LABEL_2869}
                </Button>
                <Button size="sm" variant="outline" onClick={addOrderAllocation}>
                  <Plus className="h-4 w-4 mr-1" />
                  {BATCH_RECEIPT_FORM_LABELS.ADD_5419}
                </Button>
              </div>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-morandi-primary font-medium bg-morandi-container/40">
                    <th className="text-left py-2.5 px-3 border-b border-r border-border">
                      {BATCH_RECEIPT_FORM_LABELS.訂單}
                    </th>
                    <th className="text-left py-2.5 px-3 border-b border-r border-border w-40">
                      {BATCH_RECEIPT_FORM_LABELS.團名}
                    </th>
                    <th className="text-right py-2.5 px-3 border-b border-r border-border w-32">
                      {BATCH_RECEIPT_FORM_LABELS.分配金額}
                    </th>
                    <th className="text-left py-2.5 px-3 border-b border-r border-border w-48">
                      {BATCH_RECEIPT_FORM_LABELS.備註}
                    </th>
                    <th className="text-center py-2.5 px-3 border-b border-border w-14"></th>
                  </tr>
                </thead>
                <tbody>
                  {orderAllocations.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-6 text-morandi-secondary text-sm bg-card"
                      >
                        {BATCH_RECEIPT_FORM_LABELS.ADD_8367}
                      </td>
                    </tr>
                  ) : (
                    orderAllocations.map((allocation, index) => (
                      <tr key={index} className="bg-card hover:bg-morandi-container/10">
                        <td className="py-2 px-3 border-b border-r border-border">
                          <Combobox
                            options={availableOrders
                              .filter(
                                o => !selectedOrderIds.has(o.id) || o.id === allocation.order_id
                              )
                              .map(order => ({
                                value: order.id,
                                label: `${order.code} - ${order.contact_person || ADD_RECEIPT_DIALOG_LABELS.無聯絡人} (${order.tour_name})`,
                              }))}
                            value={allocation.order_id}
                            onChange={value => selectOrder(index, value)}
                            placeholder={BATCH_RECEIPT_DIALOG_LABELS.搜尋訂單}
                          />
                        </td>
                        <td className="py-2 px-3 border-b border-r border-border text-sm text-morandi-secondary">
                          {allocation.tour_name || '-'}
                        </td>
                        <td className="py-2 px-3 border-b border-r border-border">
                          <input
                            type="number"
                            value={allocation.allocated_amount || ''}
                            onChange={e =>
                              updateOrderAllocation(index, {
                                allocated_amount: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="input-no-focus w-full bg-transparent text-sm text-right"
                          />
                        </td>
                        <td className="py-2 px-3 border-b border-r border-border">
                          <input
                            type="text"
                            value={allocation.notes || ''}
                            onChange={e => updateOrderAllocation(index, { notes: e.target.value })}
                            className="input-no-focus w-full bg-transparent text-sm"
                          />
                        </td>
                        <td className="py-2 px-3 border-b border-border text-center">
                          <span
                            onClick={() => removeOrderAllocation(index)}
                            className="text-morandi-secondary cursor-pointer hover:text-morandi-red text-sm"
                            title={ADD_RECEIPT_DIALOG_LABELS.刪除}
                          >
                            ✕
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                  {/* 總計行 */}
                  <tr className="bg-morandi-container/20 font-medium">
                    <td className="py-2.5 px-3 border-r border-border text-sm text-morandi-primary">
                      {BATCH_RECEIPT_FORM_LABELS.共N筆總金額(
                        orderAllocations.filter(a => a.order_id).length
                      ).slice(0, -3)}
                    </td>
                    <td className="py-2.5 px-3 border-r border-border"></td>
                    <td className="py-2.5 px-3 border-r border-border text-right">
                      <CurrencyCell amount={totalAllocatedAmount} className="text-sm" />
                    </td>
                    <td className="py-2.5 px-3 border-r border-border"></td>
                    <td className="py-2.5 px-3 border-border"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 未分配提示 */}
            {totalAmount > 0 && (
              <UnallocatedAmountWarning
                amount={unallocatedAmount}
                underMessage={BATCH_RECEIPT_FORM_LABELS.還有金額未分配}
                overMessage={BATCH_RECEIPT_DIALOG_LABELS.分配金額超過總金額}
                labelSuffix="未分配"
              />
            )}
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex items-center gap-4 pt-4 border-t border-border">
          <div className="flex items-center text-sm">
            <span className="text-morandi-secondary">
              {BATCH_RECEIPT_FORM_LABELS.共N筆總金額(
                orderAllocations.filter(a => a.order_id).length
              )}
            </span>
            <span className="inline-block min-w-[100px] text-right font-semibold text-morandi-gold ml-2">
              NT$ {formatMoney(totalAmount)}
            </span>
          </div>
          <div className="flex-1" />
          <div className="flex space-x-2">
            <Button variant="outline" className="gap-1" onClick={() => onOpenChange(false)}>
              <X size={16} />
              {BATCH_RECEIPT_FORM_LABELS.CANCEL}
            </Button>
            <Button
              onClick={handleSave}
              className="bg-morandi-gold hover:bg-morandi-gold-hover gap-1"
              disabled={
                isSubmitting ||
                unallocatedAmount !== 0 ||
                orderAllocations.filter(a => a.order_id).length === 0 ||
                totalAmount === 0
              }
            >
              <Check size={16} />
              {BATCH_RECEIPT_FORM_LABELS.LABEL_7330}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
