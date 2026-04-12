require('dotenv').config({ path: '/Users/william/Projects/venturo-erp/.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' },
})

// Nominatim 搜尋城市內特定類型
const CATEGORIES = [
  'tourist attraction',
  'museum',
  'art gallery',
  'historical landmark',
  'beach',
  'viewpoint',
  'park',
  'garden',
  'temple',
  'pagoda',
  'cathedral',
  'restaurant',
  'cafe',
  'hotel',
  'resort',
]

// 比對是否已經存在資料庫
function isAlreadyExists(name, englishName, existingNames) {
  if (!name || name.trim() === '') return false
  const nameLower = name.toLowerCase().trim()
  if (existingNames.has(nameLower)) return true

  if (englishName && englishName.trim() !== '') {
    const enLower = englishName.toLowerCase().trim()
    if (existingNames.has(enLower)) return true
    // 也比對部分相符（如果中文名稱包含在內）
    for (const existing of existingNames) {
      if (existing.includes(nameLower) || nameLower.includes(existing)) {
        return true
      }
    }
  }
  return false
}

async function searchPlaces(cityEn, countryEn) {
  const allResults = []

  for (const category of CATEGORIES) {
    const query = `${category} in ${cityEn}, ${countryEn}`
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=50&addressdetails=1`

    console.log(`  Searching ${category}...`)

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'CornerTravel/1.0' },
      })

      if (!response.ok) {
        console.error(`    HTTP ${response.status}`)
        await new Promise(resolve => setTimeout(resolve, 3000))
        continue
      }

      const data = await response.json()
      await new Promise(resolve => setTimeout(resolve, 2000))

      data.forEach(item => {
        const name = item.display_name.split(',')[0]
        allResults.push({
          osm_id: item.osm_id,
          osm_type: item.osm_type,
          name: name,
          display_name: item.display_name,
          category: item.category,
          type: item.type,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          importance: item.importance,
          address: item.address,
        })
      })

      console.log(`    Got ${data.length} results`)
    } catch (error) {
      console.error(`    Error:`, error.message)
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }

  // 去重複（同一地點可能被多個分類搜出來）
  const seen = new Set()
  const unique = allResults.filter(r => {
    if (seen.has(r.osm_id)) return false
    seen.add(r.osm_id)
    return true
  })

  // 過濾掉重要性太低的
  return unique.filter(r => (r.importance || 0) >= 0.2)
}

function categorizeType(category, type) {
  if (category === 'tourism' && type === 'attraction') return 'attraction'
  if (category === 'tourism' && type === 'museum') return 'museum'
  if (category === 'historic' || type === 'monument' || type === 'landmark') return 'historic'
  if (category === 'natural' && type === 'beach') return 'beach'
  if (category === 'tourism' && type === 'viewpoint') return 'viewpoint'
  if (category === 'leisure' && (type === 'park' || type === 'garden')) return 'park'
  if (category === 'amenity' && type === 'restaurant') return 'restaurant'
  if (category === 'amenity' && type === 'cafe') return 'cafe'
  if (category === 'tourism' && (type === 'hotel' || type === 'guest_house')) return 'hotel'
  if (category === 'tourism' && type === 'resort') return 'resort'
  if (category === 'place' && type === 'island') return 'island'
  if (category === 'religion' && (type === 'temple' || type === 'pagoda')) return 'temple'
  return `${category}_${type}`
}

async function findMissingInCity(cityZh, cityEn, cityId, countryId, countryEn, existingNames) {
  console.log(`\n=== 🔍 ${cityZh} (${cityEn}) ===`)

  const places = await searchPlaces(cityEn, countryEn)
  console.log(`  Total unique OSM places: ${places.length}`)

  // 過濾掉已經存在的
  const missing = places.filter(p => {
    const nameEn = p.address && p.address['name:en'] ? p.address['name:en'] : null
    return !isAlreadyExists(p.name, nameEn, existingNames)
  })

  console.log(`  🆕 New places not in database: ${missing.length}`)

  // 加上 metadata
  missing.forEach(p => {
    p.country_id = countryId
    p.city_id = cityId
    p.suggested_category = categorizeType(p.category, p.type)
  })

  // 依重要性排序（重要的在前）
  missing.sort((a, b) => (b.importance || 0) - (a.importance || 0))

  // 統計
  const stats = {}
  missing.forEach(p => {
    stats[p.suggested_category] = (stats[p.suggested_category] || 0) + 1
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
  console.log('發掘資料庫中缺漏的景點 - 從 OpenStreetMap')
  console.log('='.repeat(80))
  console.log('')

  // 要處理的國家和城市
  const countries = [
    {
      id: 'vietnam',
      name: '越南',
      en: 'Vietnam',
      cities: [
        { zh: '河內', en: 'Hanoi', id: 'hanoi' },
        { zh: '峴港', en: 'Da Nang', id: 'danang' },
        { zh: '芽莊', en: 'Nha Trang', id: 'nha-trang' },
        { zh: '順化', en: 'Hue', id: 'hue' },
      ],
    },
  ]

  // 先取出所有現有越南景點名稱，用來比對
  console.log('取得資料庫現有越南景點清單...')
  const { data: existingAttractions, error } = await supabase
    .from('attractions')
    .select('name, english_name')
    .eq('country_id', 'vietnam')

  if (error) {
    console.error('Error fetching existing attractions:', error)
    return
  }

  console.log(`Existing attractions in database: ${existingAttractions.length}`)
  console.log('')

  // 建立比對用 Set
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
        const missing = await findMissingInCity(
          city.zh,
          city.en,
          city.id,
          country.id,
          country.en,
          existingNames
        )
        allMissing.push(...missing)
      } catch (err) {
        console.error(`  ❌ Error processing ${city.zh}:`, err.message)
        continue
      }
    }
  }

  console.log('\n')
  console.log('='.repeat(80))
  console.log('📊 最終結果')
  console.log('='.repeat(80))

  console.log(`\nTotal missing places discovered in Vietnam: ${allMissing.length}`)

  // 統計分類
  const totalStats = {}
  allMissing.forEach(p => {
    totalStats[p.suggested_category] = (totalStats[p.suggested_category] || 0) + 1
  })
  console.log('\nBy category:')
  Object.entries(totalStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, cnt]) => {
      console.log(`  ${cat}: ${cnt}`)
    })

  // 排序：重要性由高到低
  allMissing.sort((a, b) => (b.importance || 0) - (a.importance || 0))

  // 儲存結果
  const outputPath = `/Users/william/Projects/venturo-erp/scripts/vietnam-missing-places.json`
  fs.writeFileSync(outputPath, JSON.stringify(allMissing, null, 2))

  // 輸出 CSV 預覽前 20 個
  console.log('\n🏆 Top 20 most important missing places:')
  console.log('name,suggested_category,lat,lon,importance')
  allMissing.slice(0, 20).forEach(p => {
    console.log(`"${p.name}",${p.suggested_category},${p.lat},${p.lon},${p.importance}`)
  })

  console.log(`\n💾 Full results saved to: ${outputPath}`)
  console.log(`\n🎊 發現了 ${allMissing.length} 個你們資料庫還沒有的地點！可以供團隊挑選新增囉！`)
}

main()
