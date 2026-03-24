'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Search, MapPin, Building2, UtensilsCrossed, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'

// ============================================
// 資源類型定義
// ============================================

type ResourceType = 'attraction' | 'hotel' | 'restaurant'

interface ResourceItem {
  id: string
  name: string
  type: ResourceType
  category?: string | null
  thumbnail?: string | null
  city_name?: string | null
}

// ============================================
// 可拖拽的資源卡片
// ============================================

interface DraggableResourceCardProps {
  resource: ResourceItem
}

function DraggableResourceCard({ resource }: DraggableResourceCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `resource-${resource.type}-${resource.id}`,
    data: {
      type: resource.type,
      resourceId: resource.id,
      resourceName: resource.name,
    },
  })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  const iconMap: Record<ResourceType, React.ReactNode> = {
    attraction: <MapPin size={14} className="text-emerald-600" />,
    hotel: <Building2 size={14} className="text-blue-600" />,
    restaurant: <UtensilsCrossed size={14} className="text-orange-600" />,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card',
        'cursor-grab active:cursor-grabbing hover:bg-accent/50 transition-colors',
        isDragging && 'opacity-50 shadow-lg z-50'
      )}
    >
      {/* 縮圖 */}
      {resource.thumbnail ? (
        <img
          src={resource.thumbnail}
          alt={resource.name}
          className="w-8 h-8 rounded object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
          {iconMap[resource.type]}
        </div>
      )}
      {/* 資訊 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{resource.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {resource.category || resource.city_name || ''}
        </p>
      </div>
      {/* 類型標籤 */}
      {iconMap[resource.type]}
    </div>
  )
}

// ============================================
// 資源庫面板主元件
// ============================================

interface ResourcePanelProps {
  className?: string
  countryId?: string // 行程目的地國家，預設篩選
  cityId?: string // 行程目的地城市，預設篩選
}

export function ResourcePanel({ className, countryId, cityId }: ResourcePanelProps) {
  const [activeTab, setActiveTab] = useState<ResourceType>('attraction')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState<string | undefined>(cityId)
  const [availableCities, setAvailableCities] = useState<{ id: string; name: string }[]>([])
  const [resources, setResources] = useState<Record<ResourceType, ResourceItem[]>>({
    attraction: [],
    hotel: [],
    restaurant: [],
  })
  const [loading, setLoading] = useState<Record<ResourceType, boolean>>({
    attraction: true,
    hotel: true,
    restaurant: true,
  })

  // 解析後的國家 ID（處理中文名 → country_id 映射）
  const [resolvedCountryId, setResolvedCountryId] = useState<string | undefined>(countryId)

  // 從 Supabase 載入資源
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    // 解析國家名稱 → country_id（支援中文名、英文名、城市名）
    const resolveCountry = async () => {
      if (!countryId) return

      // 先嘗試直接匹配 country_id
      const { data: directMatch } = await supabase
        .from('countries')
        .select('id')
        .eq('id', countryId)
        .limit(1)

      if (directMatch && directMatch.length > 0) {
        setResolvedCountryId(directMatch[0].id)
        return
      }

      // 嘗試用名稱搜尋（中文名或英文名）
      const { data: nameMatch } = await supabase
        .from('countries')
        .select('id')
        .or(`name.eq.${countryId},english_name.ilike.${countryId}`)
        .limit(1)

      if (nameMatch && nameMatch.length > 0) {
        setResolvedCountryId(nameMatch[0].id)
        return
      }

      // 嘗試用城市名反查國家（例如「名古屋」→ japan）
      const { data: cityMatch } = await supabase
        .from('cities')
        .select('country_id')
        .or(`name.eq.${countryId},id.eq.${countryId}`)
        .limit(1)

      if (cityMatch && cityMatch.length > 0) {
        setResolvedCountryId(cityMatch[0].country_id)
        // 同時設定城市篩選
        const { data: cityData } = await supabase
          .from('cities')
          .select('id')
          .or(`name.eq.${countryId},id.eq.${countryId}`)
          .limit(1)
        if (cityData && cityData.length > 0 && !selectedCity) {
          setSelectedCity(cityData[0].id)
        }
        return
      }

      // 都找不到，顯示全部
      setResolvedCountryId(undefined)
    }
    void resolveCountry()

    // 載入該國家的城市列表（供切換用，等 resolvedCountryId 解析完）
    const fetchCities = async () => {
      // 延遲等 resolveCountry 完成
    }
    void fetchCities()
  }, [countryId])

  // 城市列表：等 resolvedCountryId 解析後再載入
  useEffect(() => {
    if (!resolvedCountryId) {
      setAvailableCities([])
      return
    }
    const supabase = createSupabaseBrowserClient()
    const fetchCities = async () => {
      const { data } = await supabase
        .from('cities')
        .select('id, name')
        .eq('country_id', resolvedCountryId)
        .order('name')
      if (data) setAvailableCities(data)
    }
    void fetchCities()
  }, [resolvedCountryId])

  // 載入資源（景點/酒店/餐廳）
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    // 景點（根據目的地國家 + 城市自動過濾）
    const fetchAttractions = async () => {
      let query = supabase
        .from('attractions')
        .select('id, name, category, thumbnail')
        .eq('is_active', true)
      if (resolvedCountryId) query = query.eq('country_id', resolvedCountryId)
      if (selectedCity) query = query.eq('city_id', selectedCity)
      const { data, error } = await query.order('name').limit(200)

      if (error) {
        logger.error('[ResourcePanel] 載入景點失敗:', error)
      } else {
        setResources(prev => ({
          ...prev,
          attraction: (data || []).map(item => ({
            id: item.id,
            name: item.name,
            type: 'attraction' as const,
            category: item.category,
            thumbnail: item.thumbnail,
          })),
        }))
      }
      setLoading(prev => ({ ...prev, attraction: false }))
    }

    // 酒店（根據目的地國家 + 城市自動過濾）
    const fetchHotels = async () => {
      let query = supabase
        .from('hotels')
        .select('id, name, category, thumbnail, star_rating')
        .eq('is_active', true)
      if (resolvedCountryId) query = query.eq('country_id', resolvedCountryId)
      if (selectedCity) query = query.eq('city_id', selectedCity)
      const { data, error } = await query.order('name').limit(200)

      if (error) {
        logger.error('[ResourcePanel] 載入酒店失敗:', error)
      } else {
        setResources(prev => ({
          ...prev,
          hotel: (data || []).map(item => ({
            id: item.id,
            name: item.name,
            type: 'hotel' as const,
            category: item.star_rating ? `${item.star_rating}星` : item.category,
            thumbnail: item.thumbnail,
          })),
        }))
      }
      setLoading(prev => ({ ...prev, hotel: false }))
    }

    // 餐廳（根據目的地國家 + 城市自動過濾）
    const fetchRestaurants = async () => {
      let query = supabase
        .from('restaurants')
        .select('id, name, category, thumbnail')
        .eq('is_active', true)
      if (resolvedCountryId) query = query.eq('country_id', resolvedCountryId)
      if (selectedCity) query = query.eq('city_id', selectedCity)
      const { data, error } = await query.order('name').limit(200)

      if (error) {
        logger.error('[ResourcePanel] 載入餐廳失敗:', error)
      } else {
        setResources(prev => ({
          ...prev,
          restaurant: (data || []).map(item => ({
            id: item.id,
            name: item.name,
            type: 'restaurant' as const,
            category: item.category,
            thumbnail: item.thumbnail,
          })),
        }))
      }
      setLoading(prev => ({ ...prev, restaurant: false }))
    }

    void fetchAttractions()
    void fetchHotels()
    void fetchRestaurants()
  }, [resolvedCountryId, selectedCity]) // 國家或城市變更時重新載入

  // 搜尋過濾
  const filteredResources = useMemo(() => {
    const items = resources[activeTab]
    if (!searchQuery.trim()) return items
    const query = searchQuery.toLowerCase()
    return items.filter(
      item =>
        item.name.toLowerCase().includes(query) ||
        (item.category && item.category.toLowerCase().includes(query))
    )
  }, [resources, activeTab, searchQuery])

  const tabs: { key: ResourceType; label: string; icon: React.ReactNode }[] = [
    { key: 'attraction', label: '景點', icon: <MapPin size={14} /> },
    { key: 'hotel', label: '酒店', icon: <Building2 size={14} /> },
    { key: 'restaurant', label: '餐廳', icon: <UtensilsCrossed size={14} /> },
  ]

  return (
    <div className={cn('flex flex-col bg-card border-b border-border', className)}>
      {/* 大標題：景點庫 */}
      <div className="h-14 bg-morandi-green/90 text-white px-4 flex items-center border-b border-border">
        <h2 className="text-lg font-bold">景點庫</h2>
        <span className="ml-auto text-xs opacity-75">拖拽至行程</span>
      </div>

      {/* 國家/城市篩選 */}
      {availableCities.length > 0 && (
        <div className="px-4 py-4 bg-morandi-container/20 border-b-2 border-border">
          <div className="text-sm text-morandi-primary mb-3 font-semibold flex items-center gap-1">
            <span>📍</span>
            <span>地區篩選</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCity(undefined)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all',
                !selectedCity
                  ? 'bg-morandi-gold text-white shadow-md scale-105'
                  : 'bg-white border border-border text-muted-foreground hover:text-foreground hover:border-morandi-gold/50'
              )}
            >
              全部地區
            </button>
            {availableCities.map(city => (
              <button
                key={city.id}
                onClick={() => setSelectedCity(city.id)}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all',
                  selectedCity === city.id
                    ? 'bg-morandi-gold text-white shadow-md scale-105'
                    : 'bg-white border border-border text-muted-foreground hover:text-foreground hover:border-morandi-gold/50'
                )}
              >
                {city.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 類型 Tab（景點/酒店/餐廳） */}
      <div className="flex border-b-2 border-border bg-white">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key)
              setSearchQuery('')
            }}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 px-2 py-2 text-xs font-medium transition-colors',
              activeTab === tab.key
                ? 'text-morandi-primary border-b-2 border-morandi-gold bg-morandi-gold/5'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.icon}
            {tab.label}
            <span className="text-[10px] text-muted-foreground ml-0.5">
              ({resources[tab.key].length})
            </span>
          </button>
        ))}
      </div>

      {/* 搜尋框 */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={`搜尋${tabs.find(t => t.key === activeTab)?.label}...`}
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {/* 資源列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {loading[activeTab] ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {searchQuery ? '找不到符合的結果' : '尚無資料'}
          </div>
        ) : (
          filteredResources.map(resource => (
            <DraggableResourceCard key={`${resource.type}-${resource.id}`} resource={resource} />
          ))
        )}
      </div>
    </div>
  )
}
