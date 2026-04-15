'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import {
  MapPin,
  Building2,
  Ticket,
  FileText,
  MessageCircle,
  Lightbulb,
  Calendar,
  Zap,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type ResponseMode = 'passive' | 'recommend' | 'guide_booking'

interface DataSources {
  itineraries: boolean
  suppliers: boolean
  attractions: boolean
  quotes: boolean
}

interface SimpleModeSettings {
  data_sources: DataSources
  response_mode: ResponseMode
}

// ─── Data Source Options ───────────────────────────────────────────────────

const DATA_SOURCE_OPTIONS: {
  key: keyof DataSources
  label: string
  icon: React.ReactNode
  description: string
  tableName: string
}[] = [
  {
    key: 'itineraries',
    label: '行程資料庫',
    icon: <Calendar className="h-5 w-5" />,
    description: '旅遊行程、團體行程資料',
    tableName: 'itineraries',
  },
  {
    key: 'suppliers',
    label: '供應商資料',
    icon: <Building2 className="h-5 w-5" />,
    description: '飯店、餐廳、景點、航空公司',
    tableName: 'suppliers',
  },
  {
    key: 'attractions',
    label: '景點資料庫',
    icon: <MapPin className="h-5 w-5" />,
    description: '景點資訊、門票、體驗活動',
    tableName: 'attractions',
  },
  {
    key: 'quotes',
    label: '報價記錄',
    icon: <FileText className="h-5 w-5" />,
    description: '歷史報價、客戶資料',
    tableName: 'quotes',
  },
]

// ─── Response Mode Options ─────────────────────────────────────────────────

const RESPONSE_MODE_OPTIONS: {
  key: ResponseMode
  emoji: string
  label: string
  description: string
  example: string
}[] = [
  {
    key: 'passive',
    emoji: '💬',
    label: '被動回答',
    description: '問什麼答什麼，不主動推薦',
    example: '客戶問「北海道有什麼行程？」→ 只回答客戶問的，不追問需求',
  },
  {
    key: 'recommend',
    emoji: '🌟',
    label: '主動推薦',
    description: '了解需求後推薦合適行程',
    example: '客戶問「想去北海道」→ 反問「請問幾個人？什麼時候去？」然後推薦行程',
  },
  {
    key: 'guide_booking',
    emoji: '📅',
    label: '引導預約',
    description: '積極引導客戶預約諮詢',
    example: '了解需求後說「幫您安排專人聯繫」或「預約免費諮詢」',
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function SimpleModeTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [dataSources, setDataSources] = useState<DataSources>({
    itineraries: true,
    suppliers: false,
    attractions: true,
    quotes: false,
  })

  const [responseMode, setResponseMode] = useState<ResponseMode>('recommend')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai-settings')
      if (!res.ok) {
        logger.error('[SimpleModeTab] Failed to load settings', { status: res.status })
        return
      }
      const data = (await res.json()) as Array<{
        setting_category: string
        setting_key: string
        setting_value: string
      }>

      const get = (category: string, key: string) =>
        data.find(r => r.setting_category === category && r.setting_key === key)?.setting_value ??
        null

      // 載入 data_sources（新的簡單模式設定）
      const simpleSourcesRaw = get('ai_prompt', 'simple_data_sources')
      if (simpleSourcesRaw) {
        try {
          const parsed = JSON.parse(simpleSourcesRaw) as DataSources
          setDataSources(parsed)
        } catch {
          // 嘗試舊格式
          const oldFormat = get('ai_prompt', 'data_sources')
          if (oldFormat) {
            try {
              const oldParsed = JSON.parse(oldFormat)
              setDataSources({
                itineraries: true,
                suppliers: oldParsed.suppliers || false,
                attractions: oldParsed.attractions ?? true,
                quotes: false,
              })
            } catch {
              // keep defaults
            }
          }
        }
      }

      // 載入 response_mode
      const modeRaw = get('ai_prompt', 'response_mode')
      if (modeRaw && RESPONSE_MODE_OPTIONS.some(o => o.key === modeRaw)) {
        setResponseMode(modeRaw as ResponseMode)
      }
    } catch (err) {
      logger.error('[SimpleModeTab] Load error', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates = [
        {
          category: 'ai_prompt',
          key: 'simple_data_sources',
          value: JSON.stringify(dataSources),
        },
        {
          category: 'ai_prompt',
          key: 'response_mode',
          value: responseMode,
        },
      ]

      const results = await Promise.all(
        updates.map(u =>
          fetch('/api/ai-settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(u),
          })
        )
      )

      const allOk = results.every(r => r.ok)
      if (allOk) {
        toast.success('簡單模式設定已儲存')
      } else {
        toast.error('部分設定儲存失敗')
        logger.error('[SimpleModeTab] Some saves failed', {
          statuses: results.map(r => r.status),
        })
      }
    } catch (err) {
      toast.error('儲存失敗，請再試一次')
      logger.error('[SimpleModeTab] Save error', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-morandi-secondary">載入中...</div>
  }

  // 計算已選的資料來源數量
  const selectedCount = Object.values(dataSources).filter(Boolean).length

  return (
    <div className="space-y-6 max-w-3xl">
      {/* 提示訊息 */}
      <Card className="border-morandi-gold/30 bg-morandi-gold/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-morandi-gold shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-morandi-primary">簡單模式說明</p>
              <p className="text-sm text-morandi-secondary mt-1">
                選擇 AI 可以查詢的資料庫，讓客服能根據這些資料回答客戶問題。不需要懂 AI
                訓練，像選單一样简单！
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── A. 資料來源（多選） ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-morandi-gold" />
            資料來源
            <Badge variant="outline" className="ml-2 text-xs">
              已選 {selectedCount} 項
            </Badge>
          </CardTitle>
          <CardDescription>勾選 AI 可以查詢的資料庫（可多選）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {DATA_SOURCE_OPTIONS.map(option => {
            const isSelected = dataSources[option.key]
            return (
              <label
                key={option.key}
                className={[
                  'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
                  isSelected
                    ? 'border-morandi-gold bg-morandi-gold/5'
                    : 'border-border hover:border-morandi-gold/50',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={e =>
                    setDataSources(prev => ({ ...prev, [option.key]: e.target.checked }))
                  }
                  className="h-4 w-4 mt-1 rounded border-border accent-morandi-gold cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-morandi-secondary">{option.icon}</span>
                    <span className="text-sm font-medium text-morandi-primary">{option.label}</span>
                    <span className="text-xs text-morandi-muted">({option.tableName})</span>
                  </div>
                  <p className="text-sm text-morandi-secondary mt-1">{option.description}</p>
                </div>
              </label>
            )
          })}
        </CardContent>
      </Card>

      {/* ── B. 回覆方向（單選） ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-morandi-gold" />
            回覆方向
          </CardTitle>
          <CardDescription>選擇 AI 回覆客戶時的風格（單選）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {RESPONSE_MODE_OPTIONS.map(option => {
            const isSelected = responseMode === option.key
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setResponseMode(option.key)}
                className={[
                  'w-full text-left rounded-xl border-2 p-4 transition-all duration-150',
                  isSelected
                    ? 'border-morandi-gold bg-morandi-gold/5'
                    : 'border-border hover:border-morandi-gold/50',
                ].join(' ')}
              >
                <div className="flex items-start gap-3">
                  {/* Radio indicator */}
                  <span
                    className={[
                      'mt-0.5 flex h-4 w-4 shrink-0 rounded-full border-2 items-center justify-center',
                      isSelected ? 'border-morandi-gold' : 'border-muted-foreground/40',
                    ].join(' ')}
                  >
                    {isSelected && <span className="h-2 w-2 rounded-full bg-morandi-gold block" />}
                  </span>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{option.emoji}</span>
                      <span className="font-medium text-morandi-primary">{option.label}</span>
                    </div>
                    <p className="text-sm text-morandi-secondary mt-1">{option.description}</p>
                    <div className="mt-2 bg-morandi-container rounded-lg px-3 py-2 text-xs text-morandi-secondary">
                      <span className="text-morandi-muted block mb-1">範例：</span>
                      {option.example}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </CardContent>
      </Card>

      {/* ── Current Settings Preview ───────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">目前設定預覽</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <div className="text-sm text-morandi-secondary mr-2">資料來源：</div>
            {Object.entries(dataSources)
              .filter(([, v]) => v)
              .map(([k]) => (
                <Badge key={k} variant="outline" className="bg-morandi-gold/10">
                  {DATA_SOURCE_OPTIONS.find(o => o.key === k)?.label}
                </Badge>
              ))}
            {selectedCount === 0 && (
              <span className="text-sm text-morandi-muted">未選擇任何資料來源</span>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-morandi-secondary">回覆方向：</span>
            <Badge variant="outline" className="bg-morandi-gold/10">
              {RESPONSE_MODE_OPTIONS.find(o => o.key === responseMode)?.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* ── Save Button ────────────────────────────────────────────────────── */}
      <div className="flex justify-end pb-4">
        <Button onClick={handleSave} disabled={saving} className="min-w-28">
          {saving ? '儲存中...' : '儲存設定'}
        </Button>
      </div>
    </div>
  )
}