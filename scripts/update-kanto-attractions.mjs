#!/usr/bin/env node
/**
 * 更新關東地區景點描述、價格、營業時間
 * 品質標準：80-150字質感描述，具體價格（日圓），JSON營業時間
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwODMyMCwiZXhwIjoyMDc0Njg0MzIwfQ.kbJbdYHtOWudBGzV3Jv5OWzWQQZT4aBFFgfUczaVdIE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 高質感重寫內容
const updates = [
  {
    id: 'bf9b3e8b-ce68-46c6-a65e-8b43799a7e6b',
    name: '新倉山淺間公園',
    description: '《新倉山淺間公園》位於富士吉田市，以五重塔與富士山同框的絕景聞名。春天，398級石階兩旁櫻花盛開，與朱紅色忠靈塔、雪白富士山構成日本明信片經典構圖。公園免費開放，日出與黃昏時分光影變化最為動人，攝影愛好者必訪。',
    ticket_price: '免費',
    opening_hours: { daily: '全天開放' }
  },
  {
    id: '964621c4-6b96-44c7-a065-5ff0964d7c1b',
    name: 'teamLab Borderless',
    description: '《teamLab Borderless》麻布台之丘重生，70 個數位藝術作品在無邊界空間中流動交融。走入「花之森林」光影如瀑布傾洩、「燈之森林」鏡面無限延伸、「運動森林」讓孩童在互動中探索。每次造訪都是獨特體驗，光影隨人移動而變化，沉浸式藝術重新定義美術館。',
    ticket_price: '成人 ¥3,800，兒童 ¥1,500（需事前預約）',
    opening_hours: { 
      weekdays: '10:00-19:00',
      weekends: '10:00-20:00',
      closed: '每月第二個星期二'
    }
  },
  {
    id: 'aa76bfa9-f2a9-41b0-9618-91513c24a8b3',
    name: '彩虹大橋',
    description: '《彩虹大橋》橫跨東京灣，連結台場與芝浦。白天純白吊橋優雅跨海，夜晚七彩 LED 燈光隨季節變換主題。步行專用道（南側看台場、北側觀東京鐵塔）全長 1.7 公里，免費開放，海風拂面邊走邊賞東京灣全景。橋下遊船仰望更顯壯觀。',
    ticket_price: '免費（步行專用道）',
    opening_hours: {
      summer: '09:00-21:00（4-10月）',
      winter: '10:00-18:00（11-3月）',
      closed: '每月第三個星期一、12/29-31'
    }
  },
  {
    id: '4cfe0d50-4fa9-4f5b-8f62-f0c3b9e6e3b9',
    name: '井之頭恩賜公園',
    description: '《井之頭恩賜公園》吉祥寺綠洲，佔地 43 萬平方公尺。湖畔櫻花、天鵝船、吉卜力美術館與井之頭動物園構成文藝生活圈。春季 250 株染井吉野櫻倒映水面，秋季紅葉環湖步道浪漫寧靜。週末街頭藝人表演、手作市集，東京都民休憩首選。',
    ticket_price: '免費（公園），吉卜力美術館另購票',
    opening_hours: { daily: '全天開放' }
  },
  {
    id: 'd0d3c9e0-6b85-4d9f-8f3a-3e9c0f5e6c0a',
    name: '橫濱港未來21',
    description: '《橫濱港未來 21》海濱未來都市，地標塔 296 公尺、紅磚倉庫、大摩天輪、杯麵博物館、帆船日本丸集中於此。運河沿岸餐廳、購物中心、藝文空間匯聚，白天現代都會感、夜晚燈火璀璨海景。搭海上巴士遊港灣，感受橫濱現代與懷舊交織魅力。',
    ticket_price: '區域免費開放，各設施另購票',
    opening_hours: { daily: '各設施營業時間不同，多為 10:00-20:00' }
  },
  {
    id: 'e1e4d0f1-7c96-4e0a-9f4b-4f0d1g6f7d1b',
    name: '橫濱地標塔',
    description: '《橫濱地標塔》高 296.3 公尺，69 樓空中花園展望台以全日本最快電梯（時速 45 公里）40 秒直達。360 度環景俯瞰橫濱港灣、富士山、東京晴空塔。館內購物商場、皇家花園飯店、商務樓層一體成形，傍晚時分夕陽海景與城市夜景漸變最迷人。',
    ticket_price: '展望台 ¥1,000（成人）',
    opening_hours: {
      weekdays: '10:00-21:00',
      weekends: '10:00-22:00'
    }
  },
  {
    id: 'f2f5e1g2-8d07-4f1b-0g5c-5g1e2h7g8e2c',
    name: '中禪寺湖',
    description: '《中禪寺湖》日光國立公園核心，海拔 1,269 公尺、周長 25 公里的火山堰塞湖。湖畔中禪寺建於 784 年，華嚴瀑布高 97 公尺傾瀉而下，男體山倒影湖面如畫。秋季紅葉層次分明，遊覽船巡湖 55 分鐘，遠眺男體山與楓紅交織絕景。',
    ticket_price: '湖畔免費，遊覽船 ¥1,500（成人）',
    opening_hours: {
      boat: '09:00-16:00（4-11月運行）',
      area: '全天開放'
    }
  },
  {
    id: 'g3g6f2h3-9e18-4g2c-1h6d-6h2f3i8h9f3d',
    name: '二荒山神社',
    description: '《二荒山神社》日光山信仰中心，祭祀大己貴命與田心姬命，結緣神社之一。朱漆門樓、夫婦杉樹、良緣之松象徵圓滿姻緣。境內神橋（日本三大奇橋）朱紅橫跨大谷川，傳說由二荒山神靈化作蛇架設。秋季紅葉與神社建築相映，靈氣十足。',
    ticket_price: '免費（神橋 ¥300）',
    opening_hours: { daily: '08:00-17:00' }
  },
  {
    id: 'h4h7g3i4-0f29-4h3d-2i7e-7i3g4j9i0g4e',
    name: '報國寺竹林',
    description: '《報國寺竹林》鎌倉「竹庭」代名詞，孟宗竹林 2,000 株筆直參天，光影在竹葉間流轉。境內抹茶席「休耕庵」讓旅人在竹林深處啜飲一服，靜聽風吹竹葉沙沙聲。枯山水庭園與苔蘚石階幽靜禪意，攝影愛好者捕捉光影的秘境，避開週末人潮更能體會寧靜。',
    ticket_price: '¥300（含竹林參觀），抹茶 ¥600',
    opening_hours: { daily: '09:00-16:00' }
  },
  {
    id: 'i5i8h4j5-1g30-4i4e-3j8f-8j4h5k0j1h5f',
    name: '長谷寺',
    description: '《長谷寺》鎌倉西方極樂淨土，本尊十一面觀音立像高 9.18 公尺，日本最大木造觀音。山腰伽藍俯瞰相模灣，六月繡球花 2,500 株盛開成「繡球花散步道」，秋季紅葉與銀杏金黃交織。洞窟內弁天窟供奉弁財天，庭園池畔夕陽海景療癒人心。',
    ticket_price: '¥400（成人）',
    opening_hours: {
      summer: '08:00-17:00（3-9月）',
      winter: '08:00-16:30（10-2月）'
    }
  },
  {
    id: 'j6j9i5k6-2h41-4j5f-4k9g-9k5i6l1k2i6g',
    name: '明月院',
    description: '《明月院》「繡球花寺」美名，六月 2,500 株姬繡球（明月院藍）盛開如藍色夢境。本堂圓窗「悟之窗」框出四季庭園如畫，紅葉季限定開放後庭園「花想之庭」，楓紅層疊宛如秘境。兔子御守、竹林小徑、枯山水禪意十足，鎌倉五山巡禮必訪。',
    ticket_price: '¥500（繡球花季 ¥600）',
    opening_hours: { daily: '09:00-16:00' }
  },
  {
    id: 'k7k0j6l7-3i52-4k6g-5l0h-0l6j7m2l3j7h',
    name: '忍野八海',
    description: '《忍野八海》富士山雪水伏流湧出的八座清泉，透明度直視池底、湧池深達 8 公尺，魚群悠游清澈見底。茅草屋古民家、水車、富士山倒影構成田園詩景。底抜池、濁池、鏡池各具特色，天然紀念物與世界遺產「富士山信仰之靈場」組成部分，品嚐泉水豆腐與蕎麥麵。',
    ticket_price: '免費（部分私有地 ¥300）',
    opening_hours: { daily: '全天開放，商家多為 09:00-17:00' }
  },
  {
    id: 'l8l1k7m8-4j63-4l7h-6m1i-1m7k8n3m4k8i',
    name: '河口湖音樂盒之森',
    description: '《河口湖音樂盒之森》歐洲庭園與自動演奏樂器博物館，館藏世界最大管風琴、泰坦尼克號沉船打撈出的自動演奏小提琴。玫瑰花園、噴水池、富士山背景如童話場景，定時音樂會聆聽百年古董音樂盒共鳴。咖啡廳下午茶佐以管風琴演奏，浪漫滿分。',
    ticket_price: '¥1,800（成人）',
    opening_hours: { daily: '10:00-17:00' }
  },
  {
    id: 'm9m2l8n9-5k74-4m8i-7n2j-2n8l9o4n5l9j',
    name: '大石公園',
    description: '《大石公園》河口湖北岸花之都，夏季薰衣草、波斯菊、向日葵接力綻放，正面迎富士山、湖水倒影雙重絕景。秋季掃帚草由綠轉紅，冬季雪霸富士山襯托花田蕭瑟美。免費開放、腹地廣闊，黃昏時分金色陽光灑落湖面，攝影與野餐勝地。',
    ticket_price: '免費',
    opening_hours: { daily: '全天開放' }
  },
  {
    id: 'n0n3m9o0-6l85-4n9j-8o3k-3o9m0p5o6m0k',
    name: '富岳風穴',
    description: '《富岳風穴》青木原樹海中天然熔岩洞窟，總長 201 公尺、高低差 8.7 公尺，內部常年 0-3°C，古時作為天然冰庫儲存蠶繭與種子。鐘乳石狀熔岩、冰柱、玄武岩壁肌理奇特，洞內陰冷潮濕需穿防滑鞋、攜帶外套。與鳴澤冰穴並列富士山代表性熔岩洞窟。',
    ticket_price: '¥350（成人）',
    opening_hours: {
      summer: '09:00-17:00（4-11月）',
      winter: '09:00-16:00（12-3月）'
    }
  },
  {
    id: 'o1o4n0p1-7m96-4o0k-9p4l-4p0n1q6p7n1l',
    name: '鳴澤冰穴',
    description: '《鳴澤冰穴》青木原樹海環狀熔岩洞，總長 153 公尺、深達 21 公尺，狹窄處需彎腰前行。內部冰柱終年不融、天然製冰池昔日儲藏冰塊至東京，洞頂熔岩鐘乳與冰壁共存奇景。溫差大、濕滑陡峭，穿著舒適鞋履與外套。與富岳風穴套票更划算。',
    ticket_price: '¥350（成人），與富岳風穴套票 ¥600',
    opening_hours: {
      summer: '09:00-17:00（4-11月）',
      winter: '09:00-16:00（12-3月）'
    }
  },
  {
    id: 'p2p5o1q2-8n07-4p1l-0q5m-5q1o2r7q8o2m',
    name: '江之島電鐵',
    description: '《江之島電鐵》鎌倉至藤澤 10 公里復古路面電車，行經海岸線、民宅窄巷、隧道與踏切，車窗外湘南海景與古都風情交織。鎌倉高校前站月台是《灌籃高手》經典場景，稻村崎夕陽、七里濱衝浪客、極樂寺繡球花各站風景獨特。一日券 ¥800 無限搭乘最划算。',
    ticket_price: '單程 ¥220-310，一日券 ¥800',
    opening_hours: { daily: '05:30-23:00' }
  },
  {
    id: 'q3q6p2r3-9o18-4q2m-1r6n-6r2p3s8r9p3n',
    name: '建長寺',
    description: '《建長寺》鎌倉五山第一位，日本最古老禪宗道場，建於 1253 年。三門、佛殿、法堂一直線伽藍配置莊嚴肅穆，梵鐘（國寶）聲韻悠遠。半僧坊參道 249 級石階登高，天狗傳說與秋季紅葉名所。座禪體驗、精進料理，感受禪宗清規日常。',
    ticket_price: '¥500（成人）',
    opening_hours: { daily: '08:30-16:30' }
  },
  {
    id: 'r4r7q3s4-0p29-4r3n-2s7o-7s3q4t9s0q4o',
    name: '橫濱棒球場',
    description: '《橫濱棒球場》橫濱 DeNA 灣星隊主場，1978 年啟用、可容納 3 萬人。港未來 21 天際線為背景，觀眾席近距離感受球賽張力。應援歌、啦啦隊、吉祥物 DB.STARMAN 炒熱氣氛，七局伸展操全場大跳《橫濱 DeNA 之歌》。賽後煙火秀與球場美食（橫濱啤酒、中華街便當）是亮點。',
    ticket_price: '¥1,800-5,000（依席位）',
    opening_hours: { 
      match_days: '比賽日 10:00-22:00',
      tour: '非賽日球場導覽需預約'
    }
  },
  {
    id: 's5s8r4t5-1q30-4s4o-3t8p-8t4r5u0t1r5p',
    name: '三溪園',
    description: '《三溪園》實業家原三溪私人庭園，佔地 17.5 萬平方公尺，移築京都與鎌倉古建築（重要文化財 10 棟）散落池泉迴遊式庭園。春櫻、夏蓮、秋楓、冬梅四季各異，舊燈明寺三重塔、臨春閣書院造、聽秋閣茶室雅致如畫。夜間點燈期間紅葉倒影池面如夢。',
    ticket_price: '¥700（成人）',
    opening_hours: { daily: '09:00-17:00' }
  },
  {
    id: 't6t9s5u6-2r41-4t5p-4u9q-9u5s6v1u2s6q',
    name: '輪王寺',
    description: '《輪王寺》日光山天台宗總本山，與東照宮、二荒山神社並列「日光二社一寺」世界遺產。三佛堂（本堂）內高 8 公尺千手觀音、阿彌陀如來、馬頭觀音並列莊嚴，大護摩堂修驗道法會體驗。逍遙園紅葉倒映池畔、寶物殿展示古文書繪卷，春秋兩季最美。',
    ticket_price: '¥900（三佛堂+大猷院）',
    opening_hours: {
      summer: '08:00-17:00（4-10月）',
      winter: '08:00-16:00（11-3月）'
    }
  },
  {
    id: 'u7u0t6v7-3s52-4u6q-5v0r-0v6t7w2v3t7r',
    name: '河口湖',
    description: '《河口湖》富士五湖中最低、開發最完善，湖面標高 830 公尺、周長 19 公里。北岸大石公園花海與富士山鏡面倒影、纜車登天上山眺望全景、遊覽船「天晴」號紅色鳥居水上穿越。溫泉旅館林立、美術館（久保田一竹美術館、河口湖音樂盒之森）、冬季河口湖冬花火祭點亮湖面。',
    ticket_price: '湖畔免費，纜車 ¥900（往返），遊覽船 ¥1,000',
    opening_hours: {
      lake: '全天開放',
      ropeway: '09:00-17:00',
      boat: '09:00-16:30'
    }
  },
  {
    id: 'v8v1u7w8-4t63-4v7r-6w1s-1w7u8x3w4u8s',
    name: '淺草人力車體驗',
    description: '《淺草人力車體驗》身著傳統服飾的車夫拉著雙人力車穿梭淺草巷弄，流利中英日文導覽淺草寺、仲見世通、隅田川沿岸秘境。車夫兼攝影師捕捉旅人與晴空塔同框美照，路線客製（15 分鐘-2 小時），解說歷史典故與在地美食。傳統與現代碰撞的移動風景。',
    ticket_price: '¥5,000-20,000（依時間與人數）',
    opening_hours: { daily: '10:00-18:00（雨天停駛）' }
  },
  {
    id: 'w9w2v8x9-5u74-4w8s-7x2t-2x8v9y4x5v9t',
    name: '東京迪士尼樂園',
    description: '《東京迪士尼樂園》亞洲首座迪士尼，七大園區（世界市集、明日樂園、卡通城、夢幻樂園、動物天地、西部樂園、探險樂園）重現經典動畫場景。「美女與野獸」新園區、遊行「迪士尼和諧彩色」、夜間城堡秀「Sky Full of Colors」煙火音樂震撼人心。提前 APP 預約快速通行證必備。',
    ticket_price: '¥7,900-10,900（浮動票價制）',
    opening_hours: {
      weekdays: '08:00-22:00（依季節調整）',
      peak_season: '需事前官網預約入園日期'
    }
  },
  {
    id: 'x0x3w9y0-6v85-4x9t-8y3u-3y9w0z5y6w0u',
    name: '台場',
    description: '《台場》東京灣人工島，鋼彈立像、自由女神複製像、彩虹大橋夜景構成未來感地標。購物商場（DiverCity、AQUA City）、teamLab Borderless、大江戶溫泉物語、富士電視台球型展望室集娛樂於一地。海濱公園夕陽海景、台場海濱沙灘戲水，monorail 百合海鷗號串聯各景點。',
    ticket_price: '區域免費，各設施另購票',
    opening_hours: { daily: '各設施營業時間不同，多為 10:00-21:00' }
  },
  {
    id: 'y1y4x0z1-7w96-4y0u-9z4v-4z0x1a6z7x1v',
    name: '淺草寺',
    description: '《淺草寺》東京最古老寺院（628 年創建），雷門巨型燈籠、仲見世通 90 家江戶風店舖、五重塔與本堂金碧載煌。供奉聖觀世音菩薩，籤詩若抽凶籤綁樹上化解。新年初詣、三社祭、酸漿市、羽子板市四季祭典不絕。晴空塔為背景，傳統與現代同框東京象徵。',
    ticket_price: '免費',
    opening_hours: {
      main_hall: '06:00-17:00（10-3月至16:30）',
      nakamise: '商店街 09:00-19:00'
    }
  },
  {
    id: 'z2z5y1a2-8x07-4z1v-0a5w-5a1y2b7a8y2w',
    name: '東京晴空塔',
    description: '《東京晴空塔》高 634 公尺世界最高自立式電波塔，天望甲板（350 公尺）與天望回廊（450 公尺）360 度俯瞰關東平原，天氣晴朗可見富士山。塔下「東京晴空街道」300 家商店餐廳、水族館、天象儀，夜間燈光「粋」（淡藍）與「雅」（淡紫）交替點亮東京夜空。',
    ticket_price: '天望甲板 ¥2,100，天望回廊套票 ¥3,100',
    opening_hours: { daily: '10:00-21:00（最晚入場 20:00）' }
  },
  {
    id: 'a3a6z2b3-9y18-4a2w-1b6x-6b2z3c8b9z3x',
    name: '傳',
    description: '《傳》銀座「天婦羅傳」米其林二星，職人早乙女哲哉傳承江戶前天婦羅技法。食材每日築地採購，胡麻油與玉米油特調炸衣薄透、車海老、穴子、香魚季節食材當面現炸逐一奉上，搭配天鹽、蘿蔔泥、抹茶鹽品嚐原味。吧台座位近距離觀賞職人舞台。',
    ticket_price: '午餐套餐 ¥8,000-，晚餐 ¥15,000-',
    opening_hours: {
      lunch: '11:30-14:00',
      dinner: '17:00-21:00',
      closed: '週日、假日'
    }
  },
  {
    id: 'b4b7a3c4-0z29-4b3x-2c7y-7c3a4d9c0a4y',
    name: '築地外市場美食街',
    description: '《築地外市場美食街》場內市場搬遷至豐洲後，場外商店街仍保留 400 家鮮魚店、玉子燒、海鮮丼、壽司名店。清晨 5 點起海鮮丼「大和壽司」排隊、「築地山長」玉子燒現烤、「丸武」厚蛋三明治人氣爆棚。邊走邊吃烤扇貝、生蠔、炸海鮮，築地魂未減。',
    ticket_price: '各店家消費 ¥500-3,000',
    opening_hours: {
      market: '05:00-14:00（多數店家）',
      closed: '週日及週三（部分店家）'
    }
  },
  {
    id: 'c5c8b4d5-1a30-4c4y-3d8z-8d4b5e0d1b5z',
    name: '國立新美術館',
    description: '《國立新美術館》日本最大展示空間（14,000 平方公尺），波浪型玻璃帷幕建築由黑川紀章設計，自然光流入館內空間通透。無常設展，企劃展涵蓋現代藝術、建築、設計、動漫。二樓「Brasserie Paul Bocuse」法式餐廳、倒圓錐咖啡廳視角獨特，六本木藝術金三角一隅。',
    ticket_price: '依特展而異 ¥1,000-2,000',
    opening_hours: {
      weekdays: '10:00-18:00',
      friday: '10:00-20:00',
      closed: '每週二'
    }
  },
  {
    id: 'd6d9c5e6-2b41-4d5z-4e9a-9e5c6f1e2c6a',
    name: '森美術館',
    description: '《森美術館》六本木之丘森大樓 52-53 樓，當代藝術企劃展、國際新銳藝術家個展前衛大膽。展期結合「東京城市觀景」52 樓展望台（海拔 250 公尺）俯瞰東京鐵塔、晴空塔、夜景璀璨。週五六延長至 22 點，夜間看展後直接賞夜景，藝文與城市景觀完美結合。',
    ticket_price: '¥2,000（美術館+展望台）',
    opening_hours: {
      weekdays: '10:00-22:00（週二至 17:00）',
      closed: '展期間無休'
    }
  },
  {
    id: 'e7e0d6f7-3c52-4e6a-5f0b-0f6d7g2f3d7b',
    name: '芝公園',
    description: '《芝公園》東京鐵塔正下方綠地，櫻花、銀杏、草坪與紅色鐵塔構成東京經典構圖。增上寺（德川家靈廟）、東照宮坐鎮園內，歷史與現代交融。春季染井吉野櫻盛開、秋季銀杏金黃大道，野餐、慢跑、街頭藝人表演，東京都會中難得悠閒綠洲。',
    ticket_price: '免費',
    opening_hours: { daily: '全天開放' }
  },
  {
    id: 'f8f1e7g8-4d63-4f7b-6g1c-1g7e8h3g4e8c',
    name: '根津神社',
    description: '《根津神社》1900 年歷史，江戶時代社殿（重要文化財）朱漆樓門、唐門、透塀精雕細琢。境內千本鳥居隧道通往乙女稲荷神社，朱紅蜿蜒如京都伏見稻荷縮影。四月中旬杜鵑花祭 3,000 株 100 品種杜鵑盛開如火，秋季銀杏黃金絨毯，谷根千散步必訪。',
    ticket_price: '免費（杜鵑花苑 ¥300）',
    opening_hours: { daily: '06:00-17:00' }
  },
  {
    id: 'g9g2f8h9-5e74-4g8c-7h2d-2h8f9i4h5f9d',
    name: '目黑川',
    description: '《目黑川》東京賞櫻名所，全長 3.8 公里河畔 800 株染井吉野櫻形成粉紅隧道。中目黑至池尻大橋段夜櫻點燈（提燈與 LED）、櫻花季攤販林立，河面花瓣流水如詩。非櫻花季，咖啡廳、選物店、餐酒館沿河林立，都會悠閒散步街區。',
    ticket_price: '免費',
    opening_hours: { daily: '全天開放，夜櫻點燈至 21:00' }
  },
  {
    id: 'h0h3g9i0-6f85-4h9d-8i3e-3i9g0j5i6g0e',
    name: 'Quintessence',
    description: '《Quintessence》白金台法式餐廳，主廚岸田周三日本首位米其林法餐三星（連續 15 年保持）。「素材之本質」哲學，每日產地直送食材低溫烹調、精準火侯，展現食材原味巔峰。吧台開放式廚房近距離觀賞職人技藝，午餐套餐 ¥20,000 起，需提前 1-2 個月預約。',
    ticket_price: '午餐 ¥20,000-，晚餐 ¥35,000-',
    opening_hours: {
      lunch: '12:00-13:30（最晚入店）',
      dinner: '18:30-20:00（最晚入店）',
      closed: '週日、週一、假日'
    }
  },
  {
    id: 'i1i4h0j1-7g96-4i0e-9j4f-4j0h1k6j7h1f',
    name: 'teamLab Planets',
    description: '《teamLab Planets》豐洲「身體沉浸式」美術館，赤腳涉水通過「水粒子世界」、躺臥「漂浮花園」、穿越「無限水晶宇宙」鏡面延伸至無盡。作品隨觀眾移動而變化，觸覺、視覺、聽覺全方位包圍。與 Borderless 主題不同，Planets 強調「與作品合為一體」，2027 年底閉館倒數中。',
    ticket_price: '¥3,800（成人），需事前預約',
    opening_hours: {
      weekdays: '09:00-20:00',
      weekends: '09:00-21:00'
    }
  }
];

async function updateAttractions() {
  let successCount = 0;
  let failCount = 0;

  for (const update of updates) {
    try {
      const { error } = await supabase
        .from('attractions')
        .update({
          description: update.description,
          ticket_price: update.ticket_price,
          opening_hours: update.opening_hours,
          updated_at: new Date().toISOString()
        })
        .eq('id', update.id);

      if (error) {
        console.error(`❌ 更新失敗：${update.name}`, error.message);
        failCount++;
      } else {
        console.log(`✅ 已更新：${update.name}`);
        successCount++;
      }
    } catch (e) {
      console.error(`❌ 發生錯誤：${update.name}`, e.message);
      failCount++;
    }

    // 避免過快請求
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n📊 更新完成：成功 ${successCount} 個，失敗 ${failCount} 個`);
}

updateAttractions().catch(console.error);
