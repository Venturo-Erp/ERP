'use client'

/**
 * ConfirmationSheet — 團確單（確認單）顯示 & 列印
 *
 * 從核心表 tour_itinerary_items 讀取已確認項目，
 * 按天數/類別分組顯示供應商、預訂編號、付款狀態。
 * 標記需要領隊現場付款的項目。
 */

import { useMemo, useState, useEffect, useCallback } from 'react'
import { Loader2, Printer, RefreshCw, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { useToast } from '@/components/ui/use-toast'
import { useTourItineraryItemsByTour } from '@/features/tours/hooks/useTourItineraryItems'
import type { TourItineraryItem } from '@/features/tours/types/tour-itinerary-item.types'

// === 類型定義 ===

interface ConfirmationSheetProps {
  tourId: string
}

interface TourHeaderInfo {
  code: string
  name: string
  departure_date: string | null
  return_date: string | null
  current_participants: number | null
  max_participants: number | null
  sales_person: string | null
  assistant: string | null
}

// === 付款狀態判定 ===

type PaymentStatus = 'paid' | 'unpaid' | 'leader_pay'

function getPaymentStatus(item: TourItineraryItem): PaymentStatus {
  // 領隊已回填實際支出 → 已付
  if (item.actual_expense != null && item.actual_expense > 0) return 'paid'
  // booking_status = confirmed → 已付（供應商預付，價格已覆蓋到 unit_price）
  if (item.booking_status === 'confirmed') return 'paid'
  // 沒有 request_id 代表不走需求單流程 → 領隊現付
  if (!item.request_id) return 'leader_pay'
  return 'unpaid'
}

const PAYMENT_STATUS_CONFIG: Record<
  PaymentStatus,
  { label: string; className: string }
> = {
  paid: { label: '已付', className: 'bg-green-100 text-green-700 print:bg-green-50' },
  unpaid: { label: '未付', className: 'bg-amber-100 text-amber-700 print:bg-amber-50' },
  leader_pay: {
    label: '領隊現付',
    className: 'bg-blue-100 text-blue-700 print:bg-blue-50',
  },
}

// === 分類標籤 ===

const SUB_CATEGORY_LABELS: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
}

// === 主組件 ===

export function ConfirmationSheet({ tourId }: ConfirmationSheetProps) {
  const { items, loading, refresh } = useTourItineraryItemsByTour(tourId)
  const { toast } = useToast()
  const [headerInfo, setHeaderInfo] = useState<TourHeaderInfo | null>(null)
  const [headerLoading, setHeaderLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // 讀取團基本資訊 + 第一筆訂單的業務/助理
  useEffect(() => {
    async function fetchHeader() {
      setHeaderLoading(true)
      try {
        const { data: tour } = await supabase
          .from('tours')
          .select('code, name, departure_date, return_date, current_participants, max_participants')
          .eq('id', tourId)
          .single()

        if (!tour) return

        const { data: firstOrder } = await supabase
          .from('orders')
          .select('sales_person, assistant')
          .eq('tour_id', tourId)
          .limit(1)
          .maybeSingle()

        setHeaderInfo({
          code: tour.code,
          name: tour.name,
          departure_date: tour.departure_date,
          return_date: tour.return_date,
          current_participants: tour.current_participants,
          max_participants: tour.max_participants,
          sales_person: firstOrder?.sales_person ?? null,
          assistant: firstOrder?.assistant ?? null,
        })
      } catch (err) {
        logger.error('讀取團確單標頭失敗:', err)
      } finally {
        setHeaderLoading(false)
      }
    }

    fetchHeader()
  }, [tourId])

  // 篩選已確認的項目
  const confirmedItems = useMemo(() => {
    return items.filter(
      item =>
        item.confirmation_status === 'confirmed' ||
        item.booking_status === 'confirmed' ||
        item.request_status === 'confirmed'
    )
  }, [items])

  // 按天數分組
  const groupedByDay = useMemo(() => {
    const groups = new Map<number, TourItineraryItem[]>()
    for (const item of confirmedItems) {
      const day = item.day_number ?? 0
      if (!groups.has(day)) groups.set(day, [])
      groups.get(day)!.push(item)
    }
    for (const dayItems of groups.values()) {
      dayItems.sort((a, b) => a.sort_order - b.sort_order)
    }
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0])
  }, [confirmedItems])

  // 費用統計
  const costSummary = useMemo(() => {
    let totalConfirmed = 0
    let totalActual = 0
    let leaderPayCount = 0

    for (const item of confirmedItems) {
      // 統一邏輯：確認後的價格在 unit_price（覆蓋式管理）
      if (item.booking_status === 'confirmed' && item.unit_price != null) {
        totalConfirmed += item.unit_price
      }
      if (item.actual_expense != null) totalActual += item.actual_expense
      if (getPaymentStatus(item) === 'leader_pay') leaderPayCount++
    }

    return { totalConfirmed, totalActual, leaderPayCount }
  }, [confirmedItems])

  // 生成/更新團確單記錄到 tour_confirmation_sheets
  const handleGenerate = useCallback(async () => {
    if (!headerInfo) return

    setGenerating(true)
    try {
      // 取得 workspace_id
      const { data: tourData } = await supabase
        .from('tours')
        .select('workspace_id')
        .eq('id', tourId)
        .single()

      if (!tourData?.workspace_id) {
        toast({ title: '缺少 workspace 資訊', variant: 'destructive' })
        return
      }

      // 檢查是否已有 sheet
      const { data: existingSheet } = await supabase
        .from('tour_confirmation_sheets')
        .select('id')
        .eq('tour_id', tourId)
        .maybeSingle()

      let sheetId: string

      if (existingSheet) {
        // 更新現有 sheet
        await supabase
          .from('tour_confirmation_sheets')
          .update({
            tour_code: headerInfo.code,
            tour_name: headerInfo.name,
            departure_date: headerInfo.departure_date,
            return_date: headerInfo.return_date,
            pax: headerInfo.current_participants,
            status: 'confirmed',
            total_expected_cost: costSummary.totalConfirmed,
            total_actual_cost: costSummary.totalActual || null,
          })
          .eq('id', existingSheet.id)

        sheetId = existingSheet.id

        // 刪除尚未有 actual_cost 的舊項目（保留已付清的）
        await supabase
          .from('tour_confirmation_items')
          .delete()
          .eq('sheet_id', sheetId)
          .is('actual_cost', null)
      } else {
        // 建立新 sheet
        const { data: newSheet, error: sheetError } = await supabase
          .from('tour_confirmation_sheets')
          .insert({
            tour_id: tourId,
            tour_code: headerInfo.code,
            tour_name: headerInfo.name,
            departure_date: headerInfo.departure_date,
            return_date: headerInfo.return_date,
            pax: headerInfo.current_participants,
            workspace_id: tourData.workspace_id,
            status: 'confirmed',
            total_expected_cost: costSummary.totalConfirmed,
            total_actual_cost: costSummary.totalActual || null,
          })
          .select('id')
          .single()

        if (sheetError) throw sheetError
        sheetId = newSheet.id
      }

      // 從核心表已確認項目寫入 confirmation_items
      const { data: existingItems } = await supabase
        .from('tour_confirmation_items')
        .select('itinerary_item_id')
        .eq('sheet_id', sheetId)

      const existingItineraryIds = new Set(
        (existingItems || []).map(i => i.itinerary_item_id).filter(Boolean)
      )

      const newItems = confirmedItems
        .filter(item => !existingItineraryIds.has(item.id))
        .map((item, index) => ({
          sheet_id: sheetId,
          itinerary_item_id: item.id,
          category: mapCoreCategory(item.category),
          service_date: item.service_date || '',
          supplier_name: item.supplier_name || '',
          supplier_id: item.supplier_id || null,
          title: item.title || '',
          description: item.description || null,
          unit_price: item.unit_price || null,
          quantity: item.quantity || null,
          subtotal: item.total_cost || null,
          expected_cost: item.unit_price || null,  // 統一用 unit_price（覆蓋式管理）
          actual_cost: item.actual_expense || null,
          leader_expense: item.actual_expense || null,
          booking_reference: item.booking_reference || null,
          booking_status: (item.booking_status as string) || 'confirmed',
          sort_order: index,
          workspace_id: tourData.workspace_id,
          resource_type: item.resource_type || null,
          resource_id: item.resource_id || null,
          latitude: item.latitude || null,
          longitude: item.longitude || null,
          google_maps_url: item.google_maps_url || null,
          notes: item.confirmation_note || null,
        }))

      if (newItems.length > 0) {
        const { error: insertError } = await supabase
          .from('tour_confirmation_items')
          .insert(newItems)

        if (insertError) throw insertError
      }

      toast({ title: existingSheet ? '團確單已更新' : '團確單已生成' })
      refresh()
    } catch (err) {
      logger.error('生成團確單失敗:', err)
      toast({ title: '生成團確單失敗', variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }, [tourId, headerInfo, confirmedItems, costSummary, toast, refresh])

  const handlePrint = () => {
    window.print()
  }

  if (loading || headerLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
        <span className="ml-2 text-muted-foreground">載入團確單中...</span>
      </div>
    )
  }

  if (confirmedItems.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        尚無已確認的項目，請先在需求管理中確認供應商回覆。
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* === 操作列 === */}
      <div className="flex items-center justify-between print:hidden">
        <div className="text-sm text-muted-foreground">
          共 {confirmedItems.length} 項已確認
          {costSummary.leaderPayCount > 0 && (
            <span className="ml-2">
              （{costSummary.leaderPayCount} 項需領隊現付）
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="animate-spin mr-1.5" size={14} />
            ) : (
              <RefreshCw className="mr-1.5" size={14} />
            )}
            {generating ? '生成中...' : '生成團確單'}
          </Button>
          <Button size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer size={14} />
            列印
          </Button>
        </div>
      </div>

      {/* === 標頭資訊 === */}
      <div className="print:block">
        <div className="border rounded-lg p-6 bg-white print:border-none print:p-0">
          <h2 className="text-xl font-bold text-center mb-4 print:text-2xl">團確單</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <InfoField label="團號" value={headerInfo?.code} />
            <InfoField label="團名" value={headerInfo?.name} />
            <InfoField
              label="出發日"
              value={headerInfo?.departure_date ? formatDate(headerInfo.departure_date) : null}
            />
            <InfoField
              label="回程日"
              value={headerInfo?.return_date ? formatDate(headerInfo.return_date) : null}
            />
            <InfoField
              label="人數"
              value={
                headerInfo?.current_participants != null
                  ? `${headerInfo.current_participants}${headerInfo.max_participants ? ` / ${headerInfo.max_participants}` : ''} 人`
                  : null
              }
            />
            <InfoField label="業務" value={headerInfo?.sales_person} />
            <InfoField label="助理" value={headerInfo?.assistant} />
            <InfoField
              label="預計費用"
              value={costSummary.totalConfirmed > 0 ? `$${costSummary.totalConfirmed.toLocaleString()}` : null}
            />
          </div>
        </div>
      </div>

      {/* === 按天分組的確認項目 === */}
      <div className="space-y-4">
        {groupedByDay.map(([dayNumber, dayItems]) => (
          <DaySection key={dayNumber} dayNumber={dayNumber} items={dayItems} />
        ))}
      </div>

      {/* === 費用匯總（列印用） === */}
      <div className="border rounded-lg p-4 bg-white print:break-inside-avoid">
        <h3 className="font-semibold text-sm mb-3">費用匯總</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">預計費用：</span>
            <span className="font-mono font-medium">
              ${costSummary.totalConfirmed.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">實際支出：</span>
            <span className="font-mono font-medium">
              {costSummary.totalActual > 0 ? `$${costSummary.totalActual.toLocaleString()}` : '-'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">領隊現付項目：</span>
            <span className="font-mono font-medium">{costSummary.leaderPayCount} 項</span>
          </div>
        </div>
      </div>

      {/* === 列印頁尾 === */}
      <div className="hidden print:block text-xs text-muted-foreground text-center pt-4 border-t">
        列印日期：{formatDate(new Date().toISOString())}
      </div>
    </div>
  )
}

// === 子組件 ===

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}：</span>
      <span className="font-medium">{value || '-'}</span>
    </div>
  )
}

interface DaySectionProps {
  dayNumber: number
  items: TourItineraryItem[]
}

function DaySection({ dayNumber, items }: DaySectionProps) {
  const activities = items.filter(i => i.category === 'activities')
  const meals = items.filter(i => i.category === 'meals')
  const accommodation = items.filter(i => i.category === 'accommodation')
  const transport = items.filter(
    i => i.category === 'transport' || i.category === 'group-transport'
  )
  const others = items.filter(
    i =>
      i.category !== 'activities' &&
      i.category !== 'meals' &&
      i.category !== 'accommodation' &&
      i.category !== 'transport' &&
      i.category !== 'group-transport'
  )

  const firstDate = items[0]?.service_date

  return (
    <div className="border rounded-lg overflow-hidden print:break-inside-avoid">
      <div className="bg-muted/50 px-4 py-2 border-b flex items-center gap-3">
        <span className="font-bold text-sm">
          {dayNumber > 0 ? `Day ${dayNumber}` : '未分配'}
        </span>
        {firstDate && (
          <span className="text-sm text-muted-foreground">{formatDate(firstDate)}</span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {transport.length > 0 && (
          <CategoryBlock icon="bus" label="交通" items={transport} />
        )}
        {activities.length > 0 && (
          <CategoryBlock icon="landmark" label="景點/活動" items={activities} />
        )}
        {meals.length > 0 && <CategoryBlock icon="utensils" label="餐食" items={meals} />}
        {accommodation.length > 0 && (
          <CategoryBlock icon="hotel" label="住宿" items={accommodation} />
        )}
        {others.length > 0 && <CategoryBlock icon="clipboard" label="其他" items={others} />}
      </div>
    </div>
  )
}

interface CategoryBlockProps {
  icon: string
  label: string
  items: TourItineraryItem[]
}

const CATEGORY_ICONS: Record<string, string> = {
  bus: '🚌',
  landmark: '🏛',
  utensils: '🍽',
  hotel: '🏨',
  clipboard: '📋',
}

function CategoryBlock({ icon, label, items }: CategoryBlockProps) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span>{CATEGORY_ICONS[icon] || '📋'}</span>
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      </div>
      <div className="space-y-1 ml-6">
        {items.map(item => (
          <ConfirmationItemRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

function ConfirmationItemRow({ item }: { item: TourItineraryItem }) {
  const subLabel = item.sub_category
    ? SUB_CATEGORY_LABELS[item.sub_category] || item.sub_category
    : null

  const paymentStatus = getPaymentStatus(item)
  const statusConfig = PAYMENT_STATUS_CONFIG[paymentStatus]

  return (
    <div
      className={cn(
        'flex items-start gap-3 text-sm py-1.5 px-2 rounded',
        'hover:bg-muted/30 transition-colors print:hover:bg-transparent'
      )}
    >
      {/* 項目名稱 & 供應商 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{item.title || '-'}</span>
          {subLabel && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {subLabel}
            </span>
          )}
          {/* 付款狀態 */}
          <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', statusConfig.className)}>
            {paymentStatus === 'leader_pay' && <Wallet className="inline mr-0.5" size={10} />}
            {statusConfig.label}
          </span>
        </div>
        {/* 供應商 */}
        {item.supplier_name && (
          <div className="text-xs text-muted-foreground mt-0.5">{item.supplier_name}</div>
        )}
        {/* 描述 */}
        {item.description && (
          <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
        )}
        {/* 確認備註 */}
        {item.confirmation_note && (
          <div className="text-xs text-blue-600 mt-0.5">{item.confirmation_note}</div>
        )}
      </div>

      {/* 預訂編號 */}
      {item.booking_reference && (
        <div className="shrink-0 text-xs">
          <span className="text-muted-foreground">預訂號：</span>
          <span className="font-mono font-medium">{item.booking_reference}</span>
        </div>
      )}

      {/* 金額 */}
      <div className="shrink-0 text-xs font-mono text-right">
        {item.booking_status === 'confirmed' && item.unit_price != null && (
          <div>
            {item.currency && item.currency !== 'TWD' ? `${item.currency} ` : ''}
            {item.unit_price.toLocaleString()}
          </div>
        )}
        {item.actual_expense != null && item.actual_expense > 0 && (
          <div className="text-green-600">
            實付 {item.actual_expense.toLocaleString()}
          </div>
        )}
      </div>
    </div>
  )
}

// === 工具函式 ===

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

/** 核心表 category → confirmation_items category */
function mapCoreCategory(category: string | null): string {
  switch (category) {
    case 'meals':
      return 'meal'
    case 'activities':
      return 'activity'
    case 'group-transport':
      return 'transport'
    case 'others':
      return 'other'
    default:
      return category || 'other'
  }
}
