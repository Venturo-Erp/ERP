'use client'

/**
 * RequirementsList - 需求總覽共用組件
 */

import { useEffect, useState, useMemo, useCallback } from 'react'
import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  FileText,
  EyeOff,
  Eye,
  ChevronDown,
  ChevronRight,
  ClipboardList,
} from 'lucide-react'
// TODO: [品質優化] 將 supabase 操作搬到 confirmations/services/ — 目前因 setState 交錯暫保留
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores'
import type { Tour } from '@/stores/types'
// CostCategory 已不需要 — 需求單直接讀核心表
import { useToast } from '@/components/ui/use-toast'
import { logger } from '@/lib/utils/logger'
import { getStatusConfig } from '@/lib/status-config'
import type { FlightInfo } from '@/types/flight.types'

import type {
  RequirementsListProps,
  TourRequest,
  QuoteItem,
  CategoryKey,
} from './requirements-list.types'
import { CATEGORIES } from './requirements-list.types'
import { COMP_REQUIREMENTS_LABELS } from './constants/labels'
import { groupItemsByCategory } from './parse-quote-items'
import { coreItemsToQuoteItems } from './core-items-to-quote-items'
import type { TourItineraryItem } from '@/features/tours/types/tour-itinerary-item.types'
import { useConfirmationSheet } from './use-confirmation-sheet'
import { CoreTableRequestDialog } from '@/features/tours/components/CoreTableRequestDialog'

// ============================================
// Component
// ============================================

export function RequirementsList({
  tourId,
  quoteId: propQuoteId,
  onOpenRequestDialog,
  className,
}: RequirementsListProps) {
  const { toast } = useToast()
  const { user } = useAuthStore()

  // 狀態
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tour, setTour] = useState<Tour | null>(null)
  const [linkedQuoteId, setLinkedQuoteId] = useState<string | null>(propQuoteId || null)
  const [existingRequests, setExistingRequests] = useState<TourRequest[]>([])
  // quoteCategories 已移除 — 需求單直接讀核心表
  const [quoteGroupSize, setQuoteGroupSize] = useState<number | null>(null)
  const [startDate, setStartDate] = useState<string | null>(null)
  const [outboundFlight, setOutboundFlight] = useState<FlightInfo | null>(null)
  const [returnFlight, setReturnFlight] = useState<FlightInfo | null>(null)


  // 隱藏項目展開狀態
  const [expandedHiddenCategories, setExpandedHiddenCategories] = useState<Set<string>>(new Set())

  // 🆕 產生需求單狀態
  const [generatingRequests, setGeneratingRequests] = useState(false)
  
  // 🆕 從核心表產生需求單
  const [showCoreRequestDialog, setShowCoreRequestDialog] = useState(false)
  const [selectedSupplierName, setSelectedSupplierName] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [coreItems, setCoreItems] = useState<TourItineraryItem[]>([])

  // ============================================
  // 載入資料
  // ============================================
  const loadData = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true)
      else setRefreshing(true)

      try {
        let quoteId = propQuoteId || null
        if (tourId) {
          const { data: tourData } = await supabase
            .from('tours')
            .select('*')
            .eq('id', tourId)
            .single()
          if (!tourData) return
          setTour(tourData as Tour)
          quoteId = quoteId || (tourData as { quote_id?: string | null }).quote_id || null
          if (tourData.outbound_flight) {
            setOutboundFlight(tourData.outbound_flight as FlightInfo)
            setReturnFlight(tourData.return_flight as FlightInfo | null)
          }
          const { data: requests } = await supabase
            .from('tour_requests')
            .select(
              'id, code, category, supplier_name, title, service_date, quantity, notes, status, quoted_cost, hidden, resource_id, resource_type'
            )
            .eq('tour_id', tourId)
            .order('created_at', { ascending: true })
          setExistingRequests((requests as TourRequest[]) || [])

          // 直接讀核心表（不依賴 quote_id）
          const { data: items } = await supabase
            .from('tour_itinerary_items')
            .select('*')
            .eq('tour_id', tourId)
            .order('day_number', { ascending: true })
            .order('sort_order', { ascending: true })
          setCoreItems((items as TourItineraryItem[]) || [])
          setStartDate(tourData.departure_date || null)
        }

        // 保留 quote 讀取（用於 group_size 等 header 資訊）
        if (quoteId) {
          const { data: quote } = await supabase
            .from('quotes')
            .select('start_date, group_size')
            .eq('id', quoteId)
            .single()
          if (quote) {
            if (quote.start_date) setStartDate(quote.start_date)
            setQuoteGroupSize(quote.group_size || null)
          }
        }
      } catch (error) {
        logger.error(COMP_REQUIREMENTS_LABELS.載入需求資料失敗, error)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [tourId, propQuoteId, tour?.departure_date]
  )

  useEffect(() => {
    loadData(true)
  }, [loadData])

  // ============================================
  // 計算邏輯
  // ============================================

  const calculateDate = useCallback(
    (dayNum: number): string | null => {
      if (!startDate) return null
      const date = new Date(startDate)
      date.setDate(date.getDate() + dayNum - 1)
      return date.toISOString().split('T')[0]
    },
    [startDate]
  )

  const quoteItems = useMemo(
    () => coreItemsToQuoteItems(coreItems, calculateDate),
    [coreItems, calculateDate]
  )
  const itemsByCategory = useMemo(() => groupItemsByCategory(quoteItems), [quoteItems])

  // 團確單
  const { generatingSheet, handleGenerateConfirmationSheet } = useConfirmationSheet({
    user,
    tour,
    tourId,
    quoteItems,
    quoteGroupSize,
    existingRequests,
    outboundFlight,
    returnFlight,
  })

  // ============================================
  // 動作
  // ============================================

  const handleToggleHidden = useCallback(
    async (
      existingRequestId: string | null,
      hidden: boolean,
      itemData?: {
        category: string
        supplierName: string
        title: string
        serviceDate: string | null
        quantity: number
        notes?: string
        resourceId?: string | null
        resourceType?: string | null
      }
    ) => {
      try {
        if (existingRequestId) {
          const { error } = await supabase
            .from('tour_requests')
            .update({ hidden })
            .eq('id', existingRequestId)
          if (error) throw error
          setExistingRequests(prev =>
            prev.map(r => (r.id === existingRequestId ? { ...r, hidden } : r))
          )
        } else if (itemData && user?.workspace_id) {
          const code = `RQ${Date.now().toString().slice(-8)}`
          const insertData = {
            code,
            workspace_id: user.workspace_id,
            tour_id: tourId || null,
            tour_code: tour?.code || null,
            tour_name: tour?.name || null,
            category: itemData.category,
            supplier_name: itemData.supplierName || null,
            title: itemData.title,
            service_date: itemData.serviceDate || null,
            quantity: itemData.quantity,
            notes: itemData.notes || null,
            status: 'draft',
            hidden: true,
            resource_id: itemData.resourceId || null,
            resource_type: itemData.resourceType || null,
            created_by: user.id,
            created_by_name: user.display_name || user.chinese_name || '',
          }
          const { data: newRequest, error } = await supabase
            .from('tour_requests')
            .insert(insertData)
            .select(
              'id, code, category, supplier_name, title, service_date, quantity, notes, status, quoted_cost, hidden, resource_id, resource_type'
            )
            .single()
          if (error) throw error
          if (newRequest) setExistingRequests(prev => [...prev, newRequest as TourRequest])
        }
        toast({
          title: hidden ? COMP_REQUIREMENTS_LABELS.已隱藏 : COMP_REQUIREMENTS_LABELS.已恢復顯示,
        })
      } catch (error) {
        logger.error(COMP_REQUIREMENTS_LABELS.更新隱藏狀態失敗, error)
        toast({ title: COMP_REQUIREMENTS_LABELS.操作失敗, variant: 'destructive' })
      }
    },
    [toast, user, tourId, tour]
  )

  const toggleHiddenCategory = useCallback((category: string) => {
    setExpandedHiddenCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) newSet.delete(category)
      else newSet.add(category)
      return newSet
    })
  }, [])


  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
  }

  const openRequestDialog = useCallback(
    (category: string, supplierName: string) => {
      if (!onOpenRequestDialog) return
      const categoryItems = itemsByCategory[category as CategoryKey] || []
      const items = categoryItems
        .filter(item => item.supplierName === supplierName)
        .map(item => ({
          serviceDate: item.serviceDate,
          title: item.title,
          quantity: item.quantity,
          notes: item.notes,
        }))
      onOpenRequestDialog({
        category,
        supplierName,
        items,
        tour: tour || undefined,
        startDate,
      })
    },
    [itemsByCategory, tour, startDate, onOpenRequestDialog]
  )
  
  // 🆕 從核心表產生需求單
  const openCoreRequestDialog = useCallback(
    (category: string, supplierName: string) => {
      setSelectedCategory(category)
      setSelectedSupplierName(supplierName)
      setShowCoreRequestDialog(true)
    },
    []
  )

  // 🆕 產生單一供應商的需求單
  const handleGenerateSupplierRequest = useCallback(
    async (category: string, supplierName: string, items: QuoteItem[]) => {
      if (!tourId || !user?.workspace_id || !linkedQuoteId) {
        toast({
          title: '無法產生需求單',
          description: '缺少必要資訊',
          variant: 'destructive',
        })
        return
      }

      try {
        setGeneratingRequests(true)

        // 轉換為 RequestItem 格式
        const requestItems = items.map(item => ({
          service_date: item.serviceDate || null,
          title: item.title,
          quantity: item.quantity,
          note: item.notes || '',
          unit_price: 0,
          total_price: 0,
        }))

        // 建立需求單記錄
        const { data: request, error } = await supabase
          .from('tour_requests')
          .insert({
            workspace_id: user.workspace_id,
            tour_id: tourId,
            source_type: 'quote',
            source_id: linkedQuoteId,
            code: `REQ-${Date.now()}`,
            request_type: category,
            supplier_name: supplierName,
            items: requestItems as any,
            status: '草稿',
            created_by: user.id,
            updated_by: user.id,
          } as any)
          .select()
          .single()

        if (error) throw error

        toast({
          title: '需求單已建立',
          description: `${supplierName} 的 ${category} 需求單`,
        })

        // 重新載入
        await loadData(false)

        // TODO: 產生 PDF
        // 可以導航到需求單詳細頁面或直接下載 PDF
      } catch (error) {
        logger.error('產生需求單失敗', error)
        toast({
          title: '產生需求單失敗',
          description: error instanceof Error ? error.message : '未知錯誤',
          variant: 'destructive',
        })
      } finally {
        setGeneratingRequests(false)
      }
    },
    [tourId, user, linkedQuoteId, toast, loadData]
  )

  const totalItems = quoteItems.length

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-morandi-gold" size={32} />
      </div>
    )
  }

  return (
    <>
      <div className={cn('space-y-4', className)}>
        {/* 標題列 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-morandi-secondary">
              {COMP_REQUIREMENTS_LABELS.共}
              {totalItems}
              {COMP_REQUIREMENTS_LABELS.項}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(false)}
              disabled={refreshing}
              className="gap-1"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {COMP_REQUIREMENTS_LABELS.刷新}
            </Button>
            {tourId && quoteItems.length > 0 && (
              <Button
                size="sm"
                onClick={handleGenerateConfirmationSheet}
                disabled={generatingSheet}
                className="gap-1 bg-morandi-gold hover:bg-morandi-gold-hover text-white"
              >
                {generatingSheet ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ClipboardList size={14} />
                )}
                {COMP_REQUIREMENTS_LABELS.產生團確單}
              </Button>
            )}
          </div>
        </div>

        {/* 主表格 — 核心表有資料就顯示，不需要綁定報價單 */}
        {coreItems.length === 0 && !linkedQuoteId ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <AlertCircle className="mx-auto text-morandi-muted mb-3" size={48} />
            <p className="text-morandi-secondary mb-2">尚無行程資料</p>
            <p className="text-xs text-morandi-muted">
              請先到「行程」頁籤填寫行程內容
            </p>
          </div>
        ) : quoteItems.length === 0 && existingRequests.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <AlertCircle className="mx-auto text-morandi-muted mb-3" size={48} />
            <p className="text-morandi-secondary">{COMP_REQUIREMENTS_LABELS.報價單尚無需求項目}</p>
            <p className="text-xs text-morandi-muted mt-1">
              {COMP_REQUIREMENTS_LABELS.請先在報價單填寫交通住宿餐食活動資料}
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="bg-morandi-container/50 border-b border-border">
                  <th className="px-3 py-2.5 text-left font-medium text-morandi-primary w-[70px]">
                    {COMP_REQUIREMENTS_LABELS.日期}
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-morandi-primary w-[140px]">
                    {COMP_REQUIREMENTS_LABELS.供應商}
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-morandi-primary w-[200px]">
                    {COMP_REQUIREMENTS_LABELS.項目說明}
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-morandi-primary w-[80px]">
                    {COMP_REQUIREMENTS_LABELS.成本}
                  </th>
                  <th className="px-3 py-2.5 text-center font-medium text-morandi-primary w-[80px]">
                    {COMP_REQUIREMENTS_LABELS.狀態}
                  </th>
                  <th className="px-3 py-2.5 text-center font-medium text-morandi-primary w-[70px]">
                    {COMP_REQUIREMENTS_LABELS.操作}
                  </th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map(cat => {
                  const categoryItems = itemsByCategory[cat.key]
                  if (categoryItems.length === 0) return null

                  const findMatchingRequest = (item: QuoteItem) => {
                    if (item.resourceId) {
                      const byResourceId = existingRequests.find(
                        r => r.category === cat.key && r.resource_id === item.resourceId
                      )
                      if (byResourceId) return byResourceId
                    }
                    return existingRequests.find(
                      r =>
                        r.category === cat.key &&
                        r.supplier_name === item.supplierName &&
                        r.service_date === item.serviceDate
                    )
                  }

                  const getSupplierKey = (item: QuoteItem) => {
                    if (item.resourceId) return item.resourceId
                    if (item.supplierName === '飯店早餐')
                      return `飯店早餐-${item.serviceDate || ''}`
                    if (item.supplierName) return item.supplierName
                    return `${item.title}-${item.serviceDate || ''}`
                  }

                  const visibleItems: QuoteItem[] = []
                  const hiddenItems: QuoteItem[] = []
                  for (const item of categoryItems) {
                    const existingRequest = findMatchingRequest(item)
                    if (existingRequest?.hidden) hiddenItems.push(item)
                    else visibleItems.push(item)
                  }

                  const isHiddenExpanded = expandedHiddenCategories.has(cat.key)
                  const categoryTotal = visibleItems.reduce((sum, item) => {
                    const existing = findMatchingRequest(item)
                    return sum + (existing?.quoted_cost || 0)
                  }, 0)

                  const renderedSuppliers = new Set<string>()

                  const renderItem = (item: QuoteItem, idx: number, isHidden: boolean) => {
                    const existingRequest = findMatchingRequest(item)
                    const supplierKey = getSupplierKey(item)
                    const isFirstRowForSupplier = !renderedSuppliers.has(supplierKey)
                    if (isFirstRowForSupplier) renderedSuppliers.add(supplierKey)

                    let statusLabel = COMP_REQUIREMENTS_LABELS.待作業
                    let statusClass = ''
                    if (!existingRequest) {
                      const config = getStatusConfig('tour_request', 'pending')
                      statusClass = `${config.bgColor} ${config.color}`
                    } else {
                      const s = existingRequest.status || 'pending'
                      const config = getStatusConfig('tour_request', s)
                      statusLabel = config.label
                      statusClass = `${config.bgColor} ${config.color}`
                    }

                    return (
                      <tr
                        key={`${cat.key}-${isHidden ? 'hidden' : 'visible'}-${idx}`}
                        className={cn(
                          'border-t border-border/50 hover:bg-morandi-container/20',
                          isHidden && 'bg-morandi-muted/5'
                        )}
                      >
                        <td className="px-3 py-2.5">{formatDate(item.serviceDate)}</td>
                        <td className="px-3 py-2.5">{item.supplierName || '-'}</td>
                        <td className="px-3 py-2.5">
                          <div>
                            <span>{item.title}</span>
                            {item.notes && (
                              <div className="text-xs mt-0.5 text-morandi-secondary whitespace-pre-line">
                                {item.notes}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-morandi-primary">
                          {item.quotedPrice ? `$${item.quotedPrice.toLocaleString()}` : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                              statusClass
                            )}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* 🆕 產生需求單按鈕（只在第一行顯示） */}
                            {isFirstRowForSupplier && !isHidden && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const supplierItems = categoryItems.filter(
                                    i => getSupplierKey(i) === supplierKey
                                  )
                                  handleGenerateSupplierRequest(
                                    cat.key,
                                    item.supplierName || '未指定',
                                    supplierItems
                                  )
                                }}
                                className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="產生需求單 PDF"
                                disabled={generatingRequests}
                              >
                                {generatingRequests ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <FileText size={12} />
                                )}
                              </Button>
                            )}
                            
                            {(isHidden || isFirstRowForSupplier) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleToggleHidden(
                                    existingRequest?.id || null,
                                    !isHidden,
                                    !existingRequest
                                      ? {
                                          category: cat.key,
                                          supplierName: item.supplierName || '',
                                          title: item.title,
                                          serviceDate: item.serviceDate,
                                          quantity: item.quantity,
                                          notes: item.notes,
                                          resourceId: item.resourceId,
                                          resourceType:
                                            cat.key === 'accommodation'
                                              ? 'hotel'
                                              : cat.key === 'meal'
                                                ? 'restaurant'
                                                : cat.key === 'activity'
                                                  ? 'attraction'
                                                  : undefined,
                                        }
                                      : undefined
                                  )
                                }
                                className={cn(
                                  'h-7 w-7 p-0',
                                  isHidden
                                    ? 'text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/50'
                                    : 'text-morandi-muted hover:text-morandi-secondary hover:bg-morandi-container/30'
                                )}
                                title={
                                  isHidden
                                    ? COMP_REQUIREMENTS_LABELS.恢復顯示
                                    : COMP_REQUIREMENTS_LABELS.隱藏
                                }
                              >
                                {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                              </Button>
                            )}
                            {isFirstRowForSupplier && item.supplierName && tour && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openCoreRequestDialog(cat.key, item.supplierName)}
                                className="h-7 w-7 p-0 text-morandi-gold hover:text-morandi-gold-hover hover:bg-morandi-gold/10"
                                title="列印需求單"
                              >
                                <FileText size={14} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <React.Fragment key={cat.key}>
                      <tr className="bg-morandi-container/30 border-t border-border">
                        <td colSpan={3} className="px-3 py-2">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-morandi-primary">{cat.label}</span>
                            <span className="text-xs text-morandi-secondary">
                              ({visibleItems.length}
                              {COMP_REQUIREMENTS_LABELS.項})
                            </span>
                            {hiddenItems.length > 0 && (
                              <button
                                onClick={() => toggleHiddenCategory(cat.key)}
                                className="flex items-center gap-1 text-xs text-morandi-muted hover:text-morandi-secondary transition-colors"
                              >
                                {isHiddenExpanded ? (
                                  <ChevronDown size={14} />
                                ) : (
                                  <ChevronRight size={14} />
                                )}
                                <EyeOff size={12} />
                                <span>
                                  {COMP_REQUIREMENTS_LABELS.已隱藏}({hiddenItems.length})
                                </span>
                              </button>
                            )}
                          </div>
                        </td>
                        <td></td>
                        <td className="px-3 py-2 text-right font-medium text-morandi-primary">
                          {categoryTotal > 0 ? `$${categoryTotal.toLocaleString()}` : ''}
                        </td>
                        <td></td>
                        <td className="px-3 py-2 text-center"></td>
                      </tr>
                      {visibleItems.map((trackItem, idx) => renderItem(trackItem, idx, false))}
                      {isHiddenExpanded && hiddenItems.length > 0 && (
                        <>
                          <tr className="bg-morandi-muted/10 border-t border-dashed border-morandi-muted/30">
                            <td colSpan={7} className="px-3 py-1.5 text-xs text-morandi-muted">
                              <div className="flex items-center gap-1">
                                <EyeOff size={12} />
                                <span>{COMP_REQUIREMENTS_LABELS.已隱藏的項目}</span>
                              </div>
                            </td>
                          </tr>
                          {hiddenItems.map((trackItem, idx) => renderItem(trackItem, idx, true))}
                        </>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 從核心表產生需求單 Dialog */}
      {tour && (
        <CoreTableRequestDialog
          isOpen={showCoreRequestDialog}
          onClose={() => {
            setShowCoreRequestDialog(false)
            loadData(false) // 關閉後重新載入資料
          }}
          tour={tour}
          supplierName={selectedSupplierName}
          category={selectedCategory}
        />
      )}
    </>
  )
}
