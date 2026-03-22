'use client'

import { COMPANY_NAME } from '@/lib/tenant'

/**
 * DesignTypeSelector - 設計類型選擇器
 * 整合團、行程、模板選擇功能
 */

import { useState, useEffect } from 'react'
import { BookOpen, Instagram, Image as ImageIcon, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Tour, Itinerary } from '@/stores/types'
import { DESIGNER_LABELS } from './constants/labels'
import { logger } from '@/lib/utils/logger'

// ============================================
// 設計類型定義
// ============================================
export interface DesignType {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  width: number
  height: number
  category: 'print' | 'social' | 'banner'
  bleed?: number // 出血區域像素（印刷用）
}

export const DESIGN_TYPES: DesignType[] = [
  {
    id: 'brochure-a5',
    name: '手冊 A5',
    description: '148 x 210 mm (含 3mm 出血)',
    icon: <BookOpen size={32} />,
    width: 1819,
    height: 2551,
    category: 'print',
    bleed: 35, // 3mm @ 300DPI ≈ 35px
  },
  {
    id: 'brochure-a4',
    name: '手冊 A4',
    description: '210 x 297 mm (含 3mm 出血)',
    icon: <BookOpen size={32} />,
    width: 2551,
    height: 3579,
    category: 'print',
    bleed: 35,
  },
  {
    id: 'ig-square',
    name: 'IG 正方形',
    description: '1080 x 1080 px',
    icon: <Instagram size={32} />,
    width: 1080,
    height: 1080,
    category: 'social',
  },
  {
    id: 'ig-portrait',
    name: 'IG 直式',
    description: '1080 x 1350 px',
    icon: <Instagram size={32} />,
    width: 1080,
    height: 1350,
    category: 'social',
  },
  {
    id: 'ig-story',
    name: 'IG 限時動態',
    description: '1080 x 1920 px',
    icon: <Instagram size={32} />,
    width: 1080,
    height: 1920,
    category: 'social',
  },
  {
    id: 'banner-wide',
    name: '橫幅布條',
    description: '1200 x 400 px',
    icon: <ImageIcon size={32} />,
    width: 1200,
    height: 400,
    category: 'banner',
  },
  {
    id: 'banner-square',
    name: '方形廣告',
    description: '800 x 800 px',
    icon: <ImageIcon size={32} />,
    width: 800,
    height: 800,
    category: 'banner',
  },
]

interface DesignTypeSelectorProps {
  onSelect: (type: DesignType) => void
  onBrochureStart: (
    type: DesignType,
    tourId: string,
    itineraryId: string | null,
    styleId: string
  ) => void
  sidebarWidth: string
  workspaceId: string | undefined
  preselectedTourId?: string | null
  preselectedItineraryId?: string | null
}

export function DesignTypeSelector({
  onSelect,
  onBrochureStart,
  sidebarWidth,
  workspaceId,
  preselectedTourId,
  preselectedItineraryId,
}: DesignTypeSelectorProps) {
  const [tours, setTours] = useState<Tour[]>([])
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [selectedDesignTypeId, setSelectedDesignTypeId] = useState('')
  const [selectedTourId, setSelectedTourId] = useState(preselectedTourId || '')
  const [selectedItineraryId, setSelectedItineraryId] = useState(preselectedItineraryId || '')
  const [selectedStyleId, setSelectedStyleId] = useState('japanese-style-v1')
  const [loadingTours, setLoadingTours] = useState(false)
  const [loadingItineraries, setLoadingItineraries] = useState(false)

  const selectedDesignType = DESIGN_TYPES.find(t => t.id === selectedDesignTypeId)
  const isBrochureType = selectedDesignTypeId.startsWith('brochure-')
  const showTourSelector = isBrochureType && !preselectedTourId
  const canStart = selectedDesignTypeId && (!isBrochureType || selectedTourId || preselectedTourId)

  // 載入團列表
  useEffect(() => {
    if (!workspaceId || !isBrochureType) return

    const fetchTours = async () => {
      setLoadingTours(true)
      const { data } = await supabase
        .from('tours')
        .select('id, code, name, status, archived')
        .eq('workspace_id', workspaceId)
        .or('archived.is.null,archived.eq.false')
        .order('created_at', { ascending: false })
        .limit(100)

      if (data) setTours(data as Tour[])
      setLoadingTours(false)
    }

    fetchTours().catch(err => logger.error('[fetchTours]', err))
  }, [workspaceId, isBrochureType])

  // 載入行程列表
  useEffect(() => {
    const tourIdToUse = selectedTourId || preselectedTourId
    if (!tourIdToUse || !isBrochureType) {
      setItineraries([])
      return
    }

    const fetchItineraries = async () => {
      setLoadingItineraries(true)
      const { data } = await supabase
        .from('itineraries')
        .select('id, title, version')
        .eq('tour_id', tourIdToUse)
        .order('created_at', { ascending: false })

      if (data) setItineraries(data as unknown as Itinerary[])
      setLoadingItineraries(false)
    }

    fetchItineraries().catch(err => logger.error('[fetchItineraries]', err))
  }, [selectedTourId, preselectedTourId, isBrochureType])

  const handleDesignTypeChange = (value: string) => {
    setSelectedDesignTypeId(value)
    if (!preselectedTourId) {
      setSelectedTourId('')
      setSelectedItineraryId('')
    }
  }

  const handleTourChange = (value: string) => {
    setSelectedTourId(value)
    setSelectedItineraryId('')
  }

  const handleStart = () => {
    if (!selectedDesignType || !canStart) return

    if (isBrochureType) {
      const tourId = selectedTourId || preselectedTourId || ''
      const itineraryId = selectedItineraryId || preselectedItineraryId || null
      onBrochureStart(selectedDesignType, tourId, itineraryId, selectedStyleId)
    } else {
      onSelect(selectedDesignType)
    }
  }

  const categoryOptions = [
    { value: 'print', label: '印刷品', items: DESIGN_TYPES.filter(t => t.category === 'print') },
    {
      value: 'social',
      label: '社群媒體',
      items: DESIGN_TYPES.filter(t => t.category === 'social'),
    },
    {
      value: 'banner',
      label: '廣告橫幅',
      items: DESIGN_TYPES.filter(t => t.category === 'banner'),
    },
  ]

  const styleOptions = [
    { id: 'japanese-style-v1', name: '日系風格', description: '簡約優雅的日式設計' },
  ]

  return (
    <div
      className="fixed inset-0 bg-background transition-all duration-300 overflow-auto"
      style={{ left: sidebarWidth }}
    >
      {/* Header */}
      <div className="h-[72px] bg-background border-b border-border flex items-center px-6">
        <div className="flex items-center gap-3">
          <Palette size={24} className="text-morandi-gold" />
          <h1 className="text-xl font-semibold text-morandi-primary">{COMPANY_NAME} 設計工具</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-morandi-primary mb-2">
            {DESIGNER_LABELS.ADD_4567}
          </h2>
          <p className="text-morandi-secondary">{DESIGNER_LABELS.SELECT_3465}</p>
        </div>

        <div className="space-y-4">
          {/* 設計類型選擇 */}
          <div className="p-6 bg-card rounded-xl border border-border space-y-4">
            <div>
              <label className="text-sm font-medium text-morandi-primary mb-2 block">
                {DESIGNER_LABELS.LABEL_3670}
              </label>
              <Select value={selectedDesignTypeId} onValueChange={handleDesignTypeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={DESIGNER_LABELS.PLEASE_SELECT_8119} />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(category => (
                    <div key={category.value}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-morandi-secondary">
                        {category.label}
                      </div>
                      {category.items.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} - {type.description}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 手冊類型選項 */}
            {isBrochureType && (
              <>
                {showTourSelector && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div>
                      <label className="text-sm font-medium text-morandi-primary mb-2 block">
                        {DESIGNER_LABELS.LABEL_8171}
                      </label>
                      <Combobox
                        value={selectedTourId}
                        onChange={handleTourChange}
                        options={tours.map(tour => ({
                          value: tour.id,
                          label: tour.code
                            ? `${tour.code} - ${tour.name || ''}`
                            : tour.name || '(無名稱)',
                        }))}
                        placeholder={loadingTours ? '載入中...' : '搜尋或選擇旅遊團'}
                        emptyMessage="找不到符合的旅遊團"
                        disabled={loadingTours}
                        showSearchIcon
                        showClearButton
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-morandi-primary mb-2 block">
                        {DESIGNER_LABELS.LABEL_1624}
                      </label>
                      <Combobox
                        value={selectedItineraryId}
                        onChange={setSelectedItineraryId}
                        options={itineraries.map(itinerary => ({
                          value: itinerary.id,
                          label: itinerary.title || '(無名稱)',
                        }))}
                        placeholder={
                          !selectedTourId
                            ? '請先選擇旅遊團'
                            : loadingItineraries
                              ? '載入中...'
                              : itineraries.length === 0
                                ? '此團沒有行程'
                                : '搜尋或選擇行程'
                        }
                        emptyMessage="找不到符合的行程"
                        disabled={!selectedTourId || loadingItineraries}
                        showSearchIcon
                        showClearButton
                      />
                    </div>
                  </div>
                )}

                {/* 模板風格 */}
                <div
                  className={cn(
                    showTourSelector ? 'pt-4 border-t border-border' : 'pt-4 border-t border-border'
                  )}
                >
                  <label className="text-sm font-medium text-morandi-primary mb-2 block">
                    {DESIGNER_LABELS.LABEL_7216}
                  </label>
                  <Select value={selectedStyleId} onValueChange={setSelectedStyleId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {styleOptions.map(style => (
                        <SelectItem key={style.id} value={style.id}>
                          {style.name} - {style.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {/* 開始按鈕 */}
          <Button
            onClick={handleStart}
            disabled={!canStart}
            className="w-full bg-morandi-gold hover:bg-morandi-gold-hover text-white h-12 text-base"
          >
            {DESIGNER_LABELS.LABEL_8513}
          </Button>
        </div>
      </div>
    </div>
  )
}
