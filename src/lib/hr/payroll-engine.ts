/**
 * 薪資計算引擎（MVP 簡化版）
 *
 * 設計決策（vault: erp/modules/hr/decisions/2026-05-03_three_flows_ux.md）：
 *   - MVP 用簡化的勞健保費率（不導入完整 11 / 58 / 62 級對照表）→ Phase 2 升級
 *   - 計算邏輯純函式、給 UI 即時預覽 + 後端確認共用
 *   - 異常用 warnings[] 收集、不擋計算（讓會計判斷）
 *
 * 算薪流程（給單個員工）：
 *   1. 算 gross：本薪 + 加班費 + 全勤獎金 + 其他津貼
 *   2. 算扣項：請假扣 + 全勤獎金扣 + 勞保 + 健保 + 自願勞退提繳
 *   3. 算 net：gross - deductions
 *   4. 檢查最低工資合規 → warnings
 *
 * 注意：所得稅 MVP 暫不算（員工自己報、預扣 0）
 */

import {
  MIN_WAGE,
  DAILY_DIVISOR,
  DAILY_WORK_HOURS,
  OVERTIME_RATES,
  REST_DAY_BLOCK_RULES,
  LABOR_INSURANCE,
  HEALTH_INSURANCE,
  PENSION,
  ATTENDANCE_BONUS_DEDUCTION,
  LAW_VERSION,
} from './law-constants'
import { calcLeaveDeduction, getSickLeaveProtectionWarning } from './leave-calc'

export interface EmployeeInput {
  id: string
  display_name: string | null
  employee_number: string | null
  monthly_salary: number
  attendance_bonus: number
  other_allowances: number
  pension_voluntary_rate: number // 0–0.06
  insured_salary?: number | null // 投保薪資、null 用本薪
}

export interface OvertimeEntry {
  hours: number
  type: 'weekday_first_2h' | 'weekday_after_2h' | 'rest_day_first_2h' | 'rest_day_3_to_8h' | 'rest_day_9_to_12h' | 'holiday_first_8h' | 'holiday_9_to_10h' | 'holiday_11_to_12h'
}

export interface LeaveEntry {
  leave_type_code: string
  pay_type: 'full' | 'half' | 'unpaid'
  attendance_bonus_flag: 'protected' | 'proportional' | 'deductible'
  total_minutes: number
  total_days: number
}

export interface PayrollWarning {
  code: 'min_wage_violation' | 'over_deduction' | 'sick_leave_protection' | 'no_attendance_data' | 'remote_clock_count'
  severity: 'info' | 'warning' | 'error'
  message: string
  detail?: Record<string, unknown>
}

export interface PayslipBreakdown {
  base_salary: number
  overtime_pay: number
  attendance_bonus: number
  other_allowances: number
  gross_amount: number
  leave_deduction: number
  attendance_bonus_deduction: number
  labor_insurance_employee: number
  health_insurance_employee: number
  pension_voluntary: number
  income_tax: number
  other_deductions: number
  total_deductions: number
  net_amount: number
  // 雇主負擔（顯示用）
  labor_insurance_employer: number
  health_insurance_employer: number
  pension_employer: number
  // 計算明細（每段公式都記下來、給勞檢看）
  breakdown_log: string[]
  warnings: PayrollWarning[]
  law_version: string
}

/**
 * 算加班費總額
 */
function calcOvertimePay(monthlySalary: number, overtimes: OvertimeEntry[]): number {
  const hourlyWage = monthlySalary / DAILY_DIVISOR / DAILY_WORK_HOURS
  let total = 0
  for (const o of overtimes) {
    const rate = OVERTIME_RATES[o.type]
    let hours = o.hours
    // 休息日區塊計算
    if (o.type === 'rest_day_first_2h' && hours > 0 && hours < REST_DAY_BLOCK_RULES.under_4h_count_as) {
      hours = REST_DAY_BLOCK_RULES.under_4h_count_as
    }
    total += hourlyWage * hours * rate
  }
  return Math.round(total * 100) / 100
}

/**
 * 算勞保員工負擔（MVP 簡化）
 */
function calcLaborInsurance(insuredSalary: number): { employee: number; employer: number } {
  const clamped = Math.min(
    Math.max(insuredSalary, LABOR_INSURANCE.min_insured_salary),
    LABOR_INSURANCE.max_insured_salary
  )
  const totalPremium = clamped * LABOR_INSURANCE.total_rate
  return {
    employee: Math.round(totalPremium * LABOR_INSURANCE.employee_share),
    employer: Math.round(totalPremium * LABOR_INSURANCE.employer_share),
  }
}

/**
 * 算健保員工負擔（MVP 簡化、未含眷屬）
 */
function calcHealthInsurance(insuredSalary: number): { employee: number; employer: number } {
  const clamped = Math.min(
    Math.max(insuredSalary, HEALTH_INSURANCE.min_insured_salary),
    HEALTH_INSURANCE.max_insured_salary
  )
  const totalPremium = clamped * HEALTH_INSURANCE.total_rate
  return {
    employee: Math.round(totalPremium * HEALTH_INSURANCE.employee_share),
    employer: Math.round(totalPremium * HEALTH_INSURANCE.employer_share),
  }
}

/**
 * 算勞退（雇主提繳 6%、員工自願 0-6%）
 */
function calcPension(insuredSalary: number, voluntaryRate: number): { employee: number; employer: number } {
  const clamped = Math.min(
    Math.max(insuredSalary, PENSION.min_contribution_salary),
    PENSION.max_contribution_salary
  )
  return {
    employee: Math.round(clamped * voluntaryRate),
    employer: Math.round(clamped * PENSION.employer_min_rate),
  }
}

/**
 * 主入口：算單個員工的薪資單
 */
export function computePayslip(args: {
  employee: EmployeeInput
  overtimes: OvertimeEntry[]
  leaves: LeaveEntry[]
  yearlySickDays?: number // 用於 2026 病假保護期警示
}): PayslipBreakdown {
  const { employee, overtimes, leaves, yearlySickDays = 0 } = args
  const log: string[] = []
  const warnings: PayrollWarning[] = []

  // === 1. Gross 收入面 ===
  const baseSalary = employee.monthly_salary
  log.push(`本薪：NT$ ${baseSalary}`)

  const overtimePay = calcOvertimePay(baseSalary, overtimes)
  if (overtimePay > 0) {
    log.push(`加班費：NT$ ${overtimePay}（${overtimes.length} 筆加班紀錄）`)
  }

  // === 2. 請假扣減（含全勤獎金扣減） ===
  let totalLeaveDeduction = 0
  let totalBonusDeduction = 0
  for (const lv of leaves) {
    const ded = calcLeaveDeduction({
      monthlySalary: baseSalary,
      attendanceBonus: employee.attendance_bonus,
      leaveMinutes: lv.total_minutes,
      rules: { pay_type: lv.pay_type, attendance_bonus_flag: lv.attendance_bonus_flag },
    })
    totalLeaveDeduction += ded.salaryDeduction
    totalBonusDeduction += ded.bonusDeduction
    log.push(`${lv.leave_type_code} 扣薪：NT$ ${ded.total}（${ded.breakdown}）`)
  }

  // 2026 新制：病假 10 日內保護期警示
  if (yearlySickDays > 0) {
    const sickWarn = getSickLeaveProtectionWarning(yearlySickDays)
    if (sickWarn.protected && sickWarn.warning) {
      warnings.push({
        code: 'sick_leave_protection',
        severity: 'info',
        message: sickWarn.warning,
        detail: { yearly_sick_days: yearlySickDays },
      })
    }
  }

  // 全勤獎金實領（扣完）
  const attendanceBonusGross = employee.attendance_bonus
  const attendanceBonusNet = Math.max(0, attendanceBonusGross - totalBonusDeduction)

  // === 3. 算 Gross ===
  const grossAmount = Math.round(
    baseSalary +
      overtimePay +
      attendanceBonusNet +
      employee.other_allowances -
      totalLeaveDeduction
  )
  log.push(
    `應發合計：本薪 ${baseSalary} + 加班 ${overtimePay} + 全勤實領 ${attendanceBonusNet} + 津貼 ${employee.other_allowances} - 請假扣 ${totalLeaveDeduction} = NT$ ${grossAmount}`
  )

  // === 4. 勞健保 / 勞退 ===
  const insuredSalary = employee.insured_salary ?? baseSalary
  const labor = calcLaborInsurance(insuredSalary)
  const health = calcHealthInsurance(insuredSalary)
  const pension = calcPension(insuredSalary, employee.pension_voluntary_rate)
  log.push(
    `勞保（員工負擔）：投保 ${insuredSalary} × ${LABOR_INSURANCE.total_rate * 100}% × ${LABOR_INSURANCE.employee_share * 100}% = NT$ ${labor.employee}`
  )
  log.push(
    `健保（員工負擔）：投保 ${insuredSalary} × ${HEALTH_INSURANCE.total_rate * 100}% × ${HEALTH_INSURANCE.employee_share * 100}% = NT$ ${health.employee}`
  )
  if (pension.employee > 0) {
    log.push(`勞退自願提繳：投保 ${insuredSalary} × ${employee.pension_voluntary_rate * 100}% = NT$ ${pension.employee}`)
  }

  // === 5. 算 Net ===
  const totalDeductions = labor.employee + health.employee + pension.employee
  const netAmount = grossAmount - totalDeductions
  log.push(
    `實領：${grossAmount} - 勞保 ${labor.employee} - 健保 ${health.employee} - 勞退 ${pension.employee} = NT$ ${netAmount}`
  )

  // === 6. 合規檢查 ===
  // 6a. 應發 < 基本工資
  if (grossAmount < MIN_WAGE.monthly && totalLeaveDeduction === 0) {
    warnings.push({
      code: 'min_wage_violation',
      severity: 'error',
      message: `應發 NT$ ${grossAmount} 低於 2026 基本工資 NT$ ${MIN_WAGE.monthly}`,
      detail: { gross: grossAmount, min_wage: MIN_WAGE.monthly },
    })
  }

  // 6b. 扣薪後實領 < 基本工資 - 合法扣薪
  const minNet = MIN_WAGE.monthly - totalLeaveDeduction - totalDeductions
  if (netAmount < minNet && totalLeaveDeduction > 0) {
    warnings.push({
      code: 'over_deduction',
      severity: 'warning',
      message: `扣薪後實領可能過度（基本工資 ${MIN_WAGE.monthly} - 合法扣 = ${minNet}、實領 ${netAmount}）`,
      detail: { net: netAmount, min_net: minNet },
    })
  }

  return {
    base_salary: baseSalary,
    overtime_pay: overtimePay,
    attendance_bonus: attendanceBonusGross,
    other_allowances: employee.other_allowances,
    gross_amount: grossAmount,
    leave_deduction: Math.round(totalLeaveDeduction * 100) / 100,
    attendance_bonus_deduction: Math.round(totalBonusDeduction * 100) / 100,
    labor_insurance_employee: labor.employee,
    health_insurance_employee: health.employee,
    pension_voluntary: pension.employee,
    income_tax: 0, // MVP 不算
    other_deductions: 0,
    total_deductions: totalDeductions,
    net_amount: netAmount,
    labor_insurance_employer: labor.employer,
    health_insurance_employer: health.employer,
    pension_employer: pension.employer,
    breakdown_log: log,
    warnings,
    law_version: LAW_VERSION,
  }
}

/**
 * 用來消除沒被使用的 import lint warning（ATTENDANCE_BONUS_DEDUCTION 在文件中當 reference）
 */
export const _LAW_REF = ATTENDANCE_BONUS_DEDUCTION
