'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronRight,
  ChevronDown,
  Home,
  MapPin,
  ShoppingCart,
  Users,
  CreditCard,
  Settings,
  Database,
  Building2,
  Wallet,
  Clock,
  UserCog,
  BarChart3,
  Calendar,
  TrendingDown,
  FileCheck,
  FileSignature,
  FileText,
  CircleDot,
  Wifi,
  FileSpreadsheet,
  ImageIcon,
  Bus,
  CheckSquare,
  Archive,
  ClipboardList,
  Building,
  Palette,
  BookOpen,
  Megaphone,
  Mail,
  Truck,
  LineChart,
  Gamepad2,
  MessagesSquare,
  Route,
  Inbox,
  FolderOpen,
  Target,
  Landmark,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { isMenuItemHidden } from '@/lib/constants/menu-items'
import { isFeatureAvailable, RestrictedFeature } from '@/lib/feature-restrictions'
import { COMP_LAYOUT_LABELS } from './constants/labels'

interface MenuItem {
  href: string
  label: string
  icon: React.ElementType
  children?: MenuItem[]
  requiredPermission?: string
  restrictedFeature?: RestrictedFeature // 受限功能（非 TP/TC 不可見）
}

const menuItems: MenuItem[] = [
  { href: '/dashboard', label: COMP_LAYOUT_LABELS.首頁, icon: Home },
  {
    href: '/calendar',
    label: COMP_LAYOUT_LABELS.行事曆,
    icon: Calendar,
    requiredPermission: 'calendar',
  },
  {
    href: '/workspace',
    label: COMP_LAYOUT_LABELS.工作空間,
    icon: Building2,
    requiredPermission: 'workspace',
  },
  // 郵件系統暫時隱藏（目前使用 Google Workspace）
  // { href: '/mail', label: '郵件', icon: Mail, requiredPermission: 'workspace' },
  // 旅伴通訊已整合到工作頻道中，此路由暫時隱藏
  // { href: '/traveler-chat', label: '旅伴通訊', icon: MessageCircle, requiredPermission: 'workspace' },
  {
    href: '/todos',
    label: COMP_LAYOUT_LABELS.待辦事項,
    icon: CheckSquare,
    requiredPermission: 'todos',
  },
  { href: '/tours', label: COMP_LAYOUT_LABELS.旅遊團, icon: MapPin, requiredPermission: 'tours' },
  {
    href: '/orders',
    label: COMP_LAYOUT_LABELS.訂單,
    icon: ShoppingCart,
    requiredPermission: 'orders',
  },
  {
    href: '/itinerary',
    label: COMP_LAYOUT_LABELS.行程管理,
    icon: Route,
    requiredPermission: 'itinerary',
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
      // { href: '/erp-accounting/vouchers', label: COMP_LAYOUT_LABELS.會計傳票, icon: FileText, requiredPermission: 'vouchers' }, // V2: 會計模組已移除
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
  {
    href: '/visas',
    label: COMP_LAYOUT_LABELS.簽證管理,
    icon: FileCheck,
    requiredPermission: 'visas',
  },
  {
    href: '/design',
    label: COMP_LAYOUT_LABELS.設計,
    icon: Palette,
    requiredPermission: 'design',
    children: [
      {
        href: '/brochures',
        label: COMP_LAYOUT_LABELS.手冊,
        icon: BookOpen,
        requiredPermission: 'design',
      },
      {
        href: '/marketing',
        label: COMP_LAYOUT_LABELS.行銷素材,
        icon: Megaphone,
        requiredPermission: 'design',
      },
    ],
  },
  {
    href: '/office',
    label: COMP_LAYOUT_LABELS.文件,
    icon: FileSpreadsheet,
    requiredPermission: 'office',
    children: [
      {
        href: '/office',
        label: COMP_LAYOUT_LABELS.文件列表,
        icon: FileSpreadsheet,
        requiredPermission: 'office',
      },
      {
        href: '/office/editor',
        label: COMP_LAYOUT_LABELS.新增文件,
        icon: FileSpreadsheet,
        requiredPermission: 'office',
      },
    ],
  },
  // 合約管理和確認單管理已整合到團的操作中，不需要獨立入口
  // { href: '/contracts', label: '合約管理', icon: FileSignature, requiredPermission: 'contracts' },
  // { href: '/confirmations', label: '確認單管理', icon: CircleDot, requiredPermission: 'confirmations' },
  {
    href: '/database',
    label: COMP_LAYOUT_LABELS.資料管理,
    icon: Database,
    requiredPermission: 'database',
    children: [
      {
        href: '/customers',
        label: COMP_LAYOUT_LABELS.顧客管理,
        icon: Users,
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
      {
        href: '/database/archive-management',
        label: COMP_LAYOUT_LABELS.封存管理,
        icon: Archive,
        requiredPermission: 'database',
      },
    ],
  },
  {
    href: '/local',
    label: COMP_LAYOUT_LABELS.Local,
    icon: Truck,
    children: [
      { href: '/local', label: COMP_LAYOUT_LABELS.Local, icon: Inbox },
      { href: '/local/requests', label: COMP_LAYOUT_LABELS.委託收件匣, icon: ClipboardList },
      { href: '/local/cases', label: COMP_LAYOUT_LABELS.案件列表, icon: FolderOpen },
    ],
  },
  { href: '/war-room', label: '作戰會議室', icon: Target, requiredPermission: 'super_admin_only' },
  { href: '/hr', label: COMP_LAYOUT_LABELS.人資管理, icon: UserCog, requiredPermission: 'hr' },
  {
    href: '/tenants',
    label: COMP_LAYOUT_LABELS.租戶管理,
    icon: Building,
    requiredPermission: 'super_admin_only',
  },
  {
    href: '/scheduling',
    label: COMP_LAYOUT_LABELS.資源調度,
    icon: Calendar,
    requiredPermission: 'hr',
  },
  {
    href: '/database/fleet',
    label: COMP_LAYOUT_LABELS.車隊管理,
    icon: Bus,
    requiredPermission: 'hr',
  },
  // { href: '/esims', label: COMP_LAYOUT_LABELS.網卡管理, icon: Wifi, requiredPermission: 'hr', restrictedFeature: 'esim' },
]

// 供應商專用選單（車行、領隊公司）
const supplierMenuItems: MenuItem[] = [
  { href: '/dashboard', label: COMP_LAYOUT_LABELS.首頁, icon: Home },
  { href: '/supplier/requests', label: COMP_LAYOUT_LABELS.需求收件匣, icon: ClipboardList },
  { href: '/supplier/dispatch', label: COMP_LAYOUT_LABELS.派單管理, icon: Truck }, // 車行專用
  { href: '/database/fleet', label: COMP_LAYOUT_LABELS.車隊管理, icon: Bus }, // 車行專用
]

const personalToolItems: MenuItem[] = []

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false) // 點擊固定展開
  const [isHovered, setIsHovered] = useState(false) // 滑鼠懸停暫時展開
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])

  // 實際顯示狀態：固定展開 或 懸停展開
  const showExpanded = isExpanded || isHovered

  useEffect(() => {
    setMounted(true)
  }, [])

  // 切換側邊欄展開/收起
  const toggleSidebar = () => {
    setIsExpanded(prev => !prev)
    // 收起時也收起所有子選單
    if (isExpanded) {
      setExpandedMenus([])
    }
  }

  // 關閉側邊欄（跳轉時使用）
  const closeSidebar = () => {
    setIsExpanded(false)
    setExpandedMenus([])
  }

  // 切換子選單展開/收起
  const toggleSubmenu = (href: string) => {
    // 如果側邊欄是收起的（非固定展開），先固定展開再展開子選單
    if (!isExpanded && !isHovered) {
      setIsExpanded(true)
      setExpandedMenus([href])
      return
    }
    setExpandedMenus(prev => (prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]))
  }

  // 滑鼠進入/離開側邊欄
  const handleMouseEnter = () => {
    if (!isExpanded) {
      setIsHovered(true)
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    // 離開時收起子選單（如果不是固定展開狀態）
    if (!isExpanded) {
      setExpandedMenus([])
    }
  }

  const is_active = (href: string) => {
    if (!mounted) return false
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  // 權限過濾（使用 useMemo 避免每次渲染時建立新陣列）
  const userPermissions = useMemo(() => user?.permissions || [], [user?.permissions])
  const userRoles = useMemo(() => user?.roles || [], [user?.roles])
  const hiddenMenuItems = useMemo(() => user?.hidden_menu_items || [], [user?.hidden_menu_items])
  const preferredFeatures = useMemo(
    () => user?.preferred_features || [],
    [user?.preferred_features]
  )

  const isSuperAdmin =
    userPermissions.includes('super_admin') ||
    userPermissions.includes('admin') ||
    userPermissions.includes('*') ||
    userRoles.includes('super_admin')

  // 檢查是否為供應商 workspace
  const isSupplierWorkspace =
    user?.workspace_type === 'vehicle_supplier' || user?.workspace_type === 'guide_supplier'
  const isVehicleSupplier = user?.workspace_type === 'vehicle_supplier'

  const visibleMenuItems = useMemo(() => {
    const workspaceCode = user?.workspace_code

    // 供應商使用簡化選單
    if (isSupplierWorkspace) {
      return supplierMenuItems.filter(item => {
        // 車隊管理只給車行看
        return true
      })
    }

    const filterMenuByPermissions = (items: MenuItem[]): MenuItem[] => {
      if (!user) return items.filter(item => !item.requiredPermission)

      return items
        .map(item => {
          if (isMenuItemHidden(item.href, hiddenMenuItems)) return null
          // 檢查功能限制（非 TP/TC 不可見）
          if (
            item.restrictedFeature &&
            !isFeatureAvailable(item.restrictedFeature, workspaceCode)
          ) {
            return null
          }
          if (!isSuperAdmin && preferredFeatures.length > 0 && item.requiredPermission) {
            if (!preferredFeatures.includes(item.requiredPermission)) return null
          }
          if (item.children) {
            const visibleChildren = filterMenuByPermissions(item.children)
            if (visibleChildren.length > 0 || isSuperAdmin) {
              return { ...item, children: visibleChildren }
            }
            return null
          }
          if (!item.requiredPermission) return item
          if (isSuperAdmin) return item
          return userPermissions.includes(item.requiredPermission) ? item : null
        })
        .filter((item): item is MenuItem => item !== null)
    }
    return filterMenuByPermissions(menuItems)
  }, [
    user?.id,
    user?.workspace_code,
    user?.workspace_type,
    isSupplierWorkspace,
    isVehicleSupplier,
    isSuperAdmin,
    preferredFeatures,
    hiddenMenuItems,
    userPermissions,
  ])

  const visiblePersonalToolItems = useMemo(() => {
    // 供應商不顯示個人工具
    if (isSupplierWorkspace) return []

    // 簡化版篩選（個人工具不需要 restrictedFeature 或 preferredFeatures 檢查）
    return personalToolItems.filter(item => {
      if (!user) return !item.requiredPermission
      if (isMenuItemHidden(item.href, hiddenMenuItems)) return false
      if (!item.requiredPermission) return true
      if (isSuperAdmin) return true
      return userPermissions.includes(item.requiredPermission)
    })
  }, [user?.id, isSupplierWorkspace, isSuperAdmin, hiddenMenuItems, userPermissions])

  // 渲染菜單項目
  const renderMenuItem = (item: MenuItem, isChild = false) => {
    const hasChildren = item.children && item.children.length > 0
    const isSubmenuExpanded = expandedMenus.includes(item.href)
    const active = is_active(item.href)

    if (hasChildren) {
      return (
        <li key={item.href}>
          {/* 父項目 */}
          <div
            className={cn(
              'w-full relative h-9 text-xs text-morandi-secondary transition-all duration-200 cursor-pointer',
              'hover:bg-morandi-gold/5 hover:text-morandi-gold',
              active && 'bg-morandi-gold/10 text-morandi-gold border-l-3 border-morandi-gold'
            )}
            onClick={() => toggleSubmenu(item.href)}
          >
            <item.icon size={18} className="absolute left-5 top-1/2 -translate-y-1/2" />
            {showExpanded && (
              <>
                <span className="ml-12 block text-left leading-9">{item.label}</span>
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isSubmenuExpanded ? (
                    <ChevronDown size={14} className="text-morandi-gold" />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </div>
              </>
            )}
          </div>

          {/* 子項目 - 展開在下方 */}
          {showExpanded && isSubmenuExpanded && item.children && (
            <ul className="bg-morandi-background/30">
              {item.children.map(child => renderMenuItem(child, true))}
            </ul>
          )}
        </li>
      )
    }

    // 沒有子項目的菜單項
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          prefetch={false}
          onClick={closeSidebar}
          className={cn(
            'w-full relative block h-9 text-xs text-morandi-secondary transition-all duration-200',
            'hover:bg-morandi-gold/5 hover:text-morandi-gold',
            active && 'bg-morandi-gold/10 text-morandi-gold border-l-3 border-morandi-gold',
            isChild && 'pl-4'
          )}
        >
          <item.icon
            size={isChild ? 14 : 18}
            className={cn('absolute top-1/2 -translate-y-1/2', isChild ? 'left-8' : 'left-5')}
          />
          {showExpanded && (
            <span className={cn('block text-left leading-9', isChild ? 'ml-14' : 'ml-12')}>
              {item.label}
            </span>
          )}
        </Link>
      </li>
    )
  }

  return (
    <div
      className={cn(
        'fixed left-0 top-0 h-screen bg-morandi-container border-r-2 border-morandi-gold/20 z-30 transition-[width] duration-300 flex flex-col print:hidden',
        'hidden lg:flex',
        showExpanded ? 'w-[180px]' : 'w-16'
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Logo區域 */}
      <div className="shrink-0 border-b border-border mx-3">
        <div className="h-18 flex items-center relative">
          <div className="absolute left-5 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-morandi-gold flex items-center justify-center shadow-sm flex-shrink-0 opacity-90">
            <span className="text-white font-semibold text-lg">V</span>
          </div>
          {showExpanded && (
            <div className="ml-[58px] text-xl font-bold text-morandi-primary">CORNER</div>
          )}
        </div>
      </div>

      {/* 統一導航選單 */}
      <nav className="flex-1 py-4 overflow-y-auto min-h-0">
        <ul className="space-y-px">
          {visibleMenuItems.map(item => renderMenuItem(item))}
          {visiblePersonalToolItems.map(item => renderMenuItem(item))}

          {/* 設定 */}
          {renderMenuItem({
            href: '/settings',
            label: COMP_LAYOUT_LABELS.設定,
            icon: Settings,
            children: [
              { href: '/settings', label: COMP_LAYOUT_LABELS.個人設定, icon: Settings },
              ...(isSuperAdmin
                ? [
                    {
                      href: '/settings/company',
                      label: COMP_LAYOUT_LABELS.公司資訊,
                      icon: Building2,
                    },
                  ]
                : []),
            ],
          })}
        </ul>
      </nav>
    </div>
  )
}
