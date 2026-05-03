/**
 * 請假計算工具
 *
 * 給前端 + 後端共用：
 *   - 算請假總時數（minutes）
 *   - 算扣薪預估
 *   - 判斷是否需附件
 *   - 判斷是否觸發 2026 病假保護期
 */

import { DAILY_DIVISOR, DAILY_WORK_HOURS, SICK_LEAVE_PROTECTION } from './law-constants'

export interface LeaveTypeRules {
  code: string
  name: string
  pay_type: 'full' | 'half' | 'unpaid'
  attendance_bonus_flag: 'protected' | 'proportional' | 'deductible'
  requires_attachment: boolean
  attachment_threshold_days: number | null
  supports_hourly: boolean
}

/**
 * 算總分鐘數（含跨日 / 半天 / 小時制）
 *  - 同日：差距即可
 *  - 跨日：每天算 8 小時、總共 (天數 × 8 × 60)
 *  - 注意：minutes 是「實際請假時數」、不是 wall-clock 時間
 */
export function calcTotalMinutes(
  startAt: Date | string,
  endAt: Date | string
): { minutes: number; days: number } {
  const start = new Date(startAt)
  const end = new Date(endAt)
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
  const days = Math.round((minutes / (DAILY_WORK_HOURS * 60)) * 100) / 100
  return { minutes, days }
}

/**
 * 算扣薪金額（單位：元）
 *
 * 扣薪邏輯（依假別）：
 *   - 'full' 照給：扣 0
 *   - 'half' 半薪：扣 月薪 / 30 / 8 × 時數 × 0.5
 *   - 'unpaid' 不給薪：扣 月薪 / 30 / 8 × 時數
 *
 * 全勤獎金扣減（2026 新制）：
 *   - 'protected' 不扣
 *   - 'proportional' 比例扣（主算式：bonus / 30 × 請假天數）
 *   - 'deductible' 依約定（MVP 採保守、按比例扣）
 */
export function calcLeaveDeduction(args: {
  monthlySalary: number
  attendanceBonus: number
  leaveMinutes: number
  rules: Pick<LeaveTypeRules, 'pay_type' | 'attendance_bonus_flag'>
}): {
  salaryDeduction: number
  bonusDeduction: number
  total: number
  breakdown: string
} {
  const { monthlySalary, attendanceBonus, leaveMinutes, rules } = args
  const hourlyWage = monthlySalary / DAILY_DIVISOR / DAILY_WORK_HOURS
  const leaveHours = leaveMinutes / 60
  const leaveDays = leaveMinutes / (DAILY_WORK_HOURS * 60)

  // 薪資扣減
  let salaryDeduction = 0
  if (rules.pay_type === 'unpaid') {
    salaryDeduction = hourlyWage * leaveHours
  } else if (rules.pay_type === 'half') {
    salaryDeduction = hourlyWage * leaveHours * 0.5
  }

  // 全勤獎金扣減
  let bonusDeduction = 0
  if (rules.attendance_bonus_flag === 'proportional' || rules.attendance_bonus_flag === 'deductible') {
    bonusDeduction = (attendanceBonus / DAILY_DIVISOR) * leaveDays
  }

  const total = salaryDeduction + bonusDeduction
  const breakdown = [
    rules.pay_type === 'full'
      ? '工資照給'
      : `${rules.pay_type === 'half' ? '半薪' : '無薪'}：${hourlyWage.toFixed(2)} × ${leaveHours.toFixed(2)}h${rules.pay_type === 'half' ? ' × 0.5' : ''} = ${salaryDeduction.toFixed(2)}`,
    rules.attendance_bonus_flag === 'protected'
      ? '全勤不得扣'
      : `全勤比例扣：${attendanceBonus} / 30 × ${leaveDays.toFixed(2)} = ${bonusDeduction.toFixed(2)}`,
  ].join('；')

  return {
    salaryDeduction: Math.round(salaryDeduction * 100) / 100,
    bonusDeduction: Math.round(bonusDeduction * 100) / 100,
    total: Math.round(total * 100) / 100,
    breakdown,
  }
}

/**
 * 判斷是否需附件
 */
export function requiresAttachment(rules: LeaveTypeRules, leaveDays: number): boolean {
  if (!rules.requires_attachment) return false
  if (rules.attachment_threshold_days == null) return true
  return leaveDays > rules.attachment_threshold_days
}

/**
 * 2026 新制：病假 10 日內保護期警示
 *
 * 給 admin / 主管在審批 / 考核時看：
 *   "該員工今年累計病假 X 天、未逾 10 日、依勞工請假規則第 9-1 條、不利處分需審慎"
 */
export function getSickLeaveProtectionWarning(
  yearlySickDays: number
): { protected: boolean; remaining: number; warning: string | null } {
  const max = SICK_LEAVE_PROTECTION.protected_days_per_year
  const protectedNow = yearlySickDays <= max
  const remaining = Math.max(0, max - yearlySickDays)
  if (protectedNow) {
    return {
      protected: true,
      remaining,
      warning: `該員工今年累計病假 ${yearlySickDays} 天、未逾 ${max} 日。依勞工請假規則第 9-1 條、不得扣考績、降職、不晉薪或影響獎金。如需不利處分、雇主負舉證責任。`,
    }
  }
  return { protected: false, remaining: 0, warning: null }
}
