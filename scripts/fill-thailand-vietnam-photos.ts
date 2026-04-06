#!/usr/bin/env tsx
/**
 * 泰國 + 越南景點照片填充腳本
 *
 * 任務：泰國 213 + 越南 163 = 376 個景點
 * API：Pexels（優先 200/h）+ Unsplash（備用 50/h）
 * 規格：每個景點 2 張，下載到 Supabase Storage
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const PEXELS_API_KEY = process.env.NEXT_PUBLIC_PEXELS_API_KEY!
const UNSPLASH_API_KEY = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY!

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwODMyMCwiZXhwIjoyMDc0Njg0MzIwfQ.kbJbdYHtOWudBGzV3Jv5OWzWQQZT4aBFFgfUczaVdIE'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const BUCKET_NAME = 'attractions'

// 進度追蹤
const progress = {
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  missing: [] as string[],
  startTime: Date.now(),
}

/**
 * 搜尋 Pexels 圖片
 */
async function searchPexels(query: string, perPage = 2) {
  try {
    const params = new URLSearchParams({
      query,
      per_page: String(perPage),
      orientation: 'landscape',
    })

    const response = await fetch(`https://api.pexels.com/v1/search?${params}`, {
      headers: { Authorization: PEXELS_API_KEY },
    })

    if (!response.ok) return []

    const data: any = await response.json()
    return (data.photos || []).map((p: any) => ({
      url: p.src.large,
      source: 'pexels',
    }))
  } catch (error) {
    return []
  }
}

/**
 * 搜尋 Unsplash 圖片
 */
async function searchUnsplash(query: string, perPage = 2) {
  try {
    const params = new URLSearchParams({
      query,
      per_page: String(perPage),
      orientation: 'landscape',
    })

    const response = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
      headers: { Authorization: `Client-ID ${UNSPLASH_API_KEY}` },
    })

    if (!response.ok) return []

    const data: any = await response.json()
    const photos = []

    for (const photo of (data.results || []).slice(0, perPage)) {
      // 追蹤下載（Unsplash 要求）
      await fetch(photo.links.download_location, {
        headers: { Authorization: `Client-ID ${UNSPLASH_API_KEY}` },
      }).catch(() => {})

      photos.push({
        url: photo.urls.regular,
        source: 'unsplash',
      })
    }

    return photos
  } catch (error) {
    return []
  }
}

/**
 * 下載圖片並上傳到 Storage
 */
async function downloadAndUpload(
  imageUrl: string,
  countryId: string,
  attractionId: string,
  index: number
) {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`下載失敗: ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const ext = imageUrl.includes('.jpg') ? 'jpg' : 'jpeg'
    const filename = `${countryId}/${attractionId}-${index}.${ext}`

    const { error } = await supabase.storage.from(BUCKET_NAME).upload(filename, buffer, {
      contentType: `image/${ext}`,
      upsert: true,
    })

    if (error) throw error

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename)

    return publicUrl
  } catch (error) {
    console.error(`  ⚠️  上傳失敗:`, error)
    return null
  }
}

/**
 * 處理單個景點
 */
async function processAttraction(attraction: any, countryId: string) {
  console.log(
    `處理中: ${attraction.name}${attraction.english_name ? ` (${attraction.english_name})` : ''}`
  )

  // 1. 搜尋圖片
  const query = attraction.english_name || attraction.name
  let photos = await searchPexels(query, 2)

  if (photos.length === 0) {
    photos = await searchUnsplash(query, 2)
  }

  if (photos.length === 0) {
    progress.failed++
    progress.missing.push(
      `${attraction.name}${attraction.english_name ? ` (${attraction.english_name})` : ''}`
    )
    console.log(`  ❌ 找不到照片`)
    return
  }

  // 2. 下載並上傳到 Storage
  const uploadedUrls: string[] = []

  for (let i = 0; i < photos.length; i++) {
    const storageUrl = await downloadAndUpload(photos[i].url, countryId, attraction.id, i + 1)
    if (storageUrl) {
      uploadedUrls.push(storageUrl)
    }
  }

  if (uploadedUrls.length === 0) {
    progress.failed++
    console.log(`  ❌ 上傳失敗`)
    return
  }

  // 3. 更新資料庫
  const { error } = await supabase
    .from('attractions')
    .update({
      images: uploadedUrls,
      thumbnail: uploadedUrls[0],
      updated_at: new Date().toISOString(),
    })
    .eq('id', attraction.id)

  if (error) {
    progress.failed++
    console.log(`  ❌ 資料庫更新失敗:`, error)
    return
  }

  progress.success++
  console.log(`  ✅ 成功上傳 ${uploadedUrls.length} 張照片到 Storage (${photos[0].source})`)
}

/**
 * 主程式
 */
async function main() {
  console.log('🚀 開始填充泰國 + 越南景點照片...\n')

  // 1. 查詢需要處理的景點
  const { data: attractions, error } = await supabase
    .from('attractions')
    .select('id, name, english_name, country_id')
    .in('country_id', ['thailand', 'vietnam'])
    .or('images.is.null,images.eq.{}')
    .order('country_id')
    .order('name')

  if (error) {
    console.error('❌ 查詢失敗:', error)
    process.exit(1)
  }

  if (!attractions || attractions.length === 0) {
    console.log('✅ 所有泰國和越南景點都已有照片！')
    process.exit(0)
  }

  progress.total = attractions.length
  console.log(`📋 找到 ${progress.total} 個缺照片的景點`)

  const thailandCount = attractions.filter(a => a.country_id === 'thailand').length
  const vietnamCount = attractions.filter(a => a.country_id === 'vietnam').length
  console.log(`   - 🇹🇭 泰國: ${thailandCount} 個`)
  console.log(`   - 🇻🇳 越南: ${vietnamCount} 個\n`)

  // 2. 處理景點
  let lastReportTime = Date.now()

  for (const attraction of attractions) {
    await processAttraction(attraction, attraction.country_id)
    progress.processed++

    // 每 2 小時回報
    const now = Date.now()
    if (now - lastReportTime >= 2 * 60 * 60 * 1000) {
      const elapsed = (now - progress.startTime) / 1000 / 60
      console.log('\n' + '='.repeat(60))
      console.log(
        `📊 進度: ${progress.processed}/${progress.total} (${Math.round((progress.processed / progress.total) * 100)}%)`
      )
      console.log(`✅ 成功: ${progress.success} | ❌ 失敗: ${progress.failed}`)
      console.log(`⏱️  已執行: ${Math.round(elapsed)} 分鐘`)
      console.log('='.repeat(60) + '\n')
      lastReportTime = now
    }

    // API 限制：每 18 秒處理一個
    await new Promise(resolve => setTimeout(resolve, 18000))
  }

  // 3. 最終報告
  console.log('\n✅ 全部處理完成！')
  console.log(`📊 成功: ${progress.success}/${progress.total}`)
  console.log(`❌ 失敗: ${progress.failed}`)

  if (progress.missing.length > 0) {
    console.log(`\n⚠️  ${progress.missing.length} 個景點找不到照片`)
    const LOG_DIR = path.join(process.cwd(), 'logs')
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true })
    }
    fs.writeFileSync(path.join(LOG_DIR, 'missing-photos-th-vn.txt'), progress.missing.join('\n'))
  }
}

main().catch(console.error)
