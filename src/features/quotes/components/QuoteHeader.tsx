'use client'

import React, { useState } from 'react'
import { ArrowLeft, Save, Map, Plane, Contact, X, Download } from 'lucide-react'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { ParticipantCounts, CostCategory } from '../types'
import { QuoteConfirmationSection } from './QuoteConfirmationSection'
import type { QuoteConfirmationStatus } from '@/types/quote.types'
import type { Quote as StoreQuote } from '@/stores/types'
import { Tour } from '@/types/tour.types'
import { QUOTE_DIALOG_LABELS, QUOTE_HEADER_LABELS } from '../constants/labels'

// 使用 CostCategory 而非 QuoteCategory，因為編輯器使用 CostCategory
type QuoteWithCategories = Omit<StoreQuote, 'categories'> & {
  categories?: CostCategory[]
  // 確認相關欄位
  confirmation_status?: QuoteConfirmationStatus
  confirmation_token?: string
  confirmation_token_expires_at?: string
  confirmed_at?: string
  confirmed_by_type?: 'customer' | 'staff'
  confirmed_by_name?: string
}

interface ContactInfo {
  contact_person: string
  contact_phone: string
  contact_address: string
}

interface QuoteHeaderProps {
  isSpecialTour: boolean
  isReadOnly: boolean
  relatedTour: Tour | null | undefined
  quote: QuoteWithCategories | null | undefined
  quoteName: string
  setQuoteName: (name: string) => void
  participantCounts: ParticipantCounts
  setParticipantCounts: React.Dispatch<React.SetStateAction<ParticipantCounts>>
  saveSuccess: boolean
  handleSave: () => void
  handleCreateTour: () => void
  handleGenerateQuotation: () => void
  handleCreateItinerary?: () => void
  handleSyncToItinerary?: () => void
  handleSyncAccommodationFromItinerary?: () => void
  onImportFromItinerary?: () => void
  importingFromItinerary?: boolean
  onStatusChange?: (status: 'proposed' | 'approved', showLinkDialog?: boolean) => void
  router: AppRouterInstance
  accommodationDays?: number
  // 聯絡資訊
  contactInfo?: ContactInfo
  onContactInfoChange?: (info: ContactInfo) => void
  // 確認相關
  staffId?: string
  staffName?: string
  onConfirmationStatusChange?: (status: QuoteConfirmationStatus) => void
}

export const QuoteHeader: React.FC<QuoteHeaderProps> = ({
  isSpecialTour,
  isReadOnly,
  relatedTour,
  quote,
  quoteName,
  setQuoteName,
  participantCounts,
  setParticipantCounts,
  saveSuccess,
  handleSave,
  handleCreateTour,
  handleGenerateQuotation,
  handleCreateItinerary,
  handleSyncToItinerary,
  handleSyncAccommodationFromItinerary,
  onImportFromItinerary,
  importingFromItinerary,
  onStatusChange,
  router,
  accommodationDays,
  contactInfo,
  onContactInfoChange,
  staffId,
  staffName,
  onConfirmationStatusChange,
}) => {
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false)
  const [tempContactInfo, setTempContactInfo] = useState<ContactInfo>({
    contact_person: '',
    contact_phone: '',
    contact_address: '',
  })

  // 檢查是否有聯絡資訊
  const hasContactInfo =
    contactInfo &&
    (contactInfo.contact_person || contactInfo.contact_phone || contactInfo.contact_address)

  // 打開對話框時載入現有資料
  const handleOpenContactDialog = () => {
    setTempContactInfo({
      contact_person: contactInfo?.contact_person || '',
      contact_phone: contactInfo?.contact_phone || '',
      contact_address: contactInfo?.contact_address || '',
    })
    setIsContactDialogOpen(true)
  }

  // 儲存聯絡資訊
  const handleSaveContactInfo = () => {
    onContactInfoChange?.(tempContactInfo)
    setIsContactDialogOpen(false)
  }

  return (
    <>
      {/* 特殊團鎖定警告 */}
      {isSpecialTour && (
        <div className="fixed top-18 right-0 left-16 bg-status-warning-bg border-b border-status-warning/30 z-30 px-6 py-2">
          <div className="flex items-center space-x-2 text-status-warning">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium">{QUOTE_HEADER_LABELS.EDIT_1869}</span>
          </div>
        </div>
      )}

      {/* 標題區域 */}
      <div
        className={cn(
          'fixed top-0 right-0 left-16 h-18 bg-background border-b border-border z-40 flex items-center justify-between px-6',
          isSpecialTour && 'border-b-0'
        )}
      >
        {/* 左區：內容標題區域 - 緊湊排列 */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          <button
            onClick={() => {
              if (relatedTour) {
                router.push(`/tours?highlight=${relatedTour.id}`)
              } else {
                router.back()
              }
            }}
            className="p-2 hover:bg-morandi-container rounded-lg transition-colors"
            title={relatedTour ? QUOTE_HEADER_LABELS.返回旅遊團 : QUOTE_HEADER_LABELS.返回}
          >
            <ArrowLeft size={20} className="text-morandi-secondary" />
          </button>

          {/* 顯示旅遊團編號（如果有關聯） */}
          {relatedTour && (
            <div className="text-sm font-mono text-morandi-secondary">
              <span className="text-morandi-gold" title={QUOTE_HEADER_LABELS.旅遊團編號}>
                {relatedTour.code || '-'}
              </span>
            </div>
          )}

          <input
            type="text"
            value={quoteName}
            onChange={e => setQuoteName(e.target.value)}
            disabled={isReadOnly}
            className={cn(
              'text-lg font-bold text-morandi-primary bg-transparent border-0 focus:outline-none focus:bg-card px-2 py-1 rounded w-[180px]',
              isReadOnly && 'cursor-not-allowed opacity-60'
            )}
            placeholder={QUOTE_DIALOG_LABELS.輸入團體名稱}
          />
        </div>

        {/* 右區：功能區域 */}
        <div className="flex items-center gap-2">
          {/* 報價確認 */}
          {quote && staffId && staffName && (
            <QuoteConfirmationSection
              quoteId={quote.id}
              confirmationStatus={quote.confirmation_status}
              confirmationToken={quote.confirmation_token}
              confirmationTokenExpiresAt={quote.confirmation_token_expires_at}
              confirmedAt={quote.confirmed_at}
              confirmedByType={quote.confirmed_by_type}
              confirmedByName={quote.confirmed_by_name}
              staffId={staffId}
              staffName={staffName}
              onConfirmationStatusChange={onConfirmationStatusChange}
              isReadOnly={isReadOnly}
            />
          )}

          {/* 從行程帶入 */}
          {onImportFromItinerary && !isReadOnly && (
            <Button
              onClick={onImportFromItinerary}
              variant="outline"
              disabled={importingFromItinerary}
              className="h-8 px-2.5 text-sm gap-1"
            >
              <Download size={14} />
              {importingFromItinerary
                ? QUOTE_HEADER_LABELS.IMPORTING
                : QUOTE_HEADER_LABELS.IMPORT_FROM_ITINERARY}
            </Button>
          )}

          {/* 行程表 - SVG + 文字 */}
          {handleCreateItinerary && (
            <Button
              onClick={handleCreateItinerary}
              variant="outline"
              title={QUOTE_HEADER_LABELS.建立行程表}
              className="h-8 px-2.5 text-sm gap-1"
            >
              <Map size={14} />
              {QUOTE_HEADER_LABELS.LABEL_6417}
            </Button>
          )}

          {/* 前往旅遊團 - 只有已核准且有關聯旅遊團時顯示 */}
          {quote && quote.status === 'approved' && relatedTour && (
            <Button
              onClick={() => router.push(`/tours?highlight=${relatedTour.id}`)}
              className="h-8 px-2.5 text-sm gap-1 bg-[var(--morandi-gold)] hover:bg-[var(--morandi-gold-hover)] text-white"
            >
              <Plane size={14} />
              {QUOTE_HEADER_LABELS.LABEL_8875}
            </Button>
          )}
        </div>
      </div>

      {/* 聯絡資訊對話框 */}
      <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
        <DialogContent level={1} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Contact size={20} className="text-morandi-gold" />
              {QUOTE_HEADER_LABELS.LABEL_4459}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-morandi-primary block mb-1">
                {QUOTE_HEADER_LABELS.LABEL_7009}
              </label>
              <input
                type="text"
                value={tempContactInfo.contact_person}
                onChange={e =>
                  setTempContactInfo(prev => ({ ...prev, contact_person: e.target.value }))
                }
                placeholder={QUOTE_HEADER_LABELS.請輸入聯絡人姓名}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-morandi-gold/50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-morandi-primary block mb-1">
                {QUOTE_HEADER_LABELS.LABEL_5110}
              </label>
              <input
                type="text"
                value={tempContactInfo.contact_phone}
                onChange={e =>
                  setTempContactInfo(prev => ({ ...prev, contact_phone: e.target.value }))
                }
                placeholder={QUOTE_HEADER_LABELS.請輸入聯絡電話}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-morandi-gold/50"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-morandi-primary block mb-1">
                {QUOTE_HEADER_LABELS.LABEL_3760}
              </label>
              <input
                type="text"
                value={tempContactInfo.contact_address}
                onChange={e =>
                  setTempContactInfo(prev => ({ ...prev, contact_address: e.target.value }))
                }
                placeholder={QUOTE_HEADER_LABELS.請輸入通訊地址}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-morandi-gold/50"
              />
            </div>

            <div className="text-xs text-morandi-secondary bg-morandi-container/30 p-3 rounded-lg">
              {QUOTE_HEADER_LABELS.PRINT_8717}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsContactDialogOpen(false)}
            >
              <X size={16} />
              {QUOTE_HEADER_LABELS.CANCEL}
            </Button>
            <Button
              onClick={handleSaveContactInfo}
              className="bg-morandi-gold/15 text-morandi-primary border border-morandi-gold/30 hover:bg-morandi-gold/25 hover:border-morandi-gold/50 transition-colors gap-2"
            >
              <Save size={16} />
              {QUOTE_HEADER_LABELS.SAVE}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
