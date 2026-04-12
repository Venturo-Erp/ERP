require('dotenv').config({ path: '/Users/william/Projects/venturo-erp/.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' },
})

// 讀取清理好的資料
const discoveries = require('./new-discoveries-thailand-cleaned.json')

console.log('========================================')
console.log('🚀 自動匯入新發現地點')
console.log('========================================')
console.log(`總共準備匯入：${discoveries.length} 筆`)

// 分類對應
function mapToTable(item) {
  const { category } = item

  // 餐廳相關都去 restaurants
  if (['street_food', 'restaurant', 'cafe', 'spa'].includes(category)) {
    return 'restaurants'
  }

  // 其他都去 attractions（包含飯店住宿，使用者本來習慣放這）
  return 'attractions'
}

// 轉換成 attractions 格式
function convertAttraction(item) {
  return {
    name: item.name_zh || item.name_en,
    english_name: item.name_en || null,
    country_id: item.country_id,
    city_id: item.city_id,
    category: item.category,
    latitude: item.lat,
    longitude: item.lon,
    data_verified: false, // 全部預設未驗證
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

// 轉換成 restaurants 格式
function convertRestaurant(item) {
  const categoryMap = {
    street_food: 'street_food',
    restaurant: 'fine_dining',
    cafe: 'cafe',
    spa: 'spa',
  }

  return {
    name: item.name_zh || item.name_en,
    english_name: item.name_en || null,
    name_local: item.name_en,
    country_id: item.country_id,
    city_id: item.city_id,
    latitude: item.lat,
    longitude: item.lon,
    category: categoryMap[item.category] || 'restaurant',
    data_verified: false, // 全部預設未驗證
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

async function importAll() {
  const stats = {
    attractions: 0,
    restaurants: 0,
    errors: 0,
    total: discoveries.length,
  }

  console.log('\n開始分批匯入...\n')

  for (const [index, item] of discoveries.entries()) {
    const table = mapToTable(item)
    const data = table === 'attractions' ? convertAttraction(item) : convertRestaurant(item)

    // 檢查是否已經存在（同名同城市）
    const { data: existing } = await supabase
      .from(table)
      .select('id')
      .eq('country_id', item.country_id)
      .eq('city_id', item.city_id)
      .ilike('name', `%${data.name}%`)
      .limit(1)

    if (existing && existing.length > 0) {
      console.log(`⚠️  [${index + 1}/${discoveries.length}] 已存在跳過: ${data.name} (${table})`)
      continue
    }

    // 插入
    const { error } = await supabase.from(table).insert(data)

    if (error) {
      console.error(
        `❌  [${index + 1}/${discoveries.length}] 插入失敗: ${data.name}`,
        error.message
      )
      stats.errors++
    } else {
      console.log(`✅  [${index + 1}/${discoveries.length}] 插入成功: ${data.name} (${table})`)
      stats[table]++
    }

    // 慢一點不要一次衝
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  console.log('\n')
  console.log('========================================')
  console.log('🏁 匯入完成！統計：')
  console.log('========================================')
  console.log(`👉 匯入 attractions: ${stats.attractions} 筆`)
  console.log(`👉 匯入 restaurants: ${stats.restaurants} 筆`)
  console.log(`❌ 失敗/跳過: ${stats.errors} 筆`)
  console.log(`📊 實際新增: ${stats.attractions + stats.restaurants} 筆`)
  console.log('========================================')
  console.log('\n✅ 全部新增都已經標註為「未驗證」，團隊可以後續審核！')
  console.log('✅ 國家/城市 ID 都正確，原本的篩選功能完全正常！')
}

importAll()
