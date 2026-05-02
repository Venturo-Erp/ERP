'use client'

import React, { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { useAuthStore } from '@/stores/auth-store'
import { LABELS } from './constants/labels'

interface CreateTenantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
  existingCodes: string[]
}

interface Step1Data {
  name: string
  code: string
  maxEmployees: string
}

interface Step2Data {
  employeeNumber: string
  name: string
  email: string // 保留但選填
  password: string
}

interface LoginInfo {
  workspaceCode: string
  employeeNumber: string
  password: string
}

export function CreateTenantDialog({
  open,
  onOpenChange,
  onComplete,
  existingCodes,
}: CreateTenantDialogProps) {
  const user = useAuthStore(state => state.user)

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [codeError, setCodeError] = useState('')

  const [step1, setStep1] = useState<Step1Data>({ name: '', code: '', maxEmployees: '' })
  const [step2, setStep2] = useState<Step2Data>({
    employeeNumber: 'E001',
    name: '',
    email: '',
    password: '12345678',
  })
  const [loginInfo, setLoginInfo] = useState<LoginInfo | null>(null)

  const resetForm = useCallback(() => {
    setStep(1)
    setCreating(false)
    setCopied(false)
    setCodeError('')
    setStep1({ name: '', code: '', maxEmployees: '' })
    setStep2({ employeeNumber: 'E001', name: '', email: '', password: '12345678' })
    setLoginInfo(null)
  }, [])

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        resetForm()
      }
      onOpenChange(isOpen)
    },
    [onOpenChange, resetForm]
  )

  const validateCode = useCallback(
    (code: string) => {
      if (!code) {
        setCodeError('')
        return false
      }
      if (!/^[A-Z]+$/.test(code)) {
        setCodeError(LABELS.FIELD_CODE_INVALID)
        return false
      }
      const isDuplicate = existingCodes.some(c => c.toUpperCase() === code.toUpperCase())
      if (isDuplicate) {
        setCodeError(LABELS.FIELD_CODE_DUPLICATE)
        return false
      }
      setCodeError('')
      return true
    },
    [existingCodes]
  )

  const handleCodeChange = useCallback(
    (value: string) => {
      const upper = value.toUpperCase()
      setStep1(prev => ({ ...prev, code: upper }))
      validateCode(upper)
    },
    [validateCode]
  )

  const isStep1Valid =
    step1.name.trim() !== '' &&
    step1.code.trim() !== '' &&
    !codeError &&
    /^[A-Z]+$/.test(step1.code)
  // Email 改為選填，只驗證名稱和密碼
  const isStep2Valid = step2.name.trim() !== '' && step2.password.length >= 6

  const handleCreate = async () => {
    if (!user) return
    setCreating(true)

    try {
      // 呼叫統一的建立租戶 API
      const response = await fetch('/api/tenants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceName: step1.name,
          workspaceCode: step1.code,
          workspaceType: 'travel_agency',
          maxEmployees: step1.maxEmployees ? parseInt(step1.maxEmployees, 10) : null,
          adminEmployeeNumber: step2.employeeNumber,
          adminName: step2.name,
          adminEmail: step2.email,
          adminPassword: step2.password,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        const errorMsg = result.message || result.error || LABELS.TOAST_CREATE_FAILED
        logger.error('Failed to create tenant:', errorMsg, 'Full result:', result)
        toast.error(errorMsg)
        setCreating(false)
        return
      }

      logger.log('Tenant created successfully:', result.data)
      toast.success(LABELS.TOAST_WORKSPACE_CREATED)
      toast.success(LABELS.TOAST_ADMIN_CREATED)

      // Move to step 3 - show login info（不再顯示 email）
      setLoginInfo({
        workspaceCode: result.data.login.workspaceCode,
        employeeNumber: result.data.login.employeeNumber,
        password: result.data.login.password,
      })
      setStep(3)
    } catch (error) {
      logger.error('Failed to create tenant:', error)
      toast.error(LABELS.TOAST_CREATE_FAILED)
    } finally {
      setCreating(false)
    }
  }

  const handleCopyLoginInfo = async () => {
    if (!loginInfo) return
    const text = [
      `${LABELS.LOGIN_INFO_CODE}：${loginInfo.workspaceCode}`,
      `${LABELS.LOGIN_INFO_EMPLOYEE_NUMBER}：${loginInfo.employeeNumber}`,
      `${LABELS.LOGIN_INFO_PASSWORD}：${loginInfo.password}`,
    ].join('\n')

    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success(LABELS.COPIED)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    onComplete()
    resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent level={1} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-morandi-primary">
            {step === 1 && LABELS.STEP1_TITLE}
            {step === 2 && LABELS.STEP2_TITLE}
            {step === 3 && LABELS.STEP3_TITLE}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? 'bg-morandi-gold' : 'bg-morandi-container'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Company info */}
        {step === 1 && (
          <>
            <p className="text-sm text-morandi-secondary mb-4">{LABELS.STEP1_DESC}</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-morandi-primary mb-2 block">
                  {LABELS.FIELD_NAME}{' '}
                  <span className="text-morandi-red">{LABELS.FIELD_NAME_REQUIRED}</span>
                </label>
                <Input
                  value={step1.name}
                  onChange={e => setStep1(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={LABELS.FIELD_NAME_PLACEHOLDER}
                  className="border-morandi-container/30"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-morandi-primary mb-2 block">
                  {LABELS.FIELD_CODE}{' '}
                  <span className="text-morandi-red">{LABELS.FIELD_CODE_REQUIRED}</span>
                </label>
                <Input
                  value={step1.code}
                  onChange={e => handleCodeChange(e.target.value)}
                  placeholder={LABELS.FIELD_CODE_PLACEHOLDER}
                  className={`border-morandi-container/30 font-mono ${codeError ? 'border-morandi-red' : ''}`}
                />
                {codeError ? (
                  <p className="text-xs text-morandi-red mt-1">{codeError}</p>
                ) : (
                  <p className="text-xs text-morandi-muted mt-1">{LABELS.FIELD_CODE_HINT}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-morandi-primary mb-2 block">
                  {LABELS.FIELD_MAX_EMPLOYEES}
                </label>
                <Input
                  type="number"
                  min="1"
                  value={step1.maxEmployees}
                  onChange={e => setStep1(prev => ({ ...prev, maxEmployees: e.target.value }))}
                  placeholder={LABELS.FIELD_MAX_EMPLOYEES_PLACEHOLDER}
                  className="border-morandi-container/30 max-w-[160px]"
                />
                <p className="text-xs text-morandi-muted mt-1">{LABELS.FIELD_MAX_EMPLOYEES_HINT}</p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={() => handleOpenChange(false)} className="flex-1">
                {LABELS.BTN_CANCEL}
              </Button>
              <Button variant="soft-gold"
                onClick={() => setStep(2)}
                disabled={!isStep1Valid}
 className="flex-1"
              >
                {LABELS.BTN_NEXT}
              </Button>
            </div>
          </>
        )}

        {/* Step 2: Admin account */}
        {step === 2 && (
          <>
            <p className="text-sm text-morandi-secondary mb-4">{LABELS.STEP2_DESC}</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-morandi-primary mb-2 block">
                  {LABELS.FIELD_EMPLOYEE_NUMBER}
                </label>
                <Input
                  value={step2.employeeNumber}
                  onChange={e => setStep2(prev => ({ ...prev, employeeNumber: e.target.value }))}
                  className="border-morandi-container/30 font-mono"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-morandi-primary mb-2 block">
                  {LABELS.FIELD_ADMIN_NAME}{' '}
                  <span className="text-morandi-red">{LABELS.FIELD_ADMIN_NAME_REQUIRED}</span>
                </label>
                <Input
                  value={step2.name}
                  onChange={e => setStep2(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={LABELS.FIELD_ADMIN_NAME_PLACEHOLDER}
                  className="border-morandi-container/30"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-morandi-primary mb-2 block">
                  {LABELS.FIELD_EMAIL}（選填）
                </label>
                <Input
                  type="email"
                  value={step2.email}
                  onChange={e => setStep2(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={LABELS.FIELD_EMAIL_PLACEHOLDER}
                  className="border-morandi-container/30"
                />
                <p className="text-xs text-morandi-muted mt-1">用於系統通知，非登入用</p>
              </div>

              <div>
                <label className="text-sm font-medium text-morandi-primary mb-2 block">
                  {LABELS.FIELD_PASSWORD}
                </label>
                <Input
                  value={step2.password}
                  onChange={e => setStep2(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={LABELS.FIELD_PASSWORD_PLACEHOLDER}
                  className="border-morandi-container/30 font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                {LABELS.BTN_PREV}
              </Button>
              <Button variant="soft-gold"
                onClick={handleCreate}
                disabled={!isStep2Valid || creating}
 className="flex-1"
              >
                {creating ? LABELS.BTN_CREATING : LABELS.BTN_CREATE}
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Login info */}
        {step === 3 && loginInfo && (
          <>
            <p className="text-sm text-morandi-secondary mb-4">{LABELS.STEP3_DESC}</p>

            <Card className="bg-morandi-container/10 border-morandi-container/30 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-morandi-secondary">{LABELS.LOGIN_INFO_CODE}</span>
                <span className="font-mono font-semibold text-morandi-primary">
                  {loginInfo.workspaceCode}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-morandi-secondary">
                  {LABELS.LOGIN_INFO_EMPLOYEE_NUMBER}
                </span>
                <span className="font-mono font-semibold text-morandi-primary">
                  {loginInfo.employeeNumber}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-morandi-secondary">{LABELS.LOGIN_INFO_PASSWORD}</span>
                <span className="font-mono font-semibold text-morandi-primary">
                  {loginInfo.password}
                </span>
              </div>
            </Card>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                {LABELS.BTN_CLOSE}
              </Button>
              <Button variant="soft-gold"
                onClick={handleCopyLoginInfo}
 className="flex-1 gap-2"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {LABELS.COPY_ALL}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
