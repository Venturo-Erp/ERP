'use client'

/**
 * 租戶詳情頁面
 * 兩張卡片：基本功能（永遠可用）、付費功能（需開通）
 */

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ContentPageLayout } from '@/components/layout/content-page-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'
import { Building2, Save, Loader2, Sparkles, Users, Settings2 } from 'lucide-react'
import { ModuleLoading } from '@/components/module-loading'
import { invalidateFeatureCache } from '@/lib/permissions/hooks'
import {
  FEATURES,
  MODULES,
  getBasicFeatures,
  getPremiumFeatures,
  getEnterpriseFeatures,
} from '@/lib/permissions'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface Workspace {
  id: string
  name: string
  code: string
  type: string
  is_active: boolean
  premium_enabled?: boolean
  premium_expires_at?: string
  default_password?: string | null
  admin_id?: string | null
  admin_employee_number?: string | null
}

interface WorkspaceFeature {
  feature_code: string
  enabled: boolean
}

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()

  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [features, setFeatures] = useState<WorkspaceFeature[]>([])
  const [premiumEnabled, setPremiumEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [employeeCount, setEmployeeCount] = useState(0)
  const [adminName, setAdminName] = useState<string | null>(null)
  const [tabModalModuleCode, setTabModalModuleCode] = useState<string | null>(null)

  // 載入資料
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // 取得租戶資料（API 會回傳員工人數與管理員資訊，透過 service_client 繞過 RLS）
      const wsRes = await fetch(`/api/workspaces/${id}`)
      if (!wsRes.ok) {
        toast({ title: '找不到租戶', variant: 'destructive' })
        router.push('/tenants')
        return
      }
      const ws = await wsRes.json()
      setWorkspace(ws)
      setPremiumEnabled(ws.premium_enabled ?? false)
      setEmployeeCount(ws.employee_count ?? 0)
      setAdminName(ws.admin_name ?? null)

      // 取得功能權限
      const featuresRes = await fetch(`/api/permissions/features?workspace_id=${id}`)
      const featuresData: WorkspaceFeature[] = featuresRes.ok ? await featuresRes.json() : []

      // 初始化功能列表（module 級 + tab 級、tab 級 code 格式為 `{module}.{tab}`）
      const featureMap = new Map<string, boolean>(
        featuresData.map(f => [f.feature_code, f.enabled])
      )
      const moduleFeatures: WorkspaceFeature[] = FEATURES.map(f => ({
        feature_code: f.code,
        enabled: featureMap.get(f.code) ?? false,
      }))
      // 保留所有 tab 級的 row（不覆蓋、不丟失）
      const tabFeatures: WorkspaceFeature[] = featuresData.filter(f =>
        f.feature_code.includes('.')
      )
      setFeatures([...moduleFeatures, ...tabFeatures])

      setLoading(false)
    }

    fetchData()
  }, [id, router, toast])

  // 切換功能
  const toggleFeature = (featureCode: string) => {
    setFeatures(prev =>
      prev.map(f => (f.feature_code === featureCode ? { ...f, enabled: !f.enabled } : f))
    )
  }

  // 切換 tab 級功能（`{module}.{tab}` 格式）
  const toggleTabFeature = (moduleCode: string, tabCode: string, nextEnabled: boolean) => {
    const key = `${moduleCode}.${tabCode}`
    setFeatures(prev => {
      const existing = prev.find(f => f.feature_code === key)
      if (existing) {
        return prev.map(f => (f.feature_code === key ? { ...f, enabled: nextEnabled } : f))
      }
      return [...prev, { feature_code: key, enabled: nextEnabled }]
    })
  }

  // 查詢 tab 啟用狀態（給 Modal 用）
  const isTabFeatureEnabled = (
    moduleCode: string,
    tabCode: string,
    category?: 'basic' | 'premium'
  ): boolean => {
    const key = `${moduleCode}.${tabCode}`
    const feature = features.find(f => f.feature_code === key)
    if (category === 'premium') return feature?.enabled === true
    return feature?.enabled !== false
  }

  // 儲存
  const handleSave = async () => {
    setSaving(true)

    try {
      const res = await fetch('/api/permissions/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: id,
          features,
          premium_enabled: premiumEnabled,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        toast({
          title: '儲存失敗',
          description: body.error || `HTTP ${res.status}`,
          variant: 'destructive',
        })
        return
      }

      // 清 feature cache、讓其他頁面立即看到最新狀態（合約 tab 等）
      invalidateFeatureCache()
      toast({ title: '已儲存' })
    } catch (err) {
      toast({
        title: '儲存失敗',
        description: err instanceof Error ? err.message : '未知錯誤',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // 付費加購清單 = 付費模組 + 免費模組裡的付費 tab、統一平列
  // 'tenants' 為 Venturo 超管內部功能、不在租戶功能清單露出
  const INTERNAL_FEATURES = new Set(['tenants'])

  // 1. 付費的整個模組（會計、頻道等）
  const premiumModules = [...getPremiumFeatures(), ...getEnterpriseFeatures()]
    .filter(f => !INTERNAL_FEATURES.has(f.code))
    .map(f => ({
      code: f.code,
      name: f.name,
      subtitle: f.description,
      kind: 'module' as const,
    }))

  // 2. 免費模組裡的付費 tab（合約、展示行程、未來加進來的）
  const premiumTabAddons = MODULES.flatMap(m =>
    m.tabs
      .filter(t => t.category === 'premium' && !t.isEligibility)
      .map(t => ({
        code: `${m.code}.${t.code}`,
        name: t.name,
        subtitle: `屬於 ${m.name}`,
        kind: 'tab' as const,
      }))
  )

  // 統一排序：先模組、後 tab；未來要按 usage_count 排可以再擴充
  const allAddons = [...premiumModules, ...premiumTabAddons]

  // 檢查模組是否有可控制的「基本」分頁（付費 tab 不在這個 Modal 出現）
  const hasManageableTabs = (moduleCode: string): boolean => {
    const mod = MODULES.find(m => m.code === moduleCode)
    return !!mod && mod.tabs.some(t => !t.isEligibility && t.category !== 'premium')
  }

  // 當前 Modal 對應的 module
  const activeTabModule = tabModalModuleCode
    ? MODULES.find(m => m.code === tabModalModuleCode)
    : null

  if (loading) {
    return (
      <ContentPageLayout title="載入中..." icon={Building2}>
        <ModuleLoading />
      </ContentPageLayout>
    )
  }

  return (
    <ContentPageLayout
      title={workspace?.name || '租戶詳情'}
      icon={Building2}
      breadcrumb={[
        { label: '租戶管理', href: '/tenants' },
        { label: workspace?.name || '詳情', href: `/tenants/${id}` },
      ]}
      headerActions={
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-morandi-gold hover:bg-morandi-gold-hover text-white"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          儲存
        </Button>
      }
    >
      <div className="space-y-6">
        {/* 租戶資訊卡片 */}
        <div
          className="rounded-[24px] p-6"
          style={{
            background: 'linear-gradient(0deg, rgb(255, 255, 255) 0%, rgb(250, 247, 243) 100%)',
            border: '3px solid white',
            boxShadow: 'rgba(180, 160, 120, 0.15) 0px 12px 24px -8px',
          }}
        >
          <div className="grid grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-morandi-secondary mb-1">公司名稱</div>
              <div className="font-semibold text-morandi-primary">{workspace?.name}</div>
            </div>
            <div>
              <div className="text-sm text-morandi-secondary mb-1">公司代碼</div>
              <div className="font-semibold text-morandi-primary">{workspace?.code}</div>
            </div>
            <div>
              <div className="text-sm text-morandi-secondary mb-1">類型</div>
              <Badge variant="outline" className="font-medium">
                {workspace?.type}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-morandi-secondary mb-1">狀態</div>
              <Badge
                className={
                  workspace?.is_active
                    ? 'bg-morandi-green/20 text-morandi-green'
                    : 'bg-morandi-secondary/20 text-morandi-secondary'
                }
              >
                {workspace?.is_active ? '啟用中' : '已停用'}
              </Badge>
            </div>
          </div>
        </div>

        {/* 管理員卡片 */}
        <div
          className="rounded-[24px] p-6"
          style={{
            background: 'linear-gradient(0deg, rgb(255, 255, 255) 0%, rgb(250, 247, 243) 100%)',
            border: '3px solid white',
            boxShadow: 'rgba(180, 160, 120, 0.15) 0px 12px 24px -8px',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-morandi-gold" />
              <h3 className="font-semibold text-morandi-primary">管理員資訊</h3>
            </div>
            <span className="text-sm text-morandi-secondary">{employeeCount} 位員工</span>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-morandi-secondary mb-1">管理員</div>
              <div className="font-semibold text-morandi-primary">{adminName || '未指定'}</div>
            </div>
            <div>
              <div className="text-sm text-morandi-secondary mb-1">帳號</div>
              <div className="font-semibold text-morandi-primary">{workspace?.code}-E001</div>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                className="border-morandi-gold text-morandi-gold hover:bg-morandi-gold/10"
                onClick={async () => {
                  if (!workspace?.admin_id) {
                    toast({ title: '找不到此租戶的管理員', variant: 'destructive' })
                    return
                  }
                  // 預設密碼至少 8 字元（API 驗證最低長度）
                  // 若 workspace 已設 default_password 且 >= 8 字元、用它；否則用 `{code}0000`
                  const defaultPw =
                    workspace?.default_password && workspace.default_password.length >= 8
                      ? workspace.default_password
                      : `${workspace?.code || 'TENANT'}0000`
                  try {
                    const res = await fetch('/api/auth/reset-employee-password', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        employee_id: workspace.admin_id,
                        new_password: defaultPw,
                      }),
                    })
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}))
                      toast({
                        title: err?.error || err?.message || '重設失敗',
                        variant: 'destructive',
                      })
                      return
                    }
                    toast({ title: `已重設密碼為 ${defaultPw}` })
                  } catch (err) {
                    toast({ title: '重設失敗、請稍後再試', variant: 'destructive' })
                  }
                }}
              >
                重設密碼
              </Button>
            </div>
          </div>
        </div>

        {/* 基本功能卡片 */}
        <div
          className="rounded-[24px] overflow-hidden"
          style={{
            background: 'linear-gradient(0deg, rgb(255, 255, 255) 0%, rgb(250, 247, 243) 100%)',
            border: '3px solid white',
            boxShadow: 'rgba(180, 160, 120, 0.15) 0px 12px 24px -8px',
          }}
        >
          <div className="px-6 py-4 border-b border-morandi-gold/20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-morandi-green"></div>
              <h3 className="font-semibold text-morandi-primary">核心方案</h3>
              <span className="text-sm text-morandi-secondary">月費包含</span>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {getBasicFeatures().map(feature => {
                const current = features.find(f => f.feature_code === feature.code)
                const isEnabled = current?.enabled ?? false
                const showTabs = hasManageableTabs(feature.code)

                return (
                  <div
                    key={feature.code}
                    className="flex items-center justify-between px-4 py-3 rounded-[16px] transition-all hover:shadow-sm"
                    style={{
                      background:
                        'linear-gradient(0deg, rgb(250, 247, 240) 0%, rgb(245, 240, 232) 100%)',
                      boxShadow: 'rgba(180, 160, 120, 0.3) 0px 8px 20px -4px',
                    }}
                  >
                    <span className="text-sm font-medium text-morandi-primary">{feature.name}</span>
                    <div className="flex items-center gap-2">
                      {showTabs && (
                        <button
                          type="button"
                          onClick={() => setTabModalModuleCode(feature.code)}
                          title="管理分頁"
                          className="p-1 rounded hover:bg-morandi-gold/10 text-morandi-secondary hover:text-morandi-gold"
                        >
                          <Settings2 className="h-4 w-4" />
                        </button>
                      )}
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() => toggleFeature(feature.code)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 付費加購卡片 */}
        <div
          className="rounded-[24px] overflow-hidden"
          style={{
            background: 'linear-gradient(0deg, rgb(255, 255, 255) 0%, rgb(250, 247, 243) 100%)',
            border: '3px solid white',
            boxShadow: 'rgba(180, 160, 120, 0.15) 0px 12px 24px -8px',
          }}
        >
          <div className="px-6 py-4 border-b border-morandi-gold/20">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-morandi-gold" />
              <h3 className="font-semibold text-morandi-primary">付費加購</h3>
              <span className="text-sm text-morandi-secondary">按需求開通</span>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {allAddons.map(addon => {
                const current = features.find(f => f.feature_code === addon.code)
                const isEnabled = current?.enabled ?? false

                return (
                  <div
                    key={addon.code}
                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-[16px] transition-all hover:shadow-sm"
                    style={{
                      background:
                        'linear-gradient(0deg, rgb(250, 247, 240) 0%, rgb(245, 240, 232) 100%)',
                      boxShadow: 'rgba(180, 160, 120, 0.3) 0px 8px 20px -4px',
                    }}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-medium text-morandi-primary truncate">
                        {addon.name}
                      </span>
                      {addon.subtitle && (
                        <span className="text-xs text-morandi-secondary truncate">
                          {addon.subtitle}
                        </span>
                      )}
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={next => {
                        if (addon.kind === 'module') {
                          toggleFeature(addon.code)
                        } else {
                          // tab 級：addon.code 已是 `{module}.{tab}` 格式
                          const [moduleCode, ...tabParts] = addon.code.split('.')
                          toggleTabFeature(moduleCode, tabParts.join('.'), next)
                        }
                      }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 管理分頁 Modal */}
      <Dialog
        open={!!tabModalModuleCode}
        onOpenChange={open => !open && setTabModalModuleCode(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{activeTabModule?.name} — 管理分頁</DialogTitle>
            <DialogDescription>
              勾選這家租戶能使用的基本分頁、付費加購項目請到「付費加購」區塊開通
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto py-2">
            {activeTabModule?.tabs
              .filter(tab => !tab.isEligibility && tab.category !== 'premium')
              .map(tab => {
                const checked = isTabFeatureEnabled(activeTabModule.code, tab.code, tab.category)
                return (
                  <div
                    key={tab.code}
                    className="flex items-center justify-between px-4 py-3 rounded-[16px] transition-all hover:shadow-sm"
                    style={{
                      background:
                        'linear-gradient(0deg, rgb(250, 247, 240) 0%, rgb(245, 240, 232) 100%)',
                      boxShadow: 'rgba(180, 160, 120, 0.3) 0px 8px 20px -4px',
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-morandi-primary truncate">
                        {tab.name}
                      </span>
                    </div>
                    <Switch
                      checked={checked}
                      onCheckedChange={next =>
                        toggleTabFeature(activeTabModule.code, tab.code, next)
                      }
                    />
                  </div>
                )
              })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTabModalModuleCode(null)}
              className="border-morandi-gold text-morandi-gold hover:bg-morandi-gold/10"
            >
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ContentPageLayout>
  )
}
