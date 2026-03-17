#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const testNames = ['高美濕地', '彩虹眷村', '日月潭', '赤崁樓', '錐麓古道'];
  
  const { data: countries } = await supabase
    .from('countries')
    .select('id')
    .eq('code', 'TW')
    .single();
  
  const { data: attractions } = await supabase
    .from('attractions')
    .select('name, description, ticket_price, opening_hours, category')
    .eq('country_id', countries.id)
    .in('name', testNames);
  
  attractions.forEach(attr => {
    console.log('='.repeat(80));
    console.log(`\n【${attr.name}】(${attr.category})`);
    console.log(`\n描述: ${attr.description || '❌ 無'}`);
    console.log(`描述長度: ${attr.description ? attr.description.length : 0} 字`);
    console.log(`\n門票: ${attr.ticket_price || '❌ 無'}`);
    console.log(`\n營業時間: ${JSON.stringify(attr.opening_hours, null, 2) || '❌ 無'}`);
    console.log('\n');
  });
}

main().catch(console.error);
