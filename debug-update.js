#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pfqvdacxowpgfamuvnsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDgzMjAsImV4cCI6MjA3NDY4NDMyMH0.LIMG0qmHixTPcbdzJrh4h0yTp8mh3FlggeZ6Bi_NwtI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUpdate() {
  // 先查詢一個景點
  const testId = '40c00659-83f6-469b-9473-8664c79c11c7'; // Capella Ubud
  
  console.log('查詢更新前狀態...');
  const { data: before } = await supabase
    .from('attractions')
    .select('*')
    .eq('id', testId)
    .single();
  
  console.log('\n更新前：');
  console.log('名稱:', before.name);
  console.log('描述:', before.description);
  console.log('價格:', before.ticket_price);
  console.log('更新時間:', before.updated_at);
  
  // 嘗試更新
  console.log('\n嘗試更新...');
  const newDesc = '《Capella Ubud》隱身烏布雨林深處，帳篷別墅融入山谷綠意，私人泳池、露天浴缸與叢林共生。晨起霧氣繚繞，夜晚星空璀璨，頂級服務結合原始野性，打造隱世奢華體驗。適合追求極致隱私與自然沉浸的旅人。';
  
  const { data: updated, error } = await supabase
    .from('attractions')
    .update({
      description: newDesc,
      ticket_price: '房價約Rp 15,000,000起/晚',
      opening_hours: { daily: '24小時入住服務' },
      updated_at: new Date().toISOString()
    })
    .eq('id', testId)
    .select();
  
  if (error) {
    console.error('更新錯誤:', error);
    return;
  }
  
  console.log('\n更新回傳:', updated);
  
  // 再次查詢確認
  const { data: after } = await supabase
    .from('attractions')
    .select('*')
    .eq('id', testId)
    .single();
  
  console.log('\n更新後：');
  console.log('名稱:', after.name);
  console.log('描述:', after.description);
  console.log('描述長度:', after.description.length);
  console.log('價格:', after.ticket_price);
  console.log('時間:', JSON.stringify(after.opening_hours));
  console.log('更新時間:', after.updated_at);
}

debugUpdate();
