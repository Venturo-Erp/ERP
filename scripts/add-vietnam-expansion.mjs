#!/usr/bin/env node
/**
 * 越南景點大擴充 - 公司主力市場
 * 目標：每個城市 8-10 個精選景點
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const attractions = [
  // ========== 河內擴充 (目前2個 → 目標10個) ==========
  {
    id: randomUUID(),
    city_id: 'hanoi',
    country_id: 'vietnam',
    name: '《文廟》- 越南第一所大學',
    name_en: 'Temple of Literature',
    category: '歷史文化',
    description:
      '建於1070年的《文廟》是越南第一所大學，供奉孔子與儒學大師。82座進士碑記載千年科舉歷史，庭園寧靜典雅，紅色建築與綠樹倒映池塘，展現越南儒家文化精髓。',
    tags: ['歷史', '大學', '儒家', '必遊'],
    images: ['https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 3,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'hanoi',
    country_id: 'vietnam',
    name: '《鎮國寺》- 千年水上佛塔',
    name_en: 'Tran Quoc Pagoda',
    category: '歷史文化',
    description:
      '建於541年的《鎮國寺》是河內最古老寺廟，佇立西湖小島上。15層寶塔倒映湖面，日落時分金光閃閃，周圍菩提樹、蓮花池寧靜祥和，是河內人心靈寄託聖地。',
    tags: ['寺廟', '古蹟', '湖景', '日落'],
    images: ['https://images.unsplash.com/photo-1548013146-72479768bada?w=1920&q=85'],
    duration_minutes: 90,
    display_order: 4,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'hanoi',
    country_id: 'vietnam',
    name: '《河內歌劇院》- 法式建築瑰寶',
    name_en: 'Hanoi Opera House',
    category: '歷史文化',
    description:
      '仿造巴黎歌劇院的《河內歌劇院》建於1911年，新古典主義建築奢華典雅。黃色外牆、希臘式圓柱、精緻雕刻，夜晚點燈後更顯璀璨，是法屬印度支那時期建築代表。',
    tags: ['建築', '歌劇', '法式', '夜景'],
    images: ['https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1920&q=85'],
    duration_minutes: 60,
    display_order: 5,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'hanoi',
    country_id: 'vietnam',
    name: '《龍編橋》- 河內最美大橋',
    name_en: 'Long Bien Bridge',
    category: '歷史文化',
    description:
      '1902年法國建造的《龍編橋》橫跨紅河，全長1682公尺。百年鋼鐵桁架見證越戰歷史，火車、摩托車、行人共用，日出日落時刻紅河兩岸風光如畫，是攝影師最愛。',
    tags: ['大橋', '歷史', '日出', '攝影'],
    images: ['https://images.unsplash.com/photo-1551244072-5d12893278ab?w=1920&q=85'],
    duration_minutes: 60,
    display_order: 6,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'hanoi',
    country_id: 'vietnam',
    name: '《同春市場》- 河內廚房',
    name_en: 'Dong Xuan Market',
    category: '體驗活動',
    description:
      '建於1889年的《同春市場》是河內最大傳統市場，三層建築販售服飾、食品、工藝品。地下美食街河粉、春捲、越式咖啡道地便宜，體驗當地庶民生活，殺價樂趣無窮。',
    tags: ['市場', '美食', '傳統', '購物'],
    images: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&q=85'],
    duration_minutes: 150,
    display_order: 7,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'hanoi',
    country_id: 'vietnam',
    name: '《西湖》- 河內最大湖泊',
    name_en: 'West Lake',
    category: '自然景觀',
    description:
      '面積500公頃的《西湖》是河內最大湖泊，環湖自行車道、咖啡廳、海鮮餐廳林立。鎮國寺、府神廟點綴湖畔，夕陽西下時湖面波光粼粼，是河內人週末休閒首選。',
    tags: ['湖泊', '騎車', '休閒', '夕陽'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 8,
    is_active: true,
  },

  // ========== 胡志明市擴充 (目前2個 → 目標10個) ==========
  {
    id: randomUUID(),
    city_id: 'ho-chi-minh',
    country_id: 'vietnam',
    name: '《戰爭遺跡博物館》- 越戰歷史見證',
    name_en: 'War Remnants Museum',
    category: '歷史文化',
    description:
      '《戰爭遺跡博物館》展示越戰真實面貌，照片、武器、坦克、直升機記錄戰爭殘酷。橙劑受害者照片震撼人心，提醒世人戰爭代價，是了解越南近代史的重要場所。',
    tags: ['博物館', '歷史', '越戰', '教育'],
    images: ['https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1920&q=85'],
    duration_minutes: 150,
    display_order: 3,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'ho-chi-minh',
    country_id: 'vietnam',
    name: '《統一宮》- 南越政權歷史',
    name_en: 'Reunification Palace',
    category: '歷史文化',
    description:
      '《統一宮》原為南越總統府，1975年4月30日坦克衝破大門象徵越南統一。保留1960年代裝潢、作戰室、地下碉堡，見證越南現代史轉捩點，是胡志明市必訪歷史景點。',
    tags: ['歷史', '宮殿', '必遊', '越戰'],
    images: ['https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 4,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'ho-chi-minh',
    country_id: 'vietnam',
    name: '《檳城市場》- 百年傳統市集',
    name_en: 'Ben Thanh Market',
    category: '體驗活動',
    description:
      '建於1914年的《檳城市場》是胡志明市地標，黃色鐘樓下販售越南特產、手工藝品、服飾、美食。內部迷宮般攤位密集，殺價文化濃厚，夜市時段燒烤海鮮香氣四溢。',
    tags: ['市場', '購物', '美食', '必遊'],
    images: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 5,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'ho-chi-minh',
    country_id: 'vietnam',
    name: '《范五老街》- 背包客天堂',
    name_en: 'Pham Ngu Lao Street',
    category: '體驗活動',
    description:
      '《范五老街》是東南亞著名背包客區，便宜旅館、酒吧、旅行社林立。越式按摩、河粉、春捲、咖啡廳密集，夜晚熱鬧非凡，是認識各國旅人交流文化的國際化街區。',
    tags: ['背包客', '夜生活', '美食', '國際'],
    images: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 6,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'ho-chi-minh',
    country_id: 'vietnam',
    name: '《西貢河遊船》- 城市夜景巡禮',
    name_en: 'Saigon River Cruise',
    category: '體驗活動',
    description:
      '搭乘《西貢河遊船》欣賞胡志明市夜景，兩岸高樓燈火璀璨，微風徐徐吹拂。船上享用越式自助晚餐、傳統音樂表演，從水上視角感受西貢繁華，浪漫又愜意。',
    tags: ['遊船', '夜景', '浪漫', '晚餐'],
    images: ['https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 7,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'ho-chi-minh',
    country_id: 'vietnam',
    name: '《古芝地道》- 越戰游擊基地',
    name_en: 'Cu Chi Tunnels',
    category: '歷史文化',
    description:
      '《古芝地道》是越戰時期地下城市，總長250公里的隧道網路有醫院、廚房、作戰室。爬行體驗狹窄通道、射擊AK47、品嚐游擊隊主食木薯，了解越共游擊戰術驚人毅力。',
    tags: ['歷史', '體驗', '越戰', '地道'],
    images: ['https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1920&q=85'],
    duration_minutes: 300,
    display_order: 8,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'ho-chi-minh',
    country_id: 'vietnam',
    name: '《第一郡步行街》- 現代西貢心臟',
    name_en: 'Nguyen Hue Walking Street',
    category: '體驗活動',
    description:
      '《阮惠步行街》長670公尺連接市政廳與西貢河，噴泉、座椅、街頭藝人表演。周圍精品店、咖啡廳林立，夜晚燈光音樂噴泉秀，是當地人與遊客最愛的城市客廳。',
    tags: ['步行街', '現代', '夜景', '噴泉'],
    images: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 9,
    is_active: true,
  },
]

async function main() {
  console.log('🚀 開始擴充越南景點（公司主力市場）...\n')

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
  console.log(`\n🎉 越南景點擴充完成！`)
}

main().catch(console.error)
