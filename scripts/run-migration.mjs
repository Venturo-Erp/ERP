import pg from 'pg'
import { readFileSync } from 'fs'

const { Client } = pg

const client = new Client({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 5432,
  user: 'postgres.pfqvdacxowpgfamuvnsn',
  password: 'OpenAIisAGoodCompany.',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
})

const migrationFile = process.argv[2]
if (!migrationFile) {
  console.error('Usage: node run-migration.mjs <migration-file>')
  process.exit(1)
}

try {
  await client.connect()
  console.log('✅ 連線成功')

  const sql = readFileSync(migrationFile, 'utf-8')
  console.log(`執行 migration: ${migrationFile}`)

  await client.query(sql)

  console.log('✅ Migration 執行成功')
} catch (err) {
  console.error('❌ Migration 失敗:', err.message)
  process.exit(1)
} finally {
  await client.end()
}
