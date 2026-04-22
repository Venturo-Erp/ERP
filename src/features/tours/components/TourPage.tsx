'use client'

/**
 * TourPage - 行程展示頁面
 *
 * 🎨 風格統一原則：
 * 所有區塊跟隨 coverStyle，不再有獨立的 flightStyle、itineraryStyle 等
 * 選一個主題 → 全站統一風格
 */

import { logger } from '@/lib/utils/logger'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useTourScrollEffects } from '@/features/tours/hooks/useTourScrollEffects'
import { useTourItineraryNav } from '@/features/tours/hooks/useTourItineraryNav'
import { TourHeroSection } from '@/features/tours/components/sections/TourHeroSection'
import { TourHeroGemini } from '@/features/tours/components/sections/TourHeroGemini'
import { TourHeroNature } from '@/features/tours/components/sections/TourHeroNature'
import { TourHeroLuxury } from '@/features/tours/components/sections/TourHeroLuxury'
import { TourHeroArt } from '@/features/tours/components/sections/TourHeroArt'
import { TourHeroDreamscape } from '@/features/tours/components/sections/TourHeroDreamscape'
import { TourHeroCollage } from '@/features/tours/components/sections/TourHeroCollage'
import { TourFlightSection } from '@/features/tours/components/sections/TourFlightSection'
import { TourFeaturesSection } from '@/features/tours/components/sections/TourFeaturesSection'
import { TourFeaturesSectionLuxury } from '@/features/tours/components/sections/TourFeaturesSectionLuxury'
import { TourItinerarySection } from '@/features/tours/components/sections/TourItinerarySection'
import { TourItinerarySectionLuxury } from '@/features/tours/components/sections/TourItinerarySectionLuxury'
import { TourItinerarySectionArt } from '@/features/tours/components/sections/TourItinerarySectionArt'
import { TourLeaderSection } from '@/features/tours/components/sections/TourLeaderSection'
import { TourLeaderSectionLuxury } from '@/features/tours/components/sections/TourLeaderSectionLuxury'
import { TourHotelsSection } from '@/features/tours/components/sections/TourHotelsSection'
import { TourHotelsSectionLuxury } from '@/features/tours/components/sections/TourHotelsSectionLuxury'
import { TourPricingSection } from '@/features/tours/components/sections/TourPricingSection'
import { TourPricingSectionLuxury } from '@/features/tours/components/sections/TourPricingSectionLuxury'
import { TourPriceTiersSection } from '@/features/tours/components/sections/TourPriceTiersSection'
import { TourPriceTiersSectionLuxury } from '@/features/tours/components/sections/TourPriceTiersSectionLuxury'
import { TourFAQSection } from '@/features/tours/components/sections/TourFAQSection'
import { TourNoticesSection } from '@/features/tours/components/sections/TourNoticesSection'
import { TourNavigation } from '@/features/tours/components/sections/TourNavigation'
import { useCompanyInfo } from '@/hooks/useCompanyInfo'
import type { TourPageProps } from '@/features/tours'

export default function TourPage({ data, isPreview = false, viewMode = 'desktop' }: TourPageProps) {
  const dailyItinerary = Array.isArray(data.dailyItinerary) ? data.dailyItinerary : []
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string | null>(null)
  const { legalName: companyName, subtitle: companySubtitle } = useCompanyInfo()

  // 統一風格 - 所有區塊跟隨 coverStyle
  const style = data.coverStyle || 'original'

  // Custom hooks
  const { scrollOpacity } = useTourScrollEffects({ viewMode, isPreview })
  const { activeDayIndex, dayRefs, handleDayNavigate } = useTourItineraryNav(dailyItinerary)

  // 公司 LOGO 載入功能已移除（2026-04-23、company_assets 表砍除）
  // 之後重做時直接從 workspace.logo_url 抓

  // 判斷是否為特定風格
  const isLuxury = style === 'luxury'
  const isArt = style === 'art'
  const isDreamscape = style === 'dreamscape'
  const isCollage = style === 'collage'

  return (
    <div className={viewMode === 'mobile' ? 'min-h-screen bg-muted' : 'min-h-screen bg-card'}>
      {/* Navigation */}
      <TourNavigation
        data={data}
        scrollOpacity={scrollOpacity}
        isPreview={isPreview}
        viewMode={viewMode}
      />

      {/* Hero Section */}
      <div id="top">
        {isLuxury ? (
          <TourHeroLuxury data={data} viewMode={viewMode} />
        ) : isArt ? (
          <TourHeroArt data={data} viewMode={viewMode} />
        ) : style === 'gemini' ? (
          <TourHeroGemini data={data} viewMode={viewMode} />
        ) : style === 'nature' ? (
          <TourHeroNature data={data} viewMode={viewMode} />
        ) : isDreamscape ? (
          <TourHeroDreamscape data={data} viewMode={viewMode} />
        ) : isCollage ? (
          <TourHeroCollage data={data} viewMode={viewMode} />
        ) : (
          <TourHeroSection data={data} viewMode={viewMode} />
        )}
      </div>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-t border-border"></div>
      </div>

      {/* Flight Section - 風格跟隨 coverStyle */}
      <div id="flight">
        <TourFlightSection data={data} viewMode={viewMode} />
      </div>

      {/* Features Section */}
      {data.showFeatures !== false && (data.features?.length ?? 0) > 0 && (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="border-t border-border"></div>
          </div>

          <div id="features">
            {isLuxury ? (
              <TourFeaturesSectionLuxury data={data} viewMode={viewMode} />
            ) : (
              <TourFeaturesSection
                data={data}
                viewMode={viewMode}
                coverStyle={style}
                featuresStyle={isCollage ? 'collage' : 'original'}
              />
            )}
          </div>

          {viewMode !== 'mobile' && (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="border-t border-border"></div>
            </div>
          )}
        </>
      )}

      {/* Itinerary Section */}
      <div id="itinerary">
        {isLuxury ? (
          <TourItinerarySectionLuxury
            data={data}
            viewMode={viewMode}
            activeDayIndex={activeDayIndex}
            dayRefs={dayRefs}
            handleDayNavigate={handleDayNavigate}
          />
        ) : isArt ? (
          <TourItinerarySectionArt
            data={data}
            viewMode={viewMode}
            activeDayIndex={activeDayIndex}
            dayRefs={dayRefs}
            handleDayNavigate={handleDayNavigate}
          />
        ) : (
          <TourItinerarySection
            data={data}
            viewMode={viewMode}
            activeDayIndex={activeDayIndex}
            dayRefs={dayRefs}
            handleDayNavigate={handleDayNavigate}
            coverStyle={style}
          />
        )}
      </div>

      {/* Leader Section */}
      {(data.leader?.name ||
        data.leader?.domesticPhone ||
        data.leader?.overseasPhone ||
        data.meetingInfo?.time ||
        data.meetingInfo?.location ||
        (data.meetingPoints &&
          data.meetingPoints.some(
            (p: { time?: string; location?: string }) => p.time || p.location
          ))) && (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="border-t border-border"></div>
          </div>
          <div id="leader">
            {isLuxury ? (
              <TourLeaderSectionLuxury data={data} viewMode={viewMode} />
            ) : (
              <TourLeaderSection data={data} viewMode={viewMode} coverStyle={style} />
            )}
          </div>
        </>
      )}

      {/* Hotels Section */}
      {data.showHotels !== false && data.hotels && data.hotels.length > 0 && (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="border-t border-border"></div>
          </div>
          <div id="hotels">
            {isLuxury ? (
              <TourHotelsSectionLuxury data={data} viewMode={viewMode} />
            ) : (
              <TourHotelsSection data={data} viewMode={viewMode} coverStyle={style} />
            )}
          </div>
        </>
      )}

      {/* Price Tiers Section */}
      {data.showPriceTiers && data.priceTiers && data.priceTiers.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-border"></div>
        </div>
      )}
      <div id="price-tiers">
        {isLuxury ? (
          <TourPriceTiersSectionLuxury data={data} viewMode={viewMode} />
        ) : (
          <TourPriceTiersSection data={data} viewMode={viewMode} coverStyle={style} />
        )}
      </div>

      {/* Pricing Details Section */}
      {data.showPricingDetails && data.pricingDetails && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-border"></div>
        </div>
      )}
      <div id="pricing">
        {isLuxury ? (
          <TourPricingSectionLuxury data={data} viewMode={viewMode} />
        ) : (
          <TourPricingSection data={data} viewMode={viewMode} coverStyle={style} />
        )}
      </div>

      {/* FAQ Section */}
      {data.showFaqs && data.faqs && data.faqs.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-border"></div>
        </div>
      )}
      <div id="faq">
        <TourFAQSection data={data} viewMode={viewMode} coverStyle={style} />
      </div>

      {/* Notices Section */}
      {((data.showNotices && data.notices && data.notices.length > 0) ||
        (data.showCancellationPolicy &&
          data.cancellationPolicy &&
          data.cancellationPolicy.length > 0)) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-border"></div>
        </div>
      )}
      <div id="notices">
        <TourNoticesSection data={data} viewMode={viewMode} coverStyle={style} />
      </div>

      {/* Footer */}
      <footer className="bg-morandi-primary py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-3">
              {companyLogoUrl ? (
                <img
                  src={companyLogoUrl}
                  alt="Company Logo"
                  className={`w-auto object-contain ${viewMode === 'mobile' ? 'h-6' : 'h-8'}`}
                />
              ) : (
                <h3
                  className={`font-bold text-morandi-gold ${viewMode === 'mobile' ? 'text-lg' : 'text-2xl'}`}
                >
                  {companyName}
                </h3>
              )}
            </div>
            <p className="text-morandi-secondary mb-6 text-sm">{companySubtitle}</p>
            <p className="text-morandi-secondary text-xs">
              © {new Date().getFullYear()} {companyName}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
