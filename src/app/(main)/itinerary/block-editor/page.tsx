'use client'

import { COMPANY_NAME, COMPANY_NAME_EN } from '@/lib/tenant'
// TODO: labels 模組尚未建立，暫用空物件
const LABELS = {
  新增行程: '新增行程',
  編輯行程: '編輯行程',
  儲存中: '儲存中...',
  儲存: '儲存',
  返回: '返回',
} as Record<string, string>

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores'
import { useItineraries, createItinerary, updateItinerary } from '@/data'
import { logger } from '@/lib/utils/logger'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { TourForm } from '@/components/editor/TourForm'
import { TourFormData } from '@/components/editor/tour-form/types'
// enrichDailyItinerary 尚未實作，暫用 identity function
const enrichDailyItinerary = <T,>(items: T[]) => items
import { ContentPageLayout } from '@/components/layout/content-page-layout'

export default function ItineraryEditorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuthStore()
  const { items: itineraries, loading: itinerariesLoading } = useItineraries()

  const itineraryId = searchParams.get('itinerary_id')
  const [formData, setFormData] = useState<TourFormData | null>(null)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  // 載入行程表資料
  useEffect(() => {
    const loadItinerary = async () => {
      if (itineraryId && itineraries.length > 0) {
        const itinerary = itineraries.find(i => i.id === itineraryId)
        if (itinerary) {
          // 用 attraction_id 補上景點描述和圖片
          const enrichedDailyItinerary = await enrichDailyItinerary(itinerary.daily_itinerary || [])

          // 將現有資料轉換為 TourFormData 格式
          const tourData: TourFormData = {
            tagline: itinerary.tagline || '',
            title: itinerary.title || '',
            subtitle: itinerary.subtitle || '',
            description: itinerary.description || '',
            departureDate: itinerary.departure_date || '',
            tourCode: itinerary.tour_code || '',
            coverImage: itinerary.cover_image || '',
            coverStyle: itinerary.cover_style as TourFormData['coverStyle'],
            country: itinerary.country || '',
            city: itinerary.city || '',
            price: itinerary.price,
            priceNote: itinerary.price_note,
            outboundFlight: (Array.isArray(itinerary.outbound_flight)
              ? itinerary.outbound_flight[0]
              : itinerary.outbound_flight) || {
              airline: '',
              flightNumber: '',
              departureAirport: '',
              departureTime: '',
              arrivalAirport: '',
              arrivalTime: '',
            },
            returnFlight: (Array.isArray(itinerary.return_flight)
              ? itinerary.return_flight[0]
              : itinerary.return_flight) || {
              airline: '',
              flightNumber: '',
              departureAirport: '',
              departureTime: '',
              arrivalAirport: '',
              arrivalTime: '',
            },
            flightStyle: itinerary.flight_style as TourFormData['flightStyle'],
            features:
              itinerary.features && itinerary.features.length > 0
                ? itinerary.features
                : [
                    { icon: '⭐', title: '', description: '', images: [] },
                    { icon: '🏨', title: '', description: '', images: [] },
                    { icon: '🍽️', title: '', description: '', images: [] },
                  ],
            featuresStyle: 'original',
            focusCards: itinerary.focus_cards || [],
            leader: itinerary.leader || { name: '', domesticPhone: '', overseasPhone: '' },
            meetingPoints: itinerary.meeting_info
              ? [itinerary.meeting_info]
              : [{ time: '', location: '' }],
            hotels: itinerary.hotels || [],
            showFeatures: itinerary.show_features !== false,
            showLeaderMeeting: itinerary.show_leader_meeting !== false,
            showHotels: itinerary.show_hotels || false,
            itinerarySubtitle: itinerary.itinerary_subtitle || '',
            dailyItinerary: enrichedDailyItinerary || [],
            itineraryStyle: itinerary.itinerary_style as TourFormData['itineraryStyle'],
            pricingDetails: itinerary.pricing_details,
            showPricingDetails: itinerary.show_pricing_details || false,
            // priceTiers 改從 tours.tier_pricings 讀取（price_tiers 已從 DB 移除）
            priceTiers: undefined,
            showPriceTiers: itinerary.show_price_tiers || false,
            faqs: itinerary.faqs || undefined,
            showFaqs: itinerary.show_faqs || false,
            notices: itinerary.notices || undefined,
            showNotices: itinerary.show_notices || false,
            cancellationPolicy: itinerary.cancellation_policy || undefined,
            showCancellationPolicy: itinerary.show_cancellation_policy || false,
          }

          setFormData(tourData)
        }
      } else if (!itineraryId) {
        // 創建預設資料
        const defaultData: TourFormData = {
          tagline: `${COMPANY_NAME} ${new Date().getFullYear()}`,
          title: '',
          subtitle: '',
          description: '',
          departureDate: '',
          tourCode: '',
          country: '',
          city: '',
          outboundFlight: {
            airline: '',
            flightNumber: '',
            departureAirport: '',
            departureTime: '',
            arrivalAirport: '',
            arrivalTime: '',
          },
          returnFlight: {
            airline: '',
            flightNumber: '',
            departureAirport: '',
            departureTime: '',
            arrivalAirport: '',
            arrivalTime: '',
          },
          flightStyle: 'original',
          coverStyle: 'original',
          coverImage: '',
          price: '',
          priceNote: '',
          features: [
            { icon: '⭐', title: '', description: '', images: [] },
            { icon: '🏨', title: '', description: '', images: [] },
            { icon: '🍽️', title: '', description: '', images: [] },
          ],
          featuresStyle: 'original',
          focusCards: [],
          leader: { name: '', domesticPhone: '', overseasPhone: '' },
          meetingPoints: [{ time: '', location: '' }],
          hotels: [],
          showFeatures: true,
          showLeaderMeeting: true,
          showHotels: false,
          itinerarySubtitle: '',
          dailyItinerary: [],
          itineraryStyle: 'original',
          pricingDetails: {} as TourFormData['pricingDetails'],
          showPricingDetails: false,
          priceTiers: undefined,
          showPriceTiers: false,
          faqs: undefined,
          showFaqs: false,
          notices: undefined,
          showNotices: false,
          cancellationPolicy: undefined,
          showCancellationPolicy: false,
        }
        setFormData(defaultData)
      }
    }

    loadItinerary()
  }, [itineraryId, itineraries.length])

  // 儲存行程表
  const handleSave = async () => {
    if (saving || !formData) return
    setSaving(true)
    try {
      // 建立或更新行程表
      if (itineraryId) {
        await updateItinerary(itineraryId, formData)
        toast.success('行程表已更新')
      } else {
        const newItinerary = await createItinerary(
          formData as unknown as Parameters<typeof createItinerary>[0]
        )
        toast.success('行程表已建立')
        // 導向新行程表
        if (newItinerary?.id) {
          router.push(`/itinerary/new?itinerary_id=${newItinerary.id}`)
        }
      }
      setIsDirty(false)
    } catch (error) {
      logger.error('儲存行程表失敗', error)
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleFormChange = (newData: TourFormData) => {
    setFormData(newData)
    setIsDirty(true)
  }

  if (itinerariesLoading || !formData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-morandi-background">
      {/* 標題列 */}
      <div className="sticky top-0 z-10 bg-white border-b border-morandi-container/50 px-6 py-4">
        <h1 className="text-xl font-bold text-morandi-primary">{LABELS.STANDARD_ITINERARY}</h1>
        <p className="text-sm text-morandi-secondary mt-1">{LABELS.STANDARD_ITINERARY_SUBTITLE}</p>
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-morandi-secondary">
            {itineraryId ? '編輯行程表' : '建立新行程表'}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="px-4 py-2 bg-morandi-gold text-white rounded-lg hover:bg-morandi-gold-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {saving ? (
              <span className="flex items-center gap-1">
                <Loader2 className="w-4 h-4 animate-spin" />
                儲存中...
              </span>
            ) : (
              '儲存'
            )}
          </button>
        </div>
      </div>

      {/* 左右分割主內容 */}
      <div className="flex flex-row h-[calc(100vh-5rem)]">
        {/* 左側：編輯區（60%，垂直滾動） */}
        <div className="w-3/5 overflow-y-auto border-r border-morandi-container/50">
          <div className="p-6">
            <TourForm data={formData} onChange={handleFormChange} />
          </div>
        </div>

        {/* 右側：預覽區（40%，固定） */}
        <div className="w-2/5 sticky top-0 h-full bg-white">
          <div className="p-6 h-full overflow-y-auto">
            {/* TODO: 這裡放即時預覽元件 */}
            <div className="text-center text-morandi-secondary py-12">即時預覽區</div>
          </div>
        </div>
      </div>
    </div>
  )
}
