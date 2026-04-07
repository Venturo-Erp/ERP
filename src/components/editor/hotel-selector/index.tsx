'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Building2 } from 'lucide-react'
import { HotelSearchBar } from './HotelSearchBar'
import { HotelList } from './HotelList'
import { useHotelSearch } from './hooks/useHotelSearch'
import type { LuxuryHotel } from '../HotelSelector'
import { HOTEL_SELECTOR_LABELS } from './constants/labels'

// 品牌列表
const HOTEL_BRANDS = [
  'Aman',
  'Four Seasons',
  'Ritz-Carlton',
  'Park Hyatt',
  'Mandarin Oriental',
  'Peninsula',
  'St. Regis',
  'Conrad',
  'Waldorf Astoria',
  'InterContinental',
  'Capella',
  'Banyan Tree',
  'Sofitel Legend',
  'Shilla',
  'Signiel',
]

interface HotelSelectorProps {
  isOpen: boolean
  onClose: () => void
  tourCountryName?: string
  onSelect: (hotels: LuxuryHotel[]) => void
}

export function HotelSelector({
  isOpen,
  onClose,
  tourCountryName = '',
  onSelect,
}: HotelSelectorProps) {
  // 使用 Hook 管理搜尋邏輯
  const {
    selectedCountryId,
    selectedRegionId,
    selectedCityId,
    selectedBrand,
    searchQuery,
    setSearchQuery,
    hotels,
    countries,
    regions,
    cities,
    loading,
    handleCountryChange,
    handleRegionChange,
    handleCityChange,
    handleBrandChange,
  } = useHotelSearch({ isOpen, tourCountryName })

  // 選擇狀態
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // 手動新增飯店
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualHotelName, setManualHotelName] = useState('')

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

  // 確認新增
  const handleConfirm = () => {
    const selected = hotels.filter(h => selectedIds.has(h.id))
    onSelect(selected)
    resetState()
  }

  // 取消
  const handleCancel = () => {
    resetState()
  }

  // 重置狀態
  const resetState = () => {
    setSelectedIds(new Set())
    setSearchQuery('')
    setShowManualInput(false)
    setManualHotelName('')
    onClose()
  }

  // 手動新增飯店
  const handleManualAdd = () => {
    if (!manualHotelName.trim()) return

    // 創建一個臨時的飯店物件
    const manualHotel: LuxuryHotel = {
      id: `manual_${Date.now()}`,
      name: manualHotelName.trim(),
      name_en: null,
      brand: null,
      country_id: selectedCountryId || '',
      region_id: null,
      city_id: selectedCityId || '',
      star_rating: null,
      hotel_class: null,
      category: null,
      description: null,
      highlights: null,
      price_range: null,
      avg_price_per_night: null,
      images: null,
      is_active: true,
      is_featured: false,
      city_name: cities.find(c => c.id === selectedCityId)?.name || '',
    }

    onSelect([manualHotel])
    resetState()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent
        level={1}
        className="w-[800px] h-[700px] max-w-[90vw] max-h-[85vh] flex flex-col p-0 gap-0"
      >
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-morandi-gold/10 to-transparent">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Building2 className="text-morandi-gold" size={22} />
            {HOTEL_SELECTOR_LABELS.SELECT_8723}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-4 gap-4">
          {/* 搜尋欄 */}
          <HotelSearchBar
            countries={countries}
            regions={regions}
            cities={cities}
            brands={HOTEL_BRANDS}
            selectedCountryId={selectedCountryId}
            selectedRegionId={selectedRegionId}
            selectedCityId={selectedCityId}
            selectedBrand={selectedBrand}
            searchQuery={searchQuery}
            onCountryChange={handleCountryChange}
            onRegionChange={handleRegionChange}
            onCityChange={handleCityChange}
            onBrandChange={handleBrandChange}
            onSearchChange={setSearchQuery}
            showManualInput={showManualInput}
            manualHotelName={manualHotelName}
            onToggleManualInput={() => setShowManualInput(!showManualInput)}
            onManualInputChange={setManualHotelName}
            onManualAdd={handleManualAdd}
          />

          {/* 飯店列表 */}
          <div className="flex-1 overflow-y-auto border border-morandi-container/50 rounded-xl bg-card">
            <HotelList
              hotels={hotels}
              selectedIds={selectedIds}
              loading={loading}
              selectedCountryId={selectedCountryId}
              searchQuery={searchQuery}
              onToggleSelection={toggleSelection}
            />
          </div>

          {/* 已選擇提示 */}
          {selectedIds.size > 0 && (
            <div className="text-sm text-morandi-gold bg-morandi-gold/10 px-4 py-2.5 rounded-xl border border-morandi-gold/30 flex items-center gap-2">
              <div className="w-6 h-6 bg-morandi-gold rounded-full flex items-center justify-center text-white text-xs font-bold">
                {selectedIds.size}
              </div>
              已選擇 {selectedIds.size} 間飯店
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/50">
          <Button variant="outline" onClick={handleCancel} className="rounded-xl">
            {HOTEL_SELECTOR_LABELS.CANCEL}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedIds.size === 0}
            className="bg-morandi-gold hover:bg-morandi-gold-hover text-white rounded-xl min-w-[120px]"
          >
            新增飯店 ({selectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
