'use client'

import { Megaphone } from 'lucide-react'
import { DesignPage } from '@/features/design'
import { COMP_LAYOUT_LABELS } from '@/components/layout/constants/labels'

export default function MarketingPage() {
  return (
    <DesignPage
      title={COMP_LAYOUT_LABELS.行銷素材}
      icon={Megaphone}
      categoryFilter={['social', 'banner']}
    />
  )
}
