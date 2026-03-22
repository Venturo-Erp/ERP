import { useState, useRef, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { TOUR_CONFIRMATION_SHEET_PAGE_LABELS } from '../constants/labels'
import type { Tour } from '@/stores/types'
import type {
  ConfirmationItemCategory,
  CreateConfirmationItem,
  ResourceType,
} from '@/types/tour-confirmation-sheet.types'

// 新行的初始狀態
const EMPTY_NEW_ITEM = {
  service_date: '',
  service_date_end: '',
  supplier_name: '',
  title: '',
  unit_price: '',
  quantity: '',
  expected_cost: '',
  actual_cost: '',
  notes: '',
}

// 交通子類型
type TransportSubType = 'flight' | 'vehicle' | null

interface DailyItineraryDay {
  date?: string
  dayLabel?: string
  meals?: { breakfast?: string; lunch?: string; dinner?: string }
  accommodation?: string
  accommodationRating?: number
  activities?: Array<{ title?: string; description?: string }>
}

interface UseSheetItemActionsOptions {
  tour: Tour
  sheetId: string | undefined
  addItem: (data: CreateConfirmationItem) => Promise<unknown>
  itinerary: { daily_itinerary?: DailyItineraryDay[] } | null
  tourRequests: Array<{
    id: string
    category: string
    service_date?: string | null
    service_date_end?: string | null
    supplier_name?: string | null
    supplier_id?: string | null
    title: string
    description?: string | null
    currency?: string | null
    quantity?: number | null
    quoted_cost?: number | null
    estimated_cost?: number | null
    final_cost?: number | null
    status?: string | null
    notes?: string | null
    resource_type?: string | null
    resource_id?: string | null
    latitude?: number | null
    longitude?: number | null
    google_maps_url?: string | null
  }>
}

/**
 * 管理團確單的項目新增、匯入操作
 */
export function useSheetItemActions({
  tour,
  sheetId,
  addItem,
  itinerary,
  tourRequests,
}: UseSheetItemActionsOptions) {
  // Inline 新增狀態
  const [addingCategory, setAddingCategory] = useState<ConfirmationItemCategory | null>(null)
  const [newItemData, setNewItemData] = useState(EMPTY_NEW_ITEM)
  const [savingNew, setSavingNew] = useState(false)
  const firstInputRef = useRef<HTMLInputElement>(null)
  const [transportSubType, setTransportSubType] = useState<TransportSubType>(null)
  const [manualFlightMode, setManualFlightMode] = useState(false)
  const [manualFlight, setManualFlight] = useState({
    outbound: { airline: '', flightNumber: '', departureAirport: '', arrivalAirport: '' },
    return: { airline: '', flightNumber: '', departureAirport: '', arrivalAirport: '' },
  })

  // 聚焦到第一個輸入框
  useEffect(() => {
    if (addingCategory && firstInputRef.current) {
      firstInputRef.current.focus()
    }
  }, [addingCategory])

  const handleAdd = useCallback((category: ConfirmationItemCategory) => {
    setAddingCategory(category)
    setNewItemData(EMPTY_NEW_ITEM)
    if (category === 'transport') {
      setTransportSubType(null)
    }
  }, [])

  const handleCancelAdd = useCallback(() => {
    setAddingCategory(null)
    setNewItemData(EMPTY_NEW_ITEM)
    setTransportSubType(null)
  }, [])

  const handleSelectTransportType = useCallback((type: TransportSubType) => {
    setTransportSubType(type)
  }, [])

  const handleNewItemChange = useCallback((field: keyof typeof EMPTY_NEW_ITEM, value: string) => {
    setNewItemData(prev => ({ ...prev, [field]: value }))
  }, [])

  // 從航班資訊創建項目
  const handleAddFlightItems = useCallback(async () => {
    if (!sheetId) return
    setSavingNew(true)
    try {
      if (tour.outbound_flight) {
        const outbound = Array.isArray(tour.outbound_flight)
          ? tour.outbound_flight[0]
          : tour.outbound_flight
        if (!outbound) return
        await addItem({
          sheet_id: sheetId,
          category: 'transport',
          service_date: tour.departure_date || '',
          service_date_end: null,
          day_label: null,
          supplier_name: outbound.airline || '',
          supplier_id: null,
          title: `去程 ${outbound.flightNumber} ${outbound.departureAirport}→${outbound.arrivalAirport}`,
          description: `${outbound.departureAirport} ${outbound.departureTime} → ${outbound.arrivalAirport} ${outbound.arrivalTime}`,
          unit_price: null,
          currency: 'TWD',
          quantity: null,
          subtotal: null,
          expected_cost: null,
          actual_cost: null,
          contact_info: null,
          booking_reference: null,
          booking_status: 'pending',
          type_data: null,
          sort_order: 0,
          notes: outbound.duration || null,
        })
      }
      if (tour.return_flight) {
        const returnFlight = Array.isArray(tour.return_flight)
          ? tour.return_flight[0]
          : tour.return_flight
        if (!returnFlight) return
        await addItem({
          sheet_id: sheetId,
          category: 'transport',
          service_date: tour.return_date || '',
          service_date_end: null,
          day_label: null,
          supplier_name: returnFlight.airline || '',
          supplier_id: null,
          title: `回程 ${returnFlight.flightNumber} ${returnFlight.departureAirport}→${returnFlight.arrivalAirport}`,
          description: `${returnFlight.departureAirport} ${returnFlight.departureTime} → ${returnFlight.arrivalAirport} ${returnFlight.arrivalTime}`,
          unit_price: null,
          currency: 'TWD',
          quantity: null,
          subtotal: null,
          expected_cost: null,
          actual_cost: null,
          contact_info: null,
          booking_reference: null,
          booking_status: 'pending',
          type_data: null,
          sort_order: 1,
          notes: returnFlight.duration || null,
        })
      }
      handleCancelAdd()
    } finally {
      setSavingNew(false)
    }
  }, [sheetId, tour, addItem, handleCancelAdd])

  // 儲存手動填寫的航班
  const handleSaveManualFlight = useCallback(async () => {
    if (!sheetId) return
    setSavingNew(true)
    try {
      const outboundFlight = manualFlight.outbound.airline
        ? {
            airline: manualFlight.outbound.airline,
            flightNumber: manualFlight.outbound.flightNumber,
            departureAirport: manualFlight.outbound.departureAirport,
            arrivalAirport: manualFlight.outbound.arrivalAirport,
          }
        : null

      const returnFlight = manualFlight.return.airline
        ? {
            airline: manualFlight.return.airline,
            flightNumber: manualFlight.return.flightNumber,
            departureAirport: manualFlight.return.departureAirport,
            arrivalAirport: manualFlight.return.arrivalAirport,
          }
        : null

      const { error: updateError } = await supabase
        .from('tours')
        .update({
          outbound_flight: outboundFlight,
          return_flight: returnFlight,
        })
        .eq('id', tour.id)

      if (updateError) throw updateError

      if (outboundFlight) {
        await addItem({
          sheet_id: sheetId,
          category: 'transport',
          service_date: tour.departure_date || '',
          service_date_end: null,
          day_label: null,
          supplier_name: outboundFlight.airline,
          supplier_id: null,
          title: `去程 ${outboundFlight.flightNumber} ${outboundFlight.departureAirport}→${outboundFlight.arrivalAirport}`,
          description: null,
          unit_price: null,
          currency: 'TWD',
          quantity: null,
          subtotal: null,
          expected_cost: null,
          actual_cost: null,
          contact_info: null,
          booking_reference: null,
          booking_status: 'pending',
          type_data: null,
          sort_order: 0,
          notes: null,
        })
      }

      if (returnFlight) {
        await addItem({
          sheet_id: sheetId,
          category: 'transport',
          service_date: tour.return_date || '',
          service_date_end: null,
          day_label: null,
          supplier_name: returnFlight.airline,
          supplier_id: null,
          title: `回程 ${returnFlight.flightNumber} ${returnFlight.departureAirport}→${returnFlight.arrivalAirport}`,
          description: null,
          unit_price: null,
          currency: 'TWD',
          quantity: null,
          subtotal: null,
          expected_cost: null,
          actual_cost: null,
          contact_info: null,
          booking_reference: null,
          booking_status: 'pending',
          type_data: null,
          sort_order: 1,
          notes: null,
        })
      }

      setManualFlightMode(false)
      setManualFlight({
        outbound: { airline: '', flightNumber: '', departureAirport: '', arrivalAirport: '' },
        return: { airline: '', flightNumber: '', departureAirport: '', arrivalAirport: '' },
      })
      handleCancelAdd()
    } finally {
      setSavingNew(false)
    }
  }, [sheetId, tour, manualFlight, addItem, handleCancelAdd])

  // 從行程表帶入餐食
  const handleImportMeals = useCallback(async () => {
    if (!sheetId || !itinerary?.daily_itinerary) return
    setSavingNew(true)
    try {
      for (const day of itinerary.daily_itinerary) {
        const meals = day.meals
        const mealTypes = [
          {
            key: 'breakfast',
            label: TOUR_CONFIRMATION_SHEET_PAGE_LABELS.早餐,
            value: meals?.breakfast,
          },
          { key: 'lunch', label: TOUR_CONFIRMATION_SHEET_PAGE_LABELS.午餐, value: meals?.lunch },
          { key: 'dinner', label: TOUR_CONFIRMATION_SHEET_PAGE_LABELS.晚餐, value: meals?.dinner },
        ]
        for (const meal of mealTypes) {
          if (
            meal.value &&
            meal.value !== TOUR_CONFIRMATION_SHEET_PAGE_LABELS.敬請自理 &&
            meal.value !== TOUR_CONFIRMATION_SHEET_PAGE_LABELS.機上
          ) {
            await addItem({
              sheet_id: sheetId,
              category: 'meal',
              service_date: day.date || '',
              service_date_end: null,
              day_label: day.dayLabel || null,
              supplier_name: '',
              supplier_id: null,
              title: `${meal.label}：${meal.value}`,
              description: null,
              unit_price: null,
              currency: 'TWD',
              quantity: null,
              subtotal: null,
              expected_cost: null,
              actual_cost: null,
              contact_info: null,
              booking_reference: null,
              booking_status: 'pending',
              type_data: null,
              sort_order: 0,
              notes: null,
            })
          }
        }
      }
      handleCancelAdd()
    } finally {
      setSavingNew(false)
    }
  }, [sheetId, itinerary, addItem, handleCancelAdd])

  // 從行程表帶入住宿
  const handleImportAccommodation = useCallback(async () => {
    if (!sheetId || !itinerary?.daily_itinerary) return
    setSavingNew(true)
    try {
      for (const day of itinerary.daily_itinerary) {
        if (
          day.accommodation &&
          day.accommodation !== TOUR_CONFIRMATION_SHEET_PAGE_LABELS.溫暖的家
        ) {
          await addItem({
            sheet_id: sheetId,
            category: 'accommodation',
            service_date: day.date || '',
            service_date_end: null,
            day_label: day.dayLabel || null,
            supplier_name: day.accommodation,
            supplier_id: null,
            title: day.accommodation,
            description: null,
            unit_price: null,
            currency: 'TWD',
            quantity: null,
            subtotal: null,
            expected_cost: null,
            actual_cost: null,
            contact_info: null,
            booking_reference: null,
            booking_status: 'pending',
            type_data: null,
            sort_order: 0,
            notes: day.accommodationRating ? `${day.accommodationRating}星級` : null,
          })
        }
      }
      handleCancelAdd()
    } finally {
      setSavingNew(false)
    }
  }, [sheetId, itinerary, addItem, handleCancelAdd])

  // 從行程表帶入景點/活動
  const handleImportActivities = useCallback(async () => {
    if (!sheetId || !itinerary?.daily_itinerary) return
    setSavingNew(true)
    try {
      for (const day of itinerary.daily_itinerary) {
        if (day.activities && day.activities.length > 0) {
          for (const activity of day.activities) {
            if (activity.title) {
              await addItem({
                sheet_id: sheetId,
                category: 'activity',
                service_date: day.date || '',
                service_date_end: null,
                day_label: day.dayLabel || null,
                supplier_name: '',
                supplier_id: null,
                title: activity.title,
                description: activity.description || null,
                unit_price: null,
                currency: 'TWD',
                quantity: null,
                subtotal: null,
                expected_cost: null,
                actual_cost: null,
                contact_info: null,
                booking_reference: null,
                booking_status: 'pending',
                type_data: null,
                sort_order: 0,
                notes: null,
              })
            }
          }
        }
      }
      handleCancelAdd()
    } finally {
      setSavingNew(false)
    }
  }, [sheetId, itinerary, addItem, handleCancelAdd])

  // 從需求單帶入
  const handleImportFromRequests = useCallback(
    async (category: ConfirmationItemCategory) => {
      if (!sheetId) return

      const categoryMap: Record<ConfirmationItemCategory, string[]> = {
        transport: ['transport', 'vehicle'],
        meal: ['meal', 'restaurant'],
        accommodation: ['accommodation', 'hotel'],
        activity: ['activity', 'attraction'],
        other: ['other'],
      }

      const filteredRequests = tourRequests.filter(req =>
        categoryMap[category].includes(req.category)
      )
      if (filteredRequests.length === 0) return

      setSavingNew(true)
      try {
        for (const req of filteredRequests) {
          await addItem({
            sheet_id: sheetId,
            category,
            service_date: req.service_date || '',
            service_date_end: req.service_date_end || null,
            day_label: null,
            supplier_name: req.supplier_name || '',
            supplier_id: req.supplier_id || null,
            title: req.title,
            description: req.description || null,
            unit_price: null,
            currency: req.currency || 'TWD',
            quantity: req.quantity || null,
            subtotal: null,
            expected_cost: req.quoted_cost || req.estimated_cost || null,
            actual_cost: req.quoted_cost || null, // 供應商回報價格
            contact_info: null,
            booking_reference: null,
            booking_status: req.status === 'confirmed' ? 'confirmed' : 'pending',
            type_data: null,
            sort_order: 0,
            notes: req.notes || null,
            request_id: req.id,
            resource_type: req.resource_type as ResourceType | null,
            resource_id: req.resource_id || null,
            latitude: req.latitude || null,
            longitude: req.longitude || null,
            google_maps_url: req.google_maps_url || null,
          })
        }
        handleCancelAdd()
      } finally {
        setSavingNew(false)
      }
    },
    [sheetId, tourRequests, addItem, handleCancelAdd]
  )

  // 檢查某分類是否有可帶入的需求單
  const hasRequestsForCategory = useCallback(
    (category: ConfirmationItemCategory): boolean => {
      const categoryMap: Record<ConfirmationItemCategory, string[]> = {
        transport: ['transport', 'vehicle'],
        meal: ['meal', 'restaurant'],
        accommodation: ['accommodation', 'hotel'],
        activity: ['activity', 'attraction'],
        other: ['other'],
      }
      return tourRequests.some(req => categoryMap[category].includes(req.category))
    },
    [tourRequests]
  )

  // 儲存新項目
  const handleSaveNewItem = useCallback(async () => {
    if (!sheetId || !addingCategory) return
    setSavingNew(true)
    try {
      let title = newItemData.title || TOUR_CONFIRMATION_SHEET_PAGE_LABELS.新項目
      const hasDateRange =
        newItemData.service_date_end && newItemData.service_date_end !== newItemData.service_date
      if (addingCategory === 'transport' && transportSubType === 'vehicle') {
        if (hasDateRange) {
          title = title || TOUR_CONFIRMATION_SHEET_PAGE_LABELS.全程用車
        } else {
          title = title || TOUR_CONFIRMATION_SHEET_PAGE_LABELS.單日用車
        }
      }

      await addItem({
        sheet_id: sheetId,
        category: addingCategory,
        service_date: newItemData.service_date || '',
        service_date_end: hasDateRange ? newItemData.service_date_end : null,
        day_label: null,
        supplier_name: newItemData.supplier_name || '',
        supplier_id: null,
        title,
        description: null,
        unit_price: newItemData.unit_price ? parseFloat(newItemData.unit_price) : null,
        currency: 'TWD',
        quantity: newItemData.quantity ? parseInt(newItemData.quantity) : null,
        subtotal: null,
        expected_cost: newItemData.expected_cost ? parseFloat(newItemData.expected_cost) : null,
        actual_cost: newItemData.actual_cost ? parseFloat(newItemData.actual_cost) : null,
        contact_info: null,
        booking_reference: null,
        booking_status: 'pending',
        type_data: null,
        sort_order: 0,
        notes: newItemData.notes || null,
      })
      handleCancelAdd()
    } finally {
      setSavingNew(false)
    }
  }, [sheetId, addingCategory, newItemData, transportSubType, addItem, handleCancelAdd])

  return {
    // 新增狀態
    addingCategory,
    newItemData,
    savingNew,
    firstInputRef,
    transportSubType,
    manualFlightMode,
    manualFlight,
    setManualFlightMode,
    setManualFlight,
    // 操作
    handleAdd,
    handleCancelAdd,
    handleSelectTransportType,
    handleNewItemChange,
    handleAddFlightItems,
    handleSaveManualFlight,
    handleImportMeals,
    handleImportAccommodation,
    handleImportActivities,
    handleImportFromRequests,
    hasRequestsForCategory,
    handleSaveNewItem,
  }
}
