#!/usr/bin/env node
/**
 * 測試景點確認功能
 * 自動補齊部分景點資料（用於測試）
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwODMyMCwiZXhwIjoyMDc0Njg0MzIwfQ.kbJbdYHtOWudBGzV3Jv5OWzWQQZT4aBFFgfUczaVdIE'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function testVerification() {
  console.log('🧪 測試景點確認功能...\n')

  // 1. 測試函數：取得總體進度
  console.log('1️⃣  測試總體進度函數...')
  const { data: summary, error: summaryError } = await supabase
    .rpc('get_destinations_verification_summary')

  if (summaryError) {
    console.error('❌ 函數不存在或執行失敗:', summaryError.message)
    console.log('💡 請先執行 20260403000003_add_destination_verification.sql')
    return
  }

  console.log('✅ 總體進度：')
  console.log(JSON.stringify(summary, null, 2))

  // 2. 取得前 5 個景點
  console.log('\n2️⃣  取得前 5 個景點...')
  const { data: destinations, error: destError } = await supabase
    .from('destinations')
    .select('*')
    .order('priority', { ascending: true })
    .limit(5)

  if (destError) {
    console.error('❌ 載入景點失敗:', destError.message)
    return
  }

  console.log(`✅ 載入 ${destinations.length} 個景點`)

  // 3. 測試補齊資料（模擬人工確認）
  console.log('\n3️⃣  模擬補齊第一個景點資料...')
  
  if (destinations.length > 0) {
    const dest = destinations[0]
    console.log(`   景點：${dest.name}`)

    const updateData = {
      google_maps_url: dest.google_maps_url || `https://www.google.com/maps?q=${dest.latitude},${dest.longitude}`,
      description: dest.description || `${dest.name}是清邁著名景點，位於${dest.category}類別中。這裡擁有豐富的歷史文化底蘊，是遊客必訪之地。景點內部設施完善，環境優美，適合各年齡層遊客參觀。`,
      images: dest.images || [
        'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800',
        'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800',
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
      ],
      opening_hours: dest.opening_hours || '每日 08:00-18:00',
      ticket_price: dest.ticket_price || '100 THB',
      duration_minutes: dest.duration_minutes || 90,
      verification_status: 'verified',
      verified_at: new Date().toISOString(),
    }

    const { error: updateError } = await supabase
      .from('destinations')
      .update(updateData)
      .eq('id', dest.id)

    if (updateError) {
      console.error('❌ 更新失敗:', updateError.message)
    } else {
      console.log('✅ 資料補齊成功')
      console.log('   - Google Maps URL:', updateData.google_maps_url.substring(0, 50) + '...')
      console.log('   - 描述:', updateData.description.substring(0, 50) + '...')
      console.log('   - 圖片數量:', updateData.images.length)
      console.log('   - 狀態:', updateData.verification_status)
    }
  }

  // 4. 測試完整度檢查函數
  console.log('\n4️⃣  測試完整度檢查函數...')
  
  if (destinations.length > 0) {
    const dest = destinations[0]
    const { data: completeness, error: completeError } = await supabase
      .rpc('check_destination_completeness', { dest_id: dest.id })

    if (completeError) {
      console.error('❌ 函數執行失敗:', completeError.message)
    } else {
      console.log('✅ 完整度檢查結果：')
      console.log(JSON.stringify(completeness, null, 2))
    }
  }

  // 5. 重新取得總體進度
  console.log('\n5️⃣  重新取得總體進度...')
  const { data: summary2 } = await supabase
    .rpc('get_destinations_verification_summary')

  console.log('✅ 更新後進度：')
  console.log(JSON.stringify(summary2, null, 2))

  console.log('\n✅ 測試完成！')
  console.log('\n📝 下一步：')
  console.log('   1. 訪問 /admin/destinations/review')
  console.log('   2. 手動確認更多景點')
  console.log('   3. 達到 100% 後開始計算距離矩陣')
}

testVerification().catch((err) => {
  console.error('\n❌ 測試失敗:', err)
  process.exit(1)
})
