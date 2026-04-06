'use client'

import { useState, useEffect, useCallback } from 'react'
import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'
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
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  const [requestId, setRequestId] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [tourCode, setTourCode] = useState('')
  const [tourName, setTourName] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [totalPax, setTotalPax] = useState<number | null>(null)
  const [items, setItems] = useState<RequestItem[]>([])
  const [replyNote, setReplyNote] = useState('')
  const [packagePrice, setPackagePrice] = useState<number | null>(null)

  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (!token) return
    async function load() {
      setLoading(true)
      try {
        const { data, error: e } = await supabase
          .from('tour_requests')
          .select('id, tour_id, supplier_name, items, note, status')
          .eq('id', token)
          .single()
        if (e || !data) {
          setError('找不到此委託單，連結可能已失效')
          return
        }

        const d = data as Record<string, unknown>
        setRequestId(data.id)
        setSupplierName(String(d.supplier_name || ''))

        const rawItems = (d.items as RequestItem[]) || []
        setItems(rawItems.map(it => ({ ...it })))
        setReplyNote(String(d.note || ''))
        setPackagePrice(((d as Record<string, unknown>).package_price as number) || null)

        if (data.status === 'replied' || data.status === 'confirmed') setSubmitted(true)

        const tourId = data.tour_id as string
        if (tourId) {
          const { data: tour } = await supabase
            .from('tours')
            .select('code, name, departure_date')
            .eq('id', tourId)
            .single()
          if (tour) {
            setTourCode(tour.code || '')
            setTourName(tour.name || '')
            setDepartureDate(tour.departure_date || '')
          }
        }
      } catch {
        setError('載入失敗')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const handleSave = useCallback(async () => {
    if (!requestId || saving) return
    setSaving(true)
    try {
      await supabase
        .from('tour_requests')
        .update({
          items: items as never,
          note: replyNote || null,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', requestId)
      setLastSaved(new Date().toLocaleTimeString('zh-TW'))
    } catch {
      alert('儲存失敗')
    } finally {
      setSaving(false)
    }
  }, [requestId, items, replyNote, saving, supabase])

  const handleSubmit = useCallback(async () => {
    if (!requestId || submitting) return
    setSubmitting(true)
    try {
      await supabase
        .from('tour_requests')
        .update({
          status: 'replied',
          replied_at: new Date().toISOString(),
          items: items as never,
          note: replyNote || null,
        } as never)
        .eq('id', requestId)
      setSubmitted(true)
    } catch {
      alert('送出失敗')
    } finally {
      setSubmitting(false)
    }
  }, [requestId, items, replyNote, submitting, supabase])

  // --- 畫面 ---

  if (loading)
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--background)',
        }}
      >
        <p style={{ color: 'var(--morandi-muted)' }}>載入中...</p>
      </div>
    )

  if (error)
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--background)',
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            padding: 40,
            maxWidth: 400,
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>找不到委託單</h1>
          <p style={{ color: 'var(--morandi-muted)' }}>{error}</p>
        </div>
      </div>
    )

  if (submitted)
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--background)',
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            padding: 40,
            maxWidth: 400,
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>報價已送出</h1>
          <p style={{ color: 'var(--morandi-muted)' }}>感謝您的回覆，旅行社會盡快確認。</p>
          <button
            onClick={() => setSubmitted(false)}
            style={{
              marginTop: 16,
              color: '#8B6914',
              textDecoration: 'underline',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            需要修改？點此重新編輯
          </button>
        </div>
      </div>
    )

  const accItems = items.filter(i => i.category === 'accommodation')
  const otherItems = items.filter(i => i.category !== 'accommodation')

  const cellStyle: React.CSSProperties = { border: '1px solid #333', padding: '8px 10px' }
  const thStyle: React.CSSProperties = {
    ...cellStyle,
    background: '#f0f0f0',
    fontWeight: 'bold',
    textAlign: 'center',
  }
  const inputStyle: React.CSSProperties = {
    border: '1px solid #ccc',
    borderRadius: 4,
    padding: '6px 10px',
    fontSize: 13,
    width: '100%',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', padding: '30px 16px' }}>
      <div
        style={{
          maxWidth: 800,
          margin: '0 auto',
          fontFamily: "'Microsoft JhengHei', 'PingFang TC', sans-serif",
          color: '#333',
          lineHeight: 1.6,
        }}
      >
        {/* 標題 */}
        <h1
          style={{
            textAlign: 'center',
            fontSize: 24,
            fontWeight: 'bold',
            borderBottom: '3px double #333',
            paddingBottom: 10,
            marginBottom: 20,
          }}
        >
          需求單
        </h1>

        {/* 基本資訊 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div style={{ border: '1px solid var(--border)', borderRadius: 5, padding: 15 }}>
            <h3
              style={{
                margin: '0 0 8px 0',
                borderBottom: '1px solid #ddd',
                paddingBottom: 5,
                fontSize: 14,
              }}
            >
              我方資訊
            </h3>
            <div style={{ fontSize: 13 }}>
              <div>
                <b>公司：</b>
                {COMPANY_NAME}
              </div>
              <div>
                <b>團號：</b>
                {tourCode}
              </div>
              <div>
                <b>團名：</b>
                {tourName}
              </div>
              <div>
                <b>出發日：</b>
                {departureDate}
              </div>
              {totalPax && (
                <div>
                  <b>人數：</b>
                  {totalPax} 人
                </div>
              )}
            </div>
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 5, padding: 15 }}>
            <h3
              style={{
                margin: '0 0 8px 0',
                borderBottom: '1px solid #ddd',
                paddingBottom: 5,
                fontSize: 14,
              }}
            >
              供應商資訊
            </h3>
            <div style={{ fontSize: 13 }}>
              <div>
                <b>名稱：</b>
                {supplierName}
              </div>
            </div>
          </div>
        </div>

        {/* 住宿區塊 */}
        {accItems.map((item, idx) => {
          const rooms = item.rooms || []
          const totalRooms = rooms.reduce((s, r) => s + r.quantity, 0)
          const nights = rooms[0]?.nights || item.quantity || 1
          const dates = (item.service_date || '').split('~')

          return (
            <div key={`acc-${idx}`} style={{ marginBottom: 24 }}>
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 5,
                  padding: 15,
                  marginBottom: 10,
                }}
              >
                <h3
                  style={{
                    margin: '0 0 8px 0',
                    borderBottom: '1px solid #ddd',
                    paddingBottom: 5,
                    fontSize: 14,
                  }}
                >
                  飯店資訊
                </h3>
                <div style={{ fontSize: 13 }}>
                  <div>
                    <b>飯店：</b>
                    {item.title}
                  </div>
                  <div>
                    <b>入住日：</b>
                    {dates[0]?.trim() || ''}
                  </div>
                  <div>
                    <b>退房日：</b>
                    {dates[1]?.trim() || ''}
                  </div>
                  <div>
                    <b>晚數：</b>
                    {nights} 晚
                  </div>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={thStyle}>房型</th>
                    <th style={{ ...thStyle, width: 70 }}>間數</th>
                    <th style={{ ...thStyle, width: 70 }}>晚數</th>
                    <th style={{ ...thStyle, width: 120 }}>報價金額</th>
                    <th style={{ ...thStyle, width: 70 }}>確認</th>
                    <th style={thStyle}>備註</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r, ri) => (
                    <tr key={ri}>
                      <td style={{ ...cellStyle, textAlign: 'center' }}>{r.room_type}</td>
                      <td style={{ ...cellStyle, textAlign: 'center' }}>{r.quantity}</td>
                      <td style={{ ...cellStyle, textAlign: 'center' }}>{r.nights || nights}</td>
                      <td style={cellStyle}>
                        <input
                          type="number"
                          placeholder="NT$"
                          value={item.quoted_cost ?? ''}
                          onChange={e =>
                            setItems(prev =>
                              prev.map(it =>
                                it === item
                                  ? {
                                      ...it,
                                      quoted_cost: e.target.value
                                        ? parseFloat(e.target.value)
                                        : null,
                                    }
                                  : it
                              )
                            )
                          }
                          style={inputStyle}
                        />
                      </td>
                      <td style={{ ...cellStyle, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={item.booking_confirmed || false}
                          onChange={e =>
                            setItems(prev =>
                              prev.map(it =>
                                it === item ? { ...it, booking_confirmed: e.target.checked } : it
                              )
                            )
                          }
                          style={{ width: 18, height: 18 }}
                        />
                      </td>
                      <td style={cellStyle}>
                        <input
                          type="text"
                          placeholder="選填"
                          value={item.booking_ref || ''}
                          onChange={e =>
                            setItems(prev =>
                              prev.map(it =>
                                it === item ? { ...it, booking_ref: e.target.value } : it
                              )
                            )
                          }
                          style={inputStyle}
                        />
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--status-warning-bg)', fontWeight: 'bold' }}>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>合計</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{totalRooms} 間</td>
                    <td style={{ ...cellStyle, textAlign: 'center' }}>{nights} 晚</td>
                    <td style={cellStyle}></td>
                    <td style={cellStyle}></td>
                    <td style={cellStyle}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )
        })}

        {/* 其他項目 */}
        {otherItems.length > 0 && (
          <table
            style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 24 }}
          >
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 80 }}>日期</th>
                <th style={thStyle}>項目</th>
                <th style={{ ...thStyle, width: 120 }}>報價金額</th>
                <th style={{ ...thStyle, width: 70 }}>確認</th>
                <th style={thStyle}>備註</th>
              </tr>
            </thead>
            <tbody>
              {otherItems.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ ...cellStyle, textAlign: 'center', fontSize: 12 }}>
                    {item.service_date || ''}
                  </td>
                  <td style={cellStyle}>{item.title}</td>
                  <td style={cellStyle}>
                    <input
                      type="number"
                      placeholder="NT$"
                      value={item.quoted_cost ?? ''}
                      onChange={e => {
                        const val = e.target.value ? parseFloat(e.target.value) : null
                        setItems(prev =>
                          prev.map(it => (it === item ? { ...it, quoted_cost: val } : it))
                        )
                      }}
                      style={inputStyle}
                    />
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={item.booking_confirmed || false}
                      onChange={e =>
                        setItems(prev =>
                          prev.map(it =>
                            it === item ? { ...it, booking_confirmed: e.target.checked } : it
                          )
                        )
                      }
                      style={{ width: 18, height: 18 }}
                    />
                  </td>
                  <td style={cellStyle}>
                    <input
                      type="text"
                      placeholder="選填"
                      value={item.reply_note || ''}
                      onChange={e =>
                        setItems(prev =>
                          prev.map(it => (it === item ? { ...it, reply_note: e.target.value } : it))
                        )
                      }
                      style={inputStyle}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 統包價格 */}
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 5,
            padding: 15,
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              margin: '0 0 10px 0',
              fontSize: 14,
              borderBottom: '1px solid #ddd',
              paddingBottom: 5,
            }}
          >
            統包報價
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <b style={{ fontSize: 13, whiteSpace: 'nowrap' }}>統包總價</b>
            <div style={{ position: 'relative', flex: 1, maxWidth: 240 }}>
              <span
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--morandi-muted)',
                  fontSize: 13,
                }}
              >
                NT$
              </span>
              <input
                type="number"
                value={packagePrice ?? ''}
                onChange={e => setPackagePrice(e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="如為統包，請填總價"
                style={{ ...inputStyle, paddingLeft: 40 }}
              />
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--morandi-muted)', marginTop: 6 }}>
            如為統包報價，可只填此欄，上方單項報價可留空
          </p>
        </div>

        {/* 整體備註 */}
        <div
          style={{
            border: '1px solid var(--border)',
            borderRadius: 5,
            padding: 15,
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              margin: '0 0 8px 0',
              fontSize: 14,
              borderBottom: '1px solid #ddd',
              paddingBottom: 5,
            }}
          >
            備註
          </h3>
          <textarea
            value={replyNote}
            onChange={e => setReplyNote(e.target.value)}
            placeholder="如有其他說明，請填寫..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {/* 按鈕 */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 12 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              border: '2px solid #999',
              background: '#fff',
              color: '#333',
              fontWeight: 'bold',
              padding: '12px 32px',
              borderRadius: 6,
              fontSize: 15,
              cursor: 'pointer',
              opacity: saving ? 0.5 : 1,
            }}
          >
            {saving ? '儲存中...' : '暫時儲存'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              border: 'none',
              background: '#8B6914',
              color: '#fff',
              fontWeight: 'bold',
              padding: '12px 32px',
              borderRadius: 6,
              fontSize: 15,
              cursor: 'pointer',
              opacity: submitting ? 0.5 : 1,
            }}
          >
            {submitting ? '送出中...' : '確認送出'}
          </button>
        </div>
        {lastSaved && (
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--status-success)' }}>
            已暫存（{lastSaved}）— 可隨時回來繼續填寫
          </p>
        )}

        <p
          style={{
            textAlign: 'center',
            marginTop: 30,
            fontSize: 11,
            color: 'var(--morandi-muted)',
          }}
        >
          此頁面由 Venturo ERP 產生 · {COMPANY_NAME}
        </p>
      </div>
    </div>
  )
}
