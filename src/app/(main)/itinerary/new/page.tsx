'use client'

import { EDITOR_LABELS } from '../constants/labels'

import React, { useState, Suspense, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/utils/logger'
import { PrintItineraryForm } from '@/features/itinerary/components/PrintItineraryForm'
import { PrintItineraryPreview } from '@/features/itinerary/components/PrintItineraryPreview'
import { EditingWarningBanner } from '@/components/EditingWarningBanner'
import { Printer } from 'lucide-react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { useItineraryEditor } from './hooks/useItineraryEditor'
import { useItineraryDataLoader } from './hooks/useItineraryDataLoader'
import { ItineraryHeader } from './components/ItineraryHeader'
import { ItineraryEditor } from './components/ItineraryEditor'
import { ItineraryPreview } from './components/ItineraryPreview'
import { useItineraries } from '@/data'
import type { ItineraryVersionRecord } from '@/stores/types'
import { useSearchParams } from 'next/navigation'

function NewItineraryPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const type = searchParams.get('type')

  const [loading, setLoading] = useState(true)

  const {
    tourData,
    setTourData,
    updateTourData,
    isDirty,
    setIsDirty,
    autoSaveStatus,
    currentItineraryId,
    currentVersionIndex,
    setCurrentVersionIndex,
    handleVersionChange: baseHandleVersionChange,
    quoteTierPricings,
    setQuoteTierPricings,
    isHandedOff,
    setIsHandedOff,
    hasLinkedQuote,
    setHasLinkedQuote,
  } = useItineraryEditor()

  const { items: itineraries } = useItineraries()

  // 載入資料
  useItineraryDataLoader({
    setTourData,
    setLoading,
    setCurrentVersionIndex,
    setQuoteTierPricings,
    setIsHandedOff,
    setHasLinkedQuote,
  })

  // 版本切換處理
  const handleVersionChange = useCallback(
    (index: number, versionData?: ItineraryVersionRecord) => {
      setCurrentVersionIndex(index)

      if (index === -1) {
        // 切回主版本
        const itinerary = itineraries.find(i => i.id === currentItineraryId)
        if (itinerary) {
          setTourData(prev => ({
            ...prev,
            dailyItinerary: itinerary.daily_itinerary || [],
            features: itinerary.features || [],
            focusCards: itinerary.focus_cards || [],
            leader: itinerary.leader || { name: '', domesticPhone: '', overseasPhone: '' },
            meetingInfo: itinerary.meeting_info || { time: '', location: '' },
          }))
        }
      } else if (versionData) {
        // 切換到特定版本
        setTourData(prev => ({
          ...prev,
          dailyItinerary: versionData.daily_itinerary || [],
          features: versionData.features || [],
          focusCards: versionData.focus_cards || [],
          leader: versionData.leader || { name: '', domesticPhone: '', overseasPhone: '' },
          meetingInfo: versionData.meeting_info || { time: '', location: '' },
        }))
      }

      baseHandleVersionChange(index, versionData)
    },
    [currentItineraryId, itineraries, setTourData, setCurrentVersionIndex, baseHandleVersionChange]
  )

  // Print itinerary data (只在 type === 'print' 時使用)
  const [printData, setPrintData] = useState({
    coverImage: '',
    tagline: '精選行程',
    taglineEn: 'EXPLORE THE WORLD',
    title: '越南峴港經典五日',
    subtitle:
      '峴港的晨曦喚醒沉睡的古城，海風捎來遠方的故事\n在黃牆老屋與法式城堡之間，找到屬於自己的越式慢時光',
    price: '35,500',
    priceNote: '8人包團',
    country: '越南',
    city: '峴港',
    dailySchedule: [
      {
        day: 'D1',
        route: '桃園國際機場 > 峴港國際機場 > 五行山（含上下電梯）> 會安古鎮 > 飯店休憩',
        meals: { breakfast: '機上餐食', lunch: 'Bep Cuon', dinner: 'HOME Hoi An' },
        accommodation: '日出大宮殿飯店 Grand Sunrise Palace Hoi An 或 同級',
      },
      {
        day: 'D2',
        route: '晨喚 > 迦南島（竹筏體驗）> 美山聖地 > 越式按摩（2hrs）> 飯店休憩',
        meals: { breakfast: '飯店用餐', lunch: '海鮮火鍋', dinner: 'Morning Glory Original' },
        accommodation: '日出大宮殿飯店 Grand Sunrise Palace Hoi An 或 同級',
      },
      {
        day: 'D3',
        route: '晨喚 > 南會安珍珠奇幻樂園 > 會安印象主題公園 > 會安印象秀 > 飯店休憩',
        meals: { breakfast: '飯店用餐', lunch: '敬請自理', dinner: 'Non La 斗笠餐廳' },
        accommodation: '日出大宮殿飯店 Grand Sunrise Palace Hoi An 或 同級',
      },
      {
        day: 'D4',
        route:
          '晨喚 > 巴拿山（登山纜車、黃金佛手橋、法式莊園、奇幻樂園）> 飯店休憩 > 山茶夜市（自由前往）',
        meals: { breakfast: '飯店用餐', lunch: '園區自助餐', dinner: 'All Seasons 四季餐廳' },
        accommodation: '峴港M飯店 M Hotel Danang 或 同級',
      },
      {
        day: 'D5',
        route: '晨喚 > 美溪沙灘（自由前往）> 峴港大教堂（外觀不入內）> 峴港國際機場 > 桃園國際機場',
        meals: { breakfast: '飯店用餐', lunch: '法國麵包+飲品', dinner: '機上餐食' },
        accommodation: '',
      },
    ],
    flightOptions: [
      {
        airline: '長榮航空',
        outbound: {
          code: 'BR-383',
          from: '桃園國際機場',
          fromCode: 'TPE',
          time: '09:45',
          to: '峴港國際機場',
          toCode: 'DAD',
          arrivalTime: '11:40',
        },
        return: {
          code: 'BR-384',
          from: '峴港國際機場',
          fromCode: 'DAD',
          time: '13:30',
          to: '桃園國際機場',
          toCode: 'TPE',
          arrivalTime: '16:50',
        },
      },
    ],
    highlightImages: ['', '', ''],
    highlightSpots: [
      {
        name: '會安古鎮',
        nameEn: 'Hoi An Ancient Town',
        tags: ['特色景點', '必訪景點'],
        description:
          '會安古鎮是越南世界文化遺產，黃牆古厝與絲綢燈籠交織，夜晚倒映河面如夢似幻，是體驗越南古典韻味的絕佳去處。',
      },
    ],
    sights: [
      {
        name: '五行山',
        nameEn: 'Marble Mountains',
        description:
          '五行山是峴港最具靈性的自然奇景，由五座石灰岩山峰組成，分別代表金、木、水、火、土五行元素。山中遍布神秘洞穴、古老佛寺與精緻石雕，其中華嚴洞和玄空洞最為壯觀，陽光從洞頂灑落的景象令人屏息。登上山頂可俯瞰峴港市區與美溪沙灘的絕美全景。這裡不僅是重要的佛教聖地，山腳下的石雕村更展現精湛的大理石工藝，是感受越南文化與自然之美的必訪之地。',
      },
    ],
  })

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-morandi-secondary">{EDITOR_LABELS.LOADING}</div>
      </div>
    )
  }

  // 列印版行程表
  if (type === 'print') {
    return (
      <ContentPageLayout
        title={EDITOR_LABELS.ADD_9998}
        breadcrumb={[
          { label: EDITOR_LABELS.BREADCRUMB_ITINERARY_MGMT, href: '/itinerary' },
          { label: EDITOR_LABELS.ADD_9998, href: '#' },
        ]}
        headerActions={
          <Button
            onClick={() => window.print()}
            className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
          >
            <Printer size={16} className="mr-2" />
            {EDITOR_LABELS.PRINT}
          </Button>
        }
        contentClassName="flex-1 overflow-hidden"
      >
        <div className="h-full flex">
          <div className="w-1/2 bg-morandi-container/30 border-r border-morandi-container flex flex-col print:hidden">
            <div className="h-14 bg-morandi-green/90 text-white px-6 flex items-center border-b border-morandi-container">
              <h2 className="text-lg font-semibold">{EDITOR_LABELS.EDIT_FORM}</h2>
            </div>
            <div className="flex-1 overflow-y-auto bg-card">
              <PrintItineraryForm data={printData} onChange={setPrintData} />
            </div>
          </div>

          <div className="w-1/2 bg-muted flex flex-col print:w-full">
            <div className="h-14 bg-card border-b border-border px-6 flex items-center justify-between print:hidden">
              <h2 className="text-lg font-semibold text-morandi-primary">
                {EDITOR_LABELS.PRINT_PREVIEW}
              </h2>
              <div className="text-sm text-morandi-secondary">{EDITOR_LABELS.A4_SIZE}</div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 print:p-0">
              <PrintItineraryPreview data={printData} />
            </div>
          </div>
        </div>
      </ContentPageLayout>
    )
  }

  // 網頁版行程表
  return (
    <div className="h-full flex flex-col">
      <ItineraryHeader
        tourData={tourData}
        itineraryId={currentItineraryId}
        currentVersionIndex={currentVersionIndex}
        onVersionChange={handleVersionChange}
        onVersionRecordsChange={versionRecords => {
          setTourData(prev => ({ ...prev, version_records: versionRecords }))
        }}
        onBack={() => router.back()}
      />

      {currentItineraryId && (
        <EditingWarningBanner
          resourceType="itinerary"
          resourceId={currentItineraryId}
          resourceName={EDITOR_LABELS.THIS_ITINERARY}
        />
      )}

      {/* 交接唯讀提示 */}
      {isHandedOff && (
        <div className="bg-morandi-gold/10 border-b border-morandi-gold/30 px-4 py-3 flex items-center gap-3">
          <span className="material-symbols-outlined text-morandi-gold">lock</span>
          <div>
            <p className="text-sm font-medium text-morandi-primary">{EDITOR_LABELS.HANDOVER_NOTICE}</p>
            <p className="text-xs text-morandi-gold">{EDITOR_LABELS.HANDOVER_DESC}</p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          <ItineraryEditor
            tourData={tourData}
            autoSaveStatus={autoSaveStatus}
            isDirty={isDirty}
            quoteTierPricings={quoteTierPricings}
            hasLinkedQuote={hasLinkedQuote}
            className={isHandedOff ? 'pointer-events-none opacity-60' : ''}
            onChange={newData => {
              if (isHandedOff) return // 已交接，禁止編輯
              logger.log('[Page] ItineraryEditor onChange 收到:', {
                coverImage: newData.coverImage,
              })
              setTourData(newData)
              setIsDirty(true)
            }}
          />

          <ItineraryPreview tourData={tourData} />
        </div>
      </div>
    </div>
  )
}

export default function NewItineraryPage() {
  return (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-morandi-gold mx-auto mb-4"></div>
            <p className="text-morandi-secondary">{EDITOR_LABELS.LOADING}</p>
          </div>
        </div>
      }
    >
      <NewItineraryPageContent />
    </Suspense>
  )
}
