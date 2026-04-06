require('dotenv').config({ path: '/Users/william/Projects/venturo-erp/.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' }
});

// 使用 Nominatim 搜尋城市內特定類型地點
async function searchCityPlaces(cityEn, countryEn, categories) {
  const allResults = [];
  
  for (const category of categories) {
    const query = `${category} in ${cityEn}, ${countryEn}`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=50`;
    
    console.log(`  Searching ${category}...`);
    
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'CornerTravel/1.0' }
      });
      
      if (!response.ok) {
        console.error(`    HTTP ${response.status}`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }
      
      const data = await response.json();
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      data.forEach(item => {
        allResults.push({
          osm_id: item.osm_id,
          osm_type: item.osm_type,
          name: item.display_name.split(',')[0],
          display_name: item.display_name,
          category: item.category,
          type: item.type,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          importance: item.importance
        });
      });
      
      console.log(`    Got ${data.length} results`);
    } catch (error) {
      console.error(`    Error:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  return allResults;
}

// 分類對應表
const CATEGORIES = [
  'tourist attraction',
  'museum',
  'art gallery',
  'historical monument',
  'beach',
  'viewpoint',
  'park',
  'garden',
  'temple',
  'church',
  'restaurant',
  'cafe',
  'bar',
  'hotel',
  'resort',
  'guesthouse'
];

function categorizeNominatim(category, type) {
  if (category === 'tourism' && type === 'attraction') return 'attraction';
  if (category === 'tourism' && type === 'museum') return 'museum';
  if (category === 'historic' || type === 'monument') return 'historic';
  if (category === 'natural' && type === 'beach') return 'beach';
  if (category === 'tourism' && type === 'viewpoint') return 'viewpoint';
  if (category === 'leisure' && (type === 'park' || type === 'garden')) return 'park';
  if (category === 'amenity' && type === 'restaurant') return 'restaurant';
  if (category === 'amenity' && type === 'cafe') return 'cafe';
  if (category === 'tourism' && type === 'hotel') return 'hotel';
  if (category === 'tourism' && type === 'resort') return 'resort';
  return category + '_' + type;
}

async function discoverCity(cityZh, cityEn, cityId, countryEn, countryId) {
  console.log(`\n=== Discovering ${cityZh} (${cityEn}) ===`);
  
  // 先拿現有資料
  const { data: existing } = await supabase
    .from('attractions')
    .select('name, english_name')
    .eq('country_id', countryId)
    .eq('city_id', cityId);
  
  const existingNames = new Set();
  existing.forEach(a => {
    if (a.name) existingNames.add(a.name.toLowerCase().trim());
    if (a.english_name) existingNames.add(a.english_name.toLowerCase().trim());
  });
  
  console.log(`Existing in database: ${existing.length}`);
  
  // 搜尋 OSM
  const results = await searchCityPlaces(cityEn, countryEn, CATEGORIES);
  
  // 過濾重複
  const newPlaces = results.filter(place => {
    const name = place.name;
    if (!name) return false;
    // 檢查是否已經存在
    if (existingNames.has(name.toLowerCase().trim())) return false;
    // 過濾掉重要性太低的（太偏遠小地方）
    if (place.importance < 0.3) return false;
    return true;
  });
  
  // 加上 metadata
  newPlaces.forEach(p => {
    p.country_id = countryId;
    p.city_id = cityId;
    p.osm_category = categorizeNominatim(p.category, p.type);
  });
  
  console.log(`\nNew discoveries not in database: ${newPlaces.length}`);
  
  // 統計
  const stats = {};
  newPlaces.forEach(p => {
    stats[p.osm_category] = (stats[p.osm_category] || 0) + 1;
  });
  console.log('By category:');
  Object.entries(stats).forEach(([cat, cnt]) => {
    console.log(`  ${cat}: ${cnt}`);
  });
  
  return newPlaces;
}

async function main() {
  console.log('='.repeat(70));
  console.log('Discover missing places from OpenStreetMap Nominatim');
  console.log('Vietnam - All major cities');
  console.log('='.repeat(70));
  console.log('');
  
  const cities = [
    { zh: '峴港', en: 'Da Nang', id: 'danang' },
    { zh: '河內', en: 'Hanoi', id: 'hanoi' },
    { zh: '芽莊', en: 'Nha Trang', id: 'nha-trang' },
    { zh: '順化', en: 'Hue', id: 'hue' }
  ];
  
  const allNew = [];
  
  for (const city of cities) {
    const discoveries = await discoverCity(city.zh, city.en, city.id, 'Vietnam', 'vietnam');
    allNew.push(...discoveries);
  }
  
  console.log('\n');
  console.log('='.repeat(70));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(70));
  console.log(`Total new places discovered: ${allNew.length}`);
  
  // 統計分類
  const totalStats = {};
  allNew.forEach(p => {
    totalStats[p.osm_category] = (totalStats[p.osm_category] || 0) + 1;
  });
  console.log('\nBy category:');
  Object.entries(totalStats).sort((a,b) => b[1] - a[1]).forEach(([cat, cnt]) => {
    console.log(`  ${cat}: ${cnt}`);
  });
  
  // 排序：重要性由高到低
  allNew.sort((a,b) => (b.importance || 0) - (a.importance || 0));
  
  // 儲存
  fs.writeFileSync(
    '/Users/william/Projects/venturo-erp/scripts/vietnam-new-discoveries.json',
    JSON.stringify(allNew, null, 2)
  );
  
  console.log(`\nFull results saved to: /Users/william/Projects/venturo-erp/scripts/vietnam-new-discoveries.json`);
  console.log(`\n🎊 ${allNew.length} potential new places ready for your review!`);
}

main();
