#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: countries } = await supabase
    .from('countries')
    .select('id')
    .eq('code', 'TW')
    .single();
  
  const { data: attractions } = await supabase
    .from('attractions')
    .select('*')
    .eq('country_id', countries.id)
    .limit(3);
  
  if (attractions && attractions.length > 0) {
    console.log('欄位名稱:', Object.keys(attractions[0]));
    console.log('\n第一筆資料:');
    console.log(JSON.stringify(attractions[0], null, 2));
  }
}

main().catch(console.error);
