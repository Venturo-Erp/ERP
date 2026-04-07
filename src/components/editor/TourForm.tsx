'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { TourFormData } from './tour-form/types'
import { useRegionData } from './tour-form/hooks/useRegionData'
import { useTourFormHandlers } from './tour-form/hooks/useTourFormHandlers'
import { CoverInfoSection } from './tour-form/sections/CoverInfoSection'
// CountriesSection 已移除 - 景點選擇器現在可以直接選所有國家
import { FlightInfoSection } from './tour-form/sections/FlightInfoSection'
import { FeaturesSection } from './tour-form/sections/FeaturesSection'
import { LeaderMeetingSection } from './tour-form/sections/LeaderMeetingSection'
import { HotelSection } from './tour-form/sections/HotelSection'
import { DailyItinerarySection } from './tour-form/sections/DailyItinerarySection'
import { PricingDetailsSection } from './tour-form/sections/PricingDetailsSection'
import { PriceTiersSection } from './tour-form/sections/PriceTiersSection'
import { FAQSection } from './tour-form/sections/FAQSection'
import { NoticesPolicySection } from './tour-form/sections/NoticesPolicySection'
import {
  Image,
  Plane,
  Star,
  MapPin,
  Users,
  Building2,
  DollarSign,
  HelpCircle,
  AlertCircle,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TierPricing } from '@/stores/types/quote.types'
import { COMP_EDITOR_LABELS } from './constants/labels'

interface TourFormProps {
  data: TourFormData
  onChange: (data: TourFormData) => void
  quoteTierPricings?: TierPricing[]
  hasLinkedQuote?: boolean // 是否有關聯報價單（用於鎖定住宿編輯）
}

// 導覽項目配置
const navItems = [
  { id: 'section-cover', label: COMP_EDITOR_LABELS.封面, icon: Image },
  // { id: 'section-flight', label: COMP_EDITOR_LABELS.航班, icon: Plane }, // 建團時不需要航班資訊，訂票時再輸入
  { id: 'section-features', label: COMP_EDITOR_LABELS.特色, icon: Star },
  { id: 'section-itinerary', label: COMP_EDITOR_LABELS.行程, icon: MapPin, hasDayNav: true },
  { id: 'section-leader', label: COMP_EDITOR_LABELS.領隊, icon: Users },
  { id: 'section-hotel', label: COMP_EDITOR_LABELS.飯店, icon: Building2 },
  { id: 'section-pricing', label: COMP_EDITOR_LABELS.團費, icon: DollarSign },
  { id: 'section-faq', label: COMP_EDITOR_LABELS.問答, icon: HelpCircle },
  { id: 'section-notices', label: COMP_EDITOR_LABELS.須知, icon: AlertCircle },
]

// 計算 dayLabel 的函數 - 處理建議方案編號
function calculateDayLabels(itinerary: TourFormData['dailyItinerary']): string[] {
  if (!itinerary) return []
  const labels: string[] = []
  let currentDayNumber = 0
  let alternativeCount = 0

  for (const day of itinerary) {
    if (day.isAlternative) {
      alternativeCount++
      const suffix = String.fromCharCode(65 + alternativeCount) // B, C, D...
      labels.push(`D${currentDayNumber}-${suffix}`)
    } else {
      currentDayNumber++
      alternativeCount = 0
      labels.push(`D${currentDayNumber}`)
    }
  }

  return labels
}

export function TourForm({ data, onChange, quoteTierPricings, hasLinkedQuote }: TourFormProps) {
  const { user } = useAuthStore()
  const [activeSection, setActiveSection] = useState('section-cover')
  const [showDayNav, setShowDayNav] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 計算天數標籤
  const dayLabels = calculateDayLabels(data.dailyItinerary)

  // 行程備份（用於復原功能）
  const [itineraryBackup, setItineraryBackup] = useState<TourFormData['dailyItinerary'] | null>(
    null
  )

  const {
    selectedCountry,
    setSelectedCountry,
    setSelectedCountryCode,
    allDestinations,
    availableCities,
    countryNameToCode,
  } = useRegionData(data)

  const handlers = useTourFormHandlers(data, onChange, selectedCountry)

  // 監聽滾動來更新當前區塊
  useEffect(() => {
    // 找到實際的滾動容器（父元素）
    const scrollContainer = containerRef.current?.parentElement
    if (!scrollContainer) return

    const handleScroll = () => {
      const sections = navItems.map(item => document.getElementById(item.id))
      const containerRect = scrollContainer.getBoundingClientRect()

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i]
        if (section) {
          const rect = section.getBoundingClientRect()
          // 判斷 section 是否在可視範圍內（相對於 container 頂部 100px 內）
          if (rect.top <= containerRect.top + 100) {
            setActiveSection(navItems[i].id)
            break
          }
        }
      }
    }

    scrollContainer.addEventListener('scroll', handleScroll)
    return () => scrollContainer.removeEventListener('scroll', handleScroll)
  }, [])

  // 跳轉到指定區塊
  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId)
    const scrollContainer = containerRef.current?.parentElement
    if (section && scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect()
      const sectionRect = section.getBoundingClientRect()
      const offset = sectionRect.top - containerRect.top + scrollContainer.scrollTop - 60

      scrollContainer.scrollTo({
        top: offset,
        behavior: 'smooth',
      })
    }
  }

  return (
    <div ref={containerRef}>
      {/* 快速導覽列 */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-morandi-container/30 px-4 py-2">
        <div className="flex items-center gap-1 overflow-x-auto overflow-y-visible scrollbar-hide">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            const isItinerary = item.id === 'section-itinerary'
            const hasDays = dayLabels.length > 0

            // 行程區塊：特殊處理，有下拉選單
            if (isItinerary) {
              return (
                <div key={item.id} className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      hasDays ? setShowDayNav(!showDayNav) : scrollToSection(item.id)
                    }
                    className={cn(
                      'flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                      isActive || showDayNav
                        ? 'bg-morandi-gold text-white'
                        : 'bg-morandi-container/20 text-morandi-secondary hover:bg-morandi-container/40'
                    )}
                  >
                    <Icon size={12} />
                    {item.label}
                    {hasDays && (
                      <ChevronDown
                        size={10}
                        className={cn('transition-transform', showDayNav && 'rotate-180')}
                      />
                    )}
                  </button>

                  {/* 下拉選單 */}
                  {showDayNav && hasDays && (
                    <div className="absolute top-full left-0 mt-1 bg-card rounded-lg shadow-lg border border-morandi-container/30 p-2 z-50 min-w-[200px]">
                      <div className="grid grid-cols-5 gap-1">
                        {dayLabels.map((label, index) => {
                          const day = data.dailyItinerary?.[index]
                          const isAlternative = day?.isAlternative
                          return (
                            <button
                              key={index}
                              type="button"
                              onClick={() => {
                                scrollToSection(`day-${index}`)
                                setShowDayNav(false)
                              }}
                              className={cn(
                                'px-2 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-all text-center',
                                isAlternative
                                  ? 'bg-morandi-secondary/10 text-morandi-secondary hover:bg-morandi-secondary/20'
                                  : 'bg-morandi-gold/10 text-morandi-gold hover:bg-morandi-gold/20'
                              )}
                              title={day?.title || `第 ${index + 1} 天`}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all',
                  isActive
                    ? 'bg-morandi-gold text-white'
                    : 'bg-morandi-container/20 text-morandi-secondary hover:bg-morandi-container/40'
                )}
              >
                <Icon size={12} />
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-6">
        {/* 封面設定 */}
        <div id="section-cover" className="px-3">
          <div className="mb-3">
            <h2 className="text-lg font-bold text-morandi-primary">封面設定</h2>
            <p className="text-sm text-morandi-secondary mt-1">設定行程封面樣式、標題、圖片等</p>
          </div>
          <CoverInfoSection
            data={data}
            user={user}
            selectedCountry={selectedCountry}
            setSelectedCountry={setSelectedCountry}
            setSelectedCountryCode={setSelectedCountryCode}
            allDestinations={allDestinations}
            availableCities={availableCities}
            countryNameToCode={countryNameToCode}
            updateField={handlers.updateField}
            updateCity={handlers.updateCity}
            onChange={onChange}
          />
        </div>

          {/* 航班資訊 - 建團時不需要，訂票時再輸入 */}
          {/* <div id="section-flight">
            <FlightInfoSection
              data={data}
              updateFlightField={handlers.updateFlightField}
              updateFlightFields={handlers.updateFlightFields}
              updateField={handlers.updateField}
              compact={true}
              canUndoItinerary={itineraryBackup !== null && itineraryBackup.length > 0}
              onUndoItinerary={() => {
                if (itineraryBackup) {
                  onChange({ ...data, dailyItinerary: itineraryBackup })
                  setItineraryBackup(null)
                }
              }}
              onGenerateDailyItinerary={(days: number, departureDate: string) => {
                // 備份當前行程（用於復原）
                if (data.dailyItinerary && data.dailyItinerary.length > 0) {
                  setItineraryBackup([...data.dailyItinerary])
                }

                // 解析出發日期
                const parseDepartureDate = (dateStr: string): Date | null => {
                  if (!dateStr) return null
                  let parts: string[]
                  if (dateStr.includes('/')) {
                    parts = dateStr.split('/')
                  } else if (dateStr.includes('-')) {
                    parts = dateStr.split('-')
                  } else {
                    return null
                  }
                  if (parts.length === 3) {
                    const [year, month, day] = parts.map(Number)
                    return new Date(year, month - 1, day)
                  }
                  return null
                }

                const baseDepartureDate = parseDepartureDate(departureDate)
                if (!baseDepartureDate) return

                // 計算每天的日期
                const formatDate = (date: Date): string => {
                  const year = date.getFullYear()
                  const month = String(date.getMonth() + 1).padStart(2, '0')
                  const day = String(date.getDate()).padStart(2, '0')
                  return `${year}/${month}/${day}`
                }

                // 生成空白的每日行程
                const newDailyItinerary = Array.from({ length: days }, (_, i) => {
                  const dayDate = new Date(baseDepartureDate)
                  dayDate.setDate(dayDate.getDate() + i)
                  return {
                    dayLabel: `Day ${i + 1}`,
                    date: formatDate(dayDate),
                    title: '',
                    highlight: '',
                    description: '',
                    activities: [],
                    recommendations: [],
                    meals: { breakfast: '', lunch: '', dinner: '' },
                    accommodation: '',
                    images: [],
                  }
                })

                onChange({ ...data, dailyItinerary: newDailyItinerary })
              }}
            />
          </div> */}


        </div>

        {/* 每日行程 */}
        {/* 行程特色展開內容 */}
        <div className="mt-6 pt-6 px-3 border-t border-morandi-container/30">
          <FeaturesSection
            data={data}
            updateField={handlers.updateField}
            addFeature={handlers.addFeature}
            updateFeature={handlers.updateFeature}
            removeFeature={handlers.removeFeature}
            reorderFeature={handlers.reorderFeature}
          />
        </div>

        {/* 逐日行程 */}
        <div id="section-itinerary" className="mt-6 pt-6 px-3 border-t border-morandi-container/30">
          <DailyItinerarySection
            data={data}
            updateField={handlers.updateField}
            addDailyItinerary={handlers.addDailyItinerary}
            updateDailyItinerary={handlers.updateDailyItinerary}
            removeDailyItinerary={handlers.removeDailyItinerary}
            swapDailyItinerary={handlers.swapDailyItinerary}
            addActivity={handlers.addActivity}
            updateActivity={handlers.updateActivity}
            removeActivity={handlers.removeActivity}
            addDayImage={handlers.addDayImage}
            updateDayImage={handlers.updateDayImage}
            removeDayImage={handlers.removeDayImage}
            addRecommendation={handlers.addRecommendation}
            updateRecommendation={handlers.updateRecommendation}
            removeRecommendation={handlers.removeRecommendation}
            isAccommodationLockedByQuote={hasLinkedQuote}
          />
        </div>

        {/* 領隊與集合資訊 */}
        <div id="section-leader" className="mt-6 pt-6 px-3 border-t border-morandi-container/30">
          <LeaderMeetingSection
            data={data}
            updateNestedField={handlers.updateNestedField}
            updateField={handlers.updateField}
          />
        </div>

        {/* 飯店資訊 */}
        <div id="section-hotel" className="mt-6 pt-6 px-3 border-t border-morandi-container/30">
          <HotelSection data={data} updateField={handlers.updateField} />
        </div>

        {/* 團費說明 */}
        <div id="section-pricing" className="mt-6 pt-6 px-3 border-t border-morandi-container/30 space-y-8">
          {/* 價格方案（4人、6人、8人包團） */}
          <PriceTiersSection
            data={data}
            onChange={onChange}
            quoteTierPricings={quoteTierPricings}
          />

          {/* 詳細團費（費用包含/不含） */}
          <PricingDetailsSection
            data={data}
            updateField={handlers.updateField}
            onChange={onChange}
          />
        </div>

        {/* 常見問題 */}
        <div id="section-faq" className="mt-6 pt-6 px-3 border-t border-morandi-container/30">
          <FAQSection data={data} onChange={onChange} />
        </div>

        {/* 提醒事項與取消政策 */}
        <div id="section-notices" className="mt-6 pt-6 px-3 border-t border-morandi-container/30">
          <NoticesPolicySection data={data} onChange={onChange} />
        </div>
      </div>
  )
}
