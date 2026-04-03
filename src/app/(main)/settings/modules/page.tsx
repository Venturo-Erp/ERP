'use client'

import React, { useEffect, useState } from 'react'
import { useWorkspaceModules, createWorkspaceModule, updateWorkspaceModule } from '@/data'
import { useWorkspaceChannels } from '@/stores/workspace'
import { useAuthStore } from '@/stores/auth-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Package,
  FileText,
  BarChart3,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertCircle,
  X,
} from 'lucide-react'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { DateCell } from '@/components/table-cells'
import { confirm } from '@/lib/ui/alert-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Workspace } from '@/types/models.types'
import { MODULES_PAGE_LABELS } from '../constants/labels'

const MODULE_INFO = {
  accounting: {
    name: MODULES_PAGE_LABELS.ACCOUNTING_NAME,
    description: MODULES_PAGE_LABELS.ACCOUNTING_DESC,
    icon: FileText,
    color: 'text-status-info',
    bgColor: 'bg-status-info-bg',
    borderColor: 'border-status-info/30',
    features: [...MODULES_PAGE_LABELS.ACCOUNTING_FEATURES],
  },
  inventory: {
    name: MODULES_PAGE_LABELS.INVENTORY_NAME,
    description: MODULES_PAGE_LABELS.INVENTORY_DESC,
    icon: Package,
    color: 'text-morandi-green',
    bgColor: 'bg-status-success-bg',
    borderColor: 'border-status-success/30',
    features: [...MODULES_PAGE_LABELS.INVENTORY_FEATURES],
  },
  bi_analytics: {
    name: MODULES_PAGE_LABELS.BI_NAME,
    description: MODULES_PAGE_LABELS.BI_DESC,
    icon: BarChart3,
    color: 'text-morandi-secondary',
    bgColor: 'bg-morandi-container',
    borderColor: 'border-morandi-secondary/30',
    features: [...MODULES_PAGE_LABELS.BI_FEATURES],
  },
} as const

type ModuleName = keyof typeof MODULE_INFO

export default function ModulesManagementPage() {
  const user = useAuthStore(state => state.user)
  const { items: modules } = useWorkspaceModules()
  const { workspaces, loadWorkspaces } = useWorkspaceChannels()

  const [selectedModule, setSelectedModule] = useState<ModuleName | null>(null)
  const [showEnableDialog, setShowEnableDialog] = useState(false)
  const [expiresDate, setExpiresDate] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadWorkspaces()
  }, [])

  const currentWorkspace = workspaces.find(w => w.id === user?.workspace_id)

  const getModuleStatus = (moduleName: ModuleName) => {
    const module = modules.find(
      m => m.workspace_id === user?.workspace_id && m.module_name === moduleName
    )

    if (!module || !module.is_enabled) {
      return { enabled: false, expired: false, expiresAt: null }
    }

    const isExpired = module.expires_at ? new Date(module.expires_at) < new Date() : false

    return {
      enabled: true,
      expired: isExpired,
      expiresAt: module.expires_at,
    }
  }

  const handleEnableModule = (moduleName: ModuleName) => {
    setSelectedModule(moduleName)
    setExpiresDate('')
    setShowEnableDialog(true)
  }

  const handleConfirmEnable = async () => {
    if (!selectedModule || !user?.workspace_id) return

    setLoading(true)
    try {
      const existingModule = modules.find(
        m => m.workspace_id === user.workspace_id && m.module_name === selectedModule
      )

      if (existingModule) {
        // 更新現有模組
        await updateWorkspaceModule(existingModule.id, {
          is_enabled: true,
          enabled_at: new Date().toISOString(),
          expires_at: expiresDate || null,
        })
      } else {
        // 建立新模組
        await createWorkspaceModule({
          workspace_id: user.workspace_id,
          module_name: selectedModule,
          is_enabled: true,
          enabled_at: new Date().toISOString(),
          expires_at: expiresDate || null,
        })
      }

      toast.success(MODULES_PAGE_LABELS.MODULE_ENABLED(MODULE_INFO[selectedModule].name))
      setShowEnableDialog(false)
      setSelectedModule(null)
    } catch (error) {
      toast.error(MODULES_PAGE_LABELS.ENABLE_FAILED)
    } finally {
      setLoading(false)
    }
  }

  const handleDisableModule = async (moduleName: ModuleName) => {
    if (!user?.workspace_id) return

    const module = modules.find(
      m => m.workspace_id === user.workspace_id && m.module_name === moduleName
    )

    if (!module) return

    const confirmed = await confirm(
      MODULES_PAGE_LABELS.DISABLE_CONFIRM(MODULE_INFO[moduleName].name),
      { title: MODULES_PAGE_LABELS.DISABLE_MODULE, type: 'warning' }
    )
    if (!confirmed) {
      return
    }

    setLoading(true)
    try {
      await updateWorkspaceModule(module.id, {
        is_enabled: false,
      })

      toast.success(MODULES_PAGE_LABELS.MODULE_DISABLED(MODULE_INFO[moduleName].name))
    } catch (error) {
      toast.error(MODULES_PAGE_LABELS.DISABLE_FAILED)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <ContentPageLayout title={MODULES_PAGE_LABELS.MANAGE_8474} className="">
        <div className="p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* 工作空間資訊 */}
            <Card className="bg-gradient-to-br from-[#F9F8F6] to-[#F9F8F6] border-morandi-container">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {MODULES_PAGE_LABELS.LABEL_795}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-[var(--morandi-primary)]">
                  {currentWorkspace?.name || MODULES_PAGE_LABELS.UNKNOWN_WORKSPACE}
                </div>
                <div className="text-sm text-morandi-secondary mt-1">
                  {MODULES_PAGE_LABELS.WORKSPACE_ID_LABEL(user?.workspace_id || '')}
                </div>
              </CardContent>
            </Card>

            {/* 模組列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(Object.keys(MODULE_INFO) as ModuleName[]).map(moduleName => {
                const info = MODULE_INFO[moduleName]
                const status = getModuleStatus(moduleName)
                const Icon = info.icon

                return (
                  <Card
                    key={moduleName}
                    className={cn(
                      'overflow-hidden transition-all hover:shadow-lg',
                      status.enabled &&
                        !status.expired &&
                        'ring-2 ring-status-success ring-offset-2'
                    )}
                  >
                    <CardHeader className={cn('pb-4', info.bgColor, info.borderColor, 'border-b')}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-12 h-12 rounded-lg flex items-center justify-center bg-card',
                              info.borderColor,
                              'border-2'
                            )}
                          >
                            <Icon className={cn('h-6 w-6', info.color)} />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{info.name}</CardTitle>
                            <CardDescription className="mt-1">{info.description}</CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-4 space-y-4">
                      {/* 狀態 */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-morandi-secondary">
                          {MODULES_PAGE_LABELS.STATUS}
                        </span>
                        {status.enabled && !status.expired ? (
                          <Badge className="bg-status-success-bg text-status-success border-status-success/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {MODULES_PAGE_LABELS.LABEL_2710}
                          </Badge>
                        ) : status.enabled && status.expired ? (
                          <Badge className="bg-status-danger-bg text-status-danger border-status-danger/30">
                            <XCircle className="h-3 w-3 mr-1" />
                            {MODULES_PAGE_LABELS.LABEL_8966}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-morandi-secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            {MODULES_PAGE_LABELS.LABEL_5400}
                          </Badge>
                        )}
                      </div>

                      {/* 到期日 */}
                      {status.enabled && status.expiresAt && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-morandi-secondary">{MODULES_PAGE_LABELS.EXPIRY_DATE}</span>
                          <DateCell
                            date={status.expiresAt}
                            showIcon={true}
                            className={cn(
                              'font-medium',
                              status.expired
                                ? 'text-status-danger'
                                : 'text-[var(--morandi-primary)]'
                            )}
                          />
                        </div>
                      )}

                      {/* 功能列表 */}
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-morandi-secondary">
                          {MODULES_PAGE_LABELS.FEATURES}
                        </div>
                        <ul className="space-y-1.5">
                          {info.features.map((feature, index) => (
                            <li
                              key={index}
                              className="flex items-start gap-2 text-sm text-morandi-secondary"
                            >
                              <CheckCircle2 className="h-4 w-4 text-status-success mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* 操作按鈕 */}
                      <div className="pt-2">
                        {status.enabled && !status.expired ? (
                          <Button
                            onClick={() => handleDisableModule(moduleName)}
                            variant="outline"
                            className="w-full border-status-danger/30 text-status-danger hover:bg-status-danger-bg"
                            disabled={loading}
                          >
                            {MODULES_PAGE_LABELS.LABEL_5213}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleEnableModule(moduleName)}
                            className="w-full bg-morandi-container hover:bg-morandi-container text-white"
                            disabled={loading}
                          >
                            {status.enabled && status.expired
                              ? MODULES_PAGE_LABELS.RE_ENABLE
                              : MODULES_PAGE_LABELS.ENABLE_MODULE}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* 說明 */}
            <Card className="bg-status-info-bg border-status-info/30">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-status-info mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-morandi-primary mb-1">
                      {MODULES_PAGE_LABELS.MODULE_DESC_TITLE}
                    </div>
                    <ul className="text-sm text-morandi-secondary space-y-1 list-disc list-inside">
                      <li>{MODULES_PAGE_LABELS.DESC_1}</li>
                      <li>{MODULES_PAGE_LABELS.DESC_2}</li>
                      <li>{MODULES_PAGE_LABELS.DESC_3}</li>
                      <li>{MODULES_PAGE_LABELS.DESC_4}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </ContentPageLayout>

      {/* 啟用模組對話框 */}
      <Dialog open={showEnableDialog} onOpenChange={setShowEnableDialog}>
        <DialogContent level={1}>
          <DialogHeader>
            <DialogTitle>
              {selectedModule &&
                MODULES_PAGE_LABELS.ENABLE_DIALOG_TITLE(MODULE_INFO[selectedModule].name)}
            </DialogTitle>
            <DialogDescription>
              {selectedModule && MODULE_INFO[selectedModule].description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="expires">{MODULES_PAGE_LABELS.EXPIRY_LABEL}</Label>
              <DatePicker
                value={expiresDate}
                onChange={date => setExpiresDate(date)}
                placeholder={MODULES_PAGE_LABELS.SELECT_5234}
                minDate={new Date()}
              />
              <p className="text-sm text-morandi-secondary">{MODULES_PAGE_LABELS.EXPIRY_HINT}</p>
            </div>

            {selectedModule && (
              <div className="bg-background border border-morandi-container rounded-lg p-4">
                <div className="text-sm font-medium text-morandi-secondary mb-2">
                  {MODULES_PAGE_LABELS.INCLUDED_FEATURES}
                </div>
                <ul className="space-y-1.5">
                  {MODULE_INFO[selectedModule].features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-morandi-secondary">
                      <CheckCircle2 className="h-4 w-4 text-status-success mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEnableDialog(false)}
              disabled={loading}
              className="gap-2"
            >
              <X size={16} />
              {MODULES_PAGE_LABELS.CANCEL}
            </Button>
            <Button
              onClick={handleConfirmEnable}
              className="bg-morandi-container hover:bg-morandi-container text-white"
              disabled={loading}
            >
              {loading ? MODULES_PAGE_LABELS.PROCESSING : MODULES_PAGE_LABELS.CONFIRM_ENABLE}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
