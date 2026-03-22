/**
 * 遊覽車報價公開頁面（供應商填寫 - 單一性版本）
 * 每個 requestId 對應一個獨立的報價
 */

import { createClient } from '@supabase/supabase-js'
import { COMPANY_NAME } from '@/lib/tenant'
import { TransportQuoteForm } from '../TransportQuoteForm'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function TransportQuoteWithRequestPage({
  params,
}: {
  params: Promise<{ tourId: string; requestId: string }>
}) {
  const { tourId, requestId } = await params

  // 查詢需求單
  const { data: request } = await supabase
    .from('tour_requests')
    .select('*')
    .eq('id', requestId)
    .eq('tour_id', tourId)
    .single()

  if (!request) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-morandi-container">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-morandi-primary">找不到需求單</h1>
          <p className="text-morandi-secondary mt-2">請確認連結是否正確</p>
        </div>
      </div>
    )
  }

  // 🆕 查詢該供應商的歷史報價（排除當前這筆）
  const { data: historyRequests } = await supabase
    .from('tour_requests')
    .select('*')
    .eq('tour_id', tourId)
    .eq('supplier_name', request.supplier_name)
    .eq('request_type', 'transport')
    .neq('id', requestId)
    .order('replied_at', { ascending: false })
    .order('created_at', { ascending: false })

  const history = (historyRequests || []).filter(r => r.supplier_response && r.replied_at)

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
      <div className="min-h-screen flex items-center justify-center bg-morandi-container">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-morandi-primary">找不到行程</h1>
          <p className="text-morandi-secondary mt-2">請確認連結是否正確</p>
        </div>
      </div>
    )
  }

  // 判斷是否已提交
  const isSubmitted = request.supplier_response && request.replied_at
  const quoteData = request.supplier_response as any

  // 計算天數
  const totalDays =
    tour.departure_date && tour.return_date
      ? Math.ceil(
          (new Date(tour.return_date).getTime() - new Date(tour.departure_date).getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      : null

  // 按天分組
  const grouped = new Map<number, any>()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']

  for (const item of coreItems) {
    const day = item.day_number ?? 0
    if (!grouped.has(day)) {
      let dateStr = ''
      let weekday = ''
      if (tour.departure_date && day > 0) {
        const d = new Date(tour.departure_date)
        d.setDate(d.getDate() + day - 1)
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
    .filter(([dayNumber]) => dayNumber > 0)
    .sort((a, b) => a[0] - b[0])
    .map(([dayNumber, data]) => ({ dayNumber, ...data }))

  const vehicleDesc = request.metadata?.vehicleDesc || ''
  const totalPax = request.metadata?.totalPax || tour.current_participants

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
              <span>團隊人數：{totalPax || '—'} 人</span>
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
                    activities ||
                    day.items
                      .map((i: any) => i.title)
                      .filter(Boolean)
                      .join('、')

                  return (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#fafaf5]'}>
                      <td className="border border-[#e8e5e0] px-3 py-2">
                        <div className="font-semibold text-[#c9a96e]">Day {day.dayNumber}</div>
                        <div className="text-xs text-morandi-secondary">
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

            {/* 旅行社備註 */}
            {request.note && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-900 mb-2">{COMPANY_NAME}備註</h3>
                <p className="text-sm text-morandi-primary whitespace-pre-wrap">{request.note}</p>
              </div>
            )}

            {/* 🆕 報價歷程 */}
            {history.length > 0 && (
              <details className="bg-morandi-container border border-border rounded-lg overflow-hidden">
                <summary className="px-4 py-3 cursor-pointer hover:bg-morandi-container transition-colors select-none">
                  <span className="font-semibold text-morandi-primary">
                    📜 報價歷程 ({history.length})
                  </span>
                  <span className="text-xs text-morandi-secondary ml-2">（點擊展開）</span>
                </summary>
                <div className="p-4 space-y-3 border-t border-border">
                  {history.map((h: any) => {
                    const quoteData = h.supplier_response as any
                    return (
                      <div
                        key={h.id}
                        className="bg-white border border-border rounded-lg p-3 text-sm"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-morandi-secondary text-xs">
                            {new Date(h.replied_at).toLocaleString('zh-TW')}
                          </span>
                          <span className="font-bold text-lg text-[#c9a96e]">
                            ${quoteData?.totalFare?.toLocaleString() || '—'}
                          </span>
                        </div>
                        <div className="text-xs text-morandi-secondary space-y-1">
                          <div>聯絡人：{quoteData?.contact || '—'}</div>
                          <div className="flex gap-2 flex-wrap">
                            {quoteData?.includesParking && (
                              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                ✓ 停車費
                              </span>
                            )}
                            {quoteData?.includesToll && (
                              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                ✓ 過路費
                              </span>
                            )}
                            {quoteData?.includesAccommodation && (
                              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                ✓ 司機住宿
                              </span>
                            )}
                            {quoteData?.includesTip && (
                              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                ✓ 小費
                              </span>
                            )}
                          </div>
                          {quoteData?.supplierNote && (
                            <div className="mt-2 p-2 bg-morandi-container rounded text-xs">
                              備註：{quoteData.supplierNote}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </details>
            )}

            {/* 已提交：顯示報價結果 */}
            {isSubmitted ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">✅</div>
                  <h3 className="text-xl font-semibold text-green-900">報價已提交</h3>
                  <p className="text-sm text-green-700 mt-1">
                    提交時間：{new Date(quoteData.submitted_at).toLocaleString('zh-TW')}
                  </p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-morandi-secondary">聯絡人：</span>
                    <span className="font-medium">{quoteData.contact}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-morandi-secondary">聯絡電話：</span>
                    <span className="font-medium">{quoteData.phone}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-morandi-secondary">總車資：</span>
                    <span className="font-bold text-lg text-green-700">
                      ${quoteData.totalFare?.toLocaleString()} 元
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-morandi-secondary">包含項目：</span>
                    <div className="text-right">
                      {quoteData.includesParking && <div>✓ 停車費</div>}
                      {quoteData.includesToll && <div>✓ 過路費</div>}
                      {quoteData.includesAccommodation && <div>✓ 司機住宿</div>}
                      {quoteData.includesTip && <div>✓ 小費</div>}
                      {!quoteData.includesAccommodation && quoteData.accommodationFee > 0 && (
                        <div className="text-amber-700">
                          司機住宿費：${quoteData.accommodationFee} 元
                        </div>
                      )}
                      {!quoteData.includesTip && quoteData.tipAmount > 0 && (
                        <div className="text-amber-700">小費：${quoteData.tipAmount} 元</div>
                      )}
                    </div>
                  </div>
                  {quoteData.supplierNote && (
                    <div className="mt-3 p-3 bg-morandi-container rounded">
                      <div className="text-morandi-secondary text-xs mb-1">供應商備註：</div>
                      <div className="whitespace-pre-wrap">{quoteData.supplierNote}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* 未提交：顯示填寫表單 */
              <TransportQuoteForm tourId={tourId} requestId={requestId} vehicleDesc={vehicleDesc} />
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
