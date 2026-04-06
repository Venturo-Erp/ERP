// 匯入星野集團飯店資料到 Supabase luxury_hotels 資料表
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 載入 .env.local 環境變數
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

// 讀取環境變數
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('錯誤：請設定 SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY 環境變數')
  process.exit(1)
}

// 建立 Supabase 客戶端
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
})

// 刷新 schema cache
async function refreshSchema() {
  await supabase.from('luxury_hotels').select('id').limit(1)
}

// 讀取星野集團飯店資料
const hoshinoyaData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'hoshinoya-complete.json'), 'utf8')
)

console.log(`讀取到 ${hoshinoyaData.length} 間星野集團飯店`)

// 轉換資料格式符合資料庫 schema
function transformHotel(hotel) {
  return {
    name: hotel.name,
    name_en: hotel.english_name,
    brand: hotel.brand,
    country_id: hotel.country_id,
    region_id: hotel.region_id || null,
    city_id: hotel.city_id,
    category: hotel.category,
    star_rating: hotel.star_rating,
    hotel_class: hotel.hotel_class,
    description: hotel.description,
    highlights: hotel.highlights,
    price_range: hotel.price_range,
    facilities: hotel.facilities,
    website: hotel.website,
    is_active: true,
  }
}

async function importHotels() {
  console.log('刷新 schema cache...')
  await refreshSchema()
  console.log('開始匯入...')

  let successCount = 0
  let failCount = 0

  for (const hotelRaw of hoshinoyaData) {
    const hotel = transformHotel(hotelRaw)

    const { data, error } = await supabase.from('luxury_hotels').insert(hotel)

    if (error) {
      console.error(`❌ 匯入失敗：${hotel.name}`, error.message)
      failCount++
    } else {
      console.log(`✅ 匯入成功：${hotel.name}`)
      successCount++
    }

    // 稍微延遲避免壓力太大
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('\n=== 匯入完成 ===')
  console.log(`成功：${successCount} 間`)
  console.log(`失敗：${failCount} 間`)
  console.log(`總計：${hoshinoyaData.length} 間`)
}

importHotels()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('發生未預期錯誤', err)
    process.exit(1)
  })
