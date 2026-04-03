'use client'

import NextImage from 'next/image'
import React, { useEffect, useState } from 'react'
import { InputIME } from '@/components/ui/input-ime'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Sparkles, Loader2, ImageIcon } from 'lucide-react'
import { useCountries, useCities } from '@/data'
import { alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ITINERARY_LABELS } from '../constants/labels'

// 型別定義
interface DailyScheduleItem {
  day: string
  route: string
  meals: { breakfast: string; lunch: string; dinner: string }
  accommodation: string
}

interface FlightOption {
  airline: string
  outbound: {
    code: string
    from: string
    fromCode: string
    time: string
    to: string
    toCode: string
    arrivalTime: string
  }
  return: {
    code: string
    from: string
    fromCode: string
    time: string
    to: string
    toCode: string
    arrivalTime: string
  }
}

interface HighlightSpot {
  name: string
  nameEn: string
  tags: string[]
  description: string
  imageUrl?: string
}

interface SightDetail {
  name: string
  nameEn: string
  description: string
  note?: string
  imageUrl?: string
}

export interface GeminiItineraryData {
  coverImage: string
  tagline: string
  taglineEn: string
  title: string
  subtitle: string
  price: string
  priceNote: string
  country: string
  city: string
  dailySchedule: DailyScheduleItem[]
  flightOptions: FlightOption[]
  highlightImages: string[]
  highlightSpots: HighlightSpot[]
  sights: SightDetail[]
}

interface GeminiItineraryFormProps {
  data: GeminiItineraryData
  onChange: (data: GeminiItineraryData) => void
}

export function GeminiItineraryForm({ data, onChange }: GeminiItineraryFormProps) {
  const { items: countries } = useCountries()
  const { items: cities } = useCities()
  const [generatingDescription, setGeneratingDescription] = useState<number | null>(null)
  const [generatingSightDesc, setGeneratingSightDesc] = useState<number | null>(null)
  const [generatingImage, setGeneratingImage] = useState<string | null>(null)

  // SWR 自動載入國家和城市資料

  const updateField = <K extends keyof GeminiItineraryData>(
    field: K,
    value: GeminiItineraryData[K]
  ) => {
    onChange({ ...data, [field]: value })
  }

  // 當選擇城市時（不自動設定封面圖，由 AI 生成）
  const handleCityChange = (cityName: string) => {
    updateField('city', cityName)
    // 不再自動抓資料庫封面，讓使用者用 AI 生成
  }

  // AI 生成景點描述（模擬，之後接 Gemini API）
  const handleGenerateSpotDescription = async (index: number) => {
    const spot = data.highlightSpots[index]
    if (!spot.name) return

    setGeneratingDescription(index)

    // [Planned] Gemini API 整合 - 待 API Key 配置
    // 目前使用模擬資料示範
    await new Promise(resolve => setTimeout(resolve, 1500))

    const mockDescriptions: Record<string, string> = {
      清水寺:
        '清水寺是京都最具代表性的寺廟，建於 778 年，以懸空的木造舞台聞名。從這裡可以俯瞰京都市區的絕美景色，春天的櫻花和秋天的紅葉更是令人屏息。',
      金閣寺:
        '金閣寺正式名稱為鹿苑寺，因其外牆貼滿金箔而得名。建築倒映在鏡湖池中的景象，是京都最經典的畫面之一。',
      伏見稻荷大社:
        '以千本鳥居聞名於世，綿延數公里的橘紅色鳥居隧道，是攝影愛好者的朝聖地。這裡供奉著稻荷神，是日本全國稻荷神社的總本山。',
    }

    const description =
      mockDescriptions[spot.name] ||
      `${spot.name}是${data.city}著名的觀光景點，融合了自然美景與文化特色，非常值得一遊。`

    const newSpots = [...data.highlightSpots]
    newSpots[index].description = description
    updateField('highlightSpots', newSpots)

    setGeneratingDescription(null)
  }

  // AI 生成景點介紹描述
  const handleGenerateSightDescription = async (index: number) => {
    const sight = data.sights[index]
    if (!sight.name) return

    setGeneratingSightDesc(index)

    // [Planned] Gemini API 整合 - 待 API Key 配置
    await new Promise(resolve => setTimeout(resolve, 1500))

    const description = `${sight.name}是${data.city}不可錯過的景點之一。這裡融合了傳統與現代的魅力，讓遊客能夠深入體驗當地的文化與風情。無論是建築特色、自然景觀，還是當地美食，都能讓人留下深刻的印象。建議預留充足的時間，細細品味這個地方的獨特之處。`

    const newSights = [...data.sights]
    newSights[index].description = description
    updateField('sights', newSights)

    setGeneratingSightDesc(null)
  }

  // AI 生成圖片 - 連接 Gemini API
  const handleGenerateImage = async (type: 'cover' | 'spot' | 'sight', index?: number) => {
    const key = type === 'cover' ? 'cover' : `${type}-${index}`
    setGeneratingImage(key)

    try {
      // 構建圖片生成的 prompt
      let prompt = ''
      let style = 'travel-cover'

      if (type === 'cover') {
        // 封面圖：城市全景風格
        prompt = `${data.country} ${data.city} cityscape, featuring famous landmarks and cultural elements, panoramic view, beautiful sky, travel destination photography`
        style = 'travel-cover'
      } else if (type === 'spot' && index !== undefined) {
        // 景點特色圖
        const spot = data.highlightSpots[index]
        prompt = `${spot.name} in ${data.city} ${data.country}, tourist attraction, beautiful scenery, travel photography`
        style = 'landmark'
      } else if (type === 'sight' && index !== undefined) {
        // 景點介紹圖
        const sight = data.sights[index]
        prompt = `${sight.name} in ${data.city} ${data.country}, detailed view, architectural details, cultural heritage, professional photography`
        style = 'landmark'
      }

      const response = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          style,
          aspectRatio: type === 'cover' ? '16:9' : '4:3',
        }),
      })

      const result = await response.json()

      if (result.success && result.image) {
        if (type === 'cover') {
          updateField('coverImage', result.image)
        } else if (type === 'spot' && index !== undefined) {
          const newSpots = [...data.highlightSpots]
          newSpots[index].imageUrl = result.image
          updateField('highlightSpots', newSpots)
        } else if (type === 'sight' && index !== undefined) {
          const newSights = [...data.sights]
          newSights[index].imageUrl = result.image
          updateField('sights', newSights)
        }
      } else {
        logger.error('Image generation failed:', result.error)
        void alert(`圖片生成失敗：${result.error || '未知錯誤'}`, 'error')
      }
    } catch (error) {
      logger.error('Image generation error:', error)
      void alert('圖片生成發生錯誤，請稍後再試', 'error')
    }

    setGeneratingImage(null)
  }

  return (
    <div className="space-y-6 p-6">
      {/* AI 功能提示 */}
      <div className="bg-gradient-to-r from-status-info-bg to-purple-50 border border-morandi-secondary/30 rounded-lg p-4">
        <div className="flex items-center gap-2 text-status-info font-medium mb-2">
          <Sparkles size={18} />
          <span>{ITINERARY_LABELS.GEMINI_AI_TITLE}</span>
        </div>
        <p className="text-sm text-status-info">
          點擊 <Sparkles size={14} className="inline" /> {ITINERARY_LABELS.GENERATING_7626}
          {ITINERARY_LABELS.LABEL_1199}
        </p>
      </div>

      {/* 封面資訊 */}
      <section>
        <h3 className="text-base font-bold text-morandi-primary mb-3 pb-2 border-b border-morandi-container">
          {ITINERARY_LABELS.LABEL_999}
        </h3>
        <div className="space-y-3">
          {/* 國家和城市選擇 */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-morandi-primary mb-1">
                {ITINERARY_LABELS.LABEL_5040}
              </label>
              <Select value={data.country} onValueChange={value => updateField('country', value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={ITINERARY_LABELS.選擇國家} />
                </SelectTrigger>
                <SelectContent>
                  {countries
                    .filter(c => c.is_active)
                    .sort((a, b) => a.display_order - b.display_order)
                    .map(country => (
                      <SelectItem key={country.id} value={country.name}>
                        {country.emoji ? `${country.emoji} ` : ''}
                        {country.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-morandi-primary mb-1">
                {ITINERARY_LABELS.LABEL_5461}
              </label>
              <Select value={data.city} onValueChange={handleCityChange} disabled={!data.country}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={ITINERARY_LABELS.選擇城市} />
                </SelectTrigger>
                <SelectContent>
                  {cities
                    .filter(c => {
                      const country = countries.find(co => co.name === data.country)
                      return country && c.country_id === country.id && c.is_active
                    })
                    .sort((a, b) => a.display_order - b.display_order)
                    .map(city => (
                      <SelectItem key={city.id} value={city.name}>
                        {city.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 封面圖片 with AI 生成 */}
          <div>
            <label className="block text-xs font-medium text-morandi-primary mb-1">
              {ITINERARY_LABELS.封面圖片}
            </label>
            <div className="flex gap-2">
              <InputIME
                value={data.coverImage}
                onChange={value => updateField('coverImage', value)}
                placeholder={ITINERARY_LABELS.GENERATING_6137}
                className="flex-1 text-sm"
              />
              <Button
                onClick={() => handleGenerateImage('cover')}
                disabled={generatingImage === 'cover' || !data.city}
                size="sm"
                className="bg-gradient-to-r from-status-info to-purple-600 hover:from-status-info/90 hover:to-purple-600 text-white"
              >
                {generatingImage === 'cover' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ImageIcon size={14} />
                )}
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-morandi-primary mb-1">
              {ITINERARY_LABELS.TITLE}
            </label>
            <InputIME
              value={data.title}
              onChange={value => updateField('title', value)}
              placeholder={ITINERARY_LABELS.EXAMPLE_9001}
              className="w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-morandi-primary mb-1">
              {ITINERARY_LABELS.LABEL_4322}
            </label>
            <textarea
              value={data.subtitle}
              onChange={e => updateField('subtitle', e.target.value)}
              placeholder={ITINERARY_LABELS.LABEL_4873}
              className="w-full text-sm border border-border rounded-md p-2 min-h-[60px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-morandi-primary mb-1">
                {ITINERARY_LABELS.PRICE_LABEL_HINT}
              </label>
              <InputIME
                value={data.price}
                onChange={value => updateField('price', value)}
                placeholder="35,500"
                className="w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-morandi-primary mb-1">
                {ITINERARY_LABELS.LABEL_4452}
              </label>
              <InputIME
                value={data.priceNote}
                onChange={value => updateField('priceNote', value)}
                placeholder={ITINERARY_LABELS.LABEL_7894}
                className="w-full text-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 每日行程 */}
      <section>
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-morandi-container">
          <h3 className="text-base font-bold text-morandi-primary">{ITINERARY_LABELS.每日行程}</h3>
          <Button
            onClick={() => {
              updateField('dailySchedule', [
                ...data.dailySchedule,
                {
                  day: `D${data.dailySchedule.length + 1}`,
                  route: '',
                  meals: { breakfast: '', lunch: '', dinner: '' },
                  accommodation: '',
                },
              ])
            }}
            size="sm"
            className="h-7 text-xs bg-morandi-gold hover:bg-morandi-gold-hover"
          >
            <Plus size={14} className="mr-1" />
            {ITINERARY_LABELS.新增天數}
          </Button>
        </div>
        <div className="space-y-3">
          {data.dailySchedule.map((day, idx) => (
            <div key={idx} className="bg-muted p-3 rounded border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-morandi-gold">{day.day}</span>
                <Button
                  onClick={() => {
                    updateField(
                      'dailySchedule',
                      data.dailySchedule.filter((_, i) => i !== idx)
                    )
                  }}
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-status-danger hover:text-status-danger hover:bg-status-danger-bg"
                >
                  <Trash2 size={12} />
                </Button>
              </div>
              <div className="space-y-2">
                <InputIME
                  value={day.route}
                  onChange={value => {
                    const newSchedule = [...data.dailySchedule]
                    newSchedule[idx].route = value
                    updateField('dailySchedule', newSchedule)
                  }}
                  placeholder={ITINERARY_LABELS.LABEL_6980}
                  className="w-full text-xs"
                />
                <div className="grid grid-cols-3 gap-1">
                  <InputIME
                    value={day.meals.breakfast}
                    onChange={value => {
                      const newSchedule = [...data.dailySchedule]
                      newSchedule[idx].meals.breakfast = value
                      updateField('dailySchedule', newSchedule)
                    }}
                    placeholder={ITINERARY_LABELS.早餐}
                    className="text-xs h-8"
                  />
                  <InputIME
                    value={day.meals.lunch}
                    onChange={value => {
                      const newSchedule = [...data.dailySchedule]
                      newSchedule[idx].meals.lunch = value
                      updateField('dailySchedule', newSchedule)
                    }}
                    placeholder={ITINERARY_LABELS.午餐}
                    className="text-xs h-8"
                  />
                  <InputIME
                    value={day.meals.dinner}
                    onChange={value => {
                      const newSchedule = [...data.dailySchedule]
                      newSchedule[idx].meals.dinner = value
                      updateField('dailySchedule', newSchedule)
                    }}
                    placeholder={ITINERARY_LABELS.晚餐}
                    className="text-xs h-8"
                  />
                </div>
                <InputIME
                  value={day.accommodation}
                  onChange={value => {
                    const newSchedule = [...data.dailySchedule]
                    newSchedule[idx].accommodation = value
                    updateField('dailySchedule', newSchedule)
                  }}
                  placeholder={ITINERARY_LABELS.LABEL_4576}
                  className="w-full text-xs"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 航班資訊 */}
      <section>
        <h3 className="text-base font-bold text-morandi-primary mb-3 pb-2 border-b border-morandi-container">
          {ITINERARY_LABELS.LABEL_5074}
        </h3>
        <div className="space-y-4 text-xs">
          {data.flightOptions.map((option, idx) => (
            <div
              key={idx}
              className="bg-status-warning-bg p-3 rounded border border-status-warning/30"
            >
              <div className="font-semibold text-morandi-primary mb-2">{option.airline}</div>
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1">
                  <InputIME
                    value={option.outbound.code}
                    onChange={value => {
                      const newOptions = [...data.flightOptions]
                      newOptions[idx].outbound.code = value
                      updateField('flightOptions', newOptions)
                    }}
                    placeholder={ITINERARY_LABELS.LABEL_7892}
                    className="text-xs h-7"
                  />
                  <InputIME
                    value={option.outbound.time}
                    onChange={value => {
                      const newOptions = [...data.flightOptions]
                      newOptions[idx].outbound.time = value
                      updateField('flightOptions', newOptions)
                    }}
                    placeholder={ITINERARY_LABELS.LABEL_5480}
                    className="text-xs h-7"
                  />
                  <InputIME
                    value={option.outbound.arrivalTime}
                    onChange={value => {
                      const newOptions = [...data.flightOptions]
                      newOptions[idx].outbound.arrivalTime = value
                      updateField('flightOptions', newOptions)
                    }}
                    placeholder={ITINERARY_LABELS.LABEL_5485}
                    className="text-xs h-7"
                  />
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <InputIME
                    value={option.return.code}
                    onChange={value => {
                      const newOptions = [...data.flightOptions]
                      newOptions[idx].return.code = value
                      updateField('flightOptions', newOptions)
                    }}
                    placeholder={ITINERARY_LABELS.LABEL_7892}
                    className="text-xs h-7"
                  />
                  <InputIME
                    value={option.return.time}
                    onChange={value => {
                      const newOptions = [...data.flightOptions]
                      newOptions[idx].return.time = value
                      updateField('flightOptions', newOptions)
                    }}
                    placeholder={ITINERARY_LABELS.LABEL_5480}
                    className="text-xs h-7"
                  />
                  <InputIME
                    value={option.return.arrivalTime}
                    onChange={value => {
                      const newOptions = [...data.flightOptions]
                      newOptions[idx].return.arrivalTime = value
                      updateField('flightOptions', newOptions)
                    }}
                    placeholder={ITINERARY_LABELS.LABEL_5485}
                    className="text-xs h-7"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 行程特色 with AI */}
      <section>
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-morandi-container">
          <h3 className="text-base font-bold text-morandi-primary">
            {ITINERARY_LABELS.LABEL_6890}
          </h3>
          <Button
            onClick={() => {
              updateField('highlightSpots', [
                ...data.highlightSpots,
                { name: '', nameEn: '', tags: ['特色景點'], description: '', imageUrl: '' },
              ])
            }}
            size="sm"
            className="h-7 text-xs bg-morandi-gold hover:bg-morandi-gold-hover"
          >
            <Plus size={14} className="mr-1" />
            {ITINERARY_LABELS.ADD}
          </Button>
        </div>
        <div className="space-y-3">
          {data.highlightSpots.map((spot, idx) => (
            <div key={idx} className="bg-muted p-3 rounded border border-border">
              <div className="flex items-start justify-between mb-2">
                <InputIME
                  value={spot.name}
                  onChange={value => {
                    const newSpots = [...data.highlightSpots]
                    newSpots[idx].name = value
                    updateField('highlightSpots', newSpots)
                  }}
                  placeholder={ITINERARY_LABELS.LABEL_3166}
                  className="flex-1 text-xs h-7 font-semibold"
                />
                <div className="flex gap-1 ml-2">
                  <Button
                    onClick={() => handleGenerateSpotDescription(idx)}
                    disabled={generatingDescription === idx || !spot.name}
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-status-info hover:text-status-info hover:bg-muted"
                    title={ITINERARY_LABELS.GENERATING_5671}
                  >
                    {generatingDescription === idx ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Sparkles size={12} />
                    )}
                  </Button>
                  <Button
                    onClick={() => handleGenerateImage('spot', idx)}
                    disabled={generatingImage === `spot-${idx}` || !spot.name}
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-morandi-secondary hover:text-morandi-secondary hover:bg-morandi-container"
                    title={ITINERARY_LABELS.GENERATING_7963}
                  >
                    {generatingImage === `spot-${idx}` ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <ImageIcon size={12} />
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      updateField(
                        'highlightSpots',
                        data.highlightSpots.filter((_, i) => i !== idx)
                      )
                    }}
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-status-danger"
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
              <InputIME
                value={spot.nameEn}
                onChange={value => {
                  const newSpots = [...data.highlightSpots]
                  newSpots[idx].nameEn = value
                  updateField('highlightSpots', newSpots)
                }}
                placeholder={ITINERARY_LABELS.LABEL_3778}
                className="w-full text-xs h-7 mb-2"
              />
              {spot.imageUrl && (
                <div className="mb-2">
                  <NextImage
                    src={spot.imageUrl}
                    alt={spot.name}
                    width={300}
                    height={96}
                    className="w-full h-24 object-cover rounded"
                  />
                </div>
              )}
              <textarea
                value={spot.description}
                onChange={e => {
                  const newSpots = [...data.highlightSpots]
                  newSpots[idx].description = e.target.value
                  updateField('highlightSpots', newSpots)
                }}
                placeholder={ITINERARY_LABELS.GENERATING_146}
                className="w-full text-xs border border-border rounded-md p-2 min-h-[50px]"
              />
            </div>
          ))}
        </div>
      </section>

      {/* 景點介紹 with AI */}
      <section>
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-morandi-container">
          <h3 className="text-base font-bold text-morandi-primary">
            {ITINERARY_LABELS.LABEL_4014}
          </h3>
          <Button
            onClick={() => {
              updateField('sights', [
                ...data.sights,
                { name: '', nameEn: '', description: '', imageUrl: '' },
              ])
            }}
            size="sm"
            className="h-7 text-xs bg-morandi-gold hover:bg-morandi-gold-hover"
          >
            <Plus size={14} className="mr-1" />
            {ITINERARY_LABELS.ADD}
          </Button>
        </div>
        <div className="space-y-3">
          {data.sights.map((sight, idx) => (
            <div key={idx} className="bg-muted p-3 rounded border border-border">
              <div className="flex items-start justify-between mb-2">
                <InputIME
                  value={sight.name}
                  onChange={value => {
                    const newSights = [...data.sights]
                    newSights[idx].name = value
                    updateField('sights', newSights)
                  }}
                  placeholder={ITINERARY_LABELS.LABEL_3166}
                  className="flex-1 text-xs h-7 font-semibold"
                />
                <div className="flex gap-1 ml-2">
                  <Button
                    onClick={() => handleGenerateSightDescription(idx)}
                    disabled={generatingSightDesc === idx || !sight.name}
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-status-info hover:text-status-info hover:bg-muted"
                    title={ITINERARY_LABELS.AI_GENERATE_DESC}
                  >
                    {generatingSightDesc === idx ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Sparkles size={12} />
                    )}
                  </Button>
                  <Button
                    onClick={() => handleGenerateImage('sight', idx)}
                    disabled={generatingImage === `sight-${idx}` || !sight.name}
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-morandi-secondary hover:text-morandi-secondary hover:bg-morandi-container"
                    title={ITINERARY_LABELS.AI_GENERATE_IMAGE}
                  >
                    {generatingImage === `sight-${idx}` ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <ImageIcon size={12} />
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      updateField(
                        'sights',
                        data.sights.filter((_, i) => i !== idx)
                      )
                    }}
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-status-danger"
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
              <InputIME
                value={sight.nameEn}
                onChange={value => {
                  const newSights = [...data.sights]
                  newSights[idx].nameEn = value
                  updateField('sights', newSights)
                }}
                placeholder={ITINERARY_LABELS.LABEL_3778}
                className="w-full text-xs h-7 mb-2"
              />
              {sight.imageUrl && (
                <div className="mb-2">
                  <NextImage
                    src={sight.imageUrl}
                    alt={sight.name}
                    width={300}
                    height={128}
                    className="w-full h-32 object-cover rounded"
                  />
                </div>
              )}
              <textarea
                value={sight.description}
                onChange={e => {
                  const newSights = [...data.sights]
                  newSights[idx].description = e.target.value
                  updateField('sights', newSights)
                }}
                placeholder={ITINERARY_LABELS.GENERATING_7535}
                className="w-full text-xs border border-border rounded-md p-2 min-h-[60px]"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
