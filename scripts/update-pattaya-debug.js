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

  const results = JSON.parse(
    fs.readFileSync('/Users/william/Projects/venturo-erp/scripts/pattaya-osm-results.json', 'utf8')
  )

  console.log(`Loaded ${results.length} results`)
  console.log('')

  const withOsm = results.filter(r => r.osm)
  console.log(`Total with OSM data: ${withOsm.length}`)
  withOsm.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name} -> osm exists: ${!!r.osm}`)
  })
}

main()
