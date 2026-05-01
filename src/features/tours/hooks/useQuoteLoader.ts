'use client'

import { getTodayString } from '@/lib/utils/format-date'

import { useState, useEffect } from 'react'
import { logger } from '@/lib/utils/logger'
import { supabase as supabaseClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Tour } from '@/types/tour.types'
import type {
  TourDepartureData,
  TourDepartureMeal,
  TourDepartureAccommodation,
  TourDepartureActivity,
  TourDepartureOther,
} from '@/types/tour-departure.types'
import type { Database } from '@/lib/supabase/types'
import { COMP_TOURS_LABELS } from '../constants/labels'

// type QuoteItemRow = Database['public']['Tables']['quote_items']['Row']
interface QuoteItemRow {
  id: string
  quote_id: string
  category: string | null
  item_type: string | null
  description: string | null
  quantity: number | null
  unit_price: number | null
  total_price: number | null
  display_order: number | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
}

const supabase = supabaseClient

interface LinkedQuoteInfo {
  id: string
  code: string | null
  name: string | null
  status: string | null
  total_amount: number | null
  created_at: string
}

function useQuoteLoader(
  tour: Tour,
  open: boolean,
  data: TourDepartureData | null,
  setMeals: (meals: TourDepartureMeal[]) => void,
  setAccommodations: (accommodations: TourDepartureAccommodation[]) => void,
  setActivities: (activities: TourDepartureActivity[]) => void,
  setOthers: (others: TourDepartureOther[]) => void,
  setData: (setter: (prev: TourDepartureData | null) => TourDepartureData | null) => void
) {
  const [linkedQuotes, setLinkedQuotes] = useState<LinkedQuoteInfo[]>([])
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)
  const [showQuoteSelector, setShowQuoteSelector] = useState(false)
  const [loadingQuotes, setLoadingQuotes] = useState(false)
  const [loading, setLoading] = useState(false)

  const loadLinkedQuotes = async () => {
    try {
      setLoadingQuotes(true)

      const { data: quotes, error } = await supabase
        .from('quotes')
        .select('id, code, name, status, total_amount, created_at')
        .eq('tour_id', tour.id)
        .order('created_at', { ascending: false })

      if (error) {
        logger.error(COMP_TOURS_LABELS.載入報價單失敗_2, error)
        return
      }

      const quotesData = (quotes || []) as LinkedQuoteInfo[]
      setLinkedQuotes(quotesData)

      if (quotesData.length > 0) {
        setSelectedQuoteId(quotesData[0].id)
      }
    } catch (error) {
      logger.error(COMP_TOURS_LABELS.查找報價單失敗, error)
    } finally {
      setLoadingQuotes(false)
    }
  }

  const handleSelectQuote = (quoteId: string) => {
    setSelectedQuoteId(quoteId)
    setShowQuoteSelector(false)
    loadFromQuoteById(quoteId)
  }

  const loadFromQuote = async () => {
    if (linkedQuotes.length > 1) {
      setShowQuoteSelector(true)
      return
    }

    const quoteId = selectedQuoteId || linkedQuotes[0]?.id
    if (!quoteId) {
      toast.error(COMP_TOURS_LABELS.此團沒有關聯的報價單)
      return
    }

    await loadFromQuoteById(quoteId)
  }

  const loadFromQuoteById = async (quoteId: string) => {
    if (!quoteId) {
      toast.error(COMP_TOURS_LABELS.此團沒有關聯的報價單)
      return
    }

    setLoading(true)
    try {
      logger.info(COMP_TOURS_LABELS.開始載入報價單資料_quoteId, quoteId)

      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*, quick_quote_items')
        .eq('id', quoteId)
        .single()

      if (quoteError) {
        logger.error(COMP_TOURS_LABELS.載入報價單失敗_2, quoteError)
        throw quoteError
      }

      logger.info(COMP_TOURS_LABELS.報價單載入成功, quote?.id, quote?.name)

      // 註：quote_items 表已廢棄，此查詢為向後兼容保留
      const { data: quoteItems, error: itemsError } = (await supabase
        .from('quote_items' as never)
        .select(
          'id, quote_id, category, item_name, unit_price, quantity, subtotal, notes, sort_order, created_at'
        )
        .eq('quote_id', quoteId)
        .order('display_order', { ascending: true })
        .limit(500)) as { data: QuoteItemRow[] | null; error: Error | null }

      if (itemsError) {
        logger.error(COMP_TOURS_LABELS.載入報價項目失敗, itemsError)
        throw itemsError
      }

      logger.info(COMP_TOURS_LABELS.報價項目載入成功_數量, quoteItems?.length || 0)

      const mealItems: TourDepartureMeal[] = []
      const accomItems: TourDepartureAccommodation[] = []
      const activityItems: TourDepartureActivity[] = []
      const otherItems: TourDepartureOther[] = []

      ;(quoteItems as QuoteItemRow[] | null)?.forEach((item: QuoteItemRow, index: number) => {
        const baseDate = tour.departure_date || getTodayString()
        const itemName = item.description || ''
        const category = item.category?.toLowerCase() || ''
        const itemType = item.item_type?.toLowerCase() || ''

        if (
          itemType === 'meals' ||
          category.includes(COMP_TOURS_LABELS.餐) ||
          category.includes('meal')
        ) {
          mealItems.push({
            id: `meal-${index}`,
            departure_data_id: data?.id || '',
            date: baseDate,
            restaurant_name: itemName,
            unit_price: item.unit_price,
            quantity: item.quantity,
            subtotal: item.total_price,
            expected_amount: item.total_price,
            notes: item.notes,
            display_order: index,
          })
        } else if (
          itemType === 'accommodation' ||
          category.includes(COMP_TOURS_LABELS.住宿) ||
          category.includes(COMP_TOURS_LABELS.飯店) ||
          category.includes('hotel')
        ) {
          accomItems.push({
            id: `accom-${index}`,
            departure_data_id: data?.id || '',
            date: baseDate,
            hotel_name: itemName,
            unit_price: item.unit_price,
            quantity: item.quantity,
            subtotal: item.total_price,
            expected_amount: item.total_price,
            notes: item.notes,
            display_order: index,
          })
        } else if (
          itemType === 'tickets' ||
          itemType === 'activity' ||
          category.includes(COMP_TOURS_LABELS.活動) ||
          category.includes(COMP_TOURS_LABELS.門票) ||
          category.includes('ticket')
        ) {
          activityItems.push({
            id: `activity-${index}`,
            departure_data_id: data?.id || '',
            date: baseDate,
            venue_name: itemName,
            unit_price: item.unit_price,
            quantity: item.quantity,
            subtotal: item.total_price,
            expected_amount: item.total_price,
            notes: item.notes,
            display_order: index,
          })
        } else {
          otherItems.push({
            id: `other-${index}`,
            departure_data_id: data?.id || '',
            date: baseDate,
            item_name: itemName,
            unit_price: item.unit_price,
            quantity: item.quantity,
            subtotal: item.total_price,
            expected_amount: item.total_price,
            notes: item.notes,
            display_order: index,
          })
        }
      })

      const quickItems = quote?.quick_quote_items as Array<{
        id: string
        description: string
        quantity: number
        unit_price: number
        amount: number
        notes?: string
      }> | null

      if (quickItems && Array.isArray(quickItems)) {
        quickItems.forEach((item, index) => {
          const baseDate = tour.departure_date || getTodayString()
          const desc = item.description?.toLowerCase() || ''

          if (desc.includes(COMP_TOURS_LABELS.餐) || desc.includes('meal')) {
            mealItems.push({
              id: `quick-meal-${index}`,
              departure_data_id: data?.id || '',
              date: baseDate,
              restaurant_name: item.description,
              unit_price: item.unit_price,
              quantity: item.quantity,
              subtotal: item.amount,
              expected_amount: item.amount,
              notes: item.notes || '',
              display_order: mealItems.length,
            })
          } else if (
            desc.includes(COMP_TOURS_LABELS.住) ||
            desc.includes('hotel') ||
            desc.includes(COMP_TOURS_LABELS.飯店)
          ) {
            accomItems.push({
              id: `quick-accom-${index}`,
              departure_data_id: data?.id || '',
              date: baseDate,
              hotel_name: item.description,
              unit_price: item.unit_price,
              quantity: item.quantity,
              subtotal: item.amount,
              expected_amount: item.amount,
              notes: item.notes || '',
              display_order: accomItems.length,
            })
          } else if (
            desc.includes(COMP_TOURS_LABELS.門票) ||
            desc.includes(COMP_TOURS_LABELS.活動) ||
            desc.includes('ticket')
          ) {
            activityItems.push({
              id: `quick-activity-${index}`,
              departure_data_id: data?.id || '',
              date: baseDate,
              venue_name: item.description,
              unit_price: item.unit_price,
              quantity: item.quantity,
              subtotal: item.amount,
              expected_amount: item.amount,
              notes: item.notes || '',
              display_order: activityItems.length,
            })
          } else {
            otherItems.push({
              id: `quick-other-${index}`,
              departure_data_id: data?.id || '',
              date: baseDate,
              item_name: item.description,
              unit_price: item.unit_price,
              quantity: item.quantity,
              subtotal: item.amount,
              expected_amount: item.amount,
              notes: item.notes || '',
              display_order: otherItems.length,
            })
          }
        })
      }

      setMeals(mealItems)
      setAccommodations(accomItems)
      setActivities(activityItems)
      setOthers(otherItems)

      setData(prev => ({
        ...prev!,
        sales_person: quote?.handler_name || prev?.sales_person || '',
      }))

      toast.success(COMP_TOURS_LABELS.已從報價單帶入資料)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
      const errorDetails =
        error && typeof error === 'object'
          ? {
              message: (error as { message?: string }).message,
              code: (error as { code?: string }).code,
              details: (error as { details?: string }).details,
              hint: (error as { hint?: string }).hint,
            }
          : error
      logger.error(COMP_TOURS_LABELS.從報價單載入失敗, errorDetails, '| quoteId:', quoteId)
      toast.error(`載入失敗: ${errorMessage || COMP_TOURS_LABELS.未知錯誤}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadLinkedQuotes()
    }
  }, [open, tour.id])

  return {
    linkedQuotes,
    selectedQuoteId,
    setSelectedQuoteId,
    showQuoteSelector,
    setShowQuoteSelector,
    loadingQuotes,
    loading,
    loadFromQuote,
    handleSelectQuote,
  }
}
