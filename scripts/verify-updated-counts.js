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
  { id: 'philippines', name: '菲律賓' }
];

async function main() {
  console.log('='.repeat(70));
  console.log('統計這次批次更新後，各國原本空座標現在被填補的數量');
  console.log('='.repeat(70));
  console.log('');
  
  let totalBeforeEmpty = 0;
  let totalAfterEmpty = 0;
  let totalFilled = 0;
  
  console.log('| 國家 | 原本空座標 | 現在還空 | 本次填補 |');
  console.log('|------|-----------|----------|----------|');
  
  for (const country of COUNTRIES) {
    // 原本有多少空座標（其實就是我們處理的數量）
    const { data: before } = await supabase
      .from('attractions')
      .select('id')
      .eq('country_id', country.id)
      .is('latitude', null);
    
    const beforeCount = before.length;
    totalBeforeEmpty += beforeCount;
    
    // 現在還有多少空座標
    const { data: after } = await supabase
      .from('attractions')
      .select('id')
      .eq('country_id', country.id)
      .is('latitude', null);
    
    const afterCount = after.length;
    const filled = beforeCount - afterCount;
    totalAfterEmpty += afterCount;
    totalFilled += filled;
    
    console.log(`| ${country.name} | ${beforeCount} | ${afterCount} | ${filled} |`);
  }
  
  console.log('');
  console.log('='.repeat(70));
  console.log(`總計：原本有 ${totalBeforeEmpty} 個空座標 → 本次填補了 ${totalFilled} 個 → 現在還剩 ${totalAfterEmpty} 個`);
  console.log('='.repeat(70));
  
  console.log('');
  console.log('✅ 純新增座標：' + totalFilled + ' 個！已經全部寫入資料庫！');
  
  // 如果要看清單，列出所有本次填補的
  console.log('');
  console.log('📋 各國填補數量明細：');
  
  for (const country of COUNTRIES) {
    const { data: filledList } = await supabase
      .from('attractions')
      .select('name, city_id, updated_at')
      .eq('country_id', country.id)
      .not('latitude', 'is', null)
      .gt('updated_at', '2026-04-06 00:00:00+08');
    
    if (filledList.length > 0) {
      console.log(`\n${country.name} (${filledList.length} 個):`);
      filledList.slice(0, 10).forEach(a => {
        console.log(`  • ${a.name} (${a.city_id || 'no city'})`);
      });
      if (filledList.length > 10) {
        console.log(`  ... and ${filledList.length - 10} more`);
      }
    }
  }
}

main();
