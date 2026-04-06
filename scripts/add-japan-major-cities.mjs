#!/usr/bin/env node
/**
 * 日本三大都市景點擴充
 * 東京 6→10、大阪 4→10、京都 5→10
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// 先取得城市的 region_id
const { data: cities } = await supabase
  .from('cities')
  .select('id, region_id')
  .in('id', ['tokyo', 'osaka', 'kyoto'])

const regionMap = {}
cities.forEach(city => {
  regionMap[city.id] = city.region_id
})

const attractions = [
  // ========== 東京擴充 (6→10個) ==========
  {
    id: randomUUID(),
    city_id: 'tokyo',
    country_id: 'japan',
    region_id: regionMap['tokyo'],
    name: '《明治神宮》- 東京都心綠洲',
    name_en: 'Meiji Shrine',
    category: '歷史文化',
    description:
      '《明治神宮》供奉明治天皇與昭憲皇太后，70萬平方公尺原始森林包圍神社寧靜莊嚴。大鳥居高12公尺、御苑花菖蒲盛開、新年初詣參拜人數全日本第一，感受日本神道文化。',
    tags: ['神社', '森林', '必遊', '初詣'],
    images: ['https://images.unsplash.com/photo-1528164344705-47542687000d?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 7,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'tokyo',
    country_id: 'japan',
    region_id: regionMap['tokyo'],
    name: '《澀谷》- 全球最繁忙路口',
    name_en: 'Shibuya Crossing',
    category: '體驗活動',
    description:
      '《澀谷十字路口》每次綠燈3000人同時穿越，全球最繁忙路口象徵東京活力。忠犬八公銅像、109百貨、音樂酒吧密集，年輕潮流文化中心，登星巴克二樓俯拍最佳角度。',
    tags: ['路口', '潮流', '打卡', '年輕'],
    images: ['https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=1920&q=85'],
    duration_minutes: 90,
    display_order: 8,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'tokyo',
    country_id: 'japan',
    region_id: regionMap['tokyo'],
    name: '《上野公園》- 櫻花名所',
    name_en: 'Ueno Park',
    category: '自然景觀',
    description:
      '《上野公園》春天1200棵櫻花盛開是東京賞櫻首選，野餐、夜櫻點燈人潮洶湧。上野動物園熊貓明星、東京國立博物館、不忍池蓮花，文化藝術與自然共存綠洲。',
    tags: ['公園', '櫻花', '動物園', '博物館'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 9,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'tokyo',
    country_id: 'japan',
    region_id: regionMap['tokyo'],
    name: '《台場》- 未來都市海濱',
    name_en: 'Odaiba',
    category: '體驗活動',
    description:
      '《台場》人工島擁有購物商場、teamLab數位美術館、等身鋼彈、富士電視台。彩虹大橋夜景璀璨、溫泉樂園大江戶物語、海濱公園吹海風，東京灣岸約會勝地。',
    tags: ['海濱', '購物', '科技', '約會'],
    images: ['https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=1920&q=85'],
    duration_minutes: 300,
    display_order: 10,
    is_active: true,
  },

  // ========== 大阪擴充 (4→10個) ==========
  {
    id: randomUUID(),
    city_id: 'osaka',
    country_id: 'japan',
    region_id: regionMap['osaka'],
    name: '《通天閣》- 大阪復古地標',
    name_en: 'Tsutenkaku Tower',
    category: '歷史文化',
    description:
      '《通天閣》高103公尺，1912年建造象徵大阪庶民文化。展望台俯瞰新世界街區、比利肯幸運之神雕像、夜晚霓虹燈復古懷舊，串炸店家林立周圍熱鬧非凡。',
    tags: ['塔', '復古', '展望', '新世界'],
    images: ['https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 5,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'osaka',
    country_id: 'japan',
    region_id: regionMap['osaka'],
    name: '《黑門市場》- 大阪廚房',
    name_en: 'Kuromon Market',
    category: '體驗活動',
    description:
      '《黑門市場》580公尺商店街販售新鮮海產、神戶牛、河豚、草莓、水果，現場燒烤試吃。180年歷史庶民市場，帝王蟹、海膽丼、章魚燒，大阪美食一次滿足。',
    tags: ['市場', '海鮮', '美食', '必吃'],
    images: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&q=85'],
    duration_minutes: 150,
    display_order: 6,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'osaka',
    country_id: 'japan',
    region_id: regionMap['osaka'],
    name: '《心齋橋》- 購物天堂',
    name_en: 'Shinsaibashi',
    category: '體驗活動',
    description:
      '《心齋橋》拱廊商店街長580公尺，藥妝店、服飾、運動品牌密集。固力果跑跑人看板、道頓堀美食、美國村潮流文化，大阪最熱鬧購物娛樂區，遊客必逛。',
    tags: ['購物', '美食', '藥妝', '必逛'],
    images: ['https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&q=85'],
    duration_minutes: 240,
    display_order: 7,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'osaka',
    country_id: 'japan',
    region_id: regionMap['osaka'],
    name: '《梅田藍天大廈》- 空中庭園',
    name_en: 'Umeda Sky Building',
    category: '自然景觀',
    description:
      '《梅田藍天大廈》173公尺高雙塔連接空中庭園展望台，360度俯瞰大阪市區、淀川河景。日落時刻天空漸層色彩、夜景燈海璀璨，情侶約會浪漫勝地。',
    tags: ['展望台', '夜景', '俯瞰', '浪漫'],
    images: ['https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 8,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'osaka',
    country_id: 'japan',
    region_id: regionMap['osaka'],
    name: '《住吉大社》- 1800年古社',
    name_en: 'Sumiyoshi Taisha',
    category: '歷史文化',
    description:
      '《住吉大社》創建於211年，住吉造建築日本最古老神社建築樣式。反橋朱紅拱橋優雅、石舞台國寶、初詣參拜祈求航海安全，大阪在地人信仰中心。',
    tags: ['神社', '古蹟', '建築', '文化'],
    images: ['https://images.unsplash.com/photo-1528164344705-47542687000d?w=1920&q=85'],
    duration_minutes: 90,
    display_order: 9,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'osaka',
    country_id: 'japan',
    region_id: regionMap['osaka'],
    name: '《大阪環球影城》- 日本環球',
    name_en: 'Universal Studios Japan',
    category: '體驗活動',
    description:
      '《大阪環球影城》哈利波特魔法世界、超級任天堂世界、小小兵樂園、侏儸紀公園驚險刺激。4D電影、遊行表演、萬聖節驚魂夜，一整天玩不完，大阪必訪樂園。',
    tags: ['樂園', '遊樂園', '必玩', '親子'],
    images: ['https://images.unsplash.com/photo-1551244072-5d12893278ab?w=1920&q=85'],
    duration_minutes: 540,
    display_order: 10,
    is_active: true,
  },

  // ========== 京都擴充 (5→10個) ==========
  {
    id: randomUUID(),
    city_id: 'kyoto',
    country_id: 'japan',
    region_id: regionMap['kyoto'],
    name: '《金閣寺》- 金色舍利殿',
    name_en: 'Kinkaku-ji',
    category: '歷史文化',
    description:
      '《金閣寺》舍利殿外層貼滿金箔，在鏡湖池倒映閃耀奪目。1397年足利義滿建造，三層樓融合寢殿、武家、禪宗建築風格，世界文化遺產京都象徵，四季美景各異。',
    tags: ['寺廟', '金閣', '世界遺產', '必遊'],
    images: ['https://images.unsplash.com/photo-1528181304800-259b08848526?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 6,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'kyoto',
    country_id: 'japan',
    region_id: regionMap['kyoto'],
    name: '《嵐山竹林》- 翠綠竹林小徑',
    name_en: 'Arashiyama Bamboo Grove',
    category: '自然景觀',
    description:
      '《嵐山竹林》數萬株孟宗竹高聳入天，陽光穿透竹葉灑落小徑夢幻仙境。微風吹拂竹葉沙沙聲療癒、渡月橋橫跨桂川、天龍寺庭園絕美，京都必訪自然景觀。',
    tags: ['竹林', '自然', '必遊', '打卡'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 150,
    display_order: 7,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'kyoto',
    country_id: 'japan',
    region_id: regionMap['kyoto'],
    name: '《祇園花見小路》- 藝妓街道',
    name_en: 'Gion Hanami-koji',
    category: '歷史文化',
    description:
      '《祇園花見小路》京都最著名藝妓區，石板路兩旁江戶時代町家建築、茶屋、料亭。黃昏時刻藝妓舞妓匆匆走過，傳統京都氛圍濃厚，體驗古都風情最佳地點。',
    tags: ['藝妓', '傳統', '街道', '文化'],
    images: ['https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1920&q=85'],
    duration_minutes: 90,
    display_order: 8,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'kyoto',
    country_id: 'japan',
    region_id: regionMap['kyoto'],
    name: '《銀閣寺》- 侘寂美學',
    name_en: 'Ginkaku-ji',
    category: '歷史文化',
    description:
      '《銀閣寺》足利義政建於1482年，雖名銀閣實為樸素木造建築展現侘寂美學。銀沙灘、向月台枯山水庭園、哲學之道櫻花季美不勝收，世界文化遺產禪意濃厚。',
    tags: ['寺廟', '庭園', '世界遺產', '禪意'],
    images: ['https://images.unsplash.com/photo-1528181304800-259b08848526?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 9,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'kyoto',
    country_id: 'japan',
    region_id: regionMap['kyoto'],
    name: '《二條城》- 德川家康行宮',
    name_en: 'Nijo Castle',
    category: '歷史文化',
    description:
      '《二條城》德川家康1603年建造，德川幕府興衰見證歷史。鶯聲地板走過會發出聲響防刺客、二之丸御殿金碧輝煌、庭園四季花卉綻放，世界文化遺產展現武家文化。',
    tags: ['城堡', '歷史', '世界遺產', '庭園'],
    images: ['https://images.unsplash.com/photo-1590559899731-a382839e5549?w=1920&q=85'],
    duration_minutes: 150,
    display_order: 10,
    is_active: true,
  },
]

async function main() {
  console.log('🚀 開始擴充日本三大都市景點...\n')
  console.log('目標：東京 +4、大阪 +6、京都 +5\n')

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
  console.log(`\n🎉 日本三大都市景點擴充完成！`)
  console.log(`🇯🇵 預計新增: 15 個景點`)
  console.log(`📈 日本總景點數將達: ~120 個`)
}

main().catch(console.error)
