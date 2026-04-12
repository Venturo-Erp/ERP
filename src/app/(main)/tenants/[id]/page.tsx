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
import {
  Building2,
  Save,
  Loader2,
  Lock,
  Unlock,
  Sparkles,
  Bot,
  MessageCircle,
  ExternalLink,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import {
  FEATURES,
  getBasicFeatures,
  getPremiumFeatures,
  getEnterpriseFeatures,
} from '@/lib/permissions'

interface Workspace {
  id: string
  name: string
  code: string
  type: string
  is_active: boolean
  premium_enabled?: boolean
  premium_expires_at?: string
  default_password?: string | null
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
  const [lineConfig, setLineConfig] = useState<{
    is_connected: boolean
    bot_display_name?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [employeeCount, setEmployeeCount] = useState(0)
  const [adminName, setAdminName] = useState<string | null>(null)

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

      // 初始化功能列表
      const featureMap = new Map<string, boolean>(
        featuresData.map(f => [f.feature_code, f.enabled])
      )
      const allFeatures: WorkspaceFeature[] = FEATURES.map(f => ({
        feature_code: f.code,
        enabled: featureMap.get(f.code) ?? false,
      }))
      setFeatures(allFeatures)

      // 取得 LINE 連線狀態
      try {
        const lineRes = await fetch('/api/line/setup')
        if (lineRes.ok) {
          const lineData = await lineRes.json()
          setLineConfig(lineData)
        }
      } catch {
        // 忽略
      }

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

  // 儲存
  const handleSave = async () => {
    setSaving(true)

    try {
      // 儲存功能權限
      const res = await fetch('/api/permissions/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: id,
          features,
          premium_enabled: premiumEnabled,
        }),
      })

      if (res.ok) {
        toast({ title: '已儲存' })
      } else {
        throw new Error('儲存失敗')
      }
    } catch {
      toast({ title: '儲存失敗', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // 合併付費和企業功能
  const premiumAndEnterpriseFeatures = [...getPremiumFeatures(), ...getEnterpriseFeatures()]

  if (loading) {
    return (
      <ContentPageLayout title="載入中..." icon={Building2}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-morandi-gold" />
        </div>
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
                  const defaultPw = workspace?.default_password || '0000'
                  toast({ title: `已重設密碼為 ${defaultPw}` })
                }}
              >
                重設密碼
              </Button>
            </div>
          </div>
        </div>

        {/* 渠道連線狀態 */}
        <div
          className="rounded-[24px] overflow-hidden"
          style={{
            background: 'linear-gradient(0deg, rgb(255, 255, 255) 0%, rgb(250, 247, 243) 100%)',
            border: '3px solid white',
            boxShadow: 'rgba(180, 160, 120, 0.15) 0px 12px 24px -8px',
          }}
        >
          <div className="px-6 py-4 border-b border-morandi-gold/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-morandi-gold" />
                <h3 className="font-semibold text-morandi-primary">渠道連線</h3>
              </div>
              <Link
                href="/ai-bot"
                className="text-sm text-morandi-gold hover:underline flex items-center gap-1"
              >
                管理 <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <MessageCircle className="h-5 w-5 text-[#06C755]" />
                <div className="flex-1">
                  <div className="text-sm font-medium">LINE</div>
                  <div className="text-xs text-morandi-muted">
                    {lineConfig?.bot_display_name || '未設定'}
                  </div>
                </div>
                <Badge
                  className={
                    lineConfig?.is_connected
                      ? 'bg-morandi-green/20 text-morandi-green'
                      : 'bg-morandi-secondary/20 text-morandi-secondary'
                  }
                >
                  {lineConfig?.is_connected ? '已連接' : '未連接'}
                </Badge>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border opacity-50">
                <svg className="h-5 w-5 text-morandi-muted" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
                <div className="flex-1">
                  <div className="text-sm font-medium text-morandi-muted">Instagram</div>
                  <div className="text-xs text-morandi-muted">即將推出</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border opacity-50">
                <svg className="h-5 w-5 text-morandi-muted" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <div className="flex-1">
                  <div className="text-sm font-medium text-morandi-muted">Facebook</div>
                  <div className="text-xs text-morandi-muted">即將推出</div>
                </div>
              </div>
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
              <h3 className="font-semibold text-morandi-primary">基本功能</h3>
              <span className="text-sm text-morandi-secondary">（免費）</span>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {getBasicFeatures().map(feature => {
                const current = features.find(f => f.feature_code === feature.code)
                const isEnabled = current?.enabled ?? false

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
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggleFeature(feature.code)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* 付費功能卡片 */}
        <div
          className="rounded-[24px] overflow-hidden"
          style={{
            background: 'linear-gradient(0deg, rgb(255, 255, 255) 0%, rgb(250, 247, 243) 100%)',
            border: '3px solid white',
            boxShadow: 'rgba(180, 160, 120, 0.15) 0px 12px 24px -8px',
          }}
        >
          <div className={`px-6 py-4 border-b border-morandi-gold/20`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles
                  className={`h-4 w-4 ${premiumEnabled ? 'text-morandi-gold' : 'text-morandi-muted'}`}
                />
                <h3
                  className={`font-semibold ${premiumEnabled ? 'text-morandi-primary' : 'text-morandi-secondary'}`}
                >
                  付費功能
                </h3>
                {premiumEnabled ? (
                  <Badge className="bg-morandi-gold/20 text-morandi-gold border-morandi-gold/30">
                    <Unlock className="h-3 w-3 mr-1" />
                    已開通
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-morandi-secondary border-border">
                    <Lock className="h-3 w-3 mr-1" />
                    未開通
                  </Badge>
                )}
              </div>
              <Switch checked={premiumEnabled} onCheckedChange={setPremiumEnabled} />
            </div>
            {premiumEnabled && workspace?.premium_expires_at && (
              <div className="text-sm text-morandi-secondary mt-2">
                到期日：{new Date(workspace.premium_expires_at).toLocaleDateString('zh-TW')}
              </div>
            )}
          </div>
          <div className={`p-6 ${!premiumEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {premiumAndEnterpriseFeatures.map(feature => {
                const current = features.find(f => f.feature_code === feature.code)
                const isEnabled = current?.enabled ?? false

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
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggleFeature(feature.code)}
                      disabled={!premiumEnabled}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </ContentPageLayout>
  )
}
