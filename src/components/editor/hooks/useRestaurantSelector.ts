'use client'

import { useState, useMemo, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { Restaurant, MichelinRestaurant, CombinedRestaurant } from '../RestaurantSelector'

interface UseRestaurantSelectorProps {
  isOpen: boolean
  tourCountryName?: string
  includeMichelin?: boolean
}

interface LocationData {
  id: string
  name: string
}

// Supabase 查詢結果型別（一般餐廳）
interface RestaurantQueryResult {
  id: string
  name: string
  name_en: string | null
  country_id: string
  region_id: string | null
  city_id: string
  cuisine_type: string[] | null
  category: string | null
  meal_type: string[] | null
  description: string | null
  specialties: string[] | null
  price_range: string | null
  avg_price_lunch: number | null
  avg_price_dinner: number | null
  group_friendly: boolean | null
  max_group_size: number | null
  group_menu_available: boolean | null
  private_room: boolean | null
  images: string[] | null
  rating: number | null
  is_active: boolean | null
  is_featured: boolean | null
  latitude: number | null
  longitude: number | null
  address: string | null
  phone: string | null
  google_maps_url: string | null
  regions: { name: string } | null
  cities: { name: string } | null
}

// Supabase 查詢結果型別（米其林餐廳）
interface MichelinQueryResult {
  id: string
  name: string
  name_en: string | null
  country_id: string
  city_id: string
  michelin_stars: number | null
  bib_gourmand: boolean | null
  green_star: boolean | null
  cuisine_type: string[] | null
  description: string | null
  signature_dishes: string[] | null
  price_range: string | null
  avg_price_lunch: number | null
  avg_price_dinner: number | null
  max_group_size: number | null
  group_menu_available: boolean | null
  images: string[] | null
  is_active: boolean | null
  latitude: number | null
  longitude: number | null
  address: string | null
  phone: string | null
  google_maps_url: string | null
  cities: { name: string } | null
}

// 保存篩選狀態
let savedCountryId = ''
let savedRegionId = ''
let savedCityId = ''
let savedCategory = ''

export function useRestaurantSelector({
  isOpen,
  tourCountryName = '',
  includeMichelin = true,
}: UseRestaurantSelectorProps) {
  // Location filters
  const [selectedCountryId, setSelectedCountryId] = useState<string>(savedCountryId)
  const [selectedRegionId, setSelectedRegionId] = useState<string>(savedRegionId)
  const [selectedCityId, setSelectedCityId] = useState<string>(savedCityId)
  const [selectedCategory, setSelectedCategory] = useState<string>(savedCategory)

  // Search and data
  const [searchQuery, setSearchQuery] = useState('')
  const [restaurants, setRestaurants] = useState<CombinedRestaurant[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  // Location data
  const [countries, setCountries] = useState<LocationData[]>([])
  const [regions, setRegions] = useState<LocationData[]>([])
  const [cities, setCities] = useState<LocationData[]>([])

  // Michelin filter
  const [showMichelinOnly, setShowMichelinOnly] = useState(false)

  // 載入所有國家
  useEffect(() => {
    if (!isOpen) return

    const loadCountries = async () => {
      const { data } = await supabase
        .from('countries')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      setCountries(data || [])
    }
    loadCountries().catch(err => logger.error('[loadCountries]', err))
  }, [isOpen])

  // 打開對話框時自動選擇行程的國家
  useEffect(() => {
    if (isOpen && countries.length > 0) {
      setSelectedIds(new Set())

      if (tourCountryName) {
        const matchedCountry = countries.find(c => c.name === tourCountryName)
        if (matchedCountry && matchedCountry.id !== savedCountryId) {
          setSelectedCountryId(matchedCountry.id)
          savedCountryId = matchedCountry.id
          setSelectedRegionId('')
          savedRegionId = ''
          setSelectedCityId('')
          savedCityId = ''
          return
        }
      }

      if (savedCountryId) {
        setSelectedCountryId(savedCountryId)
        setSelectedRegionId(savedRegionId)
        setSelectedCityId(savedCityId)
        setSelectedCategory(savedCategory)
      }
    }
  }, [isOpen, tourCountryName, countries])

  // 國家變更
  const handleCountryChange = (countryId: string) => {
    const value = countryId === '__all__' ? '' : countryId
    setSelectedCountryId(value)
    setSelectedRegionId('')
    setSelectedCityId('')
    savedCountryId = value
    savedRegionId = ''
    savedCityId = ''
  }

  // 區域變更
  const handleRegionChange = (regionId: string) => {
    const value = regionId === '__all__' ? '' : regionId
    setSelectedRegionId(value)
    setSelectedCityId('')
    savedRegionId = value
    savedCityId = ''
  }

  // 城市變更
  const handleCityChange = (cityId: string) => {
    const value = cityId === '__all__' ? '' : cityId
    setSelectedCityId(value)
    savedCityId = value
  }

  // 分類變更
  const handleCategoryChange = (category: string) => {
    const value = category === '__all__' ? '' : category
    setSelectedCategory(value)
    savedCategory = value
  }

  // 載入區域列表
  useEffect(() => {
    if (!isOpen || !selectedCountryId) {
      setRegions([])
      return
    }

    const loadRegions = async () => {
      const { data } = await supabase
        .from('regions')
        .select('id, name')
        .eq('country_id', selectedCountryId)
        .eq('is_active', true)
        .order('name')
      setRegions(data || [])
    }
    loadRegions().catch(err => logger.error('[loadRegions]', err))
  }, [isOpen, selectedCountryId])

  // 載入城市列表（根據區域或國家）
  useEffect(() => {
    if (!isOpen || !selectedCountryId) {
      setCities([])
      return
    }

    const loadCities = async () => {
      let query = supabase
        .from('cities')
        .select('id, name')
        .eq('country_id', selectedCountryId)
        .eq('is_active', true)
        .order('name')

      // 如果有選區域，只顯示該區域的城市
      if (selectedRegionId) {
        query = query.eq('region_id', selectedRegionId)
      }

      const { data } = await query
      setCities(data || [])
    }
    loadCities().catch(err => logger.error('[loadCities]', err))
  }, [isOpen, selectedCountryId, selectedRegionId])

  // 載入餐廳資料（包含一般餐廳和米其林餐廳）
  useEffect(() => {
    if (!isOpen) return

    const loadRestaurants = async () => {
      if (!selectedCountryId) {
        setRestaurants([])
        return
      }

      setLoading(true)
      try {
        const results: CombinedRestaurant[] = []

        // 1. 載入一般餐廳
        if (!showMichelinOnly) {
          let restaurantQuery = supabase
            .from('restaurants')
            .select(
              `
              id, name, name_en, country_id, region_id, city_id,
              cuisine_type, category, meal_type, description,
              specialties, price_range, avg_price_lunch, avg_price_dinner,
              group_friendly, max_group_size, group_menu_available,
              private_room, images, rating, is_active, is_featured,
              latitude, longitude, address, phone, google_maps_url,
              regions(name),
              cities!inner(name)
            `
            )
            .eq('is_active', true)
            .eq('country_id', selectedCountryId)
            .order('is_featured', { ascending: false })
            .order('display_order')

          // 區域篩選
          if (selectedRegionId) {
            restaurantQuery = restaurantQuery.eq('region_id', selectedRegionId)
          }

          // 城市篩選
          if (selectedCityId) {
            restaurantQuery = restaurantQuery.eq('city_id', selectedCityId)
          }

          // 分類篩選
          if (selectedCategory) {
            restaurantQuery = restaurantQuery.eq('category', selectedCategory)
          }

          const { data: restaurantData } = await restaurantQuery

          if (restaurantData) {
            // 透過 unknown 中轉處理 Supabase 的複雜型別
            ;(restaurantData as unknown as RestaurantQueryResult[]).forEach(item => {
              results.push({
                id: item.id,
                name: item.name,
                name_en: item.name_en,
                country_id: item.country_id,
                region_id: item.region_id || null,
                city_id: item.city_id,
                cuisine_type: item.cuisine_type,
                category: item.category,
                meal_type: item.meal_type,
                description: item.description,
                specialties: item.specialties,
                price_range: item.price_range,
                avg_price_lunch: item.avg_price_lunch,
                avg_price_dinner: item.avg_price_dinner,
                group_friendly: item.group_friendly ?? true,
                max_group_size: item.max_group_size,
                group_menu_available: item.group_menu_available ?? false,
                private_room: item.private_room ?? false,
                images: item.images,
                rating: item.rating,
                is_active: item.is_active ?? true,
                is_featured: item.is_featured ?? false,
                // GPS 資訊
                latitude: item.latitude,
                longitude: item.longitude,
                address: item.address,
                phone: item.phone,
                google_maps_url: item.google_maps_url,
                source: 'restaurant' as const,
                region_name: item.regions?.name || '',
                city_name: item.cities?.name || '',
              })
            })
          }
        }

        // 2. 載入米其林餐廳
        if (includeMichelin) {
          let michelinQuery = supabase
            .from('michelin_restaurants')
            .select(
              `
              id, name, name_en, country_id, city_id,
              michelin_stars, bib_gourmand, green_star,
              cuisine_type, description, signature_dishes,
              price_range, avg_price_lunch, avg_price_dinner,
              max_group_size, group_menu_available,
              images, is_active,
              latitude, longitude, address, phone, google_maps_url,
              cities!inner(name)
            `
            )
            .eq('is_active', true)
            .eq('country_id', selectedCountryId)
            .order('michelin_stars', { ascending: false })

          // 城市篩選
          if (selectedCityId) {
            michelinQuery = michelinQuery.eq('city_id', selectedCityId)
          }

          const { data: michelinData } = await michelinQuery

          if (michelinData) {
            // 透過 unknown 中轉處理 Supabase 的複雜型別
            ;(michelinData as unknown as MichelinQueryResult[]).forEach(item => {
              results.push({
                id: item.id,
                name: item.name,
                name_en: item.name_en,
                country_id: item.country_id,
                city_id: item.city_id,
                michelin_stars: item.michelin_stars,
                bib_gourmand: item.bib_gourmand,
                green_star: item.green_star,
                cuisine_type: item.cuisine_type,
                description: item.description,
                signature_dishes: item.signature_dishes,
                price_range: item.price_range,
                avg_price_lunch: item.avg_price_lunch,
                avg_price_dinner: item.avg_price_dinner,
                group_friendly: true,
                max_group_size: item.max_group_size,
                group_menu_available: item.group_menu_available ?? false,
                private_room: false,
                images: item.images,
                is_active: item.is_active ?? true,
                // GPS 資訊
                latitude: item.latitude,
                longitude: item.longitude,
                address: item.address,
                phone: item.phone,
                google_maps_url: item.google_maps_url,
                source: 'michelin' as const,
                city_name: item.cities?.name || '',
              })
            })
          }
        }

        // 排序：米其林優先，然後是精選
        results.sort((a, b) => {
          if (a.source === 'michelin' && b.source !== 'michelin') return -1
          if (a.source !== 'michelin' && b.source === 'michelin') return 1
          return 0
        })

        setRestaurants(results)
      } catch (error) {
        logger.error('Error loading restaurants:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRestaurants()
  }, [
    isOpen,
    selectedCountryId,
    selectedRegionId,
    selectedCityId,
    selectedCategory,
    includeMichelin,
    showMichelinOnly,
  ])

  // 搜尋過濾
  const filteredRestaurants = useMemo(() => {
    let filtered = restaurants

    if (showMichelinOnly) {
      filtered = filtered.filter(r => r.source === 'michelin')
    }

    if (!searchQuery) return filtered

    const query = searchQuery.toLowerCase()
    return filtered.filter(
      r =>
        r.name.toLowerCase().includes(query) ||
        r.name_en?.toLowerCase().includes(query) ||
        r.region_name?.toLowerCase().includes(query) ||
        r.city_name?.toLowerCase().includes(query) ||
        r.cuisine_type?.some(c => c.toLowerCase().includes(query))
    )
  }, [restaurants, searchQuery, showMichelinOnly])

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const resetSelection = () => {
    setSelectedIds(new Set())
    setSearchQuery('')
  }

  return {
    // Filters
    selectedCountryId,
    selectedRegionId,
    selectedCityId,
    selectedCategory,
    handleCountryChange,
    handleRegionChange,
    handleCityChange,
    handleCategoryChange,

    // Search
    searchQuery,
    setSearchQuery,

    // Data
    restaurants,
    filteredRestaurants,
    loading,

    // Location data
    countries,
    regions,
    cities,

    // Selection
    selectedIds,
    toggleSelection,
    resetSelection,

    // Michelin filter
    showMichelinOnly,
    setShowMichelinOnly,
  }
}
