'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface RequestItem {
  category: string
  title: string
  service_date?: string | null
  quantity?: number
  unit_cost?: number | null
  rooms?: { room_type: string; quantity: number }[]
  // 供應商回填
  quoted_cost?: number | null
  reply_note?: string
}

interface RequestData {
  id: string
  code: string
  tour_id: string
  supplier_name: string
  supplier_contact: string | null
  items: RequestItem[]
  status: string
  note: string | null
  created_at: string
  // JOIN tour info
  tour_code?: string
  tour_name?: string
  departure_date?: string
  workspace_name?: string
}

const CATEGORY_EMOJI: Record<string, string> = {
  accommodation: '🏨',
  transport: '🚌',
  meal: '🍽️',
  activity: '🎫',
  other: '📦',
}

const CATEGORY_LABEL: Record<string, string> = {
  accommodation: '住宿',
  transport: '交通',
  meal: '餐食',
  activity: '活動',
  other: '其他',
}

export default function PublicRequestPage() {
  const { token } = useParams<{ token: string }>()
  const [request, setRequest] = useState<RequestData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<RequestItem[]>([])
  const [replyNote, setReplyNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const supabase = createSupabaseBrowserClient()

  // 載入委託資料
  useEffect(() => {
    if (!token) return

    async function loadRequest() {
      setLoading(true)
      try {
        // token = tour_requests.id (UUID)
        const { data, error: fetchError } = await supabase
          .from('tour_requests')
          .select('*')
          .eq('id', token)
          .single()

        if (fetchError || !data) {
          setError('找不到此委託單，連結可能已失效')
          return
        }

        // 取得 tour 資訊
        const tourId = data.tour_id as string
        const { data: tourData } = await supabase
          .from('tours')
          .select('code, name, departure_date')
          .eq('id', tourId)
          .single()

        const requestData: RequestData = {
          id: data.id,
          code: (data as Record<string, unknown>).code as string || '',
          tour_id: tourId,
          supplier_name: (data.supplier_name as string) || '',
          supplier_contact: ((data as Record<string, unknown>).supplier_contact as string) || null,
          items: ((data as Record<string, unknown>).items as RequestItem[]) || [],
          status: (data.status as string) || 'draft',
          note: (data.notes as string) || null,
          created_at: data.created_at || '',
          tour_code: tourData?.code || '',
          tour_name: tourData?.name || '',
          departure_date: tourData?.departure_date || '',
        }

        setRequest(requestData)
        setItems(requestData.items.map(item => ({ ...item, quoted_cost: item.quoted_cost || null, reply_note: '' })))

        if (data.status === 'replied' || data.status === 'confirmed') {
          setSubmitted(true)
        }
      } catch (err) {
        setError('載入失敗：' + String(err))
      } finally {
        setLoading(false)
      }
    }

    loadRequest()
  }, [token])

  // 更新項目報價
  const updateItemCost = useCallback((idx: number, cost: string) => {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, quoted_cost: cost ? parseFloat(cost) : null } : item
    ))
  }, [])

  const updateItemNote = useCallback((idx: number, note: string) => {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, reply_note: note } : item
    ))
  }, [])

  // 送出回覆
  const handleSubmit = useCallback(async () => {
    if (!request || submitting) return
    setSubmitting(true)

    try {
      const totalQuotedCost = items.reduce((sum, item) => sum + (item.quoted_cost || 0), 0)

      const { error: updateError } = await supabase
        .from('tour_requests')
        .update({
          status: 'replied',
          replied_at: new Date().toISOString(),
          items: items as never,
          note: replyNote || null,
        } as never)
        .eq('id', request.id)

      if (updateError) throw updateError

      setSubmitted(true)
    } catch (err) {
      alert('送出失敗：' + String(err))
    } finally {
      setSubmitting(false)
    }
  }, [request, items, replyNote, submitting, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">載入中...</div>
      </div>
    )
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <div className="text-4xl mb-4">😕</div>
          <h1 className="text-xl font-bold mb-2">找不到委託單</h1>
          <p className="text-gray-500">{error || '連結可能已失效'}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-xl font-bold mb-2">報價已送出</h1>
          <p className="text-gray-500">感謝您的回覆！旅行社會盡快確認。</p>
          <div className="mt-4 text-sm text-gray-400">
            委託編號：{request.code || request.id.slice(0, 8)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* 標題 */}
        <div className="bg-amber-700 text-white rounded-t-lg p-6">
          <h1 className="text-2xl font-bold">📋 需求單</h1>
          <p className="text-amber-100 mt-1">請確認以下項目並回覆報價</p>
        </div>

        <div className="bg-white shadow rounded-b-lg">
          {/* 基本資訊 */}
          <div className="p-6 border-b">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-bold text-gray-700 mb-2">旅行社資訊</h3>
                <div className="text-sm space-y-1 text-gray-600">
                  <div>公司：角落旅行社</div>
                  <div>團號：{request.tour_code}</div>
                  <div>團名：{request.tour_name}</div>
                  <div>出發日：{request.departure_date}</div>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-gray-700 mb-2">供應商</h3>
                <div className="text-sm space-y-1 text-gray-600">
                  <div className="font-medium text-lg">{request.supplier_name}</div>
                  {request.supplier_contact && <div>窗口：{request.supplier_contact}</div>}
                </div>
              </div>
            </div>
          </div>

          {/* 項目列表 + 報價欄 */}
          <div className="p-6">
            <h3 className="font-bold text-gray-700 mb-4">需求項目</h3>
            <div className="space-y-4">
              {items.map((item, idx) => {
                const emoji = CATEGORY_EMOJI[item.category] || '📦'
                const catLabel = CATEGORY_LABEL[item.category] || item.category
                return (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{emoji}</span>
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{catLabel}</span>
                        </div>
                        <div className="font-medium mt-1">{item.title}</div>
                        {item.service_date && (
                          <div className="text-sm text-gray-500">日期：{item.service_date}</div>
                        )}
                        {item.rooms && item.rooms.length > 0 && (
                          <div className="text-sm text-gray-500">
                            房型：{item.rooms.map(r => `${r.room_type} × ${r.quantity} 間`).join('、')}
                          </div>
                        )}
                        {item.unit_cost && (
                          <div className="text-sm text-gray-400">
                            預算參考：NT$ {item.unit_cost.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 報價輸入 */}
                    <div className="mt-3 flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-600 shrink-0">報價金額</label>
                      <div className="relative flex-1 max-w-48">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">NT$</span>
                        <input
                          type="number"
                          value={item.quoted_cost ?? ''}
                          onChange={e => updateItemCost(idx, e.target.value)}
                          placeholder="請輸入金額"
                          className="w-full border rounded-md pl-12 pr-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* 備註 */}
                    <div className="mt-2">
                      <input
                        type="text"
                        value={item.reply_note || ''}
                        onChange={e => updateItemNote(idx, e.target.value)}
                        placeholder="備註（選填）"
                        className="w-full border rounded-md px-3 py-1.5 text-sm text-gray-600 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 總備註 + 送出 */}
          <div className="p-6 border-t bg-gray-50 rounded-b-lg">
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-600">整體備註</label>
              <textarea
                value={replyNote}
                onChange={e => setReplyNote(e.target.value)}
                placeholder="如有其他說明，請填寫在此..."
                rows={3}
                className="w-full mt-1 border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                報價合計：NT$ {items.reduce((sum, item) => sum + (item.quoted_cost || 0), 0).toLocaleString()}
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || items.every(i => !i.quoted_cost)}
                className="bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white font-medium px-8 py-2.5 rounded-md transition-colors"
              >
                {submitting ? '送出中...' : '✉️ 送出報價'}
              </button>
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="text-center mt-6 text-xs text-gray-400">
          此頁面由 Venturo ERP 產生 · 角落旅行社
        </div>
      </div>
    </div>
  )
}
