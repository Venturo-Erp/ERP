require('dotenv').config({ path: '/Users/william/Projects/venturo-erp/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' }
});

async function checkTable(tableName) {
  // 取第一筆看結構
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);
  
  if (error) {
    console.log(`\n❌ 資料表 ${tableName} 錯誤:`, error.message);
    return null;
  }
  
  if (data.length === 0) {
    console.log(`\n📋 資料表 ${tableName} 存在，但是目前是空的`);
    return [];
  }
  
  console.log(`\n📋 資料表 ${tableName} 欄位：`);
  Object.keys(data[0]).forEach(key => {
    console.log(`  • ${key}`);
  });
  
  return Object.keys(data[0]);
}

async function main() {
  console.log('========================================');
  console.log('🔍 檢查資料庫表結構');
  console.log('========================================');
  
  await checkTable('attractions');
  await checkTable('luxury_hotels');
  await checkTable('restaurants');
  
  console.log('\n========================================');
  console.log('查詢各表目前總筆數：');
  
  const { count: countAttractions } = await supabase
    .from('attractions')
    .select('id', { count: 'exact', head: true });
  
  const { count: countHotels } = await supabase
    .from('luxury_hotels')
    .select('id', { count: 'exact', head: true });
  
  let countRestaurants = null;
  try {
    const res = await supabase
      .from('restaurants')
      .select('id', { count: 'exact', head: true });
    countRestaurants = res.count;
  } catch (e) {}
  
  console.log(`• attractions: ${countAttractions} 筆`);
  console.log(`• luxury_hotels: ${countHotels} 筆`);
  if (countRestaurants !== null) {
    console.log(`• restaurants: ${countRestaurants} 筆`);
  }
  console.log('========================================');
}

main();
