'use client'

import { useAuthStore } from '@/stores/auth-store'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Button } from '@/components/ui/button'
import { User, LogOut, AlertCircle, Lock, Camera } from 'lucide-react'
import { useSettingsState } from './hooks/useSettingsState'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SettingsTabs } from './components/SettingsTabs'
import { EmployeeForm } from '@/features/hr/components/EmployeeForm'
import { LABELS } from './constants/labels'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default function SettingsPage() {
  const { user, logout } = useAuthStore()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isSetupMode, setIsSetupMode] = useState(false)

  const {
    showPasswordSection,
    setShowPasswordSection,
    passwordData,
    setPasswordData,
    showPassword,
    setShowPassword,
    passwordUpdateLoading,
    setPasswordUpdateLoading,
  } = useSettingsState()

  useEffect(() => {
    const setupParam = searchParams.get('setup')
    if (setupParam === 'true') {
      setIsSetupMode(true)
      setShowPasswordSection(true)
    }
  }, [searchParams, setShowPasswordSection])

  const handleDismissSetup = () => {
    setIsSetupMode(false)
    router.replace('/settings')
  }

  const hasSettingsAccess =
    user?.permissions?.includes('*') ||
    user?.permissions?.includes('super_admin') ||
    user?.permissions?.includes('admin') ||
    user?.permissions?.includes('settings')

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  return (
    <ContentPageLayout
      title="設定"
      headerActions={
        <div className="flex items-center gap-4">
          {hasSettingsAccess && <SettingsTabs />}
          
          {user && (
            <div className="flex items-center gap-2 px-3 py-2 bg-morandi-container rounded-lg">
              <User className="h-4 w-4 text-morandi-secondary" />
              <span className="text-sm font-medium text-morandi-primary">
                {user.display_name || user.chinese_name || user.english_name || '使用者'}
              </span>
            </div>
          )}

          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center gap-2 text-morandi-red border-morandi-red hover:bg-morandi-red hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            登出
          </Button>
        </div>
      }
    >
      <div>
        {/* 首次設定提示 */}
        {isSetupMode && (
          <div className="bg-gradient-to-r from-morandi-gold/10 to-morandi-gold/5 border border-morandi-gold/30 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-morandi-gold/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-morandi-gold" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-morandi-primary mb-2">
                  歡迎使用系統
                </h3>
                <p className="text-sm text-morandi-secondary mb-4">
                  首次登入，建議先完成以下設定
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-card/60 rounded-lg">
                    <div className="w-8 h-8 bg-morandi-gold/20 rounded-full flex items-center justify-center">
                      <Lock className="w-4 h-4 text-morandi-gold" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-morandi-primary">修改密碼</p>
                      <p className="text-xs text-morandi-secondary">設定專屬於你的安全密碼</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-card/60 rounded-lg">
                    <div className="w-8 h-8 bg-morandi-gold/20 rounded-full flex items-center justify-center">
                      <Camera className="w-4 h-4 text-morandi-gold" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-morandi-primary">上傳頭像</p>
                      <p className="text-xs text-morandi-secondary">讓同事更容易認出你</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDismissSetup}
                    className="text-morandi-secondary hover:text-morandi-primary"
                  >
                    稍後再說
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 個人資料 - 用同一個 EmployeeForm，mode='self' */}
        <EmployeeForm
          employeeId={user?.id}
          mode="self"
          onSubmit={() => {
            window.location.reload()
          }}
          onCancel={() => {
            router.back()
          }}
        />
      </div>
    </ContentPageLayout>
  )
}
