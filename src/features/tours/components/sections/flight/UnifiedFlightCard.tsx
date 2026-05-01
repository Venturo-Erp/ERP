'use client'

import { motion } from 'framer-motion'
import { Plane, Calendar } from 'lucide-react'
import { getTheme, type TourStyle, type TourTheme } from '@/features/tours/themes'
import type { FlightInfo } from '@/types/flight.types'
import { FLIGHT_LABELS } from './constants/labels'

// ============================================
// 工具函數
// ============================================

const MONTHS_EN = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
]
const DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface FormattedDate {
  full: string // "21 OCT 2024"
  short: string // "10.21"
  day: string // "Mon"
  month: string // "OCT"
  date: number // 21
  year: number // 2024
}

function parseFlightDate(dateStr: string | undefined | null): FormattedDate | null {
  if (!dateStr) return null

  try {
    // 嘗試 "MM/DD" 格式
    const mmddMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/)
    if (mmddMatch) {
      const month = parseInt(mmddMatch[1], 10) - 1
      const date = parseInt(mmddMatch[2], 10)
      if (month >= 0 && month < 12 && date >= 1 && date <= 31) {
        return {
          full: `${date} ${MONTHS_EN[month]}`,
          short: `${month + 1}.${date.toString().padStart(2, '0')}`,
          day: '--',
          month: MONTHS_EN[month],
          date,
          year: 0,
        }
      }
    }

    // 嘗試 "MM/DD/YYYY" 格式
    const mmddyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (mmddyyyyMatch) {
      const month = parseInt(mmddyyyyMatch[1], 10) - 1
      const date = parseInt(mmddyyyyMatch[2], 10)
      const year = parseInt(mmddyyyyMatch[3], 10)
      const d = new Date(year, month, date)
      if (month >= 0 && month < 12 && date >= 1 && date <= 31) {
        return {
          full: `${date} ${MONTHS_EN[month]} ${year}`,
          short: `${month + 1}.${date.toString().padStart(2, '0')}`,
          day: DAYS_EN[d.getDay()],
          month: MONTHS_EN[month],
          date,
          year,
        }
      }
    }

    // 嘗試 ISO "YYYY-MM-DD" 格式
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear()
      if (year < 2020 || year > 2100) return null
      const month = d.getMonth()
      const date = d.getDate()
      return {
        full: `${date} ${MONTHS_EN[month]} ${year}`,
        short: `${month + 1}.${date.toString().padStart(2, '0')}`,
        day: DAYS_EN[d.getDay()],
        month: MONTHS_EN[month],
        date,
        year,
      }
    }

    return null
  } catch {
    return null
  }
}

function extractCityName(airport: string | undefined | null): string {
  if (!airport) return '--'
  // 移除機場代碼，只保留城市名
  // "桃園 (TPE)" → "桃園"
  // "Tokyo Narita (NRT)" → "Tokyo Narita"
  return airport.replace(/\s*\([A-Z]{3}\)\s*$/, '').trim() || '--'
}

// ============================================
// 統一航班卡片元件
// ============================================

interface UnifiedFlightCardProps {
  flight: FlightInfo
  type: 'outbound' | 'return'
  style: TourStyle
  isMobile?: boolean
  /** 目的地圖片 URL（japanese 風格用）*/
  destinationImage?: string | null
}

export function UnifiedFlightCard({
  flight,
  type,
  style,
  isMobile = false,
  destinationImage,
}: UnifiedFlightCardProps) {
  const theme = getTheme(style)
  const dateInfo = parseFlightDate(flight.departureDate)
  const isOutbound = type === 'outbound'

  // 根據風格選擇渲染方式
  switch (style) {
    case 'art':
      return (
        <ArtFlightCard
          flight={flight}
          type={type}
          theme={theme}
          isMobile={isMobile}
          dateInfo={dateInfo}
        />
      )
    case 'luxury':
      return (
        <LuxuryFlightCard
          flight={flight}
          type={type}
          theme={theme}
          isMobile={isMobile}
          dateInfo={dateInfo}
        />
      )
    case 'dreamscape':
      return (
        <DreamscapeFlightCard
          flight={flight}
          type={type}
          theme={theme}
          isMobile={isMobile}
          dateInfo={dateInfo}
        />
      )
    case 'collage':
      return (
        <CollageFlightCard
          flight={flight}
          type={type}
          theme={theme}
          isMobile={isMobile}
          dateInfo={dateInfo}
        />
      )
    case 'nature':
      return (
        <NatureFlightCard
          flight={flight}
          type={type}
          theme={theme}
          isMobile={isMobile}
          dateInfo={dateInfo}
        />
      )
    default:
      return (
        <OriginalFlightCard
          flight={flight}
          type={type}
          theme={theme}
          isMobile={isMobile}
          dateInfo={dateInfo}
        />
      )
  }
}

// ============================================
// Original 風格（莫蘭迪金）
// ============================================

function OriginalFlightCard({
  flight,
  type,
  theme,
  isMobile,
  dateInfo,
}: {
  flight: FlightInfo
  type: 'outbound' | 'return'
  theme: TourTheme
  isMobile: boolean
  dateInfo: FormattedDate | null
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`rounded-xl border p-4 ${isMobile ? '' : 'p-6'}`}
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        boxShadow: theme.effects.shadow,
      }}
    >
      {/* 標籤 */}
      <div
        className="inline-block px-3 py-1 rounded-full text-xs font-medium mb-3"
        style={{
          backgroundColor: theme.colors.primary,
          color: '#FFFFFF',
        }}
      >
        {type === 'outbound' ? FLIGHT_LABELS.去程 : FLIGHT_LABELS.回程}
      </div>

      {/* 航線資訊 */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: theme.colors.text }}>
            {extractCityName(flight.departureAirport)}
          </div>
          <div className="text-sm" style={{ color: theme.colors.muted }}>
            {flight.departureTime || '--:--'}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="flex-1 h-px" style={{ backgroundColor: theme.colors.border }} />
          <Plane className="mx-2" size={20} style={{ color: theme.colors.primary }} />
          <div className="flex-1 h-px" style={{ backgroundColor: theme.colors.border }} />
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: theme.colors.text }}>
            {extractCityName(flight.arrivalAirport)}
          </div>
          <div className="text-sm" style={{ color: theme.colors.muted }}>
            {flight.arrivalTime || '--:--'}
          </div>
        </div>
      </div>

      {/* 航班詳情 */}
      <div
        className="mt-4 pt-4 flex justify-between text-sm"
        style={{ borderTop: `1px solid ${theme.colors.border}` }}
      >
        <span style={{ color: theme.colors.muted }}>
          {flight.airline} {flight.flightNumber}
        </span>
        {dateInfo && (
          <span style={{ color: theme.colors.muted }}>
            {dateInfo.short} ({dateInfo.day})
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ============================================
// Luxury 風格（深綠金棕）
// ============================================

function LuxuryFlightCard({
  flight,
  type,
  theme,
  isMobile,
  dateInfo,
}: {
  flight: FlightInfo
  type: 'outbound' | 'return'
  theme: TourTheme
  isMobile: boolean
  dateInfo: FormattedDate | null
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`rounded-2xl border overflow-hidden ${isMobile ? '' : ''}`}
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        boxShadow: theme.effects.shadow,
      }}
    >
      {/* 頂部強調條 */}
      <div className="h-1" style={{ backgroundColor: theme.colors.primary }} />

      <div className={isMobile ? 'p-4' : 'p-6'}>
        {/* 標題行 */}
        <div className="flex justify-between items-center mb-4">
          <span
            className="text-sm font-medium tracking-wider uppercase"
            style={{ color: theme.colors.secondary }}
          >
            {type === 'outbound' ? 'Departure' : 'Return'}
          </span>
          {dateInfo && (
            <span className="text-sm" style={{ color: theme.colors.muted }}>
              {dateInfo.full}
            </span>
          )}
        </div>

        {/* 航線 */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div
              className="text-3xl font-light"
              style={{ color: theme.colors.text, fontFamily: theme.fonts.heading }}
            >
              {extractCityName(flight.departureAirport)}
            </div>
            <div className="text-lg" style={{ color: theme.colors.primary }}>
              {flight.departureTime || '--:--'}
            </div>
          </div>

          <div className="px-4">
            <Plane size={24} style={{ color: theme.colors.secondary }} />
          </div>

          <div className="flex-1 text-right">
            <div
              className="text-3xl font-light"
              style={{ color: theme.colors.text, fontFamily: theme.fonts.heading }}
            >
              {extractCityName(flight.arrivalAirport)}
            </div>
            <div className="text-lg" style={{ color: theme.colors.primary }}>
              {flight.arrivalTime || '--:--'}
            </div>
          </div>
        </div>

        {/* 底部資訊 */}
        <div
          className="mt-4 pt-4 flex justify-between items-center text-sm"
          style={{ borderTop: `1px solid ${theme.colors.border}` }}
        >
          <span style={{ color: theme.colors.muted }}>
            {flight.airline} · {flight.flightNumber}
          </span>
          {flight.duration && (
            <span style={{ color: theme.colors.secondary }}>{flight.duration}</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ============================================
// Art 風格（Brutalist）
// ============================================

function ArtFlightCard({
  flight,
  type,
  theme,
  isMobile,
  dateInfo,
}: {
  flight: FlightInfo
  type: 'outbound' | 'return'
  theme: TourTheme
  isMobile: boolean
  dateInfo: FormattedDate | null
}) {
  // 取得機場代碼（用於浮水印）
  const airportCode =
    flight.departureAirport?.match(/\(([A-Z]{3})\)/)?.[1] ||
    flight.departureAirport?.slice(0, 3).toUpperCase() ||
    'TPE'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`relative border-2 group cursor-pointer transition-all duration-300 ${
        isMobile ? 'p-6' : 'p-8'
      }`}
      style={{
        borderColor: theme.colors.primary,
        backgroundColor: theme.colors.background,
        boxShadow: theme.effects.shadow,
      }}
      whileHover={{
        backgroundColor: theme.colors.primary,
      }}
    >
      {/* 類型標籤 - 角落 */}
      <span
        className="absolute top-4 left-4 text-[10px] tracking-[0.3em] uppercase transition-colors duration-300 group-hover:text-white"
        style={{
          fontFamily: "'Cinzel', serif",
          color: theme.colors.primary,
        }}
      >
        {type === 'outbound' ? 'OUTBOUND' : 'INBOUND'}
      </span>

      {/* 大型機場代碼浮水印 */}
      <div
        className="absolute top-0 right-0 text-[120px] leading-none font-black opacity-5 pointer-events-none select-none transition-opacity duration-300 group-hover:opacity-10"
        style={{
          fontFamily: "'Cinzel', serif",
        }}
      >
        {airportCode}
      </div>

      {/* 主要內容 */}
      <div className={`relative z-10 ${isMobile ? 'mt-8' : 'mt-12'}`}>
        {/* 航線 */}
        <div className="flex items-center justify-between">
          {/* 出發 */}
          <div>
            <div
              className={`font-black tracking-tighter transition-colors duration-300 group-hover:text-white ${
                isMobile ? 'text-4xl' : 'text-6xl'
              }`}
              style={{
                fontFamily: "'Cinzel', serif",
                color: theme.colors.primary,
              }}
            >
              {airportCode}
            </div>
            <div
              className="text-sm mt-2 transition-colors duration-300 group-hover:text-morandi-secondary"
              style={{
                fontFamily: 'monospace',
                color: theme.colors.muted,
              }}
            >
              {flight.departureTime || '--:--'}
            </div>
          </div>

          {/* 中間箭頭 */}
          <div className="flex-1 flex items-center justify-center px-4">
            <div
              className="w-full h-[2px] relative transition-colors duration-300 group-hover:bg-card"
              style={{ backgroundColor: theme.colors.primary }}
            >
              <Plane
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-colors duration-300 group-hover:text-white"
                size={isMobile ? 16 : 20}
                style={{ color: theme.colors.primary }}
              />
            </div>
          </div>

          {/* 抵達 */}
          <div className="text-right">
            <div
              className={`font-black tracking-tighter transition-colors duration-300 group-hover:text-white ${
                isMobile ? 'text-4xl' : 'text-6xl'
              }`}
              style={{
                fontFamily: "'Cinzel', serif",
                color: theme.colors.primary,
              }}
            >
              {flight.arrivalAirport?.match(/\(([A-Z]{3})\)/)?.[1] ||
                flight.arrivalAirport?.slice(0, 3).toUpperCase() ||
                'NRT'}
            </div>
            <div
              className="text-sm mt-2 transition-colors duration-300 group-hover:text-morandi-secondary"
              style={{
                fontFamily: 'monospace',
                color: theme.colors.muted,
              }}
            >
              {flight.arrivalTime || '--:--'}
            </div>
          </div>
        </div>

        {/* 底部資訊 */}
        <div
          className={`flex justify-between items-center transition-colors duration-300 ${
            isMobile ? 'mt-6 pt-4' : 'mt-8 pt-6'
          }`}
          style={{ borderTop: `2px solid ${theme.colors.primary}` }}
        >
          <span
            className="text-xs tracking-wider transition-colors duration-300 group-hover:text-white"
            style={{
              fontFamily: 'monospace',
              color: theme.colors.muted,
            }}
          >
            {flight.airline} {flight.flightNumber}
          </span>
          {dateInfo && (
            <span
              className="text-xs transition-colors duration-300 group-hover:text-white"
              style={{
                fontFamily: "'Cinzel', serif",
                color: theme.colors.secondary,
              }}
            >
              {dateInfo.full}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ============================================
// Dreamscape 風格（漸層夢幻）
// ============================================

function DreamscapeFlightCard({
  flight,
  type,
  theme,
  isMobile,
  dateInfo,
}: {
  flight: FlightInfo
  type: 'outbound' | 'return'
  theme: TourTheme
  isMobile: boolean
  dateInfo: FormattedDate | null
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className={`rounded-2xl backdrop-blur-md ${isMobile ? 'p-4' : 'p-6'}`}
      style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        boxShadow: theme.effects.shadow,
      }}
    >
      {/* 標籤 */}
      <div className="flex justify-between items-center mb-4">
        <span
          className="text-xs font-semibold tracking-wider uppercase px-3 py-1 rounded-full"
          style={{
            background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
            color: '#FFFFFF',
          }}
        >
          {type === 'outbound' ? '✈ Departure' : '✈ Return'}
        </span>
        {dateInfo && (
          <span className="text-sm" style={{ color: theme.colors.muted }}>
            {dateInfo.full}
          </span>
        )}
      </div>

      {/* 航線 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold" style={{ color: theme.colors.text }}>
            {extractCityName(flight.departureAirport)}
          </div>
          <div className="text-xl" style={{ color: theme.colors.primary }}>
            {flight.departureTime || '--:--'}
          </div>
        </div>

        <div className="flex-1 mx-4 relative">
          <div
            className="h-0.5 w-full"
            style={{
              background: `linear-gradient(90deg, ${theme.colors.primary}, ${theme.colors.accent})`,
            }}
          />
          <Plane
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            size={20}
            style={{ color: theme.colors.accent }}
          />
        </div>

        <div className="text-right">
          <div className="text-3xl font-bold" style={{ color: theme.colors.text }}>
            {extractCityName(flight.arrivalAirport)}
          </div>
          <div className="text-xl" style={{ color: theme.colors.primary }}>
            {flight.arrivalTime || '--:--'}
          </div>
        </div>
      </div>

      {/* 底部 */}
      <div
        className="mt-4 pt-4 flex justify-between text-sm"
        style={{ borderTop: `1px solid ${theme.colors.border}` }}
      >
        <span style={{ color: theme.colors.muted }}>
          {flight.airline} {flight.flightNumber}
        </span>
        {flight.duration && (
          <span style={{ color: theme.colors.secondary }}>{flight.duration}</span>
        )}
      </div>
    </motion.div>
  )
}

// ============================================
// Collage 風格（互動拼貼）
// ============================================

function CollageFlightCard({
  flight,
  type,
  theme,
  isMobile,
  dateInfo,
}: {
  flight: FlightInfo
  type: 'outbound' | 'return'
  theme: TourTheme
  isMobile: boolean
  dateInfo: FormattedDate | null
}) {
  const rotation = type === 'outbound' ? -1 : 1

  return (
    <motion.div
      initial={{ opacity: 0, rotate: rotation * 5 }}
      whileInView={{ opacity: 1, rotate: rotation }}
      whileHover={{ rotate: 0, scale: 1.02 }}
      viewport={{ once: true }}
      className={`border-2 ${isMobile ? 'p-4' : 'p-6'}`}
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderRadius: theme.effects.borderRadius,
        boxShadow: theme.effects.shadow,
      }}
    >
      {/* 郵票風格標籤 */}
      <div
        className="inline-block px-3 py-1 text-xs font-bold tracking-wider uppercase mb-3"
        style={{
          backgroundColor: theme.colors.primary,
          color: '#FFFFFF',
          transform: 'rotate(-3deg)',
        }}
      >
        {type === 'outbound' ? '✈ OUT' : '✈ BACK'}
      </div>

      {/* 航線 */}
      <div className="space-y-2">
        <div
          className="text-2xl font-bold"
          style={{ color: theme.colors.text, fontFamily: theme.fonts.heading }}
        >
          {extractCityName(flight.departureAirport)}
          <span style={{ color: theme.colors.primary }}> → </span>
          {extractCityName(flight.arrivalAirport)}
        </div>

        <div className="flex gap-4 text-lg" style={{ color: theme.colors.secondary }}>
          <span>{flight.departureTime || '--:--'}</span>
          <span>→</span>
          <span>{flight.arrivalTime || '--:--'}</span>
        </div>
      </div>

      {/* 底部撕紙效果 */}
      <div
        className="mt-4 pt-3 flex justify-between text-sm"
        style={{
          borderTop: `2px dashed ${theme.colors.border}`,
          color: theme.colors.muted,
        }}
      >
        <span>
          {flight.airline} {flight.flightNumber}
        </span>
        {dateInfo && <span>{dateInfo.short}</span>}
      </div>
    </motion.div>
  )
}

// ============================================
// Nature 風格（中國風書法）
// ============================================

function NatureFlightCard({
  flight,
  type,
  theme,
  isMobile,
  dateInfo,
}: {
  flight: FlightInfo
  type: 'outbound' | 'return'
  theme: TourTheme
  isMobile: boolean
  dateInfo: FormattedDate | null
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`rounded-lg border ${isMobile ? 'p-4' : 'p-6'}`}
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        boxShadow: theme.effects.shadow,
        backgroundImage: 'url(/images/paper-texture.png)',
        backgroundBlendMode: 'multiply',
      }}
    >
      {/* 紅色印章風格標籤 */}
      <div
        className="inline-block px-4 py-1 text-sm font-bold mb-4"
        style={{
          backgroundColor: '#C41E3A',
          color: '#FFFFFF',
          fontFamily: theme.fonts.heading,
        }}
      >
        {type === 'outbound' ? FLIGHT_LABELS.去程 : FLIGHT_LABELS.回程}
      </div>

      {/* 書法風格航線 */}
      <div className="text-center mb-4">
        <div
          className="text-4xl mb-2"
          style={{
            color: theme.colors.text,
            fontFamily: theme.fonts.heading,
          }}
        >
          {extractCityName(flight.departureAirport)}
          <span className="mx-4" style={{ color: theme.colors.primary }}>
            ⟶
          </span>
          {extractCityName(flight.arrivalAirport)}
        </div>
      </div>

      {/* 時間 */}
      <div className="flex justify-center gap-8 text-xl" style={{ color: theme.colors.secondary }}>
        <span>{flight.departureTime || '--:--'}</span>
        <span>—</span>
        <span>{flight.arrivalTime || '--:--'}</span>
      </div>

      {/* 底部 */}
      <div
        className="mt-4 pt-4 text-center text-sm"
        style={{
          borderTop: `1px solid ${theme.colors.border}`,
          color: theme.colors.muted,
        }}
      >
        {flight.airline} {flight.flightNumber}
        {dateInfo && ` · ${dateInfo.short}`}
      </div>
    </motion.div>
  )
}

// ============================================
// 導出
// ============================================



