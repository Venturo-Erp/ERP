#!/usr/bin/env node
/**
 * 匯入清邁 30 個精選餐廳（加速版）
 * 來源：KKday、Klook、Google Maps 評價
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwODMyMCwiZXhwIjoyMDc0Njg0MzIwfQ.kbJbdYHtOWudBGzV3Jv5OWzWQQZT4aBFFgfUczaVdIE'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Top 20 必吃餐廳
const top20Restaurants = [
  {
    city: '清邁',
    name: 'Khao Soi Khun Yai',
    name_en: 'Khao Soi Khun Yai',
    category: '泰式',
    cuisine_type: '泰北料理',
    description: '清邁最有名的咖哩麵老店，湯頭濃郁香醇，麵條軟硬適中',
    tags: ['咖哩麵', '在地老店', '必吃', '平價'],
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    price_range: '💰',
    must_try_dish: 'Khao Soi（清邁咖哩麵）',
    priority: 1
  },
  {
    city: '清邁',
    name: 'SP Chicken',
    name_en: 'SP Chicken',
    category: '泰式',
    cuisine_type: '烤雞',
    description: '在地人排隊名店，烤雞外皮酥脆、肉質鮮嫩多汁',
    tags: ['烤雞', '在地美食', '排隊', '平價'],
    image_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800',
    price_range: '💰',
    must_try_dish: '烤雞全隻',
    priority: 2
  },
  {
    city: '清邁',
    name: 'Huen Phen',
    name_en: 'Huen Phen',
    category: '泰式',
    cuisine_type: '泰北家常菜',
    description: '傳統泰北家常菜，古色古香蘭納式建築',
    tags: ['泰北菜', '傳統', '必吃', '中價'],
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    price_range: '💰💰',
    must_try_dish: '香腸、青木瓜沙拉',
    priority: 3
  },
  {
    city: '清邁',
    name: 'Mango Tango',
    name_en: 'Mango Tango',
    category: '甜點',
    cuisine_type: '芒果甜品',
    description: '寧曼路超人氣芒果甜品店，芒果糯米飯必點',
    tags: ['芒果', '甜點', '網美', '中價'],
    image_url: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=800',
    price_range: '💰💰',
    must_try_dish: '芒果糯米飯、芒果冰沙',
    priority: 4
  },
  {
    city: '清邁',
    name: 'Ginger Farm Kitchen',
    name_en: 'Ginger Farm Kitchen',
    category: '泰式',
    cuisine_type: '泰北創意料理',
    description: '小農直送有機食材，創意泰北料理，寧曼區人氣餐廳',
    tags: ['有機', '創意', '小農', '中價'],
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    price_range: '💰💰',
    must_try_dish: '泰北香腸、青咖哩',
    priority: 5
  },
  {
    city: '清邁',
    name: 'The Service 1921',
    name_en: 'The Service 1921',
    category: '泰式',
    cuisine_type: '泰式創意料理',
    description: '百年歷史建築改建，精緻泰式創意料理',
    tags: ['精緻', '歷史建築', '高級', '必吃'],
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    price_range: '💰💰💰',
    must_try_dish: '泰式套餐',
    priority: 6
  },
  {
    city: '清邁',
    name: 'Dash! Restaurant and Bar',
    name_en: 'Dash! Restaurant and Bar',
    category: '泰式',
    cuisine_type: '泰北家常菜',
    description: '古城內高評價餐廳，環境優美、菜色豐富',
    tags: ['古城', '環境優', '家常菜', '中價'],
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    price_range: '💰💰',
    must_try_dish: '青木瓜沙拉、冬蔭功',
    priority: 7
  },
  {
    city: '清邁',
    name: 'Cowboy Lady',
    name_en: 'Cowboy Lady',
    category: '西式',
    cuisine_type: '牛排',
    description: '美式牛仔風格餐廳，牛排好評、氛圍佳',
    tags: ['牛排', '美式', '氛圍佳', '中價'],
    image_url: 'https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=800',
    price_range: '💰💰',
    must_try_dish: '炭烤牛排',
    priority: 8
  },
  {
    city: '清邁',
    name: 'iBerry',
    name_en: 'iBerry',
    category: '甜點',
    cuisine_type: '冰淇淋',
    description: '寧曼路網美冰淇淋店，巨型人像裝置藝術',
    tags: ['冰淇淋', '網美', '拍照', '平價'],
    image_url: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=800',
    price_range: '💰',
    must_try_dish: '手工冰淇淋',
    priority: 9
  },
  {
    city: '清邁',
    name: 'Ristr8to',
    name_en: 'Ristr8to',
    category: '咖啡廳',
    cuisine_type: '精品咖啡',
    description: '世界拉花冠軍開的咖啡廳，咖啡控必訪',
    tags: ['咖啡', '拉花', '精品', '中價'],
    image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800',
    price_range: '💰💰',
    must_try_dish: '手沖咖啡、拉花咖啡',
    priority: 10
  },
  {
    city: '清邁',
    name: 'The Larder Café & Bar',
    name_en: 'The Larder Café & Bar',
    category: '西式',
    cuisine_type: '早午餐',
    description: '寧曼路早午餐名店，環境舒適、餐點精緻',
    tags: ['早午餐', '環境優', '西式', '中價'],
    image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800',
    price_range: '💰💰',
    must_try_dish: '班尼迪克蛋、鬆餅',
    priority: 11
  },
  {
    city: '清邁',
    name: 'Tong Tem Toh',
    name_en: 'Tong Tem Toh',
    category: '泰式',
    cuisine_type: '泰北料理',
    description: '古城內平價泰北料理，在地人常去',
    tags: ['泰北菜', '平價', '在地', '家常菜'],
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    price_range: '💰',
    must_try_dish: '泰北香腸、咖哩麵',
    priority: 12
  },
  {
    city: '清邁',
    name: 'Palaad Tawanron',
    name_en: 'Palaad Tawanron',
    category: '泰式',
    cuisine_type: '餐廳＋寺廟',
    description: '素帖山腳下餐廳，可俯瞰清邁全景',
    tags: ['景觀', '山景', '泰北菜', '中價'],
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    price_range: '💰💰',
    must_try_dish: '泰式套餐',
    priority: 13
  },
  {
    city: '清邁',
    name: 'Cherng Doi Roast Chicken',
    name_en: 'Cherng Doi Roast Chicken',
    category: '泰式',
    cuisine_type: '烤雞',
    description: '烤雞專賣店，在地人推薦',
    tags: ['烤雞', '平價', '在地', '必吃'],
    image_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800',
    price_range: '💰',
    must_try_dish: '烤雞、青木瓜沙拉',
    priority: 14
  },
  {
    city: '清邁',
    name: 'Kao Tom Pla Kimpo',
    name_en: 'Kao Tom Pla Kimpo',
    category: '泰式',
    cuisine_type: '粥品',
    description: '24小時營業粥品店，在地人宵夜首選',
    tags: ['粥', '24小時', '宵夜', '平價'],
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    price_range: '💰',
    must_try_dish: '魚粥',
    priority: 15
  },
  {
    city: '清邁',
    name: 'Rustic & Blue',
    name_en: 'Rustic & Blue',
    category: '咖啡廳',
    cuisine_type: '早午餐',
    description: '鄉村風咖啡廳，早午餐精緻',
    tags: ['早午餐', '咖啡', '網美', '中價'],
    image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800',
    price_range: '💰💰',
    must_try_dish: '班尼迪克蛋、咖啡',
    priority: 16
  },
  {
    city: '清邁',
    name: 'Graph Table',
    name_en: 'Graph Table',
    category: '咖啡廳',
    cuisine_type: '早午餐',
    description: '工業風咖啡廳，早午餐豐盛',
    tags: ['早午餐', '工業風', '咖啡', '中價'],
    image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800',
    price_range: '💰💰',
    must_try_dish: '鬆餅、拿鐵',
    priority: 17
  },
  {
    city: '清邁',
    name: 'Khao Soi Mae Sai',
    name_en: 'Khao Soi Mae Sai',
    category: '泰式',
    cuisine_type: '泰北料理',
    description: '在地咖哩麵名店，價格親民',
    tags: ['咖哩麵', '平價', '在地', '必吃'],
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    price_range: '💰',
    must_try_dish: 'Khao Soi',
    priority: 18
  },
  {
    city: '清邁',
    name: 'The Riverside Bar & Restaurant',
    name_en: 'The Riverside Bar & Restaurant',
    category: '泰式',
    cuisine_type: '河畔餐廳',
    description: '湄平河畔餐廳，現場音樂、氛圍浪漫',
    tags: ['河景', '音樂', '浪漫', '中價'],
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    price_range: '💰💰',
    must_try_dish: '泰式海鮮',
    priority: 19
  },
  {
    city: '清邁',
    name: 'David\'s Kitchen',
    name_en: 'David\'s Kitchen',
    category: '西式',
    cuisine_type: '法式料理',
    description: '清邁最佳法式餐廳之一，精緻高級',
    tags: ['法式', '精緻', '高級', '必吃'],
    image_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
    price_range: '💰💰💰',
    must_try_dish: '法式套餐',
    priority: 20
  }
]

// Top 21-30 推薦餐廳
const top30Restaurants = [
  {
    city: '清邁',
    name: 'Salad Concept',
    category: '西式',
    cuisine_type: '沙拉',
    description: '健康沙拉專賣店，食材新鮮',
    tags: ['健康', '沙拉', '輕食', '中價'],
    price_range: '💰💰',
    priority: 21
  },
  {
    city: '清邁',
    name: 'Fern Forest Café',
    category: '咖啡廳',
    cuisine_type: '咖啡＋輕食',
    description: '森林系咖啡廳，環境清幽',
    tags: ['森林', '咖啡', '網美', '中價'],
    price_range: '💰💰',
    priority: 22
  },
  {
    city: '清邁',
    name: 'Cooking Love',
    category: '泰式',
    cuisine_type: '泰北料理',
    description: '在地家常菜，價格實惠',
    tags: ['家常菜', '平價', '在地', '泰北'],
    price_range: '💰',
    priority: 23
  },
  {
    city: '清邁',
    name: 'Ohkajhu Organic Farm',
    category: '泰式',
    cuisine_type: '有機農場餐廳',
    description: '有機農場直送，田園風光',
    tags: ['有機', '農場', '田園', '中價'],
    price_range: '💰💰',
    priority: 24
  },
  {
    city: '清邁',
    name: 'The Baristro at Ping River',
    category: '咖啡廳',
    cuisine_type: '河畔咖啡',
    description: '湄平河畔咖啡廳，景色優美',
    tags: ['河景', '咖啡', '景觀', '中價'],
    price_range: '💰💰',
    priority: 25
  },
  {
    city: '清邁',
    name: 'Tong Kanom Thai',
    category: '甜點',
    cuisine_type: '泰式甜點',
    description: '傳統泰式甜點專賣店',
    tags: ['甜點', '傳統', '平價', '泰式'],
    price_range: '💰',
    priority: 26
  },
  {
    city: '清邁',
    name: 'Pun Pun Vegetarian',
    category: '素食',
    cuisine_type: '素食',
    description: '有機素食餐廳，環保理念',
    tags: ['素食', '有機', '健康', '中價'],
    price_range: '💰💰',
    priority: 27
  },
  {
    city: '清邁',
    name: 'Lert Ros',
    category: '泰式',
    cuisine_type: '泰北料理',
    description: '古城內老店，在地人常去',
    tags: ['老店', '在地', '泰北', '平價'],
    price_range: '💰',
    priority: 28
  },
  {
    city: '清邁',
    name: 'The Hideout',
    category: '西式',
    cuisine_type: '早午餐',
    description: '隱密早午餐店，環境舒適',
    tags: ['早午餐', '環境優', '西式', '中價'],
    price_range: '💰💰',
    priority: 29
  },
  {
    city: '清邁',
    name: 'Blue Whale Maharaj',
    category: '咖啡廳',
    cuisine_type: '藍色系咖啡廳',
    description: '藍色系網美咖啡廳，超好拍',
    tags: ['網美', '拍照', '咖啡', '中價'],
    price_range: '💰💰',
    priority: 30
  }
]

async function main() {
  console.log('🚀 開始匯入清邁 30 個精選餐廳...\n')

  const allRestaurants = [...top20Restaurants, ...top30Restaurants]
  
  let success = 0
  let failed = 0

  for (const restaurant of allRestaurants) {
    try {
      const { error } = await supabase
        .from('restaurants')
        .insert(restaurant)

      if (error) throw error

      console.log(`✅ [${restaurant.priority}] ${restaurant.name}`)
      success++
    } catch (error) {
      console.error(`❌ ${restaurant.name}: ${error.message}`)
      failed++
    }
  }

  console.log(`\n📊 完成統計:`)
  console.log(`✅ 成功: ${success} 個`)
  console.log(`❌ 失敗: ${failed} 個`)
  console.log(`\n🎉 清邁餐廳匯入完成！共匯入 ${success} 個餐廳`)
}

main().catch(console.error)
