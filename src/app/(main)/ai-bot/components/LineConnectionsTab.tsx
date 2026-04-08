'use client'

import { useState, useEffect } from 'react'
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
import { Users, User, Building, Search } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'

interface LineGroup {
  id: string
  group_id: string
  group_name: string | null
  member_count: number | null
  supplier_id: string | null
  category: string | null
  note: string | null
  joined_at: string | null
  updated_at: string | null
  suppliers: { id: string; name: string } | null
}

interface LineUser {
  id: string
  user_id: string
  display_name: string | null
  picture_url: string | null
  status_message: string | null
  supplier_id: string | null
  employee_id: string | null
  note: string | null
  followed_at: string | null
  unfollowed_at: string | null
  updated_at: string | null
  suppliers: { id: string; name: string } | null
  employees: { id: string; display_name: string; code: string } | null
}

interface Supplier {
  id: string
  name: string
}

const CATEGORY_OPTIONS = [
  { value: 'supplier', label: '供應商' },
  { value: 'internal', label: '內部群組' },
  { value: 'customer', label: '客戶群組' },
]

interface LineConnectionsTabProps {
  groups: LineGroup[]
  users: LineUser[]
  suppliers: Supplier[]
  searchTerm: string
  onRefresh: () => void
}

export function LineConnectionsTab({
  groups,
  users,
  suppliers,
  searchTerm,
  onRefresh,
}: LineConnectionsTabProps) {
  const [editingItem, setEditingItem] = useState<{
    type: 'group' | 'user'
    item: LineGroup | LineUser
  } | null>(null)
  const [editForm, setEditForm] = useState({
    supplier_id: '',
    category: '',
    note: '',
  })

  function openEditDialog(type: 'group' | 'user', item: LineGroup | LineUser) {
    setEditingItem({ type, item })
    setEditForm({
      supplier_id: item.supplier_id || '',
      category: type === 'group' ? (item as LineGroup).category || '' : '',
      note: item.note || '',
    })
  }

  async function handleSave() {
    if (!editingItem) return

    try {
      const res = await fetch('/api/line/connections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editingItem.type,
          id: editingItem.item.id,
          supplier_id: editForm.supplier_id || null,
          category: editForm.category || null,
          note: editForm.note || null,
        }),
      })

      if (!res.ok) throw new Error()

      toast.success('已儲存')
      setEditingItem(null)
      onRefresh()
    } catch {
      toast.error('儲存失敗')
    }
  }

  const filteredGroups = groups.filter(
    g =>
      !searchTerm ||
      g.group_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.suppliers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredUsers = users.filter(
    u =>
      !searchTerm ||
      u.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.suppliers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <>
      {/* 群組 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            LINE 群組 ({filteredGroups.length})
          </CardTitle>
          <CardDescription>Bot 被加入的群組會自動記錄，你可以綁定供應商或分類</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">目前沒有群組記錄</div>
          ) : (
            <div className="space-y-3">
              {filteredGroups.map(group => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-brand-line flex items-center justify-center text-white">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium">{group.group_name || '未命名群組'}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        {group.member_count && <span>{group.member_count} 人</span>}
                        {group.joined_at && (
                          <span>
                            加入於 {new Date(group.joined_at).toLocaleDateString('zh-TW')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {group.category && (
                      <Badge variant="outline">
                        {CATEGORY_OPTIONS.find(c => c.value === group.category)?.label ||
                          group.category}
                      </Badge>
                    )}
                    {group.suppliers ? (
                      <Badge className="bg-morandi-gold">
                        <Building className="h-3 w-3 mr-1" />
                        {group.suppliers.name}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">未綁定</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog('group', group)}
                    >
                      編輯
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 好友 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            LINE 好友 ({filteredUsers.length})
          </CardTitle>
          <CardDescription>加 Bot 好友的人會自動記錄，你可以綁定為供應商或員工</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">目前沒有好友記錄</div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors ${
                    user.unfollowed_at ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {user.picture_url ? (
                      <img
                        src={user.picture_url}
                        alt={user.display_name || ''}
                        className="h-10 w-10 rounded-full"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-morandi-container flex items-center justify-center">
                        <User className="h-5 w-5 text-morandi-secondary" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {user.display_name || '未知用戶'}
                        {user.unfollowed_at && (
                          <Badge variant="destructive" className="text-xs">
                            已取消追蹤
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.status_message || (
                          <span>
                            加入於{' '}
                            {user.followed_at
                              ? new Date(user.followed_at).toLocaleDateString('zh-TW')
                              : '未知'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {user.employees ? (
                      <Badge className="bg-status-info">
                        <User className="h-3 w-3 mr-1" />
                        {user.employees.display_name}
                      </Badge>
                    ) : user.suppliers ? (
                      <Badge className="bg-morandi-gold">
                        <Building className="h-3 w-3 mr-1" />
                        {user.suppliers.name}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">未辨識</Badge>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => openEditDialog('user', user)}>
                      編輯
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 編輯 Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent level={1}>
          <DialogHeader>
            <DialogTitle>{editingItem?.type === 'group' ? '編輯群組' : '編輯好友'}</DialogTitle>
            <DialogDescription>
              綁定供應商後，發送需求單時可以選擇這個
              {editingItem?.type === 'group' ? '群組' : '好友'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {editingItem?.type === 'group' && (
              <div>
                <label className="text-sm font-medium mb-2 block">分類</label>
                <Select
                  value={editForm.category}
                  onValueChange={v => setEditForm(f => ({ ...f, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇分類" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">不分類</SelectItem>
                    {CATEGORY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">綁定供應商</label>
              <Select
                value={editForm.supplier_id}
                onValueChange={v => setEditForm(f => ({ ...f, supplier_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇供應商" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">不綁定</SelectItem>
                  {Array.isArray(suppliers) &&
                    suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">備註</label>
              <Input
                value={editForm.note}
                onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))}
                placeholder="備註..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                取消
              </Button>
              <Button onClick={handleSave}>儲存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
