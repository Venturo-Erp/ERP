'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, ExternalLink, Plus } from 'lucide-react'

interface ResourceItem {
  id: string
  name: string
  type: 'attraction' | 'hotel' | 'restaurant'
  category?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  description?: string | null
  phone?: string | null
  website?: string | null
  region_id?: string | null
}

interface ResourceWithDistance extends ResourceItem {
  distance: number
}

interface MapExplorerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resource: ResourceItem | null
  allResources: ResourceItem[]
  onAddToItinerary?: (resource: ResourceItem) => void
}

// Haversine 距離計算（km）
function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371 // 地球半徑 km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// 格式化距離
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`
  }
  return `${km.toFixed(1)}km`
}

// Leaflet 地圖組件（動態載入）
function LeafletMap({ 
  center, 
  resources, 
  selectedId,
  onMarkerClick,
  onAddToItinerary,
}: { 
  center: [number, number]
  resources: ResourceWithDistance[]
  selectedId?: string
  onMarkerClick: (r: ResourceWithDistance) => void
  onAddToItinerary?: (r: ResourceItem) => void
}) {
  const [MapComponents, setMapComponents] = useState<{
    MapContainer: typeof import('react-leaflet').MapContainer
    TileLayer: typeof import('react-leaflet').TileLayer
    Marker: typeof import('react-leaflet').Marker
    Popup: typeof import('react-leaflet').Popup
    useMap: typeof import('react-leaflet').useMap
  } | null>(null)
  
  const [L, setL] = useState<typeof import('leaflet') | null>(null)

  useEffect(() => {
    // 動態載入 leaflet 和 react-leaflet
    Promise.all([
      import('leaflet'),
      import('react-leaflet'),
    ]).then(([leaflet, reactLeaflet]) => {
      // 修復 Leaflet 預設圖標問題
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })
      
      setL(leaflet)
      setMapComponents({
        MapContainer: reactLeaflet.MapContainer,
        TileLayer: reactLeaflet.TileLayer,
        Marker: reactLeaflet.Marker,
        Popup: reactLeaflet.Popup,
        useMap: reactLeaflet.useMap,
      })
    })
  }, [])

  if (!MapComponents || !L) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/20">
        <div className="text-muted-foreground">載入地圖中...</div>
      </div>
    )
  }

  const { MapContainer, TileLayer, Marker, Popup } = MapComponents

  // 建立自訂圖標
  const defaultIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })

  const selectedIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  })

  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ height: '100%', width: '100%' }}
      key={`${center[0]}-${center[1]}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {resources.map((r) => (
        r.latitude && r.longitude && (
          <Marker
            key={r.id}
            position={[r.latitude, r.longitude]}
            icon={r.id === selectedId ? selectedIcon : defaultIcon}
            eventHandlers={{
              click: () => onMarkerClick(r),
            }}
          >
            <Popup>
              <div className="p-1 min-w-[150px]">
                <strong className="block">{r.name}</strong>
                <div className="text-xs text-gray-500 mb-1">
                  {r.category} • {formatDistance(r.distance)}
                </div>
                {onAddToItinerary && (
                  <button
                    className="text-xs text-blue-600 hover:underline"
                    onClick={() => onAddToItinerary(r)}
                  >
                    + 加入行程
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        )
      ))}
    </MapContainer>
  )
}

export function MapExplorerDialog({
  open,
  onOpenChange,
  resource,
  allResources,
  onAddToItinerary,
}: MapExplorerDialogProps) {
  const [selectedResource, setSelectedResource] = useState<ResourceWithDistance | null>(null)

  // 重置選中狀態
  useEffect(() => {
    if (open && resource && resource.latitude && resource.longitude) {
      setSelectedResource({ ...resource, distance: 0 })
    }
  }, [open, resource])

  // 計算所有景點與選中景點的距離
  const resourcesWithDistance = useMemo((): ResourceWithDistance[] => {
    if (!selectedResource?.latitude || !selectedResource?.longitude) {
      return []
    }

    return allResources
      .filter(r => r.latitude && r.longitude)
      .map(r => ({
        ...r,
        distance: r.id === selectedResource.id ? 0 : calculateDistance(
          selectedResource.latitude!,
          selectedResource.longitude!,
          r.latitude!,
          r.longitude!
        ),
      }))
      .sort((a, b) => a.distance - b.distance)
  }, [allResources, selectedResource])

  // 取得地圖中心
  const mapCenter = useMemo((): [number, number] => {
    if (selectedResource?.latitude && selectedResource?.longitude) {
      return [selectedResource.latitude, selectedResource.longitude]
    }
    return [33.59, 130.40] // 預設福岡
  }, [selectedResource])

  if (!resource) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[85vh] p-0 gap-0">
        <div className="flex h-full">
          {/* 左側：景點詳情 */}
          <div className="w-[350px] border-r flex flex-col">
            <DialogHeader className="p-4 border-b">
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                景點探索
              </DialogTitle>
            </DialogHeader>
            
            {/* 選中的景點 */}
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-lg">{selectedResource?.name}</h3>
                {selectedResource?.category && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedResource.category}
                  </Badge>
                )}
              </div>
              {selectedResource?.address && (
                <p className="text-sm text-muted-foreground mb-2">
                  📍 {selectedResource.address}
                </p>
              )}
              {selectedResource?.description && (
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {selectedResource.description}
                </p>
              )}
              {selectedResource?.latitude && selectedResource?.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${selectedResource.latitude},${selectedResource.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                >
                  <ExternalLink className="h-3 w-3" />
                  在 Google Maps 開啟
                </a>
              )}
            </div>

            {/* 附近景點列表 */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 bg-muted/50 sticky top-0 border-b">
                <span className="text-sm font-medium">
                  附近景點（{resourcesWithDistance.length}）
                </span>
              </div>
              <div className="divide-y">
                {resourcesWithDistance.slice(0, 30).map((r) => (
                  <div
                    key={r.id}
                    className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                      selectedResource?.id === r.id ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => setSelectedResource(r)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {r.name}
                          </span>
                          {r.distance > 0 && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs shrink-0 ${
                                r.distance < 1 ? 'bg-green-50 text-green-700 border-green-200' :
                                r.distance < 5 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                'bg-gray-50 text-gray-600'
                              }`}
                            >
                              {formatDistance(r.distance)}
                            </Badge>
                          )}
                        </div>
                        {r.category && (
                          <span className="text-xs text-muted-foreground">
                            {r.category}
                          </span>
                        )}
                      </div>
                      {onAddToItinerary && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            onAddToItinerary(r)
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右側：地圖 */}
          <div className="flex-1 relative">
            {selectedResource?.latitude && selectedResource?.longitude ? (
              <LeafletMap
                center={mapCenter}
                resources={resourcesWithDistance}
                selectedId={selectedResource.id}
                onMarkerClick={setSelectedResource}
                onAddToItinerary={onAddToItinerary}
              />
            ) : (
              <div className="flex items-center justify-center h-full bg-muted/20">
                <div className="text-center text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>此景點沒有座標資料</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
