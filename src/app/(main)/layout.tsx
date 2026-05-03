'use client'

import { MainLayout } from '@/components/layout/main-layout'
import { ModuleGuard } from '@/components/guards/ModuleGuard'
import React from 'react'
import { I18nProviderClient } from '@/lib/i18n/client'
import { defaultLocale } from '@/lib/i18n'

export default function MainRouteGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <I18nProviderClient locale={defaultLocale}>
      <MainLayout>
        <ModuleGuard>{children}</ModuleGuard>
      </MainLayout>
    </I18nProviderClient>
  )
}
