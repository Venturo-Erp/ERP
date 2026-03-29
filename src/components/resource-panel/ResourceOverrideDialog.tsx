'use client'

/**
 * ResourceOverrideDialog - 本團覆蓋對話框（簡易版）
 * 只能修改景點介紹，只影響當前團
 */

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Save } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'

interface ResourceOverrideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resourceName: string
  tourItineraryItemId: string
  currentOverride?: string | null
  originalDescription?: string | null
  onSave?: (description: string) => void
}

export function ResourceOverrideDialog({
  open,
  onOpenChange,
  resourceName,
  tourItineraryItemId,
  currentOverride,
  originalDescription,
  onSave,
}: ResourceOverrideDialogProps) {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [description, setDescription] = useState('')

  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    if (open) {
      setDescription(currentOverride || '')
    }
  }, [open, currentOverride])

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
      onSave?.(description)
      onOpenChange(false)
    } catch (err) {
      console.error('儲存失敗:', err)
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>編輯本團內容 - {resourceName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 原始內容 */}
          {originalDescription && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">資料庫原始內容</Label>
              <div className="p-2 bg-muted/50 rounded text-sm text-muted-foreground max-h-20 overflow-y-auto">
                {originalDescription}
              </div>
            </div>
          )}

          {/* 覆蓋內容 */}
          <div className="space-y-2">
            <Label>本團專用介紹</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="留空則使用資料庫原始內容"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              此修改只影響這一團
            </p>
          </div>

          {/* 按鈕 */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save size={16} className="mr-1" />
              {saving ? '儲存中...' : '儲存'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
