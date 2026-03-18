import pg from 'pg'
import { readFileSync } from 'fs'

const { Client } = pg

const client = new Client({
  connectionString: 'postgresql://postgres:OpenAIisAGoodCompany.@db.pfqvdacxowpgfamuvnsn.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
})

async function runMigration() {
  try {
    await client.connect()
    console.log('✅ 連線成功')
    
    const sql = readFileSync('supabase/migrations/20260318_extend_tour_requests_for_local_quotes.sql', 'utf-8')
    console.log('📄 執行 migration...')
    
    await client.query(sql)
    
    console.log('✅ Migration 執行成功！')
    
    // 驗證欄位
    console.log('\n🔍 驗證新增的欄位...')
    const { rows } = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tour_requests' 
        AND column_name IN ('supplier_response', 'request_scope', 'accepted_at', 'rejected_at', 'selected_tier', 'package_status')
      ORDER BY column_name
    `)
    
    console.log('新增的欄位：', rows.map(r => r.column_name).join(', '))
    
    // 驗證新表
    const { rows: tables } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'tour_request_items'
    `)
    
    if (tables.length > 0) {
      console.log('✅ tour_request_items 表已建立')
      
      const { rows: columns } = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'tour_request_items'
        ORDER BY ordinal_position
      `)
      
      console.log('欄位列表：', columns.map(c => c.column_name).join(', '))
    }
    
  } catch (err) {
    console.error('❌ Migration 失敗:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

runMigration()
