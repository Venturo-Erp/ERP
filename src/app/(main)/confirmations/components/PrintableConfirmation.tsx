'use client'
/**
 * PrintableConfirmation - 確認單列印版（機票/住宿）
 * 參考 PrintableQuotation 的設計風格，支援 A4 列印
 */

import { logger } from '@/lib/utils/logger'
import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { X, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useCompanyInfo } from '@/hooks/useCompanyInfo'
import { LABELS } from '../constants/labels'
import { getWorkspaceCompanyName } from '@/lib/workspace-helpers'
import type { Confirmation, FlightData, AccommodationData } from '@/types/confirmation.types'

interface PrintableConfirmationProps {
  confirmation: Confirmation
  isOpen: boolean
  onClose: () => void
  onPrint: () => void
}

export const PrintableConfirmation: React.FC<PrintableConfirmationProps> = ({
  confirmation,
  isOpen,
  onClose,
  onPrint,
}) => {
  const workspaceName = getWorkspaceCompanyName()
  const { subtitle: companySubtitle } = useCompanyInfo()
  const [isMounted, setIsMounted] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string>('')

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 載入 Logo
  useEffect(() => {
    const loadLogo = async () => {
      try {
        // 查詢 file_path 包含 logos/ 的資產（公司 LOGO 存放在 logos/ 資料夾）
        const { data, error } = await supabase
          .from('company_assets')
          .select('file_path')
          .like('file_path', 'logos/%')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (error) {
          logger.error('載入 Logo 失敗:', error)
          return
        }

        if (data?.file_path) {
          const { data: urlData } = supabase.storage
            .from('company-assets')
            .getPublicUrl(data.file_path)

          setLogoUrl(`${urlData.publicUrl}?t=${Date.now()}`)
        }
      } catch (error) {
        logger.error('載入 Logo 錯誤:', error)
      }
    }

    if (isOpen) {
      loadLogo()
    }
  }, [isOpen])

  if (!isOpen || !isMounted) return null

  const isFlightConfirmation = confirmation.type === 'flight'
  const title = isFlightConfirmation
    ? LABELS.FLIGHT_CONFIRMATION_TITLE
    : LABELS.ACCOMMODATION_CONFIRMATION_TITLE

  return createPortal(
    /* eslint-disable venturo/no-custom-modal -- 列印預覽需要使用 createPortal */
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-8 print:p-0 print:bg-transparent print:block"
      onClick={onClose}
      id="printable-confirmation-overlay"
    >
      <style>
        {`
          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
            }

            @page {
              size: A4;
              margin: 8mm;
            }

            #printable-confirmation-overlay {
              position: static !important;
              inset: auto !important;
              width: 100% !important;
              height: auto !important;
              background: transparent !important;
              padding: 0 !important;
              display: block !important;
              z-index: 1 !important;
            }

            /* 僅顯示確認單內容 */
            body > *:not(#printable-confirmation-overlay) {
              display: none !important;
            }

            #printable-confirmation-overlay .print\\:hidden {
              display: none !important;
            }

            /* 防止表格行被切斷 */
            table tr {
              page-break-inside: avoid;
            }

            /* 使用 table 的 thead/tfoot 來實作固定頁首頁尾 */
            /* 顯示列印版本的 table（覆蓋 hidden class） */
            table.print-wrapper {
              display: table !important;
              width: 100%;
              border-collapse: collapse;
            }

            table.print-wrapper thead {
              display: table-header-group;
            }

            table.print-wrapper tfoot {
              display: table-footer-group;
            }

            table.print-wrapper tbody {
              display: table-row-group;
            }

            table.print-wrapper tbody > tr {
              height: 100%;
            }

            table.print-wrapper tbody > tr > td {
              vertical-align: top;
            }

            /* 防止表格內容被切斷 */
            .avoid-break {
              page-break-inside: avoid;
            }

            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        `}
      </style>
      <div
        className="bg-card rounded-lg max-w-[1000px] w-full max-h-[90vh] overflow-y-auto print:max-w-full print:rounded-none print:max-h-none print:overflow-visible"
        onClick={e => e.stopPropagation()}
      >
        {/* 控制按鈕（列印時隱藏） */}
        <div className="flex justify-end gap-2 p-4 print:hidden">
          <Button onClick={onClose} variant="outline" className="gap-2">
            <X className="h-4 w-4" />
            {LABELS.CLOSE}
          </Button>
          <Button
            onClick={onPrint}
            className="gap-2 bg-morandi-gold hover:bg-morandi-gold-hover text-white"
          >
            <Printer className="h-4 w-4" />
            {LABELS.PRINT}
          </Button>
        </div>

        {/* 列印內容 */}
        <div className="bg-card p-8 print:p-0" id="printable-confirmation">
          <table className="print-wrapper print:table hidden">
            {/* 頁首（每頁都會顯示） */}
            <thead>
              <tr>
                <td>
                  <div
                    className="relative pb-4 mb-6"
                    style={{ borderBottom: '1px solid var(--morandi-container)' }}
                  >
                    {/* Logo - 左上角 */}
                    {logoUrl ? (
                      <div
                        className="absolute left-0 top-0"
                        style={{ width: '120px', height: '40px' }}
                      >
                        <img
                          src={logoUrl}
                          alt="Company Logo"
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
                        className="absolute left-0 top-0 text-xs"
                        style={{ color: 'var(--morandi-muted)' }}
                      >
                        {workspaceName}
                      </div>
                    )}

                    {/* 標題 */}
                    <div className="relative z-10 text-center py-2">
                      <div
                        className="text-sm tracking-widest mb-1"
                        style={{ color: 'var(--morandi-container)', fontWeight: 500 }}
                      >
                        CONFIRMATION
                      </div>
                      <h1 className="text-xl font-bold" style={{ color: 'var(--morandi-primary)' }}>
                        {title}
                      </h1>
                    </div>

                    {/* 確認單資訊 */}
                    <div className="text-sm text-morandi-secondary mt-2 flex justify-between">
                      <span>
                        {LABELS.BOOKING_CODE}: {confirmation.booking_number}
                      </span>
                      {confirmation.confirmation_number && (
                        <span>
                          {LABELS.CONFIRMATION_CODE}: {confirmation.confirmation_number}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            </thead>

            {/* 頁尾（每頁都會顯示） */}
            <tfoot>
              <tr>
                <td>
                  <div
                    className="border-t border-border"
                    style={{
                      marginTop: '24px',
                      paddingTop: '16px',
                    }}
                  >
                    <div className="text-center" style={{ marginBottom: '12px' }}>
                      <p
                        className="text-sm italic"
                        style={{ color: 'var(--morandi-secondary)', margin: 0 }}
                      >
                        {companySubtitle}
                      </p>
                    </div>
                    <div className="text-center text-xs" style={{ color: 'var(--morandi-muted)' }}>
                      <span>
                        {workspaceName} © {new Date().getFullYear()}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>

            {/* 主要內容 */}
            <tbody>
              <tr>
                <td>
                  {isFlightConfirmation ? (
                    <FlightConfirmationContent data={confirmation.data as FlightData} />
                  ) : (
                    <AccommodationConfirmationContent
                      data={confirmation.data as AccommodationData}
                    />
                  )}

                  {/* 備註 */}
                  {confirmation.notes && (
                    <div className="mt-6 avoid-break">
                      <h3 className="text-sm font-semibold text-foreground mb-2">
                        {LABELS.REMARKS}
                      </h3>
                      <div className="text-sm text-morandi-primary whitespace-pre-wrap bg-muted p-4 rounded border border-border">
                        {confirmation.notes}
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {/* 非列印模式的內容 */}
          <div className="print:hidden">
            <div
              className="relative pb-4 mb-6"
              style={{ borderBottom: '1px solid var(--morandi-container)' }}
            >
              {/* Logo - 左上角 */}
              {logoUrl ? (
                <div className="absolute left-0 top-0" style={{ width: '120px', height: '40px' }}>
                  <img
                    src={logoUrl}
                    alt="Company Logo"
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
                  className="absolute left-0 top-0 text-xs"
                  style={{ color: 'var(--morandi-muted)' }}
                >
                  {workspaceName}
                </div>
              )}

              {/* 標題 */}
              <div className="relative z-10 text-center py-2">
                <div
                  className="text-sm tracking-widest mb-1"
                  style={{ color: 'var(--morandi-container)', fontWeight: 500 }}
                >
                  CONFIRMATION
                </div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--morandi-primary)' }}>
                  {title}
                </h1>
              </div>

              {/* 確認單資訊 */}
              <div className="text-sm text-morandi-secondary mt-2 flex justify-between">
                <span>
                  {LABELS.BOOKING_CODE}: {confirmation.booking_number}
                </span>
                {confirmation.confirmation_number && (
                  <span>
                    {LABELS.CONFIRMATION_CODE}: {confirmation.confirmation_number}
                  </span>
                )}
              </div>
            </div>

            {isFlightConfirmation ? (
              <FlightConfirmationContent data={confirmation.data as FlightData} />
            ) : (
              <AccommodationConfirmationContent data={confirmation.data as AccommodationData} />
            )}

            {confirmation.notes && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-foreground mb-2">{LABELS.REMARKS}</h3>
                <div className="text-sm text-morandi-primary whitespace-pre-wrap bg-muted p-4 rounded border border-border">
                  {confirmation.notes}
                </div>
              </div>
            )}

            {/* 頁尾 - 公司資訊 */}
            <div
              className="border-t border-border"
              style={{
                marginTop: '24px',
                paddingTop: '16px',
              }}
            >
              <div className="text-center" style={{ marginBottom: '12px' }}>
                <p
                  className="text-sm italic"
                  style={{ color: 'var(--morandi-secondary)', margin: 0 }}
                >
                  {companySubtitle}
                </p>
              </div>
              <div className="text-center text-xs" style={{ color: 'var(--morandi-muted)' }}>
                <span>
                  {workspaceName} © {new Date().getFullYear()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

// 機票確認單內容
const FlightConfirmationContent: React.FC<{ data: FlightData }> = ({ data }) => {
  return (
    <div className="space-y-5">
      {/* 免責聲明 */}
      <div
        className="text-center text-xs italic py-2 bg-status-warning-bg rounded"
        style={{ color: 'var(--status-warning)' }}
      >
        {LABELS.DISCLAIMER}
      </div>

      {/* 旅客姓名列表 */}
      <div className="text-sm" style={{ color: 'var(--morandi-primary)' }}>
        {data.passengers?.map((passenger, idx) => (
          <div key={idx} className="mb-1 font-medium">
            {LABELS.PASSENGER_NAME}: {String(idx + 1).padStart(2, '0')}. {passenger.nameEn}
          </div>
        ))}
      </div>

      {/* 航班資訊表格 */}
      <div className="avoid-break">
        <table
          className="w-full text-sm"
          style={{
            borderCollapse: 'collapse',
            fontFamily: "'Noto Sans TC', sans-serif",
          }}
        >
          <thead>
            <tr
              style={{
                borderTop: '2px dashed var(--morandi-muted)',
                borderBottom: '2px dashed var(--morandi-muted)',
                backgroundColor: 'var(--background)',
              }}
            >
              <th
                className="py-3 text-center font-semibold"
                style={{ width: '120px', color: 'var(--morandi-primary)' }}
              >
                {LABELS.DATE}
              </th>
              <th
                className="py-3 text-left font-semibold"
                style={{ color: 'var(--morandi-primary)' }}
              >
                {LABELS.TIME_FLIGHT}
              </th>
              <th
                className="py-3 text-left font-semibold"
                colSpan={2}
                style={{ color: 'var(--morandi-primary)' }}
              >
                {LABELS.OTHER_INFO}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.segments?.map((segment, idx) => (
              <React.Fragment key={idx}>
                {/* 航空公司行 */}
                <tr>
                  <td className="py-1.5"></td>
                  <td className="py-1.5 font-semibold" style={{ color: 'var(--morandi-primary)' }}>
                    {segment.airline}({segment.flightNumber})
                  </td>
                  <td className="py-1.5" style={{ color: 'var(--morandi-secondary)' }}>
                    {'duration' in segment ? (segment.duration as string) : ''}
                  </td>
                  <td
                    className="py-1.5"
                    style={{ width: '110px', color: 'var(--morandi-secondary)' }}
                  >
                    {'stops' in segment && typeof segment.stops === 'number'
                      ? segment.stops === 0
                        ? `/${LABELS.DIRECT_FLIGHT}`
                        : `/${LABELS.TRANSIT}${segment.stops}次`
                      : ''}
                  </td>
                </tr>
                {/* 出發行 */}
                <tr>
                  <td
                    className="py-1.5"
                    style={{
                      whiteSpace: 'nowrap',
                      color: 'var(--morandi-primary)',
                      fontWeight: 500,
                    }}
                  >
                    {segment.departureDate}
                  </td>
                  <td className="py-1.5" style={{ color: 'var(--morandi-primary)' }}>
                    {segment.departureTime} {LABELS.DEPARTURE}: {segment.departureAirport}
                  </td>
                  <td
                    className="py-1.5"
                    style={{ width: '180px', color: 'var(--morandi-secondary)' }}
                  >
                    {segment.departureTerminal
                      ? `${LABELS.TERMINAL}${segment.departureTerminal} `
                      : ''}
                    /{'cabin' in segment ? (segment.cabin as string) : LABELS.ECONOMY_CLASS} /OK
                  </td>
                  <td
                    className="py-1.5"
                    style={{ width: '110px', color: 'var(--morandi-secondary)' }}
                  ></td>
                </tr>
                {/* 抵達行 */}
                <tr
                  style={{
                    borderBottom:
                      idx === (data.segments?.length || 0) - 1
                        ? 'none'
                        : '1px dashed var(--morandi-muted)',
                  }}
                >
                  <td className="py-1.5 pb-3"></td>
                  <td className="py-1.5 pb-3" style={{ color: 'var(--morandi-primary)' }}>
                    {segment.arrivalTime} {LABELS.ARRIVAL}: {segment.arrivalAirport}
                  </td>
                  <td className="py-1.5 pb-3" style={{ color: 'var(--morandi-secondary)' }}>
                    {segment.arrivalTerminal ? `${LABELS.TERMINAL}${segment.arrivalTerminal} ` : ''}
                    /${LABELS.MEAL}
                  </td>
                  <td className="py-1.5 pb-3" style={{ color: 'var(--morandi-secondary)' }}></td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* 機票號碼 */}
      <div className="text-sm space-y-1.5 bg-muted p-4 rounded-lg border border-border">
        {data.passengers?.map(
          (passenger, idx) =>
            passenger.ticketNumber && (
              <div key={idx} style={{ color: 'var(--morandi-primary)' }}>
                <span className="font-semibold">{LABELS.TICKET_NUMBER}:</span>{' '}
                {passenger.ticketNumber} - {passenger.nameEn}
              </div>
            )
        )}
      </div>

      {/* 航空公司確認電話 */}
      {'airlineContacts' in data &&
        Array.isArray(data.airlineContacts) &&
        data.airlineContacts.length > 0 && (
          <div className="text-sm bg-status-info-bg p-4 rounded-lg border border-status-info/30">
            <div className="font-semibold mb-2 text-status-info">{LABELS.AIRLINE_CONTACT}:</div>
            <div className="space-y-1" style={{ color: 'var(--morandi-primary)' }}>
              {(data.airlineContacts as string[]).map((contact: string, idx: number) => (
                <div key={idx} className="pl-4">
                  {contact}
                </div>
              ))}
            </div>
          </div>
        )}

      {/* 重要資訊 */}
      {data.importantNotes && data.importantNotes.length > 0 && (
        <div className="avoid-break">
          <div className="text-sm space-y-2 bg-status-warning-bg p-4 rounded-lg border-2 border-status-warning/30">
            <div className="font-semibold mb-1" style={{ color: 'var(--status-warning)' }}>
              ⚠️ {LABELS.IMPORTANT_INFO}
            </div>
            {data.importantNotes.map((note, idx) => (
              <div key={idx} className="flex gap-2" style={{ color: 'var(--status-warning)' }}>
                <span>•</span>
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// 住宿確認單內容
const AccommodationConfirmationContent: React.FC<{ data: AccommodationData }> = ({ data }) => {
  return (
    <div className="space-y-6">
      {/* 飯店資訊 */}
      <div className="avoid-break">
        <h3 className="text-sm font-semibold text-foreground mb-3">{LABELS.HOTEL_INFO}</h3>
        <div className="bg-muted p-4 rounded border border-border space-y-2 text-sm">
          <div className="font-medium text-foreground text-base">{data.hotelName}</div>
          <div className="text-morandi-primary">{data.hotelAddress}</div>
          {data.hotelPhone && data.hotelPhone.length > 0 && (
            <div className="text-morandi-primary">
              {LABELS.PHONE}: {data.hotelPhone.join(' / ')}
            </div>
          )}
        </div>
      </div>

      {/* 入住資訊 */}
      <div className="avoid-break">
        <h3 className="text-sm font-semibold text-foreground mb-3">{LABELS.CHECK_IN_INFO}</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-muted p-4 rounded border border-border">
            <div className="text-morandi-secondary mb-1">{LABELS.CHECK_IN}</div>
            <div className="font-medium text-foreground">
              {data.checkInDate} {data.checkInTime}
            </div>
          </div>
          <div className="bg-muted p-4 rounded border border-border">
            <div className="text-morandi-secondary mb-1">{LABELS.CHECK_OUT}</div>
            <div className="font-medium text-foreground">
              {data.checkOutDate} {data.checkOutTime}
            </div>
          </div>
          <div className="bg-muted p-4 rounded border border-border">
            <div className="text-morandi-secondary mb-1">{LABELS.ROOM_QUANTITY}</div>
            <div className="font-medium text-foreground">
              {data.roomCount} {LABELS.ROOMS}
            </div>
          </div>
          <div className="bg-muted p-4 rounded border border-border">
            <div className="text-morandi-secondary mb-1">{LABELS.ACCOMMODATION_DAYS}</div>
            <div className="font-medium text-foreground">
              {data.nightCount} {LABELS.NIGHTS}
            </div>
          </div>
        </div>
      </div>

      {/* 房型資訊 */}
      <div className="avoid-break">
        <h3 className="text-sm font-semibold text-foreground mb-3">{LABELS.ROOM_INFO}</h3>
        <div className="bg-muted p-4 rounded border border-border space-y-2 text-sm">
          <div>
            <span className="text-morandi-secondary">{LABELS.ROOM_TYPE_COLON}</span>
            <span className="font-medium text-foreground">{data.roomType}</span>
          </div>
          <div>
            <span className="text-morandi-secondary">{LABELS.GUEST_NAME_COLON}</span>
            <span className="font-medium text-foreground">{data.guestName}</span>
          </div>
          <div>
            <span className="text-morandi-secondary">{LABELS.GUEST_CAPACITY_COLON}</span>
            <span className="font-medium text-foreground">{data.guestCapacity}</span>
          </div>
        </div>
      </div>

      {/* 餐點資訊 */}
      {data.meals && data.meals.length > 0 && (
        <div className="avoid-break">
          <h3 className="text-sm font-semibold text-foreground mb-3">{LABELS.MEAL_INFO}</h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted border-y border-border">
                <th className="py-2 px-3 text-left font-medium text-morandi-primary">
                  {LABELS.DATE}
                </th>
                <th className="py-2 px-3 text-left font-medium text-morandi-primary">
                  {LABELS.MEAL_CONTENT}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.meals.map((meal, idx) => (
                <tr key={idx} className="border-b border-border">
                  <td className="py-2 px-3">{meal.date}</td>
                  <td className="py-2 px-3">{meal.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 重要資訊 */}
      {data.importantNotes && (
        <div className="avoid-break">
          <h3 className="text-sm font-semibold text-foreground mb-3">{LABELS.IMPORTANT_INFO}</h3>
          <div className="text-sm text-morandi-primary whitespace-pre-wrap bg-status-warning-bg p-4 rounded border border-status-warning/30">
            {data.importantNotes}
          </div>
        </div>
      )}
    </div>
  )
}
