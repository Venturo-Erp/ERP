'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  Home,
  Search,
  ClipboardList,
  LayoutGrid,
  User,
  MapPin,
  ShoppingCart,
  Users,
  CreditCard,
  FileText,
  Calendar,
  Stamp,
  FileCheck,
  Hotel,
  Truck,
  MapPinned,
  UserCheck,
  X,
  CheckCircle,
  Palette,
  FileSpreadsheet,
} from 'lucide-react'
import { MOBILE_LABELS } from './constants/labels'
import { MOBILE_NAV_LABELS } from './constants/labels'

// 底部導航項目
const NAV_ITEMS = [
  { id: 'home', icon: Home, label: MOBILE_NAV_LABELS.HOME, href: '/m' },
  { id: 'search', icon: Search, label: MOBILE_NAV_LABELS.SEARCH, href: '/m/search' },
  { id: 'todos', icon: ClipboardList, label: MOBILE_NAV_LABELS.TODO, href: '/m/todos' },
  { id: 'workbench', icon: LayoutGrid, label: MOBILE_NAV_LABELS.WORKSPACE, href: '/m/workbench' },
  { id: 'profile', icon: User, label: MOBILE_NAV_LABELS.MY, href: '/m/profile' },
]

// 工作台功能分類
const WORKBENCH_CATEGORIES = [
  {
    title: MOBILE_NAV_LABELS.COMMON_FEATURES,
    items: [
      { icon: MapPin, label: MOBILE_NAV_LABELS.TOURS, href: '/m/tours', color: 'text-status-info' },
      {
        icon: ShoppingCart,
        label: MOBILE_NAV_LABELS.ORDERS,
        href: '/m/orders',
        color: 'text-morandi-green',
      },
      {
        icon: Users,
        label: MOBILE_NAV_LABELS.MEMBERS,
        href: '/m/members',
        color: 'text-morandi-secondary',
      },
      {
        icon: CheckCircle,
        label: MOBILE_NAV_LABELS.CHECK_IN,
        href: '/m/checkin',
        color: 'text-status-warning',
      },
    ],
  },
  {
    title: MOBILE_NAV_LABELS.FINANCE,
    items: [
      {
        icon: CreditCard,
        label: MOBILE_NAV_LABELS.PAYMENT_REQUEST,
        href: '/m/payments',
        color: 'text-morandi-green',
      },
      {
        icon: FileText,
        label: MOBILE_NAV_LABELS.TREASURY,
        href: '/m/treasury',
        color: 'text-status-info',
      },
      {
        icon: FileCheck,
        label: MOBILE_NAV_LABELS.RECEIPT,
        href: '/m/receipts',
        color: 'text-morandi-green',
      },
    ],
  },
  {
    title: MOBILE_NAV_LABELS.ADMIN,
    items: [
      {
        icon: Calendar,
        label: MOBILE_NAV_LABELS.CALENDAR,
        href: '/calendar',
        color: 'text-morandi-red',
      },
      { icon: Stamp, label: MOBILE_NAV_LABELS.VISA, href: '/m/visas', color: 'text-morandi-gold' },
      { icon: Palette, label: MOBILE_NAV_LABELS.DESIGN, href: '/design', color: 'text-cat-indigo' },
      {
        icon: FileSpreadsheet,
        label: MOBILE_NAV_LABELS.DOCUMENTS,
        href: '/office',
        color: 'text-morandi-red',
      },
      {
        icon: Calendar,
        label: MOBILE_NAV_LABELS.SCHEDULING,
        href: '/scheduling',
        color: 'text-status-info',
      },
    ],
  },
  {
    title: MOBILE_NAV_LABELS.DATABASE,
    items: [
      {
        icon: Hotel,
        label: MOBILE_NAV_LABELS.HOTELS,
        href: '/database/hotels',
        color: 'text-cat-purple',
      },
      {
        icon: Truck,
        label: MOBILE_NAV_LABELS.SUPPLIERS,
        href: '/database/suppliers',
        color: 'text-morandi-secondary',
      },
      {
        icon: MapPinned,
        label: MOBILE_NAV_LABELS.ATTRACTIONS,
        href: '/database/attractions',
        color: 'text-morandi-green',
      },
      {
        icon: UserCheck,
        label: MOBILE_NAV_LABELS.LEADERS,
        href: '/database/tour-leaders',
        color: 'text-cat-pink',
      },
    ],
  },
]

export function MobileNav() {
  const pathname = usePathname()
  const [showWorkbench, setShowWorkbench] = useState(false)

  const isActive = (href: string) => {
    if (href === '/m') return pathname === '/m'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* 底部導航欄 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-pb">
        <div className="flex items-center justify-around h-16 px-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = isActive(item.href)

            if (item.id === 'workbench') {
              return (
                <button
                  key={item.id}
                  onClick={() => setShowWorkbench(true)}
                  className={cn(
                    'flex flex-col items-center justify-center flex-1 py-2 transition-colors',
                    'text-morandi-secondary hover:text-morandi-primary'
                  )}
                >
                  <Icon size={22} className="stroke-[1.5]" />
                  <span className="text-[10px] mt-1 font-medium">{item.label}</span>
                </button>
              )
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 py-2 transition-colors',
                  active ? 'text-morandi-gold' : 'text-morandi-secondary hover:text-morandi-primary'
                )}
              >
                <Icon size={22} className={active ? 'stroke-[2]' : 'stroke-[1.5]'} />
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* 工作台彈出面板 - 使用 Dialog 作為底部抽屜 */}
      <Dialog open={showWorkbench} onOpenChange={setShowWorkbench}>
        <DialogContent
          level={1}
          className="fixed bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0 max-w-none w-full rounded-t-2xl rounded-b-none max-h-[80vh] overflow-auto p-0 data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom"
        >
          {/* 標題列 */}
          <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-morandi-primary">{MOBILE_LABELS.LABEL_6263}</h2>
            <button
              onClick={() => setShowWorkbench(false)}
              className="p-2 hover:bg-morandi-container rounded-lg transition-colors"
            >
              <X size={20} className="text-morandi-secondary" />
            </button>
          </div>

          {/* 功能分類 */}
          <div className="p-4 space-y-6">
            {WORKBENCH_CATEGORIES.map(category => (
              <div key={category.title}>
                <h3 className="text-sm font-medium text-morandi-secondary mb-3">
                  {category.title}
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  {category.items.map(item => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setShowWorkbench(false)}
                        className="flex flex-col items-center p-3 rounded-xl hover:bg-morandi-container/50 transition-colors"
                      >
                        <div className={cn('p-2 rounded-xl bg-morandi-container', item.color)}>
                          <Icon size={22} />
                        </div>
                        <span className="text-xs mt-2 text-morandi-primary font-medium">
                          {item.label}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* 底部安全區域 */}
          <div className="h-6" />
        </DialogContent>
      </Dialog>
    </>
  )
}
