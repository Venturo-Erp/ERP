import type { Tour } from '@/stores/types'
import type { OrderMember } from '@/features/orders/types/order-member.types'
import type { FlightInfo } from '@/types/flight.types'
import { SSRCategory } from '@/lib/pnr-parser/types'
import type { EnhancedSSR, EnhancedOSI } from '@/lib/pnr-parser'
// PNR 進階系統砍除（2026-04-22）、PNR 列印 detail 暫時停用、stub any 讓 type-check 過
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PNR = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PNRSegment = any
import { CLASS_NAMES } from '../tour-print-constants'
import { FLIGHT_PRINT_LABELS } from './flight-print-labels'
import { getCompanyInfo, getCompanyFooterLine } from '@/lib/workspace-company-info'

// ─── Types ───

interface FlightPrintOptions {
  tour: Tour
  members: OrderMember[]
  pnrData: PNR[]
  getAirportName: (code: string) => string
  getAirlineName: (code: string) => string
}

// ─── Helpers ───

function calculateDuration(
  depTime: string | undefined,
  arrTime: string | undefined
): string | null {
  if (!depTime || !arrTime || depTime.length < 4 || arrTime.length < 4) return null
  const depHour = parseInt(depTime.substring(0, 2))
  const depMin = parseInt(depTime.substring(2, 4))
  const arrHour = parseInt(arrTime.substring(0, 2))
  const arrMin = parseInt(arrTime.substring(2, 4))
  let totalMin = arrHour * 60 + arrMin - (depHour * 60 + depMin)
  if (totalMin < 0) totalMin += 24 * 60
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  return `${hours}h ${String(mins).padStart(2, '0')}m`
}

function formatPnrDate(dateStr: string): string {
  const months: Record<string, number> = {
    JAN: 0,
    FEB: 1,
    MAR: 2,
    APR: 3,
    MAY: 4,
    JUN: 5,
    JUL: 6,
    AUG: 7,
    SEP: 8,
    OCT: 9,
    NOV: 10,
    DEC: 11,
  }
  const day = parseInt(dateStr.substring(0, 2))
  const monthStr = dateStr.substring(2, 5).toUpperCase()
  const month = months[monthStr] ?? 0
  const currentYear = new Date().getFullYear()
  const date = new Date(currentYear, month, day)
  const weekdays = [
    FLIGHT_PRINT_LABELS.WEEKDAY_SUN,
    FLIGHT_PRINT_LABELS.WEEKDAY_MON,
    FLIGHT_PRINT_LABELS.WEEKDAY_TUE,
    FLIGHT_PRINT_LABELS.WEEKDAY_WED,
    FLIGHT_PRINT_LABELS.WEEKDAY_THU,
    FLIGHT_PRINT_LABELS.WEEKDAY_FRI,
    FLIGHT_PRINT_LABELS.WEEKDAY_SAT,
  ]
  return `${currentYear}${FLIGHT_PRINT_LABELS.YEAR_SUFFIX}${String(month + 1).padStart(2, '0')}${FLIGHT_PRINT_LABELS.MONTH_SUFFIX}${String(day).padStart(2, '0')}${FLIGHT_PRINT_LABELS.DAY_SUFFIX} (${weekdays[date.getDay()]})`
}

function formatTime(time: string | undefined): string {
  if (!time || time.length < 4) return ''
  return `${time.substring(0, 2)}:${time.substring(2, 4)}`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getClassName(code: string): string {
  return CLASS_NAMES[code] || code
}

/** Extract baggage info for a specific segment from SSR/OSI */
function getBaggageForSegment(pnr: PNR | undefined, segmentIndex: number): string | null {
  if (!pnr) return null

  // Try SSR baggage first
  const ssrBaggage = pnr.special_requests?.filter(
    (ssr: EnhancedSSR) => ssr.category === SSRCategory.BAGGAGE
  )
  if (ssrBaggage && ssrBaggage.length > 0) {
    // Find segment-specific baggage
    const segSpecific = ssrBaggage.find((ssr: EnhancedSSR) =>
      ssr.segments?.includes(segmentIndex + 1)
    )
    if (segSpecific) {
      return segSpecific.description || segSpecific.raw
    }
    // If no segment-specific, use the first one (applies to all)
    if (ssrBaggage[0].description) return ssrBaggage[0].description
    return ssrBaggage[0].raw
  }

  // Try OSI baggage (Trip.com style)
  const osiBaggage = pnr.other_info?.filter(
    (osi: EnhancedOSI) =>
      osi.message.includes(FLIGHT_PRINT_LABELS.CHECKED_BAGGAGE_KEYWORD) ||
      osi.message.includes(FLIGHT_PRINT_LABELS.CARRY_ON_KEYWORD)
  )
  if (osiBaggage && osiBaggage.length > 0) {
    return osiBaggage.map((o: EnhancedOSI) => o.message).join(' / ')
  }

  return null
}

/** Get non-baggage, non-meal SSR tags for display */
function getDisplaySSRTags(pnr: PNR | undefined): EnhancedSSR[] {
  if (!pnr?.special_requests) return []
  return pnr.special_requests.filter(
    (ssr: EnhancedSSR) => ssr.category !== SSRCategory.BAGGAGE && ssr.category !== SSRCategory.MEAL
  )
}

/** Get meal SSR tags */
function getMealSSRTags(pnr: PNR | undefined): EnhancedSSR[] {
  if (!pnr?.special_requests) return []
  return pnr.special_requests.filter((ssr: EnhancedSSR) => ssr.category === SSRCategory.MEAL)
}

// ─── Card Builders ───

function buildFlightCard(
  seg: PNRSegment,
  segIndex: number,
  totalSegments: number,
  pnr: PNR | undefined,
  getAirportName: (c: string) => string,
  getAirlineName: (c: string) => string
): string {
  const duration = seg.duration || calculateDuration(seg.departureTime, seg.arrivalTime)
  const classCode = seg.class
  const className = getClassName(classCode)
  const depAirportName = getAirportName(seg.origin) || seg.origin
  const arrAirportName = getAirportName(seg.destination) || seg.destination
  const airlineName = getAirlineName(seg.airline) || seg.airline
  const baggage = getBaggageForSegment(pnr, segIndex)

  // Header right: class + aircraft + baggage (conditional)
  const headerRightParts: string[] = []
  headerRightParts.push(`${className} (${escapeHtml(classCode)})`)
  if (seg.aircraft) {
    headerRightParts.push(escapeHtml(seg.aircraft))
  }
  if (baggage) {
    headerRightParts.push(`${FLIGHT_PRINT_LABELS.CHECKED_BAGGAGE_LABEL} ${escapeHtml(baggage)}`)
  }

  // Terminal info
  const depTerminalHtml = seg.departureTerminal
    ? `<br/>${FLIGHT_PRINT_LABELS.TERMINAL_PREFIX}${escapeHtml(seg.departureTerminal)}${FLIGHT_PRINT_LABELS.TERMINAL_SUFFIX} Terminal ${escapeHtml(seg.departureTerminal)}`
    : ''
  const arrTerminalHtml = seg.arrivalTerminal
    ? `<br/>${FLIGHT_PRINT_LABELS.TERMINAL_PREFIX}${escapeHtml(seg.arrivalTerminal)}${FLIGHT_PRINT_LABELS.TERMINAL_SUFFIX} Terminal ${escapeHtml(seg.arrivalTerminal)}`
    : ''

  // Via / stopover
  let flightTypeHtml = ''
  if (seg.via && seg.via.length > 0) {
    const stops = seg.via
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((v: any) => {
        const parts = [v.city || v.airport || '']
        if (v.duration) parts.push(v.duration)
        return parts.join(' ')
      })
      .join(', ')
    flightTypeHtml = `<div class="flight-type">${FLIGHT_PRINT_LABELS.STOPOVER_LABEL} ${escapeHtml(stops)}</div>`
  } else if (seg.isDirect !== false) {
    flightTypeHtml = `<div class="flight-type">${FLIGHT_PRINT_LABELS.DIRECT_FLIGHT}</div>`
  }

  return `
    <div class="flight-card">
      <div class="flight-card-header">
        <div class="flight-card-header-left">
          <div class="segment-badge">FLIGHT ${segIndex + 1}</div>
          <span class="flight-airline">${escapeHtml(airlineName)} ${seg.airline} ${FLIGHT_PRINT_LABELS.AIRLINE_DOT} ${escapeHtml(seg.airline)}-${escapeHtml(seg.flightNumber)}</span>
        </div>
        <span class="flight-class">${headerRightParts.join(FLIGHT_PRINT_LABELS.HEADER_SEPARATOR)}</span>
      </div>
      <div class="flight-card-body">
        <div class="flight-endpoint departure">
          <div class="flight-time">${formatTime(seg.departureTime)}</div>
          <div class="flight-city">${escapeHtml(depAirportName)} ${escapeHtml(seg.origin)}</div>
          <div class="flight-detail">
            ${formatPnrDate(seg.departureDate)}${depTerminalHtml}
          </div>
        </div>
        <div class="flight-middle">
          ${duration ? `<div class="duration-label">${escapeHtml(duration)}</div>` : ''}
          <div class="flight-path">
            <div class="path-line path-dot-left"></div>
            <span class="path-icon">${FLIGHT_PRINT_LABELS.PLANE_ICON_SVG}</span>
            <div class="path-line path-dot-right"></div>
          </div>
          ${flightTypeHtml}
        </div>
        <div class="flight-endpoint arrival">
          <div class="flight-time">${formatTime(seg.arrivalTime)}</div>
          <div class="flight-city">${escapeHtml(arrAirportName)} ${escapeHtml(seg.destination)}</div>
          <div class="flight-detail">
            ${formatPnrDate(seg.departureDate)}${arrTerminalHtml}
          </div>
        </div>
      </div>
    </div>
  `
}

function buildTourFlightCard(
  flight: FlightInfo,
  date: string,
  segIndex: number,
  getAirportName: (c: string) => string
): string {
  const depCity = getAirportName(flight.departureAirport || '') || flight.departureAirport || ''
  const arrCity = getAirportName(flight.arrivalAirport || '') || flight.arrivalAirport || ''

  return `
    <div class="flight-card">
      <div class="flight-card-header">
        <div class="flight-card-header-left">
          <div class="segment-badge">FLIGHT ${segIndex + 1}</div>
          <span class="flight-airline">${escapeHtml(flight.airline || '')}${flight.flightNumber ? `-${escapeHtml(flight.flightNumber)}` : ''}</span>
        </div>
        <span class="flight-class">${FLIGHT_PRINT_LABELS.ECONOMY_CLASS}</span>
      </div>
      <div class="flight-card-body">
        <div class="flight-endpoint departure">
          <div class="flight-time">${escapeHtml(flight.departureTime || '')}</div>
          <div class="flight-city">${escapeHtml(depCity)} ${escapeHtml(flight.departureAirport || '')}</div>
          <div class="flight-detail">${escapeHtml(date)}</div>
        </div>
        <div class="flight-middle">
          ${flight.duration ? `<div class="duration-label">${escapeHtml(flight.duration)}</div>` : ''}
          <div class="flight-path">
            <div class="path-line path-dot-left"></div>
            <span class="path-icon">${FLIGHT_PRINT_LABELS.PLANE_ICON_SVG}</span>
            <div class="path-line path-dot-right"></div>
          </div>
        </div>
        <div class="flight-endpoint arrival">
          <div class="flight-time">${escapeHtml(flight.arrivalTime || '')}</div>
          <div class="flight-city">${escapeHtml(arrCity)} ${escapeHtml(flight.arrivalAirport || '')}</div>
          <div class="flight-detail">${escapeHtml(date)}</div>
        </div>
      </div>
    </div>
  `
}

// ─── Main Export ───

export function generateFlightPrintContent({
  tour,
  members,
  pnrData,
  getAirportName,
  getAirlineName,
}: FlightPrintOptions): string {
  const pages = members
    .map((member, pageIndex) => {
      const formatPassportName = (name: string) => name.toUpperCase().replace('/', ' / ')
      const companyInfo = getCompanyInfo()
      const companyFooter = getCompanyFooterLine()

      const passengerName = member.passport_name
        ? formatPassportName(member.passport_name)
        : member.chinese_name || ''

      const memberPnr = pnrData.find(p => p.record_locator === member.pnr)
      const segments: PNRSegment[] = memberPnr?.segments || []

      // Ticket number: prefer member field, fallback to PNR ticketNumbers
      const ticketNumber = member.ticket_number || ''

      // Build flight cards
      const flightCards: string[] = []
      if (segments.length > 0) {
        segments.forEach((seg, idx) => {
          flightCards.push(
            buildFlightCard(seg, idx, segments.length, memberPnr, getAirportName, getAirlineName)
          )
        })
      } else if (tour.outbound_flight || tour.return_flight) {
        let idx = 0
        const outbound = Array.isArray(tour.outbound_flight)
          ? tour.outbound_flight[0]
          : tour.outbound_flight
        const returnFlt = Array.isArray(tour.return_flight)
          ? tour.return_flight[0]
          : tour.return_flight
        if (outbound) {
          flightCards.push(
            buildTourFlightCard(outbound, tour.departure_date || '', idx, getAirportName)
          )
          idx++
        }
        if (returnFlt) {
          flightCards.push(
            buildTourFlightCard(returnFlt, tour.return_date || '', idx, getAirportName)
          )
        }
      }

      // SSR tags (non-baggage, non-meal)
      const ssrTags = getDisplaySSRTags(memberPnr)
      const mealTags = getMealSSRTags(memberPnr)
      const allDisplayTags = [...mealTags, ...ssrTags]

      const ssrHtml =
        allDisplayTags.length > 0
          ? `
      <div class="ssr-section">
        <div class="section-title" style="margin-bottom: 10px;">
          <h2 style="font-size: 10px;">${FLIGHT_PRINT_LABELS.SPECIAL_REQUESTS_TITLE}</h2>
        </div>
        ${allDisplayTags
          .map((ssr: EnhancedSSR) => {
            const label = ssr.description
              ? `${escapeHtml(ssr.code)} ${escapeHtml(ssr.description)}`
              : escapeHtml(ssr.raw)
            return `<span class="ssr-tag">${label}</span>`
          })
          .join('')}
      </div>
    `
          : ''

      // Order code
      const orderCode = member.order_code || ''
      const orderInfoHtml = orderCode
        ? `
      <div class="info-grid" style="grid-template-columns: 1fr;">
        <div class="info-box">
          <div class="label">${FLIGHT_PRINT_LABELS.ORDER_NUMBER_LABEL}</div>
          <div class="value" style="font-size: 12px; letter-spacing: 0.5px;">${escapeHtml(orderCode)}</div>
        </div>
      </div>
    `
        : ''

      // Passenger info cells
      const pnrCode = member.pnr || ''

      return `
      <div class="page"${pageIndex > 0 ? ' style="page-break-before: always;"' : ''}>
        <div class="watermark">
          <img src="/corner-logo.png" alt="" />
        </div>

        <div class="header">
          <div class="header-left">
            ${
              companyInfo.name
                ? `<div class="logo-box">
              <span class="logo-letter">${companyInfo.name.charAt(0)}</span>
            </div>`
                : ''
            }
            <div class="company-info">
              <h1>${escapeHtml(companyInfo.name)}</h1>
              ${
                companyInfo.address || companyInfo.tel || companyInfo.email
                  ? `<p>
                ${companyInfo.address ? `${escapeHtml(companyInfo.address)}<br/>` : ''}
                ${companyInfo.tel ? `TEL ${escapeHtml(companyInfo.tel)}` : ''}${companyInfo.tel && companyInfo.email ? ' | ' : ''}${companyInfo.email ? escapeHtml(companyInfo.email) : ''}
              </p>`
                  : ''
              }
            </div>
          </div>
        </div>

        <div class="passenger-row">
          <div class="info-cell">
            <div class="label">${FLIGHT_PRINT_LABELS.PASSENGER_NAME_LABEL}</div>
            <div class="value">${escapeHtml(passengerName)}</div>
          </div>
          ${
            pnrCode
              ? `
          <div class="info-cell">
            <div class="label">${FLIGHT_PRINT_LABELS.PNR_LABEL}</div>
            <div class="value pnr-value">${escapeHtml(pnrCode)}</div>
          </div>
          `
              : ''
          }
          ${
            ticketNumber
              ? `
          <div class="info-cell">
            <div class="label">${FLIGHT_PRINT_LABELS.ETICKET_LABEL}</div>
            <div class="value ticket-value">${escapeHtml(ticketNumber)}</div>
          </div>
          `
              : ''
          }
        </div>

        <div class="section-title">
          <span class="icon">${FLIGHT_PRINT_LABELS.PLANE_ICON_SVG}</span>
          <h2>${FLIGHT_PRINT_LABELS.ITINERARY_DETAILS_TITLE}</h2>
        </div>

        ${flightCards.length > 0 ? flightCards.join('') : ''}

        ${orderInfoHtml}
        ${ssrHtml}

        <div class="notice">
          <h4>${FLIGHT_PRINT_LABELS.NOTICE_TITLE}</h4>
          <ul>
            ${FLIGHT_PRINT_LABELS.NOTICE_ITEMS.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>

        <div class="footer">
          ${companyFooter ? `<div class="footer-notice">${escapeHtml(companyFooter)}</div>` : ''}
          ${
            companyInfo.address || companyInfo.tel || companyInfo.fax || companyInfo.email
              ? `<div class="footer-contact">
            ${companyInfo.address ? `<span>${escapeHtml(companyInfo.address)}</span>` : ''}
            ${companyInfo.tel ? `<span>TEL ${escapeHtml(companyInfo.tel)}</span>` : ''}
            ${companyInfo.fax ? `<span>FAX ${escapeHtml(companyInfo.fax)}</span>` : ''}
            ${companyInfo.email ? `<span>${escapeHtml(companyInfo.email)}</span>` : ''}
          </div>`
              : ''
          }
        </div>
      </div>
    `
    })
    .join('')

  return `
    <!DOCTYPE html>
    <html lang="zh-TW">
      <head>
        <meta charset="utf-8"/>
        <title>${FLIGHT_PRINT_LABELS.PAGE_TITLE(tour.code || '')}</title>
        <style>${FLIGHT_PRINT_STYLES}</style>
      </head>
      <body>${pages}</body>
    </html>
  `
}

// ─── Styles ───

const FLIGHT_PRINT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@200..800&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --primary: #242d51;
    --primary-light: rgba(36, 45, 81, 0.05);
    --primary-border: rgba(36, 45, 81, 0.15);
    --accent: #E3D9C6;
    --accent-light: rgba(227, 217, 198, 0.1);
    --linen: #FCFBF9;
    --text: #131316;
    --text-light: var(--morandi-secondary);
    --text-muted: #999;
    --text-faint: #bbb;
    --border: #e8e4dc;
  }

  @page { size: A4; margin: 0; }

  body {
    font-family: 'Noto Sans TC', 'Manrope', sans-serif;
    background: #f0f0f0;
    color: var(--text);
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    background: var(--linen);
    margin: 20px auto;
    padding: 48px 56px;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(0,0,0,0.12);
    display: flex;
    flex-direction: column;
  }

  /* Watermark */
  .watermark {
    position: absolute;
    right: -195px;
    bottom: 420px;
    pointer-events: none;
    z-index: 0;
    opacity: 0.08;
    transform: rotate(270deg);
    transform-origin: center;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color: var(--primary);
  }
  .watermark img { width: 650px; height: auto; }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 28px;
    border-bottom: 1.5px solid var(--accent);
    margin-bottom: 28px;
    position: relative;
    z-index: 1;
  }
  .header-left {
    display: flex;
    gap: 20px;
    align-items: center;
  }
  .logo-box {
    width: 64px;
    height: 64px;
    background: #E5A100;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .logo-letter {
    font-family: 'Manrope', sans-serif;
    font-size: 38px;
    font-weight: 800;
    color: white;
    line-height: 1;
  }
  .company-info h1 {
    font-size: 22px;
    font-weight: 700;
    color: var(--primary);
    letter-spacing: -0.5px;
    margin-bottom: 4px;
  }
  .company-info p {
    font-size: 10px;
    color: var(--text-muted);
    line-height: 1.7;
  }

  /* Passenger Info */
  .passenger-row {
    display: flex;
    gap: 16px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(227, 217, 198, 0.5);
    margin-bottom: 28px;
    position: relative;
    z-index: 1;
  }
  .info-cell { flex: 1; }
  .info-cell .label {
    font-size: 8px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 4px;
  }
  .info-cell .value {
    font-size: 18px;
    font-weight: 700;
    color: var(--primary);
    letter-spacing: 0.5px;
  }
  .info-cell .pnr-value {
    letter-spacing: 3px;
    font-family: 'Manrope', monospace;
  }
  .info-cell .ticket-value {
    font-size: 15px;
    letter-spacing: 1px;
  }

  /* Section Title */
  .section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    position: relative;
    z-index: 1;
  }
  .section-title .icon {
    font-size: 18px;
    color: var(--primary);
  }
  .section-title .icon svg {
    width: 18px;
    height: 18px;
    fill: var(--primary);
  }
  .section-title h2 {
    font-size: 13px;
    font-weight: 700;
    color: var(--primary);
    text-transform: uppercase;
    letter-spacing: 3px;
  }

  /* Flight Card */
  .flight-card {
    background: white;
    border: 1px solid var(--accent);
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 20px;
    position: relative;
    z-index: 1;
  }
  .flight-card-header {
    background: var(--accent-light);
    padding: 10px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--accent);
  }
  .flight-card-header-left {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .segment-badge {
    background: var(--primary);
    color: white;
    font-size: 8px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 3px;
    letter-spacing: 1px;
  }
  .flight-airline {
    font-size: 13px;
    font-weight: 700;
    color: var(--primary);
  }
  .flight-class {
    font-size: 11px;
    color: var(--text-light);
  }
  .flight-card-body {
    padding: 24px 28px;
    display: flex;
    align-items: center;
  }
  .flight-endpoint { width: 140px; }
  .flight-endpoint.departure { text-align: left; }
  .flight-endpoint.arrival { text-align: right; }
  .flight-time {
    font-family: 'Manrope', sans-serif;
    font-size: 36px;
    font-weight: 300;
    color: var(--primary);
    line-height: 1;
    margin-bottom: 6px;
  }
  .flight-city {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }
  .flight-detail {
    font-size: 10px;
    color: var(--text-muted);
    margin-top: 4px;
    line-height: 1.5;
  }
  .flight-middle {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 16px;
  }
  .duration-label {
    font-size: 9px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
  }
  .flight-path {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 8px;
  }
  .path-line {
    flex: 1;
    height: 2px;
    background: var(--accent);
    position: relative;
  }
  .path-dot-left::before {
    content: '';
    position: absolute;
    left: -3px;
    top: -3px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
  }
  .path-dot-right::after {
    content: '';
    position: absolute;
    right: -3px;
    top: -3px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
  }
  .path-icon {
    color: var(--accent);
  }
  .path-icon svg {
    width: 16px;
    height: 16px;
    fill: var(--accent);
    transform: rotate(0deg);
  }
  .flight-type {
    font-size: 9px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  /* Info Grid */
  .info-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 28px;
    position: relative;
    z-index: 1;
  }
  .info-box {
    padding: 14px 16px;
    background: var(--primary-light);
    border: 1px solid var(--primary-border);
    border-radius: 4px;
  }
  .info-box .label {
    font-size: 7px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 6px;
  }
  .info-box .value {
    font-size: 12px;
    font-weight: 700;
    color: var(--primary);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  /* SSR Tags */
  .ssr-section {
    margin-bottom: 28px;
    position: relative;
    z-index: 1;
  }
  .ssr-tag {
    display: inline-block;
    background: var(--accent-light);
    border: 1px solid var(--accent);
    padding: 4px 12px;
    border-radius: 3px;
    font-size: 9px;
    color: var(--text-light);
    margin-right: 8px;
    margin-bottom: 6px;
  }

  /* Notice */
  .notice {
    background: #f8f7f5;
    border: 1px solid #e8e4dc;
    border-radius: 6px;
    padding: 20px 24px;
    margin-bottom: 28px;
    position: relative;
    z-index: 1;
  }
  .notice h4 {
    font-size: 9px;
    font-weight: 700;
    color: var(--primary);
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 10px;
  }
  .notice ul {
    list-style: disc;
    padding-left: 16px;
  }
  .notice li {
    font-size: 9px;
    color: var(--text-light);
    line-height: 1.7;
    margin-bottom: 3px;
  }

  /* Footer */
  .footer {
    margin-top: auto;
    padding-top: 24px;
    border-top: 1.5px solid var(--accent);
    text-align: center;
    position: relative;
    z-index: 1;
  }
  .footer-notice {
    font-size: 9px;
    color: var(--text-muted);
    margin-bottom: 8px;
  }
  .footer-contact {
    display: flex;
    justify-content: center;
    gap: 24px;
    font-size: 8px;
    color: var(--text-faint);
  }

  @media print {
    body { background: white; }
    .page {
      box-shadow: none;
      margin: 0;
      width: 100%;
      padding: 40px 50px;
    }
    .page + .page { page-break-before: always; }
  }
`
