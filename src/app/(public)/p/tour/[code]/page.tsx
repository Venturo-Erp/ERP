'use client'

/**
 * 公開行程頁面 - Tokyo Sakura 風格
 * 路由: /p/tour/[code]?ref=E001
 *
 * 特色：
 * - Sticky 日期導航（滾動自動高亮）
 * - 時間軸佈局
 * - 側邊欄報名卡片
 * - 底部業務資訊（從 ref 參數帶入）
 */

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  MapPin,
  Calendar,
  Users,
  Clock,
  Phone,
  Mail,
  Utensils,
  Hotel,
  Camera,
  Ship,
  TreePine,
  Building,
  Share2,
  Heart,
  CheckCircle,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { ModuleLoading } from '@/components/module-loading'
import { formatDate } from '@/lib/utils/format-date'

interface TourData {
  id: string
  code: string
  departure_date: string | null
  selling_price_per_person: number | null
  max_participants: number | null
  current_participants: number | null
  days_count: number | null
  airport_code: string | null
  workspace_id: string | null
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

interface EmployeeInfo {
  display_name: string | null
  email: string | null
  avatar_url: string | null
  employee_number: string | null
}

interface CompanyInfo {
  name: string
  phone: string
}

export default function PublicTourPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params)
  const searchParams = useSearchParams()
  const ref = searchParams.get('ref')

  const [tour, setTour] = useState<TourData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [heroImage, setHeroImage] = useState<string | null>(null)
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({ name: '旅行社', phone: '' })
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null)
  const [activeDay, setActiveDay] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      // 用 code 查 tour
      const { data: tourData, error } = await supabase
        .from('tours')
        .select(
          `
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
        `
        )
        .eq('code', code)
        .eq('is_active', true)
        .single()

      if (error || !tourData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const itineraryData = Array.isArray(tourData.itinerary)
        ? tourData.itinerary[0]
        : tourData.itinerary

      setTour({
        ...tourData,
        itinerary: itineraryData || null,
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

      // 載入業務資訊
      if (ref) {
        const { data: empData } = await supabase
          .from('employees')
          .select('display_name, email, avatar_url, employee_number')
          .or(`employee_number.eq.${ref},id.eq.${ref}`)
          .single()

        if (empData) {
          setEmployee(empData)
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [code, ref])

  // 滾動追蹤
  useEffect(() => {
    const handleScroll = () => {
      const dailyItinerary = tour?.itinerary?.daily_itinerary || []
      let current = 0

      dailyItinerary.forEach((_, index) => {
        const element = document.getElementById(`day${index + 1}`)
        if (element) {
          const rect = element.getBoundingClientRect()
          if (rect.top <= 200) {
            current = index
          }
        }
      })

      setActiveDay(current)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [tour])

  // 計算
  const daysCount = tour?.days_count || tour?.itinerary?.daily_itinerary?.length || 0
  const nightsCount = daysCount > 0 ? daysCount - 1 : 0
  const remainingSlots = (tour?.max_participants || 0) - (tour?.current_participants || 0)
  const dailyItinerary = tour?.itinerary?.daily_itinerary || []

  // Loading
  if (loading) {
    return <ModuleLoading fullscreen className="bg-background" />
  }

  // 404
  if (notFound || !tour) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-morandi-primary mb-4">找不到行程</h1>
          <p className="text-morandi-secondary mb-8">此行程不存在或已被移除</p>
          <Link href="/">
            <Button>返回首頁</Button>
          </Link>
        </div>
      </div>
    )
  }

  const itinerary = tour.itinerary

  // 取得活動圖標
  const getActivityIcon = (icon?: string) => {
    switch (icon) {
      case '🍽️':
      case '🍴':
        return <Utensils className="w-5 h-5" />
      case '🏨':
      case '🛏️':
        return <Hotel className="w-5 h-5" />
      case '📷':
      case '📸':
        return <Camera className="w-5 h-5" />
      case '🚢':
      case '⛵':
        return <Ship className="w-5 h-5" />
      case '🌳':
      case '🌲':
        return <TreePine className="w-5 h-5" />
      case '🏛️':
      case '🏢':
        return <Building className="w-5 h-5" />
      default:
        return <MapPin className="w-5 h-5" />
    }
  }

  return (
    <div className="min-h-screen bg-background text-morandi-primary">
      {/* Top Header */}
      <header className="bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
          <div className="text-xl font-bold tracking-tight text-public-primary">
            {companyInfo.name}
          </div>
          <nav className="hidden md:flex gap-8 items-center">
            {dailyItinerary.map((_, index) => (
              <a
                key={index}
                href={`#day${index + 1}`}
                className={`text-sm font-medium transition-all ${
                  activeDay === index
                    ? 'text-public-primary font-bold border-b-2 border-public-primary pb-1'
                    : 'text-morandi-secondary hover:text-public-primary'
                }`}
              >
                Day {index + 1}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Share2 className="w-5 h-5 text-morandi-secondary hover:text-public-primary cursor-pointer transition-all" />
            <Heart className="w-5 h-5 text-morandi-secondary hover:text-public-primary cursor-pointer transition-all" />
            <Link href={`/p/tour/${code}/register${ref ? `?ref=${ref}` : ''}`}>
              <Button className="bg-gradient-to-r from-public-primary to-public-accent text-white px-6 py-2 rounded-md text-sm hover:opacity-90">
                立即報名
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Sticky Day Navigation */}
      {dailyItinerary.length > 0 && (
        <nav className="sticky top-[72px] z-40 bg-card/60 backdrop-blur-md border-b border-border/20 py-2">
          <div
            className="max-w-7xl mx-auto px-6 flex justify-center md:justify-start gap-2 overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            {dailyItinerary.map((day, index) => (
              <a
                key={index}
                href={`#day${index + 1}`}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeDay === index
                    ? 'bg-public-primary text-white font-bold'
                    : 'text-morandi-primary hover:bg-morandi-container hover:text-public-primary'
                }`}
              >
                Day {index + 1}
              </a>
            ))}
          </div>
        </nav>
      )}

      {/* Hero Section */}
      <section className="relative h-[500px] md:h-[614px] w-full overflow-hidden flex items-end pb-24 px-8 md:px-24">
        {heroImage ? (
          <img
            src={heroImage}
            alt={itinerary?.title || '行程封面'}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-public-primary via-public-accent to-public-primary" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-public-primary/70 to-transparent"></div>
        <div className="relative z-10 max-w-4xl">
          {daysCount > 0 && (
            <span className="bg-morandi-green text-white px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-4 inline-block">
              {daysCount} 天 {nightsCount} 夜
            </span>
          )}
          <h1 className="text-white text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight">
            {itinerary?.title || tour.code}
          </h1>
          {itinerary?.subtitle && (
            <p className="text-white/80 text-lg mt-4 max-w-2xl">{itinerary.subtitle}</p>
          )}
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-6 py-12 md:py-24 flex flex-col md:flex-row gap-12 relative">
        {/* Main Itinerary Content */}
        <div className="flex-1 space-y-24 md:space-y-32">
          {dailyItinerary.length > 0 ? (
            dailyItinerary.map((day, index) => (
              <section key={index} id={`day${index + 1}`} className="relative pl-12 scroll-mt-48">
                {/* Timeline */}
                <div className="absolute left-0 top-0 bottom-0 w-px bg-morandi-container ml-4"></div>
                <div className="absolute left-0 top-2 w-8 h-8 rounded-full bg-public-accent flex items-center justify-center">
                  <span className="text-white text-xs font-bold">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                {/* Day Title */}
                <h2 className="text-2xl md:text-3xl font-bold text-public-primary mb-8 tracking-tight">
                  {day.title}
                </h2>

                <div className="space-y-12">
                  {/* Activities */}
                  {day.activities &&
                    day.activities.map((activity, actIdx) => (
                      <div key={actIdx} className="group">
                        <div className="flex items-center gap-4 mb-4">
                          <span className="text-public-secondary">
                            {getActivityIcon(activity.icon)}
                          </span>
                          <span className="text-sm font-bold tracking-widest text-public-secondary uppercase">
                            {activity.icon || '景點'}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold mb-4">{activity.title}</h3>
                        {activity.description && (
                          <p className="text-morandi-primary leading-relaxed">
                            {activity.description}
                          </p>
                        )}
                      </div>
                    ))}

                  {/* Meals */}
                  {day.meals && (day.meals.breakfast || day.meals.lunch || day.meals.dinner) && (
                    <div className="p-6 bg-morandi-gold/10 rounded-xl border border-morandi-gold/20">
                      <div className="flex items-center gap-3 mb-3">
                        <Utensils className="w-5 h-5 text-morandi-gold" />
                        <span className="text-sm font-bold text-morandi-primary uppercase tracking-widest">
                          餐食安排
                        </span>
                      </div>
                      <div className="text-sm text-morandi-primary space-y-1">
                        {day.meals.breakfast && <p>早餐：{day.meals.breakfast}</p>}
                        {day.meals.lunch && <p>午餐：{day.meals.lunch}</p>}
                        {day.meals.dinner && <p>晚餐：{day.meals.dinner}</p>}
                      </div>
                    </div>
                  )}

                  {/* Accommodation */}
                  {day.accommodation && (
                    <div className="p-6 bg-morandi-container/50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <Hotel className="w-5 h-5 text-morandi-muted" />
                        <span className="text-morandi-primary font-medium">
                          住宿：{day.accommodation}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            ))
          ) : (
            <section className="text-center py-16">
              <MapPin className="w-12 h-12 mx-auto text-morandi-muted mb-4" />
              <h2 className="text-xl font-bold text-morandi-muted mb-2">行程規劃中</h2>
              <p className="text-morandi-muted">詳細行程將於近期更新</p>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="md:w-[380px]">
          <div className="sticky top-40 space-y-6">
            {/* Price Card */}
            <div className="bg-card p-8 rounded-2xl shadow-sm border border-border">
              <div className="text-morandi-secondary text-xs font-bold tracking-widest uppercase mb-2">
                行程價格
              </div>
              <div className="flex items-baseline gap-2 mb-8">
                {tour.selling_price_per_person ? (
                  <>
                    <span className="text-4xl font-extrabold text-public-primary">
                      TWD {tour.selling_price_per_person.toLocaleString()}
                    </span>
                    <span className="text-morandi-muted text-sm">/ 人</span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-morandi-secondary">洽詢報價</span>
                )}
              </div>

              <div className="space-y-3">
                <Link
                  href={`/p/tour/${code}/register${ref ? `?ref=${ref}` : ''}`}
                  className="block"
                >
                  <Button className="w-full bg-gradient-to-r from-public-primary to-public-accent text-white py-4 rounded-xl font-bold hover:shadow-lg transition-all">
                    立即預約
                  </Button>
                </Link>
                {companyInfo.phone && (
                  <a href={`tel:${companyInfo.phone}`} className="block">
                    <Button
                      variant="soft-gold"
                      className="w-full border-public-primary text-public-primary py-4 rounded-xl font-bold hover:bg-morandi-container/50 transition-all"
                    >
                      諮詢專屬顧問
                    </Button>
                  </a>
                )}
              </div>

              {/* Info */}
              <div className="mt-8 pt-8 border-t border-border space-y-4">
                {tour.departure_date && (
                  <div className="flex items-center gap-3 text-sm text-morandi-primary">
                    <Calendar className="w-4 h-4 text-morandi-green" />
                    <span>
                      出發日期：{formatDate(tour.departure_date)}
                    </span>
                  </div>
                )}
                {tour.max_participants && (
                  <div className="flex items-center gap-3 text-sm text-morandi-primary">
                    <Users className="w-4 h-4 text-morandi-green" />
                    <span>剩餘名額：{remainingSlots > 0 ? `${remainingSlots} 位` : '已額滿'}</span>
                  </div>
                )}
                {daysCount > 0 && (
                  <div className="flex items-center gap-3 text-sm text-morandi-primary">
                    <Clock className="w-4 h-4 text-morandi-green" />
                    <span>
                      行程天數：{daysCount} 天 {nightsCount} 夜
                    </span>
                  </div>
                )}
              </div>

              {/* Itinerary Summary */}
              {dailyItinerary.length > 0 && (
                <div className="mt-8 pt-8 border-t border-border">
                  <div className="text-xs font-bold text-morandi-secondary uppercase tracking-widest mb-4">
                    行程摘要
                  </div>
                  <ul className="space-y-3">
                    {dailyItinerary.map((day, idx) => (
                      <li key={idx} className="flex gap-3 text-sm">
                        <span className="text-public-secondary font-bold">D{idx + 1}</span>
                        <span className="text-morandi-primary truncate">{day.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Features */}
            <div className="bg-public-primary p-6 rounded-2xl text-white">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-5 h-5 text-morandi-green" />
                <span className="font-bold">專屬服務</span>
              </div>
              <ul className="text-sm text-white/70 space-y-2">
                <li>• 私人機場接送服務</li>
                <li>• 專業中文嚮導隨行</li>
                <li>• 精選優質住宿</li>
                <li>• 旅遊平安保險</li>
              </ul>
            </div>
          </div>
        </aside>
      </main>

      {/* Footer with Employee Info */}
      <footer className="bg-morandi-container/50 border-t border-border py-12 mt-24">
        <div className="max-w-7xl mx-auto px-8">
          {/* Employee Card */}
          {employee && (
            <div className="bg-card rounded-2xl p-8 shadow-sm border border-border mb-8 max-w-xl mx-auto">
              <div className="text-center mb-6">
                <span className="text-xs font-bold text-morandi-secondary uppercase tracking-widest">
                  您的專屬顧問
                </span>
              </div>
              <div className="flex items-center gap-6">
                {employee.avatar_url ? (
                  <img
                    src={employee.avatar_url}
                    alt={employee.display_name || ''}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-public-primary flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-public-primary">
                    {employee.display_name || '專屬顧問'}
                  </h3>
                  {employee.employee_number && (
                    <p className="text-sm text-morandi-secondary mb-2">
                      員工編號：{employee.employee_number}
                    </p>
                  )}
                  {employee.email && (
                    <a
                      href={`mailto:${employee.email}`}
                      className="flex items-center gap-2 text-sm text-public-secondary hover:underline mt-3"
                    >
                      <Mail className="w-4 h-4" />
                      {employee.email}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Company Info */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-lg font-bold text-public-primary">{companyInfo.name}</div>
            {companyInfo.phone && (
              <a
                href={`tel:${companyInfo.phone}`}
                className="flex items-center gap-2 text-morandi-secondary hover:text-public-primary"
              >
                <Phone className="w-4 h-4" />
                {companyInfo.phone}
              </a>
            )}
            <div className="text-morandi-muted text-xs">
              © {new Date().getFullYear()} {companyInfo.name}. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
