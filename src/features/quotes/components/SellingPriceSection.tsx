'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Save, Printer, Plus, X, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  ParticipantCounts,
  SellingPrices,
  IdentityCosts,
  IdentityProfits,
  AccommodationSummaryItem,
  TierPricing,
  CostCategory,
} from '../types'
import {
  normalizeNumber,
  getRoomTypeCost,
  getRoomTypeProfit,
  calculateTierParticipantCounts,
  calculateTierCosts,
  calculateIdentityProfits,
  generateUniqueId,
} from '../utils/priceCalculations'
import { PriceInputRow } from './PriceInputRow'
import {
  CATEGORY_SECTION_LABELS,
  COST_ITEM_ROW_LABELS,
  PRICE_SUMMARY_CARD_LABELS,
  SELLING_PRICE_SECTION_LABELS,
} from '../constants/labels'
import { QUOTATION_INCLUSIONS_LABELS } from '@/constants/labels'

interface LocalTier {
  id: string
  participants: number
  unitPrice: number
}

interface SellingPriceSectionProps {
  participantCounts: ParticipantCounts
  setParticipantCounts: React.Dispatch<React.SetStateAction<ParticipantCounts>>
  identityCosts: IdentityCosts
  sellingPrices: SellingPrices
  setSellingPrices: React.Dispatch<React.SetStateAction<SellingPrices>>
  identityProfits: IdentityProfits
  isReadOnly: boolean
  handleSave?: () => void
  handleGenerateQuotation: (
    tierParticipantCounts?: ParticipantCounts,
    tierSellingPrices?: SellingPrices,
    tierLabel?: string,
    allTierPricings?: Array<{
      participant_count: number
      selling_prices: {
        adult: number
        child_with_bed: number
        child_no_bed: number
        single_room: number
        infant: number
      }
    }>
  ) => void
  accommodationSummary: AccommodationSummaryItem[]
  categories: CostCategory[]
  tierPricings?: TierPricing[]
  setTierPricings?: React.Dispatch<React.SetStateAction<TierPricing[]>>
  localTiers?: LocalTier[]
}

export const SellingPriceSection: React.FC<SellingPriceSectionProps> = ({
  participantCounts,
  setParticipantCounts,
  identityCosts,
  sellingPrices,
  setSellingPrices,
  identityProfits,
  isReadOnly,
  handleSave,
  handleGenerateQuotation,
  accommodationSummary,
  categories,
  tierPricings: externalTierPricings,
  setTierPricings: externalSetTierPricings,
  localTiers,
}) => {
  // 檢查是否有 Local 報價（人數欄位鎖定）
  const hasLocalPricing = localTiers && localTiers.length > 0
  const [localTierPricings, setLocalTierPricings] = useState<TierPricing[]>([])
  const tierPricings = externalTierPricings ?? localTierPricings
  const setTierPricings = externalSetTierPricings ?? setLocalTierPricings
  // 展開/收合狀態
  const [baseExpanded, setBaseExpanded] = useState(true)
  const [tierExpanded, setTierExpanded] = useState<Record<string, boolean>>({})

  const handlePriceChange = (identity: keyof SellingPrices, value: string) => {
    const normalized = normalizeNumber(value)
    const newPrice = Number(normalized) || 0

    setSellingPrices(prev => ({ ...prev, [identity]: newPrice }))

    // 同步更新第一個砍次的售價（確保存檔時不丟失）
    if (tierPricings.length > 0) {
      setTierPricings(prev =>
        prev.map((tier, index) => {
          if (index !== 0) return tier
          return {
            ...tier,
            selling_prices: { ...tier.selling_prices, [identity]: newPrice },
            identity_profits: {
              ...tier.identity_profits,
              [identity]: newPrice - tier.identity_costs[identity as keyof IdentityCosts],
            },
          }
        })
      )

      // 提醒：如果有多個砍次，售價需要各自設定
      if (tierPricings.length > 1) {
        toast.info('💡 不同人數的售價已分開設定，記得檢查其他砍次', { duration: 3000 })
      }
    }
  }

  const handleRoomTypePriceChange = (roomName: string, type: 'adult' | 'child', value: string) => {
    const normalized = normalizeNumber(value)
    setSellingPrices(prev => ({
      ...prev,
      room_types: {
        ...(prev.room_types || {}),
        [roomName]: {
          ...(prev.room_types?.[roomName] || { adult: 0, child: 0 }),
          [type]: Number(normalized) || 0,
        },
      },
    }))
  }

  const handleTierPriceChange = (tierId: string, identity: keyof SellingPrices, value: string) => {
    const normalized = normalizeNumber(value)
    setTierPricings(prev =>
      prev.map(tier => {
        if (tier.id !== tierId) return tier
        const newPrice = Number(normalized) || 0
        return {
          ...tier,
          selling_prices: { ...tier.selling_prices, [identity]: newPrice },
          identity_profits: {
            ...tier.identity_profits,
            [identity]: newPrice - tier.identity_costs[identity as keyof IdentityCosts],
          },
        }
      })
    )

    // 提醒：修改砍次售價時，提醒檢查其他砍次
    if (tierPricings.length > 1) {
      toast.info('💡 不同人數的售價已分開設定，記得檢查其他砍次', { duration: 3000 })
    }
  }

  const handleRemoveTier = (id: string) => {
    setTierPricings(prev => prev.filter(tier => tier.id !== id))
  }

  // 新增檻次（預設人數為 0）
  const handleAddTier = () => {
    const newTier: TierPricing = {
      id: generateUniqueId(),
      participant_count: 0,
      participant_counts: {
        adult: 0,
        child_with_bed: 0,
        child_no_bed: 0,
        single_room: 0,
        infant: 0,
      },
      identity_costs: { adult: 0, child_with_bed: 0, child_no_bed: 0, single_room: 0, infant: 0 },
      selling_prices: { ...sellingPrices },
      identity_profits: { adult: 0, child_with_bed: 0, child_no_bed: 0, single_room: 0, infant: 0 },
    }
    setTierPricings(prev => [...prev, newTier])
  }

  // 更新檻次人數並重新計算成本
  const handleTierCountChange = (tierId: string, newCount: number) => {
    setTierPricings(prev =>
      prev.map(tier => {
        if (tier.id !== tierId) return tier
        const newCounts = calculateTierParticipantCounts(newCount, participantCounts)
        const newCosts = calculateTierCosts(categories, newCounts, participantCounts)
        return {
          ...tier,
          participant_count: newCount,
          participant_counts: newCounts,
          identity_costs: newCosts,
          identity_profits: calculateIdentityProfits(tier.selling_prices, newCosts),
        }
      })
    )
  }

  // 計算目前總人數
  const currentTotalCount =
    (participantCounts.adult || 0) +
    (participantCounts.child_with_bed || 0) +
    (participantCounts.child_no_bed || 0) +
    (participantCounts.single_room || 0)

  return (
    <div className="w-full space-y-4">
      {/* 按鈕列：新增檻次 + 儲存 + 列印 */}
      <div className="flex gap-2">
        {!isReadOnly && (
          <Button
            onClick={handleAddTier}
            variant="outline"
            className="h-9 text-sm gap-1.5 border-dashed"
            type="button"
          >
            <Plus size={14} />
            {SELLING_PRICE_SECTION_LABELS.ADD_8828}
          </Button>
        )}
        {handleSave && (
          <Button
            onClick={() => {
              handleSave()
              toast.success(SELLING_PRICE_SECTION_LABELS.已儲存)
            }}
            disabled={isReadOnly}
            className="h-9 text-sm bg-morandi-green hover:bg-morandi-green-hover text-white gap-1.5"
            type="button"
          >
            <Save size={14} />
            {SELLING_PRICE_SECTION_LABELS.SAVE}
          </Button>
        )}
        <Button
          onClick={() => {
            const tierPricingsData = tierPricings.map(tier => ({
              participant_count: tier.participant_count,
              selling_prices: tier.selling_prices,
            }))
            handleGenerateQuotation(undefined, undefined, undefined, tierPricingsData)
          }}
          className="h-9 text-sm bg-morandi-secondary hover:bg-morandi-secondary/90 text-white gap-1.5"
          type="button"
        >
          <Printer size={14} />
          {SELLING_PRICE_SECTION_LABELS.PRINT}
        </Button>
      </div>

      {/* 檻次卡片 - 橫向排列，最多 3 個 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 目前人數檻次卡片 */}
        <div className="bg-card border border-morandi-gold/40 rounded-xl overflow-hidden shadow-sm">
          <div
            className={cn(
              "bg-morandi-gold/15 px-4 py-2 flex items-center justify-between cursor-pointer select-none",
              baseExpanded && "border-b border-morandi-gold/30"
            )}
            onClick={() => setBaseExpanded(prev => !prev)}
          >
            <div className="flex items-center gap-1">
              {baseExpanded ? <ChevronDown size={14} className="text-morandi-gold" /> : <ChevronRight size={14} className="text-morandi-gold" />}
              {tierPricings.length > 0 && (
                <span className="text-xs font-semibold text-morandi-gold mr-1">
                  砍次 1
                </span>
              )}
              <input
                onClick={e => e.stopPropagation()}
                type="text"
                inputMode="decimal"
                value={currentTotalCount}
                onChange={e => {
                  const total = Number(normalizeNumber(e.target.value)) || 0
                  setParticipantCounts({
                    adult: total,
                    child_with_bed: 0,
                    child_no_bed: 0,
                    single_room: 0,
                    infant: 0,
                  })
                }}
                disabled={isReadOnly || hasLocalPricing}
                title={hasLocalPricing ? '人數由 Local 報價控制，請修改 Local 報價' : ''}
                className={cn(
                  'w-12 h-7 px-1 text-sm font-semibold text-center text-morandi-primary bg-white/50 border border-morandi-gold/30 rounded focus:outline-none focus:ring-1 focus:ring-morandi-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                  (isReadOnly || hasLocalPricing) && 'cursor-not-allowed opacity-60'
                )}
              />
              <span className="text-sm font-semibold text-morandi-primary">
                {SELLING_PRICE_SECTION_LABELS.LABEL_2543}
              </span>
            </div>
          </div>
          {baseExpanded && (
          <table className="w-full text-sm">
            <thead className="border-b border-morandi-container/60">
              <tr>
                <th className="text-left py-2 px-4 text-xs font-medium text-morandi-secondary">
                  {SELLING_PRICE_SECTION_LABELS.LABEL_8725}
                </th>
                <th className="text-center py-2 px-4 text-xs font-medium text-morandi-secondary">
                  {SELLING_PRICE_SECTION_LABELS.LABEL_7178}
                </th>
                <th className="text-center py-2 px-4 text-xs font-medium text-morandi-secondary">
                  {SELLING_PRICE_SECTION_LABELS.LABEL_561}
                </th>
                <th className="text-center py-2 px-4 text-xs font-medium text-morandi-secondary">
                  {SELLING_PRICE_SECTION_LABELS.LABEL_7705}
                </th>
              </tr>
            </thead>
            <tbody>
              <PriceInputRow
                label={PRICE_SUMMARY_CARD_LABELS.單人房}
                cost={identityCosts.single_room}
                sellingPrice={sellingPrices.single_room}
                profit={identityProfits.single_room}
                onPriceChange={value => handlePriceChange('single_room', value)}
                isReadOnly={isReadOnly}
              />
              <PriceInputRow
                label={CATEGORY_SECTION_LABELS.成人}
                cost={identityCosts.adult}
                sellingPrice={sellingPrices.adult}
                profit={identityProfits.adult}
                onPriceChange={value => handlePriceChange('adult', value)}
                isReadOnly={isReadOnly}
              />
              <PriceInputRow
                label={PRICE_SUMMARY_CARD_LABELS.小孩}
                cost={identityCosts.child_with_bed}
                sellingPrice={sellingPrices.child_with_bed}
                profit={identityProfits.child_with_bed}
                onPriceChange={value => handlePriceChange('child_with_bed', value)}
                isReadOnly={isReadOnly}
              />
              <PriceInputRow
                label={PRICE_SUMMARY_CARD_LABELS.不佔床}
                cost={identityCosts.child_no_bed}
                sellingPrice={sellingPrices.child_no_bed}
                profit={identityProfits.child_no_bed}
                onPriceChange={value => handlePriceChange('child_no_bed', value)}
                isReadOnly={isReadOnly}
              />
              <PriceInputRow
                label={COST_ITEM_ROW_LABELS.嬰兒}
                cost={identityCosts.infant}
                sellingPrice={sellingPrices.infant}
                profit={identityProfits.infant}
                onPriceChange={value => handlePriceChange('infant', value)}
                isReadOnly={isReadOnly}
              />

              {/* 動態房型 */}
              {accommodationSummary.length > 1 &&
                accommodationSummary.slice(1).map(room => (
                  <React.Fragment key={room.name}>
                    <tr className="border-b border-morandi-container/60">
                      <td
                        colSpan={4}
                        className="py-2 px-3 text-xs font-medium text-morandi-secondary"
                      >
                        {room.name}
                      </td>
                    </tr>
                    <PriceInputRow
                      label={CATEGORY_SECTION_LABELS.成人}
                      cost={getRoomTypeCost(
                        room.name,
                        'adult',
                        accommodationSummary,
                        identityCosts
                      )}
                      sellingPrice={sellingPrices.room_types?.[room.name]?.adult || 0}
                      profit={getRoomTypeProfit(
                        room.name,
                        'adult',
                        sellingPrices,
                        accommodationSummary,
                        identityCosts
                      )}
                      onPriceChange={value => handleRoomTypePriceChange(room.name, 'adult', value)}
                      isReadOnly={isReadOnly}
                      indented
                    />
                    <PriceInputRow
                      label={PRICE_SUMMARY_CARD_LABELS.小孩}
                      cost={getRoomTypeCost(
                        room.name,
                        'child',
                        accommodationSummary,
                        identityCosts
                      )}
                      sellingPrice={sellingPrices.room_types?.[room.name]?.child || 0}
                      profit={getRoomTypeProfit(
                        room.name,
                        'child',
                        sellingPrices,
                        accommodationSummary,
                        identityCosts
                      )}
                      onPriceChange={value => handleRoomTypePriceChange(room.name, 'child', value)}
                      isReadOnly={isReadOnly}
                      indented
                    />
                  </React.Fragment>
                ))}
            </tbody>
          </table>
          )}
        </div>

        {/* 檻次表列表 */}
        {tierPricings.map((tier, tierIndex) => (
          <div
            key={tier.id}
            className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
          >
            <div
              className={cn(
                "bg-morandi-container/30 px-4 py-2 flex items-center justify-between cursor-pointer select-none",
                (tierExpanded[tier.id] ?? true) && "border-b border-border"
              )}
              onClick={() => setTierExpanded(prev => ({ ...prev, [tier.id]: !(prev[tier.id] ?? true) }))}
            >
              <div className="flex items-center gap-1">
                {(tierExpanded[tier.id] ?? true) ? <ChevronDown size={14} className="text-morandi-secondary" /> : <ChevronRight size={14} className="text-morandi-secondary" />}
                <span className="text-xs font-semibold text-morandi-secondary mr-1">
                  砍次 {tierIndex + 2}
                </span>
                <input
                  onClick={e => e.stopPropagation()}
                  type="text"
                  inputMode="decimal"
                  value={tier.participant_count}
                  onChange={e => {
                    const newCount = Number(normalizeNumber(e.target.value)) || 0
                    handleTierCountChange(tier.id, newCount)
                  }}
                  disabled={isReadOnly}
                  className={cn(
                    'w-12 h-7 px-1 text-sm font-medium text-center text-morandi-primary bg-white/50 border border-border rounded focus:outline-none focus:ring-1 focus:ring-morandi-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                    isReadOnly && 'cursor-not-allowed opacity-60'
                  )}
                />
                <span className="text-sm font-medium text-morandi-primary">
                  {SELLING_PRICE_SECTION_LABELS.LABEL_2543}
                </span>
              </div>
              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                <Button
                  onClick={() => {
                    const tierLabel = `${SELLING_PRICE_SECTION_LABELS.TIER_QUOTE_PREFIX}${tier.participant_count}${SELLING_PRICE_SECTION_LABELS.TIER_QUOTE_SUFFIX}`
                    handleGenerateQuotation(tier.participant_counts, tier.selling_prices, tierLabel)
                  }}
                  size="sm"
                  className="h-6 px-2 text-xs bg-morandi-secondary hover:bg-morandi-secondary/90 text-white"
                  type="button"
                >
                  {SELLING_PRICE_SECTION_LABELS.PRINT}
                </Button>
                {!isReadOnly && (
                  <button
                    onClick={() => handleRemoveTier(tier.id)}
                    className="text-morandi-red hover:bg-morandi-red/10 p-1 rounded transition-colors"
                    type="button"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            {(tierExpanded[tier.id] ?? true) && (
            <table className="w-full text-sm">
              <thead className="border-b border-border/60">
                <tr>
                  <th className="text-left py-2 px-4 text-xs font-medium text-morandi-secondary">
                    {SELLING_PRICE_SECTION_LABELS.LABEL_8725}
                  </th>
                  <th className="text-center py-2 px-4 text-xs font-medium text-morandi-secondary">
                    {SELLING_PRICE_SECTION_LABELS.LABEL_7178}
                  </th>
                  <th className="text-center py-2 px-4 text-xs font-medium text-morandi-secondary">
                    {SELLING_PRICE_SECTION_LABELS.LABEL_561}
                  </th>
                  <th className="text-center py-2 px-4 text-xs font-medium text-morandi-secondary">
                    {SELLING_PRICE_SECTION_LABELS.LABEL_7705}
                  </th>
                </tr>
              </thead>
              <tbody>
                <PriceInputRow
                  label={PRICE_SUMMARY_CARD_LABELS.單人房}
                  cost={tier.identity_costs.single_room}
                  sellingPrice={tier.selling_prices.single_room}
                  profit={tier.identity_profits.single_room}
                  onPriceChange={value => handleTierPriceChange(tier.id, 'single_room', value)}
                  isReadOnly={isReadOnly}
                />
                <PriceInputRow
                  label={CATEGORY_SECTION_LABELS.成人}
                  cost={tier.identity_costs.adult}
                  sellingPrice={tier.selling_prices.adult}
                  profit={tier.identity_profits.adult}
                  onPriceChange={value => handleTierPriceChange(tier.id, 'adult', value)}
                  isReadOnly={isReadOnly}
                />
                <PriceInputRow
                  label={PRICE_SUMMARY_CARD_LABELS.小孩}
                  cost={tier.identity_costs.child_with_bed}
                  sellingPrice={tier.selling_prices.child_with_bed}
                  profit={tier.identity_profits.child_with_bed}
                  onPriceChange={value => handleTierPriceChange(tier.id, 'child_with_bed', value)}
                  isReadOnly={isReadOnly}
                />
                <PriceInputRow
                  label={PRICE_SUMMARY_CARD_LABELS.不佔床}
                  cost={tier.identity_costs.child_no_bed}
                  sellingPrice={tier.selling_prices.child_no_bed}
                  profit={tier.identity_profits.child_no_bed}
                  onPriceChange={value => handleTierPriceChange(tier.id, 'child_no_bed', value)}
                  isReadOnly={isReadOnly}
                />
                <PriceInputRow
                  label={COST_ITEM_ROW_LABELS.嬰兒}
                  cost={tier.identity_costs.infant}
                  sellingPrice={tier.selling_prices.infant}
                  profit={tier.identity_profits.infant}
                  onPriceChange={value => handleTierPriceChange(tier.id, 'infant', value)}
                  isReadOnly={isReadOnly}
                />
              </tbody>
            </table>
            )}
          </div>
        ))}

        {/* 費用包含 */}
        <div className="bg-card border border-morandi-green/30 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-morandi-green/10 px-4 py-2 border-b border-morandi-green/20">
            <span className="text-sm font-semibold text-morandi-green">費用包含</span>
          </div>
          <ul className="px-4 py-3 space-y-1.5 text-sm text-morandi-secondary">
            <li>• 行程表所列之交通費用</li>
            <li>• 行程表所列之住宿費用</li>
            <li>• 行程表所列之餐食費用</li>
            <li>• 行程表所列之門票費用</li>
            <li>• 專業導遊服務</li>
            <li>• {QUOTATION_INCLUSIONS_LABELS.旅遊責任險}</li>
          </ul>
        </div>

        {/* 費用不含 */}
        <div className="bg-card border border-morandi-red/30 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-morandi-red/10 px-4 py-2 border-b border-morandi-red/20">
            <span className="text-sm font-semibold text-morandi-red">費用不含</span>
          </div>
          <ul className="px-4 py-3 space-y-1.5 text-sm text-morandi-secondary">
            <li>• 個人護照及簽證費用</li>
            <li>• 行程外之自費行程</li>
            <li>• 個人消費及小費</li>
            <li>• 行李超重費用</li>
            <li>• 單人房差價</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
