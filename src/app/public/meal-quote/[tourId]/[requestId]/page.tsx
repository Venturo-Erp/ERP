/**
 * 餐食報價公開頁面（供應商填寫）
 */

import { createClient } from '@supabase/supabase-js'
import { COMPANY_NAME } from '@/lib/tenant'
import { MealQuoteForm } from '../MealQuoteForm'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function MealQuotePage({
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

  // 🆕 查詢該供應商的歷史報價
  const { data: historyRequests } = await supabase
    .from('tour_requests')
    .select('*')
    .eq('tour_id', tourId)
    .eq('supplier_name', request.supplier_name)
    .eq('request_type', 'meal')
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

  if (!tour) {
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

  const requestItems = Array.isArray(request.items) ? request.items : []

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf8f5] to-[#f5f1ea] py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-[#e8e0d4]">
          {/* 標頭 */}
          <div className="bg-gradient-to-r from-[#c9a96e] to-[#b89960] px-6 py-4 text-white">
            <h1 className="text-2xl font-bold">{tour.name}</h1>
            <div className="mt-2 flex items-center gap-6 text-sm opacity-90">
              <span>餐廳：{request.supplier_name}</span>
              <span>出發日期：{tour.departure_date || '—'}</span>
              <span>行程天數：{totalDays || '—'} 天</span>
              <span>團隊人數：{tour.current_participants || '—'} 人</span>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* 餐食需求 */}
            <div>
              <h3 className="font-semibold text-[#c9a96e] mb-3">餐食需求</h3>
              <div className="bg-morandi-container border border-border rounded-lg p-4">
                {requestItems.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2">用餐時間</th>
                        <th className="text-left py-2">餐點內容</th>
                        <th className="text-center py-2">人數</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requestItems.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-border">
                          <td className="py-2">{(item.meal_time as string) || '—'}</td>
                          <td className="py-2">{(item.meal_content as string) || (item.name as string) || '—'}</td>
                          <td className="text-center py-2">
                            {(item.quantity as number) || tour.current_participants || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-morandi-secondary">無餐食需求</p>
                )}
              </div>
            </div>

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
                    const hQuote = h.supplier_response as any
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
                            ${hQuote?.totalCost?.toLocaleString() || '—'}
                          </span>
                        </div>
                        <div className="text-xs text-morandi-secondary space-y-1">
                          <div>聯絡人：{hQuote?.contact || '—'}</div>
                          <div>單價：${hQuote?.unitPrice?.toLocaleString() || '—'} / 人</div>
                          {hQuote?.notes && (
                            <div className="mt-2 p-2 bg-morandi-container rounded text-xs">
                              備註：{quoteData!.notes}
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
                    提交時間：{new Date(quoteData!.submitted_at!).toLocaleString('zh-TW')}
                  </p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-morandi-secondary">聯絡人：</span>
                    <span className="font-medium">{quoteData!.contact}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-morandi-secondary">聯絡電話：</span>
                    <span className="font-medium">{quoteData!.phone}</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-morandi-secondary">人數：</span>
                    <span className="font-medium">{quoteData!.pax} 人</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-morandi-secondary">單價：</span>
                    <span className="font-medium">
                      ${quoteData!.unitPrice?.toLocaleString()} 元/人
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-morandi-secondary">總金額：</span>
                    <span className="font-bold text-lg text-green-700">
                      ${quoteData!.totalCost?.toLocaleString()} 元
                    </span>
                  </div>
                  {quoteData!.notes && (
                    <div className="mt-3 p-3 bg-morandi-container rounded">
                      <div className="text-morandi-secondary text-xs mb-1">供應商備註：</div>
                      <div className="whitespace-pre-wrap">{quoteData!.notes}</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* 未提交：顯示填寫表單 */
              <MealQuoteForm
                tourId={tourId}
                requestId={requestId}
                requestItems={requestItems}
                defaultPax={tour.current_participants || 0}
              />
            )}
          </div>
        </div>

        <div className="text-center text-xs text-morandi-secondary mt-4">
          本報價單由{COMPANY_NAME}提供
        </div>
      </div>
    </div>
  )
}
