'use client'

/**
 * 團 PNR 分配工具（V2 簡約版）
 * 貼上電報 → 自動解析配對 → 儲存
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Clipboard,
  Plane,
  AlertTriangle,
  Check,
  Save,
  X,
  Loader2,
  Clock,
  Baby,
  UserPlus,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { confirm } from '@/lib/ui/alert-dialog'
import { formatDateTW } from '@/lib/utils/format-date'
import { parseAmadeusPNR, type ParsedPNR } from '@/lib/pnr-parser'
import { useReferenceData } from '@/lib/pnr/use-reference-data'
import { createPNR } from '@/data'
import { useAuthStore } from '@/stores/auth-store'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import type { OrderMember } from '@/features/orders/types/order-member.types'
import type { PNR, PNRSegment } from '@/types/pnr.types'
import type { Json } from '@/lib/supabase/types'
import { COMP_TOURS_LABELS, TOUR_PNR_TOOL_DIALOG_LABELS as LABELS } from '../../constants/labels'
import { type PassengerMatch, buildPassengerMatches } from './pnr-matching'

// 客戶庫建議型別
interface CustomerSuggestion {
  id: string
  name: string | null
  passport_name: string | null
  customer_id: string
}

interface TourPnrToolDialogProps {
  isOpen: boolean
  onClose: () => void
  tourId: string
  tourCode: string
  tourName: string
  members: OrderMember[]
  onSuccess?: () => void
}

export function TourPnrToolDialog({
  isOpen,
  onClose,
  tourId,
  tourCode,
  tourName,
  members,
  onSuccess,
}: TourPnrToolDialogProps) {
  const [rawPNR, setRawPNR] = useState('')
  const [parsedPNR, setParsedPNR] = useState<ParsedPNR | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [passengerMatches, setPassengerMatches] = useState<PassengerMatch[]>([])
  const [customerSuggestions, setCustomerSuggestions] = useState<
    Record<number, CustomerSuggestion>
  >({})
  const [addingMember, setAddingMember] = useState<number | null>(null)

  const { user } = useAuthStore()
  const { getAirlineName, getAirportName } = useReferenceData({ enabled: false })

  // 出票期限狀態
  const deadlineStatus = useMemo(() => {
    if (!parsedPNR?.ticketingDeadline) return null
    const deadline = parsedPNR.ticketingDeadline
    const now = new Date()
    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return { text: COMP_TOURS_LABELS.已過期, urgent: true }
    if (diffDays === 0) return { text: COMP_TOURS_LABELS.今日到期, urgent: true }
    if (diffDays === 1) return { text: COMP_TOURS_LABELS.明日到期, urgent: true }
    if (diffDays <= 3) return { text: `${diffDays} 天內`, urgent: true }
    return { text: `${diffDays} 天後`, urgent: false }
  }, [parsedPNR?.ticketingDeadline])

  // 搜尋客戶庫（針對未配對的旅客）
  const searchCustomersForUnmatched = useCallback(async (matches: PassengerMatch[]) => {
    const unmatched = matches.filter(m => !m.memberId)
    if (unmatched.length === 0) return

    try {
      const { supabase } = await import('@/lib/supabase/client')
      const suggestions: Record<number, CustomerSuggestion> = {}

      for (const match of unmatched) {
        const surname = match.pnrName.split('/')[0]?.toUpperCase()
        if (!surname) continue

        const { data } = await supabase
          .from('customers')
          .select('id, name, passport_name')
          .ilike('passport_name', `${surname}%`)
          .limit(1)

        if (data && data.length > 0) {
          const customer = data[0]
          suggestions[match.pnrIndex] = {
            id: customer.id,
            name: customer.name,
            passport_name: customer.passport_name,
            customer_id: customer.id,
          }
        }
      }

      setCustomerSuggestions(suggestions)
    } catch (err) {
      logger.error('[PNR] 客戶庫搜尋失敗:', err)
    }
  }, [])

  // 解析 PNR
  const handleParse = useCallback(() => {
    if (!rawPNR.trim()) {
      setError(COMP_TOURS_LABELS.請貼上_PNR_電報內容)
      setParsedPNR(null)
      setPassengerMatches([])
      setCustomerSuggestions({})
      return
    }

    try {
      const result = parseAmadeusPNR(rawPNR)
      setParsedPNR(result)
      setError(null)

      const matches = buildPassengerMatches(result, members)
      setPassengerMatches(matches)

      // 搜尋客戶庫建議
      void searchCustomersForUnmatched(matches)

      if (!result.validation.isValid && result.validation.errors.length > 0) {
        setError(result.validation.errors[0])
      }
    } catch (err) {
      setError(
        COMP_TOURS_LABELS.解析失敗 +
          (err instanceof Error ? err.message : COMP_TOURS_LABELS.未知錯誤)
      )
      setParsedPNR(null)
      setPassengerMatches([])
    }
  }, [rawPNR, members, searchCustomersForUnmatched])

  // 從剪貼簿貼上
  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      setRawPNR(text)
      setError(null)
      setParsedPNR(null)
      setPassengerMatches([])
      setCustomerSuggestions({})
    } catch {
      setError(COMP_TOURS_LABELS.無法存取剪貼簿)
    }
  }, [])

  // 清除
  const storageKey = `pnr-draft-${tourId}`
  const handleClear = useCallback(() => {
    localStorage.removeItem(storageKey)
    setRawPNR('')
    setParsedPNR(null)
    setError(null)
    setPassengerMatches([])
    setCustomerSuggestions({})
  }, [storageKey])

  // 手動選擇比對的團員
  const handleMemberSelect = useCallback(
    (pnrIndex: number, memberId: string | null) => {
      setPassengerMatches(prev =>
        prev.map((match, i) => {
          if (i !== pnrIndex) return match
          const member = memberId ? members.find(m => m.id === memberId) : null
          return {
            ...match,
            memberId,
            memberName: member?.chinese_name || null,
            memberPassportName: member?.passport_name || null,
            ticketPrice: member?.flight_cost || match.ticketPrice,
            existingPnr: member?.pnr || null,
          }
        })
      )
    },
    [members]
  )

  // 加入訂單（從客戶庫）
  const handleAddFromCustomer = useCallback(
    async (pnrIndex: number, suggestion: CustomerSuggestion) => {
      if (!user?.workspace_id) return
      setAddingMember(pnrIndex)

      try {
        const { supabase } = await import('@/lib/supabase/client')

        // 找到這個團的第一個 order_id（優先從 members，沒有的話從 tour 查）
        let orderId: string | undefined = members[0]?.order_id

        if (!orderId) {
          // 從 tour 查詢第一個訂單
          const { data: orders } = await supabase
            .from('orders')
            .select('id')
            .eq('tour_id', tourId)
            .limit(1)

          orderId = orders?.[0]?.id

          if (!orderId) {
            toast.error(LABELS.找不到訂單)
            return
          }
        }

        const { data, error: insertError } = await supabase
          .from('order_members')
          .insert({
            order_id: orderId!,
            customer_id: suggestion.customer_id,
            chinese_name: suggestion.name,
            passport_name: suggestion.passport_name,
            member_type: 'adult',
            workspace_id: user.workspace_id,
          })
          .select()
          .single()

        if (insertError) throw insertError

        // 更新配對
        setPassengerMatches(prev =>
          prev.map((match, i) => {
            if (i !== pnrIndex) return match
            return {
              ...match,
              memberId: data.id,
              memberName: suggestion.name,
              memberPassportName: suggestion.passport_name,
            }
          })
        )

        toast.success(LABELS.已加入訂單(suggestion.name || suggestion.passport_name || ''))

        // 通知上層重新載入團員資料
        onSuccess?.()
      } catch (err) {
        logger.error('[PNR] 加入訂單失敗:', err)
        toast.error(LABELS.加入訂單失敗)
      } finally {
        setAddingMember(null)
      }
    },
    [user, members, onSuccess]
  )

  // 新增團員（從 PNR 姓名）
  const handleAddNewMember = useCallback(
    async (pnrIndex: number, pnrName: string) => {
      if (!user?.workspace_id) return
      setAddingMember(pnrIndex)

      try {
        const { supabase } = await import('@/lib/supabase/client')

        // 找到這個團的第一個 order_id（優先從 members，沒有的話從 tour 查）
        let orderId: string | undefined = members[0]?.order_id

        if (!orderId) {
          // 從 tour 查詢第一個訂單
          const { data: orders } = await supabase
            .from('orders')
            .select('id')
            .eq('tour_id', tourId)
            .limit(1)

          orderId = orders?.[0]?.id

          if (!orderId) {
            toast.error(LABELS.找不到訂單)
            return
          }
        }

        const { data, error: insertError } = await supabase
          .from('order_members')
          .insert({
            order_id: orderId!,
            passport_name: pnrName,
            member_type: 'adult',
            workspace_id: user.workspace_id,
          })
          .select()
          .single()

        if (insertError) throw insertError

        setPassengerMatches(prev =>
          prev.map((match, i) => {
            if (i !== pnrIndex) return match
            return {
              ...match,
              memberId: data.id,
              memberName: null,
              memberPassportName: pnrName,
            }
          })
        )

        toast.success(LABELS.已新增團員(pnrName))
      } catch (err) {
        logger.error('[PNR] 新增團員失敗:', err)
        toast.error(LABELS.新增團員失敗)
      } finally {
        setAddingMember(null)
      }
    },
    [user, members]
  )

  // 儲存
  const handleSave = useCallback(async () => {
    if (!parsedPNR || !user?.workspace_id) return

    const conflicts = passengerMatches.filter(
      m => m.memberId && m.existingPnr && m.existingPnr !== parsedPNR.recordLocator
    )
    if (conflicts.length > 0) {
      const names = conflicts.map(m => m.memberName || m.pnrName).join('、')
      const confirmed = await confirm(`${LABELS.以下團員已有不同的_PNR_儲存後將覆蓋}\n${names}`, {
        title: COMP_TOURS_LABELS.PNR_覆蓋確認,
        type: 'warning',
      })
      if (!confirmed) return
    }

    setIsSaving(true)
    try {
      const { supabase } = await import('@/lib/supabase/client')
      const recordLocator = parsedPNR.recordLocator || 'UNKNWN'

      const mergedSegments: PNRSegment[] = parsedPNR.segments.map(seg => ({ ...seg }))

      // 檢查 PNR 是否已存在
      const { data: existingPNR } = await supabase
        .from('pnrs')
        .select('id')
        .eq('record_locator', recordLocator)
        .single()

      if (existingPNR) {
        await supabase
          .from('pnrs')
          .update({
            raw_pnr: rawPNR,
            passenger_names: parsedPNR.passengerNames,
            ticketing_deadline: parsedPNR.ticketingDeadline?.toISOString() || null,
            segments: mergedSegments as unknown as Json,
            special_requests: parsedPNR.specialRequests as unknown as string[],
            other_info: parsedPNR.otherInfo as unknown as string[],
            tour_id: tourId,
            updated_by: user.id || null,
          })
          .eq('id', existingPNR.id)
        toast.info(LABELS.PNR_已存在_已更新資料(recordLocator))
      } else {
        await createPNR({
          record_locator: recordLocator,
          workspace_id: user.workspace_id,
          employee_id: user.id || null,
          raw_pnr: rawPNR,
          passenger_names: parsedPNR.passengerNames,
          ticketing_deadline: parsedPNR.ticketingDeadline?.toISOString() || null,
          cancellation_deadline: null,
          segments: mergedSegments,
          special_requests: parsedPNR.specialRequests || null,
          other_info: parsedPNR.otherInfo || null,
          status: 'active',
          tour_id: tourId,
          notes: null,
          created_by: user.id || null,
          updated_by: null,
        } as unknown as Omit<PNR, 'id' | 'created_at' | 'updated_at'>)
      }

      // 更新團員
      let updateCount = 0
      const errors: string[] = []

      for (const match of passengerMatches) {
        if (match.memberId) {
          const updateData: Record<string, unknown> = { pnr: recordLocator }
          if (match.ticketPrice !== null) updateData.flight_cost = match.ticketPrice
          if (match.ticketNumber) updateData.ticket_number = match.ticketNumber
          if (match.meal.length > 0) updateData.special_meal = match.meal.join(', ')
          if (parsedPNR.ticketingDeadline) {
            updateData.ticketing_deadline = parsedPNR.ticketingDeadline.toISOString().split('T')[0]
          }

          const { error: updateError } = await supabase
            .from('order_members')
            .update(updateData)
            .eq('id', match.memberId)

          if (updateError) {
            errors.push(`${match.pnrName}: ${updateError.message}`)
          } else {
            updateCount++
          }
        }
      }

      if (errors.length > 0) {
        toast.error(LABELS.更新失敗(errors.join(', ')))
      }

      toast.success(LABELS.PNR_已儲存_更新_位團員(recordLocator, updateCount))
      handleClear()
      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error(
        COMP_TOURS_LABELS.儲存失敗_3 +
          (err instanceof Error ? err.message : COMP_TOURS_LABELS.未知錯誤)
      )
    } finally {
      setIsSaving(false)
    }
  }, [parsedPNR, rawPNR, user, tourId, passengerMatches, onSuccess, onClose, handleClear])

  // 載入草稿
  useEffect(() => {
    if (isOpen && tourId) {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          const draft = JSON.parse(saved) as { rawPNR?: string }
          if (draft.rawPNR) {
            setRawPNR(draft.rawPNR)
            setTimeout(() => {
              try {
                const result = parseAmadeusPNR(draft.rawPNR || '')
                setParsedPNR(result)
                const matches = buildPassengerMatches(result, members)
                setPassengerMatches(matches)
                void searchCustomersForUnmatched(matches)
              } catch {
                // 解析失敗時忽略
              }
            }, 100)
          }
        } catch {
          // 解析失敗時忽略
        }
      }
    }
  }, [isOpen, tourId, storageKey, members, searchCustomersForUnmatched])

  // 保存草稿
  useEffect(() => {
    if (tourId) {
      if (rawPNR.trim()) {
        localStorage.setItem(storageKey, JSON.stringify({ rawPNR }))
      } else {
        localStorage.removeItem(storageKey)
      }
    }
  }, [tourId, rawPNR, storageKey])

  // 統計
  const matchStats = useMemo(() => {
    const matched = passengerMatches.filter(m => m.memberId).length
    const total = passengerMatches.length
    return { matched, total, allMatched: matched === total && total > 0 }
  }, [passengerMatches])

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent level={2} className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Plane size={18} className="text-morandi-gold" />
            {LABELS.PNR_電報工具}
            <span className="font-normal text-morandi-secondary ml-1">
              {tourCode} · {tourName}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-3 px-1">
          {/* 輸入區 */}
          <div className="relative">
            <Textarea
              value={rawPNR}
              onChange={e => setRawPNR(e.target.value)}
              placeholder={COMP_TOURS_LABELS.貼上_Amadeus_PNR_電報}
              className={cn(
                'font-mono text-xs transition-all',
                parsedPNR
                  ? 'min-h-[50px] max-h-[50px] overflow-hidden text-morandi-secondary'
                  : 'min-h-[100px]'
              )}
            />
            {parsedPNR && (
              <button
                onClick={handleClear}
                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-morandi-container text-morandi-secondary hover:text-morandi-primary flex items-center justify-center text-xs"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {!parsedPNR && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePaste} className="gap-1 text-xs">
                <Clipboard size={13} />
                {LABELS.從剪貼簿貼上}
              </Button>
              <Button
                size="sm"
                onClick={handleParse}
                disabled={!rawPNR.trim()}
                className="gap-1 text-xs bg-morandi-gold hover:bg-morandi-gold-hover text-white"
              >
                {LABELS.解析電報}
              </Button>
            </div>
          )}

          {/* 錯誤 */}
          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-status-danger-bg rounded-lg text-status-danger text-xs">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {/* 解析結果 */}
          {parsedPNR && (
            <>
              {/* 摘要條 */}
              <div className="flex items-center gap-3 p-2.5 bg-morandi-container/50 rounded-lg">
                <span className="font-mono font-bold text-base text-morandi-gold">
                  {parsedPNR.recordLocator}
                </span>
                <span className="text-xs text-morandi-secondary">
                  {parsedPNR.passengers.length} {LABELS.位旅客} · {parsedPNR.segments.length}{' '}
                  {LABELS.段航班}
                </span>
                {deadlineStatus && (
                  <span
                    className={cn(
                      'ml-auto text-xs px-2 py-0.5 rounded-full flex items-center gap-1',
                      deadlineStatus.urgent
                        ? 'bg-status-danger-bg text-status-danger'
                        : 'bg-status-success-bg text-status-success'
                    )}
                  >
                    <Clock size={11} />
                    {LABELS.出票期限}
                    {parsedPNR.ticketingDeadline ? formatDateTW(parsedPNR.ticketingDeadline) : ''}（
                    {deadlineStatus.text}）
                  </span>
                )}
              </div>

              {/* 配對列表 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-morandi-secondary">{LABELS.旅客比對}</span>
                  <span className="text-xs text-morandi-secondary">
                    {matchStats.allMatched ? (
                      <span className="text-status-success font-medium">
                        {matchStats.matched}/{matchStats.total} {LABELS.全部配對完成} ✓
                      </span>
                    ) : (
                      <>
                        {matchStats.matched}/{matchStats.total} {LABELS.已配對}
                      </>
                    )}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {passengerMatches.map((match, i) => {
                    const suggestion = customerSuggestions[match.pnrIndex]
                    const isAdding = addingMember === i
                    const hasMatch = !!match.memberId
                    const hasSuggestion = !hasMatch && !!suggestion

                    return (
                      <div
                        key={i}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-colors',
                          hasMatch
                            ? 'border-l-[3px] border-l-[#7a9e7e] border-r-border border-y-border bg-white'
                            : hasSuggestion
                              ? 'border-l-[3px] border-l-status-info border-r-border border-y-border bg-status-info-bg'
                              : 'border-l-[3px] border-l-morandi-gold border-r-border border-y-border bg-morandi-gold/5'
                        )}
                      >
                        {/* 編號 */}
                        <span
                          className={cn(
                            'w-5 h-5 rounded-full text-[10px] font-semibold flex items-center justify-center flex-shrink-0',
                            hasMatch
                              ? 'bg-status-success-bg text-status-success'
                              : hasSuggestion
                                ? 'bg-status-info-bg text-status-info'
                                : 'bg-morandi-gold/15 text-morandi-gold'
                          )}
                        >
                          {i + 1}
                        </span>

                        {/* PNR 姓名 */}
                        <div className="w-[160px] flex-shrink-0">
                          <div className="font-mono text-xs font-semibold">{match.pnrName}</div>
                          <div className="text-[10px] text-morandi-secondary">
                            {match.passengerType === 'CHD' ? (
                              <span className="text-status-info">{LABELS.LABEL_475}</span>
                            ) : (
                              LABELS.成人
                            )}
                          </div>
                          {match.infant && (
                            <div className="flex items-center gap-1 text-[10px] text-morandi-red mt-0.5">
                              <Baby size={10} />
                              {match.infant.name}（{match.infant.birthDate}）
                            </div>
                          )}
                        </div>

                        {/* 箭頭 */}
                        <ArrowRight
                          size={13}
                          className={cn(
                            'flex-shrink-0',
                            hasMatch ? 'text-status-success' : 'text-morandi-muted'
                          )}
                        />

                        {/* 配對結果 */}
                        <div className="flex-1 min-w-0">
                          {hasMatch ? (
                            <div className="text-xs font-medium">
                              {match.memberName || match.memberPassportName}
                            </div>
                          ) : hasSuggestion ? (
                            <div>
                              <div className="text-xs font-medium text-status-info">
                                💡 {LABELS.客戶庫找到}：
                                {suggestion.name || suggestion.passport_name}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="text-xs text-morandi-gold">{LABELS.查無此旅客}</div>
                              <select
                                className="mt-1 text-xs border border-border rounded px-1.5 py-0.5 bg-white"
                                value=""
                                onChange={e => handleMemberSelect(i, e.target.value || null)}
                              >
                                <option value="">{LABELS.選擇團員}</option>
                                {members.map(m => (
                                  <option key={m.id} value={m.id}>
                                    {m.chinese_name || m.passport_name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        {/* 狀態/動作 */}
                        <div className="flex-shrink-0">
                          {hasMatch ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-status-success-bg text-status-success font-medium">
                              <Check size={10} className="inline -mt-px" /> {LABELS.已配對}
                            </span>
                          ) : hasSuggestion ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isAdding}
                              onClick={() => handleAddFromCustomer(i, suggestion)}
                              className="h-6 text-[11px] px-2 border-status-info text-status-info hover:bg-status-info-bg"
                            >
                              {isAdding ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                LABELS.加入訂單btn
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              disabled={isAdding}
                              onClick={() => handleAddNewMember(i, match.pnrName)}
                              className="h-6 text-[11px] px-2 bg-morandi-gold hover:bg-morandi-gold-hover text-white"
                            >
                              {isAdding ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : (
                                <>
                                  <UserPlus size={11} className="mr-0.5" />
                                  {LABELS.新增btn}
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 航班（簡潔列表） */}
              {parsedPNR.segments.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs text-morandi-secondary">
                    ✈️ {LABELS.航班資訊} {parsedPNR.segments.length} {LABELS.段}
                  </span>
                  {parsedPNR.segments.map((seg, i) => {
                    const statusLabel =
                      {
                        HK: COMP_TOURS_LABELS.已確認,
                        TK: COMP_TOURS_LABELS.已開票,
                        RR: COMP_TOURS_LABELS.已確認,
                        HX: COMP_TOURS_LABELS.已取消,
                        XX: COMP_TOURS_LABELS.已取消,
                      }[seg.status] || seg.status
                    const isOk = ['HK', 'RR', 'TK'].includes(seg.status)

                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-3 py-1.5 bg-morandi-container/40 rounded-lg text-xs"
                      >
                        <span className="font-mono font-semibold text-morandi-gold min-w-[52px]">
                          {seg.airline} {seg.flightNumber}
                        </span>
                        <span className="text-morandi-primary">
                          {getAirportName(seg.origin) || seg.origin} →{' '}
                          {getAirportName(seg.destination) || seg.destination}
                        </span>
                        <span className="text-morandi-secondary">
                          {seg.departureDate}
                          {seg.departureTime &&
                            ` ${seg.departureTime.slice(0, 2)}:${seg.departureTime.slice(2)}`}
                        </span>
                        <span
                          className={cn(
                            'ml-auto px-1.5 py-0.5 rounded text-[10px]',
                            isOk
                              ? 'bg-status-success-bg text-status-success'
                              : 'bg-status-danger-bg text-status-danger'
                          )}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-xs text-morandi-secondary">
            {parsedPNR ? (
              matchStats.allMatched ? (
                <span className="text-status-success">✅ {LABELS.全部配對完成}</span>
              ) : (
                `✅ ${matchStats.matched} ${LABELS.已配對} · ➕ ${matchStats.total - matchStats.matched} ${LABELS.待處理}`
              )
            ) : (
              `${LABELS.團員label} ${members.length} ${LABELS.人label}`
            )}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              {LABELS.關閉}
            </Button>
            {parsedPNR && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="text-xs bg-status-success hover:bg-status-success/80 text-white gap-1"
              >
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {LABELS.儲存並關聯}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
