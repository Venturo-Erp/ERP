'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Trash2, MapPin, AlertTriangle, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ACCOMMODATION_ITEM_ROW_LABELS, LOCAL_PRICING_DIALOG_LABELS } from '../constants/labels'

export interface LocalTier {
  id: string
  participants: number
  unitPrice: number
}

interface LocalPricingDialogProps {
  isOpen: boolean
  onClose: () => void
  totalParticipants: number
  onConfirm: (tiers: LocalTier[], matchedTierIndex: number) => void
  initialTiers?: LocalTier[]
}

export const LocalPricingDialog: React.FC<LocalPricingDialogProps> = ({
  isOpen,
  onClose,
  totalParticipants,
  onConfirm,
  initialTiers,
}) => {
  const [tiers, setTiers] = useState<LocalTier[]>(
    initialTiers && initialTiers.length > 0
      ? initialTiers
      : [{ id: `tier-${Date.now()}`, participants: totalParticipants, unitPrice: 0 }]  // 預設人數 = 總人數
  )

  // 當對話框開啟時，同步 tiers 狀態
  useEffect(() => {
    if (isOpen) {
      if (initialTiers && initialTiers.length > 0) {
        // 有 initialTiers 時，強制第一個砍次的人數 = 總人數
        const updatedTiers = initialTiers.map((tier, index) =>
          index === 0 ? { ...tier, participants: totalParticipants } : tier
        )
        setTiers(updatedTiers)
      } else {
        // 沒有 initialTiers 時，重置為預設值（總人數）
        setTiers([{ id: `tier-${Date.now()}`, participants: totalParticipants, unitPrice: 0 }])
      }
    }
  }, [isOpen, initialTiers, totalParticipants])

  // 新增檻次
  const handleAddTier = () => {
    setTiers([
      ...tiers,
      {
        id: `tier-${Date.now()}`,
        participants: 0,
        unitPrice: 0,
      },
    ])
  }

  // 移除檻次
  const handleRemoveTier = (id: string) => {
    if (tiers.length <= 1) return
    setTiers(tiers.filter(t => t.id !== id))
  }

  // 更新檻次
  const handleUpdateTier = (id: string, field: 'participants' | 'unitPrice', value: string) => {
    const numValue = parseInt(value) || 0
    setTiers(tiers.map(t => (t.id === id ? { ...t, [field]: numValue } : t)))
  }

  // 找到目前總人數對應的檻次
  const findMatchedTierIndex = (): number => {
    // 按人數排序（從小到大）
    const sortedTiers = [...tiers].sort((a, b) => a.participants - b.participants)

    // 找到最大的且 <= totalParticipants 的檻次
    let matchedIndex = 0
    for (let i = 0; i < sortedTiers.length; i++) {
      if (sortedTiers[i].participants <= totalParticipants) {
        matchedIndex = i
      } else {
        break
      }
    }

    // 返回在原始 tiers 陣列中的索引
    const matchedTier = sortedTiers[matchedIndex]
    return tiers.findIndex(t => t.id === matchedTier.id)
  }

  // 點擊確認
  const handleConfirmClick = () => {
    // 檢查是否有填寫人數和單價
    const hasEmptyData = tiers.some(
      t => !t.participants || t.participants <= 0 || !t.unitPrice || t.unitPrice <= 0
    )
    if (hasEmptyData) {
      return
    }

    const matched = findMatchedTierIndex()
    
    // 直接確認（第一個砍次已自動綁定總人數，不需要提醒）
    onConfirm(tiers, matched)
    handleClose()
  }

  // 關閉對話框
  const handleClose = () => {
    onClose()
  }

  // 取得對應檻次的資訊
  const getMatchedTierInfo = () => {
    const matched = findMatchedTierIndex()
    const tier = tiers[matched]
    return tier
  }

  const matchedTier = getMatchedTierInfo()

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent level={1} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin size={18} className="text-morandi-gold" />
            {LOCAL_PRICING_DIALOG_LABELS.LOCAL報價}
          </DialogTitle>
        </DialogHeader>

        {/* 目前總人數提示 */}
            <div className="bg-morandi-container/30 rounded-lg px-4 py-3 text-sm">
              <span className="text-morandi-secondary">
                {LOCAL_PRICING_DIALOG_LABELS.目前總人數}
              </span>
              <span className="font-semibold text-morandi-primary ml-1">
                {totalParticipants}
                {LOCAL_PRICING_DIALOG_LABELS.人}
              </span>
            </div>

            {/* 檻次輸入區 */}
            <div className="space-y-3">
              <div className="grid grid-cols-[80px_1fr_1fr_40px] gap-2 text-xs text-morandi-secondary font-medium px-1">
                <span>{LOCAL_PRICING_DIALOG_LABELS.檻次}</span>
                <span>{LOCAL_PRICING_DIALOG_LABELS.人數門檻}</span>
                <span>{LOCAL_PRICING_DIALOG_LABELS.單價成本}</span>
                <span></span>
              </div>

              {tiers.map((tier, index) => {
                // 第一個砍次的人數 = 強制使用總人數
                const displayParticipants = index === 0 ? totalParticipants : tier.participants
                
                return (
                  <div
                    key={tier.id}
                    className="grid grid-cols-[80px_1fr_1fr_40px] gap-2 items-center"
                  >
                    <span className="text-sm text-morandi-secondary px-1">
                      {LOCAL_PRICING_DIALOG_LABELS.檻次編號.replace('{index}', `${index + 1}`)}
                    </span>
                    <Input
                      type="number"
                      value={displayParticipants || ''}
                      onChange={e => handleUpdateTier(tier.id, 'participants', e.target.value)}
                      placeholder={LOCAL_PRICING_DIALOG_LABELS.人數}
                      className="h-9 text-sm"
                      disabled={index === 0}
                      title={index === 0 ? '第一個檻次人數 = 總人數（自動綁定）' : ''}
                    />
                  <Input
                    type="number"
                    value={tier.unitPrice || ''}
                    onChange={e => handleUpdateTier(tier.id, 'unitPrice', e.target.value)}
                    placeholder={ACCOMMODATION_ITEM_ROW_LABELS.單價}
                    className="h-9 text-sm"
                  />
                  <button
                    onClick={() => handleRemoveTier(tier.id)}
                    disabled={tiers.length <= 1}
                    className={cn(
                      'w-8 h-8 flex items-center justify-center rounded transition-colors',
                      tiers.length <= 1
                        ? 'text-morandi-muted cursor-not-allowed'
                        : 'text-morandi-secondary hover:text-morandi-red hover:bg-morandi-red/10'
                    )}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <Button variant="outline" size="sm" onClick={handleAddTier} className="w-full gap-2">
                <Plus size={14} />
                {LOCAL_PRICING_DIALOG_LABELS.新增檻次}
              </Button>
            </div>

            {/* 對應提示 */}
            {matchedTier && matchedTier.unitPrice > 0 && (
              <div className="bg-morandi-gold/10 rounded-lg px-4 py-3 text-sm">
                <span className="text-morandi-secondary">
                  {LOCAL_PRICING_DIALOG_LABELS.人將使用檻次的報價
                    .replace('{totalParticipants}', totalParticipants.toString())
                    .replace('{matchedParticipants}', matchedTier.participants.toString())}
                </span>
                <span className="font-semibold text-morandi-gold ml-1">
                  {LOCAL_PRICING_DIALOG_LABELS.元每人.replace(
                    '{unitPrice}',
                    matchedTier.unitPrice.toLocaleString()
                  )}
                </span>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                <X className="w-4 h-4 mr-2" />
                {LOCAL_PRICING_DIALOG_LABELS.取消}
              </Button>
              <Button
                onClick={handleConfirmClick}
                className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
                disabled={tiers.some(
                  t => !t.participants || t.participants <= 0 || !t.unitPrice || t.unitPrice <= 0
                )}
              >
                <Check className="w-4 h-4 mr-2" />
                {LOCAL_PRICING_DIALOG_LABELS.確認}
              </Button>
            </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
