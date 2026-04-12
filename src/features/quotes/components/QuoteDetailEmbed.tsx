'use client'

/**
 * QuoteDetailEmbed - 可嵌入的報價單詳情元件
 *
 * 用於：
 * 1. 報價單頁面 /quotes/[id]
 * 2. 旅遊團報價單分頁
 *
 * 接收 quoteId 作為 prop，而不是從 URL 讀取
 */

import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ParticipantCounts, SellingPrices, CostCategory, CostItem } from '@/features/quotes/types'
import type { Tour } from '@/types/tour.types'
import { useQuotes } from '@/features/quotes/hooks/useQuotes'
import { useQuote as useQuoteDetail, useTour } from '@/data'
import { useCategoryOperations } from '@/features/quotes/hooks/useCategoryOperations'
import { useQuoteCalculations } from '@/features/quotes/hooks/useQuoteCalculations'
import { useQuoteActions } from '@/features/quotes/hooks/useQuoteActions'
import { useToursSlim, useItineraries, updateItinerary, createTour } from '@/data'
import { useTourItineraryItemsByTour } from '@/features/tours/hooks/useTourItineraryItems'
import { coreItemsToCostCategories } from '@/features/quotes/utils/core-table-adapter'
import { useAuthStore } from '@/stores'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
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
import { Loader2 } from 'lucide-react'
import type { MealDiff } from '@/features/quotes/components'
import type { Itinerary, CreateInput } from '@/stores/types'
import { EditingWarningBanner } from '@/components/EditingWarningBanner'
import {
  calculateTierParticipantCounts,
  calculateTierCosts,
  calculateIdentityProfits,
  generateUniqueId,
} from '@/features/quotes/utils/priceCalculations'
import { costCategories, TierPricing } from '@/features/quotes/types'
import { QUOTE_DETAIL_EMBED_LABELS } from '../constants/labels'
import { QUOTE_COMPONENT_LABELS } from '../constants/labels'

interface QuoteDetailEmbedProps {
  quoteId: string
  /** 是否顯示 header（在分頁模式下可能要隱藏） */
  showHeader?: boolean
}

export function QuoteDetailEmbed({ quoteId, showHeader = true }: QuoteDetailEmbedProps) {
  const router = useRouter()
  const { updateQuote } = useQuotes()
  const { item: quote, loading: quoteLoading } = useQuoteDetail(quoteId)
  const { items: tours } = useToursSlim()
  const { items: itineraries } = useItineraries()
  const { user } = useAuthStore()

  // Scroll handling refs
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // 完整 tour（含定價欄位）
  const { item: fullTour } = useTour(quote?.tour_id ?? null)

  // 核心表資料
  const {
    items: coreItems,
    loading: coreItemsLoading,
    refresh: refreshCoreItems,
  } = useTourItineraryItemsByTour(quote?.tour_id ?? null)

  // 行程資料（用於列印報價單）
  const itinerary = useMemo(() => {
    if (!quote?.tour_id) return null
    return itineraries.find(i => i.tour_id === quote.tour_id) || null
  }, [itineraries, quote?.tour_id])

  // 檢查是否為特殊團報價單
  const relatedTour = quote?.tour_id ? tours.find(t => t.id === quote.tour_id) : null
  const isSpecialTour = relatedTour?.status === QUOTE_DETAIL_EMBED_LABELS.特殊團

  // 定案後鎖定編輯（業務確認、客戶確認、已成交）
  const isConfirmed =
    quote?.confirmation_status === 'staff_confirmed' ||
    quote?.confirmation_status === 'customer_confirmed' ||
    quote?.confirmation_status === 'closed'
  const isReadOnly = isSpecialTour || isConfirmed

  // State
  const [categories, setCategories] = useState<CostCategory[]>([])
  const [accommodationDays, setAccommodationDays] = useState(0)
  const [participantCounts, setParticipantCounts] = useState<ParticipantCounts>({
    adult: 0,
    child_with_bed: 0,
    child_no_bed: 0,
    single_room: 0,
    infant: 0,
  })
  const [quoteName, setQuoteName] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [sellingPrices, setSellingPrices] = useState<SellingPrices>({
    adult: 0,
    child_with_bed: 0,
    child_no_bed: 0,
    single_room: 0,
    infant: 0,
  })
  const [tierPricings, setTierPricings] = useState<TierPricing[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)

  // 初始化資料：categories 從核心表讀取，定價從 fullTour 讀取（fallback 到 quote）
  useEffect(() => {
    if (quote && !hasLoaded) {
      // 有 tour_id 時，等核心表載入完成再決定資料來源（避免 race condition）
      if (quote.tour_id && coreItemsLoading) return

      // categories 優先從核心表讀取
      if (coreItems.length > 0) {
        setCategories(coreItemsToCostCategories(coreItems))
      } else if (quote.categories && quote.categories.length > 0) {
        setCategories(
          quote.categories.map(cat => ({
            ...cat,
            total: cat.items.reduce((sum: number, item: CostItem) => sum + (item.total || 0), 0),
          }))
        )
      } else {
        setCategories(costCategories)
      }

      // 定價欄位優先從 fullTour 讀取
      setAccommodationDays(fullTour?.accommodation_days ?? quote.accommodation_days ?? 0)
      setParticipantCounts(
        ((fullTour?.participant_counts ?? quote.participant_counts) as ParticipantCounts) || {
          adult: quote.group_size || 20,
          child_with_bed: 0,
          child_no_bed: 0,
          single_room: 0,
          infant: 0,
        }
      )
      setQuoteName(quote.name || '')
      setSellingPrices(
        ((fullTour?.selling_prices ?? quote.selling_prices) as SellingPrices) || {
          adult: 0,
          child_with_bed: 0,
          child_no_bed: 0,
          single_room: 0,
          infant: 0,
        }
      )
      setTierPricings((fullTour?.tier_pricings ?? quote.tier_pricings ?? []) as TierPricing[])
      setHasLoaded(true)
    }
  }, [quote, hasLoaded, fullTour, coreItems, coreItemsLoading])

  // Group size calculations
  const groupSize = useMemo(() => {
    return (
      (participantCounts.adult || 0) +
      (participantCounts.child_with_bed || 0) +
      (participantCounts.child_no_bed || 0) +
      (participantCounts.single_room || 0)
    )
  }, [participantCounts])

  const groupSizeForGuide = useMemo(() => {
    return (
      (participantCounts.adult || 0) +
      (participantCounts.child_with_bed || 0) +
      (participantCounts.child_no_bed || 0) +
      (participantCounts.single_room || 0) +
      (participantCounts.infant || 0)
    )
  }, [participantCounts])

  // Category operations hook
  const categoryOps = useCategoryOperations({
    categories,
    setCategories,
    accommodationDays,
    setAccommodationDays,
    groupSize,
    groupSizeForGuide,
  })

  // 切換項目在報價單/需求單的顯示狀態
  const handleToggleVisibility = useCallback(
    async (categoryId: string, itemId: string) => {
      const category = categories.find(c => c.id === categoryId)
      if (!category) return

      // 從 items 或 hiddenItems 找到該項目
      let item = category.items.find(i => i.id === itemId)
      let currentlyVisible = true
      if (!item) {
        item = category.hiddenItems?.find(i => i.id === itemId)
        currentlyVisible = false
      }
      if (!item?.itinerary_item_id) return

      const newVisibility = !currentlyVisible

      // 更新資料庫
      const { error } = await supabase
        .from('tour_itinerary_items')
        .update({ show_on_quote: newVisibility })
        .eq('id', item.itinerary_item_id)

      if (error) {
        toast.error('更新顯示狀態失敗')
        return
      }

      // 立即更新本地 categories state（不等 SWR revalidation）
      setCategories(prev =>
        prev.map(cat => {
          if (cat.id !== categoryId) return cat
          if (newVisibility) {
            // 恢復：從 hiddenItems 移到 items
            const restoredItem = cat.hiddenItems?.find(i => i.id === itemId)
            return {
              ...cat,
              items: restoredItem ? [...cat.items, restoredItem] : cat.items,
              hiddenItems: cat.hiddenItems?.filter(i => i.id !== itemId),
              total: cat.items.reduce((sum, i) => sum + i.total, 0) + (restoredItem?.total || 0),
            }
          } else {
            // 隱藏：從 items 移到 hiddenItems
            const hiddenItem = cat.items.find(i => i.id === itemId)
            return {
              ...cat,
              items: cat.items.filter(i => i.id !== itemId),
              hiddenItems: [
                ...(cat.hiddenItems || []),
                ...(hiddenItem ? [{ ...hiddenItem, show_on_quote: false }] : []),
              ],
              total: cat.items.filter(i => i.id !== itemId).reduce((sum, i) => sum + i.total, 0),
            }
          }
        })
      )
      // 背景同步 SWR cache
      refreshCoreItems()
      toast.success(newVisibility ? '已恢復顯示' : '已隱藏')
    },
    [categories, refreshCoreItems]
  )

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
    quote: quote || null,
    updateQuote,
    addTour: createTour as unknown as (data: CreateInput<Tour>) => Promise<Tour | undefined>,
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
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false)
  const [syncDiffs, setSyncDiffs] = useState<MealDiff[]>([])
  const [syncItineraryTitle, setSyncItineraryTitle] = useState<string>('')

  // 報價單預覽
  const [showQuotationPreview, setShowQuotationPreview] = useState(false)
  const [showLinkTourDialog, setShowLinkTourDialog] = useState(false)
  const [excludedItems, setExcludedItems] = useState<string[]>([
    '個人護照費用',
    '簽證費用',
    '行程外之自費行程',
    '個人消費及小費',
    '行李超重費用',
    '單人房差價',
  ])
  const [insuranceText, setInsuranceText] = useState<string>('200萬旅責險+20萬意外醫療')
  const [showLocalPricingDialog, setShowLocalPricingDialog] = useState(false)
  const [localTiers, setLocalTiers] = useState<LocalTier[]>([])

  // 從 categories 還原 Local 砍次（用於對話框顯示）
  useEffect(() => {
    const groupTransportCategory = categories.find(cat => cat.id === 'group-transport')
    if (groupTransportCategory) {
      const localItems = groupTransportCategory.items.filter(item =>
        item.name.startsWith(QUOTE_DETAIL_EMBED_LABELS.Local_報價)
      )

      if (localItems.length > 0) {
        const restoredTiers: LocalTier[] = localItems.map(item => {
          // 從名稱提取人數：Local 報價 (15人) → 15
          const match = item.name.match(/\((\d+)人\)/)
          const participants = match ? parseInt(match[1]) : 0

          return {
            id: item.id,
            participants,
            unitPrice: item.unit_price || 0,
          }
        })

        setLocalTiers(restoredTiers)
      }
    }
  }, [categories])

  const [previewParticipantCounts, setPreviewParticipantCounts] =
    useState<ParticipantCounts | null>(null)
  const [previewSellingPrices, setPreviewSellingPrices] = useState<SellingPrices | null>(null)
  const [previewTierLabel, setPreviewTierLabel] = useState<string | undefined>(undefined)
  const [previewTierPricings, setPreviewTierPricings] = useState<
    Array<{
      participant_count: number
      selling_prices: SellingPrices
    }>
  >([])

  // 處理確認狀態變更
  const handleConfirmationStatusChange = useCallback(
    async (status: QuoteConfirmationStatus) => {
      if (!quote) return
      try {
        await updateQuote(quote.id, { confirmation_status: status })
      } catch {
        toast.error(QUOTE_DETAIL_EMBED_LABELS.更新狀態失敗_請稍後再試)
      }
    },
    [quote, updateQuote]
  )

  // 處理狀態變更
  const handleStatusChange = useCallback(
    (status: 'proposed' | 'approved', showLinkDialog?: boolean) => {
      if (!quote) return
      if (status === 'approved' && showLinkDialog) {
        setShowLinkTourDialog(true)
      } else {
        updateQuote(quote.id, { status })
      }
    },
    [quote, updateQuote]
  )

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

  // Sync operations (simplified)
  const handleSyncToItinerary = useCallback(() => {
    toast.info(QUOTE_DETAIL_EMBED_LABELS.同步功能開發中)
  }, [])

  // 計算總人數
  const totalParticipants = useMemo(() => {
    return (
      (participantCounts.adult || 0) +
      (participantCounts.child_with_bed || 0) +
      (participantCounts.child_no_bed || 0) +
      (participantCounts.single_room || 0)
    )
  }, [participantCounts])

  // Local pricing handler
  const handleLocalPricingConfirm = useCallback(
    (tiers: LocalTier[], _matchedTierIndex: number) => {
      // 儲存檔次資料（持久化）
      setLocalTiers(tiers)

      // 把第一個砍次的人數同步到報價單總人數（全部設為成人）
      if (tiers.length > 0 && tiers[0].participants > 0) {
        setParticipantCounts({
          adult: tiers[0].participants,
          child_with_bed: 0,
          child_no_bed: 0,
          single_room: 0,
          infant: 0,
        })
      }

      const sortedTiers = [...tiers].sort((a, b) => a.participants - b.participants)
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
        const newCounts = calculateTierParticipantCounts(participantCount, participantCounts)
        const baseCosts = calculateTierCosts(categories, newCounts, participantCounts)
        const newCosts = {
          adult: baseCosts.adult + localUnitPrice,
          child_with_bed: baseCosts.child_with_bed + localUnitPrice,
          child_no_bed: baseCosts.child_no_bed + localUnitPrice,
          single_room: baseCosts.single_room + localUnitPrice,
          infant: baseCosts.infant,
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

      setCategories(prev => {
        const newCategories = [...prev]
        const groupTransportCategory = newCategories.find(cat => cat.id === 'group-transport')
        if (groupTransportCategory) {
          // 移除舊的 Local 報價項目
          groupTransportCategory.items = groupTransportCategory.items.filter(
            item => !item.name.startsWith(QUOTE_DETAIL_EMBED_LABELS.Local_報價)
          )

          // 每個砍次新增一列
          sortedTiers.forEach((tier, index) => {
            const newItem: CostItem = {
              id: `local-${tier.participants}-${Date.now()}-${index}`,
              name: `Local 報價 (${tier.participants}人)`,
              quantity: 1,
              unit_price: tier.unitPrice,
              total: 0,
              note: `$${tier.unitPrice.toLocaleString()}/人`,
            }
            groupTransportCategory.items.push(newItem)
          })
        }
        return newCategories
      })

      setTierPricings(newTierPricings)
      toast.success(`Local 報價已套用，產生 ${newTierPricings.length} 個檻次`)
    },
    [totalParticipants, participantCounts, categories, sellingPrices]
  )

  // Scroll handling effect
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

  // Loading state
  if (quoteLoading || !hasLoaded || !quote) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-morandi-gold mx-auto mb-4" />
          <p className="text-morandi-secondary">{QUOTE_DETAIL_EMBED_LABELS.LOADING_6912}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-full space-y-6 pb-6">
      {/* 編輯衝突警告 */}
      <EditingWarningBanner
        resourceType="quote"
        resourceId={quote.id}
        resourceName={QUOTE_DETAIL_EMBED_LABELS.此報價單}
      />

      {showHeader && (
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
      )}

      <div className="w-full pb-6">
        <div className="flex flex-col gap-6 w-full">
          {/* 上方：成本計算表格 - 100% 寬度 */}
          <div className={cn('w-full', isReadOnly && 'opacity-70 pointer-events-none select-none')}>
            <div className="border border-border bg-card rounded-xl shadow-sm overflow-hidden">
              <div ref={scrollRef} className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse">
                  <thead className="bg-card border-b border-border sticky top-0 z-20 [&_tr]:bg-morandi-gold-header">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-morandi-primary w-12 table-divider">
                        {QUOTE_DETAIL_EMBED_LABELS.LABEL_2257}
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-morandi-primary w-70 table-divider">
                        {QUOTE_DETAIL_EMBED_LABELS.LABEL_7325}
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-morandi-primary w-20 table-divider">
                        {QUOTE_DETAIL_EMBED_LABELS.QUANTITY}
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-morandi-primary w-28 table-divider">
                        {QUOTE_DETAIL_EMBED_LABELS.LABEL_9413}
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-morandi-primary w-28 table-divider whitespace-nowrap">
                        {QUOTE_DETAIL_EMBED_LABELS.LABEL_832}
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-morandi-primary w-24">
                        {QUOTE_DETAIL_EMBED_LABELS.ACTIONS}
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
                        handleToggleVisibility={handleToggleVisibility}
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

          {/* 下方：報價設定 */}
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
            localTiers={localTiers}
            excludedItems={excludedItems}
            onExcludedItemsChange={setExcludedItems}
            insuranceText={insuranceText}
            onInsuranceChange={setInsuranceText}
          />
        </div>
      </div>

      {/* Dialogs */}
      <SyncToItineraryDialog
        isOpen={isSyncDialogOpen}
        onClose={() => setIsSyncDialogOpen(false)}
        onConfirm={() => {}}
        diffs={syncDiffs}
        itineraryTitle={syncItineraryTitle}
      />

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
        itinerary={itinerary}
        departureDate={relatedTour?.departure_date || null}
        excludedItems={excludedItems}
        insuranceText={insuranceText}
      />

      <LinkTourDialog
        isOpen={showLinkTourDialog}
        onClose={() => setShowLinkTourDialog(false)}
        onCreateNew={() => {
          if (quote) {
            updateQuote(quote.id, { status: '待出發' })
            handleCreateTour()
          }
        }}
        onLinkExisting={async tour => {
          if (quote) {
            await updateQuote(quote.id, { status: '待出發', tour_id: tour.id })
            const { updateTour } = await import('@/data')
            await updateTour(tour.id, { quote_id: quote.id })
            toast.success(`已關聯旅遊團：${tour.code}`)
          }
        }}
      />

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
