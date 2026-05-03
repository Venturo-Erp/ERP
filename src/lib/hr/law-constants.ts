/**
 * 台灣勞動法規常數（2026-01-01 起生效）
 *
 * 設計原則（vault: erp/modules/hr/decisions/2026-05-03_three_flows_ux.md）：
 *   - 不准 hardcode：所有法規數字集中在這個檔
 *   - 每年 1 月 review、修一年一次
 *   - 每個常數標 LAW reference
 *   - 計算前檢查 LAST_VALIDATED 是否在當年內、否則 throw warning
 *
 * 下次 review：📅 2027-01-01
 */

export const LAW_VERSION = '2026-01-01' as const
export const LAST_VALIDATED = '2026-05-03' as const
export const NEXT_REVIEW = '2027-01-01' as const

// LAW: 勞動部 113 年 9 月 4 日公告（2026-01-01 生效）
export const MIN_WAGE = {
  monthly: 29_500,
  hourly: 196,
  effective_date: '2026-01-01',
  source: '勞動部 113 年 9 月 4 日公告',
} as const

// LAW: 計算日薪基準（勞基法施行細則 + 司法實務）
export const DAILY_DIVISOR = 30 as const
export const DAILY_WORK_HOURS = 8 as const

// LAW: 勞基法第 24 條（平日延長工時 + 休息日）+ 勞基法第 39 條（國定假日）
export const OVERTIME_RATES = {
  weekday_first_2h: 1.34, // 4/3
  weekday_after_2h: 1.67, // 5/3
  rest_day_first_2h: 1.34, // 月薪制額外加給
  rest_day_3_to_8h: 1.67,
  rest_day_9_to_12h: 2.67,
  holiday_first_8h: 2.0, // 加倍發給（月薪制：另給 1 日工資；時薪制：總領 2 倍）
  holiday_9_to_10h: 2.34,
  holiday_11_to_12h: 2.67,
} as const

// LAW: 勞基法第 24 條（休息日區塊計算）
export const REST_DAY_BLOCK_RULES = {
  under_4h_count_as: 4,
  under_8h_count_as: 8,
  under_12h_count_as: 12,
} as const

// LAW: 勞工請假規則第 9 條（2026 新制：全勤獎金按比例扣）
export const ATTENDANCE_BONUS_DEDUCTION = {
  // 2026 新制：禁止「請一天扣全月」、必須按比例
  formula: 'bonus_amount / 30 * leave_days',
  enforced_from: '2026-01-01',
  legal_basis: '勞工請假規則第 9 條（2026 修訂版）',
} as const

// LAW: 勞工請假規則第 9-1 條（2026 新制：病假 10 日內禁不利處分）
export const SICK_LEAVE_PROTECTION = {
  protected_days_per_year: 10,
  forbidden_actions: ['扣考績', '降職', '不晉薪', '影響獎金'],
  burden_of_proof: 'employer', // 勞工主張、雇主舉證無關
  legal_basis: '勞工請假規則第 9-1 條（2026 新增）',
} as const

// LAW: 勞工請假規則第 7 條（2026 新制：家庭照顧假可小時為單位）
export const FAMILY_CARE_LEAVE = {
  hourly_unit_supported: true,
  total_hours_per_year: 56, // 7 日 × 8h
  legal_basis: '勞工請假規則第 7 條（2026 修訂版）',
} as const

// LAW: 勞工保險條例（2025-01-01 起費率 12.5%）
// 注意：MVP 用簡化費率、未導入完整 11 級對照表（Phase 2）
export const LABOR_INSURANCE = {
  total_rate: 0.125, // 12.5%（普通事故 11.5% + 就保 1%）
  employer_share: 0.7, // 70%
  employee_share: 0.2, // 20%
  government_share: 0.1, // 10%
  // 簡化計算：投保薪資 = clamp(月薪, MIN_WAGE.monthly, MAX_INSURED)
  min_insured_salary: 29_500,
  max_insured_salary: 45_800, // 第 11 級頂
  legal_basis: '勞工保險條例 + 2025-01-01 費率調整',
  note: 'MVP 簡化版、Phase 2 導入完整 11 級對照表',
} as const

// LAW: 全民健康保險法
export const HEALTH_INSURANCE = {
  total_rate: 0.0517, // 5.17%（2024 起）
  employer_share: 0.6,
  employee_share: 0.3,
  government_share: 0.1,
  min_insured_salary: 29_500,
  max_insured_salary: 219_500, // 第 58 級頂
  legal_basis: '全民健康保險法',
  note: 'MVP 簡化版、Phase 2 導入完整 58 級對照表',
} as const

// LAW: 勞工退休金條例（雇主提繳 6%、員工自願 0-6%）
export const PENSION = {
  employer_min_rate: 0.06, // 雇主最低 6%
  employee_voluntary_max: 0.06, // 員工自願最多 6%
  min_contribution_salary: 29_500,
  max_contribution_salary: 150_000, // 第 62 級頂
  legal_basis: '勞工退休金條例第 14 條',
} as const

// 二代健保補充保費（薪資外收入觸發）
export const SUPPLEMENTARY_HEALTH = {
  rate: 0.0211, // 2.11%
  trigger_threshold: 26_400, // 單筆超過此門檻才扣（2024 標準）
  legal_basis: '二代健保',
  note: 'MVP 不實作、Phase 2 加',
} as const

/**
 * 檢查法規常數是否還在有效期（不在當年內 throw warning）
 * 計算引擎跑前先 call 一次
 */
export function checkLawValidity(): { ok: boolean; warning?: string } {
  const validatedYear = parseInt(LAST_VALIDATED.slice(0, 4), 10)
  const currentYear = new Date().getFullYear()
  if (currentYear > validatedYear) {
    return {
      ok: false,
      warning: `法規常數最後驗證於 ${LAST_VALIDATED}、目前為 ${currentYear} 年。請聯絡 William review、確認 ${LAW_VERSION} 法規仍適用。下次 review：${NEXT_REVIEW}`,
    }
  }
  return { ok: true }
}
