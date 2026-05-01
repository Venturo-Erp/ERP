'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { createSupabaseBrowserClient, supabase } from '@/lib/supabase/client'
import { Search, MapPin, Building2, UtensilsCrossed, Loader2, Plus } from 'lucide-react'

import { ResourceDetailDialog } from './ResourceDetailDialog'
import { ResourceMapPanel } from './ResourceMapPanel'
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
  images?: string[]
  city_name?: string | null
  data_verified?: boolean
  latitude?: number | null
  longitude?: number | null
  address?: string | null
  description?: string | null
  region_id?: string | null
}

// ============================================
// 可拖拽的資源卡片
// ============================================

interface DraggableResourceCardProps {
  resource: ResourceItem
  onEdit?: (resource: ResourceItem) => void
}

function DraggableResourceCard({ resource, onEdit }: DraggableResourceCardProps) {
  const dragStartPos = useRef<{ x: number; y: number } | null>(null)
  const hasMoved = useRef(false)

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `resource-${resource.type}-${resource.id}`,
    data: {
      type: resource.type,
      resourceId: resource.id,
      resourceName: resource.name,
      dataVerified: resource.data_verified ?? true,
    },
  })

  const isUnverified = resource.data_verified === false

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  const iconMap: Record<ResourceType, React.ReactNode> = {
    attraction: <MapPin size={14} className="text-morandi-green" />,
    hotel: <Building2 size={14} className="text-status-info" />,
    restaurant: <UtensilsCrossed size={14} className="text-status-warning" />,
  }

  // 追蹤是否真的移動了（超過 5px 才算拖曳）
  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartPos.current = { x: e.clientX, y: e.clientY }
    hasMoved.current = false
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStartPos.current) {
      const dx = Math.abs(e.clientX - dragStartPos.current.x)
      const dy = Math.abs(e.clientY - dragStartPos.current.y)
      if (dx > 5 || dy > 5) {
        hasMoved.current = true
      }
    }
  }

  // 處理點擊：只有沒移動過才觸發編輯
  const handleClick = () => {
    if (!hasMoved.current) {
      onEdit?.(resource)
    }
    dragStartPos.current = null
    hasMoved.current = false
  }

  // 合併自定義 handler 和 dnd-kit 的 listeners
  const mergedOnPointerDown = (e: React.PointerEvent) => {
    handlePointerDown(e)
    // 調用 dnd-kit 的 onPointerDown
    ;(listeners?.onPointerDown as ((e: React.PointerEvent) => void) | undefined)?.(e)
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, touchAction: 'none' }}
      {...attributes}
      onPointerDown={mergedOnPointerDown}
      onPointerMove={handlePointerMove}
      onClick={handleClick}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1.5 rounded-md border bg-card cursor-grab select-none',
        'hover:bg-accent/50 transition-colors',
        isDragging && 'opacity-50 shadow-lg z-50 cursor-grabbing',
        // 未驗證 = 警示邊框
        isUnverified ? 'border-status-warning/50 bg-status-warning-bg' : 'border-border'
      )}
    >
      {/* 縮圖 */}
      {resource.images?.[0] ? (
        <img
          src={resource.images[0]}
          alt={resource.name}
          className="w-8 h-8 rounded object-cover flex-shrink-0"
        />
      ) : (
        <div
          className={cn(
            'w-8 h-8 rounded flex items-center justify-center flex-shrink-0',
            isUnverified ? 'bg-morandi-gold/10' : 'bg-muted'
          )}
        >
          {iconMap[resource.type]}
        </div>
      )}
      {/* 名稱和分類 */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{resource.name}</p>
        {isUnverified ? (
          <p className="text-[10px] text-status-warning truncate">⚠ 待驗證</p>
        ) : (
          <p className="text-[10px] text-muted-foreground truncate">
            {resource.category || resource.city_name || ''}
          </p>
        )}
      </div>
    </div>
  )
}

// ============================================
// 資源庫面板主元件
// ============================================

interface TourItineraryItem {
  id: string
  resource_id?: string | null
  resource_type?: string | null
  override_description?: string | null
}

interface ResourcePanelProps {
  className?: string
  countryId?: string // 行程目的地國家 ID 或名稱
  cityId?: string // 行程目的地城市
  locationName?: string // 團的目的地名稱（用於反查地區，如「名古屋」）
  tourId?: string // 團 ID（用於地圖偏好儲存）
  tourCode?: string // 團代碼（用於推斷機場座標，如 FUK260702A）
  canEditDatabase?: boolean // 是否可以編輯資料庫
  coreItems?: TourItineraryItem[] // 行程中的項目（用於判斷景點是否已加入）
  onOverrideSave?: () => void // 覆蓋儲存後的 callback
}

export function ResourcePanel({
  className,
  countryId,
  cityId,
  locationName,
  tourId,
  tourCode,
  canEditDatabase = false,
  coreItems = [],
  onOverrideSave,
}: ResourcePanelProps) {
  const [activeTab, setActiveTab] = useState<ResourceType>('attraction')
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false) // 防止重複點擊

  // 編輯 Dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null)

  // 篩選：只用國家（簡化版）
  const [resolvedCountryId, setResolvedCountryId] = useState<string | undefined>(undefined)

  // 選項列表
  const [countries, setCountries] = useState<{ id: string; name: string }[]>([])

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
      // 總是載入所有國家供選擇（支援跨國旅遊）
      const { data: allCountries } = await supabase
        .from('countries')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      if (allCountries) setCountries(allCountries)

      if (!countryId) {
        // 沒有預設國家，完成
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
        return
      }

      // 都找不到，不設定預設國家
    }
    void resolve()
  }, [countryId, locationName])

  // ── 第四步：載入資源 ──
  // 🔧 如果有 countryId prop 但 resolvedCountryId 還沒解析完，不要先載全部
  const isResolving = !!countryId && !resolvedCountryId
  useEffect(() => {
    if (isResolving) return // 等待國家解析完成

    const supabase = createSupabaseBrowserClient()

    const fetchResources = async (
      table: 'attractions' | 'hotels' | 'restaurants',
      type: ResourceType,
      extraSelect = ''
    ) => {
      const selectStr = `id, name, category, images, data_verified, latitude, longitude, address, description, region_id${extraSelect}`
      let query = supabase
        .from(table)
        .select(selectStr as 'id, name, category, images')
        .eq('is_active', true)

      // 簡化版：只用國家篩選
      if (resolvedCountryId) query = query.eq('country_id', resolvedCountryId)

      // 只載入前 20 筆作為預設顯示，搜尋時會重新查詢
      const { data, error } = await query.order('name').limit(20)

      if (error) {
        logger.error(`[ResourcePanel] 載入${type}失敗:`, error)
      }

      setResources(prev => ({
        ...prev,
        [type]: (data || []).map((item: Record<string, unknown>) => ({
          id: item.id as string,
          name: item.name as string,
          type,
          category:
            type === 'hotel' && item.star_rating
              ? `${item.star_rating}星`
              : (item.category as string | null),
          images: (item.images as string[]) || [],
          data_verified: item.data_verified as boolean | undefined,
          latitude: item.latitude as number | null,
          longitude: item.longitude as number | null,
          address: item.address as string | null,
          description: item.description as string | null,
          region_id: item.region_id as string | null,
        })),
      }))
      setLoading(prev => ({ ...prev, [type]: false }))
    }

    setLoading({ attraction: true, hotel: true, restaurant: true })
    void fetchResources('attractions', 'attraction')
    void fetchResources('hotels', 'hotel', ', star_rating')
    void fetchResources('restaurants', 'restaurant')
  }, [resolvedCountryId, isResolving])

  // 搜尋結果（從資料庫查詢）
  const [searchResults, setSearchResults] = useState<ResourceItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 搜尋時查詢資料庫（debounce 300ms）
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const tableMap = {
          attraction: 'attractions',
          hotel: 'hotels',
          restaurant: 'restaurants',
        } as const
        const table = tableMap[activeTab] as 'attractions' | 'hotels' | 'restaurants'
        const extraSelect = activeTab === 'hotel' ? ', star_rating' : ''
        const selectStr = `id, name, category, images, data_verified, latitude, longitude, address, description, region_id${extraSelect}`

        // 搜尋策略：先精確匹配，沒結果再用 bigram 模糊搜尋
        const trimmed = searchQuery.trim()

        // Step 1: 精確子字串搜尋
        let baseQuery = supabase
          .from(table)
          .select(selectStr as 'id, name, category, images')
          .eq('is_active', true)
        if (resolvedCountryId) {
          baseQuery = baseQuery.eq('country_id', resolvedCountryId)
        }

        let query = baseQuery.ilike('name', `%${trimmed}%`)
        let { data, error } = await query.order('name').limit(20)

        // Step 2: 精確搜沒結果 → 用 bigram 模糊搜尋
        if (!error && (!data || data.length === 0) && trimmed.length > 2) {
          // 過濾掉太常見的詞（飯店、餐廳、景點等）
          const commonWords = [
            '飯店',
            '餐廳',
            '酒店',
            '旅館',
            '景點',
            '公園',
            '神社',
            '寺廟',
            '美術',
            '博物',
          ]
          const bigrams: string[] = []
          for (let i = 0; i <= trimmed.length - 2; i++) {
            const bg = trimmed.substring(i, i + 2)
            if (!commonWords.includes(bg)) {
              bigrams.push(bg)
            }
          }
          // 如果過濾後沒有有效 bigram，用前 3 個字搜
          if (bigrams.length === 0) {
            bigrams.push(trimmed.substring(0, Math.min(3, trimmed.length)))
          }
          const uniqueBigrams = [...new Set(bigrams)]
          const orFilter = uniqueBigrams.map(bg => `name.ilike.%${bg}%`).join(',')

          let bigramQuery = supabase
            .from(table)
            .select(selectStr as 'id, name, category, images')
            .eq('is_active', true)
            .or(orFilter)
          if (resolvedCountryId) {
            bigramQuery = bigramQuery.eq('country_id', resolvedCountryId)
          }
          const result = await bigramQuery.order('name').limit(20)
          data = result.data
          error = result.error
        }

        if (!error && data) {
          setSearchResults(
            data.map((item: Record<string, unknown>) => ({
              id: item.id as string,
              name: item.name as string,
              type: activeTab,
              category:
                activeTab === 'hotel' && item.star_rating
                  ? `${item.star_rating}星`
                  : (item.category as string | null),
              images: (item.images as string[]) || [],
              data_verified: item.data_verified as boolean | undefined,
              latitude: item.latitude as number | null,
              longitude: item.longitude as number | null,
              address: item.address as string | null,
              description: item.description as string | null,
              region_id: item.region_id as string | null,
            }))
          )
        }
      } catch (err) {
        logger.error('[ResourcePanel] 搜尋失敗:', err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, activeTab, resolvedCountryId])

  // 顯示的資源：有搜尋時用搜尋結果，沒搜尋時用預載資料
  const filteredResources = searchQuery.trim() ? searchResults : resources[activeTab]

  // 取得當前選擇的國家名稱
  const selectedCountryName = countries.find(c => c.id === resolvedCountryId)?.name || ''

  const tabs: { key: ResourceType; label: string; icon: React.ReactNode }[] = [
    { key: 'attraction', label: '景點', icon: <MapPin size={14} /> },
    { key: 'hotel', label: '酒店', icon: <Building2 size={14} /> },
    { key: 'restaurant', label: '餐廳', icon: <UtensilsCrossed size={14} /> },
  ]

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const menu = document.getElementById('country-dropdown-menu')
      const btn = document.getElementById('country-dropdown-btn')
      if (menu && !menu.contains(e.target as Node) && !btn?.contains(e.target as Node)) {
        menu.classList.add('hidden')
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  return (
    <div className={cn('flex flex-col bg-card border-b border-border', className)}>
      {/* 大標題：景點庫 */}
      <div className="h-9 bg-morandi-gold-header px-3 flex items-center border-b border-border">
        <h2 className="text-sm font-semibold">景點庫</h2>
      </div>

      {/* 地區篩選 + 類型分頁（4欄平均） */}
      <div className="grid grid-cols-4 border-b-2 border-border bg-card">
        {/* 地區篩選 - 下拉選單按鈕 */}
        <div className="relative border-r border-border group">
          <button
            onClick={() => {
              // 切換下拉選單
              const btn = document.getElementById('country-dropdown-btn')
              const menu = document.getElementById('country-dropdown-menu')
              if (menu) {
                menu.classList.toggle('hidden')
              }
            }}
            id="country-dropdown-btn"
            className={cn(
              'w-full h-full flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors',
              resolvedCountryId
                ? 'text-morandi-primary bg-morandi-gold/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
            )}
          >
            <div className="flex items-center gap-1">
              <MapPin size={14} />
              <span>{selectedCountryName || '地區'}</span>
            </div>
          </button>

          {/* 下拉選單 */}
          <div
            id="country-dropdown-menu"
            className="hidden absolute top-full left-0 w-48 max-h-60 overflow-y-auto bg-card border border-border rounded-md shadow-lg z-50 mt-1"
          >
            <button
              onClick={() => {
                setResolvedCountryId(undefined)
                document.getElementById('country-dropdown-menu')?.classList.add('hidden')
              }}
              className="w-full px-3 py-2 text-left text-xs hover:bg-muted/50 border-b border-border"
            >
              全部地區
            </button>
            {countries.map(c => (
              <button
                key={c.id}
                onClick={() => {
                  setResolvedCountryId(c.id)
                  document.getElementById('country-dropdown-menu')?.classList.add('hidden')
                }}
                className={cn(
                  'w-full px-3 py-2 text-left text-xs hover:bg-muted/50',
                  resolvedCountryId === c.id &&
                    'bg-morandi-gold/10 text-morandi-primary font-medium'
                )}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* 景點/酒店/餐廳分頁 */}
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key)
              setSearchQuery('')
            }}
            className={cn(
              'flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors',
              index < tabs.length - 1 && 'border-r border-border',
              activeTab === tab.key
                ? 'text-morandi-primary bg-morandi-gold/10 border-b-2 border-morandi-gold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
            )}
          >
            <div className="flex items-center gap-1">
              {tab.icon}
              {tab.label}
            </div>
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

      {/* 資源列表（雙欄佈局）*/}
      <div className="flex-1 overflow-y-auto p-2">
        {loading[activeTab] || isSearching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : filteredResources.length === 0 && !searchQuery ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">尚無資料</p>
          </div>
        ) : (
          <div>
            {filteredResources.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">找不到「{searchQuery}」</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {filteredResources.map(resource => (
                  <DraggableResourceCard
                    key={`${resource.type}-${resource.id}`}
                    resource={resource}
                    onEdit={r => {
                      setEditingResource(r)
                      setEditDialogOpen(true)
                    }}
                  />
                ))}
              </div>
            )}

            {/* 搜尋時永遠顯示新增按鈕 */}
            {searchQuery.trim() && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <button
                  disabled={isCreating}
                  onClick={async () => {
                    if (isCreating) return
                    setIsCreating(true)

                    try {
                      const trimmed = searchQuery.trim()
                      if (!trimmed) return

                      const countryIdToUse = resolvedCountryId || countryId
                      if (!countryIdToUse) {
                        alert('缺少國家資訊')
                        return
                      }

                      const workspaceId = (await supabase.auth.getUser()).data.user?.user_metadata
                        ?.workspace_id
                      if (!workspaceId) {
                        alert('未登入或缺少 workspace')
                        return
                      }

                      const TABLE_MAP = {
                        attraction: 'attractions',
                        hotel: 'hotels',
                        restaurant: 'restaurants',
                      }
                      const table = TABLE_MAP[activeTab]

                      // 預設分類
                      const DEFAULT_CATEGORY: Record<string, string> = {
                        attraction: '景點 / Attraction',
                        hotel: '飯店 / Hotel',
                        restaurant: '餐廳 / Restaurant',
                      }

                      const insertData: Record<string, unknown> = {
                        name: trimmed,
                        country_id: countryIdToUse,
                        category: DEFAULT_CATEGORY[activeTab] || null,
                        data_verified: false,
                        is_active: true,
                        ...(activeTab === 'attraction' ? { workspace_id: workspaceId } : {}),
                      }

                      if (activeTab !== 'attraction') {
                        const { data: cities } = await supabase
                          .from('cities')
                          .select('id')
                          .eq('country_id', countryIdToUse)
                          .limit(1)

                        if (cities && cities.length > 0) {
                          insertData.city_id = cities[0].id
                        }
                      }

                      const { data, error: dbError } = await supabase
                        .from(table as 'attractions')
                        .insert(insertData as never)
                        .select('id, name')
                        .single()

                      if (dbError) {
                        alert(`建立失敗：${dbError.message}`)
                        return
                      }

                      const newItem: ResourceItem = {
                        id: (data as unknown as Record<string, unknown>).id as string,
                        name: (data as unknown as Record<string, unknown>).name as string,
                        type: activeTab,
                        category: '',
                        data_verified: false,
                      }
                      setSearchResults(prev => [newItem, ...prev])
                      setResources(prev => ({
                        ...prev,
                        [activeTab]: [newItem, ...(prev[activeTab] || [])],
                      }))
                    } finally {
                      setIsCreating(false)
                    }
                  }}
                  className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-morandi-gold hover:bg-morandi-gold/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {isCreating ? '建立中...' : `新增「${searchQuery}」`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 地圖面板（可收合）- 暫時隱藏 */}
      {/* <ResourceMapPanel
        tourId={tourId || null}
        tourCode={tourCode || null}
        countryId={resolvedCountryId || null}
      /> */}

      {/* 資源詳情 Dialog */}
      <ResourceDetailDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        resource={editingResource}
        canEditDatabase={canEditDatabase}
        // 查找這個景點是否已在行程中
        tourItineraryItemId={
          editingResource
            ? coreItems.find(
                item =>
                  item.resource_id === editingResource.id &&
                  item.resource_type === editingResource.type
              )?.id
            : undefined
        }
        currentOverride={
          editingResource
            ? coreItems.find(
                item =>
                  item.resource_id === editingResource.id &&
                  item.resource_type === editingResource.type
              )?.override_description
            : undefined
        }
        onOverrideSave={() => {
          onOverrideSave?.()
        }}
        onSave={updated => {
          // 更新列表中的資源名稱
          setResources(prev => ({
            ...prev,
            [activeTab]: prev[activeTab].map(r =>
              r.id === updated.id ? { ...r, name: updated.name } : r
            ),
          }))
        }}
      />
    </div>
  )
}
