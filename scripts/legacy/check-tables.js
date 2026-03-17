#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pfqvdacxowpgfamuvnsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDgzMjAsImV4cCI6MjA3NDY4NDMyMH0.LIMG0qmHixTPcbdzJrh4h0yTp8mh3FlggeZ6Bi_NwtI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  // 查詢所有景點看看有哪些國家
  const { data: attractions, error } = await supabase
    .from('attractions')
    .select('*')
    .limit(5);

  if (error) {
    console.error('錯誤:', error);
    return;
  }

  console.log('景點資料樣本（前5筆）：');
  console.log(JSON.stringify(attractions, null, 2));

  // 查詢總數
  const { count } = await supabase
    .from('attractions')
    .select('*', { count: 'exact', head: true });

  console.log(`\n總景點數：${count}`);
}

checkTables();
