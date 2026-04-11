'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Megaphone, Plus, Pin, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface Announcement {
  id: string
  title: string
  content: string | null
  category: string
  is_pinned: boolean
  published_at: string | null
  created_by: string | null
  created_at: string
  creator_name?: string
}

const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  general: { label: '一般', color: 'bg-morandi-container text-morandi-secondary' },
  policy: { label: '制度', color: 'bg-status-info-bg text-status-info' },
  event: { label: '活動', color: 'bg-morandi-gold/10 text-morandi-gold' },
  urgent: { label: '緊急', color: 'bg-morandi-red/10 text-morandi-red' },
}

export default function AnnouncementsPage() {
  const { user } = useAuthStore()
  const { isAdmin } = useAuthStore()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formCategory, setFormCategory] = useState('general')
  const [formPinned, setFormPinned] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('announcements' as never)
        .select('*, creator:employees!announcements_created_by_fkey(display_name, chinese_name)')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50)

      const mapped = (data || []).map((a: Record<string, unknown>) => {
        const creator = a.creator as { display_name: string | null; chinese_name: string | null } | null
        return { ...a, creator_name: creator?.display_name || creator?.chinese_name || '' } as Announcement
      })
      setAnnouncements(mapped)
    } catch (err) {
      logger.error('載入公告失敗:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAnnouncements() }, [fetchAnnouncements])

  const handleSubmit = async () => {
    if (!formTitle.trim()) { toast.error('請填寫標題'); return }
    setSaving(true)
    try {
      if (editingId) {
        await supabase.from('announcements' as never).update({
          title: formTitle, content: formContent || null,
          category: formCategory, is_pinned: formPinned,
          updated_at: new Date().toISOString(),
        } as never).eq('id', editingId)
        toast.success('公告已更新')
      } else {
        await supabase.from('announcements' as never).insert({
          workspace_id: user?.workspace_id,
          title: formTitle, content: formContent || null,
          category: formCategory, is_pinned: formPinned,
          published_at: new Date().toISOString(),
          created_by: user?.id,
        } as never)
        toast.success('公告已發布')
      }
      setShowDialog(false)
      resetForm()
      fetchAnnouncements()
    } catch (err) {
      logger.error('儲存公告失敗:', err)
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此公告？')) return
    await supabase.from('announcements' as never).delete().eq('id', id)
    toast.success('已刪除')
    fetchAnnouncements()
  }

  const handleEdit = (a: Announcement) => {
    setEditingId(a.id)
    setFormTitle(a.title)
    setFormContent(a.content || '')
    setFormCategory(a.category)
    setFormPinned(a.is_pinned)
    setShowDialog(true)
  }

  const resetForm = () => {
    setEditingId(null)
    setFormTitle('')
    setFormContent('')
    setFormCategory('general')
    setFormPinned(false)
  }

  const formatDate = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
  }

  return (
    <ContentPageLayout
      title="公司公告"
      icon={Megaphone}
      headerActions={
        isAdmin ? (
          <Button onClick={() => { resetForm(); setShowDialog(true) }} className="bg-morandi-gold hover:bg-morandi-gold-hover text-white">
            <Plus size={16} className="mr-1" /> 發布公告
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-morandi-muted">載入中...</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-12 text-morandi-muted">尚無公告</div>
        ) : (
          announcements.map(a => {
            const cat = CATEGORY_MAP[a.category] || CATEGORY_MAP.general
            return (
              <Card key={a.id} className={cn('rounded-xl border border-border p-5', a.is_pinned && 'border-morandi-gold/40 bg-morandi-gold/5')}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {a.is_pinned && <Pin size={12} className="text-morandi-gold" />}
                      <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', cat.color)}>{cat.label}</span>
                      <span className="text-xs text-morandi-muted">{formatDate(a.created_at)}</span>
                      {a.creator_name && <span className="text-xs text-morandi-muted">· {a.creator_name}</span>}
                    </div>
                    <h3 className="text-sm font-semibold text-morandi-primary">{a.title}</h3>
                    {a.content && <p className="text-sm text-morandi-secondary mt-1 whitespace-pre-line">{a.content}</p>}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => handleEdit(a)} className="p-1.5 text-morandi-secondary hover:text-morandi-gold hover:bg-morandi-gold/10 rounded"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(a.id)} className="p-1.5 text-morandi-secondary hover:text-morandi-red hover:bg-morandi-red/10 rounded"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
              </Card>
            )
          })
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent level={1} className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? '編輯公告' : '發布公告'}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>標題</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="公告標題" className="mt-1" />
            </div>
            <div>
              <Label>內容</Label>
              <textarea
                value={formContent}
                onChange={e => setFormContent(e.target.value)}
                placeholder="公告內容..."
                className="mt-1 w-full min-h-[120px] rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-morandi-gold/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>分類</Label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                  className="mt-1 w-full h-9 rounded-lg border border-border px-3 text-sm"
                >
                  <option value="general">一般</option>
                  <option value="policy">制度</option>
                  <option value="event">活動</option>
                  <option value="urgent">緊急</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formPinned} onChange={e => setFormPinned(e.target.checked)} className="rounded" />
                  <span className="text-sm text-morandi-primary">置頂</span>
                </label>
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={saving} className="w-full bg-morandi-gold hover:bg-morandi-gold-hover text-white">
              {saving ? '儲存中...' : editingId ? '更新公告' : '發布公告'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ContentPageLayout>
  )
}
