import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from('attractions')
  .select('id, name_zh, name_en, city, category')
  .eq('country', 'Thailand')
  .order('city', { ascending: true })
  .order('name_zh', { ascending: true });

if (error) {
  console.error('錯誤:', error);
  process.exit(1);
}

console.log(`泰國總景點數：${data.length}\n`);

// 按城市分組
const byCity = data.reduce((acc, item) => {
  if (!acc[item.city]) acc[item.city] = [];
  acc[item.city].push(item);
  return acc;
}, {});

Object.entries(byCity).forEach(([city, attractions]) => {
  console.log(`\n【${city}】(${attractions.length} 個)`);
  attractions.forEach((attr, i) => {
    console.log(`${i + 1}. ${attr.name_zh} (${attr.name_en || 'N/A'}) - ${attr.category || 'N/A'}`);
  });
});

console.log('\n\n=== 芭達雅景點對比 ===\n');

// 芭達雅景點清單（從表單）
const pattayaList = [
  '七珍佛山',
  '春武里大峽谷',
  '芭達雅海底世界',
  '沙美島',
  'Jomtien Beach',
  '真理寺',
  '羅摩衍那水上樂園',
  '暹羅傳奇樂園',
  '哥倫比亞影業水世界',
  '暹羅冰雪世界',
  '格蘭島',
  '珊瑚島',
  '寶妮小馬俱樂部',
  '翡翠灣',
  'GREAT&GRAND Sweet Destination',
  '迷你暹羅小人國',
  '四方水上市場',
  '飛機夜市',
  '邦盛魚市場',
  'Tutu Beach',
  '美人魚餐廳',
  'Lof Land',
  'The Sky Gallery',
  'Cave Beach Club',
  'Baan Mae Sri',
  '羅馬金宮劇場',
  '蒂芬妮人妖秀',
  '東方公主號遊輪',
  'All Star 全明星號',
  '沙美島火舞餐廳',
  'Max 泰拳',
  '尚泰芭提雅購物中心',
  '信不信由你博物館',
  '老虎園',
  '綠山動物園',
  '鱷魚農場',
  '大象村',
  '泰式按摩',
  '爽泰度假莊園',
  '美軍徒步街',
  '東芭樂園',
  '唐人街',
  '日本街',
  '3D立體美術館',
  '將軍山觀景台',
  'Pattaya Park Tower'
];

// 檢查哪些不在資料庫
const pattayaInDB = data
  .filter(a => a.city === '芭達雅' || a.city === 'Pattaya')
  .map(a => a.name_zh);

const missing = pattayaList.filter(name => {
  return !pattayaInDB.some(dbName => 
    dbName.includes(name) || name.includes(dbName)
  );
});

console.log(`\n缺少的芭達雅景點 (${missing.length} 個):`);
missing.forEach((name, i) => {
  console.log(`${i + 1}. ${name}`);
});
