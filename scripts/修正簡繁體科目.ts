/**
 * 修正简繁体科目名称
 * 确保所有科目都是正确的繁体中文
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://pfqvdacxowpgfamuvnsn.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

if (!SUPABASE_KEY) {
  console.error('❌ 需要设置 SUPABASE_SERVICE_KEY 环境变量')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 正确的繁体中文科目名称
const CORRECTIONS = [
  // 7XXX 營業外收入及利益
  { code: '7100', name: '利息收入', description: '存款利息、債券利息' },
  { code: '7110', name: '股利收入', description: '股票股利' },
  { code: '7200', name: '租金收入', description: '出租資產租金' },
  { code: '7300', name: '權利金收入', description: '授權金' },
  { code: '7400', name: '投資利益', description: '權益法認列' },
  { code: '7500', name: '處分投資利益', description: '出售投資獲利' },
  { code: '7600', name: '處分資產利益', description: '出售固定資產獲利' },
  { code: '7700', name: '兌換利益', description: '外幣兌換獲利' },
  { code: '7800', name: '減損迴轉利益', description: '資產減損迴轉' },
  { code: '7900', name: '雜項收入', description: '其他營業外收入' },
  { code: '7910', name: '租稅退款收入', description: '退稅' },
  { code: '7920', name: '盤盈', description: '盤點盈餘' },
  { code: '7930', name: '罰款收入', description: '違約金收入' },
  { code: '7940', name: '逾期帳款收回', description: '已沖銷帳款收回' },

  // 8XXX 營業外費用及損失
  { code: '8100', name: '利息費用', description: '借款利息' },
  { code: '8200', name: '投資損失', description: '權益法認列損失' },
  { code: '8300', name: '處分投資損失', description: '出售投資損失' },
  { code: '8400', name: '處分資產損失', description: '出售固定資產損失' },
  { code: '8500', name: '兌換損失', description: '外幣兌換損失' },
  { code: '8600', name: '減損損失', description: '資產減損' },
  { code: '8700', name: '呆帳損失', description: '無法收回款項' },
  { code: '8800', name: '災害損失', description: '天災、火災等' },
  { code: '8900', name: '雜項費損', description: '其他營業外費損' },
  { code: '8910', name: '盤損', description: '盤點短絀' },
  { code: '8920', name: '罰款支出', description: '違約金、罰金' },
  { code: '8930', name: '捐贈', description: '對外捐贈' },
  { code: '8940', name: '非常損失', description: '非經常性損失' },

  // 9XXX 所得稅費用
  { code: '9100', name: '所得稅費用', description: '營利事業所得稅' },
  { code: '9110', name: '當期所得稅', description: '本期應納稅額' },
  { code: '9120', name: '遞延所得稅', description: '時間性差異' },
  { code: '9130', name: '未分配盈餘稅', description: '5% 未分配盈餘加徵' },
  { code: '9200', name: '所得稅利益', description: '所得稅迴轉利益' },
  { code: '9210', name: '遞延所得稅利益', description: '時間性差異迴轉' },

  // 其他補充
  { code: '1900', name: '其他流動資產', description: null },
  { code: '1910', name: '留抵稅額', description: '進項稅額留抵' },
  { code: '1920', name: '遞延費用－流動', description: '一年內攤銷' },
  { code: '1990', name: '其他非流動資產', description: null },

  { code: '2800', name: '一年或一營業週期內到期長期負債', description: null },
  { code: '2810', name: '應付公司債－流動', description: '一年內到期' },
  { code: '2820', name: '應付長期借款－流動', description: '一年內到期' },
  { code: '2900', name: '遞延所得稅負債', description: '時間性差異' },
  { code: '2950', name: '應計退休金負債', description: null },
  { code: '2960', name: '其他非流動負債', description: null },

  { code: '3500', name: '其他權益', description: null },
  { code: '3510', name: '國外營運機構財務報表換算之兌換差額', description: null },
  {
    code: '3520',
    name: '透過其他綜合損益按公允價值衡量之金融資產未實現評價損益',
    description: null,
  },
  { code: '3530', name: '備供出售金融資產未實現損益', description: null },
  { code: '3540', name: '確定福利計畫之再衡量數', description: null },

  { code: '4500', name: '銷貨收入淨額', description: '扣除退回折讓後' },
  { code: '4600', name: '勞務收入', description: '提供服務收入' },
  { code: '4700', name: '工程收入', description: '建造合約收入' },

  { code: '5500', name: '銷貨成本淨額', description: '扣除退回折讓後' },
  { code: '5600', name: '勞務成本', description: '提供服務成本' },
  { code: '5700', name: '工程成本', description: '建造合約成本' },

  { code: '6000', name: '推銷費用', description: '銷售部門費用' },
  { code: '6001', name: '薪資－推銷', description: null },
  { code: '6002', name: '佣金', description: null },
  { code: '6003', name: '運費', description: null },
  { code: '6004', name: '廣告費', description: null },
  { code: '6005', name: '樣品費', description: null },
  { code: '6100', name: '管理費用', description: '管理部門費用' },
  { code: '6101', name: '薪資－管理', description: null },
  { code: '6102', name: '租金', description: null },
  { code: '6103', name: '折舊', description: null },
  { code: '6104', name: '保險費', description: null },
  { code: '6105', name: '修繕費', description: null },
  { code: '6200', name: '研究發展費用', description: '研發部門費用' },
  { code: '6201', name: '薪資－研發', description: null },
  { code: '6202', name: '材料費', description: null },
]

async function main() {
  console.log('開始修正簡繁體科目名稱...\n')

  const { data: workspaces } = await supabase.from('workspaces').select('id, name').limit(1)

  if (!workspaces || workspaces.length === 0) {
    console.error('❌ 找不到 workspace')
    return
  }

  const workspaceId = workspaces[0].id
  console.log(`Workspace: ${workspaces[0].name} (${workspaceId})`)

  let updated = 0
  let notFound = 0

  for (const correction of CORRECTIONS) {
    const { data: existing } = await supabase
      .from('chart_of_accounts')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .eq('code', correction.code)
      .single()

    if (!existing) {
      notFound++
      console.log(`  ⚠️  ${correction.code} 不存在，跳過`)
      continue
    }

    // 更新名称和描述
    const { error } = await supabase
      .from('chart_of_accounts')
      .update({
        name: correction.name,
        description: correction.description,
      })
      .eq('id', existing.id)

    if (error) {
      console.error(`  ❌ ${correction.code} 更新失敗:`, error)
      continue
    }

    updated++
    console.log(`  ✅ ${correction.code} ${correction.name}`)
  }

  console.log(`\n完成！`)
  console.log(`  更新: ${updated} 個科目`)
  console.log(`  跳過: ${notFound} 個科目`)
}

main().catch(console.error)
