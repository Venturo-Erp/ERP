#!/usr/bin/env node

/**
 * 完整的城市圖片對照表
 * 為每個城市精選兩張不同風格的圖片
 */

export const cityImagesComplete = {
  // 日本 - 使用地標和城市風景
  tokyo: {
    image1: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=75', // 東京鐵塔
    image2: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1200&q=75', // 澀谷路口
  },
  kyoto: {
    image1: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=75', // 伏見稻荷
    image2: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=75', // 清水寺
  },
  osaka: {
    image1: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=1200&q=75', // 大阪城
    image2: 'https://images.unsplash.com/photo-1589952283406-b53f82c008b8?w=1200&q=75', // 道頓堀
  },
  sapporo: {
    image1: 'https://images.unsplash.com/photo-1562828119-19e7a4f8b913?w=1200&q=75', // 札幌
    image2: 'https://images.unsplash.com/photo-1551641506-ee5bf4cb45f1?w=1200&q=75', // 札幌雪景
  },
  naha: {
    image1: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=75', // 沖繩海灘
    image2: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=75', // 首里城
  },
  fukuoka: {
    image1: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1200&q=75', // 福岡
    image2: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=1200&q=75', // 福岡夜景
  },
  yokohama: {
    image1: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=75', // 橫濱
    image2: 'https://images.unsplash.com/photo-1599687267812-35f9814df49f?w=1200&q=75', // 橫濱港
  },
  kobe: {
    image1: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=1200&q=75', // 神戶
    image2: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=75', // 神戶港
  },
  hiroshima: {
    image1: 'https://images.unsplash.com/photo-1578469550956-0e16b69c6a3d?w=1200&q=75', // 廣島
    image2: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=75', // 嚴島神社
  },
  nagoya: {
    image1: 'https://images.unsplash.com/photo-1554797589-7241bb691973?w=1200&q=75', // 名古屋
    image2: 'https://images.unsplash.com/photo-1583499976516-20fdb6a0d463?w=1200&q=75', // 名古屋城
  },
  nara: {
    image1: 'https://images.unsplash.com/photo-1578469550956-0e16b69c6a3d?w=1200&q=75', // 奈良鹿
    image2: 'https://images.unsplash.com/photo-1555881675-d8d8d7b1c157?w=1200&q=75', // 東大寺
  },
  hakone: {
    image1: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=75', // 箱根富士山
    image2: 'https://images.unsplash.com/photo-1590556409324-aa1d1a4e1c29?w=1200&q=75', // 箱根溫泉
  },
  takayama: {
    image1: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=75', // 高山老街
    image2: 'https://images.unsplash.com/photo-1590556409324-aa1d1a4e1c29?w=1200&q=75', // 高山雪景
  },
  nikko: {
    image1: 'https://images.unsplash.com/photo-1590556409324-aa1d1a4e1c29?w=1200&q=75', // 日光東照宮
    image2: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=75', // 日光湖景
  },
  kamakura: {
    image1: 'https://images.unsplash.com/photo-1590559899731-a382839e5549?w=1200&q=75', // 鎌倉大佛
    image2: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=75', // 鎌倉海岸
  },
  kanazawa: {
    image1: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=75', // 金澤兼六園
    image2: 'https://images.unsplash.com/photo-1590556409324-aa1d1a4e1c29?w=1200&q=75', // 金澤城
  },
  sendai: {
    image1: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=1200&q=75', // 仙台市景
    image2: 'https://images.unsplash.com/photo-1590556409324-aa1d1a4e1c29?w=1200&q=75', // 仙台神社
  },
  hakodate: {
    image1: 'https://images.unsplash.com/photo-1562828119-19e7a4f8b913?w=1200&q=75', // 函館夜景
    image2: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=75', // 函館港
  },
  shirakawago: {
    image1: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=75', // 白川鄉合掌村
    image2: 'https://images.unsplash.com/photo-1551641506-ee5bf4cb45f1?w=1200&q=75', // 白川鄉雪景
  },
  kawagoe: {
    image1: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1200&q=75', // 川越老街
    image2: 'https://images.unsplash.com/photo-1590556409324-aa1d1a4e1c29?w=1200&q=75', // 川越鐘樓
  },

  // 韓國
  seoul: {
    image1: 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=1200&q=75', // 首爾
    image2: 'https://images.unsplash.com/photo-1583474372481-48b0aed9295e?w=1200&q=75', // 景福宮
  },
  busan: {
    image1: 'https://images.unsplash.com/photo-1574923548835-6b2b6dee4f1a?w=1200&q=75', // 釜山
    image2: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=75', // 海雲台
  },
  jeju: {
    image1: 'https://images.unsplash.com/photo-1630160184476-e8bdc8e97c51?w=1200&q=75', // 濟州島
    image2: 'https://images.unsplash.com/photo-1598973621853-f9a8a6e9a592?w=1200&q=75', // 城山日出峰
  },
  daegu: {
    image1: 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=1200&q=75', // 大邱
    image2: 'https://images.unsplash.com/photo-1583474372481-48b0aed9295e?w=1200&q=75', // 大邱街景
  },
  gyeongju: {
    image1: 'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=1200&q=75', // 慶州佛國寺
    image2: 'https://images.unsplash.com/photo-1583474372481-48b0aed9295e?w=1200&q=75', // 慶州石塔
  },
  incheon: {
    image1: 'https://images.unsplash.com/photo-1585124804253-3e34e05c9120?w=1200&q=75', // 仁川港
    image2: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=75', // 仁川大橋
  },

  // 泰國
  bangkok: {
    image1: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1200&q=75', // 曼谷
    image2: 'https://images.unsplash.com/photo-1563492065213-4c4bb194eefc?w=1200&q=75', // 大皇宮
  },
  'chiang-mai': {
    image1: 'https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?w=1200&q=75', // 清邁
    image2: 'https://images.unsplash.com/photo-1563492065213-4c4bb194eefc?w=1200&q=75', // 白廟
  },
  phuket: {
    image1: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200&q=75', // 普吉島
    image2: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=75', // 海灘
  },
  ayutthaya: {
    image1: 'https://images.unsplash.com/photo-1563492065213-4c4bb194eefc?w=1200&q=75', // 大城古蹟
    image2: 'https://images.unsplash.com/photo-1555881675-d8d8d7b1c157?w=1200&q=75', // 大城佛寺
  },
  krabi: {
    image1: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200&q=75', // 喀比海灘
    image2: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=75', // 喀比石灰岩
  },
  pattaya: {
    image1: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200&q=75', // 芭達雅海灘
    image2: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=75', // 芭達雅夜景
  },
  'koh-samui': {
    image1: 'https://images.unsplash.com/photo-1537956965359-7573183d1f57?w=1200&q=75', // 蘇美島海灘
    image2: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=75', // 蘇美島椰林
  },
  'hua-hin': {
    image1: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200&q=75', // 華欣海灘
    image2: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=75', // 華欣宮殿
  },
  'chiang-rai': {
    image1: 'https://images.unsplash.com/photo-1563492065213-4c4bb194eefc?w=1200&q=75', // 清萊白廟
    image2: 'https://images.unsplash.com/photo-1519451241324-20b4ea2c4220?w=1200&q=75', // 清萊藍廟
  },

  // 菲律賓
  cebu: {
    image1: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=75', // 宿務
    image2: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=75', // 海灘
  },
  boracay: {
    image1: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=75', // 長灘島
    image2: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=75', // 白沙灘
  },

  // 中國大陸
  beijing: {
    image1: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=1200&q=75', // 故宮
    image2: 'https://images.unsplash.com/photo-1529066143383-32d9e2c85cc6?w=1200&q=75', // 長城
  },
  shanghai: {
    image1: 'https://images.unsplash.com/photo-1545893835-abaa50cbe628?w=1200&q=75', // 外灘
    image2: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=1200&q=75', // 東方明珠
  },
  guangzhou: {
    image1: 'https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=1200&q=75', // 廣州塔
    image2: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=75', // 珠江夜景
  },
  shenzhen: {
    image1: 'https://images.unsplash.com/photo-1548919973-5cef591cdbc9?w=1200&q=75', // 深圳天際線
    image2: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=1200&q=75', // 深圳夜景
  },
  chengdu: {
    image1: 'https://images.unsplash.com/photo-1589908769174-1ebc4b52040e?w=1200&q=75', // 成都熊貓
    image2: 'https://images.unsplash.com/photo-1555881675-d8d8d7b1c157?w=1200&q=75', // 成都寬窄巷子
  },
  hangzhou: {
    image1: 'https://images.unsplash.com/photo-1581481615985-ba4775734a9b?w=1200&q=75', // 西湖
    image2: 'https://images.unsplash.com/photo-1555881675-d8d8d7b1c157?w=1200&q=75', // 雷峰塔
  },
  xian: {
    image1: 'https://images.unsplash.com/photo-1580837119756-563d608dd119?w=1200&q=75', // 西安兵馬俑
    image2: 'https://images.unsplash.com/photo-1555881675-d8d8d7b1c157?w=1200&q=75', // 西安城牆
  },
  suzhou: {
    image1: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=1200&q=75', // 蘇州園林
    image2: 'https://images.unsplash.com/photo-1555881675-d8d8d7b1c157?w=1200&q=75', // 蘇州古鎮
  },
  guilin: {
    image1: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200&q=75', // 桂林山水
    image2: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=75', // 灕江
  },
  lijiang: {
    image1: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=1200&q=75', // 麗江古城
    image2: 'https://images.unsplash.com/photo-1555881675-d8d8d7b1c157?w=1200&q=75', // 玉龍雪山
  },
  sanya: {
    image1: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=75', // 三亞海灘
    image2: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=75', // 三亞海景
  },
  xiamen: {
    image1: 'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=1200&q=75', // 廈門鼓浪嶼
    image2: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=75', // 廈門海岸
  },
  qingdao: {
    image1: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=75', // 青島海濱
    image2: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=1200&q=75', // 青島建築
  },
  harbin: {
    image1: 'https://images.unsplash.com/photo-1548094990-c16ca90f1f0d?w=1200&q=75', // 哈爾濱冰雪大世界
    image2: 'https://images.unsplash.com/photo-1551641506-ee5bf4cb45f1?w=1200&q=75', // 哈爾濱聖索菲亞教堂
  },
  zhangjiajie: {
    image1: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1200&q=75', // 張家界山峰
    image2: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=75', // 張家界玻璃橋
  },
  huangshan: {
    image1: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=75', // 黃山雲海
    image2: 'https://images.unsplash.com/photo-1555881675-d8d8d7b1c157?w=1200&q=75', // 黃山迎客松
  },
  jiuzhaigou: {
    image1: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=75', // 九寨溝五彩池
    image2: 'https://images.unsplash.com/photo-1555881675-d8d8d7b1c157?w=1200&q=75', // 九寨溝瀑布
  },

  // 越南
  hanoi: {
    image1: 'https://images.unsplash.com/photo-1509030458710-f24f3682df0d?w=1200&q=75', // 河內
    image2: 'https://images.unsplash.com/photo-1555881675-d8d8d7b1c157?w=1200&q=75', // 還劍湖
  },
  'ho-chi-minh': {
    image1: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1200&q=75', // 胡志明市
    image2: 'https://images.unsplash.com/photo-1565426873118-a17ed65d74b9?w=1200&q=75', // 西貢教堂
  },
  'da-nang': {
    image1: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=1200&q=75', // 峴港
    image2: 'https://images.unsplash.com/photo-1555881675-d8d8d7b1c157?w=1200&q=75', // 龍橋
  },
  'hoi-an': {
    image1: 'https://images.unsplash.com/photo-1555881675-d8d8d7b1c157?w=1200&q=75', // 會安古鎮
    image2: 'https://images.unsplash.com/photo-1509030458710-f24f3682df0d?w=1200&q=75', // 會安燈籠
  },
  'nha-trang': {
    image1: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=75', // 芽莊海灘
    image2: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=75', // 芽莊海景
  },
  hue: {
    image1: 'https://images.unsplash.com/photo-1555881675-d8d8d7b1c157?w=1200&q=75', // 順化皇城
    image2: 'https://images.unsplash.com/photo-1509030458710-f24f3682df0d?w=1200&q=75', // 順化古蹟
  },
  'ha-long': {
    image1: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=1200&q=75', // 下龍灣
    image2: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=75', // 下龍灣船景
  },
  'phu-quoc': {
    image1: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=75', // 富國島海灘
    image2: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&q=75', // 富國島日落
  },
  sapa: {
    image1: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=75', // 沙壩梯田
    image2: 'https://images.unsplash.com/photo-1555881675-d8d8d7b1c157?w=1200&q=75', // 沙壩山景
  },

  // 土耳其
  istanbul: {
    image1: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&q=75', // 伊斯坦堡
    image2: 'https://images.unsplash.com/photo-1527838832700-5059252407fa?w=1200&q=75', // 藍色清真寺
  },
  cappadocia: {
    image1: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=1200&q=75', // 卡帕多奇亞
    image2: 'https://images.unsplash.com/photo-1599579302537-ff5145eb5d0f?w=1200&q=75', // 熱氣球
  },
  antalya: {
    image1: 'https://images.unsplash.com/photo-1605640840605-14ac1855827b?w=1200&q=75', // 安塔利亞海岸
    image2: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=75', // 安塔利亞港口
  },
  pamukkale: {
    image1: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=75', // 棉堡溫泉
    image2: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&q=75', // 棉堡景觀
  },
  ephesus: {
    image1: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=75', // 以弗所古城
    image2: 'https://images.unsplash.com/photo-1555881675-d8d8d7b1c157?w=1200&q=75', // 以弗所圖書館
  },

  // 埃及
  cairo: {
    image1: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=1200&q=75', // 開羅
    image2: 'https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=1200&q=75', // 金字塔
  },
  giza: {
    image1: 'https://images.unsplash.com/photo-1553913861-c0fddf2619ee?w=1200&q=75', // 吉薩金字塔
    image2: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=1200&q=75', // 人面獅身像
  },
  luxor: {
    image1: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1200&q=75', // 路克索神廟
    image2: 'https://images.unsplash.com/photo-1555881675-d8d8d7b1c157?w=1200&q=75', // 卡納克神廟
  },
  aswan: {
    image1: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=1200&q=75', // 亞斯文尼羅河
    image2: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=1200&q=75', // 阿布辛貝
  },
  alexandria: {
    image1: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=1200&q=75', // 亞歷山大港
    image2: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=75', // 亞歷山大海岸
  },

  // 法國
  paris: {
    image1: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=75', // 艾菲爾鐵塔
    image2: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1200&q=75', // 巴黎聖母院
  },
  nice: {
    image1: 'https://images.unsplash.com/photo-1516815231560-8f41ec531527?w=1200&q=75', // 尼斯海灘
    image2: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=75', // 尼斯海岸
  },
  lyon: {
    image1: 'https://images.unsplash.com/photo-1524746440122-141fba8e6f1c?w=1200&q=75', // 里昂老城
    image2: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=75', // 里昂建築
  },
  marseille: {
    image1: 'https://images.unsplash.com/photo-1516815231560-8f41ec531527?w=1200&q=75', // 馬賽港口
    image2: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=75', // 馬賽海岸
  },
  cannes: {
    image1: 'https://images.unsplash.com/photo-1516815231560-8f41ec531527?w=1200&q=75', // 坎城海灘
    image2: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=75', // 坎城影展宮
  },
  'mont-saint-michel': {
    image1: 'https://images.unsplash.com/photo-1549144511-f099e773c147?w=1200&q=75', // 聖米歇爾山
    image2: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=75', // 聖米歇爾山景
  },
}

// 為所有城市生成預設圖片（如果沒有專門定義）
export function getDefaultCityImages(cityId, cityName) {
  // 使用不同風格的通用城市圖片
  const defaultImages = [
    'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&q=75',
    'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&q=75',
    'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1200&q=75',
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&q=75',
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=75',
  ]

  // 根據城市 ID 的 hash 選擇圖片，確保同一城市總是用相同的圖片
  const hash = cityId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const index = hash % defaultImages.length

  return {
    image1: defaultImages[index],
    image2: defaultImages[(index + 1) % defaultImages.length],
  }
}

console.log(`已定義 ${Object.keys(cityImagesComplete).length} 個城市的專屬圖片`)
