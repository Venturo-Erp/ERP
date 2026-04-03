'use client'
/**
 * PrintableQuickQuote - 快速報價單列印版（使用 iframe 列印）
 */

import { getTodayString } from '@/lib/utils/format-date'
import { logger } from '@/lib/utils/logger'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { X, Printer } from 'lucide-react'
import { Quote, QuickQuoteItem } from '@/types/quote.types'
import { supabase } from '@/lib/supabase/client'
import { useCompanyInfo } from '@/hooks/useCompanyInfo'
import { PrintFooter } from '@/lib/print'
import {
  PRINTABLE_QUICK_QUOTE_LABELS,
  PAYMENT_INFO_LABELS,
  DIALOGS_CONTAINER_LABELS,
  ACCOMMODATION_ITEM_ROW_LABELS,
  QUOTES_PAGE_LABELS,
  QUOTES_LIST_LABELS,
  QUICK_QUOTE_SECTION_LABELS,
} from '@/constants/labels'
import { QUOTE_COMPONENT_LABELS } from '../constants/labels'
import { useAuthStore } from '@/stores/auth-store'
import { useWorkspaceSettings } from '@/hooks/useWorkspaceSettings'

interface PrintableQuickQuoteProps {
  quote: Quote
  items: QuickQuoteItem[]
  isOpen: boolean
  onClose: () => void
  onPrint: () => void
}

export const PrintableQuickQuote: React.FC<PrintableQuickQuoteProps> = ({
  quote,
  items,
  isOpen,
  onClose,
  onPrint,
}) => {
  const [isMounted, setIsMounted] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string>('')
  const printContentRef = useRef<HTMLDivElement>(null)
  const ws = useWorkspaceSettings()
  const { legalName: companyFullName } = useCompanyInfo()
  const hasBankInfo = !!(ws.bank_name || ws.bank_branch || ws.bank_account)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 從 workspace 設定讀取 Logo（統一來源）
  useEffect(() => {
    if (isOpen && ws.logo_url) {
      // 加上時間戳避免瀏覽器快取舊圖片
      setLogoUrl(`${ws.logo_url}?t=${Date.now()}`)
    }
  }, [isOpen, ws.logo_url])

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0)
  const balanceAmount = totalAmount - (quote.received_amount || 0)

  // 使用 iframe 列印（最可靠的方式）
  const handlePrint = useCallback(() => {
    if (!printContentRef.current) return

    // 暫時修改主頁面標題（macOS 列印對話框會使用這個）
    const originalTitle = document.title
    const printTitle = `${quote.customer_name || ''}${quote.tour_code ? '-' + quote.tour_code : ''}-報價單`
    document.title = printTitle

    // 建立隱藏的 iframe
    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    iframe.style.left = '-9999px'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    if (!iframeDoc) {
      document.body.removeChild(iframe)
      return
    }

    // 寫入列印內容
    iframeDoc.open()
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${quote.customer_name || ''}${quote.tour_code ? '-' + quote.tour_code : ''}-報價單</title>
        <style>
          @page {
            size: A4;
            margin: 10mm;
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: #333;
            background: white;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .header {
            position: relative;
            padding-bottom: 16px;
            margin-bottom: 24px;
            border-bottom: 1px solid #B8A99A;
          }

          .logo {
            position: absolute;
            left: 0;
            top: 0;
            width: 120px;
            height: 40px;
          }

          .logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            object-position: left top;
          }

          .title-area {
            text-align: center;
            padding: 8px 0;
          }

          .subtitle {
            font-size: 12px;
            letter-spacing: 3px;
            color: #B8A99A;
            font-weight: 500;
            margin-bottom: 4px;
          }

          .title {
            font-size: 20px;
            font-weight: bold;
            color: var(--morandi-primary);
          }

          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 24px;
            font-size: 13px;
          }

          .info-row {
            display: flex;
          }

          .info-row.full {
            grid-column: span 2;
          }

          .info-label {
            font-weight: 600;
            width: 80px;
            flex-shrink: 0;
          }

          .info-value {
            flex: 1;
            border-bottom: 1px solid #ccc;
            padding-bottom: 2px;
          }

          .section-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--morandi-primary);
            margin-bottom: 8px;
          }

          .items-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 20px;
            font-size: 13px;
          }

          .items-table th {
            background-color: #FAF7F2;
            padding: 10px 12px;
            text-align: left;
            font-weight: 600;
            color: var(--morandi-primary);
            border-bottom: 1px solid #E5E7EB;
          }

          .items-table th:not(:first-child) {
            border-left: 1px solid #E5E7EB;
          }

          .items-table td {
            padding: 8px 12px;
            color: #4B5563;
            border-bottom: 1px solid #E5E7EB;
          }

          .items-table td:not(:first-child) {
            border-left: 1px solid #E5E7EB;
          }

          .items-table tr:last-child td {
            border-bottom: none;
          }

          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: 600; color: var(--morandi-primary); }

          .summary-box {
            background-color: #FAF7F2;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 12px 16px;
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 32px;
            margin-bottom: 20px;
          }

          .summary-item {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .summary-label {
            font-size: 11px;
            font-weight: 600;
            color: var(--morandi-primary);
          }

          .summary-value {
            font-size: 18px;
            font-weight: bold;
            color: var(--morandi-primary);
          }

          .summary-value.red { color: #DC2626; }
          .summary-value.green { color: #059669; }

          .divider {
            width: 1px;
            height: 24px;
            background-color: #D1D5DB;
          }

          .payment-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            padding-top: 16px;
            border-top: 1px solid #F3F4F6;
            margin-bottom: 16px;
            font-size: 13px;
          }

          .payment-title {
            font-weight: 600;
            color: var(--morandi-primary);
            margin-bottom: 8px;
          }

          .payment-info {
            color: #4B5563;
            line-height: 1.8;
          }

          .payment-info .warning {
            color: #DC2626;
            font-weight: 600;
          }

          .payment-info .note {
            font-size: 11px;
            color: #9CA3AF;
            margin-top: 8px;
          }

          .receipt-section {
            padding-top: 16px;
            border-top: 1px solid #F3F4F6;
            margin-bottom: 24px;
            font-size: 13px;
          }

          .receipt-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-top: 8px;
          }

          .receipt-row {
            display: flex;
          }

          .receipt-label {
            font-weight: 600;
            color: #4B5563;
            width: 130px;
            flex-shrink: 0;
          }

          .receipt-value {
            flex: 1;
            border-bottom: 1px solid #E5E7EB;
          }

          .footer {
            margin-top: 40px;
            padding-top: 16px;
            border-top: 1px solid #F3F4F6;
            text-align: center;
          }

          .footer-slogan {
            font-size: 13px;
            font-style: italic;
            color: #9CA3AF;
            margin-bottom: 8px;
          }

          .footer-copyright {
            font-size: 11px;
            color: #D1D5DB;
          }
        </style>
      </head>
      <body>
        ${printContentRef.current.innerHTML}
      </body>
      </html>
    `)
    iframeDoc.close()

    // 等待圖片載入後列印
    const images = iframeDoc.querySelectorAll('img')
    const imagePromises = Array.from(images).map(img => {
      if (img.complete) return Promise.resolve()
      return new Promise(resolve => {
        img.onload = resolve
        img.onerror = resolve
      })
    })

    Promise.all(imagePromises).then(() => {
      setTimeout(() => {
        iframe.contentWindow?.print()
        // 列印對話框關閉後移除 iframe 並恢復標題
        setTimeout(() => {
          document.body.removeChild(iframe)
          document.title = originalTitle
        }, 1000)
      }, 100)
    })
  }, [quote.customer_name, quote.tour_code])

  if (!isOpen || !isMounted) return null

  return createPortal(
    /* eslint-disable venturo/no-custom-modal -- 列印預覽需要使用 createPortal */
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-8"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg max-w-[1000px] w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* 控制按鈕 */}
        <div className="flex justify-end gap-2 p-4 border-b">
          <Button onClick={onClose} variant="outline" className="gap-2">
            <X className="h-4 w-4" />
            {DIALOGS_CONTAINER_LABELS.關閉}
          </Button>
          <Button
            onClick={handlePrint}
            className="gap-2 bg-morandi-gold hover:bg-morandi-gold-hover text-white"
          >
            <Printer className="h-4 w-4" />
            {PRINTABLE_QUICK_QUOTE_LABELS.列印}
          </Button>
        </div>

        {/* 預覽與列印內容（使用純 inline style，不依賴 Tailwind） */}
        <div style={{ backgroundColor: 'white', padding: '32px' }} ref={printContentRef}>
          {/* Logo 和標題 */}
          <div
            className="header"
            style={{
              position: 'relative',
              paddingBottom: '16px',
              marginBottom: '24px',
              borderBottom: '1px solid #B8A99A',
            }}
          >
            {logoUrl ? (
              <div
                className="logo"
                style={{ position: 'absolute', left: 0, top: 0, width: '120px', height: '40px' }}
              >
                <img
                  src={logoUrl}
                  alt={PRINTABLE_QUICK_QUOTE_LABELS.公司_Logo_Alt}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    objectPosition: 'left top',
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  fontSize: '12px',
                  color: 'var(--morandi-muted)',
                }}
              >
                {ws?.name || ''}
              </div>
            )}
            <div className="title-area" style={{ textAlign: 'center', padding: '8px 0' }}>
              <div
                className="subtitle"
                style={{
                  fontSize: '12px',
                  letterSpacing: '3px',
                  color: '#B8A99A',
                  fontWeight: 500,
                  marginBottom: '4px',
                }}
              >
                QUOTATION
              </div>
              <h1
                className="title"
                style={{
                  fontSize: '20px',
                  fontWeight: 'bold',
                  color: 'var(--morandi-primary)',
                  margin: 0,
                }}
              >
                {PRINTABLE_QUICK_QUOTE_LABELS.報價請款單}
              </h1>
            </div>
          </div>

          {/* 客戶資訊 */}
          <div
            className="info-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '24px',
              fontSize: '13px',
            }}
          >
            <div className="info-row" style={{ display: 'flex' }}>
              <span
                className="info-label"
                style={{ fontWeight: 600, width: '80px', flexShrink: 0 }}
              >
                {PRINTABLE_QUICK_QUOTE_LABELS.團體名稱標籤}
              </span>
              <span
                className="info-value"
                style={{ flex: 1, borderBottom: '1px solid var(--border)', paddingBottom: '2px' }}
              >
                {quote.customer_name}
              </span>
            </div>
            <div className="info-row" style={{ display: 'flex' }}>
              <span
                className="info-label"
                style={{ fontWeight: 600, width: '80px', flexShrink: 0 }}
              >
                {PRINTABLE_QUICK_QUOTE_LABELS.團體編號標籤}
              </span>
              <span
                className="info-value"
                style={{ flex: 1, borderBottom: '1px solid var(--border)', paddingBottom: '2px' }}
              >
                {quote.tour_code || ''}
              </span>
            </div>
            <div className="info-row" style={{ display: 'flex' }}>
              <span
                className="info-label"
                style={{ fontWeight: 600, width: '80px', flexShrink: 0 }}
              >
                {PRINTABLE_QUICK_QUOTE_LABELS.聯絡電話標籤}
              </span>
              <span
                className="info-value"
                style={{ flex: 1, borderBottom: '1px solid var(--border)', paddingBottom: '2px' }}
              >
                {quote.contact_phone || ''}
              </span>
            </div>
            <div className="info-row" style={{ display: 'flex' }}>
              <span
                className="info-label"
                style={{ fontWeight: 600, width: '80px', flexShrink: 0 }}
              >
                {PRINTABLE_QUICK_QUOTE_LABELS.承辦業務標籤}
              </span>
              <span
                className="info-value"
                style={{ flex: 1, borderBottom: '1px solid var(--border)', paddingBottom: '2px' }}
              >
                {quote.handler_name || 'William'}
              </span>
            </div>
            <div className="info-row full" style={{ display: 'flex', gridColumn: 'span 2' }}>
              <span
                className="info-label"
                style={{ fontWeight: 600, width: '80px', flexShrink: 0 }}
              >
                {PRINTABLE_QUICK_QUOTE_LABELS.通訊地址標籤}
              </span>
              <span
                className="info-value"
                style={{ flex: 1, borderBottom: '1px solid var(--border)', paddingBottom: '2px' }}
              >
                {quote.contact_address || ''}
              </span>
            </div>
            <div className="info-row" style={{ display: 'flex' }}>
              <span
                className="info-label"
                style={{ fontWeight: 600, width: '80px', flexShrink: 0 }}
              >
                {PRINTABLE_QUICK_QUOTE_LABELS.開單日期標籤}
              </span>
              <span
                className="info-value"
                style={{ flex: 1, borderBottom: '1px solid var(--border)', paddingBottom: '2px' }}
              >
                {quote.issue_date || getTodayString()}
              </span>
            </div>
          </div>

          {/* 收費明細表 */}
          <div
            className="section-title"
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--morandi-primary)',
              marginBottom: '8px',
            }}
          >
            {PRINTABLE_QUICK_QUOTE_LABELS.收費明細表}
          </div>
          <table
            className="items-table"
            style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: 0,
              border: '1px solid var(--border)',
              borderRadius: '8px',
              overflow: 'hidden',
              marginBottom: '20px',
              fontSize: '13px',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: 'var(--background)' }}>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: 'var(--morandi-primary)',
                    borderBottom: '1px solid var(--border)',
                    width: '35%',
                  }}
                >
                  {PRINTABLE_QUICK_QUOTE_LABELS.摘要}
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'center',
                    fontWeight: 600,
                    color: 'var(--morandi-primary)',
                    borderBottom: '1px solid var(--border)',
                    borderLeft: '1px solid var(--border)',
                    width: '10%',
                  }}
                >
                  {PRINTABLE_QUICK_QUOTE_LABELS.數量}
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'center',
                    fontWeight: 600,
                    color: 'var(--morandi-primary)',
                    borderBottom: '1px solid var(--border)',
                    borderLeft: '1px solid var(--border)',
                    width: '15%',
                  }}
                >
                  {ACCOMMODATION_ITEM_ROW_LABELS.單價}
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'center',
                    fontWeight: 600,
                    color: 'var(--morandi-primary)',
                    borderBottom: '1px solid var(--border)',
                    borderLeft: '1px solid var(--border)',
                    width: '15%',
                  }}
                >
                  {QUOTES_PAGE_LABELS.金額}
                </th>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: 'var(--morandi-primary)',
                    borderBottom: '1px solid var(--border)',
                    borderLeft: '1px solid var(--border)',
                    width: '25%',
                  }}
                >
                  {ACCOMMODATION_ITEM_ROW_LABELS.備註}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td
                    style={{
                      padding: '8px 12px',
                      color: 'var(--morandi-primary)',
                      borderBottom: index === items.length - 1 ? 'none' : '1px solid var(--border)',
                    }}
                  >
                    {item.description || '\u00A0'}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'center',
                      color: 'var(--morandi-primary)',
                      borderBottom: index === items.length - 1 ? 'none' : '1px solid var(--border)',
                      borderLeft: '1px solid var(--border)',
                    }}
                  >
                    {item.quantity && item.quantity !== 0 ? item.quantity : '\u00A0'}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      color: 'var(--morandi-primary)',
                      borderBottom: index === items.length - 1 ? 'none' : '1px solid var(--border)',
                      borderLeft: '1px solid var(--border)',
                    }}
                  >
                    {item.unit_price && item.unit_price !== 0
                      ? (item.unit_price || 0).toLocaleString()
                      : '\u00A0'}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'right',
                      color: 'var(--morandi-primary)',
                      fontWeight: 600,
                      borderBottom: index === items.length - 1 ? 'none' : '1px solid var(--border)',
                      borderLeft: '1px solid var(--border)',
                    }}
                  >
                    {item.amount && item.amount !== 0
                      ? (item.amount || 0).toLocaleString()
                      : '\u00A0'}
                  </td>
                  <td
                    style={{
                      padding: '8px 12px',
                      color: 'var(--morandi-primary)',
                      borderBottom: index === items.length - 1 ? 'none' : '1px solid var(--border)',
                      borderLeft: '1px solid var(--border)',
                    }}
                  >
                    {item.notes || '\u00A0'}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    style={{ padding: '32px 12px', textAlign: 'center', color: 'var(--morandi-muted)' }}
                  >
                    {PRINTABLE_QUICK_QUOTE_LABELS.尚無收費項目}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* 費用說明 - 只有有資料才顯示 */}
          {quote.expense_description && (
            <div
              style={{
                marginBottom: '20px',
                padding: '12px 16px',
                backgroundColor: 'var(--background)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  color: 'var(--morandi-primary)',
                  marginBottom: '8px',
                  fontSize: '14px',
                }}
              >
                {PRINTABLE_QUICK_QUOTE_LABELS.費用說明}
              </div>
              <div
                style={{
                  color: 'var(--morandi-primary)',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {quote.expense_description}
              </div>
            </div>
          )}

          {/* 金額統計 */}
          <div
            className="summary-box"
            style={{
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: quote.received_amount && quote.received_amount > 0 ? '32px' : '8px',
              marginBottom: '20px',
            }}
          >
            {quote.received_amount && quote.received_amount > 0 ? (
              <>
                <div
                  className="summary-item"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span
                    className="summary-label"
                    style={{ fontSize: '11px', fontWeight: 600, color: 'var(--morandi-primary)' }}
                  >
                    {PRINTABLE_QUICK_QUOTE_LABELS.應收金額}
                  </span>
                  <span
                    className="summary-value"
                    style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: 'var(--morandi-primary)',
                    }}
                  >
                    NT$ {totalAmount.toLocaleString()}
                  </span>
                </div>
                <div
                  className="divider"
                  style={{ width: '1px', height: '24px', backgroundColor: 'var(--morandi-container)' }}
                />
                <div
                  className="summary-item"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span
                    className="summary-label"
                    style={{ fontSize: '11px', fontWeight: 600, color: 'var(--morandi-primary)' }}
                  >
                    {PRINTABLE_QUICK_QUOTE_LABELS.已收金額}
                  </span>
                  <span
                    className="summary-value"
                    style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: 'var(--morandi-primary)',
                    }}
                  >
                    NT$ {(quote.received_amount || 0).toLocaleString()}
                  </span>
                </div>
                <div
                  className="divider"
                  style={{ width: '1px', height: '24px', backgroundColor: 'var(--morandi-container)' }}
                />
                <div
                  className="summary-item"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <span
                    className="summary-label"
                    style={{ fontSize: '11px', fontWeight: 600, color: 'var(--morandi-primary)' }}
                  >
                    {PRINTABLE_QUICK_QUOTE_LABELS.應收餘額}
                  </span>
                  <span
                    className="summary-value"
                    style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: balanceAmount > 0 ? '#DC2626' : '#059669',
                    }}
                  >
                    NT$ {balanceAmount.toLocaleString()}
                  </span>
                </div>
              </>
            ) : (
              <>
                <span
                  className="summary-label"
                  style={{ fontSize: '11px', fontWeight: 600, color: 'var(--morandi-primary)' }}
                >
                  {PRINTABLE_QUICK_QUOTE_LABELS.應收金額}
                </span>
                <span
                  className="summary-value"
                  style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--morandi-primary)' }}
                >
                  NT$ {totalAmount.toLocaleString()}
                </span>
              </>
            )}
          </div>

          {/* 付款資訊 */}
          <div
            className="payment-section"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #F3F4F6',
              marginBottom: '16px',
              fontSize: '13px',
            }}
          >
            <div>
              <div
                className="payment-title"
                style={{ fontWeight: 600, color: 'var(--morandi-primary)', marginBottom: '8px' }}
              >
                {PRINTABLE_QUICK_QUOTE_LABELS.匯款資訊}
              </div>
              <div className="payment-info" style={{ color: 'var(--morandi-primary)', lineHeight: 1.8 }}>
                {hasBankInfo ? (
                  <>
                    <div>
                      {PRINTABLE_QUICK_QUOTE_LABELS.戶名前綴}
                      {ws.bank_account_name || companyFullName}
                    </div>
                    {ws.bank_name && (
                      <div>
                        {PAYMENT_INFO_LABELS.銀行}
                        {ws.bank_name}
                      </div>
                    )}
                    {ws.bank_branch && (
                      <div>
                        {PAYMENT_INFO_LABELS.分行}
                        {ws.bank_branch}
                      </div>
                    )}
                    {ws.bank_account && (
                      <div>
                        {PAYMENT_INFO_LABELS.帳號}
                        {ws.bank_account}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ color: 'var(--morandi-muted)', fontStyle: 'italic' }}>
                    {PAYMENT_INFO_LABELS.未設定銀行資訊}
                  </div>
                )}
              </div>
            </div>
            <div>
              <div
                className="payment-title"
                style={{ fontWeight: 600, color: 'var(--morandi-primary)', marginBottom: '8px' }}
              >
                {PRINTABLE_QUICK_QUOTE_LABELS.支票資訊}
              </div>
              <div className="payment-info" style={{ color: 'var(--morandi-primary)', lineHeight: 1.8 }}>
                <div>
                  {PRINTABLE_QUICK_QUOTE_LABELS.抬頭前綴}
                  {companyFullName}
                </div>
                <div className="warning" style={{ color: 'var(--status-danger)', fontWeight: 600 }}>
                  {PRINTABLE_QUICK_QUOTE_LABELS.禁止背書轉讓}
                </div>
                <div
                  className="note"
                  style={{ fontSize: '11px', color: 'var(--morandi-muted)', marginTop: '8px' }}
                >
                  {PRINTABLE_QUICK_QUOTE_LABELS.請於出發日前付清餘額}
                </div>
              </div>
            </div>
          </div>

          {/* 收據資訊 */}
          <div
            className="receipt-section"
            style={{
              paddingTop: '16px',
              borderTop: '1px solid #F3F4F6',
              marginBottom: '24px',
              fontSize: '13px',
            }}
          >
            <div
              className="payment-title"
              style={{ fontWeight: 600, color: 'var(--morandi-primary)', marginBottom: '8px' }}
            >
              {PRINTABLE_QUICK_QUOTE_LABELS.收據資訊}
            </div>
            <div
              className="receipt-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginTop: '8px',
              }}
            >
              <div className="receipt-row" style={{ display: 'flex' }}>
                <span
                  className="receipt-label"
                  style={{ fontWeight: 600, color: 'var(--morandi-primary)', width: '130px', flexShrink: 0 }}
                >
                  {PRINTABLE_QUICK_QUOTE_LABELS.開立代收轉付抬頭}
                </span>
                <span
                  className="receipt-value"
                  style={{ flex: 1, borderBottom: '1px solid var(--border)' }}
                >
                  {'\u00A0'}
                </span>
              </div>
              <div className="receipt-row" style={{ display: 'flex' }}>
                <span
                  className="receipt-label"
                  style={{ fontWeight: 600, color: 'var(--morandi-primary)', width: '130px', flexShrink: 0 }}
                >
                  {PRINTABLE_QUICK_QUOTE_LABELS.開立代收轉付統編}
                </span>
                <span
                  className="receipt-value"
                  style={{ flex: 1, borderBottom: '1px solid var(--border)' }}
                >
                  {'\u00A0'}
                </span>
              </div>
            </div>
          </div>

          {/* 頁腳 */}
          <PrintFooter />
        </div>
      </div>
    </div>,
    document.body
  )
}
