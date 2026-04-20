'use client'

import { AddressBookTabs, ChatDots, House } from '@phosphor-icons/react'
import { COMPANY_NAME } from '@/lib/tenant'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronDown,
  Home,
  MapPin,
  ShoppingCart,
  Users,
  CreditCard,
  Settings,
  Calculator,
  Database,
  Building2,
  Wallet,
  Clock,
  UserCog,
  BarChart3,
  Calendar,
  TrendingDown,
  FileCheck,
  Flag,
  FileSignature,
  FileText,
  CircleDot,
  Wifi,
  ImageIcon,
  Bus,
  CheckSquare,
  MessageCircle,
  Landmark,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { isMenuItemHidden } from '@/lib/constants/menu-items'
import { isFeatureAvailable, RestrictedFeature } from '@/lib/feature-restrictions'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { COMP_LAYOUT_LABELS } from './constants/labels'

interface MenuItem {
  href: string
  label: string
  icon: React.ElementType
  children?: MenuItem[]
  requiredPermission?: string
  restrictedFeature?: RestrictedFeature // 受限功能（非 TP/TC 不可見）
}

// 主選單項目
const menuItems: MenuItem[] = [
  { href: '/dashboard', label: COMP_LAYOUT_LABELS.首頁, icon: House },
  {
    href: '/calendar',
    label: COMP_LAYOUT_LABELS.行事曆,
    icon: Calendar,
    requiredPermission: 'calendar',
  },
  {
    href: '/channel',
    label: COMP_LAYOUT_LABELS.工作空間,
    icon: ChatDots,
    requiredPermission: 'workspace',
  },
  {
    href: '/todos',
    label: COMP_LAYOUT_LABELS.待辦事項,
    icon: CheckSquare,
    requiredPermission: 'todos',
  },
  // 行程管理已整合到旅遊團中，從團的視角操作
  // { href: '/itinerary', label: '行程管理', icon: Flag, requiredPermission: 'itinerary' },
  { href: '/tours', label: COMP_LAYOUT_LABELS.旅遊團, icon: MapPin, requiredPermission: 'tours' },
  {
    href: '/orders',
    label: COMP_LAYOUT_LABELS.訂單,
    icon: ShoppingCart,
    requiredPermission: 'orders',
  },
  {
    href: '/finance',
    label: COMP_LAYOUT_LABELS.財務系統,
    icon: CreditCard,
    children: [
      {
        href: '/finance/payments',
        label: COMP_LAYOUT_LABELS.收款管理,
        icon: CreditCard,
        requiredPermission: 'payments',
      },
      {
        href: '/finance/requests',
        label: COMP_LAYOUT_LABELS.請款管理,
        icon: TrendingDown,
        requiredPermission: 'requests',
      },
      {
        href: '/finance/treasury',
        label: COMP_LAYOUT_LABELS.金庫總覽,
        icon: Landmark,
        requiredPermission: 'disbursement',
      },
      {
        href: '/finance/treasury/disbursement',
        label: COMP_LAYOUT_LABELS.出納管理,
        icon: Wallet,
        requiredPermission: 'disbursement',
      },
      // { href: '/erp-accounting/vouchers', label: COMP_LAYOUT_LABELS.會計傳票, icon: FileText, requiredPermission: 'vouchers' },
      {
        href: '/finance/travel-invoice',
        label: COMP_LAYOUT_LABELS.代轉發票,
        icon: FileText,
        requiredPermission: 'travel_invoice',
        restrictedFeature: 'travel_invoices',
      },
      {
        href: '/finance/reports',
        label: COMP_LAYOUT_LABELS.報表管理,
        icon: BarChart3,
        requiredPermission: 'reports',
      },
    ],
  },
  // V1: 簽證管理暫時隱藏
  // { href: '/visas', label: COMP_LAYOUT_LABELS.簽證管理, icon: FileCheck, requiredPermission: 'visas' },
  {
    href: '/contracts',
    label: COMP_LAYOUT_LABELS.合約管理,
    icon: FileSignature,
    requiredPermission: 'contracts',
  },
  {
    href: '/confirmations',
    label: COMP_LAYOUT_LABELS.確認單管理,
    icon: CircleDot,
    requiredPermission: 'confirmations',
  },
  {
    href: '/database',
    label: COMP_LAYOUT_LABELS.資料管理,
    icon: Database,
    requiredPermission: 'database',
    children: [
      {
        href: '/customers',
        label: COMP_LAYOUT_LABELS.顧客管理,
        icon: AddressBookTabs,
        requiredPermission: 'customers',
      },
      {
        href: '/database/attractions',
        label: COMP_LAYOUT_LABELS.旅遊資料庫,
        icon: MapPin,
        requiredPermission: 'database',
      },
      {
        href: '/database/transportation-rates',
        label: COMP_LAYOUT_LABELS.車資管理,
        icon: Bus,
        requiredPermission: 'database',
      },
      {
        href: '/database/suppliers',
        label: COMP_LAYOUT_LABELS.供應商管理,
        icon: Building2,
        requiredPermission: 'database',
      },
      {
        href: '/database/tour-leaders',
        label: COMP_LAYOUT_LABELS.領隊資料,
        icon: Users,
        requiredPermission: 'database',
      },
      {
        href: '/database/company-assets',
        label: COMP_LAYOUT_LABELS.公司資源管理,
        icon: ImageIcon,
        requiredPermission: 'database',
      },
    ],
  },
  { href: '/hr', label: COMP_LAYOUT_LABELS.人資管理, icon: UserCog, requiredPermission: 'hr' },
  // V1: 網卡管理暫時隱藏
  // { href: '/esims', label: COMP_LAYOUT_LABELS.網卡管理, icon: Wifi, requiredPermission: 'hr', restrictedFeature: 'esim' },
]

// 個人工具
const personalToolItems: MenuItem[] = [
  {
    href: '/accounting',
    label: COMP_LAYOUT_LABELS.記帳管理,
    icon: Wallet,
    requiredPermission: 'accounting',
  },
  // timebox removed
]

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  // 權限相關（新系統）
  const { isAdmin } = useAuthStore()
  const userPermissions = user?.permissions || []
  const hiddenMenuItems = user?.hidden_menu_items || []
  const preferredFeatures = user?.preferred_features || []

  // 新系統：使用 store.isAdmin

  // 關閉側邊欄時重置展開狀態
  useEffect(() => {
    if (!isOpen) {
      setExpandedItems([])
    }
  }, [isOpen])

  // 點擊連結後關閉側邊欄
  const handleLinkClick = () => {
    onClose()
  }

  // 切換子選單展開
  const toggleExpand = (href: string) => {
    setExpandedItems(prev => (prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]))
  }

  // 過濾選單（與桌面版一致的權限邏輯）
  const workspaceCode = user?.workspace_code
  const filterMenuByPermissions = (items: MenuItem[]): MenuItem[] => {
    if (!user) return items.filter(item => !item.requiredPermission)

    return items
      .map(item => {
        if (isMenuItemHidden(item.href, hiddenMenuItems)) return null
        // 檢查功能限制（非 TP/TC 不可見）
        if (item.restrictedFeature && !isFeatureAvailable(item.restrictedFeature, workspaceCode)) {
          return null
        }
        if (preferredFeatures.length > 0 && item.requiredPermission) {
          if (!preferredFeatures.includes(item.requiredPermission)) return null
        }
        if (item.children) {
          const visibleChildren = filterMenuByPermissions(item.children)
          if (visibleChildren.length > 0) {
            return { ...item, children: visibleChildren }
          }
          return null
        }
        if (!item.requiredPermission) return item
        // 管理員有所有權限
        if (isAdmin) return item
        return userPermissions.includes(item.requiredPermission) ? item : null
      })
      .filter((item): item is MenuItem => item !== null)
  }

  const visibleMenuItems = filterMenuByPermissions(menuItems)
  const visiblePersonalItems = filterMenuByPermissions(personalToolItems)

  // 渲染選單項目
  const renderMenuItem = (item: MenuItem, isChild = false) => {
    const Icon = item.icon
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.href)

    if (hasChildren) {
      return (
        <div key={item.href}>
          <button
            onClick={() => toggleExpand(item.href)}
            className={cn(
              'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
              isActive
                ? 'bg-morandi-gold/10 text-morandi-gold'
                : 'text-morandi-primary hover:bg-muted'
            )}
          >
            <span className="flex items-center gap-3">
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </span>
            <ChevronDown
              className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-180')}
            />
          </button>
          {isExpanded && (
            <div className="bg-muted py-1">
              {item.children!.map(child => renderMenuItem(child, true))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={handleLinkClick}
        className={cn(
          'flex items-center gap-3 px-4 py-3 transition-colors',
          isChild && 'pl-12',
          isActive
            ? 'bg-morandi-gold/10 text-morandi-gold font-medium'
            : 'text-morandi-primary hover:bg-muted'
        )}
      >
        <Icon className="w-5 h-5" />
        <span>{item.label}</span>
      </Link>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent
        level={1}
        className="lg:hidden fixed top-0 left-0 bottom-0 right-auto w-72 max-w-[80vw] translate-x-0 translate-y-0 bg-background shadow-lg rounded-none rounded-r-xl p-0 gap-0 data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left"
      >
        {/* 頂部標題 */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border">
          <DialogTitle className="text-lg font-bold text-morandi-gold">{COMPANY_NAME}</DialogTitle>
        </div>

        {/* 選單內容 */}
        <div className="h-[calc(100%-65px)] overflow-y-auto">
          {/* 主選單 */}
          <nav className="py-2">
            {visibleMenuItems.map(item => renderMenuItem(item))}
            {visiblePersonalItems.map(item => renderMenuItem(item))}

            {/* 設定 */}
            <Link
              href="/settings"
              onClick={handleLinkClick}
              className={cn(
                'flex items-center gap-3 px-4 py-3 transition-colors',
                pathname === '/settings'
                  ? 'bg-morandi-gold/10 text-morandi-gold font-medium'
                  : 'text-morandi-primary hover:bg-muted'
              )}
            >
              <Settings className="w-5 h-5" />
              <span>{COMP_LAYOUT_LABELS.設定}</span>
            </Link>
          </nav>
        </div>
      </DialogContent>
    </Dialog>
  )
}
