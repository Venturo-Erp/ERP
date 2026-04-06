#!/usr/bin/env node

/**
 * 直接新增宿務景點資料到資料庫
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ 需要 SUPABASE_SERVICE_KEY 環境變數')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const cebuAttractions = [
  {
    id: randomUUID(),
    city_id: 'cebu',
    country_id: 'philippines',
    name: '《巧克力山》- 薄荷島奇景',
    name_en: 'Chocolate Hills',
    category: '自然景觀',
    description:
      '位於薄荷島的《巧克力山》由1268座圓錐形山丘組成，每座高達120公尺。乾季時草地轉為棕色，遠看如同灑落大地的巧克力球，是菲律賓最獨特的地質奇觀。',
    tags: ['自然', '拍照', '必遊', '地質奇觀'],
    images: [
      'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1920&q=85',
      'https://images.unsplash.com/photo-1569592364213-1becfc5c8b7f?w=1920&q=85',
    ],
    duration_minutes: 120,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'cebu',
    country_id: 'philippines',
    name: '與鯨鯊共游 - 歐斯陸海洋體驗',
    name_en: 'Whale Shark Swimming',
    category: '體驗活動',
    description:
      '來到歐斯陸（Oslob）與世界最大魚類鯨鯊近距離接觸。這些溫馴的巨型生物長達10公尺，在清澈海水中與牠們共游，感受震撼又安全的海洋奇遇。',
    tags: ['海洋', '體驗', '刺激', '生態'],
    images: ['https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 2,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'cebu',
    country_id: 'philippines',
    name: '《眼鏡猴》保護區 - 世界最小靈長類',
    name_en: 'Tarsier Sanctuary',
    category: '自然景觀',
    description:
      '菲律賓特有種《眼鏡猴》體長僅10公分，卻擁有比身體還大的眼睛。在薄荷島保護區近距離觀察這些夜行性小精靈，牠們靈活轉動180度的頭部超級可愛。',
    tags: ['生態', '保育', '可愛', '獨特'],
    images: ['https://images.unsplash.com/photo-1614027164847-1b28cfe1df60?w=1920&q=85'],
    duration_minutes: 60,
    display_order: 3,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'cebu',
    country_id: 'philippines',
    name: '《羅博河》竹筏漂流午餐',
    name_en: 'Loboc River Cruise',
    category: '體驗活動',
    description:
      '乘坐傳統竹筏順著《羅博河》緩緩前行，兩岸熱帶雨林美景盡收眼底。船上提供菲律賓自助午餐，還有現場樂團演奏，在悠閒氛圍中享受2小時的河上時光。',
    tags: ['河流', '美食', '放鬆', '文化'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 4,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'cebu',
    country_id: 'philippines',
    name: '《麥哲倫十字架》- 宿務歷史地標',
    name_en: "Magellan's Cross",
    category: '歷史文化',
    description:
      '1521年葡萄牙探險家麥哲倫在此豎立十字架，象徵菲律賓基督教化的起點。八角形禮拜堂內天花板繪有當年受洗場景，是宿務市最重要的歷史遺跡。',
    tags: ['歷史', '宗教', '地標', '文化'],
    images: ['https://images.unsplash.com/photo-1555881675-d8d8d7b1c157?w=1920&q=85'],
    duration_minutes: 30,
    display_order: 5,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'cebu',
    country_id: 'philippines',
    name: '《聖嬰大教堂》- 菲律賓最古老教堂',
    name_en: 'Basilica del Santo Niño',
    category: '歷史文化',
    description:
      '建於1565年的《聖嬰大教堂》是菲律賓最古老的羅馬天主教堂。教堂供奉聖嬰像，每年1月的盛大慶典吸引數百萬信徒朝聖，巴洛克式建築莊嚴華麗。',
    tags: ['宗教', '建築', '古蹟', '朝聖'],
    images: ['https://images.unsplash.com/photo-1583474372481-48b0aed9295e?w=1920&q=85'],
    duration_minutes: 45,
    display_order: 6,
    is_active: true,
  },
]

async function main() {
  console.log('🚀 開始新增宿務景點資料...\n')

  for (const attraction of cebuAttractions) {
    try {
      const { data, error } = await supabase
        .from('attractions')
        .upsert(attraction, { onConflict: 'id' })

      if (error) throw error

      console.log(`✅ ${attraction.name}`)
    } catch (error) {
      console.error(`❌ ${attraction.name}: ${error.message}`)
    }
  }

  console.log('\n🎉 宿務景點資料新增完成！')
}

main().catch(console.error)
