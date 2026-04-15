'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, Plus, Pencil, Trash2, BookOpen, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

// ─── Types ───────────────────────────────────────────────────────────────────

interface KnowledgeItem {
  id: string
  category: string
  question: string
  answer: string
  keywords: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

interface KnowledgeFormData {
  category: string
  question: string
  answer: string
  keywords: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: 'general', label: '一般問題' },
  { value: 'pricing', label: '價格相關' },
  { value: '行程', label: '行程安排' },
  { value: 'booking', label: '預訂流程' },
  { value: 'faq', label: '常見問題' },
]

// ─── Component ───────────────────────────────────────────────────────────────

interface KnowledgeTabProps {
  isConnected: boolean
}

export function KnowledgeTab({ isConnected }: KnowledgeTabProps) {
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // 新增/編輯 Dialog 狀態
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<KnowledgeFormData>({
    category: 'general',
    question: '',
    answer: '',
    keywords: '',
  })

  useEffect(() => {
    if (isConnected) {
      loadData()
    }
  }, [isConnected])

  const loadData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter !== 'all') {
        params.set('category', categoryFilter)
      }

      const res = await fetch(`/api/line/knowledge?${params}`)
      if (!res.ok) {
        logger.error('[KnowledgeTab] Failed to load', { status: res.status })
        return
      }
      const data = await res.json()
      setItems(data)
    } catch (err) {
      logger.error('[KnowledgeTab] Load error', err)
    } finally {
      setLoading(false)
    }
  }

  // 當篩選條件改變時重新載入
  useEffect(() => {
    if (isConnected) {
      loadData()
    }
  }, [categoryFilter])

  // 搜尋過濾
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items
    const kw = searchTerm.toLowerCase()
    return items.filter(
      item =>
        item.question?.toLowerCase().includes(kw) ||
        item.answer?.toLowerCase().includes(kw) ||
        item.keywords?.some(k => k.toLowerCase().includes(kw))
    )
  }, [items, searchTerm])

  // 取得所有不重複的分類
  const categories = useMemo(() => {
    const cats = new Set(items.map(item => item.category).filter(Boolean))
    return Array.from(cats)
  }, [items])

  // 展開/收合項目
  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // 開啟新增 Dialog
  const openAddDialog = () => {
    setEditingItem(null)
    setFormData({
      category: 'general',
      question: '',
      answer: '',
      keywords: '',
    })
    setDialogOpen(true)
  }

  // 開啟編輯 Dialog
  const openEditDialog = (item: KnowledgeItem) => {
    setEditingItem(item)
    setFormData({
      category: item.category || 'general',
      question: item.question || '',
      answer: item.answer || '',
      keywords: item.keywords?.join(', ') || '',
    })
    setDialogOpen(true)
  }

  // 儲存（新增或編輯）
  const handleSave = async () => {
    setSaving(true)
    try {
      const keywordsArray = formData.keywords
        .split(',')
        .map(k => k.trim())
        .filter(Boolean)

      const payload = {
        category: formData.category,
        question: formData.question,
        answer: formData.answer,
        keywords: keywordsArray,
      }

      let res
      if (editingItem) {
        res = await fetch(`/api/line/knowledge/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/line/knowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || '儲存失敗')
        return
      }

      toast.success(editingItem ? '已更新' : '已新增')
      setDialogOpen(false)
      loadData()
    } catch (err) {
      logger.error('[KnowledgeTab] Save error', err)
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  // 刪除項目
  const handleDelete = async (item: KnowledgeItem) => {
    if (!confirm(`確定要刪除「${item.question || '此項目'}」嗎？`)) {
      return
    }

    try {
      const res = await fetch(`/api/line/knowledge/${item.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        toast.error('刪除失敗')
        return
      }

      toast.success('已刪除')
      loadData()
    } catch (err) {
      logger.error('[KnowledgeTab] Delete error', err)
      toast.error('刪除失敗')
    }
  }

  // 未連線時顯示
  if (!isConnected) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>請先在「平台連線」完成 LINE Bot 設定</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* 搜尋和篩選工具列 */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋問題、答案或關鍵字..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="分類篩選" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分類</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={openAddDialog}>
          <Plus className="h-4 w-4 mr-2" />
          新增知識
        </Button>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">載入中...</div>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{searchTerm ? '沒有符合的知識庫項目' : '尚無知識庫資料'}</p>
            <Button variant="outline" className="mt-4" onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              新增第一筆知識
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredItems.map(item => {
            const isExpanded = expandedItems.has(item.id)
            return (
              <Card key={item.id} className="overflow-hidden">
                <div
                  className="flex items-start gap-3 p-4 cursor-pointer hover:bg-morandi-container/50 transition-colors"
                  onClick={() => toggleExpand(item.id)}
                >
                  {/* 展開圖示 */}
                  <div className="mt-0.5">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* 主要內容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {item.category || '一般'}
                      </Badge>
                      {item.keywords && item.keywords.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          關鍵字: {item.keywords.join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-morandi-primary line-clamp-2">
                      {item.question || '(無問題)'}
                    </div>
                    {!isExpanded && item.answer && (
                      <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {item.answer}
                      </div>
                    )}
                  </div>

                  {/* 操作按鈕 */}
                  <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-status-error"
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* 展開後顯示完整答案 */}
                {isExpanded && item.answer && (
                  <div className="border-t px-4 py-3 bg-morandi-container/30">
                    <div className="text-xs text-muted-foreground mb-1">答案：</div>
                    <div className="text-sm text-morandi-secondary whitespace-pre-wrap">
                      {item.answer}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* 新增/編輯 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? '編輯知識' : '新增知識'}</DialogTitle>
            <DialogDescription>
              建立 AI 客服可以使用的問答知識
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 分類 */}
            <div>
              <label className="text-sm font-medium text-morandi-primary block mb-2">
                分類 <span className="text-status-error">*</span>
              </label>
              <Select
                value={formData.category}
                onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 問題 */}
            <div>
              <label className="text-sm font-medium text-morandi-primary block mb-2">
                問題 <span className="text-status-error">*</span>
              </label>
              <Input
                value={formData.question}
                onChange={e => setFormData(prev => ({ ...prev, question: e.target.value }))}
                placeholder="例如：你們有做日本行程嗎？"
              />
              <p className="text-xs text-muted-foreground mt-1">
                客戶可能會問的問題
              </p>
            </div>

            {/* 答案 */}
            <div>
              <label className="text-sm font-medium text-morandi-primary block mb-2">
                答案 <span className="text-status-error">*</span>
              </label>
              <textarea
                value={formData.answer}
                onChange={e => setFormData(prev => ({ ...prev, answer: e.target.value }))}
                rows={6}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-y focus:outline-none focus:ring-1 focus:ring-morandi-gold"
                placeholder="AI 應該如何回覆這個問題..."
              />
            </div>

            {/* 關鍵字 */}
            <div>
              <label className="text-sm font-medium text-morandi-primary block mb-2">
                關鍵字
              </label>
              <Input
                value={formData.keywords}
                onChange={e => setFormData(prev => ({ ...prev, keywords: e.target.value }))}
                placeholder="日本, 東北, 溫泉 (用逗號分隔)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                額外的關鍵字，有助於增加匹配機會
              </p>
            </div>
          </div>

          {/* Dialog Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formData.question || !formData.answer}
            >
              {saving ? '儲存中...' : '儲存'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}