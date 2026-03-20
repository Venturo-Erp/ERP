'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronUp, MapPin, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useMapPreferences } from '@/hooks/useMapPreferences'
import { getAirportCoordinate, inferAirportCode } from '@/lib/constants/airports'
import dynamic from 'next/dynamic'
import type { Attraction } from '@/features/attractions/types'

// 動態載入地圖元件
const AttractionsMap = dynamic(
  () => import('@/features/attractions/components/AttractionsMap').then(mod => mod.AttractionsMap),
  { 
    ssr: false, 
    loading: () => (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted/30">
        載入地圖中...
      </div>
    )
  }
)

interface ResourceMapPanelProps {
  tourId: string | null
  tourCode: string | null
  regionId: string | null
  className?: string
}

export function ResourceMapPanel({
  tourId,
  tourCode,
  regionId,
  className = '',
}: ResourceMapPanelProps) {
  const [attractions, setAttractions] = useState<Attraction[]>([])
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createSupabaseBrowserClient()

  // 地圖偏好設定
  const {
    isLoaded: prefsLoaded,
    expanded,
    center: savedCenter,
    toggleExpanded,
    setCenter,
    clearCenter,
  } = useMapPreferences(tourId)

  // 推斷機場座標作為預設中心
  const defaultCenter = useMemo(() => {
    if (!tourCode) return null
    
    const airportCode = inferAirportCode({ tour_code: tourCode })
    if (!airportCode) return null
    
    const airport = getAirportCoordinate(airportCode)
    if (!airport) return null
    
    return {
      id: `airport-${airportCode}`,
      name: airport.name,
      latitude: airport.latitude,
      longitude: airport.longitude,
      category: '機場',
      is_active: true,
      display_order: 0,
      country_id: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Attraction
  }, [tourCode])

  // 載入景點
  useEffect(() => {
    if (!expanded || !regionId) return

    const fetchAttractions = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('attractions')
          .select('*')
          .eq('region_id', regionId)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .limit(200)

        if (error) throw error

        const mapped = (data || []).map(a => ({
          id: a.id,
          name: a.name,
          category: a.category || undefined,
          latitude: typeof a.latitude === 'string' ? parseFloat(a.latitude) : (a.latitude ?? undefined),
          longitude: typeof a.longitude === 'string' ? parseFloat(a.longitude) : (a.longitude ?? undefined),
          address: a.address || undefined,
          phone: a.phone || undefined,
          description: a.description || undefined,
          thumbnail: a.thumbnail || undefined,
          region_id: a.region_id || undefined,
          city_id: a.city_id,
          website: a.website || undefined,
          opening_hours: typeof a.opening_hours === 'string' ? a.opening_hours : undefined,
          data_verified: a.data_verified ?? undefined,
          country_id: a.country_id || '',
          is_active: true,
          display_order: 0,
          created_at: a.created_at || new Date().toISOString(),
          updated_at: a.updated_at || new Date().toISOString(),
        })) as Attraction[]

        setAttractions(mapped)

        // 設定預設選中的景點
        if (!selectedAttraction) {
          // 優先使用儲存的位置
          if (savedCenter) {
            const saved = mapped.find(a => 
              a.latitude === savedCenter.latitude && 
              a.longitude === savedCenter.longitude
            )
            if (saved) {
              setSelectedAttraction(saved)
              return
            }
          }
          
          // 其次使用機場作為中心
          if (defaultCenter) {
            setSelectedAttraction(defaultCenter)
            return
          }
          
          // 最後使用第一個景點
          if (mapped.length > 0) {
            setSelectedAttraction(mapped[0])
          }
        }
      } catch (err) {
        console.error('載入景點失敗:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAttractions()
  }, [expanded, regionId, savedCenter, defaultCenter])

  // 處理地圖中心變更（當用戶點擊景點時）
  const handleSelectAttraction = (attraction: Attraction) => {
    setSelectedAttraction(attraction)
    if (attraction.latitude && attraction.longitude) {
      setCenter({
        latitude: attraction.latitude,
        longitude: attraction.longitude,
        zoom: 14,
      })
    }
  }

  // 重置到機場位置
  const handleResetToAirport = () => {
    if (defaultCenter) {
      setSelectedAttraction(defaultCenter)
      clearCenter()
    }
  }

  if (!prefsLoaded) {
    return null
  }

  return (
    <div className={`border-t bg-card ${className}`}>
      {/* Header - 可點擊展開/收合 */}
      <button
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MapPin size={14} />
          <span>地圖探索</span>
          {selectedAttraction && (
            <span className="text-xs text-muted-foreground/70">
              · {selectedAttraction.name}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={16} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={16} className="text-muted-foreground" />
        )}
      </button>

      {/* 地圖內容 */}
      {expanded && (
        <div className="relative">
          {/* 工具列 */}
          {defaultCenter && selectedAttraction?.id !== defaultCenter.id && (
            <div className="absolute top-2 right-2 z-10">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResetToAirport}
                className="text-xs shadow-md"
              >
                <RotateCcw size={12} className="mr-1" />
                回到機場
              </Button>
            </div>
          )}

          {/* 地圖 */}
          <div className="h-[300px] border-t">
            {loading ? (
              <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground bg-muted/30">
                載入中...
              </div>
            ) : selectedAttraction ? (
              <AttractionsMap
                attractions={attractions}
                selectedAttraction={selectedAttraction}
                radiusKm={5}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground bg-muted/30">
                {regionId ? '此地區沒有景點座標' : '請選擇地區'}
              </div>
            )}
          </div>

          {/* 景點快速選擇 */}
          {attractions.length > 0 && (
            <div className="border-t p-2">
              <div className="text-xs text-muted-foreground mb-2">
                點擊切換中心（{attractions.length} 個景點）
              </div>
              <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto">
                {attractions.slice(0, 20).map(attraction => (
                  <button
                    key={attraction.id}
                    onClick={() => handleSelectAttraction(attraction)}
                    className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                      selectedAttraction?.id === attraction.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-accent border-border'
                    }`}
                  >
                    {attraction.name}
                  </button>
                ))}
                {attractions.length > 20 && (
                  <span className="px-2 py-0.5 text-xs text-muted-foreground">
                    +{attractions.length - 20} 更多
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
