#!/usr/bin/env node
/**
 * 重新生成 Supabase TypeScript types
 *
 * 使用 Supabase Management API 獲取最新 schema 並生成 types.ts
 *
 * 用法：node scripts/regenerate-supabase-types.mjs
 */

const PROJECT_REF = 'pfqvdacxowpgfamuvnsn'
const ACCESS_TOKEN = 'sbp_ae479b3d5d81d4992b6cebb91d93a16bfa499e02'
const API_BASE = `https://api.supabase.com/v1/projects/${PROJECT_REF}`

async function getSchema() {
  console.log('📡 Fetching schema from Supabase...')

  const response = await fetch(`${API_BASE}/types/typescript`, {
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fetch types: ${response.status} ${error}`)
  }

  const data = await response.json()
  return data.types || data
}

async function writeTypes(types) {
  const fs = await import('fs')
  const path = await import('path')
  const { fileURLToPath } = await import('url')

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const typesPath = path.join(__dirname, '../src/lib/supabase/types.ts')

  console.log(`📝 Writing types to ${typesPath}`)
  fs.writeFileSync(typesPath, types, 'utf-8')
  console.log('✅ Types file updated successfully!')
}

async function main() {
  try {
    const types = await getSchema()
    await writeTypes(types)

    console.log('\n🎉 Supabase types regenerated!')
    console.log('\n📋 Next steps:')
    console.log('1. Review the changes: git diff src/lib/supabase/types.ts')
    console.log('2. Commit if everything looks good')
    console.log('3. Remove @ts-expect-error comments if they are no longer needed')
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

main()
