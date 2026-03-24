import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function main() {
  const tourCode = 'HAN260925A'
  
  // 查詢團的航班資料
  const { data: tour, error } = await supabase
    .from('tours')
    .select('id, code, name, outbound_flight, return_flight')
    .eq('code', tourCode)
    .single()

  if (error) {
    console.error('查詢失敗:', error.message)
    return
  }

  console.log('團號:', tour.code)
  console.log('團名:', tour.name)
  console.log('去程航班:', tour.outbound_flight || '無')
  console.log('回程航班:', tour.return_flight || '無')
}

main()
