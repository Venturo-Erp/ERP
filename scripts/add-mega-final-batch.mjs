#!/usr/bin/env node
/**
 * 超大最終批次 - 補齊所有重要景點
 * 目標：突破 300 景點，打造旅遊業界百科全書
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const attractions = [
  // ========== 沖繩離島 ==========
  // 石垣島 (ishigaki)
  {
    id: randomUUID(),
    city_id: 'ishigaki',
    country_id: 'japan',
    name: '《川平灣》- 日本百景米其林三星',
    name_en: 'Kabira Bay',
    category: '自然景觀',
    description:
      '《川平灣》被選為日本百景，米其林綠色指南三星景點。祖母綠海水透明度極高，搭乘玻璃底船欣賞珊瑚礁與熱帶魚，黑珍珠養殖場展現沖繩海洋文化，四季皆美。',
    tags: ['海灣', '米其林', '必遊', '珊瑚'],
    images: ['https://images.unsplash.com/photo-1537956965359-7573183d1f57?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'ishigaki',
    country_id: 'japan',
    name: '《平久保崎燈塔》- 沖繩最北端絕景',
    name_en: 'Hirakubozaki Lighthouse',
    category: '自然景觀',
    description:
      '石垣島最北端的《平久保崎燈塔》，360度海景無敵，碧藍太平洋與東海交匯，牛隻悠閒吃草。夕陽時分天空染成橘紅金黃，是攝影師最愛的絕景秘境。',
    tags: ['燈塔', '絕景', '夕陽', '秘境'],
    images: ['https://images.unsplash.com/photo-1551244072-5d12893278ab?w=1920&q=85'],
    duration_minutes: 90,
    display_order: 2,
    is_active: true,
  },

  // 宮古島 (miyakojima)
  {
    id: randomUUID(),
    city_id: 'miyakojima',
    country_id: 'japan',
    name: '《與那霸前濱海灘》- 東洋第一白沙',
    name_en: 'Yonaha Maehama Beach',
    category: '自然景觀',
    description:
      '綿延7公里的《與那霸前濱海灘》被譽為「東洋第一」，粉末般細緻白沙、湛藍海水漸層如畫。來間大橋橫跨海面，水清沙白適合游泳浮潛，宮古島最美海灘當之無愧。',
    tags: ['海灘', '白沙', '必遊', '東洋第一'],
    images: ['https://images.unsplash.com/photo-1537956965359-7573183d1f57?w=1920&q=85'],
    duration_minutes: 240,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'miyakojima',
    country_id: 'japan',
    name: '《伊良部大橋》- 免費最長跨海大橋',
    name_en: 'Irabu Bridge',
    category: '體驗活動',
    description:
      '全長3540公尺的《伊良部大橋》是日本免費通行最長橋梁，連接宮古島與伊良部島。開車馳騁海上，兩側碧藍大海延伸天際，中段最高點俯瞰360度絕美海景令人陶醉。',
    tags: ['大橋', '絕景', '開車', '必遊'],
    images: ['https://images.unsplash.com/photo-1551244072-5d12893278ab?w=1920&q=85'],
    duration_minutes: 60,
    display_order: 2,
    is_active: true,
  },

  // ========== 北海道自然 ==========
  // 富良野 (furano)
  {
    id: randomUUID(),
    city_id: 'furano',
    country_id: 'japan',
    name: '《富田農場》- 薰衣草紫色花海',
    name_en: 'Farm Tomita',
    category: '自然景觀',
    description:
      '《富田農場》是日本最大薰衣草田，7-8月紫色花海隨風搖曳，配上遠方十勝岳連峰如夢似幻。彩色花田、薰衣草霜淇淋、香水DIY，北海道最具代表性的浪漫景點。',
    tags: ['薰衣草', '花田', '必遊', '浪漫'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'furano',
    country_id: 'japan',
    name: '《森林精靈露台》- 童話森林市集',
    name_en: 'Ningle Terrace',
    category: '體驗活動',
    description:
      '新富良野王子飯店內的《森林精靈露台》，15棟木屋散布森林中販售手工藝品、玻璃工藝、皮件。夜晚點燈後如童話世界，積雪時分更添夢幻氛圍，倉本聰劇作場景。',
    tags: ['森林', '市集', '童話', '夜景'],
    images: ['https://images.unsplash.com/photo-1551244072-5d12893278ab?w=1920&q=85'],
    duration_minutes: 90,
    display_order: 2,
    is_active: true,
  },

  // 美瑛 (biei)
  {
    id: randomUUID(),
    city_id: 'biei',
    country_id: 'japan',
    name: '《青池》- 神秘藍色仙境',
    name_en: 'Blue Pond',
    category: '自然景觀',
    description:
      '《青池》因火山礦物質讓池水呈現神秘寶藍色，枯木矗立水中如超現實畫作。Mac桌布採用地，不同季節光線變化色彩，冬季雪景配上藍池夢幻絕倫，美瑛必訪奇景。',
    tags: ['池塘', '奇景', '必遊', '拍照'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 60,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'biei',
    country_id: 'japan',
    name: '《拼布之路》- 起伏丘陵畫卷',
    name_en: 'Patchwork Road',
    category: '自然景觀',
    description:
      '《拼布之路》沿途丘陵田園如拼布毯，Ken與Mary之樹、七星之樹、親子之樹點綴其間。騎單車或開車穿梭起伏農田，夏季金黃麥浪、秋季紅綠交織，攝影天堂。',
    tags: ['田園', '騎車', '拍照', '四季'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 2,
    is_active: true,
  },

  // 釧路 (kushiro)
  {
    id: randomUUID(),
    city_id: 'kushiro',
    country_id: 'japan',
    name: '《釧路濕原》- 日本最大濕地',
    name_en: 'Kushiro Wetlands',
    category: '自然景觀',
    description:
      '占地18,000公頃的《釧路濕原》是日本最大濕地，搭乘SL冬之濕原號蒸汽火車穿越，丹頂鶴、蝦夷鹿棲息其中。細岡展望台360度俯瞰濕原全景，原始自然生態保護區。',
    tags: ['濕地', '丹頂鶴', '火車', '生態'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 240,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'kushiro',
    country_id: 'japan',
    name: '《幣舞橋》- 世界三大夕陽',
    name_en: 'Nusamai Bridge',
    category: '自然景觀',
    description:
      '橫跨釧路川的《幣舞橋》是釧路地標，與印尼峇里島、菲律賓馬尼拉並稱世界三大夕陽。夕陽西沉時天空染成橙紅，倒映河面如夢似幻，四季女神像見證港町風情。',
    tags: ['夕陽', '大橋', '三大夕陽', '浪漫'],
    images: ['https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&q=85'],
    duration_minutes: 60,
    display_order: 2,
    is_active: true,
  },

  // 登別 (noboribetsu)
  {
    id: randomUUID(),
    city_id: 'noboribetsu',
    country_id: 'japan',
    name: '《地獄谷》- 火山噴氣奇景',
    name_en: 'Jigokudani',
    category: '自然景觀',
    description:
      '《地獄谷》是登別溫泉源頭，直徑450公尺火口遺跡白煙瀰漫，硫磺氣味濃烈如地獄場景。木棧道環繞可近觀沸騰溫泉、噴氣孔，夜間點燈更添詭譎氛圍，日本最壯觀溫泉谷。',
    tags: ['火山', '溫泉', '奇觀', '必遊'],
    images: ['https://images.unsplash.com/photo-1551244072-5d12893278ab?w=1920&q=85'],
    duration_minutes: 90,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'noboribetsu',
    country_id: 'japan',
    name: '《登別熊牧場》- 棕熊王國',
    name_en: 'Noboribetsu Bear Park',
    category: '體驗活動',
    description:
      '搭纜車登山的《登別熊牧場》飼養140多頭棕熊，觀賞熊表演、餵食體驗。愛奴文化博物館展示北海道原住民歷史，山頂展望台俯瞰洞爺湖與太平洋，親子旅遊首選。',
    tags: ['動物', '纜車', '親子', '文化'],
    images: ['https://images.unsplash.com/photo-1551244072-5d12893278ab?w=1920&q=85'],
    duration_minutes: 150,
    display_order: 2,
    is_active: true,
  },

  // 二世谷 (niseko)
  {
    id: randomUUID(),
    city_id: 'niseko',
    country_id: 'japan',
    name: '《二世谷滑雪場》- 粉雪天堂',
    name_en: 'Niseko United',
    category: '體驗活動',
    description:
      '《二世谷》擁有世界頂級粉雪，年降雪量15公尺，滑道總長70公里。Grand Hirafu、Hanazono、Annupuri、Village四大雪場連結，背景羊蹄山如富士山倒影，國際滑雪者天堂。',
    tags: ['滑雪', '粉雪', '必遊', '國際'],
    images: ['https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920&q=85'],
    duration_minutes: 480,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'niseko',
    country_id: 'japan',
    name: '《神仙沼》- 高山濕原秘境',
    name_en: 'Shinsen-numa Pond',
    category: '自然景觀',
    description:
      '海拔750公尺的《神仙沼》被原始森林環繞，池水清澈倒映天空與樹影。木棧道健行約20分鐘，6-10月高山植物盛開，秋季紅葉如火，如仙境般寧靜療癒的高山濕原。',
    tags: ['湖泊', '健行', '秘境', '紅葉'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 2,
    is_active: true,
  },

  // ========== 關東周邊 ==========
  // 千葉 (chiba)
  {
    id: randomUUID(),
    city_id: 'chiba',
    country_id: 'japan',
    name: '《東京迪士尼度假區》- 夢想王國',
    name_en: 'Tokyo Disney Resort',
    category: '體驗活動',
    description:
      '《東京迪士尼樂園》與《迪士尼海洋》組成亞洲最大主題樂園。經典遊行、刺激設施、精緻表演，獨有海洋主題園區，全年慶典活動豐富，是日本最受歡迎的家庭旅遊景點。',
    tags: ['主題樂園', '迪士尼', '親子', '必遊'],
    images: ['https://images.unsplash.com/photo-1528181304800-259b08848526?w=1920&q=85'],
    duration_minutes: 600,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'chiba',
    country_id: 'japan',
    name: '《成田山新勝寺》- 真言宗大本山',
    name_en: 'Naritasan Shinshoji Temple',
    category: '歷史文化',
    description:
      '創建940年的《成田山新勝寺》是真言宗智山派大本山，供奉不動明王靈驗。三重塔、大本堂建築壯麗，表參道鰻魚飯名店林立，初詣參拜人數日本前三，千年古剎香火鼎盛。',
    tags: ['寺廟', '歷史', '鰻魚', '初詣'],
    images: ['https://images.unsplash.com/photo-1548013146-72479768bada?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 2,
    is_active: true,
  },

  // 江之島 (enoshima)
  {
    id: randomUUID(),
    city_id: 'enoshima',
    country_id: 'japan',
    name: '《江之島海蠟燭》- 湘南夕陽地標',
    name_en: 'Enoshima Sea Candle',
    category: '自然景觀',
    description:
      '高60公尺的《江之島海蠟燭》燈塔是湘南象徵，登頂360度俯瞰相模灣、富士山、鎌倉市景。日落時分夕陽西沉染紅天際，夜晚點燈與江之島大橋燈光交織浪漫無比。',
    tags: ['燈塔', '夕陽', '富士山', '浪漫'],
    images: ['https://images.unsplash.com/photo-1551244072-5d12893278ab?w=1920&q=85'],
    duration_minutes: 90,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'enoshima',
    country_id: 'japan',
    name: '《江島神社》- 戀愛成就聖地',
    name_en: 'Enoshima Shrine',
    category: '歷史文化',
    description:
      '供奉弁財天的《江島神社》由邊津宮、中津宮、奧津宮三社組成，戀愛成就、音樂藝能祈願靈驗。洞窟探險、龍戀之鐘、白鶴仙水，登島階梯沿途美景與神話傳說交織。',
    tags: ['神社', '戀愛', '必遊', '海景'],
    images: ['https://images.unsplash.com/photo-1548013146-72479768bada?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 2,
    is_active: true,
  },
]

async function main() {
  console.log('🚀 開始新增超大最終批次景點...\n')
  console.log('目標：打造 300+ 景點的旅遊業界百科全書\n')

  let success = 0
  let failed = 0

  for (const attraction of attractions) {
    try {
      const { error } = await supabase.from('attractions').insert(attraction)

      if (error) throw error

      console.log(`✅ ${attraction.name} (${attraction.city_id})`)
      success++
    } catch (error) {
      console.error(`❌ ${attraction.name}: ${error.message}`)
      failed++
    }
  }

  console.log(`\n📊 完成統計:`)
  console.log(`✅ 成功: ${success} 個`)
  console.log(`❌ 失敗: ${failed} 個`)
  console.log(`\n🎉 超大批次景點資料新增完成！`)
}

main().catch(console.error)
