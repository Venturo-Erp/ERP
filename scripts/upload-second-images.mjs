#!/usr/bin/env node

/**
 * 上傳第二張城市背景圖到 Supabase
 * 使用 complete-city-images-mapping.mjs 的定義
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import https from 'https'
import { createClient } from '@supabase/supabase-js'
import { cityImagesComplete, getDefaultCityImages } from './complete-city-images-mapping.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ 錯誤: 需要設定 SUPABASE_SERVICE_KEY 或 SUPABASE_ANON_KEY 環境變數')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// 下載圖片
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    https
      .get(url, response => {
        if (response.statusCode === 301 || response.statusCode === 302) {
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
    const filename = `${cityId}-2.jpg`

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
    .update({ background_image_url_2: imageUrl })
    .eq('id', cityId)

  if (error) throw error
}

async function main() {
  const outputDir = path.join(__dirname, '../public/city-backgrounds-2')
  await fs.mkdir(outputDir, { recursive: true })

  console.log('🚀 開始上傳第二張城市背景圖...\n')

  // 查詢所有城市
  const { data: cities, error } = await supabase
    .from('cities')
    .select('id, name, name_en')
    .order('name', { ascending: true })

  if (error) {
    console.error('❌ 查詢失敗:', error)
    process.exit(1)
  }

  console.log(`📊 總共有 ${cities.length} 個城市\n`)

  let successCount = 0
  let errorCount = 0
  let skippedCount = 0

  for (let i = 0; i < cities.length; i++) {
    const city = cities[i]

    // 取得對應的圖片 URL
    let imageUrl
    if (cityImagesComplete[city.id]) {
      imageUrl = cityImagesComplete[city.id].image2
      console.log(`[${i + 1}/${cities.length}] 處理: ${city.name} (${city.id}) - 使用專屬圖片`)
    } else {
      const defaultImages = getDefaultCityImages(city.id, city.name)
      imageUrl = defaultImages.image2
      console.log(`[${i + 1}/${cities.length}] 處理: ${city.name} (${city.id}) - 使用預設圖片`)
    }

    const filename = `${city.id}-2.jpg`
    const filepath = path.join(outputDir, filename)

    try {
      // 下載圖片
      await downloadImage(imageUrl, filepath)
      console.log(`  ✓ 下載完成`)

      // 上傳到 Supabase Storage
      const publicUrl = await uploadToStorage(city.id, filepath)
      console.log(`  ✓ 上傳完成: ${publicUrl}`)

      // 更新資料庫
      await updateDatabase(city.id, publicUrl)
      console.log(`  ✓ 資料庫更新完成\n`)

      successCount++

      // 每 10 個休息一下
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
  console.log(`⏭️  跳過: ${skippedCount} 個`)
  console.log(`\n🎉 第二張圖片上傳完成！`)
}

main().catch(console.error)
