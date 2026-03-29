'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Settings, Building2, MessageCircle } from 'lucide-react'

const tabs = [
  { value: 'personal', label: '個人設定', href: '/settings', icon: Settings },
  { value: 'company', label: '公司設定', href: '/settings/company', icon: Building2 },
  { value: 'line', label: 'LINE Bot', href: '/settings/bot-line', icon: MessageCircle },
]

export function SettingsTabs() {
  const pathname = usePathname()
  const router = useRouter()

  const getActiveTab = () => {
    if (pathname === '/settings/company') return 'company'
    if (pathname === '/settings/bot-line') return 'line'
    return 'personal'
  }

  const activeTab = getActiveTab()

  return (
    <div className="flex gap-2">
      {tabs.map(tab => {
        const Icon = tab.icon
        const isActive = activeTab === tab.value
        return (
          <button
            key={tab.value}
            onClick={() => router.push(tab.href)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? tab.value === 'line'
                  ? 'bg-[#06C755] text-white'
                  : 'bg-morandi-gold text-white'
                : 'text-morandi-secondary hover:bg-morandi-container'
            }`}
          >
            <Icon className="w-4 h-4" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
