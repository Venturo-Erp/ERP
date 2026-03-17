'use client'

/**
 * ConfirmationSheet — 團確單（確認單）顯示 & 列印
 *
 * 從核心表 tour_itinerary_items 讀取已確認項目，
 * 按天數分組顯示景點、餐廳、飯店、交通等確認資訊。
 */

import { useMemo, useState, useEffect } from 'react'
import { Loader2, Printer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
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

// === 分類標籤 ===

const CATEGORY_LABELS: Record<string, string> = {
  transport: '交通',
  'group-transport': '團體交通',
  accommodation: '住宿',
  meals: '餐食',
  activities: '景點/活動',
  others: '其他',
  guide: '導遊',
}

const SUB_CATEGORY_LABELS: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
}

// === 主組件 ===

export function ConfirmationSheet({ tourId }: ConfirmationSheetProps) {
  const { items, loading } = useTourItineraryItemsByTour(tourId)
  const [headerInfo, setHeaderInfo] = useState<TourHeaderInfo | null>(null)
  const [headerLoading, setHeaderLoading] = useState(true)

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

        // 從訂單取業務 & 助理
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

  // 篩選已確認的項目：confirmation_status = confirmed 或 booking_status = confirmed
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
    // 每天內按 sort_order 排
    for (const dayItems of groups.values()) {
      dayItems.sort((a, b) => a.sort_order - b.sort_order)
    }
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0])
  }, [confirmedItems])

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
      {/* === 標頭資訊 === */}
      <div className="print:block">
        <div className="border rounded-lg p-6 bg-white print:border-none print:p-0">
          <h2 className="text-xl font-bold text-center mb-4 print:text-2xl">團確單</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
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
            <InfoField label="已確認項目" value={`${confirmedItems.length} 項`} />
          </div>
        </div>
      </div>

      {/* === 按天分組的確認項目 === */}
      <div className="space-y-4">
        {groupedByDay.map(([dayNumber, dayItems]) => (
          <DaySection key={dayNumber} dayNumber={dayNumber} items={dayItems} />
        ))}
      </div>

      {/* === 列印按鈕 === */}
      <div className="flex justify-end print:hidden">
        <Button onClick={handlePrint} className="gap-2">
          <Printer size={16} />
          列印團確單
        </Button>
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
  // 分類項目
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
      {/* 天標題 */}
      <div className="bg-muted/50 px-4 py-2 border-b flex items-center gap-3">
        <span className="font-bold text-sm">
          {dayNumber > 0 ? `Day ${dayNumber}` : '未分配'}
        </span>
        {firstDate && (
          <span className="text-sm text-muted-foreground">{formatDate(firstDate)}</span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* 景點 */}
        {activities.length > 0 && (
          <CategoryBlock icon="🏛" label="景點/活動" items={activities} />
        )}

        {/* 餐食 */}
        {meals.length > 0 && <CategoryBlock icon="🍽" label="餐食" items={meals} />}

        {/* 住宿 */}
        {accommodation.length > 0 && (
          <CategoryBlock icon="🏨" label="住宿" items={accommodation} />
        )}

        {/* 交通 */}
        {transport.length > 0 && <CategoryBlock icon="🚌" label="交通" items={transport} />}

        {/* 其他 */}
        {others.length > 0 && <CategoryBlock icon="📋" label="其他" items={others} />}
      </div>
    </div>
  )
}

interface CategoryBlockProps {
  icon: string
  label: string
  items: TourItineraryItem[]
}

function CategoryBlock({ icon, label, items }: CategoryBlockProps) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span>{icon}</span>
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      </div>
      <div className="space-y-1.5 ml-6">
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

  return (
    <div
      className={cn(
        'flex items-start gap-3 text-sm py-1.5 px-2 rounded',
        'hover:bg-muted/30 transition-colors print:hover:bg-transparent'
      )}
    >
      {/* 項目名稱 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.title || '-'}</span>
          {subLabel && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {subLabel}
            </span>
          )}
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

      {/* 確認號碼 */}
      {item.booking_reference && (
        <div className="shrink-0 text-xs">
          <span className="text-muted-foreground">確認號：</span>
          <span className="font-mono font-medium">{item.booking_reference}</span>
        </div>
      )}

      {/* 確認金額 */}
      {item.confirmed_cost != null && (
        <div className="shrink-0 text-xs font-mono">
          {item.currency && item.currency !== 'TWD' ? `${item.currency} ` : ''}
          {item.confirmed_cost.toLocaleString()}
        </div>
      )}
    </div>
  )
}

// === 工具函式 ===

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}
