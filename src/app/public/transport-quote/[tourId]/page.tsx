/**
 * 遊覽車報價公開頁面（供應商填寫）
 * 基於 /public/itinerary/[tourId]/page.tsx
 */

import { createClient } from '@supabase/supabase-js'
import { TransportQuoteForm } from './TransportQuoteForm'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function TransportQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ tourId: string }>
  searchParams: Promise<{ note?: string; vehicleDesc?: string }>
}) {
  const { tourId } = await params
  const { note, vehicleDesc } = await searchParams

  // 查詢團資料
  const { data: tour } = await supabase
    .from('tours')
    .select('code, name, departure_date, return_date, location, current_participants')
    .eq('id', tourId)
    .single()

  // 查詢核心表項目
  const { data: coreItems } = await supabase
    .from('tour_itinerary_items')
    .select('*')
    .eq('tour_id', tourId)
    .order('day_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (!tour || !coreItems) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">找不到行程</h1>
          <p className="text-gray-600 mt-2">請確認連結是否正確</p>
        </div>
      </div>
    )
  }

  // 計算天數
  const totalDays =
    tour.departure_date && tour.return_date
      ? Math.ceil(
          (new Date(tour.return_date).getTime() -
            new Date(tour.departure_date).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      : null

  // 按天分組
  const grouped = new Map<number, any>()
  for (const item of coreItems) {
    const day = item.day_number ?? 0
    if (!grouped.has(day)) {
      grouped.set(day, {
        date: null,
        weekday: null,
        items: [],
        hotel: null,
      })
    }
    const group = grouped.get(day)!

    if (!group.date && item.service_date) {
      group.date = item.service_date
      const d = new Date(item.service_date)
      const weekdays = ['日', '一', '二', '三', '四', '五', '六']
      group.weekday = weekdays[d.getDay()]
    }

    if (item.category === 'accommodation') {
      group.hotel = item
    } else {
      group.items.push(item)
    }
  }

  const daySchedule = Array.from(grouped.entries())
    .filter(([dayNumber]) => dayNumber > 0) // 過濾掉 Day 0
    .sort((a, b) => a[0] - b[0])
    .map(([dayNumber, data]) => ({ dayNumber, ...data }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf8f5] to-[#f5f1ea] py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#e8e0d4]">
          {/* 標頭 */}
          <div className="bg-gradient-to-r from-[#c9a96e] to-[#b89960] px-6 py-4 text-white">
            <h1 className="text-2xl font-bold">{tour.name}</h1>
            <div className="mt-2 flex items-center gap-6 text-sm opacity-90">
              <span>目的地：{tour.location || '—'}</span>
              <span>出發日期：{tour.departure_date || '—'}</span>
              <span>行程天數：{totalDays || '—'} 天</span>
              <span>團隊人數：{tour.current_participants || '—'} 人</span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* 行程表 */}
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#c9a96e] text-white">
                  <th className="border border-[#c9a96e]/50 px-3 py-2 text-left w-20">日期</th>
                  <th className="border border-[#c9a96e]/50 px-3 py-2 text-left">行程內容</th>
                  <th className="border border-[#c9a96e]/50 px-3 py-2 text-center w-16">早餐</th>
                  <th className="border border-[#c9a96e]/50 px-3 py-2 text-center w-16">午餐</th>
                  <th className="border border-[#c9a96e]/50 px-3 py-2 text-center w-16">晚餐</th>
                  <th className="border border-[#c9a96e]/50 px-3 py-2 text-left w-32">住宿</th>
                </tr>
              </thead>
              <tbody>
                {daySchedule.map((day, idx) => {
                  const meals: any = { breakfast: '', lunch: '', dinner: '' }
                  day.items
                    .filter((i: any) => i.category === 'meals')
                    .forEach((m: any) => {
                      if (m.sub_category && meals[m.sub_category] !== undefined) {
                        meals[m.sub_category] = m.title || '-'
                      }
                    })

                  const activities = day.items
                    .filter((i: any) => i.category === 'activities')
                    .map((a: any) => a.title)
                    .filter(Boolean)
                    .join(' → ')
                  const content =
                    activities || day.items.map((i: any) => i.title).filter(Boolean).join('、')

                  return (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafaf5]'}>
                      <td className="border border-[#e8e5e0] px-3 py-2">
                        <div className="font-semibold text-[#c9a96e]">Day {day.dayNumber}</div>
                        <div className="text-xs text-gray-500">
                          {day.date} ({day.weekday})
                        </div>
                      </td>
                      <td className="border border-[#e8e5e0] px-3 py-2 font-medium">
                        {content || '—'}
                      </td>
                      <td className="border border-[#e8e5e0] px-3 py-2 text-center text-xs">
                        {meals.breakfast || '-'}
                      </td>
                      <td className="border border-[#e8e5e0] px-3 py-2 text-center text-xs">
                        {meals.lunch || '-'}
                      </td>
                      <td className="border border-[#e8e5e0] px-3 py-2 text-center text-xs">
                        {meals.dinner || '-'}
                      </td>
                      <td className="border border-[#e8e5e0] px-3 py-2 text-xs">
                        {day.hotel?.title || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* 我方備註 */}
            {note && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-900 mb-2">我方備註</h3>
                <p className="text-sm text-gray-700">{note}</p>
              </div>
            )}

            {/* 報價表單 */}
            <TransportQuoteForm tourId={tourId} vehicleDesc={vehicleDesc} />
          </div>
        </div>

        <div className="text-center text-xs text-gray-500 mt-4">
          本行程表由角落旅行社提供
        </div>
      </div>
    </div>
  )
}
