#!/usr/bin/env node
/**
 * 測試 payment_methods API
 */

const https = require('https')

const BASE_URL = 'http://100.89.92.46:3000'
const WORKSPACE_ID = '8ef05a74-1f87-48ab-afd3-9bfeb423935d' // Corner

async function testAPI() {
  console.log('🧪 測試 payment_methods API\n')

  // Test 1: 取得所有收款方式
  console.log('📋 Test 1: 取得收款方式 (type=receipt)')
  try {
    const response = await fetch(`${BASE_URL}/api/finance/payment-methods?workspace_id=${WORKSPACE_ID}&type=receipt`)
    const data = await response.json()
    console.log(`✅ 成功取得 ${data.length} 筆收款方式`)
    console.log('   範例:', data[0]?.name)
  } catch (error) {
    console.error('❌ 失敗:', error.message)
  }

  // Test 2: 取得所有付款方式
  console.log('\n📋 Test 2: 取得付款方式 (type=payment)')
  try {
    const response = await fetch(`${BASE_URL}/api/finance/payment-methods?workspace_id=${WORKSPACE_ID}&type=payment`)
    const data = await response.json()
    console.log(`✅ 成功取得 ${data.length} 筆付款方式`)
    console.log('   範例:', data[0]?.name)
  } catch (error) {
    console.error('❌ 失敗:', error.message)
  }

  // Test 3: 檢查報表頁面是否存在
  console.log('\n📊 Test 3: 檢查公司收款報表頁面')
  try {
    const response = await fetch(`${BASE_URL}/finance/reports/company-income`)
    if (response.ok) {
      console.log('✅ 報表頁面存在（HTTP', response.status, '）')
    } else {
      console.log('⚠️ 報表頁面回應異常（HTTP', response.status, '）')
    }
  } catch (error) {
    console.error('❌ 失敗:', error.message)
  }

  console.log('\n✨ 測試完成！')
}

testAPI()
