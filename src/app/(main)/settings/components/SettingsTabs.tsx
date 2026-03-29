'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Settings, Building2, Bot, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type SettingsTab = 'personal' | 'company' | 'bot'

const tabs: {
  value: SettingsTab
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  subTabs?: { label: string; href: string }[]
}[] = [
  { value: 'personal', label: '個人設定', href: '/settings', icon: Settings },
  { value: 'company', label: '公司設定', href: '/settings/company', icon: Building2 },
  { 
    value: 'bot', 
    label: '機器人管理', 
    href: '/settings/bot-line',
    icon: Bot,
    subTabs: [
      { label: 'LINE Bot', href: '/settings/bot-line' },
      // { label: 'Telegram Bot', href: '/settings/bot-telegram' },  // 未來
    ]
  },
]

export function SettingsTabs() {
  const pathname = usePathname()
  const router = useRouter()

  const getActiveTab = (): SettingsTab => {
    if (pathname === '/settings/company') return 'company'
    if (pathname.startsWith('/settings/bot-')) return 'bot'
    return 'personal'
  }

  const activeTab = getActiveTab()

  return (
    <div className="flex gap-2">
      {tabs.map(tab => {
        const Icon = tab.icon
        const isActive = activeTab === tab.value
        
        // 有子選單的用 DropdownMenu
        if (tab.subTabs && tab.subTabs.length > 0) {
          return (
            <DropdownMenu key={tab.value}>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#06C755] text-white'
                      : 'text-morandi-secondary hover:bg-morandi-container'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  <ChevronDown className="w-3 h-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {tab.subTabs.map(subTab => (
                  <DropdownMenuItem
                    key={subTab.href}
                    onClick={() => router.push(subTab.href)}
                    className={pathname === subTab.href ? 'bg-muted' : ''}
                  >
                    {subTab.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }

        // 一般分頁
        return (
          <button
            key={tab.value}
            onClick={() => router.push(tab.href)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-morandi-gold text-white'
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
