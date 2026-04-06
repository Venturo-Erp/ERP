#!/usr/bin/env tsx
/**
 * 芭達雅景點完整資料填充 - 第二批（33個）
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import fetch from 'node-fetch'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const PEXELS_API_KEY = process.env.NEXT_PUBLIC_PEXELS_API_KEY!

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const BUCKET_NAME = 'attractions'

// 景點資訊
const attractionInfo: Record<
  string,
  {
    description: string
    address?: string
    opening_hours?: string
    duration_minutes?: number
    tags?: string[]
  }
> = {
  春武里大峽谷: {
    description:
      '《春武里大峽谷》原為廢棄採石場，積水後形成碧綠深潭，陡峭岩壁環繞，宛如泰國版大峽谷。近年成為網美熱點，遊客攀爬岩石跳水、划獨木舟，或在岸邊咖啡廳俯瞰全景。日落時分，金光灑落湖面，粗獷地貌與靜謐水色形成強烈對比，是冒險與閒適並存的獨特景點。',
    duration_minutes: 120,
    tags: ['自然', '網美', '戶外', '攝影'],
  },
  沙美島: {
    description:
      '《沙美島》距芭達雅約7公里，擁有泰國東部最純淨的白沙海灘。島上開發程度低，保留原始熱帶風情，椰林搖曳、海水清澈見底。日間浮潛、海灘排球、香蕉船等水上活動豐富，夜晚則有精彩的火舞表演。相較熱鬧的芭達雅本島，這裡更適合想遠離塵囂、享受悠閒海島時光的旅人。',
    duration_minutes: 300,
    tags: ['海島', '海灘', '浮潛', '度假'],
  },
  'Jomtien Beach': {
    description:
      '《Jomtien Beach》位於芭達雅南方，比市區海灘更寧靜悠閒。6公里長的沙灘適合散步、慢跑，水上活動業者提供拖曳傘、水上摩托車、帆船等選擇。沿岸餐廳、咖啡廳林立，可邊享用海鮮邊欣賞日落。這裡遊客以歐美退休人士為主，氛圍慵懶放鬆，是逃離市區喧囂的好去處。',
    duration_minutes: 180,
    tags: ['海灘', '水上活動', '悠閒', '日落'],
  },
  暹羅傳奇樂園: {
    description:
      '《暹羅傳奇樂園》以泰國三大王朝歷史為主題，重現素可泰、大城、拉達那哥辛時期建築與文化。園區分為文化村、市集、表演劇場，遊客可體驗泰拳、傳統舞蹈、手工藝製作。夜間水上劇場結合煙火、燈光、特技，呈現泰國史詩故事。對於想深入了解泰國文化又不失娛樂性的旅客，是絕佳選擇。',
    opening_hours: '09:00-22:00',
    duration_minutes: 240,
    tags: ['文化', '主題樂園', '表演', '親子'],
  },
  哥倫比亞影業水世界: {
    description:
      '《哥倫比亞影業水世界》是全球首座以好萊塢電影為主題的水上樂園，佔地30萬平方公尺。園區重現《捉鬼敢死隊》、《黑衣人》、《尖叫旅社》等經典電影場景，每項設施結合劇情元素。擁有亞洲最高的自由落體滑水道，人工海浪池可達2.5公尺高。適合電影迷與追求刺激的遊客，夏季消暑首選。',
    opening_hours: '10:00-18:00',
    duration_minutes: 300,
    tags: ['主題樂園', '刺激', '親子', '電影'],
  },
  格蘭島: {
    description:
      '《格蘭島》又稱珊瑚島，是芭達雅外海最熱門的一日遊目的地。快艇15分鐘即達，島上有塔威恩、桑灣、天恩等多個海灘，各具特色。水上活動項目豐富：拖曳傘、香蕉船、海底漫步、浮潛看珊瑚。島上餐廳提供新鮮海鮮，可邊用餐邊看海。相較沙美島更熱鬧，適合喜愛水上刺激活動的遊客。',
    duration_minutes: 360,
    tags: ['海島', '水上活動', '浮潛', '熱鬧'],
  },
  翡翠灣: {
    description:
      '《翡翠灣》提供17合一水上活動套裝，包括拖曳傘、水上摩托車、香蕉船、海底漫步等，一次滿足所有海上冒險需求。業者設備新穎、教練專業，強調安全與服務品質。活動據點位於芭達雅近郊海灣，水質清澈、風浪穩定。適合家庭、情侶、朋友團體，想在短時間體驗多種水上運動的遊客。',
    duration_minutes: 180,
    tags: ['水上活動', '刺激', '套裝行程', '海灘'],
  },
  'GREAT&GRAND Sweet Destination': {
    description:
      '《GREAT&GRAND Sweet Destination》是甜點主題夢幻樂園，園區佈置巨型糖果、馬卡龍、冰淇淋裝置藝術，色彩繽紛宛如童話世界。除了拍照打卡，還有甜點DIY工坊、咖啡廳、伴手禮店。特別適合親子家庭與喜愛少女風的遊客，每個角落都是Instagram熱門打卡點。',
    opening_hours: '10:00-19:00',
    duration_minutes: 90,
    tags: ['親子', '網美', '甜點', '室內'],
  },
  迷你暹羅小人國: {
    description:
      '《迷你暹羅小人國》展示超過100座泰國與世界知名建築的1:25微縮模型，包括大皇宮、艾菲爾鐵塔、自由女神像等。園區分為泰國區與國際區，精緻的模型工藝令人讚嘆。夜間開放時，燈光照明讓建築更顯夢幻。適合親子旅遊、建築愛好者，也是雨天的好去處。',
    opening_hours: '08:00-22:00',
    duration_minutes: 90,
    tags: ['親子', '建築', '教育', '夜遊'],
  },
  飛機夜市: {
    description:
      '《飛機夜市》以退役客機為地標，是芭達雅新興的大型美食市集。攤位提供泰式小吃、海鮮燒烤、創意甜品、手工啤酒，價格親民實惠。週末有現場樂隊表演，氣氛熱鬧。遊客可登上飛機內部參觀，機艙改裝成咖啡廳與展覽空間。想體驗在地夜市文化、品嚐道地美食的旅客不容錯過。',
    opening_hours: '17:00-23:00',
    duration_minutes: 120,
    tags: ['夜市', '美食', '在地', '特色'],
  },
  邦盛魚市場: {
    description:
      '《邦盛魚市場》是春武里府最大的海鮮市場，凌晨漁船返港卸貨，新鮮漁獲直送攤位。遊客可親眼挑選龍蝦、螃蟹、海魚，交由現場餐廳代為料理，價格實惠、份量足。市場周圍有傳統小吃攤，販售泰式甜品、炸物。想體驗在地生活、品嚐最新鮮海鮮的旅客，值得一訪。',
    opening_hours: '06:00-18:00',
    duration_minutes: 120,
    tags: ['市場', '海鮮', '在地', '美食'],
  },
  'Tutu Beach': {
    description:
      '《Tutu Beach》是海邊粉紅沙灘咖啡廳，以夢幻的粉紅色調裝潢聞名。戶外沙灘區擺放粉色躺椅、遮陽傘、浮床，室內則有粉紅牆面與霓虹燈裝飾。供應咖啡、特調飲品、輕食，價格合理。日落時分最美，粉色系佈置與金色晚霞相映，是網美必訪的拍照勝地。',
    opening_hours: '10:00-22:00',
    duration_minutes: 90,
    tags: ['咖啡廳', '網美', '海灘', '日落'],
  },
  美人魚餐廳: {
    description:
      '《美人魚餐廳》以海底世界為主題，餐廳內部打造大型水族箱，用餐時可觀賞熱帶魚群游動。裝潢融合貝殼、珊瑚、漁網等元素，營造夢幻海洋氛圍。菜單主打泰式海鮮與西式料理，份量大、擺盤精緻。親子友善，孩子對水族箱充滿興趣。適合家庭聚餐、情侶約會的特色餐廳。',
    opening_hours: '11:00-22:00',
    duration_minutes: 90,
    tags: ['餐廳', '親子', '海鮮', '主題'],
  },
  'Lof Land': {
    description:
      '《Lof Land》位於春武里大峽谷旁，是俯瞰峽谷全景的網美咖啡廳。戶外平台設有透明玻璃地板、鞦韆、相框裝置，讓遊客拍出懸空照片。室內工業風設計，供應咖啡、蛋糕、泰式料理。日落時段最美，金光灑落碧綠湖面，是攝影愛好者與情侶約會的熱門景點。',
    opening_hours: '09:00-18:00',
    duration_minutes: 90,
    tags: ['咖啡廳', '網美', '景觀', '攝影'],
  },
  'Cave Beach Club': {
    description:
      '《Cave Beach Club》藏身於天然洞穴中，是芭達雅最特別的濱海咖啡廳。洞穴內部保留原始岩壁紋理,打造涼爽舒適的用餐環境。戶外座位區直面大海，可享受海風與浪聲。供應精品咖啡、調酒、地中海料理，價位中高。適合追求獨特體驗、喜愛探索秘境的旅客。',
    opening_hours: '11:00-23:00',
    duration_minutes: 120,
    tags: ['咖啡廳', '特色', '海灘', '景觀'],
  },
  'Baan Mae Sri 豬雜湯': {
    description:
      '《Baan Mae Sri》是在地人推薦的豬雜湯老店，營業超過30年。招牌豬雜湯選用新鮮豬內臟，搭配香菜、油蔥、胡椒，湯頭清甜不腥。另有豬血糕、滷大腸、炸豬皮等配菜，價格親民。凌晨開始營業，是宵夜或早餐的絕佳選擇。想品嚐道地泰式小吃、體驗庶民美食的旅客必訪。',
    opening_hours: '02:00-12:00',
    duration_minutes: 45,
    tags: ['小吃', '在地', '早餐', '特色'],
  },
  羅馬金宮劇場人妖秀: {
    description:
      '《羅馬金宮劇場》模仿古羅馬競技場外觀，是芭達雅規模最大的人妖秀場。演出融合歌舞、特技、華麗服裝，演員妝容精緻、身材姣好，演技專業。每晚兩場表演，曲目涵蓋泰國、中國、韓國、歐美流行歌曲。演出後可與演員合照，是體驗泰國特色文化、適合全家觀賞的娛樂節目。',
    opening_hours: '18:00-23:00',
    duration_minutes: 90,
    tags: ['表演', '文化', '夜生活', '必遊'],
  },
  蒂芬妮人妖秀: {
    description:
      '《蒂芬妮人妖秀》創立於1974年，是泰國歷史最悠久、最知名的人妖秀。劇場裝潢華麗，音響燈光設備一流。演出結合百老匯式歌舞劇與泰國文化元素，服裝精緻奢華，舞台佈景變換豐富。演員訓練嚴格，演出水準極高。觀賞後可合照留念，是芭達雅必看的經典表演。',
    opening_hours: '18:00-22:30',
    duration_minutes: 90,
    tags: ['表演', '經典', '文化', '必遊'],
  },
  東方公主號遊輪: {
    description:
      '《東方公主號遊輪》提供芭達雅灣晚宴巡航體驗，船上享用泰式與國際自助晚餐，邊用餐邊欣賞海天盛宴表演。表演包含泰國傳統舞蹈、現代歌舞、魔術、喜劇，娛樂性十足。夜晚海風徐徐、城市燈火閃爍,營造浪漫氛圍。適合情侶、家庭、團體旅遊，是芭達雅獨特的夜間體驗。',
    opening_hours: '18:00-21:00',
    duration_minutes: 180,
    tags: ['遊輪', '晚餐', '表演', '浪漫'],
  },
  'All Star 全明星號遊輪': {
    description:
      '《All Star 全明星號》是芭達雅最新的豪華遊輪，船體設施新穎、空間寬敞。提供國際自助餐buffet，海鮮、燒烤、甜點選擇豐富。船上表演結合歌舞、雜技、DJ派對,氣氛熱鬧。頂層甲板可吹海風、欣賞夜景。相較傳統遊輪更年輕化、娛樂性更高,適合喜愛熱鬧氛圍的旅客。',
    opening_hours: '18:30-21:30',
    duration_minutes: 180,
    tags: ['遊輪', '晚餐', '表演', '派對'],
  },
  沙美島火舞餐廳: {
    description:
      '《沙美島火舞餐廳》每晚在沙灘上演出驚險刺激的火舞秀,表演者揮舞火把、火棒,配合音樂節奏展現高難度特技。餐廳供應泰式海鮮BBQ與西式料理,座位區直面海灘。夜幕低垂、火光搖曳、海浪拍岸,營造原始而浪漫的氛圍。是沙美島夜生活的亮點,適合情侶與追求特殊體驗的旅客。',
    opening_hours: '18:00-23:00',
    duration_minutes: 120,
    tags: ['表演', '海灘', '餐廳', '夜生活'],
  },
  'Max 泰拳比賽': {
    description:
      '《Max 泰拳》是芭達雅知名的泰拳競技場,每週三、六舉辦職業泰拳比賽。拳手來自泰國各地,實力堅強、比賽激烈。賽前有傳統拜師儀式、音樂伴奏,呈現泰拳文化精髓。觀眾席距離擂台近,能感受拳拳到肉的震撼。對武術愛好者、想體驗泰國國技魅力的旅客,是不可錯過的文化體驗。',
    opening_hours: '19:00-23:00',
    duration_minutes: 150,
    tags: ['表演', '文化', '運動', '刺激'],
  },
  尚泰芭提雅購物中心: {
    description:
      '《尚泰芭提雅購物中心》是泰國連鎖百貨品牌Central旗下購物商場,結合購物、餐飲、娛樂。館內有國際精品、泰國本土品牌、美妝保養、電影院、超市。地下美食街提供平價泰式料理,頂樓餐廳景觀開闊。空調舒適、環境整潔,是雨天避暑、血拚購物的好去處。鄰近芭達雅海灘,交通便利。',
    opening_hours: '10:00-22:00',
    duration_minutes: 180,
    tags: ['購物', '美食', '百貨', '室內'],
  },
  信不信由你博物館: {
    description:
      '《信不信由你博物館》展示全球奇人異事、古怪收藏,包括雙頭動物標本、酷刑器具、世界紀錄、錯視藝術等300多件展品。館內設計互動性強,遊客可參與體驗遊戲、拍攝趣味照片。適合親子、情侶、好奇心旺盛的旅客。位於皇家花園購物中心內,逛街購物後可順道參觀。',
    opening_hours: '11:00-23:00',
    duration_minutes: 90,
    tags: ['博物館', '親子', '室內', '趣味'],
  },
  綠山動物園: {
    description:
      '《綠山動物園》是泰國最大的開放式動物園,佔地800畝,飼養超過300種、8000隻動物。園區分為步行區與車行區,遊客可搭園區巴士或自駕遊覽。動物包括長頸鹿、斑馬、河馬、老虎、熊等,部分區域可餵食。每日有海獅、大象、鳥類表演。適合親子家庭,建議安排半天以上時間。',
    opening_hours: '08:00-18:00',
    duration_minutes: 240,
    tags: ['動物園', '親子', '戶外', '教育'],
  },
  鱷魚農場: {
    description:
      '《鱷魚農場》又稱百萬年石頭公園,園區養殖數千條鱷魚,包括淡水鱷與鹹水鱷。每日舉辦驚險的人鱷搏鬥表演,訓練師將頭伸入鱷魚口中、騎乘鱷魚,展現高超技藝。園區另有恐龍化石、奇石展示、大象表演。遊客可餵食鱷魚、與小鱷魚合照。適合追求刺激、好奇心強的旅客。',
    opening_hours: '08:00-18:00',
    duration_minutes: 120,
    tags: ['動物', '表演', '刺激', '特色'],
  },
  大象村: {
    description:
      '《大象村》提供與大象近距離互動的體驗,遊客可餵食、幫大象洗澡、觀看大象踢足球、畫畫等才藝表演。園區強調動物福利,象群活動空間充足、照顧良好。騎象體驗路線穿越森林、溪流,感受泰國傳統交通方式。適合親子家庭、動物愛好者,是了解大象文化的好機會。',
    opening_hours: '08:00-17:00',
    duration_minutes: 180,
    tags: ['動物', '體驗', '親子', '文化'],
  },
  爽泰度假莊園: {
    description:
      '《爽泰度假莊園》重現泰國傳統鄉村生活,遊客可體驗編織、陶藝、泰菜烹飪、傳統舞蹈等文化活動。園區保留木造高腳屋建築、水牛、稻田,呈現昔日泰國農村風貌。提供泰式午餐、下午茶,食材新鮮、口味道地。適合想深入了解泰國文化、遠離城市喧囂的旅客,半日遊即可。',
    opening_hours: '09:00-17:00',
    duration_minutes: 180,
    tags: ['文化', '體驗', '鄉村', '親子'],
  },
  美軍徒步街: {
    description:
      '《美軍徒步街》又稱Walking Street,是芭達雅最著名的夜生活區。長約500公尺的街道兩側,酒吧、夜店、餐廳林立,霓虹燈閃爍、音樂震耳。街頭藝人表演、Go-Go舞者招攬,氛圍熱鬧奔放。凌晨最熱鬧,人潮洶湧。適合成年旅客,想體驗芭達雅夜生活文化者可一探究竟,但需注意安全與自我保護。',
    opening_hours: '18:00-03:00',
    duration_minutes: 120,
    tags: ['夜生活', '街區', '成人', '文化'],
  },
  唐人街: {
    description:
      '《唐人街》又稱SOHO Town,是芭達雅新興的中式商圈。街道建築模仿上海、香港老街風格,紅燈籠高掛、中文招牌林立。店家販售中式餐飲、茶飲、伴手禮,也有酒吧、按摩店。夜間燈光璀璨,營造復古東方氛圍。適合華人旅客、想體驗異國中的中國風情、拍照打卡的遊客。',
    opening_hours: '11:00-01:00',
    duration_minutes: 90,
    tags: ['街區', '購物', '美食', '特色'],
  },
  日本街: {
    description:
      '《日本街》又稱Japan Village,重現日本傳統街道風貌,木造建築、紙燈籠、鳥居牌樓營造和風氛圍。街區內有日本料理店、居酒屋、拉麵店、壽司吧,也有浴衣租借、茶道體驗。夜晚點燈後特別有fu,彷彿置身京都小巷。適合日本文化愛好者、想在泰國體驗日式風情的旅客。',
    opening_hours: '11:00-23:00',
    duration_minutes: 90,
    tags: ['街區', '美食', '文化', '網美'],
  },
  '3D 立體美術館': {
    description:
      '《3D立體美術館》又稱Art in Paradise,是泰國最大的3D錯視藝術館。超過150幅大型壁畫,涵蓋海底世界、野生動物、名畫重現、奇幻場景等主題。遊客站在特定位置拍照,可創造出逼真的3D立體效果,互動性極強。適合親子、情侶、網美,是雨天備案與拍照打卡的熱門景點。',
    opening_hours: '09:00-21:00',
    duration_minutes: 90,
    tags: ['博物館', '網美', '親子', '室內'],
  },
  將軍山觀景台: {
    description:
      '《將軍山觀景台》又稱帕塔納克山(Phra Tamnak Mountain),是俯瞰芭達雅灣的最佳地點。山頂設有觀景平台,180度視野將月牙形海灣、城市天際線盡收眼底。傍晚時分,夕陽餘暉染紅天際,遊艇歸航、漁船點燈,景色絕美。山腳有大佛寺,可順道參訪。免費入場,是攝影愛好者與情侶約會的熱門景點。',
    opening_hours: '24小時',
    duration_minutes: 60,
    tags: ['觀景台', '夕陽', '免費', '攝影'],
  },
  'Pattaya Park Tower': {
    description:
      '《Pattaya Park Tower》是56層樓高的綜合娛樂大樓,頂樓旋轉觀景餐廳可360度俯瞰芭達雅全景。最著名的是高空滑樓體驗,遊客從55樓以時速40公里沿外牆垂直下滑至地面,驚險刺激。另有高空彈跳、懸崖鞦韆等極限運動。適合追求刺激、膽大心細的冒險者,也是挑戰自我極限的絕佳機會。',
    opening_hours: '10:00-18:00',
    duration_minutes: 120,
    tags: ['極限運動', '刺激', '觀景', '特色'],
  },
}

/**
 * 搜尋 Pexels 圖片
 */
async function searchPexels(query: string, perPage = 2) {
  const params = new URLSearchParams({
    query,
    per_page: String(perPage),
    orientation: 'landscape',
  })

  const response = await fetch(`https://api.pexels.com/v1/search?${params}`, {
    headers: { Authorization: PEXELS_API_KEY },
  })

  if (!response.ok) return []

  const data: any = await response.json()
  return (data.photos || []).map((p: any) => p.src.large)
}

/**
 * 下載圖片並上傳到 Storage
 */
async function downloadAndUpload(imageUrl: string, attractionId: string, index: number) {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`下載失敗: ${response.status}`)
    }

    const buffer = await response.buffer()

    const ext = 'jpg'
    const filename = `thailand/${attractionId}-${index}.${ext}`

    const { error } = await supabase.storage.from(BUCKET_NAME).upload(filename, buffer, {
      contentType: `image/${ext}`,
      upsert: true,
    })

    if (error) throw error

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filename)

    return publicUrl
  } catch (error) {
    console.error(`  ⚠️  上傳失敗:`, error)
    return null
  }
}

/**
 * 處理單個景點
 */
async function processAttraction(attraction: any) {
  console.log(`\n處理: ${attraction.name} (${attraction.english_name})`)

  const info = attractionInfo[attraction.name]

  if (!info) {
    console.log(`  ⚠️  沒有預設資訊，跳過`)
    return
  }

  // 1. 搜尋照片
  const query = `${attraction.english_name} Pattaya Thailand`
  const photoUrls = await searchPexels(query, 2)

  if (photoUrls.length === 0) {
    console.log(`  ⚠️  找不到照片，使用泰國通用關鍵字`)
    const fallbackQuery = `${attraction.english_name} Thailand`
    const fallbackPhotos = await searchPexels(fallbackQuery, 2)
    if (fallbackPhotos.length > 0) {
      photoUrls.push(...fallbackPhotos)
    }
  }

  if (photoUrls.length === 0) {
    console.log(`  ❌ 找不到照片`)
    // 但還是更新描述
    const { error } = await supabase
      .from('attractions')
      .update({
        description: info.description,
        address: info.address,
        opening_hours: info.opening_hours,
        duration_minutes: info.duration_minutes,
        tags: info.tags,
        updated_at: new Date().toISOString(),
      })
      .eq('id', attraction.id)

    if (!error) {
      console.log(`  ⚠️  已更新描述（但沒照片）`)
    }
    return
  }

  // 2. 下載並上傳
  const uploadedUrls: string[] = []

  for (let i = 0; i < Math.min(photoUrls.length, 2); i++) {
    const storageUrl = await downloadAndUpload(photoUrls[i], attraction.id, i + 1)
    if (storageUrl) {
      uploadedUrls.push(storageUrl)
    }
  }

  // 3. 更新資料庫
  const updateData: any = {
    description: info.description,
    address: info.address,
    opening_hours: info.opening_hours,
    duration_minutes: info.duration_minutes,
    tags: info.tags,
    updated_at: new Date().toISOString(),
  }

  if (uploadedUrls.length > 0) {
    updateData.images = uploadedUrls
    updateData.thumbnail = uploadedUrls[0]
  }

  const { error } = await supabase.from('attractions').update(updateData).eq('id', attraction.id)

  if (error) {
    console.log(`  ❌ 資料庫更新失敗:`, error)
    return
  }

  console.log(`  ✅ 完成（描述 + ${uploadedUrls.length} 張照片）`)
}

/**
 * 主程式
 */
async function main() {
  console.log('🚀 開始填充芭達雅景點資料（第二批）...\n')

  const { data: attractions, error } = await supabase
    .from('attractions')
    .select('id, name, english_name')
    .eq('country_id', 'thailand')
    .eq('city_id', 'pattaya')
    .in('name', Object.keys(attractionInfo))

  if (error) {
    console.error('❌ 查詢失敗:', error)
    process.exit(1)
  }

  console.log(`📋 找到 ${attractions.length} 個景點\n`)

  let success = 0
  let failed = 0

  for (const attraction of attractions) {
    try {
      await processAttraction(attraction)
      success++
    } catch (e) {
      console.error(`❌ 處理失敗:`, e)
      failed++
    }

    // API 限制：18 秒/次
    await new Promise(resolve => setTimeout(resolve, 18000))
  }

  console.log(`\n✅ 完成！成功 ${success} 個，失敗 ${failed} 個`)
}

main().catch(console.error)
