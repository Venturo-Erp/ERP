'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, X, Navigation, Plus, ExternalLink } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'

// Leaflet 需要動態載入（SSR 不支援）
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
)

interface NearbyAttraction {
  id: string
  name: string
  category: string | null
  latitude: number
  longitude: number
  address: string | null
  phone: string | null
  description: string | null
  distance: number // km
}

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
  regionId?: string
  onAddToItinerary?: (attraction: NearbyAttraction) => void
}

// Haversine 公式計算距離
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // 地球半徑 km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

export function MapExplorerDialog({
  open,
  onOpenChange,
  centerAttraction,
  regionId,
  onAddToItinerary
}: MapExplorerDialogProps) {
  const [nearbyAttractions, setNearbyAttractions] = useState<NearbyAttraction[]>([])
  const [selectedAttraction, setSelectedAttraction] = useState<NearbyAttraction | null>(null)
  const [loading, setLoading] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  const supabase = createSupabaseBrowserClient()

  // 載入同地區的景點
  useEffect(() => {
    if (!open || !centerAttraction?.latitude || !centerAttraction?.longitude) return

    const fetchNearby = async () => {
      setLoading(true)
      try {
        // 查詢同地區或鄰近的景點（有座標的）
        let query = supabase
          .from('attractions')
          .select('id, name, category, latitude, longitude, address, phone, description')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .neq('id', centerAttraction.id)

        if (regionId) {
          query = query.eq('region_id', regionId)
        }

        const { data, error } = await query.limit(100)

        if (error) throw error

        // 計算距離並排序
        interface AttractionRow {
          id: string
          name: string
          category: string | null
          latitude: number | string | null
          longitude: number | string | null
          address: string | null
          phone: string | null
          description: string | null
        }
        
        const withDistance = ((data || []) as AttractionRow[])
          .filter((a) => a.latitude != null && a.longitude != null)
          .map((a) => {
            const lat = typeof a.latitude === 'string' ? parseFloat(a.latitude) : (a.latitude as number)
            const lng = typeof a.longitude === 'string' ? parseFloat(a.longitude) : (a.longitude as number)
            return {
              id: a.id,
              name: a.name,
              category: a.category,
              latitude: lat,
              longitude: lng,
              address: a.address,
              phone: a.phone,
              description: a.description,
              distance: calculateDistance(
                centerAttraction.latitude!,
                centerAttraction.longitude!,
                lat,
                lng
              )
            }
          })
          .filter((a) => a.distance <= 50) // 50km 內
          .sort((a, b) => a.distance - b.distance)

        setNearbyAttractions(withDistance)
      } catch (err) {
        console.error('載入周邊景點失敗:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchNearby()
    // 延遲讓 map 初始化
    setTimeout(() => setMapReady(true), 100)
  }, [open, centerAttraction, regionId])

  // 關閉時重置
  useEffect(() => {
    if (!open) {
      setSelectedAttraction(null)
      setMapReady(false)
    }
  }, [open])

  if (!centerAttraction?.latitude || !centerAttraction?.longitude) {
    return null
  }

  const center: [number, number] = [centerAttraction.latitude, centerAttraction.longitude]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[85vh] p-0 gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-[#f5f0e8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#c9a96e] flex items-center justify-center">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#5a5a5a]">
                探索周邊景點
              </h2>
              <p className="text-sm text-[#8a8a8a]">
                以「{centerAttraction.name}」為中心
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左側：景點列表 */}
          <div className="w-80 border-r bg-white overflow-y-auto">
            <div className="p-4 border-b bg-[#faf8f5]">
              <div className="text-sm font-medium text-[#5a5a5a]">
                周邊景點（{nearbyAttractions.length}）
              </div>
            </div>
            
            {loading ? (
              <div className="p-8 text-center text-sm text-[#8a8a8a]">
                載入中...
              </div>
            ) : nearbyAttractions.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#8a8a8a]">
                此區域沒有其他景點
              </div>
            ) : (
              <div className="divide-y">
                {nearbyAttractions.map(attraction => (
                  <button
                    key={attraction.id}
                    className={`w-full p-4 text-left hover:bg-[#faf8f5] transition-colors ${
                      selectedAttraction?.id === attraction.id ? 'bg-[#f5f0e8]' : ''
                    }`}
                    onClick={() => setSelectedAttraction(attraction)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-[#5a5a5a] truncate">
                          {attraction.name}
                        </div>
                        {attraction.category && (
                          <div className="text-xs text-[#8a8a8a] mt-0.5">
                            {attraction.category}
                          </div>
                        )}
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={`shrink-0 ${
                          attraction.distance < 2 
                            ? 'bg-green-100 text-green-700' 
                            : attraction.distance < 10 
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {attraction.distance < 1 
                          ? `${(attraction.distance * 1000).toFixed(0)}m`
                          : `${attraction.distance.toFixed(1)}km`
                        }
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 右側：地圖 */}
          <div className="flex-1 relative">
            {mapReady && (
              <MapContainer
                center={center}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* 中心景點 - 紅色 */}
                <Marker position={center}>
                  <Popup>
                    <div className="font-semibold">{centerAttraction.name}</div>
                    <div className="text-xs text-gray-500">中心點</div>
                  </Popup>
                </Marker>

                {/* 周邊景點 */}
                {nearbyAttractions.map(attraction => (
                  <Marker 
                    key={attraction.id}
                    position={[attraction.latitude, attraction.longitude]}
                    eventHandlers={{
                      click: () => setSelectedAttraction(attraction)
                    }}
                  >
                    <Popup>
                      <div className="min-w-[200px]">
                        <div className="font-semibold">{attraction.name}</div>
                        {attraction.category && (
                          <div className="text-xs text-gray-500">{attraction.category}</div>
                        )}
                        <div className="text-sm mt-1">
                          距離：{attraction.distance < 1 
                            ? `${(attraction.distance * 1000).toFixed(0)}m`
                            : `${attraction.distance.toFixed(1)}km`
                          }
                        </div>
                        {onAddToItinerary && (
                          <Button
                            size="sm"
                            className="w-full mt-2 bg-[#c9a96e] hover:bg-[#b8986d]"
                            onClick={() => onAddToItinerary(attraction)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            加入行程
                          </Button>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}

            {/* 選中景點詳情 - 浮動卡片 */}
            {selectedAttraction && (
              <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg border p-4 max-w-md">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-[#5a5a5a]">
                      {selectedAttraction.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedAttraction.category && (
                        <Badge variant="secondary">
                          {selectedAttraction.category}
                        </Badge>
                      )}
                      <Badge 
                        className={`${
                          selectedAttraction.distance < 2 
                            ? 'bg-green-100 text-green-700' 
                            : selectedAttraction.distance < 10 
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {selectedAttraction.distance < 1 
                          ? `${(selectedAttraction.distance * 1000).toFixed(0)}m`
                          : `${selectedAttraction.distance.toFixed(1)}km`
                        }
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => setSelectedAttraction(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {selectedAttraction.address && (
                  <p className="text-sm text-[#8a8a8a] mt-2 flex items-start gap-1">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                    {selectedAttraction.address}
                  </p>
                )}

                {selectedAttraction.description && (
                  <p className="text-sm text-[#5a5a5a] mt-2 line-clamp-2">
                    {selectedAttraction.description}
                  </p>
                )}

                <div className="flex gap-2 mt-4">
                  {onAddToItinerary && (
                    <Button
                      className="flex-1 bg-[#c9a96e] hover:bg-[#b8986d]"
                      onClick={() => {
                        onAddToItinerary(selectedAttraction)
                        setSelectedAttraction(null)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      加入行程
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${selectedAttraction.latitude},${selectedAttraction.longitude}`,
                        '_blank'
                      )
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Google Maps
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
