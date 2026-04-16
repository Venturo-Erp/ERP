import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/utils/logger'
import { applyPrivacyMask, parsePrivacySettings } from '@/lib/privacy/mask'

const LINE_API_URL = 'https://api.line.me/v2/bot/message/push'

// 喜多里保代群組
const INSURANCE_GROUP_ID = 'C03f53517dc822913b394411981a100bf'

async function sendInsuranceForTour(
  supabase: SupabaseClient,
  lineToken: string,
  tourId: string,
  isManual = false,
  isChange = false
) {
  // 團資料（SSOT：航班屬於 itineraries，不從 tours 讀）
  const { data: tour } = (await supabase
    .from('tours')
    .select(
      'id, code, name, departure_date, return_date, days_count, airport_code, tour_leader_id, country_id, workspace_id'
    )
    .eq('id', tourId)
    .single()) as {
    data: {
      id: string
      code: string
      name: string
      departure_date: string | null
      return_date: string | null
      days_count: number | null
      airport_code: string | null
      tour_leader_id: string | null
      country_id: string | null
      workspace_id: string
    } | null
  }
  if (!tour) return { success: false, error: 'Tour not found' }

  // 航班從 itineraries 讀（SSOT：跟著公司行程表保險）
  const { data: itinerary } = (await supabase
    .from('itineraries')
    .select('outbound_flight, return_flight')
    .eq('tour_id', tour.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()) as {
    data: { outbound_flight: unknown; return_flight: unknown } | null
  }

  // 國家
  let countryName = '台灣'
  if (tour.country_id) {
    const { data: c } = await supabase
      .from('countries')
      .select('name')
      .eq('id', tour.country_id)
      .single()
    if (c) countryName = c.name
  }

  // 天數
  let daysCount = tour.days_count as number | null
  if (!daysCount && tour.departure_date && tour.return_date) {
    daysCount =
      Math.round(
        (new Date(tour.return_date).getTime() - new Date(tour.departure_date).getTime()) / 86400000
      ) + 1
  }

  const isLocal = countryName === '台灣' || countryName === 'Taiwan'
  const location = isLocal ? '台灣' : `${countryName} ${tour.airport_code || ''}`
  // 航班可能是陣列（多段）或單一物件，取第一筆
  const pickFlightNumber = (raw: unknown): string => {
    if (!raw) return ''
    const f = Array.isArray(raw) ? raw[0] : raw
    return (f as { flightNumber?: string })?.flightNumber || ''
  }
  const outFlight = pickFlightNumber(itinerary?.outbound_flight)
  const retFlight = pickFlightNumber(itinerary?.return_flight)
  const flightInfo = [outFlight, retFlight].filter(Boolean).join(' / ')

  // 領隊
  let leaderName = ''
  if (tour.tour_leader_id) {
    const { data: l } = await supabase
      .from('employees')
      .select('chinese_name')
      .eq('id', tour.tour_leader_id)
      .single()
    if (l) leaderName = l.chinese_name
  }

  // 團員
  const { data: orders } = (await supabase
    .from('orders')
    .select('id, sales_person')
    .eq('tour_id', tour.id)) as { data: Array<{ id: string; sales_person: string | null }> | null }
  const orderIds = orders?.map(o => o.id) || []
  if (!orderIds.length) return { success: false, error: 'No orders' }

  const salesPerson = orders?.[0]?.sales_person || '-'

  const { data: members } = (await supabase
    .from('order_members')
    .select('customer:customer_id(name, national_id, birth_date)')
    .in('order_id', orderIds)) as {
    data: Array<{ customer?: { name?: string; national_id?: string; birth_date?: string } }> | null
  }

  if (!members?.length) return { success: false, error: 'No members' }

  const representative = leaderName || members[0]?.customer?.name || '-'

  // 取得隱私設定
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('export_privacy_settings')
    .eq('id', tour.workspace_id)
    .single()
  const privacySettings = parsePrivacySettings(workspace?.export_privacy_settings)

  // 產生 Excel
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('團員名單')

  const title = `${tour.code} ${tour.name}`
  ws.mergeCells('A1:D1')
  ws.getCell('A1').value = title
  ws.getCell('A1').font = { bold: true, size: 14 }
  ws.getCell('A1').alignment = { horizontal: 'center' }
  ws.addRow([])

  const headers = ['序', '姓名', '身分證字號', '出生年月日']
  const hr = ws.addRow(headers)
  hr.font = { bold: true }
  hr.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8DCC8' } }
    c.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    }
  })

  members.forEach(
    (m: { customer?: { name?: string; national_id?: string; birth_date?: string } }, i: number) => {
      const row = ws.addRow([
        i + 1,
        m.customer?.name || '',
        applyPrivacyMask(m.customer?.national_id, 'mask_id_number', privacySettings),
        m.customer?.birth_date || '',
      ])
      row.eachCell(c => {
        c.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        }
      })
    }
  )

  ws.columns = [{ width: 5 }, { width: 12 }, { width: 14 }, { width: 14 }]

  const xlsxBuf = (await wb.xlsx.writeBuffer()) as unknown as Buffer
  const xlsxName = `${tour.code}_members_${Date.now()}.xlsx`
  const xlsxStoragePath = `tour-documents/${tour.code}/${xlsxName}`
  await supabase.storage.from('documents').upload(xlsxStoragePath, xlsxBuf, {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    upsert: true,
  })

  // Signed URL 24小時過期
  const { data: signedData } = await supabase.storage
    .from('documents')
    .createSignedUrl(xlsxStoragePath, 86400) // 24hr

  const xlsxUrl = signedData?.signedUrl || ''

  // LINE 訊息（純文字 + Excel 連結）
  const remark = isChange ? '（人員異動）' : isManual ? '' : '（自動發送）'
  const textLines = [
    `旅遊責任險${remark}`,
    ``,
    `台北角落`,
    `業務：${salesPerson}`,
    `旅客代表：${representative}`,
    `日期：${tour.departure_date || '-'} ~ ${tour.return_date || '-'}`,
    `天數：${daysCount || '-'}`,
    `人數：${members.length}`,
    `保額：旅責`,
    `地點：${location}`,
  ]
  if (flightInfo) textLines.push(`航班：${flightInfo}`)
  if (xlsxUrl) {
    textLines.push(``, `Excel（24小時有效）：`)
    textLines.push(xlsxUrl)
  }

  const lineRes = await fetch(LINE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lineToken}`,
    },
    body: JSON.stringify({
      to: INSURANCE_GROUP_ID,
      messages: [{ type: 'text', text: textLines.join('\n') }],
    }),
  })

  if (!lineRes.ok) {
    const err = await lineRes.text()
    return { success: false, error: `LINE: ${err}` }
  }

  // 更新 tour_requests 狀態
  await supabase
    .from('tour_requests')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_via: 'line',
    } as never)
    .eq('tour_id', tourId)
    .eq('request_type', 'other')
    .eq('supplier_name', '保險公司')

  return { success: true, tourCode: tour.code, memberCount: members.length }
}

// Cron: 每天早上 9:00 檢查 3 天後出發的團
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 查 3 天後出發的團
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + 3)
    const dateStr = targetDate.toISOString().slice(0, 10)

    const { data: tours } = await supabase
      .from('tours')
      .select('id, code')
      .eq('departure_date', dateStr)

    if (!tours?.length) {
      return NextResponse.json({ status: 'ok', message: `No tours departing on ${dateStr}` })
    }

    const results = []
    for (const tour of tours) {
      // 檢查是否已發過
      const { data: existing } = await supabase
        .from('tour_requests')
        .select('id, status')
        .eq('tour_id', tour.id)
        .eq('request_type', 'other')
        .eq('supplier_name', '保險公司')
        .in('status', ['sent', 'confirmed'])

      if (existing && existing.length > 0) {
        results.push({ tourCode: tour.code, skipped: true, reason: 'already sent' })
        continue
      }

      const result = await sendInsuranceForTour(supabase, lineToken, tour.id, false, false)
      results.push(result)
    }

    return NextResponse.json({ status: 'ok', date: dateStr, results })
  } catch (error) {
    logger.error('[auto-insurance]', error)
    return NextResponse.json({ status: 'error', error: String(error) }, { status: 500 })
  }
}

// 手動觸發（從需求頁按鈕）
export async function POST(request: Request) {
  try {
    const { tourId, isChange } = await request.json()
    if (!tourId) return NextResponse.json({ success: false, error: '缺少 tourId' }, { status: 400 })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const result = await sendInsuranceForTour(supabase, lineToken, tourId, true, isChange || false)
    return NextResponse.json(result)
  } catch (error) {
    logger.error('[send-insurance-manual]', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
