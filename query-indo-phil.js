#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://pfqvdacxowpgfamuvnsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDgzMjAsImV4cCI6MjA3NDY4NDMyMH0.LIMG0qmHixTPcbdzJrh4h0yTp8mh3FlggeZ6Bi_NwtI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryAttractions() {
  // 查詢印尼
  const { data: indonesia, error: indoError } = await supabase
    .from('attractions')
    .select('*')
    .eq('country_id', 'indonesia')
    .order('name');

  // 查詢菲律賓
  const { data: philippines, error: philError } = await supabase
    .from('attractions')
    .select('*')
    .eq('country_id', 'philippines')
    .order('name');

  if (indoError) console.error('印尼錯誤:', indoError);
  if (philError) console.error('菲律賓錯誤:', philError);

  console.log(`\n📊 統計：`);
  console.log(`印尼景點：${indonesia?.length || 0} 個`);
  console.log(`菲律賓景點：${philippines?.length || 0} 個`);

  // 分析需要重寫的景點
  const needsRewrite = (attr) => {
    const desc = attr.description || '';
    // 太短、公式化用語
    return desc.length < 80 || 
           desc.includes('最佳') || 
           desc.includes('著名') || 
           desc.includes('值得一遊') ||
           desc.includes('熱門景點') ||
           desc.includes('不容錯過') ||
           desc.match(/^[^。]+。$/) || // 只有一句話
           desc.includes('，日本') || // 複製貼上錯誤
           !desc; // 沒描述
  };

  const indoNeedsRewrite = (indonesia || []).filter(needsRewrite);
  const philNeedsRewrite = (philippines || []).filter(needsRewrite);

  console.log(`\n🔧 需要重寫：`);
  console.log(`印尼：${indoNeedsRewrite.length} 個`);
  console.log(`菲律賓：${philNeedsRewrite.length} 個`);

  // 保存需要重寫的列表
  const toRewrite = {
    indonesia: indoNeedsRewrite.map(a => ({
      id: a.id,
      name: a.name,
      city: a.city_id,
      region: a.region_id,
      category: a.category,
      description: a.description,
      description_length: (a.description || '').length,
      ticket_price: a.ticket_price,
      opening_hours: a.opening_hours
    })),
    philippines: philNeedsRewrite.map(a => ({
      id: a.id,
      name: a.name,
      city: a.city_id,
      region: a.region_id,
      category: a.category,
      description: a.description,
      description_length: (a.description || '').length,
      ticket_price: a.ticket_price,
      opening_hours: a.opening_hours
    }))
  };

  fs.writeFileSync('attractions-to-rewrite.json', JSON.stringify(toRewrite, null, 2));
  console.log(`\n✅ 已保存需要重寫的景點清單：attractions-to-rewrite.json`);

  // 顯示樣本
  console.log(`\n📝 印尼樣本（前5個需要重寫的）：`);
  indoNeedsRewrite.slice(0, 5).forEach(a => {
    console.log(`\n  🏛️  ${a.name} (ID: ${a.id})`);
    console.log(`     城市: ${a.city_id || 'N/A'}`);
    console.log(`     分類: ${a.category || 'N/A'}`);
    console.log(`     描述長度: ${(a.description || '').length}字`);
    console.log(`     目前描述: ${a.description || '【無描述】'}`);
    console.log(`     價格: ${a.ticket_price || '【無價格】'}`);
    console.log(`     時間: ${JSON.stringify(a.opening_hours || '【無時間】')}`);
  });

  console.log(`\n📝 菲律賓樣本（前5個需要重寫的）：`);
  philNeedsRewrite.slice(0, 5).forEach(a => {
    console.log(`\n  🏖️  ${a.name} (ID: ${a.id})`);
    console.log(`     城市: ${a.city_id || 'N/A'}`);
    console.log(`     分類: ${a.category || 'N/A'}`);
    console.log(`     描述長度: ${(a.description || '').length}字`);
    console.log(`     目前描述: ${a.description || '【無描述】'}`);
    console.log(`     價格: ${a.ticket_price || '【無價格】'}`);
    console.log(`     時間: ${JSON.stringify(a.opening_hours || '【無時間】')}`);
  });
}

queryAttractions();
