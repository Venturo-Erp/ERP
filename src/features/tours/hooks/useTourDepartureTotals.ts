'use client'

import { useMemo } from 'react'
import type {
  TourDepartureData,
  TourDepartureMeal,
  TourDepartureAccommodation,
  TourDepartureActivity,
  TourDepartureOther,
} from '@/types/tour-departure.types'
import type { Tour } from '@/types/tour.types'

function useTourDepartureTotals(
  meals: TourDepartureMeal[],
  accommodations: TourDepartureAccommodation[],
  activities: TourDepartureActivity[],
  others: TourDepartureOther[],
  data: TourDepartureData | null,
  tour: Tour
) {
  return useMemo(() => {
    const mealsTotal = meals.reduce((sum, item) => sum + (item.expected_amount || 0), 0)
    const accomTotal = accommodations.reduce((sum, item) => sum + (item.expected_amount || 0), 0)
    const activityTotal = activities.reduce((sum, item) => sum + (item.expected_amount || 0), 0)
    const othersTotal = others.reduce((sum, item) => sum + (item.expected_amount || 0), 0)

    const mealsActual = meals.reduce((sum, item) => sum + (item.actual_amount || 0), 0)
    const accomActual = accommodations.reduce((sum, item) => sum + (item.actual_amount || 0), 0)
    const activityActual = activities.reduce((sum, item) => sum + (item.actual_amount || 0), 0)
    const othersActual = others.reduce((sum, item) => sum + (item.actual_amount || 0), 0)

    const serviceFee = (data?.service_fee_per_person || 0) * (tour.current_participants || 0)
    const pettyCash = data?.petty_cash || 0

    return {
      mealsTotal,
      accomTotal,
      activityTotal,
      othersTotal,
      mealsActual,
      accomActual,
      activityActual,
      othersActual,
      serviceFee,
      pettyCash,
      expectedTotal: mealsTotal + accomTotal + activityTotal + othersTotal + serviceFee + pettyCash,
      actualTotal:
        mealsActual + accomActual + activityActual + othersActual + serviceFee + pettyCash,
    }
  }, [meals, accommodations, activities, others, data, tour.current_participants])
}
