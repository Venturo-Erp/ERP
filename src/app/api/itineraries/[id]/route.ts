import { captureException } from '@/lib/error-tracking'
import { NextRequest } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logger } from '@/lib/utils/logger'
import { successResponse, ApiError } from '@/lib/api/response'
import { getServerAuth } from '@/lib/auth/server-auth'
import type { SupabaseClient } from '@supabase/supabase-js'

// 活動類型
interface Activity {
  attraction_id?: string
  title?: string
  description?: string
  [key: string]: unknown
}

interface DayItinerary {
  activities?: Activity[]
  [key: string]: unknown
}

/**
 * 用 attraction_id 從景點庫補上描述
 */
async function enrichDailyItinerary(
  supabase: SupabaseClient,
  dailyItinerary: DayItinerary[] | null
): Promise<DayItinerary[] | null> {
  if (!dailyItinerary || !Array.isArray(dailyItinerary)) return dailyItinerary

  // 收集需要查詢的 attraction_id
  const attractionIds = new Set<string>()
  for (const day of dailyItinerary) {
    if (day.activities && Array.isArray(day.activities)) {
      for (const activity of day.activities) {
        if (activity.attraction_id && !activity.description) {
          attractionIds.add(activity.attraction_id)
        }
      }
    }
  }

  if (attractionIds.size === 0) return dailyItinerary

  // 批次查詢景點
  const { data: attractions } = await supabase
    .from('attractions')
    .select('id, description, thumbnail, images')
    .in('id', Array.from(attractionIds))

  if (!attractions) return dailyItinerary

  // 建立對照表
  const attractionMap = new Map<string, { description?: string; thumbnail?: string; images?: string[] }>()
  for (const attr of attractions) {
    attractionMap.set(attr.id, {
      description: attr.description || undefined,
      thumbnail: attr.thumbnail || undefined,
      images: attr.images || undefined,
    })
  }

  // 補上描述和圖片
  return dailyItinerary.map(day => ({
    ...day,
    activities: day.activities?.map(activity => {
      if (activity.attraction_id) {
        const attr = attractionMap.get(activity.attraction_id)
        if (attr) {
          const enriched = { ...activity }
          if (!activity.description && attr.description) enriched.description = attr.description
          if (!activity.image && (attr.thumbnail || attr.images?.[0])) {
            enriched.image = attr.thumbnail || attr.images?.[0]
          }
          return enriched
        }
      }
      return activity
    })
  }))
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabaseAdmin = getSupabaseAdminClient()

    if (!id) {
      return ApiError.missingField('id')
    }

    // 🔒 安全修復 2026-02-19：檢查認證狀態
    // 未登入用戶只能存取已發布的行程（供客戶公開瀏覽）
    const auth = await getServerAuth()
    const isAuthenticated = auth.success

    // 判斷查詢類型：
    // 1. 完整 UUID（36 字元，含連字號）
    // 2. 短碼（8 個十六進位字元，是 UUID 前 8 碼去掉連字號）
    // 3. tour_code（其他格式）
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    const isShortId = /^[0-9a-f]{8}$/i.test(id) // 8 個十六進位字元

    let itinerary = null
    let error = null

    // tier_pricings 在 quotes 表，需要透過 tours.quote_id 關聯
    const selectFields = '*, tour:tours(quote:quotes(tier_pricings))'

    if (isUUID) {
      // 用完整 UUID 查詢
      const result = await supabaseAdmin
        .from('itineraries')
        .select(selectFields)
        .eq('id', id)
        .single()
      itinerary = result.data
      error = result.error
    } else if (isShortId) {
      // 用短碼查詢（ID 前 8 碼，需要用 like 查詢）
      // 將短碼轉換成 UUID 前綴格式：xxxxxxxx-
      const uuidPrefix = `${id.substring(0, 8)}`
      const result = await supabaseAdmin
        .from('itineraries')
        .select(selectFields)
        .ilike('id', `${uuidPrefix}%`)
        .limit(1)
        .single()
      itinerary = result.data
      error = result.error
    } else {
      // 用 tour_code 查詢
      const result = await supabaseAdmin
        .from('itineraries')
        .select(selectFields)
        .eq('tour_code', id)
        .single()
      itinerary = result.data
      error = result.error
    }

    if (error) {
      logger.error('查詢行程失敗:', error)
      captureException(error, { module: 'itineraries.[id]' })
      if (error.code === 'PGRST116') {
        return ApiError.notFound('行程')
      }
      return ApiError.database('查詢行程失敗')
    }

    if (!itinerary) {
      return ApiError.notFound('行程')
    }

    // 🔒 此 API 供 /view/[id] 公開分享頁使用，有連結即可檢視
    // 敏感操作（編輯、刪除）由其他 API 處理並檢查權限

    // 轉換資料格式（snake_case → camelCase）
    const formattedItinerary = {
      id: itinerary.id,
      tourId: itinerary.tour_id,
      tagline: itinerary.tagline,
      title: itinerary.title,
      subtitle: itinerary.subtitle,
      description: itinerary.description,
      departureDate: itinerary.departure_date,
      tourCode: itinerary.tour_code,
      coverImage: itinerary.cover_image,
      coverStyle: itinerary.cover_style,
      flightStyle: itinerary.flight_style,
      itineraryStyle: itinerary.itinerary_style,
      price: itinerary.price,
      priceNote: itinerary.price_note,
      country: itinerary.country,
      city: itinerary.city,
      status: itinerary.status,
      outboundFlight: itinerary.outbound_flight,
      returnFlight: itinerary.return_flight,
      features: itinerary.features,
      focusCards: itinerary.focus_cards,
      leader: itinerary.leader,
      meetingInfo: itinerary.meeting_info,
      hotels: itinerary.hotels,
      showFeatures: itinerary.show_features,
      showLeaderMeeting: itinerary.show_leader_meeting,
      showHotels: itinerary.show_hotels,
      // 詳細團費
      showPricingDetails: itinerary.show_pricing_details,
      pricingDetails: itinerary.pricing_details,
      // 價格方案（從 quotes 表讀取，透過 tours.quote_id）
      priceTiers: (itinerary as { tour?: { quote?: { tier_pricings?: unknown } } }).tour?.quote?.tier_pricings || null,
      showPriceTiers: itinerary.show_price_tiers,
      // 常見問題
      faqs: itinerary.faqs,
      showFaqs: itinerary.show_faqs,
      // 提醒事項
      notices: itinerary.notices,
      showNotices: itinerary.show_notices,
      // 取消政策
      cancellationPolicy: itinerary.cancellation_policy,
      showCancellationPolicy: itinerary.show_cancellation_policy,
      itinerarySubtitle: itinerary.itinerary_subtitle,
      dailyItinerary: await enrichDailyItinerary(supabaseAdmin, itinerary.daily_itinerary as DayItinerary[]),
      versionRecords: itinerary.version_records,
      createdAt: itinerary.created_at,
      updatedAt: itinerary.updated_at,
    }

    return successResponse(formattedItinerary)
  } catch (error) {
    logger.error('API 錯誤:', error)
    captureException(error, { module: 'itineraries.[id]' })
    return ApiError.internal('伺服器錯誤')
  }
}
