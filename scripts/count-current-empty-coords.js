require('dotenv').config({ path: '/Users/william/Projects/venturo-erp/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' }
});

const COUNTRIES = [
  { id: 'thailand', name: '泰國' },
  { id: 'vietnam', name: '越南' },
  { id: 'japan', name: '日本' },
  { id: 'korea', name: '韓國' },
  { id: 'indonesia', name: '印尼' },
  { id: 'philippines', name: '菲律賓' },
  { id: 'singapore', name: '新加坡' },
  { id: 'malaysia', name: '馬來西亞' },
  { id: 'china', name: '中國' },
];

async function main() {
  console.log('='.repeat(70));
  console.log('📊 目前資料庫空座標統計（真實最新狀況）');
  console.log('='.repeat(70));
  console.log('');
  
  let totalEmpty = 0;
  let totalAll = 0;
  
  console.log('| 國家 | 總景點數 | 目前空座標 |');
  console.log('|------|----------|------------|');
  
  for (const country of COUNTRIES) {
    const { count: allCount } = await supabase
      .from('attractions')
      .select('id', { count: 'exact', head: true })
      .eq('country_id', country.id);
    
    const { count: emptyCount } = await supabase
      .from('attractions')
      .select('id', { count: 'exact', head: true })
      .eq('country_id', country.id)
      .is('latitude', null);
    
    totalAll += allCount || 0;
    totalEmpty += emptyCount || 0;
    
    console.log(`| ${country.name} | ${allCount || 0} | ${emptyCount || 0} |`);
  }
  
  console.log('');
  console.log('='.repeat(70));
  console.log(`總計：所有國家一共 ${totalAll} 個景點 → 目前還剩 ${totalEmpty} 個空座標`);
  console.log('='.repeat(70));
  
  const originalEmpty = 224;
  const filled = originalEmpty - totalEmpty;
  console.log(`\n✅ 從昨天開始到現在，一共已經填補了 **${filled} 個**原本空的座標！`);
  
  if (filled > 0) {
    console.log(`🎉 進度超棒！已經完成 ${Math.round(filled / originalEmpty * 100)}%！`);
  }
}

main();
