'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import {
  MapPin,
  ShoppingCart,
  Users,
  CheckCircle,
  CreditCard,
  FileText,
  FileCheck,
  Calendar,
  Stamp,
  MessageCircle,
  Hotel,
  Truck,
  MapPinned,
  UserCheck,
  Calculator,
  Wallet,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { WORKBENCH_LABELS } from './constants/labels'

const CATEGORIES = [
  {
    title: WORKBENCH_LABELS.CAT_COMMON,
    items: [
      {
        icon: MapPin,
        label: WORKBENCH_LABELS.ITEM_TOURS,
        href: '/m/tours',
        color: 'bg-status-info/10 text-status-info',
      },
      {
        icon: ShoppingCart,
        label: WORKBENCH_LABELS.ITEM_ORDERS,
        href: '/m/orders',
        color: 'bg-morandi-green/10 text-morandi-green',
      },
      {
        icon: Users,
        label: WORKBENCH_LABELS.ITEM_MEMBERS,
        href: '/m/members',
        color: 'bg-morandi-secondary/10 text-morandi-secondary',
      },
      {
        icon: CheckCircle,
        label: WORKBENCH_LABELS.ITEM_CHECKIN,
        href: '/m/checkin',
        color: 'bg-status-warning/10 text-status-warning',
      },
    ],
  },
  {
    title: WORKBENCH_LABELS.CAT_FINANCE,
    items: [
      {
        icon: CreditCard,
        label: WORKBENCH_LABELS.ITEM_PAYMENTS,
        href: '/m/payments',
        color: 'bg-morandi-green/10 text-morandi-green',
      },
      {
        icon: Wallet,
        label: WORKBENCH_LABELS.ITEM_TREASURY,
        href: '/m/treasury',
        color: 'bg-status-info/10 text-status-info',
      },
      {
        icon: FileCheck,
        label: WORKBENCH_LABELS.ITEM_RECEIPTS,
        href: '/m/receipts',
        color: 'bg-morandi-gold/10 text-morandi-gold',
      },
      {
        icon: BarChart3,
        label: WORKBENCH_LABELS.ITEM_REPORTS,
        href: '/finance/reports',
        color: 'bg-morandi-secondary/10 text-morandi-secondary',
      },
    ],
  },
  {
    title: WORKBENCH_LABELS.CAT_QUOTE_CONTRACT,
    items: [
      {
        icon: Calculator,
        label: WORKBENCH_LABELS.ITEM_QUOTES,
        href: '/quotes',
        color: 'bg-morandi-gold/10 text-morandi-gold',
      },
      {
        icon: FileText,
        label: WORKBENCH_LABELS.ITEM_CONTRACTS,
        href: '/contracts',
        color: 'bg-morandi-container text-morandi-secondary',
      },
      {
        icon: FileCheck,
        label: WORKBENCH_LABELS.ITEM_CONFIRMATIONS,
        href: '/m/confirmations',
        color: 'bg-morandi-green/10 text-morandi-green',
      },
    ],
  },
  {
    title: WORKBENCH_LABELS.CAT_ADMIN,
    items: [
      {
        icon: Calendar,
        label: WORKBENCH_LABELS.ITEM_CALENDAR,
        href: '/calendar',
        color: 'bg-morandi-red/10 text-morandi-red',
      },
      {
        icon: Stamp,
        label: WORKBENCH_LABELS.ITEM_VISAS,
        href: '/m/visas',
        color: 'bg-morandi-gold/10 text-morandi-gold',
      },
    ],
  },
  {
    title: WORKBENCH_LABELS.CAT_DATABASE,
    items: [
      {
        icon: Hotel,
        label: WORKBENCH_LABELS.ITEM_HOTELS,
        href: '/database/hotels',
        color: 'bg-morandi-secondary/10 text-morandi-secondary',
      },
      {
        icon: Truck,
        label: WORKBENCH_LABELS.ITEM_SUPPLIERS,
        href: '/database/suppliers',
        color: 'bg-morandi-container text-morandi-secondary',
      },
      {
        icon: MapPinned,
        label: WORKBENCH_LABELS.ITEM_ATTRACTIONS,
        href: '/database/attractions',
        color: 'bg-morandi-green/10 text-morandi-green',
      },
      {
        icon: UserCheck,
        label: WORKBENCH_LABELS.ITEM_TOUR_LEADERS,
        href: '/database/tour-leaders',
        color: 'bg-morandi-red/10 text-morandi-red',
      },
    ],
  },
]

export default function MobileWorkbenchPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/m"
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-morandi-container transition-colors -ml-2"
          >
            <ArrowLeft size={20} className="text-morandi-primary" />
          </Link>
          <h1 className="text-lg font-bold text-morandi-primary">{WORKBENCH_LABELS.LABEL_6263}</h1>
        </div>
      </div>

      {/* 功能分類 */}
      <div className="p-4 space-y-6">
        {CATEGORIES.map(category => (
          <section key={category.title}>
            <h3 className="text-sm font-medium text-morandi-secondary mb-3">{category.title}</h3>
            <div className="grid grid-cols-4 gap-3">
              {category.items.map(item => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg bg-card border border-border hover:bg-morandi-container transition-colors active:scale-95"
                  >
                    <div
                      className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center',
                        item.color
                      )}
                    >
                      <Icon size={20} />
                    </div>
                    <span className="text-xs text-morandi-secondary text-center leading-tight">
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
