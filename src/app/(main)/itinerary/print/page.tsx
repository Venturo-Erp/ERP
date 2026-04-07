'use client'
/**
 * 行程表列印頁面（簡易版）
 * 適用於非 TP/TC 的公司，提供簡潔的 A4 列印格式
 */

import { PRINT_LABELS } from '../constants/labels'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { Printer, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores'
import { useItineraries, useToursSlim } from '@/data'
import { formatDateTW } from '@/lib/utils/format-date'
import type { Itinerary, Tour } from '@/stores/types'
import { useTourDailyData } from '@/features/tours/hooks/useTourDailyData'

function ItineraryPrintContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const itineraryId = searchParams.get('itinerary_id')

  const { items: itineraries } = useItineraries()
  const { items: tours } = useToursSlim()
  const { user } = useAuthStore()

  const [loading, setLoading] = useState(true)
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [tour, setTour] = useState<Tour | null>(null)

  // SWR 自動載入資料
  useEffect(() => {
    // 等待 SWR 資料載入
    if (itineraries.length > 0 || tours.length > 0) {
      setLoading(false)
    }
  }, [itineraries, tours])

  useEffect(() => {
    if (!loading && itineraryId) {
      const found = itineraries.find(i => i.id === itineraryId)
      setItinerary(found || null)

      if (found?.tour_id) {
        const foundTour = tours.find(t => t.id === found.tour_id)
        setTour((foundTour as Tour) || null)
      }
    }
  }, [loading, itineraryId, itineraries, tours])

  const handlePrint = () => {
    window.print()
  }

  const handleBack = () => {
    router.back()
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-morandi-gold" />
      </div>
    )
  }

  // 使用 useTourDailyData 從核心表組合每日資料
  const { days: enrichedDays, loading: loadingDailyData } = useTourDailyData(
    itinerary?.tour_id || null,
    itinerary?.daily_itinerary || null,
    {
      includeHidden: false,
      hiddenItemIds:
        (itinerary as Itinerary & { hidden_items_for_brochure?: string[] })
          ?.hidden_items_for_brochure || [],
      context: 'brochure',
    }
  )

  if (!itinerary) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-morandi-secondary">{PRINT_LABELS.NOT_FOUND}</p>
        <Button variant="outline" onClick={handleBack} className="gap-2">
          <ArrowLeft size={16} />
          {PRINT_LABELS.BACK}
        </Button>
      </div>
    )
  }

  if (loadingDailyData) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-morandi-gold" />
      </div>
    )
  }

  const dailyItinerary = enrichedDays
  const companyName = user?.workspace_code || PRINT_LABELS.DEFAULT_COMPANY

  return (
    <div className="min-h-screen bg-morandi-container">
      {/* 列印控制列（不列印） */}
      <div className="print:hidden sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" onClick={handleBack} className="gap-2">
          <ArrowLeft size={16} />
          {PRINT_LABELS.BACK}
        </Button>
        <Button
          onClick={handlePrint}
          className="bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-2"
        >
          <Printer size={16} />
          {PRINT_LABELS.PRINT}
        </Button>
      </div>

      {/* A4 列印內容 */}
      <div className="max-w-[210mm] mx-auto bg-card shadow-lg print:shadow-none print:max-w-none">
        <div className="p-8 print:p-6">
          {/* 封面圖（如果有） */}
          {itinerary.cover_image && (
            <div
              className="mb-6 -mx-8 -mt-8 print:-mx-6 print:-mt-6 relative overflow-hidden"
              style={{ height: '280px' }}
            >
              <img
                src={itinerary.cover_image}
                alt={itinerary.title || ''}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-6 left-8 right-8 text-white">
                <h1 className="text-3xl font-bold mb-1">
                  {itinerary.title || PRINT_LABELS.DEFAULT_TITLE}
                </h1>
                {itinerary.subtitle && <p className="text-sm opacity-90">{itinerary.subtitle}</p>}
              </div>
            </div>
          )}

          {/* 標題區 */}
          <div className="border-b-2 border-morandi-gold pb-4 mb-6">
            <div className="flex items-start justify-between">
              <div>
                {!itinerary.cover_image && (
                  <>
                    <h1 className="text-2xl font-bold text-morandi-primary mb-1">
                      {itinerary.title || PRINT_LABELS.DEFAULT_TITLE}
                    </h1>
                    {itinerary.subtitle && (
                      <p className="text-sm text-morandi-secondary">{itinerary.subtitle}</p>
                    )}
                  </>
                )}
                {itinerary.cover_image && (
                  <h1 className="text-lg font-bold text-morandi-primary">
                    {itinerary.title || PRINT_LABELS.DEFAULT_TITLE}
                  </h1>
                )}
              </div>
              <div className="text-right text-sm text-morandi-secondary">
                <p className="font-semibold text-morandi-gold">{companyName}</p>
                {itinerary.tour_code && <p className="font-mono">{itinerary.tour_code}</p>}
              </div>
            </div>

            {/* 基本資訊 */}
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div className="flex gap-2">
                <span className="text-morandi-secondary">{PRINT_LABELS.DESTINATION}</span>
                <span className="font-medium">{itinerary.city || itinerary.country || '-'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-morandi-secondary">{PRINT_LABELS.DEPARTURE_DATE}</span>
                <span className="font-medium">{itinerary.departure_date || '-'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-morandi-secondary">{PRINT_LABELS.TRIP_DAYS}</span>
                <span className="font-medium">
                  {dailyItinerary.length} {PRINT_LABELS.DAY_UNIT}
                </span>
              </div>
              {tour && (
                <div className="flex gap-2">
                  <span className="text-morandi-secondary">{PRINT_LABELS.TOUR_CODE}</span>
                  <span className="font-medium font-mono">{tour.code}</span>
                </div>
              )}
            </div>
          </div>

          {/* 航班資訊（如果有） */}
          {(itinerary.outbound_flight || itinerary.return_flight) && (
            <div className="mb-6 p-4 bg-morandi-container/30 rounded-lg">
              <h3 className="text-sm font-semibold text-morandi-primary mb-2">
                {PRINT_LABELS.FLIGHT_INFO}
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {itinerary.outbound_flight &&
                  (() => {
                    const flight = Array.isArray(itinerary.outbound_flight)
                      ? itinerary.outbound_flight[0]
                      : itinerary.outbound_flight
                    return flight ? (
                      <div>
                        <span className="text-morandi-secondary">{PRINT_LABELS.OUTBOUND}</span>
                        <span className="ml-2">
                          {flight.airline} {flight.flightNumber} {flight.departureTime} -{' '}
                          {flight.arrivalTime}
                        </span>
                      </div>
                    ) : null
                  })()}
                {itinerary.return_flight &&
                  (() => {
                    const flight = Array.isArray(itinerary.return_flight)
                      ? itinerary.return_flight[0]
                      : itinerary.return_flight
                    return flight ? (
                      <div>
                        <span className="text-morandi-secondary">{PRINT_LABELS.RETURN}</span>
                        <span className="ml-2">
                          {flight.airline} {flight.flightNumber} {flight.departureTime} -{' '}
                          {flight.arrivalTime}
                        </span>
                      </div>
                    ) : null
                  })()}
              </div>
            </div>
          )}

          {/* 每日行程表格 */}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-morandi-gold-header">
                <th className="border border-morandi-gold/50 px-3 py-2 text-left w-24">
                  {PRINT_LABELS.DATE}
                </th>
                <th className="border border-morandi-gold/50 px-3 py-2 text-left">
                  {PRINT_LABELS.ITINERARY_CONTENT}
                </th>
                <th className="border border-morandi-gold/50 px-3 py-2 text-center w-20">
                  {PRINT_LABELS.BREAKFAST}
                </th>
                <th className="border border-morandi-gold/50 px-3 py-2 text-center w-20">
                  {PRINT_LABELS.LUNCH}
                </th>
                <th className="border border-morandi-gold/50 px-3 py-2 text-center w-20">
                  {PRINT_LABELS.DINNER}
                </th>
                <th className="border border-morandi-gold/50 px-3 py-2 text-left w-36">
                  {PRINT_LABELS.ACCOMMODATION}
                </th>
              </tr>
            </thead>
            <tbody>
              {dailyItinerary.map((day, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-card' : 'bg-morandi-container/20'}>
                  <td className="border border-morandi-container px-3 py-2">
                    <div className="font-semibold text-morandi-gold">{day.dayLabel}</div>
                    <div className="text-xs text-morandi-secondary">{day.date}</div>
                  </td>
                  <td className="border border-morandi-container px-3 py-2">
                    <div className="font-medium">{day.title}</div>
                    {day.highlight && (
                      <div className="text-xs text-morandi-secondary mt-1">{day.highlight}</div>
                    )}
                  </td>
                  <td className="border border-morandi-container px-3 py-2 text-center text-xs">
                    {day.meals?.breakfast || '-'}
                  </td>
                  <td className="border border-morandi-container px-3 py-2 text-center text-xs">
                    {day.meals?.lunch || '-'}
                  </td>
                  <td className="border border-morandi-container px-3 py-2 text-center text-xs">
                    {day.meals?.dinner || '-'}
                  </td>
                  <td className="border border-morandi-container px-3 py-2 text-xs">
                    {day.accommodation || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 頁尾 */}
          <div className="mt-8 pt-4 border-t border-morandi-container text-xs text-morandi-secondary text-center">
            <p>
              {PRINT_LABELS.FOOTER_PROVIDED_BY} {companyName} {PRINT_LABELS.FOOTER_PRINT_DATE}
              {formatDateTW(new Date())}
            </p>
          </div>
        </div>
      </div>

      {/* 列印樣式 */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          h1,
          h2,
          h3 {
            page-break-after: avoid;
          }
          img {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  )
}

export default function ItineraryPrintPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-morandi-gold" />
        </div>
      }
    >
      <ItineraryPrintContent />
    </Suspense>
  )
}
