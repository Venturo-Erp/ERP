#!/usr/bin/env node

/**
 * 為所有城市下載背景圖並上傳到 Supabase Storage
 * 使用 Unsplash 的城市圖片
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ 錯誤: 需要設定 SUPABASE_SERVICE_KEY 或 SUPABASE_ANON_KEY 環境變數')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// 使用通用的旅遊城市圖片作為預設背景
// 這些圖片來自 Unsplash，使用不同的關鍵字以確保多樣性
const defaultImageUrls = [
  'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&q=75&auto=format&fit=crop', // 城市夜景
  'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&q=75&auto=format&fit=crop', // 城市日景
  'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1200&q=75&auto=format&fit=crop', // 山景城市
  'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&q=75&auto=format&fit=crop', // 海濱城市
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=75&auto=format&fit=crop', // 現代建築
]

// 下載圖片
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    https
      .get(url, response => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // 處理重定向
          downloadImage(response.headers.location, filepath).then(resolve).catch(reject)
          return
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`))
          return
        }

        const chunks = []
        response.on('data', chunk => chunks.push(chunk))
        response.on('end', async () => {
          const buffer = Buffer.concat(chunks)
          await fs.writeFile(filepath, buffer)
          resolve(filepath)
        })
      })
      .on('error', reject)
  })
}

// 上傳圖片到 Supabase
async function uploadToStorage(cityId, filepath) {
  try {
    const fileBuffer = await fs.readFile(filepath)
    const filename = `${cityId}.jpg`

    const { data, error } = await supabase.storage
      .from('city-backgrounds')
      .upload(filename, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      })

    if (error) throw error

    const { data: urlData } = supabase.storage.from('city-backgrounds').getPublicUrl(filename)

    return urlData.publicUrl
  } catch (error) {
    throw error
  }
}

// 更新資料庫
async function updateDatabase(cityId, imageUrl) {
  const { error } = await supabase
    .from('cities')
    .update({ background_image_url: imageUrl })
    .eq('id', cityId)

  if (error) throw error
}

async function main() {
  const outputDir = path.join(__dirname, '../public/city-backgrounds-all')
  await fs.mkdir(outputDir, { recursive: true })

  console.log('🚀 開始為所有城市補充背景圖...\n')

  // 查詢缺少背景圖的城市
  const { data: cities, error } = await supabase
    .from('cities')
    .select('id, name, name_en')
    .is('background_image_url', null)
    .order('name', { ascending: true })

  if (error) {
    console.error('❌ 查詢失敗:', error)
    process.exit(1)
  }

  console.log(`📊 找到 ${cities.length} 個缺少背景圖的城市\n`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < cities.length; i++) {
    const city = cities[i]
    const defaultImageUrl = defaultImageUrls[i % defaultImageUrls.length]
    const filename = `${city.id}.jpg`
    const filepath = path.join(outputDir, filename)

    try {
      console.log(`[${i + 1}/${cities.length}] 處理: ${city.name} (${city.id})`)

      // 下載圖片
      await downloadImage(defaultImageUrl, filepath)
      console.log(`  ✓ 下載完成`)

      // 上傳到 Supabase Storage
      const publicUrl = await uploadToStorage(city.id, filepath)
      console.log(`  ✓ 上傳完成: ${publicUrl}`)

      // 更新資料庫
      await updateDatabase(city.id, publicUrl)
      console.log(`  ✓ 資料庫更新完成\n`)

      successCount++

      // 每 10 個休息一下，避免請求過快
      if ((i + 1) % 10 === 0) {
        console.log('  ⏸️  休息 2 秒...\n')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    } catch (error) {
      console.error(`  ❌ 失敗: ${error.message}\n`)
      errorCount++
    }
  }

  console.log('\n📊 完成統計:')
  console.log(`✅ 成功: ${successCount} 個`)
  console.log(`❌ 失敗: ${errorCount} 個`)
  console.log(`\n🎉 所有城市都已有背景圖！`)
}

main().catch(console.error)
