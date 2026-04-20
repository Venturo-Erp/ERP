'use client'

import { useEffect, useState } from 'react'
import TourPage from '@/features/tours/components/TourPage'
import { logger } from '@/lib/utils/logger'
import { ModuleLoading } from '@/components/module-loading'
import { PUBLIC_VIEW_LABELS } from './constants/labels'

interface ItineraryData {
  title?: string
  tourCode?: string
  [key: string]: unknown
}

interface PublicViewClientProps {
  id: string
}

/**
 * 公開分享頁面的 Client Component
 */
export default function PublicViewClient({ id }: PublicViewClientProps) {
  const [data, setData] = useState<ItineraryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')

  // 偵測螢幕寬度自動切換 mobile/desktop
  useEffect(() => {
    const checkScreenSize = () => {
      setViewMode(window.innerWidth < 768 ? 'mobile' : 'desktop')
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  useEffect(() => {
    async function fetchItinerary() {
      if (!id) {
        setError(PUBLIC_VIEW_LABELS.ERROR_MISSING_ID)
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/itineraries/${encodeURIComponent(id)}`)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || PUBLIC_VIEW_LABELS.ERROR_LOAD_FAILED)
        }

        const result = await response.json()
        // API 回傳格式為 {success: true, data: {...}}
        setData(result.data || result)
      } catch (err) {
        logger.error('載入行程失敗:', err)
        setError(err instanceof Error ? err.message : PUBLIC_VIEW_LABELS.ERROR_LOAD_GENERIC)
      } finally {
        setLoading(false)
      }
    }

    fetchItinerary()
  }, [id])

  if (loading) {
    return (
      <ModuleLoading fullscreen className="bg-morandi-background" />
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-morandi-background">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-status-danger-bg flex items-center justify-center">
            <span className="text-2xl">!</span>
          </div>
          <h1 className="text-xl font-semibold text-morandi-primary mb-2">
            {PUBLIC_VIEW_LABELS.ERROR_TITLE}
          </h1>
          <p className="text-morandi-secondary">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-morandi-background">
        <div className="text-center">
          <p className="text-morandi-secondary">{PUBLIC_VIEW_LABELS.ERROR_NOT_FOUND}</p>
        </div>
      </div>
    )
  }

  return <TourPage data={data} isPreview={false} viewMode={viewMode} />
}
