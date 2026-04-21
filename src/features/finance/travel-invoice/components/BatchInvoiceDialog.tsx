'use client'

import { useState, useEffect } from 'react'
import { X, Check, ListChecks } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import { CurrencyCell } from '@/components/table-cells'
import { Combobox } from '@/components/ui/combobox'
import { useTravelInvoiceStore } from '@/stores/travel-invoice-store'
import { useAuthStore } from '@/stores'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { BATCH_INVOICE_DIALOG_LABELS, BATCH_INVOICE_TOAST_LABELS } from '../../constants/labels'

interface BatchInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tours?: Array<{ value: string; label: string }>
  workspaceId?: string
  onSuccess?: () => void
}

export function BatchInvoiceDialog({
  open,
  onOpenChange,
  tours = [],
  workspaceId,
  onSuccess,
}: BatchInvoiceDialogProps) {
  const user = useAuthStore(state => state.user)
  const { invoiceableOrders, fetchInvoiceableOrders, batchIssueInvoice, isLoading } =
    useTravelInvoiceStore()

  const [selectedTourId, setSelectedTourId] = useState<string>('')
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([])
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [buyerName, setBuyerName] = useState('')
  const [buyerUBN, setBuyerUBN] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')

  useEffect(() => {
    if (selectedTourId) {
      fetchInvoiceableOrders(selectedTourId, true)
      setSelectedOrderIds([])
    }
  }, [selectedTourId])

  const toggleOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(prev => [...prev, orderId])
    } else {
      setSelectedOrderIds(prev => prev.filter(id => id !== orderId))
    }
  }

  const totalAmount = invoiceableOrders
    .filter(o => selectedOrderIds.includes(o.order_id))
    .reduce((sum, o) => sum + Number(o.invoiceable_amount), 0)

  const handleBatchIssue = async () => {
    if (!buyerName) {
      toast.error(BATCH_INVOICE_DIALOG_LABELS.請輸入買受人名稱)
      return
    }

    if (selectedOrderIds.length === 0) {
      toast.error(BATCH_INVOICE_DIALOG_LABELS.請選擇至少一筆訂單)
      return
    }

    try {
      await batchIssueInvoice({
        tour_id: selectedTourId,
        order_ids: selectedOrderIds,
        invoice_date: invoiceDate,
        buyerInfo: {
          buyerName,
          buyerUBN: buyerUBN || undefined,
          buyerEmail: buyerEmail || undefined,
        },
        created_by: user?.id || undefined,
        workspace_id: workspaceId,
      })

      toast.success(BATCH_INVOICE_TOAST_LABELS.SUCCESS(selectedOrderIds.length))
      onOpenChange(false)
      onSuccess?.()

      // 重置表單
      setSelectedTourId('')
      setSelectedOrderIds([])
      setBuyerName('')
      setBuyerUBN('')
      setBuyerEmail('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : BATCH_INVOICE_DIALOG_LABELS.批次開立失敗)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={1} className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListChecks size={20} />
            {BATCH_INVOICE_DIALOG_LABELS.LABEL_2624}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto">
          {/* 團別選擇 - 表格式 */}
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
              <div className="col-span-2 text-sm text-muted-foreground">
                {BATCH_INVOICE_DIALOG_LABELS.LABEL_9860}
              </div>
              <div className="col-span-10">
                <Combobox
                  options={tours}
                  value={selectedTourId}
                  onChange={setSelectedTourId}
                  placeholder={BATCH_INVOICE_DIALOG_LABELS.選擇團別}
                />
              </div>
            </div>
          </div>

          {/* 訂單列表 - 表格式 */}
          {selectedTourId && (
            <div className="border rounded-lg overflow-hidden">
              {/* 表頭 */}
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 text-sm font-medium text-muted-foreground border-b">
                <div className="col-span-1 flex items-center justify-center">
                  <Checkbox
                    checked={
                      invoiceableOrders.length > 0 &&
                      selectedOrderIds.length ===
                        invoiceableOrders.filter(o => o.invoiceable_amount > 0).length
                    }
                    onCheckedChange={checked => {
                      if (checked) {
                        setSelectedOrderIds(
                          invoiceableOrders
                            .filter(o => o.invoiceable_amount > 0)
                            .map(o => o.order_id)
                        )
                      } else {
                        setSelectedOrderIds([])
                      }
                    }}
                    disabled={invoiceableOrders.filter(o => o.invoiceable_amount > 0).length === 0}
                  />
                </div>
                <div className="col-span-4">{BATCH_INVOICE_DIALOG_LABELS.LABEL_7017}</div>
                <div className="col-span-4">{BATCH_INVOICE_DIALOG_LABELS.LABEL_7009}</div>
                <div className="col-span-3 text-right">{BATCH_INVOICE_DIALOG_LABELS.LABEL_491}</div>
              </div>

              {/* 表格內容 */}
              <div className="max-h-[280px] overflow-y-auto divide-y">
                {invoiceableOrders.length === 0 ? (
                  <div className="p-4 text-center text-sm text-morandi-secondary">
                    {BATCH_INVOICE_DIALOG_LABELS.NOT_FOUND_8100}
                  </div>
                ) : (
                  invoiceableOrders.map(order => (
                    <div
                      key={order.order_id}
                      className={cn(
                        'grid grid-cols-12 gap-2 px-3 py-2.5 items-center hover:bg-muted/30 cursor-pointer',
                        selectedOrderIds.includes(order.order_id) && 'bg-morandi-gold/10'
                      )}
                      onClick={() => {
                        if (order.invoiceable_amount > 0) {
                          toggleOrder(order.order_id, !selectedOrderIds.includes(order.order_id))
                        }
                      }}
                    >
                      <div className="col-span-1 flex items-center justify-center">
                        <Checkbox
                          checked={selectedOrderIds.includes(order.order_id)}
                          onCheckedChange={checked =>
                            toggleOrder(order.order_id, checked as boolean)
                          }
                          disabled={order.invoiceable_amount <= 0}
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                      <div className="col-span-4 font-medium text-sm">{order.order_number}</div>
                      <div className="col-span-4 text-sm text-morandi-secondary">
                        {order.contact_person}
                      </div>
                      <div
                        className={cn(
                          'col-span-3 text-right font-medium',
                          order.invoiceable_amount > 0 ? 'text-morandi-gold' : 'text-morandi-muted'
                        )}
                      >
                        <CurrencyCell amount={order.invoiceable_amount} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 統計 */}
          {selectedOrderIds.length > 0 && (
            <div className="flex justify-between items-center p-4 bg-morandi-container/40 rounded-lg">
              <div>
                已選 <span className="font-bold">{selectedOrderIds.length}</span>{' '}
                {BATCH_INVOICE_DIALOG_LABELS.LABEL_3592}
              </div>
              <div className="text-right">
                <div className="text-sm text-morandi-secondary">
                  {BATCH_INVOICE_DIALOG_LABELS.LABEL_3678}
                </div>
                <div className="text-xl font-bold text-morandi-gold">
                  <CurrencyCell amount={totalAmount} />
                </div>
              </div>
            </div>
          )}

          {/* 買受人資訊 - 表格式 */}
          {selectedOrderIds.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-muted/50 text-sm font-medium text-muted-foreground border-b">
                {BATCH_INVOICE_DIALOG_LABELS.LABEL_8775}
              </div>
              <div className="divide-y">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
                  <div className="col-span-2 text-sm text-muted-foreground">
                    {BATCH_INVOICE_DIALOG_LABELS.LABEL_7408}
                  </div>
                  <div className="col-span-4">
                    <Input
                      value={buyerName}
                      onChange={e => setBuyerName(e.target.value)}
                      placeholder={BATCH_INVOICE_DIALOG_LABELS.買受人名稱}
                      className="h-8"
                    />
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground text-right">
                    {BATCH_INVOICE_DIALOG_LABELS.LABEL_3729}
                  </div>
                  <div className="col-span-4">
                    <Input
                      value={buyerUBN}
                      onChange={e => setBuyerUBN(e.target.value)}
                      placeholder={BATCH_INVOICE_DIALOG_LABELS.n_8_碼數字}
                      maxLength={8}
                      className="h-8"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-2 px-3 py-2 items-center">
                  <div className="col-span-2 text-sm text-muted-foreground">Email</div>
                  <div className="col-span-4">
                    <Input
                      type="email"
                      value={buyerEmail}
                      onChange={e => setBuyerEmail(e.target.value)}
                      placeholder={BATCH_INVOICE_DIALOG_LABELS.發票通知信箱}
                      className="h-8"
                    />
                  </div>
                  <div className="col-span-2 text-sm text-muted-foreground text-right">
                    {BATCH_INVOICE_DIALOG_LABELS.LABEL_3494}
                  </div>
                  <div className="col-span-4">
                    <DatePicker value={invoiceDate} onChange={setInvoiceDate} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-2">
            <X size={16} />
            {BATCH_INVOICE_DIALOG_LABELS.CANCEL}
          </Button>
          <Button
            onClick={handleBatchIssue}
            disabled={selectedOrderIds.length === 0 || !buyerName || isLoading}
            className="bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-2"
          >
            <Check size={16} />
            {isLoading
              ? BATCH_INVOICE_TOAST_LABELS.ISSUING
              : BATCH_INVOICE_TOAST_LABELS.ISSUE_N(selectedOrderIds.length)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
