#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pfqvdacxowpgfamuvnsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDgzMjAsImV4cCI6MjA3NDY4NDMyMH0.LIMG0qmHixTPcbdzJrh4h0yTp8mh3FlggeZ6Bi_NwtI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchAttractions() {
  const { data, error } = await supabase
    .from('attractions')
    .select('*')
    .eq('country_id', 'japan')
    .or('name.ilike.%札幌%,name.ilike.%福岡%,name.ilike.%沖繩%,name.ilike.%名古屋%,name.ilike.%廣島%')
    .limit(50);

  if (error) {
    console.error('查詢錯誤:', error);
    return [];
  }

  // 進一步篩選：描述包含「熱門景點」或長度 < 50
  return data.filter(attr => 
    (attr.description && (attr.description.includes('熱門景點') || attr.description.length < 50))
  );
}

async function main() {
  const attractions = await fetchAttractions();
  console.log(`找到 ${attractions.length} 個需要重寫的景點：\n`);
  
  attractions.forEach((attr, i) => {
    console.log(`${i + 1}. [${attr.id}] ${attr.name}`);
    console.log(`   現有描述: ${attr.description || '(無)'}`);
    console.log(`   地區: ${attr.city || '(無)'}${attr.prefecture ? ' / ' + attr.prefecture : ''}\n`);
  });
}

main();
