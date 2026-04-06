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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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

  const { isAdmin } = useAuthStore()
  const hasSettingsAccess = isAdmin || user?.permissions?.includes('settings')

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
                <h3 className="text-lg font-semibold text-morandi-primary mb-2">歡迎使用系統</h3>
                <p className="text-sm text-morandi-secondary mb-4">首次登入，建議先完成以下設定</p>
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

        {/* 個人資料 - 毛玻璃卡片 */}
        <div className="settings-glass relative rounded-xl">
          {/* 背景光暈 */}
          <div className="absolute inset-0 -z-10 rounded-xl overflow-hidden">
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-morandi-gold/40 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-10 -left-20 w-80 h-80 bg-rose-300/25 rounded-full blur-3xl" />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-morandi-gold/20 rounded-full blur-3xl" />
          </div>
          <EmployeeForm
            employeeId={user?.id}
            mode="self"
            onSubmit={() => {
              window.location.reload()
            }}
            onCancel={() => {
              router.back()
            }}
            onPasswordChange={() => setShowPasswordSection(true)}
          />
        </div>
        <style>{`
          .settings-glass .bg-white {
            background: rgba(255,255,255,0.25) !important;
            backdrop-filter: blur(24px) !important;
            -webkit-backdrop-filter: blur(24px) !important;
            border: 1px solid rgba(255,255,255,0.4) !important;
            box-shadow: 0 8px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.2) inset !important;
          }
          .settings-glass .bg-gradient-to-b {
            background: rgba(255,255,255,0.12) !important;
            backdrop-filter: blur(24px) !important;
            -webkit-backdrop-filter: blur(24px) !important;
          }
          .settings-glass select,
          .settings-glass input:not([type="checkbox"]):not([type="file"]) {
            background-color: #ffffff !important;
            border-color: rgba(0,0,0,0.1) !important;
          }
        `}</style>

        {/* 修改密碼 Dialog */}
        <Dialog open={showPasswordSection} onOpenChange={setShowPasswordSection}>
          <DialogContent level={1} className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-morandi-primary flex items-center gap-2">
                <Lock className="w-5 h-5 text-morandi-gold" />
                修改密碼
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-morandi-primary mb-2 block">
                  目前密碼
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={e =>
                    setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))
                  }
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
                  onChange={e =>
                    setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))
                  }
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
                  onChange={e =>
                    setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))
                  }
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
                  className="rounded border-morandi-container/30 accent-[var(--morandi-gold)]"
                />
                <label htmlFor="showPassword" className="text-sm text-morandi-secondary">
                  顯示密碼
                </label>
              </div>
            </div>
            <DialogFooter>
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
                        employee_number: user?.employee_number,
                        current_password: passwordData.currentPassword,
                        new_password: passwordData.newPassword,
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
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ContentPageLayout>
  )
}
