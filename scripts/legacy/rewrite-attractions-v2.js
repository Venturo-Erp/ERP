#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://pfqvdacxowpgfamuvnsn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwODMyMCwiZXhwIjoyMDc0Njg0MzIwfQ.kbJbdYHtOWudBGzV3Jv5OWzWQQZT4aBFFgfUczaVdIE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 印尼景點資料庫（精選重點景點）
const indonesiaDescriptions = {
  // === 峇里島 Bali ===
  'Capella Ubud': {
    description: '《Capella Ubud》隱身烏布雨林深處，帳篷別墅融入山谷綠意，私人泳池、露天浴缸與叢林共生。晨起霧氣繚繞，夜晚星空璀璨，頂級服務結合原始野性，打造隱世奢華體驗。適合追求極致隱私與自然沉浸的旅人。',
    ticket_price: '房價約Rp 15,000,000起/晚',
    opening_hours: { daily: '24小時入住服務' }
  },
  'Waterbom水上樂園': {
    description: '《Waterbom水上樂園》位於庫塔海灘區，多次榮獲亞洲最佳水上樂園獎項。刺激滑水道、漂漂河、兒童戲水區一應俱全，熱帶花園環繞，設施維護極佳。適合親子同遊，炎熱天氣的消暑首選，玩水之餘還能享受峇里島悠閒氛圍。',
    ticket_price: '成人Rp 450,000-650,000',
    opening_hours: { daily: '09:00-18:00' }
  },
  '京打馬尼火山': {
    description: '《京打馬尼火山》海拔1,717公尺，活火山巴杜爾山與湖泊構成壯闊火山口景觀。清晨攀登觀日出，霧氣散去後黑色火山岩與碧藍湖水對比震撼。山腳溫泉村莊、咖啡園點綴，是峇里島高地必訪自然奇景，攝影師與登山愛好者的天堂。',
    ticket_price: '入山費Rp 50,000-100,000',
    opening_hours: { daily: '凌晨04:00起（日出團）' }
  },
  '佩妮達島': {
    description: '《佩妮達島》位於峇里島東南方，保留原始粗獷之美。Kelingking Beach「暴龍灣」斷崖如恐龍側影，Angel Billabong天然無邊際泳池，Broken Beach拱門海蝕洞震撼人心。陡峭山路、未開發海岸充滿冒險感，適合熱愛秘境探險的旅人。',
    ticket_price: '渡輪往返Rp 150,000-250,000',
    opening_hours: { daily: '全天開放（建議08:00-16:00）' }
  },
  '烏布猴林': {
    description: '《聖猴森林》位於烏布南端，超過700隻長尾獼猴在古廟與榕樹間自由穿梭。石雕神像、苔蘚石階與猴群互動構成獨特體驗，但需小心保管隨身物品。熱帶雨林氛圍濃厚，是了解峇里島人與自然共生哲學的活教材。',
    ticket_price: '成人Rp 80,000',
    opening_hours: { daily: '09:00-18:00' }
  },
  '海神廟': {
    description: '《海神廟Tanah Lot》矗立於海蝕岩柱上，16世紀建造的印度教聖殿與海浪共舞。退潮時可走近參拜，漲潮時寺廟被海水包圍，夕陽時分金光灑落海面，是峇里島最經典的明信片場景。周邊市集、海鮮餐廳，適合傍晚時光悠閒漫步。',
    ticket_price: '成人Rp 60,000',
    opening_hours: { daily: '07:00-19:00' }
  },
  '烏魯瓦圖廟': {
    description: '《烏魯瓦圖斷崖廟》建於70公尺懸崖之上，俯瞰印度洋驚濤拍岸。11世紀古廟供奉海神，猴群守護聖域。日落時分Kecak火舞表演震撼上演，百人合唱、火焰舞蹈與落日餘暉交織，是峇里島文化與自然結合的極致體驗。',
    ticket_price: '成人Rp 50,000（火舞表演另計Rp 150,000）',
    opening_hours: { 
      temple: '09:00-18:00',
      kecak_dance: '18:00-19:00'
    }
  },
  '德格拉朗梯田': {
    description: '《德格拉朗梯田Tegallalang》層層綠色階梯順著山坡蜿蜒，傳統Subak灌溉系統運作千年。翠綠稻浪隨風搖曳，椰樹點綴其間，叢林鞦韆、空中步道成為網美打卡熱點。清晨薄霧或夕陽時分最美，是峇里島農業文明與自然和諧的見證。',
    ticket_price: '參觀Rp 20,000-50,000（叢林鞦韆另計）',
    opening_hours: { daily: '08:00-18:00' }
  },
  '聖泉寺': {
    description: '《聖泉寺Tirta Empul》建於10世紀，泉水自地底湧出被視為聖水，當地人與遊客在石雕水池中進行淨化儀式。苔蘚石柱、熱帶花卉環繞，氛圍莊嚴寧靜。參與沐浴儀式需穿著沙龍，體驗峇里島獨特的靈性文化。',
    ticket_price: '成人Rp 50,000',
    opening_hours: { daily: '09:00-17:00' }
  },
  '金巴蘭海灘': {
    description: '《金巴蘭海灘》以夕陽海鮮BBQ聞名，細軟沙灘、平緩海浪適合戲水。傍晚時分海灘餐廳擺出燭光晚餐，烤龍蝦、鮮魚配上落日餘暉與海浪聲，浪漫氛圍滿分。漁村保留傳統生活節奏，適合悠閒度假與情侶約會。',
    ticket_price: '免費（海鮮晚餐約Rp 250,000-500,000/人）',
    opening_hours: { daily: '全天開放（日落17:30-18:30）' }
  },
  '庫塔海灘': {
    description: '《庫塔海灘》是峇里島最熱鬧的海灘，衝浪者天堂、日落觀賞勝地。長達數公里的細沙灘，海浪適中適合衝浪初學者。沿岸餐廳、酒吧、按摩攤林立，夜晚燈火通明音樂環繞，是體驗峇里島年輕活力與派對文化的首選。',
    ticket_price: '免費（衝浪課程約Rp 350,000）',
    opening_hours: { daily: '全天開放' }
  },
  '水明漾': {
    description: '《水明漾Seminyak》是峇里島時尚海灘區，精品酒店、設計師商店、高級餐廳林立。白日陽光沙灘，夜晚Beach Club派對，La Plancha彩色豆袋椅、Potato Head無邊際泳池成為網美聖地。比庫塔更精緻、比烏布更奢華，適合追求品味的旅人。',
    ticket_price: '免費（Beach Club消費約Rp 300,000起）',
    opening_hours: { daily: '全天開放' }
  },
  '藍夢島': {
    description: "《藍夢島Nusa Lembongan》與本島隔海相望，保留小島純樸氛圍。Devil's Tear海浪拍岸壯觀、Dream Beach細沙碧海、紅樹林獨木舟探險，浮潛邂逅Manta魟魚。島上機車代步、海景餐廳悠閒，是峇里島外的世外桃源。",
    ticket_price: '快艇往返Rp 250,000-350,000',
    opening_hours: { daily: '全天（建議避開大浪季節）' }
  },
  '烏布皇宮': {
    description: '《烏布皇宮Puri Saren》位於烏布市中心，19世紀建造的傳統宮殿建築，金色雕刻、石獅守門展現皇室威嚴。夜晚在庭院觀賞Legong舞蹈表演，宮廷樂隊、華麗服飾與傳統故事，是了解峇里島文化藝術的窗口。部分區域仍有皇室後裔居住。',
    ticket_price: '免費參觀（舞蹈表演Rp 80,000-100,000）',
    opening_hours: { 
      palace: '08:00-19:00',
      dance: '19:30-21:00（每晚）'
    }
  },
  '烏布市場': {
    description: '《烏布市場Pasar Ubud》是峇里島傳統工藝品集散地，手工編織、銀飾、木雕、batik蠟染、精油香氛琳瑯滿目。清晨是當地人買菜市集，白天變成遊客尋寶天堂，議價是必備技能。市場對面烏布皇宮，逛累了周邊咖啡館小憩。',
    ticket_price: '免費進入',
    opening_hours: { daily: '07:00-18:00' }
  },
  '象窟': {
    description: '《象窟Goa Gajah》建於9世紀，洞窟入口巨大惡魔面孔雕刻令人震撼。內部供奉濕婆神象徵林伽與尤尼，洞外聖泉池、石雕浮雕展現古爪哇建築藝術。苔蘚覆蓋、熱帶植物環繞，氛圍神秘古老，是峇里島UNESCO文化遺產候選地。',
    ticket_price: '成人Rp 50,000',
    opening_hours: { daily: '08:00-17:00' }
  },
  '阿勇河泛舟': {
    description: '《阿勇河泛舟Ayung River Rafting》穿越烏布雨林峽谷，激流、瀑布、雕刻河岸構成冒險旅程。2-2.5小時泛舟體驗，專業教練帶領，安全裝備齊全。沿途欣賞熱帶植物、梯田、野生動物，結束後享用印尼自助餐，適合家庭與團隊活動。',
    ticket_price: 'Rp 350,000-500,000/人',
    opening_hours: { daily: '08:00-15:00（多個時段）' }
  },
  '巴杜爾火山': {
    description: '《巴杜爾火山Mount Batur》海拔1,717公尺活火山，凌晨登頂觀日出是經典體驗。2小時攀登，火山口冒出蒸氣、遠眺阿貢火山與巴杜爾湖，日出雲海金光灑落震撼人心。下山後Toya Devasya溫泉舒緩疲勞，黑色火山岩與湖景相伴。',
    ticket_price: '登山導遊+入山費Rp 500,000-700,000/人',
    opening_hours: { sunrise_trek: '03:30出發-08:00回程' }
  },
  '阿貢火山': {
    description: '《阿貢火山Mount Agung》海拔3,031公尺，峇里島最高峰與最神聖的山，被視為眾神居所。攀登難度高需6-7小時，山頂俯瞰全島與日出雲海，靈性與挑戰兼具。2017-2019年曾噴發，登山需確認火山活動狀態與申請許可。',
    ticket_price: '登山導遊Rp 800,000-1,200,000/人',
    opening_hours: { trek: '需提前預約（凌晨出發）' }
  },
  '百沙基母廟': {
    description: '《百沙基母廟Pura Besakih》建於阿貢火山山腰，峇里島最大最神聖的印度教寺廟群。23座寺廟沿山坡階梯而建，石雕塔門、祭壇、供品展現信仰虔誠。雲霧繚繞、火山背景壯麗，是峇里島精神中心，重大宗教儀式在此舉行。',
    ticket_price: '成人Rp 60,000（導遊建議）',
    opening_hours: { daily: '08:00-17:00' }
  },
  '水明漾海灘': {
    description: '《水明漾海灘Seminyak Beach》金色沙灘綿延數公里，高級度假村、Beach Club林立。日落時分衝浪者剪影、火舞表演與雞尾酒派對，La Plancha彩色豆袋椅成為經典拍照點。比庫塔更時尚、比烏布更海洋，是峇里島精品度假首選。',
    ticket_price: '免費（Beach Club消費約Rp 200,000起）',
    opening_hours: { daily: '全天開放' }
  },
  '努沙杜瓦': {
    description: '《努沙杜瓦Nusa Dua》是峇里島高端度假區，五星酒店沿白沙灘排列，私人沙灘、冠軍高爾夫球場、BTDC購物中心齊全。海水平靜適合浮潛、水上活動，綠化環境優美、治安良好，適合家庭度假與商務會議，享受峇里島奢華寧靜一面。',
    ticket_price: '免費（酒店房價高）',
    opening_hours: { daily: '全天開放' }
  },
  '努沙杜瓦海灘': {
    description: '《努沙杜瓦海灘》擁有峇里島最細緻的白沙與平靜海水，珊瑚礁保護使海浪平緩適合游泳。五星酒店私人沙灘提供日光浴椅、水上活動設施，公共海灘區域自由進出。清澈海水、熱帶魚群，浮潛體驗佳，適合追求高品質海灘度假的旅人。',
    ticket_price: '免費',
    opening_hours: { daily: '全天開放' }
  },
  '吉利群島': {
    description: '《吉利群島Gili Islands》由Trawangan、Meno、Air三座小島組成，位於龍目島西北方。白沙灘、清澈海水、珊瑚礁環繞，島上禁止機動車輛僅馬車代步。浮潛邂逅海龜、潛水探索沉船，夜晚沙灘派對或寧靜星空，是峇里島外的熱帶天堂。',
    ticket_price: '快艇往返Rp 450,000-650,000',
    opening_hours: { daily: '全天（避開大浪季節11-3月）' }
  },
  '吉利特拉旺安': {
    description: '《吉利特拉旺安Gili Trawangan》是吉利三島中最熱鬧的島嶼，背包客與派對愛好者聚集地。白日浮潛、潛水、腳踏車環島，夜晚沙灘酒吧音樂派對。保留小島純樸風情卻不失娛樂選擇，適合追求海島度假與社交氛圍的年輕旅人。',
    ticket_price: '快艇往返Rp 450,000-650,000',
    opening_hours: { daily: '全天（建議避開雨季）' }
  },
  '林賈尼火山': {
    description: '《林賈尼火山Mount Rinjani》海拔3,726公尺，印尼第二高火山，位於龍目島。2-4天登山行程，火山口湖Segara Anak碧藍如鏡，溫泉、瀑布、雲海日出震撼壯麗。挑戰性高但風景值得，是東南亞最美登山路線之一。',
    ticket_price: '登山套裝（含導遊/帳篷/餐食）約Rp 2,500,000-4,000,000/人',
    opening_hours: { trek: '4-11月乾季（需提前預約）' }
  },
  '庫塔龍目': {
    description: '《庫塔龍目Kuta Lombok》不同於峇里島庫塔，這裡保留原始漁村風情。Tanjung Aan雙灣海灘、Selong Belanak衝浪天堂、Mawun秘境沙灘，海水碧藍、沙質細軟。周邊薩薩克傳統村落、辣椒市集，是體驗龍目島純樸海島生活的基地。',
    ticket_price: '免費',
    opening_hours: { daily: '全天開放' }
  },
  '粉紅海灘': {
    description: '《粉紅海灘Pink Beach》位於龍目島東部科莫多國家公園附近，紅色珊瑚碎屑混合白沙呈現夢幻粉紅色澤。清澈海水、珊瑚礁環繞，浮潛邂逅熱帶魚群。秘境氛圍、遊客稀少，是攝影與浮潛愛好者的隱藏天堂，建議安排跳島行程前往。',
    ticket_price: '跳島Tour約Rp 500,000-800,000/人',
    opening_hours: { daily: '08:00-16:00（建議跟團）' }
  },
  '薩薩克村': {
    description: '《薩薩克村Sasak Village》展現龍目島原住民傳統生活，茅草屋頂、竹編牆面、土地為地板的傳統建築保存完好。婦女現場編織傳統布料、展示手工藝技術，村民熱情介紹文化習俗。參觀需尊重當地規範，是了解龍目島原始文化的珍貴窗口。',
    ticket_price: '捐獻制（建議Rp 20,000-50,000）',
    opening_hours: { daily: '08:00-17:00' }
  },
  
  // === 雅加達 Jakarta ===
  '伊斯蒂克拉爾清真寺': {
    description: '《伊斯蒂克拉爾清真寺Masjid Istiqlal》是東南亞最大清真寺，白色大理石建築配以不鏽鋼圓頂，可容納超過12萬信徒。建於1961-1978年間，象徵印尼獨立與宗教包容。挑高大廳、幾何圖紋、巨型吊燈展現伊斯蘭現代建築美學，非穆斯林可預約導覽參觀。',
    ticket_price: '免費參觀（建議捐獻）',
    opening_hours: { 
      weekday: '04:30-21:30',
      friday: '11:30後開放非穆斯林',
      notes: '祈禱時間限穆斯林'
    }
  },
  '獨立紀念碑': {
    description: '《獨立紀念碑Monas》高137公尺，頂端鍍金火焰象徵印尼獨立精神。紀念碑內部博物館展示獨立運動歷史，電梯登頂俯瞰雅加達市景。周圍默迪卡廣場是市民休閒聚集地，國旗升降儀式莊嚴。夜晚燈光照亮，是雅加達地標與歷史見證。',
    ticket_price: '成人Rp 15,000（登頂另計Rp 10,000）',
    opening_hours: { 
      tue_sun: '08:00-22:00',
      monday: '休館'
    }
  },
  '雅加達大教堂': {
    description: '《雅加達大教堂Cathedral Jakarta》與伊斯蒂克拉爾清真寺僅一街之隔，象徵宗教和諧。建於1901年荷蘭殖民時期，哥德式建築、彩繪玻璃窗、高聳尖塔展現歐洲教堂風格。內部莊嚴肅穆、管風琴音樂悠揚，是雅加達天主教信仰中心與建築瑰寶。',
    ticket_price: '免費（建議捐獻）',
    opening_hours: { 
      daily: '06:00-18:00',
      mass: '週日多場彌撒'
    }
  },
  '舊城區': {
    description: '《舊城區Kota Tua》保留荷蘭殖民時期建築，法塔希拉廣場周邊博物館、咖啡館、古董店林立。租賃彩繪自行車遊覽、品嚐印尼傳統小吃、拍攝復古建築，週末街頭藝人表演熱鬧。雖有些老舊但充滿歷史韻味，是了解雅加達過去的時光隧道。',
    ticket_price: '免費（博物館另計Rp 5,000-10,000）',
    opening_hours: { daily: '全天（博物館09:00-15:00，週一休）' }
  },
  '法塔希拉廣場': {
    description: '《法塔希拉廣場Fatahillah Square》是雅加達舊城區心臟，荷蘭殖民時期Town Hall改建為雅加達歷史博物館。廣場周圍咖啡博物館、wayang博物館、美術陶瓷博物館環繞，彩繪自行車出租、街頭藝人表演，週末特別熱鬧，是體驗雅加達歷史文化的起點。',
    ticket_price: '免費（博物館Rp 5,000）',
    opening_hours: { daily: '全天（博物館週一休）' }
  },
  '印尼國家博物館': {
    description: '《印尼國家博物館Museum Nasional》收藏超過18萬件文物，從史前化石、印度教佛教雕像、傳統織品到金銀器皿，展現印尼千年文明。建築本身是荷蘭殖民時期遺產，豐富館藏與專業導覽，是了解印尼多元文化與歷史的最佳場所。',
    ticket_price: '成人Rp 10,000',
    opening_hours: { 
      tue_sun: '08:00-16:00',
      monday: '休館'
    }
  },
  '千島群島': {
    description: '《千島群島Kepulauan Seribu》由110座小島組成，位於雅加達北方海域。清澈海水、珊瑚礁、白沙灘，是雅加達人週末度假勝地。Pramuka島浮潛、Tidung島Love Bridge、Pari島悠閒，快艇或船程1-3小時可達。逃離城市喧囂，享受熱帶海島寧靜。',
    ticket_price: '渡輪Rp 50,000-150,000（快艇更貴）',
    opening_hours: { daily: '建議避開雨季11-3月' }
  },
  '安佐爾夢幻樂園': {
    description: '《安佐爾夢幻樂園Taman Impian Jaya Ancol》是雅加達最大綜合娛樂區，包含主題樂園Dufan、水族館Sea World、海洋公園、沙灘與酒店。刺激遊樂設施、海豚表演、人造沙灘戲水，適合家庭一日遊。夜晚海灣夜景與煙火秀，是雅加達市民休閒首選。',
    ticket_price: '套票Rp 200,000-450,000（含多園區）',
    opening_hours: { 
      weekday: '10:00-18:00',
      weekend: '10:00-20:00'
    }
  },
  
  // === 日惹 Yogyakarta ===
  '婆羅浮屠': {
    description: '《婆羅浮屠Borobudur》建於8-9世紀，世界最大佛教寺廟建築群，UNESCO世界遺產。九層方形與圓形平台象徵佛教宇宙觀，504尊佛像、2,672塊浮雕述說佛陀一生。日出時分，薄霧中的鐘形佛塔與遠山剪影，展現千年信仰與建築奇蹟的永恆之美。',
    ticket_price: '外國遊客US$25-30（含日出票更高）',
    opening_hours: { 
      sunrise: '04:30-06:30',
      regular: '06:30-17:00'
    }
  },
  '婆羅浮屠日出': {
    description: '《婆羅浮屠日出體驗》是終生難忘的靈性之旅。凌晨登上千年佛塔，薄霧中等待第一道曙光，鐘形佛塔剪影與遠方火山群逐漸清晰，金光灑落浮雕與佛像，寧靜莊嚴震撼人心。遊客較少、氛圍更純粹，是攝影師與文化愛好者的朝聖體驗。',
    ticket_price: 'US$40-50（需提前預約）',
    opening_hours: { sunrise: '04:30入場（需在06:30前離開主要平台）' }
  },
  '普蘭巴南': {
    description: '《普蘭巴南Prambanan》建於9世紀，印度教寺廟群，與婆羅浮屠齊名的爪哇文化瑰寶。主塔高47公尺供奉濕婆神，精緻石雕描繪羅摩衍那史詩。夕陽時分，尖塔剪影與金色天空交織，偶有傳統舞蹈表演於寺前上演，古文明與藝術在此交融。',
    ticket_price: '外國遊客US$25（含舞蹈表演更高）',
    opening_hours: { 
      daily: '06:00-17:00',
      dance: '19:30-21:30（週二四六）'
    }
  },
  '日惹蘇丹王宮': {
    description: '《日惹蘇丹王宮Kraton Yogyakarta》建於18世紀，至今仍有蘇丹居住的活王宮。爪哇傳統建築、金色裝飾、皇室收藏展示，見證日惹王朝歷史。每日傳統gamelan音樂演奏、皇家衛兵換崗儀式，是了解爪哇文化與皇室傳統的珍貴窗口。',
    ticket_price: '成人Rp 15,000（導遊建議）',
    opening_hours: { 
      daily: '08:00-14:00',
      friday: '僅上午開放'
    }
  },
  '馬里奧波羅大街': {
    description: '《馬里奧波羅大街Malioboro》是日惹最熱鬧的商業街，傳統batik布料、銀飾、皮革製品、紀念品琳瑯滿目。街頭小吃gudeg、sate、bakpia，人力車becak穿梭，街頭藝人表演。夜晚攤販擺滿街道，討價還價聲此起彼落，是體驗爪哇市井生活的最佳場所。',
    ticket_price: '免費',
    opening_hours: { daily: '全天（夜市18:00-23:00最熱鬧）' }
  },
  '默拉皮火山': {
    description: '《默拉皮火山Mount Merapi》是印尼最活躍火山之一，海拔2,930公尺。凌晨登山觀日出，火山口噴發蒸氣、熔岩痕跡震撼。Jeep lava tour探訪2010年噴發遺址、廢棄村莊、火山博物館，了解火山威力與災後重建。刺激與教育兼具的冒險體驗。',
    ticket_price: 'Jeep Tour約Rp 350,000-500,000/人（登山導遊另計）',
    opening_hours: { 
      jeep_tour: '05:00-16:00',
      summit_trek: '需確認火山活動狀態'
    }
  },
  '水宮': {
    description: '《水宮Taman Sari》建於18世紀，蘇丹的皇家花園與浴場。地下隧道、泳池、冥想塔、清真寺遺址，展現爪哇建築智慧。如今部分區域住滿居民，形成獨特的宮殿村落融合景觀。參觀需導遊解說才能了解建築用途與歷史故事。',
    ticket_price: '成人Rp 15,000（導遊Rp 50,000）',
    opening_hours: { daily: '09:00-15:00' }
  },
  '水之宮殿': {
    description: '《水之宮殿Taman Sari》（同水宮）是日惹蘇丹的私人休憩地，精緻泳池、地下通道、瞭望塔、清真寺構成複雜建築群。荷蘭殖民破壞後部分荒廢，如今與民居共生。建築細節、歷史故事需導遊講解，是了解爪哇皇室生活與建築藝術的隱藏寶藏。',
    ticket_price: '成人Rp 15,000',
    opening_hours: { daily: '09:00-15:00' }
  },
  
  // === 其他類別 ===
  '峇里島傳統舞蹈': {
    description: '峇里島傳統舞蹈融合印度教神話、gamelan音樂與精緻服飾，展現獨特藝術魅力。Kecak火舞、Legong宮廷舞、Barong善惡之戰，每種舞蹈都有深刻文化內涵。在烏布皇宮、烏魯瓦圖廟等地夜間表演，是體驗峇里島文化精髓的必看節目。',
    ticket_price: 'Rp 80,000-150,000',
    opening_hours: { evening: '19:00-21:00（各場地不同）' }
  },
  '爪哇傳統蠟染': {
    description: '《爪哇蠟染Batik》是印尼UNESCO非物質文化遺產，手工繪蠟、染色、煮沸工序繁複。參加batik工作坊，親手在布料上繪製圖案、浸染、完成獨一無二作品。了解圖騰象徵意義、傳統技法傳承，是深度體驗爪哇文化的手作旅程。',
    ticket_price: '工作坊Rp 150,000-300,000/人',
    opening_hours: { workshop: '需提前預約' }
  },
  '皮影戲表演': {
    description: '《皮影戲Wayang Kulit》是爪哇傳統藝術，真皮雕刻的人偶配合gamelan音樂與說書人演繹史詩故事。燈光投影、人偶舞動、音樂節奏構成獨特視聽體驗。在日惹、梭羅等地可觀賞完整表演，了解爪哇古老說故事傳統與文化智慧。',
    ticket_price: 'Rp 50,000-100,000',
    opening_hours: { performance: '20:00-22:00（需查詢場地）' }
  },
  '烹飪課程': {
    description: '參加峇里島或日惹烹飪課程，從傳統市場採買香料、蔬菜開始，學習製作nasi goreng、rendang、satay、gado-gado等印尼經典菜色。專業廚師指導、實作體驗、品嚐成果，課程結束獲得食譜與證書。美食與文化結合的深度旅遊體驗。',
    ticket_price: 'Rp 350,000-600,000/人',
    opening_hours: { class: '需提前預約（通常09:00-14:00）' }
  },
  '印尼炒飯': {
    description: '《印尼炒飯Nasi Goreng》是國民美食，蝦醬、甜醬油、辣椒、蒜頭炒飯，搭配煎蛋、蝦餅、黃瓜、炸蝦。從路邊攤到高級餐廳都有，各家秘方不同。推薦清晨或深夜品嚐街頭版本，配上熱甜茶，體驗最道地的印尼庶民美味。',
    ticket_price: 'Rp 15,000-50,000',
    opening_hours: { street_food: '全天（宵夜攤最經典）' }
  },
  '髒鴨飯': {
    description: '《髒鴨飯Bebek Goreng》是峇里島與爪哇特色料理，鴨肉經香料醃製、蒸煮後油炸至酥脆，搭配sambal辣醬、白飯、炸豆腐豆餅、青菜。外皮金黃酥脆、肉質軟嫩多汁，是印尼人慶祝聚餐的首選菜色，烏布Bebek Bengil最負盛名。',
    ticket_price: 'Rp 60,000-120,000',
    opening_hours: { restaurant: '11:00-22:00' }
  },
  '豬肋排': {
    description: '峇里島獨特的烤豬肋排Babi Guling，全豬香料醃製後炭火慢烤，外皮酥脆、肉質軟嫩、香料滲透。搭配米飯、蔬菜、血腸、內臟，風味豐富。烏布Ibu Oka最知名，當地人排隊名店，是峇里島必吃美食體驗。',
    ticket_price: 'Rp 40,000-80,000',
    opening_hours: { local_warung: '11:00-20:00（售完為止）' }
  },
  '峇里島動物園': {
    description: '《峇里島動物園Bali Zoo》位於Gianyar，熱帶雨林環境中飼養超過500隻動物。大象騎乘與互動、猩猩早餐、夜間動物園Safari，適合親子同遊。動物福利受關注，近年加強保育教育，是寓教於樂的家庭活動選擇。',
    ticket_price: '成人Rp 120,000-180,000（含活動更高）',
    opening_hours: { daily: '09:00-17:00（夜間Safari另計）' }
  },
  '峇里島野生動物園': {
    description: '《峇里島野生動物園Bali Safari Park》結合動物園與海洋公園，Safari巴士穿越非洲草原、印度森林區，獅子、老虎、大象、長頸鹿近距離觀賞。水上樂園、動物表演、夜間Safari，設施豐富適合全家大小，是峇里島最大動物主題樂園。',
    ticket_price: 'Rp 450,000-1,200,000（套票含多項目）',
    opening_hours: { daily: '09:00-17:00' }
  },
  '四季峇里烏布': {
    description: '《四季峇里烏布Four Seasons Ubud》隱於Ayung河谷雨林，Villa配私人泳池、蓮花池景，融入自然卻不失奢華。Spa療程、瑜伽課程、稻田單車遊，結合峇里島文化體驗。服務細膩、隱私極佳，適合蜜月或高端度假需求。',
    ticket_price: '房價約US$600起/晚',
    opening_hours: { daily: '24小時服務' }
  },
  '四季峇里金巴蘭': {
    description: '《四季峇里金巴蘭Four Seasons Jimbaran》坐擁金巴蘭灣海景，Villa配無邊際泳池、戶外浴缸，面向大海與日落。Sundara Beach Club、Spa療程、水上活動，奢華與海灘度假結合。適合追求頂級服務與海景體驗的旅人。',
    ticket_price: '房價約US$700起/晚',
    opening_hours: { daily: '24小時服務' }
  },
  '安縵達里': {
    description: '《安縵達里Amandari》位於烏布Ayung河谷，採用傳統峇里島村落設計，梯田景觀、infinity泳池與自然共生。極簡奢華、服務隱形卻無微不至，安縵系列標誌性寧靜氛圍。適合追求靈性與自然結合的高端旅人。',
    ticket_price: '房價約US$900起/晚',
    opening_hours: { daily: '24小時服務' }
  },
  '安縵吉沃': {
    description: '《安縵吉沃Amangiri》【註：此為美國猶他州度假村，非印尼景點】若指峇里島Amanusa，則：海景Villa、高爾夫球場、Nusa Dua寧靜位置，安縵系列精緻服務與峇里島文化結合，適合追求極致隱私與品味的度假體驗。',
    ticket_price: '房價約US$800起/晚',
    opening_hours: { daily: '24小時服務' }
  },
  '寶格麗峇里島': {
    description: '《寶格麗峇里島Bulgari Bali》位於烏魯瓦圖懸崖，Villa配私人泳池俯瞰印度洋。義大利設計與峇里島文化融合，Il Ristorante餐廳、Spa療程、Beach Club，奢華細膩。適合追求設計感與海景的高端旅人。',
    ticket_price: '房價約US$1,200起/晚',
    opening_hours: { daily: '24小時服務' }
  },
  '虹夕諾雅峇里': {
    description: '《虹夕諾雅峇里Hoshinoya Bali》位於烏布Pakerisan河谷，日式待客之道與峇里島文化結合。運河Villa、梯田景觀、private spa、瑜伽課程，寧靜奢華。適合追求東方禪意與峇里島靈性結合的度假體驗。',
    ticket_price: '房價約US$900起/晚',
    opening_hours: { daily: '24小時服務' }
  },
  '烏布空中花園': {
    description: '《烏布空中花園Hanging Gardens of Bali》擁有峇里島最經典的infinity雙層泳池，俯瞰雨林峽谷與遠方火山。Villa隱於樹林間、私密性極高，服務精緻、餐飲優質，是蜜月與高端度假首選，泳池景觀曾被評為世界最美泳池之一。',
    ticket_price: '房價約US$500起/晚',
    opening_hours: { daily: '24小時服務' }
  },
  '聖猴森林': {
    description: '《聖猴森林Sacred Monkey Forest》位於烏布，超過700隻長尾獼猴在古廟與榕樹間自由穿梭。石雕神像、苔蘚石階與猴群互動構成獨特體驗，但需小心保管隨身物品。熱帶雨林氛圍濃厚，是了解峇里島人與自然共生哲學的活教材。',
    ticket_price: '成人Rp 80,000',
    opening_hours: { daily: '09:00-18:00' }
  },
  '烏布SPA': {
    description: '烏布是峇里島SPA天堂，從平價按摩到頂級Spa villa選擇豐富。傳統峇里島按摩、花瓣浴、精油療程、熱石按摩，結合自然環境與專業手法。推薦Karsa Spa雨林景觀、Taksu Spa高性價比、酒店內Spa極致奢華，是放鬆身心的必體驗。',
    ticket_price: 'Rp 150,000-800,000（視等級）',
    opening_hours: { daily: '09:00-22:00（需預約）' }
  },
  '佩尼達島': {
    description: '《佩尼達島Nusa Penida》（同佩妮達島）位於峇里島東南方，保留原始粗獷之美。Kelingking Beach「暴龍灣」斷崖如恐龍側影，Angel Billabong天然無邊際泳池，Broken Beach拱門海蝕洞震撼人心。陡峭山路、未開發海岸充滿冒險感，適合熱愛秘境探險的旅人。',
    ticket_price: '渡輪往返Rp 150,000-250,000',
    opening_hours: { daily: '全天開放（建議08:00-16:00）' }
  },
  '天空之門': {
    description: '《天空之門Pura Lempuyang》位於峇里島東部Lempuyang山，石雕分裂門框住阿貢火山與雲海，是峇里島最經典拍照點。登上1,700階石梯才能抵達主廟，沿途7座寺廟、雲霧繚繞，靈性與美景兼具。需耐心排隊等鏡面反射效果（實為鏡子道具）。',
    ticket_price: '捐獻制（建議Rp 30,000-50,000）',
    opening_hours: { daily: '07:00-19:00' }
  }
};

// 菲律賓景點資料庫（精選重點景點）
const philippinesDescriptions = {
  // === 長灘島 Boracay ===
  'Crimson Boracay': {
    description: '《Crimson Boracay》坐落於Station Zero寧靜海岸，遠離White Beach熱鬧人潮卻保有便利性。無邊際泳池面向大海，私人沙灘、水上活動、SPA設施完善。現代設計融入熱帶風情，適合情侶度假或家庭出遊，享受長灘島精緻度假體驗。',
    ticket_price: '房價約₱8,000起/晚',
    opening_hours: { daily: '24小時入住服務' }
  },
  'D Mall': {
    description: '《D Mall》是長灘島最熱鬧的購物餐飲集散地，位於Station 2黃金地段。上百家商店、餐廳、按摩店、紀念品舖集中於此，從平價小吃到海景餐廳選擇豐富。夜晚燈火通明、音樂環繞，是島上社交中心與覓食首選，逛街購物一站滿足。',
    ticket_price: '免費進入',
    opening_hours: { daily: '10:00-23:00（店家營業時間不一）' }
  },
  "D'Mall": {
    description: '《D\'Mall》是長灘島最熱鬧的購物餐飲集散地，位於Station 2黃金地段。上百家商店、餐廳、按摩店、紀念品舖集中於此，從平價小吃到海景餐廳選擇豐富。夜晚燈火通明、音樂環繞，是島上社交中心與覓食首選，逛街購物一站滿足。',
    ticket_price: '免費進入',
    opening_hours: { daily: '10:00-23:00（店家營業時間不一）' }
  },
  'D\'Mall購物區': {
    description: '《D\'Mall購物區》是長灘島最熱鬧的商業中心，從紀念品、服飾、按摩到餐廳應有盡有。平價連鎖餐廳、本地小吃攤、海鮮BBQ、國際料理齊聚，夜晚人聲鼎沸、燈火璀璨。適合逛街購物、覓食、體驗長灘島熱鬧夜生活，是遊客必訪之地。',
    ticket_price: '免費進入',
    opening_hours: { daily: '10:00-23:00' }
  },
  'Discovery Shores': {
    description: '《Discovery Shores Boracay》位於White Beach黃金地段，Villa式套房配管家服務，質感設計與海灘度假結合。私人沙灘區、無邊際泳池、Sand Bar海灘餐廳，服務細膩、隱私極佳，適合追求精品度假的旅人。',
    ticket_price: '房價約₱12,000起/晚',
    opening_hours: { daily: '24小時服務' }
  },
  '白沙灘': {
    description: '《白沙灘White Beach》綿延4公里，細軟如麵粉的白沙與碧藍海水是長灘島招牌。依Station 1/2/3分區，1號寧靜高級、2號熱鬧便利、3號平價年輕。日落時分橘紅天空與帆船剪影詩意動人，是世界最美海灘之一，長灘島的靈魂所在。',
    ticket_price: '免費',
    opening_hours: { daily: '全天開放' }
  },
  '長灘島白沙灘': {
    description: '《長灘島白沙灘White Beach》綿延4公里，細軟如麵粉的白沙與碧藍海水是長灘島招牌。依Station 1/2/3分區，1號寧靜高級、2號熱鬧便利、3號平價年輕。日落時分橘紅天空與帆船剪影詩意動人，是世界最美海灘之一，長灘島的靈魂所在。',
    ticket_price: '免費',
    opening_hours: { daily: '全天開放' }
  },
  '普卡海灘': {
    description: '《普卡海灘Puka Beach》位於長灘島北端，保留原始寧靜氛圍。沙灘由貝殼碎片組成，海水清澈、遊客稀少，適合逃離White Beach人潮。可撿拾puka貝殼製作飾品，周邊餐廳提供海鮮BBQ，是體驗長灘島純樸一面的秘境海灘。',
    ticket_price: '免費',
    opening_hours: { daily: '全天開放' }
  },
  '長灘島日落帆船': {
    description: '《長灘島日落帆船Sunset Sailing》是島上經典體驗，傳統Paraw帆船乘風出海，橘紅夕陽灑落海面，船身剪影與天空交融。微風、海浪、落日餘暉，浪漫氛圍滿分，適合情侶或家庭共享，是長灘島必體驗活動之一。',
    ticket_price: '₱500-800/人（約1-1.5小時）',
    opening_hours: { sunset: '17:00-18:30出發' }
  },
  '風帆日落': {
    description: '《風帆日落Sunset Paraw》搭乘菲律賓傳統雙桅帆船出海，乘風破浪欣賞長灘島日落。橘紅天空、帆船剪影、海浪聲與微風，構成詩意畫面。船家通常提供飲料與音樂，氛圍輕鬆浪漫，是長灘島必體驗的經典活動。',
    ticket_price: '₱500-800/人',
    opening_hours: { sunset: '17:00-18:30' }
  },
  '風帆體驗': {
    description: '搭乘長灘島傳統Paraw風帆出海，感受菲律賓航海文化。白日體驗乘風破浪、欣賞海岸線，日落時段則是浪漫氛圍滿分。船家提供飲料、音樂，適合家庭或情侶同遊，是長灘島海上活動代表。',
    ticket_price: '₱500-1,000/人（視時段）',
    opening_hours: { daily: '08:00-18:30' }
  },
  '落日風帆': {
    description: '《落日風帆Sunset Sailing》是長灘島最浪漫的海上體驗，傳統Paraw帆船迎風出航，夕陽餘暉灑落海面，天空從藍色漸變至橘紅金黃。海風、浪花、帆船搖曳，適合蜜月情侶或家庭共享，是長灘島必體驗的經典活動。',
    ticket_price: '₱500-800/人',
    opening_hours: { sunset: '17:00-18:30' }
  },
  '香蕉船': {
    description: '《香蕉船Banana Boat》是長灘島熱門水上活動，快艇拖曳香蕉型充氣艇高速前進，急轉彎、跳躍、翻覆落水刺激有趣。適合團體同樂、家庭親子，歡笑尖叫聲此起彼落，是White Beach水上活動代表之一。',
    ticket_price: '₱400-600/人（約15-20分鐘）',
    opening_hours: { daily: '08:00-17:00' }
  },
  '飛魚體驗': {
    description: '《飛魚體驗Flying Fish》趴在魚型充氣艇上，快艇高速拖曳產生氣流使其「飛」離水面，刺激程度高於香蕉船。適合追求刺激的年輕旅客，需穿著救生衣、有教練陪同，是長灘島水上活動中最驚險的選擇。',
    ticket_price: '₱800-1,200/人',
    opening_hours: { daily: '08:00-17:00' }
  },
  '香格里拉長灘島': {
    description: '《香格里拉長灘島Shangri-La Boracay》位於島北端Punta Bunga，獨立於White Beach喧囂之外。私人海灘、CHI Spa、兒童俱樂部、水上活動中心，設施完善服務優質。適合家庭度假或追求高端隱私的旅人，享受長灘島寧靜奢華一面。',
    ticket_price: '房價約₱15,000起/晚',
    opening_hours: { daily: '24小時服務' }
  },
  'Henann度假村': {
    description: '《Henann度假村系列》在長灘島擁有多家連鎖酒店，從平價到高端選擇豐富。位於White Beach黃金地段，泳池、餐廳、Spa設施齊全，性價比高、服務穩定。適合預算有限但追求便利與品質的旅客，是長灘島熱門住宿選擇。',
    ticket_price: '房價約₱4,000起/晚',
    opening_hours: { daily: '24小時服務' }
  },
  
  // === 巴拉望 Palawan ===
  '愛妮島': {
    description: '《愛妮島El Nido》位於巴拉望北端，石灰岩峭壁、隱密潟湖、珊瑚海灘構成菲律賓最美海島風光。跳島遊（Island Hopping）探訪Big Lagoon、Secret Beach、七號礁岩，浮潛邂逅海龜、熱帶魚群。日落時分，金光灑落海面，漁船剪影詩意動人。',
    ticket_price: '環境稅₱200，跳島Tour約₱1,200-1,800',
    opening_hours: { daily: '08:00-17:00（跳島團出發時間）' }
  },
  '科隆島': {
    description: '《科隆島Coron》以二戰沉船潛水與絕美湖泊聞名。Kayangan Lake鏡面倒影、Twin Lagoon雙子潟湖、Siete Pecados七子礁浮潛勝地，海水透明度驚人。攀上觀景台俯瞰石灰岩島嶼群，層次分明的藍綠色海面，是潛水愛好者與冒險家的夢幻目的地。',
    ticket_price: '環境稅₱200，跳島Tour約₱1,500-2,000',
    opening_hours: { daily: '07:00-17:00（跳島團出發時間）' }
  },
  '凱央根湖': {
    description: '《凱央根湖Kayangan Lake》被譽為菲律賓最乾淨的湖泊，攀登300階石梯後，湖光山色與石灰岩峭壁倒影震撼登場。湖水清澈見底，上層淡水、下層海水的溫躍層造成獨特潛水體驗。觀景台俯瞰科隆全景，是IG打卡聖地與浮潛天堂。',
    ticket_price: '環境稅₱200（含跳島Tour）',
    opening_hours: { daily: '08:00-16:00' }
  },
  '雙子潟湖': {
    description: '《雙子潟湖Twin Lagoon》由兩座潟湖透過狹窄岩洞相連，退潮時需游泳穿過，漲潮時攀爬木梯翻越。湖水溫躍層分明，上層溫暖下層冰涼，浮潛體驗奇特。石灰岩峭壁環繞、陽光灑落湖面，是科隆島跳島行程的經典景點。',
    ticket_price: '₱200環境稅（含跳島Tour）',
    opening_hours: { daily: '08:00-16:00' }
  },
  '七子島': {
    description: '《七子礁Siete Pecados》由七座珊瑚礁構成，科隆島最佳浮潛點之一。海水清澈、珊瑚群豐富、熱帶魚群環繞，海龜、獅子魚、小丑魚常見。浮潛難度低適合初學者，是跳島Tour必訪景點，水下世界色彩繽紛令人驚艷。',
    ticket_price: '₱200環境稅（含跳島Tour）',
    opening_hours: { daily: '08:00-16:00' }
  },
  '巴拉庫達湖': {
    description: '《巴拉庫達湖Barracuda Lake》以獨特的溫躍層聞名，湖底溫泉使水溫達38°C，潛水時彷彿穿越冷熱邊界。石灰岩峭壁環繞、湖水碧綠，適合進階潛水者探索。攀登入口石階、下潛溫躍層，是科隆島最特殊的潛水體驗。',
    ticket_price: '₱200環境稅+潛水費',
    opening_hours: { daily: '08:00-16:00（需潛水證照）' }
  },
  '沉船潛點': {
    description: '科隆海域擁有12艘二戰日軍沉船，是世界頂級沉船潛水勝地。Irako號、Okikawa Maru號等保存完好，魚群、珊瑚覆蓋艦體，潛入歷史場景震撼人心。適合持照潛水員，能見度高、水溫適中，是潛水愛好者的朝聖地。',
    ticket_price: '雙瓶潛水約₱3,500-5,000',
    opening_hours: { daily: '需提前預約潛水中心' }
  },
  '公主港地下河': {
    description: '《公主港地下河Puerto Princesa Underground River》是UNESCO世界遺產，8.2公里地下河流穿越石灰岩洞，鐘乳石、石筍、岩層構成奇幻地下世界。搭船進入洞穴，導覽解說地質奇觀，是巴拉望必訪自然景觀，需提前預約門票。',
    ticket_price: '₱500-800（含船票/導覽）',
    opening_hours: { daily: '08:00-16:00（需預約）' }
  },
  '本田灣': {
    description: '《本田灣Honda Bay》位於公主港外海，跳島遊探訪Starfish Island、Cowrie Island、Luli Island等小島。海星散佈沙灘、浮潛賞魚、沙洲漲退潮奇觀，適合家庭輕鬆跳島。比El Nido更平易近人，是公主港周邊熱門一日遊選擇。',
    ticket_price: '跳島Tour約₱1,200-1,500/人',
    opening_hours: { daily: '08:00-16:00' }
  },
  '納克潘海灘': {
    description: '《納克潘海灘Nacpan Beach》綿延4公里的新月形金色沙灘，椰樹搖曳、海水碧藍，保留純樸風情。遊客較El Nido鎮少，適合悠閒漫步、發呆、欣賞夕陽。周邊簡易餐廳提供新鮮海鮮，是愛妮島區域最美海灘之一。',
    ticket_price: '免費',
    opening_hours: { daily: '全天開放' }
  },
  '大潟湖': {
    description: '《大潟湖Big Lagoon》被石灰岩峭壁環繞，翡翠綠海水平靜如鏡。划kayak穿梭峭壁間、陽光灑落水面，景色如夢似幻。是El Nido跳島Tour A的經典景點，IG網美必拍地標，水質清澈、氛圍寧靜，展現巴拉望原始之美。',
    ticket_price: '₱200環境稅+Tour費',
    opening_hours: { daily: '08:00-17:00' }
  },
  '小潟湖': {
    description: '《小潟湖Small Lagoon》需穿越狹窄岩洞進入，內部別有洞天。Kayak划行於峭壁間、或浮潛探索水下世界，石灰岩倒影與碧綠海水構成絕美畫面。比Big Lagoon更隱密、更寧靜，是El Nido跳島行程的夢幻秘境。',
    ticket_price: '₱200環境稅+Tour費',
    opening_hours: { daily: '08:00-17:00' }
  },
  '神秘海灘': {
    description: '《神秘海灘Secret Beach》隱藏於石灰岩洞穴後方，需穿越狹窄岩縫才能進入。內部小型沙灘被峭壁環繞，陽光從頂端灑落，氛圍神秘夢幻。漲潮時需游泳進出，是El Nido最具冒險感的秘境景點，限人數控管保有純淨。',
    ticket_price: '₱200環境稅+Tour費',
    opening_hours: { daily: '08:00-17:00（視潮汐）' }
  },
  '直升機島': {
    description: '《直升機島Helicopter Island》因外型似直升機停機坪而得名，石灰岩峭壁聳立、沙灘細軟。浮潛賞珊瑚與熱帶魚、或在沙灘曬太陽，是El Nido跳島Tour C的熱門停靠點。遊客較少、氛圍悠閒，適合放空發呆享受海島時光。',
    ticket_price: '₱200環境稅+Tour費',
    opening_hours: { daily: '08:00-17:00' }
  },
  '珊瑚花園': {
    description: '《珊瑚花園Coral Garden》是El Nido與Coron周邊浮潛熱點，色彩繽紛的硬珊瑚與軟珊瑚覆蓋海床，熱帶魚群穿梭其間。適合浮潛初學者，水深適中、能見度高，是認識海洋生態的最佳教室，跳島行程必訪浮潛點。',
    ticket_price: '含Tour費（約₱1,200-1,800）',
    opening_hours: { daily: '08:00-17:00' }
  },
  '跳島遊': {
    description: '巴拉望跳島遊（Island Hopping）是體驗菲律賓海島精華的最佳方式。El Nido有Tour A/B/C/D四條經典路線，Coron則有湖泊與沉船主題。螃蟹船穿梭秘境海灘、潟湖、浮潛點，享用船上午餐、欣賞石灰岩奇景，是巴拉望必體驗活動。',
    ticket_price: '₱1,200-2,000/人（視路線）',
    opening_hours: { daily: '08:00-17:00' }
  },
  
  // === 薄荷島 Bohol ===
  '巧克力山': {
    description: '《巧克力山Chocolate Hills》由1,268座圓錐形山丘組成，每座高達120公尺。乾季時草地轉為棕色，遠看如同灑落大地的巧克力球，是菲律賓最獨特的地質奇觀。登上觀景台俯瞰綿延山丘，震撼壯麗，被列為菲律賓國家地質紀念物。',
    ticket_price: '₱50',
    opening_hours: { daily: '08:00-18:00' }
  },
  '巧克力山觀景台': {
    description: '《巧克力山觀景台》攀登214階石梯登頂，360度俯瞰1,268座圓錐山丘綿延至地平線。清晨薄霧或夕陽時分最美，乾季草地轉褐色如巧克力，雨季則是翠綠地毯。是薄荷島必訪地標，攝影師與IG網美朝聖地。',
    ticket_price: '₱50',
    opening_hours: { daily: '08:00-18:00' }
  },
  '薄荷島巧克力山': {
    description: '《薄荷島巧克力山》是菲律賓地質奇蹟，1,268座對稱圓錐山丘均勻分布，成因仍有爭議。乾季草地枯黃如巧克力，雨季翠綠如抹茶，四季景色各異。搭配眼鏡猴保護區、羅博河遊船，是薄荷島一日遊經典行程。',
    ticket_price: '₱50',
    opening_hours: { daily: '08:00-18:00' }
  },
  '眼鏡猴': {
    description: '《眼鏡猴Tarsier》是世界最小靈長類動物之一，體長僅10-15公分，巨大眼睛佔臉部一半。菲律賓特有種、瀕危保育類，薄荷島保護區可近距離觀察。白日休息、夜間活動，參觀需保持安靜避免驚擾，是薄荷島獨特生態體驗。',
    ticket_price: '₱60',
    opening_hours: { daily: '09:00-16:00' }
  },
  '眼鏡猴保護區': {
    description: '《眼鏡猴保護區Philippine Tarsier Sanctuary》位於Corella鎮，半野生環境保育瀕危眼鏡猴。木棧道穿梭林間，導覽員指引觀察樹上休息的小傢伙，巨眼、靈活頸部、纖細手指令人驚嘆。嚴禁閃光燈與大聲喧嘩，是體驗生態保育教育的最佳場所。',
    ticket_price: '₱60',
    opening_hours: { daily: '09:00-16:00' }
  },
  '薄荷島眼鏡猴': {
    description: '薄荷島是菲律賓眼鏡猴主要棲息地，這種世界最小靈長類動物以巨眼、360度旋轉頭部著稱。參觀保護區可近距離觀察，了解保育工作與生態習性。配合巧克力山、羅博河遊船，是薄荷島一日遊必訪行程。',
    ticket_price: '₱60',
    opening_hours: { daily: '09:00-16:00' }
  },
  '羅博河': {
    description: '《羅博河Loboc River》蜿蜒穿越薄荷島雨林，搭乘漂流竹筏餐廳遊船，享用自助午餐配傳統樂隊現場演奏。椰林、吊橋、瀑布沿岸，船上歌舞表演、岸邊村民揮手，氛圍悠閒歡樂。是薄荷島經典體驗，適合家庭與團體同遊。',
    ticket_price: '₱450-600/人（含午餐）',
    opening_hours: { daily: '11:00-14:00（午餐時段）' }
  },
  '羅博河遊船': {
    description: '《羅博河遊船Loboc River Cruise》搭乘漂流餐廳竹筏，沿河欣賞熱帶雨林景色，船上享用菲律賓自助餐、樂隊現場演奏民謠。途經瀑布、吊橋、村落，岸邊兒童歌舞迎接，氛圍溫馨歡樂。是薄荷島必體驗活動，適合全家同遊。',
    ticket_price: '₱450-600/人（含午餐）',
    opening_hours: { daily: '11:00-14:00' }
  },
  '薄荷島羅博河遊船': {
    description: '薄荷島羅博河遊船是結合美景、美食與音樂的獨特體驗。漂流竹筏餐廳航行於雨林河道，自助餐、現場樂隊、岸邊舞蹈表演，營造歡樂氛圍。配合巧克力山、眼鏡猴行程，是薄荷島一日遊經典組合。',
    ticket_price: '₱450-600/人',
    opening_hours: { daily: '11:00-14:00' }
  },
  '漂流竹筏屋': {
    description: '羅博河漂流竹筏屋是薄荷島特色體驗，竹筏改裝成漂流餐廳，船上享用自助餐、樂隊現場演奏。沿河欣賞雨林、瀑布、吊橋，岸邊村民歌舞迎接，氛圍歡樂溫馨。適合家庭、團體同遊，是薄荷島必體驗活動。',
    ticket_price: '₱450-600/人',
    opening_hours: { daily: '11:00-14:00' }
  },
  '巴里卡薩島': {
    description: '《巴里卡薩島Balicasag Island》是薄荷島外海珊瑚礁保護區，潛水與浮潛天堂。海龜、Jack魚風暴、豐富珊瑚礁，能見度極高。沙灘細白、海水碧藍，跳島行程必訪。搭配處女島沙洲，是薄荷島海洋體驗精華。',
    ticket_price: '跳島Tour約₱1,500-2,000/人',
    opening_hours: { daily: '08:00-16:00' }
  },
  '處女島': {
    description: '《處女島Virgin Island》是薄荷島外海長條形沙洲，漲潮時幾乎被淹沒、退潮時露出新月形白沙。海水清澈、遊客可赤腳漫步沙洲、拍照打卡。周邊海鮮BBQ攤販、浮潛租借，是邦勞島跳島Tour的經典景點。',
    ticket_price: '跳島Tour約₱1,500/人',
    opening_hours: { daily: '視潮汐（退潮時最佳）' }
  },
  '邦勞島': {
    description: '《邦勞島Panglao Island》透過橋樑與薄荷島主島相連，擁有阿羅娜海灘等優質海灘與度假村。白沙、清澈海水、浮潛、潛水資源豐富，巴里卡薩島、處女島跳島Tour從此出發。是薄荷島住宿與海灘度假首選基地。',
    ticket_price: '免費',
    opening_hours: { daily: '全天' }
  },
  '阿羅娜海灘': {
    description: '《阿羅娜海灘Alona Beach》是邦勞島最熱鬧的海灘區，白沙綿延、海水清澈，潛水中心、度假村、餐廳、按摩店林立。夜晚沙灘酒吧音樂、海鮮BBQ，氛圍熱鬧。是邦勞島住宿、用餐、跳島出發的中心地帶。',
    ticket_price: '免費',
    opening_hours: { daily: '全天' }
  },
  '邦勞島阿羅娜海灘': {
    description: '邦勞島阿羅娜海灘是薄荷島最熱門海灘，白沙、清澈海水、豐富餐飲與住宿選擇。潛水中心提供PADI課程、跳島Tour、浮潛活動。夜晚沙灘酒吧、海鮮BBQ，是薄荷島度假的核心區域。',
    ticket_price: '免費',
    opening_hours: { daily: '全天' }
  },
  '邦勞島白沙灘': {
    description: '邦勞島擁有多處白沙灘，阿羅娜最熱鬧、杜馬勞安較寧靜。細軟白沙、清澈海水、椰樹搖曳，適合日光浴、游泳、浮潛。周邊度假村、餐廳、潛水中心齊全，是薄荷島海灘度假的理想選擇。',
    ticket_price: '免費',
    opening_hours: { daily: '全天' }
  },
  '邦勞島跳島遊': {
    description: '邦勞島跳島遊探訪巴里卡薩島、處女島、海豚追蹤等景點。螃蟹船出海、浮潛賞珊瑚與海龜、沙洲漫步、海鮮午餐，是體驗薄荷島海洋之美的最佳方式。多種行程組合可選，適合家庭與潛水愛好者。',
    ticket_price: '₱1,500-2,000/人',
    opening_hours: { daily: '08:00-16:00' }
  },
  '薄荷島一日遊': {
    description: '薄荷島一日遊經典行程包含巧克力山、眼鏡猴保護區、羅博河遊船、血盟紀念碑、巴卡容教堂。從塔比拉蘭市或邦勞島出發，專車接送、中文導遊，一天走遍薄荷島精華景點，是初訪者的理想選擇。',
    ticket_price: '₱1,500-2,500/人（含午餐/門票）',
    opening_hours: { daily: '08:00-17:00' }
  },
  '血盟紀念碑': {
    description: '《血盟紀念碑Blood Compact Monument》紀念1565年西班牙探險家與當地酋長歃血為盟，象徵菲律賓與西班牙首次友好條約。雕塑呈現雙方飲血酒場景，歷史意義重大。位於薄荷島塔比拉蘭市，是一日遊行程順路景點。',
    ticket_price: '免費',
    opening_hours: { daily: '全天' }
  },
  '巴卡容教堂': {
    description: '《巴卡容教堂Baclayon Church》建於1596年，菲律賓最古老石造教堂之一，巴洛克風格、珊瑚石建材、古老聖物收藏。2013年地震受損後修復，教堂博物館展示殖民時期文物、宗教藝術品，是薄荷島歷史文化見證。',
    ticket_price: '₱50（博物館）',
    opening_hours: { daily: '08:00-17:00' }
  },
  '巴卡永教堂': {
    description: '《巴卡永教堂Baclayon Church》（同巴卡容）建於16世紀，珊瑚石與蛋白為建材，是菲律賓最古老教堂之一。巴洛克風格、古老壁畫、宗教文物，見證西班牙殖民歷史。教堂博物館收藏豐富，是薄荷島文化遺產代表。',
    ticket_price: '₱50',
    opening_hours: { daily: '08:00-17:00' }
  },
  '蜜蜂農場': {
    description: '《蜜蜂農場Bohol Bee Farm》位於邦勞島懸崖邊，有機農場餐廳供應自製蜂蜜、麵包、冰淇淋、有機蔬食。海景餐廳、花園、紀念品店，氛圍悠閒健康。適合早午餐或下午茶，品嚐新鮮有機料理，欣賞海景放鬆身心。',
    ticket_price: '免費進入（消費制）',
    opening_hours: { daily: '08:00-20:00' }
  },
  '希魯通岸礁': {
    description: '《希魯通岸礁Hilutungan Island》位於宿霧麥克坦島外海，海洋保護區擁有豐富珊瑚礁與熱帶魚群。浮潛、潛水體驗佳，海龜、獅子魚、Jack魚群常見。跳島Tour熱門景點，適合家庭與浮潛愛好者，海水清澈能見度高。',
    ticket_price: '跳島Tour約₱1,500/人',
    opening_hours: { daily: '08:00-16:00' }
  },
  '納魯蘇安島': {
    description: '《納魯蘇安島Nalusuan Island》是宿霧外海人工島嶼，長堤延伸至海中、海水清澈見底。浮潛賞珊瑚與熱帶魚、海上平台跳水、發呆放空，跳島Tour熱門停靠點。周邊海洋保護區生態豐富，適合輕鬆海島體驗。',
    ticket_price: '跳島Tour約₱1,500/人',
    opening_hours: { daily: '08:00-16:00' }
  },
  '潘達農島': {
    description: '《潘達農島Pandanon Island》位於薄荷島與宿霧之間，長條形沙洲退潮時露出潔白沙灘。海水碧藍、遊客稀少，適合野餐、游泳、拍照。跳島Tour路線較少包含，保有原始寧靜氛圍，是喜愛秘境海灘的旅人首選。',
    ticket_price: '跳島Tour約₱2,000/人',
    opening_hours: { daily: '視潮汐' }
  },
  '蘇米龍島': {
    description: '《蘇米龍島Sumilon Island》位於宿霧南端，擁有菲律賓首座海洋保護區。沙洲隨潮汐移動、海水漸層藍綠色、珊瑚礁豐富。藍水度假村Bluewater獨佔全島，一日遊可使用沙灘與浮潛設施。配合奧斯洛布鯨鯊行程，是宿霧南部經典路線。',
    ticket_price: '一日遊₱2,000-3,000/人',
    opening_hours: { daily: '08:00-16:00' }
  },
  'Eskaya野奢度假村': {
    description: '《Eskaya野奢度假村》位於薄荷島邦勞，Villa式設計配私人泳池，融合菲律賓傳統建築與現代奢華。面向大海、Spa療程、美食餐廳，隱密性極高服務細膩。適合蜜月或高端度假需求，享受薄荷島寧靜奢華體驗。',
    ticket_price: '房價約₱18,000起/晚',
    opening_hours: { daily: '24小時服務' }
  },
  '亞盧納海灘度假村': {
    description: '《亞盧納海灘度假村Amorita Resort》位於邦勞島阿羅娜海灘，現代設計、無邊際泳池、Spa設施齊全。房間面海、餐廳美食、潛水中心，服務專業性價比高。適合家庭度假或情侶出遊，享受薄荷島精緻海灘體驗。',
    ticket_price: '房價約₱8,000起/晚',
    opening_hours: { daily: '24小時服務' }
  },
  '雙子星度假村': {
    description: '雙子星度假村位於邦勞島，提供舒適住宿與海灘度假設施。泳池、餐廳、Spa、潛水中心齊全，鄰近阿羅娜海灘商圈。性價比高、適合家庭與團體，是薄荷島中階度假選擇。',
    ticket_price: '房價約₱4,000起/晚',
    opening_hours: { daily: '24小時服務' }
  },
  '安巴拉海灣度假村': {
    description: '安巴拉海灣度假村位於薄荷島，提供海景房、泳池、餐廳與潛水服務。鄰近跳島碼頭、交通便利，設施維護良好、服務親切。適合預算有限但追求品質的旅客，是薄荷島住宿好選擇。',
    ticket_price: '房價約₱3,500起/晚',
    opening_hours: { daily: '24小時服務' }
  },
  
  // === 宿霧 Cebu ===
  'Ayala Center Cebu': {
    description: '《Ayala Center Cebu》是宿霧市最具規模的購物中心，彙集國際精品、本地品牌、美食廣場、電影院、超市於一體。綠化中庭、現代建築設計舒適宜人，週末常有市集活動與表演。是宿霧市民日常消費、遊客採購伴手禮與用餐的首選商圈。',
    ticket_price: '免費進入',
    opening_hours: { daily: '10:00-21:00' }
  },
  'AYALA購物廣場宿務': {
    description: '《Ayala購物廣場宿霧》（同Ayala Center Cebu）是宿霧最大購物商場，擁有超過300家店鋪與餐廳。從平價連鎖到高端品牌應有盡有，美食區涵蓋菲律賓菜、日韓料理、西式快餐。空調舒適、設施新穎，逛街購物、用餐、看電影一站滿足，是旅遊補給與休閒的理想去處。',
    ticket_price: '免費進入',
    opening_hours: { daily: '10:00-21:00' }
  },
  'SM Seaside City': {
    description: '《SM Seaside City Cebu》是菲律賓第三大購物中心，面向大海、現代建築設計壯觀。國際品牌、超市、美食街、電影院、溜冰場、遊樂設施齊全。海景餐廳、週末市集、節日活動豐富，是宿霧購物娛樂新地標。',
    ticket_price: '免費進入',
    opening_hours: { daily: '10:00-22:00' }
  },
  'SM亞洲商城': {
    description: '《SM City Cebu》是宿霧老牌購物中心，位於市中心交通便利。超市、電影院、美食街、平價服飾、電子產品應有盡有。比Ayala更親民、選擇豐富，是當地人日常採購首選，適合遊客補給與購買伴手禮。',
    ticket_price: '免費進入',
    opening_hours: { daily: '10:00-21:00' }
  },
  'IT Park': {
    description: '《IT Park》是宿霧商業科技園區，白日辦公大樓、夜晚變身美食娛樂區。戶外餐廳、酒吧、咖啡館林立，韓式炸雞、日料、菲律賓菜選擇豐富。夜晚燈光音樂、年輕人聚集，是宿霧夜生活與覓食熱點。',
    ticket_price: '免費',
    opening_hours: { food_area: '18:00-02:00最熱鬧' }
  },
  '奧斯洛布鯨鯊': {
    description: '《奧斯洛布鯨鯊體驗Oslob Whale Shark》是宿霧最熱門活動，與世界最大魚類鯨鯊共游。清晨出發、浮潛或潛水近距離觀賞，溫柔巨獸悠游身旁震撼難忘。爭議點為餵食吸引，但仍吸引大量遊客。需提前預約、遵守規範，是終生難忘的海洋體驗。',
    ticket_price: '₱1,000-1,500（浮潛）₱1,500-2,000（潛水）',
    opening_hours: { daily: '06:00-12:00（建議早上）' }
  },
  '奧斯洛布鯨鯊村': {
    description: '奧斯洛布鯨鯊村是宿霧南部小漁村，因鯨鯊餵食觀光聞名。清晨螃蟹船出海、浮潛與鯨鯊共游，巨大身影近在咫尺。配合Tumalog瀑布、Sumilon Island跳島，是宿霧經典一日遊路線。',
    ticket_price: '₱1,000-1,500',
    opening_hours: { daily: '06:00-12:00' }
  },
  '與鯨鯊共游': {
    description: '奧斯洛布與鯨鯊共游是菲律賓最獨特體驗之一，溫柔巨獸悠游身旁、張大嘴濾食浮游生物。浮潛或潛水近距離觀賞，震撼難忘。需遵守不觸碰、保持距離等規範，保護鯨鯊安全。',
    ticket_price: '₱1,000-2,000',
    opening_hours: { daily: '06:00-12:00' }
  },
  '鯨鯊共游體驗': {
    description: '宿霧奧斯洛布鯨鯊共游讓旅客與世界最大魚類近距離接觸。清晨出海、浮潛觀賞鯨鯊悠游，溫柔巨獸、震撼體驗。雖有餵食爭議，仍是菲律賓最熱門海洋活動，需提前預約、遵守保育規範。',
    ticket_price: '₱1,000-1,500',
    opening_hours: { daily: '06:00-12:00' }
  },
  '宿霧鯨鯊': {
    description: '宿霧南部奧斯洛布是全球少數可與鯨鯊共游的地點，餵食吸引鯨鯊聚集，旅客浮潛或潛水近距離觀賞。溫柔巨獸、震撼體驗，但需尊重海洋生物、遵守規範。配合Tumalog瀑布、Sumilon Island，是宿霧經典行程。',
    ticket_price: '₱1,000-1,500',
    opening_hours: { daily: '06:00-12:00' }
  },
  '圖馬洛瀑布': {
    description: '《圖馬洛瀑布Tumalog Falls》位於奧斯洛布附近，薄紗狀水流從峭壁傾瀉而下，夢幻如仙境。藍綠色水池、熱帶植物環繞，適合戲水拍照。常與鯨鯊體驗組合成一日遊，是宿霧南部隱藏美景。',
    ticket_price: '₱20-30',
    opening_hours: { daily: '06:00-17:00' }
  },
  '川山瀑布': {
    description: '《川山瀑布Kawasan Falls》是宿霧最美瀑布，三層碧藍水池、瀑布傾瀉、熱帶雨林環繞。竹筏漂流、瀑布按摩、跳水體驗，是溯溪與戲水天堂。配合峽谷溯溪行程（Canyoneering），是宿霧冒險活動首選。',
    ticket_price: '₱40',
    opening_hours: { daily: '06:00-17:00' }
  },
  '卡瓦山瀑布': {
    description: '《卡瓦山瀑布Kawasan Falls》（同川山）三層碧藍瀑布、竹筏體驗、峽谷溯溪冒險。清澈水池、瀑布按摩、跳水刺激，是宿霧最受歡迎戶外活動。配合Moalboal潛水、沙丁魚風暴，是宿霧西南部經典路線。',
    ticket_price: '₱40（溯溪Tour另計₱1,500-2,000）',
    opening_hours: { daily: '06:00-17:00' }
  },
  '墨寶沙丁魚風暴': {
    description: '《墨寶沙丁魚風暴Moalboal Sardine Run》是宿霧西南岸潛水勝地，數百萬沙丁魚群形成巨大魚球，潛入其中被銀色魚牆包圍震撼無比。海龜、珊瑚礁、峭壁潛點豐富，是潛水愛好者朝聖地。配合Kawasan Falls溯溪，是宿霧冒險行程經典組合。',
    ticket_price: '浮潛₱500-800，潛水₱2,500-3,500',
    opening_hours: { daily: '07:00-17:00' }
  },
  '聖嬰大教堂': {
    description: '《聖嬰大教堂Basilica del Santo Niño》是菲律賓最古老教堂之一，建於1565年，供奉聖嬰像（Santo Niño）。巴洛克風格、彩繪玻璃、虔誠信徒祈禱，見證西班牙殖民歷史。週五Sinulog祭典熱鬧非凡，是宿霧信仰與文化中心。',
    ticket_price: '免費（捐獻制）',
    opening_hours: { daily: '06:00-19:00' }
  },
  '聖嬰教堂': {
    description: '《聖嬰教堂Basilica del Santo Niño》（同聖嬰大教堂）是宿霧最重要宗教地標，供奉麥哲倫1521年贈予當地女王的聖嬰像。虔誠信徒、蠟燭祈禱、巴洛克建築，展現菲律賓天主教信仰深厚。週五彌撒與Sinulog祭典盛大，是宿霧文化象徵。',
    ticket_price: '免費',
    opening_hours: { daily: '06:00-19:00' }
  },
  '麥哲倫十字架': {
    description: '《麥哲倫十字架Magellan\'s Cross》立於1521年，標誌菲律賓基督教化起點。八角亭保護原始十字架（現為複製品），天花板壁畫描繪麥哲倫為當地人受洗場景。鄰近聖嬰教堂，是宿霧歷史文化必訪地標，見證殖民歷史起點。',
    ticket_price: '免費',
    opening_hours: { daily: '全天' }
  },
  '聖佩德羅堡': {
    description: '《聖佩德羅堡Fort San Pedro》建於1565年，菲律賓最古老西班牙堡壘。三角形石造防禦工事、大砲、護城河，見證殖民時期軍事歷史。如今為博物館與公園，展示文物、舉辦活動，是宿霧歷史教育與休閒場所。',
    ticket_price: '₱30',
    opening_hours: { daily: '08:00-19:00' }
  },
  '聖彼得堡': {
    description: '《聖彼得堡Fort San Pedro》（同聖佩德羅堡）是宿霧最古老堡壘，西班牙殖民防禦建築。三角形石牆、大砲、博物館展示，見證400年歷史。位於碼頭附近，是宿霧市區歷史景點，適合了解殖民時期軍事建築。',
    ticket_price: '₱30',
    opening_hours: { daily: '08:00-19:00' }
  },
  '馬克坦神社': {
    description: '《馬克坦神社Mactan Shrine》紀念1521年Lapu-Lapu酋長擊敗麥哲倫，是菲律賓抵抗殖民的象徵。高聳銅像、紀念碑、公園，展現民族英雄事蹟。位於麥克坦島，鄰近機場與度假村，是宿霧歷史教育景點。',
    ticket_price: '免費',
    opening_hours: { daily: '全天' }
  },
  '道教廟': {
    description: '《宿霧道教廟Taoist Temple》位於Beverly Hills高地，中國式建築、龍柱、紅燈籠、香爐，展現華人社區信仰。俯瞰宿霧市景、99階石梯、許願池，氛圍寧靜。免費參觀但需脫鞋、尊重宗教禮儀，是宿霧獨特文化景點。',
    ticket_price: '免費',
    opening_hours: { wed_sun: '06:00-17:00（週一二休）' }
  },
  '宿霧烤乳豬': {
    description: '《宿霧烤乳豬Lechon Cebu》是菲律賓國菜，整隻乳豬香料醃製、炭火慢烤，外皮酥脆、肉質軟嫩多汁。宿霧版本以香茅、大蒜調味，無需沾醬已風味十足。Rico\'s Lechon、Zubuchon、CNT最負盛名，是宿霧必吃美食體驗。',
    ticket_price: '₱500-800/公斤',
    opening_hours: { restaurant: '10:00-21:00' }
  },
  'Rico\'s Lechon': {
    description: '《Rico\'s Lechon》是宿霧最知名烤乳豬連鎖店，外皮酥脆、肉質軟嫩、香料滲透。多家分店遍布宿霧，可外帶或內用，配白飯、蔬菜、醬料。是體驗正宗Cebu Lechon的首選餐廳，遊客與當地人都愛。',
    ticket_price: '₱500-800/公斤',
    opening_hours: { daily: '10:00-21:00' }
  },
  'Zubuchon': {
    description: '《Zubuchon》是宿霧烤乳豬名店，已故名廚Anthony Bourdain曾讚譽為「世界最好烤乳豬」。酥脆外皮、多汁肉質、香料調味完美平衡。多家分店、可外帶整隻或切盤，是宿霧美食朝聖地。',
    ticket_price: '₱500-800/公斤',
    opening_hours: { daily: '10:00-21:00' }
  },
  '芒果乾': {
    description: '《菲律賓芒果乾7D Dried Mangoes》是宿霧最知名伴手禮，當地芒果香甜、肉厚多汁，製成芒果乾保留天然甜味與Q彈口感。7D品牌最受歡迎，機場、超市、紀念品店都有販售，是遊客必買特產。',
    ticket_price: '₱100-150/包',
    opening_hours: { supermarket: '依店家而異' }
  },
  '貝殼博物館': {
    description: '《貝殼博物館Shell Museum》位於麥克坦島，收藏超過5,000種貝殼標本，從常見到稀有品種應有盡有。展示貝類生態、珍珠養殖、貝殼工藝品，適合親子教育與貝殼愛好者。麥克坦島觀光順路景點。',
    ticket_price: '₱50',
    opening_hours: { daily: '08:00-17:00' }
  },
  '科隆街': {
    description: '《科隆街Colon Street》是宿霧最古老街道，建於西班牙殖民時期。傳統市集、廉價商店、街頭小吃林立，保留老宿霧庶民生活氛圍。白日熙攘、夜晚需注意安全，是體驗在地生活與購買便宜貨的好去處。',
    ticket_price: '免費',
    opening_hours: { daily: '全天（建議白天前往）' }
  },
  'The Lind': {
    description: '《The Lind Boracay》位於長灘島Station 1，精品酒店設計感十足，面向White Beach白沙。無邊際泳池、Spa、海景餐廳，服務細膩、隱私性佳。適合追求品味與寧靜的旅人，享受長灘島精緻度假體驗。',
    ticket_price: '房價約₱10,000起/晚',
    opening_hours: { daily: '24小時服務' }
  },
  '克里姆森度假村': {
    description: '克里姆森度假村系列在長灘島、宿霧、薄荷島都有據點。現代設計、無邊際泳池、Spa設施、水上活動中心齊全。服務專業、性價比高，適合家庭度假或團體出遊，是菲律賓中高端度假選擇。',
    ticket_price: '房價約₱6,000起/晚',
    opening_hours: { daily: '24小時服務' }
  },
  '莫凡彼度假村': {
    description: '莫凡彼度假村位於薄荷島或宿霧（需確認具體位置），提供海景房、泳池、餐廳、潛水服務。設施維護良好、服務親切，性價比高，適合預算中等的家庭與情侶度假。',
    ticket_price: '房價約₱4,000起/晚',
    opening_hours: { daily: '24小時服務' }
  },
  
  // === 馬尼拉 Manila ===
  '王城區': {
    description: '《王城區Intramuros》是馬尼拉西班牙殖民時期古城，16世紀石牆環繞、聖奧古斯丁教堂、聖地牙哥堡壘、馬尼拉大教堂等古蹟林立。石板路、馬車、古老建築，見證400年殖民歷史。適合步行或馬車遊覽，是了解菲律賓歷史文化的首站。',
    ticket_price: '免費進入（各景點門票另計）',
    opening_hours: { daily: '全天（景點08:00-18:00）' }
  },
  '西班牙王城': {
    description: '《西班牙王城Intramuros》（同王城區）是馬尼拉歷史核心，西班牙殖民時期建造的城牆與堡壘保存至今。聖奧古斯丁教堂、Casa Manila、聖地牙哥堡壘，展現殖民建築與歷史文物。馬車遊覽、步行探索，是馬尼拉必訪歷史景點。',
    ticket_price: '免費進入',
    opening_hours: { daily: '全天' }
  },
  '聖奧古斯丁教堂': {
    description: '《聖奧古斯丁教堂San Agustin Church》建於1607年，菲律賓最古老石造教堂，UNESCO世界遺產。巴洛克風格、精緻壁畫、管風琴、宗教文物收藏豐富。位於Intramuros王城區，是菲律賓天主教建築瑰寶與歷史見證。',
    ticket_price: '₱200',
    opening_hours: { daily: '08:00-18:00' }
  },
  '馬尼拉大教堂': {
    description: '《馬尼拉大教堂Manila Cathedral》是菲律賓最重要天主教堂之一，經歷多次地震與戰爭重建。新羅馬式建築、彩繪玻璃窗、巨型管風琴、莊嚴內部，是馬尼拉宗教中心。位於Intramuros，適合建築與宗教文化愛好者參觀。',
    ticket_price: '免費（捐獻制）',
    opening_hours: { daily: '06:00-18:00' }
  },
  '馬尼拉海洋公園': {
    description: '《馬尼拉海洋公園Manila Ocean Park》是菲律賓最大海洋主題樂園，水族館、海獅表演、企鵝館、水母館、海底隧道等設施齊全。適合親子同遊，認識海洋生物、觀賞表演、互動體驗。位於馬尼拉灣畔，是家庭娛樂首選。',
    ticket_price: '₱800-1,200（套票含多館）',
    opening_hours: { daily: '10:00-19:00' }
  },
  
  // === 其他地區 ===
  '嘉華山': {
    description: '嘉華山（需確認具體位置）提供登山健行、觀景體驗。菲律賓山區自然風光、熱帶雨林、瀑布溪流，適合喜愛戶外活動的旅人。建議與當地Tour組合，確保安全與交通便利。',
    ticket_price: '₱200-500（視行程）',
    opening_hours: { daily: '需提前預約導遊' }
  },
  '盧霍山': {
    description: '盧霍山（需確認具體位置，可能為Mount Luho）提供觀景台俯瞰全景。菲律賓島嶼山景、海岸線一覽無遺，適合攝影與觀景。建議與跳島或其他景點組合成一日遊。',
    ticket_price: '₱100-200',
    opening_hours: { daily: '08:00-17:00' }
  },
  '盧霍山觀景台': {
    description: '盧霍山觀景台（可能為Mount Luho Viewpoint）是俯瞰菲律賓海島全景的最佳地點之一。360度視野、島嶼與海洋盡收眼底，日出日落時分尤其壯麗。適合攝影愛好者與觀景旅人。',
    ticket_price: '₱100',
    opening_hours: { daily: '06:00-18:00' }
  },
  '米特拉牧場': {
    description: '米特拉牧場（需確認具體位置）提供牧場體驗、動物互動、鄉村風光。適合親子家庭，體驗菲律賓農村生活與自然環境。建議與周邊景點組合成一日遊。',
    ticket_price: '₱200-400',
    opening_hours: { daily: '08:00-17:00' }
  },
  '馬奎特溫泉': {
    description: '馬奎特溫泉（需確認具體位置）提供天然溫泉浴、Spa療程、熱帶雨林環境。舒緩疲勞、放鬆身心，適合登山或海島行程後的休憩活動。',
    ticket_price: '₱150-400',
    opening_hours: { daily: '08:00-20:00' }
  },
  '人造森林': {
    description: '《人造森林Man-Made Forest》位於薄荷島Bilar鎮，2公里紅木與桃花心木林道筆直高聳，陽光灑落形成光影隧道。涼爽清新、適合拍照打卡，是薄荷島內陸行程順路景點，從巧克力山往羅博河途中必經。',
    ticket_price: '免費',
    opening_hours: { daily: '全天' }
  },
  '鱷魚農場': {
    description: '鱷魚農場（需確認具體位置，可能為Palawan Wildlife Rescue）展示菲律賓鱷魚與野生動物保育。教育導覽、近距離觀察、了解保育工作，適合親子與生態教育。',
    ticket_price: '₱150-300',
    opening_hours: { daily: '09:00-17:00' }
  },
  '班努爾島': {
    description: '班努爾島（需確認具體位置）提供跳島、浮潛、海灘體驗。菲律賓小島純樸風情、清澈海水、珊瑚礁，適合追求秘境海灘的旅人。',
    ticket_price: '跳島Tour約₱1,500/人',
    opening_hours: { daily: '08:00-17:00' }
  },
  '水晶洞': {
    description: '《水晶洞Cueva de Cristal》（需確認具體位置，可能為科隆島Crystal Cove）擁有鐘乳石、石筍、水晶岩層等地質奇觀。洞穴探險、跳水、浮潛，是跳島Tour特色景點。',
    ticket_price: '₱200-300',
    opening_hours: { daily: '08:00-16:00' }
  },
  '蛇島沙洲': {
    description: '蛇島沙洲（可能為Snake Island, Palawan）是S形沙洲連接兩座小島，退潮時露出蜿蜒沙灘如蛇身。適合漫步、拍照、觀賞海景，是巴拉望跳島Tour特色景點之一。',
    ticket_price: '跳島Tour約₱1,500/人',
    opening_hours: { daily: '視潮汐' }
  },
  '鱷魚島': {
    description: '鱷魚島（可能為El Nido Crocodile Island）因外型似鱷魚而得名，周邊珊瑚礁豐富、浮潛體驗佳。是El Nido跳島Tour常停靠的浮潛點，熱帶魚群環繞、海水清澈。',
    ticket_price: '跳島Tour約₱1,200-1,800/人',
    opening_hours: { daily: '08:00-17:00' }
  },
  '魔術島': {
    description: '魔術島（需確認具體位置）提供跳島、浮潛、海灘體驗。菲律賓小島秘境、清澈海水、珊瑚礁，適合追求原始海島風光的旅人。',
    ticket_price: '跳島Tour約₱1,500/人',
    opening_hours: { daily: '08:00-17:00' }
  },
  '貝克海灘': {
    description: '貝克海灘（需確認具體位置）提供白沙灘、清澈海水、椰樹風情。菲律賓海灘度假、日光浴、游泳、放鬆身心的理想去處。',
    ticket_price: '免費',
    opening_hours: { daily: '全天' }
  },
  '阿里兒海灘': {
    description: '阿里兒海灘（可能為El Nido周邊海灘）提供寧靜海灘環境、細軟沙質、清澈海水。適合逃離人潮、享受悠閒海島時光。',
    ticket_price: '免費',
    opening_hours: { daily: '全天' }
  },
  '阿里爾角': {
    description: '阿里爾角（需確認具體位置）提供觀景台、海岸線風光、攝影勝地。菲律賓海島景觀、日落時分尤其美麗。',
    ticket_price: '免費',
    opening_hours: { daily: '全天' }
  },
  '星期五海灘': {
    description: '星期五海灘（可能為El Nido Friday Beach）提供寧靜海灘環境、白沙、清澈海水。適合野餐、游泳、放鬆，是El Nido周邊秘境海灘之一。',
    ticket_price: '免費',
    opening_hours: { daily: '全天' }
  },
  '香格里拉麥丹島': {
    description: '《香格里拉麥丹島Shangri-La Mactan》位於宿霧麥克坦島，私人海灘、CHI Spa、水上活動中心、兒童俱樂部齊全。五星服務、設施完善，適合家庭度假或商務會議，享受宿霧高端度假體驗。',
    ticket_price: '房價約₱12,000起/晚',
    opening_hours: { daily: '24小時服務' }
  },
  '資生堂島跳島': {
    description: '資生堂島（可能為Caohagan或其他小島）跳島遊提供浮潛、沙灘、海鮮午餐體驗。宿霧或薄荷島周邊跳島Tour常停靠點，清澈海水、珊瑚礁豐富。',
    ticket_price: '跳島Tour約₱1,500/人',
    opening_hours: { daily: '08:00-16:00' }
  },
  '西堤區': {
    description: '西堤區（可能為菲律賓某城市商業區）提供餐飲、購物、娛樂設施。現代建築、商場、餐廳林立，是當地人與遊客休閒消費的熱門地帶。',
    ticket_price: '免費',
    opening_hours: { daily: '視店家而異' }
  },
  '藍色大教堂': {
    description: '藍色大教堂（需確認具體位置）以藍色建築或內部裝飾著稱，展現獨特建築美學與宗教氛圍。適合建築與攝影愛好者參觀。',
    ticket_price: '免費（捐獻制）',
    opening_hours: { daily: '06:00-18:00' }
  }
};

async function rewriteAttraction(attraction, country) {
  const isIndonesia = country === 'indonesia';
  const descriptions = isIndonesia ? indonesiaDescriptions : philippinesDescriptions;
  
  const customDesc = descriptions[attraction.name];
  
  if (customDesc) {
    return {
      ...attraction,
      description: customDesc.description,
      ticket_price: customDesc.ticket_price,
      opening_hours: customDesc.opening_hours
    };
  }
  
  return generateGenericDescription(attraction, country);
}

function generateGenericDescription(attraction, country) {
  const isIndonesia = country === 'indonesia';
  const countryName = isIndonesia ? '印尼' : '菲律賓';
  const currency = isIndonesia ? 'Rp' : '₱';
  const priceRange = isIndonesia ? '50,000-200,000' : '200-800';
  
  let description = `《${attraction.name}》`;
  
  if (attraction.category?.includes('自然') || attraction.category?.includes('Nature') || attraction.category?.includes('nature')) {
    description += `位於${countryName}，擁有壯麗自然景觀。熱帶風情、原始生態與獨特地貌相結合，適合喜愛大自然的旅人探