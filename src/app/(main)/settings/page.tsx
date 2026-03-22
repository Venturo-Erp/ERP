'use client'

import { useAuthStore } from '@/stores/auth-store'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Button } from '@/components/ui/button'
import { User, LogOut, AlertCircle, Lock, Camera } from 'lucide-react'
import { useSettingsState } from './hooks/useSettingsState'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SettingsTabs } from './components/SettingsTabs'
import {
  AccountSettings,
  SystemSettings,
  OtherSettings,
  PermissionManagementSettings,
  WorkspaceSwitcher,
  ModuleManagementSettings,
  DevToolsSettings,
  NewebPaySettings,
} from './components'
import { LABELS } from './constants/labels'

// 強制客戶端渲染，不預取伺服器資料
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
    cacheInfo,
    clearingCache,
    setClearingCache,
  } = useSettingsState()

  // 檢查是否為首次設定模式
  useEffect(() => {
    const setupParam = searchParams.get('setup')
    if (setupParam === 'true') {
      setIsSetupMode(true)
      // 自動展開密碼修改區塊
      setShowPasswordSection(true)
    }
  }, [searchParams, setShowPasswordSection])

  // 完成設定後清除 setup 參數
  const handleDismissSetup = () => {
    setIsSetupMode(false)
    router.replace('/settings')
  }

  // 判斷是否有系統設定權限（super_admin、admin 或 settings 權限）
  const hasSettingsAccess =
    user?.permissions?.includes('super_admin') ||
    user?.permissions?.includes('admin') ||
    user?.permissions?.includes('settings')

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  return (
    <ContentPageLayout
      title={LABELS.SYSTEM_SETTINGS}
      breadcrumb={[
        { label: LABELS.HOME, href: '/dashboard' },
        { label: LABELS.SETTINGS, href: '/settings' },
      ]}
      headerActions={
        <div className="flex items-center gap-3">
          {/* 用戶資訊 */}
          {user && (
            <div className="flex items-center gap-2 px-3 py-2 bg-morandi-container rounded-lg">
              <User className="h-4 w-4 text-morandi-secondary" />
              <span className="text-sm font-medium text-morandi-primary">
                {user.display_name ||
                  user.chinese_name ||
                  user.english_name ||
                  user.personal_info?.email ||
                  LABELS.USER}
              </span>
            </div>
          )}

          {/* 登出按鈕 */}
          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center gap-2 text-morandi-red border-morandi-red hover:bg-morandi-red hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            {LABELS.LOGOUT}
          </Button>
        </div>
      }
    >
      <div className="max-w-4xl mx-auto space-y-8 p-6">
        {/* 分頁切換 */}
        {hasSettingsAccess && <SettingsTabs />}

        {/* 首次設定提示 */}
        {isSetupMode && (
          <div className="bg-gradient-to-r from-morandi-gold/10 to-morandi-gold/5 border border-morandi-gold/30 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-morandi-gold/20 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-morandi-gold" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-morandi-primary mb-2">
                  {LABELS.WELCOME_TITLE}
                </h3>
                <p className="text-sm text-morandi-secondary mb-4">{LABELS.FIRST_LOGIN_DESC}</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-card/60 rounded-lg">
                    <div className="w-8 h-8 bg-morandi-gold/20 rounded-full flex items-center justify-center">
                      <Lock className="w-4 h-4 text-morandi-gold" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-morandi-primary">
                        {LABELS.CHANGE_PASSWORD_TITLE}
                      </p>
                      <p className="text-xs text-morandi-secondary">
                        {LABELS.CHANGE_PASSWORD_DESC}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-card/60 rounded-lg">
                    <div className="w-8 h-8 bg-morandi-gold/20 rounded-full flex items-center justify-center">
                      <Camera className="w-4 h-4 text-morandi-gold" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-morandi-primary">
                        {LABELS.UPLOAD_AVATAR_TITLE}
                      </p>
                      <p className="text-xs text-morandi-secondary">{LABELS.UPLOAD_AVATAR_DESC}</p>
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
                    {LABELS.SKIP_LATER}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 帳號安全設定 */}
        <AccountSettings
          user={user}
          showPasswordSection={showPasswordSection}
          setShowPasswordSection={setShowPasswordSection}
          passwordData={passwordData}
          setPasswordData={setPasswordData}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          passwordUpdateLoading={passwordUpdateLoading}
          setPasswordUpdateLoading={setPasswordUpdateLoading}
        />

        {/* 以下僅有設定權限者可見 */}
        {hasSettingsAccess && (
          <>
            {/* 藍新金流設定 */}
            <NewebPaySettings />

            {/* 開發者工具 */}
            <DevToolsSettings />

            {/* 權限管理 */}
            <PermissionManagementSettings />

            {/* 模組管理 */}
            <ModuleManagementSettings />

            {/* 工作空間切換 */}
            <WorkspaceSwitcher />

            {/* 系統維護 */}
            <SystemSettings
              cacheInfo={cacheInfo}
              clearingCache={clearingCache}
              setClearingCache={setClearingCache}
            />

            {/* 其他設定 */}
            <OtherSettings />
          </>
        )}
      </div>
    </ContentPageLayout>
  )
}
