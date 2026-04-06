require('dotenv').config({ path: '/Users/william/Projects/venturo-erp/.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' },
})

async function main() {
  // 撈一筆來看有什麼欄位
  const { data, error } = await supabase
    .from('attractions')
    .select('*')
    .eq('country_id', 'thailand')
    .eq('city_id', 'pattaya')
    .limit(1)

  if (error) {
    console.error('Error:', error)
    return
  }

  if (data && data.length > 0) {
    console.log('Columns in attractions table:')
    console.log(Object.keys(data[0]))
    console.log('')
    console.log('Sample record:')
    console.log(JSON.stringify(data[0], null, 2))
  }
}

main()
