require('dotenv').config({ path: '/Users/william/Projects/venturo-erp/.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' }
});

// Overpass API 查詢越南城市景點/餐廳/飯店
function buildOverpassQuery(cityName) {
  return `
[out:json][timeout:60];
area["name:en"="${cityName}"]["admin_level"]->.searchArea;
(
  // 景點
  node["tourism"="attraction"](area.searchArea);
  node["tourism"="museum"](area.searchArea);
  node["tourism"="viewpoint"](area.searchArea);
  node["historic"="monument"](area.searchArea);
  node["historic"="ruins"](area.searchArea);
  node["natural"="beach"](area.searchArea);
  node["natural"="cape"](area.searchArea);
  node["leisure"="park"](area.searchArea);
  node["leisure"="beach_resort"](area.searchArea);
  // 餐廳
  node["amenity"="restaurant"](area.searchArea);
  node["amenity"="cafe"](area.searchArea);
  // 飯店住宿
  node["tourism"="hotel"](area.searchArea);
  node["tourism"="guest_house"](area.searchArea);
  node["tourism"="resort"](area.searchArea);
);
out center;
>;
out skel qt;
  `.trim();
}

// 從 OSM tag 中提取名稱
function extractNames(tags) {
  let name = tags.name;
  let nameEn = tags['name:en'];
  
  // 如果沒有英文，試試其他語言
  if (!nameEn) {
    nameEn = tags['name:en'] || tags['name:gb'] || tags['name:us'] || tags.int_name;
  }
  
  return { name, nameEn };
}

// 分類 OSM 類型
function categorizeOSM(tags) {
  if (tags.tourism === 'attraction') return 'attraction';
  if (tags.tourism === 'museum') return 'museum';
  if (tags.tourism === 'viewpoint') return 'viewpoint';
  if (tags.historic) return 'historic';
  if (tags.natural) return 'natural';
  if (tags.leisure) return 'leisure';
  if (tags.amenity === 'restaurant') return 'restaurant';
  if (tags.amenity === 'cafe') return 'cafe';
  if (tags.tourism === 'hotel') return 'hotel';
  if (tags.tourism === 'guest_house') return 'guesthouse';
  if (tags.tourism === 'resort') return 'resort';
  return 'other';
}

async function fetchFromOverpass(cityName, cityZh) {
  console.log(`Fetching ${cityZh} (${cityName}) from Overpass...`);
  
  const query = buildOverpassQuery(cityName);
  const url = `https://overpass-api.de/api/interpreter`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: query,
      headers: {
        'Content-Type': 'text/plain',
        'User-Agent': 'CornerTravel/1.0'
      }
    });
    
    if (!response.ok) {
      console.error(`  HTTP ${response.status} error for ${cityZh}`);
      return [];
    }
    
    const data = await response.json();
    await new Promise(resolve => setTimeout(resolve, 5000)); // 尊重 API 限制
    
    const elements = data.elements
      .filter(el => el.type === 'node' || (el.type === 'way' && el.center))
      .map(el => {
        const center = el.center || { lat: el.lat, lon: el.lon };
        const { name, nameEn } = extractNames(el.tags);
        const category = categorizeOSM(el.tags);
        
        return {
          id: el.id,
          type: el.type,
          osm_category: category,
          name: name || nameEn || `OSM-${el.id}`,
          english_name: nameEn || null,
          lat: parseFloat(center.lat),
          lon: parseFloat(center.lon),
          tags: el.tags
        };
      });
    
    console.log(`  Got ${elements.length} results for ${cityZh}`);
    return elements;
  } catch (error) {
    console.error(`  Error fetching ${cityZh}:`, error.message);
    await new Promise(resolve => setTimeout(resolve, 10000));
    return [];
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('Discover missing attractions from OpenStreetMap - Vietnam');
  console.log('='.repeat(70));
  console.log('');
  
  // 越南主要城市
  const cities = [
    { en: 'Hanoi', zh: '河內', id: 'hanoi' },
    { en: 'Da Nang', zh: '峴港', id: 'danang' },
    { en: 'Nha Trang', zh: '芽莊', id: 'nha-trang' },
    { en: 'Hue', zh: '順化', id: 'hue' }
  ];
  
  // 先取出資料庫現有所有越南景點名稱，用來比對
  console.log('Getting existing attractions from database...');
  const { data: existingAttractions, error } = await supabase
    .from('attractions')
    .select('name, english_name')
    .eq('country_id', 'vietnam');
  
  if (error) {
    console.error('Error fetching existing attractions:', error);
    return;
  }
  
  console.log(`Found ${existingAttractions.length} existing attractions in Vietnam`);
  console.log('');
  
  // 建立比對用的名稱集合（大小寫不敏感）
  const existingNames = new Set();
  existingAttractions.forEach(a => {
    if (a.name) existingNames.add(a.name.toLowerCase().trim());
    if (a.english_name) existingNames.add(a.english_name.toLowerCase().trim());
  });
  
  // 檢查是否已經存在
  function isAlreadyExists(name, englishName) {
    if (!name) return false;
    if (existingNames.has(name.toLowerCase().trim())) return true;
    if (englishName && existingNames.has(englishName.toLowerCase().trim())) return true;
    return false;
  }
  
  // 逐城市撈取
  const allNewDiscoveries = [];
  
  for (const city of cities) {
    const results = await fetchFromOverpass(city.en, city.zh);
    
    // 過濾掉已經存在的
    const newOnes = results.filter(r => {
      return !isAlreadyExists(r.name, r.english_name);
    });
    
    console.log(`  ${newOnes.length} new discoveries not in database`);
    console.log('');
    
    newOnes.forEach(r => {
      r.country_id = 'vietnam';
      r.city_id = city.id;
    });
    
    allNewDiscoveries.push(...newOnes);
  }
  
  console.log('');
  console.log('='.repeat(70));
  console.log('Summary');
  console.log('='.repeat(70));
  console.log(`Total OSM results: ${allNewDiscoveries.length} new discoveries not in database`);
  
  // 依分類統計
  const stats = {};
  allNewDiscoveries.forEach(d => {
    stats[d.osm_category] = (stats[d.osm_category] || 0) + 1;
  });
  console.log('By category:');
  Object.entries(stats).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });
  
  // 儲存結果
  fs.writeFileSync(
    '/Users/william/Projects/venturo-erp/scripts/vietnam-new-discoveries.json',
    JSON.stringify(allNewDiscoveries, null, 2)
  );
  
  // 輸出 CSV 方便匯入預覽
  console.log('');
  console.log('CSV preview (top 20):');
  console.log('name,english_name,category,lat,lon,city');
  allNewDiscoveries.slice(0, 20).forEach(d => {
    console.log(`"${d.name}","${d.english_name || ''}",${d.osm_category},${d.lat},${d.lon},${d.city_id}`);
  });
  
  console.log('');
  console.log('Full results saved to: /Users/william/Projects/venturo-erp/scripts/vietnam-new-discoveries.json');
  console.log(`Total ${allNewDiscoveries.length} potential new places to add! 🎉`);
}

main();
