'use client'

/**
 * 角色管理頁面
 * 
 * 租戶管理員可以：
 * 1. 建立/編輯角色（管理員、會計、業務、助理等）
 * 2. 設定每個角色的路由權限（可讀/可寫）
 */

import { useState, useEffect, useMemo } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  Loader2,
  Users,
  Star
} from 'lucide-react'
import { useAuthStore } from '@/stores'
import { supabase } from '@/lib/supabase/client'
import { FEATURES } from '@/lib/permissions'

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
  { route: '/tours', name: '旅遊團', feature: 'tours' },
  { route: '/orders', name: '訂單', feature: 'orders' },
  { route: '/quotes', name: '報價單', feature: 'quotes' },
  { route: '/finance/payments', name: '收款管理', feature: 'finance' },
  { route: '/finance/requests', name: '請款管理', feature: 'finance' },
  { route: '/finance/treasury', name: '金庫管理', feature: 'finance' },
  { route: '/accounting', name: '會計系統', feature: 'finance' },
  { route: '/database', name: '資料管理', feature: 'database' },
  { route: '/customers', name: '顧客管理', feature: 'customers' },
  { route: '/hr', name: '人資管理', feature: 'hr' },
  { route: '/calendar', name: '行事曆', feature: 'calendar' },
  { route: '/workspace', name: '工作空間', feature: 'workspace' },
  { route: '/todos', name: '待辦事項', feature: 'todos' },
  { route: '/itinerary', name: '行程管理', feature: 'itinerary' },
  { route: '/settings', name: '設定', feature: 'settings' },
]

export default function RolesPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [permissions, setPermissions] = useState<RoutePermission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Dialog 狀態
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Partial<Role>>({ name: '', description: '' })

  // 載入角色
  useEffect(() => {
    if (!user?.workspace_id) return

    const fetchRoles = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('workspace_roles')
        .select('*')
        .eq('workspace_id', user.workspace_id)
        .order('sort_order')

      if (!error && data) {
        setRoles(data)
        if (data.length > 0 && !selectedRole) {
          setSelectedRole(data[0])
        }
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
      const { data, error } = await supabase
        .from('role_route_permissions')
        .select('route, can_read, can_write')
        .eq('role_id', selectedRole.id)

      if (!error && data) {
        // 合併預設路由和已有權限
        const permMap = new Map(data.map(p => [p.route, p]))
        const merged = PERMISSION_ROUTES.map(r => ({
          route: r.route,
          can_read: permMap.get(r.route)?.can_read ?? false,
          can_write: permMap.get(r.route)?.can_write ?? false,
        }))
        setPermissions(merged)
      }
    }

    fetchPermissions()
  }, [selectedRole?.id])

  // 新增角色
  const handleCreateRole = async () => {
    if (!user?.workspace_id || !editingRole.name) return
    setSaving(true)

    try {
      const { data, error } = await supabase
        .from('workspace_roles')
        .insert({
          workspace_id: user.workspace_id,
          name: editingRole.name,
          description: editingRole.description || null,
          is_admin: false,
          sort_order: roles.length,
        })
        .select()
        .single()

      if (error) throw error

      setRoles([...roles, data])
      setSelectedRole(data)
      setIsDialogOpen(false)
      setEditingRole({ name: '', description: '' })
      toast({ title: '已建立角色' })
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
          // 如果取消讀取，也要取消寫入
          if (field === 'can_read' && !value) {
            return { ...p, can_read: false, can_write: false }
          }
          // 如果啟用寫入，也要啟用讀取
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
      // 先刪除舊權限
      await supabase
        .from('role_route_permissions')
        .delete()
        .eq('role_id', selectedRole.id)

      // 插入新權限（只插入有權限的）
      const toInsert = permissions
        .filter(p => p.can_read || p.can_write)
        .map(p => ({
          role_id: selectedRole.id,
          route: p.route,
          can_read: p.can_read,
          can_write: p.can_write,
        }))

      if (toInsert.length > 0) {
        const { error } = await supabase
          .from('role_route_permissions')
          .insert(toInsert)

        if (error) throw error
      }

      toast({ title: '已儲存權限' })
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
      const { error } = await supabase
        .from('workspace_roles')
        .delete()
        .eq('id', role.id)

      if (error) throw error

      setRoles(roles.filter(r => r.id !== role.id))
      if (selectedRole?.id === role.id) {
        setSelectedRole(roles[0] || null)
      }
      toast({ title: '已刪除角色' })
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
        { label: '角色管理' },
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
                <p className="text-sm">點擊「新增」建立第一個角色</p>
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
                      <p className="text-sm text-muted-foreground mt-1">
                        {role.description}
                      </p>
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
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  儲存
                </Button>
              )}
            </div>

            {selectedRole ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">功能</TableHead>
                    <TableHead className="w-[100px] text-center">可讀取</TableHead>
                    <TableHead className="w-[100px] text-center">可寫入</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PERMISSION_ROUTES.map(route => {
                    const perm = permissions.find(p => p.route === route.route)
                    return (
                      <TableRow key={route.route}>
                        <TableCell className="font-medium">{route.name}</TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={perm?.can_read ?? false}
                            onCheckedChange={v =>
                              handlePermissionChange(route.route, 'can_read', v as boolean)
                            }
                            disabled={selectedRole.is_admin}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={perm?.can_write ?? false}
                            onCheckedChange={v =>
                              handlePermissionChange(route.route, 'can_write', v as boolean)
                            }
                            disabled={selectedRole.is_admin}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
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
                value={editingRole.description || ''}
                onChange={e => setEditingRole({ ...editingRole, description: e.target.value })}
                placeholder="這個角色的職責說明"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
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
