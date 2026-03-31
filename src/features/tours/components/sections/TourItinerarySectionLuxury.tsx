'use client'

import { motion } from 'framer-motion'
import { MutableRefObject, useState } from 'react'
import { MapPin, Star, ArrowRight } from 'lucide-react'
import {
  LUXURY,
  DAY_COLORS,
  calculateDayLabels,
  calculateDayDate,
  isLastMainDay,
  ImageGalleryState,
  ActivityInfo,
} from './utils/itineraryLuxuryUtils'
import { formatDateShort } from '@/lib/utils/format-date'
import { ImageGalleryModal } from './modals/ImageGalleryModal'
import { ActivityDetailModal } from './modals/ActivityDetailModal'
import type { TourPageData } from '@/features/tours/types/tour-display.types'
import { TOURS_LABELS } from './constants/labels'

interface TourItinerarySectionLuxuryProps {
  data: TourPageData
  viewMode: 'desktop' | 'mobile'
  activeDayIndex: number
  dayRefs: MutableRefObject<(HTMLDivElement | null)[]>
  handleDayNavigate: (index: number) => void
}

export function TourItinerarySectionLuxury({
  data,
  viewMode,
  activeDayIndex,
  dayRefs,
  handleDayNavigate,
}: TourItinerarySectionLuxuryProps) {
  const dailyItinerary = Array.isArray(data.dailyItinerary) ? data.dailyItinerary : []
  const dayLabels = calculateDayLabels(dailyItinerary)
  const isMobile = viewMode === 'mobile'

  const [selectedActivity, setSelectedActivity] = useState<ActivityInfo | null>(null)

  // 圖片瀏覽器狀態 - 每張圖片可以有自己的標題和描述
  const [imageGallery, setImageGallery] = useState<ImageGalleryState | null>(null)

  // 開啟圖片瀏覽器
  const openImageGallery = (
    images: { url: string; title?: string; description?: string }[],
    startIndex: number
  ) => {
    setImageGallery({ images, currentIndex: startIndex })
  }

  // 切換上一張
  const prevImage = () => {
    if (!imageGallery) return
    setImageGallery({
      ...imageGallery,
      currentIndex:
        imageGallery.currentIndex > 0
          ? imageGallery.currentIndex - 1
          : imageGallery.images.length - 1,
    })
  }

  // 切換下一張
  const nextImage = () => {
    if (!imageGallery) return
    setImageGallery({
      ...imageGallery,
      currentIndex:
        imageGallery.currentIndex < imageGallery.images.length - 1
          ? imageGallery.currentIndex + 1
          : 0,
    })
  }

  return (
    <section
      id="itinerary"
      className={isMobile ? 'py-8' : 'py-16 pb-24'}
      style={{ backgroundColor: LUXURY.background }}
    >
      <div className={isMobile ? 'px-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}>
        {/* 標題區塊 - 靠左對齊 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={`flex items-center justify-between ${isMobile ? 'mb-8' : 'mb-16'} relative`}
        >
          <div>
            <span
              className="block mb-2 italic"
              style={{
                color: LUXURY.secondary,
                fontFamily: "'Noto Serif TC', serif",
                fontSize: isMobile ? '1rem' : '1.125rem',
              }}
            >
              Day by Day
            </span>
            <h2
              className={`font-medium ${isMobile ? 'text-2xl' : 'text-4xl'}`}
              style={{
                color: LUXURY.text,
                fontFamily: "'Noto Serif TC', serif",
              }}
            >
              {TOURS_LABELS.LABEL_5020}
            </h2>
          </div>
          {/* 裝飾線 */}
          {!isMobile && (
            <div
              className="absolute bottom-0 left-0 w-full h-px -z-10 translate-y-4"
              style={{ backgroundColor: '#E5E7EB' }}
            />
          )}
        </motion.div>

        {/* 每日行程卡片 */}
        <div className="space-y-12">
          {dailyItinerary.map((day, index) => {
            const dayColor = DAY_COLORS[index % DAY_COLORS.length]
            const dayNumber = dayLabels[index].replace('Day ', '')
            // 檢查圖片來源：1. day.images（需 showDailyImages=true） 2. activities 裡的 image
            const dayImages =
              day.showDailyImages === true && day.images && day.images.length > 0 ? day.images : []
            // 建構帶有標題和描述的圖片陣列
            const normalizedDayImages = dayImages.map((img, idx) => ({
              url: typeof img === 'string' ? img : img.url,
              title: day.activities?.[idx]?.title || '',
              description: day.activities?.[idx]?.description || '',
            }))
            const activityImagesWithInfo =
              day.activities
                ?.filter(a => a.image)
                .map(a => ({
                  url: a.image!,
                  title: a.title || '',
                  description: a.description || '',
                })) || []
            // 合併所有圖片來源
            const allImages =
              normalizedDayImages.length > 0 ? normalizedDayImages : activityImagesWithInfo
            const hasImages = allImages.length > 0

            return (
              <article
                key={`day-${index}`}
                id={`day-${index + 1}`}
                ref={el => {
                  dayRefs.current[index] = el as HTMLDivElement | null
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card rounded-2xl shadow-lg overflow-hidden group"
                  style={{ borderColor: '#f0f0f0' }}
                >
                  <div className={`grid ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-12'} h-full`}>
                    {/* 左側：日期區塊 */}
                    <div
                      className={`${isMobile ? 'p-4' : 'lg:col-span-2 p-8'} text-white ${isMobile ? 'flex flex-row items-center justify-between' : 'flex flex-col justify-between items-start'} relative overflow-hidden`}
                      style={{ backgroundColor: dayColor }}
                    >
                      {/* 大數字背景 - 手機版隱藏 */}
                      {!isMobile && (
                        <div
                          className="absolute -right-4 top-1/2 -translate-y-1/2 text-9xl font-bold select-none"
                          style={{
                            fontFamily: "'Noto Serif TC', serif",
                            color: 'rgba(255,255,255,0.05)',
                          }}
                        >
                          {dayNumber.padStart(2, '0')}
                        </div>
                      )}

                      <div className={isMobile ? 'flex items-center gap-3' : ''}>
                        {/* 日期標籤 - DEC 25 格式 */}
                        {(() => {
                          const numericDay = parseInt(dayNumber.split('-')[0], 10)
                          const dateDisplay =
                            formatDateShort(day.date) ||
                            calculateDayDate(data.departureDate, numericDay)
                          return dateDisplay ? (
                            <span
                              className={`inline-block px-3 py-1.5 bg-card/10 backdrop-blur-sm rounded text-xs font-medium tracking-widest ${isMobile ? '' : 'mb-3'}`}
                            >
                              {dateDisplay}
                            </span>
                          ) : null
                        })()}
                        <h3
                          className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-medium whitespace-nowrap`}
                          style={{ fontFamily: "'Noto Serif TC', serif" }}
                        >
                          Day {dayNumber}
                        </h3>
                      </div>

                      <div className={`${isMobile ? 'text-right' : 'space-y-1'} z-10`}>
                        <div
                          className={`text-xs uppercase tracking-widest opacity-70 ${isMobile ? 'hidden' : ''}`}
                        >
                          {day.isAlternative ? 'Alternative' : 'Location'}
                        </div>
                        <div
                          className={`font-medium ${isMobile ? 'text-base' : 'text-lg'}`}
                          style={{ color: day.isAlternative ? '#fff' : LUXURY.secondary }}
                        >
                          {day.locationLabel || data.city || TOURS_LABELS.EXPLORE}
                        </div>
                      </div>
                    </div>

                    {/* 中間：主要內容 */}
                    <div
                      className={`${isMobile ? 'p-6' : 'lg:col-span-7 p-8 lg:p-10'} border-r`}
                      style={{ borderColor: '#f0f0f0' }}
                    >
                      {/* 標題區 */}
                      <div className="flex items-start justify-between mb-6">
                        <h3
                          className={`font-bold ${isMobile ? 'text-xl' : 'text-2xl'}`}
                          style={{
                            color: LUXURY.text,
                            fontFamily: "'Noto Sans TC', sans-serif",
                          }}
                        >
                          {day.title ||
                            `${TOURS_LABELS.DAY_ITINERARY_PREFIX}${index + 1}${TOURS_LABELS.DAY_ITINERARY_SUFFIX}`}
                        </h3>
                        {day.isAlternative && (
                          <span
                            className="px-2 py-1 text-xs rounded-full"
                            style={{
                              backgroundColor: `${LUXURY.secondary}20`,
                              color: LUXURY.secondary,
                            }}
                          >
                            {TOURS_LABELS.LABEL_1234}
                          </span>
                        )}
                      </div>

                      {/* 特別安排 */}
                      {day.highlight && (
                        <div
                          className="flex items-start gap-3 mb-6 p-4 rounded-lg border-l-4"
                          style={{
                            backgroundColor: `${LUXURY.secondary}08`,
                            borderColor: LUXURY.secondary,
                          }}
                        >
                          <Star
                            className="w-5 h-5 flex-shrink-0 mt-0.5"
                            style={{ color: LUXURY.secondary }}
                          />
                          <div>
                            <span
                              className="text-xs font-bold uppercase tracking-wider block mb-1"
                              style={{ color: LUXURY.secondary }}
                            >
                              Special Arrangement
                            </span>
                            <p
                              className="text-sm font-medium whitespace-pre-line"
                              style={{ color: LUXURY.text }}
                            >
                              {day.highlight}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 描述 */}
                      {day.description && (
                        <p
                          className={`leading-loose mb-8 font-light whitespace-pre-line ${isMobile ? 'text-sm' : ''}`}
                          style={{
                            color: LUXURY.muted,
                            fontFamily: "'Noto Sans TC', sans-serif",
                          }}
                        >
                          {day.description}
                        </p>
                      )}

                      {/* 圖片區 - 有圖片時顯示圖片，無圖片時顯示景點列表 */}
                      {hasImages ? (
                        <div className="mb-6">
                          {/* 單張圖片：手機上下排列，桌面左圖右文 */}
                          {allImages.length === 1 && (
                            <div
                              className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-6`}
                            >
                              {/* 圖片 */}
                              <div
                                className={`relative ${isMobile ? 'h-48' : 'h-56'} overflow-hidden rounded-md cursor-pointer group/img`}
                                onClick={() => openImageGallery(allImages, 0)}
                              >
                                <img
                                  src={allImages[0].url}
                                  alt={allImages[0].title || TOURS_LABELS.ITINERARY_IMAGE}
                                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors" />
                              </div>
                              {/* 說明 */}
                              <div
                                className={`flex flex-col justify-center ${isMobile ? 'p-4' : 'p-5'}`}
                                style={{ backgroundColor: LUXURY.background }}
                              >
                                {/* 1. 標題 */}
                                <h4
                                  className="text-lg font-medium mb-3"
                                  style={{
                                    color: LUXURY.primary,
                                    fontFamily: "'Noto Serif TC', serif",
                                  }}
                                >
                                  Highlight
                                </h4>
                                {/* 2. 景點列表 */}
                                <ul className="space-y-2 mb-4">
                                  {day.activities?.map((activity, actIdx) => (
                                    <li
                                      key={actIdx}
                                      className="flex items-center gap-2 text-sm cursor-pointer hover:opacity-80"
                                      style={{ color: LUXURY.muted }}
                                      onClick={() =>
                                        setSelectedActivity({
                                          title: activity.title || '',
                                          description: activity.description,
                                          image: activity.image,
                                        })
                                      }
                                    >
                                      <span
                                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: LUXURY.secondary }}
                                      />
                                      {activity.title}
                                    </li>
                                  ))}
                                </ul>
                                {/* 3. 說明文字 */}
                                {day.activities?.[0]?.description && (
                                  <p
                                    className="text-xs leading-relaxed border-t border-border pt-3"
                                    style={{
                                      color: LUXURY.muted,
                                      borderColor: '#e5e5e5',
                                    }}
                                  >
                                    {day.activities[0].description}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 多張圖片：橫向排列，最多顯示3張 */}
                          {allImages.length >= 2 && (
                            <>
                              <div
                                className={`grid gap-4 ${allImages.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}
                              >
                                {allImages.slice(0, 3).map((img, imgIdx) => (
                                  <div
                                    key={imgIdx}
                                    className="relative h-44 overflow-hidden rounded-md cursor-pointer group/img"
                                    onClick={() => openImageGallery(allImages, imgIdx)}
                                  >
                                    <img
                                      src={img.url}
                                      alt={img.title || ''}
                                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                    {/* 左下角標籤 */}
                                    <div className="absolute bottom-3 left-3">
                                      <span
                                        className="text-white text-xs font-bold uppercase tracking-wider"
                                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
                                      >
                                        {img.title}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* 簡短說明 + 點擊提示 */}
                              <div
                                className="mt-4 p-4 rounded-lg cursor-pointer hover:bg-opacity-80 transition-colors"
                                style={{ backgroundColor: LUXURY.background }}
                                onClick={() => openImageGallery(allImages, 0)}
                              >
                                {/* 景點名稱列表 */}
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {day.activities?.slice(0, 3).map((activity, idx) => (
                                    <span
                                      key={idx}
                                      className="text-xs font-medium px-2 py-1 rounded-full"
                                      style={{
                                        backgroundColor: `${LUXURY.secondary}20`,
                                        color: LUXURY.secondary,
                                      }}
                                    >
                                      {activity.title}
                                    </span>
                                  ))}
                                </div>
                                {/* 第一個景點的簡短描述 */}
                                {day.activities?.[0]?.description && (
                                  <p
                                    className="text-sm line-clamp-2 mb-2"
                                    style={{ color: LUXURY.muted }}
                                  >
                                    {day.activities[0].description}
                                  </p>
                                )}
                                <span
                                  className="text-xs flex items-center gap-1"
                                  style={{ color: LUXURY.secondary }}
                                >
                                  {TOURS_LABELS.CLICK_DETAIL} <ArrowRight className="w-3 h-3" />
                                </span>
                              </div>
                            </>
                          )}

                          {/* 如果超過3張，顯示查看更多按鈕 */}
                          {allImages.length > 3 && (
                            <button
                              className="mt-3 text-sm font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
                              style={{ color: LUXURY.secondary }}
                              onClick={() => openImageGallery(allImages, 3)}
                            >
                              <span>
                                {TOURS_LABELS.VIEW_MORE_PREFIX}
                                {allImages.length - 3}
                              </span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ) : (
                        /* 無圖片時：顯示 Highlight 景點列表 */
                        day.activities &&
                        day.activities.length > 0 && (
                          <div
                            className="p-5 rounded-md mb-4"
                            style={{ backgroundColor: LUXURY.background }}
                          >
                            <h4
                              className="text-base font-medium mb-3"
                              style={{
                                color: LUXURY.primary,
                                fontFamily: "'Noto Serif TC', serif",
                              }}
                            >
                              Highlight
                            </h4>
                            <ul className="space-y-3">
                              {day.activities.map((activity, actIdx) => (
                                <li
                                  key={actIdx}
                                  className="cursor-pointer hover:opacity-80"
                                  onClick={() =>
                                    setSelectedActivity({
                                      title: activity.title || '',
                                      description: activity.description,
                                      image: activity.image,
                                    })
                                  }
                                >
                                  <div
                                    className="flex items-center gap-2 text-sm"
                                    style={{ color: LUXURY.text }}
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: LUXURY.secondary }}
                                    />
                                    <span className="font-medium">{activity.title}</span>
                                  </div>
                                  {activity.description && (
                                    <p
                                      className="text-xs mt-1 ml-4 line-clamp-2"
                                      style={{ color: LUXURY.muted }}
                                    >
                                      {activity.description}
                                    </p>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )
                      )}
                    </div>

                    {/* 右側：餐食與住宿 */}
                    <div
                      className={`${isMobile ? 'p-6' : 'lg:col-span-3 p-8'} flex flex-col justify-center space-y-8`}
                      style={{ backgroundColor: '#f9fafb' }}
                    >
                      {/* 餐食 */}
                      <div className="relative pl-6 border-l" style={{ borderColor: '#E5E7EB' }}>
                        <span
                          className="absolute -left-1.5 top-0 w-3 h-3 rounded-full border-2 border-white"
                          style={{ backgroundColor: LUXURY.secondary }}
                        />
                        <h5
                          className="text-xs font-bold uppercase tracking-widest mb-3"
                          style={{ color: LUXURY.muted }}
                        >
                          Dining
                        </h5>
                        <div className="space-y-2">
                          {day.meals?.breakfast && (
                            <div className="flex justify-between text-sm">
                              <span style={{ color: LUXURY.muted }}>Breakfast</span>
                              <span className="font-medium" style={{ color: dayColor }}>
                                {day.meals.breakfast}
                              </span>
                            </div>
                          )}
                          {day.meals?.lunch && (
                            <div className="flex justify-between text-sm">
                              <span style={{ color: LUXURY.muted }}>Lunch</span>
                              <span className="font-medium" style={{ color: dayColor }}>
                                {day.meals.lunch}
                              </span>
                            </div>
                          )}
                          {day.meals?.dinner && (
                            <div className="flex justify-between text-sm">
                              <span style={{ color: LUXURY.muted }}>Dinner</span>
                              <span className="font-medium" style={{ color: dayColor }}>
                                {day.meals.dinner}
                              </span>
                            </div>
                          )}
                          {!day.meals?.breakfast && !day.meals?.lunch && !day.meals?.dinner && (
                            <div className="text-sm" style={{ color: LUXURY.muted }}>
                              {TOURS_LABELS.LABEL_6561}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 住宿 - 最後一天（包含替代行程）不顯示 */}
                      {!isLastMainDay(dailyItinerary, index) && (
                        <div className="relative pl-6 border-l" style={{ borderColor: '#E5E7EB' }}>
                          <span
                            className="absolute -left-1.5 top-0 w-3 h-3 rounded-full border-2 border-white"
                            style={{ backgroundColor: LUXURY.primary }}
                          />
                          <h5
                            className="text-xs font-bold uppercase tracking-widest mb-3"
                            style={{ color: LUXURY.muted }}
                          >
                            Stay
                          </h5>
                          {day.accommodation ? (
                            <div
                              className="bg-card p-4 shadow-sm rounded-md border"
                              style={{ borderColor: '#f0f0f0' }}
                            >
                              {/* 續住標示 */}
                              {day.isSameAccommodation && (
                                <div className="flex items-center gap-2 mb-2">
                                  <div
                                    className="w-4 h-4 rounded border-2 flex items-center justify-center"
                                    style={{
                                      borderColor: LUXURY.secondary,
                                      backgroundColor: `${LUXURY.secondary}15`,
                                    }}
                                  >
                                    <svg
                                      className="w-3 h-3"
                                      style={{ color: LUXURY.secondary }}
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </div>
                                  <span className="text-xs" style={{ color: LUXURY.secondary }}>
                                    {TOURS_LABELS.LABEL_3005}
                                  </span>
                                </div>
                              )}
                              <div
                                className="font-bold text-lg mb-1"
                                style={{
                                  fontFamily: "'Noto Serif TC', serif",
                                  color: LUXURY.text,
                                }}
                              >
                                {day.accommodation}
                              </div>
                              {/* 星級 */}
                              {day.accommodationRating != null && day.accommodationRating > 0 && (
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].slice(0, day.accommodationRating).map(i => (
                                    <Star
                                      key={i}
                                      className="w-3 h-3 fill-current"
                                      style={{ color: LUXURY.secondary }}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm" style={{ color: LUXURY.muted }}>
                              {TOURS_LABELS.CONFIRM_7150}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </article>
            )
          })}
        </div>
      </div>

      {/* Image Gallery Modal - 全螢幕圖片瀏覽器 */}
      <ImageGalleryModal
        imageGallery={imageGallery}
        onClose={() => setImageGallery(null)}
        onPrev={prevImage}
        onNext={nextImage}
        onSelectIndex={idx =>
          imageGallery && setImageGallery({ ...imageGallery, currentIndex: idx })
        }
      />

      {/* Activity Detail Modal - 景點詳情彈窗（保留給無圖片的景點列表點擊） */}
      <ActivityDetailModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />
    </section>
  )
}
