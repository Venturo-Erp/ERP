'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { updateEmployee } from '@/data'
import { Check, Star, Info, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/utils/logger'
import type { User } from '@/stores/types'
import { PREFERRED_FEATURES_LABELS } from '../constants/labels'

// 定義所有可選功能
interface FeatureOption {
  id: string
  label: string
  description: string
  category: string
  icon?: string
}

const L = PREFERRED_FEATURES_LABELS

const AVAILABLE_FEATURES: FeatureOption[] = [
  // 核心功能
  { id: 'calendar', label: L.FEATURE_CALENDAR, description: L.DESC_CALENDAR, category: L.CAT_CORE },
  {
    id: 'workspace',
    label: L.FEATURE_WORKSPACE,
    description: L.DESC_WORKSPACE,
    category: L.CAT_CORE,
  },
  { id: 'todos', label: L.FEATURE_TODOS, description: L.DESC_TODOS, category: L.CAT_CORE },

  // 業務功能
  { id: 'tours', label: L.FEATURE_TOURS, description: L.DESC_TOURS, category: L.CAT_BUSINESS },
  { id: 'orders', label: L.FEATURE_ORDERS, description: L.DESC_ORDERS, category: L.CAT_BUSINESS },
  { id: 'quotes', label: L.FEATURE_QUOTES, description: L.DESC_QUOTES, category: L.CAT_BUSINESS },
  {
    id: 'customers',
    label: L.FEATURE_CUSTOMERS,
    description: L.DESC_CUSTOMERS,
    category: L.CAT_BUSINESS,
  },
  {
    id: 'business',
    label: L.FEATURE_BUSINESS,
    description: L.DESC_BUSINESS,
    category: L.CAT_BUSINESS,
  },
  {
    id: 'confirmations',
    label: L.FEATURE_CONFIRMATIONS,
    description: L.DESC_CONFIRMATIONS,
    category: L.CAT_BUSINESS,
  },
  {
    id: 'contracts',
    label: L.FEATURE_CONTRACTS,
    description: L.DESC_CONTRACTS,
    category: L.CAT_BUSINESS,
  },
  { id: 'visas', label: L.FEATURE_VISAS, description: L.DESC_VISAS, category: L.CAT_BUSINESS },

  // 財務功能
  { id: 'finance', label: L.FEATURE_FINANCE, description: L.DESC_FINANCE, category: L.CAT_FINANCE },
  {
    id: 'payments',
    label: L.FEATURE_PAYMENTS,
    description: L.DESC_PAYMENTS,
    category: L.CAT_FINANCE,
  },
  {
    id: 'requests',
    label: L.FEATURE_REQUESTS,
    description: L.DESC_REQUESTS,
    category: L.CAT_FINANCE,
  },
  {
    id: 'disbursement',
    label: L.FEATURE_DISBURSEMENT,
    description: L.DESC_DISBURSEMENT,
    category: L.CAT_FINANCE,
  },
  {
    id: 'accounting',
    label: L.FEATURE_ACCOUNTING,
    description: L.DESC_ACCOUNTING,
    category: L.CAT_FINANCE,
  },
  {
    id: 'vouchers',
    label: L.FEATURE_VOUCHERS,
    description: L.DESC_VOUCHERS,
    category: L.CAT_FINANCE,
  },
  { id: 'reports', label: L.FEATURE_REPORTS, description: L.DESC_REPORTS, category: L.CAT_FINANCE },

  // 資料管理
  { id: 'database', label: L.FEATURE_DATABASE, description: L.DESC_DATABASE, category: L.CAT_DATA },

  // 管理功能
  { id: 'hr', label: L.FEATURE_HR, description: L.DESC_HR, category: L.CAT_MANAGEMENT },
  {
    id: 'settings',
    label: L.FEATURE_SETTINGS,
    description: L.DESC_SETTINGS,
    category: L.CAT_MANAGEMENT,
  },
]

export function PreferredFeaturesSettings() {
  const { user, setUser } = useAuthStore()

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [showSavedMessage, setShowSavedMessage] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // 用於 debounce 的 ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingFeaturesRef = useRef<string[]>([])

  // 初始化：載入使用者的 preferred_features
  useEffect(() => {
    if (user?.preferred_features) {
      setSelectedFeatures(user.preferred_features)
    } else {
      // 沒有設定時，預設全部顯示（管理員）
      const userPermissions = user?.permissions || []
      const { isAdmin: storeIsAdmin } = useAuthStore.getState()
      if (storeIsAdmin) {
        setSelectedFeatures(AVAILABLE_FEATURES.map(f => f.id))
      } else {
        const defaultFeatures = AVAILABLE_FEATURES.filter(f => userPermissions.includes(f.id)).map(
          f => f.id
        )
        setSelectedFeatures(defaultFeatures)
      }
    }
  }, [user])

  // 清理 timeout
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // 實際儲存到資料庫（延遲執行）
  const saveToDatabase = useCallback(
    async (features: string[]) => {
      if (!user) return

      setIsSaving(true)
      try {
        // 更新資料庫
        await updateEmployee(user.id, { preferred_features: features })

        // 顯示儲存成功訊息
        setShowSavedMessage(true)
        setHasUnsavedChanges(false)
        setTimeout(() => setShowSavedMessage(false), 2000)
      } catch (error) {
        logger.error('儲存失敗:', error)
      } finally {
        setIsSaving(false)
      }
    },
    [user]
  )

  // 處理點擊（立即更新 UI，延遲儲存資料庫）
  const handleToggleFeature = (featureId: string) => {
    const newFeatures = selectedFeatures.includes(featureId)
      ? selectedFeatures.filter(id => id !== featureId)
      : [...selectedFeatures, featureId]

    // 1. 立即更新本地狀態
    setSelectedFeatures(newFeatures)
    setHasUnsavedChanges(true)
    pendingFeaturesRef.current = newFeatures

    // 2. 立即更新 auth-store（讓側邊欄即時反應）
    if (user) {
      const updatedUser: User = {
        ...user,
        preferred_features: newFeatures,
      }
      setUser(updatedUser)
    }

    // 3. 延遲儲存到資料庫（debounce 1 秒）
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveToDatabase(pendingFeaturesRef.current)
    }, 1000)
  }

  const handleResetToDefaults = () => {
    if (!user) return

    // 新系統：管理員給全部功能，其他人給基本功能
    const { isAdmin } = useAuthStore.getState()
    const defaultFeatures = isAdmin 
      ? AVAILABLE_FEATURES.map(f => f.id)
      : ['tours', 'orders', 'calendar', 'todos', 'workspace']

    // 更新本地狀態和 auth-store
    setSelectedFeatures(defaultFeatures)
    setHasUnsavedChanges(true)
    pendingFeaturesRef.current = defaultFeatures

    if (user) {
      const updatedUser: User = {
        ...user,
        preferred_features: defaultFeatures,
      }
      setUser(updatedUser)
    }

    // 延遲儲存
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveToDatabase(pendingFeaturesRef.current)
    }, 1000)
  }

  // 按類別分組功能
  const featuresByCategory = AVAILABLE_FEATURES.reduce(
    (acc, feature) => {
      if (!acc[feature.category]) {
        acc[feature.category] = []
      }
      acc[feature.category].push(feature)
      return acc
    },
    {} as Record<string, FeatureOption[]>
  )

  const categories = Object.keys(featuresByCategory)

  // 檢查使用者是否有該功能的權限（與側邊欄邏輯一致）
  const hasPermission = (featureId: string) => {
    const { isAdmin: storeIsAdmin } = useAuthStore.getState()
    if (storeIsAdmin) return true
    const userPermissions = user?.permissions || []
    return userPermissions.includes(featureId)
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="p-6 border-b border-border bg-morandi-container/10">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-morandi-primary mb-1">
              {PREFERRED_FEATURES_LABELS.SETTINGS_6020}
            </h3>
            <p className="text-sm text-morandi-secondary">
              {PREFERRED_FEATURES_LABELS.SELECT_5572}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isSaving && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-status-info-bg border border-status-info/30 rounded-lg text-status-info">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-sm font-medium">{PREFERRED_FEATURES_LABELS.SAVING}</span>
              </div>
            )}
            {showSavedMessage && !isSaving && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-status-success-bg border border-status-success/30 rounded-lg text-status-success">
                <Check size={14} />
                <span className="text-sm font-medium">{PREFERRED_FEATURES_LABELS.SAVED}</span>
              </div>
            )}
            {hasUnsavedChanges && !isSaving && !showSavedMessage && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-status-warning-bg border border-status-warning/30 rounded-lg text-status-warning">
                <span className="text-sm font-medium">
                  {PREFERRED_FEATURES_LABELS.PENDING_SAVE}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* 提示資訊 */}
        <div className="bg-status-info-bg border border-status-info/30 rounded-lg p-4 flex items-start gap-3">
          <Info size={18} className="text-status-info mt-0.5 flex-shrink-0" />
          <div className="text-sm text-morandi-primary">
            <p className="font-medium mb-1">{PREFERRED_FEATURES_LABELS.DESCRIPTION_TITLE}</p>
            <ul className="list-disc list-inside space-y-1 text-morandi-secondary">
              <li>{PREFERRED_FEATURES_LABELS.DESC_1}</li>
              <li>{PREFERRED_FEATURES_LABELS.DESC_2}</li>
              <li>{PREFERRED_FEATURES_LABELS.DESC_3}</li>
              <li>{PREFERRED_FEATURES_LABELS.DESC_4}</li>
            </ul>
          </div>
        </div>

        {/* 快速操作按鈕 */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleResetToDefaults} disabled={isSaving}>
            <Star size={14} className="mr-1" />
            {PREFERRED_FEATURES_LABELS.LABEL_1762}
          </Button>
          <span className="text-xs text-morandi-secondary">
            {L.SELECTED_COUNT_PREFIX}
            {selectedFeatures.length}
            {L.SELECTED_COUNT_SUFFIX}
          </span>
        </div>

        {/* 功能選項（按類別） */}
        {categories.map(category => (
          <div key={category} className="space-y-3">
            <h4 className="font-medium text-morandi-primary border-b border-border pb-2">
              {category}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {featuresByCategory[category].map(feature => {
                const isSelected = selectedFeatures.includes(feature.id)
                const canSelect = hasPermission(feature.id)

                return (
                  <div
                    key={feature.id}
                    onClick={() => canSelect && handleToggleFeature(feature.id)}
                    className={cn(
                      'p-3 rounded-lg border-2 transition-all',
                      canSelect ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
                      isSelected
                        ? 'border-morandi-gold bg-morandi-gold/10'
                        : 'border-border bg-card hover:border-morandi-gold/50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                          isSelected
                            ? 'border-morandi-gold bg-morandi-gold text-white'
                            : 'border-morandi-muted'
                        )}
                      >
                        {isSelected && <Check size={12} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-morandi-primary text-sm mb-0.5">
                          {feature.label}
                          {!canSelect && (
                            <span className="text-xs ml-1 text-morandi-secondary">
                              {L.NO_PERMISSION}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-morandi-secondary line-clamp-2">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
