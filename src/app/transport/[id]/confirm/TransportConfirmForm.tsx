'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  itemId: string
  defaultValues: {
    driver_name: string
    driver_phone: string
    vehicle_plate: string
    vehicle_type: string
  }
}

export function TransportConfirmForm({ itemId, defaultValues }: Props) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  const [form, setForm] = useState({
    driver_name: defaultValues.driver_name,
    driver_phone: defaultValues.driver_phone,
    vehicle_plate: defaultValues.vehicle_plate,
    vehicle_type: defaultValues.vehicle_type,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // 驗證必填
    if (!form.driver_name.trim()) {
      setError('請填寫司機姓名')
      return
    }
    if (!form.driver_phone.trim()) {
      setError('請填寫司機電話')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/transport/${itemId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '提交失敗')
      }

      // 成功 → 刷新頁面顯示確認狀態
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失敗，請稍後再試')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border-x border-b border-gray-200 rounded-b-lg p-6">
      <h2 className="font-medium text-gray-700 mb-4">司機資訊</h2>
      
      <div className="space-y-4">
        {/* 司機姓名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            司機姓名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.driver_name}
            onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
            placeholder="例：田中太郎"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 司機電話 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            司機電話 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={form.driver_phone}
            onChange={(e) => setForm({ ...form, driver_phone: e.target.value })}
            placeholder="例：090-1234-5678"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 車牌號碼 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            車牌號碼
          </label>
          <input
            type="text"
            value={form.vehicle_plate}
            onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })}
            placeholder="例：福岡 200 あ 1234"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 車款 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            車款
          </label>
          <input
            type="text"
            value={form.vehicle_type}
            onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
            placeholder="例：45人座大巴"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 提交按鈕 */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 w-full py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? '提交中...' : '✓ 確認提交'}
      </button>

      <p className="mt-4 text-xs text-gray-500 text-center">
        提交後如需修改，請聯繫角落旅行社
      </p>
    </form>
  )
}
