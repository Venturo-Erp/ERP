'use client'

import { useState } from 'react'
import { updateDestination } from '@/data/entities/destinations'
import type { Destination } from '@/features/destinations/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

interface DestinationReviewCardProps {
  destination: Destination
}

export function DestinationReviewCard({ destination }: DestinationReviewCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    google_maps_url: destination.google_maps_url || '',
    description: destination.description || '',
    images: destination.images?.join('\n') || '', // 一行一個 URL
    opening_hours: destination.opening_hours || '',
    ticket_price: destination.ticket_price || '',
    suggested_duration_minutes: destination.duration_minutes || 0,
  })

  // 檢查完整度
  const missingFields: string[] = []
  if (!formData.google_maps_url) missingFields.push('Google Maps URL')
  if (!formData.description || formData.description.length < 100) missingFields.push('詳細描述（至少 100 字）')
  if (!formData.images || formData.images.split('\n').filter(u => u.trim()).length < 3) missingFields.push('圖片（至少 3 張）')
  if (!destination.latitude || !destination.longitude) missingFields.push('座標')

  const isComplete = missingFields.length === 0
  const completionPercentage = Math.round(((4 - missingFields.length) / 4) * 100)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const images = formData.images
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0)

      await updateDestination(destination.id, {
        google_maps_url: formData.google_maps_url,
        description: formData.description,
        images,
        opening_hours: formData.opening_hours,
        ticket_price: formData.ticket_price,
        duration_minutes: formData.suggested_duration_minutes,
        verification_status: isComplete ? 'verified' : 'reviewing',
        verified_at: isComplete ? new Date().toISOString() : undefined,
      })

      setIsEditing(false)
      window.location.reload() // 簡單粗暴刷新（可改用 SWR mutate）
    } catch (error) {
      console.error('儲存失敗:', error)
      alert('儲存失敗，請重試')
    } finally {
      setIsSaving(false)
    }
  }

  const statusBadge = {
    pending: <Badge variant="destructive">❌ 待確認</Badge>,
    reviewing: <Badge variant="outline" className="text-status-warning border-status-warning">⏳ 確認中</Badge>,
    verified: <Badge variant="outline" className="text-status-success border-status-success">✅ 已確認</Badge>,
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 卡片標題 */}
      <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-gray-900">
            [{destination.priority}] {destination.name}
          </span>
          {statusBadge[destination.verification_status || 'pending']}
          <span className="text-sm text-gray-600">{destination.category}</span>
        </div>
        <div className="text-sm font-medium text-gray-600">
          完成度：{completionPercentage}%
        </div>
      </div>

      {/* 卡片內容 */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 左側：AI 提供的基本資料（唯讀） */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-3">📊 AI 爬取資料（唯讀）</h3>

            <div>
              <label className="text-sm text-gray-600">景點名稱</label>
              <div className="mt-1 p-2 bg-gray-50 rounded border border-gray-200 text-gray-900">
                {destination.name}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600">英文名稱</label>
              <div className="mt-1 p-2 bg-gray-50 rounded border border-gray-200 text-gray-500">
                {destination.name_en || '未提供'}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600">類別</label>
              <div className="mt-1 p-2 bg-gray-50 rounded border border-gray-200 text-gray-900">
                {destination.category}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600">優先級</label>
              <div className="mt-1 p-2 bg-gray-50 rounded border border-gray-200 text-gray-900">
                {destination.priority} {destination.priority <= 20 ? '（必去）' : '（推薦）'}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600">座標</label>
              <div className="mt-1 p-2 bg-gray-50 rounded border border-gray-200 text-gray-900">
                {destination.latitude && destination.longitude
                  ? `${destination.latitude}, ${destination.longitude}`
                  : '❌ 缺少座標'}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-600">標籤</label>
              <div className="mt-1 p-2 bg-gray-50 rounded border border-gray-200">
                {destination.tags?.map((tag, i) => (
                  <span key={i} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-2 mb-1">
                    {tag}
                  </span>
                )) || '無標籤'}
              </div>
            </div>
          </div>

          {/* 右側：待補齊欄位（可編輯） */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">✏️ 待補齊資料</h3>
              {!isEditing && (
                <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                  編輯
                </Button>
              )}
            </div>

            {/* Google Maps URL（必填） */}
            <div>
              <label className="text-sm text-gray-700 font-medium">
                Google Maps URL <span className="text-red-500">*</span>
              </label>
              {isEditing ? (
                <Input
                  type="url"
                  value={formData.google_maps_url}
                  onChange={(e) => setFormData({ ...formData, google_maps_url: e.target.value })}
                  placeholder="https://www.google.com/maps/..."
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 p-2 bg-white rounded border border-gray-300 text-sm">
                  {formData.google_maps_url || <span className="text-red-500">❌ 未填寫</span>}
                </div>
              )}
            </div>

            {/* 詳細描述（必填） */}
            <div>
              <label className="text-sm text-gray-700 font-medium">
                詳細描述 <span className="text-red-500">*</span>
                <span className="text-gray-500 ml-2">
                  ({formData.description.length}/200 字)
                </span>
              </label>
              {isEditing ? (
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="請輸入 100-200 字的景點描述..."
                  rows={4}
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 p-2 bg-white rounded border border-gray-300 text-sm">
                  {formData.description || <span className="text-red-500">❌ 未填寫</span>}
                </div>
              )}
              {formData.description.length < 100 && (
                <p className="text-xs text-red-500 mt-1">至少需要 100 字</p>
              )}
            </div>

            {/* 圖片 URL（必填，3-5 張） */}
            <div>
              <label className="text-sm text-gray-700 font-medium">
                圖片 URL <span className="text-red-500">*</span>
                <span className="text-gray-500 ml-2">
                  ({formData.images.split('\n').filter(u => u.trim()).length}/3-5 張)
                </span>
              </label>
              {isEditing ? (
                <Textarea
                  value={formData.images}
                  onChange={(e) => setFormData({ ...formData, images: e.target.value })}
                  placeholder="每行一個圖片 URL&#10;https://images.unsplash.com/...&#10;https://images.unsplash.com/..."
                  rows={5}
                  className="mt-1 font-mono text-xs"
                />
              ) : (
                <div className="mt-1 space-y-1">
                  {formData.images.split('\n').filter(u => u.trim()).map((url, i) => (
                    <div key={i} className="text-xs text-blue-600 truncate">{url}</div>
                  ))}
                  {formData.images.split('\n').filter(u => u.trim()).length === 0 && (
                    <span className="text-red-500">❌ 未填寫</span>
                  )}
                </div>
              )}
            </div>

            {/* 營業時間（選填） */}
            <div>
              <label className="text-sm text-gray-700 font-medium">營業時間</label>
              {isEditing ? (
                <Input
                  type="text"
                  value={formData.opening_hours}
                  onChange={(e) => setFormData({ ...formData, opening_hours: e.target.value })}
                  placeholder="例：每日 08:00-18:00"
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 p-2 bg-white rounded border border-gray-300 text-sm text-gray-600">
                  {formData.opening_hours || '未填寫'}
                </div>
              )}
            </div>

            {/* 門票價格（選填） */}
            <div>
              <label className="text-sm text-gray-700 font-medium">門票價格</label>
              {isEditing ? (
                <Input
                  type="text"
                  value={formData.ticket_price}
                  onChange={(e) => setFormData({ ...formData, ticket_price: e.target.value })}
                  placeholder="例：100 THB / 免費"
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 p-2 bg-white rounded border border-gray-300 text-sm text-gray-600">
                  {formData.ticket_price || '未填寫'}
                </div>
              )}
            </div>

            {/* 建議停留時間（選填） */}
            <div>
              <label className="text-sm text-gray-700 font-medium">建議停留時間（分鐘）</label>
              {isEditing ? (
                <Input
                  type="number"
                  value={formData.suggested_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, suggested_duration_minutes: parseInt(e.target.value) || 0 })}
                  placeholder="例：90"
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 p-2 bg-white rounded border border-gray-300 text-sm text-gray-600">
                  {formData.suggested_duration_minutes > 0
                    ? `${formData.suggested_duration_minutes} 分鐘`
                    : '未填寫'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 缺失欄位提示 */}
        {missingFields.length > 0 && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 font-medium mb-2">⚠️ 還缺少以下必填欄位：</p>
            <ul className="list-disc list-inside text-yellow-700 text-sm">
              {missingFields.map((field, i) => (
                <li key={i}>{field}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 操作按鈕 */}
        {isEditing && (
          <div className="mt-6 flex gap-3 justify-end">
            <Button
              onClick={() => setIsEditing(false)}
              variant="outline"
              disabled={isSaving}
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? '儲存中...' : isComplete ? '儲存並標記為已確認' : '儲存（未完成）'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
