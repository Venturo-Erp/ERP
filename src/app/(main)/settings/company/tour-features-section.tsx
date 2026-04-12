'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { useWorkspaceFeatures } from '@/lib/permissions'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Save, AlertCircle } from 'lucide-react'
import { logger } from '@/lib/utils/logger'

// ============================================
// 團控功能設定區塊
// ============================================
export function TourControllerSection({ workspaceId }: { workspaceId: string }) {
  const { isFeatureEnabled } = useWorkspaceFeatures()
  const hasTourController = isFeatureEnabled('tour_controller')
  const [enabled, setEnabled] = useState(hasTourController)
  const [required, setRequired] = useState(true) // 團控必填（預設為 true）
  const [saving, setSaving] = useState(false)

  // 儲存團控功能設定
  const handleSave = async () => {
    setSaving(true)
    try {
      // TODO: 儲存到 workspace_feature_settings 表
      // await saveTourControllerSettings(workspaceId, enabled, required)

      if (enabled) {
        toast.success('團控功能已啟用')
      } else {
        toast.success('團控功能已停用')
      }
    } catch (error) {
      console.error('儲存團控設定失敗:', error)
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  if (!hasTourController) return null

  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-morandi-primary">團控功能設定</h3>
        <p className="text-sm text-morandi-secondary">啟用後，開團時必須指派團控人員</p>
      </div>

      <div className="space-y-4">
        {/* 啟用開關 */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="tour-controller-enabled">啟用團控功能</Label>
            <p className="text-sm text-morandi-secondary">開啟後，開團時會顯示團控選擇欄位</p>
          </div>
          <Switch id="tour-controller-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {/* 必填設定 */}
        {enabled && (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="tour-controller-required">團控為必填欄位</Label>
              <p className="text-sm text-morandi-secondary">開啟後，開團時必須選擇團控人員</p>
            </div>
            <Switch
              id="tour-controller-required"
              checked={required}
              onCheckedChange={setRequired}
            />
          </div>
        )}

        {/* 注意事項 */}
        {enabled && required && (
          <div className="flex items-start gap-2 p-3 bg-morandi-gold/10 border border-morandi-gold/20 rounded-md">
            <AlertCircle className="h-4 w-4 text-morandi-gold mt-0.5" />
            <p className="text-sm text-morandi-secondary">團控為必填欄位，開團時必須選擇團控人員</p>
          </div>
        )}
      </div>

      {/* 儲存按鈕 */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="bg-morandi-gold hover:bg-morandi-gold-hover"
      >
        {saving ? (
          <span className="flex items-center">
            <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
            儲存中...
          </span>
        ) : (
          <span className="flex items-center">
            <Save className="h-4 w-4 mr-2" />
            儲存設定
          </span>
        )}
      </Button>
    </Card>
  )
}

// ============================================
// 旅行屬性功能設定區塊
// ============================================
export function TourAttributesSection({ workspaceId }: { workspaceId: string }) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'tour_group',
    'flight',
    'flight_hotel',
    'hotel',
    'car_service',
    'visa',
    'esim',
  ])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // 載入目前設定
  useEffect(() => {
    if (!workspaceId) return
    const load = async () => {
      try {
        const { data } = await supabase
          .from('workspaces')
          .select('*')
          .eq('id', workspaceId)
          .single()
        const cats = (data as { enabled_tour_categories?: string[] } | null)
          ?.enabled_tour_categories
        if (Array.isArray(cats) && cats.length > 0) {
          setSelectedCategories(cats)
        }
      } catch (err) {
        logger.error('載入團類型設定失敗:', err)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [workspaceId])

  // 所有可用的團類型
  const tourCategories = [
    { id: 'tour_group', label: '旅遊團', description: '完整旅遊行程' },
    { id: 'flight', label: '機票', description: '純機票訂位與開票' },
    { id: 'flight_hotel', label: '機加酒', description: '機票加住宿套裝' },
    { id: 'hotel', label: '訂房', description: '純住宿預訂' },
    { id: 'car_service', label: '派車', description: '交通接送服務' },
    { id: 'visa', label: '簽證', description: '簽證申請服務' },
    { id: 'esim', label: '網卡', description: 'eSIM 訂單管理' },
  ]

  // 切換單一類別
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    )
  }

  // 選擇全部
  const selectAll = () => {
    setSelectedCategories(tourCategories.map(cat => cat.id))
  }

  // 清除全部
  const clearAll = () => {
    setSelectedCategories([])
  }

  // 儲存團類型設定到 DB
  const handleSave = async () => {
    if (selectedCategories.length === 0) {
      toast.error('至少要選一個團類型')
      return
    }
    setSaving(true)
    try {
      const { error } = await (
        supabase.from('workspaces') as unknown as {
          update: (data: Record<string, unknown>) => {
            eq: (col: string, val: string) => Promise<{ error: unknown }>
          }
        }
      )
        .update({ enabled_tour_categories: selectedCategories })
        .eq('id', workspaceId)
      if (error) throw error
      toast.success(`已儲存，可用 ${selectedCategories.length} 種團類型`)
    } catch (error) {
      logger.error('儲存團類型設定失敗:', error)
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <Card className="p-6 space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-morandi-primary">旅行屬性功能設定</h3>
        <p className="text-sm text-morandi-secondary">
          選擇可用的團類型，開團時會顯示對應的選擇欄位
        </p>
      </div>

      <div className="space-y-4">
        {/* 團類型選擇 */}
        <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>可選團類型</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  disabled={selectedCategories.length === tourCategories.length}
                >
                  全選
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearAll}
                  disabled={selectedCategories.length === 0}
                >
                  清除
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tourCategories.map(category => (
                <div
                  key={category.id}
                  className={`flex items-start space-x-3 p-3 rounded-md border ${
                    selectedCategories.includes(category.id)
                      ? 'border-morandi-gold bg-morandi-gold/5'
                      : 'border-morandi-border'
                  }`}
                >
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={selectedCategories.includes(category.id)}
                    onCheckedChange={() => toggleCategory(category.id)}
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor={`category-${category.id}`}
                      className="font-medium cursor-pointer"
                    >
                      {category.label}
                    </Label>
                    <p className="text-xs text-morandi-secondary">{category.description}</p>
                  </div>
                </div>
              ))}
            </div>

          {/* 注意事項 */}
          {selectedCategories.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-morandi-gold/10 border border-morandi-gold/20 rounded-md">
              <AlertCircle className="h-4 w-4 text-morandi-gold mt-0.5" />
              <p className="text-sm text-morandi-secondary">
                開團時，可從已選擇的 {selectedCategories.length} 種團類型中選擇一種
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 儲存按鈕 */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="bg-morandi-gold hover:bg-morandi-gold-hover"
      >
        {saving ? (
          <span className="flex items-center">
            <span className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
            儲存中...
          </span>
        ) : (
          <span className="flex items-center">
            <Save className="h-4 w-4 mr-2" />
            儲存設定
          </span>
        )}
      </Button>
    </Card>
  )
}
