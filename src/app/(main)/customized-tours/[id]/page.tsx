'use client'

/**
 * 客製化行程編輯頁面 - 使用 ContentPageLayout 規範
 * 左側：已選景點列表 + 基本資訊
 * 右側：景點庫（含國家篩選）
 */

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Trash2,
  MapPin,
  Search,
  X,
  Image as ImageIcon,
  Eye,
  Link as LinkIcon,
  Globe,
  Settings,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase/client'

interface CustomizedTour {
  id: string
  name: string
  slug: string
  description: string | null
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
  country_id?: string | null
}

interface Country {
  id: string
  name: string
}

// 預設地區選項
const REGIONS = ['曼谷', '清邁', '清萊', '芭達雅', '普吉島', '蘇美島', '華欣', '大城', '其他']

// 頁籤定義
const TEMPLATE_TABS = [
  { value: 'items', label: '景點管理' },
  { value: 'settings', label: '基本設定' },
] as const

export default function CustomizedTourEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuthStore()

  const [template, setTemplate] = useState<CustomizedTour | null>(null)
  const [items, setItems] = useState<TemplateItem[]>([])
  const [attractions, setAttractions] = useState<Attraction[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)

  // 篩選
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<string>('all')

  // 頁籤
  const [activeTab, setActiveTab] = useState<string>('items')

  // 設定 Dialog
  const [settingsOpen, setSettingsOpen] = useState(false)

  // 編輯表單
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    description: '',
  })

  // 載入資料
  const fetchData = useCallback(async () => {
    if (!user?.workspace_id) return

    // 載入模板
    const { data: templateData, error: templateError } = await supabase
      .from('wishlist_templates')
      .select('id, name, slug, description, status')
      .eq('id', id)
      .single()

    if (templateError || !templateData) {
      toast.error('找不到客製化行程')
      router.push('/customized-tours')
      return
    }

    setTemplate(templateData)
    setEditForm({
      name: templateData.name,
      slug: templateData.slug,
      description: templateData.description || '',
    })

    // 載入模板內的景點
    const { data: itemsData } = await supabase
      .from('wishlist_template_items')
      .select(
        'id, template_id, attraction_id, display_order, name, image_url, description, region, category'
      )
      .eq('template_id', id)
      .order('display_order')

    setItems(itemsData || [])

    // 載入國家列表
    const { data: countriesData } = await supabase
      .from('countries')
      .select('id, name')
      .order('name')

    setCountries(countriesData || [])

    // 載入景點庫（包含公共景點 + 自己 workspace 的景點）
    const { data: attractionsData } = await supabase
      .from('attractions')
      .select('id, name, images, description, category, country_id')
      .or(`workspace_id.eq.${user.workspace_id},workspace_id.is.null`)
      .eq('is_active', true)
      .order('name')

    const mappedAttractions: Attraction[] = (attractionsData || []).map(a => ({
      id: a.id,
      name: a.name,
      images: a.images as string[] | null,
      description: a.description,
      category: a.category,
      country_id: a.country_id,
    }))
    setAttractions(mappedAttractions)
    setLoading(false)
  }, [id, user?.workspace_id, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 從景點庫新增
  const handleAddAttraction = async (attraction: Attraction) => {
    if (items.some(i => i.attraction_id === attraction.id)) {
      toast.error('此景點已加入')
      return
    }

    const { error } = await supabase.from('wishlist_template_items').insert({
      template_id: id,
      attraction_id: attraction.id,
      name: attraction.name,
      image_url: attraction.images?.[0] || null,
      description: attraction.description,
      region: null,
      category: attraction.category,
      display_order: items.length,
    })

    if (error) {
      toast.error('新增失敗')
      return
    }

    toast.success(`已新增「${attraction.name}」`)
    fetchData()
  }

  // 刪除景點
  const handleDeleteItem = async (item: TemplateItem) => {
    const { error } = await supabase.from('wishlist_template_items').delete().eq('id', item.id)

    if (error) {
      toast.error('刪除失敗')
      return
    }

    toast.success(`已移除「${item.name}」`)
    fetchData()
  }

  // 更新景點地區
  const handleUpdateRegion = async (item: TemplateItem, region: string) => {
    const { error } = await supabase
      .from('wishlist_template_items')
      .update({ region })
      .eq('id', item.id)

    if (error) {
      toast.error('更新失敗')
      return
    }
    fetchData()
  }

  // 儲存基本資訊
  const handleSaveSettings = async () => {
    if (!editForm.name) {
      toast.error('請輸入名稱')
      return
    }

    const { error } = await supabase
      .from('wishlist_templates')
      .update({
        name: editForm.name,
        slug: editForm.slug,
        description: editForm.description || null,
      })
      .eq('id', id)

    if (error) {
      if (error.message.includes('duplicate')) {
        toast.error('連結代碼已存在')
        return
      }
      toast.error('儲存失敗')
      return
    }

    toast.success('已儲存')
    setSettingsOpen(false)
    fetchData()
  }

  // 發佈/取消發佈
  const handleTogglePublish = async () => {
    const newStatus = template?.status === 'published' ? 'draft' : 'published'

    const { error } = await supabase
      .from('wishlist_templates')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      toast.error('操作失敗')
      return
    }

    toast.success(newStatus === 'published' ? '已發佈' : '已取消發佈')
    fetchData()
  }

  // 複製連結
  const copyLink = () => {
    const url = `${window.location.origin}/p/customized/${template?.slug}`
    navigator.clipboard.writeText(url)
    toast.success('已複製連結')
  }

  // 搜尋過濾景點庫
  const filteredAttractions = attractions.filter(a => {
    // 國家篩選
    if (selectedCountry !== 'all' && a.country_id !== selectedCountry) return false
    // 搜尋
    if (!searchTerm) return true
    return a.name.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // 已加入的景點 ID
  const addedIds = new Set(items.map(i => i.attraction_id).filter(Boolean))

  // 取得國家名稱
  const getCountryName = (countryId: string | null | undefined) => {
    if (!countryId) return ''
    return countries.find(c => c.id === countryId)?.name || ''
  }

  if (loading) {
    return (
      <ContentPageLayout
        title="載入中..."
        icon={Sparkles}
        breadcrumb={[
          { label: '客製化行程管理', href: '/customized-tours' },
          { label: '...', href: '#' },
        ]}
      >
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">載入中...</div>
        </div>
      </ContentPageLayout>
    )
  }

  return (
    <ContentPageLayout
      title={template?.name || '客製化行程'}
      icon={Sparkles}
      breadcrumb={[
        { label: '客製化行程管理', href: '/customized-tours' },
        { label: template?.name || '', href: '#' },
      ]}
      badge={
        <Badge variant={template?.status === 'published' ? 'default' : 'secondary'}>
          {template?.status === 'published' ? '已發佈' : '草稿'}
        </Badge>
      }
      tabs={[...TEMPLATE_TABS]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
            <Settings className="w-4 h-4 mr-1" />
            設定
          </Button>
          {template?.status === 'published' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`/p/customized/${template?.slug}`, '_blank')}
              >
                <Eye className="w-4 h-4 mr-1" />
                預覽
              </Button>
              <Button variant="outline" size="sm" onClick={copyLink}>
                <LinkIcon className="w-4 h-4 mr-1" />
                複製連結
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant={template?.status === 'published' ? 'outline' : 'default'}
            onClick={handleTogglePublish}
          >
            <Globe className="w-4 h-4 mr-1" />
            {template?.status === 'published' ? '取消發佈' : '發佈'}
          </Button>
        </div>
      }
    >
      {activeTab === 'items' ? (
        /* 景點管理頁籤 */
        <div className="flex h-[calc(100vh-180px)] overflow-hidden">
          {/* 左側：已選景點 */}
          <div className="w-1/2 border-r border-border overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                已選景點（{items.length}）
              </h2>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <MapPin className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg mb-2">還沒有景點</p>
                <p className="text-sm">從右側景點庫點擊「+」加入景點</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex gap-3 p-3 bg-card border rounded-lg shadow-sm group hover:shadow-md transition-shadow"
                  >
                    {/* 序號 */}
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>

                    {/* 圖片 */}
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* 資訊 */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Select
                          value={item.region || ''}
                          onValueChange={v => handleUpdateRegion(item, v)}
                        >
                          <SelectTrigger className="w-28 h-7 text-xs">
                            <SelectValue placeholder="選地區" />
                          </SelectTrigger>
                          <SelectContent>
                            {REGIONS.map(r => (
                              <SelectItem key={r} value={r}>
                                {r}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {item.category && (
                          <Badge variant="outline" className="text-xs">
                            {item.category}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* 刪除 */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 text-destructive h-8 w-8"
                      onClick={() => handleDeleteItem(item)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 右側：景點庫 */}
          <div className="w-1/2 overflow-y-auto p-6 bg-muted/30">
            <div className="mb-4 space-y-3">
              <h2 className="text-lg font-semibold">景點庫</h2>

              {/* 國家篩選 */}
              <div className="flex gap-2">
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="w-40 bg-card">
                    <SelectValue placeholder="選擇國家" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部國家</SelectItem>
                    {countries.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="搜尋景點..."
                    className="pl-10 bg-card"
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
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {filteredAttractions.map(attraction => {
                const isAdded = addedIds.has(attraction.id)

                return (
                  <div
                    key={attraction.id}
                    className={`
                      relative flex gap-3 p-3 bg-card border rounded-lg cursor-pointer transition-all
                      ${
                        isAdded
                          ? 'opacity-50 cursor-not-allowed border-morandi-green/30 bg-morandi-green/10'
                          : 'hover:border-primary hover:shadow-md'
                      }
                    `}
                    onClick={() => !isAdded && handleAddAttraction(attraction)}
                  >
                    {/* 圖片 */}
                    {attraction.images?.[0] ? (
                      <img
                        src={attraction.images[0]}
                        alt={attraction.name}
                        className="w-14 h-14 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-muted-foreground/30" />
                      </div>
                    )}

                    {/* 資訊 */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{attraction.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getCountryName(attraction.country_id) || attraction.category || '未分類'}
                      </p>
                    </div>

                    {/* 加入按鈕或已加入標記 */}
                    {isAdded ? (
                      <Badge
                        variant="outline"
                        className="absolute top-2 right-2 text-xs bg-morandi-green/10 text-morandi-green border-morandi-green/30"
                      >
                        已加入
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 bg-primary text-white hover:bg-primary/90"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>

            {filteredAttractions.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>找不到符合的景點</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 基本設定頁籤 */
        <div className="max-w-2xl mx-auto p-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-base">客製化行程名稱 *</Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                placeholder="例：清邁精選景點"
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-base">連結代碼</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap px-3 py-2 bg-muted rounded-l-md border border-r-0">
                  /p/customized/
                </span>
                <Input
                  value={editForm.slug}
                  onChange={e => setEditForm(p => ({ ...p, slug: e.target.value }))}
                  placeholder="chiang-mai"
                  className="rounded-l-none flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                發佈後的連結：{window.location.origin}/p/customized/{editForm.slug || 'your-slug'}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-base">說明文字</Label>
              <Textarea
                value={editForm.description}
                onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                placeholder="這個客製化行程包含哪些景點？給客戶看的簡介..."
                rows={4}
              />
            </div>

            <div className="pt-4 border-t">
              <Button onClick={handleSaveSettings} size="lg">
                儲存設定
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 設定 Dialog（保留快速設定入口） */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent level={1} className="max-w-md">
          <DialogHeader>
            <DialogTitle>快速設定</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>名稱 *</Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                placeholder="例：清邁精選景點"
              />
            </div>

            <div className="space-y-2">
              <Label>連結代碼</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  /p/customized/
                </span>
                <Input
                  value={editForm.slug}
                  onChange={e => setEditForm(p => ({ ...p, slug: e.target.value }))}
                  placeholder="chiang-mai"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>說明</Label>
              <Textarea
                value={editForm.description}
                onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                placeholder="精選清邁必去景點..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveSettings}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ContentPageLayout>
  )
}
