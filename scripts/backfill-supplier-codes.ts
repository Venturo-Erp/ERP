#!/usr/bin/env tsx
/**
 * 補充現有供應商編號（S00001, S00002, ...）
 * 
 * 執行方式：
 * cd ~/Projects/venturo-erp
 * npx tsx scripts/backfill-supplier-codes.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// 從 .env.local 讀取 Supabase 憑證
const envPath = path.join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')

const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1] || ''
const SUPABASE_KEY = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1] || ''
const WORKSPACE_ID = '8ef05a74-1f87-48ab-afd3-9bfeb423935d'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function main() {
  console.log('🔍 查詢所有供應商...')

  // 查詢所有沒有標準編號格式（S00001）的供應商
  const { data: suppliers, error } = await supabase
    .from('suppliers')
    .select('id, name, code')
    .eq('workspace_id', WORKSPACE_ID)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('❌ 查詢失敗:', error)
    process.exit(1)
  }

  if (!suppliers || suppliers.length === 0) {
    console.log('✅ 沒有供應商需要處理！')
    process.exit(0)
  }

  // 過濾出需要更新的供應商（沒有標準編號格式）
  const needsUpdate = suppliers.filter(s => !s.code || !/^S\d{5}$/.test(s.code))

  if (needsUpdate.length === 0) {
    console.log('✅ 所有供應商都已有標準編號！')
    process.exit(0)
  }

  console.log(`📋 找到 ${needsUpdate.length} 個供應商需要補編號`)

  // 查詢最大編號
  const { data: maxCodeData } = await supabase
    .from('suppliers')
    .select('code')
    .eq('workspace_id', WORKSPACE_ID)
    .like('code', 'S%')
    .order('code', { ascending: false })
    .limit(1)

  let nextNum = 1
  if (maxCodeData && maxCodeData.length > 0) {
    const lastCode = maxCodeData[0].code
    const match = lastCode?.match(/^S(\d+)$/)
    if (match) {
      nextNum = parseInt(match[1], 10) + 1
    }
  }

  console.log(`🔢 起始編號: S${String(nextNum).padStart(5, '0')}`)

  // 批次更新
  for (const supplier of needsUpdate) {
    const newCode = `S${String(nextNum).padStart(5, '0')}`
    
    const { error: updateError } = await supabase
      .from('suppliers')
      .update({ code: newCode })
      .eq('id', supplier.id)

    if (updateError) {
      console.error(`❌ 更新失敗 [${supplier.name}]:`, updateError)
    } else {
      console.log(`✅ ${newCode} → ${supplier.name}`)
    }

    nextNum++
  }

  console.log('🎉 完成！')
}

main().catch(console.error)
