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

import { useMemo, useState, useEffect } from 'react'
import { Loader2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { useTourItineraryItemsByTour } from '@/features/tours/hooks/useTourItineraryItems'
import type { TourItineraryItem } from '@/features/tours/types/tour-itinerary-item.types'
import { usePaymentStatus } from '../hooks/usePaymentStatus'

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

// === 主組件 ===

export function ConfirmationSheet({ tourId }: ConfirmationSheetProps) {
  const { items, loading } = useTourItineraryItemsByTour(tourId)
  const [headerInfo, setHeaderInfo] = useState<TourHeaderInfo | null>(null)
  const [headerLoading, setHeaderLoading] = useState(true)

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

        setHeaderInfo({
          code: tour.code,
          name: tour.name,
          departure_date: tour.departure_date,
          return_date: tour.return_date,
          current_participants: tour.current_participants,
          leader_name: null, // TODO: 之後加到 tours 表
          sales_person: firstOrder?.sales_person ?? null,
          assistant: firstOrder?.assistant ?? null,
          flight_info: null, // TODO: 之後加到 tours 表
        })
      } catch (err) {
        logger.error('讀取團確單標頭失敗:', err)
        setHeaderInfo(null)
      } finally {
        setHeaderLoading(false)
      }
    }

    fetchHeader()
  }, [tourId])

  // 按類別分組（不篩選狀態，顯示所有行程項目）
  const groupedByCategory = useMemo(() => {
    const transport = items.filter(i => i.category === 'transport' || i.category === 'group-transport')
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
    return (
      <div className="text-center py-12 text-muted-foreground">
        無法載入團資訊
      </div>
    )
  }

  // 計算總天數
  const maxDay = Math.max(...items.map(i => i.day_number ?? 0))

  return (
    <div className="max-w-7xl mx-auto space-y-6 py-6">
      {/* === 操作列 === */}
      <div className="flex items-center justify-end gap-2 print:hidden">
        <Button size="sm" onClick={handlePrint} className="gap-1.5">
          <Printer size={14} />
          列印
        </Button>
      </div>

      {/* === 標頭 === */}
      <div className="border-2 border-[#c9a96e] rounded-lg p-6 bg-white">
        <h1 className="text-2xl font-bold text-center text-[#c9a96e] mb-6">
          團確單（出團確認單）
        </h1>

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

      {/* === 交通表 === */}
      <CategoryTable
        title="交通"
        items={groupedByCategory.transport}
        showUnitPriceColumns={false}
      />

      {/* === 餐食表 === */}
      <CategoryTable
        title="餐食"
        items={groupedByCategory.meals}
        showUnitPriceColumns={true}
      />

      {/* === 住宿表 === */}
      <CategoryTable
        title="住宿"
        items={groupedByCategory.accommodation}
        showUnitPriceColumns={true}
      />

      {/* === 活動表 === */}
      <CategoryTable
        title="活動"
        items={groupedByCategory.activities}
        showUnitPriceColumns={true}
      />

      {/* === 其他 === */}
      <CategoryTable
        title="其他"
        items={groupedByCategory.others}
        showUnitPriceColumns={true}
      />

      {/* === 財務彙總 === */}
      <div className="border-2 border-[#c9a96e] rounded-lg p-6 bg-white">
        <div className="flex items-center justify-between text-lg font-bold">
          <div className="flex items-center gap-8">
            <span className="text-[#c9a96e]">預計支出總金額：</span>
            <span className="font-mono">
              ${financialSummary.totalExpected.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-8">
            <span className="text-[#c9a96e]">實際支出總金額：</span>
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
  )
}

// === 子組件：類別表格 ===

interface CategoryTableProps {
  title: string
  items: TourItineraryItem[]
  showUnitPriceColumns: boolean
}

function CategoryTable({ title, items, showUnitPriceColumns }: CategoryTableProps) {
  if (items.length === 0) {
    return null // 沒有項目就不顯示表格
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* 表頭 */}
      <div className="bg-[#c9a96e] text-white px-4 py-2 font-bold">
        {title}
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-3 py-2 text-left font-medium w-20">日期</th>
              <th className="px-3 py-2 text-left font-medium">
                {title === '交通' ? '接駁地點' : title === '餐食' ? '餐廳名稱' : '名稱'}
              </th>
              {showUnitPriceColumns && (
                <>
                  <th className="px-3 py-2 text-right font-medium w-24">商品單價</th>
                  <th className="px-3 py-2 text-right font-medium w-20">數量</th>
                  <th className="px-3 py-2 text-right font-medium w-24">小計</th>
                </>
              )}
              <th className="px-3 py-2 text-right font-medium w-24">預計支出</th>
              <th className="px-3 py-2 text-right font-medium w-24">實際支出</th>
              <th className="px-3 py-2 text-left font-medium w-32">付款狀態</th>
              <th className="px-3 py-2 text-left font-medium">說明</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <TableRow
                key={item.id}
                item={item}
                showUnitPriceColumns={showUnitPriceColumns}
                isLast={index === items.length - 1}
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
}

function TableRow({ item, showUnitPriceColumns, isLast }: TableRowProps) {
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

  return (
    <tr className={!isLast ? 'border-b' : ''}>
      {/* 日期 */}
      <td className="px-3 py-2 text-gray-600">
        {item.service_date ? formatDateShort(item.service_date) : '-'}
      </td>

      {/* 名稱（含供應商、描述） */}
      <td className="px-3 py-2">
        <div>
          <div className="font-medium">{item.title || '-'}</div>
          {item.supplier_name && (
            <div className="text-xs text-gray-500 mt-0.5">{item.supplier_name}</div>
          )}
          {item.description && (
            <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
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

      {/* 實際支出 */}
      <td className="px-3 py-2 text-right font-mono font-medium text-green-600">
        {item.actual_expense != null ? item.actual_expense.toLocaleString() : '-'}
      </td>

      {/* 付款狀態 */}
      <td className="px-3 py-2">
        <PaymentStatusCell requestId={item.request_id} />
      </td>

      {/* 說明 */}
      <td className="px-3 py-2 text-gray-600 text-xs">
        {notes || '-'}
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
