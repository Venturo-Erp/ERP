'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Settings, Building2, MessageCircle, Shield } from 'lucide-react'

type SettingsTab = 'personal' | 'company' | 'line' | 'roles'

const tabs: {
  value: SettingsTab
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { value: 'personal', label: '個人設定', href: '/settings', icon: Settings },
  { value: 'company', label: '公司資訊', href: '/settings/company', icon: Building2 },
  { value: 'roles', label: '角色管理', href: '/settings/roles', icon: Shield },
  { value: 'line', label: 'LINE 設定', href: '/settings/line', icon: MessageCircle },
]

export function SettingsTabs() {
  const pathname = usePathname()
  const router = useRouter()

  const getActiveTab = (): SettingsTab => {
    if (pathname === '/settings/company') return 'company'
    if (pathname === '/settings/line') return 'line'
    if (pathname === '/settings/roles') return 'roles'
    return 'personal'
  }

  const activeTab = getActiveTab()

  return (
    <div className="flex gap-2 border-b border-border pb-4 mb-6">
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
                  ? 'bg-green-600 text-white'
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
