'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

interface RoomItem {
  room_type: string
  quantity: number
  nights?: number
}

interface RequestItem {
  category: string
  title: string
  service_date?: string | null
  quantity?: number
  unit_cost?: number | null
  rooms?: RoomItem[]
  // 供應商回填
  quoted_cost?: number | null
  reply_note?: string
  booking_confirmed?: boolean
  booking_ref?: string
}

export default function PublicRequestPage() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 委託資料
  const [requestId, setRequestId] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [tourCode, setTourCode] = useState('')
  const [tourName, setTourName] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [status, setStatus] = useState('')
  const [items, setItems] = useState<RequestItem[]>([])
  const [replyNote, setReplyNote] = useState('')

  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (!token) return
    async function load() {
      setLoading(true)
      try {
        const { data, error: e } = await supabase
          .from('tour_requests')
          .select('*')
          .eq('id', token)
          .single()
        if (e || !data) { setError('找不到此委託單'); return }

        const d = data as Record<string, unknown>
        setRequestId(data.id)
        setSupplierName(String(d.supplier_name || ''))
        setStatus(String(data.status || ''))

        const rawItems = d.items as RequestItem[] || []
        setItems(rawItems.map(it => ({
          ...it,
          quoted_cost: it.quoted_cost ?? null,
          reply_note: it.reply_note || '',
          booking_confirmed: it.booking_confirmed || false,
          booking_ref: it.booking_ref || '',
        })))

        if (data.status === 'replied' || data.status === 'confirmed') setSubmitted(true)

        // tour info
        const tourId = data.tour_id as string
        if (tourId) {
          const { data: tour } = await supabase.from('tours').select('code, name, departure_date').eq('id', tourId).single()
          if (tour) {
            setTourCode(tour.code || '')
            setTourName(tour.name || '')
            setDepartureDate(tour.departure_date || '')
          }
        }
      } catch { setError('載入失敗') }
      finally { setLoading(false) }
    }
    load()
  }, [token])

  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  // 暫存（不改狀態）
  const handleSave = useCallback(async () => {
    if (!requestId || saving) return
    setSaving(true)
    try {
      await supabase.from('tour_requests').update({
        items: items as never,
        note: replyNote || null,
        updated_at: new Date().toISOString(),
      } as never).eq('id', requestId)
      setLastSaved(new Date().toLocaleTimeString('zh-TW'))
    } catch { alert('儲存失敗') }
    finally { setSaving(false) }
  }, [requestId, items, replyNote, saving, supabase])

  // 正式送出
  const handleSubmit = useCallback(async () => {
    if (!requestId || submitting) return
    setSubmitting(true)
    try {
      await supabase.from('tour_requests').update({
        status: 'replied',
        replied_at: new Date().toISOString(),
        items: items as never,
        note: replyNote || null,
      } as never).eq('id', requestId)
      setSubmitted(true)
    } catch { alert('送出失敗') }
    finally { setSubmitting(false) }
  }, [requestId, items, replyNote, submitting, supabase])

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">載入中...</div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
        <div className="text-4xl mb-4">😕</div>
        <h1 className="text-xl font-bold mb-2">找不到委託單</h1>
        <p className="text-gray-500">{error}</p>
      </div>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
        <div className="text-4xl mb-4">✅</div>
        <h1 className="text-xl font-bold mb-2">報價已送出</h1>
        <p className="text-gray-500">感謝您的回覆！旅行社會盡快確認。</p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-4 text-sm text-amber-700 underline hover:text-amber-900"
        >
          需要修改？點此重新編輯
        </button>
      </div>
    </div>
  )

  // 分類
  const accItems = items.filter(i => i.category === 'accommodation')
  const otherItems = items.filter(i => i.category !== 'accommodation')

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-3xl mx-auto px-4">
        {/* 標題 */}
        <h1 className="text-center text-2xl font-bold mb-6 border-b-4 border-double border-gray-800 pb-3">
          需求單
        </h1>

        {/* 基本資訊 — 兩欄 */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border border-gray-300 rounded p-4">
            <h3 className="font-bold mb-2 border-b border-gray-200 pb-1">我方資訊</h3>
            <table className="text-sm">
              <tbody>
                <tr><td className="font-bold pr-3 py-0.5">公司：</td><td>角落旅行社</td></tr>
                <tr><td className="font-bold pr-3 py-0.5">團號：</td><td>{tourCode}</td></tr>
                <tr><td className="font-bold pr-3 py-0.5">團名：</td><td>{tourName}</td></tr>
                <tr><td className="font-bold pr-3 py-0.5">出發日：</td><td>{departureDate}</td></tr>
              </tbody>
            </table>
          </div>
          <div className="border border-gray-300 rounded p-4">
            <h3 className="font-bold mb-2 border-b border-gray-200 pb-1">供應商資訊</h3>
            <table className="text-sm">
              <tbody>
                <tr><td className="font-bold pr-3 py-0.5">名稱：</td><td>{supplierName}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 住宿需求 */}
        {accItems.map((item, idx) => {
          const rooms = item.rooms || []
          const totalRooms = rooms.reduce((s, r) => s + r.quantity, 0)
          const nights = rooms[0]?.nights || item.quantity || 1
          const dates = (item.service_date || '').split('~')

          return (
            <div key={`acc-${idx}`} className="mb-6">
              {/* 飯店資訊 */}
              <div className="border border-gray-300 rounded p-4 mb-3">
                <h3 className="font-bold mb-2 border-b border-gray-200 pb-1">飯店資訊</h3>
                <table className="text-sm">
                  <tbody>
                    <tr><td className="font-bold pr-3 py-0.5">飯店：</td><td>{item.title}</td></tr>
                    <tr><td className="font-bold pr-3 py-0.5">入住日：</td><td>{dates[0] || ''}</td></tr>
                    <tr><td className="font-bold pr-3 py-0.5">退房日：</td><td>{dates[1] || ''}</td></tr>
                    <tr><td className="font-bold pr-3 py-0.5">晚數：</td><td>{nights} 晚</td></tr>
                  </tbody>
                </table>
              </div>

              {/* 房型表格 */}
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-400 px-3 py-2">房型</th>
                    <th className="border border-gray-400 px-3 py-2 w-20">間數</th>
                    <th className="border border-gray-400 px-3 py-2 w-20">晚數</th>
                    <th className="border border-gray-400 px-3 py-2">備註</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r, ri) => (
                    <tr key={ri} className="text-center">
                      <td className="border border-gray-400 px-3 py-2">{r.room_type}</td>
                      <td className="border border-gray-400 px-3 py-2">{r.quantity}</td>
                      <td className="border border-gray-400 px-3 py-2">{r.nights || nights}</td>
                      <td className="border border-gray-400 px-3 py-2"></td>
                    </tr>
                  ))}
                  <tr className="text-center bg-amber-50 font-bold">
                    <td className="border border-gray-400 px-3 py-2">合計</td>
                    <td className="border border-gray-400 px-3 py-2">{totalRooms} 間</td>
                    <td className="border border-gray-400 px-3 py-2">{nights} 晚</td>
                    <td className="border border-gray-400 px-3 py-2"></td>
                  </tr>
                </tbody>
              </table>

              {/* 住宿回填區 */}
              <div className="mt-3 bg-white border border-amber-300 rounded p-4 space-y-3">
                <h4 className="font-bold text-amber-800 text-sm">📝 供應商回填</h4>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium w-16 shrink-0">報價</label>
                  <div className="relative flex-1 max-w-48">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">NT$</span>
                    <input
                      type="number"
                      value={item.quoted_cost ?? ''}
                      onChange={e => setItems(prev => prev.map((it, i) =>
                        it === item ? { ...it, quoted_cost: e.target.value ? parseFloat(e.target.value) : null } : it
                      ))}
                      placeholder="總金額"
                      className="w-full border rounded pl-12 pr-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.booking_confirmed || false}
                    onChange={e => setItems(prev => prev.map((it) =>
                      it === item ? { ...it, booking_confirmed: e.target.checked } : it
                    ))}
                    className="w-4 h-4 rounded border-amber-400 text-amber-600"
                  />
                  <span className="text-sm font-medium">✅ 確認訂房</span>
                </label>
                <div className="flex items-center gap-3">
                  <label className="text-sm w-16 shrink-0">訂房代號</label>
                  <input
                    type="text"
                    value={item.booking_ref || ''}
                    onChange={e => setItems(prev => prev.map((it) =>
                      it === item ? { ...it, booking_ref: e.target.value } : it
                    ))}
                    placeholder="選填"
                    className="flex-1 border rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          )
        })}

        {/* 其他項目（活動/餐食/交通） */}
        {otherItems.length > 0 && (
          <div className="mb-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-400 px-3 py-2 w-24">日期</th>
                  <th className="border border-gray-400 px-3 py-2">項目</th>
                  <th className="border border-gray-400 px-3 py-2 w-28">報價金額</th>
                  <th className="border border-gray-400 px-3 py-2">備註</th>
                </tr>
              </thead>
              <tbody>
                {otherItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border border-gray-400 px-3 py-2 text-center text-xs">
                      {item.service_date || ''}
                    </td>
                    <td className="border border-gray-400 px-3 py-2">{item.title}</td>
                    <td className="border border-gray-400 px-2 py-1">
                      <input
                        type="number"
                        value={item.quoted_cost ?? ''}
                        onChange={e => {
                          const val = e.target.value ? parseFloat(e.target.value) : null
                          setItems(prev => prev.map(it => it === item ? { ...it, quoted_cost: val } : it))
                        }}
                        placeholder="NT$"
                        className="w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-amber-500"
                      />
                    </td>
                    <td className="border border-gray-400 px-2 py-1">
                      <input
                        type="text"
                        value={item.reply_note || ''}
                        onChange={e => setItems(prev => prev.map(it => it === item ? { ...it, reply_note: e.target.value } : it))}
                        placeholder="選填"
                        className="w-full border rounded px-2 py-1 text-sm focus:ring-2 focus:ring-amber-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 整體備註 + 送出 */}
        <div className="bg-white border border-gray-300 rounded p-4 mb-6">
          <label className="text-sm font-bold">整體備註</label>
          <textarea
            value={replyNote}
            onChange={e => setReplyNote(e.target.value)}
            placeholder="如有其他說明，請填寫..."
            rows={2}
            className="w-full mt-1 border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="border-2 border-gray-400 hover:border-gray-600 disabled:opacity-50 text-gray-700 font-bold px-8 py-3 rounded-md text-base transition-colors"
          >
            {saving ? '儲存中...' : '💾 暫時儲存'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white font-bold px-8 py-3 rounded-md text-base transition-colors"
          >
            {submitting ? '送出中...' : '✉️ 確認送出'}
          </button>
        </div>
        {lastSaved && (
          <div className="text-center mt-2 text-sm text-green-600">
            ✅ 已暫存（{lastSaved}）— 可隨時回來繼續填寫
          </div>
        )}

        <div className="text-center mt-6 text-xs text-gray-400">
          此頁面由 Venturo ERP 產生 · 角落旅行社
        </div>
      </div>
    </div>
  )
}
