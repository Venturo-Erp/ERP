'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useItineraries, useEmployeesSlim, useQuotes, useToursSlim } from '@/data'
import { useCountries, useCities } from '@/data'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceStore } from '@/stores'
import type { Itinerary } from '@/stores/types'
import { stripHtml } from '@/lib/utils/string-utils'
import { ITINERARY_ACTIONS_LABELS } from '../constants/labels'

export function useItineraryList() {
  const router = useRouter()
  const { items: itineraries } = useItineraries()
  const { items: employees } = useEmployeesSlim()
  const { items: tours } = useToursSlim()
  const { user } = useAuthStore()
  const { workspaces, loadWorkspaces } = useWorkspaceStore()
  const { items: countries } = useCountries()
  const { items: cities } = useCities()

  // 篩選和搜尋狀態
  const [statusFilter, setStatusFilter] = useState<string>('全部')
  const [authorFilter, setAuthorFilter] = useState<string>('__mine__')
  const [searchTerm, setSearchTerm] = useState('')

  // SWR 自動載入地區資料，不需要手動 fetchAll

  // 根據 ID 取得國家名稱
  const getCountryName = useCallback(
    (countryId?: string) => {
      if (!countryId) return '-'
      const country = countries.find(c => c.id === countryId)
      return country?.name || countryId
    },
    [countries]
  )

  // 根據 ID 取得城市名稱
  const getCityName = useCallback(
    (cityId?: string) => {
      if (!cityId) return '-'
      const city = cities.find(c => c.id === cityId)
      return city?.name || cityId
    },
    [cities]
  )

  // 根據 created_by ID 查找員工名稱（優先使用 display_name）
  const getEmployeeName = useCallback(
    (employeeId?: string) => {
      if (!employeeId) return '-'
      const employee = employees.find(e => e.id === employeeId)
      return employee?.display_name || employee?.chinese_name || '-'
    },
    [employees]
  )

  // 根據 tour_id 查找綁定的團號
  const getLinkedTourCode = useCallback(
    (tourId?: string | null) => {
      if (!tourId) return null
      const tour = tours.find(t => t.id === tourId)
      return tour?.code || null
    },
    [tours]
  )

  // 判斷行程是否已結案（手動結案或日期過期）
  const isItineraryClosed = useCallback((itinerary: Itinerary) => {
    // 手動結案
    if (itinerary.closed_at) return true
    // 公司範例不會因為日期過期而結案
    if (itinerary.is_template) return false
    // 日期過期自動結案
    if (itinerary.departure_date) {
      const departureDate = new Date(itinerary.departure_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return departureDate < today
    }
    return false
  }, [])

  // 過濾資料
  const filteredItineraries = useMemo(() => {
    let filtered = itineraries

    // 狀態篩選
    switch (statusFilter) {
      case '開團':
        filtered = filtered.filter(
          item =>
            item.status === '開團' &&
            !isItineraryClosed(item) &&
            !item.archived_at &&
            !item.is_template
        )
        break
      case '待出發':
        filtered = filtered.filter(
          item =>
            item.status === '待出發' &&
            !isItineraryClosed(item) &&
            !item.archived_at &&
            !item.is_template
        )
        break
      case '公司範例':
        filtered = filtered.filter(item => item.is_template && !item.archived_at)
        break
      case '已結團':
        filtered = filtered.filter(item => isItineraryClosed(item) && !item.archived_at)
        break
      default:
        // 全部：排除封存的和公司範例
        filtered = filtered.filter(item => !item.archived_at && !item.is_template)
    }

    // 作者篩選
    const effectiveAuthorFilter = authorFilter === '__mine__' ? user?.id : authorFilter
    if (effectiveAuthorFilter && effectiveAuthorFilter !== 'all') {
      filtered = filtered.filter(item => item.created_by === effectiveAuthorFilter)
    }

    // 搜尋 - 搜尋所有文字欄位（移除 HTML 標籤後再搜尋）
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        item =>
          stripHtml(item.title).toLowerCase().includes(searchLower) ||
          item.country.toLowerCase().includes(searchLower) ||
          item.city.toLowerCase().includes(searchLower) ||
          item.tour_code?.toLowerCase().includes(searchLower) ||
          item.status.toLowerCase().includes(searchLower) ||
          stripHtml(item.description).toLowerCase().includes(searchLower)
      )
    }

    // 排序：已綁定團的行程表排在最後面
    filtered = filtered.sort((a, b) => {
      const aLinked = !!a.tour_id
      const bLinked = !!b.tour_id
      if (aLinked && !bLinked) return 1
      if (!aLinked && bLinked) return -1
      return 0
    })

    return filtered
  }, [itineraries, statusFilter, searchTerm, isItineraryClosed, authorFilter, user?.id])

  return {
    // 資料
    itineraries: filteredItineraries,
    employees,
    workspaces,
    // 篩選狀態
    statusFilter,
    setStatusFilter,
    authorFilter,
    setAuthorFilter,
    searchTerm,
    setSearchTerm,
    // 輔助函數
    getCountryName,
    getCityName,
    getEmployeeName,
    getLinkedTourCode,
    isItineraryClosed,
    stripHtml,
    // 路由
    router,
  }
}
