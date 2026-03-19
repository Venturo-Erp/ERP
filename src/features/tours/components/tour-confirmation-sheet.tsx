// @ts-nocheck
'use client'

/**
 * TourConfirmationSheet - 團確單總覽
 *
 * 以需求總覽為主，從報價單的 categories 讀取住宿/餐食資料，
 * 按供應商分組顯示，並提供「產生需求單」按鈕
 *
 * 流程：
 * 報價單 → 團確單（內部確認） → 產生需求單 → 發給供應商
 */

import { useMemo, useState, useCallback } from 'react'
import {
  Hotel,
  Utensils,
  Plus,
  Check,
  Loader2,
  Calendar,
  FileText,
  DollarSign,
  Building2,
  Bus,
  Ticket,
  UtensilsCrossed,
  Package,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTourRequests } from '@/stores/tour-request-store'
import { useAuthStore } from '@/stores/auth-store'
import { useToast } from '@/components/ui/use-toast'
import { QuickRequestFromItemDialog } from '@/features/finance/requests/components/QuickRequestFromItemDialog'
import {
  useRequirementsData,
  type QuoteItem,
  type CategoryKey,
  CATEGORIES,
} from '@/features/confirmations/components/hooks/useRequirementsData'
import { COMP_TOURS_LABELS } from '../constants/labels'

interface TourConfirmationSheetProps {
  tourId: string
}

// 按供應商分組的結果
interface SupplierGroup {
  supplierName: string
  items: QuoteItem[]
}

export function TourConfirmationSheet({ tourId }: TourConfirmationSheetProps) {
  const { toast } = useToast()
  const { user: currentUser } = useAuthStore()
  const { items: existingRequests, fetchAll: refreshRequests } = useTourRequests()

  // 使用需求總覽的資料來源
  const { loading, tour, linkedQuoteId, quoteItems, changeTrackByCategory } = useRequirementsData({
    tourId,
  })

  const [generatingFor, setGeneratingFor] = useState<string | null>(null)

  // 快速請款對話框狀態
  const [quickRequestItem, setQuickRequestItem] = useState<{
    id: string
    category: string
    title: string
    supplierName: string
    supplierId: string
    estimatedCost: number
    tourId: string
    tourCode: string
    tourName: string
  } | null>(null)

  // 住宿項目按飯店分組
  const hotelGroups = useMemo((): SupplierGroup[] => {
    const accommodationItems = changeTrackByCategory.accommodation
      .filter(item => item.type !== 'cancelled')
      .map(item => item.item as QuoteItem)

    const grouped: Record<string, QuoteItem[]> = {}
    accommodationItems.forEach(item => {
      const name = item.supplierName
      if (!grouped[name]) {
        grouped[name] = []
      }
      grouped[name].push(item)
    })

    return Object.entries(grouped).map(([supplierName, items]) => ({
      supplierName,
      items: items.sort((a, b) => (a.serviceDate || '').localeCompare(b.serviceDate || '')),
    }))
  }, [changeTrackByCategory])

  // 餐食項目按餐廳分組
  const restaurantGroups = useMemo((): SupplierGroup[] => {
    const mealItems = changeTrackByCategory.meal
      .filter(item => item.type !== 'cancelled')
      .map(item => item.item as QuoteItem)

    const grouped: Record<string, QuoteItem[]> = {}
    mealItems.forEach(item => {
      const name = item.supplierName
      if (!grouped[name]) {
        grouped[name] = []
      }
      grouped[name].push(item)
    })

    return Object.entries(grouped).map(([supplierName, items]) => ({
      supplierName,
      items: items.sort((a, b) => (a.serviceDate || '').localeCompare(b.serviceDate || '')),
    }))
  }, [changeTrackByCategory])

  // 過濾出有供應商的需求單（可請款）
  const requestsWithSupplier = useMemo(() => {
    return existingRequests.filter(req => req.tour_id === tourId && req.supplier_id)
  }, [existingRequests, tourId])

  // 檢查是否已產生需求單
  const hasExistingRequest = useCallback(
    (supplierName: string, category: string) => {
      return existingRequests.some(
        req =>
          req.tour_id === tourId && req.supplier_name === supplierName && req.category === category
      )
    },
    [existingRequests, tourId]
  )

  // 取得類別圖標
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'hotel':
      case COMP_TOURS_LABELS.住宿:
      case 'accommodation':
        return <Hotel size={14} className="text-blue-600" />
      case 'transportation':
      case COMP_TOURS_LABELS.交通:
      case 'transport':
        return <Bus size={14} className="text-green-600" />
      case 'activity':
      case 'ticket':
      case COMP_TOURS_LABELS.門票:
        return <Ticket size={14} className="text-purple-600" />
      case 'restaurant':
      case 'meal':
      case COMP_TOURS_LABELS.餐食:
        return <UtensilsCrossed size={14} className="text-orange-600" />
      default:
        return <Package size={14} className="text-morandi-secondary" />
    }
  }

  // 處理請款按鈕點擊
  const handleRequestPayment = (request: (typeof existingRequests)[0]) => {
    if (!tour) return

    setQuickRequestItem({
      id: request.id,
      category: request.category,
      title: request.title,
      supplierName: request.supplier_name || COMP_TOURS_LABELS.未知供應商,
      supplierId: request.supplier_id || '',
      estimatedCost: request.estimated_cost || 0,
      tourId: tourId,
      tourCode: tour.code || '',
      tourName: tour.name || '',
    })
  }

  // 產生需求單
  const handleGenerateRequest = useCallback(
    async (supplierName: string, category: 'accommodation' | 'meal', items: QuoteItem[]) => {
      if (!tour) return

      setGeneratingFor(`${category}-${supplierName}`)

      try {
        // 計算服務日期範圍
        const dates = items.map(item => item.serviceDate).filter(Boolean) as string[]
        const serviceDate = dates[0] || ''
        const serviceDateEnd = dates.length > 1 ? dates[dates.length - 1] : serviceDate

        // 產生描述
        let description = ''
        if (category === 'accommodation') {
          description = items.map(item => `${item.serviceDate || ''}`).join('\n')
        } else {
          description = items.map(item => `${item.serviceDate || ''} ${item.title}`).join('\n')
        }

        // 透過 API 建立需求單
        const response = await fetch('/api/tour-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspace_id: tour.workspace_id || '',
            tour_id: tourId,
            tour_code: tour.code,
            tour_name: tour.name,
            title: `${supplierName} - ${category === 'accommodation' ? COMP_TOURS_LABELS.住宿預訂 : COMP_TOURS_LABELS.餐食預訂}`,
            category: category, // 直接使用 accommodation/meal
            supplier_name: supplierName,
            service_date: serviceDate,
            service_date_end: serviceDateEnd,
            quantity: items.length,
            description,
            status: 'draft',
            handler_type: 'internal',
            created_by: currentUser?.id || '',
            created_by_name: currentUser?.name || '',
          }),
        })

        if (!response.ok) {
          throw new Error('API request failed')
        }

        await refreshRequests()

        toast({
          title: COMP_TOURS_LABELS.需求單已建立,
          description: COMP_TOURS_LABELS.REQUEST_CREATED_DESC(supplierName),
        })
      } catch (error) {
        toast({
          title: COMP_TOURS_LABELS.建立失敗,
          description: COMP_TOURS_LABELS.無法建立需求單_請稍後再試,
          variant: 'destructive',
        })
      } finally {
        setGeneratingFor(null)
      }
    },
    [tour, tourId, currentUser, refreshRequests, toast]
  )

  // Loading 狀態
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-morandi-secondary">
        <Loader2 className="animate-spin mr-2" size={20} />
        {COMP_TOURS_LABELS.LOADING_6912}
      </div>
    )
  }

  // 沒有報價單
  if (!linkedQuoteId) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-morandi-secondary">
        <AlertCircle size={32} className="mb-2 opacity-50" />
        <p>{COMP_TOURS_LABELS.LABEL_1695}</p>
        <p className="text-xs mt-1">{COMP_TOURS_LABELS.LABEL_8833}</p>
      </div>
    )
  }

  // 沒有任何住宿/餐食資料
  if (hotelGroups.length === 0 && restaurantGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-morandi-secondary">
        <Calendar size={32} className="mb-2 opacity-50" />
        <p>{COMP_TOURS_LABELS.EMPTY_7809}</p>
        <p className="text-xs mt-1">{COMP_TOURS_LABELS.LABEL_9677}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4">
      {/* 住宿表 */}
      {hotelGroups.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-blue-500 text-white">
            <Hotel size={18} />
            <span className="font-medium">{COMP_TOURS_LABELS.LABEL_460}</span>
            <span className="text-blue-100 text-sm">
              {COMP_TOURS_LABELS.HOTEL_COUNT(hotelGroups.length)}
            </span>
          </div>
          <div className="bg-card p-4 space-y-4">
            {hotelGroups.map(group => {
              const hasRequest = hasExistingRequest(group.supplierName, 'accommodation')
              const isGenerating = generatingFor === `accommodation-${group.supplierName}`

              return (
                <div
                  key={group.supplierName}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  {/* 飯店名稱標題 */}
                  <div className="flex items-center justify-between px-4 py-2 bg-morandi-container/50 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Hotel size={14} className="text-morandi-gold" />
                      <span className="font-medium text-morandi-primary">{group.supplierName}</span>
                      <span className="text-xs text-morandi-secondary">
                        {COMP_TOURS_LABELS.NIGHT_COUNT(group.items.length)}
                      </span>
                    </div>
                    {hasRequest ? (
                      <span className="flex items-center gap-1 text-xs text-morandi-green">
                        <Check size={14} />
                        {COMP_TOURS_LABELS.LABEL_7836}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() =>
                          handleGenerateRequest(group.supplierName, 'accommodation', group.items)
                        }
                        disabled={isGenerating}
                        className="h-7 text-xs bg-morandi-gold hover:bg-morandi-gold-hover text-white"
                      >
                        {isGenerating ? (
                          <Loader2 size={12} className="animate-spin mr-1" />
                        ) : (
                          <Plus size={12} className="mr-1" />
                        )}
                        {COMP_TOURS_LABELS.GENERATE_REQUEST}
                      </Button>
                    )}
                  </div>

                  {/* 日期列表 */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-morandi-container/30 text-morandi-secondary">
                        <th className="text-left px-3 py-2 font-medium w-24">
                          {COMP_TOURS_LABELS.日期}
                        </th>
                        <th className="text-left px-3 py-2 font-medium">
                          {COMP_TOURS_LABELS.LABEL_5591}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {group.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-morandi-container/10">
                          <td className="px-3 py-2 text-morandi-primary">
                            {item.serviceDate || '-'}
                          </td>
                          <td className="px-3 py-2 text-morandi-secondary">{item.title}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 餐食表 */}
      {restaurantGroups.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-orange-500 text-white">
            <Utensils size={18} />
            <span className="font-medium">{COMP_TOURS_LABELS.LABEL_9767}</span>
            <span className="text-orange-100 text-sm">
              {COMP_TOURS_LABELS.RESTAURANT_COUNT(restaurantGroups.length)}
            </span>
          </div>
          <div className="bg-card p-4 space-y-4">
            {restaurantGroups.map(group => {
              const hasRequest = hasExistingRequest(group.supplierName, 'meal')
              const isGenerating = generatingFor === `meal-${group.supplierName}`

              return (
                <div
                  key={group.supplierName}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  {/* 餐廳名稱標題 */}
                  <div className="flex items-center justify-between px-4 py-2 bg-morandi-container/50 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Utensils size={14} className="text-morandi-gold" />
                      <span className="font-medium text-morandi-primary">{group.supplierName}</span>
                      <span className="text-xs text-morandi-secondary">
                        {COMP_TOURS_LABELS.MEAL_COUNT(group.items.length)}
                      </span>
                    </div>
                    {hasRequest ? (
                      <span className="flex items-center gap-1 text-xs text-morandi-green">
                        <Check size={14} />
                        {COMP_TOURS_LABELS.LABEL_7836}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() =>
                          handleGenerateRequest(group.supplierName, 'meal', group.items)
                        }
                        disabled={isGenerating}
                        className="h-7 text-xs bg-morandi-gold hover:bg-morandi-gold-hover text-white"
                      >
                        {isGenerating ? (
                          <Loader2 size={12} className="animate-spin mr-1" />
                        ) : (
                          <Plus size={12} className="mr-1" />
                        )}
                        {COMP_TOURS_LABELS.GENERATE_REQUEST}
                      </Button>
                    )}
                  </div>

                  {/* 餐別列表 */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-morandi-container/30 text-morandi-secondary">
                        <th className="text-left px-3 py-2 font-medium w-24">
                          {COMP_TOURS_LABELS.日期}
                        </th>
                        <th className="text-left px-3 py-2 font-medium">
                          {COMP_TOURS_LABELS.LABEL_5591}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {group.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-morandi-container/10">
                          <td className="px-3 py-2 text-morandi-primary">
                            {item.serviceDate || '-'}
                          </td>
                          <td className="px-3 py-2 text-morandi-secondary">{item.title}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 需求單項目（有供應商可請款） */}
      {requestsWithSupplier.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-morandi-gold text-white">
            <DollarSign size={18} />
            <span className="font-medium">{COMP_TOURS_LABELS.LABEL_6198}</span>
            <span className="text-white/80 text-sm">
              {COMP_TOURS_LABELS.PAYABLE_COUNT(requestsWithSupplier.length)}
            </span>
          </div>
          <div className="bg-card divide-y divide-border">
            {requestsWithSupplier.map(request => (
              <div
                key={request.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-morandi-container/20"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="mt-0.5">{getCategoryIcon(request.category)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-morandi-primary truncate">
                        {request.title}
                      </span>
                      {request.status && (
                        <span
                          className={`
                          text-xs px-1.5 py-0.5 rounded
                          ${request.status === 'confirmed' ? 'bg-morandi-green/20 text-morandi-green' : ''}
                          ${request.status === 'draft' ? 'bg-morandi-container text-morandi-secondary' : ''}
                          ${request.status === 'billed' ? 'bg-morandi-green/20 text-morandi-green' : ''}
                        `}
                        >
                          {request.status === 'confirmed'
                            ? COMP_TOURS_LABELS.已確認
                            : request.status === 'draft'
                              ? COMP_TOURS_LABELS.草稿
                              : request.status === 'billed'
                                ? COMP_TOURS_LABELS.已出帳
                                : request.status}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-morandi-secondary mt-1">
                      <span className="flex items-center gap-1">
                        <Building2 size={12} />
                        {request.supplier_name || COMP_TOURS_LABELS.未知供應商}
                      </span>
                      {request.service_date && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {request.service_date}
                          {request.service_date_end &&
                            request.service_date_end !== request.service_date && (
                              <> ~ {request.service_date_end}</>
                            )}
                        </span>
                      )}
                    </div>
                    {(request.estimated_cost || request.quoted_cost) && (
                      <div className="text-xs text-morandi-secondary mt-1">
                        {request.quoted_cost
                          ? `供應商報價 $${request.quoted_cost.toLocaleString()}`
                          : COMP_TOURS_LABELS.ESTIMATED_COST(
                              (request.estimated_cost || 0).toLocaleString()
                            )}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleRequestPayment(request)}
                  className="h-8 px-3 gap-1.5 bg-morandi-gold hover:bg-morandi-gold-hover text-white flex-shrink-0"
                >
                  <DollarSign size={14} />
                  {COMP_TOURS_LABELS.請款}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 快速請款對話框 */}
      {quickRequestItem && (
        <QuickRequestFromItemDialog
          open={!!quickRequestItem}
          onOpenChange={open => {
            if (!open) setQuickRequestItem(null)
          }}
          item={quickRequestItem}
          onSuccess={() => {
            refreshRequests()
            toast({
              title: COMP_TOURS_LABELS.請款單已建立,
              description: COMP_TOURS_LABELS.PAYMENT_CREATED_DESC(quickRequestItem.supplierName),
            })
          }}
        />
      )}
    </div>
  )
}
