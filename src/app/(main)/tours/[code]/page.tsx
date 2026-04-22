'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import useSWR from 'swr'
import { useParams, useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Button } from '@/components/ui/button'
import { MapPin, MessageSquare } from 'lucide-react'
import { ModuleLoading } from '@/components/module-loading'
import { fetchTourIdByCode } from '@/data'
import { useTourDetails } from '@/features/tours/hooks/useTours-advanced'
import { useWorkspaceChannels } from '@/stores/workspace-store'
import { TOUR_TABS, TourTabContent } from '@/features/tours/components/TourTabs'
import { useVisibleModuleTabs } from '@/lib/permissions/hooks'
import { CODE_LABELS } from './constants/labels'
import { TOUR_DETAIL_PAGE_LABELS } from '@/features/tours/constants/labels'

// 2026-04-23: TourRequestFormDialog（需求單對話框）已砍除（tour_requests 整族廢）
// 之後重做客製化詢價時恢復

export default function TourDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const code = params.code as string

  const { channels, currentWorkspace } = useWorkspaceChannels()

  // 用 SWR 查詢 tour_id
  const { data: tourId, isLoading: loadingTourId } = useSWR(code ? `tour-id-${code}` : null, () =>
    fetchTourIdByCode(code)
  )

  // 分頁：URL 有指定就用，否則預設總覽
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview')
  const [forceShowPnr, setForceShowPnr] = useState(false)

  // 依 workspace 功能權限過濾可見的 tab（會自動隱藏未開通的付費 tab，如合約、展示行程）
  const visibleTabs = useVisibleModuleTabs('tours', TOUR_TABS)

  // 監聽分頁變更，更新 URL 和 localStorage
  useEffect(() => {
    // 更新 URL（不增加瀏覽器歷史記錄）
    const params = new URLSearchParams(window.location.search)
    params.set('tab', activeTab)
    router.replace(`/tours/${code}?${params.toString()}`, { scroll: false })
  }, [activeTab, code, router])

  // 需求單 Dialog 狀態
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  const [requestData, setRequestData] = useState<{
    category: string
    supplierName: string
    items: { serviceDate: string | null; title: string; quantity: number; note?: string }[]
    startDate: string | null
  } | null>(null)

  // 載入團詳情
  const { tour, loading, actions } = useTourDetails(tourId || '')

  // 檢查是否已有工作頻道
  const existingChannel = channels.find(
    (ch: { tour_id?: string | null }) => ch.tour_id === tour?.id
  )

  // 返回列表
  const handleBack = () => {
    router.push('/tours')
  }

  // 處理資料更新
  const handleSuccess = () => {
    actions.refresh()
    setForceShowPnr(true)
  }

  // 載入中
  if (loadingTourId || loading) {
    return (
      <ContentPageLayout
        title={CODE_LABELS.LOADING_6912}
        icon={MapPin}
        breadcrumb={[
          { label: TOUR_DETAIL_PAGE_LABELS.BREADCRUMB_TOURS, href: '/tours' },
          { label: code, href: `/tours/${code}` },
        ]}
      >
        <ModuleLoading />
      </ContentPageLayout>
    )
  }

  // 找不到團
  if (!tour) {
    return (
      <ContentPageLayout
        title={CODE_LABELS.NOT_FOUND_9865}
        icon={MapPin}
        breadcrumb={[
          { label: TOUR_DETAIL_PAGE_LABELS.BREADCRUMB_TOURS, href: '/tours' },
          { label: code, href: `/tours/${code}` },
        ]}
      >
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-morandi-secondary mb-4">
              {CODE_LABELS.NOT_FOUND_2154} {code} {CODE_LABELS.NOT_FOUND_SUFFIX}
            </p>
            <Button onClick={handleBack}>{CODE_LABELS.LABEL_5810}</Button>
          </div>
        </div>
      </ContentPageLayout>
    )
  }

  return (
    <ContentPageLayout
      title={tour.name}
      icon={MapPin}
      breadcrumb={[
        { label: TOUR_DETAIL_PAGE_LABELS.BREADCRUMB_TOURS, href: '/tours' },
        { label: `${tour.code} ${tour.name}`, href: `/tours/${code}` },
      ]}
      tabs={visibleTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      headerActions={
        <div className="flex items-center gap-2">
          {existingChannel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/workspace?channel=${existingChannel.id}`)}
            >
              <MessageSquare size={16} className="mr-1" />
              {CODE_LABELS.LABEL_9173}
            </Button>
          )}
        </div>
      }
      contentClassName="flex-1 overflow-auto"
    >
      <TourTabContent
        tour={tour}
        activeTab={activeTab}
        workspaceId={currentWorkspace?.id}
        forceShowPnr={forceShowPnr}
        onOpenRequestDialog={data => {
          setRequestData({
            category: data.category,
            supplierName: data.supplierName,
            items: data.items,
            startDate: data.startDate,
          })
          setShowRequestDialog(true)
        }}
      />

      {/* 需求單對話框已砍除（2026-04-23、tour_requests 整族廢）*/}
    </ContentPageLayout>
  )
}
