#!/usr/bin/env tsx
/**
 * 填充東北景點照片
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

// 景點與搜尋關鍵字
const attractions = [
  { name: '青森睡魔之家', query: 'Nebuta Museum Aomori Japan' },
  { name: '山寺', query: 'Yamadera Temple Yamagata Japan' },
  { name: '銀山溫泉', query: 'Ginzan Onsen Yamagata Japan' },
  { name: '五大堂', query: 'Godaido Matsushima Japan' },
  { name: '瑞巖寺', query: 'Zuiganji Temple Matsushima Japan' },
  { name: '松島海岸', query: 'Matsushima Bay Japan' },
  { name: '藏王狐狸村', query: 'Zao Fox Village Japan' },
  { name: '藏王纜車', query: 'Zao Ropeway Japan mountain' }
]

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

async function downloadAndUpload(imageUrl: string, attractionId: string, index: number) {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) throw new Error(`下載失敗: ${response.status}`)
    
    const buffer = await response.buffer()
    const filename = `japan/${attractionId}-${index}.jpg`
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, buffer, {
        contentType: 'image/jpeg',
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

async function processAttraction(name: string, query: string) {
  console.log(`\n處理: ${name}`)
  
  // 查詢景點 ID
  const { data: attraction } = await supabase
    .from('attractions')
    .select('id')
    .eq('country_id', 'japan')
    .ilike('name', `%${name}%`)
    .single()
  
  if (!attraction) {
    console.log(`  ❌ 找不到景點`)
    return
  }
  
  // 搜尋照片
  const photoUrls = await searchPexels(query, 2)
  
  if (photoUrls.length === 0) {
    console.log(`  ⚠️  找不到照片`)
    return
  }
  
  // 下載並上傳
  const uploadedUrls: string[] = []
  
  for (let i = 0; i < Math.min(photoUrls.length, 2); i++) {
    const storageUrl = await downloadAndUpload(photoUrls[i], attraction.id, i + 1)
    if (storageUrl) {
      uploadedUrls.push(storageUrl)
    }
  }
  
  if (uploadedUrls.length === 0) {
    console.log(`  ❌ 照片上傳失敗`)
    return
  }
  
  // 更新資料庫
  const { error } = await supabase
    .from('attractions')
    .update({
      images: uploadedUrls,
      thumbnail: uploadedUrls[0],
      updated_at: new Date().toISOString()
    })
    .eq('id', attraction.id)
  
  if (error) {
    console.log(`  ❌ 資料庫更新失敗:`, error)
    return
  }
  
  console.log(`  ✅ 完成（${uploadedUrls.length} 張照片）`)
}

async function main() {
  console.log('🚀 開始填充東北景點照片...\n')
  console.log(`📋 共 ${attractions.length} 個景點\n`)
  
  let success = 0
  let failed = 0
  
  for (const { name, query } of attractions) {
    try {
      await processAttraction(name, query)
      success++
    } catch (e) {
      console.error(`❌ ${name} 處理失敗:`, e)
      failed++
    }
    
    // API 限制：18 秒/次
    await new Promise(resolve => setTimeout(resolve, 18000))
  }
  
  console.log(`\n✅ 完成！成功 ${success} 個，失敗 ${failed} 個`)
}

main().catch(console.error)
