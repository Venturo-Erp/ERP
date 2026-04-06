#!/usr/bin/env tsx
/**
 * 修正顧客重複和護照驗證狀態問題
 *
 * 1. 合併重複的顧客（相同護照號碼）
 * 2. 同步護照驗證狀態（從 order_members 推斷）
 *
 * 執行方式：
 * cd ~/Projects/venturo-erp
 * npx tsx scripts/fix-customer-duplicates-and-verification.ts
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
  console.log('🔍 步驟 1：查詢重複的顧客...\n')

  // 查詢所有顧客
  const { data, error } = await supabase
    .from('customers')
    .select('passport_number, id, name, created_at')
    .eq('workspace_id', WORKSPACE_ID)
    .not('passport_number', 'is', null)
    .not('passport_number', 'eq', '')
    .order('passport_number')
    .order('created_at')

  // 手動分組
  const grouped: Record<string, any[]> = {}
  data?.forEach(row => {
    if (!grouped[row.passport_number]) {
      grouped[row.passport_number] = []
    }
    grouped[row.passport_number].push(row)
  })

  // 過濾出重複的
  const duplicates = Object.values(grouped)
    .filter(group => group.length > 1)
    .map(group => ({
      passport_number: group[0].passport_number,
      ids: group.map(c => c.id),
      names: group.map(c => c.name),
      created_ats: group.map(c => c.created_at),
    }))

  const dupError = error

  if (dupError) {
    console.error('❌ 查詢失敗:', dupError)
    process.exit(1)
  }

  if (!duplicates || duplicates.length === 0) {
    console.log('✅ 沒有重複的顧客！\n')
  } else {
    console.log(`📋 找到 ${duplicates.length} 組重複的顧客：`)

    for (const dup of duplicates) {
      console.log(`\n🔹 ${dup.names[0]} (護照: ${dup.passport_number})`)
      console.log(
        `   重複 ${dup.ids.length} 筆，ID: ${dup.ids.slice(0, 3).join(', ')}${dup.ids.length > 3 ? '...' : ''}`
      )

      // 保留最早建立的，刪除其他的
      const keepId = dup.ids[0]
      const deleteIds = dup.ids.slice(1)

      console.log(`   ✅ 保留: ${keepId}`)
      console.log(`   🗑️  刪除: ${deleteIds.join(', ')}`)

      // 1. 更新 order_members 的 customer_id 指向保留的顧客
      for (const deleteId of deleteIds) {
        const { error: updateError } = await supabase
          .from('order_members')
          .update({ customer_id: keepId })
          .eq('customer_id', deleteId)

        if (updateError) {
          console.error(`   ❌ 更新 order_members 失敗 (${deleteId}):`, updateError.message)
        }
      }

      // 2. 刪除重複的顧客
      const { error: deleteError } = await supabase.from('customers').delete().in('id', deleteIds)

      if (deleteError) {
        console.error(`   ❌ 刪除顧客失敗:`, deleteError.message)
      } else {
        console.log(`   ✅ 已刪除 ${deleteIds.length} 筆重複記錄`)
      }
    }
  }

  console.log('\n\n🔍 步驟 2：同步護照驗證狀態...\n')

  // 查詢所有有關聯訂單成員的顧客
  const { data: customersWithMembers, error: cwmError } = await supabase
    .from('customers')
    .select(
      `
      id,
      name,
      passport_number,
      verification_status,
      order_members!inner (
        id,
        passport_number,
        passport_name,
        passport_expiry,
        id_number
      )
    `
    )
    .eq('workspace_id', WORKSPACE_ID)

  if (cwmError) {
    console.error('❌ 查詢失敗:', cwmError)
    process.exit(1)
  }

  console.log(`📋 找到 ${customersWithMembers?.length || 0} 位有訂單記錄的顧客`)

  let updatedCount = 0

  for (const customer of customersWithMembers || []) {
    // 檢查 order_members 的護照資料是否完整
    const members = customer.order_members as any[]
    const hasVerifiedMember = members.some(
      m =>
        m.passport_number && m.passport_name && m.passport_expiry && m.passport_number.length >= 8
    )

    // 如果有完整的護照資料，但顧客的 verification_status 不是 verified，則更新
    if (hasVerifiedMember && customer.verification_status !== 'verified') {
      const { error: updateError } = await supabase
        .from('customers')
        .update({ verification_status: 'verified' })
        .eq('id', customer.id)

      if (updateError) {
        console.error(`❌ 更新失敗 [${customer.name}]:`, updateError.message)
      } else {
        console.log(`✅ ${customer.name} → 已驗證`)
        updatedCount++
      }
    }
  }

  console.log(`\n🎉 完成！更新了 ${updatedCount} 位顧客的驗證狀態`)
}

main().catch(console.error)
