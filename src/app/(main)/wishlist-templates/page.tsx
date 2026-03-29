'use client'

/**
 * 紙娃娃管理頁面
 * 路由: /wishlist-templates
 */

import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit, Trash2, Eye, Link as LinkIcon, MoreHorizontal, Sparkles, Globe, FileEdit } from 'lucide-react'
import { toast } from 'sonner'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { EnhancedTable, TableColumn } from '@/components/ui/enhanced-table'
import { Button } from '@/components/ui/button'
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
import { format } from 'date-fns'

interface WishlistTemplate {
  id: string
  name: string
  slug: string
  description: string | null
  cover_image: string | null
  status: 'draft' | 'published' | 'archived'
  created_at: string
  items_count?: number
  inquiries_count?: number
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
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
  const [searchTerm, setSearchTerm] = useState('')
  
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
    interface TemplateRow {
      id: string
      name: string
      slug: string
      description: string | null
      cover_image: string | null
      status: 'draft' | 'published' | 'archived'
      created_at: string
      wishlist_template_items?: { count: number }[]
      customer_inquiries?: { count: number }[]
    }
    
    const processed = (data || []).map((t: TemplateRow) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      cover_image: t.cover_image,
      status: t.status,
      created_at: t.created_at,
      items_count: t.wishlist_template_items?.[0]?.count || 0,
      inquiries_count: t.customer_inquiries?.[0]?.count || 0,
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

  // 篩選
  const filteredTemplates = useMemo(() => {
    if (!searchTerm) return templates
    const term = searchTerm.toLowerCase()
    return templates.filter(t => 
      t.name.toLowerCase().includes(term) ||
      t.slug.toLowerCase().includes(term)
    )
  }, [templates, searchTerm])

  // 表格欄位
  const columns: TableColumn<WishlistTemplate>[] = [
    {
      key: 'name',
      title: '名稱',
      render: (row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-muted-foreground">/{row.slug}</div>
        </div>
      ),
    },
    {
      key: 'status',
      title: '狀態',
      width: '100px',
      render: (row) => (
        <Badge variant={STATUS_CONFIG[row.status]?.variant}>
          {STATUS_CONFIG[row.status]?.label}
        </Badge>
      ),
    },
    {
      key: 'items_count',
      title: '景點數',
      width: '80px',
      align: 'center',
      render: (row) => row.items_count || 0,
    },
    {
      key: 'inquiries_count',
      title: '詢價數',
      width: '80px',
      align: 'center',
      render: (row) => row.inquiries_count || 0,
    },
    {
      key: 'created_at',
      title: '建立時間',
      width: '120px',
      render: (row) => format(new Date(row.created_at), 'yyyy/MM/dd'),
    },
  ]

  // 操作欄
  const renderActions = (row: WishlistTemplate) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="iconSm">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => window.location.href = `/wishlist-templates/${row.id}`}>
          <Edit className="w-4 h-4 mr-2" />
          編輯景點
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleEdit(row)}>
          <FileEdit className="w-4 h-4 mr-2" />
          編輯資訊
        </DropdownMenuItem>
        {row.status === 'published' && (
          <>
            <DropdownMenuItem onClick={() => window.open(`/p/wishlist/${row.slug}`, '_blank')}>
              <Eye className="w-4 h-4 mr-2" />
              預覽
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copyLink(row.slug)}>
              <LinkIcon className="w-4 h-4 mr-2" />
              複製連結
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuItem onClick={() => handlePublish(row)}>
          <Globe className="w-4 h-4 mr-2" />
          {row.status === 'published' ? '取消發佈' : '發佈'}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleDelete(row)}
          className="text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          刪除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <ListPageLayout
      title="紙娃娃管理"
      icon={Sparkles}
      description="建立客製化行程選單，讓客人自己挑選想去的景點"
      primaryAction={{
        label: '新增紙娃娃',
        icon: Plus,
        onClick: handleCreate,
      }}
      searchPlaceholder="搜尋名稱..."
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
    >
      <EnhancedTable
        columns={columns}
        data={filteredTemplates}
        loading={loading}
        actions={renderActions}
        actionsWidth="50px"
        onRowClick={(row) => window.location.href = `/wishlist-templates/${row.id}`}
        bordered
        emptyState={
          <div className="flex flex-col items-center py-12">
            <Sparkles size={48} className="text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">還沒有紙娃娃</p>
            <p className="text-sm text-muted-foreground/70">點擊「新增紙娃娃」開始建立</p>
          </div>
        }
      />

      {/* 新增/編輯 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
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
                <span className="text-sm text-muted-foreground whitespace-nowrap">/p/wishlist/</span>
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
    </ListPageLayout>
  )
}
