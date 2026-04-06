const { createCanvas } = require('canvas')
const ExcelJS = require('exceljs')
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_KEY = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]
const LINE_TOKEN = envFile.match(/LINE_CHANNEL_ACCESS_TOKEN=(.*)/)?.[1]
const LINE_GROUP_ID = 'C03f53517dc822913b394411981a100bf' // 喜多里保代

const TOUR_CODE = 'TW260321A'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function renderTableImage(title, subtitle, headers, rows) {
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

  // 背景
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)

  // 標題
  ctx.fillStyle = '#333333'
  ctx.font = 'bold 18px "Noto Sans CJK TC", "PingFang TC", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(title, width / 2, padding + 24)

  // 副標題
  ctx.font = '13px "Noto Sans CJK TC", "PingFang TC", sans-serif'
  ctx.fillStyle = '#666666'
  ctx.fillText(subtitle, width / 2, padding + titleHeight + 14)

  const tableTop = padding + titleHeight + subtitleHeight
  let x = padding
  let y = tableTop

  // 表頭背景
  ctx.fillStyle = '#E8DCC8'
  ctx.fillRect(x, y, tableWidth, headerHeight)

  // 表頭文字
  ctx.fillStyle = '#333333'
  ctx.font = 'bold 13px "Noto Sans CJK TC", "PingFang TC", sans-serif'
  ctx.textAlign = 'center'
  let cx = padding
  for (let i = 0; i < headers.length; i++) {
    ctx.fillText(headers[i], cx + colWidths[i] / 2, y + headerHeight / 2 + 5)
    cx += colWidths[i]
  }

  // 表頭邊框
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

  // 資料列
  ctx.font = '12px "Noto Sans CJK TC", "PingFang TC", sans-serif'
  for (let r = 0; r < rows.length; r++) {
    // 斑馬紋
    if (r % 2 === 1) {
      ctx.fillStyle = '#F9F5F0'
      ctx.fillRect(x, y, tableWidth, rowHeight)
    }

    ctx.fillStyle = '#333333'
    cx = padding
    for (let i = 0; i < rows[r].length; i++) {
      ctx.textAlign = i === 0 ? 'center' : 'center'
      ctx.fillText(String(rows[r][i] || ''), cx + colWidths[i] / 2, y + rowHeight / 2 + 5)
      cx += colWidths[i]
    }

    // 行邊框
    ctx.strokeStyle = '#E0D5C8'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(padding, y + rowHeight)
    ctx.lineTo(padding + tableWidth, y + rowHeight)
    ctx.stroke()

    y += rowHeight
  }

  // 外框
  ctx.strokeStyle = '#CCBBAA'
  ctx.lineWidth = 1
  ctx.strokeRect(padding, tableTop, tableWidth, headerHeight + rowHeight * rows.length)

  // 垂直分隔線
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

async function main() {
  // 1. 取團資料
  const { data: tour } = await supabase
    .from('tours')
    .select(
      'id, code, name, departure_date, return_date, days_count, airport_code, outbound_flight, return_flight, tour_leader_id, country_id'
    )
    .eq('code', TOUR_CODE)
    .single()
  if (!tour) {
    console.error('Tour not found')
    return
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
  let daysCount = tour.days_count
  if (!daysCount && tour.departure_date && tour.return_date) {
    daysCount =
      Math.round((new Date(tour.return_date) - new Date(tour.departure_date)) / 86400000) + 1
  }

  const isLocal = countryName === '台灣' || countryName === 'Taiwan'
  const location = isLocal ? '台灣' : `${countryName} ${tour.airport_code || ''}`
  const outFlight = tour.outbound_flight?.flightNumber || ''
  const retFlight = tour.return_flight?.flightNumber || ''
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

  // 2. 取團員
  const { data: orders } = await supabase.from('orders').select('id').eq('tour_id', tour.id)
  const orderIds = orders?.map(o => o.id) || []
  if (!orderIds.length) {
    console.error('No orders')
    return
  }

  const { data: members } = await supabase
    .from('order_members')
    .select('*, customer:customer_id(name, national_id, birth_date)')
    .in('order_id', orderIds)
    .order('created_at', { ascending: true })
  if (!members?.length) {
    console.error('No members')
    return
  }

  const representative = leaderName || members[0]?.customer?.name || '-'

  // 3. 產生圖片
  const title = `${tour.code} ${tour.name}`
  const subtitle = `出發 ${tour.departure_date} ~ ${tour.return_date} | ${members.length}人`
  const headers = ['序', '姓名', '身分證字號', '出生年月日']
  const rows = members.map((m, i) => [
    i + 1,
    m.customer?.name || '',
    m.customer?.national_id || '',
    m.customer?.birth_date || '',
  ])

  const imgBuffer = renderTableImage(title, subtitle, headers, rows)
  const imgPath = `/tmp/${tour.code}_insurance.png`
  fs.writeFileSync(imgPath, imgBuffer)
  console.log(`🖼️ Image: ${imgPath}`)

  // 4. 上傳圖片到 Supabase Storage
  const imgStoragePath = `tour-documents/${tour.code}/insurance_${Date.now()}.png`
  await supabase.storage.from('documents').upload(imgStoragePath, imgBuffer, {
    contentType: 'image/png',
    upsert: true,
  })
  const { data: imgUrl } = supabase.storage.from('documents').getPublicUrl(imgStoragePath)
  console.log(`🔗 Image URL: ${imgUrl.publicUrl}`)

  // 5. 同時產 Excel + 上傳
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('團員名單')
  ws.mergeCells('A1:D1')
  ws.getCell('A1').value = title
  ws.getCell('A1').font = { bold: true, size: 14 }
  ws.getCell('A1').alignment = { horizontal: 'center' }
  ws.addRow([])
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
  rows.forEach(r => {
    const row = ws.addRow(r)
    row.eachCell(c => {
      c.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      }
    })
  })
  ws.columns = [{ width: 5 }, { width: 12 }, { width: 14 }, { width: 14 }]

  const xlsxBuf = await wb.xlsx.writeBuffer()
  const xlsxName = `${tour.code}_members_${Date.now()}.xlsx`
  const xlsxPath = `tour-documents/${tour.code}/${xlsxName}`
  await supabase.storage.from('documents').upload(xlsxPath, xlsxBuf, {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    upsert: true,
  })
  const { data: xlsxUrl } = supabase.storage.from('documents').getPublicUrl(xlsxPath)

  // 6. 發 LINE
  // 業務
  const { data: orderData } = await supabase
    .from('orders')
    .select('sales_person')
    .eq('tour_id', tour.id)
    .limit(1)
    .single()
  const salesPerson = orderData?.sales_person || '-'

  const textLines = [
    `旅遊責任險`,
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
  textLines.push(``, `Excel：${xlsxUrl.publicUrl}`)

  const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_TOKEN}`,
    },
    body: JSON.stringify({
      to: LINE_GROUP_ID,
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

  if (lineRes.ok) {
    console.log('✅ LINE 發送成功! (文字 + 圖片 + Excel連結)')
  } else {
    const err = await lineRes.text()
    console.error('❌ LINE 發送失敗:', lineRes.status, err)
  }
}

main().catch(console.error)
