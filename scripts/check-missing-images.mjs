#!/usr/bin/env node

/**
 * 檢查資料庫中缺少背景圖的城市
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ 錯誤: 需要設定 SUPABASE_SERVICE_KEY 或 SUPABASE_ANON_KEY 環境變數')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function main() {
  console.log('🔍 檢查資料庫中的城市...\n')

  // 查詢所有城市
  const { data: cities, error } = await supabase
    .from('cities')
    .select('id, name, name_en, background_image_url, country_id')
    .order('country_id', { ascending: true })
    .order('name', { ascending: true })

  if (error) {
    console.error('❌ 查詢失敗:', error)
    process.exit(1)
  }

  console.log(`📊 總共有 ${cities.length} 個城市\n`)

  // 分類
  const citiesWithImages = cities.filter(c => c.background_image_url)
  const citiesWithoutImages = cities.filter(c => !c.background_image_url)

  console.log('✅ 已有背景圖的城市 (' + citiesWithImages.length + ' 個):')
  citiesWithImages.forEach(city => {
    console.log(`  - ${city.name} (${city.id})`)
  })

  console.log('\n❌ 缺少背景圖的城市 (' + citiesWithoutImages.length + ' 個):')
  citiesWithoutImages.forEach(city => {
    console.log(`  - ${city.name} (${city.id}) [${city.name_en || 'N/A'}]`)
  })

  console.log('\n')
}

main().catch(console.error)
