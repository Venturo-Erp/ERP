'use client'

/**
 * ResourceOverrideDialog - 簡單的本團覆蓋對話框
 * 
 * 業務用：只能編輯文字描述，只影響當前團
 */

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { MapPin, Building2, UtensilsCrossed, Save, Info } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'

export type ResourceType = 'attraction' | 'hotel' | 'restaurant'

interface ResourceOverrideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resource: {
    id: string
    name: string
    type: ResourceType
    description?: string | null
  } | null
  tourItineraryItemId: string
  currentOverride?: {
    description?: string | null
  }
  onSave?: (data: { description: string }) => void
}

export function ResourceOverrideDialog({
  open,
  onOpenChange,
  resource,
  tourItineraryItemId,
  currentOverride,
  onSave,
}: ResourceOverrideDialogProps) {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [description, setDescription] = useState('')
  const [originalDescription, setOriginalDescription] = useState('')

  const supabase = createSupabaseBrowserClient()

  // 載入資料
  useEffect(() => {
    if (!open || !resource) return

    // 如果有覆蓋內容，使用覆蓋內容
    if (currentOverride?.description) {
      setDescription(currentOverride.description)
    } else {
      setDescription('')
    }

    // 載入原始描述
    const fetchOriginal = async () => {
      const table = resource.type === 'attraction' ? 'attractions' 
        : resource.type === 'hotel' ? 'hotels' : 'restaurants'

      const { data } = await supabase
        .from(table)
        .select('description')
        .eq('id', resource.id)
        .single()

      if (data?.description) {
        setOriginalDescription(data.description)
      }
    }

    fetchOriginal()
  }, [open, resource?.id, currentOverride])

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
    setSaving(true)
    try {
      const { error } = await supabase
        .from('tour_itinerary_items')
        .update({
          override_description: description || null,
          override_by: user?.id,
          override_at: new Date().toISOString(),
        })
        .eq('id', tourItineraryItemId)

      if (error) throw error

      toast.success('已儲存')
      onSave?.({ description })
      onOpenChange(false)
    } catch (err) {
      console.error('儲存失敗:', err)
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleClear = () => {
    setDescription('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {iconMap[resource.type]}
            <span>編輯本團內容</span>
          </DialogTitle>
          <DialogDescription>
            {resource.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* 提示 */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-800">
              此修改只影響<strong>這一團</strong>，不會改變資料庫。
            </p>
          </div>

          {/* 原始內容預覽 */}
          {originalDescription && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">資料庫原始內容</Label>
              <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground max-h-24 overflow-y-auto">
                {originalDescription}
              </div>
            </div>
          )}

          {/* 覆蓋內容 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>本團專用內容</Label>
              {description && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClear}
                  className="text-xs h-6 px-2 text-muted-foreground"
                >
                  清除覆蓋
                </Button>
              )}
            </div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="留空則使用資料庫原始內容..."
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              留空 = 使用資料庫原始內容
            </p>
          </div>

          {/* 按鈕 */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save size={16} className="mr-2" />
              {saving ? '儲存中...' : '儲存'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
