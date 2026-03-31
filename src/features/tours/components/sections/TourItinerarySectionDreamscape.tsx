'use client'

import Image from 'next/image'
import { MutableRefObject, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDateMonthDayEN } from '@/lib/utils/format-date'
import type {
  DailyItinerary as DailyItineraryType,
  TourPageData,
} from '@/features/tours/types/tour-display.types'

// Dreamscape 每日行程佈局風格
type DreamscapeDayLayout = 'blobLeft' | 'blobRight' | 'fullHero' | 'glassCard'

// Dreamscape 配色
const DREAM = {
  base: '#fdfbf7',
  lavender: '#e6e6fa',
  peach: '#ffe5b4',
  sky: '#e0f7fa',
  text: '#4a4a4a',
  accent: '#ff7f50',
  purple: '#9370db',
}

interface TourItinerarySectionDreamscapeProps {
  data: TourPageData
  viewMode: 'desktop' | 'mobile'
  activeDayIndex: number
  dayRefs: MutableRefObject<(HTMLDivElement | null)[]>
  handleDayNavigate: (index: number) => void
}

// 計算 dayLabel
function calculateDayLabels(itinerary: DailyItineraryType[]): string[] {
  const labels: string[] = []
  let currentDayNumber = 0
  let alternativeCount = 0

  for (let i = 0; i < itinerary.length; i++) {
    const day = itinerary[i]
    if (day.isAlternative) {
      alternativeCount++
      const suffix = String.fromCharCode(65 + alternativeCount)
      labels.push(`Day ${currentDayNumber}-${suffix}`)
    } else {
      currentDayNumber++
      alternativeCount = 0
      labels.push(`Day ${currentDayNumber}`)
    }
  }
  return labels
}

// 從 dayLabel 提取數字
function extractDayNumber(label: string): number {
  const match = label.match(/Day\s*(\d+)/i)
  return match ? parseInt(match[1], 10) : 1
}

// ============================================
// Layout 1: Blob Left (左圖右文)
// ============================================
function BlobLeftLayout({
  day,
  dayLabel,
  index,
  isMobile,
  dayRef,
}: {
  day: DailyItineraryType
  dayLabel: string
  index: number
  isMobile: boolean
  dayRef: (el: HTMLDivElement | null) => void
}) {
  const dayNum = extractDayNumber(dayLabel)
  const image = day.activities?.[0]?.image || day.images?.[0]
  const imageUrl = typeof image === 'string' ? image : image?.url

  return (
    <div
      ref={dayRef}
      className={`flex flex-col lg:flex-row w-full min-h-[70vh] relative overflow-hidden group ${isMobile ? 'py-8' : 'py-0'}`}
    >
      {/* 左側文字 */}
      <div
        className={`lg:w-[40%] ${isMobile ? 'px-4' : 'p-12 lg:p-24'} flex flex-col justify-center bg-card/20 backdrop-blur-sm relative z-10 order-2 lg:order-1`}
      >
        <div
          className="absolute top-10 left-10 text-xs font-bold tracking-[0.5em] uppercase"
          style={{ color: DREAM.purple, fontFamily: "'Cormorant Garamond', serif" }}
        >
          Chapter {dayNum}
        </div>

        <h2
          className={`${isMobile ? 'text-4xl' : 'text-6xl lg:text-7xl'} mt-4 mb-8`}
          style={{ fontFamily: "'Cinzel', serif", color: DREAM.text }}
        >
          {day.title?.split(' ')[0] || `Day ${dayNum}`}
          <span
            className={`block ${isMobile ? 'text-3xl ml-4' : 'text-5xl ml-8'} italic mt-2`}
            style={{ fontFamily: "'La Belle Aurore', cursive", color: DREAM.purple }}
          >
            {day.title?.split(' ').slice(1).join(' ') || 'Journey'}
          </span>
        </h2>

        <p
          className={`${isMobile ? 'text-base' : 'text-xl'} leading-loose mb-8 max-w-md`}
          style={{ fontFamily: "'Cormorant Garamond', serif", color: `${DREAM.text}cc` }}
        >
          {day.description || day.highlight || '探索這一天的精彩行程...'}
        </p>

        {/* 餐食 & 住宿 */}
        <div className="flex gap-4 items-center">
          {day.meals?.dinner && day.meals.dinner !== '敬請自理' && (
            <div
              className="h-12 w-12 rounded-full border flex items-center justify-center"
              style={{ borderColor: `${DREAM.text}33` }}
            >
              <span style={{ color: DREAM.accent }}>🍽️</span>
            </div>
          )}
          {day.accommodation && (
            <>
              <div
                className="h-12 w-12 rounded-full border flex items-center justify-center"
                style={{ borderColor: `${DREAM.text}33` }}
              >
                <span style={{ color: DREAM.accent }}>🏨</span>
              </div>
              <span
                className="text-xs uppercase tracking-widest ml-2"
                style={{ color: `${DREAM.text}80`, fontFamily: "'Space Mono', monospace" }}
              >
                {day.accommodation}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 右側圖片 (Blob 形狀) */}
      <div
        className="lg:w-[60%] relative min-h-[50vh] lg:min-h-full order-1 lg:order-2 overflow-hidden shadow-[-20px_0_40px_rgba(147,112,219,0.1)]"
        style={{
          clipPath: 'polygon(10% 0, 100% 0, 100% 100%, 0% 100%, 15% 50%)',
        }}
      >
        {imageUrl ? (
          <>
            <img
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-110"
              src={imageUrl}
              alt={day.title || ''}
            />
            <div
              className="absolute inset-0 mix-blend-overlay"
              style={{ backgroundColor: `${DREAM.purple}1a` }}
            />
          </>
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: DREAM.lavender }}
          >
            <span className="text-8xl opacity-30">🌸</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Layout 2: Blob Right (右圖左文，雙圖)
// ============================================
function BlobRightLayout({
  day,
  dayLabel,
  index,
  isMobile,
  dayRef,
}: {
  day: DailyItineraryType
  dayLabel: string
  index: number
  isMobile: boolean
  dayRef: (el: HTMLDivElement | null) => void
}) {
  const dayNum = extractDayNumber(dayLabel)
  const images =
    day.activities
      ?.map(a => a.image)
      .filter(Boolean)
      .slice(0, 2) || []
  const dateFormatted = day.date ? formatDateMonthDayEN(day.date) : ''

  return (
    <div
      ref={dayRef}
      className={`w-full ${isMobile ? 'py-12 px-4' : 'py-32 px-6 lg:px-12'} relative`}
      style={{ backgroundColor: `${DREAM.lavender}1a` }}
    >
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl -z-10"
        style={{ backgroundColor: `${DREAM.accent}0d` }}
      />

      <div className="max-w-[1800px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* 中間文字 */}
        <div
          className={`lg:col-span-4 ${isMobile ? '' : 'lg:col-start-5'} text-center relative z-20 py-12`}
        >
          <div
            className="inline-block border rounded-full px-6 py-2 mb-6 bg-card/40 backdrop-blur"
            style={{ borderColor: `${DREAM.text}33`, fontFamily: "'Space Mono', monospace" }}
          >
            <span className="text-xs tracking-[0.3em] uppercase">
              Day {String(dayNum).padStart(2, '0')} • {dateFormatted}
            </span>
          </div>

          <h2
            className={`${isMobile ? 'text-4xl' : 'text-5xl lg:text-7xl'} mb-6`}
            style={{ fontFamily: "'Cinzel', serif", color: DREAM.text }}
          >
            {day.title?.split(' ')[0] || 'Day'}
            <span
              className={`block ${isMobile ? 'text-3xl' : 'text-6xl'} mt-2`}
              style={{ fontFamily: "'La Belle Aurore', cursive", color: DREAM.accent }}
            >
              {day.title?.split(' ').slice(1).join(' ') || 'Adventure'}
            </span>
          </h2>

          <p
            className={`${isMobile ? 'text-base' : 'text-lg'} leading-relaxed mb-8`}
            style={{ fontFamily: "'Cormorant Garamond', serif", color: `${DREAM.text}b3` }}
          >
            {day.description || day.highlight || '精彩的一天等著你探索...'}
          </p>

          {day.meals?.dinner && day.meals.dinner !== '敬請自理' && (
            <button
              className="px-8 py-3 rounded-full text-white transition-colors duration-300"
              style={{
                backgroundColor: DREAM.text,
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic',
              }}
            >
              View Dining: {day.meals.dinner}
            </button>
          )}
        </div>

        {/* 左側圖片 */}
        {!isMobile && images[0] && (
          <div className="lg:col-span-3 lg:col-start-1 lg:row-start-1 h-[400px] relative transform hover:-translate-y-4 transition-transform duration-700">
            <div className="absolute inset-0 rounded-[50px] overflow-hidden rotate-[-3deg] shadow-lg">
              <Image className="object-cover" src={images[0]} alt="" fill />
            </div>
            {day.activities?.[0]?.title && (
              <div className="absolute -bottom-6 -right-6 p-4 rounded-xl z-10 rotate-3 bg-card/30 backdrop-blur-md border border-white/40 shadow-lg">
                <span
                  style={{ fontFamily: "'Cinzel', serif", fontSize: '1.5rem', color: DREAM.accent }}
                >
                  {day.activities[0].title}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 右側圖片 */}
        {!isMobile && images[1] && (
          <div className="lg:col-span-4 lg:col-start-9 lg:row-start-1 h-[500px] relative mt-24 transform hover:translate-y-4 transition-transform duration-700">
            <div className="absolute inset-0 rounded-t-full rounded-b-[200px] overflow-hidden rotate-[2deg] shadow-lg">
              <Image className="object-cover" src={images[1]} alt="" fill />
            </div>
            {day.activities?.[1]?.title && (
              <div className="absolute top-12 -left-12 p-6 rounded-full w-32 h-32 flex items-center justify-center z-10 animate-pulse bg-card/30 backdrop-blur-md border border-white/40 shadow-lg">
                <span
                  style={{
                    fontFamily: "'La Belle Aurore', cursive",
                    fontSize: '1.25rem',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {day.activities[1].title}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 手機版圖片 */}
        {isMobile && images.length > 0 && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {images.map((img, i) => (
              <div
                key={i}
                className="relative flex-shrink-0 w-64 h-48 rounded-2xl overflow-hidden shadow-lg"
              >
                {img && <Image className="object-cover" src={img} alt="" fill />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Layout 3: Full Hero (全幅英雄圖)
// ============================================
function FullHeroLayout({
  day,
  dayLabel,
  index,
  isMobile,
  dayRef,
}: {
  day: DailyItineraryType
  dayLabel: string
  index: number
  isMobile: boolean
  dayRef: (el: HTMLDivElement | null) => void
}) {
  const dayNum = extractDayNumber(dayLabel)
  const image = day.activities?.[0]?.image || day.images?.[0]
  const imageUrl = typeof image === 'string' ? image : image?.url

  return (
    <div
      ref={dayRef}
      className="w-full h-screen relative flex items-center justify-center overflow-hidden group"
    >
      {/* 背景圖 */}
      <div className="absolute inset-0 w-full h-full z-0">
        {imageUrl ? (
          <div
            className="w-full h-full bg-fixed bg-cover bg-center transition-transform duration-[5s] group-hover:scale-105"
            style={{ backgroundImage: `url('${imageUrl}')` }}
          />
        ) : (
          <div className="w-full h-full" style={{ backgroundColor: DREAM.sky }} />
        )}
        <div className="absolute inset-0 bg-black/20 mix-blend-multiply" />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top, ${DREAM.text}e6, transparent, ${DREAM.text}33)`,
          }}
        />
      </div>

      {/* 內容 */}
      <div className="relative z-10 text-center text-white max-w-4xl px-6">
        <span
          className={`block ${isMobile ? 'text-2xl' : 'text-4xl'} mb-4`}
          style={{ fontFamily: "'La Belle Aurore', cursive", color: DREAM.peach }}
        >
          Day {String(dayNum).padStart(2, '0')}
        </span>

        <h2
          className={`${isMobile ? 'text-5xl' : 'text-[5rem] lg:text-[10rem]'} leading-none mb-2 mix-blend-overlay drop-shadow-lg`}
          style={{
            fontFamily: "'Cinzel', serif",
            textShadow:
              '2px 2px 0px white, -2px -2px 0px white, 2px -2px 0px white, -2px 2px 0px white',
            color: 'transparent',
          }}
        >
          {day.title?.split(' ')[0] || 'Adventure'}
        </h2>

        <h3
          className={`${isMobile ? 'text-3xl' : 'text-4xl lg:text-6xl'} mb-12 -rotate-2`}
          style={{ fontFamily: "'La Belle Aurore', cursive", color: DREAM.peach }}
        >
          {day.title?.split(' ').slice(1).join(' ') || 'Awaits'}
        </h3>

        {/* 景點卡片 */}
        {day.activities && day.activities.length > 0 && (
          <div
            className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'md:grid-cols-2 gap-12'} text-left p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] border transition-colors bg-card/10 backdrop-blur-md border-white/20 hover:bg-card/20`}
            style={{ color: DREAM.text }}
          >
            {day.activities.slice(0, 2).map((activity, i) => (
              <div key={i}>
                <h4
                  className={`${isMobile ? 'text-xl' : 'text-2xl'} mb-4 border-b border-border pb-2`}
                  style={{ fontFamily: "'Cinzel', serif", borderColor: 'rgba(255,255,255,0.3)' }}
                >
                  {activity.title}
                </h4>
                <p
                  className={`${isMobile ? 'text-sm' : 'text-lg'}`}
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    color: 'rgba(255,255,255,0.8)',
                  }}
                >
                  {activity.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Layout 4: Glass Card (玻璃卡片)
// ============================================
function GlassCardLayout({
  days,
  dayLabels,
  startIndex,
  isMobile,
  dayRefs,
}: {
  days: DailyItineraryType[]
  dayLabels: string[]
  startIndex: number
  isMobile: boolean
  dayRefs: MutableRefObject<(HTMLDivElement | null)[]>
}) {
  const cardColors = [DREAM.purple, DREAM.accent, DREAM.text, DREAM.purple]

  return (
    <section
      className={`w-full ${isMobile ? 'py-12' : 'py-32'} overflow-hidden`}
      style={{ backgroundColor: DREAM.base }}
    >
      {/* 標題 */}
      <div
        className={`${isMobile ? 'px-4' : 'px-8 lg:px-24'} mb-16 flex items-end justify-between`}
      >
        <div>
          <span
            className="text-3xl block mb-2"
            style={{ fontFamily: "'La Belle Aurore', cursive", color: DREAM.purple }}
          >
            The Journey
          </span>
          <h2
            className={`${isMobile ? 'text-4xl' : 'text-6xl'}`}
            style={{ fontFamily: "'Cinzel', serif", color: DREAM.text }}
          >
            Continuing...
          </h2>
        </div>
      </div>

      {/* 卡片滾動區 */}
      <div
        className={`w-full overflow-x-auto ${isMobile ? 'pl-4' : 'pl-8 lg:pl-24'} pb-20`}
        style={{ scrollbarWidth: 'none' }}
      >
        <div className="flex gap-8 lg:gap-16 w-max items-center">
          {days.map((day, i) => {
            const actualIndex = startIndex + i
            const dayNum = extractDayNumber(dayLabels[actualIndex])
            const image = day.activities?.[0]?.image || day.images?.[0]
            const imageUrl = typeof image === 'string' ? image : image?.url
            const isLast = i === days.length - 1
            const cardColor = cardColors[i % cardColors.length]

            // 最後一天用圓形結束卡
            if (isLast) {
              return (
                <div
                  key={actualIndex}
                  ref={el => {
                    dayRefs.current[actualIndex] = el
                  }}
                  className={`${isMobile ? 'w-[200px] h-[200px]' : 'w-[300px] h-[300px]'} rounded-full flex flex-col items-center justify-center text-center text-white p-8 relative hover:scale-105 transition-transform duration-300 shadow-lg`}
                  style={{
                    background: `linear-gradient(to bottom right, ${DREAM.purple}, #4f46e5)`,
                  }}
                >
                  <div
                    className="absolute inset-0 rounded-full border-4 border-dashed animate-spin"
                    style={{ borderColor: 'rgba(255,255,255,0.2)', animationDuration: '40s' }}
                  />
                  <h4
                    className={`${isMobile ? 'text-2xl' : 'text-4xl'} mb-2`}
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    The End
                  </h4>
                  <div
                    className="text-sm opacity-80 mb-4"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    Day {String(dayNum).padStart(2, '0')}
                  </div>
                  <p
                    className={`${isMobile ? 'text-lg' : 'text-2xl'}`}
                    style={{ fontFamily: "'La Belle Aurore', cursive", color: DREAM.peach }}
                  >
                    Until next time...
                  </p>
                </div>
              )
            }

            return (
              <div
                key={actualIndex}
                ref={el => {
                  dayRefs.current[actualIndex] = el
                }}
                className={`${isMobile ? 'w-[280px]' : 'w-[350px] lg:w-[450px]'} aspect-[3/4] rounded-[3rem] p-8 flex flex-col relative group hover:-translate-y-4 transition-transform duration-500 bg-card/60 backdrop-blur-lg shadow-lg border border-white/60`}
              >
                {/* Day 標籤 */}
                <div
                  className="absolute top-6 right-6 px-4 py-1 rounded-full text-xs font-bold tracking-widest"
                  style={{ backgroundColor: `${cardColor}33`, color: cardColor }}
                >
                  DAY {String(dayNum).padStart(2, '0')}
                </div>

                {/* 圖片區 */}
                <div className="h-1/2 w-full rounded-2xl overflow-hidden mb-6 relative">
                  {imageUrl ? (
                    <img
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      src={imageUrl}
                      alt={day.title || ''}
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: `${DREAM.sky}80` }}
                    >
                      <span className="text-6xl opacity-50">🌟</span>
                    </div>
                  )}
                </div>

                {/* 圓形編號 */}
                <div
                  className={`absolute -top-6 right-8 ${isMobile ? 'w-16 h-16' : 'w-24 h-24'} rounded-full flex items-center justify-center text-white shadow-lg z-20 group-hover:rotate-0 transition-transform`}
                  style={{
                    backgroundColor: cardColor,
                    fontFamily: "'Cinzel', serif",
                    fontSize: isMobile ? '1.5rem' : '2rem',
                    transform: `rotate(${i % 2 === 0 ? 12 : -6}deg)`,
                  }}
                >
                  {String(dayNum).padStart(2, '0')}
                </div>

                {/* 標題 */}
                <h4
                  className={`${isMobile ? 'text-2xl' : 'text-3xl'} mb-3`}
                  style={{ fontFamily: "'Cinzel', serif", color: DREAM.text }}
                >
                  {day.title || `Day ${dayNum}`}
                </h4>

                {/* 描述 */}
                <p
                  className={`${isMobile ? 'text-sm' : 'text-lg'}`}
                  style={{ fontFamily: "'Cormorant Garamond', serif", color: `${DREAM.text}99` }}
                >
                  {day.description || day.highlight || '精彩行程等你探索...'}
                </p>
              </div>
            )
          })}

          {/* 右側留白 */}
          <div className="w-24" />
        </div>
      </div>
    </section>
  )
}

// ============================================
// 主組件
// ============================================
export function TourItinerarySectionDreamscape({
  data,
  viewMode,
  activeDayIndex,
  dayRefs,
  handleDayNavigate,
}: TourItinerarySectionDreamscapeProps) {
  const dailyItinerary = Array.isArray(data.dailyItinerary) ? data.dailyItinerary : []
  const dayLabels = calculateDayLabels(dailyItinerary)
  const isMobile = viewMode === 'mobile'

  // 將天數分組：找出 glassCard 連續區段
  const renderDays = () => {
    const elements: React.ReactNode[] = []
    let i = 0

    while (i < dailyItinerary.length) {
      const day = dailyItinerary[i]
      // 使用 dreamscapeLayout 欄位，預設根據索引自動分配
      const layout =
        (day as { dreamscapeLayout?: DreamscapeDayLayout }).dreamscapeLayout ||
        getDefaultLayout(i, dailyItinerary.length)

      if (layout === 'glassCard') {
        // 收集連續的 glassCard 天數
        const glassCardStart = i
        const glassCardDays: typeof dailyItinerary = []

        while (i < dailyItinerary.length) {
          const currentDay = dailyItinerary[i]
          const currentLayout =
            (currentDay as { dreamscapeLayout?: DreamscapeDayLayout }).dreamscapeLayout ||
            getDefaultLayout(i, dailyItinerary.length)
          if (currentLayout === 'glassCard') {
            glassCardDays.push(currentDay)
            i++
          } else {
            break
          }
        }

        elements.push(
          <GlassCardLayout
            key={`glass-${glassCardStart}`}
            days={glassCardDays}
            dayLabels={dayLabels}
            startIndex={glassCardStart}
            isMobile={isMobile}
            dayRefs={dayRefs}
          />
        )
      } else {
        // 單獨渲染其他佈局
        const LayoutComponent =
          {
            blobLeft: BlobLeftLayout,
            blobRight: BlobRightLayout,
            fullHero: FullHeroLayout,
          }[layout] || BlobLeftLayout

        elements.push(
          <LayoutComponent
            key={`day-${i}`}
            day={day}
            dayLabel={dayLabels[i]}
            index={i}
            isMobile={isMobile}
            dayRef={el => {
              dayRefs.current[i] = el
            }}
          />
        )
        i++
      }
    }

    return elements
  }

  return (
    <section
      id="itinerary"
      className="relative w-full"
      style={{
        backgroundColor: DREAM.base,
        backgroundImage: `
          radial-gradient(at 10% 10%, ${DREAM.sky}66 0px, transparent 50%),
          radial-gradient(at 90% 10%, ${DREAM.peach}66 0px, transparent 50%),
          radial-gradient(at 90% 90%, ${DREAM.purple}26 0px, transparent 50%),
          radial-gradient(at 10% 90%, ${DREAM.accent}1a 0px, transparent 50%)
        `,
        backgroundAttachment: 'fixed',
      }}
    >
      {/* 標題 */}
      <div
        className={`flex flex-col items-center ${isMobile ? 'pt-12 pb-8' : 'pt-32 pb-16'} relative`}
      >
        <div
          className="h-32 w-px mb-8"
          style={{
            background: `linear-gradient(to bottom, transparent, ${DREAM.purple}, transparent)`,
          }}
        />
        <span
          className={`${isMobile ? 'text-2xl' : 'text-3xl'} mb-2`}
          style={{
            fontFamily: "'La Belle Aurore', cursive",
            color: DREAM.accent,
            transform: 'rotate(-5deg)',
            display: 'block',
          }}
        >
          The Chronicles
        </span>
        <h2
          className={`${isMobile ? 'text-4xl' : 'text-6xl lg:text-8xl'} text-center`}
          style={{ fontFamily: "'Cinzel', serif", color: DREAM.text }}
        >
          Unfolding
          <br />
          Chapters
        </h2>
      </div>

      {/* 每日行程 */}
      {renderDays()}

      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,400&family=La+Belle+Aurore&family=Space+Mono&display=swap');
      `}</style>
    </section>
  )
}

// 根據索引自動分配預設佈局
function getDefaultLayout(index: number, total: number): DreamscapeDayLayout {
  // 如果是最後幾天（超過第3天），用 glassCard
  if (index >= 3) return 'glassCard'

  // 前三天交替使用不同佈局
  const layouts: DreamscapeDayLayout[] = ['blobLeft', 'blobRight', 'fullHero']
  return layouts[index % 3]
}
