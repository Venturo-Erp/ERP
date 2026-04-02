'use client'

import { useState, useEffect } from 'react'
import { logger } from '@/lib/utils/logger'
import { dynamicFrom, castRows, castRow } from '@/lib/supabase/typed-client'
import { toast } from 'sonner'
import type {
  TourDepartureData,
  TourDepartureMeal,
  TourDepartureAccommodation,
  TourDepartureActivity,
  TourDepartureOther,
} from '@/types/tour-departure.types'
import { COMP_TOURS_LABELS } from '../constants/labels'

export function useTourDepartureData(tourId: string, open: boolean) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<TourDepartureData | null>(null)
  const [meals, setMeals] = useState<TourDepartureMeal[]>([])
  const [accommodations, setAccommodations] = useState<TourDepartureAccommodation[]>([])
  const [activities, setActivities] = useState<TourDepartureActivity[]>([])
  const [others, setOthers] = useState<TourDepartureOther[]>([])

  const loadDepartureData = async () => {
    try {
      setLoading(true)

      // 載入主表資料
      const { data: mainData, error: mainError } = await dynamicFrom('tour_departure_data')
        .select('id, tour_id, day_number, date, description, workspace_id, created_at, updated_at')
        .eq('tour_id', tourId)
        .single()

      if (mainError && mainError.code !== 'PGRST116') {
        throw mainError
      }

      if (mainData) {
        setData(castRow<TourDepartureData>(mainData) as TourDepartureData)

        // 載入餐食
        const { data: mealsData } = await dynamicFrom('tour_departure_meals')
          .select('id, departure_data_id, meal_type, restaurant_name, menu, cost, workspace_id, created_at')
          .eq('departure_data_id', mainData.id)
          .order('date', { ascending: true })
          .order('display_order', { ascending: true })
          .limit(500)
        setMeals(castRows<TourDepartureMeal>(mealsData))

        // 載入住宿
        const { data: accomData } = await dynamicFrom('tour_departure_accommodations')
          .select('id, departure_data_id, hotel_name, room_type, room_count, cost, workspace_id, created_at')
          .eq('departure_data_id', mainData.id)
          .order('date', { ascending: true })
          .order('display_order', { ascending: true })
          .limit(500)
        setAccommodations(castRows<TourDepartureAccommodation>(accomData))

        // 載入活動
        const { data: activData } = await dynamicFrom('tour_departure_activities')
          .select('id, departure_data_id, activity_name, description, cost, workspace_id, created_at')
          .eq('departure_data_id', mainData.id)
          .order('date', { ascending: true })
          .order('display_order', { ascending: true })
          .limit(500)
        setActivities(castRows<TourDepartureActivity>(activData))

        // 載入其他
        const { data: othersData } = await dynamicFrom('tour_departure_others')
          .select('id, departure_data_id, item_name, description, cost, workspace_id, created_at')
          .eq('departure_data_id', mainData.id)
          .order('date', { ascending: true })
          .order('display_order', { ascending: true })
        setOthers(castRows<TourDepartureOther>(othersData))
      } else {
        setData({
          id: '',
          tour_id: tourId,
          service_fee_per_person: 1500,
          petty_cash: 0,
        } as TourDepartureData)
      }
    } catch (error) {
      logger.error(COMP_TOURS_LABELS.載入出團資料失敗, error)
      toast.error(COMP_TOURS_LABELS.載入失敗)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!data) return

    setSaving(true)
    try {
      let departureDataId = data.id

      if (!departureDataId) {
        // 新增
        const { data: newData, error } = await dynamicFrom('tour_departure_data')
          .insert({
            ...data,
            tour_id: tourId,
          })
          .select()
          .single()

        if (error) throw error
        departureDataId = newData.id
        setData(prev => ({ ...prev!, id: departureDataId }))
      } else {
        // 更新
        const { error } = await dynamicFrom('tour_departure_data')
          .update(data)
          .eq('id', departureDataId)

        if (error) throw error
      }

      toast.success(COMP_TOURS_LABELS.儲存成功)
      return true
    } catch (error) {
      logger.error(COMP_TOURS_LABELS.儲存失敗_2, error)
      toast.error(COMP_TOURS_LABELS.儲存失敗)
      return false
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadDepartureData()
    }
  }, [open, tourId])

  return {
    loading,
    saving,
    data,
    setData,
    meals,
    setMeals,
    accommodations,
    setAccommodations,
    activities,
    setActivities,
    others,
    setOthers,
    loadDepartureData,
    handleSave,
  }
}
