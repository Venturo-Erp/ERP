#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const { tavily } = require('@tavily/core')
const { generate } = require('./utils/gemini-client')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY })

// Blacklist keywords - skip these places
const BLACKLIST = [
  '大象',
  '老虎',
  '獅子',
  '黑熊',
  '動物表演',
  '鬥牛',
  '鬥雞',
  'elephant',
  'tiger',
  'lion',
  'bear',
  'animal show',
]

function isBlacklisted(name) {
  return BLACKLIST.some(keyword => name.toLowerCase().includes(keyword.toLowerCase()))
}

async function getEmptyDescriptions() {
  const result = {
    attractions: [],
    restaurants: [],
    hotels: [],
  }

  for (const table of ['attractions', 'restaurants', 'hotels']) {
    const { data, error } = await supabase
      .from(table)
      .select('id, name, country_id, city_id, description')
      .or('description.is.null,description.eq.""')

    if (error) {
      console.error(`Error fetching ${table}:`, error)
      continue
    }

    // Filter out blacklisted
    const filtered = data.filter(item => !isBlacklisted(item.name))
    result[table] = filtered
  }

  return result
}

async function searchPlaceInfo(name, countryId, cityId) {
  const query = `${name} ${cityId || ''} ${countryId} 介紹 特色`
  try {
    const response = await tvly.search(query, {
      searchDepth: 'basic',
      maxResults: 3,
    })
    return response.results
  } catch (err) {
    console.error(`Search error for ${name}:`, err.message)
    return []
  }
}

function compileInfo(results, name, countryId, cityId) {
  let content = ''
  results.forEach(r => {
    content += `來源：${r.title}\n${r.content}\n\n---\n\n`
  })

  return `
景點名稱：${name}
國家：${countryId}
城市：${cityId || '未指定'}

搜集到的資料：
${content}
`
}

async function generateDescription(name, countryId, cityId, searchResults) {
  if (!searchResults || searchResults.length === 0) {
    return null
  }

  const prompt = `
你是角落旅行社的資深文案，專門為高端旅遊寫景點/飯店/餐廳介紹。
品牌風格：深度、質感、有溫度，強調體驗與故事，不追流量，重視價值。

請根據以下搜尋到的資料，幫「${name}」寫一篇 150-300 字的中文介紹：

${searchResults.map(r => `- ${r.title}:\n${r.content.substring(0, 300)}...`).join('\n\n')}

要求：
1. 符合角落旅行社風格，強調特色與體驗
2. 不要誇大不實，只寫真實有來源的資訊
3. 用繁體中文
4. 段落順暢，適合放在旅遊網站
5. 直接輸出介紹內文即可，不要額外說明
`

  try {
    const result = await generate(prompt)
    return result.text.trim()
  } catch (err) {
    console.error(`Generate error for ${name}:`, err.message)
    return null
  }
}

async function updateDescription(table, id, description) {
  const { error } = await supabase.from(table).update({ description }).eq('id', id)

  if (error) {
    console.error(`Update error for ${table} ${id}:`, error)
    return false
  }
  return true
}

async function processBatch(table, items, batchSize = 10) {
  console.log(`\n=== Processing ${table}: ${items.length} items ===`)
  let success = 0
  let failed = 0
  let skipped = 0

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    console.log(`\nBatch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`)

    for (const item of batch) {
      console.log(`- Processing: ${item.name}...`)

      if (isBlacklisted(item.name)) {
        console.log(`  → Blacklisted, skipped`)
        skipped++
        continue
      }

      // Wait for rate limit
      await new Promise(resolve => setTimeout(resolve, 2000))

      const searchResults = await searchPlaceInfo(item.name, item.country_id, item.city_id)
      if (!searchResults || searchResults.length === 0) {
        console.log(`  → No search results, skipped`)
        failed++
        continue
      }

      const description = await generateDescription(
        item.name,
        item.country_id,
        item.city_id,
        searchResults
      )
      if (!description) {
        console.log(`  → Generate failed, skipped`)
        failed++
        continue
      }

      const updated = await updateDescription(table, item.id, description)
      if (updated) {
        console.log(`  → ✓ Success: ${description.substring(0, 50)}...`)
        success++
      } else {
        console.log(`  → ✗ Update failed`)
        failed++
      }

      // Wait between items to respect APIs
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    // Wait between batches
    console.log(`\nCompleted batch, waiting before next...`)
    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  return { table, success, failed, skipped }
}

async function main() {
  console.log('=== Starting automatic description filling ===')
  console.log('Fetching empty descriptions...')

  const empty = await getEmptyDescriptions()
  const total = empty.attractions.length + empty.restaurants.length + empty.hotels.length
  console.log(`Total empty descriptions: ${total}`)
  console.log(`- attractions: ${empty.attractions.length}`)
  console.log(`- restaurants: ${empty.restaurants.length}`)
  console.log(`- hotels: ${empty.hotels.length}`)

  const results = []

  // Process in order
  if (empty.attractions.length > 0) {
    results.push(await processBatch('attractions', empty.attractions))
  }
  if (empty.restaurants.length > 0) {
    results.push(await processBatch('restaurants', empty.restaurants))
  }
  if (empty.hotels.length > 0) {
    results.push(await processBatch('hotels', empty.hotels))
  }

  console.log('\n=== Final Results ===')
  let totalSuccess = 0
  let totalFailed = 0
  let totalSkipped = 0
  results.forEach(r => {
    console.log(`${r.table}: ✓ ${r.success} ✗ ${r.failed} ⏭ ${r.skipped}`)
    totalSuccess += r.success
    totalFailed += r.failed
    totalSkipped += r.skipped
  })
  console.log('---')
  console.log(`Total: ✓ ${totalSuccess} ✗ ${totalFailed} ⏭ ${totalSkipped}`)
  console.log('\nDone! All generated descriptions have been written to database.')
  console.log('All entries remain data_verified = false for team review.')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
