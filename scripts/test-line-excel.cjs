const ExcelJS = require('exceljs')
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_KEY = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]
const LINE_TOKEN = envFile.match(/LINE_CHANNEL_ACCESS_TOKEN=(.*)/)?.[1]
const LINE_GROUP_ID = 'Cef588e4998134cdb9313b80667924bdb' // william筆記本

const TOUR_CODE = 'TW260321A'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function main() {
  // 1. 取團資料（含國家、領隊）
  const { data: tour, error: tourErr } = await supabase
    .from('tours')
    .select(
      'id, code, name, departure_date, return_date, days_count, airport_code, outbound_flight, return_flight, tour_leader_id, country_id'
    )
    .eq('code', TOUR_CODE)
    .single()

  if (!tour) {
    console.error('Tour not found', tourErr)
    return
  }

  // 國家名稱
  let countryName = '台灣'
  if (tour.country_id) {
    const { data: country } = await supabase
      .from('countries')
      .select('name')
      .eq('id', tour.country_id)
      .single()
    if (country) countryName = country.name
  }

  // 計算天數
  let daysCount = tour.days_count
  if (!daysCount && tour.departure_date && tour.return_date) {
    const d1 = new Date(tour.departure_date)
    const d2 = new Date(tour.return_date)
    daysCount = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1
  }

  // 地點：台灣 = 台灣，國外 = 國家+機場代號
  const isLocal = countryName === '台灣' || countryName === 'Taiwan'
  const location = isLocal ? '台灣' : `${countryName} ${tour.airport_code || ''}`

  // 航班
  const outFlight = tour.outbound_flight?.flightNumber || ''
  const retFlight = tour.return_flight?.flightNumber || ''
  const flightInfo = [outFlight, retFlight].filter(Boolean).join(' / ')

  // 領隊
  let leaderName = ''
  if (tour.tour_leader_id) {
    const { data: leader } = await supabase
      .from('employees')
      .select('chinese_name')
      .eq('id', tour.tour_leader_id)
      .single()
    if (leader) leaderName = leader.chinese_name
  }

  // 2. 取團員（透過 order_members）
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

  // 旅客代表：有領隊用領隊，沒有就用第一位旅客
  const representative = leaderName || members[0]?.customer?.name || '-'

  console.log(`📋 團: ${tour.code} ${tour.name}`)
  console.log(`👤 代表: ${representative} | 📍 ${location} | ✈️ ${flightInfo || '無'}`)

  // 3. 產生 Excel
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('團員名單')

  ws.mergeCells('A1:D1')
  ws.getCell('A1').value = `${tour.code} ${tour.name}`
  ws.getCell('A1').font = { bold: true, size: 14 }
  ws.getCell('A1').alignment = { horizontal: 'center' }

  ws.addRow([]) // 空行

  const headers = ['序', '姓名', '身分證字號', '出生年月日']
  const headerRow = ws.addRow(headers)
  headerRow.font = { bold: true }
  headerRow.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8DCC8' } }
    c.border = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
    }
  })

  members.forEach((m, i) => {
    const c = m.customer || {}
    const row = ws.addRow([i + 1, c.name || '', c.national_id || '', c.birth_date || ''])
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      }
    })
  })

  ws.columns = [{ width: 5 }, { width: 12 }, { width: 14 }, { width: 14 }]

  const fileName = `${tour.code}_members_${Date.now()}.xlsx`
  const filePath = `/tmp/${fileName}`
  await wb.xlsx.writeFile(filePath)
  console.log(`📄 Excel: ${filePath}`)

  // 4. 上傳 Supabase Storage
  const fileBuffer = fs.readFileSync(filePath)
  const storagePath = `tour-documents/${tour.code}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, fileBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: true,
    })

  if (uploadError) {
    console.error('Upload error:', uploadError.message)
    return
  }
  console.log('📤 Uploaded')

  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storagePath)
  const publicUrl = urlData?.publicUrl

  // 5. 發 LINE — 文字摘要 + Excel 檔案連結
  const lines = [
    `🛡️ 旅遊責任險`,
    ``,
    `旅客代表：${representative}`,
    `日期：${tour.departure_date || '-'} ~ ${tour.return_date || '-'}`,
    `天數：${daysCount || '-'}`,
    `人數：${members.length}`,
    `保額：旅責`,
    `地點：${location}`,
  ]
  if (flightInfo) lines.push(`航班：${flightInfo}`)
  lines.push(``, `📎 團員名單：`, publicUrl)

  const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_TOKEN}`,
    },
    body: JSON.stringify({
      to: LINE_GROUP_ID,
      messages: [{ type: 'text', text: lines.join('\n') }],
    }),
  })

  if (lineRes.ok) {
    console.log('✅ LINE 發送成功!')
  } else {
    const err = await lineRes.text()
    console.error('❌ LINE 發送失敗:', lineRes.status, err)
  }
}

main().catch(console.error)
