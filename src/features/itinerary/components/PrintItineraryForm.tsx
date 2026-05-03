'use client'

import React, { useEffect } from 'react'
import { InputIME } from '@/components/ui/input-ime'
import { TimeInput } from '@/components/ui/time-input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { useCountries, useCities } from '@/data'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ITINERARY_LABELS } from './constants/labels'

// 使用與 Preview 相同的型別定義
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
}

interface SightDetail {
  name: string
  nameEn: string
  description: string
  note?: string
}

interface PrintItineraryData {
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

interface PrintItineraryFormProps {
  data: PrintItineraryData
  onChange: (data: PrintItineraryData) => void
}

export function PrintItineraryForm({ data, onChange }: PrintItineraryFormProps) {
  const { items: countries } = useCountries()
  const { items: cities } = useCities()

  // SWR 自動載入國家和城市資料

  const updateField = <K extends keyof PrintItineraryData>(
    field: K,
    value: PrintItineraryData[K]
  ) => {
    onChange({ ...data, [field]: value })
  }

  // 當選擇城市時，自動設定封面圖片
  const handleCityChange = (cityName: string) => {
    updateField('city', cityName)

    const selectedCity = cities.find(c => c.name === cityName)
    if (selectedCity) {
      // 使用 primary_image 來決定使用哪張圖片
      const primaryImage =
        selectedCity.primary_image === 2
          ? selectedCity.background_image_url_2
          : selectedCity.background_image_url

      if (primaryImage) {
        updateField('coverImage', primaryImage)
      }
    }
  }

  return (
    <div className="space-y-6 p-6">
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
                  <SelectValue placeholder={ITINERARY_LABELS.SELECT_8015} />
                </SelectTrigger>
                <SelectContent>
                  {countries
                    .filter(c => c.is_active)
                    .sort((a, b) => a.display_order - b.display_order)
                    .map(country => (
                      <SelectItem key={country.id} value={country.name}>
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
                  <SelectValue placeholder={ITINERARY_LABELS.SELECT_240} />
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
                價格 (不含NT$和起)
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
          <h3 className="text-base font-bold text-morandi-primary">
            {ITINERARY_LABELS.LABEL_2780}
          </h3>
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
            className="h-7 text-xs"
          >
            <Plus size={14} className="mr-1" />
            {ITINERARY_LABELS.ADD_2985}
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
                    placeholder={ITINERARY_LABELS.LABEL_1347}
                    className="text-xs h-8"
                  />
                  <InputIME
                    value={day.meals.lunch}
                    onChange={value => {
                      const newSchedule = [...data.dailySchedule]
                      newSchedule[idx].meals.lunch = value
                      updateField('dailySchedule', newSchedule)
                    }}
                    placeholder={ITINERARY_LABELS.LABEL_8515}
                    className="text-xs h-8"
                  />
                  <InputIME
                    value={day.meals.dinner}
                    onChange={value => {
                      const newSchedule = [...data.dailySchedule]
                      newSchedule[idx].meals.dinner = value
                      updateField('dailySchedule', newSchedule)
                    }}
                    placeholder={ITINERARY_LABELS.LABEL_8227}
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
                  <TimeInput
                    value={option.outbound.time}
                    onChange={value => {
                      const newOptions = [...data.flightOptions]
                      newOptions[idx].outbound.time = value
                      updateField('flightOptions', newOptions)
                    }}
                    placeholder={ITINERARY_LABELS.LABEL_5706}
                    className="text-xs h-7"
                  />
                  <TimeInput
                    value={option.outbound.arrivalTime}
                    onChange={value => {
                      const newOptions = [...data.flightOptions]
                      newOptions[idx].outbound.arrivalTime = value
                      updateField('flightOptions', newOptions)
                    }}
                    placeholder={ITINERARY_LABELS.LABEL_749}
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
                  <TimeInput
                    value={option.return.time}
                    onChange={value => {
                      const newOptions = [...data.flightOptions]
                      newOptions[idx].return.time = value
                      updateField('flightOptions', newOptions)
                    }}
                    placeholder={ITINERARY_LABELS.LABEL_5706}
                    className="text-xs h-7"
                  />
                  <TimeInput
                    value={option.return.arrivalTime}
                    onChange={value => {
                      const newOptions = [...data.flightOptions]
                      newOptions[idx].return.arrivalTime = value
                      updateField('flightOptions', newOptions)
                    }}
                    placeholder={ITINERARY_LABELS.LABEL_749}
                    className="text-xs h-7"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 行程特色 */}
      <section>
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-morandi-container">
          <h3 className="text-base font-bold text-morandi-primary">
            {ITINERARY_LABELS.LABEL_6890}
          </h3>
          <Button
            onClick={() => {
              updateField('highlightSpots', [
                ...data.highlightSpots,
                { name: '', nameEn: '', tags: ['特色景點'], description: '' },
              ])
            }}
            size="sm"
            className="h-7 text-xs"
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
              <textarea
                value={spot.description}
                onChange={e => {
                  const newSpots = [...data.highlightSpots]
                  newSpots[idx].description = e.target.value
                  updateField('highlightSpots', newSpots)
                }}
                placeholder={ITINERARY_LABELS.LABEL_1700}
                className="w-full text-xs border border-border rounded-md p-2 min-h-[50px]"
              />
            </div>
          ))}
        </div>
      </section>

      {/* 景點介紹 */}
      <section>
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-morandi-container">
          <h3 className="text-base font-bold text-morandi-primary">
            {ITINERARY_LABELS.LABEL_4014}
          </h3>
          <Button
            onClick={() => {
              updateField('sights', [...data.sights, { name: '', nameEn: '', description: '' }])
            }}
            size="sm"
            className="h-7 text-xs"
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
              <textarea
                value={sight.description}
                onChange={e => {
                  const newSights = [...data.sights]
                  newSights[idx].description = e.target.value
                  updateField('sights', newSights)
                }}
                placeholder={ITINERARY_LABELS.LABEL_806}
                className="w-full text-xs border border-border rounded-md p-2 min-h-[60px]"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
