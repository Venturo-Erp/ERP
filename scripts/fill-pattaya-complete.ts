#!/usr/bin/env tsx
/**
 * 芭達雅景點完整資料填充
 * - AI 生成 Style B 描述
 * - Pexels API 下載照片
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import fetch from 'node-fetch'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const PEXELS_API_KEY = process.env.NEXT_PUBLIC_PEXELS_API_KEY!

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const BUCKET_NAME = 'attractions'

// 景點資訊（基於已知知識）
const attractionInfo: Record<string, {
  description: string
  address?: string
  opening_hours?: string
  duration_minutes?: number
  tags?: string[]
}> = {
  '七珍佛山': {
    description: '《七珍佛山》是春武里府最大的戶外佛像雕刻，金色佛像高109公尺、寬70公尺，刻於垂直山壁上。這座巨型佛像由泰國皇室下令建造，紀念泰皇登基50週年。佛像表面覆以金箔，在陽光下閃耀奪目；山腳花園池塘環繞，氣氛寧靜莊嚴，是芭達雅近郊必訪的文化地標。',
    opening_hours: '08:00-18:00',
    duration_minutes: 60,
    tags: ['宗教', '文化', '地標', '攝影']
  },
  '芭達雅海底世界': {
    description: '《芭達雅海底世界》位於市中心，擁有100公尺長的海底隧道，遊客可近距離觀賞鯊魚、魟魚、海龜等數千種海洋生物。館內分為淡水區、珊瑚礁區、深海區，每日定時餵食秀吸引大批遊客。對親子旅遊極為友善，互動式展示讓孩子認識海洋生態，是雨天的最佳備案。',
    opening_hours: '09:00-18:00',
    duration_minutes: 120,
    tags: ['親子', '水族館', '教育', '室內']
  },
  '羅摩衍那水上樂園': {
    description: '《羅摩衍那水上樂園》是泰國最大的水上主題樂園，佔地18萬平方公尺，以印度史詩《羅摩衍那》為主題。園區擁有50多項遊樂設施，包括亞洲最高的滑水道、人工海浪池、漂漂河。建築風格融合泰式與印度神話元素，巨大雕像與精緻園藝令人驚艷，夏季消暑首選。',
    opening_hours: '10:00-18:00',
    duration_minutes: 240,
    tags: ['親子', '刺激', '水上樂園', '必遊']
  },
  '暹羅冰雪世界': {
    description: '《暹羅冰雪世界》是東南亞最大的冰雕樂園，室內溫度常年保持零下10度。展區分為冰雕藝術區、冰滑梯遊樂區、極地動物區，所有雕塑皆由中國哈爾濱冰雕師傅製作。遊客租借厚重外套入內，體驗熱帶國家難得的冰雪世界，冰吧提供特調冰飲，是炎夏獨特體驗。',
    opening_hours: '10:00-20:00',
    duration_minutes: 90,
    tags: ['親子', '室內', '特色', '攝影']
  },
  '寶妮小馬俱樂部': {
    description: '《寶妮小馬俱樂部》是芭達雅郊區的家庭式馬場，提供小型馬（Pony）騎乘體驗，特別適合兒童。除了騎馬課程，還有餵食、梳理馬匹的互動活動。園區環境整潔，教練親切專業，強調動物福利。對於初次接觸馬術的孩子，這裡是最溫和的入門選擇，也是親子旅遊的溫馨記憶。',
    opening_hours: '09:00-17:00',
    duration_minutes: 120,
    tags: ['親子', '動物', '體驗', '戶外']
  }
}

/**
 * 搜尋 Pexels 圖片
 */
async function searchPexels(query: string, perPage = 2) {
  const params = new URLSearchParams({
    query,
    per_page: String(perPage),
    orientation: 'landscape'
  })
  
  const response = await fetch(`https://api.pexels.com/v1/search?${params}`, {
    headers: { 'Authorization': PEXELS_API_KEY }
  })
  
  if (!response.ok) return []
  
  const data: any = await response.json()
  return (data.photos || []).map((p: any) => p.src.large)
}

/**
 * 下載圖片並上傳到 Storage
 */
async function downloadAndUpload(imageUrl: string, attractionId: string, index: number) {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`下載失敗: ${response.status}`)
    }
    
    const buffer = await response.buffer()
    
    const ext = 'jpg'
    const filename = `thailand/${attractionId}-${index}.${ext}`
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, buffer, {
        contentType: `image/${ext}`,
        upsert: true
      })
    
    if (error) throw error
    
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename)
    
    return publicUrl
  } catch (error) {
    console.error(`  ⚠️  上傳失敗:`, error)
    return null
  }
}

/**
 * 處理單個景點
 */
async function processAttraction(attraction: any) {
  console.log(`\n處理: ${attraction.name} (${attraction.english_name})`)
  
  const info = attractionInfo[attraction.name]
  
  if (!info) {
    console.log(`  ⚠️  沒有預設資訊，跳過`)
    return
  }
  
  // 1. 搜尋照片
  const query = `${attraction.english_name} Pattaya Thailand`
  const photoUrls = await searchPexels(query, 2)
  
  if (photoUrls.length === 0) {
    console.log(`  ⚠️  找不到照片`)
    return
  }
  
  // 2. 下載並上傳
  const uploadedUrls: string[] = []
  
  for (let i = 0; i < photoUrls.length; i++) {
    const storageUrl = await downloadAndUpload(photoUrls[i], attraction.id, i + 1)
    if (storageUrl) {
      uploadedUrls.push(storageUrl)
    }
  }
  
  if (uploadedUrls.length === 0) {
    console.log(`  ❌ 上傳失敗`)
    return
  }
  
  // 3. 更新資料庫
  const { error } = await supabase
    .from('attractions')
    .update({
      description: info.description,
      address: info.address,
      opening_hours: info.opening_hours,
      duration_minutes: info.duration_minutes,
      tags: info.tags,
      images: uploadedUrls,
      thumbnail: uploadedUrls[0],
      updated_at: new Date().toISOString()
    })
    .eq('id', attraction.id)
  
  if (error) {
    console.log(`  ❌ 資料庫更新失敗:`, error)
    return
  }
  
  console.log(`  ✅ 完成（描述 + ${uploadedUrls.length} 張照片）`)
}

/**
 * 主程式
 */
async function main() {
  console.log('🚀 開始填充芭達雅景點資料...\n')
  
  // 查詢前 5 個需要處理的景點
  const { data: attractions, error } = await supabase
    .from('attractions')
    .select('id, name, english_name')
    .eq('country_id', 'thailand')
    .eq('city_id', 'pattaya')
    .in('name', Object.keys(attractionInfo))
  
  if (error) {
    console.error('❌ 查詢失敗:', error)
    process.exit(1)
  }
  
  console.log(`📋 找到 ${attractions.length} 個景點\n`)
  
  for (const attraction of attractions) {
    await processAttraction(attraction)
    
    // API 限制：18 秒/次
    await new Promise(resolve => setTimeout(resolve, 18000))
  }
  
  console.log('\n✅ 完成！')
}

main().catch(console.error)
