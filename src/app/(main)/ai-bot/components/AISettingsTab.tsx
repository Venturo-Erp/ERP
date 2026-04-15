'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { SimpleModeTab } from './SimpleModeTab'

// ─── Types ───────────────────────────────────────────────────────────────────

type StyleKey = 'warm' | 'professional' | 'luxury'
type MaxLength = '100' | '150' | '200' | '300'

interface DataSources {
  attractions: boolean
  tours: boolean
}

interface StyleOption {
  key: StyleKey
  emoji: string
  label: string
  subtitle: string
  example: string
  prompt: string
}

// ─── Style Definitions ───────────────────────────────────────────────────────

const STYLE_OPTIONS: StyleOption[] = [
  {
    key: 'warm',
    emoji: '🌿',
    label: '溫暖親切型',
    subtitle: '像朋友推薦，輕鬆自然',
    example:
      '哈囉～北海道超推的！冬天去可以泡溫泉、吃海鮮，超幸福～你們幾個人要去呀？有帶小朋友嗎？我先幫你們規劃看看預算 😊',
    prompt: `你是角落旅行社的旅遊小幫手，說話像朋友聊天一樣輕鬆自然。用親切口語、適度emoji。

對話流程：
1. 先打招呼，問他們想去哪裡
2. 問人數：「幾個人要去呀？有帶小朋友嗎？」如果提到小孩，追問年紀（影響報價）
3. 問預算：「大概抓多少預算呢？我幫你看看怎麼安排最划算～」
4. 問風格：「喜歡慢慢玩還是多跑幾個點？想要美食之旅還是自然風景？」
5. 說明：「我們主要做私人包團客製化行程，費用會比一般團體高一些，但完全照你們的節奏走～如果預算考量也能幫你們報名網路上的旅行團，最近還有優惠活動喔！」
6. 根據資料庫推薦景點和行程

品牌定位：質感深度體驗，不趕行程，好好度假放鬆。
回覆字數上限：{max_length}字。繁體中文。`,
  },
  {
    key: 'professional',
    emoji: '💼',
    label: '專業顧問型',
    subtitle: '條理分明，資訊導向',
    example:
      '您好，北海道是非常熱門的目的地。為了提供精準報價，想先確認：1. 預計出發日期 2. 旅遊天數 3. 大人/小孩人數 4. 預算範圍。我們將為您規劃最適合的行程。',
    prompt: `你是角落旅行社的資深旅遊顧問，回覆條理分明、專業可靠。

對話流程：
1. 專業問候，確認目的地需求
2. 收集旅遊資訊：出發日期、天數、人數組成（成人/兒童，兒童請確認年齡以利報價）
3. 確認預算範圍（每人或總預算）
4. 了解偏好：住宿等級、餐飲需求、行程節奏
5. 說明服務模式：「本社以私人包團客製化行程為主，提供專屬導遊與彈性行程安排，費用較一般團體高。若有預算考量，我們也能協助報名市面上的優質團體行程，目前合作通路有優惠方案。」
6. 根據客戶需求與資料庫資料提供具體建議

品牌定位：高端客製化深度旅遊，注重品質與細節。
回覆字數上限：{max_length}字。繁體中文。`,
  },
  {
    key: 'luxury',
    emoji: '✨',
    label: '質感奢華型',
    subtitle: '威廉代理人風格，深度體驗',
    example:
      '午安，感謝您對北海道的興趣。我是角落旅行社的旅遊顧問，我們專注打造深度私人行程——不趕景點，而是真正體驗在地文化與美食。方便讓我了解一下您的旅伴組成和理想中的旅行節奏嗎？',
    prompt: `你是角落旅行社的首席旅遊顧問「威廉」的AI代理人，代表威廉與客戶溝通。語氣優雅從容，展現質感品味。

對話流程：
1. 優雅問候：「感謝您的詢問，我是威廉的旅遊顧問助理」
2. 細膩了解需求：詢問旅伴組成（如提到「幾大幾小」請確認小朋友年齡，這會影響行程安排與報價）
3. 了解預算期待：不直接問數字，而是「方便讓我了解您對這趟旅行的投資期待嗎？」
4. 探索旅行風格：「您理想中的旅行節奏是什麼樣的？我們擅長安排深度慢旅，讓每個體驗都有餘裕。」
5. 說明服務特色：「角落旅行社專注私人包團客製化行程，從住宿、餐廳到體驗都為您精心挑選。雖然費用較一般團體高，但每一分都花在真正的體驗上。若您希望輕鬆出遊，我們也能為您推薦優質的團體行程，目前正有合作優惠。」
6. 根據資料庫提供精選推薦，強調深度體驗而非數量

品牌定位：不追求米其林星級，而是真正的在地深度體驗。慢慢玩，好好度假，讓旅行成為生活的養分。
回覆字數上限：{max_length}字。繁體中文。`,
  },
]

const MAX_LENGTH_OPTIONS: MaxLength[] = ['100', '150', '200', '300']

const CONVERSATION_FLOW = [
  { step: 1, label: '歡迎', detail: '詢問目的地' },
  { step: 2, label: '分析人數', detail: '幾大幾小，小孩主動問年紀' },
  { step: 3, label: '詢問預算', detail: '了解預算範圍' },
  { step: 4, label: '旅行風格', detail: '慢遊 vs 多點 / 美食 vs 風景' },
  { step: 5, label: '說明服務', detail: '私人包團 vs 代報網路團' },
  { step: 6, label: '資料庫推薦', detail: '根據景點 & 行程資料庫推薦' },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function AISettingsTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [selectedStyle, setSelectedStyle] = useState<StyleKey>('luxury')
  const [maxLength, setMaxLength] = useState<MaxLength>('200')
  const [dataSources, setDataSources] = useState<DataSources>({ attractions: true, tours: true })
  const [customPrompt, setCustomPrompt] = useState('')

  // Track if prompt was manually edited after style selection
  const [promptDirty, setPromptDirty] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai-settings')
      if (!res.ok) {
        logger.error('[AISettingsTab] Failed to load settings', { status: res.status })
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

      const style = get('ai_prompt', 'style') as StyleKey | null
      const length = get('ai_prompt', 'max_length') as MaxLength | null
      const sourcesRaw = get('ai_prompt', 'data_sources')
      const prompt = get('ai_prompt', 'system_prompt')

      if (style && STYLE_OPTIONS.some(s => s.key === style)) setSelectedStyle(style)
      if (length && MAX_LENGTH_OPTIONS.includes(length)) setMaxLength(length)
      if (sourcesRaw) {
        try {
          const parsed = JSON.parse(sourcesRaw) as DataSources
          setDataSources(parsed)
        } catch {
          // keep defaults
        }
      }
      if (prompt) {
        setCustomPrompt(prompt)
        setPromptDirty(true) // treat loaded prompt as custom
      } else {
        // auto-fill from default style
        setCustomPrompt(
          STYLE_OPTIONS.find(s => s.key === (style ?? 'luxury'))?.prompt ?? STYLE_OPTIONS[2].prompt
        )
      }
    } catch (err) {
      logger.error('[AISettingsTab] Load error', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStyleSelect = (key: StyleKey) => {
    setSelectedStyle(key)
    const option = STYLE_OPTIONS.find(s => s.key === key)
    if (option) {
      setCustomPrompt(option.prompt)
      setPromptDirty(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates = [
        { category: 'ai_prompt', key: 'system_prompt', value: customPrompt },
        { category: 'ai_prompt', key: 'style', value: selectedStyle },
        { category: 'ai_prompt', key: 'max_length', value: maxLength },
        { category: 'ai_prompt', key: 'data_sources', value: JSON.stringify(dataSources) },
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
        toast.success('AI 設定已儲存')
      } else {
        toast.error('部分設定儲存失敗')
        logger.error('[AISettingsTab] Some saves failed', { statuses: results.map(r => r.status) })
      }
    } catch (err) {
      toast.error('儲存失敗，請再試一次')
      logger.error('[AISettingsTab] Save error', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-morandi-secondary">載入中...</div>
  }

  const [modeTab, setModeTab] = useState<'simple' | 'advanced'>('simple')

  return (
    <div className="space-y-6 max-w-3xl">
      {/* 模式切換 */}
      <Tabs value={modeTab} onValueChange={v => setModeTab(v as 'simple' | 'advanced')}>
        <TabsList className="mb-4">
          <TabsTrigger value="simple">簡單模式</TabsTrigger>
          <TabsTrigger value="advanced">進階設定</TabsTrigger>
        </TabsList>

        {/* 簡單模式 */}
        {modeTab === 'simple' && <SimpleModeTab />}

        {/* 進階設定（原本的完整設定） */}
        {modeTab === 'advanced' && (
          <>
      {/* ── A. Style Selector ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">風格選擇</CardTitle>
          <CardDescription>選擇 AI 客服的對話風格，選擇後會自動填入提示詞</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {STYLE_OPTIONS.map(option => {
            const isSelected = selectedStyle === option.key
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => handleStyleSelect(option.key)}
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

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{option.emoji}</span>
                      <span className="font-medium text-morandi-primary">{option.label}</span>
                      <span className="text-xs text-morandi-secondary">{option.subtitle}</span>
                      {option.key === 'luxury' && (
                        <Badge
                          variant="outline"
                          className="text-xs text-morandi-gold border-morandi-gold/50 ml-auto"
                        >
                          預設
                        </Badge>
                      )}
                    </div>

                    {/* Chat bubble preview */}
                    <div className="mt-2 bg-morandi-container rounded-lg px-3 py-2 text-sm text-morandi-secondary leading-relaxed">
                      <span className="text-xs text-morandi-muted block mb-1">範例回覆：</span>
                      {option.example}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </CardContent>
      </Card>

      {/* ── B. Response Length ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">回覆字數上限</CardTitle>
          <CardDescription>控制每次 AI 回覆的最大字數</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {MAX_LENGTH_OPTIONS.map(len => (
              <button
                key={len}
                type="button"
                onClick={() => setMaxLength(len)}
                className={[
                  'px-4 py-2 rounded-lg border text-sm font-medium transition-all',
                  maxLength === len
                    ? 'border-morandi-gold bg-morandi-gold/10 text-morandi-primary'
                    : 'border-border text-morandi-secondary hover:border-morandi-gold/50',
                ].join(' ')}
              >
                {len} 字
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── C. Data Sources ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">資料來源</CardTitle>
          <CardDescription>選擇 AI 可以查詢的資料庫</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(
            [
              { key: 'attractions', label: '景點資料庫', detail: 'attractions table' },
              { key: 'tours', label: '行程資料庫', detail: 'tours table' },
            ] as const
          ).map(({ key, label, detail }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={dataSources[key]}
                onChange={e => setDataSources(prev => ({ ...prev, [key]: e.target.checked }))}
                className="h-4 w-4 rounded border-border accent-morandi-gold cursor-pointer"
              />
              <span className="text-sm font-medium text-morandi-primary">{label}</span>
              <span className="text-xs text-morandi-muted">{detail}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* ── D. Custom Prompt Editor ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">自訂提示詞</CardTitle>
          <CardDescription>
            選擇風格後自動填入，也可手動修改細節
            {promptDirty && <span className="ml-2 text-morandi-gold text-xs">（已自訂）</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            value={customPrompt}
            onChange={e => {
              setCustomPrompt(e.target.value)
              setPromptDirty(true)
            }}
            rows={12}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-y focus:outline-none focus:ring-1 focus:ring-morandi-gold font-mono leading-relaxed"
            placeholder="系統提示詞..."
          />
          <p className="text-xs text-morandi-muted mt-2">
            提示：提示詞中的{' '}
            <code className="bg-morandi-container px-1 rounded">{'{max_length}'}</code>{' '}
            會自動替換為上方設定的字數。
          </p>
        </CardContent>
      </Card>

      {/* ── E. Conversation Flow Preview ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">對話流程</CardTitle>
          <CardDescription>AI 客服會依序引導客戶提供以下資訊</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {CONVERSATION_FLOW.map(({ step, label, detail }) => (
              <li key={step} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-morandi-gold/15 text-morandi-gold text-xs font-semibold">
                  {step}
                </span>
                <div className="pt-0.5">
                  <span className="text-sm font-medium text-morandi-primary">{label}</span>
                  <span className="text-sm text-morandi-secondary"> — {detail}</span>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* ── Save Button ───────────────────────────────────────────────── */}
      <div className="flex justify-end pb-4">
        <Button onClick={handleSave} disabled={saving} className="min-w-28">
          {saving ? '儲存中...' : '儲存設定'}
        </Button>
      </div>
          </>
        )}
      </Tabs>
    </div>
  )
}
