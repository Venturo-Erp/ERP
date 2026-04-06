#!/usr/bin/env node
/**
 * 韓國城市景點批次新增
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
  // 仁川 (incheon)
  {
    id: randomUUID(),
    city_id: 'incheon',
    country_id: 'korea',
    name: '《仁川中華街》- 韓國最大唐人街',
    name_en: 'Incheon Chinatown',
    category: '歷史文化',
    description:
      '1883年開港後形成的《仁川中華街》是韓國最大中國城，紅色牌樓、中式建築林立。炸醬麵發源地，充滿懷舊風情，周圍童話村、松月洞童話壁畫街充滿藝術氣息。',
    tags: ['文化', '美食', '炸醬麵', '拍照'],
    images: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'incheon',
    country_id: 'korea',
    name: '《月尾島》- 海濱遊樂天堂',
    name_en: 'Wolmido Island',
    category: '體驗活動',
    description:
      '《月尾島》結合遊樂園、海鮮市場、文化街的海濱度假區。搭乘Disco Pang Pang等刺激遊樂設施，沿海步道欣賞西海日落，品嚐新鮮海鮮，是仁川最受歡迎的休閒景點。',
    tags: ['遊樂園', '海鮮', '日落', '娛樂'],
    images: ['https://images.unsplash.com/photo-1537956965359-7573183d1f57?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 2,
    is_active: true,
  },

  // 大邱 (daegu)
  {
    id: randomUUID(),
    city_id: 'daegu',
    country_id: 'korea',
    name: '《八公山纜車》- 俯瞰大邱全景',
    name_en: 'Palgongsan Cable Car',
    category: '自然景觀',
    description:
      '搭乘《八公山纜車》登上海拔820公尺山頂，俯瞰大邱市區與洛東江蜿蜒。春櫻秋楓季節最美，山頂有桐華寺等古寺，還能挑戰登山步道，感受大邱名山魅力。',
    tags: ['纜車', '登山', '景觀', '寺廟'],
    images: ['https://images.unsplash.com/photo-1551244072-5d12893278ab?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'daegu',
    country_id: 'korea',
    name: '《西門市場》- 傳統夜市美食',
    name_en: 'Seomun Market',
    category: '體驗活動',
    description:
      '擁有500年歷史的《西門市場》是大邱最大傳統市場，4000多個攤位販售服飾、布料、美食。夜市時段炸雞、辣炒年糕、扁餃子等小吃香氣四溢，體驗道地大邱庶民文化。',
    tags: ['市場', '美食', '傳統', '夜市'],
    images: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&q=85'],
    duration_minutes: 150,
    display_order: 2,
    is_active: true,
  },

  // 慶州 (gyeongju)
  {
    id: randomUUID(),
    city_id: 'gyeongju',
    country_id: 'korea',
    name: '《佛國寺》- 新羅佛教精華',
    name_en: 'Bulguksa Temple',
    category: '歷史文化',
    description:
      '建於751年的《佛國寺》是新羅佛教藝術巔峰之作，UNESCO世界遺產。多寶塔、釋迦塔等國寶展現精湛石工技術，青雲橋、白雲橋象徵通往極樂世界，秋季楓紅時分最美。',
    tags: ['UNESCO', '寺廟', '必遊', '新羅'],
    images: ['https://images.unsplash.com/photo-1528181304800-259b08848526?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'gyeongju',
    country_id: 'korea',
    name: '《大陵苑》- 新羅王陵公園',
    name_en: 'Daereungwon Tomb Complex',
    category: '歷史文化',
    description:
      '《大陵苑》保存23座新羅王室古墳，草坪覆蓋的圓形墳丘如小山丘散布公園。可入內參觀天馬塚，出土金冠、金腰帶等珍貴文物，夜晚點燈後古墳群呈現夢幻氛圍。',
    tags: ['古墳', '歷史', '新羅', '拍照'],
    images: ['https://images.unsplash.com/photo-1548013146-72479768bada?w=1920&q=85'],
    duration_minutes: 90,
    display_order: 2,
    is_active: true,
  },

  // 江陵 (gangneung)
  {
    id: randomUUID(),
    city_id: 'gangneung',
    country_id: 'korea',
    name: '《鏡浦海水浴場》- 東海岸最美海灘',
    name_en: 'Gyeongpo Beach',
    category: '自然景觀',
    description:
      '《鏡浦海水浴場》擁有1.8公里細白沙灘與清澈海水，是韓國東海岸最受歡迎海灘。後方鏡浦湖可划船賞櫻，周圍松林茂密，夏季海水浴、冬季觀日出都是絕佳選擇。',
    tags: ['海灘', '日出', '游泳', '櫻花'],
    images: ['https://images.unsplash.com/photo-1537956965359-7573183d1f57?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'gangneung',
    country_id: 'korea',
    name: '《注文津海邊》- 韓劇拍攝聖地',
    name_en: 'Jumunjin Beach',
    category: '體驗活動',
    description:
      '《注文津海邊》因韓劇《鬼怪》取景爆紅，長長的防波堤延伸入海，是拍照打卡聖地。早晨魚市場熱鬧非凡，新鮮海產現買現吃，附近有著名的BTS巴士站拍照點。',
    tags: ['海邊', '韓劇', '拍照', '海鮮'],
    images: ['https://images.unsplash.com/photo-1537956965359-7573183d1f57?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 2,
    is_active: true,
  },

  // 束草 (sokcho)
  {
    id: randomUUID(),
    city_id: 'sokcho',
    country_id: 'korea',
    name: '《雪嶽山國家公園》- 韓國第一名山',
    name_en: 'Seoraksan National Park',
    category: '自然景觀',
    description:
      '《雪嶽山》是韓國最美名山，UNESCO生物圈保護區。搭纜車登權金城俯瞰東海，健行至飛龍瀑布、蔚山岩，秋季楓紅時節遊客如織，冬季雪景銀裝素裹宛如仙境。',
    tags: ['登山', 'UNESCO', '必遊', '楓葉'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 300,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'sokcho',
    country_id: 'korea',
    name: '《阿爸村》- 北韓文化體驗',
    name_en: 'Abai Village',
    category: '歷史文化',
    description:
      '《阿爸村》是韓戰後北韓難民聚居地，保留濃厚北韓文化。搭乘手拉繩索渡輪跨越青湖川，品嚐道地鮑魚烏冬麵、阿爸奶奶炸餃子，《愛的迫降》取景地讓人感受時代變遷。',
    tags: ['文化', '美食', '韓劇', '歷史'],
    images: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&q=85'],
    duration_minutes: 90,
    display_order: 2,
    is_active: true,
  },

  // 水原 (suwon)
  {
    id: randomUUID(),
    city_id: 'suwon',
    country_id: 'korea',
    name: '《水原華城》- UNESCO世界遺產',
    name_en: 'Hwaseong Fortress',
    category: '歷史文化',
    description:
      '朝鮮正祖於1796年建造的《水原華城》全長5.7公里，融合東西方築城技術。UNESCO世界遺產，四大城門、角樓、炮台保存完整，登上城牆俯瞰水原市景，體驗朝鮮時代軍事文化。',
    tags: ['UNESCO', '城牆', '必遊', '歷史'],
    images: ['https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'suwon',
    country_id: 'korea',
    name: '《行宮洞壁畫村》- 彩繪藝術村',
    name_en: 'Haenggung-dong Mural Village',
    category: '體驗活動',
    description:
      '位於華城腳下的《行宮洞壁畫村》將老舊社區變成藝術畫廊，繽紛壁畫、裝置藝術遍布巷弄。登上階梯能眺望水原市景與華城，充滿文青氣息，是IG打卡熱點。',
    tags: ['壁畫', '藝術', '拍照', '文青'],
    images: ['https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1920&q=85'],
    duration_minutes: 90,
    display_order: 2,
    is_active: true,
  },
]

async function main() {
  console.log('🚀 開始新增韓國城市景點...\n')

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
  console.log(`\n🎉 韓國景點資料新增完成！`)
}

main().catch(console.error)
