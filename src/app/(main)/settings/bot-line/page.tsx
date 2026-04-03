'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageCircle, Users, User, Building, RefreshCw, Search, Link2, Settings, Key, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { SettingsTabs } from '../components/SettingsTabs'
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

export default function LineConnectionsPage() {
  const [groups, setGroups] = useState<LineGroup[]>([])
  const [users, setUsers] = useState<LineUser[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingItem, setEditingItem] = useState<{
    type: 'group' | 'user'
    item: LineGroup | LineUser
  } | null>(null)
  const [editForm, setEditForm] = useState({
    supplier_id: '',
    category: '',
    note: '',
  })

  useEffect(() => {
    loadData()
    loadSuppliers()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/line/connections')
      const data = await res.json()
      
      
      if (data.error) {
        toast.error(`載入失敗: ${data.error}`)
      }
      
      setGroups(data.groups || [])
      setUsers(data.users || [])
    } catch (error) {
      logger.error('載入 LINE 連線失敗:', error)
      toast.error('載入失敗')
    } finally {
      setLoading(false)
    }
  }

  async function loadSuppliers() {
    try {
      const res = await fetch('/api/suppliers')
      const data = await res.json()
      setSuppliers(data || [])
    } catch {
      // 忽略
    }
  }

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
      loadData()
    } catch {
      toast.error('儲存失敗')
    }
  }

  const filteredGroups = groups.filter(g => 
    !searchTerm || 
    g.group_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.suppliers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredUsers = users.filter(u => 
    !searchTerm || 
    u.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.suppliers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // 統計
  const unboundGroups = groups.filter(g => !g.supplier_id && !g.category)
  const unboundUsers = users.filter(u => !u.supplier_id && !u.employee_id)

  return (
    <ContentPageLayout 
      title="管理 LINE Bot"
      icon={MessageCircle}
      headerActions={
        <div className="flex items-center gap-4">
          <SettingsTabs />
          <Button onClick={loadData} variant="outline" disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            重新整理
          </Button>
        </div>
      }
    >
      <div className="max-w-6xl mx-auto space-y-6 p-6">

      {/* 統計卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-[#B8860B]/10">
                <Users className="h-5 w-5 text-[#B8860B]" />
              </div>
              <div>
                <div className="text-2xl font-bold">{groups.length}</div>
                <div className="text-sm text-muted-foreground">群組</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-status-info/10">
                <User className="h-5 w-5 text-status-info" />
              </div>
              <div>
                <div className="text-2xl font-bold">{users.length}</div>
                <div className="text-sm text-muted-foreground">好友</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-status-warning/10">
                <Link2 className="h-5 w-5 text-status-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold">{unboundGroups.length}</div>
                <div className="text-sm text-muted-foreground">待分類群組</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-morandi-secondary/10">
                <MessageCircle className="h-5 w-5 text-morandi-secondary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{unboundUsers.length}</div>
                <div className="text-sm text-muted-foreground">待辨識好友</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 搜尋 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜尋群組名稱或供應商..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* 主要內容 */}
      <Tabs defaultValue="groups">
        <TabsList>
          <TabsTrigger value="groups">
            <Users className="h-4 w-4 mr-2" />
            群組 ({filteredGroups.length})
          </TabsTrigger>
          <TabsTrigger value="users">
            <User className="h-4 w-4 mr-2" />
            好友 ({filteredUsers.length})
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            LINE 設定
          </TabsTrigger>
          <TabsTrigger value="ai">
            <MessageCircle className="h-4 w-4 mr-2" />
            AI 設定
          </TabsTrigger>
        </TabsList>

        {/* LINE 設定頁籤 — Setup Wizard */}
        <TabsContent value="settings" className="mt-4">
          <LineSetupWizard />
        </TabsContent>
        {/* 以下為舊的設定頁面，已被 LineSetupWizard 取代 */}
        <TabsContent value="_old_settings_hidden" className="mt-4 hidden">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Messaging API（機器人）
                </CardTitle>
                <CardDescription>
                  用於接收/發送 LINE 訊息、群組通知等
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Channel ID</label>
                    <div className="mt-1 font-mono text-sm bg-muted px-3 py-2 rounded">
                      {process.env.NEXT_PUBLIC_LINE_CHANNEL_ID || '（未設定）'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">狀態</label>
                    <div className="mt-1">
                      <Badge className="bg-morandi-green">已連接</Badge>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>⚠️ Messaging API 設定需要在環境變數中配置：</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li><code>LINE_CHANNEL_ACCESS_TOKEN</code></li>
                    <li><code>LINE_CHANNEL_SECRET</code></li>
                  </ul>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    開啟 LINE Developers Console
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* LINE Login */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  LINE Login（客戶登入）
                </CardTitle>
                <CardDescription>
                  讓客戶用 LINE 登入網站，詢價後自動推播追蹤連結
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Channel ID</label>
                    <div className="mt-1 font-mono text-sm bg-muted px-3 py-2 rounded">
                      {process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID || '2009638032'}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Callback URL</label>
                    <div className="mt-1 font-mono text-sm bg-muted px-3 py-2 rounded text-xs">
                      https://app.cornertravel.com.tw/api/auth/line/callback
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-morandi-gold/10 border border-morandi-gold/30 rounded-lg">
                  <p className="text-sm text-morandi-primary font-medium">⚠️ 重要：連結 LINE OA</p>
                  <p className="text-sm text-morandi-secondary mt-1">
                    需要在 LINE Developers Console 將 LINE Login Channel 與 Messaging API Channel 連結，
                    這樣登入取得的 userId 才能用來推播訊息。
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      前往設定 Linked OA
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 設定說明 */}
            <Card>
              <CardHeader>
                <CardTitle>設定說明</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>到 <a href="https://developers.line.biz/console/" className="text-primary underline" target="_blank">LINE Developers Console</a></li>
                  <li>建立 Provider（如果還沒有）</li>
                  <li>建立 Messaging API Channel（機器人）</li>
                  <li>建立 LINE Login Channel（客戶登入）</li>
                  <li>在 LINE Login Channel 設定 Callback URL</li>
                  <li>將兩個 Channel 連結（Linked OA）</li>
                  <li>把 Channel ID、Secret、Access Token 設定到環境變數</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="groups" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>LINE 群組</CardTitle>
              <CardDescription>
                Bot 被加入的群組會自動記錄，你可以綁定供應商或分類
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  目前沒有群組記錄
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredGroups.map(group => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-[#06C755] flex items-center justify-center text-white">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {group.group_name || '未命名群組'}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            {group.member_count && (
                              <span>{group.member_count} 人</span>
                            )}
                            {group.joined_at && (
                              <span>加入於 {new Date(group.joined_at).toLocaleDateString('zh-TW')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {group.category && (
                          <Badge variant="outline">
                            {CATEGORY_OPTIONS.find(c => c.value === group.category)?.label || group.category}
                          </Badge>
                        )}
                        {group.suppliers ? (
                          <Badge className="bg-[#B8860B]">
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
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>LINE 好友</CardTitle>
              <CardDescription>
                加 Bot 好友的人會自動記錄，你可以綁定為供應商或員工
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  目前沒有好友記錄
                </div>
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
                              <Badge variant="destructive" className="text-xs">已取消追蹤</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.status_message || (
                              <span>加入於 {user.followed_at ? new Date(user.followed_at).toLocaleDateString('zh-TW') : '未知'}</span>
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
                          <Badge className="bg-[#B8860B]">
                            <Building className="h-3 w-3 mr-1" />
                            {user.suppliers.name}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">未辨識</Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog('user', user)}
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
        </TabsContent>
        {/* AI 設定頁籤 */}
        <TabsContent value="ai" className="mt-4">
          <AISettingsTab />
        </TabsContent>
      </Tabs>

      {/* 編輯 Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent level={1}>
          <DialogHeader>
            <DialogTitle>
              {editingItem?.type === 'group' ? '編輯群組' : '編輯好友'}
            </DialogTitle>
            <DialogDescription>
              綁定供應商後，發送需求單時可以選擇這個{editingItem?.type === 'group' ? '群組' : '好友'}
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
                  {suppliers.map(s => (
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
              <Button onClick={handleSave}>
                儲存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </ContentPageLayout>
  )
}

/**
 * LINE Bot Setup Wizard — 新手引導設定
 */
function LineSetupWizard() {
  const [config, setConfig] = useState<{
    setup_step: number
    is_connected: boolean
    bot_display_name?: string
    bot_basic_id?: string
    webhook_url?: string
  }>({ setup_step: 0, is_connected: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [token, setToken] = useState('')
  const [secret, setSecret] = useState('')

  useEffect(() => {
    fetch('/api/line/setup')
      .then(r => r.json())
      .then(data => {
        setConfig(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSaveCredentials = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/line/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_messaging', channel_access_token: token, channel_secret: secret }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success(`連線成功！Bot: ${data.bot.displayName}`)
        setConfig(prev => ({ ...prev, setup_step: 2, bot_display_name: data.bot.displayName, bot_basic_id: data.bot.basicId }))
      } else {
        toast.error(data.error || '連線失敗')
      }
    } catch {
      toast.error('連線失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleSetWebhook = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/line/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_webhook' }),
      })
      const data = await res.json()
      if (data.ok) {
        toast.success('Webhook 設定成功！')
        setConfig(prev => ({ ...prev, setup_step: 3, is_connected: true, webhook_url: data.webhook_url }))
      } else {
        toast.error(data.error || 'Webhook 設定失敗')
      }
    } catch {
      toast.error('設定失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    await fetch('/api/line/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete' }),
    })
    setConfig(prev => ({ ...prev, setup_step: 4 }))
    toast.success('LINE Bot 設定完成！')
  }

  if (loading) return <div className="py-8 text-center text-morandi-secondary">載入中...</div>

  const step = config.setup_step

  // 已完成設定 — 顯示狀態
  if (step >= 4 && config.is_connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-morandi-green" />
            LINE Bot 已連接
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-morandi-muted">Bot 名稱</label>
              <p className="font-medium">{config.bot_display_name || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-morandi-muted">Bot ID</label>
              <p className="font-mono text-sm">{config.bot_basic_id || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-morandi-muted">Webhook</label>
              <p className="font-mono text-xs">{config.webhook_url || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-morandi-muted">狀態</label>
              <Badge className="bg-morandi-green/20 text-morandi-green">✅ 運作中</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setConfig(prev => ({ ...prev, setup_step: 0 }))}>
            重新設定
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Setup Wizard
  return (
    <div className="space-y-4">
      {/* Step 1: 建立 LINE Channel */}
      <Card className={step >= 1 ? 'border-morandi-green/30' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-morandi-green text-white' : 'bg-morandi-container text-morandi-secondary'}`}>1</span>
            建立 LINE Messaging API Channel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="list-decimal list-inside space-y-2 text-sm text-morandi-secondary">
            <li>前往 <a href="https://developers.line.biz/console/" target="_blank" rel="noopener noreferrer" className="text-morandi-gold underline">LINE Developers Console</a></li>
            <li>建立 Provider（公司名稱）</li>
            <li>建立 <strong>Messaging API Channel</strong></li>
            <li>在 Channel 的 <strong>Messaging API</strong> 頁面找到 <strong>Channel access token</strong>（點 Issue）</li>
            <li>在 <strong>Basic settings</strong> 頁面找到 <strong>Channel secret</strong></li>
          </ol>
          {step < 1 && (
            <Button variant="outline" size="sm" onClick={() => setConfig(prev => ({ ...prev, setup_step: 1 }))}>
              我已建立，下一步
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Step 2: 輸入 API credentials */}
      <Card className={step >= 2 ? 'border-morandi-green/30' : step >= 1 ? '' : 'opacity-50'}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-morandi-green text-white' : 'bg-morandi-container text-morandi-secondary'}`}>2</span>
            輸入 API 金鑰
            {step >= 2 && config.bot_display_name && (
              <Badge className="bg-morandi-green/20 text-morandi-green ml-2">✅ {config.bot_display_name}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        {step >= 1 && (
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium">Channel Access Token</label>
              <Input
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="貼上 Channel access token..."
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Channel Secret</label>
              <Input
                type="password"
                value={secret}
                onChange={e => setSecret(e.target.value)}
                placeholder="貼上 Channel secret..."
                className="mt-1 font-mono text-xs"
              />
            </div>
            {step < 2 && (
              <Button onClick={handleSaveCredentials} disabled={saving || !token || !secret}>
                {saving ? '驗證中...' : '驗證並儲存'}
              </Button>
            )}
          </CardContent>
        )}
      </Card>

      {/* Step 3: 設定 Webhook */}
      <Card className={step >= 3 ? 'border-morandi-green/30' : step >= 2 ? '' : 'opacity-50'}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? 'bg-morandi-green text-white' : 'bg-morandi-container text-morandi-secondary'}`}>3</span>
            設定 Webhook（自動）
            {step >= 3 && <Badge className="bg-morandi-green/20 text-morandi-green ml-2">✅ 已連接</Badge>}
          </CardTitle>
        </CardHeader>
        {step >= 2 && step < 3 && (
          <CardContent>
            <p className="text-sm text-morandi-secondary mb-3">
              點擊下方按鈕，系統會自動幫你設定 Webhook URL 並測試連線。
            </p>
            <Button onClick={handleSetWebhook} disabled={saving}>
              {saving ? '設定中...' : '一鍵設定 Webhook'}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Step 4: 完成 */}
      <Card className={step >= 3 ? '' : 'opacity-50'}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 4 ? 'bg-morandi-green text-white' : 'bg-morandi-container text-morandi-secondary'}`}>4</span>
            完成！
          </CardTitle>
        </CardHeader>
        {step >= 3 && step < 4 && (
          <CardContent>
            <p className="text-sm text-morandi-secondary mb-3">
              🎉 LINE Bot 已成功連接！客戶傳訊息給你的 LINE@ 帳號，AI 助理會自動回覆。
            </p>
            <Button onClick={handleComplete}>完成設定</Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

/**
 * AI 設定頁籤 — 管理員可修改 AI 提示詞和通知模板
 */
function AISettingsTab() {
  const [settings, setSettings] = useState<Record<string, { value: string; description: string; id: string }>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai-settings')
      if (res.ok) {
        const data = await res.json()
        const map: typeof settings = {}
        for (const row of data) {
          const key = `${row.setting_category}:${row.setting_key}`
          map[key] = { value: row.setting_value || '', description: row.description || '', id: row.id }
        }
        setSettings(map)
        const vals: Record<string, string> = {}
        for (const [k, v] of Object.entries(map)) {
          vals[k] = v.value
        }
        setEditValues(vals)
      }
    } catch (err) {
      logger.error('載入 AI 設定失敗', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (settingKey: string) => {
    setSaving(settingKey)
    try {
      const [category, key] = settingKey.split(':')
      const res = await fetch('/api/ai-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, key, value: editValues[settingKey] }),
      })
      if (res.ok) {
        toast.success('已儲存')
        setSettings(prev => ({
          ...prev,
          [settingKey]: { ...prev[settingKey], value: editValues[settingKey] },
        }))
      } else {
        toast.error('儲存失敗')
      }
    } catch {
      toast.error('儲存失敗')
    } finally {
      setSaving(null)
    }
  }

  const isChanged = (key: string) => editValues[key] !== settings[key]?.value

  const categories = [
    { id: 'ai_prompt', label: '🤖 AI 客服提示詞', description: '修改 AI 助理的回覆語氣和行為' },
    { id: 'itinerary_ai', label: '✍️ 行程 AI 文案', description: '修改行程表 AI 產出的文案風格' },
    { id: 'notification', label: '📢 通知模板', description: '修改發送給客戶的通知訊息模板' },
    { id: 'line_bot', label: '📱 LINE Bot', description: 'LINE 機器人基本設定' },
  ]

  if (loading) {
    return <div className="py-8 text-center text-morandi-secondary">載入中...</div>
  }

  return (
    <div className="space-y-6">
      {categories.map(cat => {
        const catSettings = Object.entries(settings).filter(([k]) => k.startsWith(`${cat.id}:`))
        if (catSettings.length === 0) return null

        return (
          <Card key={cat.id}>
            <CardHeader>
              <CardTitle className="text-base">{cat.label}</CardTitle>
              <CardDescription>{cat.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {catSettings.map(([key, setting]) => {
                const shortKey = key.split(':')[1]
                return (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-morandi-primary">{setting.description || shortKey}</label>
                      {isChanged(key) && (
                        <Button
                          size="sm"
                          onClick={() => handleSave(key)}
                          disabled={saving === key}
                        >
                          {saving === key ? '儲存中...' : '儲存'}
                        </Button>
                      )}
                    </div>
                    <textarea
                      value={editValues[key] || ''}
                      onChange={e => setEditValues(prev => ({ ...prev, [key]: e.target.value }))}
                      rows={setting.value.length > 100 ? 6 : 2}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-y focus:outline-none focus:ring-1 focus:ring-morandi-gold"
                      placeholder={shortKey}
                    />
                    {key.startsWith('notification:') && (
                      <p className="text-xs text-morandi-muted">
                        可用變數：{'{customer_name}'} {'{tour_name}'} {'{departure_date}'} {'{remaining_amount}'} {'{meeting_time}'} {'{meeting_location}'} {'{days}'}
                      </p>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
