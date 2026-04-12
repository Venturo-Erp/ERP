require('dotenv').config({ path: '/Users/william/Projects/venturo-erp/.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' },
})

// 分類過濾
const OSM_FILTER = `
(
  // 景點
  node["tourism"="attraction"];
  node["tourism"="museum"];
  node["tourism"="viewpoint"];
  node["historic"="monument"];
  node["historic"="ruins"];
  node["natural"="beach"];
  node["natural"="cape"];
  node["leisure"="park"];
  node["leisure"="garden"];
  node["historic"="fort"];
  node["historic"="castle"];
  // 宗教
  node["religion"="buddhist"]["amenity"="temple"];
  node["amenity"="place_of_worship"];
  node["historic"="pagoda"];
  // 餐飲
  node["amenity"="restaurant"];
  node["amenity"="cafe"];
  // 住宿
  node["tourism"="hotel"];
  node["tourism"="guest_house"];
  node["tourism"="resort"];
);
`

// 比對是否已經存在
function isAlreadyExists(name, englishName, existingNames) {
  if (!name || name.trim() === '') return false
  const nameLower = name.toLowerCase().trim()
  // 完全比對
  if (existingNames.has(nameLower)) return true

  if (englishName && englishName.trim() !== '') {
    const enLower = englishName.trim().toLowerCase()
    if (existingNames.has(enLower)) return true
  }

  // 部分比對（如果中文名稱已經存在於資料庫某個名稱中）
  for (const existing of existingNames) {
    if (existing.includes(nameLower) || nameLower.includes(existing)) {
      return true
    }
  }

  return false
}

function categorizeOSM(tags) {
  if (tags.tourism === 'attraction') return 'attraction'
  if (tags.tourism === 'museum') return 'museum'
  if (tags.tourism === 'viewpoint') return 'viewpoint'
  if (tags.historic) return 'historic'
  if (tags.natural === 'beach') return 'beach'
  if (tags.leisure === 'park' || tags.leisure === 'garden') return 'park'
  if (tags.amenity === 'restaurant') return 'restaurant'
  if (tags.amenity === 'cafe') return 'cafe'
  if (tags.religion === 'buddhist' || tags.historic === 'pagoda') return 'temple'
  if (tags.tourism === 'hotel') return 'hotel'
  if (tags.tourism === 'resort') return 'resort'
  if (tags.tourism === 'guest_house') return 'guesthouse'
  return tags.tourism || tags.amenity || tags.historic || tags.leisure || 'other'
}

// 先找城市的 area id
async function getCityAreaId(cityName, countryName) {
  const query = `${cityName}, ${countryName}`
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'CornerTravel/1.0' },
    })
    await new Promise(resolve => setTimeout(resolve, 2000))

    if (!response.ok) return null
    const data = await response.json()

    // 找對應的行政區
    for (const result of data) {
      if (result.osm_type === 'relation' || result.osm_type === 'way') {
        return result.osm_id
      }
    }

    return data[0]?.osm_id || null
  } catch (error) {
    console.error(`  Error getting city area:`, error.message)
    await new Promise(resolve => setTimeout(resolve, 5000))
    return null
  }
}

// 用 Overpass 撈城市內所有符合的地點
async function fetchCityPlaces(cityNameZh, cityNameEn, countryNameEn) {
  console.log(`  Getting city area ID for ${cityNameEn}...`)
  const areaId = await getCityAreaId(cityNameEn, countryNameEn)
  if (!areaId) {
    console.error(`  ❌ Could not find area ID for ${cityNameEn}`)
    return []
  }

  console.log(`  Found area ID: ${areaId}, querying Overpass...`)

  // Overpass 查詢：area 編碼是 osm_id + 3600000000
  const overpassQuery = `
[out:json][timeout:60];
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

    await new Promise(resolve => setTimeout(resolve, 5000))

    if (!response.ok) {
      console.error(`  HTTP ${response.status} from Overpass`)
      return []
    }

    const data = await response.json()
    console.log(`  Overpass returned ${data.elements.length} elements`)

    const places = data.elements
      .filter(el => {
        // 只保留有中心座標的
        return el.center || (el.lat && el.lon)
      })
      .map(el => {
        const center = el.center || { lat: el.lat, lon: el.lon }
        const tags = el.tags || {}
        return {
          osm_id: el.id,
          osm_type: el.type,
          name: tags.name || tags['name:en'] || `OSM-${el.id}`,
          name_en: tags['name:en'] || null,
          name_zh: tags['name:zh'] || null,
          lat: parseFloat(center.lat),
          lon: parseFloat(center.lon),
          category: categorizeOSM(tags),
          tags: tags,
          importance: 0.5, // 無法取得 importance，預設
        }
      })

    console.log(`  Processed ${places.length} valid places`)
    return places
  } catch (error) {
    console.error(`  Error querying Overpass:`, error.message)
    await new Promise(resolve => setTimeout(resolve, 10000))
    return []
  }
}

async function processCity(cityZh, cityEn, cityId, countryId, countryEn, existingNames) {
  console.log(`\n=== 🔍 ${cityZh} (${cityEn}) ===`)

  let places
  let attempts = 0
  do {
    places = await fetchCityPlaces(cityZh, cityEn, countryEn)
    attempts++
    if (places.length === 0 && attempts < 3) {
      console.log(`  Retrying... (attempt ${attempts + 1})`)
      await new Promise(resolve => setTimeout(resolve, 10000))
    }
  } while (places.length === 0 && attempts < 3)

  if (places.length === 0) {
    console.log(`  ❌ No results after ${attempts} attempts`)
    return []
  }

  // 過濾掉已經存在的
  const missing = places.filter(p => {
    // 優先使用中文名稱
    const checkName = p.name_zh || p.name
    return !isAlreadyExists(checkName, p.name_en, existingNames)
  })

  console.log(`  Total from OSM: ${places.length}`)
  console.log(`  🆕 New places not in database: ${missing.length}`)

  // 加上 metadata
  missing.forEach(p => {
    p.country_id = countryId
    p.city_id = cityId
  })

  // 統計
  const stats = {}
  missing.forEach(p => {
    stats[p.category] = (stats[p.category] || 0) + 1
  })
  if (Object.keys(stats).length > 0) {
    console.log(`  By category:`)
    Object.entries(stats).forEach(([cat, cnt]) => {
      console.log(`    ${cat}: ${cnt}`)
    })
  }

  return missing
}

async function main() {
  console.log('='.repeat(80))
  console.log('發掘缺漏景點 v2 - 使用 Overpass API')
  console.log('撈取 OpenStreetMap 上城市內所有景點，比對後找出缺漏')
  console.log('='.repeat(80))
  console.log('')

  const countries = [
    {
      id: 'vietnam',
      name: '越南',
      name_en: 'Vietnam',
      cities: [
        { zh: '河內', en: 'Hanoi', id: 'hanoi' },
        { zh: '峴港', en: 'Da Nang', id: 'danang' },
        { zh: '芽莊', en: 'Nha Trang', id: 'nha-trang' },
        { zh: '順化', en: 'Hue', id: 'hue' },
      ],
    },
  ]

  // 取得現有景點
  console.log('Loading existing attractions from database...')
  const { data: existingAttractions, error } = await supabase
    .from('attractions')
    .select('name, english_name')
    .eq('country_id', 'vietnam')

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log(`Existing attractions in Vietnam: ${existingAttractions.length}`)
  console.log('')

  // 建立比對 Set
  const existingNames = new Set()
  existingAttractions.forEach(a => {
    if (a.name) existingNames.add(a.name.toLowerCase().trim())
    if (a.english_name) existingNames.add(a.english_name.toLowerCase().trim())
  })

  let allMissing = []

  for (const country of countries) {
    console.log(`\n## 🇻🇳 ${country.name}`)
    for (const city of country.cities) {
      try {
        const missing = await processCity(
          city.zh,
          city.en,
          city.id,
          country.id,
          country.name_en,
          existingNames
        )
        allMissing.push(...missing)
        // 城市之間休息
        await new Promise(resolve => setTimeout(resolve, 8000))
      } catch (err) {
        console.error(`  ❌ Error: ${err.message}`)
        continue
      }
    }
  }

  console.log('\n')
  console.log('='.repeat(80))
  console.log('📊 最終結果')
  console.log('='.repeat(80))

  console.log(`\n✅ Total missing places discovered: ${allMissing.length}`)

  // 統計分類
  const stats = {}
  allMissing.forEach(p => {
    stats[p.category] = (stats[p.category] || 0) + 1
  })
  console.log('\nBy category:')
  Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, cnt]) => {
      console.log(`  ${cat}: ${cnt}`)
    })

  // 儲存
  const outputPath = `/Users/william/Projects/venturo-erp/scripts/vietnam-missing-places.json`
  fs.writeFileSync(outputPath, JSON.stringify(allMissing, null, 2))

  // 預覽前 20 個
  console.log('\n🏆 Preview (first 20):')
  console.log('name (zh/en), category, lat, lon')
  allMissing.slice(0, 20).forEach(p => {
    const displayName = p.name_zh || p.name
    console.log(`  ${displayName} (${p.name_en || '-'}) → ${p.category} @ ${p.lat}, ${p.lon}`)
  })

  console.log(`\n💾 Full results saved to: ${outputPath}`)
  console.log(`\n🎉 Done! Found ${allMissing.length} potential new places for your team to review!`)
}

main()
