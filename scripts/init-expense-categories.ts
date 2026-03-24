/**
 * 初始化請款類別（系統預設）
 * 執行：npx tsx scripts/init-expense-categories.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// 載入環境變數
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// 預設請款類別
const DEFAULT_CATEGORIES = [
  { name: '匯款', icon: '💸', color: '#c9aa7c', sort_order: 1 },
  { name: '住宿', icon: '🏨', color: '#9fa68f', sort_order: 2 },
  { name: '交通', icon: '✈️', color: '#7ba3c7', sort_order: 3 },
  { name: '餐食', icon: '🍽️', color: '#d4a373', sort_order: 4 },
  { name: '門票', icon: '🎫', color: '#c08374', sort_order: 5 },
  { name: '導遊', icon: '👨‍✈️', color: '#8b8680', sort_order: 6 },
  { name: '保險', icon: '🛡️', color: '#9fa68f', sort_order: 7 },
  { name: '出團款', icon: '💼', color: '#c9aa7c', sort_order: 8 },
  { name: '回團款', icon: '💰', color: '#c9aa7c', sort_order: 9 },
  { name: '員工代墊', icon: '👤', color: '#8b8680', sort_order: 10 },
  { name: 'ESIM', icon: '📱', color: '#7ba3c7', sort_order: 11 },
  { name: '同業', icon: '🤝', color: '#9fa68f', sort_order: 12 },
  { name: '其他', icon: '📋', color: '#b8b2aa', sort_order: 13 },
]

async function main() {
  console.log('🚀 開始初始化請款類別...')

  // 檢查是否已有資料
  const { data: existing } = await supabase
    .from('expense_categories')
    .select('name')
    .eq('type', 'payment_request')
    .eq('is_system', true)

  if (existing && existing.length > 0) {
    console.log('⚠️  已有系統預設類別，跳過初始化')
    console.log(`現有類別：${existing.map(e => e.name).join(', ')}`)
    return
  }

  // 插入預設類別
  const categories = DEFAULT_CATEGORIES.map(cat => ({
    ...cat,
    type: 'expense', // 改成 expense
    is_system: true, // 標記為系統預設
    is_active: true,
    user_id: null, // 系統預設不綁定 workspace
  }))

  const { data, error } = await supabase.from('expense_categories').insert(categories).select()

  if (error) {
    console.error('❌ 建立失敗:', error.message)
    process.exit(1)
  }

  console.log(`✅ 成功建立 ${data.length} 個預設請款類別`)
  data.forEach(cat => {
    console.log(`   ${cat.icon} ${cat.name}`)
  })
}

main()
