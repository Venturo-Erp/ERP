#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://pfqvdacxowpgfamuvnsn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDgzMjAsImV4cCI6MjA3NDY4NDMyMH0.LIMG0qmHixTPcbdzJrh4h0yTp8mh3FlggeZ6Bi_NwtI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAttractions() {
  const dataPath = '/Users/tokichin/.openclaw/workspace-nova/japan-attractions-batch2.json';
  const attractions = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  
  let successCount = 0;
  let failCount = 0;

  console.log(`開始更新第二批 ${attractions.length} 個景點...\n`);

  for (const attr of attractions) {
    try {
      const { data, error } = await supabase
        .from('attractions')
        .update({
          description: attr.description,
          opening_hours: attr.opening_hours,
          ticket_price: attr.ticket_price,
          updated_at: new Date().toISOString()
        })
        .eq('id', attr.id)
        .select();

      if (error) {
        console.error(`❌ [${attr.name}] 更新失敗:`, error.message);
        failCount++;
      } else {
        console.log(`✅ [${attr.name}] 更新成功`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ [${attr.name}] 發生錯誤:`, err.message);
      failCount++;
    }
  }

  console.log(`\n第二批更新完成：成功 ${successCount} 個，失敗 ${failCount} 個`);
  console.log(`\n總計完成：第一批 17 個 + 第二批 ${successCount} 個 = ${17 + successCount} 個景點`);
}

updateAttractions();
