require('dotenv').config({ path: '/Users/william/Projects/venturo-erp/.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' },
})

// OpenStreetMap Nominatim API 搜尋 - 先中文後英文
async function searchOSM(name, englishName, city, country) {
  // 先試中文 + 城市
  let query = `${name}, ${city}, ${country}`
  let result = await doSearch(query)

  if (result) {
    return result
  }

  // 中文找不到，試不帶城市
  query = `${name}, ${country}`
  result = await doSearch(query)

  if (result) {
    return result
  }

  // 還是找不到，試英文 + 城市
  if (englishName && englishName.trim() !== '') {
    query = `${englishName}, ${city}, ${country}`
    result = await doSearch(query)
    if (result) {
      console.log(`  ✅ Found with English: ${englishName}`)
      return result
    }

    // 英文 + 城市找不到，試英文不帶城市
    query = `${englishName}, ${country}`
    result = await doSearch(query)
    if (result) {
      console.log(`  ✅ Found with English (no city): ${englishName}`)
      return result
    }
  }

  return null
}

async function doSearch(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'CornerTravel/1.0' },
    })

    if (!response.ok) {
      console.error(`  HTTP ${response.status} for "${query}"`)
      await new Promise(resolve => setTimeout(resolve, 3000))
      return null
    }

    const data = await response.json()
    await new Promise(resolve => setTimeout(resolve, 2000)) // 遵守 Nominatim 規定：至少 1 秒

    if (data.length === 0) {
      return null
    }

    const first = data[0]
    return {
      lat: parseFloat(first.lat),
      lon: parseFloat(first.lon),
      display_name: first.display_name,
      type: first.type,
    }
  } catch (error) {
    console.error(`  Error searching "${query}":`, error.message)
    await new Promise(resolve => setTimeout(resolve, 3000))
    return null
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('自動填補越南所有景點座標')
  console.log('='.repeat(60))
  console.log('')

  console.log('Connecting to Supabase...')

  // 查詢越南所有景點，只抓 latitude 空的
  const { data: attractions, error } = await supabase
    .from('attractions')
    .select('id, name, english_name, city_id, region_id, country_id, latitude, longitude')
    .eq('country_id', 'vietnam')
    .is('latitude', null)

  if (error) {
    console.error('Query error:', error)
    return
  }

  console.log(`Found ${attractions.length} attractions in Vietnam with empty coordinates`)
  console.log('')

  if (attractions.length === 0) {
    console.log('🎉 越南所有景點都已經有座標了！完成！')
    return
  }

  // 逐個抓取並更新
  let updated = 0
  let notFound = 0
  const results = []

  for (const [index, attr] of attractions.entries()) {
    console.log(`[${index + 1}/${attractions.length}] Searching: ${attr.name} (${attr.city_id})...`)

    // 城市名稱中文轉英文
    const cityMap = {
      danang: 'Da Nang',
      hanoi: 'Hanoi',
      'ho-chi-minh': 'Ho Chi Minh City',
      'nha-trang': 'Nha Trang',
      hue: 'Hue',
      halong: 'Ha Long',
      sapa: 'Sapa',
      'phu-quoc': 'Phu Quoc',
      'danang-city': 'Da Nang',
      'hoi-an': 'Hoi An',
    }
    const cityEn = attr.city_id && cityMap[attr.city_id] ? cityMap[attr.city_id] : attr.city_id

    const result = await searchOSM(attr.name, attr.english_name, cityEn || '', 'Vietnam')

    if (result) {
      console.log(`  ✅ Found: ${result.lat}, ${result.lon} (${result.type})`)

      // 直接更新到資料庫
      const { updateError } = await supabase
        .from('attractions')
        .update({
          latitude: result.lat,
          longitude: result.lon,
          updated_at: new Date().toISOString(),
        })
        .eq('id', attr.id)

      if (updateError) {
        console.error(`  ❌ Update failed: ${updateError.message}`)
        notFound++
        results.push({ ...attr, osm: null, error: updateError.message })
      } else {
        updated++
        results.push({ ...attr, osm: result })
      }
    } else {
      console.log(`  ❌ Not found`)
      notFound++
      results.push({ ...attr, osm: null })
    }
  }

  console.log('')
  console.log('='.repeat(60))
  console.log('越南座標填補完成')
  console.log('='.repeat(60))
  console.log(`Total empty: ${attractions.length}`)
  console.log(`✅ Successfully updated: ${updated}`)
  console.log(`❌ Not found / failed: ${notFound}`)
  console.log('')

  // 儲存結果記錄
  fs.writeFileSync(
    '/Users/william/Projects/venturo-erp/scripts/vietnam-coord-results.json',
    JSON.stringify(results, null, 2)
  )
  console.log(
    'Results saved to: /Users/william/Projects/venturo-erp/scripts/vietnam-coord-results.json'
  )

  if (updated > 0) {
    console.log(`🎉 成功幫越南補齊了 ${updated} 個景點座標！`)
  } else {
    console.log('😕 這次沒有找到任何可以更新的座標')
  }
}

main()
