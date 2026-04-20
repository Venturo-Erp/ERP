'use client'

import dynamic from 'next/dynamic'
import { ModuleLoading } from '@/components/module-loading'

const DesignerPageContent = dynamic(() => import('./DesignerPageContent'), {
  ssr: false,
  loading: () => <ModuleLoading fullscreen className="bg-background" />,
})

export default function DesignerPage() {
  return <DesignerPageContent />
}
