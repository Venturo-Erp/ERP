import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabase: SupabaseClient

function getSupabase() {
  if (!supabase) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
  }
  return supabase
}

/**
 * 硬編碼的預設對應（fallback 用）
 * @deprecated 改用資料庫 account_mappings 表
 */
export const PAYMENT_CATEGORY_ACCOUNT_MAP: Record<
  string,
  { debitCode: string; debitName: string; creditCode: string; creditName: string }
> = {
  住宿: { debitCode: '5161', debitName: '團務成本－住宿', creditCode: '2500', creditName: '應付帳款' },
  交通: { debitCode: '5171', debitName: '團務成本－交通', creditCode: '2500', creditName: '應付帳款' },
  餐食: { debitCode: '5181', debitName: '團務成本－餐食', creditCode: '2500', creditName: '應付帳款' },
  門票: { debitCode: '5191', debitName: '團務成本－門票', creditCode: '2500', creditName: '應付帳款' },
  導遊: { debitCode: '5201', debitName: '團務成本－導遊', creditCode: '2500', creditName: '應付帳款' },
  保險: { debitCode: '5211', debitName: '團務成本－保險', creditCode: '2500', creditName: '應付帳款' },
  同業: { debitCode: '5221', debitName: '團務成本－同業', creditCode: '2500', creditName: '應付帳款' },
  其他: { debitCode: '5231', debitName: '團務成本－其他', creditCode: '2500', creditName: '應付帳款' },
  // 特殊類別（暫時保留硬編碼）
  出團款: { debitCode: '1200', debitName: '預付團務成本', creditCode: '1100', creditName: '銀行存款' },
  回團款: { debitCode: '1100', debitName: '銀行存款', creditCode: '1200', creditName: '預付團務成本' },
  員工代墊: { debitCode: '5231', debitName: '團務成本－其他', creditCode: '2720', creditName: '應付費用' },
}

// 快取對應資料（避免每次都查資料庫）
let accountMappingCache: Map<string, Map<string, { debitCode: string; debitName: string; creditCode: string; creditName: string }>> = new Map()
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 分鐘

/**
 * 從資料庫取得租戶的科目對應
 */
async function loadAccountMappings(workspaceId: string): Promise<Map<string, { debitCode: string; debitName: string; creditCode: string; creditName: string }>> {
  const { data } = await getSupabase()
    .from('account_mappings')
    .select(`
      category,
      debit:chart_of_accounts!debit_account_id(code, name),
      credit:chart_of_accounts!credit_account_id(code, name)
    `)
    .eq('workspace_id', workspaceId)
    .eq('mapping_type', 'payment_category')
    .eq('is_active', true)

  const mappingMap = new Map()
  
  if (data) {
    for (const row of data) {
      // Supabase 的 join 可能返回單一物件或陣列
      const debitRaw = row.debit as unknown
      const creditRaw = row.credit as unknown
      const debit = Array.isArray(debitRaw) ? debitRaw[0] : debitRaw
      const credit = Array.isArray(creditRaw) ? creditRaw[0] : creditRaw
      if (debit && credit && typeof debit === 'object' && typeof credit === 'object') {
        const d = debit as { code: string; name: string }
        const c = credit as { code: string; name: string }
        mappingMap.set(row.category, {
          debitCode: d.code,
          debitName: d.name,
          creditCode: c.code,
          creditName: c.name,
        })
      }
    }
  }

  return mappingMap
}

/**
 * 根據請款類別取得會計科目對應（同步版本，使用快取或 fallback）
 */
export function getAccountMapping(category: string, workspaceId?: string) {
  // 如果有快取且未過期，使用快取
  if (workspaceId && accountMappingCache.has(workspaceId) && Date.now() - cacheTimestamp < CACHE_TTL) {
    const workspaceMap = accountMappingCache.get(workspaceId)!
    if (workspaceMap.has(category)) {
      return workspaceMap.get(category)!
    }
  }
  
  // fallback 到硬編碼
  return PAYMENT_CATEGORY_ACCOUNT_MAP[category] || PAYMENT_CATEGORY_ACCOUNT_MAP['其他']
}

/**
 * 根據請款類別取得會計科目對應（異步版本，從資料庫讀取）
 */
export async function getAccountMappingAsync(category: string, workspaceId: string) {
  // 檢查快取
  if (!accountMappingCache.has(workspaceId) || Date.now() - cacheTimestamp >= CACHE_TTL) {
    const mappings = await loadAccountMappings(workspaceId)
    accountMappingCache.set(workspaceId, mappings)
    cacheTimestamp = Date.now()
  }

  const workspaceMap = accountMappingCache.get(workspaceId)
  if (workspaceMap?.has(category)) {
    return workspaceMap.get(category)!
  }

  // fallback
  return PAYMENT_CATEGORY_ACCOUNT_MAP[category] || PAYMENT_CATEGORY_ACCOUNT_MAP['其他']
}

/**
 * 清除快取（當對應更新時呼叫）
 */
export function clearAccountMappingCache(workspaceId?: string) {
  if (workspaceId) {
    accountMappingCache.delete(workspaceId)
  } else {
    accountMappingCache.clear()
  }
}

/**
 * 公司請款費用類型 → 會計科目對應表
 *
 * 公司請款出帳時，根據費用類型對應到營業費用科目
 */
export const COMPANY_EXPENSE_ACCOUNT_MAP: Record<
  string,
  { debitCode: string; debitName: string; creditCode: string; creditName: string }
> = {
  SAL: {
    debitCode: '6101',
    debitName: '薪資支出',
    creditCode: '2101',
    creditName: '應付帳款',
  },
  ENT: {
    debitCode: '6106',
    debitName: '公關費用',
    creditCode: '2101',
    creditName: '應付帳款',
  },
  TRV: {
    debitCode: '6107',
    debitName: '差旅費用',
    creditCode: '2101',
    creditName: '應付帳款',
  },
  OFC: {
    debitCode: '6108',
    debitName: '辦公費用',
    creditCode: '2101',
    creditName: '應付帳款',
  },
  UTL: {
    debitCode: '6103',
    debitName: '水電費',
    creditCode: '2101',
    creditName: '應付帳款',
  },
  RNT: {
    debitCode: '6102',
    debitName: '租金支出',
    creditCode: '2101',
    creditName: '應付帳款',
  },
  EQP: {
    debitCode: '6109',
    debitName: '設備費用',
    creditCode: '2101',
    creditName: '應付帳款',
  },
  MKT: {
    debitCode: '6104',
    debitName: '行銷費用',
    creditCode: '2101',
    creditName: '應付帳款',
  },
  ADV: {
    debitCode: '6110',
    debitName: '廣告費用',
    creditCode: '2101',
    creditName: '應付帳款',
  },
  TRN: {
    debitCode: '6111',
    debitName: '培訓費用',
    creditCode: '2101',
    creditName: '應付帳款',
  },
}

/**
 * 根據公司費用類型取得會計科目對應
 */
export function getCompanyExpenseMapping(expenseType: string) {
  return COMPANY_EXPENSE_ACCOUNT_MAP[expenseType] || COMPANY_EXPENSE_ACCOUNT_MAP['OFC']
}
