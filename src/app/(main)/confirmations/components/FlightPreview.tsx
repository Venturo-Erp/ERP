import React from 'react'
import type { ConfirmationFormData, FlightData } from '@/types/confirmation.types'
import { FLIGHT_PREVIEW_LABELS } from '../constants/labels'

interface FlightPreviewProps {
  formData: ConfirmationFormData
}

export function FlightPreview({ formData }: FlightPreviewProps) {
  const data = formData.data as Partial<FlightData>
  const extendedData = data as Partial<FlightData> & { airlineContacts?: string[] }

  return (
    <div
      className="p-8 space-y-4"
      style={{ fontFamily: "'Noto Sans TC', sans-serif", fontSize: '14px' }}
    >
      {/* 頂部資訊 */}
      <div
        className="flex justify-between items-start pb-3 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div>
          <div className="font-medium" style={{ color: 'var(--morandi-primary)' }}>
            {FLIGHT_PREVIEW_LABELS.COMPUTER_CODE}:{' '}
            {formData.booking_number || FLIGHT_PREVIEW_LABELS.NOT_FILLED}
          </div>
        </div>
      </div>

      {/* 免責聲明 */}
      <div
        className="text-center text-xs italic py-2 bg-status-warning-bg rounded"
        style={{ color: 'var(--status-warning)' }}
      >
        {FLIGHT_PREVIEW_LABELS.DISCLAIMER}
      </div>

      {/* 旅客姓名 */}
      {data.passengers && data.passengers.length > 0 && (
        <div>
          {data.passengers.map((passenger, idx) => (
            <div key={idx} className="mb-1" style={{ color: 'var(--morandi-primary)' }}>
              {FLIGHT_PREVIEW_LABELS.PASSENGER_NAME}:{String(idx + 1).padStart(2, '0')}.{' '}
              {passenger.nameEn}
            </div>
          ))}
        </div>
      )}

      {/* 航班資訊 - 使用虛線分隔 */}
      {data.segments && data.segments.length > 0 && (
        <div>
          <div
            className="border-t border-b border-border py-2"
            style={{ borderColor: 'var(--morandi-gold)', borderStyle: 'dashed' }}
          >
            <div
              className="grid grid-cols-12 gap-2 font-medium"
              style={{ color: 'var(--morandi-primary)' }}
            >
              <div className="col-span-2 text-center">{FLIGHT_PREVIEW_LABELS.DATE_HEADER}</div>
              <div className="col-span-6">{FLIGHT_PREVIEW_LABELS.TIME_FLIGHT_HEADER}</div>
              <div className="col-span-4">{FLIGHT_PREVIEW_LABELS.OTHER_INFO_HEADER}</div>
            </div>
          </div>

          {data.segments.map((segment, idx) => (
            <div key={idx}>
              {/* 航空公司行 */}
              <div className="grid grid-cols-12 gap-2 py-1.5">
                <div className="col-span-2"></div>
                <div className="col-span-6 font-medium" style={{ color: 'var(--morandi-primary)' }}>
                  {segment.airline}({segment.flightNumber})
                </div>
                <div className="col-span-4 text-right" style={{ color: 'var(--morandi-secondary)' }}>
                  /{FLIGHT_PREVIEW_LABELS.DIRECT_FLIGHT}
                </div>
              </div>

              {/* 出發行 */}
              <div className="grid grid-cols-12 gap-2 py-1">
                <div className="col-span-2 text-center" style={{ color: 'var(--morandi-primary)' }}>
                  {segment.departureDate}
                </div>
                <div className="col-span-6" style={{ color: 'var(--morandi-primary)' }}>
                  {segment.departureTime} {FLIGHT_PREVIEW_LABELS.DEPARTURE_PREFIX}:{' '}
                  {segment.departureAirport}
                </div>
                <div className="col-span-4" style={{ color: 'var(--morandi-secondary)' }}>
                  {segment.departureTerminal
                    ? `${FLIGHT_PREVIEW_LABELS.TERMINAL}${segment.departureTerminal} `
                    : ''}
                  /{data.passengers?.[0]?.cabin || FLIGHT_PREVIEW_LABELS.DEFAULT_CABIN} /OK
                </div>
              </div>

              {/* 抵達行 */}
              <div
                className="grid grid-cols-12 gap-2 py-1 pb-3"
                style={{
                  borderBottom:
                    idx < (data.segments?.length || 0) - 1 ? '1px dashed var(--morandi-gold)' : 'none',
                }}
              >
                <div className="col-span-2"></div>
                <div className="col-span-6" style={{ color: 'var(--morandi-primary)' }}>
                  {segment.arrivalTime} {FLIGHT_PREVIEW_LABELS.ARRIVAL_PREFIX}:{' '}
                  {segment.arrivalAirport}
                </div>
                <div className="col-span-4" style={{ color: 'var(--morandi-secondary)' }}>
                  {segment.arrivalTerminal
                    ? `${FLIGHT_PREVIEW_LABELS.TERMINAL}${segment.arrivalTerminal} `
                    : ''}
                  /{FLIGHT_PREVIEW_LABELS.MEAL}
                </div>
              </div>
            </div>
          ))}

          <div
            className="border-b py-1"
            style={{ borderColor: 'var(--morandi-gold)', borderStyle: 'dashed' }}
          ></div>
        </div>
      )}

      {/* 機票號碼 */}
      {data.passengers &&
        data.passengers.length > 0 &&
        data.passengers.some(p => p.ticketNumber) && (
          <div className="space-y-1">
            {data.passengers.map(
              (passenger, idx) =>
                passenger.ticketNumber && (
                  <div key={idx} style={{ color: 'var(--morandi-primary)' }}>
                    {FLIGHT_PREVIEW_LABELS.TICKET_NUMBER}: {passenger.ticketNumber} -{' '}
                    {passenger.nameEn}
                  </div>
                )
            )}
          </div>
        )}

      {/* 航空公司確認電話 */}
      {extendedData.airlineContacts && extendedData.airlineContacts.length > 0 && (
        <div>
          <div className="font-medium mb-1" style={{ color: 'var(--morandi-primary)' }}>
            {FLIGHT_PREVIEW_LABELS.AIRLINE_CONTACT}:
          </div>
          <div className="space-y-1 pl-4" style={{ color: 'var(--morandi-secondary)' }}>
            {extendedData.airlineContacts.map((contact, idx) => (
              <div key={idx}>{contact}</div>
            ))}
          </div>
        </div>
      )}

      {/* 重要資訊 */}
      {data.importantNotes && data.importantNotes.length > 0 && (
        <div className="mt-4 p-3 bg-status-warning-bg rounded border border-status-warning/30">
          <div className="font-semibold mb-2" style={{ color: 'var(--status-warning)' }}>
            ⚠️ {FLIGHT_PREVIEW_LABELS.IMPORTANT_INFO}
          </div>
          <div className="space-y-1" style={{ color: 'var(--status-warning)' }}>
            {data.importantNotes.map((note, idx) => (
              <div key={idx}>• {note}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
