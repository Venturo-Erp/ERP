'use client'

import { getTodayString, formatDate } from '@/lib/utils/format-date'

import React, { useMemo, useCallback, useState } from 'react'
import { TourFormData, FlightStyleType } from '../types'
import { Button } from '@/components/ui/button'
import { CalendarPlus, Plane, Undo2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useTemplates, getTemplateColor } from '@/features/itinerary/hooks/useTemplates'
import { FlightRouteSearchDialog } from '../components/FlightRouteSearchDialog'
import { PreviewPanel } from '../components/PreviewPanel'
import { TourFlightSection } from '@/features/tours/components/sections/TourFlightSection'
import { FlightSegmentCard } from './flight/FlightSegmentCard'
import { FlightStyleSelector } from './flight/FlightStyleSelector'
import { useFlightData } from './flight/hooks/useFlightData'
import { useFlightSearch } from './flight/FlightSearchDialog'
import { parseDate, formatDateFull } from './flight/utils'
import { COMP_EDITOR_LABELS } from '../../constants/labels'

interface FlightInfoSectionProps {
  data: TourFormData
  updateFlightField: (
    flightType: 'outboundFlight' | 'returnFlight',
    field: string,
    value: string | boolean
  ) => void
  updateFlightFields?: (
    flightType: 'outboundFlight' | 'returnFlight',
    fields: Record<string, string>
  ) => void
  onGenerateDailyItinerary?: (days: number, departureDate: string) => void
  updateField?: (field: keyof TourFormData, value: FlightStyleType) => void
  canUndoItinerary?: boolean
  onUndoItinerary?: () => void
  compact?: boolean
}

export function FlightInfoSection({
  data,
  updateFlightField,
  updateFlightFields,
  onGenerateDailyItinerary,
  updateField,
  canUndoItinerary,
  onUndoItinerary,
  compact = false,
}: FlightInfoSectionProps) {
  // 從資料庫載入模板
  const { flightTemplates, loading: templatesLoading } = useTemplates()

  // Modal 顯示狀態
  const [showFlightSettings, setShowFlightSettings] = useState(false)

  // 航線查詢 Dialog 狀態
  const [showRouteSearchOutbound, setShowRouteSearchOutbound] = useState(false)
  const [showRouteSearchReturn, setShowRouteSearchReturn] = useState(false)

  // 使用自定義 Hooks
  const { tripDays } = useFlightData({ data, updateFlightField })
  const {
    loadingOutbound,
    loadingReturn,
    handleSearchOutbound,
    handleSearchReturn,
    // 多航段相關
    outboundSegments,
    returnSegments,
    handleSelectOutboundSegment,
    handleSelectReturnSegment,
    clearOutboundSegments,
    clearReturnSegments,
  } = useFlightSearch({ data, updateFlightField, updateFlightFields })

  // 從資料庫載入的航班風格選項
  const flightStyleOptions = useMemo(() => {
    return flightTemplates.map(template => ({
      value: template.id as FlightStyleType,
      label: template.name,
      description: template.description || '',
      color: getTemplateColor(template.id),
      previewImage: template.preview_image_url ?? undefined,
    }))
  }, [flightTemplates])

  // 取得目前選擇的風格資訊
  const currentStyle = flightStyleOptions.find(
    s => s.value === (data.flightStyle || 'original')
  ) || {
    value: 'original' as FlightStyleType,
    label: COMP_EDITOR_LABELS.經典金色,
    description: COMP_EDITOR_LABELS.莫蘭迪金色風格,
    color: getTemplateColor('original'),
    previewImage: undefined,
  }

  // 生成每日行程
  const handleGenerateDailyItinerary = useCallback(() => {
    if (tripDays <= 0 || !data.departureDate) return
    if (onGenerateDailyItinerary) {
      onGenerateDailyItinerary(tripDays, data.departureDate)
    }
  }, [tripDays, data.departureDate, onGenerateDailyItinerary])

  // 處理航線選擇
  const handleFlightRouteSelect = useCallback(
    (
      flightType: 'outboundFlight' | 'returnFlight',
      flight: {
        flightNumber: string
        airline: string
        departureAirport: string
        arrivalAirport: string
        departureTime: string
        arrivalTime?: string
      }
    ) => {
      const fields: Record<string, string> = {
        flightNumber: flight.flightNumber,
        airline: flight.airline,
        departureAirport: flight.departureAirport,
        arrivalAirport: flight.arrivalAirport,
        departureTime: flight.departureTime,
      }
      if (flight.arrivalTime) {
        fields.arrivalTime = flight.arrivalTime
      }
      if (updateFlightFields) {
        updateFlightFields(flightType, fields)
      } else {
        Object.entries(fields).forEach(([key, value]) => {
          updateFlightField(flightType, key, value)
        })
      }
    },
    [updateFlightField, updateFlightFields]
  )

  // 計算預設日期
  const getDefaultDate = useCallback(
    (flightType: 'outbound' | 'return'): string => {
      if (flightType === 'outbound') {
        if (data.departureDate) {
          const dep = parseDate(data.departureDate)
          if (dep) return formatDate(dep)
        }
      } else {
        if (data.returnFlight?.departureDate && data.departureDate) {
          const dep = parseDate(data.departureDate)
          if (dep) {
            const [month, day] = (data.returnFlight.departureDate || '').split('/').map(Number)
            if (month && day) {
              let year = dep.getFullYear()
              if (month < dep.getMonth() + 1) year += 1
              return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            }
          }
        }
      }
      return getTodayString()
    },
    [data.departureDate, data.returnFlight?.departureDate]
  )

  return (
    <div className="space-y-3">
      {/* 摘要按鈕卡片 - 點擊開啟設定 Modal */}
      <button type="button" onClick={() => setShowFlightSettings(true)} className="w-full group">
        <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-morandi-container/30 bg-morandi-container/5 hover:border-morandi-container hover:shadow-md transition-all">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#B8A99A' }}
          >
            <Plane className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-left">
            <h2 className="text-base font-bold text-morandi-primary">
              {COMP_EDITOR_LABELS.航班資訊}
            </h2>
            <p className="text-xs text-morandi-secondary">
              {currentStyle.label}
              {tripDays > 0 ? ` · ${tripDays} 天` : ''}
            </p>
          </div>
        </div>
      </button>

      {/* 行程天數自動計算 */}
      {!compact && tripDays > 0 && data.departureDate && (
        <div className="bg-gradient-to-r from-morandi-gold/10 to-morandi-gold/5 p-3 rounded-lg border border-morandi-gold/30">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-morandi-primary">
                {COMP_EDITOR_LABELS.LABEL_6915}
              </span>
              <span className="text-lg font-bold text-morandi-gold">{tripDays}</span>
              <span className="text-sm text-morandi-secondary">{COMP_EDITOR_LABELS.LABEL_690}</span>
            </div>
            <div className="h-6 w-px bg-morandi-container hidden sm:block"></div>
            <div className="text-xs text-morandi-secondary">
              {(() => {
                const dep = parseDate(data.departureDate)
                if (!dep) return null
                const returnDateStr = data.returnFlight?.departureDate || ''
                const [month, day] = returnDateStr.split('/').map(Number)
                if (!month || !day) return null
                let returnYear = dep.getFullYear()
                if (month < dep.getMonth() + 1) returnYear += 1
                const ret = new Date(returnYear, month - 1, day)
                return `${formatDateFull(dep)} → ${formatDateFull(ret)}`
              })()}
            </div>
            <div className="h-6 w-px bg-morandi-container hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <Button variant="soft-gold"
                type="button"
                size="sm"
                onClick={handleGenerateDailyItinerary}
                disabled={!onGenerateDailyItinerary}
 className="text-xs gap-1"
              >
                <CalendarPlus size={14} />
                自動產生 {tripDays} 天行程
              </Button>
              {canUndoItinerary && onUndoItinerary && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onUndoItinerary}
                  className="text-xs gap-1 border-status-warning/30 text-status-warning hover:bg-status-warning-bg"
                >
                  <Undo2 size={14} />
                  {COMP_EDITOR_LABELS.LABEL_6053}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 航班設定 Modal */}
      <Dialog open={showFlightSettings} onOpenChange={setShowFlightSettings}>
        <DialogContent
          level={1}
          className="!flex !flex-row max-w-[95vw] h-[90vh] overflow-hidden p-0"
        >
          {/* 左側：設定表單 */}
          <div className="w-1/2 min-w-0 p-6 overflow-y-auto overflow-x-hidden border-r border-morandi-container">
            <DialogHeader className="mb-4">
              <DialogTitle className="flex items-center gap-2">
                <Plane className="w-5 h-5" style={{ color: '#B8A99A' }} />
                {COMP_EDITOR_LABELS.SETTINGS_7677}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {/*
               * 航班風格已統一 - 跟隨主題設定 (coverStyle)
               * 不再提供獨立的 flightStyle 選項
               */}

              {/* 去程航班 */}
              <FlightSegmentCard
                title={COMP_EDITOR_LABELS.去程航班}
                flightData={data.outboundFlight || {}}
                onFieldChange={(field, value) => updateFlightField('outboundFlight', field, value)}
                onSearch={handleSearchOutbound}
                onRouteSearch={() => setShowRouteSearchOutbound(true)}
                isLoading={loadingOutbound}
                segments={outboundSegments}
                onSelectSegment={handleSelectOutboundSegment}
                onClearSegments={clearOutboundSegments}
              />

              {/* 回程航班 */}
              <FlightSegmentCard
                title={COMP_EDITOR_LABELS.回程航班}
                flightData={data.returnFlight || {}}
                onFieldChange={(field, value) => updateFlightField('returnFlight', field, value)}
                onSearch={handleSearchReturn}
                onRouteSearch={() => setShowRouteSearchReturn(true)}
                isLoading={loadingReturn}
                segments={returnSegments}
                onSelectSegment={handleSelectReturnSegment}
                onClearSegments={clearReturnSegments}
              />
            </div>
          </div>

          {/* 右側：即時預覽 */}
          <PreviewPanel styleLabel={currentStyle?.label} styleColor={currentStyle?.color}>
            {viewMode => (
              <div className="w-full h-full overflow-auto p-6">
                <TourFlightSection
                  data={{
                    outboundFlight: data.outboundFlight,
                    returnFlight: data.returnFlight,
                    flightStyle: data.flightStyle || 'original',
                  }}
                  viewMode={viewMode}
                />
              </div>
            )}
          </PreviewPanel>
        </DialogContent>
      </Dialog>

      {/* 去程航線查詢 Dialog */}
      <FlightRouteSearchDialog
        open={showRouteSearchOutbound}
        onOpenChange={setShowRouteSearchOutbound}
        defaultOrigin={data.outboundFlight?.departureAirport || 'TPE'}
        defaultDestination={data.outboundFlight?.arrivalAirport || ''}
        defaultDate={getDefaultDate('outbound')}
        onSelectFlight={flight => handleFlightRouteSelect('outboundFlight', flight)}
      />

      {/* 回程航線查詢 Dialog */}
      <FlightRouteSearchDialog
        open={showRouteSearchReturn}
        onOpenChange={setShowRouteSearchReturn}
        defaultOrigin={
          data.returnFlight?.departureAirport || data.outboundFlight?.arrivalAirport || ''
        }
        defaultDestination={data.returnFlight?.arrivalAirport || 'TPE'}
        defaultDate={getDefaultDate('return')}
        onSelectFlight={flight => handleFlightRouteSelect('returnFlight', flight)}
      />
    </div>
  )
}
