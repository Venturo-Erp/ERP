#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function main() {
  // 取得所有城市
  const { data: cities } = await supabase
    .from('cities')
    .select('id, name, country_id')
    .order('country_id, name')

  // 取得已有景點的城市
  const { data: attractions } = await supabase
    .from('attractions')
    .select('city_id')
    .eq('is_active', true)

  const citiesWithAttractions = new Set(attractions.map(a => a.city_id))

  // 排除的國家
  const excludeCountries = ['china', 'egypt', 'turkey', 'france']

  // 找出還需要補充的城市
  const missingCities = cities
    .filter(city => !citiesWithAttractions.has(city.id))
    .filter(city => !excludeCountries.includes(city.country_id))

  // 按國家分組
  const byCountry = missingCities.reduce((acc, city) => {
    if (!acc[city.country_id]) acc[city.country_id] = []
    acc[city.country_id].push(city.name)
    return acc
  }, {})

  console.log('📋 需要補充景點的城市（不含中國、埃及、土耳其、法國）:\n')

  for (const [country, cityList] of Object.entries(byCountry)) {
    console.log(`\n${country.toUpperCase()} (${cityList.length} 個城市):`)
    console.log(`  ${cityList.join(', ')}`)
  }

  console.log(`\n總計: ${missingCities.length} 個城市需要補充`)
}

main().catch(console.error)
