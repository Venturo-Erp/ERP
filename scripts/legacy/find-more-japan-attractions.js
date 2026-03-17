#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pfqvdacxowpgfamuvnsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDgzMjAsImV4cCI6MjA3NDY4NDMyMH0.LIMG0qmHixTPcbdzJrh4h0yTp8mh3FlggeZ6Bi_NwtI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchMoreAttractions() {
  // 查詢日本景點，排除大城市（東京、大阪、京都），找描述簡短或通用的
  const { data, error } = await supabase
    .from('attractions')
    .select('*')
    .eq('country_id', 'japan')
    .not('name', 'ilike', '%東京%')
    .not('name', 'ilike', '%大阪%')
    .not('name', 'ilike', '%京都%')
    .limit(100);

  if (error) {
    console.error('查詢錯誤:', error);
    return [];
  }

  // 篩選：描述包含通用詞或長度 < 100 的景點
  const needRewrite = data.filter(attr => {
    if (!attr.description) return true;
    const desc = attr.description;
    const hasGeneric = desc.includes('熱門景點') || 
                       desc.includes('日本') && desc.length < 100 ||
                       desc.includes('展示') && desc.length < 80 ||
                       desc.includes('博物館') && desc.length < 80 ||
                       desc.includes('地標建築') ||
                       desc.includes('拉麵店') && desc.length < 80 ||
                       desc.includes('離島，擁有美麗海景');
    return hasGeneric || desc.length < 60;
  });

  return needRewrite.slice(0, 35); // 再找 35 個，加上已完成的 17 個 = 52 個
}

async function main() {
  const attractions = await fetchMoreAttractions();
  console.log(`找到 ${attractions.length} 個需要重寫的景點：\n`);
  
  attractions.forEach((attr, i) => {
    console.log(`${i + 1}. [${attr.id}] ${attr.name}`);
    console.log(`   現有描述: ${attr.description ? attr.description.substring(0, 100) : '(無)'}...`);
    console.log(`   地區: ${attr.city || '(無)'}${attr.prefecture ? ' / ' + attr.prefecture : ''}\n`);
  });
}

main();
