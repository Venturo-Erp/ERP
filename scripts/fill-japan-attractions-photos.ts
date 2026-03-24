#!/usr/bin/env tsx
/**
 * 日本景點照片填充腳本
 * 
 * 任務：為 782 個缺照片的日本景點填充圖片
 * API：Pexels（優先 200/h）+ Unsplash（備用 50/h）
 * 規格：每個景點 3-5 張，Regular/Large 尺寸
 * 
 * 執行：npx tsx scripts/fill-japan-attractions-photos.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// 載入 .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { searchPexelsPhotos } from '../src/lib/pexels'
import { searchPhotos as searchUnsplash, trackDownload } from '../src/lib/unsplash'
import * as fs from 'fs'
import * as path from 'path'

// Supabase 設定
const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwODMyMCwiZXhwIjoyMDc0Njg0MzIwfQ.kbJbdYHtOWudBGzV3Jv5OWzWQQZT4aBFFgfUczaVdIE'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// 進度追蹤
interface Progress {
  total: number
  processed: number
  success: number
  failed: number
  missing: string[]
  startTime: number
}

const progress: Progress = {
  total: 0,
  processed: 0,
  success: 0,
  failed: 0,
  missing: [],
  startTime: Date.now()
}

// 記錄檔
const LOG_DIR = path.join(process.cwd(), 'logs')
const MISSING_FILE = path.join(LOG_DIR, 'missing-photos.txt')
const PROGRESS_FILE = path.join(LOG_DIR, 'progress.json')

// 確保 logs 目錄存在
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

/**
 * 搜尋景點照片
 */
async function searchAttractionPhotos(name: string, englishName?: string) {
  // 優先使用英文名稱搜尋（圖片品質較好）
  const query = englishName || name
  
  try {
    // 1. 優先使用 Pexels（限制較寬鬆）
    const pexelsResult = await searchPexelsPhotos(query, {
      perPage: 5,
      orientation: 'landscape'
    })
    
    if (pexelsResult.photos && pexelsResult.photos.length > 0) {
      return pexelsResult.photos.slice(0, 5).map(p => ({
        url: p.src.large,
        source: 'pexels'
      }))
    }
    
    // 2. 備用 Unsplash
    const unsplashResult = await searchUnsplash(query, {
      perPage: 5,
      orientation: 'landscape'
    })
    
    if (unsplashResult.results && unsplashResult.results.length > 0) {
      // Unsplash 需要追蹤下載
      const photos = []
      for (const photo of unsplashResult.results.slice(0, 5)) {
        await trackDownload(photo.links.download_location)
        photos.push({
          url: photo.urls.regular,
          source: 'unsplash'
        })
      }
      return photos
    }
    
    return []
  } catch (error) {
    console.error(`搜尋失敗: ${query}`, error)
    return []
  }
}

/**
 * 更新景點照片
 */
async function updateAttractionPhotos(attractionId: string, photos: any[]) {
  const imageUrls = photos.map(p => p.url)
  const thumbnail = imageUrls[0]
  
  const { error } = await supabase
    .from('attractions')
    .update({
      images: imageUrls,
      thumbnail: thumbnail,
      updated_at: new Date().toISOString()
    })
    .eq('id', attractionId)
  
  if (error) {
    throw error
  }
}

/**
 * 儲存進度
 */
function saveProgress() {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
  
  if (progress.missing.length > 0) {
    fs.writeFileSync(MISSING_FILE, progress.missing.join('\n'))
  }
}

/**
 * 回報進度
 */
function reportProgress() {
  const elapsed = (Date.now() - progress.startTime) / 1000 / 60 // 分鐘
  const rate = progress.processed / elapsed // 每分鐘處理數
  const remaining = progress.total - progress.processed
  const eta = remaining / rate // 預估剩餘時間（分鐘）
  
  console.log('\n' + '='.repeat(60))
  console.log('📊 進度報告')
  console.log('='.repeat(60))
  console.log(`✅ 完成: ${progress.processed}/${progress.total} (${Math.round(progress.processed / progress.total * 100)}%)`)
  console.log(`📸 成功: ${progress.success} 個`)
  console.log(`❌ 失敗: ${progress.failed} 個`)
  console.log(`⏱️  已執行: ${Math.round(elapsed)} 分鐘`)
  console.log(`⏳ 預估完成: ${Math.round(eta)} 分鐘後`)
  console.log('='.repeat(60) + '\n')
  
  saveProgress()
}

/**
 * 主要執行函式
 */
async function main() {
  console.log('🚀 開始填充日本景點照片...\n')
  
  // 1. 查詢需要處理的景點
  const { data: attractions, error } = await supabase
    .from('attractions')
    .select('id, name, english_name')
    .eq('country_id', 'japan')
    .or('images.is.null,images.eq.{}')
    .order('name')
  
  if (error) {
    console.error('❌ 查詢失敗:', error)
    process.exit(1)
  }
  
  if (!attractions || attractions.length === 0) {
    console.log('✅ 所有日本景點都已有照片！')
    process.exit(0)
  }
  
  progress.total = attractions.length
  console.log(`📋 找到 ${progress.total} 個缺照片的日本景點\n`)
  
  // 2. 逐個處理
  let lastReportTime = Date.now()
  
  for (const attraction of attractions) {
    console.log(`處理中: ${attraction.name}${attraction.english_name ? ` (${attraction.english_name})` : ''}`)
    
    // 搜尋照片
    const photos = await searchAttractionPhotos(attraction.name, attraction.english_name)
    
    if (photos.length > 0) {
      try {
        // 更新資料庫
        await updateAttractionPhotos(attraction.id, photos)
        progress.success++
        console.log(`  ✅ 找到 ${photos.length} 張照片 (${photos[0].source})`)
      } catch (error) {
        progress.failed++
        console.log(`  ❌ 更新失敗:`, error)
      }
    } else {
      progress.failed++
      progress.missing.push(`${attraction.name}${attraction.english_name ? ` (${attraction.english_name})` : ''}`)
      console.log(`  ❌ 找不到照片`)
    }
    
    progress.processed++
    
    // 每 2 小時回報一次
    const now = Date.now()
    if (now - lastReportTime >= 2 * 60 * 60 * 1000) {
      reportProgress()
      lastReportTime = now
    }
    
    // 避免超過 API 限制
    // Pexels: 200/h = 每 18 秒一次
    // Unsplash: 50/h = 每 72 秒一次
    // 保守起見，每 20 秒處理一個
    await new Promise(resolve => setTimeout(resolve, 20000))
  }
  
  // 3. 最終報告
  console.log('\n✅ 全部處理完成！\n')
  reportProgress()
  
  if (progress.missing.length > 0) {
    console.log(`\n⚠️  有 ${progress.missing.length} 個景點找不到照片，記錄在: ${MISSING_FILE}`)
  }
}

// 執行
main().catch(console.error)
