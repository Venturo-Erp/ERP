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
  const [submitted, setSubmitted] = useState(false)

  const handleDownload = () => {
    const tierRows = paxTiers
      .map(num => {
        const price = tierPrices[num] || '-'
        return `<tr><td style="padding:8px;border:1px solid #ddd">${num} 人團</td><td style="padding:8px;border:1px solid #ddd;text-align:right">${price} 元/人</td></tr>`
      })
      .join('')

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>報價單 - ${tourCode}</title>
<style>
body { font-family: 'Microsoft JhengHei', sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
h1 { color: #c9a96e; }
table { width: 100%; border-collapse: collapse; margin: 16px 0; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
th { background: #c9a96e; color: white; }
.info { margin: 8px 0; }
</style>
</head>
<body>
<h1>供應商報價單</h1>
<div class="info"><strong>團號：</strong>${tourCode}</div>
<div class="info"><strong>聯絡人：</strong>${contact}</div>
<div class="info"><strong>聯絡電話：</strong>${phone}</div>
<h3>梯次報價</h3>
<table>${tierRows}</table>
<div class="info"><strong>單人房差：</strong>${singleRoomSupplement ? `${singleRoomSupplement} 元` : '-'}</div>
<div class="info"><strong>小費說明：</strong>${tipNote || '-'}</div>
<div class="info"><strong>備註：</strong><pre style="white-space:pre-wrap;margin:0">${supplierNote || '-'}</pre></div>
<p style="margin-top:24px;color:#999;font-size:12px">提交時間：${new Date().toLocaleString('zh-TW')}</p>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `報價單-${tourCode}-${contact}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

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
        setSubmitted(true)
        alert('✅ 報價已提交！感謝您的報價。')
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
    <form
      onSubmit={handleSubmit}
      style={{ marginTop: 32, borderTop: '2px solid #c9a96e', paddingTop: 24 }}
    >
      <h2 style={{ fontSize: 18, fontWeight: 'bold', color: '#c9a96e', marginBottom: 16 }}>
        📝 供應商報價回填
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
              color: '#555',
            }}
          >
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

        <div>
          <label
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
              color: '#555',
            }}
          >
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
      </div>

      <div style={{ marginBottom: 16, paddingTop: 8, borderTop: '1px solid #e8e5e0' }}>
        <label
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 8,
            color: '#555',
          }}
        >
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
        <label
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
            color: '#555',
          }}
        >
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
        <label
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
            color: '#555',
          }}
        >
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
        <label
          style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
            color: '#555',
          }}
        >
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
        {!submitted ? (
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
        ) : (
          <div style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: 12, color: '#16a34a', fontWeight: 600 }}>
              ✅ 報價已提交成功！
            </p>
            <button
              type="button"
              onClick={handleDownload}
              style={{
                padding: '10px 32px',
                backgroundColor: '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              📥 下載報價單留底
            </button>
          </div>
        )}
      </div>
    </form>
  )
}
