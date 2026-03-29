'use client'

/**
 * ResourceEditDialog - 資源編輯對話框
 * 
 * 兩種模式：
 * 1. 編輯本團（覆蓋）- 業務可用，只影響當前團
 * 2. 編輯資料庫 - 需要特定權限，影響所有團
 */

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// Alert 用 div 替代
import { MapPin, Building2, UtensilsCrossed, Save, Database, FileEdit, AlertCircle, Lock } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'

export type ResourceType = 'attraction' | 'hotel' | 'restaurant'

interface ResourceEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resource: {
    id: string
    name: string
    type: ResourceType
    description?: string | null
  } | null
  // 覆蓋相關
  tourItineraryItemId?: string  // 行程項目 ID（用於儲存覆蓋）
  currentOverride?: {
    title?: string | null
    description?: string | null
  }
  onOverrideSave?: (data: { title?: string; description?: string }) => void
  // 資料庫相關
  onDatabaseSave?: (data: { id: string; name: string; description: string }) => void
  // 權限
  canEditDatabase?: boolean  // 是否可以編輯資料庫
}

export function ResourceEditDialog({
  open,
  onOpenChange,
  resource,
  tourItineraryItemId,
  currentOverride,
  onOverrideSave,
  onDatabaseSave,
  canEditDatabase = false,
}: ResourceEditDialogProps) {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'override' | 'database'>('override')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  // 覆蓋編輯狀態
  const [overrideDescription, setOverrideDescription] = useState('')

  // 資料庫編輯狀態
  const [dbDescription, setDbDescription] = useState('')
  const [originalDbDescription, setOriginalDbDescription] = useState('')

  const supabase = createSupabaseBrowserClient()

  // 載入資料
  useEffect(() => {
    if (!open || !resource) return

    // 初始化覆蓋內容
    setOverrideDescription(currentOverride?.description || '')

    // 載入資料庫原始內容
    const fetchDbData = async () => {
      setLoading(true)
      try {
        const table = resource.type === 'attraction' ? 'attractions' 
          : resource.type === 'hotel' ? 'hotels' : 'restaurants'

        const { data, error } = await supabase
          .from(table)
          .select('description')
          .eq('id', resource.id)
          .single()

        if (!error && data) {
          setDbDescription(data.description || '')
          setOriginalDbDescription(data.description || '')
        }
      } catch {
        // 忽略錯誤
      } finally {
        setLoading(false)
      }
    }

    fetchDbData()
  }, [open, resource?.id])

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

  // 儲存覆蓋（本團專用）
  const handleSaveOverride = async () => {
    if (!tourItineraryItemId) {
      toast.error('缺少行程項目 ID')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('tour_itinerary_items')
        .update({
          override_description: overrideDescription || null,
          override_by: user?.id,
          override_at: new Date().toISOString(),
        })
        .eq('id', tourItineraryItemId)

      if (error) throw error

      toast.success('已儲存（僅影響本團）')
      onOverrideSave?.({ description: overrideDescription })
      onOpenChange(false)
    } catch (err) {
      console.error('儲存覆蓋失敗:', err)
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  // 儲存資料庫（影響所有團）
  const handleSaveDatabase = async () => {
    if (!canEditDatabase) {
      toast.error('您沒有編輯資料庫的權限')
      return
    }

    setSaving(true)
    try {
      const table = resource.type === 'attraction' ? 'attractions' 
        : resource.type === 'hotel' ? 'hotels' : 'restaurants'

      const { error } = await supabase
        .from(table)
        .update({
          description: dbDescription,
          updated_at: new Date().toISOString(),
        })
        .eq('id', resource.id)

      if (error) throw error

      toast.success('已儲存到資料庫（影響所有團）')
      onDatabaseSave?.({ id: resource.id, name: resource.name, description: dbDescription })
      onOpenChange(false)
    } catch (err) {
      console.error('儲存資料庫失敗:', err)
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {iconMap[resource.type]}
            <span>編輯{typeLabel[resource.type]}內容</span>
          </DialogTitle>
          <DialogDescription>
            {resource.name}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'override' | 'database')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="override" className="gap-2">
              <FileEdit size={16} />
              編輯本團
            </TabsTrigger>
            <TabsTrigger value="database" className="gap-2" disabled={!canEditDatabase}>
              <Database size={16} />
              編輯資料庫
              {!canEditDatabase && <Lock size={12} />}
            </TabsTrigger>
          </TabsList>

          {/* 編輯本團（覆蓋） */}
          <TabsContent value="override" className="space-y-4 pt-4">
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                此修改只會影響<strong>這一團</strong>的行程，不會改變資料庫原始內容。
              </p>
            </div>

            <div className="space-y-2">
              <Label>內容描述（本團專用）</Label>
              <Textarea
                value={overrideDescription}
                onChange={(e) => setOverrideDescription(e.target.value)}
                placeholder={originalDbDescription || '輸入本團專用的描述內容...'}
                rows={6}
              />
              {originalDbDescription && (
                <p className="text-xs text-muted-foreground">
                  原始內容：{originalDbDescription.substring(0, 100)}
                  {originalDbDescription.length > 100 ? '...' : ''}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button onClick={handleSaveOverride} disabled={saving}>
                <Save size={16} className="mr-2" />
                {saving ? '儲存中...' : '儲存（本團）'}
              </Button>
            </div>
          </TabsContent>

          {/* 編輯資料庫 */}
          <TabsContent value="database" className="space-y-4 pt-4">
            {!canEditDatabase ? (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Lock className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">
                  您沒有編輯資料庫的權限。如需修改，請聯繫管理員。
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    此修改會影響<strong>所有使用此{typeLabel[resource.type]}的團</strong>，請謹慎編輯。
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>內容描述（資料庫）</Label>
                  <Textarea
                    value={dbDescription}
                    onChange={(e) => setDbDescription(e.target.value)}
                    placeholder="輸入描述內容..."
                    rows={6}
                    disabled={loading}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    取消
                  </Button>
                  <Button 
                    onClick={handleSaveDatabase} 
                    disabled={saving || loading}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <Database size={16} className="mr-2" />
                    {saving ? '儲存中...' : '儲存到資料庫'}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
