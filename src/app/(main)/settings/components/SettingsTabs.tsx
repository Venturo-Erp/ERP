'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Settings, Building2 } from 'lucide-react'

const tabs = [
  { value: 'personal', label: '個人設定', href: '/settings' },
  { value: 'company', label: '公司設定', href: '/settings/company' },
]

export function SettingsTabs() {
  const pathname = usePathname()
  const router = useRouter()

  const getActiveTab = () => {
    if (pathname === '/settings/company') return 'company'
    return 'personal'
  }

  const activeTab = getActiveTab()

  return (
    <div className="flex gap-1">
      {tabs.map(tab => {
        const isActive = activeTab === tab.value
        return (
          <button
            key={tab.value}
            onClick={() => router.push(tab.href)}
            className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
              isActive
                ? 'bg-morandi-gold text-white'
                : 'text-morandi-secondary hover:bg-morandi-container'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
