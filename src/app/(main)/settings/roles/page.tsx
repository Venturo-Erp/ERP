'use client'

/**
 * 角色管理頁面
 * 使用 API Route 處理 DB 操作，避免 Supabase Client 型別問題
 */

import { useState, useEffect } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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
  Star
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

// 可設定權限的路由列表
const PERMISSION_ROUTES = [
  { route: '/tours', name: '旅遊團' },
  { route: '/orders', name: '訂單' },
  { route: '/quotes', name: '報價單' },
  { route: '/finance/payments', name: '收款管理' },
  { route: '/finance/requests', name: '請款管理' },
  { route: '/finance/treasury', name: '金庫管理' },
  { route: '/accounting', name: '會計系統' },
  { route: '/database', name: '資料管理' },
  { route: '/customers', name: '顧客管理' },
  { route: '/hr', name: '人資管理' },
  { route: '/calendar', name: '行事曆' },
  { route: '/workspace', name: '工作空間' },
  { route: '/todos', name: '待辦事項' },
  { route: '/itinerary', name: '行程管理' },
  { route: '/settings', name: '設定' },
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

  // 載入角色
  useEffect(() => {
    if (!user?.workspace_id) return

    const fetchRoles = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/permissions/roles?workspace_id=${user.workspace_id}`)
        if (res.ok) {
          const data = await res.json()
          setRoles(data)
          if (data.length > 0 && !selectedRole) {
            setSelectedRole(data[0])
          }
        }
      } catch (err) {
        console.error('載入角色失敗:', err)
      }
      setLoading(false)
    }

    fetchRoles()
  }, [user?.workspace_id])

  // 載入選中角色的權限
  useEffect(() => {
    if (!selectedRole) {
      setPermissions([])
      return
    }

    const fetchPermissions = async () => {
      try {
        const res = await fetch(`/api/permissions/role-permissions?role_id=${selectedRole.id}`)
        if (res.ok) {
          const data = await res.json()
          const permMap = new Map(data.map((p: RoutePermission) => [p.route, p]))
          const merged = PERMISSION_ROUTES.map(r => ({
            route: r.route,
            can_read: (permMap.get(r.route) as RoutePermission | undefined)?.can_read ?? false,
            can_write: (permMap.get(r.route) as RoutePermission | undefined)?.can_write ?? false,
          }))
          setPermissions(merged)
        }
      } catch (err) {
        console.error('載入權限失敗:', err)
      }
    }

    fetchPermissions()
  }, [selectedRole?.id])

  // 新增角色
  const handleCreateRole = async () => {
    if (!user?.workspace_id || !editingRole.name) return
    setSaving(true)

    try {
      const res = await fetch('/api/permissions/roles', {
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
      } else {
        throw new Error('建立失敗')
      }
    } catch (err) {
      console.error('建立角色失敗:', err)
      toast({ title: '建立失敗', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // 更新權限
  const handlePermissionChange = (route: string, field: 'can_read' | 'can_write', value: boolean) => {
    setPermissions(prev =>
      prev.map(p => {
        if (p.route === route) {
          if (field === 'can_read' && !value) {
            return { ...p, can_read: false, can_write: false }
          }
          if (field === 'can_write' && value) {
            return { ...p, can_read: true, can_write: true }
          }
          return { ...p, [field]: value }
        }
        return p
      })
    )
  }

  // 儲存權限
  const handleSavePermissions = async () => {
    if (!selectedRole) return
    setSaving(true)

    try {
      const res = await fetch('/api/permissions/role-permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_id: selectedRole.id,
          permissions,
        }),
      })

      if (res.ok) {
        toast({ title: '已儲存權限' })
      } else {
        throw new Error('儲存失敗')
      }
    } catch (err) {
      console.error('儲存權限失敗:', err)
      toast({ title: '儲存失敗', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // 刪除角色
  const handleDeleteRole = async (role: Role) => {
    if (role.is_admin) {
      toast({ title: '無法刪除管理員角色', variant: 'destructive' })
      return
    }

    if (!confirm(`確定要刪除角色「${role.name}」嗎？`)) return

    try {
      const res = await fetch(`/api/permissions/roles?id=${role.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        const newRoles = roles.filter(r => r.id !== role.id)
        setRoles(newRoles)
        if (selectedRole?.id === role.id) {
          setSelectedRole(newRoles[0] || null)
        }
        toast({ title: '已刪除角色' })
      } else {
        throw new Error('刪除失敗')
      }
    } catch (err) {
      console.error('刪除角色失敗:', err)
      toast({ title: '刪除失敗', variant: 'destructive' })
    }
  }

  return (
    <ContentPageLayout
      title="角色管理"
      icon={Shield}
      breadcrumb={[
        { label: '設定', href: '/settings' },
        { label: '角色管理', href: '/settings/roles' },
      ]}
    >
      <div className="grid grid-cols-12 gap-6">
        {/* 左側：角色列表 */}
        <div className="col-span-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">角色列表</h3>
              <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                新增
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : roles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>尚未建立角色</p>
              </div>
            ) : (
              <div className="space-y-2">
                {roles.map(role => (
                  <div
                    key={role.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedRole?.id === role.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => setSelectedRole(role)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{role.name}</span>
                        {role.is_admin && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            管理員
                          </Badge>
                        )}
                      </div>
                      {!role.is_admin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation()
                            handleDeleteRole(role)
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    {role.description && (
                      <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* 右側：權限設定 */}
        <div className="col-span-8">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">
                {selectedRole ? `${selectedRole.name} 的權限` : '請選擇角色'}
              </h3>
              {selectedRole && (
                <Button onClick={handleSavePermissions} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  儲存
                </Button>
              )}
            </div>

            {selectedRole ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">功能</th>
                      <th className="text-center p-3 font-medium w-24">可讀取</th>
                      <th className="text-center p-3 font-medium w-24">可寫入</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSION_ROUTES.map(route => {
                      const perm = permissions.find(p => p.route === route.route)
                      return (
                        <tr key={route.route} className="border-t">
                          <td className="p-3 font-medium">{route.name}</td>
                          <td className="text-center p-3">
                            <Checkbox
                              checked={perm?.can_read ?? false}
                              onCheckedChange={v => handlePermissionChange(route.route, 'can_read', v as boolean)}
                              disabled={selectedRole.is_admin}
                            />
                          </td>
                          <td className="text-center p-3">
                            <Checkbox
                              checked={perm?.can_write ?? false}
                              onCheckedChange={v => handlePermissionChange(route.route, 'can_write', v as boolean)}
                              disabled={selectedRole.is_admin}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>請從左側選擇一個角色</p>
              </div>
            )}

            {selectedRole?.is_admin && (
              <p className="text-sm text-muted-foreground mt-4 text-center">
                管理員角色擁有所有權限，無法修改
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* 新增角色 Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增角色</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">角色名稱</Label>
              <Input
                id="name"
                value={editingRole.name}
                onChange={e => setEditingRole({ ...editingRole, name: e.target.value })}
                placeholder="例如：業務、會計、助理"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">說明（選填）</Label>
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
            <Button onClick={handleCreateRole} disabled={saving || !editingRole.name}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              建立
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ContentPageLayout>
  )
}
