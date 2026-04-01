'use client'

import { MapPin, Calendar } from 'lucide-react'
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

interface TourHeroGeminiProps {
  data: TourPageData
  viewMode: 'desktop' | 'mobile'
}

/**
 * Gemini 風格 Hero Section
 * 480px 高度，底部對齊文字，金色主題
 */
export function TourHeroGemini({ data, viewMode }: TourHeroGeminiProps) {
  // 計算天數（從 departureDate 解析）
  const days = 0 // 這個資訊可能需要從其他地方取得

  return (
    <section className="relative h-[480px] overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: data.coverImage
            ? `url('${data.coverImage}')`
            : 'linear-gradient(135deg, #667a6e 0%, #8b9d83 50%, #c9aa7c 100%)',
        }}
      />
      {/* Elegant Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-morandi-primary/90 via-[#3a3633]/40 to-transparent" />

      {/* Subtle Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      {/* Content */}
      <div
        className={`relative h-full flex flex-col justify-end ${
          viewMode === 'mobile' ? 'p-4' : 'p-8 md:p-12'
        } text-white max-w-5xl mx-auto`}
      >
        {/* Brand Tag */}
        <div className="mb-4">
          <span className="inline-flex items-center gap-2 bg-morandi-gold text-morandi-primary text-xs font-bold px-5 py-2 rounded-full tracking-wider">
            VENTURO
          </span>
        </div>

        {/* Tagline */}
        {data.tagline && (
          <p
            className={`text-morandi-gold font-medium mb-2 tracking-wide ${
              viewMode === 'mobile' ? 'text-xs' : 'text-sm md:text-base'
            }`}
          >
            <RichText html={data.tagline} />
          </p>
        )}

        {/* Title */}
        <h1
          className={`font-bold mb-3 tracking-wide leading-tight ${
            viewMode === 'mobile' ? 'text-2xl' : 'text-3xl md:text-5xl'
          }`}
        >
          <RichText html={data.title || '探索世界的美好'} />
        </h1>

        {/* Subtitle / Description */}
        <p
          className={`text-white/90 mb-6 whitespace-pre-line max-w-2xl leading-relaxed font-light ${
            viewMode === 'mobile' ? 'text-sm' : 'text-lg md:text-xl'
          }`}
        >
          <RichText html={data.subtitle || data.description || '每一次旅行，都是一場心靈的冒險'} />
        </p>

        {/* Meta Info Bar */}
        <div
          className={`flex flex-wrap items-center gap-4 ${viewMode === 'mobile' ? 'gap-2' : 'gap-6'} text-sm`}
        >
          {data.country && (
            <div
              className={`flex items-center gap-2 bg-card/10 backdrop-blur-sm rounded-full ${
                viewMode === 'mobile' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2'
              }`}
            >
              <MapPin size={viewMode === 'mobile' ? 12 : 16} className="text-morandi-gold" />
              <span>
                {data.country}
                {data.city && ` · ${data.city}`}
              </span>
            </div>
          )}
          {data.departureDate && (
            <div
              className={`flex items-center gap-2 bg-card/10 backdrop-blur-sm rounded-full ${
                viewMode === 'mobile' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2'
              }`}
            >
              <Calendar size={viewMode === 'mobile' ? 12 : 16} className="text-morandi-gold" />
              <span>{data.departureDate}</span>
            </div>
          )}
          {data.tourCode && (
            <div
              className={`flex items-center gap-2 bg-card/10 backdrop-blur-sm rounded-full ${
                viewMode === 'mobile' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2'
              }`}
            >
              <span>{data.tourCode}</span>
            </div>
          )}
          {data.price && (
            <div
              className={`bg-morandi-gold text-morandi-primary font-bold rounded-full ${
                viewMode === 'mobile' ? 'px-3 py-1.5 text-xs' : 'px-5 py-2'
              }`}
            >
              <span>
                NT$ {data.price}
                {data.priceNote ? ` ${data.priceNote}` : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
