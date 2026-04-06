'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useWorkspaceChannels } from '@/stores/workspace'
import { useAuthStore } from '@/stores'
import { useEmployeesSlim } from '@/data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Building2, Users, Shield, X, Copy, Check, Upload, Stamp } from 'lucide-react'
import { toast } from 'sonner'
import { alert } from '@/lib/ui/alert-dialog'
import { logger } from '@/lib/utils/logger'
import { supabase } from '@/lib/supabase/client'
import { LABELS } from '../constants/labels'

const WORKSPACE_TYPES = [
  { value: 'travel_agency', label: LABELS.WORKSPACE_TYPE_TRAVEL_AGENCY },
  { value: 'transportation', label: LABELS.WORKSPACE_TYPE_TRANSPORTATION },
  { value: 'dmc', label: LABELS.WORKSPACE_TYPE_DMC },
  { value: 'other', label: LABELS.WORKSPACE_TYPE_OTHER },
] as const

interface CreateAdminForm {
  employeeNumber: string
  name: string
  password: string
}

interface LoginInfo {
  workspaceCode: string
  employeeNumber: string
  password: string
}

/**
 * Workspace 管理頁面
 * 用於管理多分公司設定（台北、台中等）
 * 使用前端過濾實現資料隔離
 */
export default function WorkspacesPage() {
  const { workspaces, loadWorkspaces, createWorkspace, updateWorkspace, createChannel } =
    useWorkspaceChannels()
  const { items: employees } = useEmployeesSlim()
  const { user } = useAuthStore()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newWorkspace, setNewWorkspace] = useState({
    name: '',
    code: '',
    type: '',
    description: '',
  })
  const [codeError, setCodeError] = useState('')

  // Create Admin Dialog state
  const [showAdminDialog, setShowAdminDialog] = useState(false)
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState('')
  const [createdWorkspaceCode, setCreatedWorkspaceCode] = useState('')
  const [adminForm, setAdminForm] = useState<CreateAdminForm>({
    employeeNumber: 'E001',
    name: '',
    password: '12345678',
  })
  const [creatingAdmin, setCreatingAdmin] = useState(false)

  // Login Info Dialog state
  const [showLoginInfo, setShowLoginInfo] = useState(false)
  const [loginInfo, setLoginInfo] = useState<LoginInfo | null>(null)
  const [copied, setCopied] = useState(false)

  // 大小章上傳
  const [uploadingSeal, setUploadingSeal] = useState<string | null>(null)

  // 上傳大小章
  const handleSealUpload = async (workspaceId: string, file: File) => {
    if (!file) return

    setUploadingSeal(workspaceId)
    try {
      // 上傳到 Supabase Storage
      const fileName = `seals/${workspaceId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('workspace-assets')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      // 取得公開 URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('workspace-assets').getPublicUrl(fileName)

      // 更新 workspace
      await updateWorkspace(workspaceId, { seal_image_url: publicUrl })

      toast.success('大小章上傳成功')
      loadWorkspaces()
    } catch (error) {
      logger.error('上傳大小章失敗:', error)
      toast.error('上傳失敗，請稍後再試')
    } finally {
      setUploadingSeal(null)
    }
  }

  // 載入 workspaces 資料（employees 由 SWR 自動載入）
  useEffect(() => {
    loadWorkspaces()
  }, [])

  // 計算每個 workspace 的員工數
  const getEmployeeCount = useCallback(
    (workspaceId: string) => {
      return (employees || []).filter(emp => emp.workspace_id === workspaceId).length
    },
    [employees]
  )

  // 驗證公司代碼
  const validateCode = useCallback(
    (code: string) => {
      if (!code) {
        setCodeError('')
        return false
      }
      if (!/^[A-Z]+$/.test(code)) {
        setCodeError(LABELS.WORKSPACE_CODE_INVALID)
        return false
      }
      const isDuplicate = (workspaces || []).some(
        ws => ws.code?.toUpperCase() === code.toUpperCase()
      )
      if (isDuplicate) {
        setCodeError(LABELS.WORKSPACE_CODE_DUPLICATE)
        return false
      }
      setCodeError('')
      return true
    },
    [workspaces]
  )

  const handleCodeChange = (value: string) => {
    const upper = value.toUpperCase()
    setNewWorkspace(prev => ({ ...prev, code: upper }))
    validateCode(upper)
  }

  const handleCreate = async () => {
    if (!newWorkspace.name || !newWorkspace.code || !user) {
      if (!newWorkspace.name) toast.error(LABELS.WORKSPACE_NAME_REQUIRED_MSG)
      if (!newWorkspace.code) toast.error(LABELS.WORKSPACE_CODE_REQUIRED_MSG)
      return
    }

    if (!validateCode(newWorkspace.code)) return

    try {
      const createdWs = await createWorkspace({
        name: newWorkspace.name,
        code: newWorkspace.code,
        type: newWorkspace.type || null,
        description: newWorkspace.description,
        is_active: true,
      })

      if (createdWs) {
        logger.log(`Workspace created: ${createdWs.id}. Creating announcement channel...`)
        // Automatically create an announcement channel
        await createChannel({
          workspace_id: createdWs.id,
          name: LABELS.ANNOUNCEMENT,
          description: LABELS.ANNOUNCEMENT_CHANNEL_DESC,
          type: 'PUBLIC',
          is_announcement: true,
          created_by: user.id,
        })

        // 自動建立專屬機器人
        try {
          const botResponse = await fetch('/api/debug/setup-workspace-bots', {
            method: 'POST',
          })
          if (botResponse.ok) {
            logger.log(`Bot created for workspace: ${createdWs.id}`)
          }
        } catch (botError) {
          logger.warn(LABELS.BOT_CREATION_FAILED, botError)
        }

        toast.success(LABELS.WORKSPACE_CREATED_SUCCESS)

        // 關閉建立 dialog，打開建立管理員 dialog
        setCreatedWorkspaceId(createdWs.id)
        setCreatedWorkspaceCode(newWorkspace.code)
        setShowAddDialog(false)
        setNewWorkspace({ name: '', code: '', type: '', description: '' })
        setCodeError('')
        setAdminForm({ employeeNumber: 'E001', name: '', password: '12345678' })
        setShowAdminDialog(true)
      }
    } catch (error) {
      logger.error('Failed to create workspace or announcement channel:', error)
      toast.error(LABELS.CREATION_FAILED)
    }
  }

  const handleCreateAdmin = async () => {
    if (!adminForm.name) return

    setCreatingAdmin(true)
    try {
      // 1. Insert employee
      const { data: employee, error: empError } = await supabase
        .from('employees')
        .insert({
          workspace_id: createdWorkspaceId,
          employee_number: adminForm.employeeNumber,
          chinese_name: adminForm.name,
          display_name: adminForm.name,
          roles: ['admin'],
          is_active: true,
        })
        .select('id')
        .single()

      if (empError || !employee) {
        logger.error('Failed to create employee:', empError)
        toast.error(LABELS.ADMIN_CREATION_FAILED)
        setCreatingAdmin(false)
        return
      }

      // 2. Create auth user
      const authResponse = await fetch('/api/auth/create-employee-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_number: adminForm.employeeNumber,
          password: adminForm.password,
          workspace_code: createdWorkspaceCode,
        }),
      })

      const authResult = (await authResponse.json()) as {
        success: boolean
        data?: { user: { id: string } }
        message?: string
      }

      if (!authResult.success || !authResult.data?.user) {
        logger.error('Failed to create auth user:', authResult.message)
        toast.error(LABELS.ADMIN_CREATION_FAILED)
        setCreatingAdmin(false)
        return
      }

      const authUserId = authResult.data.user.id

      // 3. Update employee with supabase_user_id
      await supabase
        .from('employees')
        .update({ supabase_user_id: authUserId })
        .eq('id', employee.id)

      // 4. Insert profile
      await supabase.from('profiles').insert({
        id: authUserId,
        workspace_id: createdWorkspaceId,
        employee_id: employee.id,
        display_name: adminForm.name,
        is_employee: true,
      })

      toast.success(LABELS.ADMIN_CREATED_SUCCESS)

      // 關閉管理員 dialog，顯示登入資訊
      setShowAdminDialog(false)
      setLoginInfo({
        workspaceCode: createdWorkspaceCode,
        employeeNumber: adminForm.employeeNumber,
        password: adminForm.password,
      })
      setShowLoginInfo(true)
    } catch (error) {
      logger.error('Failed to create admin:', error)
      toast.error(LABELS.ADMIN_CREATION_FAILED)
    } finally {
      setCreatingAdmin(false)
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
    toast.success(LABELS.COPIED_SUCCESS)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateWorkspace(id, { is_active: !currentStatus })
    } catch (error) {
      logger.error('Failed to toggle workspace active status:', error)
      toast.error(LABELS.CREATION_FAILED)
    }
  }

  const isCreateDisabled = !newWorkspace.name || !newWorkspace.code || !!codeError

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-morandi-primary mb-2">
            {LABELS.WORKSPACE_MANAGEMENT}
          </h1>
          <p className="text-morandi-secondary">{LABELS.WORKSPACE_MANAGEMENT_DESC}</p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
        >
          <Plus size={16} className="mr-2" />
          {LABELS.ADD_WORKSPACE}
        </Button>
      </div>

      {/* 資料隔離說明卡片 */}
      <Card className="bg-morandi-container/10 border-morandi-container/30 p-6 mb-6">
        <div className="flex items-start gap-4">
          <Shield className="text-morandi-gold mt-1" size={24} />
          <div>
            <h3 className="font-semibold text-morandi-primary mb-2">
              {LABELS.DATA_ISOLATION_TITLE}
            </h3>
            <p className="text-sm text-morandi-secondary mb-3">{LABELS.DATA_ISOLATION_DESC}</p>
            <ul className="text-sm text-morandi-secondary space-y-1 ml-4">
              <li>{LABELS.DATA_ISOLATION_POINT1}</li>
              <li>{LABELS.DATA_ISOLATION_POINT2}</li>
              <li>{LABELS.DATA_ISOLATION_POINT3}</li>
              <li>{LABELS.DATA_ISOLATION_POINT4}</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* 工作空間列表 */}
      <div className="grid gap-4 md:grid-cols-2">
        {(workspaces || []).map(workspace => (
          <Card
            key={workspace.id}
            className="border-morandi-container/30 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    workspace.is_active ? 'bg-morandi-gold/20' : 'bg-morandi-container/20'
                  }`}
                >
                  <Building2
                    size={24}
                    className={workspace.is_active ? 'text-morandi-gold' : 'text-morandi-muted'}
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-morandi-primary">
                    {workspace.name}
                    {workspace.code && (
                      <span className="ml-2 text-sm font-mono text-morandi-secondary">
                        ({workspace.code})
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-morandi-secondary">
                    {workspace.description || LABELS.NO_DESCRIPTION}
                  </p>
                </div>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  workspace.is_active
                    ? 'bg-morandi-green/20 text-morandi-green'
                    : 'bg-morandi-muted/20 text-morandi-muted'
                }`}
              >
                {workspace.is_active ? LABELS.STATUS_ACTIVE : LABELS.STATUS_INACTIVE}
              </div>
            </div>

            {workspace.description && (
              <p className="text-sm text-morandi-secondary mb-4">{workspace.description}</p>
            )}

            <div className="flex items-center gap-2 text-sm text-morandi-secondary mb-4">
              <Users size={16} />
              <span>
                {LABELS.EMPLOYEE_COUNT.replace(
                  '{count}',
                  getEmployeeCount(workspace.id).toString()
                )}
              </span>
            </div>

            {/* 大小章顯示 */}
            <div className="flex items-center gap-2 text-sm text-morandi-secondary mb-4">
              <Stamp size={16} />
              <span>
                {workspace.seal_image_url ? (
                  <span className="text-morandi-green">大小章已上傳</span>
                ) : (
                  <span className="text-morandi-muted">尚未上傳大小章</span>
                )}
              </span>
              {workspace.seal_image_url && (
                <img
                  src={workspace.seal_image_url}
                  alt="大小章"
                  className="w-8 h-8 object-contain ml-2"
                />
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleActive(workspace.id, workspace.is_active ?? false)}
                className="flex-1"
              >
                {workspace.is_active ? LABELS.STATUS_INACTIVE : LABELS.STATUS_ACTIVE}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={uploadingSeal === workspace.id}
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*'
                  input.onchange = e => {
                    const file = (e.target as HTMLInputElement).files?.[0]
                    if (file) handleSealUpload(workspace.id, file)
                  }
                  input.click()
                }}
              >
                {uploadingSeal === workspace.id ? (
                  '上傳中...'
                ) : (
                  <>
                    <Upload size={14} className="mr-1" />
                    上傳大小章
                  </>
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* 新增 Workspace 對話框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent level={1} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-morandi-primary">
              {LABELS.ADD_WORKSPACE_TITLE}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-morandi-primary mb-2 block">
                {LABELS.WORKSPACE_NAME_LABEL}{' '}
                <span className="text-morandi-red">{LABELS.WORKSPACE_NAME_REQUIRED}</span>
              </label>
              <Input
                value={newWorkspace.name}
                onChange={e => setNewWorkspace(prev => ({ ...prev, name: e.target.value }))}
                placeholder={LABELS.WORKSPACE_NAME_PLACEHOLDER}
                className="border-morandi-container/30"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-morandi-primary mb-2 block">
                {LABELS.WORKSPACE_CODE_LABEL}{' '}
                <span className="text-morandi-red">{LABELS.WORKSPACE_CODE_REQUIRED}</span>
              </label>
              <Input
                value={newWorkspace.code}
                onChange={e => handleCodeChange(e.target.value)}
                placeholder={LABELS.WORKSPACE_CODE_PLACEHOLDER}
                className={`border-morandi-container/30 font-mono ${codeError ? 'border-morandi-red' : ''}`}
              />
              {codeError && <p className="text-xs text-morandi-red mt-1">{codeError}</p>}
            </div>

            <div>
              <label className="text-sm font-medium text-morandi-primary mb-2 block">
                {LABELS.WORKSPACE_TYPE_LABEL}
              </label>
              <Select
                value={newWorkspace.type}
                onValueChange={value => setNewWorkspace(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="border-morandi-container/30">
                  <SelectValue placeholder={LABELS.WORKSPACE_TYPE_PLACEHOLDER} />
                </SelectTrigger>
                <SelectContent>
                  {WORKSPACE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-morandi-primary mb-2 block">
                {LABELS.WORKSPACE_DESCRIPTION_LABEL}
              </label>
              <Input
                value={newWorkspace.description}
                onChange={e => setNewWorkspace(prev => ({ ...prev, description: e.target.value }))}
                placeholder={LABELS.WORKSPACE_DESCRIPTION_PLACEHOLDER}
                className="border-morandi-container/30"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              className="flex-1 gap-2"
            >
              <X size={16} />
              {LABELS.CANCEL}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isCreateDisabled}
              className="flex-1 bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-2"
            >
              <Plus size={16} />
              {LABELS.CREATE}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 建立第一位管理員對話框 */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent level={1} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-morandi-primary">
              {LABELS.CREATE_ADMIN_TITLE}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-morandi-secondary">{LABELS.CREATE_ADMIN_DESC}</p>

          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-morandi-primary mb-2 block">
                {LABELS.ADMIN_EMPLOYEE_NUMBER_LABEL}
              </label>
              <Input
                value={adminForm.employeeNumber}
                onChange={e => setAdminForm(prev => ({ ...prev, employeeNumber: e.target.value }))}
                className="border-morandi-container/30 font-mono"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-morandi-primary mb-2 block">
                {LABELS.ADMIN_NAME_LABEL}{' '}
                <span className="text-morandi-red">{LABELS.ADMIN_NAME_REQUIRED}</span>
              </label>
              <Input
                value={adminForm.name}
                onChange={e => setAdminForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder={LABELS.ADMIN_NAME_PLACEHOLDER}
                className="border-morandi-container/30"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-morandi-primary mb-2 block">
                {LABELS.ADMIN_PASSWORD_LABEL}
              </label>
              <Input
                value={adminForm.password}
                onChange={e => setAdminForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder={LABELS.ADMIN_PASSWORD_PLACEHOLDER}
                className="border-morandi-container/30 font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowAdminDialog(false)}
              className="flex-1 gap-2"
            >
              <X size={16} />
              {LABELS.CANCEL}
            </Button>
            <Button
              onClick={handleCreateAdmin}
              disabled={!adminForm.name || creatingAdmin}
              className="flex-1 bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-2"
            >
              {creatingAdmin ? LABELS.CREATING_ADMIN : LABELS.CREATE_ADMIN_BTN}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 登入資訊對話框 */}
      <Dialog open={showLoginInfo} onOpenChange={setShowLoginInfo}>
        <DialogContent level={1} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-morandi-primary">
              {LABELS.LOGIN_INFO_TITLE}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-morandi-secondary mb-4">{LABELS.LOGIN_INFO_DESC}</p>

          {loginInfo && (
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
          )}

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowLoginInfo(false)
                setLoginInfo(null)
                setCopied(false)
              }}
              className="flex-1 gap-2"
            >
              {LABELS.CLOSE}
            </Button>
            <Button
              onClick={handleCopyLoginInfo}
              className="flex-1 bg-morandi-gold hover:bg-morandi-gold-hover text-white gap-2"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {LABELS.COPY_LOGIN_INFO}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Empty State */}
      {workspaces?.length === 0 && !showAddDialog && (
        <Card className="border-dashed border-2 border-morandi-container/30 p-12 text-center">
          <Building2 size={48} className="text-morandi-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-morandi-primary mb-2">
            {LABELS.NO_WORKSPACE_TITLE}
          </h3>
          <p className="text-morandi-secondary mb-4">{LABELS.NO_WORKSPACE_DESC}</p>
          <Button
            onClick={() => setShowAddDialog(true)}
            className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
          >
            <Plus size={16} className="mr-2" />
            {LABELS.ADD_WORKSPACE}
          </Button>
        </Card>
      )}
    </div>
  )
}
