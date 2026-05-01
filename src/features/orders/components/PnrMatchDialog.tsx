'use client'

/**
 * PNR 配對對話框
 *
 * 功能：
 * 1. 貼上 PNR 電報
 * 2. 自動解析旅客姓名
 * 3. 比對團員名單（護照拼音）
 * 4. 若團員名單為空或無匹配，自動從客戶資料庫搜尋
 * 5. 顯示配對結果與建議客戶
 * 6. 批量儲存 PNR 到團員或建立新團員
 */

import { useState, useMemo, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Check, X, AlertCircle, Plane, Save, RefreshCw, UserPlus, Users } from 'lucide-react'
import { parseFlightConfirmation, type ParsedPNR } from '@/lib/pnr-parser'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/utils/logger'
import { useTranslations } from 'next-intl'
import {
  findBestMatch,
  normalizeName,
  splitPassportName,
  calculateSimilarity,
} from './pnr-name-matcher'

interface TourMember {
  id: string
  chinese_name: string | null
  passport_name: string | null
  pnr?: string | null
}

interface SuggestedCustomer {
  id: string
  name: string
  passport_name: string | null
  passport_number: string | null
  passport_expiry: string | null
  passport_image_url: string | null
  national_id: string | null
  birth_date: string | null
  gender: string | null
  score: number
}

interface MatchResult {
  pnrPassenger: string
  matchedMember: TourMember | null
  suggestedCustomers: SuggestedCustomer[]
  selectedCustomerId: string | null
  confidence: 'exact' | 'partial' | 'none'
  score: number
}

interface OrderInfo {
  id: string
  order_number: string
  contact_person: string | null
}

interface PnrMatchDialogProps {
  isOpen: boolean
  onClose: () => void
  members: TourMember[]
  orderId?: string
  workspaceId?: string
  /** 旅遊團 ID，用於更新航班資訊 */
  tourId?: string
  /** 團體模式下的訂單列表（用於讓使用者選擇每位旅客屬於哪個訂單） */
  orders?: OrderInfo[]
  onSuccess?: () => void
}

export function PnrMatchDialog({
  isOpen,
  onClose,
  members,
  orderId,
  workspaceId,
  tourId,
  orders = [],
  onSuccess,
}: PnrMatchDialogProps) {
  const t = useTranslations('orders')

  const [rawPnr, setRawPnr] = useState('')
  const [parsedPnr, setParsedPnr] = useState<ParsedPNR | null>(null)
  const [matchResults, setMatchResults] = useState<MatchResult[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [manualMatches, setManualMatches] = useState<Record<string, string>>({})
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false)
  // 團體模式：每位旅客選擇的訂單 ID
  const [selectedOrderIds, setSelectedOrderIds] = useState<Record<string, string>>({})

  // 是否為團體模式（有多個訂單可選）
  const isTourMode = orders.length > 0

  /**
   * 從客戶資料庫搜尋符合護照拼音的客戶
   * 優化：只搜尋姓氏匹配的客戶，而不是載入全部
   */
  const searchCustomersForPassengers = useCallback(
    async (pnrNames: string[]): Promise<Record<string, SuggestedCustomer[]>> => {
      if (pnrNames.length === 0) {
        return {}
      }

      try {
        // 提取所有旅客的姓氏
        const surnames = [
          ...new Set(
            pnrNames
              .map(name => {
                const parts = splitPassportName(name)
                return parts.surname
              })
              .filter(Boolean)
          ),
        ]

        if (surnames.length === 0) {
          return {}
        }

        // 只查詢姓氏匹配的客戶（使用 ilike 模糊查詢）
        // 構建姓氏條件：passport_name like 'SURNAME/%' OR passport_name like 'SURNAME2/%' ...
        const surnameConditions = surnames.map(s => `passport_name.ilike.${s}/%`).join(',')

        const { data: customers, error } = await supabase
          .from('customers')
          .select(
            'id, name, passport_name, passport_number, passport_expiry, passport_image_url, national_id, birth_date, gender'
          )
          .not('passport_name', 'is', null)
          .or(surnameConditions)
          .limit(200) // 限制結果數量

        if (error) throw error

        // 為每個旅客搜尋相似的客戶
        const suggestions: Record<string, SuggestedCustomer[]> = {}

        for (const pnrName of pnrNames) {
          const normalizedPnr = normalizeName(pnrName)
          const pnrParts = splitPassportName(pnrName)
          const matchedCustomers: SuggestedCustomer[] = []

          for (const customer of customers || []) {
            if (!customer.passport_name) continue

            const normalizedCustomer = normalizeName(customer.passport_name)
            const customerParts = splitPassportName(customer.passport_name)

            // 完全相符
            if (normalizedPnr === normalizedCustomer) {
              matchedCustomers.push({ ...customer, score: 100 })
              continue
            }

            // 姓氏必須完全相同才考慮
            if (pnrParts.surname !== customerParts.surname) continue

            // 姓氏相同，計算名字相似度
            const givenNameScore = calculateSimilarity(pnrParts.givenName, customerParts.givenName)

            if (givenNameScore >= 50) {
              matchedCustomers.push({ ...customer, score: givenNameScore })
            }
          }

          // 按分數排序，取前 5 個
          suggestions[pnrName] = matchedCustomers.sort((a, b) => b.score - a.score).slice(0, 5)
        }

        return suggestions
      } catch (error) {
        logger.error(t('common.搜尋客戶失敗'), error)
        return {}
      }
    },
    []
  )

  // 解析 PNR 並進行配對
  const handleParse = useCallback(async () => {
    if (!rawPnr.trim()) {
      toast.error(t('common.請先貼上_PNR_電報'))
      return
    }

    // 使用智慧格式偵測（支援 Amadeus PNR、E-Ticket、HTML 確認頁面）
    const parsed = parseFlightConfirmation(rawPnr) as ParsedPNR
    setParsedPnr(parsed)

    // 進行成員配對
    const memberResults = parsed.passengerNames.map(pnrName => ({
      pnrName,
      match: findBestMatch(pnrName, members),
    }))

    // 統計配對數量
    const exactCount = memberResults.filter(r => r.match.confidence === 'exact').length
    const partialCount = memberResults.filter(r => r.match.confidence === 'partial').length
    const noneCount = memberResults.filter(r => r.match.confidence === 'none').length

    // 只對未完全配對的旅客搜尋客戶資料庫（優化效能）
    const unmatchedNames = memberResults
      .filter(r => r.match.confidence !== 'exact')
      .map(r => r.pnrName)

    let customerSuggestions: Record<string, SuggestedCustomer[]> = {}
    if (unmatchedNames.length > 0) {
      setIsSearchingCustomers(true)
      customerSuggestions = await searchCustomersForPassengers(unmatchedNames)
      setIsSearchingCustomers(false)
    }

    // 組合配對結果
    const results: MatchResult[] = memberResults.map(({ pnrName, match }) => ({
      pnrPassenger: pnrName,
      matchedMember: match.member,
      suggestedCustomers: customerSuggestions[pnrName] || [],
      selectedCustomerId: null,
      confidence: match.confidence,
      score: match.score,
    }))

    setMatchResults(results)
    setManualMatches({})

    // 顯示統計
    const suggestedCount = results.filter(r => r.suggestedCustomers.length > 0).length

    if (noneCount === 0 && partialCount === 0) {
      toast.success(
        `${t('common.全部配對成功')}${results.length}${t('common.位旅客')}`
      )
    } else if (suggestedCount > 0) {
      toast.info(
        `${t('common.配對完成')}${exactCount} ${t('common.完全符合')}, ${partialCount} ${t('common.部分符合')}, ${noneCount} ${t('common.未配對')}${t('common.找到')}${suggestedCount}${t('common.位可能的客戶建議')}`
      )
    } else {
      toast.info(
        `${t('common.配對完成')}${exactCount} ${t('common.完全符合')}, ${partialCount} ${t('common.部分符合')}, ${noneCount} ${t('common.未配對')}`
      )
    }

    // 顯示票價解析結果（僅機票訂單明細格式）
    if (parsed.fareData && parsed.sourceFormat === 'ticket_order_detail') {
      toast.success(
        `${t('common.已解析機票金額')}${parsed.fareData.totalFare.toLocaleString()}${t('common.元_人')}`
      )
    } else if (parsed.sourceFormat === 'ticket_order_detail' && !parsed.fareData) {
      toast.warning(t('common.機票訂單明細格式但未能解析金額_請檢查格式'))
    }
  }, [rawPnr, members, searchCustomersForPassengers])

  // 手動選擇配對（現有成員）或取消配對
  const handleManualMatch = (pnrPassenger: string, memberId: string) => {
    if (memberId === '__NONE__') {
      // 取消配對
      setManualMatches(prev => ({ ...prev, [pnrPassenger]: '__NONE__' }))
    } else if (memberId === '') {
      // 恢復自動配對
      setManualMatches(prev => {
        const newMatches = { ...prev }
        delete newMatches[pnrPassenger]
        return newMatches
      })
    } else {
      // 手動選擇成員
      setManualMatches(prev => ({ ...prev, [pnrPassenger]: memberId }))
    }
    // 清除該旅客的客戶選擇
    setMatchResults(prev =>
      prev.map(r => (r.pnrPassenger === pnrPassenger ? { ...r, selectedCustomerId: null } : r))
    )
  }

  // 選擇建議客戶
  const handleSelectCustomer = (pnrPassenger: string, customerId: string) => {
    setMatchResults(prev =>
      prev.map(r =>
        r.pnrPassenger === pnrPassenger ? { ...r, selectedCustomerId: customerId || null } : r
      )
    )
    // 選擇客戶時，同時取消成員配對（設為 __NONE__）
    // 這樣 finalResults 才會正確顯示為「已選客戶」而不是原本的成員配對
    if (customerId) {
      setManualMatches(prev => ({ ...prev, [pnrPassenger]: '__NONE__' }))
    } else {
      // 如果清除客戶選擇，也清除取消配對狀態，恢復自動配對
      setManualMatches(prev => {
        const newMatches = { ...prev }
        delete newMatches[pnrPassenger]
        return newMatches
      })
    }
  }

  // 團體模式：選擇旅客所屬的訂單
  const handleSelectOrder = (pnrPassenger: string, selectedOrderId: string) => {
    setSelectedOrderIds(prev => {
      if (selectedOrderId) {
        return { ...prev, [pnrPassenger]: selectedOrderId }
      } else {
        const newIds = { ...prev }
        delete newIds[pnrPassenger]
        return newIds
      }
    })
  }

  // 團體模式：全部設為同一個訂單
  const handleSetAllOrders = (selectedOrderId: string) => {
    if (!selectedOrderId) {
      setSelectedOrderIds({})
      return
    }
    const newIds: Record<string, string> = {}
    matchResults.forEach(r => {
      newIds[r.pnrPassenger] = selectedOrderId
    })
    setSelectedOrderIds(newIds)
  }

  // 計算最終配對結果（包含手動調整）
  const finalResults = useMemo(() => {
    return matchResults.map(result => {
      const manualMemberId = manualMatches[result.pnrPassenger]
      if (manualMemberId === '__NONE__') {
        // 手動取消配對
        return {
          ...result,
          matchedMember: null,
          confidence: 'none' as const,
          score: 0,
        }
      }
      if (manualMemberId) {
        const manualMember = members.find(m => m.id === manualMemberId) || null
        return {
          ...result,
          matchedMember: manualMember,
          confidence: manualMember ? ('exact' as const) : ('none' as const),
        }
      }
      return result
    })
  }, [matchResults, manualMatches, members])

  // 儲存配對結果
  const handleSave = async () => {
    if (!parsedPnr) return

    const recordLocator = parsedPnr.recordLocator || rawPnr.slice(0, 6)

    // 分類配對結果
    const matchedMembers = finalResults.filter(r => r.matchedMember)
    const selectedCustomers = finalResults.filter(r => r.selectedCustomerId && !r.matchedMember)

    if (matchedMembers.length === 0 && selectedCustomers.length === 0) {
      toast.error(t('common.沒有可儲存的配對'))
      return
    }

    // 檢查是否需要建立新成員但缺少訂單資訊
    if (selectedCustomers.length > 0) {
      // 團體模式：檢查每位選擇的客戶是否有指定訂單
      if (isTourMode) {
        const missingOrders = selectedCustomers.filter(r => !selectedOrderIds[r.pnrPassenger])
        if (missingOrders.length > 0) {
          toast.error(
            `${t('common.請為')}${missingOrders.length}${t('common.位旅客選擇所屬訂單')}`
          )
          return
        }
      } else if (!orderId) {
        toast.error(t('common.無法建立新成員_缺少訂單資訊'))
        return
      }
    }

    setIsSaving(true)
    try {
      let updatedCount = 0
      let createdCount = 0

      // 計算每人票價（僅「機票訂單明細」格式的金額為成本價）
      let perPersonFare: number | null = null
      if (parsedPnr.fareData && parsedPnr.sourceFormat === 'ticket_order_detail') {
        if (parsedPnr.fareData.perPassenger) {
          // 票價已經是每人價格
          perPersonFare = parsedPnr.fareData.totalFare
        } else {
          // 票價是總價，需要除以旅客人數
          const passengerCount = parsedPnr.passengerNames.length || 1
          perPersonFare = Math.round(parsedPnr.fareData.totalFare / passengerCount)
        }
      }

      // 1. 更新現有成員的 PNR 和機票號碼
      if (matchedMembers.length > 0) {
        const updates = matchedMembers.map((r, idx) => {
          // 嘗試從解析結果找到該旅客的機票號碼
          // 1. 先嘗試用旅客姓名匹配
          let ticketInfo = parsedPnr.ticketNumbers.find(
            t =>
              t.passenger &&
              (t.passenger === r.pnrPassenger || t.passenger.includes(r.pnrPassenger.split('/')[0]))
          )
          // 2. 如果沒找到，且票號數量與旅客數量相符，按順序配對
          if (!ticketInfo && parsedPnr.ticketNumbers.length === matchedMembers.length) {
            ticketInfo = parsedPnr.ticketNumbers[idx]
          }
          // 3. 如果只有一個票號，直接使用（單人 PNR 常見情況）
          if (!ticketInfo && parsedPnr.ticketNumbers.length === 1) {
            ticketInfo = parsedPnr.ticketNumbers[0]
          }
          return {
            id: r.matchedMember!.id,
            pnr: recordLocator,
            ticket_number: ticketInfo?.number || null,
          }
        })

        for (const update of updates) {
          const updateData: {
            pnr: string
            ticket_number?: string | null
            flight_cost?: number | null
            ticketing_deadline?: string | null
          } = { pnr: update.pnr }
          if (update.ticket_number) {
            updateData.ticket_number = update.ticket_number
          }
          // 如果有票價資訊，同時更新機票票價
          if (perPersonFare !== null) {
            updateData.flight_cost = perPersonFare
          }
          // 如果有開票期限，同時更新
          if (parsedPnr.ticketingDeadline) {
            updateData.ticketing_deadline = parsedPnr.ticketingDeadline.toISOString().split('T')[0]
          }
          await supabase.from('order_members').update(updateData).eq('id', update.id)
        }
        updatedCount = matchedMembers.length
      }

      // 2. 從選擇的客戶建立新成員
      if (selectedCustomers.length > 0 && workspaceId) {
        for (let idx = 0; idx < selectedCustomers.length; idx++) {
          const result = selectedCustomers[idx]
          const customer = result.suggestedCustomers.find(c => c.id === result.selectedCustomerId)
          if (!customer) continue

          // 決定使用的 orderId：團體模式用選擇的訂單，否則用傳入的 orderId
          const targetOrderId = isTourMode ? selectedOrderIds[result.pnrPassenger] : orderId

          if (!targetOrderId) continue

          // 嘗試從解析結果找到該旅客的機票號碼
          // 1. 先嘗試用旅客姓名匹配
          let ticketInfo = parsedPnr.ticketNumbers.find(
            t =>
              t.passenger &&
              (t.passenger === result.pnrPassenger ||
                t.passenger.includes(result.pnrPassenger.split('/')[0]))
          )
          // 2. 如果沒找到，且票號數量與旅客數量相符，按順序配對
          if (!ticketInfo && parsedPnr.ticketNumbers.length === selectedCustomers.length) {
            ticketInfo = parsedPnr.ticketNumbers[idx]
          }
          // 3. 如果只有一個票號，直接使用
          if (!ticketInfo && parsedPnr.ticketNumbers.length === 1) {
            ticketInfo = parsedPnr.ticketNumbers[0]
          }

          const newMember = {
            order_id: targetOrderId,
            workspace_id: workspaceId,
            customer_id: customer.id,
            chinese_name: customer.name,
            passport_name: customer.passport_name,
            passport_number: customer.passport_number,
            passport_expiry: customer.passport_expiry,
            passport_image_url: customer.passport_image_url, // 同步護照圖片
            id_number: customer.national_id,
            birth_date: customer.birth_date,
            gender: customer.gender,
            pnr: recordLocator,
            ticket_number: ticketInfo?.number || null,
            flight_cost: perPersonFare,
            ticketing_deadline: parsedPnr.ticketingDeadline?.toISOString() || null,
            member_type: 'adult',
            identity: t('common.大人'),
          }

          const { error } = await supabase.from('order_members').insert(newMember)

          if (error) {
            logger.error(t('common.建立成員失敗'), error)
          } else {
            createdCount++
          }
        }
      }

      // PNR 記錄存到 pnrs 表的功能已移除（2026-04-23、pnrs 進階系統砍除）
      // PnrMatchDialog 仍能解析 PNR + 配對團員 + 寫入 order_members.pnr 字串
      // 之後重做完整 PNR 系統時再恢復

      // 顯示結果
      // 注意：不更新 tours 的團體航班，PNR 是個人機票資訊，跟團體航班是分開的
      const messages: string[] = []
      if (updatedCount > 0) messages.push(`${updatedCount}${t('common.位團員已更新PNR')}`)
      if (createdCount > 0) messages.push(`${createdCount}${t('common.位新成員已建立')}`)
      toast.success(`${messages.join('，')}${t('common.訂位代號')} ${recordLocator}`)

      onSuccess?.()
      handleClose()
    } catch (error) {
      logger.error(t('common.儲存失敗_2'), error)
      toast.error(t('common.儲存失敗'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setRawPnr('')
    setParsedPnr(null)
    setMatchResults([])
    setManualMatches({})
    setSelectedOrderIds({})
    onClose()
  }

  // 統計
  const stats = useMemo(() => {
    const exact = finalResults.filter(r => r.confidence === 'exact').length
    const partial = finalResults.filter(r => r.confidence === 'partial').length
    const none = finalResults.filter(r => r.confidence === 'none').length
    const withSuggestions = finalResults.filter(
      r => r.suggestedCustomers.length > 0 && !r.matchedMember
    ).length
    const selectedCustomers = finalResults.filter(
      r => r.selectedCustomerId && !r.matchedMember
    ).length
    return { exact, partial, none, withSuggestions, selectedCustomers, total: finalResults.length }
  }, [finalResults])

  // 可儲存的總數（配對的成員 + 選擇的客戶）
  const savableCount = useMemo(() => {
    const matchedCount = finalResults.filter(r => r.matchedMember).length
    const selectedCount = finalResults.filter(r => r.selectedCustomerId && !r.matchedMember).length
    return matchedCount + selectedCount
  }, [finalResults])

  // 未配對的團員（排除已經有 PNR 的人）
  const unmatchedMembers = useMemo(() => {
    const matchedIds = new Set(finalResults.map(r => r.matchedMember?.id).filter(Boolean))
    return members.filter(m => {
      // 已配對的不顯示
      if (matchedIds.has(m.id)) return false
      // 已經有 PNR 的不顯示
      if (m.pnr) return false
      return true
    })
  }, [members, finalResults])

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && handleClose()}>
      <DialogContent level={2} className="w-[90vw] max-w-6xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane size={20} className="text-morandi-gold" />
            {t('common.pnr配對')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* 輸入區域 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-morandi-primary">
              {t('common.貼上_PNR_電報')}
            </label>
            <Textarea
              value={rawPnr}
              onChange={e => setRawPnr(e.target.value)}
              placeholder={t('common.貼上_PNR_電報_placeholder')}
              className="min-h-[120px] font-mono text-xs"
            />
            <div className="flex gap-2">
              <Button onClick={handleParse} disabled={!rawPnr.trim() || isSearchingCustomers}>
                <RefreshCw
                  size={16}
                  className={cn('mr-1', isSearchingCustomers && 'animate-spin')}
                />
                {isSearchingCustomers
                  ? t('common.搜尋客戶中')
                  : t('common.解析並配對')}
              </Button>
              {parsedPnr && (
                <span className="text-sm text-morandi-secondary self-center">
                  {t('common.訂位代號')}{' '}
                  <strong>{parsedPnr.recordLocator || t('common.未識別')}</strong>
                </span>
              )}
            </div>
            {/* 提示：無團員時會搜尋客戶資料庫 */}
            {members.length === 0 && (
              <p className="text-xs text-morandi-gold bg-morandi-gold/10 px-3 py-2 rounded-lg">
                <AlertCircle size={12} className="inline mr-1" />
                {t('common.無團員提示')}
              </p>
            )}
          </div>

          {/* 配對結果 */}
          {matchResults.length > 0 && (
            <div className="space-y-3">
              {/* 統計 */}
              <div className="flex items-center gap-4 p-3 bg-morandi-container/30 rounded-lg flex-wrap">
                <span className="text-sm font-medium">{t('common.配對結果')}</span>
                <span className="flex items-center gap-1 text-sm text-morandi-green">
                  <Check size={14} /> {stats.exact} {t('common.完全符合')}
                </span>
                <span className="flex items-center gap-1 text-sm text-morandi-gold">
                  <AlertCircle size={14} /> {stats.partial} {t('common.部分符合')}
                </span>
                <span className="flex items-center gap-1 text-sm text-morandi-red">
                  <X size={14} /> {stats.none} {t('common.未配對')}
                </span>
                {stats.withSuggestions > 0 && (
                  <span className="flex items-center gap-1 text-sm text-status-info">
                    <Users size={14} /> {stats.withSuggestions} {t('common.位有建議客戶')}
                  </span>
                )}
                {stats.selectedCustomers > 0 && (
                  <span className="flex items-center gap-1 text-sm text-morandi-secondary">
                    <UserPlus size={14} /> {stats.selectedCustomers}{' '}
                    {t('common.位已選擇客戶')}
                  </span>
                )}
              </div>

              {/* 說明文字 */}
              {stats.withSuggestions > 0 && (orderId || isTourMode) && (
                <div className="p-2 bg-status-info/10 rounded-lg text-xs text-status-info">
                  <Users size={12} className="inline mr-1" />
                  {t('common.建議客戶說明')}
                  {isTourMode && t('common.請同時選擇每位旅客所屬的訂單')}
                </div>
              )}
              {stats.withSuggestions > 0 && !orderId && !isTourMode && (
                <div className="p-2 bg-morandi-gold/10 rounded-lg text-xs text-morandi-gold">
                  <AlertCircle size={12} className="inline mr-1" />
                  {t('common.建議客戶無訂單說明')}
                </div>
              )}

              {/* 團體模式：快速設定所有人的訂單 */}
              {isTourMode && stats.withSuggestions > 0 && (
                <div className="flex items-center gap-2 p-2 bg-morandi-container/20 rounded-lg">
                  <span className="text-xs text-morandi-secondary">
                    {t('common.快速設定所有人訂單')}
                  </span>
                  <select
                    onChange={e => handleSetAllOrders(e.target.value)}
                    className="text-xs border rounded px-2 py-1"
                  >
                    <option value="">{t('common.請選擇')}</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.order_number} - {o.contact_person || t('common.無聯絡人')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* 配對列表 */}
              <div className="border rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-morandi-container/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                        {t('common.pnr旅客')}
                      </th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                        {t('common.配對狀態')}
                      </th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                        {t('common.團員護照拼音')}
                      </th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                        {t('common.中文姓名')}
                      </th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                        {t('common.手動選擇')}
                      </th>
                      <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                        {t('common.建議客戶')}
                      </th>
                      {isTourMode && (
                        <th className="px-3 py-2 text-left font-medium whitespace-nowrap">
                          {t('common.選擇訂單')}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {finalResults.map((result, index) => (
                      <tr
                        key={index}
                        className={cn(
                          'border-t',
                          result.selectedCustomerId && 'bg-morandi-container',
                          !result.selectedCustomerId &&
                            result.confidence === 'none' &&
                            'bg-morandi-red/10',
                          !result.selectedCustomerId &&
                            result.confidence === 'partial' &&
                            'bg-morandi-gold/10'
                        )}
                      >
                        <td className="px-3 py-2 font-mono whitespace-nowrap">
                          {result.pnrPassenger}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {result.selectedCustomerId ? (
                            <span className="flex items-center gap-1 text-morandi-secondary">
                              <UserPlus size={14} /> {t('common.已選客戶')}
                            </span>
                          ) : result.confidence === 'exact' ? (
                            <span className="flex items-center gap-1 text-morandi-green">
                              <Check size={14} /> {t('common.完全符合')}
                            </span>
                          ) : result.confidence === 'partial' ? (
                            <span className="flex items-center gap-1 text-morandi-gold">
                              <AlertCircle size={14} /> {t('common.部分符合')}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-morandi-red">
                              <X size={14} /> {t('common.未配對')}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono whitespace-nowrap">
                          {result.matchedMember?.passport_name || '-'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {result.matchedMember?.chinese_name || '-'}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={
                              manualMatches[result.pnrPassenger] === '__NONE__'
                                ? '__NONE__'
                                : manualMatches[result.pnrPassenger] ||
                                  result.matchedMember?.id ||
                                  ''
                            }
                            onChange={e => handleManualMatch(result.pnrPassenger, e.target.value)}
                            className="text-xs border rounded px-2 py-1 w-full max-w-[150px]"
                            disabled={!!result.selectedCustomerId}
                          >
                            <option value="">{t('common.自動配對')}</option>
                            <option value="__NONE__">{t('common.取消配對')}</option>
                            {members.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.chinese_name || m.passport_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          {result.suggestedCustomers.length > 0 ? (
                            <select
                              value={result.selectedCustomerId || ''}
                              onChange={e =>
                                handleSelectCustomer(result.pnrPassenger, e.target.value)
                              }
                              className={cn(
                                'text-xs border rounded px-2 py-1 w-full max-w-[180px]',
                                result.selectedCustomerId &&
                                  'border-morandi-secondary bg-morandi-container'
                              )}
                              disabled={!!result.matchedMember && !result.selectedCustomerId}
                            >
                              <option value="">{t('common.選擇客戶')}</option>
                              {result.suggestedCustomers.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.name} ({c.passport_name}) {c.score}%
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-morandi-muted">
                              {t('common.無建議')}
                            </span>
                          )}
                        </td>
                        {isTourMode && (
                          <td className="px-3 py-2">
                            <select
                              value={selectedOrderIds[result.pnrPassenger] || ''}
                              onChange={e => handleSelectOrder(result.pnrPassenger, e.target.value)}
                              className={cn(
                                'text-xs border rounded px-2 py-1 w-full max-w-[150px]',
                                selectedOrderIds[result.pnrPassenger] &&
                                  'border-status-info bg-status-info/10'
                              )}
                            >
                              <option value="">{t('common.選擇訂單_placeholder')}</option>
                              {orders.map(o => (
                                <option key={o.id} value={o.id}>
                                  {o.order_number} -{' '}
                                  {o.contact_person || t('common.無聯絡人')}
                                </option>
                              ))}
                            </select>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 未配對的團員 */}
              {unmatchedMembers.length > 0 && (
                <div className="p-3 bg-morandi-gold/10 rounded-lg">
                  <p className="text-sm font-medium text-morandi-gold mb-2">
                    {t('common.未在PNR中的團員')} ({unmatchedMembers.length}{' '}
                    {t('common.人')})：
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {unmatchedMembers.map(m => (
                      <span
                        key={m.id}
                        className="px-2 py-1 bg-card rounded text-xs border border-morandi-gold/30"
                      >
                        {m.chinese_name || m.passport_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 航班資訊 */}
              {parsedPnr && parsedPnr.segments.length > 0 && (
                <div className="p-3 bg-status-info/10 rounded-lg">
                  <p className="text-sm font-medium text-status-info mb-2">
                    {t('common.航班資訊')}
                  </p>
                  <div className="space-y-1">
                    {parsedPnr.segments.map((seg, i) => (
                      <div key={i} className="text-xs font-mono text-status-info">
                        <span>
                          {seg.airline}
                          {seg.flightNumber} {seg.origin}→{seg.destination} {seg.departureDate}{' '}
                          {seg.departureTime}
                        </span>
                        {seg.via && seg.via.length > 0 && (
                          <span className="ml-2 text-status-warning bg-status-warning/10 px-1.5 py-0.5 rounded">
                            {t('common.經停')}{' '}
                            {seg.via
                              .map(v => `${v.city}${v.duration ? ` (${v.duration})` : ''}`)
                              .join(', ')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="gap-1" onClick={handleClose}>
            <X size={16} />
            {t('common.取消')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!parsedPnr || savableCount === 0 || isSaving}
            className="bg-morandi-gold hover:bg-morandi-gold-hover"
          >
            <Save size={16} className="mr-1" />
            {isSaving
              ? t('common.儲存中')
              : `${t('common.儲存配對')} (${savableCount} ${t('common.人')})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
