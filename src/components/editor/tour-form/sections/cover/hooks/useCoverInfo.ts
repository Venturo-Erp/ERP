'use client'
import { useMemo } from 'react'
import { TourFormData, CoverStyleType, FlightStyleType } from '../../../types'
import { useTemplates, getTemplateColor } from '@/features/itinerary/hooks/useTemplates'

interface UseCoverInfoProps {
  data: TourFormData
  onChange: (data: TourFormData) => void
}

export function useCoverInfo({ data, onChange }: UseCoverInfoProps) {
  const { coverTemplates, loading: templatesLoading } = useTemplates()

  // 封面風格對應的預設航班風格映射
  const getDefaultFlightStyle = (coverStyle: CoverStyleType): FlightStyleType => {
    switch (coverStyle) {
      case 'nature':
        return 'chinese'
      case 'luxury':
        return 'luxury'
      case 'art':
        return 'art'
      case 'dreamscape':
        return 'dreamscape'
      case 'collage':
        return 'collage'
      default:
        return 'original'
    }
  }

  // 從資料庫載入的封面風格選項
  // 2026-04-24 Pre-Launch Cleanup：只保留 luxury；DB 裡其他 template 暫不顯示
  // 未來要解鎖新風格、加白名單或改成 tier/workspace 權限過濾
  const coverStyleOptions = useMemo(() => {
    return coverTemplates
      .filter(template => template.id === 'luxury')
      .map(template => ({
        value: template.id as CoverStyleType,
        label: template.name,
        description: template.description || '',
        color: getTemplateColor(template.id),
        previewImage: template.preview_image_url ?? undefined,
      }))
  }, [coverTemplates])

  // 取得當前風格的顏色
  const currentStyleOption = coverStyleOptions.find(
    o => o.value === (data.coverStyle || 'original')
  )
  const currentStyleColor =
    currentStyleOption?.color || getTemplateColor(data.coverStyle || 'original')

  // 處理封面風格變更
  const handleCoverStyleChange = (style: CoverStyleType) => {
    onChange({
      ...data,
      coverStyle: style,
      flightStyle: getDefaultFlightStyle(style),
    })
  }

  return {
    // State
    coverStyleOptions,
    currentStyleOption,
    currentStyleColor,
    templatesLoading,

    // Functions
    handleCoverStyleChange,
  }
}
