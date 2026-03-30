'use client'

import React, { useState, useMemo } from 'react'
import dynamic from 'next/dynamic'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MapPin, Loader2, Map, X } from 'lucide-react'
import { TourCountry } from '../tour-form/types'
import { Attraction } from '@/features/attractions/types'
import { AttractionSearchBar } from './AttractionSearchBar'
import { AttractionList } from './AttractionList'
import { useAttractionSearch } from './hooks/useAttractionSearch'
import { ATTRACTION_SELECTOR_LABELS } from './constants/labels'

// 使用 Next.js dynamic import 並禁用 SSR
const AttractionsMap = dynamic(
  () => import('@/features/attractions/components/AttractionsMap').then(mod => mod.AttractionsMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-morandi-gold" />
      </div>
    ),
  }
)

// 擴展型別（加入 join 查詢的欄位）
interface AttractionWithCity extends Attraction {
  city_name?: string
  region_name?: string
}

interface AttractionSelectorProps {
  isOpen: boolean
  onClose: () => void
  countryId?: string // 直接傳國家 ID（優先於 tourCountryName）
  tourCountries?: TourCountry[] // 用於預設選擇第一個國家（舊版）
  tourCountryName?: string // 行程的國家名稱（舊版，來自 CoverInfo）
  onSelect: (attractions: AttractionWithCity[]) => void
  dayTitle?: string // 當天的行程標題，用於智能建議
  existingIds?: string[] // 已選過的景點 ID（顯示鎖定狀態）
}

export function AttractionSelector({
  isOpen,
  onClose,
  countryId,
  tourCountries = [],
  tourCountryName = '',
  onSelect,
  dayTitle = '',
  existingIds = [],
}: AttractionSelectorProps) {
  // 已選過的景點 ID Set（用於快速查找）
  const existingIdsSet = useMemo(() => new Set(existingIds), [existingIds])

  // 使用自定義 Hook 管理搜尋邏輯
  const {
    selectedCountryId,
    selectedCityId,
    searchQuery,
    attractions,
    suggestedAttractions,
    loading,
    cities,
    countries,
    handleCountryChange,
    handleCityChange,
    setSearchQuery,
  } = useAttractionSearch({
    isOpen,
    countryId,
    tourCountryName,
    dayTitle,
  })

  // 選擇狀態
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())



  // 地圖相關狀態
  const [selectedMapAttraction, setSelectedMapAttraction] = useState<AttractionWithCity | null>(
    null
  )
  const [showMap, setShowMap] = useState(false)
  
  // 拖拽模式
  const [dragMode, setDragMode] = useState(false)

  // 打開對話框時只清空勾選
  React.useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set())
      setSelectedMapAttraction(null)
      setShowMap(false)
    }
  }, [isOpen])

  // 切換選擇
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  // 點擊景點查看地圖
  const handleViewOnMap = (attraction: AttractionWithCity) => {
    setSelectedMapAttraction(attraction)
    setShowMap(true)
  }

  // 確認選擇
  const handleConfirm = () => {
    const selected = attractions.filter(a => selectedIds.has(a.id))
    onSelect(selected)
    setSelectedIds(new Set())
    setSearchQuery('')
    onClose()
  }

  // 取消
  const handleCancel = () => {
    setSelectedIds(new Set())
    setSearchQuery('')
    setShowManualInput(false)
    setManualAttractionName('')
    setSelectedMapAttraction(null)
    setShowMap(false)
    onClose()
  }



  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent
        level={1}
        className="w-[1200px] h-[700px] max-w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0"
      >
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-morandi-gold/10 to-transparent">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <MapPin className="text-morandi-gold" size={22} />
              {ATTRACTION_SELECTOR_LABELS.SELECT_6272}
            </DialogTitle>
            {showMap && (
              <Button
                size="sm"
                variant={dragMode ? "default" : "outline"}
                onClick={() => setDragMode(!dragMode)}
                className={dragMode ? "bg-morandi-gold hover:bg-morandi-gold-hover" : ""}
              >
                {dragMode ? "✓ 拖拽模式" : "啟用拖拽"}
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* 主要內容：左右分欄 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左側：景點列表 */}
          <div className="w-1/2 flex flex-col border-r border-border">
            <AttractionSearchBar
              countries={countries}
              selectedCountryId={selectedCountryId}
              searchQuery={searchQuery}
              hideFilters={!!countryId}
              onCountryChange={handleCountryChange}
              onSearchChange={setSearchQuery}
            />

            {/* 景點列表 */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              <AttractionList
                attractions={attractions}
                suggestedAttractions={suggestedAttractions}
                selectedIds={selectedIds}
                existingIds={existingIdsSet}
                loading={loading}
                selectedCountryId={selectedCountryId}
                searchQuery={searchQuery}
                onToggleSelection={toggleSelection}
                onViewOnMap={handleViewOnMap}
                selectedMapAttractionId={selectedMapAttraction?.id}
              />
            </div>

            {/* 已選擇提示 */}
            {selectedIds.size > 0 && (
              <div className="px-4 pb-4">
                <div className="text-sm text-morandi-primary bg-morandi-gold/10 px-3 py-2 rounded-lg border border-morandi-gold/20 flex items-center gap-2">
                  <div className="w-5 h-5 bg-morandi-gold rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {selectedIds.size}
                  </div>
                  已選擇 {selectedIds.size} 個景點
                </div>
              </div>
            )}
          </div>

          {/* 右側：地圖區域 */}
          <div className="w-1/2 flex flex-col bg-muted">
            {!showMap ? (
              // 初始提示畫面
              <div className="flex-1 flex flex-col items-center justify-center text-morandi-secondary p-8">
                <Map size={56} className="mb-4 opacity-30" />
                <p className="text-lg font-medium text-morandi-primary">
                  {ATTRACTION_SELECTOR_LABELS.LABEL_5582}
                </p>
                <p className="text-sm mt-2 text-center max-w-xs">
                  點擊景點右側的 <Map size={14} className="inline mx-1" />{' '}
                  {ATTRACTION_SELECTOR_LABELS.LABEL_1526}
                </p>
              </div>
            ) : (
              // 地圖區域
              <>
                {/* 地圖標題 */}
                <div className="px-4 py-3 bg-card border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin size={18} className="text-status-danger" />
                    <span className="font-medium text-morandi-primary">
                      {selectedMapAttraction?.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowMap(false)
                      setSelectedMapAttraction(null)
                    }}
                    className="h-7 px-2"
                  >
                    <X size={16} />
                  </Button>
                </div>

                {/* 地圖 */}
                <div className="flex-1 relative min-h-[400px]">
                  <AttractionsMap
                    attractions={attractions as Attraction[]}
                    selectedAttraction={selectedMapAttraction as Attraction}
                    radiusKm={5}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-3 border-t bg-muted/50">
          <Button variant="outline" onClick={handleCancel} className="rounded-xl">
            {ATTRACTION_SELECTOR_LABELS.CANCEL}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
