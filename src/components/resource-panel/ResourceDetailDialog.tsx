'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  MapPin,
  Building2,
  UtensilsCrossed,
  Save,
  X,
  ExternalLink,
  FileEdit,
  Database,
  Phone,
  Globe,
  Clock,
  Timer,
  Ticket,
  StickyNote,
  Trash2,
  Upload,
  Loader2,
  Star,
  CheckCircle2,
} from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ResourceOverrideDialog } from './ResourceOverrideDialog'
import { logger } from '@/lib/utils/logger'

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
  onDelete?: (id: string) => void
  // 權限控制
  canEditDatabase?: boolean // 是否可以編輯資料庫
  // 本團覆蓋相關
  tourItineraryItemId?: string // 行程項目 ID（有傳才顯示「編輯本團」按鈕）
  currentOverride?: string | null // 目前的覆蓋內容
  onOverrideSave?: (description: string) => void
  readOnly?: boolean // 完全唯讀（不顯示任何編輯按鈕）
}

export function ResourceDetailDialog({
  open,
  onOpenChange,
  resource,
  onSave,
  onDelete,
  canEditDatabase = false,
  tourItineraryItemId,
  currentOverride,
  onOverrideSave,
  readOnly = false,
}: ResourceDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [fullData, setFullData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showOverrideDialog, setShowOverrideDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)

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
          .select(
            'id, name, english_name, description, category, images, thumbnail, address, latitude, longitude, city_id, country_id, is_active, created_at, updated_at'
          )
          .eq('id', resource.id)
          .single()

        if (error) throw error

        // 清理 DB 資料：移除 images 裡與 thumbnail 重複的 URL
        if (data.thumbnail && Array.isArray(data.images)) {
          const cleanImages = data.images.filter((img: string) => img !== data.thumbnail)
          if (cleanImages.length !== data.images.length) {
            data.images = cleanImages
            await supabase
              .from(table)
              .update({ images: cleanImages, updated_at: new Date().toISOString() })
              .eq('id', resource.id)
          }
        }

        setFullData(data)

        // 初始化編輯表單
        setEditName(data.name || '')
        setEditDescription(data.description || '')
        setEditAddress(data.address || '')
      } catch (err) {
        logger.error('載入資源失敗:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFullData()
  }, [open, resource?.id, resource?.type])

  if (!resource) return null

  const iconMap: Record<ResourceType, React.ReactNode> = {
    attraction: <MapPin size={20} className="text-morandi-green" />,
    hotel: <Building2 size={20} className="text-status-info" />,
    restaurant: <UtensilsCrossed size={20} className="text-status-warning" />,
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
      logger.error('儲存失敗:', err)
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const getTableName = () =>
    resource.type === 'attraction'
      ? 'attractions'
      : resource.type === 'hotel'
        ? 'hotels'
        : 'restaurants'

  const handleDelete = async () => {
    if (!confirm(`確定要刪除「${resource.name}」嗎？此操作無法還原。`)) return

    setDeleting(true)
    try {
      const { error } = await supabase.from(getTableName()).delete().eq('id', resource.id)
      if (error) throw error

      toast.success('已刪除')
      onOpenChange(false)
      onDelete?.(resource.id)
    } catch (err) {
      logger.error('刪除失敗:', err)
      toast.error('刪除失敗')
    } finally {
      setDeleting(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const newImageUrls: string[] = []

      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()
        const filePath = `${resource.type}s/${resource.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('resources')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from('resources').getPublicUrl(filePath)
        newImageUrls.push(urlData.publicUrl)
      }

      // 更新 DB：合併現有 images
      const existingImages = (fullData?.images as string[]) || []
      const updatedImages = [...existingImages, ...newImageUrls]

      const { error } = await supabase
        .from(getTableName())
        .update({ images: updatedImages, updated_at: new Date().toISOString() })
        .eq('id', resource.id)

      if (error) throw error

      setFullData(prev => (prev ? { ...prev, images: updatedImages } : null))
      toast.success(`已上傳 ${newImageUrls.length} 張照片`)
    } catch (err) {
      logger.error('上傳失敗:', err)
      toast.error('上傳照片失敗')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDeleteImage = async (imageUrl: string) => {
    const currentThumbnail = (fullData?.thumbnail as string) || resource.thumbnail
    const existingImages = (fullData?.images as string[]) || []
    const isThumbnail = imageUrl === currentThumbnail

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (isThumbnail) {
      // 刪除封面：用 images 的第一張替補，或設為 null
      // 先把 thumbnail URL 從 images 移除（避免資料重複時多刪）
      const cleanImages = existingImages.filter(img => img !== imageUrl)
      updates.thumbnail = cleanImages.length > 0 ? cleanImages[0] : null
      updates.images = cleanImages.length > 0 ? cleanImages.slice(1) : []
    } else {
      // 刪除非封面：從 images 移除
      updates.images = existingImages.filter(img => img !== imageUrl)
    }

    try {
      const { error } = await supabase.from(getTableName()).update(updates).eq('id', resource.id)

      if (error) throw error

      setFullData(prev => (prev ? { ...prev, ...updates } : null))
      setCurrentImageIndex(0)
      toast.success('已刪除照片')
    } catch (err) {
      logger.error('刪除照片失敗:', err)
      toast.error('刪除照片失敗')
    }
  }

  const handleSetThumbnail = async (imageUrl: string) => {
    const currentThumbnail = (fullData?.thumbnail as string) || null
    const existingImages = (fullData?.images as string[]) || []

    // 重組：新封面從 images 移除，舊封面放回 images
    const newImages = existingImages.filter(img => img !== imageUrl)
    if (currentThumbnail) {
      newImages.unshift(currentThumbnail)
    }

    try {
      const { error } = await supabase
        .from(getTableName())
        .update({
          thumbnail: imageUrl,
          images: newImages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', resource.id)

      if (error) throw error

      setFullData(prev => (prev ? { ...prev, thumbnail: imageUrl, images: newImages } : null))
      setCurrentImageIndex(0)
      toast.success('已設為封面')
    } catch (err) {
      logger.error('設定封面失敗:', err)
      toast.error('設定封面失敗')
    }
  }

  // fullData 載入後以它為準（thumbnail 可能被刪成 null），未載入時才用 resource prop
  const thumbnail = fullData ? (fullData.thumbnail as string | null) : resource.thumbnail
  const images = fullData ? (fullData.images as string[]) || [] : []
  // 合併所有圖片：thumbnail + images（去重，避免 thumbnail 也出現在 images 陣列裡）
  const allImages = [...new Set([thumbnail, ...images].filter(Boolean))] as string[]
  const hasImages = allImages.length > 0

  const hasCoordinates = resource.latitude && resource.longitude
  const googleMapsUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${resource.latitude},${resource.longitude}`
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent level={1} className={hasImages || isEditing ? 'max-w-4xl' : 'max-w-md'}>
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
          <div className={hasImages || isEditing ? 'flex gap-6' : 'space-y-4'}>
            {/* 左側：圖片 */}
            {(hasImages || isEditing) && (
              <div className="w-[320px] flex-shrink-0 space-y-2">
                {/* 主圖 */}
                {allImages.length > 0 ? (
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                    <img
                      src={allImages[currentImageIndex]}
                      alt={resource.name}
                      className="w-full h-full object-cover"
                    />
                    {/* 封面標記 */}
                    {currentImageIndex === 0 && allImages.length > 1 && (
                      <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <Star size={10} className="fill-current" /> 封面
                      </div>
                    )}
                    {/* 圖片計數 */}
                    {allImages.length > 1 && (
                      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                        {currentImageIndex + 1} / {allImages.length}
                      </div>
                    )}
                    {/* 編輯模式：當前圖片操作 */}
                    {isEditing && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        {currentImageIndex !== 0 && (
                          <button
                            onClick={() => handleSetThumbnail(allImages[currentImageIndex])}
                            className="bg-black/60 hover:bg-black/80 text-white p-1.5 rounded transition-colors"
                            title="設為封面"
                          >
                            <Star size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteImage(allImages[currentImageIndex])}
                          className="bg-black/60 hover:bg-morandi-red text-white p-1.5 rounded transition-colors"
                          title="刪除照片"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : isEditing ? (
                  <div className="aspect-[4/3] rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm">
                    尚無照片
                  </div>
                ) : null}
                {/* 縮圖列表 */}
                {allImages.length > 1 && (
                  <div className="flex gap-1 overflow-x-auto">
                    {allImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`relative w-16 h-12 flex-shrink-0 rounded overflow-hidden border-2 transition-colors ${
                          idx === currentImageIndex ? 'border-primary' : 'border-transparent'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        {idx === 0 && (
                          <Star
                            size={8}
                            className="absolute top-0.5 left-0.5 text-white fill-current drop-shadow"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {/* 上傳照片按鈕（編輯模式） */}
                {isEditing && (
                  <label className="flex items-center justify-center gap-1.5 px-3 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors text-sm text-muted-foreground">
                    {uploading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    {uploading ? '上傳中...' : '上傳照片'}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
            )}

            {/* 右側：資訊 */}
            <div
              className={
                hasImages || isEditing
                  ? 'flex-1 space-y-3 max-h-[500px] overflow-y-auto pr-2'
                  : 'space-y-4'
              }
            >
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
                  <h3 className="text-lg font-semibold">
                    {String(fullData?.name || resource.name)}
                  </h3>
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
                  {/* 電話 */}
                  {fullData.phone ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone size={14} className="shrink-0" />
                      <span>{String(fullData.phone)}</span>
                    </div>
                  ) : null}
                  {/* 網站 */}
                  {fullData.website ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe size={14} className="shrink-0" />
                      <a
                        href={String(fullData.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-status-info hover:underline truncate"
                      >
                        {String(fullData.website)}
                      </a>
                    </div>
                  ) : null}
                  {/* 營業時間 */}
                  {fullData.opening_hours ? (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <Clock size={14} className="shrink-0 mt-0.5" />
                      <span>
                        {typeof fullData.opening_hours === 'string'
                          ? fullData.opening_hours
                          : Object.entries(fullData.opening_hours as Record<string, string>)
                              .map(([key, val]) => (key === 'daily' ? val : `${key}: ${val}`))
                              .join('、')}
                      </span>
                    </div>
                  ) : null}
                  {/* 建議遊玩時間 */}
                  {fullData.duration_minutes ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Timer size={14} className="shrink-0" />
                      <span>建議 {String(fullData.duration_minutes)} 分鐘</span>
                    </div>
                  ) : null}
                  {/* 票價 */}
                  {fullData.ticket_price ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Ticket size={14} className="shrink-0" />
                      <span>{String(fullData.ticket_price)}</span>
                    </div>
                  ) : null}
                  {/* 備註 */}
                  {fullData.notes ? (
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <StickyNote size={14} className="shrink-0 mt-0.5" />
                      <span>{String(fullData.notes)}</span>
                    </div>
                  ) : null}
                </div>
              )}

              {/* 座標 & 地圖連結 */}
              {hasCoordinates && !isEditing && (
                <div className="flex items-center gap-2 pt-2 border-t">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin size={12} /> {resource.latitude?.toFixed(4)},{' '}
                    {resource.longitude?.toFixed(4)}
                  </span>
                  {googleMapsUrl && (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-status-info hover:underline flex items-center gap-1"
                    >
                      Google Maps <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              )}

              {/* 按鈕區 */}
              <div className="flex justify-between gap-2 pt-2">
                {isEditing ? (
                  <>
                    {/* 左側：驗證 + 刪除 */}
                    <div className="flex gap-2">
                      {/* 驗證/取消驗證 */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const newVerified = !fullData?.data_verified
                          try {
                            const { error } = await supabase
                              .from(getTableName())
                              .update({
                                data_verified: newVerified,
                                updated_at: new Date().toISOString(),
                              })
                              .eq('id', resource.id)
                            if (error) throw error
                            setFullData(prev =>
                              prev ? { ...prev, data_verified: newVerified } : null
                            )
                            toast.success(newVerified ? '已驗證' : '已取消驗證')
                            // 通知父組件刷新列表
                            onSave?.({
                              id: resource.id,
                              name: String(fullData?.name || resource.name),
                            })
                          } catch {
                            toast.error('操作失敗')
                          }
                        }}
                      >
                        <CheckCircle2 size={14} className="mr-1" />
                        {fullData?.data_verified ? '取消驗證' : '驗證'}
                      </Button>
                      {/* 刪除 */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="text-morandi-secondary hover:text-destructive"
                      >
                        <Trash2 size={14} className="mr-1" />
                        {deleting ? '刪除中...' : '刪除'}
                      </Button>
                    </div>
                    {/* 右側：取消 + 儲存 */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditing(false)
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
                    </div>
                  </>
                ) : (
                  !readOnly && (
                    <div className="flex gap-2 ml-auto">
                      {/* 編輯本團按鈕 */}
                      {tourItineraryItemId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowOverrideDialog(true)}
                        >
                          <FileEdit size={14} className="mr-1" />
                          編輯本團
                        </Button>
                      )}
                      {/* 編輯資料庫按鈕 */}
                      {canEditDatabase && (
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                          <Database size={14} className="mr-1" />
                          編輯資料庫
                        </Button>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      {/* 本團覆蓋對話框 */}
      {tourItineraryItemId && resource && (
        <ResourceOverrideDialog
          open={showOverrideDialog}
          onOpenChange={setShowOverrideDialog}
          resourceName={resource.name}
          tourItineraryItemId={tourItineraryItemId}
          currentOverride={currentOverride}
          originalDescription={fullData?.description as string | null}
          images={allImages}
          onSave={desc => {
            onOverrideSave?.(desc)
            setShowOverrideDialog(false)
          }}
        />
      )}
    </Dialog>
  )
}
