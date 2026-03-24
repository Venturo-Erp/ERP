import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function main() {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('type', 'expense')
    .order('sort_order')

  if (error) {
    console.error('錯誤:', error.message)
    return
  }

  console.log('資料庫裡的類別：')
  data.forEach(cat => {
    console.log(`${cat.icon} ${cat.name} (${cat.color})`)
  })
}

main()
