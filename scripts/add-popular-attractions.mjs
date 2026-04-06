#!/usr/bin/env node

/**
 * 新增熱門城市景點資料
 * 文案規格：標題 8-12字，內文 60-80字
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

const attractions = [
  // ==================== 東京 ====================
  {
    id: randomUUID(),
    city_id: 'tokyo',
    country_id: 'japan',
    name: '《淺草寺》- 東京最古老寺廟',
    name_en: 'Senso-ji Temple',
    category: '歷史文化',
    description:
      '建於西元628年的《淺草寺》是東京最古老的寺廟。雷門巨大紅燈籠與仲見世通商店街是必訪地標，香火鼎盛的觀音堂祈福靈驗，充滿濃厚江戶風情。',
    tags: ['寺廟', '歷史', '必遊', '文化'],
    images: [
      'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1920&q=85',
      'https://images.unsplash.com/photo-1590556409324-aa1d1a4e1c29?w=1920&q=85',
    ],
    duration_minutes: 90,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'tokyo',
    country_id: 'japan',
    name: '《東京晴空塔》- 世界第二高塔',
    name_en: 'Tokyo Skytree',
    category: '體驗活動',
    description:
      '高達634公尺的《東京晴空塔》是世界第二高塔。展望台可360度俯瞰東京全景，天氣好時甚至能看見富士山。夜晚點燈後更是浪漫夢幻的約會勝地。',
    tags: ['觀景', '地標', '夜景', '拍照'],
    images: ['https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 2,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'tokyo',
    country_id: 'japan',
    name: '《明治神宮》- 都市中的靜謐森林',
    name_en: 'Meiji Shrine',
    category: '歷史文化',
    description:
      '位於原宿的《明治神宮》供奉明治天皇，被70萬平方公尺森林環繞。巨大鳥居、莊嚴本殿與寧靜氛圍讓人忘卻都市喧囂，是東京最受歡迎的神社。',
    tags: ['神社', '自然', '寧靜', '文化'],
    images: ['https://images.unsplash.com/photo-1590556409324-aa1d1a4e1c29?w=1920&q=85'],
    duration_minutes: 60,
    display_order: 3,
    is_active: true,
  },

  // ==================== 大阪 ====================
  {
    id: randomUUID(),
    city_id: 'osaka',
    country_id: 'japan',
    name: '《大阪城》- 豐臣秀吉的天下名城',
    name_en: 'Osaka Castle',
    category: '歷史文化',
    description:
      '由豐臣秀吉於1583年建造的《大阪城》是日本三大名城之一。金碧輝煌的天守閣矗立於石垣之上，春季櫻花滿開時更是絕美。內部博物館展示豐富歷史文物。',
    tags: ['城堡', '歷史', '櫻花', '必遊'],
    images: ['https://images.unsplash.com/photo-1590559899731-a382839e5549?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'osaka',
    country_id: 'japan',
    name: '《道頓堀》- 大阪美食天堂',
    name_en: 'Dotonbori',
    category: '體驗活動',
    description:
      '《道頓堀》是大阪最繁華的美食街，巨大固力果跑跑人看板與螃蟹道樂招牌超吸睛。章魚燒、大阪燒、串炸等在地美食雲集，霓虹燈夜景充滿活力。',
    tags: ['美食', '夜景', '購物', '熱鬧'],
    images: ['https://images.unsplash.com/photo-1589952283406-b53f82c008b8?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 2,
    is_active: true,
  },

  // ==================== 京都 ====================
  {
    id: randomUUID(),
    city_id: 'kyoto',
    country_id: 'japan',
    name: '《伏見稻荷大社》- 千本鳥居奇景',
    name_en: 'Fushimi Inari Shrine',
    category: '歷史文化',
    description:
      '《伏見稻荷大社》以綿延山頭的千本朱紅鳥居聞名全球。穿梭在數千座鳥居形成的隧道中，陽光灑落呈現夢幻光影，是京都最具代表性的神社景觀。',
    tags: ['神社', '鳥居', '必遊', '拍照'],
    images: ['https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'kyoto',
    country_id: 'japan',
    name: '《清水寺》- 懸空舞台奇觀',
    name_en: 'Kiyomizu-dera',
    category: '歷史文化',
    description:
      '建於778年的《清水寺》以懸空木造舞台聞名，完全不用一根釘子建造。從舞台遠眺京都市景與四季變化超壯觀，音羽瀑布求學業、戀愛、健康都靈驗。',
    tags: ['寺廟', '世界遺產', '櫻花', '楓葉'],
    images: ['https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1920&q=85'],
    duration_minutes: 90,
    display_order: 2,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'kyoto',
    country_id: 'japan',
    name: '《金閣寺》- 金碧輝煌的禪寺',
    name_en: 'Kinkaku-ji',
    category: '歷史文化',
    description:
      '《金閣寺》外牆貼滿金箔，在陽光照耀下閃耀奪目，倒映在鏡湖池上如夢似幻。這座建於1397年的禪寺是京都最具代表性的世界文化遺產。',
    tags: ['寺廟', '世界遺產', '必遊', '建築'],
    images: ['https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1920&q=85'],
    duration_minutes: 60,
    display_order: 3,
    is_active: true,
  },

  // ==================== 首爾 ====================
  {
    id: randomUUID(),
    city_id: 'seoul',
    country_id: 'korea',
    name: '《景福宮》- 朝鮮王朝第一王宮',
    name_en: 'Gyeongbokgung Palace',
    category: '歷史文化',
    description:
      '建於1395年的《景福宮》是朝鮮王朝規模最大的宮殿。勤政殿的威嚴建築、慶會樓的優雅樓閣，加上守門將交接儀式，完整呈現韓國皇室文化。',
    tags: ['宮殿', '歷史', '必遊', '韓服'],
    images: ['https://images.unsplash.com/photo-1583474372481-48b0aed9295e?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'seoul',
    country_id: 'korea',
    name: '《明洞》- 首爾購物天堂',
    name_en: 'Myeongdong',
    category: '體驗活動',
    description:
      '《明洞》是首爾最繁華的購物街，韓國美妝品牌、服飾店與路邊小吃攤林立。炸雞、辣炒年糕、韓式煎餅等街頭美食超美味，晚上霓虹燈招牌超好拍。',
    tags: ['購物', '美食', '美妝', '熱鬧'],
    images: ['https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 2,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'seoul',
    country_id: 'korea',
    name: '《南山首爾塔》- 首爾地標',
    name_en: 'N Seoul Tower',
    category: '體驗活動',
    description:
      '矗立於南山頂的《首爾塔》高236公尺，是首爾最浪漫的地標。展望台360度俯瞰首爾夜景，愛情鎖牆見證無數情侶誓言，纜車上山過程風景優美。',
    tags: ['觀景', '夜景', '浪漫', '地標'],
    images: ['https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=1920&q=85'],
    duration_minutes: 90,
    display_order: 3,
    is_active: true,
  },

  // ==================== 曼谷 ====================
  {
    id: randomUUID(),
    city_id: 'bangkok',
    country_id: 'thailand',
    name: '《大皇宮》- 泰國最神聖宮殿',
    name_en: 'Grand Palace',
    category: '歷史文化',
    description:
      '建於1782年的《大皇宮》是曼谷最輝煌的建築群。金碧輝煌的尖塔、精緻壁畫與玉佛寺的翡翠佛像，展現泰國皇室威嚴與佛教藝術精髓，是必訪聖地。',
    tags: ['宮殿', '寺廟', '必遊', '文化'],
    images: ['https://images.unsplash.com/photo-1563492065213-4c4bb194eefc?w=1920&q=85'],
    duration_minutes: 150,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'bangkok',
    country_id: 'thailand',
    name: '《臥佛寺》- 46公尺金色臥佛',
    name_en: 'Wat Pho',
    category: '歷史文化',
    description:
      '《臥佛寺》供奉長46公尺、高15公尺的巨大金色臥佛，腳底鑲有108格珍珠母貝。這裡也是泰式按摩發源地，參觀後來場正宗泰式按摩超放鬆。',
    tags: ['寺廟', '佛像', '按摩', '文化'],
    images: ['https://images.unsplash.com/photo-1563492065213-4c4bb194eefc?w=1920&q=85'],
    duration_minutes: 90,
    display_order: 2,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'bangkok',
    country_id: 'thailand',
    name: '《水上市場》- 傳統泰式市集',
    name_en: 'Floating Market',
    category: '體驗活動',
    description:
      '《丹能莎朵水上市場》保留傳統泰式生活樣貌，小船載著新鮮水果、小吃與手工藝品在運河穿梭。泰式炒麵、芒果糯米飯現做現賣，體驗獨特水上文化。',
    tags: ['市集', '文化', '美食', '體驗'],
    images: ['https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 3,
    is_active: true,
  },

  // ==================== 清邁 ====================
  {
    id: randomUUID(),
    city_id: 'chiang-mai',
    country_id: 'thailand',
    name: '《素帖寺》- 雙龍寺金光閃閃',
    name_en: 'Doi Suthep Temple',
    category: '歷史文化',
    description:
      '位於素帖山頂的《素帖寺》以306階龍形階梯聞名，金色佛塔在陽光下閃耀奪目。寺廟可俯瞰清邁市區全景，是清邁最神聖的佛教聖地，祈福超靈驗。',
    tags: ['寺廟', '觀景', '必遊', '文化'],
    images: ['https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'chiang-mai',
    country_id: 'thailand',
    name: '《大象保育園》- 與大象親密互動',
    name_en: 'Elephant Sanctuary',
    category: '體驗活動',
    description:
      '清邁的《大象保育園》提供不騎乘大象的友善體驗。可以餵食、幫大象洗澡，近距離觀察這些溫馴巨獸的日常生活，支持保育同時創造難忘回憶。',
    tags: ['動物', '生態', '體驗', '保育'],
    images: ['https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=1920&q=85'],
    duration_minutes: 240,
    display_order: 2,
    is_active: true,
  },

  // ==================== 河內 ====================
  {
    id: randomUUID(),
    city_id: 'hanoi',
    country_id: 'vietnam',
    name: '《還劍湖》- 河內心臟綠洲',
    name_en: 'Hoan Kiem Lake',
    category: '自然景觀',
    description:
      '《還劍湖》是河內市中心的寧靜綠洲，傳說越南國王還神劍於此而得名。湖中央的龜塔與紅色的木棧橋是經典地標，清晨有太極拳、晚上有街頭藝人超熱鬧。',
    tags: ['湖泊', '公園', '休閒', '地標'],
    images: ['https://images.unsplash.com/photo-1509030458710-f24f3682df0d?w=1920&q=85'],
    duration_minutes: 60,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'hanoi',
    country_id: 'vietnam',
    name: '《36行街》- 千年古街巷弄',
    name_en: 'Old Quarter',
    category: '體驗活動',
    description:
      '《36行街》保留千年歷史的商業街區，每條街專賣特定商品。摩托車穿梭巷弄、路邊攤美食飄香、手工藝品琳瑯滿目，充滿濃厚越南生活氣息。',
    tags: ['老街', '購物', '美食', '文化'],
    images: ['https://images.unsplash.com/photo-1509030458710-f24f3682df0d?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 2,
    is_active: true,
  },

  // ==================== 胡志明市 ====================
  {
    id: randomUUID(),
    city_id: 'ho-chi-minh',
    country_id: 'vietnam',
    name: '《紅教堂》- 法式浪漫地標',
    name_en: 'Notre-Dame Cathedral',
    category: '歷史文化',
    description:
      '建於1880年的《西貢聖母聖殿主教座堂》又稱紅教堂，全部紅磚從法國進口，哥德式尖塔與玫瑰花窗超優雅。廣場前的聖母像是拍照熱點。',
    tags: ['教堂', '建築', '地標', '拍照'],
    images: ['https://images.unsplash.com/photo-1565426873118-a17ed65d74b9?w=1920&q=85'],
    duration_minutes: 30,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'ho-chi-minh',
    country_id: 'vietnam',
    name: '《中央郵局》- 法式建築瑰寶',
    name_en: 'Central Post Office',
    category: '歷史文化',
    description:
      '由艾菲爾鐵塔設計師設計的《中央郵局》建於1891年，挑高拱形天花板與馬賽克地磚超華麗。內部仍營運郵政業務，寄張明信片給自己超有紀念價值。',
    tags: ['建築', '歷史', '拍照', '文化'],
    images: ['https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1920&q=85'],
    duration_minutes: 30,
    display_order: 2,
    is_active: true,
  },
]

async function main() {
  console.log('🚀 開始新增熱門城市景點...\n')

  let successCount = 0
  let errorCount = 0

  for (const attraction of attractions) {
    try {
      const { error } = await supabase.from('attractions').insert(attraction)

      if (error) throw error

      console.log(`✅ ${attraction.name}`)
      successCount++
    } catch (error) {
      console.error(`❌ ${attraction.name}: ${error.message}`)
      errorCount++
    }
  }

  console.log(`\n📊 完成統計:`)
  console.log(`✅ 成功: ${successCount} 個`)
  console.log(`❌ 失敗: ${errorCount} 個`)
  console.log(`\n🎉 景點資料新增完成！`)
}

main().catch(console.error)
