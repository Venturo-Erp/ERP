#!/usr/bin/env node

/**
 * 為每個城市找到專屬的背景圖
 * 使用城市特色關鍵字從 Unsplash 搜尋
 */

// 每個城市的專屬圖片 URL（使用城市名稱或地標搜尋）
export const citySpecificImages = {
  // 中國大陸
  beijing: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=1200&q=75', // 故宮
  shanghai: 'https://images.unsplash.com/photo-1545893835-abaa50cbe628?w=1200&q=75', // 外灘
  guangzhou: 'https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=1200&q=75', // 廣州塔
  shenzhen: 'https://images.unsplash.com/photo-1548919973-5cef591cdbc9?w=1200&q=75', // 深圳
  chengdu: 'https://images.unsplash.com/photo-1589908769174-1ebc4b52040e?w=1200&q=75', // 成都
  hangzhou: 'https://images.unsplash.com/photo-1581481615985-ba4775734a9b?w=1200&q=75', // 西湖
  xian: 'https://images.unsplash.com/photo-1580837119756-563d608dd119?w=1200&q=75', // 西安
  suzhou: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=1200&q=75', // 蘇州園林
  guilin: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200&q=75', // 桂林山水
  lijiang: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=1200&q=75', // 麗江古城
  sanya: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=75', // 海南海灘
  xiamen: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=1200&q=75', // 廈門
  qingdao: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=75', // 青島
  harbin: 'https://images.unsplash.com/photo-1548094990-c16ca90f1f0d?w=1200&q=75', // 哈爾濱冰雪
  zhangjiajie: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1200&q=75', // 張家界山景
  huangshan: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=75', // 黃山
  jiuzhaigou: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=75', // 九寨溝

  // 日本
  nagoya: 'https://images.unsplash.com/photo-1583499976516-20fdb6a0d463?w=1200&q=75', // 名古屋城
  hiroshima: 'https://images.unsplash.com/photo-1578469550956-0e16b69c6a3d?w=1200&q=75', // 廣島
  hakone: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=75', // 箱根富士山
  takayama: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=75', // 高山老街
  nikko: 'https://images.unsplash.com/photo-1590556409324-aa1d1a4e1c29?w=1200&q=75', // 日光
  kamakura: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=1200&q=75', // 鎌倉大佛
  nara: 'https://images.unsplash.com/photo-1578469550956-0e16b69c6a3d?w=1200&q=75', // 奈良鹿
  kanazawa: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=75', // 金澤
  sendai: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=1200&q=75', // 仙台
  hakodate: 'https://images.unsplash.com/photo-1562828119-19e7a4f8b913?w=1200&q=75', // 函館夜景
  shirakawago: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=75', // 白川鄉
  kawagoe: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=75', // 川越

  // 韓國
  daegu: 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=1200&q=75', // 大邱
  gyeongju: 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=1200&q=75', // 慶州
  incheon: 'https://images.unsplash.com/photo-1585124804253-3e34e05c9120?w=1200&q=75', // 仁川

  // 泰國
  ayutthaya: 'https://images.unsplash.com/photo-1563492065213-4c4bb194eefc?w=1200&q=75', // 大城
  krabi: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200&q=75', // 喀比
  pattaya: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200&q=75', // 芭達雅
  'koh-samui': 'https://images.unsplash.com/photo-1537956965359-7573183d1f57?w=1200&q=75', // 蘇美島
  'hua-hin': 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200&q=75', // 華欣
  'chiang-rai': 'https://images.unsplash.com/photo-1563492065213-4c4bb194eefc?w=1200&q=75', // 清萊白廟

  // 越南
  hanoi: 'https://images.unsplash.com/photo-1509030458710-f24f3682df0d?w=1200&q=75', // 河內
  'ho-chi-minh': 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1200&q=75', // 胡志明市
  'da-nang': 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200&q=75', // 峴港
  'hoi-an': 'https://images.unsplash.com/photo-1555881675-d8d8d7b1c157?w=1200&q=75', // 會安古鎮
  'nha-trang': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=75', // 芽莊海灘
  hue: 'https://images.unsplash.com/photo-1555881675-d8d8d7b1c157?w=1200&q=75', // 順化
  'ha-long': 'https://images.unsplash.com/photo-1528127269322-539801943592?w=1200&q=75', // 下龍灣
  'phu-quoc': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=75', // 富國島
  sapa: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=75', // 沙壩梯田

  // 土耳其
  istanbul: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&q=75', // 伊斯坦堡
  cappadocia: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=1200&q=75', // 卡帕多奇亞熱氣球
  antalya: 'https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=1200&q=75', // 安塔利亞
  pamukkale: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=75', // 棉堡
  ephesus: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=75', // 以弗所

  // 埃及
  cairo: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=1200&q=75', // 開羅金字塔
  giza: 'https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=1200&q=75', // 吉薩金字塔
  luxor: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1200&q=75', // 路克索神廟
  aswan: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=1200&q=75', // 亞斯文
  alexandria: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=1200&q=75', // 亞歷山大港

  // 法國
  paris: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=75', // 巴黎鐵塔
  nice: 'https://images.unsplash.com/photo-1516815231560-8f41ec531527?w=1200&q=75', // 尼斯海灘
  lyon: 'https://images.unsplash.com/photo-1524746440122-141fba8e6f1c?w=1200&q=75', // 里昂
  marseille: 'https://images.unsplash.com/photo-1516815231560-8f41ec531527?w=1200&q=75', // 馬賽
  cannes: 'https://images.unsplash.com/photo-1516815231560-8f41ec531527?w=1200&q=75', // 坎城
  'mont-saint-michel': 'https://images.unsplash.com/photo-1549144511-f099e773c147?w=1200&q=75', // 聖米歇爾山
}

console.log(`已定義 ${Object.keys(citySpecificImages).length} 個城市的專屬圖片`)
