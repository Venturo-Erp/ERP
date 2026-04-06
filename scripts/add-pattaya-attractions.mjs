import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 從表單整理的芭達雅景點（40 個缺少的）
const newAttractions = [
  // 自然與景觀
  { name: '七珍佛山', english_name: 'Khao Chi Chan', category: '景點', type: '自然景觀' },
  {
    name: '春武里大峽谷',
    english_name: 'Grand Canyon Chonburi',
    category: '景點',
    type: '自然景觀',
  },
  {
    name: '芭達雅海底世界',
    english_name: 'Underwater World Pattaya',
    category: '景點',
    type: '自然景觀',
  },
  { name: '沙美島', english_name: 'Koh Samet', category: '景點', type: '自然景觀' },
  { name: 'Jomtien Beach', english_name: 'Jomtien Beach', category: '景點', type: '海灘' },

  // 主題樂園
  { name: '真理寺', english_name: 'Sanctuary of Truth', category: '景點', type: '寺廟' },
  {
    name: '羅摩衍那水上樂園',
    english_name: 'Ramayana Water Park',
    category: '景點',
    type: '主題樂園',
  },
  { name: '暹羅傳奇樂園', english_name: 'Legend Siam Pattaya', category: '景點', type: '主題樂園' },
  {
    name: '哥倫比亞影業水世界',
    english_name: 'Columbia Pictures Aquaverse',
    category: '景點',
    type: '主題樂園',
  },
  {
    name: '暹羅冰雪世界',
    english_name: 'Frost Magical Ice of Siam',
    category: '景點',
    type: '主題樂園',
  },
  { name: '格蘭島', english_name: 'Koh Larn', category: '景點', type: '海島' },
  { name: '珊瑚島', english_name: 'Nemo Island', category: '景點', type: '海島' },
  { name: '寶妮小馬俱樂部', english_name: 'Pipo Pony Club', category: '景點', type: '體驗活動' },
  { name: '翡翠灣', english_name: 'Emerald Bay', category: '景點', type: '海灘' },
  {
    name: 'GREAT&GRAND Sweet Destination',
    english_name: 'GREAT&GRAND Sweet Destination',
    category: '景點',
    type: '主題樂園',
  },
  { name: '迷你暹羅小人國', english_name: 'Mini Siam', category: '景點', type: '主題樂園' },

  // 市集
  { name: '飛機夜市', english_name: 'Runway Street Food', category: '購物', type: '夜市' },
  { name: '邦盛魚市場', english_name: 'Bangsaen Fish Market', category: '購物', type: '市場' },

  // 美食
  { name: 'Tutu Beach', english_name: 'Tutu Beach', category: '餐廳', type: '海灘咖啡廳' },
  {
    name: '美人魚餐廳',
    english_name: '3 Mermaids Cafe & Restaurant',
    category: '餐廳',
    type: '主題餐廳',
  },
  { name: 'Lof Land', english_name: 'Lof Land', category: '餐廳', type: '咖啡廳' },
  { name: 'Cave Beach Club', english_name: 'Cave Beach Club', category: '餐廳', type: '咖啡廳' },
  {
    name: 'Baan Mae Sri 豬雜湯',
    english_name: 'Baan Mae Sri Pork Blood Soup',
    category: '餐廳',
    type: '當地小吃',
  },

  // 表演
  {
    name: '羅馬金宮劇場人妖秀',
    english_name: 'Colosseum Show Pattaya',
    category: '景點',
    type: '表演秀',
  },
  { name: '蒂芬妮人妖秀', english_name: 'Tiffanys Show', category: '景點', type: '表演秀' },
  { name: '東方公主號遊輪', english_name: 'Oriental Princess', category: '景點', type: '遊輪' },
  {
    name: 'All Star 全明星號遊輪',
    english_name: 'All Star Cruise',
    category: '景點',
    type: '遊輪',
  },
  {
    name: '沙美島火舞餐廳',
    english_name: 'Fire Show Koh Samet',
    category: '餐廳',
    type: '表演餐廳',
  },
  { name: 'Max 泰拳比賽', english_name: 'Max Muay Thai', category: '景點', type: '表演秀' },

  // 購物
  {
    name: '尚泰芭提雅購物中心',
    english_name: 'Central Pattaya',
    category: '購物',
    type: '購物中心',
  },
  {
    name: '信不信由你博物館',
    english_name: 'Ripleys Believe it or not',
    category: '景點',
    type: '博物館',
  },

  // 動物
  { name: '綠山動物園', english_name: 'Khao Kheow Open Zoo', category: '景點', type: '動物園' },
  {
    name: '鱷魚農場',
    english_name: 'Million Years Stone Park & Crocodile Farm',
    category: '景點',
    type: '動物園',
  },
  { name: '大象村', english_name: 'Elephant Village', category: '景點', type: '體驗活動' },

  // 文化體驗
  { name: '爽泰度假莊園', english_name: 'Baan Sangtawan', category: '景點', type: '文化體驗' },
  { name: '美軍徒步街', english_name: 'Walking Street', category: '景點', type: '街區' },
  { name: '東芭樂園', english_name: 'Nong Nooch Garden', category: '景點', type: '花園' },
  { name: '唐人街', english_name: 'SOHO Town', category: '景點', type: '街區' },
  { name: '日本街', english_name: 'Japan Village', category: '景點', type: '街區' },
  { name: '3D 立體美術館', english_name: 'Art in Paradise', category: '景點', type: '博物館' },

  // 視野體驗
  {
    name: '將軍山觀景台',
    english_name: 'Phra Tamnak Mountain Viewpoint',
    category: '景點',
    type: '觀景台',
  },
  {
    name: 'Pattaya Park Tower',
    english_name: 'Pattaya Park Tower',
    category: '景點',
    type: '高空體驗',
  },
]

console.log(`準備新增 ${newAttractions.length} 個芭達雅景點\n`)

// 先找芭達雅的 city_id
const { data: cities } = await supabase
  .from('cities')
  .select('id, name')
  .eq('country_id', 'thailand')

let pattayaCityId = cities?.find(
  c =>
    c.name.includes('芭達雅') ||
    c.name.includes('芭堤雅') ||
    c.name.toLowerCase().includes('pattaya')
)?.id

if (!pattayaCityId) {
  console.log('找不到芭達雅城市，建立新城市...')
  const { data: newCity, error } = await supabase
    .from('cities')
    .insert({
      name: '芭達雅',
      english_name: 'Pattaya',
      country_id: 'thailand',
    })
    .select()
    .single()

  if (error) {
    console.error('建立城市失敗:', error)
    process.exit(1)
  }

  pattayaCityId = newCity.id
  console.log('✅ 建立城市成功:', pattayaCityId)
}

console.log(`芭達雅 city_id: ${pattayaCityId}\n`)

// 批次新增景點
let success = 0
let failed = 0

for (const attr of newAttractions) {
  const { error } = await supabase.from('attractions').insert({
    name: attr.name,
    english_name: attr.english_name,
    country_id: 'thailand',
    city_id: pattayaCityId,
    category: attr.category,
    type: attr.type,
    is_active: true,
  })

  if (error) {
    console.error(`❌ 失敗: ${attr.name}`, error.message)
    failed++
  } else {
    console.log(`✅ 成功: ${attr.name}`)
    success++
  }

  // 避免太快
  await new Promise(resolve => setTimeout(resolve, 100))
}

console.log(`\n完成！成功 ${success} 個，失敗 ${failed} 個`)
