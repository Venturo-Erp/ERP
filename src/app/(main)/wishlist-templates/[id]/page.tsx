'use client'

/**
 * 紙娃娃編輯頁面 - 管理景點
 * 路由: /wishlist-templates/[id]
 */

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  GripVertical, 
  MapPin,
  Search,
  X,
  Image as ImageIcon,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase/client'

interface WishlistTemplate {
  id: string
  name: string
  slug: string
  status: string | null
}

interface TemplateItem {
  id: string
  name: string
  image_url: string | null
  description: string | null
  region: string | null
  category: string | null
  display_order: number | null
  attraction_id?: string | null
}

interface Attraction {
  id: string
  name: string
  images?: string[] | null
  description: string | null
  category?: string | null
}

// 預設地區選項
const REGIONS = [
  '曼谷',
  '清邁',
  '清萊',
  '芭達雅',
  '普吉島',
  '蘇美島',
  '華欣',
  '大城',
  '其他',
]

// 預設類別選項
const CATEGORIES = [
  '自然景觀',
  '文化古蹟',
  '主題樂園',
  '市集購物',
  '美食體驗',
  '表演秀場',
  '動物園',
  '水上活動',
  '其他',
]

export default function WishlistTemplateEditPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuthStore()
  
  const [template, setTemplate] = useState<WishlistTemplate | null>(null)
  const [items, setItems] = useState<TemplateItem[]>([])
  const [attractions, setAttractions] = useState<Attraction[]>([])
  const [loading, setLoading] = useState(true)
  
  // 新增景點 Dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null)
  
  // 手動新增
  const [manualMode, setManualMode] = useState(false)
  const [manualItem, setManualItem] = useState({
    name: '',
    image_url: '',
    description: '',
    region: '',
    category: '',
  })

  // 載入模板和景點
  const fetchData = useCallback(async () => {
    if (!user?.workspace_id) return

    // 載入模板
    const { data: templateData, error: templateError } = await supabase
      .from('wishlist_templates')
      .select('id, name, slug, status')
      .eq('id', id)
      .single()

    if (templateError || !templateData) {
      toast.error('找不到紙娃娃')
      router.push('/wishlist-templates')
      return
    }

    setTemplate(templateData)

    // 載入模板內的景點
    const { data: itemsData } = await supabase
      .from('wishlist_template_items')
      .select('*')
      .eq('template_id', id)
      .order('display_order')

    setItems(itemsData || [])

    // 載入景點庫
    const { data: attractionsData } = await supabase
      .from('attractions')
      .select('id, name, images, description, category')
      .eq('workspace_id', user.workspace_id)
      .order('name')

    // 轉換格式
    const mappedAttractions: Attraction[] = (attractionsData || []).map(a => ({
      id: a.id,
      name: a.name,
      images: a.images as string[] | null,
      description: a.description,
      category: a.category,
    }))
    setAttractions(mappedAttractions)
    setLoading(false)
  }, [id, user?.workspace_id, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 從景點庫新增
  const handleAddFromLibrary = async (attraction: Attraction) => {
    const { error } = await supabase
      .from('wishlist_template_items')
      .insert({
        template_id: id,
        attraction_id: attraction.id,
        name: attraction.name,
        image_url: attraction.images?.[0] || null,
        description: attraction.description,
        region: null, // 由用戶選擇
        category: attraction.category,
        display_order: items.length,
      })

    if (error) {
      toast.error('新增失敗')
      return
    }

    toast.success(`已新增「${attraction.name}」`)
    setAddDialogOpen(false)
    setSearchTerm('')
    fetchData()
  }

  // 手動新增景點
  const handleAddManual = async () => {
    if (!manualItem.name) {
      toast.error('請輸入景點名稱')
      return
    }

    const { error } = await supabase
      .from('wishlist_template_items')
      .insert({
        template_id: id,
        name: manualItem.name,
        image_url: manualItem.image_url || null,
        description: manualItem.description || null,
        region: manualItem.region || null,
        category: manualItem.category || null,
        display_order: items.length,
      })

    if (error) {
      toast.error('新增失敗')
      return
    }

    toast.success(`已新增「${manualItem.name}」`)
    setAddDialogOpen(false)
    setManualMode(false)
    setManualItem({ name: '', image_url: '', description: '', region: '', category: '' })
    fetchData()
  }

  // 刪除景點
  const handleDelete = async (item: TemplateItem) => {
    const { error } = await supabase
      .from('wishlist_template_items')
      .delete()
      .eq('id', item.id)

    if (error) {
      toast.error('刪除失敗')
      return
    }

    toast.success(`已移除「${item.name}」`)
    fetchData()
  }

  // 更新景點資訊
  const handleUpdateItem = async (item: TemplateItem, field: string, value: string) => {
    const { error } = await supabase
      .from('wishlist_template_items')
      .update({ [field]: value })
      .eq('id', item.id)

    if (error) {
      toast.error('更新失敗')
      return
    }

    fetchData()
  }

  // 搜尋過濾
  const filteredAttractions = attractions.filter(a => {
    // 排除已加入的
    if (items.some(i => i.attraction_id === a.id)) return false
    // 搜尋
    if (!searchTerm) return true
    return a.name.toLowerCase().includes(searchTerm.toLowerCase())
  })

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/wishlist-templates')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{template?.name}</h1>
          <p className="text-muted-foreground">/{template?.slug}</p>
        </div>
        <Badge variant={template?.status === 'published' ? 'default' : 'secondary'}>
          {template?.status === 'published' ? '已發佈' : '草稿'}
        </Badge>
      </div>

      {/* 景點列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            景點列表（{items.length}）
          </CardTitle>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新增景點
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MapPin className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>還沒有景點</p>
              <p className="text-sm">點擊「新增景點」開始建立</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-4 bg-muted/50 rounded-lg group"
                >
                  <div className="flex items-center text-muted-foreground cursor-move">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  
                  {/* 圖片 */}
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  {/* 資訊 */}
                  <div className="flex-1 min-w-0">
                    <Input
                      value={item.name}
                      onChange={(e) => handleUpdateItem(item, 'name', e.target.value)}
                      className="font-medium mb-2 bg-transparent border-0 p-0 h-auto text-lg focus-visible:ring-0"
                    />
                    <div className="flex gap-2 mb-2">
                      <Select
                        value={item.region || ''}
                        onValueChange={(v) => handleUpdateItem(item, 'region', v)}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue placeholder="選擇地區" />
                        </SelectTrigger>
                        <SelectContent>
                          {REGIONS.map(r => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={item.category || ''}
                        onValueChange={(v) => handleUpdateItem(item, 'category', v)}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue placeholder="選擇類別" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea
                      value={item.description || ''}
                      onChange={(e) => handleUpdateItem(item, 'description', e.target.value)}
                      placeholder="景點描述..."
                      className="text-sm bg-transparent border-0 p-0 resize-none focus-visible:ring-0"
                      rows={2}
                    />
                  </div>

                  {/* 刪除 */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => handleDelete(item)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 新增景點 Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新增景點</DialogTitle>
          </DialogHeader>

          {/* 切換：從景點庫 / 手動新增 */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={manualMode ? 'outline' : 'default'}
              size="sm"
              onClick={() => setManualMode(false)}
            >
              從景點庫選擇
            </Button>
            <Button
              variant={manualMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setManualMode(true)}
            >
              手動新增
            </Button>
          </div>

          {manualMode ? (
            /* 手動新增表單 */
            <div className="space-y-4">
              <div>
                <Label>景點名稱 *</Label>
                <Input
                  value={manualItem.name}
                  onChange={(e) => setManualItem(p => ({ ...p, name: e.target.value }))}
                  placeholder="例：大皇宮"
                />
              </div>
              <div>
                <Label>圖片網址</Label>
                <Input
                  value={manualItem.image_url}
                  onChange={(e) => setManualItem(p => ({ ...p, image_url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>地區</Label>
                  <Select
                    value={manualItem.region}
                    onValueChange={(v) => setManualItem(p => ({ ...p, region: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選擇地區" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>類別</Label>
                  <Select
                    value={manualItem.category}
                    onValueChange={(v) => setManualItem(p => ({ ...p, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選擇類別" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>描述</Label>
                <Textarea
                  value={manualItem.description}
                  onChange={(e) => setManualItem(p => ({ ...p, description: e.target.value }))}
                  placeholder="景點簡介..."
                  rows={3}
                />
              </div>
              <Button onClick={handleAddManual} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                新增
              </Button>
            </div>
          ) : (
            /* 從景點庫選擇 */
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="搜尋景點..."
                  className="pl-10"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {filteredAttractions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {attractions.length === 0 
                    ? '景點庫沒有資料，請先到資料管理新增景點'
                    : '沒有符合的景點'
                  }
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {filteredAttractions.map(attraction => (
                    <div
                      key={attraction.id}
                      onClick={() => handleAddFromLibrary(attraction)}
                      className="flex gap-3 p-3 border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      {attraction.images?.[0] ? (
                        <img
                          src={attraction.images[0]}
                          alt={attraction.name}
                          className="w-16 h-16 rounded object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{attraction.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {attraction.category || '未分類'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
