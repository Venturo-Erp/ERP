'use client'

/**
 * ModulePermissionTable - 共用模組權限表格
 * 
 * 用於：
 * 1. /hr/roles - 設定職務權限（mode='edit'）
 * 2. EmployeeForm - 員工個人覆寫（mode='override'）
 */

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, ChevronDown, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MODULES, type ModuleDefinition } from '@/lib/permissions'

export interface TabPermission {
  module_code: string
  tab_code: string | null
  can_read: boolean
  can_write: boolean
}

export interface PermissionOverride {
  module_code: string
  tab_code: string | null
  override_type: 'grant' | 'revoke' | null
}

interface ModulePermissionTableProps {
  /** 編輯模式：edit=直接編輯權限, override=覆寫模式 */
  mode: 'edit' | 'override'
  /** 職務權限（從 role_tab_permissions 讀取） */
  permissions: TabPermission[]
  /** 權限變更回調（mode='edit' 時使用） */
  onPermissionsChange?: (permissions: TabPermission[]) => void
  /** 個人覆寫（mode='override' 時使用） */
  overrides?: PermissionOverride[]
  /** 覆寫變更回調（mode='override' 時使用） */
  onOverridesChange?: (overrides: PermissionOverride[]) => void
  /** 是否為管理員（管理員不可編輯） */
  isAdmin?: boolean
  /** 最大高度 */
  maxHeight?: string
}

export function ModulePermissionTable({
  mode,
  permissions,
  onPermissionsChange,
  overrides = [],
  onOverridesChange,
  isAdmin = false,
  maxHeight = '500px',
}: ModulePermissionTableProps) {
  const [expandedModules, setExpandedModules] = useState<string[]>([])

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

  // 取得覆寫
  const getOverride = (moduleCode: string, tabCode: string | null): PermissionOverride | undefined => {
    return overrides.find(o => o.module_code === moduleCode && o.tab_code === tabCode)
  }

  // 計算最終狀態（考慮覆寫）
  const getEffectiveStatus = (moduleCode: string, tabCode: string | null): boolean => {
    if (isAdmin) return true
    const perm = getPermission(moduleCode, tabCode)
    const override = getOverride(moduleCode, tabCode)
    if (override?.override_type === 'grant') return true
    if (override?.override_type === 'revoke') return false
    return perm?.can_read || false
  }

  // 檢查模組是否全開
  const isModuleFullyEnabled = (module: ModuleDefinition): boolean => {
    if (module.tabs.length === 0) {
      return getEffectiveStatus(module.code, null)
    }
    return module.tabs.every(tab => getEffectiveStatus(module.code, tab.code))
  }

  // 檢查模組是否部分開啟
  const isModulePartiallyEnabled = (module: ModuleDefinition): boolean => {
    if (module.tabs.length === 0) return false
    const enabledCount = module.tabs.filter(tab => getEffectiveStatus(module.code, tab.code)).length
    return enabledCount > 0 && enabledCount < module.tabs.length
  }

  // 切換權限（mode='edit'）
  const togglePermission = (moduleCode: string, tabCode: string | null) => {
    if (!onPermissionsChange) return
    const existing = getPermission(moduleCode, tabCode)
    if (existing) {
      onPermissionsChange(
        permissions.map(p =>
          p.module_code === moduleCode && p.tab_code === tabCode
            ? { ...p, can_read: !p.can_read }
            : p
        )
      )
    } else {
      onPermissionsChange([
        ...permissions,
        { module_code: moduleCode, tab_code: tabCode, can_read: true, can_write: false },
      ])
    }
  }

  // 切換模組全部（mode='edit'）
  const toggleModuleAll = (module: ModuleDefinition) => {
    if (!onPermissionsChange) return
    const isFullyEnabled = isModuleFullyEnabled(module)
    const newValue = !isFullyEnabled

    let updated = [...permissions]

    if (module.tabs.length === 0) {
      const existing = updated.find(p => p.module_code === module.code && p.tab_code === null)
      if (existing) {
        updated = updated.map(p =>
          p.module_code === module.code && p.tab_code === null
            ? { ...p, can_read: newValue }
            : p
        )
      } else {
        updated.push({ module_code: module.code, tab_code: null, can_read: newValue, can_write: false })
      }
    } else {
      module.tabs.forEach(tab => {
        const existing = updated.find(p => p.module_code === module.code && p.tab_code === tab.code)
        if (existing) {
          updated = updated.map(p =>
            p.module_code === module.code && p.tab_code === tab.code
              ? { ...p, can_read: newValue }
              : p
          )
        } else {
          updated.push({ module_code: module.code, tab_code: tab.code, can_read: newValue, can_write: false })
        }
      })
    }

    onPermissionsChange(updated)
  }

  // 切換覆寫（mode='override'）
  const toggleOverride = (moduleCode: string, tabCode: string | null) => {
    if (!onOverridesChange) return
    const perm = getPermission(moduleCode, tabCode)
    const currentRolePerm = perm?.can_read || false
    const existing = getOverride(moduleCode, tabCode)

    if (existing) {
      if (!existing.override_type) {
        // null -> grant/revoke
        onOverridesChange(
          overrides.map(o =>
            o.module_code === moduleCode && o.tab_code === tabCode
              ? { ...o, override_type: currentRolePerm ? 'revoke' : 'grant' }
              : o
          )
        )
      } else {
        // grant/revoke -> null
        onOverridesChange(
          overrides.map(o =>
            o.module_code === moduleCode && o.tab_code === tabCode
              ? { ...o, override_type: null }
              : o
          )
        )
      }
    } else {
      // 新增覆寫
      onOverridesChange([
        ...overrides,
        { module_code: moduleCode, tab_code: tabCode, override_type: currentRolePerm ? 'revoke' : 'grant' },
      ])
    }
  }

  // 處理 Switch 變更
  const handleSwitchChange = (module: ModuleDefinition, tabCode: string | null) => {
    if (mode === 'edit') {
      if (tabCode === null && module.tabs.length > 0) {
        toggleModuleAll(module)
      } else {
        togglePermission(module.code, tabCode)
      }
    } else {
      toggleOverride(module.code, tabCode)
    }
  }

  // 渲染模組行
  const renderModuleRow = (module: ModuleDefinition) => {
    const hasTabs = module.tabs.length > 0
    const isExpanded = expandedModules.includes(module.code)

    const readFully = isModuleFullyEnabled(module)
    const readPartial = isModulePartiallyEnabled(module)
    const moduleOverride = getOverride(module.code, null)

    return (
      <div key={module.code}>
        {/* 模組行 */}
        <div className={cn(
          'flex items-center border-t border-border',
          hasTabs ? 'bg-morandi-bg/30' : 'bg-white'
        )}>
          <div className="flex-1 p-4 flex items-center gap-2">
            {hasTabs ? (
              <button
                type="button"
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
                onCheckedChange={() => handleSwitchChange(module, hasTabs ? null : null)}
                disabled={isAdmin}
                className="data-[state=checked]:bg-morandi-green"
              />
              {readPartial && !isAdmin && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-morandi-gold rounded-full" />
              )}
              {mode === 'override' && moduleOverride?.override_type && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </div>
          </div>
        </div>

        {/* 分頁行 */}
        {hasTabs && isExpanded && module.tabs.map(tab => {
          const perm = getPermission(module.code, tab.code)
          const override = getOverride(module.code, tab.code)
          const isEnabled = getEffectiveStatus(module.code, tab.code)

          return (
            <div key={tab.code} className="flex items-center border-t border-border bg-white">
              <div className="flex-1 p-4 pl-12 flex items-center gap-2">
                <div className="w-1 h-4 bg-morandi-border rounded-full" />
                <span className="text-sm text-morandi-primary">{tab.name}</span>
              </div>
              <div className="w-32 p-4 flex justify-center">
                <div className="relative">
                  <Switch
                    checked={isAdmin || isEnabled}
                    onCheckedChange={() => handleSwitchChange(module, tab.code)}
                    disabled={isAdmin}
                    className="data-[state=checked]:bg-morandi-green"
                  />
                  {mode === 'override' && override?.override_type && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (isAdmin) {
    return (
      <div className="text-center py-8 text-morandi-secondary">
        <Shield className="w-12 h-12 mx-auto mb-3 text-morandi-gold/50" />
        <p>管理員擁有系統所有權限</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4 text-xs text-morandi-secondary">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-morandi-green" /> 開啟
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-morandi-gold" /> 部分開啟
          </span>
          {mode === 'override' && (
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" /> 已覆寫
            </span>
          )}
        </div>
      </div>
      <div className="border border-border rounded-lg overflow-hidden" style={{ maxHeight }}>
        <div className="overflow-y-auto" style={{ maxHeight }}>
          {/* 表頭 */}
          <div className="flex items-center bg-morandi-bg/50 sticky top-0 border-b border-border">
            <div className="flex-1 p-4 font-semibold text-morandi-primary">功能模組</div>
            <div className="w-32 p-4 text-center font-semibold text-morandi-primary">
              {mode === 'edit' ? '可讀取' : '狀態'}
            </div>
          </div>

          {/* 模組列表 */}
          {MODULES.map(module => renderModuleRow(module))}
        </div>
      </div>
      {mode === 'override' && (
        <p className="text-xs text-morandi-secondary mt-2">
          藍點表示已覆寫職務預設。點擊開關可切換狀態。
        </p>
      )}
    </div>
  )
}
