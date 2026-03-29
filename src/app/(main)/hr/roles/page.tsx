'use client'

/**
 * 角色管理頁面（HR 模組）
 * 定義公司內的職務角色及其權限
 */

import { useState, useEffect } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { 
  Shield, 
  Plus, 
  Trash2, 
  Save,
  Loader2,
  Users,
  Star,
  Check
} from 'lucide-react'
import { useAuthStore } from '@/stores'

interface Role {
  id: string
  name: string
  description: string | null
  is_admin: boolean
  sort_order: number
}

interface RoutePermission {
  route: string
  can_read: boolean
  can_write: boolean
}

// 可設定權限的路由列表（對應租戶功能）
const PERMISSION_ROUTES = [
  { route: '/dashboard', name: '首頁', category: '基本' },
  { route: '/tours', name: '旅遊團管理', category: '基本' },
  { route: '/orders', name: '訂單管理', category: '基本' },
  { route: '/finance', name: '財務系統', category: '基本' },
  { route: '/accounting', name: '會計系統', category: '基本' },
  { route: '/database', name: '資料管理', category: '基本' },
  { route: '/hr', name: '人資管理', category: '基本' },
  { route: '/settings', name: '系統設定', category: '基本' },
  { route: '/calendar', name: '行事曆', category: '基本' },
  { route: '/todos', name: '待辦事項', category: '基本' },
  { route: '/visas', name: '簽證管理', category: '基本' },
  { route: '/itinerary', name: '行程管理', category: '付費' },
  { route: '/quotes', name: '報價單', category: '付費' },
  { route: '/customers', name: '顧客管理', category: '付費' },
  { route: '/design', name: '設計工具', category: '付費' },
  { route: '/office', name: '文件管理', category: '付費' },
]

export default function RolesPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [permissions, setPermissions] = useState<RoutePermission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState({ name: '', description: '' })

  // 載入角色列表
  useEffect(() => {
    const fetchRoles = async () => {
      if (!user?.workspace_id) return
      
      setLoading(true)
      try {
        const res = await fetch(`/api/roles?workspace_id=${user.workspace_id}`)
        if (res.ok) {
          const data = await res.json()
          setRoles(data)
          if (data.length > 0 && !selectedRole) {
            setSelectedRole(data[0])
          }
        }
      } catch (err) {
        console.error('Failed to fetch roles:', err)
      }
      setLoading(false)
    }

    fetchRoles()
  }, [user?.workspace_id])

  // 載入選中角色的權限
  useEffect(() => {
    const fetchPermissions = async () => {
      if (!selectedRole) {
        setPermissions([])
        return
      }

      try {
        const res = await fetch(`/api/roles/${selectedRole.id}/permissions`)
        if (res.ok) {
          const data = await res.json()
          setPermissions(data)
        }
      } catch (err) {
        console.error('Failed to fetch permissions:', err)
      }
    }

    fetchPermissions()
  }, [selectedRole])

  // 建立新角色
  const handleCreateRole = async () => {
    if (!editingRole.name || !user?.workspace_id) return

    setSaving(true)
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: user.workspace_id,
          name: editingRole.name,
          description: editingRole.description || null,
        }),
      })

      if (res.ok) {
        const newRole = await res.json()
        setRoles([...roles, newRole])
        setSelectedRole(newRole)
        setIsDialogOpen(false)
        setEditingRole({ name: '', description: '' })
        toast({ title: '已建立角色' })
      }
    } catch (err) {
      console.error('Failed to create role:', err)
      toast({ title: '建立失敗', variant: 'destructive' })
    }
    setSaving(false)
  }

  // 權限變更
  const handlePermissionChange = (route: string, field: 'can_read' | 'can_write', value: boolean) => {
    setPermissions(prev => {
      const existing = prev.find(p => p.route === route)
      if (existing) {
        return prev.map(p => p.route === route ? { ...p, [field]: value } : p)
      }
      return [...prev, { route, can_read: field === 'can_read' ? value : false, can_write: field === 'can_write' ? value : false }]
    })
  }

  // 儲存權限
  const handleSavePermissions = async () => {
    if (!selectedRole) return

    setSaving(true)
    try {
      const res = await fetch(`/api/roles/${selectedRole.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      })

      if (res.ok) {
        toast({ title: '已儲存權限' })
      }
    } catch (err) {
      console.error('Failed to save permissions:', err)
      toast({ title: '儲存失敗', variant: 'destructive' })
    }
    setSaving(false)
  }

  // 刪除角色
  const handleDeleteRole = async (role: Role) => {
    if (role.is_admin) {
      toast({ title: '無法刪除管理員角色', variant: 'destructive' })
      return
    }

    if (!confirm(`確定要刪除「${role.name}」角色嗎？`)) return

    try {
      const res = await fetch(`/api/roles/${role.id}`, { method: 'DELETE' })
      if (res.ok) {
        setRoles(roles.filter(r => r.id !== role.id))
        if (selectedRole?.id === role.id) {
          setSelectedRole(roles.find(r => r.id !== role.id) || null)
        }
        toast({ title: '已刪除角色' })
      }
    } catch (err) {
      console.error('Failed to delete role:', err)
      toast({ title: '刪除失敗', variant: 'destructive' })
    }
  }

  return (
    <ContentPageLayout 
      title="角色管理" 
      icon={Shield}
      breadcrumb={[
        { label: '人資管理', href: '/hr' },
        { label: '角色管理', href: '/hr/roles' },
      ]}
    >
      <div className="grid grid-cols-12 gap-6 h-[calc(100vh-180px)]">
        {/* 左側：角色列表（固定高度） */}
        <div className="col-span-4 flex flex-col">
          <div className="bg-white border border-border rounded-lg flex flex-col h-full">
            {/* 標題列 */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-morandi-primary">角色列表</h3>
              <Button 
                size="sm" 
                onClick={() => setIsDialogOpen(true)}
                className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                新增
              </Button>
            </div>

            {/* 角色列表 */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-morandi-secondary" />
                </div>
              ) : roles.length === 0 ? (
                <div className="text-center py-8 text-morandi-secondary">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>尚未建立角色</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {roles.map(role => (
                    <div
                      key={role.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedRole?.id === role.id
                          ? 'border-morandi-gold bg-morandi-gold/5 shadow-sm'
                          : 'border-border hover:border-morandi-gold/50 hover:bg-morandi-bg/50'
                      }`}
                      onClick={() => setSelectedRole(role)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {selectedRole?.id === role.id && (
                            <Check className="h-4 w-4 text-morandi-gold" />
                          )}
                          <span className="font-medium text-morandi-primary">{role.name}</span>
                          {role.is_admin && (
                            <Badge className="bg-morandi-gold/20 text-morandi-gold border-morandi-gold/30 text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              管理員
                            </Badge>
                          )}
                        </div>
                        {!role.is_admin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-morandi-red/10"
                            onClick={e => {
                              e.stopPropagation()
                              handleDeleteRole(role)
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-morandi-red" />
                          </Button>
                        )}
                      </div>
                      {role.description && (
                        <p className="text-sm text-morandi-secondary mt-1 pl-6">{role.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右側：權限設定 */}
        <div className="col-span-8 flex flex-col">
          <div className="bg-white border border-border rounded-lg flex flex-col h-full">
            {/* 標題列 */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-morandi-primary">
                {selectedRole ? `${selectedRole.name} 的權限` : '請選擇角色'}
              </h3>
              {selectedRole && (
                <Button 
                  onClick={handleSavePermissions} 
                  disabled={saving}
                  className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  儲存
                </Button>
              )}
            </div>

            {/* 權限表格 */}
            <div className="flex-1 overflow-y-auto">
              {selectedRole ? (
                <table className="w-full">
                  <thead className="bg-morandi-bg/50 sticky top-0">
                    <tr>
                      <th className="text-left p-4 font-semibold text-morandi-primary">功能模組</th>
                      <th className="text-center p-4 font-semibold text-morandi-primary w-32">可讀取</th>
                      <th className="text-center p-4 font-semibold text-morandi-primary w-32">可寫入</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_ROUTES.map((route, index) => {
                      const perm = permissions.find(p => p.route === route.route)
                      const isAdmin = selectedRole.is_admin
                      
                      return (
                        <tr 
                          key={route.route} 
                          className={`border-t border-border ${index % 2 === 0 ? 'bg-white' : 'bg-morandi-bg/20'}`}
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-morandi-primary">{route.name}</span>
                              {route.category === '付費' && (
                                <Badge variant="outline" className="text-xs text-morandi-secondary">付費</Badge>
                              )}
                            </div>
                          </td>
                          <td className="text-center p-4">
                            <div className="flex justify-center">
                              <Switch
                                checked={isAdmin || (perm?.can_read ?? false)}
                                onCheckedChange={v => handlePermissionChange(route.route, 'can_read', v)}
                                disabled={isAdmin}
                                className="data-[state=checked]:bg-morandi-green"
                              />
                            </div>
                          </td>
                          <td className="text-center p-4">
                            <div className="flex justify-center">
                              <Switch
                                checked={isAdmin || (perm?.can_write ?? false)}
                                onCheckedChange={v => handlePermissionChange(route.route, 'can_write', v)}
                                disabled={isAdmin}
                                className="data-[state=checked]:bg-morandi-gold"
                              />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="flex items-center justify-center h-full text-morandi-secondary">
                  <div className="text-center">
                    <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>請從左側選擇一個角色</p>
                  </div>
                </div>
              )}
            </div>

            {/* 管理員提示 */}
            {selectedRole?.is_admin && (
              <div className="p-4 border-t border-border bg-morandi-bg/30">
                <p className="text-sm text-morandi-secondary text-center">
                  管理員角色擁有所有權限，無法修改
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 新增角色 Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-morandi-primary">新增角色</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name" className="text-morandi-primary">角色名稱</Label>
              <Input
                id="name"
                value={editingRole.name}
                onChange={e => setEditingRole({ ...editingRole, name: e.target.value })}
                placeholder="例如：業務、會計、助理"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description" className="text-morandi-primary">說明（選填）</Label>
              <Input
                id="description"
                value={editingRole.description}
                onChange={e => setEditingRole({ ...editingRole, description: e.target.value })}
                placeholder="這個角色的職責說明"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>取消</Button>
            <Button 
              onClick={handleCreateRole} 
              disabled={saving || !editingRole.name}
              className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              建立
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ContentPageLayout>
  )
}
