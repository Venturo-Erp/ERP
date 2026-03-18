'use client'

import { useState } from 'react'

interface QuoteFormProps {
  tourId: string
  tourCode: string
  paxTiers: number[]
}

export function QuoteForm({ tourId, tourCode, paxTiers }: QuoteFormProps) {
  const [contact, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [tierPrices, setTierPrices] = useState<Record<number, string>>({})
  const [singleRoomSupplement, setSingleRoomSupplement] = useState('')
  const [tipNote, setTipNote] = useState('')
  const [supplierNote, setSupplierNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!contact.trim() || !phone.trim()) {
      alert('請填寫聯絡人和電話')
      return
    }

    // 檢查至少填了一個梯次
    const filled = Object.values(tierPrices).some(v => v && parseFloat(v) > 0)
    if (!filled) {
      alert('請至少填寫一個梯次的報價')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/public/submit-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId,
          tourCode,
          contact,
          phone,
          tierPrices,
          singleRoomSupplement: singleRoomSupplement ? parseFloat(singleRoomSupplement) : null,
          tipNote,
          supplierNote,
        }),
      })

      if (res.ok) {
        alert('✅ 報價已提交！感謝您的報價。')
        // 清空表單
        setContact('')
        setPhone('')
        setTierPrices({})
        setSingleRoomSupplement('')
        setTipNote('')
        setSupplierNote('')
      } else {
        const err = await res.json()
        alert(`❌ 提交失敗：${err.error || '請稍後再試'}`)
      }
    } catch (error) {
      alert(`❌ 提交失敗：${error}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 32, borderTop: '2px solid #c9a96e', paddingTop: 24 }}>
      <h2 style={{ fontSize: 18, fontWeight: 'bold', color: '#c9a96e', marginBottom: 16 }}>
        📝 供應商報價回填
      </h2>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#555' }}>
          聯絡人 <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          type="text"
          value={contact}
          onChange={e => setContact(e.target.value)}
          placeholder="您的姓名"
          required
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: 4,
            fontSize: 14,
          }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#555' }}>
          聯絡電話 <span style={{ color: 'red' }}>*</span>
        </label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="您的電話"
          required
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: 4,
            fontSize: 14,
          }}
        />
      </div>

      <div style={{ marginBottom: 16, paddingTop: 8, borderTop: '1px solid #e8e5e0' }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#555' }}>
          人數梯次報價（每人） <span style={{ color: 'red' }}>*</span>
        </label>
        {paxTiers.length === 0 ? (
          <p style={{ fontSize: 13, color: '#999' }}>（尚未設定梯次）</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {paxTiers.map(num => (
              <div key={num} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ width: 80, fontSize: 14 }}>{num} 人團</label>
                <input
                  type="number"
                  value={tierPrices[num] || ''}
                  onChange={e => setTierPrices({ ...tierPrices, [num]: e.target.value })}
                  placeholder="每人報價"
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    fontSize: 14,
                  }}
                />
                <span style={{ fontSize: 13, color: '#999' }}>元/人</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 16, paddingTop: 8, borderTop: '1px solid #e8e5e0' }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#555' }}>
          單人房差
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="number"
            value={singleRoomSupplement}
            onChange={e => setSingleRoomSupplement(e.target.value)}
            placeholder="單人房差（可選）"
            style={{
              flex: 1,
              padding: '6px 10px',
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 14,
            }}
          />
          <span style={{ fontSize: 13, color: '#999' }}>元</span>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#555' }}>
          小費說明
        </label>
        <input
          type="text"
          value={tipNote}
          onChange={e => setTipNote(e.target.value)}
          placeholder="例如：已含小費 / 不含，每人每天 100 元"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: 4,
            fontSize: 14,
          }}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#555' }}>
          供應商備註
        </label>
        <textarea
          value={supplierNote}
          onChange={e => setSupplierNote(e.target.value)}
          placeholder="其他說明或備註..."
          rows={3}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: 4,
            fontSize: 14,
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '10px 32px',
            backgroundColor: submitting ? '#ccc' : '#c9a96e',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 15,
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? '提交中...' : '提交報價'}
        </button>
      </div>
    </form>
  )
}
