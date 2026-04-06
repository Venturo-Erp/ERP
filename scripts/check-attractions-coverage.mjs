#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function main() {
  // 取得所有城市
  const { data: cities, error: citiesError } = await supabase
    .from('cities')
    .select('id, name, country_id')
    .order('country_id, name')

  if (citiesError) {
    console.error('❌ 無法取得城市資料:', citiesError)
    return
  }

  // 取得所有景點
  const { data: attractions, error: attractionsError } = await supabase
    .from('attractions')
    .select('city_id, name, images')
    .eq('is_active', true)

  if (attractionsError) {
    console.error('❌ 無法取得景點資料:', attractionsError)
    return
  }

  // 統計分析
  const attractionsByCity = attractions.reduce((acc, attr) => {
    acc[attr.city_id] = (acc[attr.city_id] || 0) + 1
    return acc
  }, {})

  const citiesWithAttractions = Object.keys(attractionsByCity).length
  const totalCities = cities.length
  const coverageRate = ((citiesWithAttractions / totalCities) * 100).toFixed(1)

  console.log('\n📊 景點資料覆蓋率分析\n')
  console.log(`總城市數: ${totalCities}`)
  console.log(`有景點的城市: ${citiesWithAttractions}`)
  console.log(`覆蓋率: ${coverageRate}%`)
  console.log(`總景點數: ${attractions.length}\n`)

  console.log('📍 已有景點的城市:\n')

  const citiesWithData = cities
    .filter(city => attractionsByCity[city.id])
    .map(city => ({
      country: city.country_id,
      city: city.name,
      count: attractionsByCity[city.id],
    }))

  // 按國家分組
  const byCountry = citiesWithData.reduce((acc, item) => {
    if (!acc[item.country]) acc[item.country] = []
    acc[item.country].push(item)
    return acc
  }, {})

  for (const [country, items] of Object.entries(byCountry)) {
    console.log(`\n${country.toUpperCase()}:`)
    items.forEach(item => {
      console.log(`  ✅ ${item.city}: ${item.count} 個景點`)
    })
  }

  // 顯示沒有景點的城市（只顯示前20個）
  const citiesWithoutAttractions = cities.filter(city => !attractionsByCity[city.id]).slice(0, 20)

  if (citiesWithoutAttractions.length > 0) {
    console.log('\n\n❌ 尚未新增景點的城市（顯示前20個）:\n')

    const withoutByCountry = citiesWithoutAttractions.reduce((acc, city) => {
      if (!acc[city.country_id]) acc[city.country_id] = []
      acc[city.country_id].push(city.name)
      return acc
    }, {})

    for (const [country, cityNames] of Object.entries(withoutByCountry)) {
      console.log(`${country}: ${cityNames.join(', ')}`)
    }

    const remaining = cities.filter(city => !attractionsByCity[city.id]).length - 20
    if (remaining > 0) {
      console.log(`\n...還有 ${remaining} 個城市`)
    }
  }

  // 檢查圖片完整性
  const withoutImages = attractions.filter(a => !a.images || a.images.length === 0)
  console.log(`\n\n🖼️  圖片狀態:`)
  console.log(`有圖片: ${attractions.length - withoutImages.length} 個`)
  console.log(`缺圖片: ${withoutImages.length} 個`)
}

main().catch(console.error)
