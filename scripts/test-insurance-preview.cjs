#!/usr/bin/env node
/**
 * 測試保險發送（預覽模式，不真的發送）
 */
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function previewInsurance(tourCode) {
  console.log(`\n🔍 預覽團號：${tourCode}\n`)

  // 1. 查團資訊
  const { data: tour } = await supabase
    .from('tours')
    .select('id, code, name, departure_date, return_date')
    .eq('code', tourCode)
    .single()

  if (!tour) {
    console.log('❌ 找不到團號')
    return
  }

  console.log(`團名：${tour.name}`)
  console.log(`出發：${tour.departure_date}`)
  console.log(`回程：${tour.return_date}`)

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

  console.log(`\n👥 團員數：${members.length} 人\n`)

  // 4. 生成訊息內容
  const shortUrl = `https://app.cornertravel.com.tw/api/d/${tourCode}`

  const message = `【保險資料】團號：${tourCode}
團名：${tour.name}
天數：${days}天
地點：（未填）
航班：（未填）
業務：（未填）
旅客代表：（未填）

📎 名單下載：${shortUrl}

請協助報價，謝謝！`

  console.log('--- 訊息內容 ---')
  console.log(message)
  console.log('\n--- 短網址 ---')
  console.log(shortUrl)
  console.log('\n✅ 預覽完成（未實際發送）\n')
}

const tourCode = process.argv[2] || 'TW260321A'
previewInsurance(tourCode).catch(console.error)
