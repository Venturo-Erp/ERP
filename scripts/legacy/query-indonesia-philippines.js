#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pfqvdacxowpgfamuvnsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDgzMjAsImV4cCI6MjA3NDY4NDMyMH0.LIMG0qmHixTPcbdzJrh4h0yTp8mh3FlggeZ6Bi_NwtI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function queryAttractions() {
  // 查詢印尼景點
  const { data: indonesia, error: indoError } = await supabase
    .from('attractions')
    .select('*')
    .eq('country', 'Indonesia')
    .order('name');

  // 查詢菲律賓景點
  const { data: philippines, error: philError } = await supabase
    .from('attractions')
    .select('*')
    .eq('country', 'Philippines')
    .order('name');

  if (indoError) {
    console.error('印尼查詢錯誤:', indoError);
  }
  if (philError) {
    console.error('菲律賓查詢錯誤:', philError);
  }

  console.log(`\n印尼景點：${indonesia?.length || 0} 個`);
  console.log(`菲律賓景點：${philippines?.length || 0} 個`);

  // 分析需要重寫的景點
  const needsRewrite = (attr) => {
    const desc = attr.description || '';
    return desc.length < 80 || desc.includes('最佳') || desc.includes('著名') || desc.includes('值得一遊');
  };

  const indoNeedsRewrite = indonesia?.filter(needsRewrite) || [];
  const philNeedsRewrite = philippines?.filter(needsRewrite) || [];

  console.log(`\n需要重寫的景點：`);
  console.log(`印尼：${indoNeedsRewrite.length} 個`);
  console.log(`菲律賓：${philNeedsRewrite.length} 個`);

  // 顯示樣本
  console.log(`\n印尼樣本（前5個）：`);
  (indonesia || []).slice(0, 5).forEach(a => {
    console.log(`\nID: ${a.id}`);
    console.log(`名稱: ${a.name}`);
    console.log(`城市: ${a.city || 'N/A'}`);
    console.log(`描述長度: ${(a.description || '').length}字`);
    console.log(`描述: ${(a.description || 'N/A').substring(0, 100)}...`);
    console.log(`價格: ${a.ticket_price || 'N/A'}`);
    console.log(`時間: ${a.opening_hours || 'N/A'}`);
  });

  console.log(`\n菲律賓樣本（前5個）：`);
  (philippines || []).slice(0, 5).forEach(a => {
    console.log(`\nID: ${a.id}`);
    console.log(`名稱: ${a.name}`);
    console.log(`城市: ${a.city || 'N/A'}`);
    console.log(`描述長度: ${(a.description || '').length}字`);
    console.log(`描述: ${(a.description || 'N/A').substring(0, 100)}...`);
    console.log(`價格: ${a.ticket_price || 'N/A'}`);
    console.log(`時間: ${a.opening_hours || 'N/A'}`);
  });
}

queryAttractions();
