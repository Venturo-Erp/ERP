#!/usr/bin/env node
/**
 * 匯入清邁 50 個精選景點（Nova 整理版）
 * 資料來源：清邁景點清單.md
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 缺少環境變數：NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Top 20 必去景點
const top20Destinations = [
  {
    city: '清邁',
    name: '素帖寺/雙龍寺',
    name_en: 'Wat Phra That Doi Suthep',
    category: '文化古蹟',
    description: '清邁地標，俯瞰全城，309級階梯兩側有龍形扶手',
    latitude: 18.8047,
    longitude: 98.9217,
    tags: ['寺廟', '地標', '必遊', '佛教'],
    image_url: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800',
    priority: 1
  },
  {
    city: '清邁',
    name: '契迪龍寺',
    name_en: 'Wat Chedi Luang',
    category: '文化古蹟',
    description: '古城區內最大佛塔遺跡，擁有宏偉的蘭納風格建築',
    latitude: 18.7868,
    longitude: 98.9873,
    tags: ['寺廟', '佛塔', '歷史', '蘭納'],
    image_url: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800',
    priority: 2
  },
  {
    city: '清邁',
    name: '帕辛寺',
    name_en: 'Wat Phra Singh',
    category: '文化古蹟',
    description: '清邁最重要寺廟之一，香火鼎盛，收藏珍貴佛像',
    latitude: 18.7886,
    longitude: 98.9830,
    tags: ['寺廟', '佛教', '必遊', '蘭納'],
    image_url: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800',
    priority: 3
  },
  {
    city: '清邁',
    name: '清邁週日夜市',
    name_en: 'Sunday Walking Street',
    category: '美食購物',
    description: '規模最大夜市，從塔佩門延伸至古城中心',
    latitude: 18.7877,
    longitude: 98.9900,
    tags: ['夜市', '手工藝', '美食', '必遊'],
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    priority: 4
  },
  {
    city: '清邁',
    name: '清邁週六夜市',
    name_en: 'Saturday Night Market',
    category: '美食購物',
    description: '銀飾街夜市，特色工藝品豐富',
    latitude: 18.7850,
    longitude: 98.9850,
    tags: ['夜市', '銀飾', '工藝品', '購物'],
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    priority: 5
  },
  {
    city: '清邁',
    name: '塔佩門',
    name_en: 'Tha Phae Gate',
    category: '文化古蹟',
    description: '古城東門，保存最完整的城牆，週日夜市起點',
    latitude: 18.7877,
    longitude: 98.9931,
    tags: ['古城', '城門', '地標', '歷史'],
    image_url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800',
    priority: 6
  },
  {
    city: '清邁',
    name: '清邁夜間動物園',
    name_en: 'Chiang Mai Night Safari',
    category: '親子活動',
    description: '全球最大夜間動物園，近距離觀賞夜行性動物',
    latitude: 18.7575,
    longitude: 98.9153,
    tags: ['動物園', '夜間', '親子', '體驗'],
    image_url: 'https://images.unsplash.com/photo-1551244072-5d12893278ab?w=800',
    priority: 7
  },
  {
    city: '清邁',
    name: '大象保育營',
    name_en: 'Elephant Sanctuary',
    category: '親子活動',
    description: '人道大象體驗：餵食、洗澡、泥巴浴（推薦：Elephant Nature Park、Kerchor）',
    latitude: 18.7500,
    longitude: 98.9000,
    tags: ['大象', '親子', '動物', '自然'],
    image_url: 'https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=800',
    priority: 8
  },
  {
    city: '清邁',
    name: '白廟（龍昆寺）',
    name_en: 'Wat Rong Khun',
    category: '文化藝術',
    description: '清萊藝術建築，純白建築鑲嵌鏡片，象徵純淨與智慧',
    latitude: 19.8242,
    longitude: 99.7628,
    tags: ['寺廟', '藝術', '白色', '必遊'],
    image_url: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800',
    priority: 9
  },
  {
    city: '清邁',
    name: '藍廟（龍蘇町寺）',
    name_en: 'Wat Rong Suea Ten',
    category: '文化藝術',
    description: '清萊深藍色寺廟搭配金色裝飾，壁畫精美',
    latitude: 19.9117,
    longitude: 99.8392,
    tags: ['寺廟', '藝術', '藍色', '拍照'],
    image_url: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800',
    priority: 10
  },
  {
    city: '清邁',
    name: '清曼寺',
    name_en: 'Wat Chiang Man',
    category: '文化古蹟',
    description: '清邁最古老寺廟，700年歷史，15頭大象承載佛塔',
    latitude: 18.7948,
    longitude: 98.9895,
    tags: ['寺廟', '歷史', '古蹟', '大象'],
    image_url: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800',
    priority: 11
  },
  {
    city: '清邁',
    name: 'Baan Kang Wat 藝術村',
    name_en: 'Baan Kang Wat',
    category: '文創藝術',
    description: '隱身森林中的藝術村，手作工坊、咖啡廳、文創小店',
    latitude: 18.7722,
    longitude: 98.9506,
    tags: ['藝術村', '文創', '咖啡廳', '手作'],
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    priority: 12
  },
  {
    city: '清邁',
    name: '瓦洛洛市場',
    name_en: 'Warorot Market',
    category: '美食購物',
    description: '泰北最大批發市場，24小時營業，果乾、香料、傳統服飾',
    latitude: 18.7897,
    longitude: 99.0021,
    tags: ['市場', '批發', '果乾', '香料'],
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    priority: 13
  },
  {
    city: '清邁',
    name: '叢林飛索',
    name_en: 'Jungle Flight',
    category: '冒險活動',
    description: '樹冠層滑索體驗（推薦：Jungle Flight、Skyline Adventure、Flight of the Gibbon）',
    latitude: 18.8000,
    longitude: 98.9500,
    tags: ['冒險', '飛索', '叢林', '刺激'],
    image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
    priority: 14
  },
  {
    city: '清邁',
    name: '清邁大學夜市',
    name_en: 'CMU Night Market',
    category: '美食購物',
    description: '平價學生夜市，服飾、美食廣場、年輕人聚集地',
    latitude: 18.7989,
    longitude: 98.9511,
    tags: ['夜市', '學生', '平價', '美食'],
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    priority: 15
  },
  {
    city: '清邁',
    name: '寧曼路',
    name_en: 'Nimman Road',
    category: '浪漫悠閒',
    description: '時尚咖啡廳、設計小店、藝廊，文青必訪',
    latitude: 18.7965,
    longitude: 98.9682,
    tags: ['文青', '咖啡廳', '設計', '購物'],
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    priority: 16
  },
  {
    city: '清邁',
    name: '觀光夜市 Night Bazaar',
    name_en: 'Night Bazaar',
    category: '美食購物',
    description: '每日營業，手工藝品、紀念品、泰式美食',
    latitude: 18.7900,
    longitude: 99.0000,
    tags: ['夜市', '手工藝', '紀念品', '美食'],
    image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    priority: 17
  },
  {
    city: '清邁',
    name: '清邁3D視覺博物館',
    name_en: '3D Art in Paradise',
    category: '親子活動',
    description: '3D藝術拍照景點，適合親子同樂',
    latitude: 18.7919,
    longitude: 98.9659,
    tags: ['3D', '拍照', '親子', '博物館'],
    image_url: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800',
    priority: 18
  },
  {
    city: '清邁',
    name: '素潘寺（銀廟）',
    name_en: 'Wat Sri Suphan',
    category: '文化古蹟',
    description: '泰國唯一銀白色寺廟，純銀及金屬打造，男性限定主殿',
    latitude: 18.7820,
    longitude: 98.9756,
    tags: ['寺廟', '銀廟', '藝術', '手工藝'],
    image_url: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800',
    priority: 19
  },
  {
    city: '清邁',
    name: '烏蒙寺',
    name_en: 'Wat Umong',
    category: '文化古蹟',
    description: '清邁最古老隧道寺廟，隱於森林中，寧靜禪意',
    latitude: 18.7792,
    longitude: 98.9453,
    tags: ['寺廟', '隧道', '森林', '禪意'],
    image_url: 'https://images.unsplash.com/photo-1528181304800-259b08848526?w=800',
    priority: 20
  }
]

// Top 21-50 推薦景點
const top50Destinations = [
  {
    city: '清邁',
    name: '清萊黑屋博物館',
    name_en: 'Baan Dam Museum',
    category: '文化藝術',
    description: '以死亡為主題的藝術館，展示動物標本與藝術品',
    tags: ['藝術', '博物館', '清萊', '黑色'],
    priority: 21
  },
  {
    city: '清邁',
    name: '拉差帕皇家花園',
    name_en: 'Royal Park Rajapruek',
    category: '自然風光',
    description: '為慶祝拉瑪九世登基60週年而建，泰北花卉天堂',
    tags: ['花園', '皇家', '花卉', '自然'],
    priority: 22
  },
  {
    city: '清邁',
    name: '清萊金三角',
    name_en: 'Golden Triangle',
    category: '文化歷史',
    description: '緬甸、寮國、泰國三國交界處，湄公河匯流',
    latitude: 20.3530,
    longitude: 100.0844,
    tags: ['金三角', '歷史', '清萊', '邊界'],
    priority: 23
  },
  {
    city: '清邁',
    name: 'Tube Trek 水上樂園',
    name_en: 'Tube Trek Waterpark',
    category: '親子活動',
    description: '人造海浪池、漂漂河、滑水道，90公分以下兒童免費',
    tags: ['水上樂園', '親子', '戲水', '漂漂河'],
    priority: 24
  },
  {
    city: '清邁',
    name: '老虎王國 Tiger Kingdom',
    name_en: 'Tiger Kingdom',
    category: '親子活動',
    description: '近距離接觸老虎拍照（有爭議，建議選擇動物友善場所）',
    tags: ['老虎', '動物', '拍照', '親子'],
    priority: 25
  },
  {
    city: '清邁',
    name: '美茵寺 Wat Umong',
    name_en: 'Wat Umong',
    category: '文化古蹟',
    description: '素帖山腳下，700年歷史隧道寺廟',
    tags: ['寺廟', '隧道', '歷史', '森林'],
    priority: 26
  },
  {
    city: '清邁',
    name: 'Coconut Market 椰林市集',
    name_en: 'Coconut Market',
    category: '美食購物',
    description: '被椰子樹環繞的週末市集，景色優美',
    tags: ['市集', '週末', '椰林', '文創'],
    priority: 27
  },
  {
    city: '清邁',
    name: 'Jing Jai Market 真心市集',
    name_en: 'Jing Jai Market',
    category: '美食購物',
    description: '規模大，手作品質佳，週末限定',
    tags: ['市集', '週末', '手作', '文創'],
    priority: 28
  },
  {
    city: '清邁',
    name: 'No.39 Cafe',
    name_en: 'No.39 Cafe',
    category: '浪漫悠閒',
    description: '池畔森林系咖啡廳，近Baan Kang Wat藝術村',
    tags: ['咖啡廳', '森林', '網美', '拍照'],
    priority: 29
  },
  {
    city: '清邁',
    name: '清邁古城',
    name_en: 'Chiang Mai Old City',
    category: '文化古蹟',
    description: '方形護城河環繞，多座歷史寺廟',
    latitude: 18.7883,
    longitude: 98.9853,
    tags: ['古城', '護城河', '寺廟', '歷史'],
    priority: 30
  },
  {
    city: '清邁',
    name: '清邁草編一條街',
    name_en: 'Chang Moi Kao Road',
    category: '美食購物',
    description: 'Chang Moi Kao Rd，藤編包、草帽專賣區',
    tags: ['購物', '草編', '藤編', '手工藝'],
    priority: 31
  },
  {
    city: '清邁',
    name: '布帕壤寺',
    name_en: 'Wat Buppharam',
    category: '文化古蹟',
    description: '蘭納風格木造建築，精美玻璃與木雕',
    tags: ['寺廟', '蘭納', '木雕', '玻璃'],
    priority: 32
  },
  {
    city: '清邁',
    name: 'MAYA購物中心',
    name_en: 'MAYA Lifestyle Shopping Center',
    category: '美食購物',
    description: '寧曼區現代購物商場，週四夜市',
    tags: ['購物中心', '商場', '美食', '夜市'],
    priority: 33
  },
  {
    city: '清邁',
    name: '清邁大象咖啡館 Elefin',
    name_en: 'Elefin Coffee',
    category: '親子活動',
    description: '近距離觀賞大象，搭配咖啡廳',
    tags: ['大象', '咖啡廳', '親子', '動物'],
    priority: 34
  },
  {
    city: '清邁',
    name: 'Ginger Farm Kitchen',
    name_en: 'Ginger Farm Kitchen',
    category: '美食體驗',
    description: '小農直送泰北料理，寧曼區人氣餐廳',
    tags: ['餐廳', '泰北料理', '小農', '美食'],
    priority: 35
  },
  {
    city: '清邁',
    name: '茵他儂國家公園',
    name_en: 'Doi Inthanon National Park',
    category: '自然風光',
    description: '泰國最高峰，國王王后佛塔，瀑布步道',
    latitude: 18.5885,
    longitude: 98.4867,
    tags: ['國家公園', '最高峰', '瀑布', '佛塔'],
    priority: 36
  },
  {
    city: '清邁',
    name: '湄康蓬村',
    name_en: 'Mae Kampong',
    category: '自然風光',
    description: '百年咖啡村，海拔1300米山中秘境',
    tags: ['咖啡村', '山中', '秘境', '自然'],
    priority: 37
  },
  {
    city: '清邁',
    name: '青島鐘乳石寺 Chiang Dao Cave',
    name_en: 'Chiang Dao Cave',
    category: '自然風光',
    description: '多層石灰岩洞穴，佛像與鐘乳石交織',
    tags: ['洞穴', '鐘乳石', '佛像', '自然'],
    priority: 38
  },
  {
    city: '清邁',
    name: '木安洞穴 Muang On Cave',
    name_en: 'Muang On Cave',
    category: '自然風光',
    description: '山甘烹溫泉附近，洞內有巨型石筍',
    tags: ['洞穴', '石筍', '溫泉', '自然'],
    priority: 39
  },
  {
    city: '清邁',
    name: '清邁泰拳館',
    name_en: 'Lanna Muay Thai Boxing Camp',
    category: '文化體驗',
    description: '塔佩門旁，觀賞或學習泰拳',
    tags: ['泰拳', '文化', '體驗', '運動'],
    priority: 40
  },
  {
    city: '清邁',
    name: '藝術文化中心 CAD',
    name_en: 'Chiang Mai Art & Design',
    category: '文化藝術',
    description: '清邁當代藝術展覽空間',
    tags: ['藝術', '展覽', '當代', '文化'],
    priority: 41
  },
  {
    city: '清邁',
    name: '清邁天使花園 Angel\'s Secret',
    name_en: 'Angel\'s Secret Garden',
    category: '浪漫悠閒',
    description: '歐式花園造景，適合拍照',
    tags: ['花園', '歐式', '拍照', '網美'],
    priority: 42
  },
  {
    city: '清邁',
    name: '清邁峽谷 Grand Canyon',
    name_en: 'Grand Canyon Chiang Mai',
    category: '自然風光',
    description: '水上樂園，跳水、浮潛、SUP',
    tags: ['峽谷', '水上樂園', '跳水', '浮潛'],
    priority: 43
  },
  {
    city: '清邁',
    name: 'Lila 女子監獄按摩',
    name_en: 'Lila Thai Massage',
    category: '文化體驗',
    description: '社會企業，幫助更生人，技術優良',
    tags: ['按摩', 'Spa', '社會企業', '更生'],
    priority: 44
  },
  {
    city: '清邁',
    name: 'Let\'s Relax Spa',
    name_en: 'Let\'s Relax Spa',
    category: '文化體驗',
    description: '連鎖按摩品牌，服務專業',
    tags: ['Spa', '按摩', '連鎖', '專業'],
    priority: 45
  },
  {
    city: '清邁',
    name: 'Fah Lanna Spa',
    name_en: 'Fah Lanna Spa',
    category: '文化體驗',
    description: '蘭納風格Spa，古城與寧曼皆有分店',
    tags: ['Spa', '蘭納', '按摩', '高級'],
    priority: 46
  },
  {
    city: '清邁',
    name: 'Oasis Spa',
    name_en: 'Oasis Spa',
    category: '文化體驗',
    description: '綠洲主題Spa，環境清幽',
    tags: ['Spa', '綠洲', '按摩', '清幽'],
    priority: 47
  },
  {
    city: '清邁',
    name: '清邁料理教室',
    name_en: 'Thai Farm Cooking School',
    category: '文化體驗',
    description: '學習泰式料理（如：Mama Noi Thai Cookery）',
    tags: ['料理', '教室', '泰式', '體驗'],
    priority: 48
  },
  {
    city: '清邁',
    name: '湄平河遊船晚餐',
    name_en: 'Mae Ping River Cruise',
    category: '美食體驗',
    description: '河畔用餐，欣賞兩岸風光',
    tags: ['遊船', '晚餐', '河景', '浪漫'],
    priority: 49
  },
  {
    city: '清邁',
    name: '帝王餐體驗',
    name_en: 'Khantoke Dinner',
    category: '美食體驗',
    description: '康托克晚宴，含傳統舞蹈表演',
    tags: ['帝王餐', '舞蹈', '表演', '傳統'],
    priority: 50
  }
]

async function main() {
  console.log('🚀 開始匯入清邁 50 個精選景點...\n')

  const allDestinations = [...top20Destinations, ...top50Destinations]
  
  let success = 0
  let failed = 0

  for (const destination of allDestinations) {
    try {
      const { error } = await supabase
        .from('destinations')
        .insert(destination)

      if (error) throw error

      console.log(`✅ [${destination.priority}] ${destination.name}`)
      success++
    } catch (error) {
      console.error(`❌ ${destination.name}: ${error.message}`)
      failed++
    }
  }

  console.log(`\n📊 完成統計:`)
  console.log(`✅ 成功: ${success} 個`)
  console.log(`❌ 失敗: ${failed} 個`)
  console.log(`\n🎉 清邁景點匯入完成！共匯入 ${success} 個景點`)
}

main().catch(console.error)
