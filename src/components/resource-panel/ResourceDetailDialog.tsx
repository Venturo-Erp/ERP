'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MapPin, Building2, UtensilsCrossed, Save, X, ExternalLink } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export type ResourceType = 'attraction' | 'hotel' | 'restaurant'

interface ResourceDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resource: {
    id: string
    name: string
    type: ResourceType
    category?: string | null
    thumbnail?: string | null
    latitude?: number | null
    longitude?: number | null
    address?: string | null
    description?: string | null
  } | null
  onSave?: (updated: { id: string; name: string; description?: string; address?: string }) => void
  readOnly?: boolean // 未來用於權限控制
}

export function ResourceDetailDialog({
  open,
  onOpenChange,
  resource,
  onSave,
  readOnly = false,
}: ResourceDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fullData, setFullData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // 編輯表單狀態
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editAddress, setEditAddress] = useState('')

  const supabase = createSupabaseBrowserClient()

  // 載入完整資料
  useEffect(() => {
    if (!open || !resource) {
      setFullData(null)
      setIsEditing(false)
      return
    }

    const fetchFullData = async () => {
      setLoading(true)
      try {
        const table =
          resource.type === 'attraction'
            ? 'attractions'
            : resource.type === 'hotel'
              ? 'hotels'
              : 'restaurants'

        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('id', resource.id)
          .single()

        if (error) throw error
        setFullData(data)

        // 初始化編輯表單
        setEditName(data.name || '')
        setEditDescription(data.description || '')
        setEditAddress(data.address || '')
      } catch (err) {
        console.error('載入資源失敗:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFullData()
  }, [open, resource?.id, resource?.type])

  if (!resource) return null

  const iconMap: Record<ResourceType, React.ReactNode> = {
    attraction: <MapPin size={20} className="text-emerald-600" />,
    hotel: <Building2 size={20} className="text-blue-600" />,
    restaurant: <UtensilsCrossed size={20} className="text-orange-600" />,
  }

  const typeLabel: Record<ResourceType, string> = {
    attraction: '景點',
    hotel: '酒店',
    restaurant: '餐廳',
  }

  const handleSave = async () => {
    if (!fullData) return

    setSaving(true)
    try {
      const table =
        resource.type === 'attraction'
          ? 'attractions'
          : resource.type === 'hotel'
            ? 'hotels'
            : 'restaurants'

      const { error } = await supabase
        .from(table)
        .update({
          name: editName,
          description: editDescription,
          address: editAddress,
          updated_at: new Date().toISOString(),
        })
        .eq('id', resource.id)

      if (error) throw error

      toast.success('已儲存')
      setIsEditing(false)
      setFullData(prev =>
        prev
          ? { ...prev, name: editName, description: editDescription, address: editAddress }
          : null
      )

      onSave?.({
        id: resource.id,
        name: editName,
        description: editDescription,
        address: editAddress,
      })
    } catch (err) {
      console.error('儲存失敗:', err)
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const thumbnail = (fullData?.thumbnail as string) || resource.thumbnail
  const images = (fullData?.images as string[]) || []
  // 合併所有圖片：thumbnail + images
  const allImages = [thumbnail, ...images].filter(Boolean) as string[]
  const hasImages = allImages.length > 0
  
  const hasCoordinates = resource.latitude && resource.longitude
  const googleMapsUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${resource.latitude},${resource.longitude}`
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={hasImages ? 'max-w-4xl' : 'max-w-md'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {iconMap[resource.type]}
            <span>
              {isEditing ? '編輯' : ''}
              {typeLabel[resource.type]}資訊
            </span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">載入中...</div>
        ) : (
          <div className={hasImages ? 'flex gap-6' : 'space-y-4'}>
            {/* 左側：圖片 */}
            {hasImages && (
              <div className="w-[320px] flex-shrink-0 space-y-2">
                {/* 主圖 */}
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={allImages[currentImageIndex]} 
                    alt={resource.name} 
                    className="w-full h-full object-cover" 
                  />
                  {/* 圖片計數 */}
                  {allImages.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      {currentImageIndex + 1} / {allImages.length}
                    </div>
                  )}
                </div>
                {/* 縮圖列表 */}
                {allImages.length > 1 && (
                  <div className="flex gap-1 overflow-x-auto">
                    {allImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`w-16 h-12 flex-shrink-0 rounded overflow-hidden border-2 transition-colors ${
                          idx === currentImageIndex ? 'border-primary' : 'border-transparent'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 右側：資訊 */}
            <div className={hasImages ? 'flex-1 space-y-3 max-h-[500px] overflow-y-auto pr-2' : 'space-y-4'}>
              {/* 名稱 */}
              {isEditing ? (
                <div className="space-y-1.5">
                  <Label>名稱</Label>
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="輸入名稱"
                  />
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold">{String(fullData?.name || resource.name)}</h3>
                  {resource.category && (
                    <Badge variant="secondary" className="mt-1">
                      {resource.category}
                    </Badge>
                  )}
                </div>
              )}

              {/* 地址 */}
              {isEditing ? (
                <div className="space-y-1.5">
                  <Label>地址</Label>
                  <Input
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    placeholder="輸入地址"
                  />
                </div>
              ) : fullData?.address || resource.address ? (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                  <span>{String(fullData?.address || resource.address)}</span>
                </div>
              ) : null}

              {/* 描述 */}
              {isEditing ? (
                <div className="space-y-1.5">
                  <Label>描述</Label>
                  <Textarea
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    placeholder="輸入描述"
                    rows={3}
                  />
                </div>
              ) : fullData?.description ? (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {String(fullData.description)}
                </p>
              ) : null}

              {/* 額外資訊（只在檢視模式顯示） */}
              {!isEditing && fullData && (
                <div className="space-y-2 text-sm">
                  {/* @ts-expect-error - fullData 欄位型別為 unknown，已確保安全轉換 */}
                  {/* 電話 */}
                  {fullData.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-xs">📞</span>
                      <span>{(fullData.phone?.toString() ?? '') as React.ReactNode}</span>
                    </div>
                  )}
                  {/* @ts-expect-error - fullData 欄位型別為 unknown，已確保安全轉換 */}
                  {/* 網站 */}
                  {fullData.website && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-xs">🌐</span>
                      <a
                        href={fullData.website?.toString() ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate"
                      >
                        {(fullData.website?.toString() ?? '') as React.ReactNode}
                      </a>
                    </div>
                  )}
                  {/* 營業時間 */}
                  {fullData.opening_hours && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <span className="text-xs">🕐</span>
                      <span>
                        {typeof fullData.opening_hours === 'string'
                          ? fullData.opening_hours
                          : JSON.stringify(fullData.opening_hours)}
                      </span>
                    </div>
                  )}
                  {/* 建議遊玩時間 */}
                  {fullData.duration_minutes && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-xs">⏱️</span>
                      <span>建議 {String(fullData.duration_minutes)} 分鐘</span>
                    </div>
                  )}
                  {/* @ts-expect-error - fullData 欄位型別為 unknown，已確保安全轉換 */}
                  {/* 票價 */}
                  {fullData.ticket_price && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="text-xs">🎫</span>
                      <span>{(fullData.ticket_price?.toString() ?? '') as React.ReactNode}</span>
                    </div>
                  )}
                  {/* @ts-expect-error - fullData 欄位型別為 unknown，已確保安全轉換 */}
                  {/* 備註 */}
                  {fullData.notes && (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <span className="text-xs">📝</span>
                      <span>{(fullData.notes?.toString() ?? '') as React.ReactNode}</span>
                    </div>
                  )}
                </div>
              )}

              {/* 座標 & 地圖連結 */}
              {hasCoordinates && !isEditing && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    📍 {resource.latitude?.toFixed(4)}, {resource.longitude?.toFixed(4)}
                  </span>
                  {googleMapsUrl && (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      Google Maps <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              )}

              {/* 按鈕區 */}
              <div className="flex justify-end gap-2 pt-2">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false)
                        // 重置表單
                        setEditName(String(fullData?.name || ''))
                        setEditDescription(String(fullData?.description || ''))
                        setEditAddress(String(fullData?.address || ''))
                      }}
                    >
                      <X size={14} className="mr-1" />
                      取消
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      <Save size={14} className="mr-1" />
                      {saving ? '儲存中...' : '儲存'}
                    </Button>
                  </>
                ) : (
                  !readOnly && (
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      編輯資訊
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
