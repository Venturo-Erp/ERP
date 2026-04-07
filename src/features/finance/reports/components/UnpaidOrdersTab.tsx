'use client'

import { ContentContainer } from '@/components/layout/content-container'

export function UnpaidOrdersTab() {
  return (
    <ContentContainer>
      <div className="flex items-center justify-center min-h-[300px] text-morandi-secondary">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">未收款訂單</p>
          <p className="text-sm">此報表開發中，敬請期待</p>
        </div>
      </div>
    </ContentContainer>
  )
}
