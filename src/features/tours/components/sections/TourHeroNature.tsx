'use client'

import { MapPin } from 'lucide-react'
import { isHtmlString, cleanTiptapHtml } from '@/lib/utils/rich-text'
import type { TourPageData } from '@/features/tours/types/tour-display.types'

// 渲染可能包含 HTML 的文字（保留內聯樣式）
function RichText({ html, className }: { html: string | null | undefined; className?: string }) {
  if (!html) return null
  if (isHtmlString(html)) {
    const cleanHtml = cleanTiptapHtml(html)
    return <span className={className} dangerouslySetInnerHTML={{ __html: cleanHtml }} />
  }
  return <span className={className}>{html}</span>
}

interface TourHeroNatureProps {
  data: TourPageData
  viewMode: 'desktop' | 'mobile'
}

/**
 * Nature 風格 Hero Section
 * 日式極簡風格：垂直文字 + 單張大圖 + 和紙紋理背景
 * 參考：香港靜謐之旅設計
 */
export function TourHeroNature({ data, viewMode }: TourHeroNatureProps) {
  const isMobile = viewMode === 'mobile'

  return (
    <section
      className={`relative overflow-hidden bg-[#f9f9f7] ${isMobile ? 'min-h-0' : 'min-h-[85vh]'}`}
    >
      {/* 和紙紋理背景 */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-60 mix-blend-multiply"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 裝飾同心圓 - 右上 */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full border border-[#30abe8]/5 pointer-events-none z-0" />
      <div className="absolute top-[-5%] right-[-5%] w-[40vw] h-[40vw] rounded-full border border-[#30abe8]/10 pointer-events-none z-0" />

      {/* 裝飾同心圓 - 左下 */}
      <div className="absolute bottom-[10%] left-[-10%] w-[30vw] h-[30vw] rounded-full border border-[#30abe8]/5 pointer-events-none z-0" />

      {/* 主要內容 */}
      <div
        className={`relative z-10 h-full ${isMobile ? 'px-3 py-4' : 'px-8 md:px-12 pt-12 pb-20'}`}
      >
        <div
          className={`max-w-[1200px] mx-auto flex flex-row ${isMobile ? 'gap-3 items-stretch' : 'gap-12 md:gap-24 items-center min-h-[75vh]'}`}
        >
          {/* 左側：垂直文字區塊 */}
          <div
            className={`flex ${isMobile ? 'gap-1 shrink-0' : 'gap-4 md:gap-6 h-[500px]'} justify-center`}
          >
            {/* 向下箭頭 */}
            {!isMobile && (
              <div className="flex flex-col gap-8 justify-end pb-8">
                <button className="w-12 h-12 rounded-full border border-[#30abe8]/30 text-[#30abe8] flex items-center justify-center hover:bg-[#30abe8] hover:text-white transition-all duration-300 group">
                  <svg
                    className="w-5 h-5 group-hover:translate-y-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* 主標題 - 垂直排列（從左到右換行） */}
            <h1
              className={`text-[#2c3e50] font-black tracking-[0.1em] leading-normal select-none ${
                isMobile ? 'text-lg' : 'text-4xl md:text-6xl'
              }`}
              style={{
                writingMode: 'vertical-lr',
                textOrientation: 'mixed',
                fontFamily: "'Noto Sans TC', sans-serif",
              }}
            >
              <RichText html={data.title} />
            </h1>

            {/* 副標題 - 獨立一行，字體小 40% */}
            {data.subtitle && (
              <h2
                className={`text-[#30abe8] font-bold tracking-[0.1em] leading-normal select-none ${
                  isMobile ? 'text-sm' : 'text-2xl md:text-4xl'
                }`}
                style={{
                  writingMode: 'vertical-lr',
                  textOrientation: 'mixed',
                  fontFamily: "'Noto Sans TC', sans-serif",
                }}
              >
                <RichText html={data.subtitle} />
              </h2>
            )}

            {/* 描述 - 垂直排列（從左到右換行）- 手機版隱藏 */}
            {data.description && !isMobile && (
              <p
                className="text-[#637c88] font-light tracking-[0.2em] leading-loose select-none border-l border-[#30abe8]/20 text-sm md:text-base pl-6 md:pl-8 pt-12"
                style={{
                  writingMode: 'vertical-lr',
                  textOrientation: 'mixed',
                }}
              >
                <RichText html={data.description} />
              </p>
            )}
          </div>

          {/* 右側：主圖區塊 */}
          <div className={`relative group ${isMobile ? 'flex-1' : 'flex-1 w-full'}`}>
            <div
              className={`relative w-full overflow-hidden shadow-lg shadow-[#30abe8]/10 ${
                isMobile
                  ? 'aspect-[4/5] rounded-t-[30px] rounded-b-lg'
                  : 'aspect-[3/4] max-h-[650px] rounded-t-[100px] rounded-b-lg'
              }`}
            >
              {/* 藍色疊加層 */}
              <div className="absolute inset-0 bg-[#30abe8]/10 mix-blend-overlay z-10" />

              {/* 主圖 */}
              {data.coverImage ? (
                <img
                  src={data.coverImage}
                  alt={data.title}
                  className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#667a6e] via-[#8b9d83] to-morandi-gold transition-transform duration-[2s] group-hover:scale-105" />
              )}

              {/* 底部標籤區：位置 + tagline */}
              <div
                className={`absolute z-20 flex items-center gap-2 ${
                  isMobile ? 'bottom-4 left-4' : 'bottom-6 left-6'
                }`}
              >
                {/* 位置標籤 */}
                <div
                  className={`flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-white/50 rounded-full ${
                    isMobile ? 'px-3 py-1.5' : 'px-4 py-2'
                  }`}
                >
                  <MapPin size={isMobile ? 14 : 18} className="text-[#30abe8]" />
                  <span
                    className={`font-bold tracking-wider text-[#2c3e50] uppercase ${isMobile ? 'text-[10px]' : 'text-xs'}`}
                  >
                    {data.city || data.country || 'Destination'}
                  </span>
                </div>
                {/* Tagline 標籤 */}
                {data.tagline && (
                  <div
                    className={`bg-card/80 backdrop-blur-sm border border-white/50 rounded-full ${
                      isMobile ? 'px-3 py-1.5' : 'px-4 py-2'
                    }`}
                  >
                    <span
                      className={`font-medium tracking-wider text-[#2c3e50] ${isMobile ? 'text-[10px]' : 'text-xs'}`}
                    >
                      <RichText html={data.tagline} />
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 裝飾圓 - 圖片後方 */}
            <div
              className={`absolute rounded-full bg-[#30abe8]/5 -z-10 ${
                isMobile ? '-top-6 -right-6 w-20 h-20' : '-top-10 -right-10 w-32 h-32'
              }`}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
