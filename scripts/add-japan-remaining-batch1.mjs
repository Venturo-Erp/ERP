#!/usr/bin/env node
/**
 * 日本剩餘城市景點 - 批次1
 * 四國、中國、東北、北陸等地區
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
  // ========== 九州地區 ==========
  // 別府 (beppu)
  {
    id: randomUUID(),
    city_id: 'beppu',
    country_id: 'japan',
    name: '《地獄溫泉巡禮》- 七大地獄奇觀',
    name_en: 'Beppu Hells',
    category: '自然景觀',
    description:
      '別府《地獄溫泉》由海地獄、血池地獄、龍捲地獄等七大奇景組成，湧出的溫泉水呈現藍、紅、泥等不同型態。溫度高達98度無法入浴，但壯觀的自然景象震撼人心。',
    tags: ['溫泉', '地獄', '必遊', '奇觀'],
    images: ['https://images.unsplash.com/photo-1551244072-5d12893278ab?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'beppu',
    country_id: 'japan',
    name: '《別府纜車》- 鶴見岳雲海',
    name_en: 'Beppu Ropeway',
    category: '自然景觀',
    description:
      '搭乘《別府纜車》登上海拔1375公尺的鶴見岳，俯瞰別府灣與由布岳。秋季紅葉、冬季霧淞、春季杜鵑花，四季景色各異，天氣晴朗可遠眺四國山脈。',
    tags: ['纜車', '登山', '景觀', '四季'],
    images: ['https://images.unsplash.com/photo-1551244072-5d12893278ab?w=1920&q=85'],
    duration_minutes: 150,
    display_order: 2,
    is_active: true,
  },

  // 由布院 (yufuin)
  {
    id: randomUUID(),
    city_id: 'yufuin',
    country_id: 'japan',
    name: '《金鱗湖》- 晨霧夢幻仙境',
    name_en: 'Kinrinko Lake',
    category: '自然景觀',
    description:
      '《金鱗湖》因魚鱗在夕陽下閃爍金光而得名。清晨溫泉湧出與冷空氣交會，湖面升起夢幻白霧，由布岳倒影其中如詩如畫，是由布院最具代表性的浪漫景點。',
    tags: ['湖泊', '晨霧', '浪漫', '必遊'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 60,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'yufuin',
    country_id: 'japan',
    name: '《湯之坪街道》- 療癒文青小鎮',
    name_en: 'Yunotsubo Kaido',
    category: '體驗活動',
    description:
      '《湯之坪街道》兩旁咖啡廳、雜貨店、美術館林立，充滿歐式鄉村風情。品嚐地雞、布丁、可樂餅等美食，選購手工藝品，漫步田園風光中，享受慢活溫泉小鎮氛圍。',
    tags: ['購物', '美食', '文青', '溫泉'],
    images: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 2,
    is_active: true,
  },

  // 宮崎 (miyazaki)
  {
    id: randomUUID(),
    city_id: 'miyazaki',
    country_id: 'japan',
    name: '《青島神社》- 鬼之洗衣板奇景',
    name_en: 'Aoshima Shrine',
    category: '歷史文化',
    description:
      '位於青島上的《青島神社》以結緣聞名，周圍被「鬼之洗衣板」波浪岩環繞，退潮時規則的岩盤紋路如洗衣板般壯觀。熱帶植物茂密，亞熱帶風情濃厚，是宮崎最美神社。',
    tags: ['神社', '奇岩', '結緣', '海景'],
    images: ['https://images.unsplash.com/photo-1548013146-72479768bada?w=1920&q=85'],
    duration_minutes: 90,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'miyazaki',
    country_id: 'japan',
    name: '《高千穗峽》- V字峽谷瀑布',
    name_en: 'Takachiho Gorge',
    category: '自然景觀',
    description:
      '火山熔岩侵蝕形成的《高千穗峽》V字峽谷深達100公尺，真名井瀑布從17公尺高處落下。划船穿梭峽谷間，仰望斷崖絕壁與瀑布飛泉，感受大自然鬼斧神工之美。',
    tags: ['峽谷', '瀑布', '划船', '必遊'],
    images: ['https://images.unsplash.com/photo-1551244072-5d12893278ab?w=1920&q=85'],
    duration_minutes: 150,
    display_order: 2,
    is_active: true,
  },

  // 鹿兒島 (kagoshima)
  {
    id: randomUUID(),
    city_id: 'kagoshima',
    country_id: 'japan',
    name: '《櫻島》- 活火山奇觀',
    name_en: 'Sakurajima',
    category: '自然景觀',
    description:
      '《櫻島》是世界少數可近距離觀察的活火山，至今仍頻繁噴發火山灰。搭渡輪15分鐘抵達，能泡火山灰足湯、品嚐世界最小蜜柑、參觀熔岩步道，感受火山島生命力。',
    tags: ['火山', '必遊', '渡輪', '奇觀'],
    images: ['https://images.unsplash.com/photo-1551244072-5d12893278ab?w=1920&q=85'],
    duration_minutes: 240,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'kagoshima',
    country_id: 'japan',
    name: '《仙巖園》- 島津家大名庭園',
    name_en: 'Sengan-en',
    category: '歷史文化',
    description:
      '島津家別邸《仙巖園》借景櫻島與錦江灣，是日本代表性大名庭園。1658年建造，融合中日造園技術，竹林、水池、茶室精緻典雅，展現薩摩藩主的品味與權勢。',
    tags: ['庭園', '歷史', '景觀', '大名'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 2,
    is_active: true,
  },

  // ========== 四國地區 ==========
  // 松山 (matsuyama)
  {
    id: randomUUID(),
    city_id: 'matsuyama',
    country_id: 'japan',
    name: '《道後溫泉本館》- 3000年古湯',
    name_en: 'Dogo Onsen Honkan',
    category: '歷史文化',
    description:
      '擁有3000年歷史的《道後溫泉》是日本最古老溫泉，本館建於1894年的三層木造建築是宮崎駿《神隱少女》油屋原型。皇室專用又新殿、夏目漱石泡湯處，充滿歷史風情。',
    tags: ['溫泉', '歷史', '必遊', '建築'],
    images: ['https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'matsuyama',
    country_id: 'japan',
    name: '《松山城》- 現存十二天守',
    name_en: 'Matsuyama Castle',
    category: '歷史文化',
    description:
      '建於1602年的《松山城》是日本現存12座天守之一，海拔132公尺的勝山山頂俯瞰松山市區與瀨戶內海。搭乘纜車或登城道健行，城內保存完整的本丸、二之丸展現戰國築城技術。',
    tags: ['城堡', '天守', '歷史', '景觀'],
    images: ['https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1920&q=85'],
    duration_minutes: 150,
    display_order: 2,
    is_active: true,
  },

  // 高松 (takamatsu)
  {
    id: randomUUID(),
    city_id: 'takamatsu',
    country_id: 'japan',
    name: '《栗林公園》- 米其林三星庭園',
    name_en: 'Ritsurin Garden',
    category: '自然景觀',
    description:
      '歷時100年完成的《栗林公園》被米其林評為三星景點，是日本國家特別名勝中最大的庭園。6座池泉、13座假山，四季花卉變化，借景紫雲山，處處精心設計如畫卷展開。',
    tags: ['庭園', '米其林', '必遊', '四季'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'takamatsu',
    country_id: 'japan',
    name: '《小豆島》- 橄欖之島',
    name_en: 'Shodoshima Island',
    category: '自然景觀',
    description:
      '瀨戶內海的《小豆島》是日本橄欖發源地，地中海風情濃厚。天使之路退潮時出現的沙洲步道、寒霞溪楓葉峽谷、二十四之瞳電影村，充滿浪漫與懷舊氛圍。',
    tags: ['海島', '橄欖', '浪漫', '楓葉'],
    images: ['https://images.unsplash.com/photo-1537956965359-7573183d1f57?w=1920&q=85'],
    duration_minutes: 420,
    display_order: 2,
    is_active: true,
  },

  // 高知 (kochi)
  {
    id: randomUUID(),
    city_id: 'kochi',
    country_id: 'japan',
    name: '《桂濱》- 坂本龍馬眺望太平洋',
    name_en: 'Katsurahama Beach',
    category: '自然景觀',
    description:
      '幕末英雄坂本龍馬銅像矗立的《桂濱》，月形海灘配上松林，太平洋浪濤拍岸氣勢磅礴。龍馬紀念館展示其生平事蹟，每年龍馬誕辰舉辦慶典，是高知精神象徵。',
    tags: ['海灘', '歷史', '龍馬', '景觀'],
    images: ['https://images.unsplash.com/photo-1537956965359-7573183d1f57?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'kochi',
    country_id: 'japan',
    name: '《四萬十川》- 日本最後清流',
    name_en: 'Shimanto River',
    category: '自然景觀',
    description:
      '《四萬十川》全長196公里無水壩，被譽為「日本最後清流」。沈下橋隨水位升降、獨木舟悠遊碧波、河畔騎單車，原始自然風光療癒人心，夏季螢火蟲飛舞如夢似幻。',
    tags: ['河川', '自然', '清流', '獨木舟'],
    images: ['https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1920&q=85'],
    duration_minutes: 240,
    display_order: 2,
    is_active: true,
  },

  // 德島 (tokushima)
  {
    id: randomUUID(),
    city_id: 'tokushima',
    country_id: 'japan',
    name: '《鳴門漩渦》- 世界三大潮流',
    name_en: 'Naruto Whirlpools',
    category: '自然景觀',
    description:
      '《鳴門漩渦》是世界三大潮流之一，漩渦直徑最大可達20公尺。從大鳴門橋渦之道玻璃地板俯視、或搭觀潮船近距離感受，大自然力量震撼無比，春秋大潮時最壯觀。',
    tags: ['漩渦', '奇觀', '必遊', '自然'],
    images: ['https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1920&q=85'],
    duration_minutes: 90,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'tokushima',
    country_id: 'japan',
    name: '《祖谷溪》- 秘境懸崖村落',
    name_en: 'Iya Valley',
    category: '自然景觀',
    description:
      '日本三大秘境之一的《祖谷溪》V字峽谷深達200公尺，藤蔓吊橋橫跨溪谷驚險刺激。山間茅草屋、溫泉旅館保留原始風貌，秋季楓紅滿山如夢境，平家落人傳說增添神秘色彩。',
    tags: ['秘境', '峽谷', '吊橋', '楓葉'],
    images: ['https://images.unsplash.com/photo-1551244072-5d12893278ab?w=1920&q=85'],
    duration_minutes: 300,
    display_order: 2,
    is_active: true,
  },

  // ========== 中國地區 ==========
  // 岡山 (okayama)
  {
    id: randomUUID(),
    city_id: 'okayama',
    country_id: 'japan',
    name: '《後樂園》- 日本三名園',
    name_en: 'Korakuen Garden',
    category: '自然景觀',
    description:
      '與兼六園、偕樂園並稱日本三名園的《後樂園》，1700年完成的池泉迴遊式庭園。廣闊草坪、曲水、茶室、能舞台，借景岡山城天守閣，四季景色變化豐富，秋季楓紅最美。',
    tags: ['庭園', '三名園', '必遊', '四季'],
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'okayama',
    country_id: 'japan',
    name: '《倉敷美觀地區》- 江戶白壁街道',
    name_en: 'Kurashiki Bikan',
    category: '歷史文化',
    description:
      '江戶時代商業重鎮《倉敷美觀地區》保存完整白壁黑瓦倉庫群，柳樹垂掛運河兩岸。大原美術館收藏西洋名畫、工藝品店販售倉敷帆布，穿和服漫步石板路充滿懷舊風情。',
    tags: ['古街', '歷史', '美術館', '拍照'],
    images: ['https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 2,
    is_active: true,
  },

  // 鳥取 (tottori)
  {
    id: randomUUID(),
    city_id: 'tottori',
    country_id: 'japan',
    name: '《鳥取砂丘》- 日本最大沙漠',
    name_en: 'Tottori Sand Dunes',
    category: '自然景觀',
    description:
      '東西16公里、南北2公里的《鳥取砂丘》是日本最大砂丘，風紋、砂簾、砂柱等地形變化萬千。騎駱駝、滑砂板、飛行傘體驗沙漠活動，日落時金黃沙丘與日本海交織絕美。',
    tags: ['砂丘', '奇觀', '必遊', '體驗'],
    images: ['https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920&q=85'],
    duration_minutes: 180,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'tottori',
    country_id: 'japan',
    name: '《砂之美術館》- 世界唯一砂雕博物館',
    name_en: 'Sand Museum',
    category: '體驗活動',
    description:
      '《砂之美術館》每年更換主題展示巨型砂雕作品，由世界頂尖砂雕師創作。精細雕刻的歷史場景、建築、人物栩栩如生，結合燈光效果震撼視覺，是全球唯一室內砂雕博物館。',
    tags: ['藝術', '博物館', '砂雕', '獨特'],
    images: ['https://images.unsplash.com/photo-1551244072-5d12893278ab?w=1920&q=85'],
    duration_minutes: 90,
    display_order: 2,
    is_active: true,
  },

  // 島根 (shimane)
  {
    id: randomUUID(),
    city_id: 'shimane',
    country_id: 'japan',
    name: '《出雲大社》- 結緣聖地',
    name_en: 'Izumo Taisha',
    category: '歷史文化',
    description:
      '日本最古老神社之一的《出雲大社》供奉結緣之神大國主大神，每年農曆10月全日本神明齊聚此地。巨大注連繩重達5噸，參拜方式獨特「二禮四拍手一禮」，是日本最強結緣神社。',
    tags: ['神社', '結緣', '必遊', '歷史'],
    images: ['https://images.unsplash.com/photo-1548013146-72479768bada?w=1920&q=85'],
    duration_minutes: 120,
    display_order: 1,
    is_active: true,
  },
  {
    id: randomUUID(),
    city_id: 'shimane',
    country_id: 'japan',
    name: '《松江城》- 現存國寶天守',
    name_en: 'Matsue Castle',
    category: '歷史文化',
    description:
      '1611年建造的《松江城》是日本僅存5座國寶天守之一，黑色外觀如千鳥展翅又稱「千鳥城」。護城河遊覽船穿梭武家屋敷、小泉八雲舊居，體驗城下町風情，春櫻季節最美。',
    tags: ['城堡', '國寶', '天守', '遊船'],
    images: ['https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1920&q=85'],
    duration_minutes: 150,
    display_order: 2,
    is_active: true,
  },
]

async function main() {
  console.log('🚀 開始新增日本剩餘城市景點（批次1）...\n')

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
  console.log(`\n🎉 日本景點資料新增完成（批次1）！`)
}

main().catch(console.error)
