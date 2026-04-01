#!/usr/bin/env node
/**
 * 新增仙台、日光、藏王缺少的景點
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const newAttractions = [
  {
    name: '五大堂',
    english_name: 'Godaido',
    country_id: 'japan',
    city_id: 'sendai',
    category: '寺廟',
    description: '《五大堂》矗立於松島海岸的小島上，透過紅色小橋「透橋」與陸地相連，橋面鏤空，低頭可見腳下海水流動。這座小巧的佛堂建於1604年，供奉五大明王，屋頂的十二生肖雕刻是伊達政宗時代的傑作。站在堂前平台，松島灣260餘座島嶼盡收眼底，晨霧中的景致尤為夢幻，是攝影愛好者捕捉日出的絕佳位置。',
    tags: ['寺廟', '歷史', '海景', '攝影']
  },
  {
    name: '瑞巖寺',
    english_name: 'Zuiganji Temple',
    country_id: 'japan',
    city_id: 'sendai',
    category: '寺廟',
    description: '《瑞巖寺》是伊達家族的菩提寺，創建於828年，現存建築由伊達政宗於1609年重建，融合禪宗與桃山文化的華麗。入口杉木參道兩側岩壁鑿有百餘座佛龕，是修行僧侶的遺跡。本堂內部的障壁畫、金碧輝煌的欄間雕刻，展現戰國大名的權勢與美學。寺內寶物館藏有伊達家族文物，春天的枝垂櫻與秋日紅葉為古寺增添季節風情。',
    tags: ['寺廟', '歷史', '文化', '國寶']
  },
  {
    name: '松島海岸',
    english_name: 'Matsushima Kaigan',
    country_id: 'japan',
    city_id: 'sendai',
    category: '自然',
    description: '《松島海岸》是日本三景之一，260餘座大小島嶼散落於平靜海灣，松樹覆蓋的島影層疊，晨昏光影變幻無窮。海岸步道適合悠閒漫步，遠眺福浦島、仁王島等名勝，或搭乘遊船穿梭島間，近距離欣賞海蝕洞與奇岩。沿岸餐廳供應現烤牡蠣、烤魚，邊品嚐海鮮邊欣賞海景，是松島最愜意的享受。夕陽西沉時，海面染成金紅，島影如墨，詩意十足。',
    tags: ['自然', '海岸', '日本三景', '散步']
  },
  {
    name: '藏王狐狸村',
    english_name: 'Zao Fox Village',
    country_id: 'japan',
    city_id: 'shiroishi',
    category: '動物園',
    description: '《藏王狐狸村》位於宮城縣山區，是全球唯一可近距離接觸野生狐狸的設施。園內放養百餘隻狐狸，包括赤狐、銀狐、北極狐等六種品種，遊客可自由走入活動區，觀察狐狸在林間嬉戲、打盹、翻滾的自然姿態。冬季雪地中毛茸茸的狐狸格外可愛，是攝影愛好者的夢幻題材。村內禁止追趕或強行觸摸，尊重動物習性，但可購買飼料餵食，與狐狸建立短暫的信任互動。',
    tags: ['動物園', '狐狸', '自然', '親子']
  },
  {
    name: '藏王纜車',
    english_name: 'Zao Ropeway',
    country_id: 'japan',
    city_id: 'yamagata',
    category: '纜車',
    description: '《藏王纜車》分為山麓線與山頂線，全程約17分鐘，將遊客送上海拔1661公尺的地藏山頂。冬季是賞樹冰（雪怪）的最佳方式,纜車緩緩爬升，窗外針葉林逐漸被厚雪覆蓋，形成超現實的冰雪雕塑群,壯觀震撼。春夏則可俯瞰綠意盎然的山谷與火山湖「御釜」的翡翠色澤。山頂設有展望台與餐廳,天氣晴朗時,月山、鳥海山、甚至太平洋海岸線都清晰可見,是東北地區最具代表性的空中纜車體驗。',
    tags: ['纜車', '樹冰', '觀景', '滑雪']
  }
]

async function addAttractions() {
  console.log('🚀 開始新增景點...\n')
  
  let success = 0
  let failed = 0
  
  for (const attraction of newAttractions) {
    const { data, error } = await supabase
      .from('attractions')
      .insert([attraction])
      .select()
    
    if (error) {
      console.log(`❌ ${attraction.name}: ${error.message}`)
      failed++
    } else {
      console.log(`✅ ${attraction.name} (${attraction.english_name})`)
      success++
    }
  }
  
  console.log(`\n✅ 完成！成功 ${success} 個，失敗 ${failed} 個`)
}

addAttractions().catch(console.error)
