'use client'

/**
 * ConfirmationSheet — 團確單（出團確認單）
 *
 * 仿照 corner 紙本格式：
 * - 標頭：團號、日期、領隊、業務、人數、航班
 * - 5 個表格：交通、餐食、住宿、活動、其他
 * - 每個表格有：日期、名稱、單價、數量、小計、預計支出、實際支出、說明
 * - 財務彙總：預計支出總金額 / 實際支出總金額
 */

import React, { useMemo, useState, useEffect } from 'react'
import { Loader2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { useTourItineraryItemsByTour } from '@/features/tours/hooks/useTourItineraryItems'
import type { TourItineraryItem } from '@/features/tours/types/tour-itinerary-item.types'
import { usePaymentStatus } from '../hooks/usePaymentStatus'
import { useWorkspaceSettings, getLogoStyle } from '@/hooks/useWorkspaceSettings'

// 配色 - Morandi 色系
const COLORS = {
  primary: '#3a3633', // 深棕灰（標題、文字）
  secondary: '#8b8680', // Morandi secondary
  green: '#9fa68f', // Morandi 綠（區塊標題背景）
  border: '#e8e5e0', // 更淺邊框
  gray: '#4B5563', // 灰（次要文字）
  lightGray: '#9CA3AF', // 淺灰
}

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
  leader_name: string | null
  sales_person: string | null
  assistant: string | null
  flight_info: string | null
}

// 每日行程資料結構
interface DailyItineraryItem {
  date: string // "7/2 (四)"
  title: string // "抵達福岡機場 ⇀ 博多 ⇀ ..."
  dayLabel: string // "Day 1"
  description?: string
  highlight?: string
}

// 飯店資料結構
interface HotelInfo {
  name: string
  address?: string
  checkIn?: string
  checkOut?: string
  nights?: number
  dayNumber?: number
}

// === 主組件 ===

export function ConfirmationSheet({ tourId }: ConfirmationSheetProps) {
  const { items, loading, refresh } = useTourItineraryItemsByTour(tourId)
  const [headerInfo, setHeaderInfo] = useState<TourHeaderInfo | null>(null)
  const [headerLoading, setHeaderLoading] = useState(true)
  const [dailyItinerary, setDailyItinerary] = useState<DailyItineraryItem[]>([])
  const [hotels, setHotels] = useState<HotelInfo[]>([])
  const ws = useWorkspaceSettings()
  const logoUrl = ws.logo_url || '/corner-logo.png'
  const companyName = ws.legal_name || ws.name || ''
  const companySubtitle = ws.subtitle || ''

  // 讀取團基本資訊
  useEffect(() => {
    async function fetchHeader() {
      setHeaderLoading(true)
      try {
        const { data: tour, error: tourError } = await supabase
          .from('tours')
          .select('code, name, departure_date, return_date, current_participants')
          .eq('id', tourId)
          .single()

        if (tourError) {
          logger.error('讀取團資訊失敗:', tourError)
          setHeaderInfo(null)
          return
        }

        if (!tour) {
          setHeaderInfo(null)
          return
        }

        // 讀取第一筆訂單的業務/助理
        const { data: firstOrder } = await supabase
          .from('orders')
          .select('sales_person, assistant')
          .eq('tour_id', tourId)
          .limit(1)
          .maybeSingle()

        // 讀取領隊（從團員名單中 identity = '領隊' 的成員）
        // order_members 沒有 tour_id，需要透過 orders 表關聯
        const { data: leaderMember } = await supabase
          .from('order_members')
          .select('chinese_name, orders!inner(tour_id)')
          .eq('orders.tour_id', tourId)
          .eq('identity', '領隊')
          .limit(1)
          .maybeSingle()

        const leaderName = (leaderMember as any)?.chinese_name || null

        setHeaderInfo({
          code: tour.code,
          name: tour.name,
          departure_date: tour.departure_date,
          return_date: tour.return_date,
          current_participants: tour.current_participants,
          leader_name: leaderName,
          sales_person: firstOrder?.sales_person ?? null,
          assistant: firstOrder?.assistant ?? null,
          flight_info: null, // TODO: 之後可加航班資訊
        })

        // 讀取行程資料（daily_itinerary + hotels）
        const { data: itinerary } = await supabase
          .from('itineraries')
          .select('daily_itinerary, hotels')
          .eq('tour_id', tourId)
          .maybeSingle()

        if (itinerary?.daily_itinerary) {
          setDailyItinerary(itinerary.daily_itinerary as unknown as DailyItineraryItem[])
        }
        if (itinerary?.hotels) {
          setHotels(itinerary.hotels as unknown as HotelInfo[])
        }
      } catch (err) {
        logger.error('讀取團確單標頭失敗:', err)
        setHeaderInfo(null)
      } finally {
        setHeaderLoading(false)
      }
    }

    fetchHeader()
  }, [tourId])

  // 按類別分組（顯示所有項目，不篩選狀態）
  const groupedByCategory = useMemo(() => {
    const transport = items.filter(
      i => i.category === 'transport' || i.category === 'group-transport'
    )
    const meals = items.filter(i => i.category === 'meals')
    const accommodation = items.filter(i => i.category === 'accommodation')
    const activities = items.filter(i => i.category === 'activities')
    const others = items.filter(
      i =>
        i.category !== 'transport' &&
        i.category !== 'group-transport' &&
        i.category !== 'meals' &&
        i.category !== 'accommodation' &&
        i.category !== 'activities'
    )

    return { transport, meals, accommodation, activities, others }
  }, [items])

  // 財務彙總
  const financialSummary = useMemo(() => {
    let totalExpected = 0
    let totalActual = 0

    items.forEach(item => {
      // 預計支出 = confirmed_cost || reply_cost || (unit_price × quantity)
      const expected =
        item.confirmed_cost ??
        item.reply_cost ??
        (item.unit_price != null && item.quantity != null ? item.unit_price * item.quantity : 0)

      totalExpected += expected

      // 實際支出
      if (item.actual_expense != null) {
        totalActual += item.actual_expense
      }
    })

    return { totalExpected, totalActual }
  }, [items])

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

  if (!headerInfo) {
    return <div className="text-center py-12 text-muted-foreground">無法載入團資訊</div>
  }

  // 計算總天數
  const maxDay = Math.max(...items.map(i => i.day_number ?? 0))

  return (
    <div className="mx-auto py-6 print:py-0">
      {/* === 操作列 === */}
      <div className="flex items-center justify-end gap-2 print:hidden mb-4">
        <Button size="sm" onClick={handlePrint} className="gap-1.5">
          <Printer size={14} />
          列印
        </Button>
      </div>

      {/* A4 等比例容器 */}
      <div
        className="bg-white mx-auto shadow-sm print:shadow-none"
        style={{
          width: '210mm',
          minHeight: '297mm',
          maxWidth: '100%',
          border: `1px solid ${COLORS.border}`,
          padding: '8mm 10mm' /* 留白：上下8mm 左右10mm */,
        }}
      >
        {/* === 標頭 === */}
        <div className="px-6 pt-2 pb-4">
          {/* Logo + 標題 */}
          <div
            className="flex items-center justify-between mb-6 pb-4"
            style={{ borderBottom: `1px solid ${COLORS.border}` }}
          >
            {/* Logo */}
            <div>
              <img src={logoUrl} alt="公司 Logo" style={getLogoStyle('print')} />
            </div>

            {/* 標題 */}
            <div className="text-center flex-1">
              <div className="text-xs tracking-widest mb-1" style={{ color: COLORS.secondary }}>
                TOUR CONFIRMATION
              </div>
              <h1 className="text-xl font-bold" style={{ color: COLORS.primary }}>
                團確單
              </h1>
            </div>

            {/* 團號 */}
            <div className="text-right text-sm" style={{ color: COLORS.gray }}>
              <div>{headerInfo.code}</div>
              <div className="text-xs" style={{ color: COLORS.lightGray }}>
                {headerInfo.departure_date ? formatDate(headerInfo.departure_date) : ''}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            <div className="flex">
              <span className="font-medium w-20">出團日期：</span>
              <span>
                {headerInfo.departure_date && headerInfo.return_date
                  ? `${formatDate(headerInfo.departure_date)} ~ ${formatDate(headerInfo.return_date)}`
                  : '-'}
              </span>
            </div>
            <div className="flex">
              <span className="font-medium w-20">隨團領隊：</span>
              <span>{headerInfo.leader_name || '-'}</span>
            </div>

            <div className="flex">
              <span className="font-medium w-20">承辦業務：</span>
              <span>{headerInfo.sales_person || '-'}</span>
            </div>
            <div className="flex">
              <span className="font-medium w-20">助理人員：</span>
              <span>{headerInfo.assistant || '-'}</span>
            </div>

            <div className="flex">
              <span className="font-medium w-20">團體人數：</span>
              <span>{headerInfo.current_participants || 0} 人</span>
            </div>
            <div className="flex">
              <span className="font-medium w-20">航班資訊：</span>
              <span>{headerInfo.flight_info || '-'}</span>
            </div>

            <div className="flex col-span-2">
              <span className="font-medium w-20">團名：</span>
              <span className="font-bold">{headerInfo.name}</span>
            </div>
          </div>
        </div>

        {/* === 每日行程 + 飯店 + 交通 === */}
        <DailyItineraryTable
          dailyItinerary={dailyItinerary}
          accommodationItems={groupedByCategory.accommodation}
          transportItems={groupedByCategory.transport}
          departureDate={headerInfo.departure_date}
          onActualExpenseUpdate={refresh}
        />

        {/* === 餐食表 === */}
        <CategoryTable
          title="餐食"
          items={groupedByCategory.meals}
          showUnitPriceColumns={true}
          onActualExpenseUpdate={refresh}
          departureDate={headerInfo.departure_date}
        />

        {/* === 住宿表 === */}
        <CategoryTable
          title="住宿"
          items={groupedByCategory.accommodation}
          showUnitPriceColumns={true}
          onActualExpenseUpdate={refresh}
          departureDate={headerInfo.departure_date}
        />

        {/* === 活動表 === */}
        <CategoryTable
          title="活動"
          items={groupedByCategory.activities}
          showUnitPriceColumns={true}
          onActualExpenseUpdate={refresh}
          departureDate={headerInfo.departure_date}
        />

        {/* === 其他 === */}
        <CategoryTable
          title="其他"
          items={groupedByCategory.others}
          showUnitPriceColumns={true}
          onActualExpenseUpdate={refresh}
          departureDate={headerInfo.departure_date}
        />

        {/* === 財務彙總 === */}
        <div className="p-6" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          <div className="flex items-center justify-between text-lg font-bold">
            <div className="flex items-center gap-8">
              <span style={{ color: COLORS.primary }}>預計支出總金額：</span>
              <span className="font-mono">${financialSummary.totalExpected.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-8">
              <span style={{ color: COLORS.primary }}>實際支出總金額：</span>
              <span className="font-mono">
                {financialSummary.totalActual > 0
                  ? `$${financialSummary.totalActual.toLocaleString()}`
                  : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* === 列印頁尾 === */}
        <div className="hidden print:block text-xs text-muted-foreground text-center pt-4 border-t">
          列印日期：{formatDate(new Date().toISOString())}
        </div>
      </div>
      {/* A4 容器結束 */}
    </div>
  )
}

// === 子組件：類別表格 ===

interface CategoryTableProps {
  title: string
  items: TourItineraryItem[]
  showUnitPriceColumns: boolean
  onActualExpenseUpdate?: () => void
  departureDate?: string | null
}

function CategoryTable({
  title,
  items,
  showUnitPriceColumns,
  onActualExpenseUpdate,
  departureDate,
}: CategoryTableProps) {
  if (items.length === 0) {
    return null // 沒有項目就不顯示表格
  }

  return (
    <div className="overflow-hidden" style={{ borderTop: `1px solid ${COLORS.border}` }}>
      {/* 表頭 */}
      <div className="px-4 py-2 font-bold text-white" style={{ backgroundColor: COLORS.green }}>
        {title}
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: showUnitPriceColumns ? '22%' : '35%' }} />
            {showUnitPriceColumns && <><col style={{ width: '12%' }} /><col style={{ width: '8%' }} /><col style={{ width: '12%' }} /></>}
            <col style={{ width: '12%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: showUnitPriceColumns ? '12%' : '19%' }} />
          </colgroup>
          <thead>
            <tr className="bg-morandi-container border-b">
              <th className="px-2 py-2 text-left font-medium">日期</th>
              <th className="px-2 py-2 text-left font-medium">
                {title === '交通' ? '接駁地點' : title === '餐食' ? '餐廳名稱' : '名稱'}
              </th>
              {showUnitPriceColumns && (
                <>
                  <th className="px-2 py-2 text-right font-medium">商品單價</th>
                  <th className="px-2 py-2 text-right font-medium">數量</th>
                  <th className="px-2 py-2 text-right font-medium">小計</th>
                </>
              )}
              <th className="px-2 py-2 text-right font-medium">預計支出</th>
              <th className="px-2 py-2 text-right font-medium">實際支出</th>
              <th className="px-2 py-2 text-left font-medium">說明</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <TableRow
                key={item.id}
                item={item}
                showUnitPriceColumns={showUnitPriceColumns}
                isLast={index === items.length - 1}
                onActualExpenseUpdate={onActualExpenseUpdate}
                departureDate={departureDate}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// === 子組件：表格列 ===

interface TableRowProps {
  item: TourItineraryItem
  showUnitPriceColumns: boolean
  isLast: boolean
  onActualExpenseUpdate?: () => void
  departureDate?: string | null
}

// 計算實際日期（出發日期 + day_number - 1）
function calculateServiceDate(
  departureDate: string | null | undefined,
  dayNumber: number | null | undefined
): string | null {
  if (!departureDate || !dayNumber) return null
  const date = new Date(departureDate)
  date.setDate(date.getDate() + dayNumber - 1)
  return date.toISOString().split('T')[0]
}

function TableRow({
  item,
  showUnitPriceColumns,
  isLast,
  onActualExpenseUpdate,
  departureDate,
}: TableRowProps) {
  const [actualExpense, setActualExpense] = useState<string>(
    item.actual_expense != null ? String(item.actual_expense) : ''
  )
  const [isSaving, setIsSaving] = useState(false)

  // 預計支出 = confirmed_cost || reply_cost || (unit_price × quantity)
  const expectedCost =
    item.confirmed_cost ??
    item.reply_cost ??
    (item.unit_price != null && item.quantity != null ? item.unit_price * item.quantity : null)

  // 小計 = unit_price × quantity
  const subtotal =
    item.unit_price != null && item.quantity != null ? item.unit_price * item.quantity : null

  // 說明 = expense_note || confirmation_note || quote_note
  const notes = item.expense_note || item.confirmation_note || item.quote_note || ''

  // 儲存實際支出
  const handleSaveActualExpense = async () => {
    const newValue = actualExpense.trim() === '' ? null : parseFloat(actualExpense)

    // 沒有變化就不更新
    if (newValue === item.actual_expense) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('tour_itinerary_items')
        .update({
          actual_expense: newValue,
          expense_at: newValue != null ? new Date().toISOString() : null,
        } as any)
        .eq('id', item.id)

      if (error) throw error
      onActualExpenseUpdate?.()
    } catch (err) {
      logger.error('儲存實際支出失敗:', err)
      // 還原
      setActualExpense(item.actual_expense != null ? String(item.actual_expense) : '')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <tr className={!isLast ? 'border-b' : ''}>
      {/* 日期 */}
      <td className="px-2 py-2 text-morandi-secondary">
        {(() => {
          if (item.service_date) return formatDateShort(item.service_date)
          const calculated = calculateServiceDate(departureDate, item.day_number)
          if (calculated) return formatDateShort(calculated)
          return '-'
        })()}
      </td>

      {/* 名稱（含供應商、描述） */}
      <td className="px-3 py-2">
        <div>
          <div className="font-medium">{item.title || '-'}</div>
          {item.supplier_name && (
            <div className="text-xs text-morandi-secondary mt-0.5">{item.supplier_name}</div>
          )}
          {item.description && (
            <div className="text-xs text-morandi-secondary mt-0.5">{item.description}</div>
          )}
        </div>
      </td>

      {/* 商品單價、數量、小計（條件顯示） */}
      {showUnitPriceColumns && (
        <>
          <td className="px-3 py-2 text-right font-mono">
            {item.unit_price != null ? item.unit_price.toLocaleString() : '-'}
          </td>
          <td className="px-3 py-2 text-right font-mono">
            {item.quantity != null ? item.quantity : '-'}
          </td>
          <td className="px-3 py-2 text-right font-mono">
            {subtotal != null ? subtotal.toLocaleString() : '-'}
          </td>
        </>
      )}

      {/* 預計支出 */}
      <td className="px-3 py-2 text-right font-mono font-medium">
        {expectedCost != null ? expectedCost.toLocaleString() : '-'}
      </td>

      {/* 實際支出（可編輯）*/}
      <td className="px-3 py-2">
        <input
          type="number"
          value={actualExpense}
          onChange={e => setActualExpense(e.target.value)}
          onBlur={handleSaveActualExpense}
          onKeyDown={e => e.key === 'Enter' && handleSaveActualExpense()}
          placeholder="-"
          disabled={isSaving}
          className="w-24 px-2 py-1 text-right font-mono font-medium text-green-600 border border-border rounded focus:border-[#c9a96e] focus:ring-1 focus:ring-[#c9a96e] outline-none disabled:opacity-50 print:border-0 print:p-0"
        />
      </td>

      {/* 說明（含付款狀態）*/}
      <td className="px-2 py-2 text-xs">
        <div className="space-y-0.5">
          {notes && <div className="text-morandi-secondary">{notes}</div>}
          <PaymentStatusCell requestId={item.request_id} />
        </div>
      </td>
    </tr>
  )
}

// === 子組件：付款狀態 ===

function PaymentStatusCell({ requestId }: { requestId: string | null }) {
  const { amounts } = usePaymentStatus(requestId)

  // 沒有付款金額 → 顯示空白
  if (amounts.totalAmount === 0) {
    return null
  }

  return (
    <div className="space-y-0.5 text-xs">
      {amounts.paidAmount > 0 && (
        <div className="text-green-600 font-medium">
          ✓ 已付款 ${amounts.paidAmount.toLocaleString()}
        </div>
      )}
      {amounts.pendingAmount > 0 && (
        <div className="text-yellow-600 font-medium">
          ⏳ 待付款 ${amounts.pendingAmount.toLocaleString()}
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

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

// === 子組件：每日行程 + 飯店表 ===

interface DailyItineraryTableProps {
  dailyItinerary: DailyItineraryItem[]
  accommodationItems: TourItineraryItem[]
  transportItems: TourItineraryItem[]
  departureDate?: string | null
  onActualExpenseUpdate?: () => void
}

function DailyItineraryTable({
  dailyItinerary,
  accommodationItems,
  transportItems,
  departureDate,
  onActualExpenseUpdate,
}: DailyItineraryTableProps) {
  if (dailyItinerary.length === 0) {
    return null
  }

  // 根據 dayNumber 找飯店（從 tour_itinerary_items）
  // 處理「同上 (飯店名)」→ 提取實際飯店名
  const getHotelForDay = (dayIndex: number): { title: string } | undefined => {
    const dayNumber = dayIndex + 1
    const hotel = accommodationItems.find(item => item.day_number === dayNumber)
    if (!hotel?.title) return undefined

    // 提取「同上 (xxx)」裡的實際飯店名
    let title = hotel.title
    const match = title.match(/同上\s*[（(](.+?)[）)]/)
    if (match) {
      title = match[1] // 取括號裡的內容
    }

    return { title }
  }

  return (
    <div className="overflow-hidden" style={{ borderTop: `1px solid ${COLORS.border}` }}>
      {/* 表頭 */}
      <div className="px-4 py-2 font-bold text-white" style={{ backgroundColor: COLORS.green }}>
        每日行程
      </div>

      {/* 表格 */}
      <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
        <colgroup><col style={{ width: '12%' }} /><col style={{ width: '88%' }} /></colgroup>
        <thead>
          <tr className="bg-morandi-container border-b">
            <th className="px-3 py-2 text-left font-medium">日期</th>
            <th className="px-3 py-2 text-left font-medium">行程</th>
          </tr>
        </thead>
        <tbody>
          {dailyItinerary.map((day, index) => {
            const hotel = getHotelForDay(index)
            return (
              <React.Fragment key={index}>
                {/* 行程列 */}
                <tr className="border-b">
                  <td className="px-3 py-2 text-morandi-secondary align-top">
                    {day.date || `Day ${index + 1}`}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{day.title}</div>
                    {day.description && (
                      <div className="text-xs text-morandi-secondary mt-1">{day.description}</div>
                    )}
                  </td>
                </tr>
                {/* 飯店列（如果有）*/}
                {hotel && (
                  <tr className="border-b bg-morandi-container">
                    <td className="px-3 py-1"></td>
                    <td className="px-3 py-1 text-xs">
                      <span className="font-medium">{hotel.title}</span>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
          {/* 交通（直接在最後一天下面）*/}
          {transportItems.map((item, idx) => (
            <tr key={item.id || idx} className="border-b bg-morandi-container">
              <td colSpan={2} className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-medium">{item.title || item.supplier_name || '-'}</span>
                    {item.driver_name && (
                      <span className="text-morandi-secondary">
                        司機: {item.driver_name} {item.driver_phone}
                      </span>
                    )}
                    {item.vehicle_plate && (
                      <span className="text-morandi-secondary">車牌: {item.vehicle_plate}</span>
                    )}
                    {item.vehicle_type && (
                      <span className="text-morandi-secondary">{item.vehicle_type}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm font-mono">
                    <span className="text-morandi-secondary">
                      {item.estimated_cost?.toLocaleString() || '-'}
                    </span>
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
