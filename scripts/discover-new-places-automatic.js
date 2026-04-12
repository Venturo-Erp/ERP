require('dotenv').config({ path: '/Users/william/Projects/venturo-erp/.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' },
})

// 要發掘的目標城市（優先泰國清邁）
const TARGET_CITIES = [
  {
    countryId: 'thailand',
    countryName: '泰國',
    countryEn: 'Thailand',
    cityId: 'chiang-mai',
    cityZh: '清邁',
    cityEn: 'Chiang Mai',
  },
  {
    countryId: 'thailand',
    countryName: '泰國',
    countryEn: 'Thailand',
    cityId: 'bangkok',
    cityZh: '曼谷',
    cityEn: 'Bangkok',
  },
]

// OSM 分類：我們要發掘這些類型
// 包含：景點、博物館、廟宇、餐廳、小吃、咖啡、飯店、民宿、度假村、市集、夜市
const OSM_FILTER = `
(
  // 景點與文化
  node["tourism"="attraction"];
  node["tourism"="museum"];
  node["tourism"="viewpoint"];
  node["historic"="monument"];
  node["historic"="temple"];
  node["historic"="ruins"];
  node["natural"="beach"];
  node["natural"="mountain"];
  node["leisure"="park"];
  node["leisure"="market"];
  node["shop"="market"];
  node["amenity"="marketplace"];
  // 餐飲
  node["amenity"="restaurant"];
  node["amenity"="cafe"];
  node["amenity"="fast_food"];
  node["amenity"="street_food"];
  // 住宿
  node["tourism"="hotel"];
  node["tourism"="guesthouse"];
  node["tourism"="hostel"];
  node["tourism"="resort"];
  node["tourism"="apartment"];
  node["tourism"="villa"];
  // 夜市
  node["tourism"="night_market"];
);
`

// 比對是否已經存在
function isAlreadyExists(name, nameEn, existingNames) {
  if (!name || name.trim() === '') return true

  const nameLower = name.trim().toLowerCase()

  // 完全比對
  if (existingNames.has(nameLower)) return true

  if (nameEn && nameEn.trim() !== '') {
    const enLower = nameEn.trim().toLowerCase()
    if (existingNames.has(enLower)) return true
  }

  // 部分比對
  for (const existing of existingNames) {
    if (existing.includes(nameLower) || nameLower.includes(existing)) {
      return true
    }
  }

  return false
}

function categorizePlace(tags) {
  const { tourism, amenity, historic, natural, leisure, shop } = tags

  if (historic) return 'historic'
  if (natural === 'beach') return 'beach'
  if (tourism === 'attraction') return 'attraction'
  if (tourism === 'museum') return 'museum'
  if (tourism === 'viewpoint') return 'viewpoint'
  if (leisure === 'park') return 'park'
  if (leisure === 'market' || shop === 'market' || amenity === 'marketplace') return 'market'
  if (tourism === 'night_market') return 'night_market'
  if (amenity === 'restaurant') return 'restaurant'
  if (amenity === 'cafe') return 'cafe'
  if (amenity === 'street_food' || amenity === 'fast_food') return 'street_food'
  if (tourism === 'hotel') return 'hotel'
  if (tourism === 'guesthouse' || tourism === 'hostel') return 'guesthouse'
  if (tourism === 'resort') return 'resort'
  if (tourism === 'villa' || tourism === 'apartment') return 'villa'

  return 'other'
}

// 取得城市 area ID
async function getCityAreaId(cityNameEn, countryNameEn) {
  const query = `${cityNameEn}, ${countryNameEn}`
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10`

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'CornerTravel/1.0' },
    })
    await new Promise(resolve => setTimeout(resolve, 2000))

    if (!response.ok) {
      console.error(`  HTTP ${response.status} getting area ID`)
      return null
    }

    const data = await response.json()

    // 找關係（行政區）
    for (const result of data) {
      if (result.osm_type === 'relation') {
        console.log(`  Found area relation: ${result.osm_id} (${result.display_name})`)
        return result.osm_id
      }
    }

    // 找不到關係就回第一個
    return data[0]?.osm_id || null
  } catch (error) {
    console.error(`  Error getting area ID:`, error.message)
    await new Promise(resolve => setTimeout(resolve, 5000))
    return null
  }
}

// Overpass 查詢
async function queryOverpass(areaId) {
  const overpassQuery = `
[out:json][timeout:120];
area(${areaId + 3600000000});
${OSM_FILTER}
out center;
>;
out skel qt;
  `.trim()

  const url = `https://overpass-api.de/api/interpreter`

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: overpassQuery,
      headers: {
        'Content-Type': 'text/plain',
        'User-Agent': 'CornerTravel/1.0',
      },
    })

    await new Promise(resolve => setTimeout(resolve, 10000))

    if (!response.ok) {
      console.error(`  Overpass HTTP ${response.status}`)
      return []
    }

    const data = await response.json()
    return data.elements || []
  } catch (error) {
    console.error(`  Overpass error:`, error.message)
    await new Promise(resolve => setTimeout(resolve, 15000))
    return []
  }
}

async function discoverCity(city) {
  console.log(`\n========================================`)
  console.log(`🔍 發掘 ${city.cityZh} (${city.cityEn}), ${city.countryName}`)
  console.log(`========================================`)

  // 取得現有地名單
  console.log(`Loading existing attractions...`)
  const { data: existing, error } = await supabase
    .from('attractions')
    .select('name, english_name')
    .eq('country_id', city.countryId)
    .eq('city_id', city.cityId)

  if (error) {
    console.error(`Error fetching existing:`, error)
    return { city, discovered: [], error }
  }

  console.log(`Existing in DB: ${existing.length} attractions`)

  const existingNames = new Set()
  existing.forEach(a => {
    if (a.name) existingNames.add(a.name.toLowerCase().trim())
    if (a.english_name) existingNames.add(a.english_name.toLowerCase().trim())
  })

  // 取得 area ID
  const areaId = await getCityAreaId(city.cityEn, city.countryEn)
  if (!areaId) {
    console.error(`❌ Could not get area ID`)
    return { city, discovered: [], error: 'No area ID' }
  }

  // Overpass 查詢
  console.log(`Querying Overpass for places...`)
  const elements = await queryOverpass(areaId)

  if (elements.length === 0) {
    console.error(`❌ No elements returned`)
    return { city, discovered: [], error: 'No results' }
  }

  console.log(`Overpass returned ${elements.length} elements`)

  // 處理每個地點
  const discovered = []

  for (const el of elements) {
    const center = el.center || { lat: el.lat, lon: el.lon }
    const tags = el.tags || {}

    if (!center || !center.lat || !center.lon) continue

    // 取得名稱
    const name = tags['name:zh'] || tags.name || null
    const nameEn = tags['name:en'] || null

    if (!name && !nameEn) continue // 沒有名稱跳過

    // 檢查是否已經存在
    const checkName = name || nameEn
    if (isAlreadyExists(checkName, nameEn, existingNames)) {
      continue
    }

    // 新增到清單
    discovered.push({
      osm_id: el.id,
      osm_type: el.type,
      name_zh: name,
      name_en: nameEn,
      lat: parseFloat(center.lat),
      lon: parseFloat(center.lon),
      category: categorizePlace(tags),
      tags: tags,
      country_id: city.countryId,
      city_id: city.cityId,
      importance: 0.5,
    })
  }

  // 統計
  console.log(`\n📊 結果統計：`)
  console.log(`  OSM 總地點：${elements.length}`)
  console.log(`  已過濾掉重複：${elements.length - discovered.length}`)
  console.log(`  🆕 全新發現：${discovered.length} 個地點不在資料庫中！`)

  // 分類統計
  const stats = {}
  discovered.forEach(d => {
    stats[d.category] = (stats[d.category] || 0) + 1
  })
  console.log(`\n  依分類：`)
  Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, cnt]) => {
      console.log(`    ${cat}: ${cnt}`)
    })

  return { city, discovered, totalOsm: elements.length }
}

async function main() {
  console.log('='.repeat(80))
  console.log('🌍 自動發掘缺失景點 - 全自動執行')
  console.log('目標：撈出資料庫沒有的餐廳、小吃、景點、住宿，讓資料庫更齊全')
  console.log('='.repeat(80))
  console.log('')
  console.log(`目標城市：`)
  TARGET_CITIES.forEach(c => {
    console.log(`  • ${c.countryName} ${c.cityZh}`)
  })
  console.log('')

  const allResults = []
  let totalNewDiscoveries = 0

  for (const city of TARGET_CITIES) {
    try {
      const result = await discoverCity(city)
      allResults.push(result)
      totalNewDiscoveries += result.discovered?.length || 0
      // 城市之間休息
      await new Promise(resolve => setTimeout(resolve, 15000))
    } catch (err) {
      console.error(`❌ 處理 ${city.cityZh} 失敗:`, err.message)
      allResults.push({ city, error: err.message, discovered: [] })
      continue
    }
  }

  console.log('\n')
  console.log('='.repeat(80))
  console.log('🏆 最終成果')
  console.log('='.repeat(80))

  allResults.forEach(r => {
    const cnt = r.discovered?.length || 0
    console.log(`${r.city.cityZh}: ${cnt} 個新發現`)
  })

  console.log(`\n🎉 總共發現 ${totalNewDiscoveries} 個你們資料庫還沒有的地點！`)

  //  flatten all discoveries
  const allDiscovered = allResults.flatMap(r => r.discovered || [])

  // 依分類排序
  allDiscovered.sort((a, b) => {
    // 分類排序：小吃/餐廳優先，然後景點，然後住宿
    const order = {
      street_food: 1,
      restaurant: 2,
      cafe: 3,
      attraction: 4,
      museum: 5,
      historic: 6,
      beach: 7,
      park: 8,
      market: 9,
      night_market: 10,
      guesthouse: 11,
      hotel: 12,
      resort: 13,
      villa: 14,
    }
    return (order[a.category] || 99) - (order[b.category] || 99)
  })

  // 儲存結果
  const outputPath = `/Users/william/Projects/venturo-erp/scripts/new-discoveries-thailand.json`
  fs.writeFileSync(outputPath, JSON.stringify(allDiscovered, null, 2))

  console.log(`\n💾 結果儲存於: ${outputPath}`)
  console.log(`\n📋 可以直接匯入或是供團隊挑選，明天醒來就可以看！`)
  console.log(`\n✅ 全自動發掘完成！明天見！`)
}

main()
