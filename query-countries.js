#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pfqvdacxowpgfamuvnsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDgzMjAsImV4cCI6MjA3NDY4NDMyMH0.LIMG0qmHixTPcbdzJrh4h0yTp8mh3FlggeZ6Bi_NwtI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryCountries() {
  const { data: countries, error } = await supabase
    .from('countries')
    .select('*')
    .or('name.ilike.%indonesia%,name.ilike.%philippines%,name.ilike.%菲律賓%,name.ilike.%印尼%');

  if (error) {
    console.error('查詢錯誤:', error);
    return;
  }

  console.log('找到的國家：');
  countries?.forEach(c => {
    console.log(`ID: ${c.id}, 名稱: ${c.name}, Code: ${c.code || 'N/A'}`);
  });

  // 用找到的 ID 查詢景點
  if (countries && countries.length > 0) {
    const countryIds = countries.map(c => c.id);
    
    const { data: attractions, error: attrError } = await supabase
      .from('attractions')
      .select('id, name, city, description, ticket_price, opening_hours, country_id')
      .in('country_id', countryIds)
      .order('country_id')
      .order('name');

    if (attrError) {
      console.error('景點查詢錯誤:', attrError);
      return;
    }

    console.log(`\n總共找到 ${attractions?.length || 0} 個景點`);

    // 按國家分組
    const byCountry = {};
    attractions?.forEach(a => {
      const country = countries.find(c => c.id === a.country_id);
      const countryName = country?.name || a.country_id;
      if (!byCountry[countryName]) byCountry[countryName] = [];
      byCountry[countryName].push(a);
    });

    Object.entries(byCountry).forEach(([countryName, attrs]) => {
      console.log(`\n${countryName}：${attrs.length} 個景點`);
      
      // 分析需要重寫的
      const needsRewrite = attrs.filter(a => {
        const desc = a.description || '';
        return desc.length < 80 || desc.includes('最佳') || desc.includes('著名') || desc.includes('值得一遊');
      });

      console.log(`需要重寫：${needsRewrite.length} 個`);

      // 顯示前3個樣本
      console.log(`\n樣本：`);
      attrs.slice(0, 3).forEach(a => {
        console.log(`\n  ID: ${a.id}`);
        console.log(`  名稱: ${a.name}`);
        console.log(`  城市: ${a.city || 'N/A'}`);
        console.log(`  描述長度: ${(a.description || '').length}字`);
        console.log(`  描述: ${(a.description || 'N/A').substring(0, 120)}...`);
        console.log(`  價格: ${a.ticket_price || 'N/A'}`);
        console.log(`  時間: ${a.opening_hours || 'N/A'}`);
      });
    });
  }
}

queryCountries();
