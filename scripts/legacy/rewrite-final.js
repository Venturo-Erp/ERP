#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://pfqvdacxowpgfamuvnsn.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTEwODMyMCwiZXhwIjoyMDc0Njg0MzIwfQ.kbJbdYHtOWudBGzV3Jv5OWzWQQZT4aBFFgfUczaVdIE';

const supabase = createClient(supabaseUrl, serviceKey);

// 載入重寫資料
const data = JSON.parse(fs.readFileSync('/Users/tokichin/.openclaw/workspace-nova/attractions-rewrite-data.json', 'utf8'));

async function updateAttractions() {
  let successCount = 0;
  let failCount = 0;

  console.log(`開始更新 ${data.length} 個景點...\n`);

  for (const attr of data) {
    try {
      const { error } = await supabase
        .from('attractions')
        .update({
          description: attr.description,
          ticket_price: attr.ticket_price,
          opening_hours: attr.opening_hours,
          updated_at: new Date().toISOString()
        })
        .eq('id', attr.id);

      if (error) {
        console.error(`❌ [${attr.name}] 失敗:`, error.message);
        failCount++;
      } else {
        console.log(`✅ [${attr.name}]`);
        successCount++;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      console.error(`❌ [${attr.name}] 錯誤:`, err.message);
      failCount++;
    }
  }

  console.log(`\n完成：成功 ${successCount}，失敗 ${failCount}`);
}

updateAttractions();
