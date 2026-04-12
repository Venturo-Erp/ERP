'use client'

/**
 * ModulePermissionTable - 共用模組權限表格
 *
 * mode:
 * - 'role': 編輯職務權限（/hr/roles 用）
 * - 'employee': 員工覆寫（職務是模板，員工可 +/- 微調）
 */

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, ChevronDown } from 'lucide-react'
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

interface BaseProps {
  maxHeight?: string
}

interface RoleModeProps extends BaseProps {
  mode: 'role'
  permissions: TabPermission[]
  onPermissionsChange: (permissions: TabPermission[]) => void
}

interface EmployeeModeProps extends BaseProps {
  mode: 'employee'
  /** 職務的權限（模板，唯讀） */
  rolePermissions: TabPermission[]
  /** 員工的覆寫 */
  overrides: PermissionOverride[]
  onOverridesChange: (overrides: PermissionOverride[]) => void
}

type ModulePermissionTableProps = RoleModeProps | EmployeeModeProps

export function ModulePermissionTable(props: ModulePermissionTableProps) {
  const { mode, maxHeight = '500px' } = props
  const [expandedModules, setExpandedModules] = useState<string[]>([])

  // === 職務模式的邏輯 ===
  const getRolePermission = (
    moduleCode: string,
    tabCode: string | null
  ): TabPermission | undefined => {
    if (mode === 'role') {
      return props.permissions.find(p => p.module_code === moduleCode && p.tab_code === tabCode)
    }
    return props.rolePermissions.find(p => p.module_code === moduleCode && p.tab_code === tabCode)
  }

  const isModuleFullyEnabled = (
    module: ModuleDefinition,
    field: 'can_read' | 'can_write'
  ): boolean => {
    if (module.tabs.length === 0) {
      const perm = getRolePermission(module.code, null)
      return perm?.[field] ?? false
    }
    return module.tabs.every(tab => {
      const perm = getRolePermission(module.code, tab.code)
      return perm?.[field] ?? false
    })
  }

  const isModulePartiallyEnabled = (
    module: ModuleDefinition,
    field: 'can_read' | 'can_write'
  ): boolean => {
    if (module.tabs.length === 0) return false
    const enabledCount = module.tabs.filter(tab => {
      const perm = getRolePermission(module.code, tab.code)
      return perm?.[field] ?? false
    }).length
    return enabledCount > 0 && enabledCount < module.tabs.length
  }

  // 職務模式：切換權限
  const toggleRolePermission = (
    module: ModuleDefinition,
    tabCode: string | null,
    field: 'can_read' | 'can_write'
  ) => {
    if (mode !== 'role') return
    const { permissions, onPermissionsChange } = props

    if (tabCode === null && module.tabs.length > 0) {
      // 切換整個模組
      const isFullyEnabled = isModuleFullyEnabled(module, field)
      const newValue = !isFullyEnabled

      let updated = [...permissions]
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
      onPermissionsChange(updated)
    } else {
      // 切換單一項目
      const existing = permissions.find(
        p => p.module_code === module.code && p.tab_code === tabCode
      )
      if (existing) {
        onPermissionsChange(
          permissions.map(p =>
            p.module_code === module.code && p.tab_code === tabCode
              ? { ...p, [field]: !p[field] }
              : p
          )
        )
      } else {
        onPermissionsChange([
          ...permissions,
          {
            module_code: module.code,
            tab_code: tabCode,
            can_read: field === 'can_read',
            can_write: field === 'can_write',
          },
        ])
      }
    }
  }

  // === 員工模式的邏輯 ===
  const getOverride = (
    moduleCode: string,
    tabCode: string | null
  ): PermissionOverride | undefined => {
    if (mode !== 'employee') return undefined
    return props.overrides.find(o => o.module_code === moduleCode && o.tab_code === tabCode)
  }

  // 計算最終狀態（職務 + 覆寫）
  const getEffectiveStatus = (
    moduleCode: string,
    tabCode: string | null,
    field: 'can_read' | 'can_write'
  ): boolean => {
    const rolePerm = getRolePermission(moduleCode, tabCode)
    if (mode === 'role') return rolePerm?.[field] ?? false

    const override = getOverride(moduleCode, tabCode)
    if (override?.override_type === 'grant') return true
    if (override?.override_type === 'revoke') return false
    return rolePerm?.[field] ?? false
  }

  // 員工模式：切換覆寫
  const toggleOverride = (
    moduleCode: string,
    tabCode: string | null,
    field: 'can_read' | 'can_write'
  ) => {
    if (mode !== 'employee') return
    const { overrides, onOverridesChange, rolePermissions } = props

    const rolePerm = rolePermissions.find(
      p => p.module_code === moduleCode && p.tab_code === tabCode
    )
    const currentRoleValue = rolePerm?.[field] ?? false
    const existing = overrides.find(o => o.module_code === moduleCode && o.tab_code === tabCode)

    if (existing) {
      if (!existing.override_type) {
        // null -> grant 或 revoke
        onOverridesChange(
          overrides.map(o =>
            o.module_code === moduleCode && o.tab_code === tabCode
              ? { ...o, override_type: currentRoleValue ? 'revoke' : 'grant' }
              : o
          )
        )
      } else {
        // grant/revoke -> null（回到跟隨職務）
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
        {
          module_code: moduleCode,
          tab_code: tabCode,
          override_type: currentRoleValue ? 'revoke' : 'grant',
        },
      ])
    }
  }

  // 渲染模組行
  const renderModuleRow = (module: ModuleDefinition) => {
    const hasTabs = module.tabs.length > 0
    const isExpanded = expandedModules.includes(module.code)

    const readFully = isModuleFullyEnabled(module, 'can_read')
    const readPartial = isModulePartiallyEnabled(module, 'can_read')
    const writeFully = isModuleFullyEnabled(module, 'can_write')
    const writePartial = isModulePartiallyEnabled(module, 'can_write')

    const moduleOverride = mode === 'employee' ? getOverride(module.code, null) : undefined

    return (
      <div key={module.code}>
        {/* 模組行 */}
        <div
          className={`flex items-center border-t border-border ${hasTabs ? 'bg-morandi-bg/30' : 'bg-white'}`}
        >
          <div className="flex-1 p-4 flex items-center gap-2">
            {hasTabs ? (
              <button
                type="button"
                onClick={() =>
                  setExpandedModules(prev =>
                    prev.includes(module.code)
                      ? prev.filter(m => m !== module.code)
                      : [...prev, module.code]
                  )
                }
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

          {/* 可讀取 */}
          <div className="w-32 p-4 flex justify-center">
            <div className="relative">
              <Switch
                checked={
                  mode === 'role'
                    ? readFully
                    : getEffectiveStatus(module.code, hasTabs ? null : null, 'can_read')
                }
                onCheckedChange={() =>
                  mode === 'role'
                    ? toggleRolePermission(module, hasTabs ? null : null, 'can_read')
                    : !hasTabs && toggleOverride(module.code, null, 'can_read')
                }
                disabled={mode === 'employee' && hasTabs}
                className="data-[state=checked]:bg-morandi-green"
              />
              {mode === 'role' && readPartial && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-morandi-gold rounded-full" />
              )}
              {mode === 'employee' && moduleOverride?.override_type && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-status-info/100 rounded-full" />
              )}
            </div>
          </div>

          {/* 可寫入 */}
          <div className="w-32 p-4 flex justify-center">
            <div className="relative">
              <Switch
                checked={
                  mode === 'role'
                    ? writeFully
                    : getEffectiveStatus(module.code, hasTabs ? null : null, 'can_write')
                }
                onCheckedChange={() =>
                  mode === 'role'
                    ? toggleRolePermission(module, hasTabs ? null : null, 'can_write')
                    : !hasTabs && toggleOverride(module.code, null, 'can_write')
                }
                disabled={mode === 'employee' && hasTabs}
                className="data-[state=checked]:bg-morandi-gold"
              />
              {mode === 'role' && writePartial && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-morandi-gold rounded-full" />
              )}
            </div>
          </div>
        </div>

        {/* 分頁行 */}
        {hasTabs &&
          isExpanded &&
          module.tabs.map(tab => {
            const tabOverride = mode === 'employee' ? getOverride(module.code, tab.code) : undefined
            const perm = getRolePermission(module.code, tab.code)

            return (
              <div key={tab.code} className="flex items-center border-t border-border bg-white">
                <div className="flex-1 p-4 pl-12 flex items-center gap-2">
                  <div className="w-1 h-4 bg-border rounded-full" />
                  <span className="text-sm text-morandi-primary">{tab.name}</span>
                  {mode === 'employee' && tabOverride?.override_type && (
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        tabOverride.override_type === 'grant'
                          ? 'bg-morandi-green/10 text-morandi-green border-morandi-green/30'
                          : 'bg-morandi-red/10 text-morandi-red border-morandi-red/30'
                      }`}
                    >
                      {tabOverride.override_type === 'grant' ? '+額外開啟' : '-已關閉'}
                    </Badge>
                  )}
                </div>

                {/* 可讀取 */}
                <div className="w-32 p-4 flex justify-center">
                  <div className="relative">
                    <Switch
                      checked={getEffectiveStatus(module.code, tab.code, 'can_read')}
                      onCheckedChange={() =>
                        mode === 'role'
                          ? toggleRolePermission(module, tab.code, 'can_read')
                          : toggleOverride(module.code, tab.code, 'can_read')
                      }
                      className="data-[state=checked]:bg-morandi-green"
                    />
                    {mode === 'employee' && tabOverride?.override_type && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-status-info/100 rounded-full" />
                    )}
                  </div>
                </div>

                {/* 可寫入 */}
                <div className="w-32 p-4 flex justify-center">
                  <Switch
                    checked={getEffectiveStatus(module.code, tab.code, 'can_write')}
                    onCheckedChange={() =>
                      mode === 'role'
                        ? toggleRolePermission(module, tab.code, 'can_write')
                        : toggleOverride(module.code, tab.code, 'can_write')
                    }
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
    <div>
      <div className="flex items-center gap-4 text-xs text-morandi-secondary mb-3">
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-morandi-green" /> 可讀取
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-morandi-gold" /> 可寫入
        </span>
        {mode === 'role' && (
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-morandi-gold" /> 部分開啟
          </span>
        )}
        {mode === 'employee' && (
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-status-info/100" /> 已覆寫職務
          </span>
        )}
      </div>
      <div className="border border-border rounded-lg overflow-hidden" style={{ maxHeight }}>
        <div className="overflow-y-auto" style={{ maxHeight }}>
          {/* 表頭 */}
          <div className="flex items-center bg-card sticky top-0 z-20 border-b border-border shadow-sm">
            <div className="flex-1 p-4 font-semibold text-morandi-primary">功能模組</div>
            <div className="w-32 p-4 text-center font-semibold text-morandi-primary">可讀取</div>
            <div className="w-32 p-4 text-center font-semibold text-morandi-primary">可寫入</div>
          </div>

          {/* 模組列表 */}
          {MODULES.map(module => renderModuleRow(module))}
        </div>
      </div>
      {mode === 'employee' && (
        <p className="text-xs text-morandi-secondary mt-2">
          藍點表示已覆寫職務預設。點擊開關：職務有的可關閉，職務沒有的可開啟。
        </p>
      )}
    </div>
  )
}
