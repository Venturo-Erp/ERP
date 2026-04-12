/**
 * 員工過濾工具
 * - filterOutBots: 排除機器人帳號（BOT001 等）
 * - isRealEmployee: 判斷是否為真人員工
 * 用於人數統計、指派選單、薪資計算等場景
 */

interface EmployeeLike {
  is_bot?: boolean | null
  employee_number?: string | null
}

/** 判斷是否為機器人 */
export function isBot(emp: EmployeeLike | null | undefined): boolean {
  if (!emp) return false
  if (emp.is_bot === true) return true
  // 向後相容：舊資料沒 is_bot 欄位，用編號判斷
  if (emp.employee_number?.startsWith('BOT')) return true
  return false
}

/** 判斷是否為真人員工（非機器人） */
export function isRealEmployee(emp: EmployeeLike | null | undefined): boolean {
  return !isBot(emp)
}

/** 從員工列表中排除機器人 */
export function filterOutBots<T extends EmployeeLike>(employees: T[]): T[] {
  return employees.filter(isRealEmployee)
}

/** 計算真人員工數（排除機器人） */
export function countRealEmployees(employees: EmployeeLike[]): number {
  return employees.filter(isRealEmployee).length
}
