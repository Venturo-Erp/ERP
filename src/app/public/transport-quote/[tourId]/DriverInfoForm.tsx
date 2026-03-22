'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function DriverInfoForm({ itemId }: { itemId: string }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    driver_name: '',
    driver_phone: '',
    vehicle_plate: '',
    vehicle_type: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

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

      // 成功 → 刷新頁面
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失敗，請稍後再試')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* 司機姓名 */}
        <div>
          <label className="block text-sm font-medium text-morandi-primary mb-1">
            司機姓名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.driver_name}
            onChange={e => setForm({ ...form, driver_name: e.target.value })}
            placeholder="例：田中太郎"
            className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 司機電話 */}
        <div>
          <label className="block text-sm font-medium text-morandi-primary mb-1">
            司機電話 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={form.driver_phone}
            onChange={e => setForm({ ...form, driver_phone: e.target.value })}
            placeholder="例：090-1234-5678"
            className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 車牌號碼 */}
        <div>
          <label className="block text-sm font-medium text-morandi-primary mb-1">車牌號碼</label>
          <input
            type="text"
            value={form.vehicle_plate}
            onChange={e => setForm({ ...form, vehicle_plate: e.target.value })}
            placeholder="例：福岡 200 あ 1234"
            className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 車款 */}
        <div>
          <label className="block text-sm font-medium text-morandi-primary mb-1">車款</label>
          <input
            type="text"
            value={form.vehicle_type}
            onChange={e => setForm({ ...form, vehicle_type: e.target.value })}
            placeholder="例：45人座大巴"
            className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 提交按鈕 */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-4 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? '提交中...' : '✓ 確認提交司機資訊'}
      </button>
    </form>
  )
}
