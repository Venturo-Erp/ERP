'use client'

import { motion } from 'framer-motion'
import type { TourPageData } from '@/features/tours/types/tour-display.types'
import { TOURS_LABELS } from './constants/labels'

interface TourPricingSectionCollageProps {
  data: TourPageData
  viewMode?: 'desktop' | 'mobile'
}

export function TourPricingSectionCollage({
  data,
  viewMode = 'desktop',
}: TourPricingSectionCollageProps) {
  const pricingDetails = data.pricingDetails
  const priceTiers = data.priceTiers || []
  const isMobile = viewMode === 'mobile'

  if (!data.showPricingDetails && priceTiers.length === 0) {
    return null
  }

  // 格式化價格
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('zh-TW').format(price)
  }

  return (
    <section className="py-24 relative overflow-hidden bg-card/50 border-t-4 border-[var(--morandi-primary)] border-dashed">
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
          className="text-center mb-24 relative"
        >
          <h2
            className="text-6xl lg:text-8xl inline-block bg-[#C6FF00] text-black px-8 py-4 transform -rotate-3 border-4 border-[var(--morandi-primary)] z-10 relative"
            style={{
              fontFamily: "'Permanent Marker', cursive",
              boxShadow: '8px 8px 0px 0px rgba(0,0,0,1)',
            }}
          >
            YOUR TRIP
          </h2>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-1 bg-black transform -rotate-3 -z-10" />
        </motion.div>

        {/* 價格方案 */}
        <div
          className={`grid ${isMobile ? 'grid-cols-1 gap-8' : 'lg:grid-cols-12 gap-12'} items-start`}
        >
          {/* 左側：價格卡片區 */}
          <div className={`${isMobile ? '' : 'lg:col-span-7'} flex flex-col gap-16 relative`}>
            {/* 背景裝飾 */}
            <div className="absolute -inset-10 bg-morandi-container/50 transform rotate-1 rounded-2xl border-2 border-dashed border-border -z-10" />

            {/* 手寫標題 */}
            <div
              className="text-2xl text-morandi-secondary -ml-4 -rotate-[5deg] mb-[-20px] relative z-20 w-max"
              style={{ fontFamily: "'Gloria Hallelujah', cursive" }}
            >
              <span className="bg-[#FFEB3B] px-2 border border-[var(--morandi-primary)]">
                Pick a Plan!
              </span>
            </div>

            {/* 價格卡片 */}
            <div
              className={`flex ${isMobile ? 'flex-col' : 'flex-col md:flex-row'} gap-8 items-center justify-center`}
            >
              {/* 第一個方案 */}
              {priceTiers[0] && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="w-full bg-card border-2 border-[var(--morandi-primary)] p-6 transform -rotate-2 hover:rotate-0 hover:z-20 transition-all duration-300 relative group"
                  style={{ boxShadow: '10px 10px 0px 0px rgba(0,0,0,1)' }}
                >
                  {/* 圖釘 */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-morandi-red border border-[var(--morandi-primary)] shadow-sm z-20" />
                  {/* 膠帶 */}
                  <div
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-20 h-6"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.4)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      backdropFilter: 'blur(2px)',
                    }}
                  />

                  <div className="flex justify-between items-start mb-4">
                    <span
                      className="text-xs font-bold bg-morandi-container px-2 py-1 border border-[var(--morandi-primary)] rounded-full"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                      SMALL GROUP
                    </span>
                    <svg
                      className="w-6 h-6 text-morandi-secondary"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                    </svg>
                  </div>

                  <h3
                    className="text-2xl font-bold mb-1"
                    style={{ fontFamily: "'Noto Serif TC', serif" }}
                  >
                    {priceTiers[0].name || priceTiers[0].label || '方案 A'}
                  </h3>
                  <p
                    className="text-xs text-morandi-secondary mb-6"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    {priceTiers[0].description || '專屬司導，行程彈性最大化'}
                  </p>

                  <div className="mb-6 border-y-2 border-dashed border-border py-4">
                    <div
                      className="text-4xl font-bold text-[#FF0080]"
                      style={{ fontFamily: "'Cinzel', serif" }}
                    >
                      {formatPrice(
                        typeof priceTiers[0].pricePerPerson === 'number'
                          ? priceTiers[0].pricePerPerson
                          : Number(priceTiers[0].pricePerPerson || priceTiers[0].price) || 0
                      )}
                    </div>
                    <div
                      className="text-xs text-morandi-secondary text-right"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                      TWD / 每人
                    </div>
                  </div>

                  {priceTiers[0].features && (
                    <ul
                      className="text-sm space-y-2 mb-6"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                      {priceTiers[0].features.map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-black rounded-full" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    className="w-full py-3 border-2 border-[var(--morandi-primary)] font-bold hover:bg-black hover:text-white transition-colors uppercase tracking-widest"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    {TOURS_LABELS.SELECT_2483}
                  </button>
                </motion.div>
              )}

              {/* OR 分隔 */}
              {priceTiers.length > 1 && (
                <div
                  className={`bg-[#FFEB3B] w-12 h-12 rounded-full border-2 border-[var(--morandi-primary)] flex items-center justify-center z-30 shadow-sm ${
                    isMobile ? '-mt-4 -mb-4' : 'md:-ml-6 md:-mr-6'
                  } relative`}
                  style={{ fontFamily: "'Permanent Marker', cursive" }}
                >
                  OR
                </div>
              )}

              {/* 第二個方案 */}
              {priceTiers[1] && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="w-full bg-[#121212] text-white border-2 border-[var(--morandi-primary)] p-6 transform rotate-1 hover:rotate-0 hover:z-20 transition-all duration-300 relative group"
                  style={{ boxShadow: '10px 10px 0px 0px rgba(0,0,0,1)' }}
                >
                  {/* 圖釘 */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#00E5FF] border border-[var(--morandi-primary)] shadow-sm z-20" />
                  {/* 膠帶 */}
                  <div
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-20 h-6 rotate-2"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      backdropFilter: 'blur(2px)',
                    }}
                  />

                  <div className="flex justify-between items-start mb-4">
                    <span
                      className="text-xs font-bold bg-morandi-primary text-morandi-secondary px-2 py-1 border border-border rounded-full"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                      FAMILY SUITE
                    </span>
                    <svg
                      className="w-6 h-6 text-morandi-secondary"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A2.01 2.01 0 0 0 18.06 7h-.12a2 2 0 0 0-1.9 1.37l-.86 2.58c1.08.6 1.82 1.73 1.82 3.05v8h3zm-7.5-10.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5S11 9.17 11 10s.67 1.5 1.5 1.5zM5.5 6c1.11 0 2-.89 2-2s-.89-2-2-2-2 .89-2 2 .89 2 2 2zm2 16v-7H9V9c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v6h1.5v7h4zm6.5 0v-4h1v-4c0-.82-.68-1.5-1.5-1.5h-2c-.82 0-1.5.68-1.5 1.5v4h1v4h3z" />
                    </svg>
                  </div>

                  <h3
                    className="text-2xl font-bold mb-1"
                    style={{ fontFamily: "'Noto Serif TC', serif" }}
                  >
                    {priceTiers[1].name || priceTiers[1].label || '方案 B'}
                  </h3>
                  <p
                    className="text-xs text-morandi-secondary mb-6"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    {priceTiers[1].description || '豪華九人座，空間更寬敞'}
                  </p>

                  <div className="mb-6 border-y-2 border-dashed border-border py-4">
                    <div
                      className="text-4xl font-bold text-[#C6FF00]"
                      style={{ fontFamily: "'Cinzel', serif" }}
                    >
                      {formatPrice(
                        typeof priceTiers[1].pricePerPerson === 'number'
                          ? priceTiers[1].pricePerPerson
                          : Number(priceTiers[1].pricePerPerson || priceTiers[1].price) || 0
                      )}
                    </div>
                    <div
                      className="text-xs text-morandi-secondary text-right"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                      TWD / 每人
                    </div>
                  </div>

                  {priceTiers[1].features && (
                    <ul
                      className="text-sm space-y-2 mb-6 text-morandi-secondary"
                      style={{ fontFamily: "'Space Mono', monospace" }}
                    >
                      {priceTiers[1].features.map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-[#C6FF00] rounded-full" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    className="w-full py-3 bg-[#C6FF00] text-black border-2 border-[var(--morandi-primary)] font-bold hover:bg-card transition-colors uppercase tracking-widest"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    {TOURS_LABELS.SELECT_2483}
                  </button>
                </motion.div>
              )}
            </div>
          </div>

          {/* 右側空白區域（領隊資訊獨立成另一個 section） */}
          {!isMobile && <div className="lg:col-span-5" />}
        </div>

        {/* 費用包含/不含 */}
        {pricingDetails && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`mt-16 grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'} gap-8`}
          >
            {/* 費用包含 */}
            <div
              className="bg-card border-2 border-[var(--morandi-primary)] p-6 transform -rotate-1"
              style={{ boxShadow: '6px 6px 0px 0px rgba(0,0,0,1)' }}
            >
              <h4
                className="font-bold text-xl mb-4 flex items-center gap-2 text-morandi-green"
                style={{ fontFamily: "'Permanent Marker', cursive" }}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                INCLUDED
              </h4>
              <ul className="space-y-2" style={{ fontFamily: "'Space Mono', monospace" }}>
                {pricingDetails.included_items
                  .filter(item => item.included)
                  .map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="w-1.5 h-1.5 bg-morandi-green rounded-full mt-2" />
                      {item.text}
                    </li>
                  ))}
              </ul>
            </div>

            {/* 費用不含 */}
            <div
              className="bg-card border-2 border-[var(--morandi-primary)] p-6 transform rotate-1"
              style={{ boxShadow: '6px 6px 0px 0px rgba(0,0,0,1)' }}
            >
              <h4
                className="font-bold text-xl mb-4 flex items-center gap-2 text-[#FF0080]"
                style={{ fontFamily: "'Permanent Marker', cursive" }}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
                NOT INCLUDED
              </h4>
              <ul className="space-y-2" style={{ fontFamily: "'Space Mono', monospace" }}>
                {pricingDetails.excluded_items
                  .filter(item => !item.included)
                  .map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="w-1.5 h-1.5 bg-[#FF0080] rounded-full mt-2" />
                      {item.text}
                    </li>
                  ))}
              </ul>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}
