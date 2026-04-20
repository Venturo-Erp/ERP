'use client'

import { use, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { BookingDialog } from './components/BookingDialog'
import { logger } from '@/lib/utils/logger'
import { ModuleLoading } from '@/components/module-loading'

interface Itinerary {
  id: string
  tour_id: string
  title: string
  subtitle?: string
  tour_code?: string
  daily_itinerary?: Array<{
    date?: string
    dayLabel?: string
    title?: string
    description?: string
    breakfast?: string
    lunch?: string
    dinner?: string
    accommodation?: string
  }>
}

interface Employee {
  id: string
  display_name?: string
  name?: string
  email?: string
  employee_number?: string
}

export default function PublicItineraryPage({ params }: { params: Promise<{ tourCode: string }> }) {
  const { tourCode } = use(params)
  const searchParams = useSearchParams()
  const salesPersonRef = searchParams.get('ref')

  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [salesPerson, setSalesPerson] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [isBookingOpen, setIsBookingOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. 查詢旅遊團
        const tourRes = await fetch(`/api/tours/by-code/${tourCode}`)
        if (!tourRes.ok) {
          setLoading(false)
          return
        }
        const tour = await tourRes.json()

        // 2. 查詢行程表
        const itineraryRes = await fetch(`/api/itineraries/by-tour/${tour.id}`)
        if (!itineraryRes.ok) {
          setLoading(false)
          return
        }
        const itineraryData = await itineraryRes.json()
        setItinerary(itineraryData)

        // 3. 查詢業務資訊
        if (salesPersonRef) {
          const empRes = await fetch(`/api/employees/by-ref/${salesPersonRef}`)
          if (empRes.ok) {
            const emp = await empRes.json()
            setSalesPerson(emp)
          }
        }
      } catch (error) {
        logger.error('載入失敗:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [tourCode, salesPersonRef])

  if (loading) {
    return <ModuleLoading fullscreen />
  }

  if (!itinerary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-morandi-primary mb-2">找不到行程</h1>
          <p className="text-morandi-secondary">此行程可能已被刪除或連結錯誤</p>
        </div>
      </div>
    )
  }

  const dailyItinerary = itinerary.daily_itinerary || []

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* TopNavBar */}
        <nav className="fixed top-0 w-full z-50 bg-morandi-container/50/80 backdrop-blur-md">
          <div className="flex justify-between items-center px-8 py-4 max-w-screen-2xl mx-auto">
            <div className="text-2xl font-serif tracking-tight text-morandi-primary">
              Corner Travel Collection
            </div>
            <button
              onClick={() => setIsBookingOpen(true)}
              className="bg-morandi-primary text-white px-6 py-2 rounded-lg font-medium hover:opacity-80 transition-all"
            >
              我要報名
            </button>
          </div>
        </nav>

        {/* Hero */}
        <div className="pt-32 pb-12 px-6 md:px-12 max-w-7xl mx-auto">
          <p className="text-morandi-primary font-medium tracking-widest uppercase text-xs mb-4">
            {itinerary.tour_code || tourCode}
          </p>
          <h1 className="text-5xl md:text-6xl text-morandi-primary tracking-tight leading-tight mb-6 font-serif">
            {itinerary.title}
          </h1>
          {itinerary.subtitle && (
            <p className="text-morandi-secondary leading-relaxed text-lg">{itinerary.subtitle}</p>
          )}
        </div>

        {/* Day by Day 行程 */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="flex items-center justify-between mb-16">
            <div>
              <span className="text-public-muted font-serif italic mb-2 block">Day by Day</span>
              <h2 className="text-4xl font-serif font-medium text-morandi-primary">每日行程詳情</h2>
            </div>
          </div>

          <div className="space-y-12">
            {dailyItinerary.map((day, index) => (
              <article key={index} className="bg-card rounded-3xl shadow-lg overflow-hidden group">
                <div className="grid lg:grid-cols-12">
                  {/* Day Number */}
                  <div className="lg:col-span-2 bg-morandi-primary p-8 text-white flex flex-col justify-between items-start relative overflow-hidden">
                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-9xl font-serif font-bold text-white/5 select-none">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <span className="inline-block px-2 py-1 mb-2 border border-white/30 text-[10px] tracking-widest uppercase">
                        {day.date || ''}
                      </span>
                      <h3 className="text-5xl font-serif font-medium">{day.dayLabel}</h3>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="lg:col-span-7 p-8 lg:p-10 border-r border-border">
                    <h3 className="text-2xl font-bold text-morandi-primary mb-6">{day.title}</h3>
                    <p className="text-morandi-secondary leading-loose mb-8">{day.description}</p>
                  </div>

                  {/* Dining & Stay */}
                  <div className="lg:col-span-3 bg-morandi-container/50 p-8 flex flex-col justify-center space-y-8">
                    {(day.breakfast || day.lunch || day.dinner) && (
                      <div className="relative pl-6 border-l border-border">
                        <span className="absolute -left-1.5 top-0 w-3 h-3 bg-public-muted rounded-full border-2 border-white"></span>
                        <h5 className="text-xs font-bold text-morandi-secondary uppercase tracking-widest mb-3">
                          Dining
                        </h5>
                        <div className="space-y-2">
                          {day.breakfast && (
                            <div className="flex justify-between text-sm">
                              <span className="text-morandi-secondary">Breakfast</span>
                              <span className="font-medium">{day.breakfast}</span>
                            </div>
                          )}
                          {day.lunch && (
                            <div className="flex justify-between text-sm">
                              <span className="text-morandi-secondary">Lunch</span>
                              <span className="font-medium">{day.lunch}</span>
                            </div>
                          )}
                          {day.dinner && (
                            <div className="flex justify-between text-sm">
                              <span className="text-morandi-secondary">Dinner</span>
                              <span className="font-medium text-morandi-primary">{day.dinner}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {day.accommodation && (
                      <div className="relative pl-6 border-l border-border">
                        <span className="absolute -left-1.5 top-0 w-3 h-3 bg-morandi-primary rounded-full border-2 border-white"></span>
                        <h5 className="text-xs font-bold text-morandi-secondary uppercase tracking-widest mb-3">
                          Stay
                        </h5>
                        <div className="bg-card p-4 shadow-sm rounded-sm border border-border">
                          <div className="font-serif font-bold text-lg mb-1">
                            {day.accommodation}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </main>

        {/* 底部業務資訊 */}
        <section className="py-16 bg-card border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
            {salesPerson && (
              <div className="text-center">
                <p className="text-sm text-morandi-muted mb-2">專屬業務</p>
                <p className="text-2xl font-serif font-bold text-morandi-primary">
                  {salesPerson.display_name || salesPerson.name}
                </p>
                {salesPerson.email && (
                  <p className="text-sm text-morandi-secondary mt-1">{salesPerson.email}</p>
                )}
              </div>
            )}

            <button
              onClick={() => setIsBookingOpen(true)}
              className="inline-flex items-center gap-4 px-12 py-5 bg-morandi-primary text-white rounded-sm shadow-xl hover:shadow-2xl hover:bg-morandi-primary transition-all duration-300 transform hover:-translate-y-1"
            >
              <span className="font-serif text-xl font-bold tracking-[0.3em]">我要報名</span>
            </button>
            <p className="text-xs text-morandi-muted">專員將在 24 小時內與您聯繫</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-morandi-container py-12 border-t border-border">
          <div className="max-w-7xl mx-auto px-4 flex flex-col items-center">
            <p className="text-xs text-morandi-secondary font-medium tracking-widest uppercase">
              © 2024 Corner Travel Collection. All rights reserved.
            </p>
          </div>
        </footer>
      </div>

      {/* 報名 Dialog */}
      <BookingDialog
        open={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        itinerary={itinerary}
        salesPersonId={salesPerson?.id}
      />
    </>
  )
}
