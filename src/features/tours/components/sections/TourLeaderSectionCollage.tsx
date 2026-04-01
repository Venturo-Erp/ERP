'use client'

import { motion } from 'framer-motion'
import type { TourPageData } from '@/features/tours/types/tour-display.types'
import { TOURS_LABELS } from './constants/labels'

/**
 * TourLeaderSectionCollage 需要的欄位
 * - leader: { name, domesticPhone, overseasPhone, lineId?, photo?, title? }
 * - meetingInfo: { time, location, date? }
 */
interface TourLeaderSectionCollageProps {
  data: TourPageData
  viewMode: 'desktop' | 'mobile'
}

export function TourLeaderSectionCollage({ data, viewMode }: TourLeaderSectionCollageProps) {
  const isMobile = viewMode === 'mobile'

  return (
    <section className="py-24 relative overflow-hidden bg-[#fdfbf7] border-t-4 border-[var(--morandi-primary)] border-dashed">
      {/* 背景點狀圖案 */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#ddd 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* 標題 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2
            className="text-5xl lg:text-6xl inline-block bg-[#FF0080] text-white px-8 py-4 transform rotate-2 border-4 border-[var(--morandi-primary)]"
            style={{
              fontFamily: "'Permanent Marker', cursive",
              boxShadow: '8px 8px 0px 0px rgba(0,0,0,1)',
            }}
          >
            MEET YOUR GUIDE
          </h2>
        </motion.div>

        {/* Cork Board 風格容器 */}
        <div className="relative max-w-4xl mx-auto">
          {/* Cork Board 背景 */}
          <div
            className="absolute inset-0 rounded-lg transform rotate-1 border-4 border-[var(--morandi-primary)] opacity-80"
            style={{
              backgroundColor: '#c4a35a',
              backgroundImage: "url('https://www.transparenttextures.com/patterns/cork-board.png')",
              boxShadow: '10px 10px 0px 0px rgba(0,0,0,1)',
            }}
          />

          <div
            className={`relative p-8 lg:p-12 min-h-[500px] flex ${isMobile ? 'flex-col' : 'flex-row'} items-center justify-center gap-8`}
          >
            {/* Leader Info 標籤 */}
            <motion.div
              initial={{ opacity: 0, rotate: -10 }}
              whileInView={{ opacity: 1, rotate: -3 }}
              viewport={{ once: true }}
              className="bg-card px-4 py-2 border border-[var(--morandi-primary)] shadow-sm absolute top-6 left-6 z-10"
            >
              <span
                className="text-xl text-morandi-red"
                style={{ fontFamily: "'Permanent Marker', cursive" }}
              >
                Leader Info
              </span>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-black" />
            </motion.div>

            {/* 領隊照片（寶麗來風格） */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-card p-3 pb-8 border border-border transform rotate-2 w-64 hover:scale-105 hover:rotate-6 transition-transform duration-300 cursor-pointer relative"
              style={{ boxShadow: '10px 10px 0px 0px rgba(0,0,0,1)' }}
            >
              {/* 膠帶 */}
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-6"
                style={{
                  backgroundColor: 'rgba(255, 0, 128, 0.6)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  backdropFilter: 'blur(2px)',
                }}
              />

              <div className="h-48 bg-morandi-container border border-[var(--morandi-primary)] mb-2 overflow-hidden">
                {data.leader?.photo ? (
                  <img
                    src={data.leader.photo}
                    alt={data.leader?.name || '領隊'}
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl text-morandi-secondary">
                    👤
                  </div>
                )}
              </div>

              <div className="text-center" style={{ fontFamily: "'Gloria Hallelujah', cursive" }}>
                <div className="text-xl">{data.leader?.name || TOURS_LABELS.LEADER_NAME_TBD}</div>
              </div>
              <div
                className="text-center text-xs text-morandi-secondary"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                {data.leader?.title || 'YOUR GUIDE'}
              </div>

              {/* 聯絡資訊 */}
              {(data.leader?.domesticPhone || data.leader?.lineId) && (
                <div
                  className="mt-4 pt-3 border-t border-border text-xs space-y-1"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  {data.leader?.domesticPhone && (
                    <div className="flex items-center gap-2 text-morandi-secondary">
                      <span>📞</span> {data.leader.domesticPhone}
                    </div>
                  )}
                  {data.leader?.lineId && (
                    <div className="flex items-center gap-2 text-morandi-secondary">
                      <span>💬</span> {data.leader.lineId}
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* 集合資訊卡片 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-[#FFEB3B] p-6 w-full max-w-xs border-2 border-[var(--morandi-primary)] transform -rotate-2 relative group hover:-translate-y-2 transition-transform"
              style={{ boxShadow: '10px 10px 0px 0px rgba(0,0,0,1)' }}
            >
              {/* 圖釘 */}
              <div className="absolute -top-3 right-1/2 translate-x-1/2 w-4 h-4 rounded-full bg-status-info border border-[var(--morandi-primary)] shadow-sm z-40" />

              <h4
                className="font-bold text-lg mb-2"
                style={{ fontFamily: "'Noto Serif TC', serif" }}
              >
                Meeting Point
              </h4>
              <div className="w-full h-px bg-black/20 mb-3" />

              <div className="flex gap-3 mb-4">
                <div className="w-12 h-12 bg-card border border-[var(--morandi-primary)] flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  </svg>
                </div>
                <div
                  className="text-xs leading-relaxed"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  <strong>{data.meetingInfo?.location || TOURS_LABELS.MEETING_POINT_TBD}</strong>
                </div>
              </div>

              <div className="bg-card border border-[var(--morandi-primary)] p-2 text-center">
                <span
                  className="block font-bold text-xs"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  {data.meetingInfo?.date || 'DATE TBD'}
                </span>
                <span className="text-xl" style={{ fontFamily: "'Cinzel', serif" }}>
                  {data.meetingInfo?.time || '00:00'}
                </span>
              </div>

              {/* "Don't be late!" 貼紙 */}
              <div
                className="absolute -right-4 -bottom-4 bg-[#FF0080] text-white text-xs px-2 py-1 shadow-sm"
                style={{
                  fontFamily: "'Permanent Marker', cursive",
                  transform: 'rotate(-10deg)',
                }}
              >
                Don't be late!
              </div>
            </motion.div>
          </div>
        </div>

        {/* 注意事項 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 max-w-2xl mx-auto"
        >
          <div
            className="bg-card border-2 border-[var(--morandi-primary)] p-6 transform rotate-1"
            style={{ boxShadow: '6px 6px 0px 0px rgba(0,0,0,1)' }}
          >
            <h4
              className="text-xl mb-4 flex items-center gap-2"
              style={{ fontFamily: "'Permanent Marker', cursive" }}
            >
              <span className="text-2xl">📋</span> REMINDERS
            </h4>
            <ul className="space-y-3 text-sm" style={{ fontFamily: "'Space Mono', monospace" }}>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-black rounded-full mt-2" />
                {TOURS_LABELS.LABEL_5488}
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-black rounded-full mt-2" />
                集合地點位於{data.meetingInfo?.location || '機場'}
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-black rounded-full mt-2" />
                {TOURS_LABELS.LABEL_2918}
              </li>
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
