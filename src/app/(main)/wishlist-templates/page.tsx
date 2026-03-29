'use client'

/**
 * 紙娃娃管理頁面
 * 路由: /wishlist-templates
 */

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Eye, Link as LinkIcon, MoreHorizontal, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase/client'

interface WishlistTemplate {
  id: string
  name: string
  slug: string
  description: string | null
  cover_image: string | null
  status: 'draft' | 'published' | 'archived'
  created_at: string
  _count?: {
    items: number
    inquiries: number
  }
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  draft: { label: '草稿', variant: 'secondary' },
  published: { label: '已發佈', variant: 'default' },
  archived: { label: '已封存', variant: 'outline' },
}

export default function WishlistTemplatesPage() {
  const { user } = useAuthStore()
  const [templates, setTemplates] = useState<WishlistTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<WishlistTemplate | null>(null)
  
  // 表單
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
  })



  const fetchTemplates = async () => {
    if (!user?.workspace_id) return

    const { data, error } = await supabase
      .from('wishlist_templates')
      .select(`
        *,
        wishlist_template_items(count),
        customer_inquiries(count)
      `)
      .eq('workspace_id', user.workspace_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('載入失敗:', error)
      toast.error('載入失敗')
      return
    }

    // 處理 count
    interface TemplateWithCount {
      wishlist_template_items?: { count: number }[]
      customer_inquiries?: { count: number }[]
      [key: string]: unknown
    }
    const processed = (data || []).map((t: TemplateWithCount) => ({
      ...t,
      _count: {
        items: t.wishlist_template_items?.[0]?.count || 0,
        inquiries: t.customer_inquiries?.[0]?.count || 0,
      }
    }))

    setTemplates(processed)
    setLoading(false)
  }

  useEffect(() => {
    fetchTemplates()
  }, [user?.workspace_id])

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-|-$/g, '')
      || `template-${Date.now()}`
  }

  const handleCreate = () => {
    setEditingTemplate(null)
    setFormData({ name: '', slug: '', description: '' })
    setDialogOpen(true)
  }

  const handleEdit = (template: WishlistTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      slug: template.slug,
      description: template.description || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('請輸入名稱')
      return
    }

    const slug = formData.slug || generateSlug(formData.name)

    if (editingTemplate) {
      // 更新
      const { error } = await supabase
        .from('wishlist_templates')
        .update({
          name: formData.name,
          slug,
          description: formData.description || null,
        })
        .eq('id', editingTemplate.id)

      if (error) {
        toast.error('更新失敗')
        return
      }
      toast.success('已更新')
    } else {
      // 新增
      const { error } = await supabase
        .from('wishlist_templates')
        .insert({
          workspace_id: user?.workspace_id,
          name: formData.name,
          slug,
          description: formData.description || null,
          status: 'draft',
          created_by: user?.id,
        })

      if (error) {
        if (error.message.includes('duplicate')) {
          toast.error('連結代碼已存在，請換一個')
          return
        }
        toast.error('新增失敗')
        return
      }
      toast.success('已建立')
    }

    setDialogOpen(false)
    fetchTemplates()
  }

  const handleDelete = async (template: WishlistTemplate) => {
    if (!confirm(`確定要刪除「${template.name}」？`)) return

    const { error } = await supabase
      .from('wishlist_templates')
      .delete()
      .eq('id', template.id)

    if (error) {
      toast.error('刪除失敗')
      return
    }

    toast.success('已刪除')
    fetchTemplates()
  }

  const handlePublish = async (template: WishlistTemplate) => {
    const newStatus = template.status === 'published' ? 'draft' : 'published'
    
    const { error } = await supabase
      .from('wishlist_templates')
      .update({ status: newStatus })
      .eq('id', template.id)

    if (error) {
      toast.error('操作失敗')
      return
    }

    toast.success(newStatus === 'published' ? '已發佈' : '已取消發佈')
    fetchTemplates()
  }

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/p/wishlist/${slug}`
    navigator.clipboard.writeText(url)
    toast.success('已複製連結')
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* 標題區 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="text-primary" />
            紙娃娃管理
          </h1>
          <p className="text-muted-foreground mt-1">
            建立客製化行程選單，讓客人自己挑選想去的景點
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          新增紙娃娃
        </Button>
      </div>

      {/* 列表 */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">還沒有紙娃娃</p>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              建立第一個
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      /{template.slug}
                    </p>
                  </div>
                  <Badge variant={STATUS_LABELS[template.status]?.variant}>
                    {STATUS_LABELS[template.status]?.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {template.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {template.description}
                  </p>
                )}
                
                <div className="flex gap-4 text-sm text-muted-foreground mb-4">
                  <span>{template._count?.items || 0} 個景點</span>
                  <span>{template._count?.inquiries || 0} 個詢價</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.location.href = `/wishlist-templates/${template.id}`}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    編輯
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {template.status === 'published' && (
                        <>
                          <DropdownMenuItem onClick={() => window.open(`/p/wishlist/${template.slug}`, '_blank')}>
                            <Eye className="w-4 h-4 mr-2" />
                            預覽
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyLink(template.slug)}>
                            <LinkIcon className="w-4 h-4 mr-2" />
                            複製連結
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuItem onClick={() => handlePublish(template)}>
                        {template.status === 'published' ? '取消發佈' : '發佈'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(template)}>
                        編輯資訊
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(template)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        刪除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 新增/編輯 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? '編輯紙娃娃' : '新增紙娃娃'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>名稱 *</Label>
              <Input
                value={formData.name}
                onChange={e => {
                  setFormData(p => ({ 
                    ...p, 
                    name: e.target.value,
                    slug: p.slug || generateSlug(e.target.value),
                  }))
                }}
                placeholder="例：清邁精選景點"
              />
            </div>

            <div className="space-y-2">
              <Label>連結代碼</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/p/wishlist/</span>
                <Input
                  value={formData.slug}
                  onChange={e => setFormData(p => ({ ...p, slug: e.target.value }))}
                  placeholder="chiang-mai"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                客人會看到的網址
              </p>
            </div>

            <div className="space-y-2">
              <Label>說明</Label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                placeholder="精選 30 個清邁必去景點，挑選您最想去的..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>
              {editingTemplate ? '更新' : '建立'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
