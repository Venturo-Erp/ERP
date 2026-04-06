require('dotenv').config({ path: '/Users/william/Projects/venturo-erp/.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' },
})

async function main() {
  console.log('Loading OSM results...')

  // 讀取完整的 OSM 結果
  const results = JSON.parse(
    fs.readFileSync('/Users/william/Projects/venturo-erp/scripts/pattaya-osm-results.json', 'utf8')
  )

  console.log(`Loaded ${results.length} results`)
  console.log('')

  let updated = 0
  let skipped = 0

  for (const result of results) {
    if (!result.osm) {
      skipped++
      continue
    }

    console.log(
      `Updating: ${result.name} (id: ${result.id}) → ${result.osm.lat}, ${result.osm.lon}`
    )

    const { error } = await supabase
      .from('attractions')
      .update({
        latitude: result.osm.lat,
        longitude: result.osm.lon,
        updated_at: new Date().toISOString(),
      })
      .eq('id', result.id)

    if (error) {
      console.error(`  ❌ Error updating ${result.name}:`, error.message)
      skipped++
    } else {
      updated++
    }

    // 小延遲避免一次更新太多
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('')
  console.log('=== 芭達雅座標更新完成 ===')
  console.log(`Total processed: ${results.length}`)
  console.log(`✅ Successfully updated: ${updated}`)
  console.log(`⏭️  Skipped (no coordinates): ${skipped}`)

  // 統計原本是空的現在填了多少
  const wasEmptyGot = results.filter(
    r => r.osm && (r.latitude === null || r.latitude === undefined)
  )
  console.log(`✨ 原本空座標，這次補齊: ${wasEmptyGot.length} 個`)
}

main()
