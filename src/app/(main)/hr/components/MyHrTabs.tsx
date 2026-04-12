'use client'

/**
 * 個人人資分頁切換列 — 放在 /hr/my-*、/hr/overtime、/hr/missed-clock 頁面頂部
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/hr/my-attendance', label: '我的出勤' },
  { href: '/hr/my-leave', label: '我的請假' },
  { href: '/hr/my-payslip', label: '我的薪資條' },
  { href: '/hr/overtime', label: '加班申請' },
  { href: '/hr/missed-clock', label: '補打卡' },
]

export function MyHrTabs() {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-1 border-b border-border/40 mb-4 overflow-x-auto">
      {TABS.map(tab => {
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
