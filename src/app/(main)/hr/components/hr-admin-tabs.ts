/**
 * 人資管理 module 內分頁定義
 * 給 ResponsiveHeader 的 tabs prop 用：value 是路由路徑，click 時用 router.push 切換
 */

interface HrTab {
  value: string // 路由路徑
  label: string
}

export const HR_ADMIN_TABS: Record<string, HrTab[]> = {
  employee: [
    { value: '/hr', label: '員工列表' },
    { value: '/hr/roles', label: '職務管理' },
  ],
  attendance: [
    { value: '/hr/attendance', label: '出勤管理' },
    { value: '/hr/leave', label: '請假管理' },
    { value: '/hr/overtime', label: '加班審核' },
    { value: '/hr/missed-clock', label: '補打卡審核' },
  ],
  payroll: [
    { value: '/hr/payroll', label: '薪資管理' },
    { value: '/hr/deductions', label: '扣款與津貼' },
    { value: '/hr/reports', label: '出勤月報' },
  ],
  settings: [
    { value: '/hr/settings', label: '人資設定' },
    { value: '/hr/training', label: '數位培訓' },
  ],
}
