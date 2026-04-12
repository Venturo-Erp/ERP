'use client'

/**
 * HR 管理員分頁切換列 — 放在各管理頁面頂部
 * 支援三組 tabs：員工管理 / 出勤與請假 / 薪資管理 / 人資設定
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface TabGroup {
  name: string
  tabs: { href: string; label: string }[]
}

const TAB_GROUPS: Record<string, TabGroup> = {
  employee: {
    name: '員工管理',
    tabs: [
      { href: '/hr', label: '員工列表' },
      { href: '/hr/roles', label: '職務管理' },
    ],
  },
  attendance: {
    name: '出勤與請假',
    tabs: [
      { href: '/hr/attendance', label: '出勤管理' },
      { href: '/hr/leave', label: '請假管理' },
      { href: '/hr/overtime', label: '加班審核' },
      { href: '/hr/missed-clock', label: '補打卡審核' },
    ],
  },
  payroll: {
    name: '薪資管理',
    tabs: [
      { href: '/hr/payroll', label: '薪資管理' },
      { href: '/hr/deductions', label: '扣款與津貼' },
      { href: '/hr/reports', label: '出勤月報' },
    ],
  },
  settings: {
    name: '人資設定',
    tabs: [
      { href: '/hr/settings', label: '人資設定' },
      { href: '/hr/training', label: '數位培訓' },
    ],
  },
}

interface HrAdminTabsProps {
  group: keyof typeof TAB_GROUPS
}

export function HrAdminTabs({ group }: HrAdminTabsProps) {
  const pathname = usePathname()
  const config = TAB_GROUPS[group]
  if (!config) return null

  return (
    <div className="flex items-center gap-1 border-b border-border/40 mb-4 overflow-x-auto">
      {config.tabs.map(tab => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap',
              isActive
                ? 'text-morandi-primary'
                : 'text-morandi-secondary hover:text-morandi-primary'
            )}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-0.5 bg-morandi-gold rounded-full" />
            )}
          </Link>
        )
      })}
    </div>
  )
}
