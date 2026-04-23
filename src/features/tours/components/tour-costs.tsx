'use client'

import React, { useState, useMemo } from 'react'
import { logger } from '@/lib/utils/logger'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tour, Payment } from '@/stores/types'
import {
  useOrdersSlim,
  usePaymentRequests,
  useSuppliersSlim,
  createPaymentRequest as createPaymentRequestApi,
  invalidatePaymentRequests,
} from '@/data'
import type { PaymentRequestItem } from '@/stores/types'
import { recalculateExpenseStats } from '@/features/finance/payments/services/expense-core.service'

// 擴展 PaymentRequest 型別以包含 items
interface PaymentRequestWithItems {
  id: string
  tour_id?: string | null
  order_id?: string | null
  status: string
  created_at?: string | null
  items?: PaymentRequestItem[]
  [key: string]: unknown
}
import { Receipt, Plus, Truck, Hotel, Utensils, MapPin, X, HandCoins } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { AddRequestDialog } from '@/features/finance/requests/components/AddRequestDialog'
import type { PaymentRequest } from '@/types/finance.types'
import { DateCell, CurrencyCell } from '@/components/table-cells'
import { useToast } from '@/components/ui/use-toast'
import { generateUUID } from '@/lib/utils/uuid'
import { TOUR_COSTS_LABELS as COMP_TOURS_LABELS } from '../constants/labels'

interface TourCostsProps {
  tour: Tour
  orderFilter?: string // 選填：只顯示特定訂單相關的成本
  showSummary?: boolean
  onChildDialogChange?: (hasOpen: boolean) => void
}

// 擴展 Payment 型別以包含成本專用欄位
interface CostPayment extends Payment {
  category?: string
  vendor?: string
  receipt?: string
}

export const TourCosts = React.memo(function TourCosts({
  tour,
  orderFilter,
  showSummary = true,
  onChildDialogChange,
}: TourCostsProps) {
  const { items: orders } = useOrdersSlim()
  // 使用 @/data hooks（SWR 自動載入）
  const { items: paymentRequests } = usePaymentRequests()
  const { items: suppliers } = useSuppliersSlim()
  const { toast } = useToast()

  const addPayment = async (data: {
    tour_id: string
    amount: number
    description: string
    category: string
    vendor: string
    status: string
  }) => {
    try {
      // 找到供應商
      const supplier = suppliers.find(s => s.name === data.vendor || s.id === data.vendor)

      // 類別映射：英文 -> 中文
      const categoryMap: Record<string, '住宿' | '交通' | '餐食' | '門票' | '導遊' | '其他'> = {
        transport: '交通',
        accommodation: '住宿',
        food: '餐食',
        attraction: '門票',
        guide: '導遊',
        other: '其他',
      }

      // 建立請款單項目
      const itemId = generateUUID()
      const requestItem: PaymentRequestItem = {
        id: itemId,
        request_id: '', // 會在 create 時自動設定
        item_number: `ITEM-${Date.now()}`,
        category: categoryMap[data.category] || '其他',
        supplier_id: supplier?.id || '',
        supplier_name: supplier?.name || data.vendor,
        description: data.description,
        unit_price: data.amount,
        quantity: 1,
        subtotal: data.amount,
        sort_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // 建立請款單
      const paymentRequestData = {
        allocation_mode: 'single' as const,
        tour_id: data.tour_id,
        code: tour.code,
        tour_name: tour.name,
        request_date: new Date().toISOString(),
        items: [requestItem],
        total_amount: data.amount,
        status: data.status === '已確認' ? 'confirmed' : 'pending',
        note: data.description,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      await createPaymentRequestApi(
        paymentRequestData as unknown as Parameters<typeof createPaymentRequestApi>[0]
      )
      // SWR 快取失效，自動重新載入
      await invalidatePaymentRequests()

      // 同步更新 tour 的成本數據
      await recalculateExpenseStats(tour.id)

      toast({
        title: COMP_TOURS_LABELS.成功,
        description: COMP_TOURS_LABELS.請款單建立成功,
      })
    } catch (error) {
      logger.error(COMP_TOURS_LABELS.建立請款單失敗, error)
      toast({
        title: COMP_TOURS_LABELS.錯誤,
        description: COMP_TOURS_LABELS.建立請款單失敗,
        variant: 'destructive',
      })
      throw error
    }
  }

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  // 注意：已移除 onChildDialogChange 邏輯，改用 Dialog level 系統處理多重遮罩

  const [newCost, setNewCost] = useState({
    amount: 0,
    description: '',
    category: 'transport',
    status: '待確認' as const,
    vendor: '',
  })

  const handleAddCost = () => {
    if (!newCost.amount || !newCost.description) return

    addPayment({
      tour_id: tour.id,
      ...newCost,
    })

    setNewCost({
      amount: 0,
      description: '',
      category: 'transport',
      status: '待確認',
      vendor: '',
    })
    setIsAddDialogOpen(false)
  }

  // 獲取屬於這個旅遊團的所有訂單
  const tourOrders = orders.filter(order => order.tour_id === tour.id)

  // 從 payment_requests store 獲取這個團的請款記錄
  const costPayments = React.useMemo(() => {
    const tourOrderIds = new Set(tourOrders.map(o => o.id))

    return (
      paymentRequests as unknown as (PaymentRequestWithItems & { deleted_at?: string | null })[]
    )
      .filter(request => {
        // 排除已刪除的請款單
        if (request.deleted_at) return false

        // 如果有 orderFilter，只顯示該訂單的請款
        if (orderFilter) {
          return request.order_id === orderFilter
        }

        // 顯示所有屬於這個團的請款
        return (
          request.tour_id === tour.id || (request.order_id && tourOrderIds.has(request.order_id))
        )
      })
      .flatMap(request =>
        (request.items || []).map((item: PaymentRequestItem) => ({
          id: item.id,
          type: 'request' as const,
          tour_id: request.tour_id || tour.id,
          order_id: request.order_id,
          amount: item.subtotal,
          description: item.description,
          status: request.status,
          category: item.category,
          vendor: item.supplier_name,
          created_at: request.created_at,
        }))
      ) as CostPayment[]
  }, [paymentRequests, tourOrders, tour.id, orderFilter])

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
      transport: Truck,
      accommodation: Hotel,
      food: Utensils,
      attraction: MapPin,
      交通: Truck,
      住宿: Hotel,
      餐食: Utensils,
      景點: MapPin,
    }
    return icons[category] || Receipt
  }

  const getCategoryDisplayName = (category: string) => {
    const names: Record<string, string> = {
      transport: COMP_TOURS_LABELS.交通,
      accommodation: COMP_TOURS_LABELS.住宿,
      food: COMP_TOURS_LABELS.餐食,
      attraction: COMP_TOURS_LABELS.景點,
      other: COMP_TOURS_LABELS.其他,
    }
    return names[category] || category
  }

  const STATUS_LABELS: Record<string, string> = {
    confirmed: COMP_TOURS_LABELS.已確認,
    pending: COMP_TOURS_LABELS.待確認,
    paid: COMP_TOURS_LABELS.已付款,
  }

  const getStatusLabel = (status: string) => STATUS_LABELS[status] || status

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      // 中文狀態
      已確認: 'bg-morandi-green/20 text-morandi-green',
      待確認: 'bg-morandi-gold/20 text-morandi-gold',
      已付款: 'bg-morandi-container text-morandi-secondary',
      // 英文狀態（相容）
      confirmed: 'bg-morandi-green/20 text-morandi-green',
      pending: 'bg-morandi-gold/20 text-morandi-gold',
      paid: 'bg-morandi-container text-morandi-secondary',
    }
    return badges[status] || 'bg-morandi-container text-morandi-secondary'
  }

  const getReceiptBadge = (receipt: string) => {
    return receipt === '已上傳' ? 'bg-morandi-green text-white' : 'bg-morandi-red text-white'
  }

  const totalCosts = costPayments.reduce((sum, cost) => sum + cost.amount, 0)
  const confirmedCosts = costPayments
    .filter(cost => cost.status === 'confirmed')
    .reduce((sum, cost) => sum + cost.amount, 0)
  const pendingCosts = costPayments
    .filter(cost => cost.status === 'pending')
    .reduce((sum, cost) => sum + cost.amount, 0)

  return (
    <div className="space-y-4">
      {/* 統計摘要 + 新增按鈕 */}
      {showSummary && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center">
              <span className="text-morandi-secondary">{COMP_TOURS_LABELS.總成本}</span>
              <CurrencyCell
                amount={totalCosts}
                className="ml-2 font-semibold text-morandi-primary"
              />
            </div>
            <div className="flex items-center">
              <span className="text-morandi-secondary">{COMP_TOURS_LABELS.已確認}</span>
              <CurrencyCell
                amount={confirmedCosts}
                className="ml-2 font-semibold text-morandi-green"
              />
            </div>
            <div className="flex items-center">
              <span className="text-morandi-secondary">{COMP_TOURS_LABELS.待確認}</span>
              <CurrencyCell
                amount={pendingCosts}
                className="ml-2 font-semibold text-morandi-gold"
              />
            </div>
            <div className="flex items-center">
              <span className="text-morandi-secondary">{COMP_TOURS_LABELS.預估利潤}</span>
              <CurrencyCell
                amount={Math.max(0, tour.total_revenue - totalCosts)}
                className="ml-2 font-semibold text-morandi-red"
              />
            </div>
          </div>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            size="sm"
            className="bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg"
          >
            <Plus size={14} className="mr-1" />
            {COMP_TOURS_LABELS.新增支出}
          </Button>
        </div>
      )}

      {/* 請款總覽 */}
      <PaymentRequestOverviewTable tour={tour} />

      {/* 新增成本對話框 */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent level={2} className="max-w-md">
          <DialogHeader>
            <DialogTitle>{COMP_TOURS_LABELS.新增成本支出}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-morandi-primary">
                {COMP_TOURS_LABELS.支出金額}
              </label>
              <Input
                type="number"
                value={newCost.amount}
                onChange={e => setNewCost(prev => ({ ...prev, amount: Number(e.target.value) }))}
                placeholder="0"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-morandi-primary">
                {COMP_TOURS_LABELS.支出說明}
              </label>
              <Input
                value={newCost.description}
                onChange={e => setNewCost(prev => ({ ...prev, description: e.target.value }))}
                placeholder={COMP_TOURS_LABELS.例_機票費用}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-morandi-primary">
                {COMP_TOURS_LABELS.類別}
              </label>
              <Select
                value={newCost.category}
                onValueChange={value => setNewCost(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transport">{COMP_TOURS_LABELS.交通}</SelectItem>
                  <SelectItem value="accommodation">{COMP_TOURS_LABELS.住宿}</SelectItem>
                  <SelectItem value="food">{COMP_TOURS_LABELS.餐食}</SelectItem>
                  <SelectItem value="attraction">{COMP_TOURS_LABELS.景點}</SelectItem>
                  <SelectItem value="other">{COMP_TOURS_LABELS.其他}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-morandi-primary">
                {COMP_TOURS_LABELS.供應商}
              </label>
              <Select
                value={newCost.vendor}
                onValueChange={value => setNewCost(prev => ({ ...prev, vendor: value }))}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder={COMP_TOURS_LABELS.選擇供應商} />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="gap-2">
                <X size={16} />
                {COMP_TOURS_LABELS.取消}
              </Button>
              <Button
                onClick={handleAddCost}
                className="bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg"
              >
                {COMP_TOURS_LABELS.新增}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
})

// 請款總覽表格（與結案頁相同版型）
function PaymentRequestOverviewTable({ tour }: { tour: Tour }) {
  const { items: allPaymentRequests } = usePaymentRequests()
  const { items: allSuppliers } = useSuppliersSlim()
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null)
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)

  const supplierMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const s of allSuppliers ?? []) map[s.id] = s.name
    return map
  }, [allSuppliers])

  const prList = useMemo(
    () =>
      (allPaymentRequests ?? [])
        .filter(pr => pr.tour_id === tour.id)
        .filter(pr => {
          const rt = (pr.request_type || '').toLowerCase()
          return !rt.includes('bonus') && !rt.includes('獎金')
        })
        .sort(
          (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        ),
    [allPaymentRequests, tour.id]
  )

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
  }

  const statusMap: Record<string, { label: string; style: string }> = {
    pending: { label: '待處理', style: 'bg-morandi-secondary/20 text-morandi-secondary' },
    confirmed: { label: '已確認', style: 'bg-morandi-gold/20 text-morandi-gold' },
    billed: { label: '已出帳', style: 'bg-morandi-green/20 text-morandi-green' },
    approved: { label: '已核准', style: 'bg-morandi-gold/20 text-morandi-gold' },
    paid: { label: '已付', style: 'bg-morandi-green/20 text-morandi-green' },
  }

  return (
    <div className="border border-border rounded-lg overflow-x-auto bg-card">
      <div className="px-4 py-2 bg-morandi-red/10 flex items-center gap-2">
        <HandCoins className="w-4 h-4 text-morandi-red" />
        <span className="text-sm font-medium text-morandi-red">請款總覽 ({prList.length})</span>
      </div>
      <table className="w-full text-sm table-fixed" style={{ minWidth: 900 }}>
        <colgroup>
          <col style={{ width: '12%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '18%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '5%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '9%' }} />
        </colgroup>
        <thead>
          <tr className="border-b border-border text-xs text-morandi-secondary">
            <th className="px-4 py-2 text-left font-medium">單號</th>
            <th className="px-4 py-2 text-left font-medium">請款日期</th>
            <th className="px-4 py-2 text-left font-medium">類別</th>
            <th className="px-4 py-2 text-left font-medium">供應商</th>
            <th className="px-4 py-2 text-left font-medium">項目描述</th>
            <th className="px-4 py-2 text-right font-medium">單價</th>
            <th className="px-4 py-2 text-right font-medium">數量</th>
            <th className="px-4 py-2 text-right font-medium">小計</th>
            <th className="px-4 py-2 text-center font-medium">狀態</th>
            <th className="px-4 py-2 text-right font-medium">金額</th>
          </tr>
        </thead>
        <tbody>
          {prList.length > 0 ? (
            prList.map(pr => {
              const CATEGORY_ORDER = [
                '住宿',
                '交通',
                '餐食',
                '活動',
                '導遊',
                '保險',
                '出團款',
                '回團款',
                'ESIM',
                '同業',
                '其他',
              ]
              const rawItems =
                (
                  pr as unknown as {
                    items?: Array<{
                      id?: string
                      category?: string
                      supplier_id?: string
                      supplier_name?: string
                      description?: string
                      unitprice?: number
                      quantity?: number
                      subtotal?: number
                    }>
                  }
                ).items ?? []
              const items = [...rawItems].sort((a, b) => {
                const ai = CATEGORY_ORDER.indexOf(a.category || '')
                const bi = CATEGORY_ORDER.indexOf(b.category || '')
                return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
              })
              const statusInfo = statusMap[pr.status || ''] ?? {
                label: pr.status || '待處理',
                style: 'bg-morandi-secondary/20 text-morandi-secondary',
              }

              if (items.length === 0) {
                return (
                  <tr
                    key={pr.id}
                    className="border-b border-border last:border-b-0 hover:bg-morandi-bg/50"
                  >
                    <td className="px-4 py-2 font-medium text-morandi-primary">
                      <button
                        className="text-morandi-gold hover:underline cursor-pointer"
                        onClick={() => {
                          setSelectedRequest(pr as unknown as PaymentRequest)
                          setRequestDialogOpen(true)
                        }}
                      >
                        {pr.code || '-'}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-morandi-secondary">
                      {formatDate(pr.request_date)}
                    </td>
                    <td className="px-4 py-2 text-morandi-secondary">{pr.request_type || '-'}</td>
                    <td className="px-4 py-2 text-morandi-secondary">{pr.supplier_name || '-'}</td>
                    <td className="px-4 py-2 text-morandi-secondary">{pr.notes || '-'}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-secondary">
                      -
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-secondary">
                      -
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-secondary">
                      -
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.style}`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-red font-medium">
                      -{formatCurrency(Number(pr.amount) || 0)}
                    </td>
                  </tr>
                )
              }

              return items.map((item, idx) => (
                <tr
                  key={`${pr.id}-${item.id || idx}`}
                  className="border-b border-border last:border-b-0 hover:bg-morandi-bg/50"
                >
                  {idx === 0 ? (
                    <>
                      <td
                        className="px-4 py-2 font-medium text-morandi-primary"
                        rowSpan={items.length}
                      >
                        <button
                          className="text-morandi-gold hover:underline cursor-pointer"
                          onClick={() => {
                            setSelectedRequest(pr as unknown as PaymentRequest)
                            setRequestDialogOpen(true)
                          }}
                        >
                          {pr.code || '-'}
                        </button>
                      </td>
                      <td className="px-4 py-2 text-morandi-secondary" rowSpan={items.length}>
                        {formatDate(pr.request_date)}
                      </td>
                    </>
                  ) : null}
                  <td className="px-4 py-2 text-morandi-secondary">{item.category || '-'}</td>
                  <td className="px-4 py-2 text-morandi-secondary">
                    {(item.supplier_id && supplierMap[item.supplier_id]) ||
                      item.supplier_name ||
                      '-'}
                  </td>
                  <td className="px-4 py-2 text-morandi-secondary">{item.description || '-'}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-secondary">
                    {formatCurrency(item.unitprice ?? 0)}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-secondary">
                    {item.quantity ?? '-'}
                  </td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-morandi-secondary">
                    {formatCurrency(item.subtotal ?? 0)}
                  </td>
                  {idx === 0 ? (
                    <>
                      <td className="px-4 py-2 text-center" rowSpan={items.length}>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.style}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td
                        className="px-4 py-2 text-right font-mono tabular-nums text-morandi-red font-medium"
                        rowSpan={items.length}
                      >
                        -{formatCurrency(Number(pr.amount) || 0)}
                      </td>
                    </>
                  ) : null}
                </tr>
              ))
            })
          ) : (
            <tr>
              <td colSpan={10} className="py-12 text-center text-morandi-secondary">
                <Receipt size={24} className="mx-auto mb-4 opacity-50" />
                <p>尚無請款紀錄</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <AddRequestDialog
        open={requestDialogOpen}
        onOpenChange={setRequestDialogOpen}
        editingRequest={selectedRequest}
      />
    </div>
  )
}
