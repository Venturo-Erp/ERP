/**
 * 遊覽車報價公開頁面（供應商填寫）
 * 基於 /public/itinerary/[tourId]/page.tsx
 */

import { createClient } from '@supabase/supabase-js'
import { COMPANY_NAME } from '@/lib/tenant'
import { TransportQuoteForm } from './TransportQuoteForm'
import { DriverInfoForm } from './DriverInfoForm'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function TransportQuotePage({
  params,
  searchParams,
}: {
  params: Promise<{ tourId: string }>
  searchParams: Promise<{
    note?: string
    vehicleDesc?: string
    supplierName?: string
    requestId?: string
    itemId?: string
  }>
}) {
  const { tourId } = await params
  const { note, vehicleDesc, supplierName = '車行', requestId, itemId } = await searchParams

  // 查詢需求單狀態（如果有 requestId 或 itemId）
  let requestStatus: string | null = null
  let transportItem: Record<string, unknown> | null = null

  if (requestId) {
    const { data: request } = await supabase
      .from('tour_requests')
      .select('status, supplier_response')
      .eq('id', requestId)
      .single()
    requestStatus = request?.status || null
  }

  if (itemId) {
    const { data: item } = await supabase
      .from('tour_itinerary_items')
      .select(
        'id, booking_confirmed_at, driver_name, driver_phone, vehicle_plate, vehicle_type, estimated_cost, request_status'
      )
      .eq('id', itemId)
      .single()
    transportItem = item
    // 如果已經有司機資訊，狀態是「已確認」
    if (item?.booking_confirmed_at) {
      requestStatus = 'driver_confirmed'
    } else if (item?.request_status === 'accepted') {
      requestStatus = 'accepted'
    }
  }

  // 查詢團資料
  const { data: tour } = await supabase
    .from('tours')
    .select(
      'code, name, departure_date, return_date, country_id, airport_code, current_participants'
    )
    .eq('id', tourId)
    .single()

  // SSOT：從 airport_code → 城市名 → 國家名 衍生目的地顯示字串
  let tourDestinationDisplay = ''
  if (tour?.airport_code) {
    const { data: airport } = await supabase
      .from('ref_airports')
      .select('city_name_zh')
      .eq('iata_code', tour.airport_code)
      .maybeSingle()
    tourDestinationDisplay = airport?.city_name_zh || ''
  }
  if (!tourDestinationDisplay && tour?.country_id) {
    const { data: country } = await supabase
      .from('countries')
      .select('name')
      .eq('id', tour.country_id)
      .maybeSingle()
    tourDestinationDisplay = country?.name || ''
  }
  if (!tourDestinationDisplay) tourDestinationDisplay = tour?.airport_code || ''

  // 查詢核心表項目
  const { data: coreItems } = await supabase
    .from('tour_itinerary_items')
    .select('id, tour_id, day_number, sort_order, category, sub_category, title')
    .eq('tour_id', tourId)
    .order('day_number', { ascending: true })
    .order('sort_order', { ascending: true })

  if (!tour || !coreItems) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-morandi-container">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-morandi-primary">找不到行程</h1>
          <p className="text-morandi-secondary mt-2">請確認連結是否正確</p>
        </div>
      </div>
    )
  }

  // 計算天數
  const totalDays =
    tour.departure_date && tour.return_date
      ? Math.ceil(
          (new Date(tour.return_date).getTime() - new Date(tour.departure_date).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      : null

  // 按天分組（自動計算日期）
  const grouped = new Map<
    number,
    {
      date: string
      weekday: string
      items: typeof coreItems
      hotel: (typeof coreItems)[number] | null
    }
  >()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']

  for (const item of coreItems) {
    const day = item.day_number ?? 0
    if (!grouped.has(day)) {
      // 從 departure_date 自動計算日期
      let dateStr = ''
      let weekday = ''
      if (tour.departure_date && day > 0) {
        const d = new Date(tour.departure_date)
        d.setDate(d.getDate() + day - 1) // Day 1 = 出發日，Day 2 = 出發日+1
        dateStr = `${d.getMonth() + 1}/${d.getDate()}`
        weekday = weekdays[d.getDay()]
      }

      grouped.set(day, {
        date: dateStr,
        weekday: weekday,
        items: [],
        hotel: null,
      })
    }
    const group = grouped.get(day)!

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
    <div className="min-h-screen bg-gradient-to-br from-background to-morandi-container/30 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-card rounded-xl shadow-lg overflow-hidden border border-border">
          {/* 標頭 */}
          <div className="bg-gradient-to-r from-morandi-gold to-morandi-gold-hover px-6 py-4 text-white">
            <h1 className="text-2xl font-bold">{tour.name}</h1>
            <div className="mt-2 flex items-center gap-6 text-sm opacity-90">
              <span>目的地：{tourDestinationDisplay || '—'}</span>
              <span>出發日期：{tour.departure_date || '—'}</span>
              <span>行程天數：{totalDays || '—'} 天</span>
              <span>團隊人數：{tour.current_participants || '—'} 人</span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* 行程表 */}
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-morandi-gold-header">
                  <th className="border border-morandi-gold/50 px-3 py-2 text-left w-20">日期</th>
                  <th className="border border-morandi-gold/50 px-3 py-2 text-left">行程內容</th>
                  <th className="border border-morandi-gold/50 px-3 py-2 text-center w-16">早餐</th>
                  <th className="border border-morandi-gold/50 px-3 py-2 text-center w-16">午餐</th>
                  <th className="border border-morandi-gold/50 px-3 py-2 text-center w-16">晚餐</th>
                  <th className="border border-morandi-gold/50 px-3 py-2 text-left w-32">住宿</th>
                </tr>
              </thead>
              <tbody>
                {daySchedule.map((day, idx) => {
                  const meals: Record<string, string> = { breakfast: '', lunch: '', dinner: '' }
                  day.items
                    .filter(i => i.category === 'meals')
                    .forEach(m => {
                      if (m.sub_category && meals[m.sub_category] !== undefined) {
                        meals[m.sub_category] = m.title || '-'
                      }
                    })

                  const activities = day.items
                    .filter(i => i.category === 'activities')
                    .map(a => a.title)
                    .filter(Boolean)
                    .join(' → ')
                  const content =
                    activities ||
                    day.items
                      .map(i => i.title)
                      .filter(Boolean)
                      .join('、')

                  return (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-card' : 'bg-background'}>
                      <td className="border border-morandi-container px-3 py-2">
                        <div className="font-semibold text-morandi-gold">Day {day.dayNumber}</div>
                        <div className="text-xs text-morandi-secondary">
                          {day.date} ({day.weekday})
                        </div>
                      </td>
                      <td className="border border-morandi-container px-3 py-2 font-medium">
                        {content || '—'}
                      </td>
                      <td className="border border-morandi-container px-3 py-2 text-center text-xs">
                        {meals.breakfast || '-'}
                      </td>
                      <td className="border border-morandi-container px-3 py-2 text-center text-xs">
                        {meals.lunch || '-'}
                      </td>
                      <td className="border border-morandi-container px-3 py-2 text-center text-xs">
                        {meals.dinner || '-'}
                      </td>
                      <td className="border border-morandi-container px-3 py-2 text-xs">
                        {day.hotel?.title || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* 旅行社備註 */}
            {note && (
              <div className="bg-status-warning-bg border border-status-warning/30 rounded-lg p-4">
                <h3 className="font-semibold text-morandi-primary mb-2">{COMPANY_NAME}備註</h3>
                <p className="text-sm text-morandi-primary">{note}</p>
              </div>
            )}

            {/* 根據狀態顯示不同內容 */}
            {requestStatus === 'driver_confirmed' ? (
              // 已確認司機資訊
              <div className="bg-morandi-green/10 border border-morandi-green/30 rounded-lg p-8 text-center">
                <div className="text-4xl mb-4">✅</div>
                <h3 className="text-xl font-semibold text-morandi-green mb-2">預訂已確認</h3>
                <p className="text-morandi-green mb-4">司機資訊已提交完成</p>
                <div className="bg-card rounded-lg p-4 text-left text-sm max-w-xs mx-auto">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-morandi-secondary">司機姓名</span>
                    <span className="font-medium">
                      {((transportItem as Record<string, unknown>)?.driver_name as string) || '-'}
                    </span>
                    <span className="text-morandi-secondary">司機電話</span>
                    <span className="font-medium">
                      {((transportItem as Record<string, unknown>)?.driver_phone as string) || '-'}
                    </span>
                    <span className="text-morandi-secondary">車牌號碼</span>
                    <span className="font-medium">
                      {((transportItem as Record<string, unknown>)?.vehicle_plate as string) || '-'}
                    </span>
                  </div>
                </div>
              </div>
            ) : requestStatus === 'accepted' ? (
              // 已成交，等待填寫司機資訊
              <div className="bg-status-info-bg border border-status-info/30 rounded-lg p-6">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-2">🎉</div>
                  <h3 className="text-xl font-semibold text-status-info">恭喜！您的報價已被選用</h3>
                  <p className="text-status-info mt-1">請填寫司機資訊以完成預訂</p>
                </div>
                <DriverInfoForm itemId={itemId || ''} />
              </div>
            ) : requestStatus === 'quoted' ? (
              // 已報價，等待確認
              <div className="bg-status-warning-bg border border-status-warning/30 rounded-lg p-8 text-center">
                <div className="text-4xl mb-4">⏳</div>
                <h3 className="text-xl font-semibold text-morandi-primary mb-2">報價已提交</h3>
                <p className="text-status-warning">等待旅行社確認中，請耐心等候</p>
              </div>
            ) : requestStatus === 'rejected' ? (
              // 未選用
              <div className="bg-morandi-container border border-border rounded-lg p-8 text-center">
                <div className="text-4xl mb-4">😔</div>
                <h3 className="text-xl font-semibold text-morandi-primary mb-2">感謝您的報價</h3>
                <p className="text-morandi-secondary">本次未選用，期待下次合作</p>
              </div>
            ) : (
              // 未報價，顯示報價表單
              <TransportQuoteForm
                tourId={tourId}
                requestId={requestId}
                itemId={itemId}
                vehicleDesc={vehicleDesc}
              />
            )}
          </div>
        </div>

        <div className="text-center text-xs text-morandi-secondary mt-4">
          本行程表由{COMPANY_NAME}提供
        </div>
      </div>
    </div>
  )
}
