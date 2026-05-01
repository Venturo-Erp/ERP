'use client'

import { createI18nClient } from 'next-international/client'

export const { useI18n,  I18nProviderClient } = createI18nClient({
  'zh-TW': () => import('@/locales/zh-TW'),
})
