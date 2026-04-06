'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

export function AISettingsTab() {
  const [settings, setSettings] = useState<Record<string, { value: string; description: string; id: string }>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai-settings')
      if (res.ok) {
        const data = await res.json()
        const map: typeof settings = {}
        for (const row of data) {
          const key = `${row.setting_category}:${row.setting_key}`
          map[key] = { value: row.setting_value || '', description: row.description || '', id: row.id }
        }
        setSettings(map)
        const vals: Record<string, string> = {}
        for (const [k, v] of Object.entries(map)) {
          vals[k] = v.value
        }
        setEditValues(vals)
      }
    } catch (err) {
      logger.error('載入 AI 設定失敗', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (settingKey: string) => {
    setSaving(settingKey)
    try {
      const [category, key] = settingKey.split(':')
      const res = await fetch('/api/ai-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, key, value: editValues[settingKey] }),
      })
      if (res.ok) {
        toast.success('已儲存')
        setSettings(prev => ({
          ...prev,
          [settingKey]: { ...prev[settingKey], value: editValues[settingKey] },
        }))
      } else {
        toast.error('儲存失敗')
      }
    } catch {
      toast.error('儲存失敗')
    } finally {
      setSaving(null)
    }
  }

  const isChanged = (key: string) => editValues[key] !== settings[key]?.value

  const categories = [
    { id: 'ai_prompt', label: 'AI 客服提示詞', description: '修改 AI 助理的回覆語氣和行為' },
    { id: 'itinerary_ai', label: '行程 AI 文案', description: '修改行程表 AI 產出的文案風格' },
    { id: 'notification', label: '通知模板', description: '修改發送給客戶的通知訊息模板' },
    { id: 'line_bot', label: 'LINE Bot', description: 'LINE 機器人基本設定' },
  ]

  if (loading) {
    return <div className="py-8 text-center text-morandi-secondary">載入中...</div>
  }

  return (
    <div className="space-y-6">
      {categories.map(cat => {
        const catSettings = Object.entries(settings).filter(([k]) => k.startsWith(`${cat.id}:`))
        if (catSettings.length === 0) return null

        return (
          <Card key={cat.id}>
            <CardHeader>
              <CardTitle className="text-base">{cat.label}</CardTitle>
              <CardDescription>{cat.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {catSettings.map(([key, setting]) => {
                const shortKey = key.split(':')[1]
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-morandi-primary">{setting.description || shortKey}</label>
                      {isChanged(key) && (
                        <Button
                          size="sm"
                          onClick={() => handleSave(key)}
                          disabled={saving === key}
                        >
                          {saving === key ? '儲存中...' : '儲存'}
                        </Button>
                      )}
                    </div>
                    <textarea
                      value={editValues[key] || ''}
                      onChange={e => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
                      rows={setting.value.length > 100 ? 6 : 2}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-y focus:outline-none focus:ring-1 focus:ring-morandi-gold"
                      placeholder={shortKey}
                    />
                    {key.startsWith('notification:') && (
                      <p className="text-xs text-morandi-muted">
                        可用變數：{'{customer_name}'} {'{tour_name}'} {'{departure_date}'} {'{remaining_amount}'} {'{meeting_time}'} {'{meeting_location}'} {'{days}'}
                      </p>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
