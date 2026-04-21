'use client'

import { getTodayString } from '@/lib/utils/format-date'

/**
 * 開立代轉發票頁面
 * 仿藍新金流介面風格
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, FileText } from 'lucide-react'
import { FinanceLabels, TRAVEL_INVOICE_LABELS } from '../../constants/labels'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { ContentContainer } from '@/components/layout/content-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { Label } from '@/components/ui/label'
import { useTravelInvoiceStore, TravelInvoiceItem, BuyerInfo } from '@/stores/travel-invoice-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function CreateInvoicePage() {
  const router = useRouter()
  const { issueInvoice, isLoading } = useTravelInvoiceStore()
  const [error, setError] = useState<string | null>(null)

  // 基本資訊
  const [invoice_date, setInvoiceDate] = useState(getTodayString())
  const [tax_type, setTaxType] = useState<'dutiable' | 'zero' | 'free'>('dutiable')
  const [reportStatus, setReportStatus] = useState<'unreported' | 'reported'>('unreported')
  const [remark, setRemark] = useState('')

  // 買受人資訊
  const [buyerInfo, setBuyerInfo] = useState<BuyerInfo>({
    buyerName: '',
    buyerUBN: '',
    buyerAddress: '',
    buyerEmail: '',
    buyerMobileCode: '+886',
    buyerMobile: '',
    carrierType: '',
    carrierNum: '',
    loveCode: '',
    printFlag: 'Y',
  })

  // 商品明細
  const [items, setItems] = useState<TravelInvoiceItem[]>([
    {
      item_name: '',
      item_count: 1,
      item_unit: TRAVEL_INVOICE_LABELS.UNIT_LABEL,
      item_price: 0,
      itemAmt: 0,
      itemWord: '',
    },
  ])

  const addItem = () => {
    setItems([
      ...items,
      {
        item_name: '',
        item_count: 1,
        item_unit: TRAVEL_INVOICE_LABELS.UNIT_LABEL,
        item_price: 0,
        itemAmt: 0,
        itemWord: '',
      },
    ])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const updateItem = (index: number, field: keyof TravelInvoiceItem, value: unknown) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // 自動計算金額
    if (field === 'item_price' || field === 'item_count') {
      const price = Number(field === 'item_price' ? value : newItems[index].item_price)
      const count = Number(field === 'item_count' ? value : newItems[index].item_count)
      newItems[index].itemAmt = price * count
    }

    setItems(newItems)
  }

  const total_amount = items.reduce((sum, item) => sum + item.itemAmt, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 驗證
    if (!buyerInfo.buyerName) {
      setError(FinanceLabels.enterBuyerNameError)
      return
    }

    if (items.some(item => !item.item_name || item.item_price <= 0)) {
      setError(FinanceLabels.completeProductInfoError)
      return
    }

    try {
      await issueInvoice({
        invoice_date,
        total_amount,
        tax_type,
        buyerInfo,
        items,
      })

      router.push('/finance/travel-invoice')
    } catch (error) {
      setError(error instanceof Error ? error.message : FinanceLabels.unknownError)
    }
  }

  return (
    <ContentPageLayout
      title={FinanceLabels.invoiceCreateTitle}
      icon={FileText}
      showBackButton={true}
      onBack={() => router.push('/finance/travel-invoice')}
      contentClassName="flex-1 overflow-auto"
    >
      <ContentContainer>
        <form onSubmit={handleSubmit} className="space-y-6 pb-6 max-w-4xl mx-auto">
          {/* 錯誤訊息 */}
          {error && (
            <div className="p-3 bg-status-danger-bg border border-status-danger/30 rounded-md">
              <p className="text-status-danger text-sm">{error}</p>
            </div>
          )}

          {/* 基本資訊 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{FinanceLabels.basicInfo}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="invoice_date">{FinanceLabels.issueDate}</Label>
                  <DatePicker
                    value={invoice_date}
                    onChange={date => setInvoiceDate(date)}
                    placeholder={FinanceLabels.selectDate}
                  />
                </div>
                <div>
                  <Label htmlFor="tax_type">{FinanceLabels.taxType}</Label>
                  <Select
                    value={tax_type}
                    onValueChange={value => setTaxType(value as 'dutiable' | 'zero' | 'free')}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder={FinanceLabels.selectTaxType} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dutiable">{FinanceLabels.dutiable}</SelectItem>
                      <SelectItem value="zero">{FinanceLabels.zeroRate}</SelectItem>
                      <SelectItem value="free">{FinanceLabels.taxFree}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{FinanceLabels.reportStatus}</Label>
                  <div className="flex items-center gap-4 h-10">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="reportStatus"
                        value="unreported"
                        checked={reportStatus === 'unreported'}
                        onChange={() => setReportStatus('unreported')}
                        className="w-4 h-4 accent-morandi-gold"
                      />
                      <span className="text-sm">{FinanceLabels.unreported}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="reportStatus"
                        value="reported"
                        checked={reportStatus === 'reported'}
                        onChange={() => setReportStatus('reported')}
                        className="w-4 h-4 accent-morandi-gold"
                      />
                      <span className="text-sm">{FinanceLabels.reported}</span>
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 買受人資訊 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{FinanceLabels.buyerInfo}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="buyerName">{FinanceLabels.buyerNameRequired}</Label>
                  <Input
                    id="buyerName"
                    value={buyerInfo.buyerName}
                    onChange={e => setBuyerInfo({ ...buyerInfo, buyerName: e.target.value })}
                    placeholder={FinanceLabels.enterBuyerName}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="buyerUBN">{FinanceLabels.unifiedBusinessNumber}</Label>
                  <Input
                    id="buyerUBN"
                    value={buyerInfo.buyerUBN}
                    onChange={e => setBuyerInfo({ ...buyerInfo, buyerUBN: e.target.value })}
                    placeholder={FinanceLabels.ubnPlaceholder}
                  />
                </div>
                <div>
                  <Label htmlFor="buyerEmail">{FinanceLabels.email}</Label>
                  <Input
                    id="buyerEmail"
                    type="email"
                    value={buyerInfo.buyerEmail}
                    onChange={e => setBuyerInfo({ ...buyerInfo, buyerEmail: e.target.value })}
                    placeholder={FinanceLabels.emailForReceipt}
                  />
                </div>
                <div>
                  <Label htmlFor="buyerMobile">{FinanceLabels.mobileNumber}</Label>
                  <Input
                    id="buyerMobile"
                    value={buyerInfo.buyerMobile}
                    onChange={e => setBuyerInfo({ ...buyerInfo, buyerMobile: e.target.value })}
                    placeholder={FinanceLabels.mobilePlaceholder}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 商品明細 - 表格式 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{FinanceLabels.productDetails}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* 表格標題 */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-morandi-container/50 border-y text-sm font-medium text-morandi-secondary">
                <div className="col-span-4">{FinanceLabels.summary}</div>
                <div className="col-span-1 text-center">{FinanceLabels.quantity}</div>
                <div className="col-span-2 text-right">{FinanceLabels.unitPrice}</div>
                <div className="col-span-2 text-center">{FinanceLabels.unit}</div>
                <div className="col-span-2 text-right">{FinanceLabels.amount}</div>
                <div className="col-span-1 text-center">{FinanceLabels.handle}</div>
              </div>

              {/* 項目列表 */}
              <div className="divide-y">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                    <div className="col-span-4">
                      <Input
                        value={item.item_name}
                        onChange={e => updateItem(index, 'item_name', e.target.value)}
                        placeholder={FinanceLabels.productName}
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        min="1"
                        value={item.item_count}
                        onChange={e =>
                          updateItem(index, 'item_count', parseInt(e.target.value) || 1)
                        }
                        className="h-9 text-center"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="0"
                        value={item.item_price || ''}
                        onChange={e =>
                          updateItem(index, 'item_price', parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="h-9 text-right"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        value={item.item_unit}
                        onChange={e => updateItem(index, 'item_unit', e.target.value)}
                        className="h-9 text-center"
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="h-9 flex items-center justify-end px-3 bg-muted/30 rounded-md text-sm font-medium">
                        {item.itemAmt.toLocaleString()}
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={items.length <= 1}
                        className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 新增一列按鈕 */}
              <div className="px-4 py-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="text-morandi-primary"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  {FinanceLabels.addRow}
                </Button>
              </div>

              {/* 備註欄位 */}
              <div className="px-4 py-3 border-t">
                <div className="flex items-start gap-4">
                  <Label className="pt-2 shrink-0">{FinanceLabels.remarks}</Label>
                  <div className="flex-1">
                    <Input
                      value={remark}
                      onChange={e => setRemark(e.target.value.slice(0, 50))}
                      placeholder={FinanceLabels.remarksPlaceholder}
                      maxLength={50}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {FinanceLabels.remarksNote}
                    </p>
                  </div>
                  <span className="text-sm text-muted-foreground pt-2">{remark.length}/50</span>
                </div>
              </div>

              {/* 總計 */}
              <div className="px-4 py-4 border-t bg-muted/30">
                <div className="flex justify-end items-center gap-4">
                  <span className="text-sm font-medium">{FinanceLabels.total}</span>
                  <span className="text-xl font-bold text-morandi-primary min-w-[120px] text-right">
                    NT$ {total_amount.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 送出按鈕 */}
          <div className="flex justify-center gap-4 pt-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => router.push('/finance/travel-invoice')}
              className="min-w-[120px]"
            >
              {FinanceLabels.cancel}
            </Button>
            <Button type="submit" size="lg" disabled={isLoading} className="min-w-[120px]">
              {isLoading ? FinanceLabels.issuing : FinanceLabels.issueInvoice}
            </Button>
          </div>
        </form>
      </ContentContainer>
    </ContentPageLayout>
  )
}
