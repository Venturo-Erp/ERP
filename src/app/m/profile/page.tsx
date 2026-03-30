'use client'

import { COMPANY_NAME } from '@/lib/tenant'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  User,
  Building2,
  Settings,
  LogOut,
  ChevronRight,
  Moon,
  Bell,
  HelpCircle,
  Monitor,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { PROFILE_LABELS } from './constants/labels'

export default function MobileProfilePage() {
  const router = useRouter()
  const { user, logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const menuItems = [
    {
      title: '帳號設定',
      items: [
        { icon: User, label: '個人資料', href: '/settings/profile' },
        { icon: Building2, label: '工作空間', href: '/settings/workspaces' },
        { icon: Bell, label: '通知設定', href: '/settings/notifications' },
      ],
    },
    {
      title: '顯示設定',
      items: [
        { icon: Moon, label: '深色模式', href: '#', badge: '即將推出' },
        { icon: Monitor, label: '切換桌面版', href: '/dashboard' },
      ],
    },
    {
      title: '其他',
      items: [
        { icon: HelpCircle, label: '幫助中心', href: '/help' },
        { icon: Settings, label: '系統設定', href: '/settings' },
      ],
    },
  ]

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
          <h1 className="text-lg font-bold text-morandi-primary">{PROFILE_LABELS.LABEL_6661}</h1>
        </div>
      </div>

      {/* 使用者資訊卡片 */}
      <div className="p-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-morandi-gold/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-morandi-gold">{user?.name?.[0] || 'U'}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-morandi-primary">{user?.name || '使用者'}</h2>
              <p className="text-sm text-morandi-secondary">{user?.email}</p>
              {/* 新系統：顯示管理員標籤或職務名稱 */}
              {(user?.permissions?.includes('*') || user?.permissions?.includes('admin')) && (
                <div className="mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-morandi-gold/10 text-morandi-gold">
                    管理員
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 選單列表 */}
      <div className="px-4 space-y-4">
        {menuItems.map(section => (
          <div key={section.title}>
            <h3 className="text-sm font-medium text-morandi-secondary mb-2 px-1">
              {section.title}
            </h3>
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {section.items.map((item, index) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      'flex items-center justify-between px-4 py-3 hover:bg-morandi-container/50 transition-colors',
                      index !== section.items.length - 1 && 'border-b border-border'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} className="text-morandi-secondary" />
                      <span className="text-morandi-primary">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-morandi-container text-morandi-secondary">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight size={18} className="text-morandi-secondary/50" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 登出按鈕 */}
      <div className="p-4 mt-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                     bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
        >
          <LogOut size={18} />
          <span className="font-medium">{PROFILE_LABELS.LABEL_9863}</span>
        </button>
      </div>

      {/* 版本資訊 */}
      <div className="text-center py-4 text-xs text-morandi-muted">
        {COMPANY_NAME} 管理系統 v1.0.0
      </div>
    </div>
  )
}
