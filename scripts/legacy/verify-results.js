#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pfqvdacxowpgfamuvnsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDgzMjAsImV4cCI6MjA3NDY4NDMyMH0.LIMG0qmHixTPcbdzJrh4h0yTp8mh3FlggeZ6Bi_NwtI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyResults() {
  // 隨機抽查印尼景點
  const { data: indoSamples } = await supabase
    .from('attractions')
    .select('name, description, ticket_price, opening_hours')
    .eq('country_id', 'indonesia')
    .in('name', ['婆羅浮屠', '普蘭巴南', '京打馬尼火山', 'Capella Ubud', '佩妮達島']);

  // 隨機抽查菲律賓景點
  const { data: philSamples } = await supabase
    .from('attractions')
    .select('name, description, ticket_price, opening_hours')
    .eq('country_id', 'philippines')
    .in('name', ['愛妮島', '科隆島', '巧克力山', 'Crimson Boracay', 'D Mall']);

  console.log('\n🇮🇩 印尼景點品質驗證（重點景點）：\n');
  indoSamples?.forEach(a => {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🏛️  ${a.name}`);
    console.log(`描述長度：${a.description.length} 字`);
    console.log(`描述：${a.description}`);
    console.log(`價格：${a.ticket_price}`);
    console.log(`時間：${JSON.stringify(a.opening_hours, null, 2)}`);
    console.log();
  });

  console.log('\n🇵🇭 菲律賓景點品質驗證（重點景點）：\n');
  philSamples?.forEach(a => {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🏖️  ${a.name}`);
    console.log(`描述長度：${a.description.length} 字`);
    console.log(`描述：${a.description}`);
    console.log(`價格：${a.ticket_price}`);
    console.log(`時間：${JSON.stringify(a.opening_hours, null, 2)}`);
    console.log();
  });
  
  // 統計分析
  const { data: indoAll } = await supabase
    .from('attractions')
    .select('description, ticket_price')
    .eq('country_id', 'indonesia');

  const { data: philAll } = await supabase
    .from('attractions')
    .select('description, ticket_price')
    .eq('country_id', 'philippines');

  const indoLengths = indoAll?.map(a => a.description?.length || 0) || [];
  const philLengths = philAll?.map(a => a.description?.length || 0) || [];

  const avgIndo = indoLengths.reduce((a,b) => a+b, 0) / indoLengths.length;
  const avgPhil = philLengths.reduce((a,b) => a+b, 0) / philLengths.length;

  const indoWithCurrency = indoAll?.filter(a => a.ticket_price?.includes('Rp')).length || 0;
  const philWithCurrency = philAll?.filter(a => a.ticket_price?.includes('₱') || a.ticket_price?.includes('披索')).length || 0;

  console.log('\n📈 品質統計：\n');
  console.log(`🇮🇩 印尼：`);
  console.log(`  平均描述長度：${avgIndo.toFixed(0)} 字`);
  console.log(`  使用印尼盾 (Rp)：${indoWithCurrency}/${indoAll?.length} 景點`);
  console.log();
  console.log(`🇵🇭 菲律賓：`);
  console.log(`  平均描述長度：${avgPhil.toFixed(0)} 字`);
  console.log(`  使用披索 (₱)：${philWithCurrency}/${philAll?.length} 景點`);
}

verifyResults();
