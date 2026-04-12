'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'

interface TabConfig {
  value: string
  label: string
  href: string
  adminOnly?: boolean
}

const ALL_TABS: TabConfig[] = [
  { value: 'personal', label: '個人設定', href: '/settings' },
  { value: 'company', label: '公司設定', href: '/settings/company', adminOnly: true },
]

export function SettingsTabs() {
  const pathname = usePathname()
  const router = useRouter()
  const { isAdmin } = useAuthStore()

  // 依權限過濾 — 非管理員看不到公司設定
  const tabs = ALL_TABS.filter(tab => !tab.adminOnly || isAdmin)

  const getActiveTab = () => {
    if (pathname === '/settings/company') return 'company'
    return 'personal'
  }

  const activeTab = getActiveTab()

  return (
    <div className="flex items-center gap-1">
      {tabs.map(tab => {
        const isActive = activeTab === tab.value
        return (
          <button
            key={tab.value}
            data-tutorial={`tab-${tab.value}`}
            onClick={() => router.push(tab.href)}
            className={`px-4 py-1.5 text-sm font-medium transition-colors relative ${
              isActive
                ? 'text-morandi-primary'
                : 'text-morandi-secondary hover:text-morandi-primary'
            }`}
          >
            {tab.label}
            {isActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-0.5 bg-morandi-gold rounded-full" />
            )}
          </button>
        )
      })}
    </div>
  )
}
