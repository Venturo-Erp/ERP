require('dotenv').config({ path: '/Users/william/Projects/venturo-erp/.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Wikidata SPARQL 查詢：透過景點名稱 + 城市找座標
async function searchWikidata(name, city, country) {
  const query = `
    SELECT ?item ?lat ?lon ?itemLabel WHERE {
      ?item rdfs:label ?itemLabel .
      ?item wdt:P625 ?coordinate .
      BIND(STRBEFORE(STR(?coordinate), " ") AS ?latStr) .
      BIND(STRAFTER(STR(?coordinate), " ") AS ?lonStr) .
      BIND(xsd:double(?latStr) AS ?lat) .
      BIND(xsd:double(?lonStr) AS ?lon) .
      FILTER(LANG(?itemLabel) = "zh" || LANG(?itemLabel) = "en") .
      FILTER(CONTAINS(LCASE(?itemLabel), LCASE("${name}"))) .
      OPTIONAL { ?item wdt:P131 ?city . ?city rdfs:label ?cityLabel . FILTER(CONTAINS(LCASE(?cityLabel), LCASE("${city}"))) } .
    }
    LIMIT 5
  `

  const url =
    'https://query.wikidata.org/sparql?query=' + encodeURIComponent(query) + '&format=json'

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'CornerTravel/1.0' },
    })
    if (!response.ok) {
      console.error(`HTTP error ${response.status} for ${name}`)
      await new Promise(resolve => setTimeout(resolve, 2000))
      return null
    }
    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch (parseError) {
      console.error(`JSON parse error for ${name}:`, parseError.message)
      await new Promise(resolve => setTimeout(resolve, 2000))
      return null
    }
    await new Promise(resolve => setTimeout(resolve, 3000)) // 避免太快被擋，Wikidata rate limit 嚴格

    if (data.results.bindings.length === 0) {
      return null
    }

    // 拿第一個結果
    const first = data.results.bindings[0]
    return {
      lat: parseFloat(first.lat.value),
      lon: parseFloat(first.lon.value),
      item: first.item.value,
      name: first.itemLabel.value,
    }
  } catch (error) {
    console.error(`Error searching ${name}:`, error.message)
    await new Promise(resolve => setTimeout(resolve, 2000))
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

  // 逐個查 Wikidata
  const results = []
  for (const attr of attractions) {
    console.log(`Searching: ${attr.name}...`)
    const result = await searchWikidata(attr.name, 'Pattaya', 'Thailand')
    if (result) {
      console.log(`  ✅ Found: ${result.lat}, ${result.lon}`)
      results.push({
        ...attr,
        wikidata: result,
      })
    } else {
      console.log(`  ❌ Not found`)
      results.push({
        ...attr,
        wikidata: null,
      })
    }
  }

  console.log('')
  console.log('=== Summary ===')
  const found = results.filter(r => r.wikidata !== null)
  console.log(
    `Total: ${results.length}, Found: ${found.length} (${Math.round((found.length / results.length) * 100)}%)`
  )
  console.log('')

  // 輸出 CSV
  console.log('=== CSV Output (for import) ===')
  console.log('id,name,current_lat,current_lon,wikidata_lat,wikidata_lon')
  results.forEach(r => {
    console.log(
      `${r.id},"${r.name}",${r.latitude || ''},${r.longitude || ''},${r.wikidata?.lat || ''},${r.wikidata?.lon || ''}`
    )
  })

  // 儲存 JSON
  const fs = require('fs')
  fs.writeFileSync(
    '/Users/william/Projects/venturo-erp/scripts/pattaya-wikidata-results.json',
    JSON.stringify(results, null, 2)
  )
  console.log('')
  console.log(
    'Results saved to: /Users/william/Projects/venturo-erp/scripts/pattaya-wikidata-results.json'
  )
}

main()
