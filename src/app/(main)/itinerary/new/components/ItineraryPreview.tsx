'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { TourPreview } from '@/components/editor/TourPreview'
import {
  Sparkles,
  Building2,
  UtensilsCrossed,
  Calendar,
  Plane,
  MapPin,
  Cloud,
  CloudOff,
  Save,
} from 'lucide-react'
import type { LocalTourData, AutoSaveStatus } from '../hooks/useItineraryEditor'
import { NEW_LABELS } from './constants/labels'

interface ItineraryPreviewProps {
  tourData: LocalTourData
  isDirty?: boolean
  autoSaveStatus?: AutoSaveStatus
  onSave?: () => void
}

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  IconBuilding: Building2,
  IconToolsKitchen2: UtensilsCrossed,
  IconSparkles: Sparkles,
  IconCalendar: Calendar,
  IconPlane: Plane,
  IconMapPin: MapPin,
}

export function ItineraryPreview({
  tourData,
  isDirty,
  autoSaveStatus,
  onSave,
}: ItineraryPreviewProps) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')
  const mobileContentRef = useRef<HTMLDivElement>(null)

  const scale = viewMode === 'mobile' ? 0.7 : 0.5

  // Convert icon strings to components for preview and transform data structure
  const processedData = useMemo(
    () => ({
      ...tourData,
      features: (tourData.features || []).map(f => ({
        ...f,
        iconComponent: iconMap[f.icon] || Sparkles,
      })),
      // 將 meetingInfo 轉換為 meetingPoints 陣列給預覽使用
      meetingPoints: tourData.meetingPoints || (tourData.meetingInfo ? [tourData.meetingInfo] : []),
    }),
    [tourData]
  )

  // 切換到手機模式時，滾動到標題區域
  useEffect(() => {
    if (viewMode === 'mobile' && mobileContentRef.current) {
      setTimeout(() => {
        if (mobileContentRef.current) {
          const heroHeight = window.innerHeight * 0.7
          mobileContentRef.current.scrollTop = heroHeight - 400
        }
      }, 100)
    }
  }, [viewMode])

  return (
    <div className="w-1/2 bg-card flex flex-col">
      {/* 標題列 */}
      <div className="h-14 bg-card border-b border-border px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-morandi-primary">{NEW_LABELS.PREVIEW_2405}</h2>
          <div className="flex gap-2 bg-morandi-container/30 rounded-lg p-1">
            <button
              onClick={() => setViewMode('desktop')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'desktop'
                  ? 'bg-morandi-gold text-white'
                  : 'text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/50'
              }`}
            >
              {NEW_LABELS.DEVICE_DESKTOP}
            </button>
            <button
              onClick={() => setViewMode('mobile')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'mobile'
                  ? 'bg-morandi-gold text-white'
                  : 'text-morandi-secondary hover:text-morandi-primary hover:bg-morandi-container/50'
              }`}
            >
              {NEW_LABELS.DEVICE_MOBILE}
            </button>
          </div>
        </div>
        {/* 儲存狀態與按鈕 */}
        {(onSave || autoSaveStatus) && (
          <div className="flex items-center gap-3 text-sm">
            {autoSaveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-morandi-secondary">
                <Cloud size={14} className="animate-pulse" />
                {NEW_LABELS.LABEL_2827}
              </span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-morandi-green">
                <Cloud size={14} />
                {NEW_LABELS.SAVING_4294}
              </span>
            )}
            {autoSaveStatus === 'error' && (
              <span className="flex items-center gap-1.5 text-morandi-red">
                <CloudOff size={14} />
                {NEW_LABELS.LABEL_6397}
              </span>
            )}
            {onSave && isDirty && autoSaveStatus !== 'saving' && (
              <button
                type="button"
                onClick={onSave}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-morandi-gold text-white hover:bg-morandi-gold-hover transition-colors"
              >
                <Save size={14} />
                {NEW_LABELS.SAVE}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 預覽容器 */}
      <div className="flex-1 overflow-auto p-4">
        <div className="w-full h-full flex items-center justify-center">
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
            }}
          >
            {viewMode === 'mobile' ? (
              <div className="relative">
                <div className="bg-black rounded-[45px] p-[8px] shadow-lg">
                  <div className="absolute top-[20px] left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-black w-[120px] h-[34px] rounded-full"></div>
                  </div>

                  <div
                    className="bg-card rounded-[37px] overflow-hidden relative"
                    style={{
                      width: '390px',
                      height: '844px',
                    }}
                  >
                    <div
                      className="w-full h-full overflow-y-auto"
                      ref={mobileContentRef}
                      style={{
                        scrollBehavior: 'smooth',
                      }}
                    >
                      <TourPreview data={processedData} viewMode="mobile" />
                    </div>

                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
                      <div className="w-32 h-1 bg-border rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="bg-card shadow-lg rounded-lg overflow-hidden"
                style={{
                  width: '1200px',
                  height: '800px',
                }}
              >
                <div className="w-full h-full overflow-y-auto">
                  <TourPreview data={processedData} viewMode="desktop" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
