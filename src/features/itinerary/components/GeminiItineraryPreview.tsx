'use client'

import React, { useState } from 'react'
import {
  MapPin,
  Plane,
  Calendar,
  Utensils,
  Hotel,
  Coffee,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ITINERARY_LABELS } from './constants/labels'
import { sanitizeCss } from '@/lib/utils/sanitize'

// 簡化的 CSS 樣式（移除光暈和流動效果）
const timelineStyles = ``

// 型別定義
interface DailyScheduleItem {
  day: string
  route: string
  meals: { breakfast: string; lunch: string; dinner: string }
  accommodation: string
  highlights?: string[] // 當日亮點景點
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

interface GeminiItineraryData {
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

interface GeminiItineraryPreviewProps {
  data: Partial<GeminiItineraryData>
}

// 亮點卡片子組件
function HighlightCard({ spot, totalCount }: { spot: HighlightSpot; totalCount: number }) {
  return (
    <div
      className={cn(
        'group relative bg-[#FAFAF8] rounded-2xl overflow-hidden',
        'border border-morandi-container hover:border-morandi-gold/50',
        'shadow-sm hover:shadow-lg transition-all duration-500',
        'cursor-pointer h-full',
        // 單一項目時橫向排列
        totalCount === 1 && 'md:flex md:flex-row'
      )}
    >
      {/* Image Container */}
      <div
        className={cn(
          'relative overflow-hidden',
          totalCount === 1 ? 'h-64 md:h-72 md:w-1/2' : 'h-48'
        )}
      >
        {spot.imageUrl ? (
          <img
            src={spot.imageUrl}
            alt={spot.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#9fa68f]/30 to-morandi-gold/30 flex items-center justify-center">
            <Sparkles size={40} className="text-morandi-gold/50" />
          </div>
        )}
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-morandi-primary/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Tags on Image */}
        {spot.tags && spot.tags.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {spot.tags.slice(0, 2).map((tag, i) => (
              <span
                key={i}
                className="bg-morandi-gold text-morandi-primary text-[10px] font-bold px-2.5 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          'p-5',
          totalCount === 1 && 'md:w-1/2 md:flex md:flex-col md:justify-center md:p-6'
        )}
      >
        <h3 className="font-bold text-morandi-primary text-lg mb-1 group-hover:text-morandi-gold transition-colors">
          {spot.name || '景點名稱'}
        </h3>
        {spot.nameEn && (
          <p className="text-[10px] text-morandi-muted mb-3 tracking-wider uppercase">{spot.nameEn}</p>
        )}
        <p
          className={cn(
            'text-sm text-[#6b6660] leading-relaxed',
            totalCount === 1 ? 'line-clamp-5' : 'line-clamp-2'
          )}
        >
          {spot.description || '精彩景點等待探索'}
        </p>
      </div>
    </div>
  )
}

export function GeminiItineraryPreview({ data }: GeminiItineraryPreviewProps) {
  const [expandedSights, setExpandedSights] = useState<Set<number>>(new Set())

  // Fallback for missing data
  const safeData = {
    ...{
      highlightSpots: [],
      flightOptions: [],
      dailySchedule: [],
      sights: [],
    },
    ...data,
  }

  const days = safeData.dailySchedule.length

  // 切換景點展開狀態
  const toggleSightExpand = (index: number) => {
    setExpandedSights(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  // 根據亮點數量決定佈局 - 確保沒有空格
  const getHighlightLayout = (count: number) => {
    // 1個：置中大卡片
    if (count === 1) return 'grid-cols-1 max-w-xl mx-auto'
    // 2個：兩欄
    if (count === 2) return 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto'
    // 3個：三欄
    if (count === 3) return 'grid-cols-1 md:grid-cols-3'
    // 4個：兩欄兩排
    if (count === 4) return 'grid-cols-1 md:grid-cols-2'
    // 5個：特殊處理 - 上面3個下面2個（用 flex 處理）
    if (count === 5) return 'highlights-layout-5'
    // 6個：三欄兩排
    if (count === 6) return 'grid-cols-1 md:grid-cols-3'
    // 7個以上：三欄自動換行
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
  }

  return (
    <div className="bg-[#FAFAF8] min-h-full font-sans">
      {/* 注入動畫樣式 */}
      <style dangerouslySetInnerHTML={{ __html: sanitizeCss(timelineStyles) }} />
      {/* ==================== Hero Section (優化版) ==================== */}
      <section className="relative h-[480px] overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: safeData.coverImage
              ? `url('${safeData.coverImage}')`
              : 'linear-gradient(135deg, #667a6e 0%, #8b9d83 50%, #c9aa7c 100%)',
          }}
        />
        {/* Elegant Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-morandi-primary/90 via-[#3a3633]/40 to-transparent" />

        {/* Subtle Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />

        {/* Content */}
        <div className="relative h-full flex flex-col justify-end p-8 md:p-12 text-white max-w-5xl mx-auto">
          {/* Brand Tag */}
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 bg-morandi-gold text-morandi-primary text-xs font-bold px-5 py-2 rounded-full tracking-wider">
              CORNER TRAVEL
            </span>
          </div>

          {/* Tagline */}
          {safeData.tagline && (
            <p className="text-morandi-gold text-sm md:text-base font-medium mb-2 tracking-wide">
              {safeData.tagline}
            </p>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-5xl font-bold mb-3 tracking-wide leading-tight">
            {safeData.title || '探索世界的美好'}
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-white/90 mb-6 whitespace-pre-line max-w-2xl leading-relaxed font-light">
            {safeData.subtitle || '每一次旅行，都是一場心靈的冒險'}
          </p>

          {/* Meta Info Bar */}
          <div className="flex flex-wrap items-center gap-6 text-sm">
            {safeData.country && (
              <div className="flex items-center gap-2 bg-card/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <MapPin size={16} className="text-morandi-gold" />
                <span>
                  {safeData.country} · {safeData.city}
                </span>
              </div>
            )}
            {days > 0 && (
              <div className="flex items-center gap-2 bg-card/10 backdrop-blur-sm px-4 py-2 rounded-full">
                <Calendar size={16} className="text-morandi-gold" />
                <span>
                  {days} 天 {Math.max(0, days - 1)} 夜
                </span>
              </div>
            )}
            {safeData.price && (
              <div className="flex items-center gap-2 bg-morandi-gold text-morandi-primary px-5 py-2 rounded-full font-bold">
                <span>NT$ {safeData.price}</span>
                <span className="font-normal text-morandi-primary/70 text-xs">
                  {safeData.priceNote || '起'}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ==================== Highlights Section (響應式佈局) ==================== */}
      {safeData.highlightSpots.length > 0 && (
        <section className="py-16 px-6 bg-card">
          <div className="max-w-5xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-12">
              <p className="text-xs text-morandi-gold tracking-[0.3em] mb-2 font-medium uppercase">
                Highlights
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-morandi-primary">
                {ITINERARY_LABELS.LABEL_3969}
              </h2>
              <div className="w-16 h-1 bg-gradient-to-r from-transparent via-morandi-gold to-transparent mx-auto mt-4" />
            </div>

            {/* 根據數量渲染不同佈局 */}
            {(() => {
              const count = safeData.highlightSpots.length
              const layout = getHighlightLayout(count)

              // 5 個的特殊佈局：上面 3 個 + 下面 2 個置中
              if (layout === 'highlights-layout-5') {
                return (
                  <div className="space-y-6">
                    {/* 上排 3 個 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {safeData.highlightSpots.slice(0, 3).map((spot, index) => (
                        <HighlightCard key={index} spot={spot} totalCount={count} />
                      ))}
                    </div>
                    {/* 下排 2 個置中 */}
                    <div className="flex justify-center gap-6">
                      {safeData.highlightSpots.slice(3, 5).map((spot, index) => (
                        <div key={index + 3} className="w-full md:w-[calc(33.333%-8px)]">
                          <HighlightCard spot={spot} totalCount={count} />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }

              // 其他數量使用 grid
              return (
                <div className={cn('grid gap-6', layout)}>
                  {safeData.highlightSpots.map((spot, index) => (
                    <HighlightCard key={index} spot={spot} totalCount={count} />
                  ))}
                </div>
              )
            })()}
          </div>
        </section>
      )}

      {/* ==================== Daily Itinerary Section (時間軸 + DAY 標籤) ==================== */}
      {safeData.dailySchedule.length > 0 && (
        <section className="py-16 px-6 bg-[#FAFAF8]">
          <div className="max-w-5xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-12">
              <p className="text-xs text-morandi-green tracking-[0.3em] mb-2 font-medium uppercase">
                Itinerary
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-morandi-primary">
                {ITINERARY_LABELS.LABEL_2780}
              </h2>
              <div className="w-16 h-1 bg-gradient-to-r from-transparent via-[#9fa68f] to-transparent mx-auto mt-4" />
            </div>

            {/* Timeline Style Days */}
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-morandi-gold via-[#9fa68f] to-[#c08374] rounded-full" />

              {/* Day Items */}
              <div className="space-y-8">
                {safeData.dailySchedule.map((day, index) => {
                  // 解析 day 字串，例如 "1" -> "DAY 1"
                  const dayNumber = day.day.replace(/\D/g, '') || String(index + 1)

                  return (
                    <div key={index} className="relative pl-[72px] md:pl-[80px]">
                      {/* Day Badge */}
                      <div className="absolute left-0 top-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-morandi-gold to-[#b8996b] flex items-center justify-center text-white shadow-md">
                          <div className="text-center leading-none">
                            <div className="text-[7px] font-semibold tracking-wider opacity-90">
                              DAY
                            </div>
                            <div className="text-base font-bold">{dayNumber}</div>
                          </div>
                        </div>
                      </div>

                      {/* Day Content Card */}
                      <div className="bg-card rounded-2xl overflow-hidden border border-morandi-container hover:border-morandi-gold/40 transition-all duration-300 shadow-sm hover:shadow-md">
                        {/* Route Header */}
                        <div className="p-6 pb-4 border-b border-[#f0ede8]">
                          <h3 className="text-lg md:text-xl font-bold text-morandi-primary leading-relaxed">
                            {day.route || '待規劃行程路線'}
                          </h3>
                        </div>

                        {/* Meals & Hotel */}
                        <div className="p-6 pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Meals Card */}
                            <div className="bg-[#FAFAF8] rounded-xl p-4">
                              <div className="flex items-center gap-2 text-morandi-gold mb-3">
                                <Utensils size={16} />
                                <span className="font-bold text-sm">
                                  {ITINERARY_LABELS.LABEL_9126}
                                </span>
                              </div>
                              <div className="space-y-2.5">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="flex items-center gap-2 text-morandi-secondary">
                                    <Coffee size={14} className="text-morandi-gold/60" />
                                    {ITINERARY_LABELS.LABEL_1347}
                                  </span>
                                  <span className="text-morandi-primary font-medium">
                                    {day.meals.breakfast || '-'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="flex items-center gap-2 text-morandi-secondary">
                                    <Sun size={14} className="text-morandi-gold/60" />
                                    {ITINERARY_LABELS.LABEL_8515}
                                  </span>
                                  <span className="text-morandi-primary font-medium">
                                    {day.meals.lunch || '-'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="flex items-center gap-2 text-morandi-secondary">
                                    <Moon size={14} className="text-morandi-gold/60" />
                                    {ITINERARY_LABELS.LABEL_8227}
                                  </span>
                                  <span className="text-morandi-primary font-medium">
                                    {day.meals.dinner || '-'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Hotel Card */}
                            <div className="bg-[#FAFAF8] rounded-xl p-4">
                              <div className="flex items-center gap-2 text-morandi-green mb-3">
                                <Hotel size={16} />
                                <span className="font-bold text-sm">
                                  {ITINERARY_LABELS.LABEL_9617}
                                </span>
                              </div>
                              <p className="text-morandi-primary text-sm font-medium leading-relaxed">
                                {day.accommodation || '溫暖的家'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==================== Sights Detail Section (可展開式) ==================== */}
      {safeData.sights.length > 0 && (
        <section className="py-16 px-6 bg-card">
          <div className="max-w-5xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-12">
              <p className="text-xs text-morandi-red tracking-[0.3em] mb-2 font-medium uppercase">
                Attractions
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-morandi-primary">
                {ITINERARY_LABELS.LABEL_4014}
              </h2>
              <div className="w-16 h-1 bg-gradient-to-r from-transparent via-[#c08374] to-transparent mx-auto mt-4" />
            </div>

            {/* Sights List - 晴日風格圖文排版 */}
            <div className="space-y-8">
              {safeData.sights.map((sight, index) => {
                const isExpanded = expandedSights.has(index)
                const isLongDescription = (sight.description?.length || 0) > 120

                return (
                  <div
                    key={index}
                    className={cn(
                      'group bg-[#FAFAF8] rounded-2xl overflow-hidden',
                      'border border-morandi-container',
                      'shadow-sm hover:shadow-lg transition-all duration-300',
                      // 交錯排列
                      index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse',
                      'flex flex-col md:flex'
                    )}
                  >
                    {/* Image - 晴日風格大圖 */}
                    <div className="md:w-2/5 h-64 md:h-auto relative overflow-hidden flex-shrink-0">
                      {sight.imageUrl ? (
                        <img
                          src={sight.imageUrl}
                          alt={sight.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#e8e5e0] to-[#d8d5d0] flex items-center justify-center">
                          <MapPin size={56} strokeWidth={1} className="text-morandi-gold/40" />
                        </div>
                      )}
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-morandi-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>

                    {/* Content */}
                    <div className="md:w-3/5 p-6 md:p-8 flex flex-col justify-center">
                      {/* Title */}
                      <h3 className="text-xl md:text-2xl font-bold text-morandi-primary mb-1 group-hover:text-morandi-red transition-colors">
                        {sight.name || '景點名稱'}
                      </h3>
                      {sight.nameEn && (
                        <p className="text-sm text-morandi-gold mb-4 tracking-wider">{sight.nameEn}</p>
                      )}

                      {/* Description with expand/collapse */}
                      <div className="relative">
                        <p
                          className={cn(
                            'text-[#6b6660] leading-relaxed text-sm md:text-base transition-all duration-300',
                            !isExpanded && isLongDescription && 'line-clamp-3'
                          )}
                        >
                          {sight.description || '等待探索這個美麗的地方...'}
                        </p>

                        {/* Expand/Collapse Button */}
                        {isLongDescription && (
                          <button
                            onClick={() => toggleSightExpand(index)}
                            className="mt-3 flex items-center gap-1 text-morandi-gold hover:text-morandi-gold-hover text-sm font-medium transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                <span>{ITINERARY_LABELS.LABEL_5509}</span>
                                <ChevronUp size={16} />
                              </>
                            ) : (
                              <>
                                <span>{ITINERARY_LABELS.LABEL_4589}</span>
                                <ChevronDown size={16} />
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Note */}
                      {sight.note && (
                        <div className="mt-4 pt-4 border-t border-morandi-container">
                          <p className="text-xs text-[#9a958f] italic flex items-start gap-2">
                            <span className="text-morandi-gold">✦</span>
                            {sight.note}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ==================== Flight Info Section ==================== */}
      {safeData.flightOptions && safeData.flightOptions.length > 0 && (
        <section className="py-16 px-6 bg-[#FAFAF8]">
          <div className="max-w-5xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-12">
              <p className="text-xs text-morandi-secondary tracking-[0.3em] mb-2 font-medium uppercase">
                Flight Info
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-morandi-primary">
                {ITINERARY_LABELS.LABEL_5074}
              </h2>
              <div className="w-16 h-1 bg-gradient-to-r from-transparent via-[#8b8680] to-transparent mx-auto mt-4" />
            </div>

            {/* Flight Cards */}
            <div className="space-y-6">
              {safeData.flightOptions.map((flight, index) => (
                <div
                  key={index}
                  className="bg-card rounded-2xl overflow-hidden border border-morandi-container shadow-sm"
                >
                  {/* Airline Header */}
                  <div className="px-6 py-4 bg-gradient-to-r from-morandi-primary to-[#4a4643] flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-morandi-gold flex items-center justify-center">
                      <Plane size={18} className="text-morandi-primary" />
                    </div>
                    <span className="font-bold text-white text-lg">{flight.airline}</span>
                  </div>

                  {/* Flights Grid */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Outbound */}
                      <div className="bg-[#FAFAF8] rounded-xl p-5">
                        <div className="flex items-center gap-2 text-morandi-gold font-bold text-sm mb-5">
                          <Plane size={14} />
                          {ITINERARY_LABELS.LABEL_7790}
                          <span className="ml-auto text-morandi-secondary font-normal">
                            {flight.outbound.code}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-morandi-primary">
                              {flight.outbound.time || '--:--'}
                            </div>
                            <div className="text-sm text-morandi-gold font-bold mt-1">
                              {flight.outbound.fromCode || 'TPE'}
                            </div>
                            <div className="text-xs text-morandi-secondary">{flight.outbound.from}</div>
                          </div>
                          <div className="flex-1 mx-6 flex flex-col items-center gap-2">
                            <div className="w-full flex items-center">
                              <div className="w-2 h-2 rounded-full bg-morandi-gold" />
                              <div className="flex-1 border-t-2 border-dashed border-morandi-gold/50" />
                              <Plane size={20} className="mx-2 text-morandi-gold" />
                              <div className="flex-1 border-t-2 border-dashed border-morandi-gold/50" />
                              <div className="w-2 h-2 rounded-full bg-morandi-gold" />
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-morandi-primary">
                              {flight.outbound.arrivalTime || '--:--'}
                            </div>
                            <div className="text-sm text-morandi-gold font-bold mt-1">
                              {flight.outbound.toCode || '---'}
                            </div>
                            <div className="text-xs text-morandi-secondary">{flight.outbound.to}</div>
                          </div>
                        </div>
                      </div>

                      {/* Return */}
                      <div className="bg-[#FAFAF8] rounded-xl p-5">
                        <div className="flex items-center gap-2 text-morandi-green font-bold text-sm mb-5">
                          <Plane size={14} className="rotate-180" />
                          {ITINERARY_LABELS.LABEL_2327}
                          <span className="ml-auto text-morandi-secondary font-normal">
                            {flight.return.code}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-morandi-primary">
                              {flight.return.time || '--:--'}
                            </div>
                            <div className="text-sm text-morandi-green font-bold mt-1">
                              {flight.return.fromCode || '---'}
                            </div>
                            <div className="text-xs text-morandi-secondary">{flight.return.from}</div>
                          </div>
                          <div className="flex-1 mx-6 flex flex-col items-center gap-2">
                            <div className="w-full flex items-center">
                              <div className="w-2 h-2 rounded-full bg-morandi-green" />
                              <div className="flex-1 border-t-2 border-dashed border-morandi-green/50" />
                              <Plane size={20} className="mx-2 text-morandi-green rotate-180" />
                              <div className="flex-1 border-t-2 border-dashed border-morandi-green/50" />
                              <div className="w-2 h-2 rounded-full bg-morandi-green" />
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-3xl font-bold text-morandi-primary">
                              {flight.return.arrivalTime || '--:--'}
                            </div>
                            <div className="text-sm text-morandi-green font-bold mt-1">
                              {flight.return.toCode || 'TPE'}
                            </div>
                            <div className="text-xs text-morandi-secondary">{flight.return.to}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==================== Footer ==================== */}
      <footer className="py-12 px-6 bg-morandi-primary">
        <div className="max-w-5xl mx-auto text-center">
          <div className="mb-4">
            <span className="text-morandi-gold font-bold text-lg tracking-[0.2em]">CORNER TRAVEL</span>
          </div>
          <p className="text-white/50 text-sm mb-2">{ITINERARY_LABELS.LABEL_9031}</p>
          <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-morandi-gold/50 to-transparent mx-auto mt-6 mb-6" />
          <p className="text-white/30 text-xs">{ITINERARY_LABELS.LABEL_5599}</p>
        </div>
      </footer>
    </div>
  )
}
