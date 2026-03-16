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
  Printer,
} from 'lucide-react'
// TODO: [品質優化] 將 supabase 操作搬到 confirmations/services/ — 目前因 setState 交錯暫保留
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores'
import type { Tour } from '@/stores/types'
import { RoomRequirementDialog } from './RoomRequirementDialog'
import { TransportRequirementDialog } from './TransportRequirementDialog'
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
  const [memberAgeBreakdown, setMemberAgeBreakdown] = useState<{
    total: number
    adult: number    // ≥12
    child6to12: number  // ≥6 & <12
    child2to6: number   // ≥2 & <6
    infant: number      // <2
  } | null>(null)
  const [startDate, setStartDate] = useState<string | null>(null)
  const [outboundFlight, setOutboundFlight] = useState<FlightInfo | null>(null)
  const [returnFlight, setReturnFlight] = useState<FlightInfo | null>(null)
  const [showRoomDialog, setShowRoomDialog] = useState(false)
  const [selectedHotel, setSelectedHotel] = useState<{
    name: string
    resourceId: string | null
    serviceDate: string | null
    nights: number
  } | null>(null)
  const [showTransportDialog, setShowTransportDialog] = useState(false)
  const [selectedTransport, setSelectedTransport] = useState<{
    name: string
    resourceId: string | null
  } | null>(null)


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
              'id, code, category, supplier_name, supplier_id, title, service_date, quantity, notes, status, quoted_cost, hidden, resource_id, resource_type, request_type, items'
            )
            .eq('tour_id', tourId)
            .order('created_at', { ascending: true })
          setExistingRequests((requests as unknown as TourRequest[]) || [])

          // 直接讀核心表（不依賴 quote_id）
          const { data: items } = await supabase
            .from('tour_itinerary_items')
            .select('*')
            .eq('tour_id', tourId)
            .order('day_number', { ascending: true })
            .order('sort_order', { ascending: true })
          setCoreItems((items as TourItineraryItem[]) || [])
          setStartDate(tourData.departure_date || null)

          // 查團員 + 客戶生日，計算年齡分類
          const { data: members } = await supabase
            .from('tour_members')
            .select('customer_id')
            .eq('tour_id', tourId)
          if (members && members.length > 0) {
            const customerIds = members.map(m => m.customer_id).filter(Boolean)
            const { data: customers } = await supabase
              .from('customers')
              .select('id, birth_date')
              .in('id', customerIds)
            
            const departureDate = tourData.departure_date ? new Date(tourData.departure_date) : new Date()
            const breakdown = { total: members.length, adult: 0, child6to12: 0, child2to6: 0, infant: 0 }
            
            for (const member of members) {
              const customer = customers?.find(c => c.id === member.customer_id)
              if (!customer?.birth_date) {
                breakdown.adult++ // 沒生日預設成人
                continue
              }
              const birth = new Date(customer.birth_date)
              const ageMs = departureDate.getTime() - birth.getTime()
              const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000)
              
              if (ageYears >= 12) breakdown.adult++
              else if (ageYears >= 6) breakdown.child6to12++
              else if (ageYears >= 2) breakdown.child2to6++
              else breakdown.infant++
            }
            setMemberAgeBreakdown(breakdown)
            if (!quoteGroupSize) setQuoteGroupSize(members.length)
          }
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

  // 交通 Dialog 用：建立天數資訊
  const transportDays = useMemo(() => {
    const dayMap = new Map<number, { dayNumber: number; date: string; route: string }>()
    for (const item of coreItems) {
      const dn = item.day_number
      if (!dn || dayMap.has(dn)) continue
      const date = calculateDate(dn)
      dayMap.set(dn, {
        dayNumber: dn,
        date: date ? new Date(date).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }) : `Day ${dn}`,
        route: item.category === 'activities' ? (item.title || '') : '',
      })
    }
    // 補充每天的景點
    for (const item of coreItems) {
      if (item.category === 'activities' && item.day_number && dayMap.has(item.day_number)) {
        const day = dayMap.get(item.day_number)!
        if (!day.route.includes(item.title || '')) {
          day.route = day.route ? `${day.route} → ${item.title}` : (item.title || '')
        }
      }
    }
    return Array.from(dayMap.values()).sort((a, b) => a.dayNumber - b.dayNumber)
  }, [coreItems, calculateDate])

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
              'id, code, category, supplier_name, supplier_id, title, service_date, quantity, notes, status, quoted_cost, hidden, resource_id, resource_type, request_type, items'
            )
            .single()
          if (error) throw error
          if (newRequest) setExistingRequests(prev => [...prev, newRequest as unknown as TourRequest])
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


  // 年齡分類文字
  const ageBreakdownText = useMemo(() => {
    if (!memberAgeBreakdown) return ''
    const parts: string[] = []
    if (memberAgeBreakdown.adult > 0) parts.push(`滿12歲以上 ${memberAgeBreakdown.adult} 位`)
    if (memberAgeBreakdown.child6to12 > 0) parts.push(`滿6歲未滿12歲 ${memberAgeBreakdown.child6to12} 位`)
    if (memberAgeBreakdown.child2to6 > 0) parts.push(`滿2歲未滿6歲 ${memberAgeBreakdown.child2to6} 位`)
    if (memberAgeBreakdown.infant > 0) parts.push(`未滿2歲 ${memberAgeBreakdown.infant} 位`)
    return parts.join('、')
  }, [memberAgeBreakdown])

  const totalPax = memberAgeBreakdown?.total || quoteGroupSize || null

  // 列印住宿需求單
  const handlePrintRequest = useCallback((draft: TourRequest, item: QuoteItem) => {
    const rooms = draft.items || []
    const totalRooms = rooms.reduce((sum, r) => sum + r.quantity, 0)
    const nights = rooms[0]?.nights || item.quantity || 1

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>住宿需求單 - ${draft.supplier_name}</title>
<style>
  @media print { @page { margin: 1.5cm; } body { margin: 0; } }
  body { font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif; font-size: 12pt; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
  h1 { text-align: center; font-size: 22pt; margin-bottom: 10px; border-bottom: 3px double #333; padding-bottom: 10px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
  .info-section { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
  .info-section h3 { margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
  .info-row { display: flex; margin-bottom: 5px; }
  .info-label { font-weight: bold; min-width: 80px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th, td { border: 1px solid #333; padding: 10px; text-align: center; }
  th { background: #f0f0f0; font-weight: bold; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 10pt; color: #666; }
  .highlight { background: #fffde7; }
</style></head><body>
  <h1>住宿需求單</h1>
  <div class="info-grid">
    <div class="info-section">
      <h3>我方資訊</h3>
      <div class="info-row"><span class="info-label">公司：</span><span>角落旅行社</span></div>
      <div class="info-row"><span class="info-label">團號：</span><span>${tour?.code || ''}</span></div>
      <div class="info-row"><span class="info-label">團名：</span><span>${tour?.name || ''}</span></div>
      <div class="info-row"><span class="info-label">出發日：</span><span>${tour?.departure_date || ''}</span></div>
      <div class="info-row"><span class="info-label">總人數：</span><span>${totalPax || '-'} 人</span></div>
      ${ageBreakdownText ? `<div class="info-row"><span class="info-label">年齡分類：</span><span>${ageBreakdownText}</span></div>` : ''}
    </div>
    <div class="info-section">
      <h3>飯店資訊</h3>
      <div class="info-row"><span class="info-label">飯店：</span><span>${draft.supplier_name}</span></div>
      <div class="info-row"><span class="info-label">入住日：</span><span>${item.serviceDate?.split('~')[0] || '-'}</span></div>
      <div class="info-row"><span class="info-label">退房日：</span><span>${item.serviceDate?.split('~')[1] || '-'}</span></div>
      <div class="info-row"><span class="info-label">晚數：</span><span>${nights} 晚</span></div>
    </div>
  </div>
  <table>
    <thead><tr><th>房型</th><th>間數</th><th>晚數</th><th>備註</th></tr></thead>
    <tbody>
      ${rooms.map(r => `<tr><td>${r.room_type}</td><td>${r.quantity}</td><td>${r.nights || nights}</td><td>${r.note || ''}</td></tr>`).join('')}
      <tr class="highlight"><td colspan="1"><strong>合計</strong></td><td><strong>${totalRooms} 間</strong></td><td>${nights} 晚</td><td></td></tr>
    </tbody>
  </table>
  ${draft.notes || draft.note ? `<p style="margin-top:15px"><strong>備註：</strong>${draft.notes || draft.note}</p>` : ''}
  <div class="footer">
    <p>列印時間：${new Date().toLocaleString('zh-TW')}</p>
    <p>此需求單由 Venturo ERP 產生</p>
  </div>
</body></html>`

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
    }
  }, [tour, totalPax, ageBreakdownText])

  // 餐廳/活動直接列印（不需填需求）
  const handlePrintSimpleRequest = useCallback((categoryKey: string, categoryLabel: string, item: QuoteItem) => {
    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>${categoryLabel}需求單 - ${item.supplierName || item.title}</title>
<style>
  @media print { @page { margin: 1.5cm; } body { margin: 0; } }
  body { font-family: 'Microsoft JhengHei', 'PingFang TC', sans-serif; font-size: 12pt; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
  h1 { text-align: center; font-size: 22pt; margin-bottom: 10px; border-bottom: 3px double #333; padding-bottom: 10px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
  .info-section { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
  .info-section h3 { margin-top: 0; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
  .info-row { display: flex; margin-bottom: 5px; }
  .info-label { font-weight: bold; min-width: 80px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th, td { border: 1px solid #333; padding: 10px; text-align: center; }
  th { background: #f0f0f0; font-weight: bold; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 10pt; color: #666; }
</style></head><body>
  <h1>${categoryLabel}需求單</h1>
  <div class="info-grid">
    <div class="info-section">
      <h3>我方資訊</h3>
      <div class="info-row"><span class="info-label">公司：</span><span>角落旅行社</span></div>
      <div class="info-row"><span class="info-label">團號：</span><span>${tour?.code || ''}</span></div>
      <div class="info-row"><span class="info-label">團名：</span><span>${tour?.name || ''}</span></div>
      <div class="info-row"><span class="info-label">出發日：</span><span>${tour?.departure_date || ''}</span></div>
      <div class="info-row"><span class="info-label">總人數：</span><span>${totalPax || '-'} 人</span></div>
      ${ageBreakdownText ? `<div class="info-row"><span class="info-label">年齡分類：</span><span>${ageBreakdownText}</span></div>` : ''}
    </div>
    <div class="info-section">
      <h3>${categoryLabel}資訊</h3>
      <div class="info-row"><span class="info-label">名稱：</span><span>${item.supplierName || item.title}</span></div>
      <div class="info-row"><span class="info-label">日期：</span><span>${item.serviceDate ? formatDate(item.serviceDate) : '-'}</span></div>
    </div>
  </div>
  <table>
    <thead><tr><th>日期</th><th>項目</th><th>人數</th><th>預算</th><th>備註</th></tr></thead>
    <tbody>
      <tr>
        <td>${item.serviceDate ? formatDate(item.serviceDate) : '-'}</td>
        <td>${item.title}</td>
        <td>${totalPax || '-'} 人</td>
        <td>${item.quotedPrice ? 'NT$ ' + item.quotedPrice.toLocaleString() : '-'}</td>
        <td>${item.notes || ''}</td>
      </tr>
    </tbody>
  </table>
  <div class="footer">
    <p>列印時間：${new Date().toLocaleString('zh-TW')}</p>
    <p>此需求單由 Venturo ERP 產生</p>
  </div>
</body></html>`

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
    }
  }, [tour, totalPax, ageBreakdownText])

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-'
    // 支援日期範圍（如 "2026-09-25~2026-09-28"）
    if (dateStr.includes('~')) {
      const [start, end] = dateStr.split('~')
      const fmt = (s: string) => new Date(s).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' })
      return `${fmt(start)}~${fmt(end)}`
    }
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
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-morandi-container/50 border-b border-border">
                  <th className="px-3 py-2.5 text-left font-medium text-morandi-primary w-[70px]">
                    {COMP_REQUIREMENTS_LABELS.日期}
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-morandi-primary w-[180px]">
                    {COMP_REQUIREMENTS_LABELS.供應商}
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-morandi-primary">
                    {COMP_REQUIREMENTS_LABELS.項目說明}
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium text-morandi-primary w-[100px]">
                    {COMP_REQUIREMENTS_LABELS.成本}
                  </th>
                  <th className="px-3 py-2.5 text-center font-medium text-morandi-primary w-[80px]">
                    {COMP_REQUIREMENTS_LABELS.狀態}
                  </th>
                  <th className="px-3 py-2.5 text-center font-medium text-morandi-primary w-[90px]">
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
                      <React.Fragment key={`${cat.key}-${isHidden ? 'hidden' : 'visible'}-${idx}`}>
                      <tr
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
                          {(() => {
                            const supplierName = item.supplierName || item.title
                            const draft = existingRequests.find(
                              r => r.supplier_name === supplierName &&
                                   r.request_type === cat.key &&
                                   r.status === 'draft'
                            )

                            // 住宿：有 draft → 列印，沒有 → 新增需求
                            if (cat.key === 'accommodation') {
                              return draft ? (
                                <Button variant="outline" size="sm"
                                  onClick={() => handlePrintRequest(draft, item)}
                                  className="h-7 px-2 text-xs border-blue-300 text-blue-600 hover:bg-blue-50">
                                  <Printer size={12} className="mr-1" />列印需求單
                                </Button>
                              ) : (
                                <Button variant="outline" size="sm"
                                  onClick={() => {
                                    setSelectedHotel({
                                      name: supplierName,
                                      resourceId: item.resourceId ?? null,
                                      serviceDate: item.serviceDate ?? null,
                                      nights: item.quantity || 1,
                                    })
                                    setShowRoomDialog(true)
                                  }}
                                  className="h-7 px-2 text-xs border-morandi-gold/30 text-morandi-gold hover:bg-morandi-gold/10">
                                  新增需求
                                </Button>
                              )
                            }

                            // 交通：需要勾選天數
                            if (cat.key === 'transport') {
                              return (
                                <Button variant="outline" size="sm"
                                  onClick={() => {
                                    setSelectedTransport({
                                      name: supplierName,
                                      resourceId: item.resourceId ?? null,
                                    })
                                    setShowTransportDialog(true)
                                  }}
                                  className="h-7 px-2 text-xs border-morandi-gold/30 text-morandi-gold hover:bg-morandi-gold/10">
                                  列印需求單
                                </Button>
                              )
                            }

                            // 餐廳/活動：直接列印（不需 Dialog）
                            if (cat.key === 'meal' || cat.key === 'activity') {
                              return (
                                <Button variant="outline" size="sm"
                                  onClick={() => handlePrintSimpleRequest(cat.key, cat.label, item)}
                                  className="h-7 px-2 text-xs border-blue-300 text-blue-600 hover:bg-blue-50">
                                  <Printer size={12} className="mr-1" />列印需求單
                                </Button>
                              )
                            }

                            return null
                          })()}
                        </td>
                      </tr>
                      {/* 房型明細（draft 需求） */}
                      {cat.key === 'accommodation' && (() => {
                        const hotelDraft = existingRequests.find(
                          r => r.request_type === 'accommodation' &&
                               r.supplier_name === (item.supplierName || item.title) &&
                               r.status === 'draft'
                        )
                        if (!hotelDraft?.items || hotelDraft.items.length === 0) return null
                        return (
                          <tr className="bg-blue-50/30">
                            <td></td>
                            <td colSpan={4} className="px-3 py-1.5">
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="font-medium text-blue-600">📋 房型需求：</span>
                                {hotelDraft.items.map((room, ri) => (
                                  <span key={ri} className="bg-blue-100/60 px-2 py-0.5 rounded text-blue-700">
                                    {room.room_type} × {room.quantity}
                                  </span>
                                ))}
                                <span className="text-amber-600 text-[10px]">（草稿）</span>
                              </div>
                            </td>
                            <td></td>
                          </tr>
                        )
                      })()}
                      </React.Fragment>
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
      {/* 交通需求 Dialog */}
      {selectedTransport && (
        <TransportRequirementDialog
          open={showTransportDialog}
          onClose={() => { setShowTransportDialog(false); setSelectedTransport(null) }}
          supplierName={selectedTransport.name}
          tour={tour}
          days={transportDays}
          totalPax={totalPax}
          ageBreakdown={ageBreakdownText}
        />
      )}

      {/* 住宿需求 Dialog */}
      {selectedHotel && (
        <RoomRequirementDialog
          open={showRoomDialog}
          onClose={() => { setShowRoomDialog(false); setSelectedHotel(null) }}
          hotelName={selectedHotel.name}
          hotelResourceId={selectedHotel.resourceId}
          tourId={tourId || ''}
          serviceDate={selectedHotel.serviceDate}
          nights={selectedHotel.nights}
          onSaved={() => loadData(false)}
        />
      )}
    </>
  )
}
