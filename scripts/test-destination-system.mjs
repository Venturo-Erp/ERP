#!/usr/bin/env node
/**
 * 測試清邁景點選擇系統
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwODMyMCwiZXhwIjoyMDc0Njg0MzIwfQ.kbJbdYHtOWudBGzV3Jv5OWzWQQZT4aBFFgfUczaVdIE'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function testDestinationSystem() {
  console.log('🧪 測試清邁景點選擇系統...\n')

  // ============================================
  // 1. 測試資料表是否存在
  // ============================================
  console.log('1️⃣  檢查資料表...')
  
  const { count: destCount, error: destError } = await supabase
    .from('destinations')
    .select('*', { count: 'exact', head: true })
  
  if (destError) {
    console.error('❌ destinations 表不存在或無法存取:', destError.message)
    console.log('\n💡 請先執行 SQL 建表（參考 DESTINATION_SYSTEM_SETUP.md）')
    process.exit(1)
  }
  
  console.log(`✅ destinations 表存在，共 ${destCount} 筆資料`)
  
  const { count: pickCount, error: pickError } = await supabase
    .from('customer_destination_picks')
    .select('*', { count: 'exact', head: true })
  
  if (pickError) {
    console.error('❌ customer_destination_picks 表不存在:', pickError.message)
    process.exit(1)
  }
  
  console.log(`✅ customer_destination_picks 表存在，共 ${pickCount} 筆資料`)

  // ============================================
  // 2. 測試載入景點（依類別）
  // ============================================
  console.log('\n2️⃣  測試載入景點...')
  
  const { data: cultureDests, error: cultureError } = await supabase
    .from('destinations')
    .select('*')
    .eq('city', '清邁')
    .eq('category', '文化古蹟')
    .order('priority', { ascending: true })
    .limit(5)
  
  if (cultureError) {
    console.error('❌ 載入文化古蹟失敗:', cultureError.message)
  } else {
    console.log(`✅ 文化古蹟：${cultureDests?.length || 0} 個`)
    cultureDests?.forEach((d, i) => {
      console.log(`   ${i + 1}. [${d.priority}] ${d.name}`)
    })
  }

  // ============================================
  // 3. 測試載入 Top 20
  // ============================================
  console.log('\n3️⃣  測試載入 Top 20...')
  
  const { data: top20, error: top20Error } = await supabase
    .from('destinations')
    .select('*')
    .eq('city', '清邁')
    .lte('priority', 20)
    .order('priority', { ascending: true })
  
  if (top20Error) {
    console.error('❌ 載入 Top 20 失敗:', top20Error.message)
  } else {
    console.log(`✅ Top 20 必去景點：${top20?.length || 0} 個`)
    console.log('   前 5 名：')
    top20?.slice(0, 5).forEach((d) => {
      console.log(`   [${d.priority}] ${d.name} - ${d.category}`)
    })
  }

  // ============================================
  // 4. 測試新增選擇記錄
  // ============================================
  console.log('\n4️⃣  測試新增選擇記錄...')
  
  if (!top20 || top20.length === 0) {
    console.log('⚠️  沒有景點資料，跳過測試')
  } else {
    const testUserId = 'test_user_' + Date.now()
    const testSessionId = 'session_' + Date.now()
    const testDestination = top20[0]
    
    const { error: insertError } = await supabase
      .from('customer_destination_picks')
      .insert({
        line_user_id: testUserId,
        destination_id: testDestination.id,
        session_id: testSessionId,
      })
    
    if (insertError) {
      console.error('❌ 新增選擇記錄失敗:', insertError.message)
    } else {
      console.log(`✅ 新增選擇記錄成功`)
      console.log(`   用戶：${testUserId}`)
      console.log(`   景點：${testDestination.name}`)
      console.log(`   Session：${testSessionId}`)
      
      // 查詢確認
      const { data: picks, error: queryError } = await supabase
        .from('customer_destination_picks')
        .select(`
          *,
          destination:destinations(name, category)
        `)
        .eq('line_user_id', testUserId)
      
      if (queryError) {
        console.error('❌ 查詢選擇記錄失敗:', queryError.message)
      } else {
        console.log(`✅ 查詢成功，共 ${picks?.length} 筆`)
        picks?.forEach((pick) => {
          console.log(`   - ${pick.destination?.name} (${pick.destination?.category})`)
        })
      }
      
      // 清理測試資料
      await supabase
        .from('customer_destination_picks')
        .delete()
        .eq('line_user_id', testUserId)
      
      console.log('✅ 測試資料已清理')
    }
  }

  // ============================================
  // 5. 統計資料
  // ============================================
  console.log('\n5️⃣  資料統計...')
  
  const { data: categoryStats } = await supabase
    .from('destinations')
    .select('category')
    .eq('city', '清邁')
  
  if (categoryStats) {
    const categoryCount = categoryStats.reduce((acc, row) => {
      const cat = row.category || '未分類'
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {})
    
    console.log('📊 類別分布：')
    Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count} 個`)
      })
  }

  console.log('\n✅ 測試完成！系統正常運作')
  console.log('\n📝 下一步：')
  console.log('   1. 在 LINE 測試：傳送「我想去清邁」')
  console.log('   2. 點擊類別按鈕')
  console.log('   3. 選擇景點')
  console.log('   4. 輸入「完成」查看摘要')
}

testDestinationSystem().catch((err) => {
  console.error('\n❌ 測試失敗:', err)
  process.exit(1)
})
