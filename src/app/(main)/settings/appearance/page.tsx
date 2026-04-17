'use client'

import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { SettingsTabs } from '../components/SettingsTabs'
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher'
import { Palette } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function AppearanceSettingsPage() {
  return (
    <ContentPageLayout title="設定" headerActions={<SettingsTabs />}>
      <div className="max-w-3xl mx-auto space-y-6 py-6">
        <div className="bg-card rounded-xl border border-border/60 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-morandi-gold/10 flex items-center justify-center">
              <Palette className="w-5 h-5 text-morandi-gold" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-morandi-primary">外觀主題</h2>
              <p className="text-xs text-morandi-secondary mt-0.5">
                選擇你偏好的配色方案，設定會記住這台瀏覽器
              </p>
            </div>
          </div>

          <ThemeSwitcher />

          <div className="mt-4 text-xs text-morandi-muted leading-relaxed">
            提示：主題是儲存在瀏覽器本機（localStorage），換瀏覽器或清快取會回到預設主題。
            未來會提供旅客端自己切換主題的功能。
          </div>
        </div>
      </div>
    </ContentPageLayout>
  )
}
