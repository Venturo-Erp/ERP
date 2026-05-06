'use client'

import { useAuthStore } from '@/stores/auth-store'
import { useMyCapabilities } from '@/lib/permissions/useMyCapabilities'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Button } from '@/components/ui/button'
import { Lock } from 'lucide-react'
import { useSettingsState } from '../hooks/useSettingsState'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { SettingsTabs } from '../components/SettingsTabs'
import { EmployeeForm } from '@/features/hr/components/EmployeeForm'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { LABELS } from '../constants/labels'
import { COMMON_MESSAGES } from '@/constants/messages'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const searchParams = useSearchParams()
  const router = useRouter()

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

  // 若 URL 有 ?setup=true，自動展開改密碼區塊
  useEffect(() => {
    if (searchParams.get('setup') === 'true') {
      setShowPasswordSection(true)
    }
  }, [searchParams, setShowPasswordSection])

  // settings 模組任一 tab 有讀權即顯示 tab 列
  const { canReadAnyInModule } = useMyCapabilities()
  const hasSettingsAccess = canReadAnyInModule('settings')

  // 「使用者名字 + 登出」已於 2026-05-02 移到 sidebar 底部、這裡不再重複

  return (
    <ContentPageLayout
      title={LABELS.SETTINGS}
      contentClassName="flex-1 overflow-visible min-h-0 flex flex-col"
      headerActions={
        <div className="flex items-center gap-4">
          {hasSettingsAccess && <SettingsTabs />}
        </div>
      }
    >
      <div>
        {/* 個人資料 - 毛玻璃卡片 */}
        <div className="settings-glass relative rounded-xl">
          {/* 背景光暈 */}
          <div className="absolute inset-0 -z-10 rounded-xl overflow-hidden">
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-morandi-gold/40 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-10 -left-20 w-80 h-80 bg-cat-pink/25 rounded-full blur-3xl" />
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-status-warning-bg/30 rounded-full blur-3xl" />
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

        {/* 修改密碼 Dialog */}
        <Dialog open={showPasswordSection} onOpenChange={setShowPasswordSection}>
          <DialogContent level={1} className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-morandi-primary flex items-center gap-2">
                <Lock className="w-5 h-5 text-morandi-gold" />
                {LABELS.CHANGE_PASSWORD}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-morandi-primary mb-2 block">
                  {LABELS.CURRENT_PASSWORD}
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={e =>
                    setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-morandi-container/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-morandi-gold/50"
                  placeholder={LABELS.CURRENT_PASSWORD_PLACEHOLDER}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-morandi-primary mb-2 block">
                  {LABELS.NEW_PASSWORD}
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={e =>
                    setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-morandi-container/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-morandi-gold/50"
                  placeholder={LABELS.NEW_PASSWORD_PLACEHOLDER}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-morandi-primary mb-2 block">
                  {LABELS.CONFIRM_NEW_PASSWORD}
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={e =>
                    setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-morandi-container/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-morandi-gold/50"
                  placeholder={LABELS.CONFIRM_PASSWORD_PLACEHOLDER}
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
                  {LABELS.SHOW_PASSWORD}
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="soft-gold"
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
                    alert(LABELS.PASSWORDS_NOT_MATCH)
                    return
                  }
                  if (passwordData.newPassword.length < 6) {
                    alert(COMMON_MESSAGES.PASSWORD_TOO_SHORT(6))
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
                      alert(LABELS.PASSWORD_UPDATE_SUCCESS)
                      setShowPasswordSection(false)
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                    } else {
                      alert(data.error || LABELS.PASSWORD_UPDATE_ERROR)
                    }
                  } catch (error) {
                    alert(LABELS.PASSWORD_UPDATE_ERROR)
                  } finally {
                    setPasswordUpdateLoading(false)
                  }
                }}
                disabled={passwordUpdateLoading}
                variant="soft-gold"
              >
                {passwordUpdateLoading ? COMMON_MESSAGES.PROCESSING : LABELS.CONFIRM_CHANGE}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ContentPageLayout>
  )
}
