'use client'

import { ENVELOPE_LABELS } from './constants/labels'

import React, { useState, useEffect } from 'react'
import { Mail, Printer, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { Tour } from '@/types/tour.types'

/** 信封寄件紀錄 */
interface EnvelopeRecord {
  id: string
  printed_at: string
  recipient_name: string
  recipient_address: string
  recipient_phone: string
  sender_name: string
  sender_phone: string
}
import { useAuthStore } from '@/stores/auth-store'
import { useTours, updateTour, useQuotes } from '@/data'
import { generateUUID } from '@/lib/utils/uuid'
import { alert } from '@/lib/ui/alert-dialog'
import { COMP_CONTRACTS_LABELS } from './constants/labels'
import { useWorkspaceSettings } from '@/hooks/useWorkspaceSettings'

interface EnvelopeDialogProps {
  isOpen: boolean
  onClose: () => void
  tour: Tour
}

export function EnvelopeDialog({ isOpen, onClose, tour }: EnvelopeDialogProps) {
  const { user } = useAuthStore()
  const { items: quotes } = useQuotes()
  const ws = useWorkspaceSettings()
  const [recipient, setRecipient] = useState('')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')

  // 寄件人資訊
  const [senderName, setSenderName] = useState('')
  const [senderPhone, setSenderPhone] = useState('')
  const senderAddress = ws.address
  const senderCompany = user?.workspace_name || ''

  useEffect(() => {
    if (isOpen && user) {
      // 從 HR 帶入員工資料
      setSenderName(user.display_name || user.chinese_name || user.english_name || '')
      // 從 user 物件取得電話，如果沒有就使用 workspace 公司總機（可手動修改）
      const userPhone = Array.isArray(user.personal_info?.phone)
        ? user.personal_info.phone[0]
        : user.personal_info?.phone || ''
      setSenderPhone(userPhone || ws.phone)

      // 從關聯的報價單帶入收件人資訊
      const linkedQuote = quotes.find(q => q.tour_id === tour.id)
      if (linkedQuote) {
        // 優先使用聯絡人，否則使用客戶名稱
        setRecipient(linkedQuote.customer_name || '')
        // 帶入通訊地址（快速報價單有此欄位）
        setRecipientAddress(linkedQuote.contact_address || '')
        // 帶入聯絡電話
        setRecipientPhone(linkedQuote.contact_phone || '')
      }
    } else if (!isOpen) {
      // 對話框關閉時重置欄位
      setRecipient('')
      setRecipientAddress('')
      setRecipientPhone('')
      setSenderName('')
      setSenderPhone('')
    }
  }, [isOpen, user, tour.id, quotes, ws.phone])

  const handlePrint = async () => {
    if (!recipient || !recipientAddress || !recipientPhone) {
      void alert(COMP_CONTRACTS_LABELS.請填寫完整的收件人資訊, 'warning')
      return
    }

    if (!senderName || !senderPhone) {
      void alert(COMP_CONTRACTS_LABELS.請填寫完整的寄件人資訊_姓名和電話, 'warning')
      return
    }

    // 儲存寄件紀錄
    try {
      const newRecord: EnvelopeRecord = {
        id: generateUUID(),
        printed_at: new Date().toISOString(),
        recipient_name: recipient,
        recipient_address: recipientAddress,
        recipient_phone: recipientPhone,
        sender_name: senderName,
        sender_phone: senderPhone,
      }

      // 取得現有紀錄
      let existingRecords: EnvelopeRecord[] = []
      if (tour.envelope_records) {
        try {
          existingRecords = JSON.parse(tour.envelope_records)
        } catch {
          existingRecords = []
        }
      }

      // 新增紀錄
      const updatedRecords = [...existingRecords, newRecord]

      // 更新 tour
      await updateTour(tour.id, {
        envelope_records: JSON.stringify(updatedRecords),
      })
    } catch (error) {
      // 繼續列印，不因儲存失敗而中斷
    }

    // 產生列印內容
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      void alert(COMP_CONTRACTS_LABELS.請允許彈出視窗以進行列印, 'warning')
      return
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>信封標籤 - ${tour.code}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 0;
            }

            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              width: 297mm;
              height: 210mm;
              padding: 15mm;
              font-family: "Microsoft JhengHei", COMP_CONTRACTS_LABELS.微軟正黑體, sans-serif;
              background: white;
            }

            .envelope-container {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              border: 2px solid #333;
              padding: 20mm;
              position: relative;
            }

            .section {
              display: flex;
              flex-direction: column;
              gap: 8px;
            }

            .sender-section {
              position: absolute;
              top: 20mm;
              left: 20mm;
              align-items: flex-start;
              text-align: left;
            }

            .recipient-section {
              position: absolute;
              top: 60%;
              right: 40mm;
              transform: translateY(-50%);
              align-items: flex-start;
              text-align: left;
            }

            .label {
              font-size: 14pt;
              color: #666;
              font-weight: 500;
            }

            .company {
              font-size: 18pt;
              font-weight: bold;
              color: #c9b896;
              margin-bottom: 4px;
            }

            .name {
              font-size: 28pt;
              font-weight: bold;
              color: #333;
              margin-bottom: 8px;
            }

            .address {
              font-size: 18pt;
              color: #333;
              line-height: 1.8;
              margin-bottom: 6px;
            }

            .phone {
              font-size: 16pt;
              color: #666;
            }

            .recipient-section .name {
              font-size: 36pt;
            }

            .sender-section .name {
              font-size: 18pt;
            }

            .sender-section .company {
              font-size: 16pt;
            }

            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="envelope-container">
            <!-- 寄件人 (左上角) -->
            <div class="section sender-section">
              <div class="label">{ENVELOPE_LABELS.SENDER}</div>
              <div class="company">${senderCompany}</div>
              <div class="name">${senderName}</div>
              <div class="address">${senderAddress}</div>
              <div class="phone">電話：${senderPhone}</div>
            </div>

            <!-- 收件人 (中間) -->
            <div class="section recipient-section">
              <div class="label">{ENVELOPE_LABELS.RECIPIENT}</div>
              <div class="name">${recipient}</div>
              <div class="address">${recipientAddress}</div>
              <div class="phone">電話：${recipientPhone}</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              // 列印後關閉視窗
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent level={2} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail size={20} />
            {ENVELOPE_LABELS.PRINT_9521}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 旅遊團資訊 */}
          <div className="bg-morandi-container/20 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-morandi-primary mb-2">
              {ENVELOPE_LABELS.TOUR_INFO}
            </h3>
            <div className="text-sm text-morandi-primary">
              {tour.code} - {tour.name}
            </div>
          </div>

          {/* 收件人資訊 */}
          <div>
            <h3 className="text-sm font-semibold text-morandi-primary mb-3">
              {ENVELOPE_LABELS.RECIPIENT_INFO}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-morandi-primary block mb-1">
                  {ENVELOPE_LABELS.RECIPIENT_NAME}
                </label>
                <Input
                  type="text"
                  value={recipient}
                  onChange={e => setRecipient(e.target.value)}
                  placeholder={COMP_CONTRACTS_LABELS.請輸入收件人姓名}
                />
              </div>
              <div>
                <label className="text-xs text-morandi-primary block mb-1">
                  {ENVELOPE_LABELS.LABEL_2394}
                </label>
                <Input
                  type="text"
                  value={recipientAddress}
                  onChange={e => setRecipientAddress(e.target.value)}
                  placeholder={COMP_CONTRACTS_LABELS.請輸入收件地址}
                />
              </div>
              <div>
                <label className="text-xs text-morandi-primary block mb-1">
                  {ENVELOPE_LABELS.LABEL_8172}
                </label>
                <Input
                  type="text"
                  value={recipientPhone}
                  onChange={e => setRecipientPhone(e.target.value)}
                  placeholder={COMP_CONTRACTS_LABELS.請輸入收件人電話}
                />
              </div>
            </div>
          </div>

          {/* 寄件人資訊 */}
          <div>
            <h3 className="text-sm font-semibold text-morandi-primary mb-3">
              {ENVELOPE_LABELS.LABEL_9195}
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-morandi-primary block mb-1">
                    {ENVELOPE_LABELS.LABEL_20}
                  </label>
                  <Input
                    type="text"
                    value={senderCompany}
                    readOnly
                    className="bg-muted text-morandi-secondary cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-xs text-morandi-primary block mb-1">
                    員工姓名 <span className="text-morandi-gold">*</span>
                  </label>
                  <Input
                    type="text"
                    value={senderName}
                    onChange={e => setSenderName(e.target.value)}
                    placeholder={COMP_CONTRACTS_LABELS.請輸入員工姓名_可修改}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-morandi-primary block mb-1">
                  {ENVELOPE_LABELS.LABEL_5007}
                </label>
                <Input
                  type="text"
                  value={senderAddress}
                  readOnly
                  className="bg-muted text-morandi-secondary cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-xs text-morandi-primary block mb-1">
                  聯絡電話 <span className="text-morandi-gold">*</span>
                </label>
                <Input
                  type="text"
                  value={senderPhone}
                  onChange={e => setSenderPhone(e.target.value)}
                  placeholder={COMP_CONTRACTS_LABELS.請輸入聯絡電話_可修改}
                />
              </div>
            </div>
          </div>

          <div className="text-xs text-morandi-secondary bg-morandi-container/20 p-3 rounded">
            {ENVELOPE_LABELS.PRINT_753}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X size={16} />
            {ENVELOPE_LABELS.CANCEL}
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer size={16} />
            {ENVELOPE_LABELS.PRINT}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
