import React, { useState, useMemo } from 'react'
import { TourFormData, CityOption } from '../types'
import { Settings2 } from 'lucide-react'
import { logger } from '@/lib/utils/logger'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ImagePositionSettings } from '@/components/ui/image-position-editor'
import { PreviewPanel } from '../components/PreviewPanel'
// Hero 組件
import { TourHeroSection } from '@/features/tours/components/sections/TourHeroSection'
import { TourHeroNature } from '@/features/tours/components/sections/TourHeroNature'
import { TourHeroLuxury } from '@/features/tours/components/sections/TourHeroLuxury'
import { TourHeroArt } from '@/features/tours/components/sections/TourHeroArt'
import { TourHeroGemini } from '@/features/tours/components/sections/TourHeroGemini'
import { TourHeroDreamscape } from '@/features/tours/components/sections/TourHeroDreamscape'
import { TourHeroCollage } from '@/features/tours/components/sections/TourHeroCollage'
// 拆分的模組
import { useCoverInfo } from './cover/hooks/useCoverInfo'
import { AirportImageLibrary } from './cover/AirportImageLibrary'
import { CoverInfoForm } from './cover/CoverInfoForm'
import { COMP_EDITOR_LABELS } from '../../constants/labels'
import { getWorkspaceCompanyName } from '@/lib/workspace-helpers'

interface CoverInfoSectionProps {
  data: TourFormData
  user: {
    display_name?: string
    english_name?: string
    employee_number?: string
  } | null
  selectedCountry: string
  setSelectedCountry: (country: string) => void
  setSelectedCountryCode: (code: string) => void
  allDestinations: CityOption[]
  availableCities: CityOption[]
  countryNameToCode: Record<string, string>
  updateField: (field: string, value: unknown) => void
  updateCity: (city: string) => void
  onChange: (data: TourFormData) => void
}

export function CoverInfoSection({
  data,
  selectedCountry,
  setSelectedCountry,
  setSelectedCountryCode,
  allDestinations,
  availableCities,
  countryNameToCode,
  updateField,
  updateCity,
  onChange,
}: CoverInfoSectionProps) {
  const [showCoverSettings, setShowCoverSettings] = useState(false)

  const {
    coverStyleOptions,
    currentStyleOption,
    currentStyleColor,
    templatesLoading,
    handleCoverStyleChange,
  } = useCoverInfo({ data, onChange })

  // 取得機場代碼（data.city 現在直接存城市代碼）
  // 向後兼容：如果是舊資料存城市名稱，嘗試反向查找
  const airportCode = useMemo(() => {
    if (!data.city) return ''
    // 如果 data.city 是城市代碼格式（2-4個大寫字母），直接使用
    if (/^[A-Z]{2,4}$/.test(data.city)) {
      return data.city
    }
    // 否則嘗試從城市名稱反向查找（向後兼容舊資料）
    const city = availableCities.find(c => c.name === data.city)
    return city?.code || ''
  }, [data.city, availableCities])

  // 處理圖片選擇
  const handleImageSelect = (url: string) => {
    logger.log('[CoverInfoSection] handleImageSelect:', { url })
    updateField('coverImage', url)
  }

  // 處理圖片上傳
  const handleImageUpload = (url: string) => {
    logger.log('[CoverInfoSection] handleImageUpload:', { url })
    // 同時更新 coverImage 和 coverImagePosition，避免 stale closure 問題
    onChange({
      ...data,
      coverImage: url,
      coverImagePosition: { x: 50, y: 50, scale: 1 },
    })
  }

  // 生成預覽用資料
  const getHeroData = () => ({
    coverImage: data.coverImage,
    coverImagePosition: data.coverImagePosition,  // 圖片位置調整
    tagline: data.tagline || getWorkspaceCompanyName(),
    title: data.title || COMP_EDITOR_LABELS.行程標題,
    subtitle: data.subtitle || COMP_EDITOR_LABELS.副標題,
    description: data.description || COMP_EDITOR_LABELS.此處顯示行程描述,
    departureDate: data.departureDate || '2025/01/01',
    tourCode: data.tourCode || 'CODE',
    price: data.price || '',
    priceNote: data.priceNote === '__hidden__' ? '' : data.priceNote || COMP_EDITOR_LABELS.人,
    country: selectedCountry || '',
    city: data.city || '',
    dailyItinerary: data.dailyItinerary,
  })

  // 根據風格渲染對應的 Hero 組件
  const renderHeroPreview = (viewMode: 'desktop' | 'mobile') => {
    const heroData = getHeroData()

    switch (data.coverStyle) {
      case 'luxury':
        return <TourHeroLuxury data={heroData} viewMode={viewMode} />
      case 'art':
        return <TourHeroArt data={heroData} viewMode={viewMode} />
      case 'nature':
        return <TourHeroNature data={heroData} viewMode={viewMode} />
      case 'gemini':
        return <TourHeroGemini data={heroData} viewMode={viewMode} />
      case 'dreamscape':
        return <TourHeroDreamscape data={heroData} viewMode={viewMode} />
      case 'collage':
        return <TourHeroCollage data={heroData} viewMode={viewMode} />
      default:
        return <TourHeroSection data={heroData} viewMode={viewMode} />
    }
  }

  return (
    <div className="space-y-2">
      {/* 封面設定按鈕 - 點擊打開 Modal */}
      <button
        type="button"
        onClick={() => setShowCoverSettings(true)}
        className="w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all hover:shadow-md"
        style={{ borderColor: `${currentStyleColor}50`, backgroundColor: `${currentStyleColor}08` }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: currentStyleColor }}
        >
          <Settings2 size={20} className="text-white" />
        </div>
        <div className="text-left flex-1">
          <h2 className="text-base font-bold text-morandi-primary">
            {COMP_EDITOR_LABELS.SETTINGS_9115}
          </h2>
          <p className="text-xs text-morandi-secondary">
            風格：{currentStyleOption?.label || COMP_EDITOR_LABELS.經典全屏}
            {airportCode && ` · ${airportCode}`}
          </p>
        </div>
      </button>

      {/* 封面設定 Modal */}
      <Dialog open={showCoverSettings} onOpenChange={setShowCoverSettings}>
        <DialogContent
          level={1}
          className="!flex !flex-row max-w-[95vw] h-[90vh] overflow-hidden p-0"
        >
          {/* 左側：設定表單 */}
          <div className="w-1/2 min-w-0 p-6 overflow-y-auto overflow-x-hidden border-r border-morandi-container">
            <DialogHeader className="mb-4">
              <DialogTitle className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: currentStyleColor }}
                >
                  <Settings2 size={14} className="text-white" />
                </div>
                {COMP_EDITOR_LABELS.SETTINGS_9115}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* 表單區塊 */}
              <CoverInfoForm
                data={data}
                selectedCountry={selectedCountry}
                setSelectedCountry={setSelectedCountry}
                setSelectedCountryCode={setSelectedCountryCode}
                allDestinations={allDestinations}
                availableCities={availableCities}
                countryNameToCode={countryNameToCode}
                updateField={updateField}
                updateCity={updateCity}
                onChange={onChange}
                coverStyleOptions={coverStyleOptions}
                onCoverStyleChange={handleCoverStyleChange}
                templatesLoading={templatesLoading}
              />

              {/* 封面圖片 - 使用新的機場圖片庫 */}
              <AirportImageLibrary
                airportCode={airportCode}
                selectedImage={data.coverImage}
                onImageSelect={handleImageSelect}
                onImageUpload={handleImageUpload}
                position={data.coverImagePosition as ImagePositionSettings}
                onPositionChange={pos => updateField('coverImagePosition', pos)}
              />

              {/* 完成按鈕 */}
              <Button
                onClick={() => setShowCoverSettings(false)}
                className="w-full"
                style={{ backgroundColor: currentStyleColor }}
              >
                {COMP_EDITOR_LABELS.SETTINGS_6595}
              </Button>
            </div>
          </div>

          {/* 右側：實時預覽 */}
          <PreviewPanel
            styleLabel={currentStyleOption?.label || COMP_EDITOR_LABELS.經典全屏}
            styleColor={currentStyleColor}
          >
            {renderHeroPreview}
          </PreviewPanel>
        </DialogContent>
      </Dialog>
    </div>
  )
}
