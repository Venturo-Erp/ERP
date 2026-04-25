'use client'

import React, { useState } from 'react'
import {
  Send,
  UserCheck,
  Copy,
  Check,
  Clock,
  AlertCircle,
  ExternalLink,
  History,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import type {
  QuoteConfirmationStatus,
  QuoteConfirmationLog,
  ConfirmationResult,
} from '@/types/quote.types'
import { DateCell } from '@/components/table-cells'
import { QUOTE_CONFIRMATION_SECTION_LABELS } from '../constants/labels'
import { QUOTE_COMPONENT_LABELS } from '../constants/labels'

interface QuoteConfirmationSectionProps {
  quoteId: string
  confirmationStatus?: QuoteConfirmationStatus
  confirmationToken?: string
  confirmationTokenExpiresAt?: string
  confirmedAt?: string
  confirmedByType?: 'customer' | 'staff'
  confirmedByName?: string
  staffId?: string
  staffName?: string
  onConfirmationStatusChange?: (status: QuoteConfirmationStatus) => void
  isReadOnly?: boolean
}

// 確認狀態配置
const confirmationStatusConfig: Record<
  QuoteConfirmationStatus,
  { label: string; color: string; bgColor: string }
> = {
  draft: {
    label: QUOTE_CONFIRMATION_SECTION_LABELS.未確認,
    color: 'text-morandi-secondary',
    bgColor: 'bg-morandi-container',
  },
  pending: {
    label: QUOTE_CONFIRMATION_SECTION_LABELS.待確認,
    color: 'text-status-warning',
    bgColor: 'bg-status-warning-bg',
  },
  customer_confirmed: {
    label: QUOTE_CONFIRMATION_SECTION_LABELS.客戶已確認,
    color: 'text-status-success',
    bgColor: 'bg-status-success-bg',
  },
  staff_confirmed: {
    label: QUOTE_CONFIRMATION_SECTION_LABELS.業務已確認,
    color: 'text-morandi-gold',
    bgColor: 'bg-morandi-gold/10',
  },
  closed: {
    label: QUOTE_CONFIRMATION_SECTION_LABELS.已成交,
    color: 'text-morandi-green',
    bgColor: 'bg-morandi-green/10',
  },
}

export const QuoteConfirmationSection: React.FC<QuoteConfirmationSectionProps> = ({
  quoteId,
  confirmationStatus = 'draft',
  confirmationToken,
  confirmationTokenExpiresAt,
  confirmedAt,
  confirmedByType,
  confirmedByName,
  staffId,
  staffName,
  onConfirmationStatusChange,
  isReadOnly = false,
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showStaffConfirmDialog, setShowStaffConfirmDialog] = useState(false)
  const [showLogsDialog, setShowLogsDialog] = useState(false)
  const [confirmNotes, setConfirmNotes] = useState('')
  const [logs, setLogs] = useState<QuoteConfirmationLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  const statusConfig = confirmationStatusConfig[confirmationStatus]
  const isConfirmed =
    confirmationStatus === 'customer_confirmed' ||
    confirmationStatus === 'staff_confirmed' ||
    confirmationStatus === 'closed'

  // 生成確認連結
  const confirmationUrl = confirmationToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/confirm/${confirmationToken}`
    : null

  // 檢查 token 是否過期
  const isTokenExpired = confirmationTokenExpiresAt
    ? new Date(confirmationTokenExpiresAt) < new Date()
    : false

  // 發送確認連結
  const handleSendConfirmationLink = async () => {
    if (!staffId) {
      toast.error(QUOTE_CONFIRMATION_SECTION_LABELS.請先登入)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/quotes/confirmation/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: quoteId,
          expires_in_days: 7,
          staff_id: staffId,
        }),
      })

      const result: ConfirmationResult = await response.json()

      if (!result.success) {
        toast.error(result.error || QUOTE_CONFIRMATION_SECTION_LABELS.發送失敗)
        return
      }

      toast.success(QUOTE_CONFIRMATION_SECTION_LABELS.確認連結已產生)
      onConfirmationStatusChange?.('pending')

      // 自動複製連結
      if (result.token) {
        const url = `${window.location.origin}/confirm/${result.token}`
        await navigator.clipboard.writeText(url)
        toast.success(QUOTE_CONFIRMATION_SECTION_LABELS.連結已複製到剪貼簿)
      }
    } catch (error) {
      logger.error('發送確認連結失敗:', error)
      toast.error(QUOTE_CONFIRMATION_SECTION_LABELS.發送失敗)
    } finally {
      setIsLoading(false)
    }
  }

  // 複製確認連結
  const handleCopyLink = async () => {
    if (!confirmationUrl) return

    try {
      await navigator.clipboard.writeText(confirmationUrl)
      setCopied(true)
      toast.success(QUOTE_CONFIRMATION_SECTION_LABELS.連結已複製)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(QUOTE_CONFIRMATION_SECTION_LABELS.複製失敗)
    }
  }

  // 業務確認
  const handleStaffConfirm = async () => {
    if (!staffId || !staffName) {
      toast.error(QUOTE_CONFIRMATION_SECTION_LABELS.請先登入)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/quotes/confirmation/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: quoteId,
          staff_id: staffId,
          staff_name: staffName,
          notes: confirmNotes || undefined,
        }),
      })

      const result: ConfirmationResult = await response.json()

      if (!result.success) {
        toast.error(result.error || QUOTE_CONFIRMATION_SECTION_LABELS.確認失敗)
        return
      }

      toast.success(QUOTE_CONFIRMATION_SECTION_LABELS.報價單已確認)
      onConfirmationStatusChange?.('staff_confirmed')
      setShowStaffConfirmDialog(false)
      setConfirmNotes('')
    } catch (error) {
      logger.error('業務確認失敗:', error)
      toast.error(QUOTE_CONFIRMATION_SECTION_LABELS.確認失敗)
    } finally {
      setIsLoading(false)
    }
  }

  // 載入確認歷史
  const handleLoadLogs = async () => {
    setLogsLoading(true)
    try {
      const response = await fetch(`/api/quotes/confirmation/logs?quote_id=${quoteId}`)
      const result = await response.json()

      if (result.success && result.logs) {
        setLogs(result.logs)
      }
    } catch (error) {
      logger.error('載入確認歷史失敗:', error)
    } finally {
      setLogsLoading(false)
    }
  }

  // 動作標籤
  const actionLabels: Record<string, string> = {
    send_link: QUOTE_CONFIRMATION_SECTION_LABELS.發送確認連結,
    resend_link: QUOTE_CONFIRMATION_SECTION_LABELS.重新發送連結,
    customer_confirmed: QUOTE_CONFIRMATION_SECTION_LABELS.客戶確認,
    staff_confirmed: QUOTE_CONFIRMATION_SECTION_LABELS.業務確認,
    revoked: QUOTE_CONFIRMATION_SECTION_LABELS.撤銷確認,
    expired: QUOTE_CONFIRMATION_SECTION_LABELS.連結過期,
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* 確認狀態下拉選單 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'h-8 px-3 gap-1.5',
                statusConfig.bgColor,
                statusConfig.color,
                'border-transparent hover:border-current/30'
              )}
            >
              {isConfirmed ? (
                <Check size={14} />
              ) : confirmationStatus === 'pending' ? (
                <Clock size={14} />
              ) : (
                <AlertCircle size={14} />
              )}
              {statusConfig.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {/* 確認資訊 */}
            {isConfirmed && confirmedAt && (
              <>
                <div className="px-2 py-2 text-sm">
                  <div className="text-morandi-secondary">
                    {QUOTE_CONFIRMATION_SECTION_LABELS.CONFIRM_9119}
                  </div>
                  <DateCell
                    date={confirmedAt}
                    format="time"
                    showIcon={false}
                    className="font-medium"
                  />
                  {confirmedByName && (
                    <>
                      <div className="text-morandi-secondary mt-1">
                        {QUOTE_CONFIRMATION_SECTION_LABELS.CONFIRM_1673}
                      </div>
                      <div className="font-medium">
                        {confirmedByName}
                        <span className="text-xs text-morandi-secondary ml-1">
                          (
                          {confirmedByType === 'customer'
                            ? QUOTE_CONFIRMATION_SECTION_LABELS.客戶
                            : QUOTE_CONFIRMATION_SECTION_LABELS.業務}
                          )
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <DropdownMenuSeparator />
              </>
            )}

            {/* 待確認資訊 */}
            {confirmationStatus === 'pending' && confirmationTokenExpiresAt && (
              <>
                <div className="px-2 py-2 text-sm">
                  <div className="text-morandi-secondary">
                    {QUOTE_CONFIRMATION_SECTION_LABELS.LABEL_1799}
                  </div>
                  <div
                    className={cn(
                      'font-medium flex items-center gap-1',
                      isTokenExpired && 'text-status-danger'
                    )}
                  >
                    <DateCell date={confirmationTokenExpiresAt} format="time" showIcon={false} />
                    {isTokenExpired && <span>{QUOTE_CONFIRMATION_SECTION_LABELS.EXPIRED}</span>}
                  </div>
                </div>
                <DropdownMenuSeparator />
              </>
            )}

            {/* 操作選項 */}
            {!isConfirmed && !isReadOnly && (
              <>
                <DropdownMenuItem
                  onClick={isLoading ? undefined : handleSendConfirmationLink}
                  className={cn('gap-2', isLoading && 'opacity-50 cursor-not-allowed')}
                >
                  <Send size={14} />
                  {confirmationStatus === 'pending'
                    ? QUOTE_CONFIRMATION_SECTION_LABELS.重新發送連結
                    : QUOTE_CONFIRMATION_SECTION_LABELS.發送確認連結}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={isLoading ? undefined : () => setShowStaffConfirmDialog(true)}
                  className={cn('gap-2', isLoading && 'opacity-50 cursor-not-allowed')}
                >
                  <UserCheck size={14} />
                  {QUOTE_CONFIRMATION_SECTION_LABELS.CONFIRM_9516}
                </DropdownMenuItem>
              </>
            )}

            {/* 複製連結 */}
            {confirmationUrl && confirmationStatus === 'pending' && !isTokenExpired && (
              <DropdownMenuItem onClick={handleCopyLink} className="gap-2">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {QUOTE_CONFIRMATION_SECTION_LABELS.CONFIRM_9899}
              </DropdownMenuItem>
            )}

            {/* 開啟連結 */}
            {confirmationUrl && confirmationStatus === 'pending' && !isTokenExpired && (
              <DropdownMenuItem
                onClick={() => window.open(confirmationUrl, '_blank')}
                className="gap-2"
              >
                <ExternalLink size={14} />
                {QUOTE_CONFIRMATION_SECTION_LABELS.CONFIRM_133}
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {/* 查看歷史 */}
            <DropdownMenuItem
              onClick={() => {
                setShowLogsDialog(true)
                handleLoadLogs()
              }}
              className="gap-2"
            >
              <History size={14} />
              {QUOTE_CONFIRMATION_SECTION_LABELS.CONFIRM_495}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 業務確認對話框 */}
      <Dialog open={showStaffConfirmDialog} onOpenChange={setShowStaffConfirmDialog}>
        <DialogContent level={1} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck size={20} className="text-morandi-gold" />
              {QUOTE_CONFIRMATION_SECTION_LABELS.CONFIRM_9516}
            </DialogTitle>
            <DialogDescription>{QUOTE_CONFIRMATION_SECTION_LABELS.CONFIRM_4324}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-morandi-primary block mb-1">
                {QUOTE_CONFIRMATION_SECTION_LABELS.CONFIRM_2435}
              </label>
              <textarea
                value={confirmNotes}
                onChange={e => setConfirmNotes(e.target.value)}
                placeholder={QUOTE_CONFIRMATION_SECTION_LABELS.例如_客戶電話確認同意}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-morandi-gold/50 resize-none"
              />
            </div>

            <div className="text-xs text-morandi-secondary bg-morandi-container/30 p-3 rounded-lg">
              {QUOTE_CONFIRMATION_SECTION_LABELS.CONFIRM_1899}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowStaffConfirmDialog(false)}
            >
              <X size={16} />
              {QUOTE_CONFIRMATION_SECTION_LABELS.CANCEL}
            </Button>
            <Button
              onClick={handleStaffConfirm}
              disabled={isLoading}
              className="bg-morandi-gold/15 text-morandi-primary border border-morandi-gold/30 hover:bg-morandi-gold/25 hover:border-morandi-gold/50 transition-colors gap-2"
            >
              <Check size={16} />
              {isLoading
                ? QUOTE_CONFIRMATION_SECTION_LABELS.確認中
                : QUOTE_CONFIRMATION_SECTION_LABELS.確認報價}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 確認歷史對話框 */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent level={1} className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History size={20} className="text-morandi-gold" />
              {QUOTE_CONFIRMATION_SECTION_LABELS.CONFIRM_495}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 max-h-[400px] overflow-y-auto">
            {logsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-morandi-gold" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-morandi-secondary">
                {QUOTE_CONFIRMATION_SECTION_LABELS.EMPTY_1207}
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map(log => (
                  <div key={log.id} className="border border-border rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{actionLabels[log.action] || log.action}</span>
                      <DateCell
                        date={log.created_at}
                        format="time"
                        showIcon={false}
                        className="text-xs text-morandi-secondary"
                      />
                    </div>
                    {log.confirmed_by_name && (
                      <div className="text-morandi-secondary">
                        {log.confirmed_by_type === 'customer'
                          ? QUOTE_CONFIRMATION_SECTION_LABELS.CONFIRMED_BY_CUSTOMER
                          : QUOTE_CONFIRMATION_SECTION_LABELS.CONFIRMED_BY_STAFF}
                        {QUOTE_CONFIRMATION_SECTION_LABELS.CONFIRMED_BY_SUFFIX}
                        {log.confirmed_by_name}
                        {log.confirmed_by_email && ` (${log.confirmed_by_email})`}
                      </div>
                    )}
                    {log.notes && (
                      <div className="text-morandi-secondary mt-1">
                        {QUOTE_CONFIRMATION_SECTION_LABELS.NOTES_PREFIX}
                        {log.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
