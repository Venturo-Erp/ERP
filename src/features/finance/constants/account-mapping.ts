/**
 * 請款類別 → 會計科目對應表
 *
 * 當請款出帳時，根據類別自動對應到會計科目
 * 使用 accounting_subjects 表的科目代碼
 */
export const PAYMENT_CATEGORY_ACCOUNT_MAP: Record<
  string,
  { debitCode: string; debitName: string; creditCode: string; creditName: string }
> = {
  // 團務成本類（借方：成本科目，貸方：應付帳款）
  // 使用 accounting_subjects 的科目
  住宿: {
    debitCode: '5102',
    debitName: '旅遊成本-住宿',
    creditCode: '2101',
    creditName: '應付帳款',
  },
  交通: {
    debitCode: '5101',
    debitName: '旅遊成本-交通',
    creditCode: '2101',
    creditName: '應付帳款',
  },
  餐食: {
    debitCode: '5103',
    debitName: '旅遊成本-餐飲',
    creditCode: '2101',
    creditName: '應付帳款',
  },
  門票: {
    debitCode: '5104',
    debitName: '旅遊成本-門票',
    creditCode: '2101',
    creditName: '應付帳款',
  },
  導遊: {
    debitCode: '5106',
    debitName: '旅遊成本-其他',
    creditCode: '2101',
    creditName: '應付帳款',
  },
  保險: {
    debitCode: '5105',
    debitName: '旅遊成本-保險',
    creditCode: '2101',
    creditName: '應付帳款',
  },
  同業: {
    debitCode: '5106',
    debitName: '旅遊成本-其他',
    creditCode: '2101',
    creditName: '應付帳款',
  },
  其他: {
    debitCode: '5106',
    debitName: '旅遊成本-其他',
    creditCode: '2101',
    creditName: '應付帳款',
  },
  // 特殊類別
  出團款: {
    debitCode: '1104',
    debitName: '預付費用',
    creditCode: '1102',
    creditName: '銀行存款',
  },
  回團款: {
    debitCode: '1102',
    debitName: '銀行存款',
    creditCode: '1104',
    creditName: '預付費用',
  },
  員工代墊: {
    debitCode: '5106',
    debitName: '旅遊成本-其他',
    creditCode: '2102',
    creditName: '應付費用',
  },
}

/**
 * 根據請款類別取得會計科目對應
 */
export function getAccountMapping(category: string) {
  return PAYMENT_CATEGORY_ACCOUNT_MAP[category] || PAYMENT_CATEGORY_ACCOUNT_MAP['其他']
}
