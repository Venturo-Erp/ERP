import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface ItineraryItem {
  day_number: number | null
  category: string | null
  sub_category: string | null
  title: string | null
  resource_name: string | null
  sort_order: number
}

interface DayData {
  dayNumber: number
  date: string
  title: string
  breakfast: string
  lunch: string
  dinner: string
  hotel: string
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

async function getTourItinerary(tourId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: tour } = await supabase
    .from('tours')
    .select('code, name, departure_date, location')
    .eq('id', tourId)
    .single()

  if (!tour) return null

  const { data: items } = await supabase
    .from('tour_itinerary_items')
    .select('day_number, category, sub_category, title, resource_name, sort_order')
    .eq('tour_id', tourId)
    .order('day_number', { ascending: true })
    .order('sort_order', { ascending: true })

  return {
    tour: {
      code: tour.code || '',
      name: tour.name || '',
      departureDate: tour.departure_date || '',
      destination: (tour as Record<string, unknown>).location as string || '',
    },
    items: (items || []) as ItineraryItem[],
  }
}

function buildDays(items: ItineraryItem[], departureDate: string): DayData[] {
  const dayMap = new Map<number, DayData>()

  for (const item of items) {
    const dn = item.day_number
    if (!dn) continue

    if (!dayMap.has(dn)) {
      let dateStr = ''
      let weekday = ''
      if (departureDate) {
        const d = new Date(departureDate)
        d.setDate(d.getDate() + dn - 1)
        dateStr = `${d.getMonth() + 1}/${d.getDate()}`
        weekday = WEEKDAYS[d.getDay()]
      }
      dayMap.set(dn, {
        dayNumber: dn,
        date: `${dateStr}${weekday ? ` (${weekday})` : ''}`,
        title: '',
        breakfast: '',
        lunch: '',
        dinner: '',
        hotel: '',
      })
    }
  }

  const sorted = [...items].sort((a, b) => {
    const da = a.day_number || 0
    const db = b.day_number || 0
    if (da !== db) return da - db
    return (a.sort_order || 0) - (b.sort_order || 0)
  })

  for (const item of sorted) {
    const dn = item.day_number
    if (!dn || !dayMap.has(dn)) continue
    const day = dayMap.get(dn)!

    if (item.category === 'accommodation') {
      day.hotel = item.resource_name || item.title || ''
    } else if (item.category === 'meals') {
      const name = item.title || ''
      if (item.sub_category === 'breakfast') day.breakfast = name
      else if (item.sub_category === 'lunch') day.lunch = name
      else if (item.sub_category === 'dinner') day.dinner = name
    } else if (item.category === 'activities' || item.category === 'transport' || item.category === 'group-transport') {
      if (item.title) {
        day.title = day.title ? `${day.title} → ${item.title}` : item.title
      }
    }
  }

  return Array.from(dayMap.values()).sort((a, b) => a.dayNumber - b.dayNumber)
}

export default async function PublicItineraryPage({ params }: { params: Promise<{ tourId: string }> }) {
  const { tourId } = await params
  const data = await getTourItinerary(tourId)

  if (!data) {
    notFound()
  }

  const { tour, items } = data
  const days = buildDays(items, tour.departureDate)

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf9', padding: '24px 16px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '32px' }}>
        
        {/* 標題區 */}
        <div style={{ borderBottom: '2px solid #c9a96e', paddingBottom: 16, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 4 }}>
                {tour.name || '行程表'}
              </h1>
            </div>
            <div style={{ textAlign: 'right', fontSize: 14 }}>
              <p style={{ fontWeight: 600, color: '#c9a96e' }}>角落旅行社</p>
            </div>
          </div>

          {/* 基本資訊 */}
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 140px', gap: 16, fontSize: 14, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: '#999' }}>目的地：</span>
              <span style={{ fontWeight: 500 }}>{tour.destination || '-'}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: '#999' }}>出發日期：</span>
              <span style={{ fontWeight: 500 }}>{tour.departureDate || '-'}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: '#999' }}>行程天數：</span>
              <span style={{ fontWeight: 500 }}>{days.length} 天</span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: '#999', whiteSpace: 'nowrap' }}>人數：</span>
              <input
                type="number"
                placeholder="人數"
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  border: '1px solid #ddd',
                  borderRadius: 4,
                  fontSize: 14,
                }}
                readOnly
              />
            </div>
          </div>
        </div>

        {/* 每日行程表格 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 24 }}>
          <thead>
            <tr style={{ background: '#c9a96e', color: '#fff' }}>
              <th style={{ border: '1px solid rgba(201, 169, 110, 0.5)', padding: '8px 12px', textAlign: 'left', width: 80 }}>日期</th>
              <th style={{ border: '1px solid rgba(201, 169, 110, 0.5)', padding: '8px 12px', textAlign: 'left' }}>行程內容</th>
              <th style={{ border: '1px solid rgba(201, 169, 110, 0.5)', padding: '8px 12px', textAlign: 'center', width: 64 }}>早餐</th>
              <th style={{ border: '1px solid rgba(201, 169, 110, 0.5)', padding: '8px 12px', textAlign: 'center', width: 64 }}>午餐</th>
              <th style={{ border: '1px solid rgba(201, 169, 110, 0.5)', padding: '8px 12px', textAlign: 'center', width: 64 }}>晚餐</th>
              <th style={{ border: '1px solid rgba(201, 169, 110, 0.5)', padding: '8px 12px', textAlign: 'left', width: 128 }}>住宿</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day, idx) => (
              <tr key={day.dayNumber} style={{ background: idx % 2 === 0 ? '#fff' : '#fafaf5' }}>
                <td style={{ border: '1px solid #e8e5e0', padding: '8px 12px' }}>
                  <div style={{ fontWeight: 600, color: '#c9a96e' }}>Day {day.dayNumber}</div>
                  <div style={{ fontSize: 12, color: '#999' }}>{day.date}</div>
                </td>
                <td style={{ border: '1px solid #e8e5e0', padding: '8px 12px', fontWeight: 500 }}>
                  {day.title || '待安排'}
                </td>
                <td style={{ border: '1px solid #e8e5e0', padding: '8px 12px', textAlign: 'center', fontSize: 12 }}>
                  {day.breakfast || '-'}
                </td>
                <td style={{ border: '1px solid #e8e5e0', padding: '8px 12px', textAlign: 'center', fontSize: 12 }}>
                  {day.lunch || '-'}
                </td>
                <td style={{ border: '1px solid #e8e5e0', padding: '8px 12px', textAlign: 'center', fontSize: 12 }}>
                  {day.dinner || '-'}
                </td>
                <td style={{ border: '1px solid #e8e5e0', padding: '8px 12px', fontSize: 12 }}>
                  {day.hotel || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 備註 */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#555' }}>備註</label>
          <textarea
            placeholder="備註..."
            rows={2}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: 4,
              fontSize: 14,
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
            readOnly
          />
        </div>

        {/* 頁尾 */}
        <div style={{ paddingTop: 16, borderTop: '1px solid #e8e5e0', textAlign: 'center', fontSize: 12, color: '#999' }}>
          <p>本行程表由 角落旅行社 提供</p>
        </div>
      </div>
    </div>
  )
}
