#!/usr/bin/env node
/**
 * 修復缺少圖片和簡介的景點
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const fixes = [
  // ========== 日本 ==========
  {
    city_id: 'tokyo',
    name: '淺草寺',
    description:
      '《淺草寺》創建於628年，是東京最古老寺廟。雷門大燈籠、仲見世通商店街、五重塔莊嚴壯麗。新年初詣人潮洶湧，抽籤、祈福、品嚐人形燒、雷米花煎餅，感受江戶下町風情。',
    images: ['https://images.unsplash.com/photo-1528164344705-47542687000d?w=1920&q=85'],
  },
  {
    city_id: 'tokyo',
    name: '晴空塔',
    description:
      '高達634公尺的《晴空塔》是日本最高建築，天望甲板350公尺、天望迴廊450公尺俯瞰東京全景。晴天遠眺富士山、夜景燈海璀璨，塔下商場美食購物一應俱全。',
    images: ['https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=1920&q=85'],
  },
  {
    city_id: 'tokyo',
    name: '築地市場',
    description:
      '《築地場外市場》保留傳統魚市文化，新鮮海膽、生蠔、帝王蟹、玉子燒、海鮮丼現做現吃。清晨5點最熱鬧，老饕排隊搶購當日漁獲，體驗東京美食精髓。',
    images: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1920&q=85'],
  },
  {
    city_id: 'osaka',
    name: '大阪城',
    description:
      '《大阪城》由豐臣秀吉建於1583年，天守閣金碧輝煌矗立城中心。春天櫻花滿開、護城河倒映城堡美景，登天守閣俯瞰大阪市區，博物館展示戰國歷史文物。',
    images: ['https://images.unsplash.com/photo-1590559899731-a382839e5549?w=1920&q=85'],
  },
  {
    city_id: 'osaka',
    name: '道頓堀',
    description:
      '《道頓堀》是大阪最熱鬧美食街，格力高跑跑人招牌、螃蟹道樂巨型螃蟹、章魚燒、大阪燒、串炸店家林立。運河遊船、霓虹燈海、夜晚人潮洶湧，展現關西活力。',
    images: ['https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=1920&q=85'],
  },
  {
    city_id: 'kyoto',
    name: '清水寺',
    description:
      '建於778年的《清水寺》世界文化遺產，清水舞台懸空13公尺無釘子建造震撼人心。音羽瀑布三道泉水祈求健康、學業、戀愛，春櫻秋楓夜間點燈夢幻絕美。',
    images: ['https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1920&q=85'],
  },
  {
    city_id: 'kyoto',
    name: '伏見稻荷大社',
    description:
      '《伏見稻荷大社》千本鳥居綿延山頭，朱紅色鳥居隧道神秘壯觀。供奉狐狸神使，商人祈求生意興隆捐獻鳥居，登頂4公里健行飽覽京都景色，全天免費開放。',
    images: ['https://images.unsplash.com/photo-1528164344705-47542687000d?w=1920&q=85'],
  },
  {
    city_id: 'fukuoka',
    name: '太宰府天滿宮',
    description:
      '《太宰府天滿宮》供奉學問之神菅原道真，考生必訪祈求金榜題名。表參道梅枝餅、星巴克隈研吾設計木結構店舖、飛梅傳說、本殿建築華麗莊嚴，春天梅花盛開。',
    images: ['https://images.unsplash.com/photo-1528181304800-259b08848526?w=1920&q=85'],
  },
  {
    city_id: 'fukuoka',
    name: '福岡塔',
    description:
      '高234公尺的《福岡塔》是海濱地標，展望台123公尺高360度俯瞰博多灣、福岡市區夜景。8000片鏡面反射陽光閃耀，季節燈光秀璀璨奪目，情侶約會聖地。',
    images: ['https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=1920&q=85'],
  },
  {
    city_id: 'fukuoka',
    name: '一蘭拉麵',
    description:
      '《一蘭拉麵》發源福岡，豚骨湯頭濃郁、特製紅辣椒醬提味、細麵Q彈。一人隔間專心品嚐、客製化口味濃淡、蔥量、辣度，24小時營業深夜排隊也甘願。',
    images: ['https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=1920&q=85'],
  },
  {
    city_id: 'kumamoto',
    name: '熊本城',
    description:
      '《熊本城》號稱日本三大名城，加藤清正建於1607年。武者返石牆傾斜陡峭攻不可破，天守閣威武壯觀。2016年地震受損修復中，銀杏城秋天金黃美景令人嚮往。',
    images: ['https://images.unsplash.com/photo-1590559899731-a382839e5549?w=1920&q=85'],
  },
  {
    city_id: 'kumamoto',
    name: '黑川溫泉',
    description:
      '《黑川溫泉》隱身阿蘇山谷，江戶風情木造旅館沿溪而建。一張入湯手形可泡三家溫泉，露天風呂四季景色變化、溫泉街商店販售布丁、溫泉蛋，秘境氛圍療癒身心。',
    images: ['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1920&q=85'],
  },
  {
    city_id: 'nagasaki',
    name: '稻佐山夜景',
    description:
      '《稻佐山》標高333公尺，夜景與摩納哥、香港並列世界新三大夜景。纜車5分鐘登頂，長崎港灣燈火如寶石散落、女神大橋優雅橫跨，日落時刻漸層天色最浪漫。',
    images: ['https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=1920&q=85'],
  },
  {
    city_id: 'nagasaki',
    name: '軍艦島',
    description:
      '《軍艦島》正式名端島，1974年廢棄的海上煤礦城市。混凝土高樓、學校、醫院遺跡如末日廢墟，從遠處看如軍艦浮海面。搭船登島探索禁忌之地，《007》取景地。',
    images: ['https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=1920&q=85'],
  },

  // ========== 泰國 ==========
  {
    city_id: 'bangkok',
    name: '大皇宮',
    description:
      '《大皇宮》建於1782年，泰國王室象徵建築群金碧輝煌。玉佛寺供奉國寶翡翠玉佛、尖塔鑲嵌彩色玻璃、壁畫描繪《羅摩衍那》史詩，遊客必須穿著長袖長褲參觀。',
    images: ['https://images.unsplash.com/photo-1528181304800-259b08848526?w=1920&q=85'],
  },
  {
    city_id: 'bangkok',
    name: '臥佛寺',
    description:
      '《臥佛寺》擁有全泰國最大臥佛，長46公尺、高15公尺，腳底鑲嵌108個珍珠貝殼圖案。曼谷最古老寺廟、泰式按摩發源地，遊客投錢幣祈福、體驗傳統按摩放鬆身心。',
    images: ['https://images.unsplash.com/photo-1548013146-72479768bada?w=1920&q=85'],
  },
  {
    city_id: 'bangkok',
    name: '水上市場',
    description:
      '《丹能莎朵水上市場》船家划小船販售芒果糯米飯、椰子冰淇淋、泰式炒麵、新鮮水果。運河交錯、木屋高腳、傳統服飾，體驗泰國水鄉生活，清晨6-8點最熱鬧。',
    images: ['https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1920&q=85'],
  },
  {
    city_id: 'chiang-mai',
    name: '古城遺址',
    description:
      '《清邁古城》700年歷史四方形城牆，護城河環繞、城門遺跡、寺廟林立。塔佩門最著名、三王紀念碑、週日夜市封街、租單車或步行探索，感受蘭納古都悠閒氛圍。',
    images: ['https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1920&q=85'],
  },
  {
    city_id: 'chiang-mai',
    name: '夜市',
    description:
      '《清邁夜市》分為週六瓦萊路、週日塔佩路、平日夜市。手工藝品、蘭納服飾、銀飾、木雕、繪畫、按摩、小吃攤綿延數公里，街頭藝人表演，是清邁文化精髓體驗。',
    images: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&q=85'],
  },
  {
    city_id: 'phuket',
    name: '芭東海灘',
    description:
      '《芭東海灘》是普吉島最熱鬧海灘，3公里細白沙灘、水上活動、按摩、酒吧、餐廳林立。日落時分天空染成橘紅、夜晚邦古拉街紅燈區霓虹閃爍，遊客聚集地。',
    images: ['https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1920&q=85'],
  },
  {
    city_id: 'phuket',
    name: '攀牙灣',
    description:
      '《攀牙灣》石灰岩島嶼矗立碧綠海面，《007黃金槍》詹姆斯龐德島取景地。搭長尾船穿梭鐘乳石洞、水上村落、獨木舟探索紅樹林，壯麗喀斯特地貌媲美下龍灣。',
    images: ['https://images.unsplash.com/photo-1528127269322-539801943592?w=1920&q=85'],
  },

  // ========== 韓國 ==========
  {
    city_id: 'seoul',
    name: '景福宮',
    description:
      '《景福宮》建於1395年，朝鮮王朝法宮規模最大。光化門、勤政殿、慶會樓、香遠亭四季景色變化，穿韓服免費入場，守門將換崗儀式莊嚴隆重，首爾必訪歷史景點。',
    images: ['https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=1920&q=85'],
  },
  {
    city_id: 'seoul',
    name: '明洞',
    description:
      '《明洞》是首爾購物天堂，化妝品店、服飾、美食街密集。樂天百貨、新世界百貨、路邊攤炒年糕、辣炒雞、起司熱狗，街頭藝人表演，週末人潮洶湧水洩不通。',
    images: ['https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1920&q=85'],
  },
  {
    city_id: 'seoul',
    name: '南山塔',
    description:
      '《南山首爾塔》高236公尺，展望台俯瞰首爾市區全景。愛情鎖牆情侶留念、纜車浪漫、夜晚塔身變幻燈光秀，韓劇取景勝地，日落時刻漢江反射金光最美。',
    images: ['https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=1920&q=85'],
  },
  {
    city_id: 'busan',
    name: '海雲台海灘',
    description:
      '《海雲台》是釜山最美海灘，1.5公里細白沙灘、清澈海水、高樓林立現代感十足。夏天海水浴場人潮、冬天候鳥過境、周圍海鮮餐廳、溫泉飯店，釜山度假首選。',
    images: ['https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1920&q=85'],
  },
  {
    city_id: 'busan',
    name: '甘川文化村',
    description:
      '《甘川文化村》彩色房屋層疊山坡，韓國聖托里尼。藝術壁畫、小王子雕像、迷宮巷弄、咖啡廳、手作工坊，俯瞰釜山港灣美景，IG打卡熱門景點文青最愛。',
    images: ['https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1920&q=85'],
  },
  {
    city_id: 'jeju',
    name: '濱海道',
    description:
      '《濱海道》是濟州偶來小路代表，沿海岸線健行步道景色壯麗。玄武岩海岸、藍色大海、油菜花田、橘子園、燈塔，春天櫻花、秋天芒草，徒步愛好者天堂。',
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
  },
  {
    city_id: 'jeju',
    name: '城山日出峰',
    description:
      '《城山日出峰》聯合國世界自然遺產，火山噴發形成碗狀火山口。登頂30分鐘、日出時刻金光灑落海面震撼壯麗，山下海女潛水捕撈海產表演，濟州島必訪絕景。',
    images: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=85'],
  },
]

async function main() {
  console.log('🔧 開始修復 28 個不完整景點...\n')

  let success = 0
  let failed = 0

  for (const fix of fixes) {
    try {
      const { error } = await supabase
        .from('attractions')
        .update({
          description: fix.description,
          images: fix.images,
        })
        .eq('city_id', fix.city_id)
        .eq('name', fix.name)

      if (error) throw error

      console.log(`✅ ${fix.city_id} - ${fix.name}`)
      success++
    } catch (error) {
      console.error(`❌ ${fix.city_id} - ${fix.name}: ${error.message}`)
      failed++
    }
  }

  console.log(`\n📊 修復統計:`)
  console.log(`✅ 成功: ${success} 個`)
  console.log(`❌ 失敗: ${failed} 個`)
  console.log(`\n🎉 所有景點資料已完整！`)
}

main().catch(console.error)
