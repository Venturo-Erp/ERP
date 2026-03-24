'use client'

import React, { useState, useEffect, forwardRef } from 'react'
import { Employee } from '@/stores/types'
import { useUserStore } from '@/stores/user-store'
import { useAuthStore } from '@/stores/auth-store'
import { Check, Shield, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface PermissionsTabProps {
  employee: Employee
}

// 職位定義（簡化版）
const POSITIONS = [
  { id: 'super_admin', name: '超級管理員', description: '所有功能完整權限' },
  { id: 'admin', name: '管理員', description: '管理功能，不含系統設定' },
  { id: 'sales', name: '業務', description: '團務、客戶、報價' },
  { id: 'accountant', name: '會計', description: '財務、請款、收款' },
  { id: 'assistant', name: '助理', description: '基本功能' },
  { id: 'custom', name: '自訂', description: '手動設定權限' },
] as const

type PositionId = typeof POSITIONS[number]['id']

// 功能模組定義
const FEATURE_MODULES = [
  { code: 'calendar', name: '行事曆', description: '檢視和管理行事曆' },
  { code: 'tours', name: '團務管理', description: '旅遊團、訂單管理' },
  { code: 'orders', name: '訂單管理', description: '客戶訂單' },
  { code: 'finance', name: '財務系統', description: '請款、收款、會計' },
  { code: 'hr', name: '人資管理', description: '員工、薪資、請假' },
  { code: 'database', name: '資料庫', description: '客戶、供應商資料' },
  { code: 'itinerary', name: '行程設計', description: '行程表編輯' },
  { code: 'visas', name: '簽證管理', description: '簽證申請追蹤' },
  { code: 'settings', name: '系統設定', description: '公司設定、權限' },
] as const

type FeatureCode = typeof FEATURE_MODULES[number]['code']
type AccessLevel = 'full' | 'read' | 'none'

// 職位預設權限
const POSITION_DEFAULTS: Record<PositionId, Record<FeatureCode, AccessLevel>> = {
  super_admin: {
    calendar: 'full', tours: 'full', orders: 'full', finance: 'full',
    hr: 'full', database: 'full', itinerary: 'full', visas: 'full', settings: 'full',
  },
  admin: {
    calendar: 'full', tours: 'full', orders: 'full', finance: 'full',
    hr: 'full', database: 'full', itinerary: 'full', visas: 'full', settings: 'read',
  },
  sales: {
    calendar: 'full', tours: 'full', orders: 'full', finance: 'read',
    hr: 'none', database: 'full', itinerary: 'full', visas: 'read', settings: 'none',
  },
  accountant: {
    calendar: 'read', tours: 'read', orders: 'read', finance: 'full',
    hr: 'read', database: 'read', itinerary: 'none', visas: 'none', settings: 'none',
  },
  assistant: {
    calendar: 'read', tours: 'read', orders: 'read', finance: 'none',
    hr: 'none', database: 'read', itinerary: 'read', visas: 'none', settings: 'none',
  },
  custom: {
    calendar: 'none', tours: 'none', orders: 'none', finance: 'none',
    hr: 'none', database: 'none', itinerary: 'none', visas: 'none', settings: 'none',
  },
}

// 從 permissions 陣列解析出功能權限
function parsePermissions(permissions: string[]): Record<FeatureCode, AccessLevel> {
  const result: Record<FeatureCode, AccessLevel> = {} as Record<FeatureCode, AccessLevel>
  
  // 如果有 * 權限，全部設為 full
  if (permissions.includes('*')) {
    FEATURE_MODULES.forEach(f => { result[f.code] = 'full' })
    return result
  }
  
  FEATURE_MODULES.forEach(f => {
    if (permissions.includes(f.code)) {
      result[f.code] = 'full'
    } else if (permissions.includes(`${f.code}:read`)) {
      result[f.code] = 'read'
    } else {
      result[f.code] = 'none'
    }
  })
  
  return result
}

// 將功能權限轉換為 permissions 陣列
function toPermissionsArray(features: Record<FeatureCode, AccessLevel>): string[] {
  const result: string[] = []
  
  // 檢查是否全部都是 full
  const allFull = FEATURE_MODULES.every(f => features[f.code] === 'full')
  if (allFull) {
    return ['*']
  }
  
  Object.entries(features).forEach(([code, level]) => {
    if (level === 'full') {
      result.push(code)
    } else if (level === 'read') {
      result.push(`${code}:read`)
    }
    // none 不加入
  })
  
  return result
}

// 判斷當前權限最接近哪個職位
function detectPosition(features: Record<FeatureCode, AccessLevel>): PositionId {
  for (const pos of POSITIONS) {
    if (pos.id === 'custom') continue
    const defaults = POSITION_DEFAULTS[pos.id]
    const matches = FEATURE_MODULES.every(f => features[f.code] === defaults[f.code])
    if (matches) return pos.id
  }
  return 'custom'
}

export const PermissionsTabNew = forwardRef<{ handleSave: () => void }, PermissionsTabProps>(
  ({ employee }, ref) => {
    const { user, setUser } = useAuthStore()
    const { update: updateUser } = useUserStore()

    // 從 employee.permissions 解析出功能權限
    const initialFeatures = parsePermissions(employee.permissions || [])
    const [features, setFeatures] = useState<Record<FeatureCode, AccessLevel>>(initialFeatures)
    const [selectedPosition, setSelectedPosition] = useState<PositionId>(detectPosition(initialFeatures))
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
      const newFeatures = parsePermissions(employee.permissions || [])
      setFeatures(newFeatures)
      setSelectedPosition(detectPosition(newFeatures))
    }, [employee.permissions])

    // 選擇職位時套用預設權限
    const handlePositionChange = (positionId: PositionId) => {
      setSelectedPosition(positionId)
      if (positionId !== 'custom') {
        setFeatures({ ...POSITION_DEFAULTS[positionId] })
      }
    }

    // 修改單一功能權限
    const handleFeatureChange = (code: FeatureCode, level: AccessLevel) => {
      const newFeatures = { ...features, [code]: level }
      setFeatures(newFeatures)
      setSelectedPosition(detectPosition(newFeatures))
    }

    // 儲存
    const handleSave = async () => {
      setIsSaving(true)
      try {
        const permissions = toPermissionsArray(features)
        const roles = selectedPosition === 'super_admin' ? ['super_admin'] : 
                      selectedPosition === 'admin' ? ['admin'] :
                      selectedPosition === 'custom' ? [] : [selectedPosition]

        await updateUser(employee.id, {
          roles: roles as unknown as typeof employee.roles,
          permissions: permissions as unknown as typeof employee.permissions,
        })

        // 如果修改的是當前登入用戶，更新 auth-store
        if (user && user.id === employee.id) {
          setUser({
            ...user,
            roles: roles as unknown as typeof user.roles,
            permissions: permissions as unknown as typeof user.permissions,
          })
        }

        toast.success('權限已更新')
      } catch (error) {
        console.error('儲存權限失敗:', error)
        toast.error('儲存失敗')
      } finally {
        setIsSaving(false)
      }
    }

    const AccessButton = ({ level, current, onClick }: { level: AccessLevel; current: AccessLevel; onClick: () => void }) => {
      const isActive = current === level
      const icons = { full: Check, read: Eye, none: EyeOff }
      const labels = { full: '完整', read: '讀取', none: '關閉' }
      const colors = {
        full: isActive ? 'bg-green-100 text-green-700 border-green-300' : 'hover:bg-green-50',
        read: isActive ? 'bg-blue-100 text-blue-700 border-blue-300' : 'hover:bg-blue-50',
        none: isActive ? 'bg-gray-100 text-gray-500 border-gray-300' : 'hover:bg-gray-50',
      }
      const Icon = icons[level]

      return (
        <button
          onClick={onClick}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded-md text-sm border transition-colors',
            colors[level],
            !isActive && 'border-transparent text-gray-400'
          )}
        >
          <Icon size={14} />
          {labels[level]}
        </button>
      )
    }

    return (
      <div className="space-y-6">
        {/* 職位選擇 */}
        <div>
          <h4 className="text-sm font-medium text-morandi-primary mb-3 flex items-center gap-2">
            <Shield size={16} />
            選擇職位
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {POSITIONS.map(pos => (
              <button
                key={pos.id}
                onClick={() => handlePositionChange(pos.id)}
                className={cn(
                  'p-3 rounded-lg border text-left transition-colors',
                  selectedPosition === pos.id
                    ? 'border-morandi-gold bg-morandi-gold/10'
                    : 'border-border hover:border-morandi-gold/50'
                )}
              >
                <div className="font-medium text-sm">{pos.name}</div>
                <div className="text-xs text-morandi-muted mt-0.5">{pos.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 功能權限矩陣 */}
        <div>
          <h4 className="text-sm font-medium text-morandi-primary mb-3">
            功能權限 {selectedPosition !== 'custom' && <span className="text-morandi-muted font-normal">（可微調）</span>}
          </h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-morandi-container/50">
                  <th className="text-left px-4 py-2 text-sm font-medium">功能模組</th>
                  <th className="text-center px-2 py-2 text-sm font-medium w-24">完整</th>
                  <th className="text-center px-2 py-2 text-sm font-medium w-24">讀取</th>
                  <th className="text-center px-2 py-2 text-sm font-medium w-24">關閉</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_MODULES.map((module, idx) => (
                  <tr key={module.code} className={idx % 2 === 0 ? '' : 'bg-morandi-container/30'}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">{module.name}</div>
                      <div className="text-xs text-morandi-muted">{module.description}</div>
                    </td>
                    <td className="text-center px-2">
                      <AccessButton
                        level="full"
                        current={features[module.code]}
                        onClick={() => handleFeatureChange(module.code, 'full')}
                      />
                    </td>
                    <td className="text-center px-2">
                      <AccessButton
                        level="read"
                        current={features[module.code]}
                        onClick={() => handleFeatureChange(module.code, 'read')}
                      />
                    </td>
                    <td className="text-center px-2">
                      <AccessButton
                        level="none"
                        current={features[module.code]}
                        onClick={() => handleFeatureChange(module.code, 'none')}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 儲存按鈕 */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-morandi-gold text-white rounded-lg hover:bg-morandi-gold-hover disabled:opacity-50"
          >
            {isSaving ? '儲存中...' : '儲存權限'}
          </button>
        </div>
      </div>
    )
  }
)

PermissionsTabNew.displayName = 'PermissionsTabNew'
