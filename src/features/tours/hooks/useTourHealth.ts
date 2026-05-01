'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import { TOUR_HEALTH_LABELS } from '../constants/labels'

interface TourHealthData {
  isLoading: boolean
  error: string | null
  requirements: {
    status: 'good' | 'warning' | 'error'
    message: string
    count?: number
    total?: number
  }
  passports: {
    status: 'good' | 'warning' | 'error'
    message: string
    count?: number
    total?: number
  }
  tickets: {
    status: 'good' | 'warning' | 'error'
    message: string
    count?: number
    total?: number
  }
  hotels: {
    status: 'good' | 'warning' | 'error'
    message: string
    count?: number
    total?: number
  }
  participants: {
    status: 'good' | 'warning' | 'error'
    message: string
    current?: number
    max?: number
  }
}

function useTourHealth(tourId: string): TourHealthData {
  const [data, setData] = useState<TourHealthData>({
    isLoading: true,
    error: null,
    requirements: { status: 'good', message: TOUR_HEALTH_LABELS.全部完成 },
    passports: { status: 'good', message: TOUR_HEALTH_LABELS.全部完成 },
    tickets: { status: 'good', message: TOUR_HEALTH_LABELS.全部完成 },
    hotels: { status: 'good', message: TOUR_HEALTH_LABELS.全部完成 },
    participants: { status: 'good', message: TOUR_HEALTH_LABELS.全部完成 },
  })

  useEffect(() => {
    if (!tourId) return

    const fetchHealthData = async () => {
      try {
        setData(prev => ({ ...prev, isLoading: true, error: null }))

        // 1. 查詢需求單狀態（2026-04-23：tour_requests 砍除、stub 為空）
        const tourRequests: Array<{ id: string; status: string }> = []
        const requestIds: string[] = []
        const pendingRequests: Array<{ id: string; status: string }> = []

        // 2. 查詢該團所有成員的護照和機票狀態
        // 先查詢該團的所有訂單
        const { data: tourOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('tour_id', tourId)

        const orderIds = tourOrders?.map(order => order.id) || []

        // 再查詢這些訂單的成員（如果有訂單的話）
        let members: Array<{
          passport_number: string | null
          ticket_number: string | null
          order_id: string
        }> = []
        let membersError = null

        if (orderIds.length > 0) {
          const result = await supabase
            .from('order_members')
            .select('passport_number, ticket_number, order_id')
            .in('order_id', orderIds)

          members = result.data || []
          membersError = result.error
        }

        if (membersError) {
          logger.error('查詢團員資料失敗:', membersError)
        }

        // 統計缺護照和沒機票的人數
        const missingPassports = members.filter(
          member => !member.passport_number || member.passport_number.trim() === ''
        )

        const missingTickets = members.filter(
          member => !member.ticket_number || member.ticket_number.trim() === ''
        )

        // 3. 查詢飯店確認狀態
        const { data: accommodations, error: accommodationsError } = await supabase
          .from('tour_itinerary_items')
          .select('confirmation_status')
          .eq('tour_id', tourId)
          .eq('category', 'accommodation')

        if (accommodationsError) {
          logger.error('查詢住宿資料失敗:', accommodationsError)
        }

        // 統計未確認的飯店
        const unconfirmedHotels =
          accommodations?.filter(
            hotel => !hotel.confirmation_status || hotel.confirmation_status !== 'confirmed'
          ) || []

        // 4. 查詢團員人數
        const { data: tour, error: tourError } = await supabase
          .from('tours')
          .select('current_participants, max_participants')
          .eq('id', tourId)
          .single()

        if (tourError) {
          logger.error('查詢旅遊團資料失敗:', tourError)
        }

        // 建立健康度資料
        const healthData: TourHealthData = {
          isLoading: false,
          error: null,
          requirements: buildHealthStatus(
            pendingRequests.length,
            tourRequests?.length || 0,
            TOUR_HEALTH_LABELS.項需回覆
          ),
          passports: buildHealthStatus(
            missingPassports.length,
            members.length,
            TOUR_HEALTH_LABELS.人缺護照
          ),
          tickets: buildHealthStatus(
            missingTickets.length,
            members.length,
            TOUR_HEALTH_LABELS.人沒有機票
          ),
          hotels: buildHealthStatus(
            unconfirmedHotels.length,
            accommodations?.length || 0,
            TOUR_HEALTH_LABELS.間飯店未確認
          ),
          participants: buildParticipantsStatus(
            tour?.current_participants || 0,
            tour?.max_participants || 0
          ),
        }

        setData(healthData)
      } catch (err) {
        logger.error('載入健康度資料失敗:', err)
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: TOUR_HEALTH_LABELS.載入失敗,
        }))
      }
    }

    fetchHealthData()
  }, [tourId])

  return data
}

// 建立一般健康度狀態
function buildHealthStatus(
  problemCount: number,
  total: number,
  problemLabel: string
): { status: 'good' | 'warning' | 'error'; message: string; count?: number; total?: number } {
  if (total === 0) {
    return {
      status: 'warning',
      message: TOUR_HEALTH_LABELS.尚未開團,
      count: 0,
      total: 0,
    }
  }

  if (problemCount === 0) {
    return {
      status: 'good',
      message: TOUR_HEALTH_LABELS.全部完成,
      count: 0,
      total,
    }
  }

  if (problemCount === total) {
    return {
      status: 'error',
      message: `全部${problemLabel}`,
      count: problemCount,
      total,
    }
  }

  return {
    status: 'warning',
    message: `${problemCount}${problemLabel}`,
    count: problemCount,
    total,
  }
}

// 建立團員人數狀態
function buildParticipantsStatus(
  current: number,
  max: number
): { status: 'good' | 'warning' | 'error'; message: string; current?: number; max?: number } {
  if (max === 0) {
    return {
      status: 'warning',
      message: TOUR_HEALTH_LABELS.尚未開團,
      current,
      max,
    }
  }

  if (current === max) {
    return {
      status: 'good',
      message: `${current}${TOUR_HEALTH_LABELS.人滿團}`,
      current,
      max,
    }
  }

  if (current === 0) {
    return {
      status: 'error',
      message: TOUR_HEALTH_LABELS.尚未開團,
      current,
      max,
    }
  }

  return {
    status: 'warning',
    message: `${current}/${max} 人`,
    current,
    max,
  }
}
