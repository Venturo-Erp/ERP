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
        {/* 分頁導航 */}
        {hasSettingsAccess && (
          <div className="mb-6">
            <SettingsTabs />
          </div>
        )}

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

        {/* 修改密碼區塊 */}
        <div className="mt-8 bg-card rounded-xl border border-morandi-container/30 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-morandi-gold/10 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-morandi-gold" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-morandi-primary">修改密碼</h3>
              <p className="text-sm text-morandi-secondary">更新您的登入密碼</p>
            </div>
          </div>

          {!showPasswordSection ? (
            <Button
              variant="outline"
              onClick={() => setShowPasswordSection(true)}
              className="border-morandi-gold text-morandi-gold hover:bg-morandi-gold hover:text-white"
            >
              修改密碼
            </Button>
          ) : (
            <div className="space-y-4 max-w-md">
              <div>
                <label className="text-sm font-medium text-morandi-primary mb-2 block">
                  目前密碼
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={e => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-morandi-container/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-morandi-gold/50"
                  placeholder="輸入目前密碼"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-morandi-primary mb-2 block">
                  新密碼
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={e => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-morandi-container/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-morandi-gold/50"
                  placeholder="輸入新密碼（至少 6 位）"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-morandi-primary mb-2 block">
                  確認新密碼
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={e => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-morandi-container/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-morandi-gold/50"
                  placeholder="再次輸入新密碼"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showPassword"
                  checked={showPassword}
                  onChange={e => setShowPassword(e.target.checked)}
                  className="rounded border-morandi-container/30"
                />
                <label htmlFor="showPassword" className="text-sm text-morandi-secondary">
                  顯示密碼
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPasswordSection(false)
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                  }}
                >
                  取消
                </Button>
                <Button
                  onClick={async () => {
                    if (passwordData.newPassword !== passwordData.confirmPassword) {
                      alert('新密碼與確認密碼不符')
                      return
                    }
                    if (passwordData.newPassword.length < 6) {
                      alert('新密碼至少需要 6 位')
                      return
                    }
                    setPasswordUpdateLoading(true)
                    try {
                      const res = await fetch('/api/auth/change-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          currentPassword: passwordData.currentPassword,
                          newPassword: passwordData.newPassword,
                        }),
                      })
                      const data = await res.json()
                      if (data.success) {
                        alert('密碼修改成功')
                        setShowPasswordSection(false)
                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                      } else {
                        alert(data.error || '密碼修改失敗')
                      }
                    } catch (error) {
                      alert('密碼修改失敗')
                    } finally {
                      setPasswordUpdateLoading(false)
                    }
                  }}
                  disabled={passwordUpdateLoading}
                  className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
                >
                  {passwordUpdateLoading ? '處理中...' : '確認修改'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ContentPageLayout>
  )
}
