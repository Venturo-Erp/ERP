import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function main() {
  console.log('🗑️  清除舊的請款類別...')

  // 刪除所有 type = 'expense' 的類別
  const { error } = await supabase
    .from('expense_categories')
    .delete()
    .eq('type', 'expense')

  if (error) {
    console.error('❌ 清除失敗:', error.message)
    process.exit(1)
  }

  console.log('✅ 舊類別已清除')
}

main()
