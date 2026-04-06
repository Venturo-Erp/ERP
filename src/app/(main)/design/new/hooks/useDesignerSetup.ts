import { useCallback, useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useDocumentStore, type BrochureEntityType } from '@/stores/document-store'
import { logger } from '@/lib/utils/logger'
import {
  generateFullBrochure,
  styleSeries,
  itineraryToTemplateData,
} from '@/features/designer/templates/engine'
import type { CanvasPage } from '@/features/designer/components/types'
import type { StyleSeries, TemplateData } from '@/features/designer/templates/engine'
import type { DesignType } from '@/features/designer/components/DesignTypeSelector'
import { getWorkspaceCompanyName } from '@/lib/workspace-helpers'

interface UseDesignerSetupOptions {
  entityId: string | null
  entityType: BrochureEntityType
  workspaceId: string | undefined
  setManualTourId: (id: string | null) => void
  setManualItineraryId: (id: string | null) => void
  setSelectedDesignType: (type: DesignType | null) => void
  setGeneratedPages: (pages: CanvasPage[]) => void
  setCurrentPageIndex: (index: number) => void
  setTemplateData: (data: Record<string, unknown> | null) => void
  setSelectedStyle: (style: StyleSeries | null) => void
  setShowTemplateSelector: (show: boolean) => void
  loadOrCreateDocument: ReturnType<typeof useDocumentStore.getState>['loadOrCreateDocument']
}

/**
 * 處理設計類型選擇、手冊開始、模板完成等設定邏輯
 */
export function useDesignerSetup({
  entityId,
  entityType,
  workspaceId,
  setManualTourId,
  setManualItineraryId,
  setSelectedDesignType,
  setGeneratedPages,
  setCurrentPageIndex,
  setTemplateData,
  setSelectedStyle,
  setShowTemplateSelector,
  loadOrCreateDocument,
}: UseDesignerSetupOptions) {
  // 選擇設計類型
  const handleSelectDesignType = useCallback(
    async (type: DesignType) => {
      setSelectedDesignType(type)

      if (entityId && workspaceId) {
        try {
          await loadOrCreateDocument('brochure', entityId, workspaceId, entityType, undefined, true)
        } catch (err) {
          logger.error('Failed to create document:', err)
        }
      }
    },
    [entityId, entityType, workspaceId, loadOrCreateDocument, setSelectedDesignType]
  )

  // 手冊類型開始設計
  const handleBrochureStart = useCallback(
    async (
      type: DesignType,
      selectedTourId: string,
      selectedItineraryId: string | null,
      styleId: string
    ) => {
      setManualTourId(selectedTourId)
      setManualItineraryId(selectedItineraryId)
      setSelectedDesignType(type)

      const style = styleSeries.find(s => s.id === styleId) || styleSeries[0]
      setSelectedStyle(style)

      const effectiveEntityId = selectedTourId

      try {
        let data: TemplateData = {
          mainTitle: '旅遊手冊',
          companyName: getWorkspaceCompanyName(),
        }

        if (selectedItineraryId) {
          const { data: itineraryData } = await supabase
            .from('itineraries')
            .select(
              'id, title, subtitle, tour_code, cover_image, country, city, departure_date, duration_days, meeting_info, leader, outbound_flight, return_flight, daily_itinerary'
            )
            .eq('id', selectedItineraryId)
            .single()

          if (itineraryData) {
            data = itineraryToTemplateData({
              title: itineraryData.title ?? undefined,
              subtitle: itineraryData.subtitle ?? undefined,
              tour_code: itineraryData.tour_code ?? undefined,
              cover_image: itineraryData.cover_image ?? undefined,
              country: itineraryData.country ?? undefined,
              city: itineraryData.city ?? undefined,
              departure_date: itineraryData.departure_date ?? undefined,
              return_date:
                (itineraryData as { return_date?: string | null }).return_date ?? undefined,
              duration_days: itineraryData.duration_days ?? undefined,
              meeting_info: (itineraryData.meeting_info as Record<string, unknown>) ?? undefined,
              leader: (itineraryData.leader as Record<string, unknown>) ?? undefined,
              outbound_flight:
                (itineraryData.outbound_flight as Record<string, unknown>) ?? undefined,
              return_flight: (itineraryData.return_flight as Record<string, unknown>) ?? undefined,
              daily_itinerary:
                (itineraryData.daily_itinerary as Array<Record<string, unknown>>) ?? undefined,
            })
          }
        } else if (selectedTourId) {
          const { data: tourData } = await supabase
            .from('tours')
            .select('id, name, code, departure_date, return_date, outbound_flight, return_flight')
            .eq('id', selectedTourId)
            .single()

          if (tourData) {
            let durationDays = 1
            if (tourData.departure_date && tourData.return_date) {
              try {
                const start = new Date(tourData.departure_date)
                const end = new Date(tourData.return_date)
                durationDays =
                  Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
              } catch {
                durationDays = 1
              }
            }

            data = itineraryToTemplateData({
              title: tourData.name ?? undefined,
              tour_code: tourData.code ?? undefined,
              departure_date: tourData.departure_date ?? undefined,
              return_date: tourData.return_date ?? undefined,
              duration_days: durationDays,
              outbound_flight: (tourData.outbound_flight as Record<string, unknown>) ?? undefined,
              return_flight: (tourData.return_flight as Record<string, unknown>) ?? undefined,
            })
          }
        }

        // 生成完整手冊（封面 + 目錄 + 行程總覽 + 每日行程 + 備忘錄）
        const pages = generateFullBrochure(style, data)

        setGeneratedPages(pages)
        setCurrentPageIndex(0)
        setTemplateData(data as Record<string, unknown>)

        if (effectiveEntityId && workspaceId) {
          await loadOrCreateDocument(
            'brochure',
            effectiveEntityId,
            workspaceId,
            'tour',
            undefined,
            true
          )
        }
      } catch (err) {
        logger.error('Failed to start brochure:', err)
      }
    },
    [
      workspaceId,
      loadOrCreateDocument,
      setManualTourId,
      setManualItineraryId,
      setSelectedDesignType,
      setSelectedStyle,
      setGeneratedPages,
      setCurrentPageIndex,
      setTemplateData,
    ]
  )

  // 模板選擇完成
  const handleTemplateComplete = useCallback(
    async (
      pages: CanvasPage[],
      itineraryTemplateData: Record<string, unknown> | null,
      style: StyleSeries
    ) => {
      setGeneratedPages(pages)
      setCurrentPageIndex(0)
      setTemplateData(itineraryTemplateData)
      setSelectedStyle(style)
      setShowTemplateSelector(false)

      if (entityId && workspaceId) {
        try {
          await loadOrCreateDocument('brochure', entityId, workspaceId, entityType, undefined, true)
        } catch (err) {
          logger.error('Failed to create document:', err)
        }
      }
    },
    [
      entityId,
      entityType,
      workspaceId,
      loadOrCreateDocument,
      setGeneratedPages,
      setCurrentPageIndex,
      setTemplateData,
      setSelectedStyle,
      setShowTemplateSelector,
    ]
  )

  return {
    handleSelectDesignType,
    handleBrochureStart,
    handleTemplateComplete,
  }
}
