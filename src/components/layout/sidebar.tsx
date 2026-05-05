'use client'

import {
  AddressBookTabs,
  Bank,
  BookOpenText,
  CalendarDots,
  CashRegister,
  CheckSquare as PhCheckSquare,
  Confetti,
  CurrencyCircleDollar,
  Dresser,
  FileCloud,
  House,
  Island,
  Lego,
  MapPinArea,
  Palette as PhPalette,
  ReadCvLogo,
  TipJar,
  User,
  UserCircleGear,
  UserSquare,
  UsersFour,
  Wallet as PhWallet,
  Wrench,
} from '@phosphor-icons/react'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWorkspaceFeatures } from '@/lib/permissions'
import { useMyCapabilities } from '@/lib/permissions/useMyCapabilities'
import {
  ChevronRight,
  ChevronDown,
  Home,
  MapPin,
  MapPinned,
  ShoppingCart,
  Users,
  CreditCard,
  Settings,
  Database,
  Building2,
  Wallet,
  HandCoins,
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
  CheckSquare,
  Archive,
  ClipboardList,
  Building,
  Palette,
  BookOpen,
  Megaphone,
  Mail,
  Shield,
  LineChart,
  Gamepad2,
  MessagesSquare,
  Route,
  Inbox,
  FolderOpen,
  Target,
  Landmark,
  Zap,
  FileEdit,
  MessageCircle,
  Sparkles,
  LayoutTemplate,
  Bot,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { COMP_LAYOUT_LABELS } from './constants/labels'

interface MenuItem {
  href: string
  label: string
  icon: React.ElementType
  children?: MenuItem[]
  requiredPermission?: string
}

const menuItems: MenuItem[] = [
  { href: '/dashboard', label: COMP_LAYOUT_LABELS.首頁, icon: House },
  {
    href: '/calendar',
    label: COMP_LAYOUT_LABELS.行事曆,
    icon: CalendarDots,
    requiredPermission: 'calendar',
  },
  {
    href: '/todos',
    label: COMP_LAYOUT_LABELS.待辦事項,
    icon: PhCheckSquare,
    requiredPermission: 'todos',
  },
  {
    href: '/tours',
    label: COMP_LAYOUT_LABELS.旅遊團,
    icon: MapPinArea,
    requiredPermission: 'tours',
  },
  {
    href: '/orders',
    label: COMP_LAYOUT_LABELS.訂單,
    icon: CashRegister,
    requiredPermission: 'orders',
  },
  {
    href: '/finance',
    label: COMP_LAYOUT_LABELS.財務系統,
    icon: CurrencyCircleDollar,
    requiredPermission: 'finance',
    children: [
      {
        href: '/finance/payments',
        label: COMP_LAYOUT_LABELS.收款管理,
        icon: PhWallet,
        requiredPermission: 'finance',
      },
      {
        href: '/finance/requests',
        label: COMP_LAYOUT_LABELS.請款管理,
        icon: HandCoins,
        requiredPermission: 'finance',
      },
      {
        href: '/finance/treasury/disbursement',
        label: COMP_LAYOUT_LABELS.出納管理,
        icon: Wallet,
        requiredPermission: 'finance',
      },

      {
        href: '/finance/reports',
        label: COMP_LAYOUT_LABELS.報表管理,
        icon: BarChart3,
        requiredPermission: 'finance',
      },
      {
        href: '/finance/settings',
        label: '財務設定',
        icon: Settings,
        requiredPermission: 'finance',
      },
    ],
  },
  {
    href: '/accounting',
    label: COMP_LAYOUT_LABELS.會計系統,
    icon: TipJar,
    requiredPermission: 'accounting',
    children: [
      {
        href: '/accounting/vouchers',
        label: COMP_LAYOUT_LABELS.傳票管理,
        icon: FileText,
        requiredPermission: 'accounting',
      },
      {
        href: '/accounting/accounts',
        label: COMP_LAYOUT_LABELS.科目管理,
        icon: BookOpen,
        requiredPermission: 'accounting',
      },
      {
        href: '/accounting/period-closing',
        label: COMP_LAYOUT_LABELS.期末結轉,
        icon: Calendar,
        requiredPermission: 'accounting',
      },
      {
        href: '/accounting/checks',
        label: COMP_LAYOUT_LABELS.票據管理,
        icon: FileCheck,
        requiredPermission: 'accounting',
      },
      {
        href: '/accounting/reports',
        label: COMP_LAYOUT_LABELS.會計報表,
        icon: BarChart3,
        requiredPermission: 'accounting',
      },
    ],
  },
  {
    href: '/visas',
    label: COMP_LAYOUT_LABELS.簽證管理,
    icon: ReadCvLogo,
    requiredPermission: 'visas',
  },
  {
    href: '/database',
    label: COMP_LAYOUT_LABELS.資料管理,
    icon: Dresser,
    requiredPermission: 'database',
    children: [
      // 顧客管理 - 付費功能（由 workspace_features 控制）
      {
        href: '/customers',
        label: COMP_LAYOUT_LABELS.顧客管理,
        icon: AddressBookTabs,
        requiredPermission: 'customers',
      },
      {
        href: '/database/attractions',
        label: COMP_LAYOUT_LABELS.旅遊資料庫,
        icon: Island,
        requiredPermission: 'database',
      },

      {
        href: '/database/suppliers',
        label: COMP_LAYOUT_LABELS.供應商管理,
        icon: Building2,
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
    href: '/hr',
    label: COMP_LAYOUT_LABELS.人資管理,
    icon: UserSquare,
    requiredPermission: 'hr',
  },
  {
    href: '/tenants',
    label: COMP_LAYOUT_LABELS.租戶管理,
    icon: UsersFour,
    requiredPermission: 'tenants',
  },
  {
    href: '/cis',
    label: '漫途 CIS',
    icon: PhPalette,
    requiredPermission: 'cis',
    children: [
      { href: '/cis', label: '客戶管理', icon: AddressBookTabs, requiredPermission: 'cis' },
      { href: '/cis/pricing', label: '衍生項目價目', icon: TipJar, requiredPermission: 'cis' },
    ],
  },
]

const personalToolItems: MenuItem[] = []

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const { isFeatureEnabled, enabledFeatures } = useWorkspaceFeatures()

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }
  const { canReadAnyInModule, has } = useMyCapabilities()
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

  // 權限過濾：純靠 capability + workspace_features
  // （個人偏好 menu 過濾已於 2026-05-02 砍除、William 拍板「以前砍掉的、要清乾淨」）
  const visibleMenuItems = useMemo(() => {
    const filterMenuByPermissions = (items: MenuItem[]): MenuItem[] => {
      if (!user) return items.filter(item => !item.requiredPermission)

      return items
        .map(item => {
          // 🔧 檢查租戶功能權限（workspace_features）
          if (item.requiredPermission) {
            if (!isFeatureEnabled(item.requiredPermission)) {
              return null
            }
          }

          // 2026-05-05 RestrictedFeature 整套砍除（William 拍板：保留路由以外都清乾淨）
          if (item.children) {
            const visibleChildren = filterMenuByPermissions(item.children)
            if (visibleChildren.length > 0) {
              return { ...item, children: visibleChildren }
            }
            return null
          }
          if (!item.requiredPermission) return item
          // /tenants 是 platform 路由、capability 是 platform.tenants.read（不在 'tenants' module）、
          // 用 platform.is_admin 守、跟 ModuleGuard 對齊
          if (item.href === '/tenants') {
            return has('platform.is_admin') ? item : null
          }
          // 模組層任一 capability：role_capabilities 中存在 ${module}.*.read 即顯示
          return canReadAnyInModule(item.requiredPermission) ? item : null
        })
        .filter((item): item is MenuItem => item !== null)
    }
    return filterMenuByPermissions(menuItems)
  }, [
    user?.id,
    user?.workspace_code,
    canReadAnyInModule,
    isFeatureEnabled,
    enabledFeatures,
  ])

  const visiblePersonalToolItems = useMemo(() => {
    return personalToolItems.filter(item => {
      if (!user) return !item.requiredPermission
      if (!item.requiredPermission) return true
      return canReadAnyInModule(item.requiredPermission)
    })
  }, [user?.id, canReadAnyInModule])

  // 渲染菜單項目
  const renderMenuItem = (item: MenuItem, isChild = false) => {
    const hasChildren = item.children && item.children.length > 0
    const isSubmenuExpanded = expandedMenus.includes(item.href)
    const active = is_active(item.href)

    if (hasChildren) {
      return (
        <li
          key={`${item.href}-${item.label}`}
          data-tutorial={`nav-${item.href.replace(/^\//, '').split('/')[0]}`}
        >
          {/* 父項目：flex layout、icon 在固定 w-16 wrapper、不隨 sidebar 寬度晃動
              active border 用 absolute、不佔 3px 寬、避免 icon 偏離水平中心 */}
          <div
            className={cn(
              'relative w-full flex items-center h-11 text-sm text-morandi-secondary cursor-pointer',
              'hover:bg-morandi-gold/5 hover:text-morandi-gold',
              active && 'bg-morandi-gold/10 text-morandi-gold'
            )}
            onClick={() => toggleSubmenu(item.href)}
          >
            {active && (
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-morandi-gold" />
            )}
            <div className="w-16 flex justify-center shrink-0">
              <item.icon size={22} weight="duotone" />
            </div>
            {showExpanded && (
              <>
                <span className="flex-1 text-left whitespace-nowrap overflow-hidden">
                  {item.label}
                </span>
                <div className="px-3">
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

    // 沒有子項目的菜單項：flex layout、icon 固定不晃
    return (
      <li
        key={`${item.href}-${item.label}`}
        data-tutorial={`nav-${item.href.replace(/^\//, '').split('/')[0]}`}
      >
        <Link
          href={item.href}
          prefetch={false}
          onClick={closeSidebar}
          className={cn(
            'relative w-full flex items-center h-11 text-sm text-morandi-secondary',
            'hover:bg-morandi-gold/5 hover:text-morandi-gold',
            active && 'bg-morandi-gold/10 text-morandi-gold'
          )}
        >
          {active && (
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-morandi-gold" />
          )}
          <div className={cn('w-16 flex justify-center shrink-0', isChild && 'pl-4')}>
            <item.icon size={isChild ? 16 : 22} weight="duotone" />
          </div>
          {showExpanded && (
            <span className="flex-1 text-left whitespace-nowrap overflow-hidden">
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
      {/* Logo區域：flex layout、Logo 永遠在 w-10 + 邊距固定位置、不隨 sidebar 寬度晃動 */}
      <div className="shrink-0 border-b border-border">
        <div className="h-18 flex items-center">
          <div className="w-16 flex justify-center shrink-0">
            <div className="w-10 h-10 rounded-lg bg-morandi-gold flex items-center justify-center shadow-sm opacity-90">
              <span className="text-white font-semibold text-lg">V</span>
            </div>
          </div>
          {showExpanded && (
            <div className="text-xl font-bold text-morandi-primary whitespace-nowrap overflow-hidden">
              {user?.workspace_code || 'V'}
            </div>
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
            icon: Wrench,
          })}
        </ul>
      </nav>

      {/* 底部使用者區：名字 + 登出（William 2026-05-02 拍板） */}
      {user && (
        <div className="shrink-0 border-t border-border">
          <div className="h-14 flex items-center">
            <div className="w-16 flex justify-center shrink-0">
              <User size={22} weight="duotone" className="text-morandi-secondary" />
            </div>
            {showExpanded && (
              <>
                <div className="flex-1 text-sm text-morandi-primary whitespace-nowrap overflow-hidden">
                  {user.display_name || user.chinese_name || user.english_name || '使用者'}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title={COMP_LAYOUT_LABELS?.LOGOUT || '登出'}
                  className="px-3 py-2 text-morandi-secondary hover:text-morandi-red transition-colors"
                >
                  <LogOut size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
