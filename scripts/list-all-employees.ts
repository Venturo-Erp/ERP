import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

async function listAll() {
  const { data, error } = await supabase
    .from('employees')
    .select('employee_number, chinese_name, display_name, status, employee_type')
    .order('employee_number')

  if (error) {
    console.error('❌ 錯誤:', error)
    return
  }

  console.log(`📋 所有員工 (${data.length} 人):\n`)
  console.table(data)
  
  const e003 = data.find(e => e.employee_number === 'E003')
  if (e003) {
    console.log('\n✅ E003 存在！')
    console.log(e003)
  } else {
    console.log('\n❌ E003 確實不存在')
  }
}

listAll().then(() => process.exit(0))
