'use client'

import { useCallback } from 'react'
import { UI_DELAYS } from '@/lib/constants/timeouts'
import { logger } from '@/lib/utils/logger'
import { CostCategory, ParticipantCounts, SellingPrices, TierPricing } from '../types'
import type { Quote } from '@/stores/types'
import type { QuickQuoteItem } from '@/types/quote.types'
import type { TourItineraryItem } from '@/features/tours/types/tour-itinerary-item.types'
import { useAuthStore } from '@/stores/auth-store'
import { updateTour } from '@/data'
import { writePricingToCore, coreItemsToCostCategories } from '../utils/core-table-adapter'
import { supabase } from '@/lib/supabase/client'

interface QuickQuoteCustomerInfo {
  customer_name: string
  contact_phone: string
  contact_address: string
  tour_code: string
  handler_name: string
  issue_date: string
  received_amount: number
  expense_description: string
}

interface UseQuoteSaveProps {
  quote: Quote | null | undefined
  updateQuote: (id: string, data: Partial<Quote>) => void
  updatedCategories: CostCategory[]
  total_cost: number
  groupSize: number
  quoteName: string
  accommodationDays: number
  participantCounts: ParticipantCounts
  sellingPrices: SellingPrices
  setSaveSuccess: (value: boolean) => void
  setCategories: React.Dispatch<React.SetStateAction<CostCategory[]>>
  quickQuoteItems?: QuickQuoteItem[]
  quickQuoteCustomerInfo?: QuickQuoteCustomerInfo
  tierPricings?: TierPricing[]
  // 核心表相關（有 tour_id 時使用）
  coreItems?: TourItineraryItem[]
  refreshCoreItems?: () => Promise<TourItineraryItem[] | undefined>
}

export const useQuoteSave = ({
  quote,
  updateQuote,
  updatedCategories,
  total_cost,
  groupSize,
  quoteName,
  accommodationDays,
  participantCounts,
  sellingPrices,
  setSaveSuccess,
  setCategories,
  quickQuoteItems,
  quickQuoteCustomerInfo,
  tierPricings,
  coreItems,
  refreshCoreItems,
}: UseQuoteSaveProps) => {
  const { user } = useAuthStore()

  // 直接儲存到報價單主欄位
  const handleSave = useCallback(async () => {
    if (!quote) {
      logger.error('[handleSave] quote 為 undefined，無法儲存')
      return
    }

    try {
      // 快速報價單資料
      const quickQuoteData = quickQuoteCustomerInfo
        ? {
            customer_name: quickQuoteCustomerInfo.customer_name,
            contact_phone: quickQuoteCustomerInfo.contact_phone,
            contact_address: quickQuoteCustomerInfo.contact_address,
            tour_code: quickQuoteCustomerInfo.tour_code,
            handler_name: quickQuoteCustomerInfo.handler_name,
            issue_date: quickQuoteCustomerInfo.issue_date,
            received_amount: quickQuoteCustomerInfo.received_amount,
            expense_description: quickQuoteCustomerInfo.expense_description,
            quick_quote_items: quickQuoteItems || [],
          }
        : {}

      // 檻次表資料
      const tierPricingsData = tierPricings || []

      // 報價單存 header + 售價 + 人數 + 快速報價欄位 + 檻次表
      const quoteHeaderData: Partial<Quote> = {
        name: quoteName,
        total_cost,
        group_size: groupSize,
        participant_counts: participantCounts, // 人數明細
        selling_prices: sellingPrices, // 各身份售價
        tier_pricings: tierPricingsData,
        ...quickQuoteData,
      }

      logger.log('[handleSave] 儲存報價單:', {
        quoteId: quote.id,
        groupSize,
        tierPricingsCount: tierPricingsData.length,
        tierPricings: tierPricingsData,
      })

      // ✅ 等待存檔完成，捕獲錯誤
      await updateQuote(quote.id, quoteHeaderData)

      // 定價欄位寫到 tour（只寫 tours 表實際存在的欄位）
      if (quote.tour_id) {
        await updateTour(quote.tour_id, {
          total_cost,
          max_participants: groupSize,
          selling_price_per_person: sellingPrices.adult,
        })
      }

      // ✅ 確認存檔成功後才顯示「已儲存」
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), UI_DELAYS.SUCCESS_MESSAGE)

      // 背景寫入核心表
      if (quote.tour_id && user?.workspace_id) {
        const workspace_id = user.workspace_id
        writePricingToCore(updatedCategories, quote.tour_id, workspace_id, coreItems || [])
          .then(async result => {
            logger.log('核心表寫入:', result)
            // 寫入完成後，重新讀取核心表並更新 categories（確保 ID 正確）
            const { data: freshItems } = await supabase
              .from('tour_itinerary_items')
              .select(
                'id,tour_id,itinerary_id,workspace_id,day_number,sort_order,category,sub_category,title,description,service_date,service_date_end,resource_type,resource_id,resource_name,latitude,longitude,google_maps_url,unit_price,quantity,total_cost,currency,pricing_type,adult_price,child_price,infant_price,unit_price_formula,quantity_formula,adult_price_formula,child_price_formula,infant_price_formula,quote_note,quote_item_id,supplier_id,supplier_name,request_id,request_status,request_sent_at,request_reply_at,reply_content,reply_cost,estimated_cost,quoted_cost,confirmation_item_id,confirmed_cost,booking_reference,booking_status,confirmation_date,confirmation_note,actual_expense,expense_note,expense_at,quote_status,confirmation_status,leader_status,created_at,updated_at,created_by,show_on_web,show_on_brochure,updated_by,show_on_quote,handled_by,override_title,override_description,is_reserved,reserved_at,driver_name,driver_phone,vehicle_plate,vehicle_type,booking_confirmed_at,assignee_id,assigned_at,assigned_by,room_details,override_by,override_at,receipt_images'
              )
              .eq('tour_id', quote.tour_id!)
              .order('day_number', { ascending: true })
              .order('sort_order', { ascending: true })
              .limit(500)
            if (freshItems && freshItems.length > 0) {
              setCategories(coreItemsToCostCategories(freshItems as unknown as TourItineraryItem[]))
            }
            // 也更新 SWR 快取
            refreshCoreItems?.()
          })
          .catch(err => logger.error('核心表寫入錯誤:', err))
      }
    } catch (error) {
      logger.error('儲存失敗:', error)
      // ✅ 顯示錯誤提示
      const { toast } = await import('sonner')
      toast.error('儲存失敗，請稍後再試')
    }
  }, [
    quote,
    updatedCategories,
    total_cost,
    groupSize,
    quoteName,
    accommodationDays,
    participantCounts,
    sellingPrices,
    updateQuote,
    setSaveSuccess,
    setCategories,
    quickQuoteItems,
    quickQuoteCustomerInfo,
    tierPricings,
    coreItems,
    refreshCoreItems,
    user?.workspace_id,
  ])

  return {
    handleSave,
  }
}
