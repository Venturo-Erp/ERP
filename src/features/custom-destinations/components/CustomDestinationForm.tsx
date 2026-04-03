'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  useCustomDestination,
  createCustomDestination,
  updateCustomDestination,
  CustomDestination,
} from '@/data/entities/custom-destinations'
import { useAuthStore } from '@/stores'

interface CustomDestinationFormProps {
  destinationId?: string
  onSubmit: () => void
  onCancel: () => void
}

export function CustomDestinationForm({
  destinationId,
  onSubmit,
  onCancel,
}: CustomDestinationFormProps) {
  const { item: destination, loading } = useCustomDestination(destinationId || '')
  const workspaceId = useAuthStore(state => state.user?.workspace_id)

  const [formData, setFormData] = useState({
    city: '',
    name: '',
    category: '',
    latitude: '',
    longitude: '',
    description: '',
    tags: '',
  })

  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (destination) {
      setFormData({
        city: destination.city || '',
        name: destination.name || '',
        category: destination.category || '',
        latitude: destination.latitude?.toString() || '',
        longitude: destination.longitude?.toString() || '',
        description: destination.description || '',
        tags: destination.tags?.join(', ') || '',
      })
    }
  }, [destination])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const payload: Partial<CustomDestination> = {
        workspace_id: workspaceId,
        city: formData.city.trim(),
        name: formData.name.trim(),
        category: formData.category.trim() || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        description: formData.description.trim() || null,
        tags: formData.tags
          .split(',')
          .map(t => t.trim())
          .filter(t => t),
      }

      if (destinationId) {
        await updateCustomDestination(destinationId, payload)
        toast.success('景點已更新')
      } else {
        await createCustomDestination(payload as Omit<CustomDestination, 'id' | 'created_at'>)
        toast.success('景點已新增')
      }

      onSubmit()
    } catch (err) {
      toast.error('儲存失敗')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-morandi-muted">載入中...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6">
      {/* 城市 */}
      <div>
        <Label htmlFor="city">城市 *</Label>
        <Input
          id="city"
          value={formData.city}
          onChange={e => setFormData({ ...formData, city: e.target.value })}
          placeholder="例如：清邁"
          required
        />
      </div>

      {/* 景點名稱 */}
      <div>
        <Label htmlFor="name">景點名稱 *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          placeholder="例如：雙龍寺"
          required
        />
      </div>

      {/* 類型 */}
      <div>
        <Label htmlFor="category">類型</Label>
        <select
          id="category"
          value={formData.category}
          onChange={e => setFormData({ ...formData, category: e.target.value })}
          className="w-full px-3 py-2 border border-morandi-border rounded-lg"
        >
          <option value="">請選擇</option>
          <option value="文化">文化</option>
          <option value="美食">美食</option>
          <option value="自然">自然</option>
          <option value="購物">購物</option>
        </select>
      </div>

      {/* 座標 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="latitude">緯度</Label>
          <Input
            id="latitude"
            type="number"
            step="0.000001"
            value={formData.latitude}
            onChange={e => setFormData({ ...formData, latitude: e.target.value })}
            placeholder="18.8048"
          />
        </div>
        <div>
          <Label htmlFor="longitude">經度</Label>
          <Input
            id="longitude"
            type="number"
            step="0.000001"
            value={formData.longitude}
            onChange={e => setFormData({ ...formData, longitude: e.target.value })}
            placeholder="98.9218"
          />
        </div>
      </div>

      {/* 簡介 */}
      <div>
        <Label htmlFor="description">簡介</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          placeholder="景點簡介..."
          rows={3}
        />
      </div>

      {/* 標籤 */}
      <div>
        <Label htmlFor="tags">標籤（以逗號分隔）</Label>
        <Input
          id="tags"
          value={formData.tags}
          onChange={e => setFormData({ ...formData, tags: e.target.value })}
          placeholder="例如：親子, 浪漫, 冒險"
        />
        <p className="text-xs text-morandi-muted mt-1">輸入多個標籤請用逗號分隔</p>
      </div>

      {/* 按鈕 */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          取消
        </Button>
        <Button
          type="submit"
          className="bg-morandi-gold hover:bg-morandi-gold-hover"
          disabled={submitting}
        >
          {submitting ? '儲存中...' : destinationId ? '更新' : '新增'}
        </Button>
      </div>
    </form>
  )
}
