#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testInsert() {
  const result = await supabase.from('tour_documents').insert({
    tour_id: 'TW260321A',
    file_name: 'test.xlsx',
    file_path: 'tour-documents/TW260321A/insurance/test.xlsx',
    file_size: 1000,
    mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  
  console.log('Insert result:', JSON.stringify(result, null, 2));
}

testInsert();
