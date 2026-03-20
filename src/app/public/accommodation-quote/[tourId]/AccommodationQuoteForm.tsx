'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AccommodationQuoteFormProps {
  tourId: string
  requestId: string
  requestItems: any[]
}

export function AccommodationQuoteForm({ 
  tourId, 
  requestId,
  requestItems 
}: AccommodationQuoteFormProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [contact, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')

  // 初始化房型報價（從 requestItems 複製）
  const [rooms, setRooms] = useState(
    requestItems.map((item: any) => ({
      roomType: item.room_type || '',
      quantity: item.quantity || 1,
      unitPrice: 0,
      checkInDate: item.check_in_date || '',
      checkOutDate: item.check_out_date || '',
    }))
  )

  const totalCost = rooms.reduce((sum, room) => sum + (room.quantity * room.unitPrice), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!contact || !phone) {
      alert('請填寫聯絡人和電話')
      return
    }

    if (rooms.some(r => r.unitPrice <= 0)) {
      alert('請填寫所有房型的單價')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/submit-accommodation-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourId,
          requestId,
          contact,
          phone,
          rooms,
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            聯絡人 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9a96e] focus:border-transparent"
            placeholder="請輸入聯絡人姓名"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            聯絡電話 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9a96e] focus:border-transparent"
            placeholder="請輸入聯絡電話"
            required
          />
        </div>
      </div>

      {/* 房型報價 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          房型報價 <span className="text-red-500">*</span>
        </label>
        <div className="space-y-3">
          {rooms.map((room, idx) => (
            <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">房型</label>
                  <input
                    type="text"
                    value={room.roomType}
                    readOnly
                    className="w-full px-2 py-1 text-sm bg-white border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">數量</label>
                  <input
                    type="number"
                    value={room.quantity}
                    readOnly
                    className="w-full px-2 py-1 text-sm bg-white border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">單價 (元) *</label>
                  <input
                    type="number"
                    value={room.unitPrice || ''}
                    onChange={(e) => {
                      const newRooms = [...rooms]
                      newRooms[idx].unitPrice = parseInt(e.target.value) || 0
                      setRooms(newRooms)
                    }}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#c9a96e]"
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">小計</label>
                  <input
                    type="text"
                    value={`$${(room.quantity * room.unitPrice).toLocaleString()}`}
                    readOnly
                    className="w-full px-2 py-1 text-sm bg-gray-100 border border-gray-300 rounded font-medium"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 總金額 */}
      <div className="bg-[#c9a96e]/10 border border-[#c9a96e]/30 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-700">總金額</span>
          <span className="text-2xl font-bold text-[#c9a96e]">
            ${totalCost.toLocaleString()} 元
          </span>
        </div>
      </div>

      {/* 備註 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          備註（選填）
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c9a96e] focus:border-transparent"
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
