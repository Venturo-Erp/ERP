require('dotenv').config({ path: '/Users/william/Projects/venturo-erp/.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// OpenStreetMap Nominatim API 搜尋
async function searchOSM(name, city, country) {
  const query = `${name}, ${city}, ${country}`
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'CornerTravel/1.0' },
    })

    if (!response.ok) {
      console.error(`HTTP error ${response.status} for ${name}`)
      await new Promise(resolve => setTimeout(resolve, 2000))
      return null
    }

    const data = await response.json()
    await new Promise(resolve => setTimeout(resolve, 2000)) // Nominatim 要求間隔至少 1 秒

    if (data.length === 0) {
      return null
    }

    // 拿第一個結果
    const first = data[0]
    return {
      lat: parseFloat(first.lat),
      lon: parseFloat(first.lon),
      display_name: first.display_name,
      type: first.type,
    }
  } catch (error) {
    console.error(`Error searching ${name}:`, error.message)
    await new Promise(resolve => setTimeout(resolve, 3000))
    return null
  }
}

async function main() {
  console.log('Connecting to Supabase...')

  // 查詢泰國芭達雅所有景點
  const { data: attractions, error } = await supabase
    .from('attractions')
    .select('id, name, city_id, region_id, country_id, latitude, longitude')
    .eq('country_id', 'thailand')
    .eq('city_id', 'pattaya')

  if (error) {
    console.error('Query error:', error)
    return
  }

  console.log(`Found ${attractions.length} attractions in Pattaya`)
  console.log('')

  // 逐個查 OpenStreetMap
  const results = []
  for (const attr of attractions) {
    console.log(`Searching: ${attr.name}...`)
    const result = await searchOSM(attr.name, 'Pattaya', 'Thailand')
    if (result) {
      console.log(`  ✅ Found: ${result.lat}, ${result.lon} (${result.type})`)
      results.push({
        ...attr,
        osm: result,
      })
    } else {
      console.log(`  ❌ Not found`)
      results.push({
        ...attr,
        osm: null,
      })
    }
  }

  console.log('')
  console.log('=== Summary ===')
  const found = results.filter(r => r.osm !== null)
  console.log(
    `Total: ${results.length}, Found: ${found.length} (${Math.round((found.length / results.length) * 100)}%)`
  )
  console.log('')

  // 輸出 CSV
  console.log('=== CSV Output (for import) ===')
  console.log('id,name,current_lat,current_lon,osm_lat,osm_lon,type')
  results.forEach(r => {
    console.log(
      `${r.id},"${r.name}",${r.latitude || ''},${r.longitude || ''},${r.osm?.lat || ''},${r.osm?.lon || ''},${r.osm?.type || ''}`
    )
  })

  // 儲存 JSON
  const fs = require('fs')
  fs.writeFileSync(
    '/Users/william/Projects/venturo-erp/scripts/pattaya-osm-results.json',
    JSON.stringify(results, null, 2)
  )
  console.log('')
  console.log(
    'Results saved to: /Users/william/Projects/venturo-erp/scripts/pattaya-osm-results.json'
  )
}

main()
