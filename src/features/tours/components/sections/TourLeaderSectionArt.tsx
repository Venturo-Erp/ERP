'use client'

import { motion } from 'framer-motion'
import type { TourPageData } from '@/features/tours/types/tour-display.types'
import { TOURS_LABELS } from './constants/labels'

/**
 * TourLeaderSectionArt 需要的欄位
 * - leader: { name, domesticPhone, overseasPhone, lineId?, photo?, title?, description? }
 * - meetingInfo: { time, location, flightNo?, airline?, date? }
 *
 * 注意：Art 風格支援更多領隊欄位（photo、title 等）
 * 這些欄位透過 index signature 存取
 */
interface TourLeaderSectionArtProps {
  data: TourPageData
  viewMode: 'desktop' | 'mobile'
}

export function TourLeaderSectionArt({ data, viewMode }: TourLeaderSectionArtProps) {
  const isMobile = viewMode === 'mobile'

  // Art 風格色彩
  const colors = {
    ink: '#1C1C1C',
    paper: '#F2F0E9',
    clay: '#BF5B3D',
    accent: '#C6A87C',
  }

  // Brutalist 陰影
  const brutalistShadow = '6px 6px 0px 0px rgba(28,28,28,1)'

  return (
    <section className="py-24 relative overflow-hidden" style={{ backgroundColor: colors.paper }}>
      {/* 背景裝飾線條 */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/3 w-px h-full"
          style={{ backgroundColor: `${colors.ink}08` }}
        />
        <div
          className="absolute top-0 right-1/3 w-px h-full"
          style={{ backgroundColor: `${colors.ink}08` }}
        />
        <div
          className="absolute top-1/2 left-0 w-full h-px"
          style={{ backgroundColor: `${colors.ink}08` }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        {/* 標題區 - Editorial Magazine 風格 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="flex items-start gap-8">
            {/* 垂直文字 */}
            <div
              className="hidden lg:block text-sm tracking-[0.3em] uppercase"
              style={{
                fontFamily: "'Cinzel', serif",
                color: colors.clay,
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
              }}
            >
              Tour Director
            </div>

            <div className="flex-1">
              <span
                className="text-sm tracking-[0.2em] uppercase block mb-4"
                style={{ fontFamily: "'Italiana', serif", color: colors.clay }}
              >
                Your Guide
              </span>
              <h2
                className="text-5xl lg:text-7xl font-light mb-6"
                style={{ fontFamily: "'Zen Old Mincho', serif", color: colors.ink }}
              >
                {TOURS_LABELS.LABEL_6841}
              </h2>
              <div className="w-24 h-1" style={{ backgroundColor: colors.clay }} />
            </div>
          </div>
        </motion.div>

        <div
          className={`grid ${isMobile ? 'grid-cols-1 gap-12' : 'lg:grid-cols-12 gap-16'} items-start`}
        >
          {/* 左側：領隊卡片 */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={`${isMobile ? '' : 'lg:col-span-5'}`}
          >
            <div
              className="border-2 bg-card relative"
              style={{
                borderColor: colors.ink,
                boxShadow: brutalistShadow,
              }}
            >
              {/* 領隊照片 */}
              <div className="aspect-[4/5] w-full relative overflow-hidden">
                {data.leader?.photo ? (
                  <img
                    src={data.leader.photo}
                    alt={data.leader?.name || '領隊'}
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ backgroundColor: colors.ink }}
                  >
                    <span
                      className="text-8xl font-light"
                      style={{ fontFamily: "'Cinzel', serif", color: colors.paper }}
                    >
                      {data.leader?.name?.charAt(0) || 'L'}
                    </span>
                  </div>
                )}

                {/* 認證徽章 */}
                <div
                  className="absolute top-4 right-4 w-12 h-12 flex items-center justify-center"
                  style={{ backgroundColor: colors.clay }}
                >
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                  </svg>
                </div>
              </div>

              {/* 領隊資訊 */}
              <div className="p-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3
                      className="text-3xl font-light mb-1"
                      style={{ fontFamily: "'Zen Old Mincho', serif", color: colors.ink }}
                    >
                      {data.leader?.name || '領隊姓名待定'}
                    </h3>
                    <p
                      className="text-sm uppercase tracking-[0.2em]"
                      style={{ fontFamily: "'Cinzel', serif", color: colors.clay }}
                    >
                      {data.leader?.title || 'Senior Tour Director'}
                    </p>
                  </div>
                </div>

                {data.leader?.description && (
                  <p
                    className="text-sm leading-relaxed mb-6 pb-6 border-b border-border italic"
                    style={{
                      fontFamily: "'Noto Serif TC', serif",
                      color: colors.ink,
                      borderColor: `${colors.ink}20`,
                    }}
                  >
                    "{data.leader.description}"
                  </p>
                )}

                {/* 聯絡資訊 */}
                <div className="space-y-4">
                  {data.leader?.domesticPhone && (
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 flex items-center justify-center"
                        style={{ backgroundColor: colors.ink }}
                      >
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                        </svg>
                      </div>
                      <div>
                        <span
                          className="text-xs uppercase tracking-[0.1em] block"
                          style={{ fontFamily: "'Cinzel', serif", color: colors.accent }}
                        >
                          Mobile
                        </span>
                        <span
                          className="text-lg"
                          style={{ fontFamily: "'Cinzel', serif", color: colors.ink }}
                        >
                          {data.leader.domesticPhone}
                        </span>
                      </div>
                    </div>
                  )}

                  {data.leader?.overseasPhone && (
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 flex items-center justify-center"
                        style={{ backgroundColor: colors.clay }}
                      >
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                        </svg>
                      </div>
                      <div>
                        <span
                          className="text-xs uppercase tracking-[0.1em] block"
                          style={{ fontFamily: "'Cinzel', serif", color: colors.accent }}
                        >
                          Overseas
                        </span>
                        <span
                          className="text-lg"
                          style={{ fontFamily: "'Cinzel', serif", color: colors.ink }}
                        >
                          {data.leader.overseasPhone}
                        </span>
                      </div>
                    </div>
                  )}

                  {data.leader?.lineId && (
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 flex items-center justify-center border-2"
                        style={{ borderColor: colors.ink }}
                      >
                        <svg
                          className="w-5 h-5"
                          style={{ color: colors.ink }}
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <span
                          className="text-xs uppercase tracking-[0.1em] block"
                          style={{ fontFamily: "'Cinzel', serif", color: colors.accent }}
                        >
                          Line ID
                        </span>
                        <span
                          className="text-lg"
                          style={{ fontFamily: "'Cinzel', serif", color: colors.ink }}
                        >
                          {data.leader.lineId}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* 右側：集合資訊 */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`${isMobile ? '' : 'lg:col-span-7'} flex flex-col gap-8`}
          >
            {/* 集合資訊標題 */}
            <div className="flex items-center gap-4 mb-4">
              <span
                className="text-xs tracking-[0.2em] uppercase px-3 py-1 border"
                style={{
                  fontFamily: "'Cinzel', serif",
                  color: colors.clay,
                  borderColor: colors.clay,
                }}
              >
                Meeting Point
              </span>
            </div>

            {/* 集合時間與日期 */}
            <div
              className="border-2 p-8 bg-card"
              style={{
                borderColor: colors.ink,
                boxShadow: brutalistShadow,
              }}
            >
              <div className="grid sm:grid-cols-2 gap-8">
                {/* 日期 */}
                <div>
                  <span
                    className="text-xs uppercase tracking-[0.1em] block mb-2"
                    style={{ fontFamily: "'Cinzel', serif", color: colors.accent }}
                  >
                    Date
                  </span>
                  <span
                    className="text-3xl font-light"
                    style={{ fontFamily: "'Cinzel', serif", color: colors.ink }}
                  >
                    {data.meetingInfo?.date || '日期待定'}
                  </span>
                </div>

                {/* 時間 */}
                <div>
                  <span
                    className="text-xs uppercase tracking-[0.1em] block mb-2"
                    style={{ fontFamily: "'Cinzel', serif", color: colors.accent }}
                  >
                    Time
                  </span>
                  <span
                    className="text-3xl font-light"
                    style={{ fontFamily: "'Cinzel', serif", color: colors.clay }}
                  >
                    {data.meetingInfo?.time || '時間待定'}
                  </span>
                </div>
              </div>
            </div>

            {/* 集合地點 */}
            <div
              className="border-2 p-8 bg-card"
              style={{
                borderColor: colors.ink,
                boxShadow: brutalistShadow,
              }}
            >
              <div className="flex items-start gap-6">
                <div
                  className="w-14 h-14 flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: colors.clay }}
                >
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  </svg>
                </div>
                <div>
                  <span
                    className="text-xs uppercase tracking-[0.1em] block mb-2"
                    style={{ fontFamily: "'Cinzel', serif", color: colors.accent }}
                  >
                    Location
                  </span>
                  <span
                    className="text-2xl font-light block mb-2"
                    style={{ fontFamily: "'Zen Old Mincho', serif", color: colors.ink }}
                  >
                    {data.meetingInfo?.location || '集合地點待定'}
                  </span>
                  {data.meetingInfo?.airline && (
                    <span className="text-sm" style={{ color: colors.accent }}>
                      {data.meetingInfo.airline} 櫃檯
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 航班資訊 */}
            {data.meetingInfo?.flightNo && (
              <div
                className="border-2 p-8 bg-card"
                style={{
                  borderColor: colors.ink,
                  boxShadow: brutalistShadow,
                }}
              >
                <div className="flex items-start gap-6">
                  <div
                    className="w-14 h-14 flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: colors.ink }}
                  >
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <span
                      className="text-xs uppercase tracking-[0.1em] block mb-2"
                      style={{ fontFamily: "'Cinzel', serif", color: colors.accent }}
                    >
                      Flight
                    </span>
                    <span
                      className="text-2xl font-light"
                      style={{ fontFamily: "'Cinzel', serif", color: colors.ink }}
                    >
                      {data.meetingInfo.flightNo}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 注意事項 */}
            <div
              className="border-2 p-8 bg-card"
              style={{
                borderColor: colors.ink,
                boxShadow: '4px 4px 0px 0px rgba(28,28,28,1)',
              }}
            >
              <div
                className="flex items-center gap-4 mb-6 pb-4 border-b"
                style={{ borderColor: `${colors.ink}20` }}
              >
                <span
                  className="text-xs tracking-[0.2em] uppercase px-3 py-1 border"
                  style={{
                    fontFamily: "'Cinzel', serif",
                    color: colors.accent,
                    borderColor: colors.accent,
                  }}
                >
                  Notes
                </span>
                <h4
                  className="text-lg font-light"
                  style={{ fontFamily: "'Zen Old Mincho', serif", color: colors.ink }}
                >
                  {TOURS_LABELS.LABEL_7853}
                </h4>
              </div>

              <ul className="space-y-4">
                <li className="flex items-start gap-4 text-sm" style={{ color: colors.ink }}>
                  <span
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-xs border"
                    style={{
                      fontFamily: "'Cinzel', serif",
                      borderColor: colors.ink,
                      color: colors.ink,
                    }}
                  >
                    1
                  </span>
                  <span style={{ fontFamily: "'Noto Serif TC', serif" }}>
                    {TOURS_LABELS.LABEL_5488}
                  </span>
                </li>
                <li className="flex items-start gap-4 text-sm" style={{ color: colors.ink }}>
                  <span
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-xs border"
                    style={{
                      fontFamily: "'Cinzel', serif",
                      borderColor: colors.ink,
                      color: colors.ink,
                    }}
                  >
                    2
                  </span>
                  <span style={{ fontFamily: "'Noto Serif TC', serif" }}>
                    集合地點位於{data.meetingInfo?.location || '機場'}
                  </span>
                </li>
                <li className="flex items-start gap-4 text-sm" style={{ color: colors.ink }}>
                  <span
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-xs border"
                    style={{
                      fontFamily: "'Cinzel', serif",
                      borderColor: colors.ink,
                      color: colors.ink,
                    }}
                  >
                    3
                  </span>
                  <span style={{ fontFamily: "'Noto Serif TC', serif" }}>
                    {TOURS_LABELS.LABEL_7622}
                  </span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
