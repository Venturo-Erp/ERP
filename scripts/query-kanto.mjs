#!/usr/bin/env node
/**
 * 查詢關東地區需要重寫的景點
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwODMyMCwiZXhwIjoyMDc0Njg0MzIwfQ.kbJbdYHtOWudBGzV3Jv5OWzWQQZT4aBFFgfUczaVdIE'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function queryKantoAttractions() {
  // 先查詢關東地區的城市
  const { data: cities } = await supabase
    .from('cities')
    .select('id, name, region_id')
    .eq('country_id', 'japan')
    .or(
      'name.like.%東京%,name.like.%橫濱%,name.like.%鎌倉%,name.like.%川越%,region_id.like.%kanto%'
    )

  console.log(
    '關東地區城市：',
    cities?.map(c => c.name)
  )

  const cityIds = cities?.map(c => c.id) || []

  // 查詢需要重寫的景點
  const { data: attractions, error } = await supabase
    .from('attractions')
    .select('*')
    .eq('country_id', 'japan')
    .in('city_id', cityIds)
    .limit(50)

  if (error) {
    console.error('Error:', error)
    return
  }

  // 篩選出需要重寫的（描述短或包含「熱門景點」）
  const needRewrite = attractions.filter(
    a => !a.description || a.description.length < 50 || a.description.includes('熱門景點')
  )

  console.log(`\n找到 ${needRewrite.length} 個景點需要重寫：\n`)

  needRewrite.forEach((a, i) => {
    console.log(`${i + 1}. ${a.name} (${a.city_id})`)
    console.log(`   描述：${a.description || '(無)'}`)
    console.log(`   價格：${a.price_info || '(無)'}`)
    console.log(`   營業時間：${a.opening_hours || '(無)'}`)
    console.log('')
  })

  // 儲存結果供後續處理
  await import('fs').then(fs => {
    fs.promises.writeFile(
      '/Users/tokichin/.openclaw/workspace-nova/kanto-attractions.json',
      JSON.stringify(needRewrite, null, 2)
    )
  })

  console.log('已儲存至 kanto-attractions.json')
}

queryKantoAttractions().catch(console.error)
