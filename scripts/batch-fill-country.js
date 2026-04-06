require('dotenv').config({ path: '/Users/william/Projects/venturo-erp/.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' }
});

// 城市中文名稱對照表
const CITY_ZH = {
  'thailand': {
    'bangkok': '曼谷',
    'chiang-mai': '清邁',
    'phuket': '普吉島',
    'pattaya': '芭達雅',
    'koh-samui': '蘇梅島',
    'koh-phangan': '帕岸島',
    'krabi': '喀比',
    'huahin': '華欣',
    'chiang-rai': '清萊'
  },
  'vietnam': {
    'hanoi': '河內',
    'danang': '峴港',
    'nha-trang': '芽莊',
    'hue': '順化',
    'halong': '下龍灣',
    'sapa': '沙巴',
    'phu-quoc': '富國島',
    'hoi-an': '會安'
  },
  'japan': {
    'tokyo': '東京',
    'kyoto': '京都',
    'osaka': '大阪',
    'hokkaido': '北海道',
    'okinawa': '沖繩',
    'fukuoka': '福岡',
    'kanazawa': '金澤',
    'hiroshima': '廣島'
  },
  'korea': {
    'seoul': '首爾',
    'busan': '釜山',
    'jeju': '濟州島',
    'gyeongju': '慶州'
  },
  'indonesia': {
    'bali': '峇里島',
    'ubud': '烏布',
    'seminyak': '水明漾',
    'nusa-penida': '佩尼達島'
  },
  'philippines': {
    'cebu': '宿務',
    'bohol': '薄荷島',
    'palawan': '巴拉望',
    'manila': '馬尼拉'
  }
};

// OpenStreetMap Nominatim API 搜尋 - 多層次嘗試
async function searchOSM(name, englishName, cityId, countryEn) {
  let cityZh = '';
  let cityEn = '';
  if (cityId) {
    cityZh = CITY_ZH[countryEn]?.[cityId] || cityId;
    cityEn = cityId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  
  // 層次 1: 中文 + 城市（如果有城市）
  if (cityId) {
    let query = `${name}, ${cityZh}, ${countryEn}`;
    let result = await doSearch(query);
    if (result) return result;
  }
  
  // 層次 2: 中文 不帶城市
  let query = `${name}, ${countryEn}`;
  let result = await doSearch(query);
  if (result) return result;
  
  // 層次 3: 英文 + 城市（如果有城市）
  if (englishName && englishName.trim() !== '' && cityId) {
    query = `${englishName}, ${cityEn}, ${countryEn}`;
    result = await doSearch(query);
    if (result) {
      console.log(`  ✅ Found with English (${cityEn}): ${englishName}`);
      return result;
    }
  }
  
  // 層次 4: 英文 不帶城市
  if (englishName && englishName.trim() !== '') {
    query = `${englishName}, ${countryEn}`;
    result = await doSearch(query);
    if (result) {
      console.log(`  ✅ Found with English (no city): ${englishName}`);
      return result;
    }
  }
  
  return null;
}

async function doSearch(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`;
  
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'CornerTravel/1.0' }
    });
    
    if (!response.ok) {
      console.error(`  HTTP ${response.status} for "${query}"`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      return null;
    }
    
    const data = await response.json();
    await new Promise(resolve => setTimeout(resolve, 2000)); // 遵守 Nominatim 規定：至少 1 秒
    
    if (data.length === 0) {
      return null;
    }
    
    const first = data[0];
    return {
      lat: parseFloat(first.lat),
      lon: parseFloat(first.lon),
      display_name: first.display_name,
      type: first.type
    };
  } catch (error) {
    console.error(`  Error searching "${query}":`, error.message);
    await new Promise(resolve => setTimeout(resolve, 3000));
    return null;
  }
}

async function fillCountry(countryId, countryNameZh) {
  console.log('='.repeat(70));
  console.log(`批量填補座標：${countryNameZh} (${countryId})`);
  console.log('='.repeat(70));
  console.log('');
  
  // 查詢所有空座標
  console.log(`Querying ${countryNameZh} for attractions with empty coordinates...`);
  const { data: attractions, error } = await supabase
    .from('attractions')
    .select('id, name, english_name, city_id, region_id, country_id, latitude, longitude')
    .eq('country_id', countryId)
    .is('latitude', null);
  
  if (error) {
    console.error('Query error:', error);
    return { countryId, total: 0, updated: 0, error };
  }
  
  console.log(`Found ${attractions.length} attractions needing coordinates`);
  console.log('');
  
  if (attractions.length === 0) {
    console.log(`🎉 ${countryNameZh} 所有景點都已經有座標了！不需要更新！`);
    console.log('');
    return { countryId, total: 0, updated: 0, completed: true };
  }
  
  let updated = 0;
  let notFound = 0;
  const results = [];
  
  for (const [index, attr] of attractions.entries()) {
    console.log(`[${index + 1}/${attractions.length}] [${attr.city_id || 'no city'}] ${attr.name}...`);
    
    try {
      const result = await searchOSM(attr.name, attr.english_name, attr.city_id, countryId);
      
      if (result) {
        console.log(`  ✅ Found: ${result.lat}, ${result.lon} (${result.type})`);
        
        const { error: updateError } = await supabase
          .from('attractions')
          .update({
            latitude: result.lat,
            longitude: result.lon,
            updated_at: new Date().toISOString()
          })
          .eq('id', attr.id);
        
        if (updateError) {
          console.error(`  ❌ Update failed: ${updateError.message}`);
          notFound++;
          results.push({ ...attr, osm: null, error: updateError.message });
        } else {
          updated++;
          results.push({ ...attr, osm: result });
        }
      } else {
        console.log(`  ❌ Not found`);
        notFound++;
        results.push({ ...attr, osm: null });
      }
    } catch (error) {
      console.error(`  ❌ Unexpected error: ${error.message}`);
      console.error(`  ⏭️  Skipping to next...`);
      notFound++;
      results.push({ ...attr, osm: null, error: error.message });
      // 出錯後休息一下
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('');
  console.log('='.repeat(70));
  console.log(`${countryNameZh} 完成`);
  console.log('='.repeat(70));
  console.log(`Total needing update: ${attractions.length}`);
  console.log(`✅ Successfully updated: ${updated}`);
  console.log(`❌ Not found / failed: ${notFound}`);
  console.log('');
  
  // 儲存結果記錄
  const outputPath = `/Users/william/Projects/venturo-erp/scripts/${countryId}-coord-results.json`;
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`Results saved to: ${outputPath}`);
  console.log('');
  
  return {
    countryId,
    total: attractions.length,
    updated,
    notFound,
    completed: true,
    resultsPath: outputPath
  };
}

async function main() {
  console.log('='.repeat(70));
  console.log('全自動批量填補座標 - 亞洲主要國家');
  console.log('='.repeat(70));
  console.log('');
  console.log('處理順序：');
  console.log('1. 泰國 (thailand)');
  console.log('2. 越南 (vietnam) → 已經補過，再確認一次');
  console.log('3. 日本 (japan)');
  console.log('4. 韓國 (korea) → 首爾、釜山');
  console.log('5. 印尼 (indonesia) → 峇里島');
  console.log('6. 菲律賓 (philippines) → 宿務、薄荷島');
  console.log('');
  
  const countries = [
    { id: 'thailand', name: '泰國' },
    { id: 'vietnam', name: '越南' },
    { id: 'japan', name: '日本' },
    { id: 'korea', name: '韓國' },
    { id: 'indonesia', name: '印尼' },
    { id: 'philippines', name: '菲律賓' }
  ];
  
  const summary = [];
  
  for (const country of countries) {
    const result = await fillCountry(country.id, country.name);
    summary.push({ ...country, ...result });
    console.log('\n---\n');
    // 國家之間休息一下，避免被 rate limit
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  console.log('');
  console.log('='.repeat(70));
  console.log('全部國家處理完成！最終總結');
  console.log('='.repeat(70));
  console.log('');
  
  summary.forEach(s => {
    const pct = s.total > 0 ? Math.round(s.updated / s.total * 100) : 0;
    console.log(`${s.name}: ${s.updated}/${s.total} 更新成功 (${pct}%)`);
  });
  
  console.log('');
  console.log('✅ 全自動批量填補完成！所有更新都已經寫入 Supabase 資料庫！');
  
  // 儲存最終總結
  fs.writeFileSync(
    '/Users/william/Projects/venturo-erp/scripts/batch-fill-summary.json',
    JSON.stringify(summary, null, 2)
  );
  console.log('Summary saved to: /Users/william/Projects/venturo-erp/scripts/batch-fill-summary.json');
}

main();
