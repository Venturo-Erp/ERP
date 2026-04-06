require('dotenv').config({ path: '/Users/william/Projects/venturo-erp/.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  console.log('Testing connection to:', supabaseUrl)

  // 測試查詢
  const { data, error } = await supabase.from('luxury_hotels').select('count').limit(1)

  if (error) {
    console.error('Error:', error)
    return
  }

  // 計算總筆數
  const { count, error: countError } = await supabase.from('luxury_hotels').count('exact')

  if (countError) {
    console.error('Count error:', countError)
    return
  }

  console.log(`✅ 連線成功！luxury_hotels 表格共有 ${count} 筆資料`)

  // 查詢日本的飯店
  const { data: japanHotels, error: japanError } = await supabase
    .from('luxury_hotels')
    .select('name, brand, country_id')
    .eq('country_id', 'japan')
    .limit(5)

  if (japanError) {
    console.error('Japan query error:', japanError)
    return
  }

  console.log(`\n🇯🇵 日本星野飯店（前五筆）：`)
  japanHotels.forEach(h => {
    console.log(`   - ${h.name} (${h.brand})`)
  })

  // 查詢台灣的飯店
  const { data: taiwanHotels, error: twError } = await supabase
    .from('luxury_hotels')
    .select('name, brand, country_id')
    .eq('country_id', 'taiwan')

  if (twError) {
    console.error('Taiwan query error:', twError)
    return
  }

  console.log(`\n🇹🇼 台灣星野飯店：`)
  taiwanHotels.forEach(h => {
    console.log(`   - ${h.name} (${h.brand})`)
  })
}

test()
