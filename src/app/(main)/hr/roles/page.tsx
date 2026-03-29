'use client'

/**
 * 角色管理頁面（HR 模組）
 * 支援模組 + 分頁的細粒度權限設定
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
  Check,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { useAuthStore } from '@/stores'
import { MODULES, type ModuleDefinition } from '@/lib/permissions'

interface Role {
  id: string
  name: string
  description: string | null
  is_admin: boolean
  sort_order: number
}

interface TabPermission {
  module_code: string
  tab_code: string | null  // null = 整個模組
  can_read: boolean
  can_write: boolean
}

export default function RolesPage() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [permissions, setPermissions] = useState<TabPermission[]>([])
  const [expandedModules, setExpandedModules] = useState<string[]>([])
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
        const res = await fetch(`/api/roles/${selectedRole.id}/tab-permissions`)
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

  // 展開/收合模組
  const toggleExpand = (moduleCode: string) => {
    setExpandedModules(prev => 
      prev.includes(moduleCode) 
        ? prev.filter(m => m !== moduleCode)
        : [...prev, moduleCode]
    )
  }

  // 取得權限
  const getPermission = (moduleCode: string, tabCode: string | null): TabPermission | undefined => {
    return permissions.find(p => p.module_code === moduleCode && p.tab_code === tabCode)
  }

  // 檢查模組是否全開
  const isModuleFullyEnabled = (module: ModuleDefinition, field: 'can_read' | 'can_write'): boolean => {
    if (module.tabs.length === 0) {
      const perm = getPermission(module.code, null)
      return perm?.[field] ?? false
    }
    return module.tabs.every(tab => {
      const perm = getPermission(module.code, tab.code)
      return perm?.[field] ?? false
    })
  }

  // 檢查模組是否部分開啟
  const isModulePartiallyEnabled = (module: ModuleDefinition, field: 'can_read' | 'can_write'): boolean => {
    if (module.tabs.length === 0) return false
    const enabledCount = module.tabs.filter(tab => {
      const perm = getPermission(module.code, tab.code)
      return perm?.[field] ?? false
    }).length
    return enabledCount > 0 && enabledCount < module.tabs.length
  }

  // 切換模組全開/全關
  const toggleModuleAll = (module: ModuleDefinition, field: 'can_read' | 'can_write') => {
    const isFullyEnabled = isModuleFullyEnabled(module, field)
    const newValue = !isFullyEnabled

    setPermissions(prev => {
      let updated = [...prev]

      if (module.tabs.length === 0) {
        // 沒有分頁的模組
        const existing = updated.find(p => p.module_code === module.code && p.tab_code === null)
        if (existing) {
          updated = updated.map(p => 
            p.module_code === module.code && p.tab_code === null 
              ? { ...p, [field]: newValue }
              : p
          )
        } else {
          updated.push({
            module_code: module.code,
            tab_code: null,
            can_read: field === 'can_read' ? newValue : false,
            can_write: field === 'can_write' ? newValue : false,
          })
        }
      } else {
        // 有分頁的模組：更新所有分頁
        module.tabs.forEach(tab => {
          const existing = updated.find(p => p.module_code === module.code && p.tab_code === tab.code)
          if (existing) {
            updated = updated.map(p => 
              p.module_code === module.code && p.tab_code === tab.code
                ? { ...p, [field]: newValue }
                : p
            )
          } else {
            updated.push({
              module_code: module.code,
              tab_code: tab.code,
              can_read: field === 'can_read' ? newValue : false,
              can_write: field === 'can_write' ? newValue : false,
            })
          }
        })
      }

      return updated
    })
  }

  // 切換單一分頁
  const toggleTabPermission = (moduleCode: string, tabCode: string, field: 'can_read' | 'can_write') => {
    setPermissions(prev => {
      const existing = prev.find(p => p.module_code === moduleCode && p.tab_code === tabCode)
      if (existing) {
        return prev.map(p => 
          p.module_code === moduleCode && p.tab_code === tabCode
            ? { ...p, [field]: !p[field] }
            : p
        )
      }
      return [...prev, {
        module_code: moduleCode,
        tab_code: tabCode,
        can_read: field === 'can_read',
        can_write: field === 'can_write',
      }]
    })
  }

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

  // 儲存權限
  const handleSavePermissions = async () => {
    if (!selectedRole) return

    setSaving(true)
    try {
      const res = await fetch(`/api/roles/${selectedRole.id}/tab-permissions`, {
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

  // 渲染模組行
  const renderModuleRow = (module: ModuleDefinition) => {
    const hasTabs = module.tabs.length > 0
    const isExpanded = expandedModules.includes(module.code)
    const isAdmin = selectedRole?.is_admin

    const readFully = isModuleFullyEnabled(module, 'can_read')
    const readPartial = isModulePartiallyEnabled(module, 'can_read')
    const writeFully = isModuleFullyEnabled(module, 'can_write')
    const writePartial = isModulePartiallyEnabled(module, 'can_write')

    return (
      <div key={module.code}>
        {/* 模組行 */}
        <div className={`flex items-center border-t border-border ${hasTabs ? 'bg-morandi-bg/30' : 'bg-white'}`}>
          <div className="flex-1 p-4 flex items-center gap-2">
            {hasTabs ? (
              <button
                onClick={() => toggleExpand(module.code)}
                className="p-1 hover:bg-morandi-bg rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-morandi-secondary" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-morandi-secondary" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}
            <span className="font-medium text-morandi-primary">{module.name}</span>
            {hasTabs && (
              <Badge variant="outline" className="text-xs text-morandi-secondary">
                {module.tabs.length} 個分頁
              </Badge>
            )}
          </div>
          <div className="w-32 p-4 flex justify-center">
            <div className="relative">
              <Switch
                checked={isAdmin || readFully}
                onCheckedChange={() => toggleModuleAll(module, 'can_read')}
                disabled={isAdmin}
                className="data-[state=checked]:bg-morandi-green"
              />
              {readPartial && !isAdmin && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-morandi-gold rounded-full" />
              )}
            </div>
          </div>
          <div className="w-32 p-4 flex justify-center">
            <div className="relative">
              <Switch
                checked={isAdmin || writeFully}
                onCheckedChange={() => toggleModuleAll(module, 'can_write')}
                disabled={isAdmin}
                className="data-[state=checked]:bg-morandi-gold"
              />
              {writePartial && !isAdmin && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-morandi-gold rounded-full" />
              )}
            </div>
          </div>
        </div>

        {/* 分頁行 */}
        {hasTabs && isExpanded && module.tabs.map(tab => {
          const perm = getPermission(module.code, tab.code)
          return (
            <div key={tab.code} className="flex items-center border-t border-border bg-white">
              <div className="flex-1 p-4 pl-12 flex items-center gap-2">
                <div className="w-1 h-4 bg-morandi-border rounded-full" />
                <span className="text-sm text-morandi-primary">{tab.name}</span>
              </div>
              <div className="w-32 p-4 flex justify-center">
                <Switch
                  checked={isAdmin || (perm?.can_read ?? false)}
                  onCheckedChange={() => toggleTabPermission(module.code, tab.code, 'can_read')}
                  disabled={isAdmin}
                  className="data-[state=checked]:bg-morandi-green"
                />
              </div>
              <div className="w-32 p-4 flex justify-center">
                <Switch
                  checked={isAdmin || (perm?.can_write ?? false)}
                  onCheckedChange={() => toggleTabPermission(module.code, tab.code, 'can_write')}
                  disabled={isAdmin}
                  className="data-[state=checked]:bg-morandi-gold"
                />
              </div>
            </div>
          )
        })}
      </div>
    )
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
        {/* 左側：角色列表 */}
        <div className="col-span-3 flex flex-col">
          <div className="bg-white border border-border rounded-lg flex flex-col h-full">
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
                          <span className="font-medium text-morandi-primary text-sm">{role.name}</span>
                          {role.is_admin && (
                            <Badge className="bg-morandi-gold/20 text-morandi-gold border-morandi-gold/30 text-xs">
                              <Star className="h-3 w-3" />
                            </Badge>
                          )}
                        </div>
                        {!role.is_admin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-morandi-red/10"
                            onClick={e => {
                              e.stopPropagation()
                              handleDeleteRole(role)
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-morandi-red" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右側：權限設定 */}
        <div className="col-span-9 flex flex-col">
          <div className="bg-white border border-border rounded-lg flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-morandi-primary">
                  {selectedRole ? `${selectedRole.name} 的權限` : '請選擇角色'}
                </h3>
                {selectedRole && (
                  <div className="flex items-center gap-4 text-xs text-morandi-secondary">
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-morandi-green" /> 可讀取
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-morandi-gold" /> 可寫入
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-morandi-gold" /> 部分開啟
                    </span>
                  </div>
                )}
              </div>
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

            <div className="flex-1 overflow-y-auto">
              {selectedRole ? (
                <div>
                  {/* 表頭 */}
                  <div className="flex items-center bg-morandi-bg/50 sticky top-0 border-b border-border">
                    <div className="flex-1 p-4 font-semibold text-morandi-primary">功能模組</div>
                    <div className="w-32 p-4 text-center font-semibold text-morandi-primary">可讀取</div>
                    <div className="w-32 p-4 text-center font-semibold text-morandi-primary">可寫入</div>
                  </div>

                  {/* 模組列表 */}
                  {MODULES.map(module => renderModuleRow(module))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-morandi-secondary">
                  <div className="text-center">
                    <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>請從左側選擇一個角色</p>
                  </div>
                </div>
              )}
            </div>

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
