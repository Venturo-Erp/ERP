#!/usr/bin/env node
/**
 * 發送保險到威廉筆記本（測試）
 */
const { createClient } = require('@supabase/supabase-js')
const ExcelJS = require('exceljs')
const fetch = require('node-fetch')
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN
const TARGET_GROUP = 'Cef588e4998134cdb9313b80667924bdb' // 威廉筆記本

async function sendInsurance(tourCode) {
  console.log(`\n📤 發送保險到威廉筆記本：${tourCode}\n`)

  // 1. 查團資訊（對齊 Cron 的查詢）
  const { data: tour } = await supabase
    .from('tours')
    .select(
      'id, code, name, departure_date, return_date, days_count, airport_code, outbound_flight, return_flight, tour_leader_id, country_id'
    )
    .eq('code', tourCode)
    .single()

  if (!tour) {
    console.log('❌ 找不到團號')
    return
  }

  // 2. 計算天數
  const dep = new Date(tour.departure_date)
  const ret = new Date(tour.return_date)
  const days = Math.ceil((ret - dep) / (1000 * 60 * 60 * 24)) + 1

  // 3. 取團員
  const { data: orders } = await supabase.from('orders').select('id').eq('tour_id', tour.id)

  const orderIds = orders?.map(o => o.id) || []
  let members = []
  if (orderIds.length > 0) {
    const { data } = await supabase
      .from('order_members')
      .select('customer:customer_id(name, national_id, birth_date)')
      .in('order_id', orderIds)
    members = data || []
  }

  console.log(`團名：${tour.name}`)
  console.log(`出發：${tour.departure_date}`)
  console.log(`團員：${members.length} 人`)

  // 1.5 查詢國家、領隊、業務
  let countryName = '台灣'
  if (tour.country_id) {
    const { data: c } = await supabase
      .from('countries')
      .select('name')
      .eq('id', tour.country_id)
      .single()
    if (c) countryName = c.name
  }

  const isLocal = countryName === '台灣' || countryName === 'Taiwan'
  const location = isLocal ? '台灣' : `${countryName} ${tour.airport_code || ''}`

  const outFlight = tour.outbound_flight?.flightNumber || ''
  const retFlight = tour.return_flight?.flightNumber || ''
  const flightInfo = [outFlight, retFlight].filter(Boolean).join(' / ') || '（未填）'

  let leaderName = ''
  if (tour.tour_leader_id) {
    const { data: l } = await supabase
      .from('employees')
      .select('chinese_name')
      .eq('id', tour.tour_leader_id)
      .single()
    if (l) leaderName = l.chinese_name
  }

  const { data: ordersWithSales } = await supabase
    .from('orders')
    .select('id, sales_person')
    .eq('tour_id', tour.id)
  const salesPerson = ordersWithSales?.[0]?.sales_person || '（未填）'

  const representative = leaderName || members[0]?.customer?.name || '（未填）'

  console.log(`地點：${location}`)
  console.log(`航班：${flightInfo}`)
  console.log(`業務：${salesPerson}`)
  console.log(`領隊：${leaderName}\n`)

  // 4. 產生 Excel
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('團員名單')

  worksheet.columns = [
    { header: '序', key: 'index', width: 6 },
    { header: '姓名', key: 'name', width: 15 },
    { header: '身分證字號', key: 'national_id', width: 15 },
    { header: '出生年月日', key: 'birth_date', width: 12 },
  ]

  members.forEach((m, i) => {
    const customer = m.customer
    worksheet.addRow({
      index: i + 1,
      name: customer?.name || '',
      national_id: customer?.national_id || '',
      birth_date: customer?.birth_date || '',
    })
  })

  const buffer = await workbook.xlsx.writeBuffer()
  const fileName = `${tourCode}_members_${Date.now()}.xlsx`
  const filePath = `tour-documents/${tourCode}/insurance/${fileName}`

  // 5. 上傳 Excel
  const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, buffer, {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    upsert: true,
  })

  if (uploadError) {
    console.log('❌ 上傳失敗:', uploadError.message)
    return
  }

  // 6. 取得公開 URL
  const { data: publicData } = supabase.storage.from('documents').getPublicUrl(filePath)

  // 7. 寫入 tour_documents
  const { error: insertError } = await supabase.from('tour_documents').insert({
    workspace_id: '8ef05a74-1f87-48ab-afd3-9bfeb423935d', // Venturo workspace
    tour_id: tour.id, // UUID
    name: `${tourCode} 保險名單`,
    file_name: fileName,
    file_path: filePath,
    public_url: publicData.publicUrl,
    file_size: buffer.length,
    mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  if (insertError) {
    console.log('⚠️ 寫入 tour_documents 失敗:', insertError.message)
  }

  // 8. 產生短網址
  const shortUrl = `https://app.cornertravel.com.tw/api/d/${tourCode}`

  // 9. 組 LINE 訊息（對齊 Cron 格式）
  const textLines = [
    `旅遊責任險（測試）`,
    ``,
    `台北角落`,
    `業務：${salesPerson}`,
    `旅客代表：${representative}`,
    `日期：${tour.departure_date} ~ ${tour.return_date}`,
    `天數：${days}`,
    `人數：${members.length}`,
    `保額：旅責`,
    `地點：${location}`,
  ]

  if (flightInfo !== '（未填）') {
    textLines.push(`航班：${flightInfo}`)
  }

  textLines.push(``, `📎 Excel 下載（7天有效）：`, shortUrl)

  const message = textLines.join('\n')

  // 10. 發送到 LINE
  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${LINE_TOKEN}`,
    },
    body: JSON.stringify({
      to: TARGET_GROUP,
      messages: [{ type: 'text', text: message }],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.log('❌ LINE 發送失敗:', error)
    return
  }

  console.log('✅ 發送成功！')
  console.log(`群組：威廉筆記本`)
  console.log(`短網址：${shortUrl}\n`)
}

const tourCode = process.argv[2] || 'TW260321A'
sendInsurance(tourCode).catch(console.error)
