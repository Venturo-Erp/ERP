#!/usr/bin/env node
/**
 * 新增東北地區缺少的景點
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
    name: '青森睡魔之家',
    english_name: 'Nebuta Museum Wa Rasse',
    country_id: 'japan',
    city_id: 'aomori',
    category: '博物館',
    description:
      '《青森睡魔之家》位於青森車站旁，是體驗青森睡魔祭精髓的最佳場所。館內常設展示5座巨型睡魔燈籠，高達9公尺的武者人形在燈光照射下栩栩如生，氣勢磅礴。透過影片與互動展示，遊客可了解睡魔祭的歷史、製作工藝、祭典熱鬧場景。二樓設有手作體驗區，可親手繪製迷你睡魔面具。夏季睡魔祭期間，館外廣場舉辦祭典活動，遊客可穿著浴衣參與「跳人」(Haneto) 舞蹈，感受東北夏日祭典的狂熱氛圍。',
    tags: ['博物館', '文化', '祭典', '親子'],
  },
  {
    name: '山寺',
    english_name: 'Yamadera (Risshakuji Temple)',
    country_id: 'japan',
    city_id: 'yamagata',
    category: '寺廟',
    description:
      '《山寺》正式名稱為立石寺，創建於860年，是日本東北地區最具靈性的山岳寺院。從山門到奧之院需攀登1015級石階，沿途穿越蒼鬱杉林、經過奇岩怪石、古老堂宇，每一步都是修行。登頂後，五大堂展望台視野開闊，山形盆地、最上川、遠山層疊盡收眼底，秋季紅葉如火，冬季雪景幽靜。松尾芭蕉曾在此留下俳句「閑さや 岩にしみ入る 蝉の声」(寂靜深處，蟬聲滲入岩石)，道出山寺的禪意與幽靜。',
    tags: ['寺廟', '登山', '紅葉', '歷史'],
  },
  {
    name: '銀山溫泉',
    english_name: 'Ginzan Onsen',
    country_id: 'japan',
    city_id: 'yamagata',
    category: '溫泉',
    description:
      '《銀山溫泉》是大正浪漫風情的溫泉街，木造三、四層樓旅館沿銀山川兩岸排列，黃昏點燈後，煤氣燈映照在雪白溪水與積雪屋簷上，彷彿穿越時空回到百年前。這裡曾是江戶時代銀礦開採地，溫泉街保留當時建築樣式，能登屋旅館的螺旋階梯、古山閣的紅色橋樑都是經典拍攝點。冬季雪景最為夢幻，是動畫《神隱少女》油屋的靈感來源之一。溫泉街僅500公尺,適合漫步、泡足湯、品嚐溫泉饅頭，感受懷舊靜謐的氛圍。',
    tags: ['溫泉', '老街', '雪景', '浪漫'],
  },
]

async function addAttractions() {
  console.log('🚀 開始新增東北景點...\n')

  let success = 0
  let failed = 0

  for (const attraction of newAttractions) {
    const { data, error } = await supabase.from('attractions').insert([attraction]).select()

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
