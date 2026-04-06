'use client'

/**
 * 客製化行程管理頁面
 * 路由: /customized-tours
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Link as LinkIcon,
  MoreHorizontal,
  Sparkles,
  Globe,
  FileEdit,
} from 'lucide-react'
import { toast } from 'sonner'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { TableColumn } from '@/components/ui/enhanced-table'
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
import { supabase } from '@/lib/supabase/client' // 用於 CRUD 操作
import { format } from 'date-fns'
import { logger } from '@/lib/utils/logger'

interface CustomizedTour {
  id: string
  name: string
  slug: string
  description: string | null
  cover_image: string | null
  status: 'draft' | 'published' | 'archived'
  created_at: string
  items_count: number
  inquiries_count: number
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  draft: { label: '草稿', variant: 'secondary' },
  published: { label: '已發佈', variant: 'default' },
  archived: { label: '已封存', variant: 'outline' },
}

export default function CustomizedToursPage() {
  const { user } = useAuthStore()
  const [templates, setTemplates] = useState<CustomizedTour[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<CustomizedTour | null>(null)

  // 表單
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
  })

  const fetchTemplates = useCallback(async () => {
    if (!user?.workspace_id) return

    try {
      const res = await fetch('/api/customized-tours')
      if (!res.ok) throw new Error('載入失敗')

      const data = await res.json()

      interface ApiRow {
        id: string
        name: string
        slug: string
        description: string | null
        cover_image: string | null
        status: string
        created_at: string | null
        wishlist_template_items: { count: number }[]
        customer_inquiries: { count: number }[]
      }

      const processed: CustomizedTour[] = (data || []).map((t: ApiRow) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        description: t.description,
        cover_image: t.cover_image,
        status: t.status as 'draft' | 'published' | 'archived',
        created_at: t.created_at || new Date().toISOString(),
        items_count: t.wishlist_template_items?.[0]?.count || 0,
        inquiries_count: t.customer_inquiries?.[0]?.count || 0,
      }))

      setTemplates(processed)
    } catch (error) {
      logger.error('載入失敗:', error)
      toast.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }, [user?.workspace_id])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const generateSlug = (name: string) => {
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
        .replace(/^-|-$/g, '') || `template-${Date.now()}`
    )
  }

  const handleCreate = () => {
    setEditingTemplate(null)
    setFormData({ name: '', slug: '', description: '' })
    setDialogOpen(true)
  }

  const handleEdit = (template: CustomizedTour) => {
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
      const { error } = await supabase.from('wishlist_templates').insert({
        workspace_id: user?.workspace_id as string,
        name: formData.name,
        slug,
        description: formData.description || null,
        status: 'draft' as const,
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

  const handleDelete = async (template: CustomizedTour) => {
    if (!confirm(`確定要刪除「${template.name}」？`)) return

    const { error } = await supabase.from('wishlist_templates').delete().eq('id', template.id)

    if (error) {
      toast.error('刪除失敗')
      return
    }

    toast.success('已刪除')
    fetchTemplates()
  }

  const handlePublish = async (template: CustomizedTour) => {
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
    const url = `${window.location.origin}/p/customized/${slug}`
    navigator.clipboard.writeText(url)
    toast.success('已複製連結')
  }

  // 表格欄位
  const columns: TableColumn<CustomizedTour>[] = [
    {
      key: 'name',
      label: '名稱',
      render: (_, row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <div className="text-xs text-muted-foreground">/{row.slug}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: '狀態',
      width: '100px',
      render: (_, row) => (
        <Badge variant={STATUS_CONFIG[row.status]?.variant}>
          {STATUS_CONFIG[row.status]?.label}
        </Badge>
      ),
    },
    {
      key: 'items_count',
      label: '景點數',
      width: '80px',
      align: 'center',
      render: (_, row) => row.items_count || 0,
    },
    {
      key: 'inquiries_count',
      label: '詢價數',
      width: '80px',
      align: 'center',
      render: (_, row) => row.inquiries_count || 0,
    },
    {
      key: 'created_at',
      label: '建立時間',
      width: '120px',
      render: (_, row) => format(new Date(row.created_at), 'yyyy/MM/dd'),
    },
  ]

  // 操作欄
  const renderActions = (row: CustomizedTour) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="iconSm">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => (window.location.href = `/customized-tours/${row.id}`)}>
          <Edit className="w-4 h-4 mr-2" />
          編輯景點
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleEdit(row)}>
          <FileEdit className="w-4 h-4 mr-2" />
          編輯資訊
        </DropdownMenuItem>
        {row.status === 'published' && (
          <>
            <DropdownMenuItem onClick={() => window.open(`/p/customized/${row.slug}`, '_blank')}>
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
        <DropdownMenuItem onClick={() => handleDelete(row)} className="text-destructive">
          <Trash2 className="w-4 h-4 mr-2" />
          刪除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <>
      <ListPageLayout
        title="客製化行程管理"
        icon={Sparkles}
        data={templates}
        columns={columns}
        loading={loading}
        renderActions={renderActions}
        onRowClick={row => (window.location.href = `/customized-tours/${row.id}`)}
        bordered
        searchable
        searchPlaceholder="搜尋名稱..."
        searchFields={['name', 'slug']}
        onAdd={handleCreate}
        addLabel="新增客製化行程"
        emptyMessage="還沒有客製化行程，點擊「新增客製化行程」開始建立"
      />

      {/* 新增/編輯 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent level={1} className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? '編輯客製化行程' : '新增客製化行程'}</DialogTitle>
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
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  /p/customized/
                </span>
                <Input
                  value={formData.slug}
                  onChange={e => setFormData(p => ({ ...p, slug: e.target.value }))}
                  placeholder="chiang-mai"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">客人會看到的網址</p>
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
            <Button onClick={handleSave}>{editingTemplate ? '更新' : '建立'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
