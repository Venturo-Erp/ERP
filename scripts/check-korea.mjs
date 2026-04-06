#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const { data: cities } = await supabase
  .from('cities')
  .select('id, name, region_id')
  .eq('country_id', 'korea')
  .order('name')

const { data: attractions } = await supabase
  .from('attractions')
  .select('city_id, name')
  .eq('country_id', 'korea')

const cityStats = {}
attractions.forEach(a => {
  cityStats[a.city_id] = (cityStats[a.city_id] || 0) + 1
})

console.log('🇰🇷 韓國城市與景點統計:\n')
cities.forEach(city => {
  const count = cityStats[city.id] || 0
  const status = count >= 8 ? '✅' : count >= 4 ? '⚠️' : '❌'
  const regionInfo = city.region_id ? `[region: ${city.region_id}]` : '[無region]'
  console.log(`${status} ${city.name} (${city.id}): ${count} 個景點 ${regionInfo}`)
})

console.log(`\n總計: ${attractions.length} 個景點`)
