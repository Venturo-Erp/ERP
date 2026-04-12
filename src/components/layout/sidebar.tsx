'use client'

import {
  AddressBookTabs,
  Bank,
  BookOpenText,
  CalendarDots,
  CashRegister,
  ChatDots,
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
  Robot,
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
  { href: '/dashboard', label: COMP_LAYOUT_LABELS.首頁, icon: House },
  {
    href: '/calendar',
    label: COMP_LAYOUT_LABELS.行事曆,
    icon: CalendarDots,
    requiredPermission: 'calendar',
  },
  {
    href: '/channel',
    label: COMP_LAYOUT_LABELS.頻道,
    icon: ChatDots,
    requiredPermission: 'workspace', // 對應 workspace_features.workspace
  },
  // 郵件系統暫時隱藏（目前使用 Google Workspace）
  // { href: '/mail', label: '郵件', icon: Mail, requiredPermission: 'workspace' },
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
        href: '/finance/travel-invoice',
        label: COMP_LAYOUT_LABELS.代轉發票,
        icon: FileText,
        requiredPermission: 'finance',
        restrictedFeature: 'travel_invoices',
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
        href: '/accounting/opening-balances',
        label: '期初餘額',
        icon: FileEdit,
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
    href: '/design',
    label: COMP_LAYOUT_LABELS.設計,
    icon: PhPalette,
    requiredPermission: 'design',
    children: [
      {
        href: '/brochures',
        label: COMP_LAYOUT_LABELS.手冊,
        icon: BookOpenText,
        requiredPermission: 'design',
      },
      {
        href: '/marketing',
        label: COMP_LAYOUT_LABELS.行銷素材,
        icon: Confetti,
        requiredPermission: 'design',
      },
    ],
  },
  {
    href: '/office',
    label: COMP_LAYOUT_LABELS.文件,
    icon: FileCloud,
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

      // 運價表 - 暫時移除，之後整合
      // {
      //   href: '/database/transportation-rates',
      //   label: COMP_LAYOUT_LABELS.車資管理,
      //   icon: Bus,
      //   requiredPermission: 'database',
      // },
      {
        href: '/database/suppliers',
        label: COMP_LAYOUT_LABELS.供應商管理,
        icon: Building2,
        requiredPermission: 'database',
      },
      // 領隊資料 - 移到 HR 分頁
      // {
      //   href: '/database/tour-leaders',
      //   label: COMP_LAYOUT_LABELS.領隊資料,
      //   icon: Users,
      //   requiredPermission: 'database',
      // },
      // 公司資源 - 已整合到設定
      // {
      //   href: '/database/company-assets',
      //   label: COMP_LAYOUT_LABELS.公司資源管理,
      //   icon: ImageIcon,
      //   requiredPermission: 'database',
      // },
      {
        href: '/database/archive-management',
        label: COMP_LAYOUT_LABELS.封存管理,
        icon: Archive,
        requiredPermission: 'database',
      },
    ],
  },
  // Local 管理 - 威廉專屬，已移除
  // {
  //   href: '/local',
  //   label: COMP_LAYOUT_LABELS.Local,
  //   icon: Truck,
  //   children: [
  //     { href: '/local', label: COMP_LAYOUT_LABELS.Local, icon: Inbox },
  //     { href: '/local/requests', label: COMP_LAYOUT_LABELS.委託收件匣, icon: ClipboardList },
  //     { href: '/local/cases', label: COMP_LAYOUT_LABELS.案件列表, icon: FolderOpen },
  //   ],
  // },
  { href: '/war-room', label: '作戰會議室', icon: Target, requiredPermission: 'war_room' },
  {
    href: '/hr',
    label: COMP_LAYOUT_LABELS.人資管理,
    icon: UserSquare,
    requiredPermission: 'hr',
    children: [
      // 員工自助
      { href: '/hr/my-attendance', label: '我的人資', icon: User },
      // 管理員功能（每個頁面內部用 tabs 切換相關子功能）
      { href: '/hr', label: '員工管理', icon: Users, requiredPermission: 'hr' },
      { href: '/hr/attendance', label: '出勤與請假', icon: Clock, requiredPermission: 'hr' },
      { href: '/hr/payroll', label: '薪資管理', icon: Wallet, requiredPermission: 'hr' },
      { href: '/hr/settings', label: '人資設定', icon: Settings, requiredPermission: 'hr' },
    ],
  },
  {
    href: '/customized-tours',
    label: '客製化管理',
    icon: Lego,
    requiredPermission: 'customized',
    children: [
      {
        href: '/customized-tours',
        label: '客製化行程',
        icon: LayoutTemplate,
        requiredPermission: 'customized',
      },
      { href: '/inquiries', label: '詢價單管理', icon: Inbox, requiredPermission: 'customized' },
    ],
  },
  {
    href: '/tenants',
    label: COMP_LAYOUT_LABELS.租戶管理,
    icon: UsersFour,
    requiredPermission: 'tenants',
  },
  // 資源調度 - 威廉專屬
  // {
  //   href: '/scheduling',
  //   label: COMP_LAYOUT_LABELS.資源調度,
  //   icon: Calendar,
  //   requiredPermission: 'hr',
  // },
  // 車隊管理 - 只有車行使用（在租戶選單中配置）
  // {
  //   href: '/database/fleet',
  //   label: COMP_LAYOUT_LABELS.車隊管理,
  //   icon: Bus,
  //   requiredPermission: 'hr',
  // },
  // { href: '/esims', label: COMP_LAYOUT_LABELS.網卡管理, icon: Wifi, requiredPermission: 'hr', restrictedFeature: 'esim' },
]

// ===== 按租戶類型的選單配置 =====

// Local/DMC 選單（地接社）
const localMenuItems: MenuItem[] = [
  { href: '/dashboard', label: COMP_LAYOUT_LABELS.首頁, icon: House },
  { href: '/tours', label: COMP_LAYOUT_LABELS.旅遊團, icon: MapPinArea }, // 包含「收到的委託」分頁
  {
    href: '/finance',
    label: COMP_LAYOUT_LABELS.財務系統,
    icon: CurrencyCircleDollar,
    children: [
      { href: '/finance/payments', label: COMP_LAYOUT_LABELS.收款管理, icon: PhWallet },
      { href: '/finance/requests', label: COMP_LAYOUT_LABELS.請款管理, icon: HandCoins },
      { href: '/finance/settings', label: '財務設定', icon: Wrench },
    ],
  },
  { href: '/hr', label: COMP_LAYOUT_LABELS.人資管理, icon: UserSquare },
  { href: '/settings', label: COMP_LAYOUT_LABELS.設定, icon: Wrench },
]

// 車行選單（遊覽車公司）
const transportMenuItems: MenuItem[] = [
  { href: '/dashboard', label: COMP_LAYOUT_LABELS.首頁, icon: House },
  { href: '/supplier/trips', label: '車趟管理', icon: Truck }, // 新的車趟管理頁面
  { href: '/database/fleet', label: COMP_LAYOUT_LABELS.車隊管理, icon: Bus },
  {
    href: '/finance',
    label: COMP_LAYOUT_LABELS.財務系統,
    icon: CurrencyCircleDollar,
    children: [
      { href: '/finance/payments', label: COMP_LAYOUT_LABELS.收款管理, icon: PhWallet },
      { href: '/finance/requests', label: COMP_LAYOUT_LABELS.請款管理, icon: HandCoins },
      { href: '/finance/settings', label: '財務設定', icon: Wrench },
    ],
  },
  { href: '/hr', label: COMP_LAYOUT_LABELS.人資管理, icon: UserSquare },
  { href: '/settings', label: COMP_LAYOUT_LABELS.設定, icon: Wrench },
]

// 旅行社完整選單（使用上面的 menuItems）

const personalToolItems: MenuItem[] = []

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { isFeatureEnabled, enabledFeatures } = useWorkspaceFeatures()
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
  const hiddenMenuItems = useMemo(() => user?.hidden_menu_items || [], [user?.hidden_menu_items])
  const preferredFeatures = useMemo(
    () => user?.preferred_features || [],
    [user?.preferred_features]
  )

  // 新系統：使用 store.isAdmin
  const { isAdmin } = useAuthStore()

  // 判斷租戶類型
  const workspaceType = user?.workspace_type
  const isLocal = workspaceType === 'dmc' || workspaceType === 'guide_supplier'
  const isTransport = workspaceType === 'transportation' || workspaceType === 'vehicle_supplier'
  const isTravelAgency = workspaceType === 'travel_agency' || (!isLocal && !isTransport)

  const visibleMenuItems = useMemo(() => {
    const workspaceCode = user?.workspace_code

    // Super Admin 看到所有功能（開發需要）
    // 不受租戶類型限制
    if (isAdmin) {
      // 直接進入完整選單過濾邏輯
    }
    // 車行使用簡化選單（車趟管理為主）
    else if (isTransport) {
      return transportMenuItems
    }
    // Local 和旅行社使用完整選單
    // （Local 跟旅行社差不多，不需要簡化）

    const filterMenuByPermissions = (items: MenuItem[]): MenuItem[] => {
      if (!user) return items.filter(item => !item.requiredPermission)

      return items
        .map(item => {
          if (isMenuItemHidden(item.href, hiddenMenuItems)) return null

          // 🔧 檢查租戶功能權限（workspace_features）
          if (item.requiredPermission) {
            if (!isFeatureEnabled(item.requiredPermission)) {
              return null
            }
          }

          // 檢查功能限制（非 TP/TC 不可見）
          if (
            item.restrictedFeature &&
            !isFeatureAvailable(item.restrictedFeature, workspaceCode)
          ) {
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
          // '*' 代表擁有所有權限
          if (isAdmin) return item
          // 精確比對或前綴比對（例如 requiredPermission='tours'，權限有 'tours:overview' 也算符合）
          const perm = item.requiredPermission
          return userPermissions.some(p => p === perm || p.startsWith(`${perm}:`)) ? item : null
        })
        .filter((item): item is MenuItem => item !== null)
    }
    return filterMenuByPermissions(menuItems)
  }, [
    user?.id,
    user?.workspace_code,
    user?.workspace_type,
    isLocal,
    isTransport,
    isAdmin,
    preferredFeatures,
    hiddenMenuItems,
    userPermissions,
    isFeatureEnabled,
    enabledFeatures,
  ])

  const visiblePersonalToolItems = useMemo(() => {
    // 供應商（Local/車行）不顯示個人工具
    if (isLocal || isTransport) return []

    // 簡化版篩選（個人工具不需要 restrictedFeature 或 preferredFeatures 檢查）
    return personalToolItems.filter(item => {
      if (!user) return !item.requiredPermission
      if (isMenuItemHidden(item.href, hiddenMenuItems)) return false
      if (!item.requiredPermission) return true
      if (isAdmin) return true
      const perm = item.requiredPermission
      return userPermissions.some(p => p === perm || p.startsWith(`${perm}:`))
    })
  }, [user?.id, isLocal, isTransport, isAdmin, hiddenMenuItems, userPermissions])

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
          {/* 父項目 */}
          <div
            className={cn(
              'w-full relative h-11 text-sm text-morandi-secondary transition-all duration-200 cursor-pointer',
              'hover:bg-morandi-gold/5 hover:text-morandi-gold',
              active && 'bg-morandi-gold/10 text-morandi-gold border-l-3 border-morandi-gold'
            )}
            onClick={() => toggleSubmenu(item.href)}
          >
            <item.icon
              size={22}
              weight="duotone"
              className={cn(
                'absolute top-1/2 -translate-y-1/2',
                showExpanded ? 'left-4' : 'left-1/2 -translate-x-1/2'
              )}
            />
            {showExpanded && (
              <>
                <span className="ml-12 block text-left leading-11">{item.label}</span>
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
      <li
        key={`${item.href}-${item.label}`}
        data-tutorial={`nav-${item.href.replace(/^\//, '').split('/')[0]}`}
      >
        <Link
          href={item.href}
          prefetch={false}
          onClick={closeSidebar}
          className={cn(
            'w-full relative block h-11 text-sm text-morandi-secondary transition-all duration-200',
            'hover:bg-morandi-gold/5 hover:text-morandi-gold',
            active && 'bg-morandi-gold/10 text-morandi-gold border-l-3 border-morandi-gold',
            isChild && 'pl-4'
          )}
        >
          <item.icon
            size={isChild ? 16 : 22}
            weight="duotone"
            className={cn(
              'absolute top-1/2 -translate-y-1/2',
              showExpanded ? (isChild ? 'left-8' : 'left-4') : 'left-1/2 -translate-x-1/2'
            )}
          />
          {showExpanded && (
            <span className={cn('block text-left leading-11', isChild ? 'ml-14' : 'ml-12')}>
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
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-morandi-gold flex items-center justify-center shadow-sm flex-shrink-0 opacity-90',
              showExpanded ? 'left-3' : 'left-1/2 -translate-x-1/2'
            )}
          >
            <span className="text-white font-semibold text-lg">V</span>
          </div>
          {showExpanded && (
            <div className="ml-[58px] text-xl font-bold text-morandi-primary">
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

          {/* AI & 機器人管理（需付費功能 ai_bot 開啟） */}
          {isFeatureEnabled('ai_bot') &&
            renderMenuItem({
              href: '/ai-bot',
              label: 'AI & 機器人',
              icon: Robot,
            })}

          {/* 設定 */}
          {renderMenuItem({
            href: '/settings',
            label: COMP_LAYOUT_LABELS.設定,
            icon: Wrench,
          })}
        </ul>
      </nav>
    </div>
  )
}
