#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const { data: cities } = await supabase.from('cities').select('*')
const { data: attractions } = await supabase.from('attractions').select('city_id, country_id')

const cityStats = {}
attractions.forEach(a => {
  const key = `${a.country_id}:${a.city_id}`
  cityStats[key] = (cityStats[key] || 0) + 1
})

const analysis = {
  excellent: [], // 8+ 景點
  good: [], // 4-7 景點
  basic: [], // 2-3 景點
  empty: [], // 0-1 景點
}

cities.forEach(city => {
  const key = `${city.country_id}:${city.id}`
  const count = cityStats[key] || 0
  const item = { country: city.country_id, city: city.name, cityId: city.id, count }

  if (count >= 8) analysis.excellent.push(item)
  else if (count >= 4) analysis.good.push(item)
  else if (count >= 2) analysis.basic.push(item)
  else analysis.empty.push(item)
})

console.log('📊 景點覆蓋分析\n')
console.log('====================================\n')

console.log(`🌟 優秀級 (8+ 景點): ${analysis.excellent.length} 個城市`)
analysis.excellent.forEach(item => {
  console.log(`  ${item.country} - ${item.city}: ${item.count} 個`)
})
console.log('')

console.log(`✅ 良好級 (4-7 景點): ${analysis.good.length} 個城市`)
analysis.good.forEach(item => {
  console.log(`  ${item.country} - ${item.city}: ${item.count} 個`)
})
console.log('')

console.log(`⚠️  基礎級 (2-3 景點): ${analysis.basic.length} 個城市`)
console.log('建議擴充至 5-8 個景點')
const basicByCountry = {}
analysis.basic.forEach(item => {
  if (!basicByCountry[item.country]) basicByCountry[item.country] = []
  basicByCountry[item.country].push(`${item.city}(${item.count})`)
})
for (const [country, cities] of Object.entries(basicByCountry)) {
  console.log(`  ${country}: ${cities.join(', ')}`)
}
console.log('')

console.log(`❌ 空白級 (0-1 景點): ${analysis.empty.length} 個城市`)
const emptyByCountry = {}
analysis.empty.forEach(item => {
  if (!emptyByCountry[item.country]) emptyByCountry[item.country] = 0
  emptyByCountry[item.country]++
})
for (const [country, count] of Object.entries(emptyByCountry)) {
  console.log(`  ${country}: ${count} 個城市`)
}

console.log('\n\n🎯 擴充優先順序建議:\n')
console.log('1. 🔥 泰國其他城市（曼谷、普吉島、華欣等）→ 8+ 個景點')
console.log('   理由：鄰近越南主力市場，也是公司業務範圍')
console.log('')
console.log('2. ⭐ 日本熱門城市（東京、大阪、京都）→ 8-10 個')
console.log('   理由：目前只有 4-6 個，可補強至主力水準')
console.log('')
console.log('3. 💡 韓國（首爾、釜山、濟州島）→ 8-10 個')
console.log('   理由：台灣旅客熱門目的地')
console.log('')
console.log('4. 🌴 菲律賓其他城市（巴拉望、薄荷島）→ 新增並擴充')
console.log('   理由：海島度假市場')
