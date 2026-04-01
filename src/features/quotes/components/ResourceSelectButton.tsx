'use client'

import React, { useState } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CostItem, CostItemResourceType } from '../types'
import { RestaurantSelector, CombinedRestaurant } from '@/components/editor/RestaurantSelector'
import { HotelSelector } from '@/components/editor/hotel-selector'
import { AttractionSelector } from '@/components/editor/attraction-selector'
import { RESOURCE_SELECT_BUTTON_LABELS } from '../constants/labels'

interface ResourceSelectButtonProps {
  categoryId: string
  item: CostItem
  onUpdateItem: (categoryId: string, itemId: string, field: keyof CostItem, value: unknown) => void
  disabled?: boolean
}

/**
 * 資源選擇按鈕
 * 根據分類顯示對應的選擇器（餐廳/飯店/景點）
 */
export const ResourceSelectButton: React.FC<ResourceSelectButtonProps> = ({
  categoryId,
  item,
  onUpdateItem,
  disabled = false,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // 根據分類決定資源類型
  const getResourceType = (): CostItemResourceType | null => {
    switch (categoryId) {
      case 'meals':
        return 'restaurant'
      case 'accommodation':
        return 'hotel'
      case 'activities':
        return 'attraction'
      default:
        return null
    }
  }

  const resourceType = getResourceType()

  // 如果分類不支援資源選擇，不顯示按鈕
  if (!resourceType) {
    return null
  }

  // 處理餐廳選擇
  const handleRestaurantSelect = (restaurants: CombinedRestaurant[]) => {
    if (restaurants.length === 0) return

    const restaurant = restaurants[0]

    // 更新項目的多個欄位
    onUpdateItem(categoryId, item.id, 'name', restaurant.name)
    onUpdateItem(categoryId, item.id, 'resource_type', 'restaurant')
    onUpdateItem(categoryId, item.id, 'resource_id', restaurant.id)

    // 更新 GPS 資訊（從 CombinedRestaurant 取得）
    if (restaurant.latitude)
      onUpdateItem(categoryId, item.id, 'resource_latitude', restaurant.latitude)
    if (restaurant.longitude)
      onUpdateItem(categoryId, item.id, 'resource_longitude', restaurant.longitude)
    if (restaurant.address)
      onUpdateItem(categoryId, item.id, 'resource_address', restaurant.address)
    if (restaurant.phone) onUpdateItem(categoryId, item.id, 'resource_phone', restaurant.phone)
    if (restaurant.google_maps_url)
      onUpdateItem(categoryId, item.id, 'resource_google_maps_url', restaurant.google_maps_url)
  }

  // 處理飯店選擇
  const handleHotelSelect = (
    hotels: Array<{
      id: string
      name: string
      latitude?: number | null
      longitude?: number | null
      address?: string | null
      google_maps_url?: string | null
    }>
  ) => {
    if (hotels.length === 0) return

    const hotel = hotels[0]

    onUpdateItem(categoryId, item.id, 'name', hotel.name)
    onUpdateItem(categoryId, item.id, 'resource_type', 'hotel')
    onUpdateItem(categoryId, item.id, 'resource_id', hotel.id)

    // 更新 GPS 資訊
    if (hotel.latitude) onUpdateItem(categoryId, item.id, 'resource_latitude', hotel.latitude)
    if (hotel.longitude) onUpdateItem(categoryId, item.id, 'resource_longitude', hotel.longitude)
    if (hotel.address) onUpdateItem(categoryId, item.id, 'resource_address', hotel.address)
    if (hotel.google_maps_url)
      onUpdateItem(categoryId, item.id, 'resource_google_maps_url', hotel.google_maps_url)
  }

  // 處理景點選擇
  const handleAttractionSelect = (
    attractions: Array<{
      id: string
      name: string
      latitude?: number | null
      longitude?: number | null
      address?: string | null
      google_maps_url?: string | null
      phone?: string | null
    }>
  ) => {
    if (attractions.length === 0) return

    const attraction = attractions[0]

    onUpdateItem(categoryId, item.id, 'name', attraction.name)
    onUpdateItem(categoryId, item.id, 'resource_type', 'attraction')
    onUpdateItem(categoryId, item.id, 'resource_id', attraction.id)

    // 更新 GPS 資訊
    if (attraction.latitude)
      onUpdateItem(categoryId, item.id, 'resource_latitude', attraction.latitude)
    if (attraction.longitude)
      onUpdateItem(categoryId, item.id, 'resource_longitude', attraction.longitude)
    if (attraction.address)
      onUpdateItem(categoryId, item.id, 'resource_address', attraction.address)
    if (attraction.phone) onUpdateItem(categoryId, item.id, 'resource_phone', attraction.phone)
    if (attraction.google_maps_url)
      onUpdateItem(categoryId, item.id, 'resource_google_maps_url', attraction.google_maps_url)
  }

  // 按鈕顏色根據資源類型
  const buttonColorMap: Record<string, string> = {
    restaurant: 'text-morandi-red hover:bg-morandi-red/10',
    hotel: 'text-status-info hover:bg-status-info-bg',
    attraction: 'text-morandi-green hover:bg-morandi-green/10',
  }
  const buttonColor = buttonColorMap[resourceType]

  // 按鈕提示文字
  const buttonTitleMap: Record<string, string> = {
    restaurant: RESOURCE_SELECT_BUTTON_LABELS.選擇餐廳,
    hotel: RESOURCE_SELECT_BUTTON_LABELS.選擇飯店,
    attraction: RESOURCE_SELECT_BUTTON_LABELS.選擇景點,
  }
  const buttonTitle = buttonTitleMap[resourceType]

  return (
    <>
      <button
        type="button"
        onClick={() => setIsDialogOpen(true)}
        disabled={disabled}
        className={cn(
          'p-1 rounded transition-colors',
          buttonColor,
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        title={buttonTitle}
      >
        <Search size={14} />
      </button>

      {/* 餐廳選擇器 */}
      {resourceType === 'restaurant' && (
        <RestaurantSelector
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSelect={handleRestaurantSelect}
        />
      )}

      {/* 飯店選擇器 */}
      {resourceType === 'hotel' && (
        <HotelSelector
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSelect={handleHotelSelect}
        />
      )}

      {/* 景點選擇器 */}
      {resourceType === 'attraction' && (
        <AttractionSelector
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSelect={handleAttractionSelect}
        />
      )}
    </>
  )
}
