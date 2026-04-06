#!/usr/bin/env node
/**
 * 韓國景點擴充
 * 首爾 6→10、釜山 2→8、濟州島 2→8、慶州 2→6
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
  .in('id', ['seoul', 'busan', 'jeju', 'gyeongju'])

const regionMap = {}
cities.forEach(city => {
  regionMap[city.id] = city.region_id
})

const attractions = [
  // ========== 首爾擴充 (6→10個) ==========
  {
    id: randomUUID(),
    city_id: 'seoul',
    country_id: 'korea',
    region_id: regionMap['seoul'],
    name: '《梨花壁畫村》- 藝術階梯',
    name_en: 'Ihwa Mural Village',
    category: '自然景觀',
    description:
      '《梨花壁畫村》70多幅壁畫點綴山坡巷弄，錦鯉階梯、天使翅膀、花朵牆成IG打卡熱點。藝術家進駐計劃活化老社區，穿梭蜿蜒小巷驚喜連連，眺望首爾全景。',
    tags: ['壁畫', '藝術', '打卡', '老街'],
    images: ['https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1920&q=85'],
    duration_minutes: 150,
    display_order: 7,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'seoul',
    country_id: 'korea',
    region_id: regionMap['seoul'],
    name: '《弘大》- 青春文化區',
    name_en: 'Hongdae',
    category: '體驗活動',
    description:
      '《弘大》弘益大學周邊年輕人天堂，live音樂、街頭表演、indie品牌雲集。夜店酒吧凌晨爆滿、咖啡廳個性十足、二手市集週末擺攤，感受首爾青春活力脈動。',
    tags: ['音樂', '夜生活', '年輕', '文青'],
    images: ['https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=1920&q=85'],
    duration_minutes: 240,
    display_order: 8,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'seoul',
    country_id: 'korea',
    region_id: regionMap['seoul'],
    name: '《汝矣島公園》- 櫻花大道',
    name_en: 'Yeouido Park',
    category: '自然景觀',
    description:
      '《汝矣島公園》漢江畔1,600棵櫻花樹春季盛開形成粉色隧道，櫻花季節夜間點燈浪漫破表。國會議事堂、證券交易所旁，上班族午休野餐，單車步道環繞全島。',
    tags: ['公園', '櫻花', '漢江', '浪漫'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 9,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'seoul',
    country_id: 'korea',
    region_id: regionMap['seoul'],
    name: '《COEX》- 地下商城',
    name_en: 'COEX Mall',
    category: '體驗活動',
    description:
      '《COEX》亞洲最大地下商城，星空圖書館挑高書牆震撼視覺、水族館海洋世界、免稅店品牌齊全。連接江南站、三成站，購物娛樂一次滿足，COEX Artium展覽不斷。',
    tags: ['購物', '圖書館', '水族館', '商城'],
    images: ['https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1920&q=85'],
    duration_minutes: 300,
    display_order: 10,
    is_active: true,
  },

  // ========== 釜山擴充 (2→8個) ==========
  {
    id: randomUUID(),
    city_id: 'busan',
    country_id: 'korea',
    region_id: regionMap['busan'],
    name: '《海雲台海灘》- 釜山海濱',
    name_en: 'Haeundae Beach',
    category: '自然景觀',
    description:
      '《海雲台海灘》韓國最有名海灘，1.5公里白沙海岸夏季遊客百萬人次。冬柏島步道、APEC會議中心、海岸列車眺望絕景，週邊五星飯店、賭場、水族館應有盡有。',
    tags: ['海灘', '度假', '必遊', '夏季'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 240,
    display_order: 3,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'busan',
    country_id: 'korea',
    region_id: regionMap['busan'],
    name: '《甘川文化村》- 彩色山城',
    name_en: 'Gamcheon Culture Village',
    category: '歷史文化',
    description:
      '《甘川文化村》七彩房屋層疊山坡如韓國聖托里尼，藝術家壁畫、小王子雕像成打卡地標。戰爭難民聚落活化改造，迷宮般小巷探索驚喜，俯瞰釜山港絕美視角。',
    tags: ['彩色村', '藝術', '打卡', '必遊'],
    images: ['https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 4,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'busan',
    country_id: 'korea',
    region_id: regionMap['busan'],
    name: '《札嘎其市場》- 海鮮天堂',
    name_en: 'Jagalchi Market',
    category: '體驗活動',
    description:
      '《札嘎其市場》韓國最大海鮮市場，活章魚、帝王蟹、海螺現撈現煮。大嬸吆喝聲此起彼落、一樓選海鮮二樓加工品嚐，釜山港漁船卸貨海鮮新鮮度滿分，庶民美食體驗。',
    tags: ['市場', '海鮮', '美食', '必吃'],
    images: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&q=85'],
    duration_minutes: 150,
    display_order: 5,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'busan',
    country_id: 'korea',
    region_id: regionMap['busan'],
    name: '《太宗台》- 海岸絕景',
    name_en: 'Taejongdae',
    category: '自然景觀',
    description:
      '《太宗台》影島南端懸崖絕壁，海蝕作用形成奇岩怪石，燈塔眺望對馬島。遊園小火車環繞步道、觀景台海浪拍打震撼、神仙岩傳說淒美，釜山必訪自然景觀。',
    tags: ['海岸', '懸崖', '燈塔', '自然'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 210,
    display_order: 6,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'busan',
    country_id: 'korea',
    region_id: regionMap['busan'],
    name: '《廣安大橋》- 鑽石橋',
    name_en: 'Gwangan Bridge',
    category: '自然景觀',
    description:
      '《廣安大橋》7.4公里跨海大橋連接海雲台與水營，夜間LED燈光秀璀璨奪目。廣安里海灘最佳觀賞點、釜山國際煙火節主舞台，白天海天一色、夜晚浪漫破表。',
    tags: ['大橋', '夜景', '燈光秀', '浪漫'],
    images: ['https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 7,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'busan',
    country_id: 'korea',
    region_id: regionMap['busan'],
    name: '《海東龍宮寺》- 海邊寺廟',
    name_en: 'Haedong Yonggungsa',
    category: '歷史文化',
    description:
      '《海東龍宮寺》建於1376年韓國罕見海岸寺廟，海浪拍打岩石、晨鐘暮鼓莊嚴肅穆。日出祈福人潮湧現、108階石階考驗體力、大雄寶殿背山面海，心願成真傳說靈驗。',
    tags: ['寺廟', '海岸', '祈福', '日出'],
    images: ['https://images.unsplash.com/photo-1528164344705-47542687000d?w=1920&q=85'],
    duration_minutes: 150,
    display_order: 8,
    is_active: true,
  },

  // ========== 濟州島擴充 (2→8個) ==========
  {
    id: randomUUID(),
    city_id: 'jeju',
    country_id: 'korea',
    region_id: regionMap['jeju'],
    name: '《漢拏山》- 韓國第一高峰',
    name_en: 'Hallasan',
    category: '自然景觀',
    description:
      '《漢拏山》海拔1,950公尺韓國最高峰，火山口白鹿潭幽靜神秘、登山步道四季景色各異。春季杜鵑花海、秋季紅葉滿山、冬季雪白銀裝，世界自然遺產濟州島地標。',
    tags: ['登山', '火山', '世界遺產', '必遊'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 420,
    display_order: 3,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'jeju',
    country_id: 'korea',
    region_id: regionMap['jeju'],
    name: '《城山日出峰》- 火山錐',
    name_en: 'Seongsan Ilchulbong',
    category: '自然景觀',
    description:
      '《城山日出峰》5,000年前海底火山爆發形成，巨大火山口直徑600公尺。攀登30分鐘登頂俯瞰太平洋、日出景觀絕美、UNESCO世界遺產，濟州島必訪景點。',
    tags: ['火山', '日出', '世界遺產', '必遊'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 4,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'jeju',
    country_id: 'korea',
    region_id: regionMap['jeju'],
    name: '《涯月海岸公路》- 海邊兜風',
    name_en: 'Aewol Coastal Road',
    category: '自然景觀',
    description:
      '《涯月海岸公路》濟州西北部最美海岸線，蔚藍大海、風車、咖啡廳林立。租車兜風吹海風、涯月咖啡街文青集散地、日落彩霞映照海面，韓劇拍攝熱門取景地。',
    tags: ['海岸', '兜風', '咖啡廳', '日落'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 240,
    display_order: 5,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'jeju',
    country_id: 'korea',
    region_id: regionMap['jeju'],
    name: '《正房瀑布》- 海岸瀑布',
    name_en: 'Jeongbang Waterfall',
    category: '自然景觀',
    description:
      '《正房瀑布》亞洲唯一直接落入海中的瀑布，高23公尺水流傾瀉如銀簾。觀景台最佳拍攝角度、岩壁刻字徐福到此一遊傳說、海岸步道吹海風，濟州島獨特景觀。',
    tags: ['瀑布', '海岸', '獨特', '自然'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 6,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'jeju',
    country_id: 'korea',
    region_id: regionMap['jeju'],
    name: '《萬丈窟》- 熔岩洞窟',
    name_en: 'Manjanggul Cave',
    category: '自然景觀',
    description:
      '《萬丈窟》全長13.4公里世界最長熔岩洞窟之一，開放1公里步道探索奇景。7.6公尺高熔岩石柱世界最大、洞內恆溫11-21度冬暖夏涼，UNESCO世界自然遺產必遊。',
    tags: ['洞窟', '熔岩', '世界遺產', '探險'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 150,
    display_order: 7,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'jeju',
    country_id: 'korea',
    region_id: regionMap['jeju'],
    name: '《牛島》- 離島秘境',
    name_en: 'Udo Island',
    category: '自然景觀',
    description:
      '《牛島》形狀似牛臥海上得名，花生冰淇淋必吃、珊瑚沙灘碧綠海水、單車環島悠閒愜意。西濱白沙海灘透明度高、海女現撈海產、燈塔公園眺望城山日出峰，濟州度假勝地。',
    tags: ['離島', '海灘', '單車', '度假'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 360,
    display_order: 8,
    is_active: true,
  },

  // ========== 慶州擴充 (2→6個) ==========
  {
    id: randomUUID(),
    city_id: 'gyeongju',
    country_id: 'korea',
    region_id: regionMap['gyeongju'],
    name: '《石窟庵》- 千年石窟',
    name_en: 'Seokguram Grotto',
    category: '歷史文化',
    description:
      '《石窟庵》建於751年花崗岩人工石窟，釋迦牟尼佛本尊像雕工精湛無與倫比。聯合國教科文組織世界文化遺產、佛教藝術巔峰之作，山頂眺望日本海，新羅佛教文化精髓。',
    tags: ['石窟', '佛教', '世界遺產', '必遊'],
    images: ['https://images.unsplash.com/photo-1528164344705-47542687000d?w=1920&q=85'],
    duration_minutes: 150,
    display_order: 3,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'gyeongju',
    country_id: 'korea',
    region_id: regionMap['gyeongju'],
    name: '《瞻星台》- 東方天文台',
    name_en: 'Cheomseongdae',
    category: '歷史文化',
    description:
      '《瞻星台》建於632-647年東亞現存最古老天文台，高9.17公尺石塊堆砌精密。362塊石材象徵陰曆天數、觀測窗對準春分秋分日出，新羅科學技術結晶，慶州地標。',
    tags: ['天文台', '古蹟', '科學', '地標'],
    images: ['https://images.unsplash.com/photo-1590559899731-a382839e5549?w=1920&q=85'],
    duration_minutes: 90,
    display_order: 4,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'gyeongju',
    country_id: 'korea',
    region_id: regionMap['gyeongju'],
    name: '《大陵苑》- 皇陵公園',
    name_en: 'Daereungwon',
    category: '歷史文化',
    description:
      '《大陵苑》23座新羅王室古墳群，草坪覆蓋饅頭形墳丘、天馬塚出土金冠華麗、內部復原展示墓室結構。春櫻秋楓環繞古墳美不勝收，夜間點燈浪漫，韓服拍照絕佳背景。',
    tags: ['古墳', '公園', '歷史', '夜景'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 5,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'gyeongju',
    country_id: 'korea',
    region_id: regionMap['gyeongju'],
    name: '《雁鴨池》- 新羅宮殿遺址',
    name_en: 'Anapji Pond',
    category: '歷史文化',
    description:
      '《雁鴨池》674年新羅王宮別宮東宮遺址，人工池塘、樓閣、小島重現新羅盛世。夜間燈光倒映水面如夢似幻、出土文物3萬多件展示博物館，慶州最浪漫夜景勝地。',
    tags: ['宮殿', '夜景', '遺址', '浪漫'],
    images: ['https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=1920&q=85'],
    duration_minutes: 150,
    display_order: 6,
    is_active: true,
  },
]

async function main() {
  console.log('🚀 開始擴充韓國景點...\n')
  console.log('目標：首爾 +4、釜山 +6、濟州島 +6、慶州 +4\n')

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
  console.log(`\n🎉 韓國景點擴充完成！`)
  console.log(`🇰🇷 預計新增: 20 個景點`)
  console.log(`📈 韓國總景點數將達: ~42 個`)
}

main().catch(console.error)
