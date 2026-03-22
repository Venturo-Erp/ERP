'use client'

import { TourForm } from '@/components/editor/TourForm'
import type { LocalTourData, AutoSaveStatus } from '../hooks/useItineraryEditor'
import type { TierPricing } from '@/stores/types/quote.types'
import { logger } from '@/lib/utils/logger'
import { NEW_LABELS } from './constants/labels'

interface ItineraryEditorProps {
  tourData: LocalTourData
  autoSaveStatus: AutoSaveStatus
  isDirty: boolean
  quoteTierPricings?: TierPricing[]
  hasLinkedQuote?: boolean // 是否有關聯報價單（用於鎖定住宿編輯）
  className?: string
  onChange: (newData: LocalTourData) => void
}

export function ItineraryEditor({
  tourData,
  autoSaveStatus,
  isDirty,
  quoteTierPricings,
  hasLinkedQuote,
  className,
  onChange,
}: ItineraryEditorProps) {
  return (
    <div
      className={`flex-1 min-w-0 bg-card border-r border-border flex flex-col ${className || ''}`}
    >
      <div className="h-14 bg-morandi-gold/90 text-white px-6 flex items-center justify-between border-b border-border">
        <h2 className="text-lg font-semibold">{NEW_LABELS.EDIT_2921}</h2>
      </div>
      <div className="flex-1 overflow-y-auto bg-card">
        <TourForm
          data={{
            ...tourData,
            meetingPoints: tourData.meetingInfo ? [tourData.meetingInfo] : [],
            hotels: tourData.hotels || [],
            countries: [],
            showFeatures: tourData.showFeatures !== false,
            showLeaderMeeting: tourData.showLeaderMeeting !== false,
            showHotels: tourData.showHotels || false,
            showPricingDetails: tourData.showPricingDetails || false,
            pricingDetails: tourData.pricingDetails,
            priceTiers: tourData.priceTiers,
            showPriceTiers: tourData.showPriceTiers || false,
            faqs: tourData.faqs,
            showFaqs: tourData.showFaqs || false,
            notices: tourData.notices,
            showNotices: tourData.showNotices || false,
            cancellationPolicy: tourData.cancellationPolicy,
            showCancellationPolicy: tourData.showCancellationPolicy || false,
          }}
          quoteTierPricings={quoteTierPricings}
          hasLinkedQuote={hasLinkedQuote}
          onChange={newData => {
            logger.log('[ItineraryEditor] TourForm onChange 收到:', {
              coverImage: newData.coverImage,
            })
            const { meetingPoints, countries, ...restData } = newData
            const updatedData = {
              ...restData,
              status: tourData.status,
              meetingInfo: meetingPoints?.[0] || { time: '', location: '' },
              hotels: newData.hotels || [],
              showPricingDetails: newData.showPricingDetails,
              pricingDetails: newData.pricingDetails,
              priceTiers: newData.priceTiers ?? undefined,
              showPriceTiers: newData.showPriceTiers,
              faqs: newData.faqs ?? undefined,
              showFaqs: newData.showFaqs,
              notices: newData.notices ?? undefined,
              showNotices: newData.showNotices,
              cancellationPolicy: newData.cancellationPolicy ?? undefined,
              showCancellationPolicy: newData.showCancellationPolicy,
            }
            logger.log('[ItineraryEditor] 傳給 parent onChange:', {
              coverImage: updatedData.coverImage,
            })
            onChange(updatedData)
          }}
        />
      </div>
    </div>
  )
}
