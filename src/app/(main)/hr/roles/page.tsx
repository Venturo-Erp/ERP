'use client'

/**
 * 職務管理頁面（HR 模組）
 * 支援模組 + 分頁的細粒度權限設定
 */

import { useState, useEffect, useMemo } from 'react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Shield, Plus, Trash2, Save, Loader2, Users, Star, Check } from 'lucide-react'
import { useAuthStore } from '@/stores'
import { MODULES, type ModuleDefinition, type TabPermission } from '@/lib/permissions'
import { useWorkspaceFeatures } from '@/lib/permissions/hooks'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ChevronRight, ChevronDown } from 'lucide-react'
import { logger } from '@/lib/utils/logger'
import { useRouter } from 'next/navigation'
import { HR_ADMIN_TABS } from '../components/hr-admin-tabs'
import { useRoles, type Role } from '@/data/hooks/useRoles'

export default function RolesPage() {
  const router = useRouter()
  const { user, isAdmin } = useAuthStore()
  const { toast } = useToast()
  const { isFeatureEnabled, isTabEnabled, loading: featuresLoading } = useWorkspaceFeatures()

  // 只顯示這個 workspace 已啟用的模組、且過濾掉 workspace 沒開通的 tab
  // isEligibility tabs（可當業務/助理/團控/代墊款）不是 workspace feature、
  // 是員工層級的可選資格、一律顯示（admin 對每個員工勾）
  const visibleModules = useMemo(
    () =>
      MODULES.filter(m => isFeatureEnabled(m.code)).map(m => ({
        ...m,
        tabs: m.tabs.filter(t => t.isEligibility || isTabEnabled(m.code, t.code, t.category)),
      })),
    [isFeatureEnabled, isTabEnabled]
  )

  const { roles, loading, mutate: mutateRoles } = useRoles()
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [permissions, setPermissions] = useState<TabPermission[]>([])
  const [expandedModules, setExpandedModules] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState({ name: '', description: '' })

  // 預設選中第一筆（當列表載入且尚無選中時）
  useEffect(() => {
    if (!selectedRole && roles.length > 0) {
      setSelectedRole(roles[0])
    }
  }, [roles, selectedRole])

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
        logger.error('Failed to fetch permissions:', err)
      }
    }

    fetchPermissions()
  }, [selectedRole])

  // 展開/收合模組
  const toggleExpand = (moduleCode: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleCode) ? prev.filter(m => m !== moduleCode) : [...prev, moduleCode]
    )
  }

  // 取得權限
  const getPermission = (moduleCode: string, tabCode: string | null): TabPermission | undefined => {
    return permissions.find(p => p.module_code === moduleCode && p.tab_code === tabCode)
  }

  // 檢查模組是否全開
  const isModuleFullyEnabled = (
    module: ModuleDefinition,
    field: 'can_read' | 'can_write'
  ): boolean => {
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
  const isModulePartiallyEnabled = (
    module: ModuleDefinition,
    field: 'can_read' | 'can_write'
  ): boolean => {
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
            p.module_code === module.code && p.tab_code === null ? { ...p, [field]: newValue } : p
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
          const existing = updated.find(
            p => p.module_code === module.code && p.tab_code === tab.code
          )
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
  const toggleTabPermission = (
    moduleCode: string,
    tabCode: string,
    field: 'can_read' | 'can_write'
  ) => {
    setPermissions(prev => {
      const existing = prev.find(p => p.module_code === moduleCode && p.tab_code === tabCode)
      if (existing) {
        return prev.map(p =>
          p.module_code === moduleCode && p.tab_code === tabCode ? { ...p, [field]: !p[field] } : p
        )
      }
      return [
        ...prev,
        {
          module_code: moduleCode,
          tab_code: tabCode,
          can_read: field === 'can_read',
          can_write: field === 'can_write',
        },
      ]
    })
  }

  // 建立新角色
  const handleCreateRole = async () => {
    if (!editingRole.name) return

    setSaving(true)
    try {
      // 不需要傳 workspace_id，API 會自動取得
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingRole.name,
          description: editingRole.description || null,
        }),
      })

      if (res.ok) {
        const newRole = await res.json()
        await mutateRoles()
        setSelectedRole(newRole)
        setIsDialogOpen(false)
        setEditingRole({ name: '', description: '' })
        toast({ title: '已建立角色' })
      }
    } catch (err) {
      logger.error('Failed to create role:', err)
      toast({ title: '建立失敗', variant: 'destructive' })
    }
    setSaving(false)
  }

  // 儲存權限
  const handleSavePermissions = async () => {
    if (!selectedRole) return

    setSaving(true)
    try {
      const payload = permissions.filter(p => p.can_read || p.can_write)
      logger.log('[ROLES] PUT payload', {
        role: selectedRole.name,
        role_id: selectedRole.id,
        count: payload.length,
        permissions: payload,
      })

      const res = await fetch(`/api/roles/${selectedRole.id}/tab-permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        logger.error('[ROLES] Save failed', { status: res.status, body })
        toast({
          title: '儲存失敗',
          description: body.error || `HTTP ${res.status}`,
          variant: 'destructive',
        })
        return
      }

      // 存完重新 fetch 驗證（確保 DB 狀態反映到 UI）
      const verifyRes = await fetch(`/api/roles/${selectedRole.id}/tab-permissions`)
      if (verifyRes.ok) {
        const data = await verifyRes.json()
        logger.log('[ROLES] Post-save verify', {
          role: selectedRole.name,
          count: data.length,
          permissions: data,
        })
        setPermissions(data)
      }
      toast({ title: '已儲存權限' })
    } catch (err) {
      logger.error('Failed to save permissions:', err)
      toast({ title: '儲存失敗', variant: 'destructive' })
    }
    setSaving(false)
  }

  // 刪除職務
  const handleDeleteRole = async (role: Role) => {
    if (role.is_admin) {
      toast({ title: '無法刪除系統主管角色', variant: 'destructive' })
      return
    }

    if (!confirm(`確定要刪除「${role.name}」角色嗎？`)) return

    try {
      const res = await fetch(`/api/roles/${role.id}`, { method: 'DELETE' })
      if (res.ok) {
        // 若刪的是選中的，先切到另一筆（用當前 roles 計算 fallback）
        if (selectedRole?.id === role.id) {
          setSelectedRole(roles.find(r => r.id !== role.id) || null)
        }
        await mutateRoles()
        toast({ title: '已刪除職務' })
      }
    } catch (err) {
      logger.error('Failed to delete role:', err)
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
        <div
          className={`flex items-center border-t border-border ${hasTabs ? 'bg-morandi-bg/30' : 'bg-card'}`}
        >
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
        {hasTabs &&
          isExpanded &&
          module.tabs.map(tab => {
            const perm = getPermission(module.code, tab.code)
            // 下拉資格 tab：admin 也可個別取消（例：老闆不想出現在代墊款下拉）
            const adminCanEdit = tab.isEligibility === true
            const effectiveDisabled = isAdmin && !adminCanEdit
            return (
              <div key={tab.code} className="flex items-center border-t border-border bg-card">
                <div className="flex-1 p-4 pl-12 flex items-center gap-2">
                  <div className="w-1 h-4 bg-border rounded-full" />
                  <span className="text-sm text-morandi-primary">{tab.name}</span>
                  {tab.isEligibility && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-morandi-gold/10 text-morandi-gold border border-morandi-gold/30">
                      下拉資格
                    </span>
                  )}
                </div>
                <div className="w-32 p-4 flex justify-center">
                  <Switch
                    checked={(isAdmin && !adminCanEdit) || (perm?.can_read ?? false)}
                    onCheckedChange={() => toggleTabPermission(module.code, tab.code, 'can_read')}
                    disabled={effectiveDisabled}
                    className="data-[state=checked]:bg-morandi-green"
                  />
                </div>
                <div className="w-32 p-4 flex justify-center">
                  <Switch
                    checked={(isAdmin && !adminCanEdit) || (perm?.can_write ?? false)}
                    onCheckedChange={() => toggleTabPermission(module.code, tab.code, 'can_write')}
                    disabled={effectiveDisabled}
                    className="data-[state=checked]:bg-morandi-gold"
                  />
                </div>
              </div>
            )
          })}
      </div>
    )
  }

  // 權限檢查：只有 admin 能管理職務與權限
  if (!isAdmin) {
    return (
      <ContentPageLayout
        title="職務管理"
        icon={Shield}
        breadcrumb={[
          { label: '人資管理', href: '/hr' },
          { label: '職務管理', href: '/hr/roles' },
        ]}
      >
        <div className="max-w-4xl mx-auto p-6">
          <div className="p-8 text-center rounded-lg border border-morandi-border bg-morandi-surface">
            <Shield className="h-12 w-12 mx-auto text-morandi-red mb-4" />
            <p className="text-morandi-secondary">權限不足,只有系統主管能進入職務管理</p>
          </div>
        </div>
      </ContentPageLayout>
    )
  }

  return (
    <ContentPageLayout
      title="職務管理"
      icon={Shield}
      tabs={HR_ADMIN_TABS.employee}
      activeTab="/hr/roles"
      onTabChange={href => router.push(href)}
      breadcrumb={[
        { label: '人資管理', href: '/hr' },
        { label: '職務管理', href: '/hr/roles' },
      ]}
      onAdd={() => setIsDialogOpen(true)}
      addLabel="新增職務"
      contentClassName="flex-1 overflow-hidden flex flex-col min-h-0 p-0"
    >
      <>
        <div className="grid grid-cols-12 gap-6 flex-1 min-h-0 auto-rows-fr">
          {/* 左側：職務列表 */}
          <div className="col-span-3 flex flex-col min-h-0">
            <div className="bg-card border border-border rounded-lg flex flex-col h-full">
              <div className="flex items-center px-4 h-14 border-b border-border">
                <h3 className="font-semibold text-morandi-primary">職務列表</h3>
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
                        className={`group p-3 rounded-lg border cursor-pointer transition-all ${
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
                            <span className="font-medium text-morandi-primary text-sm">
                              {role.name}
                            </span>
                          </div>
                          {!role.is_admin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-morandi-red/10 opacity-0 group-hover:opacity-100 transition-opacity"
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
          <div className="col-span-9 flex flex-col min-h-0">
            <div className="bg-card border border-border rounded-lg flex flex-col h-full">
              <div className="flex items-center justify-between px-4 h-14 border-b border-border">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-morandi-primary">
                    {selectedRole ? `${selectedRole.name} 的權限` : '請選擇職務'}
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
                {selectedRole && !selectedRole.is_admin && (
                  <Button
                    onClick={handleSavePermissions}
                    disabled={saving}
                    size="sm"
                    className="h-8 bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg"
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    儲存
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {selectedRole ? (
                  <div>
                    {/* 表頭 */}
                    <div className="flex items-center bg-card sticky top-0 z-20 border-b border-border shadow-sm">
                      <div className="flex-1 p-4 font-semibold text-morandi-primary">功能模組</div>
                      <div className="w-32 p-4 text-center font-semibold text-morandi-primary">
                        可讀取
                      </div>
                      <div className="w-32 p-4 text-center font-semibold text-morandi-primary">
                        可寫入
                      </div>
                    </div>

                    {/* 模組列表（只列出 workspace 已啟用的功能） */}
                    {visibleModules.map(module => renderModuleRow(module))}
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
                    系統主管角色擁有所有權限，無法修改
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 新增職務 Dialog — 仍在 permissions tab 條件區塊內 */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent level={1} className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-morandi-primary">新增職務</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name" className="text-morandi-primary">
                  角色名稱
                </Label>
                <Input
                  id="name"
                  value={editingRole.name}
                  onChange={e => setEditingRole({ ...editingRole, name: e.target.value })}
                  placeholder="例如：業務、會計、助理"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-morandi-primary">
                  說明（選填）
                </Label>
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
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                取消
              </Button>
              <Button
                onClick={handleCreateRole}
                disabled={saving || !editingRole.name}
                className="bg-gradient-to-br from-morandi-gold/40 to-morandi-container/60 text-morandi-primary ring-1 ring-border/50 hover:from-morandi-gold/60 hover:to-morandi-container/80 shadow-md hover:shadow-lg"
              >
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                建立
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    </ContentPageLayout>
  )
}
