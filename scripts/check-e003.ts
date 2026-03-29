import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// 載入 .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkE003() {
  console.log('🔍 查詢 E003 員工...\n')

  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('employee_number', 'E003')
    .maybeSingle()

  if (error) {
    console.error('❌ 查詢錯誤:', error)
    return
  }

  if (!data) {
    console.log('❌ 找不到 E003！可能已被刪除')
    
    // 查詢所有 E00X 員工
    const { data: allE00X } = await supabase
      .from('employees')
      .select('employee_number, chinese_name, status')
      .like('employee_number', 'E00%')
      .order('employee_number')
    
    console.log('\n📋 所有 E00X 員工:')
    console.table(allE00X)
    return
  }

  console.log('✅ 找到 E003:\n')
  console.log('員工編號:', data.employee_number)
  console.log('中文姓名:', data.chinese_name)
  console.log('顯示名稱:', data.display_name)
  console.log('狀態:', data.status)
  console.log('員工類型:', data.employee_type || '(null)')
  console.log('部門:', data.department)
  console.log('職位:', data.position)
  console.log('Email:', data.email)
  
  console.log('\n📊 診斷:')
  if (data.status === 'terminated') {
    console.log('⚠️  狀態 = terminated（已離職）')
    console.log('💡 需要改成: active')
  }
  if (data.employee_type === 'bot') {
    console.log('⚠️  員工類型 = bot')
    console.log('💡 需要改成: null 或刪除此欄位')
  }
  if (data.status !== 'terminated' && data.employee_type !== 'bot') {
    console.log('✅ 資料正常，應該會顯示在列表')
    console.log('🔍 可能是前端篩選問題')
  }
}

checkE003().then(() => process.exit(0))
