import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { DailyImageCarousel } from './DailyImageCarousel'
import { MutableRefObject, useState } from 'react'
import { TourItinerarySectionDreamscape } from './TourItinerarySectionDreamscape'
import {
  DayLabel,
  DateSubtitle,
  AttractionCard,
  DecorativeDivider,
  MobileActivityCarousel,
  DesktopActivityCarousel,
  JapaneseActivityCard,
  JapaneseAccommodationCard,
  JapaneseMealsCard,
} from '@/components/tour-preview'
import { ArrowRight, Sparkles } from 'lucide-react'
import Image from 'next/image'
import { SectionTitle } from './SectionTitle'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import type {
  TourPageData,
  CoverStyleType,
  DailyItinerary,
} from '@/features/tours/types/tour-display.types'
import { TOURS_LABELS } from './constants/labels'

interface TourItinerarySectionProps {
  data: TourPageData
  viewMode: 'desktop' | 'mobile'
  activeDayIndex: number
  dayRefs: MutableRefObject<(HTMLDivElement | null)[]>
  handleDayNavigate: (index: number) => void
  coverStyle?: CoverStyleType
}

// 將標題中的文字符號轉換成 SVG 圖標
function renderTitleWithIcons(title: string, viewMode: 'desktop' | 'mobile') {
  // 支援有空格和沒空格的符號：→ ⇀ · | ⭐
  const parts = title.split(/(\s*→\s*|\s*⇀\s*|\s*·\s*|\s*\|\s*|\s*⭐\s*)/g)
  const iconSize = viewMode === 'mobile' ? 10 : 16

  return parts.map((part, index) => {
    const trimmedPart = part.trim()
    if (trimmedPart === '→' || trimmedPart === '⇀') {
      return (
        <ArrowRight
          key={index}
          size={iconSize}
          className="inline-block text-morandi-primary"
          style={{ verticalAlign: 'middle', margin: viewMode === 'mobile' ? '0 2px' : '0 4px' }}
        />
      )
    } else if (trimmedPart === '⭐') {
      return (
        <Sparkles
          key={index}
          size={iconSize}
          className="inline-block text-morandi-gold"
          style={{ verticalAlign: 'middle', margin: viewMode === 'mobile' ? '0 2px' : '0 4px' }}
        />
      )
    } else if (trimmedPart === '·' || trimmedPart === '|') {
      return (
        <span
          key={index}
          className="text-morandi-secondary inline-block"
          style={{ verticalAlign: 'middle', margin: viewMode === 'mobile' ? '0 2px' : '0 4px' }}
        >
          {trimmedPart}
        </span>
      )
    } else if (part) {
      return <span key={index}>{part}</span>
    }
    return null
  })
}

// 計算 dayLabel 的函數 - 處理建議方案編號
function calculateDayLabels(itinerary: DailyItinerary[]): string[] {
  const labels: string[] = []
  let currentDayNumber = 0
  let alternativeCount = 0 // 當前建議方案的計數 (B=1, C=2, ...)

  for (let i = 0; i < itinerary.length; i++) {
    const day = itinerary[i]

    if (day.isAlternative) {
      // 這是建議方案，使用前一個正規天數的編號 + 字母
      alternativeCount++
      const suffix = String.fromCharCode(65 + alternativeCount) // B, C, D...
      labels.push(`Day ${currentDayNumber}-${suffix}`)
    } else {
      // 這是正規天數
      currentDayNumber++
      alternativeCount = 0 // 重置建議方案計數
      labels.push(`Day ${currentDayNumber}`)
    }
  }

  return labels
}

export function TourItinerarySection({
  data,
  viewMode,
  activeDayIndex,
  dayRefs,
  handleDayNavigate,
  coverStyle = 'original',
}: TourItinerarySectionProps) {
  // Dreamscape 風格使用專用組件
  if (coverStyle === 'dreamscape') {
    return (
      <TourItinerarySectionDreamscape
        data={data}
        viewMode={viewMode}
        activeDayIndex={activeDayIndex}
        dayRefs={dayRefs}
        handleDayNavigate={handleDayNavigate}
      />
    )
  }

  const dailyItinerary = Array.isArray(data.dailyItinerary) ? data.dailyItinerary : []
  const dayLabels = calculateDayLabels(dailyItinerary)
  const [selectedActivity, setSelectedActivity] = useState<{
    title: string
    description?: string
    image?: string
  } | null>(null)

  // 收集整個行程的所有每日照片（只收集 showDailyImages=true 的）
  const allTourImages = dailyItinerary.flatMap(day =>
    day.showDailyImages === true
      ? (day.images || [])
          .map(img => (typeof img === 'string' ? img : img.url))
          .filter(url => url && url.trim() !== '')
      : []
  )

  // 創建點擊處理函數
  const handleActivityClick = (activity: {
    title?: string
    description?: string
    image?: string
  }) => {
    if (!activity.title) return
    setSelectedActivity({
      title: activity.title,
      description: activity.description,
      image: activity.image,
    })
  }

  return (
    <section
      id="itinerary"
      className={viewMode === 'mobile' ? 'bg-card pt-4 pb-8' : 'bg-card pt-8 pb-16'}
    >
      <div className={viewMode === 'mobile' ? 'px-4' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <SectionTitle
            title={TOURS_LABELS.LABEL_1369}
            coverStyle={coverStyle}
            className={viewMode === 'mobile' ? 'mb-4' : 'mb-12'}
          />
        </motion.div>

        <div>
          <div>
            <div className={viewMode === 'mobile' ? 'space-y-2' : 'space-y-12'}>
              {dailyItinerary.map((day, index: number) => (
                <article
                  key={`day-section-${index}`}
                  id={`day-${index + 1}`}
                  ref={el => {
                    dayRefs.current[index] = el as HTMLDivElement | null
                  }}
                  className={
                    viewMode === 'mobile'
                      ? 'relative py-6 border-b border-morandi-container/30 last:border-b-0'
                      : 'relative overflow-hidden rounded-[36px] border border-morandi-container/30 bg-card/95 p-8 shadow-lg backdrop-blur-sm'
                  }
                >
                  {/* 日式和風風格的標題區塊 */}
                  {coverStyle === 'nature' ? (
                    <div
                      className={cn('relative mb-4 md:mb-6', viewMode === 'mobile' ? 'px-4' : '')}
                    >
                      <DayLabel
                        dayLabel={dayLabels[index]}
                        isAlternative={day.isAlternative}
                        coverStyle="nature"
                        title={day.title}
                      />
                      {day.isAlternative && (
                        <span className="ml-4 px-2 py-0.5 bg-[#30abe8]/10 text-[#30abe8] text-xs rounded-full">
                          {TOURS_LABELS.LABEL_1234}
                        </span>
                      )}
                    </div>
                  ) : (
                    /* 預設風格的標題區塊 */
                    <div
                      className={cn(
                        'relative overflow-hidden rounded-2xl bg-gradient-to-r from-morandi-gold/10 via-morandi-gold/5 to-transparent p-4',
                        viewMode === 'mobile' ? 'mb-4' : 'mb-6'
                      )}
                    >
                      <div className="absolute -top-4 -left-4 w-24 h-24 bg-morandi-gold/20 rounded-full blur-2xl" />
                      {viewMode === 'mobile' ? (
                        <div className="relative flex items-center gap-3">
                          <DayLabel
                            dayLabel={dayLabels[index]}
                            isAlternative={day.isAlternative}
                            variant="small"
                          />
                          {day.isAlternative && (
                            <span className="px-2 py-0.5 bg-morandi-container text-morandi-secondary text-[10px] rounded-full">
                              {TOURS_LABELS.LABEL_1234}
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            {day.date && <DateSubtitle date={day.date} />}
                            {day.title && (
                              <h3 className="text-[10px] font-semibold leading-relaxed text-morandi-primary flex items-center flex-wrap mt-1">
                                {renderTitleWithIcons(day.title, viewMode)}
                              </h3>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="relative flex items-center gap-3 md:gap-4 mb-2 md:mb-3">
                            <DayLabel
                              dayLabel={dayLabels[index]}
                              isAlternative={day.isAlternative}
                              variant="default"
                            />
                            {day.isAlternative && (
                              <span className="px-2 py-0.5 bg-morandi-container text-morandi-secondary text-xs rounded-full">
                                {TOURS_LABELS.LABEL_1234}
                              </span>
                            )}
                            {day.date && <DateSubtitle date={day.date} />}
                          </div>
                          {day.title && (
                            <h3 className="relative text-xl font-bold leading-relaxed text-morandi-primary">
                              {renderTitleWithIcons(day.title, viewMode)}
                            </h3>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {day.highlight && (
                    <div
                      className={cn(
                        'flex items-start gap-2 rounded-xl bg-status-warning-bg border border-status-warning/30',
                        viewMode === 'mobile' ? 'mb-4 px-3 py-2' : 'mb-6 px-4 py-3'
                      )}
                    >
                      <Sparkles
                        size={viewMode === 'mobile' ? 14 : 16}
                        className="text-status-warning flex-shrink-0 mt-0.5"
                      />
                      <p
                        className={cn(
                          'font-medium leading-relaxed text-morandi-primary whitespace-pre-line',
                          viewMode === 'mobile' ? 'text-xs' : 'text-sm md:text-base'
                        )}
                      >
                        {day.highlight}
                      </p>
                    </div>
                  )}

                  {day.description && (
                    <p
                      className={cn(
                        'text-sm md:text-base leading-relaxed md:leading-7 text-morandi-secondary whitespace-pre-line',
                        viewMode === 'mobile' ? 'mt-0 mb-4 px-4' : 'mt-4 mb-4'
                      )}
                    >
                      {day.description}
                    </p>
                  )}

                  {day.activities && day.activities.length > 0 && (
                    <div
                      className={cn(
                        'space-y-3 overflow-hidden',
                        viewMode === 'mobile' ? 'mb-4' : 'mb-6'
                      )}
                    >
                      {/* 日式風格不需要分隔線 */}
                      {coverStyle !== 'nature' && <DecorativeDivider variant="simple" />}
                      {coverStyle === 'nature' ? (
                        // 日式和風風格：根據景點數量調整排版
                        day.activities.length === 1 ? (
                          // 只有一個景點：滿版顯示
                          <JapaneseActivityCard
                            title={day.activities[0].title}
                            description={day.activities[0].description || ''}
                            image={day.activities[0].image}
                            onClick={() => handleActivityClick(day.activities![0])}
                          />
                        ) : (
                          // 多個景點：根據數量智能排版
                          (() => {
                            const count = day.activities.length
                            // 計算最後一排的數量
                            const remainder = count % 3
                            const hasLastRow = remainder > 0 && count > 3

                            if (!hasLastRow || count <= 3) {
                              // 2-3 個景點，或剛好整除，直接網格排列
                              return (
                                <div
                                  className={cn(
                                    'grid gap-6',
                                    count === 2 && 'grid-cols-1 md:grid-cols-2',
                                    count >= 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                                  )}
                                >
                                  {day.activities.map((activity, actIndex) => (
                                    <JapaneseActivityCard
                                      key={`activity-${actIndex}`}
                                      title={activity.title}
                                      description={activity.description || ''}
                                      image={activity.image}
                                      onClick={() => handleActivityClick(activity)}
                                    />
                                  ))}
                                </div>
                              )
                            }

                            // 有餘數：分開處理前面整排和最後一排
                            const mainCount = count - remainder
                            const mainActivities = day.activities.slice(0, mainCount)
                            const lastActivities = day.activities.slice(mainCount)

                            return (
                              <div className="space-y-6">
                                {/* 前面整排 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                  {mainActivities.map((activity, actIndex) => (
                                    <JapaneseActivityCard
                                      key={`activity-${actIndex}`}
                                      title={activity.title}
                                      description={activity.description || ''}
                                      image={activity.image}
                                      onClick={() => handleActivityClick(activity)}
                                    />
                                  ))}
                                </div>
                                {/* 最後一排：置中排列 */}
                                <div
                                  className={cn(
                                    'grid gap-6 justify-center',
                                    remainder === 1 && 'grid-cols-1 max-w-md mx-auto',
                                    remainder === 2 &&
                                      'grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto'
                                  )}
                                >
                                  {lastActivities.map((activity, actIndex) => (
                                    <JapaneseActivityCard
                                      key={`activity-last-${actIndex}`}
                                      title={activity.title}
                                      description={activity.description || ''}
                                      image={activity.image}
                                      onClick={() => handleActivityClick(activity)}
                                    />
                                  ))}
                                </div>
                              </div>
                            )
                          })()
                        )
                      ) : viewMode === 'mobile' ? (
                        // 非日式風格手機版：使用滿版滑動輪播組件
                        <MobileActivityCarousel
                          activities={day.activities.map(a => ({
                            title: a.title,
                            description: a.description,
                            image: a.image || '',
                          }))}
                        />
                      ) : (
                        // 非日式風格桌面版：智能排版 - 根據圖片數量自動調整
                        (() => {
                          const withImage = day.activities.filter(
                            a => a.image && a.image.trim() !== ''
                          )
                          const withoutImage = day.activities.filter(
                            a => !a.image || a.image.trim() === ''
                          )

                          // 情況1：都有圖片 - 標準網格排列
                          if (withoutImage.length === 0) {
                            return (
                              <div
                                className={cn(
                                  'grid gap-4',
                                  withImage.length === 1 && 'grid-cols-1',
                                  withImage.length === 2 && 'grid-cols-1 md:grid-cols-2',
                                  withImage.length >= 3 &&
                                    'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                                )}
                              >
                                {withImage.map((activity, actIndex) => (
                                  <AttractionCard
                                    key={`activity-${actIndex}`}
                                    title={activity.title}
                                    description={activity.description || ''}
                                    image={activity.image}
                                    layout="vertical"
                                    className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                    onClick={() => handleActivityClick(activity)}
                                  />
                                ))}
                              </div>
                            )
                          }

                          // 情況2：都沒圖片 - 標準網格，用 horizontal layout
                          if (withImage.length === 0) {
                            return (
                              <div
                                className={cn(
                                  'grid gap-4',
                                  withoutImage.length === 1 && 'grid-cols-1',
                                  withoutImage.length === 2 && 'grid-cols-1 md:grid-cols-2',
                                  withoutImage.length === 3 &&
                                    'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
                                  withoutImage.length >= 4 &&
                                    'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                                )}
                              >
                                {withoutImage.map((activity, actIndex) => (
                                  <AttractionCard
                                    key={`activity-${actIndex}`}
                                    title={activity.title}
                                    description={activity.description || ''}
                                    image={activity.image}
                                    layout="horizontal"
                                    className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                    onClick={() => handleActivityClick(activity)}
                                  />
                                ))}
                              </div>
                            )
                          }

                          // 情況3：1張有圖 + 其他沒圖 - 左一右多
                          if (withImage.length === 1) {
                            return (
                              <div className="flex flex-col md:flex-row gap-4">
                                {/* 左側：有圖片的景點 */}
                                <div className="flex-1 md:flex-[2]">
                                  <AttractionCard
                                    title={withImage[0].title}
                                    description={withImage[0].description || ''}
                                    image={withImage[0].image}
                                    layout="fullwidth"
                                    className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                    onClick={() => handleActivityClick(withImage[0])}
                                  />
                                </div>

                                {/* 右側：沒圖片的景點，垂直排列 */}
                                <div className="flex-1 flex flex-col gap-4">
                                  {withoutImage.map((activity, actIndex) => (
                                    <div key={`without-image-${actIndex}`} className="flex-1">
                                      <AttractionCard
                                        title={activity.title}
                                        description={activity.description || ''}
                                        image={activity.image}
                                        layout="horizontal"
                                        className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg h-full"
                                        onClick={() => handleActivityClick(activity)}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          }

                          // 情況4：多張有圖 + 少數沒圖 - 先排有圖的，沒圖的補在後面
                          if (withImage.length >= 2 && withoutImage.length <= 2) {
                            return (
                              <div className="space-y-4">
                                {/* 有圖片的景點 - 3 張以上用輪播，否則網格 */}
                                {withImage.length >= 3 ? (
                                  <DesktopActivityCarousel
                                    activities={withImage.map(a => ({
                                      title: a.title,
                                      description: a.description,
                                      image: a.image,
                                    }))}
                                    onActivityClick={activity =>
                                      handleActivityClick(activity as (typeof withImage)[0])
                                    }
                                  />
                                ) : (
                                  <div
                                    className={cn(
                                      'grid gap-4',
                                      withImage.length === 2 && 'grid-cols-1 md:grid-cols-2'
                                    )}
                                  >
                                    {withImage.map((activity, actIndex) => (
                                      <AttractionCard
                                        key={`with-image-${actIndex}`}
                                        title={activity.title}
                                        description={activity.description || ''}
                                        image={activity.image}
                                        layout="vertical"
                                        className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                        onClick={() => handleActivityClick(activity)}
                                      />
                                    ))}
                                  </div>
                                )}

                                {/* 沒圖片的景點 - 水平排列 */}
                                {withoutImage.length > 0 && (
                                  <div
                                    className={cn(
                                      'grid gap-4',
                                      withoutImage.length === 1 && 'grid-cols-1',
                                      withoutImage.length >= 2 && 'grid-cols-1 md:grid-cols-2'
                                    )}
                                  >
                                    {withoutImage.map((activity, actIndex) => (
                                      <AttractionCard
                                        key={`without-image-${actIndex}`}
                                        title={activity.title}
                                        description={activity.description || ''}
                                        image={activity.image}
                                        layout="horizontal"
                                        className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                        onClick={() => handleActivityClick(activity)}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          }

                          // 情況5：太多景點 - 統一網格
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                              {day.activities.map((activity, actIndex) => (
                                <AttractionCard
                                  key={`activity-${actIndex}`}
                                  title={activity.title}
                                  description={activity.description || ''}
                                  image={activity.image}
                                  layout={activity.image ? 'vertical' : 'horizontal'}
                                  className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                  onClick={() => handleActivityClick(activity)}
                                />
                              ))}
                            </div>
                          )
                        })()
                      )}
                    </div>
                  )}

                  {day.recommendations && day.recommendations.length > 0 && (
                    <div
                      className={cn(
                        'rounded-xl sm:rounded-2xl border border-emerald-200 bg-emerald-50/80 shadow-inner',
                        viewMode === 'mobile' ? 'mb-4 p-3' : 'mb-8 p-6'
                      )}
                    >
                      <h4
                        className={cn(
                          'flex items-center gap-2 font-semibold text-emerald-900',
                          viewMode === 'mobile' ? 'mb-2 text-sm' : 'mb-3 text-lg'
                        )}
                      >
                        {TOURS_LABELS.LABEL_7651}
                      </h4>
                      <ul
                        className={cn(
                          'text-emerald-800',
                          viewMode === 'mobile' ? 'space-y-1.5' : 'space-y-2'
                        )}
                      >
                        {day.recommendations.map((rec: string, recIndex: number) => (
                          <li
                            key={recIndex}
                            className={cn(
                              'flex items-start gap-2 leading-relaxed',
                              viewMode === 'mobile' ? 'text-xs' : 'text-sm'
                            )}
                          >
                            <span
                              className={cn(
                                'rounded-full bg-emerald-500 flex-shrink-0',
                                viewMode === 'mobile' ? 'mt-1 h-1.5 w-1.5' : 'mt-1 h-2 w-2'
                              )}
                            ></span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 餐食區塊 */}
                  {coverStyle === 'nature' ? (
                    // 日式和風風格餐食卡片（桌面版+手機版都用）
                    <JapaneseMealsCard
                      meals={{
                        breakfast: day.meals?.breakfast || '敬請自理',
                        lunch: day.meals?.lunch || '敬請自理',
                        dinner: day.meals?.dinner || '敬請自理',
                      }}
                    />
                  ) : (
                    // 原版餐食樣式
                    <div
                      className={cn(
                        'grid',
                        viewMode === 'mobile'
                          ? 'grid-cols-3 gap-1'
                          : 'grid-cols-1 md:grid-cols-3 gap-4'
                      )}
                    >
                      <div
                        className={cn(
                          'border border-morandi-gold/30 bg-morandi-gold/5 transition-all hover:shadow-md',
                          viewMode === 'mobile'
                            ? 'rounded-lg px-1.5 py-1.5 flex flex-col'
                            : 'rounded-2xl px-4 py-4 flex flex-col items-center text-center min-h-[80px] justify-center'
                        )}
                      >
                        <p
                          className={cn(
                            'text-morandi-secondary/80 mb-1',
                            viewMode === 'mobile'
                              ? 'text-[10px] text-center'
                              : 'text-sm font-medium'
                          )}
                        >
                          {TOURS_LABELS.LABEL_1347}
                        </p>
                        <p
                          className={cn(
                            'font-semibold text-morandi-primary',
                            viewMode === 'mobile'
                              ? 'text-[10px] text-center leading-tight line-clamp-1'
                              : 'text-base leading-snug'
                          )}
                        >
                          {day.meals?.breakfast || '敬請自理'}
                        </p>
                      </div>
                      <div
                        className={cn(
                          'border border-morandi-gold/30 bg-morandi-gold/5 transition-all hover:shadow-md',
                          viewMode === 'mobile'
                            ? 'rounded-lg px-1.5 py-1.5 flex flex-col'
                            : 'rounded-2xl px-4 py-4 flex flex-col items-center text-center min-h-[80px] justify-center'
                        )}
                      >
                        <p
                          className={cn(
                            'text-morandi-secondary/80 mb-1',
                            viewMode === 'mobile'
                              ? 'text-[10px] text-center'
                              : 'text-sm font-medium'
                          )}
                        >
                          {TOURS_LABELS.LABEL_8515}
                        </p>
                        <p
                          className={cn(
                            'font-semibold text-morandi-primary',
                            viewMode === 'mobile'
                              ? 'text-[10px] text-center leading-tight line-clamp-1'
                              : 'text-base leading-snug'
                          )}
                        >
                          {day.meals?.lunch || '敬請自理'}
                        </p>
                      </div>
                      <div
                        className={cn(
                          'border border-morandi-gold/30 bg-morandi-gold/5 transition-all hover:shadow-md',
                          viewMode === 'mobile'
                            ? 'rounded-lg px-1.5 py-1.5 flex flex-col'
                            : 'rounded-2xl px-4 py-4 flex flex-col items-center text-center min-h-[80px] justify-center'
                        )}
                      >
                        <p
                          className={cn(
                            'text-morandi-secondary/80 mb-1',
                            viewMode === 'mobile'
                              ? 'text-[10px] text-center'
                              : 'text-sm font-medium'
                          )}
                        >
                          {TOURS_LABELS.LABEL_8227}
                        </p>
                        <p
                          className={cn(
                            'font-semibold text-morandi-primary',
                            viewMode === 'mobile'
                              ? 'text-[10px] text-center leading-tight line-clamp-1'
                              : 'text-base leading-snug'
                          )}
                        >
                          {day.meals?.dinner || '敬請自理'}
                        </p>
                      </div>
                    </div>
                  )}

                  {day.accommodation &&
                    (coverStyle === 'nature' ? (
                      // 日式和風風格住宿卡片（桌面版+手機版都用）
                      <JapaneseAccommodationCard
                        name={day.accommodation}
                        url={day.accommodationUrl}
                        rating={day.accommodationRating}
                        className="mt-4 sm:mt-6"
                      />
                    ) : (
                      // 原版住宿樣式
                      <div
                        className={cn(
                          'border border-morandi-gold/30 bg-morandi-gold/10 text-morandi-primary shadow-inner',
                          viewMode === 'mobile'
                            ? 'mt-3 rounded-lg p-2'
                            : 'mt-6 rounded-2xl px-4 py-3'
                        )}
                      >
                        <div
                          className={cn(
                            'flex items-baseline gap-x-3',
                            viewMode === 'mobile' ? 'text-xs' : 'text-sm'
                          )}
                        >
                          <span className="font-medium tracking-wide text-morandi-secondary flex-shrink-0">
                            {TOURS_LABELS.LABEL_8766}
                          </span>
                          {day.accommodationUrl ? (
                            <a
                              href={day.accommodationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                'font-semibold flex-1 text-center hover:underline transition-all',
                                viewMode === 'mobile' ? '' : 'text-base'
                              )}
                            >
                              {day.accommodation}
                            </a>
                          ) : (
                            <span
                              className={cn(
                                'font-semibold flex-1 text-center',
                                viewMode === 'mobile' ? '' : 'text-base'
                              )}
                            >
                              {day.accommodation}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                  {/* 每日圖片輪播 - 放在住宿下方（需 showDailyImages=true） */}
                  {day.showDailyImages === true && (
                    <DailyImageCarousel
                      images={day.images || []}
                      title={day.title || day.dayLabel || `Day ${index + 1}`}
                      allTourImages={allTourImages}
                    />
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 懸浮視窗 Modal - 桌面版景點詳情 */}
      <Dialog
        open={selectedActivity !== null}
        onOpenChange={open => !open && setSelectedActivity(null)}
      >
        <DialogContent level={1} className="max-w-[85vw] max-h-[70vh] w-auto p-0 overflow-hidden">
          <VisuallyHidden><DialogTitle>景點詳情</DialogTitle></VisuallyHidden>
          <AnimatePresence mode="wait">
            {selectedActivity && (
              <motion.div
                key={selectedActivity.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {/* 圖片 - 有圖片才顯示 */}
                {selectedActivity.image && selectedActivity.image.trim() !== '' && (
                  <div className="relative w-full aspect-[3/2] max-h-[40vh]">
                    <Image
                      src={selectedActivity.image}
                      alt={selectedActivity.title}
                      fill
                      className="object-cover"
                      sizes="85vw"
                    />
                  </div>
                )}

                {/* 內容區 */}
                <div className="p-6">
                  <h3 className="font-bold text-xl mb-3 text-morandi-primary">
                    {selectedActivity.title}
                  </h3>
                  {selectedActivity.description && (
                    <p className="text-sm leading-relaxed text-morandi-secondary">
                      {selectedActivity.description}
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </section>
  )
}
