import { createClient } from '@supabase/supabase-js'
import { createCanvas } from 'canvas'
import { NextResponse } from 'next/server'

const LINE_API_URL = 'https://api.line.me/v2/bot/message/push'

// 喜多里保代群組
const INSURANCE_GROUP_ID = 'C03f53517dc822913b394411981a100bf'

function renderTableImage(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][]
): Buffer {
  const colWidths = [40, 100, 140, 120]
  const rowHeight = 32
  const headerHeight = 36
  const padding = 16
  const titleHeight = 50
  const subtitleHeight = 30
  const tableWidth = colWidths.reduce((a, b) => a + b, 0)
  const width = tableWidth + padding * 2
  const height =
    titleHeight + subtitleHeight + headerHeight + rowHeight * rows.length + padding * 2 + 10

  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#333333'
  ctx.font = 'bold 18px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(title, width / 2, padding + 24)

  ctx.font = '13px sans-serif'
  ctx.fillStyle = '#666666'
  ctx.fillText(subtitle, width / 2, padding + titleHeight + 14)

  const tableTop = padding + titleHeight + subtitleHeight
  const x = padding
  let y = tableTop

  ctx.fillStyle = '#E8DCC8'
  ctx.fillRect(x, y, tableWidth, headerHeight)

  ctx.fillStyle = '#333333'
  ctx.font = 'bold 13px sans-serif'
  ctx.textAlign = 'center'
  let cx = padding
  for (let i = 0; i < headers.length; i++) {
    ctx.fillText(headers[i], cx + colWidths[i] / 2, y + headerHeight / 2 + 5)
    cx += colWidths[i]
  }

  ctx.strokeStyle = '#CCBBAA'
  ctx.lineWidth = 1
  ctx.strokeRect(x, y, tableWidth, headerHeight)
  cx = padding
  for (let i = 0; i < colWidths.length - 1; i++) {
    cx += colWidths[i]
    ctx.beginPath()
    ctx.moveTo(cx, y)
    ctx.lineTo(cx, y + headerHeight)
    ctx.stroke()
  }

  y += headerHeight
  ctx.font = '12px sans-serif'

  for (let r = 0; r < rows.length; r++) {
    if (r % 2 === 1) {
      ctx.fillStyle = '#F9F5F0'
      ctx.fillRect(x, y, tableWidth, rowHeight)
    }
    ctx.fillStyle = '#333333'
    cx = padding
    for (let i = 0; i < rows[r].length; i++) {
      ctx.textAlign = 'center'
      ctx.fillText(String(rows[r][i] || ''), cx + colWidths[i] / 2, y + rowHeight / 2 + 5)
      cx += colWidths[i]
    }
    ctx.strokeStyle = '#E0D5C8'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(padding, y + rowHeight)
    ctx.lineTo(padding + tableWidth, y + rowHeight)
    ctx.stroke()
    y += rowHeight
  }

  ctx.strokeStyle = '#CCBBAA'
  ctx.lineWidth = 1
  ctx.strokeRect(padding, tableTop, tableWidth, headerHeight + rowHeight * rows.length)
  cx = padding
  for (let i = 0; i < colWidths.length - 1; i++) {
    cx += colWidths[i]
    ctx.beginPath()
    ctx.moveTo(cx, tableTop + headerHeight)
    ctx.lineTo(cx, tableTop + headerHeight + rowHeight * rows.length)
    ctx.stroke()
  }

  return canvas.toBuffer('image/png')
}

async function sendInsuranceForTour(
  supabase: any,
  lineToken: string,
  tourId: string,
  isManual = false,
  isChange = false
) {
  // 團資料
  const { data: tour } = await supabase
    .from('tours')
    .select(
      'id, code, name, departure_date, return_date, days_count, airport_code, outbound_flight, return_flight, tour_leader_id, country_id'
    )
    .eq('id', tourId)
    .single() as { data: any }
  if (!tour) return { success: false, error: 'Tour not found' }

  // 國家
  let countryName = '台灣'
  if (tour.country_id) {
    const { data: c } = await supabase.from('countries').select('name').eq('id', tour.country_id).single()
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
  const outFlight = (tour.outbound_flight as { flightNumber?: string })?.flightNumber || ''
  const retFlight = (tour.return_flight as { flightNumber?: string })?.flightNumber || ''
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
  const { data: orders } = await supabase.from('orders').select('id, sales_person').eq('tour_id', tour.id) as { data: any[] | null }
  const orderIds = orders?.map((o: any) => o.id) || []
  if (!orderIds.length) return { success: false, error: 'No orders' }

  const salesPerson = orders?.[0]?.sales_person || '-'

  const { data: members } = await supabase
    .from('order_members')
    .select('customer:customer_id(name, national_id, birth_date)')
    .in('order_id', orderIds) as { data: any[] | null }

  if (!members?.length) return { success: false, error: 'No members' }

  const representative = leaderName || members[0]?.customer?.name || '-'

  // 圖片
  const title = `${tour.code} ${tour.name}`
  const subtitle = `出發 ${tour.departure_date} ~ ${tour.return_date} | ${members.length}人`
  const headers = ['序', '姓名', '身分證字號', '出生年月日']
  const rows = members.map((m: any, i: number) => [
    i + 1,
    m.customer?.name || '',
    m.customer?.national_id || '',
    m.customer?.birth_date || '',
  ])

  const imgBuffer = renderTableImage(title, subtitle, headers, rows)

  // 上傳圖片
  const imgPath = `tour-documents/${tour.code}/insurance_${Date.now()}.png`
  await supabase.storage.from('documents').upload(imgPath, imgBuffer, {
    contentType: 'image/png',
    upsert: true,
  })
  const { data: imgUrl } = supabase.storage.from('documents').getPublicUrl(imgPath)

  // Excel signed URL (24hr)
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('團員名單')
  ws.mergeCells('A1:D1')
  ws.getCell('A1').value = title
  ws.getCell('A1').font = { bold: true, size: 14 }
  ws.getCell('A1').alignment = { horizontal: 'center' }
  ws.addRow([])
  const hr = ws.addRow(headers)
  hr.font = { bold: true }
  hr.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8DCC8' } }
    c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
  })
  rows.forEach((r) => {
    const row = ws.addRow(r)
    row.eachCell((c) => {
      c.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
    })
  })
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

  // LINE 訊息
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
  if (xlsxUrl) textLines.push(``, `Excel（24小時有效）：`, xlsxUrl)

  const lineRes = await fetch(LINE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${lineToken}`,
    },
    body: JSON.stringify({
      to: INSURANCE_GROUP_ID,
      messages: [
        { type: 'text', text: textLines.join('\n') },
        {
          type: 'image',
          originalContentUrl: imgUrl.publicUrl,
          previewImageUrl: imgUrl.publicUrl,
        },
      ],
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
    console.error('[auto-insurance]', error)
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
    console.error('[send-insurance-manual]', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
