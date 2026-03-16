'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Search, MapPin, Building2, UtensilsCrossed, Loader2 } from 'lucide-react'
import { QuickAddResource } from './QuickAddResource'
import { Input } from '@/components/ui/input'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'

// ============================================
// 資源類型定義
// ============================================

export type ResourceType = 'attraction' | 'hotel' | 'restaurant'

interface ResourceItem {
  id: string
  name: string
  type: ResourceType
  category?: string | null
  thumbnail?: string | null
  city_name?: string | null
  data_verified?: boolean
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

  const isUnverified = resource.data_verified === false

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

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
        'flex items-center gap-2 px-3 py-2 rounded-md border bg-card',
        'cursor-grab active:cursor-grabbing hover:bg-accent/50 transition-colors',
        isDragging && 'opacity-50 shadow-lg z-50',
        // 未驗證 = 橘色警示邊框
        isUnverified
          ? 'border-amber-400/60 bg-amber-50/50'
          : 'border-border'
      )}
    >
      {resource.thumbnail ? (
        <img
          src={resource.thumbnail}
          alt={resource.name}
          className="w-8 h-8 rounded object-cover flex-shrink-0"
        />
      ) : (
        <div className={cn(
          'w-8 h-8 rounded flex items-center justify-center flex-shrink-0',
          isUnverified ? 'bg-amber-100' : 'bg-muted'
        )}>
          {iconMap[resource.type]}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{resource.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {isUnverified ? '⚠ 待驗證' : resource.category || resource.city_name || ''}
        </p>
      </div>
      {iconMap[resource.type]}
    </div>
  )
}

// ============================================
// 資源庫面板主元件
// ============================================

interface ResourcePanelProps {
  className?: string
  countryId?: string    // 行程目的地國家 ID 或名稱
  cityId?: string       // 行程目的地城市
  locationName?: string // 團的目的地名稱（用於反查地區，如「名古屋」）
  onAddNew?: (type: ResourceType) => void // 新增資源回調，帶類型
}

export function ResourcePanel({ className, countryId, cityId, locationName, onAddNew }: ResourcePanelProps) {
  const [activeTab, setActiveTab] = useState<ResourceType>('attraction')
  const [searchQuery, setSearchQuery] = useState('')

  // 階層式篩選：國家 → 地區 → 城市
  const [resolvedCountryId, setResolvedCountryId] = useState<string | undefined>(undefined)
  const [selectedRegion, setSelectedRegion] = useState<string>('')
  const [selectedCity, setSelectedCity] = useState<string>('')

  // 選項列表
  const [countries, setCountries] = useState<{ id: string; name: string }[]>([])
  const [regions, setRegions] = useState<{ id: string; name: string }[]>([])
  const [cities, setCities] = useState<{ id: string; name: string }[]>([])

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

  // ── 第一步：解析 countryId prop → resolvedCountryId ──
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    const resolve = async () => {
      if (!countryId) {
        // 沒有 countryId，載入所有國家供選擇
        const { data } = await supabase
          .from('countries')
          .select('id, name')
          .eq('is_active', true)
          .order('name')
        if (data) setCountries(data)
        return
      }

      // 嘗試直接匹配
      const { data: direct } = await supabase
        .from('countries')
        .select('id, name')
        .eq('id', countryId)
        .limit(1)

      if (direct && direct.length > 0) {
        setResolvedCountryId(direct[0].id)
        setCountries(direct)
        return
      }

      // 嘗試名稱匹配
      const { data: byName } = await supabase
        .from('countries')
        .select('id, name')
        .or(`name.eq.${countryId},english_name.ilike.${countryId}`)
        .limit(1)

      if (byName && byName.length > 0) {
        setResolvedCountryId(byName[0].id)
        setCountries(byName)
        return
      }

      // 嘗試用城市名反查
      const { data: byCity } = await supabase
        .from('cities')
        .select('country_id, region_id')
        .or(`name.eq.${countryId},id.eq.${countryId}`)
        .limit(1)

      if (byCity && byCity.length > 0) {
        const cid = byCity[0].country_id
        setResolvedCountryId(cid)
        // 同時預設地區
        if (byCity[0].region_id) {
          setSelectedRegion(byCity[0].region_id)
        }
        // 載入國家名
        const { data: cData } = await supabase
          .from('countries')
          .select('id, name')
          .eq('id', cid)
        if (cData) setCountries(cData)
        return
      }

      // 都找不到
      const { data: all } = await supabase
        .from('countries')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      if (all) setCountries(all)
    }
    void resolve()

    // 用 locationName 反查預設地區（如「名古屋」→ jp_chubu）
    const resolveRegion = async () => {
      if (!locationName || selectedRegion) return
      const { data } = await supabase
        .from('cities')
        .select('region_id')
        .or(`name.eq.${locationName},id.eq.${locationName}`)
        .limit(1)
      if (data && data.length > 0 && data[0].region_id) {
        setSelectedRegion(data[0].region_id)
      }
    }
    void resolveRegion()
  }, [countryId, locationName])

  // ── 第二步：國家變更 → 載入地區 ──
  useEffect(() => {
    if (!resolvedCountryId) {
      setRegions([])
      return
    }
    const supabase = createSupabaseBrowserClient()
    const fetch = async () => {
      const { data } = await supabase
        .from('regions')
        .select('id, name')
        .eq('country_id', resolvedCountryId)
        .order('display_order, name')
      if (data) setRegions(data)
    }
    void fetch()
  }, [resolvedCountryId])

  // ── 第三步：地區變更 → 載入城市 ──
  useEffect(() => {
    if (!resolvedCountryId) {
      setCities([])
      return
    }
    const supabase = createSupabaseBrowserClient()
    const fetch = async () => {
      let query = supabase
        .from('cities')
        .select('id, name')
        .eq('country_id', resolvedCountryId)
      if (selectedRegion) query = query.eq('region_id', selectedRegion)
      const { data } = await query.order('name')
      if (data) setCities(data)
    }
    void fetch()
  }, [resolvedCountryId, selectedRegion])

  // ── 第四步：載入資源 ──
  // 🔧 如果有 countryId prop 但 resolvedCountryId 還沒解析完，不要先載全部
  const isResolving = !!countryId && !resolvedCountryId
  useEffect(() => {
    if (isResolving) return  // 等待國家解析完成

    const supabase = createSupabaseBrowserClient()

    const fetchResources = async (
      table: 'attractions' | 'hotels' | 'restaurants',
      type: ResourceType,
      extraSelect = ''
    ) => {
      const hasVerified = table === 'attractions'
      const selectStr = `id, name, category, thumbnail${hasVerified ? ', data_verified' : ''}${extraSelect}`
      let query = supabase
        .from(table)
        .select(selectStr as 'id, name, category, thumbnail')
        .eq('is_active', true)

      if (resolvedCountryId) query = query.eq('country_id', resolvedCountryId)
      if (selectedCity) {
        query = query.eq('city_id', selectedCity)
      } else if (selectedRegion) {
        // 用地區篩選：直接用 cities 表的 region_id join
        // 先查該地區的城市 ID（獨立查詢，避免 N+1 依賴）
        const supabase2 = createSupabaseBrowserClient()
        const { data: regionCities } = await supabase2
          .from('cities')
          .select('id')
          .eq('country_id', resolvedCountryId || '')
          .eq('region_id', selectedRegion)
        const regionCityIds = (regionCities || []).map(c => c.id)
        if (regionCityIds.length > 0) {
          query = query.in('city_id', regionCityIds)
        }
      }

      const { data, error } = await query.order('name').limit(200)

      if (error) {
        logger.error(`[ResourcePanel] 載入${type}失敗:`, error)
      }

      setResources(prev => ({
        ...prev,
        [type]: (data || []).map((item: Record<string, unknown>) => ({
          id: item.id as string,
          name: item.name as string,
          type,
          category: type === 'hotel' && item.star_rating
            ? `${item.star_rating}星`
            : (item.category as string | null),
          thumbnail: item.thumbnail as string | null,
        })),
      }))
      setLoading(prev => ({ ...prev, [type]: false }))
    }

    setLoading({ attraction: true, hotel: true, restaurant: true })
    void fetchResources('attractions', 'attraction')
    void fetchResources('hotels', 'hotel', ', star_rating')
    void fetchResources('restaurants', 'restaurant')
  }, [resolvedCountryId, selectedRegion, selectedCity, isResolving])

  // 搜尋過濾
  const filteredResources = useMemo(() => {
    const items = resources[activeTab]
    if (!searchQuery.trim()) return items
    const q = searchQuery.toLowerCase()
    return items.filter(
      item =>
        item.name.toLowerCase().includes(q) ||
        (item.category && item.category.toLowerCase().includes(q))
    )
  }, [resources, activeTab, searchQuery])

  const tabs: { key: ResourceType; label: string; icon: React.ReactNode }[] = [
    { key: 'attraction', label: '景點', icon: <MapPin size={14} /> },
    { key: 'hotel', label: '酒店', icon: <Building2 size={14} /> },
    { key: 'restaurant', label: '餐廳', icon: <UtensilsCrossed size={14} /> },
  ]

  return (
    <div className={cn('flex flex-col bg-card border-b border-border', className)}>
      {/* 標題列 */}
      <div className="h-10 bg-morandi-green/80 text-white px-4 flex items-center border-b border-border">
        <h3 className="text-sm font-semibold">資源庫</h3>
        <span className="ml-auto text-xs opacity-75">拖拽至行程</span>
      </div>

      {/* 階層式篩選：國家 → 地區 → 城市（ComboBox 可搜尋） */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border">
        {/* 國家 */}
        <Combobox
          value={resolvedCountryId || ''}
          onChange={v => {
            setResolvedCountryId(v || undefined)
            setSelectedRegion('')
            setSelectedCity('')
          }}
          options={countries.map(c => ({ value: c.id, label: c.name }))}
          placeholder="國家"
          className="w-[120px]"
          showClearButton={false}
          disablePortal
        />
        {/* 地區 */}
        {regions.length > 0 && (
          <Combobox
            value={selectedRegion}
            onChange={v => {
              setSelectedRegion(v)
              setSelectedCity('')
            }}
            options={[
              { value: '', label: '全部地區' },
              ...regions.map(r => ({ value: r.id, label: r.name })),
            ]}
            placeholder="地區"
            className="w-[120px]"
            showClearButton={false}
            disablePortal
          />
        )}
        {/* 城市 */}
        {cities.length > 0 && (
          <Combobox
            value={selectedCity}
            onChange={setSelectedCity}
            options={[
              { value: '', label: '全部城市' },
              ...cities.map(c => ({ value: c.id, label: c.name })),
            ]}
            placeholder="城市"
            className="w-[120px]"
            showClearButton={false}
            disablePortal
          />
        )}
        {/* 快速新增資源 */}
        <div className="ml-auto">
          <QuickAddResource
            type={activeTab}
            countryId={resolvedCountryId || countryId}
            onCreated={(resource) => {
              // 新增到當前 tab 的資源列表頂部
              const newItem: ResourceItem = {
                id: resource.id,
                name: resource.name,
                type: activeTab,
                category: '',
                data_verified: false,
              }
              setResources(prev => ({
                ...prev,
                [activeTab]: [newItem, ...(prev[activeTab] || [])],
              }))
            }}
          />
        </div>
      </div>

      {/* 類型 Tab */}
      <div className="flex border-b border-border">
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
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
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
