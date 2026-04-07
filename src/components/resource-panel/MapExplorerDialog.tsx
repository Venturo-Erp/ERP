'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Navigation } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import type { Attraction } from '@/features/attractions/types'
import { logger } from '@/lib/utils/logger'

// 動態載入地圖元件
const AttractionsMap = dynamic(
  () => import('@/features/attractions/components/AttractionsMap').then(mod => mod.AttractionsMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        載入地圖中...
      </div>
    ),
  }
)

interface MapExplorerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  centerAttraction: {
    id: string
    name: string
    latitude: number | null
    longitude: number | null
    category?: string | null
    address?: string | null
  } | null
  countryId?: string
  onAddToItinerary?: (attraction: Attraction) => void
}

// Haversine 公式計算距離
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function MapExplorerDialog({
  open,
  onOpenChange,
  centerAttraction,
  countryId,
}: MapExplorerDialogProps) {
  const [allAttractions, setAllAttractions] = useState<Attraction[]>([])
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createSupabaseBrowserClient()

  // 載入所有景點
  useEffect(() => {
    if (!open || !centerAttraction?.latitude || !centerAttraction?.longitude) return

    const fetchAttractions = async () => {
      setLoading(true)
      try {
        // 查詢同地區的景點（有座標的）
        let query = supabase
          .from('attractions')
          .select(
            'id, name, english_name, description, category, images, address, latitude, longitude, phone, website, opening_hours, data_verified, region_id, city_id, country_id, is_active, workspace_id, created_at, updated_at'
          )
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)

        if (countryId) {
          query = query.eq('country_id', countryId)
        }

        const { data, error } = await query.limit(200)

        if (error) throw error

        // 轉換為 Attraction 類型（as unknown as Attraction[] 強制轉型）
        const attractions = (data || []).map(a => ({
          id: a.id,
          name: a.name,
          category: a.category || undefined,
          latitude:
            typeof a.latitude === 'string' ? parseFloat(a.latitude) : (a.latitude ?? undefined),
          longitude:
            typeof a.longitude === 'string' ? parseFloat(a.longitude) : (a.longitude ?? undefined),
          address: a.address || undefined,
          phone: a.phone || undefined,
          description: a.description || undefined,
          images: a.images || undefined,
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

        setAllAttractions(attractions)

        // 設定中心景點
        const center =
          attractions.find(a => a.id === centerAttraction.id) ||
          ({
            id: centerAttraction.id,
            name: centerAttraction.name,
            latitude: centerAttraction.latitude!,
            longitude: centerAttraction.longitude!,
            category: centerAttraction.category || undefined,
            address: centerAttraction.address || undefined,
          } as Attraction)

        setSelectedAttraction(center)
      } catch (err) {
        logger.error('載入景點失敗:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAttractions()
  }, [open, centerAttraction, countryId])

  // 計算周邊景點（5km 內）
  const nearbyAttractions =
    selectedAttraction?.latitude && selectedAttraction?.longitude
      ? allAttractions
          .filter(a => a.id !== selectedAttraction.id && a.latitude && a.longitude)
          .map(a => ({
            ...a,
            distance: calculateDistance(
              selectedAttraction.latitude!,
              selectedAttraction.longitude!,
              a.latitude!,
              a.longitude!
            ),
          }))
          .filter(a => a.distance <= 5)
          .sort((a, b) => a.distance - b.distance)
      : []

  if (!centerAttraction?.latitude || !centerAttraction?.longitude) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={1} className="max-w-[95vw] w-[1200px] h-[80vh] p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-morandi-gold flex items-center justify-center">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-morandi-secondary">探索周邊景點</h2>
              <p className="text-sm text-dark-text-muted">
                以「{centerAttraction.name}」為中心，5km 範圍
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左側：景點列表 */}
          <div className="w-72 border-r bg-white overflow-y-auto">
            <div className="p-4 border-b bg-background">
              <div className="text-sm font-medium text-morandi-secondary">
                周邊景點（{nearbyAttractions.length}）
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-dark-text-muted">載入中...</div>
            ) : nearbyAttractions.length === 0 ? (
              <div className="p-8 text-center text-sm text-dark-text-muted">5km 內沒有其他景點</div>
            ) : (
              <div className="divide-y">
                {nearbyAttractions.map(attraction => (
                  <button
                    key={attraction.id}
                    className={`w-full p-3 text-left hover:bg-background transition-colors ${
                      selectedAttraction?.id === attraction.id ? 'bg-background' : ''
                    }`}
                    onClick={() => setSelectedAttraction(attraction)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-morandi-secondary truncate">
                          {attraction.name}
                        </div>
                        {attraction.category && (
                          <div className="text-xs text-dark-text-muted mt-0.5">
                            {attraction.category}
                          </div>
                        )}
                      </div>
                      <Badge
                        variant="secondary"
                        className={`shrink-0 text-xs ${
                          attraction.distance < 1
                            ? 'bg-morandi-green/10 text-morandi-green'
                            : attraction.distance < 3
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-morandi-container text-morandi-secondary'
                        }`}
                      >
                        {attraction.distance < 1
                          ? `${(attraction.distance * 1000).toFixed(0)}m`
                          : `${attraction.distance.toFixed(1)}km`}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 右側：地圖 */}
          <div className="flex-1 relative">
            {selectedAttraction && (
              <AttractionsMap
                attractions={allAttractions}
                selectedAttraction={selectedAttraction}
                radiusKm={5}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
