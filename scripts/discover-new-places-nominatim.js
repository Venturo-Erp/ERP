require('dotenv').config({ path: '/Users/william/Projects/venturo-erp/.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' }
});

// 目標城市 - 全亞洲主要旅遊城市
const TARGET_CITIES = [
  // 泰國
  { 
    countryId: 'thailand', 
    countryName: '泰國', 
    countryEn: 'Thailand', 
    cityId: 'chiang-mai', 
    cityZh: '清邁', 
    cityEn: 'Chiang Mai',
    categories: [
      { query: 'street food', category: 'street_food' },
      { query: 'night market', category: 'night_market' },
      { query: 'restaurant', category: 'restaurant' },
      { query: 'cafe', category: 'cafe' },
      { query: 'attraction', category: 'attraction' },
      { query: 'temple', category: 'temple' },
      { query: 'museum', category: 'museum' },
      { query: 'guesthouse', category: 'guesthouse' },
      { query: 'hotel', category: 'hotel' },
      { query: 'resort', category: 'resort' },
      { query: 'viewpoint', category: 'viewpoint' },
      { query: 'park', category: 'park' },
    ]
  },
  { 
    countryId: 'thailand', 
    countryName: '泰國', 
    countryEn: 'Thailand', 
    cityId: 'bangkok', 
    cityZh: '曼谷', 
    cityEn: 'Bangkok',
    categories: [
      { query: 'street food', category: 'street_food' },
      { query: 'night market', category: 'night_market' },
      { query: 'restaurant', category: 'restaurant' },
      { query: 'cafe', category: 'cafe' },
      { query: 'attraction', category: 'attraction' },
      { query: 'temple', category: 'temple' },
      { query: 'museum', category: 'museum' },
      { query: 'hotel', category: 'hotel' },
      { query: 'shopping mall', category: 'shopping' },
      { query: 'spa', category: 'spa' },
    ]
  },
  { 
    countryId: 'thailand', 
    countryName: '泰國', 
    countryEn: 'Thailand', 
    cityId: 'phuket', 
    cityZh: '普吉島', 
    cityEn: 'Phuket',
    categories: [
      { query: 'beach', category: 'beach' },
      { query: 'restaurant', category: 'restaurant' },
      { query: 'resort', category: 'resort' },
      { query: 'hotel', category: 'hotel' },
      { query: 'night market', category: 'night_market' },
    ]
  },
  // 越南
  { 
    countryId: 'vietnam', 
    countryName: '越南', 
    countryEn: 'Vietnam', 
    cityId: 'hanoi', 
    cityZh: '河內', 
    cityEn: 'Hanoi',
    categories: [
      { query: 'street food', category: 'street_food' },
      { query: 'old quarter', category: 'attraction' },
      { query: 'temple', category: 'temple' },
      { query: 'museum', category: 'museum' },
      { query: 'restaurant', category: 'restaurant' },
      { query: 'cafe', category: 'cafe' },
      { query: 'night market', category: 'night_market' },
      { query: 'hotel', category: 'hotel' },
    ]
  },
  { 
    countryId: 'vietnam', 
    countryName: '越南', 
    countryEn: 'Vietnam', 
    cityId: 'danang', 
    cityZh: '峴港', 
    cityEn: 'Da Nang',
    categories: [
      { query: 'beach', category: 'beach' },
      { query: 'marble mountain', category: 'attraction' },
      { query: 'restaurant', category: 'restaurant' },
      { query: 'cafe', category: 'cafe' },
      { query: 'hotel', category: 'hotel' },
      { query: 'resort', category: 'resort' },
    ]
  },
  { 
    countryId: 'vietnam', 
    countryName: '越南', 
    countryEn: 'Vietnam', 
    cityId: 'nha-trang', 
    cityZh: '芽莊', 
    cityEn: 'Nha Trang',
    categories: [
      { query: 'beach', category: 'beach' },
      { query: 'restaurant', category: 'restaurant' },
      { query: 'resort', category: 'resort' },
      { query: 'hotel', category: 'hotel' },
    ]
  },
  // 日本
  { 
    countryId: 'japan', 
    countryName: '日本', 
    countryEn: 'Japan', 
    cityId: 'tokyo', 
    cityZh: '東京', 
    cityEn: 'Tokyo',
    categories: [
      { query: 'shrine', category: 'temple' },
      { query: 'temple', category: 'temple' },
      { query: 'museum', category: 'museum' },
      { query: 'restaurant', category: 'restaurant' },
      { query: 'izakaya', category: 'restaurant' },
      { query: 'hotel', category: 'hotel' },
      { query: 'ryokan', category: 'hotel' },
      { query: 'attraction', category: 'attraction' },
    ]
  },
  { 
    countryId: 'japan', 
    countryName: '日本', 
    countryEn: 'Japan', 
    cityId: 'kyoto', 
    cityZh: '京都', 
    cityEn: 'Kyoto',
    categories: [
      { query: 'shrine', category: 'temple' },
      { query: 'temple', category: 'temple' },
      { query: 'castle', category: 'historic' },
      { query: 'geisha district', category: 'attraction' },
      { query: 'restaurant', category: 'restaurant' },
      { query: 'ryokan', category: 'hotel' },
      { query: 'matcha cafe', category: 'cafe' },
    ]
  },
  { 
    countryId: 'japan', 
    countryName: '日本', 
    countryEn: 'Japan', 
    cityId: 'osaka', 
    cityZh: '大阪', 
    cityEn: 'Osaka',
    categories: [
      { query: 'street food', category: 'street_food' },
      { query: 'castle', category: 'historic' },
      { query: 'restaurant', category: 'restaurant' },
      { query: 'dotonbori', category: 'attraction' },
      { query: 'hotel', category: 'hotel' },
    ]
  },
  // 韓國
  { 
    countryId: 'korea', 
    countryName: '韓國', 
    countryEn: 'South Korea', 
    cityId: 'seoul', 
    cityZh: '首爾', 
    cityEn: 'Seoul',
    categories: [
      { query: 'street food', category: 'street_food' },
      { query: 'palace', category: 'historic' },
      { query: 'museum', category: 'museum' },
      { query: 'restaurant', category: 'restaurant' },
      { query: 'cafe', category: 'cafe' },
      { query: 'shopping', category: 'shopping' },
      { query: 'hotel', category: 'hotel' },
    ]
  },
  { 
    countryId: 'korea', 
    countryName: '韓國', 
    countryEn: 'South Korea', 
    cityId: 'busan', 
    cityZh: '釜山', 
    cityEn: 'Busan',
    categories: [
      { query: 'beach', category: 'beach' },
      { query: 'seafood', category: 'restaurant' },
      { query: 'market', category: 'market' },
      { query: 'hotel', category: 'hotel' },
    ]
  },
  // 中國 - 雲南 (大理、麗江)
  { 
    countryId: 'china', 
    countryName: '中國', 
    countryEn: 'China', 
    cityId: 'dali-yunnan', 
    cityZh: '大理', 
    cityEn: 'Dali Yunnan',
    categories: [
      { query: 'ancient town', category: 'attraction' },
      { query: 'lake erhai', category: 'attraction' },
      { query: 'temple', category: 'temple' },
      { query: 'local food', category: 'street_food' },
      { query: 'restaurant', category: 'restaurant' },
      { query: 'guesthouse', category: 'guesthouse' },
    ]
  },
  { 
    countryId: 'china', 
    countryName: '中國', 
    countryEn: 'China', 
    cityId: 'lijiang', 
    cityZh: '麗江', 
    cityEn: 'Lijiang',
    categories: [
      { query: 'old town', category: 'attraction' },
      { query: 'jade dragon snow mountain', category: 'attraction' },
      { query: 'local food', category: 'street_food' },
      { query: 'restaurant', category: 'restaurant' },
      { query: 'guesthouse', category: 'guesthouse' },
    ]
  }
];

// 比對是否已經存在
function isAlreadyExists(name, nameEn, existingNames) {
  if (!name || name.trim() === '') return true;
  
  const nameLower = name.trim().toLowerCase();
  if (existingNames.has(nameLower)) return true;
  
  if (nameEn && nameEn.trim() !== '') {
    const enLower = nameEn.trim().toLowerCase();
    if (existingNames.has(enLower)) return true;
  }
  
  for (const existing of existingNames) {
    if (existing.includes(nameLower) || nameLower.includes(existing)) {
      return true;
    }
  }
  
  return false;
}

async function searchByCategory(city, cat) {
  const query = `${cat.query} in ${city.cityEn}, ${city.countryEn}`;
  console.log(`  Searching: ${query}`);
  
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=50&addressdetails=1`;
  
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'CornerTravel/1.0' }
    });
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (!response.ok) {
      console.error(`    HTTP ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    console.log(`    Got ${data.length} results`);
    
    return data.map(item => {
      const address = item.address || {};
      let name = item.display_name.split(',')[0];
      if (address.road) name = address.road;
      if (address['name:zh']) name = address['name:zh'];
      
      return {
        osm_id: item.osm_id,
        osm_type: item.osm_type,
        name_zh: address['name:zh'] || null,
        name_en: address['name:en'] || name,
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        category: cat.category,
        importance: item.importance,
        address: address
      };
    });
    
  } catch (error) {
    console.error(`    Error: ${error.message}`);
    await new Promise(resolve => setTimeout(resolve, 10000));
    return [];
  }
}

async function discoverCity(city) {
  console.log(`\n========================================`);
  console.log(`🔍 發掘 ${city.cityZh} (${city.cityEn}), ${city.countryName}`);
  console.log(`========================================`);
  
  // 取得現有地名單
  console.log(`Loading existing attractions from database...`);
  const { data: existing, error } = await supabase
    .from('attractions')
    .select('name, english_name')
    .eq('country_id', city.countryId)
    .eq('city_id', city.cityId);
  
  if (error) {
    console.error(`Error:`, error);
    return { city, discovered: [], error };
  }
  
  console.log(`Existing in DB: ${existing.length} attractions`);
  
  const existingNames = new Set();
  existing.forEach(a => {
    if (a.name) existingNames.add(a.name.toLowerCase().trim());
    if (a.english_name) existingNames.add(a.english_name.toLowerCase().trim());
  });
  
  const allResults = [];
  
  for (const cat of city.categories) {
    const results = await searchByCategory(city, cat);
    allResults.push(...results);
  }
  
  // 去重複 OSM ID
  const seenOsm = new Set();
  const unique = allResults.filter(r => {
    if (seenOsm.has(r.osm_id)) return false;
    seenOsm.add(r.osm_id);
    return true;
  });
  
  // 過濾掉已經存在的
  const discovered = unique.filter(r => {
    const checkName = r.name_zh || r.name_en;
    return !isAlreadyExists(checkName, r.name_en, existingNames);
  });
  
  // 加上 metadata
  discovered.forEach(d => {
    d.country_id = city.countryId;
    d.city_id = city.cityId;
  });
  
  // 排序：importance 由高到低（重要的在前）
  discovered.sort((a, b) => (b.importance || 0) - (a.importance || 0));
  
  // 統計
  console.log(`\n📊 結果統計：`);
  console.log(`  Nominatim 總結果：${allResults.length}`);
  console.log(`  去重複後：${unique.length}`);
  console.log(`  🆕 全新發現：${discovered.length} 個不在資料庫中！`);
  
  const stats = {};
  discovered.forEach(d => {
    stats[d.category] = (stats[d.category] || 0) + 1;
  });
  console.log(`\n  依分類：`);
  Object.entries(stats).sort((a,b) => b[1] - a[1]).forEach(([cat, cnt]) => {
    console.log(`    ${cat}: ${cnt}`);
  });
  
  return { city, discovered };
}

async function main() {
  console.log('='.repeat(80));
  console.log('🌍 自動發掘缺失景點 - Nominatim 版本');
  console.log('避免 Overpass 504 問題，改用分類分批次搜尋');
  console.log('='.repeat(80));
  console.log('');
  
  const allResults = [];
  let totalNewDiscoveries = 0;
  
  for (const city of TARGET_CITIES) {
    try {
      const result = await discoverCity(city);
      allResults.push(result);
      totalNewDiscoveries += result.discovered?.length || 0;
      // 城市之間延長休息時間，避免被擋
      console.log(`\n  😴 Pausing for 15 seconds before next city...`);
      await new Promise(resolve => setTimeout(resolve, 15000));
    } catch (err) {
      console.error(`❌ 處理 ${city.cityZh} 失敗:`, err.message);
      allResults.push({ city, error: err.message, discovered: [] });
      continue;
    }
  }
  
  console.log('\n');
  console.log('='.repeat(80));
  console.log('🏆 最終成果');
  console.log('='.repeat(80));
  
  allResults.forEach(r => {
    const cnt = r.discovered?.length || 0;
    console.log(`${r.city.cityZh}: ${cnt} 個新發現`);
  });
  
  console.log(`\n🎉 總共發現 ${totalNewDiscoveries} 個你們資料庫還沒有的地點！`);
  
  const allDiscovered = allResults.flatMap(r => r.discovered || []);
  
  // 排序：分類，然後重要性
  const categoryOrder = { 
    street_food: 1, 
    restaurant: 2, 
    cafe: 3, 
    night_market: 4,
    market: 5,
    attraction: 6, 
    temple: 7,
    museum: 8, 
    viewpoint: 9,
    park: 10,
    spa: 11,
    guesthouse: 12, 
    hotel: 13, 
    resort: 14,
    shopping: 15
  };
  
  allDiscovered.sort((a,b) => {
    const orderA = categoryOrder[a.category] || 99;
    const orderB = categoryOrder[b.category] || 99;
    if (orderA !== orderB) return orderA - orderB;
    return (b.importance || 0) - (a.importance || 0);
  });
  
  // 儲存
  const outputPath = `/Users/william/Projects/venturo-erp/scripts/new-discoveries-thailand.json`;
  fs.writeFileSync(outputPath, JSON.stringify(allDiscovered, null, 2));
  
  // 預覽前 10 個小吃
  console.log(`\n🍜 前 10 個在地小吃：`);
  allDiscovered.filter(d => d.category === 'street_food').slice(0, 10).forEach(d => {
    const name = d.name_zh || d.name_en;
    console.log(`  • ${name} @ ${d.lat}, ${d.lon}`);
  });
  
  console.log(`\n💾 Full results saved to: ${outputPath}`);
  console.log(`\n✅ 完成！明天團隊可以直接從這個檔案挑選要新增哪些！`);
}

main();
