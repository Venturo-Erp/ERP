'use client'

/**
 * 新手引導控制 hook
 * - 從 workspace.setup_state 讀狀態
 * - 決定當前步驟
 * - 自動判定完成條件
 * - 持久化進度到 DB
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { supabase } from '@/lib/supabase/client'
import { logger } from '@/lib/utils/logger'
import type { TutorialStep } from './tutorial-overlay'

export interface SetupState {
  tutorial_dismissed: boolean
  /** 個人設定首次引導是否已走過（第一次強制走完 3 步，之後只顯示缺的） */
  personal_walkthrough_done?: boolean
}

const DEFAULT_STATE: SetupState = {
  tutorial_dismissed: false,
  personal_walkthrough_done: false,
}

// 必填欄位定義
interface FieldCheck {
  key: string
  label: string
}

const COMPANY_REQUIRED_FIELDS: FieldCheck[] = [
  { key: 'name', label: '公司名稱' },
  { key: 'legal_name', label: '法定公司名稱' },
  { key: 'logo_url', label: 'Logo' },
  { key: 'address', label: '公司地址' },
  { key: 'phone', label: '聯絡電話' },
  { key: 'email', label: 'Email' },
  { key: 'tax_id', label: '統一編號' },
  { key: 'company_seal_url', label: '大章（公司章）' },
  { key: 'personal_seal_url', label: '小章（負責人章）' },
  { key: 'invoice_seal_image_url', label: '發票用章' },
  { key: 'contract_seal_image_url', label: '合約用章' },
]

interface WorkspaceData {
  setup_state?: SetupState
  [key: string]: unknown
}

interface CurrentEmployee {
  chinese_name?: string | null
  display_name?: string | null
  email?: string | null
  must_change_password?: boolean | null
}

export function useTutorial() {
  const { user } = useAuthStore()
  const pathname = usePathname()
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null)
  const [employeeCount, setEmployeeCount] = useState(0)
  const [currentEmployee, setCurrentEmployee] = useState<CurrentEmployee | null>(null)
  const [loading, setLoading] = useState(true)

  // 載入 workspace + 員工數 + 自己的員工資料
  const loadState = useCallback(async () => {
    if (!user?.workspace_id || !user?.id) {
      setLoading(false)
      return
    }
    try {
      const [{ data: ws }, { count }, { data: me }] = await Promise.all([
        supabase.from('workspaces').select('*').eq('id', user.workspace_id).single(),
        supabase
          .from('employees')
          .select('id', { count: 'exact', head: true })
          .eq('workspace_id', user.workspace_id)
          .or('is_bot.is.null,is_bot.eq.false'),
        supabase
          .from('employees')
          .select('chinese_name, display_name, email, must_change_password')
          .eq('id', user.id)
          .single(),
      ])
      setWorkspace(ws as WorkspaceData)
      setEmployeeCount(count || 0)
      setCurrentEmployee((me as CurrentEmployee) || null)
    } catch (err) {
      logger.error('載入教學狀態失敗:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.workspace_id, user?.id])

  useEffect(() => {
    loadState()
  }, [loadState])

  const setupState: SetupState = useMemo(
    () => (workspace?.setup_state as SetupState) || DEFAULT_STATE,
    [workspace]
  )

  // 計算缺少的欄位
  const missingFields = useMemo(() => {
    if (!workspace) return []
    return COMPANY_REQUIRED_FIELDS.filter(f => {
      const val = workspace[f.key]
      return !val || (typeof val === 'string' && !val.trim())
    })
  }, [workspace])

  const companyInfoDone = missingFields.length === 0
  const hasEmployees = employeeCount >= 2 // 至少 1 個 admin + 1 個員工

  // 個人設定檢查
  const needsPasswordChange = !!currentEmployee?.must_change_password
  const needsNameCheck = !currentEmployee?.chinese_name?.trim()
  const needsEmailCheck = !currentEmployee?.email?.trim()
  const isOnSettingsPage = pathname === '/settings'

  // Session 內已「知道了」的步驟（重整會重置）
  const [acknowledgedSteps, setAcknowledgedSteps] = useState<Set<string>>(new Set())
  // 本次 session 是否被使用者完全關掉（X 按鈕）
  const [sessionDismissed, setSessionDismissed] = useState(false)

  // 第一次登入要走完個人 3 步，之後只顯示缺的
  const isFirstWalkthrough = !setupState.personal_walkthrough_done
  // 在 /settings/company 時直接跳到公司欄位引導，不管個人步驟
  const skipPersonalOnCompanyPage = pathname === '/settings/company'

  // 目前步驟
  const currentStep: TutorialStep | null = useMemo(() => {
    if (loading || setupState.tutorial_dismissed) return null
    const isAck = (id: string) => acknowledgedSteps.has(id)

    // Step 1: 改密碼 — 第一次走過時一定顯示，之後只在 must_change_password=true 才顯示
    const showStep1 =
      !skipPersonalOnCompanyPage &&
      (isFirstWalkthrough || needsPasswordChange) &&
      !isAck('change-password')
    if (showStep1) {
      return {
        id: 'change-password',
        target: isOnSettingsPage
          ? '[data-tutorial="btn-change-password"]'
          : '[data-tutorial="nav-settings"]',
        title: '第一步：修改預設密碼',
        body: needsPasswordChange
          ? '為了帳號安全，請先把系統預設密碼換成你自己的密碼。'
          : '密碼已經設定好，如果之後想更換可以點這個按鈕。',
        placement: isOnSettingsPage ? 'left' : 'right',
        canSkip: true,
        href: isOnSettingsPage ? undefined : '/settings',
        actionLabel: isOnSettingsPage ? '知道了' : '前往個人設定',
      }
    }

    // Step 2: 確認中文姓名 — 第一次走過時一定顯示
    const showStep2 =
      !skipPersonalOnCompanyPage && (isFirstWalkthrough || needsNameCheck) && !isAck('confirm-name')
    if (showStep2) {
      return {
        id: 'confirm-name',
        target: isOnSettingsPage
          ? '[data-tutorial="field-chinese_name"]'
          : '[data-tutorial="nav-settings"]',
        title: '第二步：確認你的姓名',
        body: needsNameCheck
          ? '請填入你的中文姓名，之後在團隊列表、訂單指派等地方會用到。'
          : `目前姓名：${currentEmployee?.chinese_name || ''}，如果不對請修改後儲存。`,
        placement: 'right',
        canSkip: true,
        href: isOnSettingsPage ? undefined : '/settings',
        actionLabel: isOnSettingsPage ? '知道了' : '前往個人設定',
      }
    }

    // Step 3: 確認 Email — 第一次走過時一定顯示
    const showStep3 =
      !skipPersonalOnCompanyPage &&
      (isFirstWalkthrough || needsEmailCheck) &&
      !isAck('confirm-email')
    if (showStep3) {
      return {
        id: 'confirm-email',
        target: isOnSettingsPage
          ? '[data-tutorial="field-email"]'
          : '[data-tutorial="nav-settings"]',
        title: '第三步：確認你的 Email',
        body: needsEmailCheck
          ? '請填入 Email，之後通知、密碼重設會用到。'
          : `目前 Email：${currentEmployee?.email || ''}，請確認正確。`,
        placement: 'right',
        canSkip: true,
        href: isOnSettingsPage ? undefined : '/settings',
        actionLabel: isOnSettingsPage ? '知道了' : '前往個人設定',
      }
    }

    // Step 4: 公司資訊
    if (!companyInfoDone) {
      // 在 /settings/company 時一個欄位一個欄位引導
      if (pathname === '/settings/company') {
        // 找第一個還沒 ack 的缺欄位
        const nextField = missingFields.find(f => !isAck(`company-field-${f.key}`))
        if (nextField) {
          const missingIndex = missingFields.findIndex(f => f.key === nextField.key)
          const totalMissing = missingFields.length
          return {
            id: `company-field-${nextField.key}`,
            target: `#field-${nextField.key}`,
            title: `第 4 步 (${missingIndex + 1}/${totalMissing})：${nextField.label}`,
            body: `請填寫「${nextField.label}」。這個欄位之後會用在合約、發票、團確認單等地方。`,
            placement: 'right',
            canSkip: true,
            actionLabel: '知道了',
          }
        }
        // 所有 field 都看過了但還沒填 → 直接進下一步（add-employee），不顯示 fallback
        // 避免又跳出「公司資訊還有 10 項未填」的訊息
      } else if (!isAck('company-info')) {
        // 只有在 /dashboard 或 /settings 時，才顯示「有 N 項未填，前往設定」的總結步驟
        const firstMissing = missingFields[0]?.key
        const hash = firstMissing ? `#field-${firstMissing}` : ''
        const target = isOnSettingsPage
          ? '[data-tutorial="tab-company"]'
          : '[data-tutorial="nav-settings"]'
        return {
          id: 'company-info',
          target,
          title: `第 4 步：公司資訊還有 ${missingFields.length} 項未填`,
          body: `點擊前往，系統會一個欄位一個欄位帶你填完。`,
          placement: isOnSettingsPage ? 'bottom' : 'right',
          canSkip: true,
          href: `/settings/company${hash}`,
          actionLabel: '前往設定',
        }
      }
    }

    // Step 5: 新增員工
    if (!hasEmployees && !isAck('add-employee')) {
      return {
        id: 'add-employee',
        target: '[data-tutorial="nav-hr"]',
        title: '新增員工',
        body: '新增至少一位員工。可以先建特助帳號讓特助幫忙後續設定。',
        placement: 'right',
        canSkip: true,
        href: '/hr',
        actionLabel: '前往人資',
      }
    }

    return null
  }, [
    loading,
    setupState,
    companyInfoDone,
    hasEmployees,
    missingFields,
    needsPasswordChange,
    needsNameCheck,
    needsEmailCheck,
    isOnSettingsPage,
    acknowledgedSteps,
    isFirstWalkthrough,
    currentEmployee,
    pathname,
    skipPersonalOnCompanyPage,
  ])

  const STEP_ORDER = [
    'change-password',
    'confirm-name',
    'confirm-email',
    'company-info',
    'add-employee',
  ]
  const totalSteps = STEP_ORDER.length
  const stepNumber = (() => {
    if (!currentStep) return 0
    // company-field-* 都算是第 4 步（公司資訊）的子步驟
    if (currentStep.id.startsWith('company-field-')) return 4
    const idx = STEP_ORDER.indexOf(currentStep.id)
    return idx >= 0 ? idx + 1 : 0
  })()

  // 更新 setup_state
  const updateState = useCallback(
    async (updates: Partial<SetupState>) => {
      if (!user?.workspace_id) return
      const next = { ...setupState, ...updates }
      try {
        await supabase
          .from('workspaces')
          .update({ setup_state: next } as never)
          .eq('id', user.workspace_id)
        setWorkspace(prev => (prev ? { ...prev, setup_state: next } : prev))
      } catch (err) {
        logger.error('更新 setup_state 失敗:', err)
      }
    },
    [setupState, user?.workspace_id]
  )

  // 個人設定步驟必須在 /settings 才顯示；公司設定 / 員工步驟限首頁
  const isOnDashboard = pathname === '/dashboard' || pathname === '/'
  const isOnSettings = pathname === '/settings'
  const personalStepIds = ['change-password', 'confirm-name', 'confirm-email']
  const isPersonalStep = currentStep && personalStepIds.includes(currentStep.id)

  // 換頁時重新載入資料（不重置 acknowledgedSteps —— 才能看到下一步）
  useEffect(() => {
    if (user?.workspace_id) loadState()
  }, [pathname, user?.workspace_id])

  // 「知道了」— 標記當前步驟為已確認，載入最新資料讓下一步出現
  const completeCurrentStep = useCallback(() => {
    if (!currentStep) return
    setAcknowledgedSteps(prev => {
      const next = new Set(prev)
      next.add(currentStep.id)
      return next
    })
    // 按到第三步（Email）就把 personal_walkthrough_done 標記為 true
    // 之後個人三步就變成只在「真的缺」時才顯示
    if (currentStep.id === 'confirm-email' && !setupState.personal_walkthrough_done) {
      updateState({ personal_walkthrough_done: true })
    }
    // 重新載入 DB 狀態，避免使用者剛填完欄位但狀態沒更新
    loadState()
  }, [currentStep, loadState, setupState.personal_walkthrough_done, updateState])

  // 「X」— 完全關閉本次 session 的教學
  const dismiss = useCallback(() => {
    setSessionDismissed(true)
  }, [])

  // 顯示邏輯：
  // - 個人步驟：在 /settings 或首頁都顯示
  // - 公司資訊綜合步驟 (company-info)：在首頁 + /settings + /settings/company 都顯示
  // - 公司單欄位步驟 (company-field-*)：只在 /settings/company 顯示
  // - 新增員工步驟：任何頁面都顯示（引導去 /hr）
  const isOnSettingsCompany = pathname === '/settings/company'
  const effectiveCurrentStep = useMemo(() => {
    if (sessionDismissed) return null
    if (!currentStep) return null
    if (isPersonalStep) {
      return isOnDashboard || isOnSettings ? currentStep : null
    }
    if (currentStep.id === 'company-info') {
      return isOnDashboard || isOnSettings || isOnSettingsCompany ? currentStep : null
    }
    if (currentStep.id.startsWith('company-field-')) {
      return isOnSettingsCompany ? currentStep : null
    }
    // add-employee 在任何頁面都顯示
    return currentStep
  }, [
    sessionDismissed,
    currentStep,
    isPersonalStep,
    isOnDashboard,
    isOnSettings,
    isOnSettingsCompany,
  ])

  return {
    loading,
    setupState,
    currentStep: effectiveCurrentStep,
    stepNumber,
    totalSteps,
    missingFields,
    companyInfoDone,
    hasEmployees,
    completeCurrentStep,
    dismiss,
    reload: loadState,
  }
}
