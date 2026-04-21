'use client'

/**
 * 發票詳情 Dialog
 * 從 [id]/page.tsx 轉換而來
 */

import { useState, useEffect } from 'react'
import { FileText, FileX, X, Check } from 'lucide-react'
import { CurrencyCell, DateCell } from '@/components/table-cells'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTravelInvoiceStore } from '@/stores/travel-invoice-store'
import { alert } from '@/lib/ui/alert-dialog'
import type { TravelInvoice } from '@/stores/travel-invoice-store'
import { TRAVEL_INVOICE_LABELS } from '@/constants/labels'

interface TravelInvoiceDetailDialogProps {
  invoice: TravelInvoice | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TravelInvoiceDetailDialog({
  invoice,
  open,
  onOpenChange,
}: TravelInvoiceDetailDialogProps) {
  const { voidInvoice, isLoading } = useTravelInvoiceStore()

  const [showVoidDialog, setShowVoidDialog] = useState(false)
  const [voidReason, setVoidReason] = useState('')

  // Reset void reason when dialog closes
  useEffect(() => {
    if (!open) {
      setVoidReason('')
      setShowVoidDialog(false)
    }
  }, [open])

  const handleVoid = async () => {
    if (!invoice) return
    if (!voidReason.trim()) {
      await alert(TRAVEL_INVOICE_LABELS.PLEASE_FILL_VOID_REASON, 'error')
      return
    }

    try {
      await voidInvoice(invoice.id, voidReason)
      setShowVoidDialog(false)
      setVoidReason('')
    } catch (error) {
      await alert(
        error instanceof Error ? error.message : TRAVEL_INVOICE_LABELS.UNKNOWN_ERROR,
        'error'
      )
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
    > = {
      pending: { label: TRAVEL_INVOICE_LABELS.PENDING, variant: 'secondary' },
      issued: { label: TRAVEL_INVOICE_LABELS.ISSUED, variant: 'default' },
      voided: { label: TRAVEL_INVOICE_LABELS.VOIDED, variant: 'destructive' },
      allowance: { label: TRAVEL_INVOICE_LABELS.ALLOWANCE, variant: 'outline' },
      failed: { label: TRAVEL_INVOICE_LABELS.FAILED, variant: 'destructive' },
    }
    const config = statusMap[status] || { label: status, variant: 'secondary' as const }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (!invoice) return null

  return (
    <>
      {/* 主 Dialog：子 Dialog 開啟時完全不渲染（避免多重遮罩） */}
      {!showVoidDialog && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent level={1} className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-morandi-gold" />
                {invoice.transactionNo}
                <span className="ml-2">{getStatusBadge(invoice.status)}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* 基本資訊 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{TRAVEL_INVOICE_LABELS.BASIC_INFO}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-morandi-secondary">
                      {TRAVEL_INVOICE_LABELS.INVOICE_NUMBER}
                    </p>
                    <p className="font-medium text-morandi-primary">
                      {invoice.invoice_number || TRAVEL_INVOICE_LABELS.NOT_OBTAINED_YET}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-morandi-secondary">
                      {TRAVEL_INVOICE_LABELS.ISSUE_DATE}
                    </p>
                    <p className="font-medium text-morandi-primary">{invoice.invoice_date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-morandi-secondary">
                      {TRAVEL_INVOICE_LABELS.TAX_TYPE}
                    </p>
                    <p className="font-medium text-morandi-primary">
                      {invoice.tax_type === 'dutiable'
                        ? TRAVEL_INVOICE_LABELS.TAXABLE
                        : invoice.tax_type === 'zero'
                          ? TRAVEL_INVOICE_LABELS.ZERO_RATE
                          : TRAVEL_INVOICE_LABELS.TAX_FREE}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-morandi-secondary">
                      {TRAVEL_INVOICE_LABELS.TOTAL_AMOUNT}
                    </p>
                    <p className="font-medium text-lg text-morandi-gold">
                      <CurrencyCell
                        amount={invoice.total_amount}
                        className="font-medium text-lg text-morandi-gold"
                      />
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* 買受人資訊 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{TRAVEL_INVOICE_LABELS.BUYER_INFO}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-morandi-secondary">{TRAVEL_INVOICE_LABELS.NAME}</p>
                    <p className="font-medium text-morandi-primary">
                      {invoice.buyerInfo.buyerName || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-morandi-secondary">
                      {TRAVEL_INVOICE_LABELS.UBN_NUMBER}
                    </p>
                    <p className="font-medium text-morandi-primary">
                      {invoice.buyerInfo.buyerUBN || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-morandi-secondary">{TRAVEL_INVOICE_LABELS.EMAIL}</p>
                    <p className="font-medium text-morandi-primary">
                      {invoice.buyerInfo.buyerEmail || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-morandi-secondary">{TRAVEL_INVOICE_LABELS.MOBILE}</p>
                    <p className="font-medium text-morandi-primary">
                      {invoice.buyerInfo.buyerMobile || '-'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* 商品明細 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {TRAVEL_INVOICE_LABELS.PRODUCT_DETAILS}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border border-border/60 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-morandi-container/40 border-b border-border/60">
                        <tr>
                          <th className="text-left py-3 px-4 text-sm font-medium text-morandi-primary">
                            {TRAVEL_INVOICE_LABELS.PRODUCT_NAME}
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-morandi-primary">
                            {TRAVEL_INVOICE_LABELS.QUANTITY}
                          </th>
                          <th className="text-center py-3 px-4 text-sm font-medium text-morandi-primary">
                            {TRAVEL_INVOICE_LABELS.UNIT}
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-morandi-primary">
                            {TRAVEL_INVOICE_LABELS.UNIT_PRICE}
                          </th>
                          <th className="text-right py-3 px-4 text-sm font-medium text-morandi-primary">
                            {TRAVEL_INVOICE_LABELS.AMOUNT}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.items.map((item, index) => (
                          <tr key={index} className="border-b border-border/40 last:border-b-0">
                            <td className="py-3 px-4 text-sm text-morandi-primary">
                              {item.item_name}
                            </td>
                            <td className="py-3 px-4 text-sm text-morandi-primary text-center">
                              {item.item_count}
                            </td>
                            <td className="py-3 px-4 text-sm text-morandi-primary text-center">
                              {item.item_unit}
                            </td>
                            <td className="py-3 px-4 text-sm text-morandi-primary text-right">
                              <CurrencyCell
                                amount={item.item_price}
                                className="text-sm text-morandi-primary"
                              />
                            </td>
                            <td className="py-3 px-4 text-sm text-morandi-primary text-right font-medium">
                              <CurrencyCell
                                amount={item.itemAmt}
                                className="text-sm text-morandi-primary font-medium"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* 發票資訊 */}
              {invoice.status === 'issued' && invoice.randomNum && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {TRAVEL_INVOICE_LABELS.INVOICE_INFO}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-morandi-secondary">
                        {TRAVEL_INVOICE_LABELS.RANDOM_CODE}
                      </p>
                      <p className="font-medium font-mono text-morandi-primary">
                        {invoice.randomNum}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-morandi-secondary">
                        {TRAVEL_INVOICE_LABELS.BARCODE}
                      </p>
                      <p className="font-medium font-mono text-sm text-morandi-primary">
                        {invoice.barcode || '-'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 作廢資訊 */}
              {invoice.status === 'voided' && (
                <Card className="border-status-danger/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-status-danger">
                      {TRAVEL_INVOICE_LABELS.VOID_INFO}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm text-morandi-secondary">
                        {TRAVEL_INVOICE_LABELS.VOID_TIME}
                      </p>
                      <p className="font-medium text-morandi-primary">
                        {invoice.voidDate ? (
                          <DateCell
                            date={invoice.voidDate}
                            format="time"
                            showIcon={false}
                            className="font-medium text-morandi-primary"
                          />
                        ) : (
                          '-'
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-morandi-secondary">
                        {TRAVEL_INVOICE_LABELS.VOID_REASON}
                      </p>
                      <p className="font-medium text-morandi-primary">
                        {invoice.voidReason || '-'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-2">
                <X size={16} />
                {TRAVEL_INVOICE_LABELS.CLOSE}
              </Button>
              {invoice.status === 'issued' && (
                <Button
                  variant="destructive"
                  onClick={() => setShowVoidDialog(true)}
                  className="gap-2"
                >
                  <FileX size={16} />
                  {TRAVEL_INVOICE_LABELS.VOID_INVOICE}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 作廢確認對話框 */}
      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent level={2} className="max-w-md">
          <DialogHeader>
            <DialogTitle>{TRAVEL_INVOICE_LABELS.VOID_INVOICE}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="voidReason">{TRAVEL_INVOICE_LABELS.VOID_REASON_REQUIRED}</Label>
              <Input
                id="voidReason"
                value={voidReason}
                onChange={e => setVoidReason(e.target.value)}
                placeholder={TRAVEL_INVOICE_LABELS.ENTER_VOID_REASON}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVoidDialog(false)} className="gap-2">
              <X size={16} />
              {TRAVEL_INVOICE_LABELS.CANCEL}
            </Button>
            <Button
              variant="destructive"
              onClick={handleVoid}
              disabled={!voidReason.trim() || isLoading}
              className="gap-2"
            >
              <Check size={16} />
              {TRAVEL_INVOICE_LABELS.CONFIRM_VOID}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
