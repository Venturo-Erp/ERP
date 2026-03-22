'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ActivityQuoteFormProps {
  tourId: string
  requestId: string
  requestItems: any[]
  defaultPax: number
}

export function ActivityQuoteForm({ tourId, requestId, defaultPax }: ActivityQuoteFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [contact, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [pax, setPax] = useState(defaultPax)
  const [unitPrice, setUnitPrice] = useState(0)
  const [notes, setNotes] = useState('')

  const totalCost = pax * unitPrice

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!contact || !phone) {
      alert('請填寫聯絡人和電話')
      return
    }

    if (pax <= 0) {
      alert('請填寫參加人數')
      return
    }

    if (unitPrice <= 0) {
      alert('請填寫單價')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/submit-activity-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId,
          requestId,
          contact,
          phone,
          pax,
          unitPrice,
          totalCost,
          notes,
          submitted_at: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error('提交失敗')
      }

      alert('報價提交成功！')
      router.refresh()
    } catch (error) {
      console.error('提交失敗:', error)
      alert('提交失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="font-semibold text-[#c9a96e] text-lg">填寫報價</h3>

      {/* 聯絡資訊 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-morandi-primary mb-1">
            聯絡人 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={contact}
            onChange={e => setContact(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-[#c9a96e] focus:border-transparent"
            placeholder="請輸入聯絡人姓名"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-morandi-primary mb-1">
            聯絡電話 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-[#c9a96e] focus:border-transparent"
            placeholder="請輸入聯絡電話"
            required
          />
        </div>
      </div>

      {/* 報價資訊 */}
      <div className="bg-morandi-container border border-border rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-1">
              參加人數 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={pax || ''}
              onChange={e => setPax(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-[#c9a96e] focus:border-transparent"
              placeholder="0"
              min="1"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-morandi-primary mb-1">
              單價 (元/人) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={unitPrice || ''}
              onChange={e => setUnitPrice(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-[#c9a96e] focus:border-transparent"
              placeholder="0"
              min="1"
              required
            />
          </div>
        </div>
      </div>

      {/* 總金額 */}
      <div className="bg-[#c9a96e]/10 border border-[#c9a96e]/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-morandi-primary">總金額</span>
          <span className="text-2xl font-bold text-[#c9a96e]">
            ${totalCost.toLocaleString()} 元
          </span>
        </div>
        <div className="text-sm text-morandi-secondary mt-1">
          {pax} 人 × ${unitPrice.toLocaleString()} 元/人
        </div>
      </div>

      {/* 備註 */}
      <div>
        <label className="block text-sm font-medium text-morandi-primary mb-1">備註（選填）</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-[#c9a96e] focus:border-transparent"
          placeholder="如有其他說明事項，請在此填寫"
          rows={3}
        />
      </div>

      {/* 提交按鈕 */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-gradient-to-r from-[#c9a96e] to-[#b89960] text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? '提交中...' : '提交報價'}
      </button>
    </form>
  )
}
