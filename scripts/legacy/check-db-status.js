import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZkYWN4b3dwZ2ZhbXV2bnNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY5MjQwOTksImV4cCI6MjA0MjUwMDA5OX0.yNSfe-bVFsj1_j_vN9p8j5I3pqLMXU5SZnNWgZUYkQI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabase() {
  console.log('='.repeat(60))
  console.log('🔍 資料庫狀態檢查報告')
  console.log('='.repeat(60))
  console.log()

  // 1. 檢查 employees 表格
  console.log('📋 1. employees 表格檢查')
  console.log('-'.repeat(60))

  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('id, roles, permissions, preferred_features, workspace_id')
    .limit(3)

  if (empError) {
    console.error('❌ 錯誤:', empError.message)
  } else {
    console.log('✅ 表格存在，共', employees.length, '筆測試資料')

    if (employees.length > 0) {
      const emp = employees[0]
      console.log('\n欄位驗證:')
      console.log('  - id:', emp.id ? '✅' : '❌')
      console.log('  - roles:', emp.roles ? '✅ (type: ' + typeof emp.roles + ')' : '❌')
      console.log(
        '  - permissions:',
        emp.permissions ? '✅ (type: ' + typeof emp.permissions + ')' : '❌'
      )
      console.log(
        '  - preferred_features:',
        emp.preferred_features !== undefined
          ? '✅ (type: ' + typeof emp.preferred_features + ')'
          : '❌'
      )
      console.log('  - workspace_id:', emp.workspace_id ? '✅' : '❌')

      console.log('\n範例資料:')
      employees.forEach((e, i) => {
        console.log(`\n  員工 ${i + 1}:`)
        console.log('    - roles:', JSON.stringify(e.roles))
        console.log('    - permissions:', JSON.stringify(e.permissions).substring(0, 80) + '...')
        console.log('    - preferred_features:', JSON.stringify(e.preferred_features))
      })
    }
  }

  // 2. 統計 preferred_features 設定狀況
  console.log('\n\n📊 2. preferred_features 設定統計')
  console.log('-'.repeat(60))

  const { data: withPref, error: prefError } = await supabase
    .from('employees')
    .select('id, preferred_features')
    .not('preferred_features', 'is', null)

  if (!prefError) {
    console.log('✅ 已設定 preferred_features 的員工數:', withPref.length)

    // 統計每個員工選擇的功能數量
    const stats = withPref.map(e => {
      const features = Array.isArray(e.preferred_features) ? e.preferred_features : []
      return features.length
    })

    if (stats.length > 0) {
      const avg = stats.reduce((a, b) => a + b, 0) / stats.length
      console.log('平均選擇功能數:', avg.toFixed(1))
      console.log('最多:', Math.max(...stats), '個')
      console.log('最少:', Math.min(...stats), '個')
    }
  }

  // 3. 檢查 roles 型別
  console.log('\n\n👥 3. roles 型別檢查')
  console.log('-'.repeat(60))

  const { data: rolesData } = await supabase
    .from('employees')
    .select('roles')
    .not('roles', 'is', null)
    .limit(5)

  if (rolesData && rolesData.length > 0) {
    const roleCounts = {}
    rolesData.forEach(e => {
      if (Array.isArray(e.roles)) {
        e.roles.forEach(role => {
          roleCounts[role] = (roleCounts[role] || 0) + 1
        })
      }
    })

    console.log('角色分布:')
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`  - ${role}: ${count}`)
    })
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ 檢查完成')
  console.log('='.repeat(60))
}

checkDatabase()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ 檢查失敗:', err.message)
    process.exit(1)
  })
