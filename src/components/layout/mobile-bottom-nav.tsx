'use client'

import { logger } from '@/lib/utils/logger'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Home,
  Calendar,
  MapPin,
  ShoppingCart,
  Calculator,
  CreditCard,
  Users,
  Database,
  MoreHorizontal,
  Settings,
  Check,
} from 'lucide-react'
import { COMP_LAYOUT_LABELS } from './constants/labels'

// 可用的導航項目配置
export interface NavItem {
  id: string
  icon: keyof typeof ICON_MAP
  label: string
  href: string
  requiredPermission?: string
}

// 圖標映射
const ICON_MAP = {
  Home,
  Calendar,
  MapPin,
  ShoppingCart,
  Calculator,
  CreditCard,
  Users,
  Database,
  Settings,
  MoreHorizontal,
}

// 預設導航項目（所有可選的功能）
export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'home', icon: 'Home', label: COMP_LAYOUT_LABELS.首頁, href: '/dashboard' },
  {
    id: 'calendar',
    icon: 'Calendar',
    label: COMP_LAYOUT_LABELS.行事曆,
    href: '/calendar',
    requiredPermission: 'calendar',
  },
  {
    id: 'tours',
    icon: 'MapPin',
    label: COMP_LAYOUT_LABELS.旅遊團,
    href: '/tours',
    requiredPermission: 'tours',
  },
  {
    id: 'orders',
    icon: 'ShoppingCart',
    label: COMP_LAYOUT_LABELS.訂單,
    href: '/orders',
    requiredPermission: 'orders',
  },
  {
    id: 'finance',
    icon: 'CreditCard',
    label: COMP_LAYOUT_LABELS.財務,
    href: '/finance',
    requiredPermission: 'payments',
  },
  {
    id: 'customers',
    icon: 'Users',
    label: COMP_LAYOUT_LABELS.顧客,
    href: '/customers',
    requiredPermission: 'customers',
  },
  {
    id: 'database',
    icon: 'Database',
    label: COMP_LAYOUT_LABELS.資料,
    href: '/database',
    requiredPermission: 'database',
  },
]

// 預設選中的導航項目（前 4 個）
const DEFAULT_SELECTED_IDS = ['home', 'calendar', 'tours', 'orders']

// 從 localStorage 讀取配置
function getStoredNavItems(): string[] {
  if (typeof window === 'undefined') return DEFAULT_SELECTED_IDS

  try {
    const stored = localStorage.getItem('venturo_mobile_nav')
    if (stored) {
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_SELECTED_IDS
    }
  } catch (error) {
    logger.error('Failed to parse mobile nav config:', error)
  }

  return DEFAULT_SELECTED_IDS
}

// 儲存配置到 localStorage
function saveNavItems(itemIds: string[]) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem('venturo_mobile_nav', JSON.stringify(itemIds))
  } catch (error) {
    logger.error('Failed to save mobile nav config:', error)
  }
}

export function MobileBottomNav() {
  const pathname = usePathname()
  const { user, _hasHydrated, isAdmin } = useAuthStore()
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(DEFAULT_SELECTED_IDS)
  const [showAllItems, setShowAllItems] = useState(false)

  // 根據權限過濾可用的導航項目
  const availableNavItems = useMemo(() => {
    const permissions = user?.permissions || []

    return DEFAULT_NAV_ITEMS.filter(item => {
      if (!item.requiredPermission) return true
      const perm = item.requiredPermission
      return isAdmin || permissions.some(p => p === perm || p.startsWith(`${perm}:`))
    })
  }, [user?.permissions])

  // 載入儲存的配置
  useEffect(() => {
    if (!_hasHydrated) return

    const storedIds = getStoredNavItems()
    const validStoredIds = storedIds.filter(id => availableNavItems.some(item => item.id === id))

    if (validStoredIds.length > 0) {
      setSelectedItemIds(validStoredIds)
      return
    }

    // 如果沒有有效的配置，使用權限允許的前 4 個項目
    setSelectedItemIds(availableNavItems.slice(0, 4).map(item => item.id))
  }, [_hasHydrated, availableNavItems])

  // 過濾出選中的項目
  const selectedItems = selectedItemIds
    .map(id => availableNavItems.find(item => item.id === id))
    .filter((item): item is NavItem => item !== undefined)
    .slice(0, 4) // 最多 4 個

  if (availableNavItems.length === 0) return null

  // 檢查路徑是否匹配
  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  // 渲染導航項目
  const renderNavItem = (item: NavItem) => {
    const Icon = ICON_MAP[item.icon]
    const active = isActive(item.href)

    return (
      <Link
        key={item.id}
        href={item.href}
        className={cn(
          'flex flex-col items-center justify-center flex-1 py-2 transition-colors',
          active ? 'text-morandi-gold' : 'text-morandi-secondary hover:text-morandi-primary'
        )}
      >
        <Icon size={20} className={active ? 'stroke-[2.5]' : 'stroke-2'} />
        <span className="text-xs mt-1 font-medium">{item.label}</span>
      </Link>
    )
  }

  // 找到當前頁面在導航項目中的索引（用於指示器）
  const currentIndex = selectedItems.findIndex(item => {
    if (item.href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(item.href)
  })

  return (
    <>
      {/* 底部導航欄 - 只在手機模式顯示 */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-[400] safe-area-pb">
        {/* 頁面指示器（小圓點） */}
        {currentIndex !== -1 && (
          <div className="flex items-center justify-center gap-1.5 py-1">
            {selectedItems.map((_, index) => (
              <div
                key={index}
                className={cn(
                  'h-1 rounded-full transition-all duration-300',
                  index === currentIndex ? 'w-6 bg-morandi-gold' : 'w-1.5 bg-morandi-secondary/30'
                )}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-around h-16 px-2">
          {/* 顯示選中的 4 個項目 */}
          {selectedItems.map(renderNavItem)}

          {/* 更多按鈕 */}
          <button
            onClick={() => setShowAllItems(true)}
            className={cn(
              'flex flex-col items-center justify-center flex-1 py-2 transition-colors',
              'text-morandi-secondary hover:text-morandi-primary'
            )}
          >
            <MoreHorizontal size={20} />
            <span className="text-xs mt-1 font-medium">{COMP_LAYOUT_LABELS.LABEL_9472}</span>
          </button>
        </div>
      </div>

      {/* 全功能選單 - 點擊「更多」時彈出 */}
      {showAllItems && (
        <MobileNavSettings
          availableItems={availableNavItems}
          selectedItemIds={selectedItemIds}
          onSave={newIds => {
            setSelectedItemIds(newIds)
            saveNavItems(newIds)
            setShowAllItems(false)
          }}
          onClose={() => setShowAllItems(false)}
        />
      )}
    </>
  )
}

// 設定介面組件
interface MobileNavSettingsProps {
  availableItems: NavItem[]
  selectedItemIds: string[]
  onSave: (itemIds: string[]) => void
  onClose: () => void
}

function MobileNavSettings({
  availableItems,
  selectedItemIds,
  onSave,
  onClose,
}: MobileNavSettingsProps) {
  const [tempSelected, setTempSelected] = useState<string[]>(selectedItemIds)

  useEffect(() => {
    const validSelections = selectedItemIds.filter(id =>
      availableItems.some(item => item.id === id)
    )
    const fallbackSelections = availableItems.slice(0, 4).map(item => item.id)
    const nextSelections = validSelections.length > 0 ? validSelections : fallbackSelections
    setTempSelected(nextSelections)
  }, [availableItems, selectedItemIds])

  const toggleItem = (id: string) => {
    if (tempSelected.includes(id)) {
      setTempSelected(tempSelected.filter(itemId => itemId !== id))
    } else {
      if (tempSelected.length < 4) {
        setTempSelected([...tempSelected, id])
      }
    }
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent
        level={1}
        className="fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0 w-full max-w-full md:max-w-md md:left-[50%] md:top-[50%] md:translate-x-[-50%] md:translate-y-[-50%] md:bottom-auto rounded-t-xl md:rounded-xl p-0 gap-0"
      >
        {/* 標題列 */}
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle className="text-lg font-bold text-morandi-primary">
            {COMP_LAYOUT_LABELS.LABEL_2572}
          </DialogTitle>
        </DialogHeader>

        {/* 提示 */}
        <div className="p-4 bg-morandi-gold/5 border-b border-border">
          <p className="text-sm text-morandi-secondary">
            選擇最多 4 個常用功能顯示在底部導航欄 ({tempSelected.length}/4)
          </p>
        </div>

        {/* 功能列表 */}
        <div className="p-4 max-h-[50vh] overflow-y-auto">
          <div className="space-y-2">
            {availableItems.map(item => {
              const Icon = ICON_MAP[item.icon]
              const isSelected = tempSelected.includes(item.id)
              const canSelect = isSelected || tempSelected.length < 4

              return (
                <button
                  key={item.id}
                  onClick={() => canSelect && toggleItem(item.id)}
                  disabled={!canSelect}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-all',
                    isSelected
                      ? 'border-morandi-gold bg-morandi-gold/10 text-morandi-gold'
                      : canSelect
                        ? 'border-border hover:border-morandi-gold/50 hover:bg-morandi-container/50'
                        : 'border-border opacity-50 cursor-not-allowed'
                  )}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                  {isSelected && <Check className="w-5 h-5 ml-auto" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="p-4 border-t border-border flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-lg border border-border hover:bg-morandi-container/50 transition-colors font-medium"
          >
            {COMP_LAYOUT_LABELS.CANCEL}
          </button>
          <button
            onClick={() => onSave(tempSelected)}
            className="flex-1 px-4 py-3 rounded-lg bg-morandi-gold hover:bg-morandi-gold-hover text-white transition-colors font-medium"
          >
            {COMP_LAYOUT_LABELS.SAVE}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
