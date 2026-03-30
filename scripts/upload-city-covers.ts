#!/usr/bin/env tsx
/**
 * 上傳城市封面照片到 Supabase Storage
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const BUCKET_NAME = 'attractions'

// 照片對應（從 OpenClaw media 目錄）
const cityCovers = [
  {
    source: '/Users/tokichin/.openclaw/media/inbound/file_5---edc717e4-ef81-475c-bead-3bafa19b3978.jpg',
    airports: ['PVG', 'SHA'],
    city: '上海'
  },
  {
    source: '/Users/tokichin/.openclaw/media/inbound/file_6---d259bce5-b343-4ae5-a02b-78cd01954d7c.jpg',
    airports: ['KIX'],
    city: '大阪'
  },
  {
    source: '/Users/tokichin/.openclaw/media/inbound/file_7---d716e125-03c9-44d0-9cd6-9b9de191a9c0.jpg',
    airports: ['PEK'],
    city: '北京'
  },
  {
    source: '/Users/tokichin/.openclaw/media/inbound/file_8---df86acf2-7d2c-4d1f-b149-9088eab9ad0c.jpg',
    airports: ['CTS'],
    city: '北海道'
  },
  {
    source: '/Users/tokichin/.openclaw/media/inbound/file_9---e1e10890-16af-4341-b0df-4c453a8090a2.jpg',
    airports: ['CTU'],
    city: '成都'
  },
  {
    source: '/Users/tokichin/.openclaw/media/inbound/file_10---9e0a38c8-42ad-448a-97f7-5f0a0ae7dc92.jpg',
    airports: ['OKA'],
    city: '沖繩'
  },
  {
    source: '/Users/tokichin/.openclaw/media/inbound/file_13---8da044f1-75ae-423a-891a-d68b093f2d70.jpg',
    airports: ['NRT', 'HND'],
    city: '東京'
  },
  {
    source: '/Users/tokichin/.openclaw/media/inbound/file_14---22e8efea-373f-4a93-8ad6-dbc7caaee693.jpg',
    airports: ['HAN'],
    city: '河內'
  }
]

async function uploadCityCovers() {
  console.log('🚀 開始上傳城市封面照片...\n')
  
  let success = 0
  let failed = 0
  
  for (const cover of cityCovers) {
    console.log(`處理: ${cover.city} (${cover.airports.join(', ')})`)
    
    // 檢查檔案是否存在
    if (!fs.existsSync(cover.source)) {
      console.log(`  ❌ 找不到檔案: ${cover.source}`)
      failed++
      continue
    }
    
    // 讀取檔案
    const buffer = fs.readFileSync(cover.source)
    
    // 為每個機場代號上傳
    for (const airport of cover.airports) {
      const filename = `city-covers/${airport}.jpg`
      
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filename, buffer, {
          contentType: 'image/jpeg',
          upsert: true
        })
      
      if (error) {
        console.log(`  ❌ ${airport} 上傳失敗:`, error.message)
        failed++
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(filename)
        
        console.log(`  ✅ ${airport}: ${publicUrl}`)
        success++
      }
    }
    
    console.log()
  }
  
  console.log(`\n✅ 完成！成功 ${success} 個，失敗 ${failed} 個`)
}

uploadCityCovers().catch(console.error)
