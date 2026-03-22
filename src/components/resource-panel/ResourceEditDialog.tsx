'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Loader2, MapPin, Building2, UtensilsCrossed, ExternalLink, X, Save } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

const supabase = createSupabaseBrowserClient()

export type ResourceType = 'attraction' | 'hotel' | 'restaurant'

interface ResourceEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resourceId: string | null
  resourceType: ResourceType
  onSaved?: () => void
}

interface ResourceData {
  id: string
  name: string
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  category?: string | null
  description?: string | null
  phone?: string | null
  website?: string | null
  thumbnail?: string | null
  data_verified?: boolean
}

export function ResourceEditDialog({
  open,
  onOpenChange,
  resourceId,
  resourceType,
  onSaved,
}: ResourceEditDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<ResourceData | null>(null)

  // 載入資源詳細資料
  useEffect(() => {
    if (!open || !resourceId) return

    async function fetchData() {
      if (!resourceId) return

      setLoading(true)
      try {
        const tableName =
          resourceType === 'attraction'
            ? 'attractions'
            : resourceType === 'hotel'
              ? 'hotels'
              : 'restaurants'

        const { data: result, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', resourceId)
          .single()

        if (error) throw error
        setData(result as ResourceData)
      } catch (err) {
        logger.error('載入資源失敗:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [open, resourceId, resourceType])

  // 儲存
  const handleSave = async () => {
    if (!data) return

    setSaving(true)
    try {
      const tableName =
        resourceType === 'attraction'
          ? 'attractions'
          : resourceType === 'hotel'
            ? 'hotels'
            : 'restaurants'

      const { error } = await supabase
        .from(tableName)
        .update({
          name: data.name,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          category: data.category,
          description: data.description,
          phone: data.phone,
          website: data.website,
          data_verified: true, // 編輯後標記為已驗證
        } as any)
        .eq('id', data.id)

      if (error) throw error

      onSaved?.()
      onOpenChange(false)
    } catch (err) {
      logger.error('儲存失敗:', err)
    } finally {
      setSaving(false)
    }
  }

  // 開啟 Google Maps
  const openGoogleMaps = () => {
    if (data?.latitude && data?.longitude) {
      window.open(`https://www.google.com/maps?q=${data.latitude},${data.longitude}`, '_blank')
    } else if (data?.name) {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(data.name)}`, '_blank')
    }
  }

  const iconMap: Record<ResourceType, React.ReactNode> = {
    attraction: <MapPin size={18} className="text-emerald-600" />,
    hotel: <Building2 size={18} className="text-blue-600" />,
    restaurant: <UtensilsCrossed size={18} className="text-orange-600" />,
  }

  const titleMap: Record<ResourceType, string> = {
    attraction: '景點資訊',
    hotel: '酒店資訊',
    restaurant: '餐廳資訊',
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {iconMap[resourceType]}
            {titleMap[resourceType]}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            {/* 名稱 */}
            <div className="space-y-1.5">
              <Label>名稱</Label>
              <Input
                value={data.name || ''}
                onChange={e => setData({ ...data, name: e.target.value })}
              />
            </div>

            {/* 地址 */}
            <div className="space-y-1.5">
              <Label>地址</Label>
              <Input
                value={data.address || ''}
                onChange={e => setData({ ...data, address: e.target.value })}
                placeholder="輸入地址..."
              />
            </div>

            {/* 座標 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>緯度</Label>
                <Input
                  type="number"
                  step="any"
                  value={data.latitude ?? ''}
                  onChange={e =>
                    setData({
                      ...data,
                      latitude: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="25.0330"
                />
              </div>
              <div className="space-y-1.5">
                <Label>經度</Label>
                <Input
                  type="number"
                  step="any"
                  value={data.longitude ?? ''}
                  onChange={e =>
                    setData({
                      ...data,
                      longitude: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  placeholder="121.5654"
                />
              </div>
            </div>

            {/* 查看地圖按鈕 */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openGoogleMaps}
              className="w-full gap-2"
            >
              <ExternalLink size={14} />在 Google Maps 查看
            </Button>

            {/* 分類 */}
            <div className="space-y-1.5">
              <Label>分類</Label>
              <Input
                value={data.category || ''}
                onChange={e => setData({ ...data, category: e.target.value })}
                placeholder="如：購物、景點、餐廳..."
              />
            </div>

            {/* 電話 */}
            <div className="space-y-1.5">
              <Label>電話</Label>
              <Input
                value={data.phone || ''}
                onChange={e => setData({ ...data, phone: e.target.value })}
                placeholder="+81-xxx-xxxx"
              />
            </div>

            {/* 網站 */}
            <div className="space-y-1.5">
              <Label>網站</Label>
              <Input
                value={data.website || ''}
                onChange={e => setData({ ...data, website: e.target.value })}
                placeholder="https://..."
              />
            </div>

            {/* 描述 */}
            <div className="space-y-1.5">
              <Label>描述</Label>
              <Textarea
                value={data.description || ''}
                onChange={e => setData({ ...data, description: e.target.value })}
                placeholder="簡短描述..."
                rows={2}
              />
            </div>

            {/* 按鈕 */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4 mr-1" />
                取消
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 size={14} className="animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                儲存
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">找不到資料</div>
        )}
      </DialogContent>
    </Dialog>
  )
}
