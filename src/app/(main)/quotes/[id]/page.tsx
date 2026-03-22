'use client'

import React, { useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { ParticipantCounts, SellingPrices } from '@/features/quotes/types'
import type { Tour as TourType } from '@/types/tour.types'
import { useQuoteState } from '@/features/quotes/hooks/useQuoteState'
import { useCategoryOperations } from '@/features/quotes/hooks/useCategoryOperations'
import { useQuoteCalculations } from '@/features/quotes/hooks/useQuoteCalculations'
import { useQuoteActions } from '@/features/quotes/hooks/useQuoteActions'
import { useSyncOperations } from './hooks/useSyncOperations'
import { useAuthStore } from '@/stores'
import { useItineraries, updateItinerary } from '@/data'
import { toast } from 'sonner'
import type { QuoteConfirmationStatus } from '@/types/quote.types'
import {
  QuoteHeader,
  CategorySection,
  SellingPriceSection,
  SyncToItineraryDialog,
  PrintableQuotation,
  LinkTourDialog,
  LocalPricingDialog,
} from '@/features/quotes/components'
import type { LocalTier } from '@/features/quotes/components/LocalPricingDialog'
import { NotFoundState } from '@/components/ui/not-found-state'
import type { MealDiff } from '@/features/quotes/components'
import type { CostItem } from '@/features/quotes/types'
import type { Itinerary, CreateInput, Tour } from '@/stores/types'
// TourType imported above from @/types/tour.types
import { EditingWarningBanner } from '@/components/EditingWarningBanner'
import {
  calculateTierParticipantCounts,
  calculateTierCosts,
  calculateIdentityProfits,
  generateUniqueId,
} from '@/features/quotes/utils/priceCalculations'
import { ID_LABELS } from './constants/labels'
import { QUOTE_PAGE_LABELS, QUOTE_SYNC_LABELS } from './constants/labels'

export default function QuoteDetailPage() {
  // Scroll handling refs (必須在任何條件判斷之前宣告)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // State management hook
  const quoteState = useQuoteState()
  const {
    quote,
    relatedTour,
    isSpecialTour,
    isReadOnly,
    categories,
    setCategories,
    accommodationDays,
    setAccommodationDays,
    participantCounts,
    setParticipantCounts,
    groupSize,
    groupSizeForGuide,
    quoteName,
    setQuoteName,
    saveSuccess,
    setSaveSuccess,
    sellingPrices,
    setSellingPrices,
    // 砍次表相關
    tierPricings,
    setTierPricings,
    // 核心表
    coreItems,
    refreshCoreItems,
    // 404 狀態
    notFound,
    hasLoaded,
    updateQuote,
    addTour,
    router,
  } = quoteState

  // Itinerary data for sync
  const { items: itineraries } = useItineraries()

  // Auth store for staff info
  const { user } = useAuthStore()

  // 處理確認狀態變更
  const handleConfirmationStatusChange = React.useCallback(
    async (status: QuoteConfirmationStatus) => {
      if (!quote) return
      try {
        await updateQuote(quote.id, { confirmation_status: status })
      } catch (error) {
        const { toast } = await import('sonner')
        toast.error(QUOTE_PAGE_LABELS.UPDATE_STATUS_FAILED)
      }
    },
    [quote, updateQuote]
  )

  // Sync operations hook
  const syncOps = useSyncOperations({
    quote: quote ?? null,
    categories,
    accommodationDays,
    itineraries,
    updateItinerary: updateItinerary as unknown as (
      id: string,
      data: Partial<Itinerary>
    ) => Promise<void>,
    router,
  })

  // Category operations hook
  const categoryOps = useCategoryOperations({
    categories,
    setCategories,
    accommodationDays,
    setAccommodationDays,
    groupSize,
    groupSizeForGuide,
  })

  // Calculations hook
  const calculations = useQuoteCalculations({
    categories,
    participantCounts,
    sellingPrices,
  })
  const {
    accommodationSummary,
    accommodationTotal,
    updatedCategories,
    identityCosts,
    identityProfits,
    total_cost,
  } = calculations

  // Actions hook
  const actions = useQuoteActions({
    quote,
    updateQuote,
    addTour: addTour as unknown as (data: CreateInput<Tour>) => Promise<Tour | undefined>,
    router,
    updatedCategories,
    total_cost,
    groupSize,
    groupSizeForGuide,
    quoteName,
    accommodationDays,
    participantCounts,
    sellingPrices,
    setSaveSuccess,
    setCategories,
    tierPricings,
    coreItems,
    refreshCoreItems,
  })
  const { handleSave, handleCreateTour } = actions

  // 同步到行程表 - 狀態
  const [isSyncDialogOpen, setIsSyncDialogOpen] = React.useState(false)
  const [syncDiffs, setSyncDiffs] = React.useState<MealDiff[]>([])
  const [syncItineraryTitle, setSyncItineraryTitle] = React.useState<string>('')

  // 開啟同步對話框
  const handleSyncToItinerary = useCallback(() => {
    if (!quote?.itinerary_id) {
      toast.error(QUOTE_SYNC_LABELS.NO_LINKED_ITINERARY)
      return
    }

    const result = syncOps.calculateSyncDiffs()
    if (!result) {
      toast.error(QUOTE_SYNC_LABELS.ITINERARY_NOT_FOUND)
      return
    }

    if (result.diffs.length === 0) {
      toast.info(QUOTE_PAGE_LABELS.NO_SYNC_CHANGES)
      return
    }

    setSyncDiffs(result.diffs)
    setSyncItineraryTitle(result.itinerary.title || result.itinerary.tagline || '')
    setIsSyncDialogOpen(true)
  }, [quote, syncOps])

  // 確認同步
  const handleConfirmSync = useCallback(() => {
    syncOps.handleConfirmSync(syncDiffs)
  }, [syncOps, syncDiffs])

  // 報價單預覽
  const [showQuotationPreview, setShowQuotationPreview] = React.useState(false)
  // 關聯旅遊團對話框
  const [showLinkTourDialog, setShowLinkTourDialog] = React.useState(false)
  // Local 報價對話框
  const [showLocalPricingDialog, setShowLocalPricingDialog] = React.useState(false)
  // Local 報價檔次資料持久化
  const [localTiers, setLocalTiers] = React.useState<LocalTier[]>([])

  // 處理狀態變更
  const handleStatusChange = React.useCallback(
    (status: 'proposed' | 'approved', showLinkDialog?: boolean) => {
      if (!quote) return

      if (status === 'approved' && showLinkDialog) {
        // 成交時顯示關聯旅遊團對話框
        setShowLinkTourDialog(true)
      } else {
        // 直接更新狀態
        updateQuote(quote.id, { status })
      }
    },
    [quote, updateQuote]
  )

  // 處理新建旅遊團
  const handleCreateNewTour = React.useCallback(() => {
    if (!quote) return
    // 先更新狀態為進行中（綁定旅遊團後自動變更）
    updateQuote(quote.id, { status: '待出發' })
    // 呼叫原本的建立旅遊團功能
    handleCreateTour()
  }, [quote, updateQuote, handleCreateTour])

  // 處理關聯現有旅遊團
  const handleLinkExistingTour = React.useCallback(
    async (tour: { id: string; code: string }) => {
      if (!quote) return
      // 更新報價單狀態和關聯旅遊團（綁定後自動變更為進行中）
      await updateQuote(quote.id, {
        status: '待出發',
        tour_id: tour.id,
      })
      // 更新旅遊團的 quote_id
      const { updateTour } = await import('@/data')
      await updateTour(tour.id, { quote_id: quote.id })
      toast.success(QUOTE_PAGE_LABELS.TOUR_LINKED(tour.code))
    },
    [quote, updateQuote]
  )

  // 計算總人數（成人 + 兒童佔床 + 兒童不佔床 + 單人房）
  const totalParticipants = React.useMemo(() => {
    return (
      (participantCounts.adult || 0) +
      (participantCounts.child_with_bed || 0) +
      (participantCounts.child_no_bed || 0) +
      (participantCounts.single_room || 0)
    )
  }, [participantCounts])

  // 處理 Local 報價確認
  const handleLocalPricingConfirm = React.useCallback(
    (tiers: LocalTier[], _matchedTierIndex: number) => {
      // 儲存檔次資料（持久化）
      setLocalTiers(tiers)

      const sortedTiers = [...tiers].sort((a, b) => a.participants - b.participants)

      // 找到目前人數對應的檻次索引
      let currentTierIdx = 0
      for (let i = 0; i < sortedTiers.length; i++) {
        if (sortedTiers[i].participants <= totalParticipants) {
          currentTierIdx = i
        }
      }
      const currentLocalPrice = sortedTiers[currentTierIdx]?.unitPrice || 0

      // 產生檻次表：全部使用用戶輸入的檻次人數
      const newTierPricings = sortedTiers.map(tier => {
        const participantCount = tier.participants
        const localUnitPrice = tier.unitPrice

        // 計算新的人數分布（保持原始比例）
        const newCounts = calculateTierParticipantCounts(participantCount, participantCounts)

        // 計算新的成本（不含 Local）
        const baseCosts = calculateTierCosts(categories, newCounts, participantCounts)

        // 加上 Local 單價
        const newCosts = {
          adult: baseCosts.adult + localUnitPrice,
          child_with_bed: baseCosts.child_with_bed + localUnitPrice,
          child_no_bed: baseCosts.child_no_bed + localUnitPrice,
          single_room: baseCosts.single_room + localUnitPrice,
          infant: baseCosts.infant, // 嬰兒不算 Local
        }

        return {
          id: generateUniqueId(),
          participant_count: participantCount,
          participant_counts: newCounts,
          identity_costs: newCosts,
          selling_prices: { ...sellingPrices },
          identity_profits: calculateIdentityProfits(sellingPrices, newCosts),
        }
      })

      // 在團體分攤創建 Local 報價項目（顯示用，total=0 不參與計算）
      setCategories(prev => {
        const newCategories = [...prev]
        const groupTransportCategory = newCategories.find(cat => cat.id === 'group-transport')
        if (groupTransportCategory) {
          // 移除舊的 Local 報價項目
          groupTransportCategory.items = groupTransportCategory.items.filter(
            item => !item.name.startsWith(QUOTE_PAGE_LABELS.LOCAL_QUOTE)
          )

          // 新增多個 Local 報價項目（每個階梯一個列）
          sortedTiers.forEach((tier, index) => {
            // 判斷是否為目前適用的階梯
            const isCurrentTier =
              tier.participants <= totalParticipants &&
              (index === sortedTiers.length - 1 ||
                sortedTiers[index + 1].participants > totalParticipants)

            const newItem: CostItem = {
              id: `local-${tier.participants}-${Date.now()}`,
              name: `${QUOTE_PAGE_LABELS.LOCAL_QUOTE} ${tier.participants}人`,
              quantity: 1,
              unit_price: tier.unitPrice,
              total: 0, // 不參與計算，砍次表會單獨處理
              note: isCurrentTier ? '✓ 目前適用' : '',
            }
            groupTransportCategory.items.push(newItem)
          })
        }
        return newCategories
      })

      setTierPricings(newTierPricings)
      toast.success(QUOTE_PAGE_LABELS.LOCAL_APPLIED(newTierPricings.length))
    },
    [
      totalParticipants,
      participantCounts,
      categories,
      sellingPrices,
      setCategories,
      setTierPricings,
    ]
  )
  const [previewParticipantCounts, setPreviewParticipantCounts] =
    React.useState<ParticipantCounts | null>(null)
  const [previewSellingPrices, setPreviewSellingPrices] = React.useState<SellingPrices | null>(null)
  const [previewTierLabel, setPreviewTierLabel] = React.useState<string | undefined>(undefined)
  const [previewTierPricings, setPreviewTierPricings] = React.useState<
    Array<{
      participant_count: number
      selling_prices: SellingPrices
    }>
  >([])

  const handleGenerateQuotation = useCallback(
    (
      tierParticipantCounts?: ParticipantCounts,
      tierSellingPrices?: SellingPrices,
      tierLabel?: string,
      allTierPricings?: Array<{
        participant_count: number
        selling_prices: SellingPrices
      }>
    ) => {
      // 如果有傳入檻次表數據，使用檻次表數據；否則使用原始數據
      setPreviewParticipantCounts(tierParticipantCounts || null)
      setPreviewSellingPrices(tierSellingPrices || null)
      setPreviewTierLabel(tierLabel)
      setPreviewTierPricings(allTierPricings || [])
      setShowQuotationPreview(true)
    },
    []
  )

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleClosePreview = useCallback(() => {
    setShowQuotationPreview(false)
  }, [])

  // Scroll handling effect (必須在任何條件判斷之前)
  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        scrollRef.current.classList.add('scrolling')

        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }

        scrollTimeoutRef.current = setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.classList.remove('scrolling')
          }
        }, 1000)
      }
    }

    const element = scrollRef.current
    if (element) {
      element.addEventListener('scroll', handleScroll)
      return () => element.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // 如果還在載入，顯示載入中
  if (!hasLoaded) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-morandi-gold mx-auto mb-4"></div>
          <p className="text-morandi-secondary">{ID_LABELS.LOADING_6912}</p>
        </div>
      </div>
    )
  }

  // 如果資料已載入但找不到報價單，顯示 404 狀態
  if (notFound) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <NotFoundState
          title={ID_LABELS.NOT_FOUND_4550}
          description={ID_LABELS.DELETE_642}
          backButtonLabel={QUOTE_PAGE_LABELS.BACK_TO_LIST}
          backHref="/quotes"
        />
      </div>
    )
  }

  // 最後的 null 檢查（理論上不應到達這裡）
  if (!quote) {
    return null
  }

  return (
    <div className="w-full max-w-full space-y-6 pb-6">
      {/* 編輯衝突警告 */}
      <EditingWarningBanner
        resourceType="quote"
        resourceId={quote.id}
        resourceName={QUOTE_PAGE_LABELS.THIS_QUOTE}
      />

      <QuoteHeader
        isSpecialTour={isSpecialTour}
        isReadOnly={isReadOnly}
        relatedTour={relatedTour as Tour | null}
        quote={quote as Parameters<typeof QuoteHeader>[0]['quote']}
        quoteName={quoteName}
        setQuoteName={setQuoteName}
        participantCounts={participantCounts}
        setParticipantCounts={setParticipantCounts}
        saveSuccess={saveSuccess}
        handleSave={handleSave}
        handleCreateTour={handleCreateTour}
        handleGenerateQuotation={handleGenerateQuotation}
        handleSyncToItinerary={handleSyncToItinerary}
        onStatusChange={handleStatusChange}
        router={router}
        accommodationDays={accommodationDays}
        contactInfo={{
          contact_person: quote.contact_person || '',
          contact_phone: quote.contact_phone || '',
          contact_address: quote.contact_address || '',
        }}
        onContactInfoChange={info => {
          updateQuote(quote.id, {
            contact_person: info.contact_person,
            contact_phone: info.contact_phone,
            contact_address: info.contact_address,
          })
        }}
        staffId={user?.id}
        staffName={user?.name || user?.email}
        onConfirmationStatusChange={handleConfirmationStatusChange}
      />

      <div className="w-full pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 w-full">
          {/* 左側：成本計算表格 - 70% */}
          <div
            className={cn(
              'lg:col-span-7',
              isReadOnly && 'opacity-70 pointer-events-none select-none'
            )}
          >
            <div className="border border-border bg-card rounded-xl shadow-sm">
              <div ref={scrollRef} className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse">
                  <thead className="bg-morandi-container/50 border-b border-border">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-morandi-charcoal w-12 table-divider">
                        {ID_LABELS.LABEL_2257}
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-morandi-charcoal w-70 table-divider">
                        {ID_LABELS.LABEL_7325}
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-morandi-charcoal w-20 table-divider">
                        {ID_LABELS.QUANTITY}
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-morandi-charcoal w-28 table-divider">
                        {ID_LABELS.LABEL_9413}
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-morandi-charcoal w-28 table-divider whitespace-nowrap">
                        {ID_LABELS.LABEL_832}
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-morandi-charcoal w-24">
                        {ID_LABELS.ACTIONS}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(category => (
                      <CategorySection
                        key={category.id}
                        category={category}
                        accommodationTotal={accommodationTotal}
                        accommodationDays={accommodationDays}
                        isReadOnly={isReadOnly}
                        handleAddAccommodationDay={categoryOps.handleAddAccommodationDay}
                        handleAddRow={categoryOps.handleAddRow}
                        handleInsertItem={categoryOps.handleInsertItem}
                        handleAddGuideRow={categoryOps.handleAddGuideRow}
                        handleAddTransportRow={categoryOps.handleAddTransportRow}
                        handleAddAdultTicket={categoryOps.handleAddAdultTicket}
                        handleAddChildTicket={categoryOps.handleAddChildTicket}
                        handleAddInfantTicket={categoryOps.handleAddInfantTicket}
                        handleAddLunchMeal={categoryOps.handleAddLunchMeal}
                        handleAddDinnerMeal={categoryOps.handleAddDinnerMeal}
                        handleAddActivity={categoryOps.handleAddActivity}
                        handleUpdateItem={categoryOps.handleUpdateItem}
                        handleRemoveItem={categoryOps.handleRemoveItem}
                        onOpenLocalPricingDialog={
                          category.id === 'group-transport'
                            ? () => setShowLocalPricingDialog(true)
                            : undefined
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 右側：報價設定 - 30% */}
          <SellingPriceSection
            participantCounts={participantCounts}
            setParticipantCounts={setParticipantCounts}
            identityCosts={identityCosts}
            sellingPrices={sellingPrices}
            setSellingPrices={setSellingPrices}
            identityProfits={identityProfits}
            isReadOnly={isReadOnly}
            handleSave={handleSave}
            handleGenerateQuotation={handleGenerateQuotation}
            accommodationSummary={accommodationSummary}
            categories={categories}
            tierPricings={tierPricings}
            setTierPricings={setTierPricings}
          />
        </div>
      </div>

      {/* 同步到行程表對話框 */}
      <SyncToItineraryDialog
        isOpen={isSyncDialogOpen}
        onClose={() => setIsSyncDialogOpen(false)}
        onConfirm={handleConfirmSync}
        diffs={syncDiffs}
        itineraryTitle={syncItineraryTitle}
      />

      {/* 可列印的報價單 */}
      <PrintableQuotation
        quote={quote as unknown as Parameters<typeof PrintableQuotation>[0]['quote']}
        quoteName={quoteName}
        participantCounts={previewParticipantCounts || participantCounts}
        sellingPrices={previewSellingPrices || sellingPrices}
        categories={updatedCategories}
        totalCost={total_cost}
        isOpen={showQuotationPreview}
        onClose={handleClosePreview}
        onPrint={handlePrint}
        accommodationSummary={accommodationSummary}
        tierLabel={previewTierLabel}
        tierPricings={previewTierPricings}
      />

      {/* 關聯旅遊團對話框 */}
      <LinkTourDialog
        isOpen={showLinkTourDialog}
        onClose={() => setShowLinkTourDialog(false)}
        onCreateNew={handleCreateNewTour}
        onLinkExisting={handleLinkExistingTour}
      />

      {/* Local 報價對話框 */}
      <LocalPricingDialog
        isOpen={showLocalPricingDialog}
        onClose={() => setShowLocalPricingDialog(false)}
        totalParticipants={totalParticipants}
        onConfirm={handleLocalPricingConfirm}
        initialTiers={localTiers}
      />
    </div>
  )
}
