'use client'

/**
 * 公開行程頁面 - Executive Terminal 風格
 * 路由: /p/tour/[code]
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { 
  MapPin, 
  Calendar, 
  Users, 
  Clock,
  ChevronLeft,
  Phone,
  Utensils,
  Hotel,
  Plane,
  Car,
  Shield,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase/client'

interface TourData {
  id: string
  code: string
  departure_date: string | null
  selling_price_per_person: number | null
  max_participants: number | null
  current_participants: number | null
  days_count: number | null
  airport_code: string | null
  itinerary: {
    id: string
    title: string | null
    subtitle: string | null
    daily_itinerary: DailyItinerary[] | null
    hotels: HotelInfo[] | null
  } | null
}

interface DailyItinerary {
  dayLabel: string
  title: string
  description?: string
  highlight?: string
  activities?: Activity[]
  meals?: {
    breakfast?: string
    lunch?: string
    dinner?: string
  }
  accommodation?: string
  images?: string[]
}

interface Activity {
  title: string
  description?: string
  icon?: string
  attraction_id?: string
}

interface HotelInfo {
  name: string
  nights?: number
  description?: string
  image_url?: string
}

interface CompanyInfo {
  name: string
  phone: string
}

export default function PublicTourPage({ 
  params 
}: { 
  params: Promise<{ code: string }> 
}) {
  const { code } = use(params)
  
  const [tour, setTour] = useState<TourData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [heroImage, setHeroImage] = useState<string | null>(null)
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({ name: '旅行社', phone: '' })

  useEffect(() => {
    const fetchData = async () => {
      // 用 code 查 tour
      const { data: tourData, error } = await supabase
        .from('tours')
        .select(`
          id,
          code,
          departure_date,
          selling_price_per_person,
          max_participants,
          current_participants,
          days_count,
          airport_code,
          workspace_id,
          itinerary:itineraries (
            id,
            title,
            subtitle,
            daily_itinerary,
            hotels
          )
        `)
        .eq('code', code)
        .eq('is_deleted', false)
        .single()

      if (error || !tourData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      // 處理 itinerary 可能是陣列的情況
      const itineraryData = Array.isArray(tourData.itinerary) 
        ? tourData.itinerary[0] 
        : tourData.itinerary

      setTour({
        ...tourData,
        itinerary: itineraryData || null
      } as TourData)

      // 載入公司資訊
      if (tourData.workspace_id) {
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('legal_name, phone')
          .eq('id', tourData.workspace_id)
          .single()
        
        if (workspace) {
          setCompanyInfo({
            name: workspace.legal_name || '旅行社',
            phone: workspace.phone || '',
          })
        }
      }

      // 載入 Hero 圖片
      if (tourData.airport_code) {
        const { data: imageData } = await supabase
          .from('airport_images')
          .select('image_url')
          .eq('airport_code', tourData.airport_code)
          .eq('is_default', true)
          .single()
        
        if (imageData?.image_url) {
          setHeroImage(imageData.image_url)
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [code])

  // 計算天數
  const daysCount = tour?.days_count || tour?.itinerary?.daily_itinerary?.length || 0
  const nightsCount = daysCount > 0 ? daysCount - 1 : 0

  // 計算剩餘名額
  const remainingSlots = (tour?.max_participants || 0) - (tour?.current_participants || 0)

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    )
  }

  // 404
  if (notFound || !tour) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">找不到行程</h1>
          <p className="text-gray-600 mb-8">此行程不存在或已被移除</p>
          <Link href="/">
            <Button>返回首頁</Button>
          </Link>
        </div>
      </div>
    )
  }

  const itinerary = tour.itinerary
  const dailyItinerary = itinerary?.daily_itinerary || []

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#191c1d]">
      {/* Top Nav */}
      <nav className="flex justify-between items-center px-8 h-16 w-full bg-slate-50 border-b border-slate-200/50 sticky top-0 z-50">
        <Link href="/" className="text-xl font-bold tracking-tight text-blue-900">
          {companyInfo.name}
        </Link>
        {companyInfo.phone && (
          <a 
            href={`tel:${companyInfo.phone}`}
            className="flex items-center gap-2 text-slate-600 hover:text-blue-900 transition-colors"
          >
            <Phone size={16} />
            <span className="text-sm">{companyInfo.phone}</span>
          </a>
        )}
      </nav>

      <main className="max-w-[1440px] mx-auto">
        {/* Hero Section */}
        <section className="relative w-full h-[500px] md:h-[614px] overflow-hidden">
          {heroImage ? (
            <img 
              src={heroImage} 
              alt={itinerary?.title || '行程封面'}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#00113a]/90 via-[#00113a]/40 to-transparent flex items-end p-8 md:p-12">
            <div className="max-w-4xl">
              {/* 標籤 */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {daysCount > 0 && (
                  <span className="bg-white/10 backdrop-blur-md text-white px-3 py-1 rounded-sm text-xs font-bold tracking-widest uppercase">
                    {daysCount} 天 {nightsCount} 夜
                  </span>
                )}
                {tour.departure_date && (
                  <span className="bg-emerald-600/80 backdrop-blur-md text-white px-3 py-1 rounded-sm text-xs font-bold tracking-widest uppercase">
                    {new Date(tour.departure_date).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })} 出發
                  </span>
                )}
              </div>
              
              {/* 標題 */}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-4">
                {itinerary?.title || tour.code}
              </h1>
              
              {/* 副標題 */}
              {itinerary?.subtitle && (
                <p className="text-white/80 text-lg max-w-2xl">
                  {itinerary.subtitle}
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 px-4 md:px-8 py-12 md:py-16">
          {/* Left Column: Details */}
          <div className="flex-1 space-y-12 md:space-y-16">
            
            {/* 每日行程 */}
            {dailyItinerary.length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-[#00113a]">行程詳情</h2>
                  <div className="h-px flex-1 bg-slate-200"></div>
                </div>
                
                <div className="space-y-8 md:space-y-12">
                  {dailyItinerary.map((day, index) => (
                    <div key={index} className="flex gap-4 md:gap-8 group">
                      {/* 日期圓圈 + 連接線 */}
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#00113a] text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        {index < dailyItinerary.length - 1 && (
                          <div className="w-0.5 h-full bg-slate-200 mt-4"></div>
                        )}
                      </div>
                      
                      {/* 內容 */}
                      <div className="pb-8 flex-1">
                        <h3 className="text-lg md:text-xl font-bold text-[#191c1d] mb-2">
                          {day.dayLabel}: {day.title}
                        </h3>
                        
                        {(day.description || day.highlight) && (
                          <p className="text-[#444650] leading-relaxed mb-4">
                            {day.description || day.highlight}
                          </p>
                        )}
                        
                        {/* 活動列表 */}
                        {day.activities && day.activities.length > 0 && (
                          <div className="space-y-2 mb-4">
                            {day.activities.map((activity, actIdx) => (
                              <div key={actIdx} className="flex items-start gap-2">
                                <span className="text-sm">{activity.icon || '📍'}</span>
                                <span className="text-sm text-[#444650]">{activity.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* 餐食 */}
                        {day.meals && (day.meals.breakfast || day.meals.lunch || day.meals.dinner) && (
                          <div className="bg-slate-50 rounded-xl p-4 mb-4">
                            <div className="flex items-center gap-2 text-sm text-[#444650]">
                              <Utensils size={14} className="text-amber-600" />
                              <span className="font-medium">餐食：</span>
                              {[
                                day.meals.breakfast && `早：${day.meals.breakfast}`,
                                day.meals.lunch && `午：${day.meals.lunch}`,
                                day.meals.dinner && `晚：${day.meals.dinner}`,
                              ].filter(Boolean).join(' / ')}
                            </div>
                          </div>
                        )}
                        
                        {/* 住宿 */}
                        {day.accommodation && (
                          <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-sm text-[#444650]">
                              <Hotel size={14} className="text-blue-600" />
                              <span className="font-medium">住宿：</span>
                              {day.accommodation}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 空狀態 */}
            {dailyItinerary.length === 0 && (
              <section className="text-center py-16">
                <MapPin size={48} className="mx-auto text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-400 mb-2">行程規劃中</h2>
                <p className="text-slate-400">詳細行程將於近期更新</p>
              </section>
            )}

            {/* 住宿資訊 */}
            {itinerary?.hotels && itinerary.hotels.length > 0 && (
              <section className="bg-slate-50 rounded-2xl p-6 md:p-10">
                <h2 className="text-xl md:text-2xl font-bold text-[#00113a] mb-6 flex items-center gap-2">
                  <Hotel size={24} />
                  住宿安排
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {itinerary.hotels.map((hotel, idx) => (
                    <div key={idx} className="flex gap-4">
                      {hotel.image_url && (
                        <img 
                          src={hotel.image_url} 
                          alt={hotel.name}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <h4 className="font-bold">{hotel.name}</h4>
                        {hotel.nights && (
                          <p className="text-sm text-[#444650]">{hotel.nights} 晚</p>
                        )}
                        {hotel.description && (
                          <p className="text-xs text-[#757682] mt-1">{hotel.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Registration Card */}
          <div className="lg:w-96">
            <div className="sticky top-24 bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-slate-100">
              {/* 價格 */}
              <div className="mb-6">
                <p className="text-[#444650] text-sm font-semibold uppercase tracking-widest">每位起價</p>
                <div className="flex items-baseline gap-2">
                  {tour.selling_price_per_person ? (
                    <>
                      <span className="text-3xl md:text-4xl font-extrabold text-[#00113a]">
                        TWD {tour.selling_price_per_person.toLocaleString()}
                      </span>
                      <span className="text-[#444650] text-sm">/ 人</span>
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-[#444650]">洽詢報價</span>
                  )}
                </div>
              </div>
              
              {/* 資訊列表 */}
              <div className="space-y-4 mb-8">
                {tour.departure_date && (
                  <div className="flex items-center gap-3 text-sm text-[#444650]">
                    <Calendar size={18} className="text-emerald-600" />
                    <span>出發日期: {new Date(tour.departure_date).toLocaleDateString('zh-TW')}</span>
                  </div>
                )}
                {tour.max_participants && (
                  <div className="flex items-center gap-3 text-sm text-[#444650]">
                    <Users size={18} className="text-emerald-600" />
                    <span>剩餘名額: {remainingSlots > 0 ? `${remainingSlots} 位` : '已額滿'}</span>
                  </div>
                )}
                {daysCount > 0 && (
                  <div className="flex items-center gap-3 text-sm text-[#444650]">
                    <Clock size={18} className="text-emerald-600" />
                    <span>行程天數: {daysCount} 天 {nightsCount} 夜</span>
                  </div>
                )}
              </div>
              
              {/* 按鈕 */}
              <div className="space-y-4">
                <Link href={`/p/tour/${code}/register`} className="block">
                  <Button 
                    className="w-full bg-gradient-to-r from-[#00113a] to-[#002366] text-white py-6 rounded-lg font-bold text-lg shadow-lg hover:opacity-90 transition-all"
                    size="lg"
                  >
                    立即報名
                  </Button>
                </Link>
                {companyInfo.phone && (
                  <a href={`tel:${companyInfo.phone}`} className="block">
                    <Button 
                      variant="outline"
                      className="w-full py-6 rounded-lg font-bold"
                      size="lg"
                    >
                      諮詢專屬顧問
                    </Button>
                  </a>
                )}
              </div>
              
              {/* 小字 */}
              <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-xs text-[#757682] leading-relaxed text-center">
                  預訂受條款及細則約束。價格包含所有稅費與服務費。
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 mt-20">
        <div className="flex flex-col md:flex-row justify-between items-center py-8 px-8 max-w-[1440px] mx-auto">
          <div className="text-slate-500 text-sm">
            © {new Date().getFullYear()} {companyInfo.name}. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
